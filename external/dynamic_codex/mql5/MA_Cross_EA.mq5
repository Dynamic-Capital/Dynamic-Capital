#property copyright "2024"
#property version   "1.00"
#property strict

// Simple Moving Average crossover EA template
// Sends trade updates to Supabase edge function via WebRequest

input int    FastMA = 9;
input int    SlowMA = 21;
input double Lots   = 0.10;

#include <Trade/Trade.mqh>
CTrade trade;

int fastHandle;
int slowHandle;

int OnInit()
{
   fastHandle = iMA(_Symbol, PERIOD_CURRENT, FastMA, 0, MODE_EMA, PRICE_CLOSE);
   slowHandle = iMA(_Symbol, PERIOD_CURRENT, SlowMA, 0, MODE_EMA, PRICE_CLOSE);
   return INIT_SUCCEEDED;
}

void OnTick()
{
   double fast[2];
   double slow[2];
   if(CopyBuffer(fastHandle,0,0,2,fast) <= 0) return;
   if(CopyBuffer(slowHandle,0,0,2,slow) <= 0) return;

   bool crossUp   = fast[1] < slow[1] && fast[0] > slow[0];
   bool crossDown = fast[1] > slow[1] && fast[0] < slow[0];

   if(crossUp)
   {
      if(PositionSelect(_Symbol)) trade.PositionClose(_Symbol);
      trade.Buy(Lots);
      SendReport("buy");
   }
   else if(crossDown)
   {
      if(PositionSelect(_Symbol)) trade.PositionClose(_Symbol);
      trade.Sell(Lots);
      SendReport("sell");
   }
}

void SendReport(string action)
{
   string url = "https://xyz.supabase.co/functions/v1/ea-report"; // replace with your endpoint
   string json = StringFormat("{\"symbol\":\"%s\",\"action\":\"%s\",\"profit\":%f}",
                              _Symbol, action, AccountInfoDouble(ACCOUNT_PROFIT));
   char post[];
   StringToCharArray(json, post);

   char result[];
   string headers = "Content-Type: application/json\r\n";
   int timeout = 5000;
   int res = WebRequest("POST", url, headers, timeout, post, result, NULL);
   if(res == -1)
      Print("WebRequest error: ", GetLastError());
   else
      Print("Report sent: ", json);
}

void OnDeinit(const int reason)
{
   IndicatorRelease(fastHandle);
   IndicatorRelease(slowHandle);
}
