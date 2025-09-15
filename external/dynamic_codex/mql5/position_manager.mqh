//+------------------------------------------------------------------+
//| Position manager module                                         |
//| Controls trade limits and allows closing of all open positions   |
//+------------------------------------------------------------------+
#property strict
#include <Trade/Trade.mqh>

input int MaxTradesPerSession = 5;   // Maximum trades allowed per session
int  SessionTradeCount = 0;          // Counter for current session

//+------------------------------------------------------------------+
//| Check if a new trade can be opened                               |
//| Considers per-symbol, total limits and session count             |
//+------------------------------------------------------------------+
bool CanOpenNewTrade(string symbol, int maxPerSymbol, int maxTotal)
{
   if(SessionTradeCount >= MaxTradesPerSession)
      return false;
   int total = PositionsTotal();
   int perSymbol = 0;
   for(int i=0;i<total;i++)
   {
      if(PositionGetTicket(i) > 0 && PositionGetString(POSITION_SYMBOL) == symbol)
         perSymbol++;
   }
   if(total >= maxTotal || perSymbol >= maxPerSymbol)
      return false;
   return true;
}

//+------------------------------------------------------------------+
//| Close all open positions                                         |
//+------------------------------------------------------------------+
void CloseAllTrades()
{
   CTrade trade;
   for(int i=PositionsTotal()-1; i>=0; i--)
   {
      if(PositionSelectByIndex(i))
      {
         string symbol = PositionGetString(POSITION_SYMBOL);
         double volume = PositionGetDouble(POSITION_VOLUME);
         trade.PositionClose(symbol, volume);
      }
   }
}

//+------------------------------------------------------------------+
//| Increment session trade count                                    |
//+------------------------------------------------------------------+
void RegisterNewTrade()
{
   SessionTradeCount++;
}

//+------------------------------------------------------------------+
//| Reset session trade counter                                      |
//+------------------------------------------------------------------+
void ResetSessionTrades()
{
   SessionTradeCount = 0;
}

