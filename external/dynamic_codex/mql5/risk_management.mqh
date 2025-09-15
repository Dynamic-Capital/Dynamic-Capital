//+------------------------------------------------------------------+
//| Risk management module                                           |
//| Handles lot sizing, SL/TP placement, breakeven and trailing stop |
//+------------------------------------------------------------------+
#property strict
#include <Trade/Trade.mqh>

input double RiskPercent      = 1.0;   // Risk per trade in percent
input double BreakEvenPips    = 10;    // Pips in profit before moving SL to breakeven

CTrade rm_trade;                       // trade object used for modifications

//+------------------------------------------------------------------+
//| Calculate lot size based on account balance and SL distance      |
//+------------------------------------------------------------------+
double CalculateLotSize(double stopLossPips)
{
   if(stopLossPips <= 0)
      return 0.0;
   double balance    = AccountInfoDouble(ACCOUNT_BALANCE);
   double riskMoney  = balance * RiskPercent / 100.0;
   double tickValue  = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_VALUE);
   double tickSize   = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE);
   double pipValue   = tickValue / tickSize * _Point * 10.0; // approximate pip value
   double lot        = riskMoney / (stopLossPips * pipValue);
   double lotStep    = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);
   double minLot     = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
   double maxLot     = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX);
   lot = MathMax(minLot, MathMin(maxLot, MathFloor(lot/lotStep)*lotStep));
   lot = NormalizeDouble(lot, 2);
   double margin;
   if(!OrderCalcMargin(ORDER_TYPE_BUY, _Symbol, lot, SymbolInfoDouble(_Symbol, SYMBOL_ASK), margin))
   {
      Print("OrderCalcMargin failed: ", GetLastError());
      return 0.0;
   }
   if(margin > AccountInfoDouble(ACCOUNT_FREEMARGIN))
   {
      Print("Insufficient margin for lot size: ", lot);
      return 0.0;
   }
   return lot;
}

//+------------------------------------------------------------------+
//| Set stop loss and take profit for a position by ticket           |
//+------------------------------------------------------------------+
void SetStopLossAndTakeProfit(ulong ticket, double slPips, double tpPips)
{
   if(!PositionSelectByTicket(ticket))
   {
      Print("SetStopLossAndTakeProfit: position not found");
      return;
   }
   double openPrice = PositionGetDouble(POSITION_PRICE_OPEN);
   long   type      = PositionGetInteger(POSITION_TYPE);
   double sl, tp;
   if(type == POSITION_TYPE_BUY)
   {
      sl = openPrice - slPips * _Point;
      tp = openPrice + tpPips * _Point;
   }
   else
   {
      sl = openPrice + slPips * _Point;
      tp = openPrice - tpPips * _Point;
   }
   if(!rm_trade.PositionModify(ticket, NormalizeDouble(sl, _Digits), NormalizeDouble(tp, _Digits)))
      Print("Failed to modify position: ", rm_trade.ResultRetcode());
}

//+------------------------------------------------------------------+
//| Move SL to breakeven after trade reaches a certain profit        |
//+------------------------------------------------------------------+
void MoveToBreakEven(ulong ticket, double entryPrice)
{
   if(!PositionSelectByTicket(ticket))
      return;
   long type = PositionGetInteger(POSITION_TYPE);
   double price = (type == POSITION_TYPE_BUY) ? SymbolInfoDouble(_Symbol, SYMBOL_BID)
                                              : SymbolInfoDouble(_Symbol, SYMBOL_ASK);
   if(type == POSITION_TYPE_BUY)
   {
      if(price - entryPrice >= BreakEvenPips * _Point && PositionGetDouble(POSITION_SL) < entryPrice)
         rm_trade.PositionModify(ticket, NormalizeDouble(entryPrice, _Digits), PositionGetDouble(POSITION_TP));
   }
   else
   {
      if(entryPrice - price >= BreakEvenPips * _Point && (PositionGetDouble(POSITION_SL) > entryPrice || PositionGetDouble(POSITION_SL) == 0))
         rm_trade.PositionModify(ticket, NormalizeDouble(entryPrice, _Digits), PositionGetDouble(POSITION_TP));
   }
}

//+------------------------------------------------------------------+
//| Apply trailing stop once price moves a certain distance          |
//+------------------------------------------------------------------+
void ApplyTrailingStop(ulong ticket, double trailStartPips, double trailStepPips)
{
   if(!PositionSelectByTicket(ticket))
      return;
   long type     = PositionGetInteger(POSITION_TYPE);
   double open   = PositionGetDouble(POSITION_PRICE_OPEN);
   double price  = (type == POSITION_TYPE_BUY) ? SymbolInfoDouble(_Symbol, SYMBOL_BID)
                                              : SymbolInfoDouble(_Symbol, SYMBOL_ASK);
   double sl     = PositionGetDouble(POSITION_SL);
   double newSL  = sl;

   if(type == POSITION_TYPE_BUY)
   {
      double start = open + trailStartPips * _Point;
      if(price > start)
      {
         double desired = price - trailStepPips * _Point;
         if(desired > sl)
            newSL = desired;
      }
   }
   else
   {
      double start = open - trailStartPips * _Point;
      if(price < start)
      {
         double desired = price + trailStepPips * _Point;
         if(desired < sl || sl == 0)
            newSL = desired;
      }
   }
   if(newSL != sl)
      rm_trade.PositionModify(ticket, NormalizeDouble(newSL, _Digits), PositionGetDouble(POSITION_TP));
}

