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
//| Helper: return pip size for the current symbol                   |
//+------------------------------------------------------------------+
double GetPipSize()
{
   double pipSize = _Point;

   if(_Digits == 3 || _Digits == 5)
      pipSize *= 10.0;

   return pipSize;
}

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
   double pipSize    = GetPipSize();
   if(pipSize <= 0.0)
   {
      Print("CalculateLotSize: invalid pip size for symbol ", _Symbol);
      return 0.0;
   }
   if(tickSize <= 0.0 || tickValue <= 0.0)
   {
      Print("CalculateLotSize: invalid tick data for symbol ", _Symbol);
      return 0.0;
   }
   double pipValue   = (tickValue / tickSize) * pipSize;
   if(pipValue <= 0.0)
   {
      Print("CalculateLotSize: invalid pip value for symbol ", _Symbol);
      return 0.0;
   }
   double lot        = riskMoney / (stopLossPips * pipValue);
   double lotStep    = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);
   double minLot     = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
   double maxLot     = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX);
   if(lotStep <= 0.0)
   {
      Print("CalculateLotSize: invalid lot step for symbol ", _Symbol);
      return 0.0;
   }
   lot = MathMax(minLot, MathMin(maxLot, MathFloor(lot/lotStep)*lotStep));
   if(lot <= 0.0)
   {
      Print("CalculateLotSize: resulting lot size is zero for symbol ", _Symbol);
      return 0.0;
   }
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
   double pipSize = GetPipSize();
   if(pipSize <= 0.0)
   {
      Print("SetStopLossAndTakeProfit: invalid pip size for symbol ", _Symbol);
      return;
   }
   double openPrice = PositionGetDouble(POSITION_PRICE_OPEN);
   long   type      = PositionGetInteger(POSITION_TYPE);
   double sl, tp;
   if(type == POSITION_TYPE_BUY)
   {
      sl = openPrice - slPips * pipSize;
      tp = openPrice + tpPips * pipSize;
   }
   else
   {
      sl = openPrice + slPips * pipSize;
      tp = openPrice - tpPips * pipSize;
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
   double pipSize = GetPipSize();
   if(pipSize <= 0.0)
      return;
   long type = PositionGetInteger(POSITION_TYPE);
   double price = (type == POSITION_TYPE_BUY) ? SymbolInfoDouble(_Symbol, SYMBOL_BID)
                                              : SymbolInfoDouble(_Symbol, SYMBOL_ASK);
   if(type == POSITION_TYPE_BUY)
   {
      if(price - entryPrice >= BreakEvenPips * pipSize && PositionGetDouble(POSITION_SL) < entryPrice)
         rm_trade.PositionModify(ticket, NormalizeDouble(entryPrice, _Digits), PositionGetDouble(POSITION_TP));
   }
   else
   {
      if(entryPrice - price >= BreakEvenPips * pipSize && (PositionGetDouble(POSITION_SL) > entryPrice || PositionGetDouble(POSITION_SL) == 0))
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
   double pipSize = GetPipSize();
   if(pipSize <= 0.0)
      return;
   long type     = PositionGetInteger(POSITION_TYPE);
   double open   = PositionGetDouble(POSITION_PRICE_OPEN);
   double price  = (type == POSITION_TYPE_BUY) ? SymbolInfoDouble(_Symbol, SYMBOL_BID)
                                              : SymbolInfoDouble(_Symbol, SYMBOL_ASK);
   double sl     = PositionGetDouble(POSITION_SL);
   double newSL  = sl;

   if(type == POSITION_TYPE_BUY)
   {
      double start = open + trailStartPips * pipSize;
      if(price > start)
      {
         double desired = price - trailStepPips * pipSize;
         if(desired > sl)
            newSL = desired;
      }
   }
   else
   {
      double start = open - trailStartPips * pipSize;
      if(price < start)
      {
         double desired = price + trailStepPips * pipSize;
         if(desired < sl || sl == 0)
            newSL = desired;
      }
   }
   if(newSL != sl)
      rm_trade.PositionModify(ticket, NormalizeDouble(newSL, _Digits), PositionGetDouble(POSITION_TP));
}

