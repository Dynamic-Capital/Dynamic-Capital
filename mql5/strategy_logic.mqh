//+------------------------------------------------------------------+
//| Lorentzian classifier strategy module                           |
//| Provides shouldBuy/shouldSell decision helpers using a mock     |
//| weighted feature model.                                        |
//+------------------------------------------------------------------+
#property strict

//--- feature toggles and weights
input bool   UseEMAFeature      = true;
input double EMAWeight          = 1.0;
input bool   UseADXFeature      = true;
input double ADXWeight          = 1.0;
input bool   UseBBWidthFeature  = true;
input double BBWidthWeight      = 1.0;
input bool   UseCloseFeature    = true;
input double CloseWeight        = 1.0;
input double DecisionThreshold  = 2.5;    // Score threshold for signal

//--- parameters for indicators
input int    EMAPeriodFast      = 20;
input int    EMAPeriodSlow      = 50;
input int    ADXPeriod          = 14;
input int    BBPeriod           = 20;
input double BBDeviation        = 2.0;

//+------------------------------------------------------------------+
//| Calculate a weighted score for buy/sell direction                |
//+------------------------------------------------------------------+
double CalculateScore(bool forBuy)
{
   double score = 0.0;
   if(UseEMAFeature)
   {
      double fast = iMA(_Symbol, _Period, EMAPeriodFast, 0, MODE_EMA, PRICE_CLOSE, 0);
      double slow = iMA(_Symbol, _Period, EMAPeriodSlow, 0, MODE_EMA, PRICE_CLOSE, 0);
      if((forBuy && fast > slow) || (!forBuy && fast < slow))
         score += EMAWeight;
   }
   if(UseADXFeature)
   {
      double adx = iADX(_Symbol, _Period, ADXPeriod, PRICE_CLOSE, MODE_MAIN, 0);
      if(adx > 20.0)
         score += ADXWeight;
   }
   if(UseBBWidthFeature)
   {
      double upper = iBands(_Symbol, _Period, BBPeriod, 0, BBDeviation, PRICE_CLOSE, MODE_UPPER, 0);
      double lower = iBands(_Symbol, _Period, BBPeriod, 0, BBDeviation, PRICE_CLOSE, MODE_LOWER, 0);
      double width = upper - lower;
      if(width > 0)
         score += BBWidthWeight;
   }
   if(UseCloseFeature)
   {
      double close = iClose(_Symbol, _Period, 0);
      double prev  = iClose(_Symbol, _Period, 1);
      if((forBuy && close > prev) || (!forBuy && close < prev))
         score += CloseWeight;
   }
   return score;
}

//+------------------------------------------------------------------+
//| Return true if buy conditions satisfied                          |
//+------------------------------------------------------------------+
bool shouldBuy()
{
   return (CalculateScore(true) > DecisionThreshold);
}

//+------------------------------------------------------------------+
//| Return true if sell conditions satisfied                         |
//+------------------------------------------------------------------+
bool shouldSell()
{
   return (CalculateScore(false) > DecisionThreshold);
}

