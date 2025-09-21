//+------------------------------------------------------------------+
//| Utility functions                                                |
//| Miscellaneous helpers for MQL5 EAs                               |
//+------------------------------------------------------------------+
#property strict

//+------------------------------------------------------------------+
//| Convert pips to points                                           |
//+------------------------------------------------------------------+
int PipsToPoints(int pips)
{
   int factor = (_Digits == 3 || _Digits == 5) ? 10 : 1;
   return pips * factor;
}

//+------------------------------------------------------------------+
//| Normalize price to symbol digits                                 |
//+------------------------------------------------------------------+
double NormalizePrice(double price)
{
   return NormalizeDouble(price, _Digits);
}

//+------------------------------------------------------------------+
//| Check if a new bar has formed                                    |
//+------------------------------------------------------------------+
bool IsNewBar()
{
   static datetime lastBarTime = 0;
   datetime current = iTime(_Symbol, _Period, 0);
   if(current != lastBarTime)
   {
      lastBarTime = current;
      return true;
   }
   return false;
}

//+------------------------------------------------------------------+
//| Round a value to the nearest pip                                 |
//+------------------------------------------------------------------+
double RoundToPip(double value)
{
   double pip = (_Digits == 3 || _Digits == 5) ? _Point*10 : _Point;
   return MathRound(value / pip) * pip;
}

