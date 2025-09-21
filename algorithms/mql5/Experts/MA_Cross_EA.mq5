#property copyright "2024"
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

input int    FastMA                = 9;
input int    SlowMA                = 21;
input ENUM_MA_METHOD MaMethod      = MODE_EMA;
input ENUM_APPLIED_PRICE MaPrice   = PRICE_CLOSE;
input int    SlippagePoints        = 5;

input double ManualStopLossPips    = 20;
input double ManualTakeProfitPips  = 40;
input double TrailStartPips        = 15;
input double TrailStepPips         = 10;

input ulong  MagicNumber           = 654321;
input int    MaxTradesPerSymbol    = 1;
input int    MaxOpenTrades         = 3;
input double MaxDailyDrawdown      = 5.0;
input double MinEquity             = 0.0;

input string ReportWebhookURL      = "";
input string SupabaseApiKey        = "";
input string SupabaseAuthToken     = "";
input int    HttpTimeoutMs         = 5000;
input int    ReportMaxRetries      = 3;
input int    ReportRetrySeconds    = 30;

input int    TimerResolutionSeconds= 30;
input int    TelemetryIntervalMinutes = 15;

struct ReportPayload
{
   string   json;
   int      attempts;
   datetime nextAttempt;
};

CTrade trade;
int fastHandle = INVALID_HANDLE;
int slowHandle = INVALID_HANDLE;
bool g_sessionActive = false;
ReportPayload g_reports[];
datetime g_lastStats = 0;

int PipFactor();
double PointsToPips(double points);
void   ManageActivePosition();
bool   HandleSessionGate();
bool   ShouldHaltForRisk();
void   ExecuteSignal(int signal);
void   QueueTradeReport(const string action, double volume, double price, double sl, double tp, ulong ticket);
void   ProcessPendingReports();
void   RemoveReport(const int index);
string BuildRequestHeaders();

int OnInit()
{
   trade.SetExpertMagicNumber(MagicNumber);
   trade.SetDeviationInPoints(SlippagePoints);
   LogVersion(VersionID);

   fastHandle = iMA(_Symbol, PERIOD_CURRENT, FastMA, 0, MaMethod, MaPrice);
   slowHandle = iMA(_Symbol, PERIOD_CURRENT, SlowMA, 0, MaMethod, MaPrice);
   if(fastHandle == INVALID_HANDLE || slowHandle == INVALID_HANDLE)
      return INIT_FAILED;

   EventSetTimer(MathMax(1, TimerResolutionSeconds));
   return INIT_SUCCEEDED;
}

void OnDeinit(const int reason)
{
   if(fastHandle != INVALID_HANDLE)
      IndicatorRelease(fastHandle);
   if(slowHandle != INVALID_HANDLE)
      IndicatorRelease(slowHandle);
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

   double fast[3];
   double slow[3];
   if(CopyBuffer(fastHandle, 0, 0, 3, fast) < 3)
      return;
   if(CopyBuffer(slowHandle, 0, 0, 3, slow) < 3)
      return;

   double fastPrev = fast[2];
   double fastLast = fast[1];
   double slowPrev = slow[2];
   double slowLast = slow[1];

   bool crossUp = fastPrev <= slowPrev && fastLast > slowLast;
   bool crossDown = fastPrev >= slowPrev && fastLast < slowLast;

   int signal = 0;
   if(crossUp)
      signal = 1;
   else if(crossDown)
      signal = -1;

   if(signal != 0)
      ExecuteSignal(signal);
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

void ExecuteSignal(int signal)
{
   bool hasPosition = PositionSelect(_Symbol);
   int direction = 0;
   if(hasPosition)
      direction = (PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY) ? 1 : -1;

   double slPips = ManualStopLossPips;
   double tpPips = ManualTakeProfitPips;
   double lot = CalculateLotSize(slPips);
   if(lot <= 0)
   {
      lot = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
      lot = NormalizeDouble(lot, 2);
   }

   double slDistance = slPips * PipFactor() * _Point;
   double tpDistance = tpPips * PipFactor() * _Point;

   bool opened = false;

   if(signal > 0 && (!hasPosition || direction < 0))
   {
      if(hasPosition && direction < 0)
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
   else if(signal < 0 && (!hasPosition || direction > 0))
   {
      if(hasPosition && direction > 0)
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

   if(opened && PositionSelect(_Symbol))
   {
      ulong ticket = (ulong)PositionGetInteger(POSITION_TICKET);
      SetStopLossAndTakeProfit(ticket, slPips, tpPips);
   }
}

void QueueTradeReport(const string action, double volume, double price, double sl, double tp, ulong ticket)
{
   if(StringLen(ReportWebhookURL) == 0)
      return;

   string payload = StringFormat(
      "{\"symbol\":\"%s\",\"action\":\"%s\",\"volume\":%.2f,\"price\":%.5f,\"sl\":%.5f,\"tp\":%.5f,\"ticket\":%I64u,\"profit\":%.2f,\"equity\":%.2f}",
      _Symbol, action, volume, price, sl, tp, ticket,
      AccountInfoDouble(ACCOUNT_PROFIT),
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
