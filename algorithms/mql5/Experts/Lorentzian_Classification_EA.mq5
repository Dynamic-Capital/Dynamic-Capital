#property copyright "Copyright 2025, MetaQuotes Ltd."
#property link      "https://www.mql5.com"
#property version   "1.10"
#property strict

#include <Trade/Trade.mqh>
#include "logger.mqh"
#include "utils.mqh"
#include "risk_management.mqh"
#include "session_filter.mqh"
#include "equity_protection.mqh"
#include "position_manager.mqh"
#include "stats_reporter.mqh"

input int    NeighborsCount        = 8;      // number of neighbours to consider
input int    MaxBarsBack           = 2000;   // max history size retained in buffer
input int    LabelLookahead        = 4;      // bars ahead used for labelling
input double LabelNeutralZonePips  = 2.0;    // ignore price moves smaller than this
input int    RSI_Period            = 14;     // RSI lookback
input int    ADX_Period            = 14;     // ADX lookback
input ENUM_TIMEFRAMES HigherTF     = PERIOD_H1; // secondary timeframe for confirmation
input int    SlippagePoints        = 5;      // max slippage in points

input bool   UseADR                = true;   // use ADR to size SL/TP
input int    ADR_Period            = 14;     // days for ADR calculation
input double ADR_SL                = 0.5;    // SL fraction of ADR
input double ADR_TP                = 1.0;    // TP fraction of ADR
input double ManualStopLossPips    = 30;     // fallback stop loss in pips
input double ManualTakeProfitPips  = 60;     // fallback take profit in pips
input double TrailStartPips        = 25;     // start trailing once in profit
input double TrailStepPips         = 15;     // trailing step size

input ulong  MagicNumber           = 123456; // unique magic number for orders
input int    MaxTradesPerSymbol    = 1;      // max concurrent positions per symbol
input int    MaxOpenTrades         = 3;      // max concurrent positions overall
input double MaxDailyDrawdown      = 5.0;    // % drawdown to halt trading (0 disables)
input double MinEquity             = 0.0;    // minimum equity to continue (0 disables)

input string ReportWebhookURL      = "";    // Supabase function/table endpoint
input string SupabaseApiKey        = "";    // optional apikey header
input string SupabaseAuthToken     = "";    // optional bearer token
input int    HttpTimeoutMs         = 5000;   // WebRequest timeout in ms
input int    ReportMaxRetries      = 3;      // max attempts per telemetry payload
input int    ReportRetrySeconds    = 30;     // delay between retries

input int    TimerResolutionSeconds= 30;     // OnTimer cadence for telemetry
input int    TelemetryIntervalMinutes = 15;  // cadence for stats reporter (0 disables)

struct FeatureRow
{
   double rsiFast;
   double adxFast;
   double rsiSlow;
   double adxSlow;
   double closePrice;
   int    label;      // 1 long, -1 short, 0 neutral
   datetime barTime;
};

struct Neighbor
{
   double distance;
   int    label;
};

struct ReportPayload
{
   string   json;
   int      attempts;
   datetime nextAttempt;
};

CTrade trade;
FeatureRow g_rows[];
int g_head = -1;
int g_count = 0;
bool g_sessionActive = false;
ReportPayload g_reports[];
datetime g_lastStats = 0;
int g_rsiFastHandle   = INVALID_HANDLE;
int g_rsiSlowHandle   = INVALID_HANDLE;
int g_adxFastHandle   = INVALID_HANDLE;
int g_adxSlowHandle   = INVALID_HANDLE;

int    PipFactor();
void   StoreFeatureRow(double rsiFast, double adxFast, double rsiSlow, double adxSlow, double closePrice, datetime barTime);
int    EvaluateSignal(double rsiFast, double adxFast, double rsiSlow, double adxSlow);
double CalculateADRPips();
void   ManageTrades(int signal, double closePrice);
void   ManageActivePosition();
bool   HandleSessionGate();
bool   ShouldHaltForRisk();
void   QueueTradeReport(const string action, double volume, double price, double sl, double tp, ulong ticket);
void   ProcessPendingReports();
string BuildRequestHeaders();
void   SortNeighbors(Neighbor &arr[]);
void   RemoveReport(const int index);

int OnInit()
{
   ArrayResize(g_rows, MaxBarsBack);
   trade.SetExpertMagicNumber(MagicNumber);
   trade.SetDeviationInPoints(SlippagePoints);
   LogVersion(VersionID);

   g_rsiFastHandle = iRSI(_Symbol, PERIOD_CURRENT, RSI_Period, PRICE_CLOSE);
   g_rsiSlowHandle = iRSI(_Symbol, HigherTF, RSI_Period, PRICE_CLOSE);
   g_adxFastHandle = iADX(_Symbol, PERIOD_CURRENT, ADX_Period);
   g_adxSlowHandle = iADX(_Symbol, HigherTF, ADX_Period);

   if(g_rsiFastHandle == INVALID_HANDLE || g_rsiSlowHandle == INVALID_HANDLE ||
      g_adxFastHandle == INVALID_HANDLE || g_adxSlowHandle == INVALID_HANDLE)
   {
      Log("Indicator handle creation failed");
      return(INIT_FAILED);
   }

   int timer = MathMax(1, TimerResolutionSeconds);
   EventSetTimer(timer);

   return(INIT_SUCCEEDED);
}

void OnDeinit(const int reason)
{
   if(g_rsiFastHandle != INVALID_HANDLE)
      IndicatorRelease(g_rsiFastHandle);
   if(g_rsiSlowHandle != INVALID_HANDLE)
      IndicatorRelease(g_rsiSlowHandle);
   if(g_adxFastHandle != INVALID_HANDLE)
      IndicatorRelease(g_adxFastHandle);
   if(g_adxSlowHandle != INVALID_HANDLE)
      IndicatorRelease(g_adxSlowHandle);
   EventKillTimer();
}

void OnTick()
{
   ProcessPendingReports();
   ManageActivePosition();

   if(!IsNewBar())
      return;

   if(!HandleSessionGate())
      return;

   if(ShouldHaltForRisk())
      return;

   double rsiFastBuf[1];
   double rsiSlowBuf[1];
   double adxFastBuf[1];
   double adxSlowBuf[1];

   if(CopyBuffer(g_rsiFastHandle, 0, 1, 1, rsiFastBuf) < 1)
      return;
   if(CopyBuffer(g_rsiSlowHandle, 0, 1, 1, rsiSlowBuf) < 1)
      return;
   if(CopyBuffer(g_adxFastHandle, 0, 1, 1, adxFastBuf) < 1)
      return;
   if(CopyBuffer(g_adxSlowHandle, 0, 1, 1, adxSlowBuf) < 1)
      return;

   double rsiFast = rsiFastBuf[0];
   double adxFast = adxFastBuf[0];
   double rsiSlow = rsiSlowBuf[0];
   double adxSlow = adxSlowBuf[0];
   double closePrice = iClose(_Symbol, PERIOD_CURRENT, 1);
   datetime barTime = iTime(_Symbol, PERIOD_CURRENT, 1);

   if(rsiFast == EMPTY_VALUE || adxFast == EMPTY_VALUE || rsiSlow == EMPTY_VALUE || adxSlow == EMPTY_VALUE)
      return;

   StoreFeatureRow(rsiFast, adxFast, rsiSlow, adxSlow, closePrice, barTime);
   int signal = EvaluateSignal(rsiFast, adxFast, rsiSlow, adxSlow);
   if(signal != 0)
      ManageTrades(signal, closePrice);
}

void OnTimer()
{
   ProcessPendingReports();
   if(TelemetryIntervalMinutes <= 0)
      return;
   datetime now = TimeCurrent();
   if(now - g_lastStats >= TelemetryIntervalMinutes * 60)
   {
      SendStats();
      g_lastStats = now;
   }
}

int PipFactor()
{
   return (_Digits == 3 || _Digits == 5) ? 10 : 1;
}

double PointsToPips(double points)
{
   return points / PipFactor();
}

void StoreFeatureRow(double rsiFast, double adxFast, double rsiSlow, double adxSlow, double closePrice, datetime barTime)
{
   if(MaxBarsBack <= 0)
      return;
   g_head = (g_head + 1) % MaxBarsBack;
   g_rows[g_head].rsiFast = rsiFast;
   g_rows[g_head].adxFast = adxFast;
   g_rows[g_head].rsiSlow = rsiSlow;
   g_rows[g_head].adxSlow = adxSlow;
   g_rows[g_head].closePrice = closePrice;
   g_rows[g_head].barTime = barTime;
   g_rows[g_head].label = 0;

   if(g_count < MaxBarsBack)
      g_count++;

   if(LabelLookahead <= 0 || g_count <= LabelLookahead)
      return;

   int labelIndex = (g_head - LabelLookahead + MaxBarsBack) % MaxBarsBack;
   double baseClose = g_rows[labelIndex].closePrice;
   double futureClose = closePrice;
   double movePips = PointsToPips(MathAbs(futureClose - baseClose) / _Point);
   if(movePips < LabelNeutralZonePips)
   {
      g_rows[labelIndex].label = 0;
   }
   else
   {
      g_rows[labelIndex].label = (futureClose > baseClose) ? 1 : -1;
   }
}

int EvaluateSignal(double rsiFast, double adxFast, double rsiSlow, double adxSlow)
{
   if(g_count <= NeighborsCount)
      return 0;

   Neighbor neighbors[];
   ArrayResize(neighbors, 0);

   for(int i = 0; i < g_count; ++i)
   {
      int index = (g_head - i + MaxBarsBack) % MaxBarsBack;
      int label = g_rows[index].label;
      if(label == 0)
         continue;
      double distance = MathLog(1.0 + MathAbs(rsiFast - g_rows[index].rsiFast)) +
                        MathLog(1.0 + MathAbs(adxFast - g_rows[index].adxFast)) +
                        MathLog(1.0 + MathAbs(rsiSlow - g_rows[index].rsiSlow)) +
                        MathLog(1.0 + MathAbs(adxSlow - g_rows[index].adxSlow));
      int size = ArraySize(neighbors);
      ArrayResize(neighbors, size + 1);
      neighbors[size].distance = distance;
      neighbors[size].label = label;
   }

   int neighbourCount = ArraySize(neighbors);
   if(neighbourCount == 0)
      return 0;

   SortNeighbors(neighbors);
   int limit = MathMin(NeighborsCount, neighbourCount);
   int vote = 0;
   for(int i = 0; i < limit; ++i)
      vote += neighbors[i].label;

   if(vote > 0)
      return 1;
   if(vote < 0)
      return -1;
   return 0;
}

void SortNeighbors(Neighbor &arr[])
{
   int count = ArraySize(arr);
   for(int i = 1; i < count; ++i)
   {
      Neighbor key = arr[i];
      int j = i - 1;
      while(j >= 0 && arr[j].distance > key.distance)
      {
         arr[j + 1] = arr[j];
         j--;
      }
      arr[j + 1] = key;
   }
}

double CalculateADRPips()
{
   int bars = MathMin(ADR_Period, iBars(_Symbol, PERIOD_D1));
   if(bars <= 0)
      return 0.0;
   double sumPoints = 0.0;
   for(int i = 1; i <= bars; ++i)
      sumPoints += (iHigh(_Symbol, PERIOD_D1, i) - iLow(_Symbol, PERIOD_D1, i)) / _Point;
   return PointsToPips(sumPoints / bars);
}

void ManageTrades(int signal, double closePrice)
{
   bool hasPosition = PositionSelect(_Symbol);
   int currentDirection = 0;
   if(hasPosition)
      currentDirection = (PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY) ? 1 : -1;

   double slPips = ManualStopLossPips;
   double tpPips = ManualTakeProfitPips;
   if(UseADR)
   {
      double adr = CalculateADRPips();
      if(adr > 0)
      {
         slPips = adr * ADR_SL;
         tpPips = adr * ADR_TP;
      }
   }

   double lot = CalculateLotSize(slPips);
   if(lot <= 0.0)
   {
      lot = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
      lot = NormalizeDouble(lot, 2);
   }

   double slDistance = slPips * PipFactor() * _Point;
   double tpDistance = tpPips * PipFactor() * _Point;

   bool opened = false;

   if(signal > 0 && (!hasPosition || currentDirection < 0))
   {
      if(hasPosition && currentDirection < 0)
         trade.PositionClose(_Symbol);

      if(CanOpenNewTrade(_Symbol, MaxTradesPerSymbol, MaxOpenTrades))
      {
         double price = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
         double sl = (slPips > 0) ? price - slDistance : 0.0;
         double tp = (tpPips > 0) ? price + tpDistance : 0.0;
         if(trade.Buy(lot, NULL, 0.0, sl, tp))
         {
            ulong ticket = trade.ResultOrder();
            if(ticket == 0)
               ticket = (ulong)trade.ResultDeal();
            RegisterNewTrade();
            opened = true;
            QueueTradeReport("buy", lot, price, sl, tp, ticket);
            Log("Buy order placed");
         }
      }
   }
   else if(signal < 0 && (!hasPosition || currentDirection > 0))
   {
      if(hasPosition && currentDirection > 0)
         trade.PositionClose(_Symbol);

      if(CanOpenNewTrade(_Symbol, MaxTradesPerSymbol, MaxOpenTrades))
      {
         double price = SymbolInfoDouble(_Symbol, SYMBOL_BID);
         double sl = (slPips > 0) ? price + slDistance : 0.0;
         double tp = (tpPips > 0) ? price - tpDistance : 0.0;
         if(trade.Sell(lot, NULL, 0.0, sl, tp))
         {
            ulong ticket = trade.ResultOrder();
            if(ticket == 0)
               ticket = (ulong)trade.ResultDeal();
            RegisterNewTrade();
            opened = true;
            QueueTradeReport("sell", lot, price, sl, tp, ticket);
            Log("Sell order placed");
         }
      }
   }

   if(opened)
   {
      ulong ticket;
      if(PositionSelect(_Symbol))
      {
         ticket = (ulong)PositionGetInteger(POSITION_TICKET);
         SetStopLossAndTakeProfit(ticket, slPips, tpPips);
      }
   }
}

void ManageActivePosition()
{
   if(!PositionSelect(_Symbol))
      return;
   ulong ticket = (ulong)PositionGetInteger(POSITION_TICKET);
   double entry = PositionGetDouble(POSITION_PRICE_OPEN);
   MoveToBreakEven(ticket, entry);
   if(TrailStartPips > 0 && TrailStepPips > 0)
      ApplyTrailingStop(ticket, TrailStartPips, TrailStepPips);
}

bool HandleSessionGate()
{
   bool session = IsTradingSession();
   if(!session)
   {
      if(g_sessionActive)
      {
         ResetSessionTrades();
         g_sessionActive = false;
      }
      return false;
   }

   if(!g_sessionActive)
   {
      ResetSessionTrades();
      g_sessionActive = true;
   }
   return true;
}

bool ShouldHaltForRisk()
{
   if(MaxDailyDrawdown > 0.0 && CheckDailyDrawdownLimit(MaxDailyDrawdown))
   {
      Log("Trading halted: daily drawdown limit reached");
      return true;
   }
   if(MinEquity > 0.0 && CheckEquityThreshold(MinEquity))
   {
      Log("Trading halted: equity threshold breached");
      return true;
   }
   return false;
}

void QueueTradeReport(const string action, double volume, double price, double sl, double tp, ulong ticket)
{
   if(StringLen(ReportWebhookURL) == 0)
      return;

   string payload = StringFormat(
      "{\"symbol\":\"%s\",\"action\":\"%s\",\"volume\":%.2f,\"price\":%.5f,\"sl\":%.5f,\"tp\":%.5f,\"ticket\":%I64u,\"balance\":%.2f,\"equity\":%.2f}",
      _Symbol, action, volume, price, sl, tp, ticket,
      AccountInfoDouble(ACCOUNT_BALANCE),
      AccountInfoDouble(ACCOUNT_EQUITY));

   int size = ArraySize(g_reports);
   ArrayResize(g_reports, size + 1);
   g_reports[size].json = payload;
   g_reports[size].attempts = 0;
   g_reports[size].nextAttempt = TimeCurrent();
}

void ProcessPendingReports()
{
   if(StringLen(ReportWebhookURL) == 0)
      return;

   datetime now = TimeCurrent();
   for(int i = ArraySize(g_reports) - 1; i >= 0; --i)
   {
      if(g_reports[i].nextAttempt > now)
         continue;

      uchar data[];
      uchar result[];
      string headers = BuildRequestHeaders();
      StringToCharArray(g_reports[i].json, data, 0, WHOLE_ARRAY, CP_UTF8);
      ResetLastError();
      string resHeaders;
      int status = WebRequest("POST", ReportWebhookURL, headers, HttpTimeoutMs, data, result, resHeaders);
      if(status == -1)
      {
         Debug(StringFormat("Report send error %d", GetLastError()), false);
      }
      else if(status < 200 || status >= 300)
      {
         Debug(StringFormat("Report HTTP status %d", status), false);
      }
      else
      {
         Log("Report sent: " + g_reports[i].json);
         RemoveReport(i);
         continue;
      }

      g_reports[i].attempts++;
      if(g_reports[i].attempts >= ReportMaxRetries)
      {
         Log("Dropping report after max retries: " + g_reports[i].json);
         RemoveReport(i);
      }
      else
      {
         g_reports[i].nextAttempt = now + ReportRetrySeconds;
      }
   }
}

void RemoveReport(const int index)
{
   int size = ArraySize(g_reports);
   if(index < 0 || index >= size)
      return;
   if(index < size - 1)
      ArrayCopy(g_reports, g_reports, index, index + 1, size - index - 1);
   ArrayResize(g_reports, size - 1);
}

string BuildRequestHeaders()
{
   string headers = "Content-Type: application/json\r\n";
   if(StringLen(SupabaseApiKey) > 0)
      headers += "apikey: " + SupabaseApiKey + "\r\n";
   if(StringLen(SupabaseAuthToken) > 0)
      headers += "Authorization: Bearer " + SupabaseAuthToken + "\r\n";
   return headers;
}
