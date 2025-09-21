//+------------------------------------------------------------------+
//| Equity protection module                                         |
//| Provides functions to monitor daily drawdown and equity levels   |
//+------------------------------------------------------------------+
#property strict
#include <Trade/Trade.mqh>

//+------------------------------------------------------------------+
//| Check if daily drawdown exceeds a maximum percentage             |
//| Returns true if limit breached                                   |
//+------------------------------------------------------------------+
bool CheckDailyDrawdownLimit(double maxLossPercent)
{
   MqlDateTime tm; TimeToStruct(TimeCurrent(), tm);
   tm.hour = tm.min = tm.sec = 0;
   datetime dayStart = StructToTime(tm);
   if(!HistorySelect(dayStart, TimeCurrent()))
      return false;
   double profit = 0.0;
   for(int i=0;i<HistoryDealsTotal();i++)
   {
      ulong ticket = HistoryDealGetTicket(i);
      profit += HistoryDealGetDouble(ticket, DEAL_PROFIT) +
                HistoryDealGetDouble(ticket, DEAL_COMMISSION) +
                HistoryDealGetDouble(ticket, DEAL_SWAP);
   }
   double startBalance = AccountInfoDouble(ACCOUNT_BALANCE) - profit;
   if(startBalance <= 0)
      return false;
   double drawdownPercent = (-profit / startBalance) * 100.0;
   return drawdownPercent >= maxLossPercent;
}

//+------------------------------------------------------------------+
//| Check if account equity is below a minimum threshold             |
//| Returns true if equity is lower than allowed                     |
//+------------------------------------------------------------------+
bool CheckEquityThreshold(double minEquity)
{
   double equity = AccountInfoDouble(ACCOUNT_EQUITY);
   return (equity < minEquity);
}

