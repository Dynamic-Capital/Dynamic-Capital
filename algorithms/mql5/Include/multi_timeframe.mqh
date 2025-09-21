//+------------------------------------------------------------------+
//| Multi-timeframe trend detection module                          |
//| Fetches EMA and ADX values from user-defined higher timeframes. |
//| Provides helpers to detect bullish or bearish higher timeframe  |
//| trend conditions.                                               |
//+------------------------------------------------------------------+
#property strict

//--- input parameters for higher timeframe analysis
input ENUM_TIMEFRAMES HTF_EMA_Timeframe   = PERIOD_H4;  // Timeframe for EMA calculations
input int             HTF_EMA_FastPeriod  = 20;         // Fast EMA period
input int             HTF_EMA_SlowPeriod  = 50;         // Slow EMA period
input ENUM_TIMEFRAMES HTF_ADX_Timeframe   = PERIOD_H4;  // Timeframe for ADX calculation
input int             HTF_ADX_Period      = 14;         // ADX period
input double          HTF_ADX_Threshold   = 20.0;       // ADX threshold to confirm trend

//+------------------------------------------------------------------+
//| Helper function to determine if higher timeframe trend is up     |
//| Conditions: EMA20 > EMA50 and ADX > threshold                    |
//+------------------------------------------------------------------+
bool HTF_Trend_Up()
{
   double fastEma = iMA(_Symbol, HTF_EMA_Timeframe, HTF_EMA_FastPeriod, 0, MODE_EMA, PRICE_CLOSE, 0);
   double slowEma = iMA(_Symbol, HTF_EMA_Timeframe, HTF_EMA_SlowPeriod, 0, MODE_EMA, PRICE_CLOSE, 0);
   double adx     = iADX(_Symbol, HTF_ADX_Timeframe, HTF_ADX_Period, PRICE_CLOSE, MODE_MAIN, 0);
   return (fastEma > slowEma && adx > HTF_ADX_Threshold);
}

//+------------------------------------------------------------------+
//| Helper function to determine if higher timeframe trend is down   |
//| Conditions: EMA20 < EMA50 and ADX > threshold                    |
//+------------------------------------------------------------------+
bool HTF_Trend_Down()
{
   double fastEma = iMA(_Symbol, HTF_EMA_Timeframe, HTF_EMA_FastPeriod, 0, MODE_EMA, PRICE_CLOSE, 0);
   double slowEma = iMA(_Symbol, HTF_EMA_Timeframe, HTF_EMA_SlowPeriod, 0, MODE_EMA, PRICE_CLOSE, 0);
   double adx     = iADX(_Symbol, HTF_ADX_Timeframe, HTF_ADX_Period, PRICE_CLOSE, MODE_MAIN, 0);
   return (fastEma < slowEma && adx > HTF_ADX_Threshold);
}

