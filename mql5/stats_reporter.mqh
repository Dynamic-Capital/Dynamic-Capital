//+------------------------------------------------------------------+
//| Stats reporter module                                            |
//| Sends account statistics to a webhook in JSON format             |
//+------------------------------------------------------------------+
#property strict

input string StatsWebhookURL = "";    // URL for posting stats

//+------------------------------------------------------------------+
//| Gather and send statistics                                       |
//+------------------------------------------------------------------+
void SendStats()
{
   if(StringLen(StatsWebhookURL) == 0)
   {
      Print("StatsReporter: Webhook URL not set");
      return;
   }
   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   double equity  = AccountInfoDouble(ACCOUNT_EQUITY);
   double dd      = (balance - equity) / balance * 100.0;
   ulong  accNum  = (ulong)AccountInfoInteger(ACCOUNT_LOGIN);
   string broker  = AccountInfoString(ACCOUNT_COMPANY);

   string payload = StringFormat("{\"account\":%I64u,\"broker\":\"%s\",\"balance\":%.2f,\"equity\":%.2f,\"drawdown\":%.2f}",
                                  accNum, broker, balance, equity, dd);
   uchar data[]; uchar result[]; string headers;
   StringToCharArray(payload, data, 0, WHOLE_ARRAY, CP_UTF8);
   ResetLastError();
   int res = WebRequest("POST", StatsWebhookURL, "Content-Type: application/json\r\n", 5000, data, result, headers);
   if(res == -1)
      Print("WebRequest failed: ", GetLastError());
   else
      Print("StatsReporter: sent with code ", res);
}

