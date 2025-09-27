#property strict
#include <stdlib.mqh>

// Supabase webhook URL
string SUPABASE_URL = "https://<PROJECT_REF>.functions.supabase.co/mt5";

// Simple HTTP POST function
int HttpPost(string url, string body) {
   char result[];
   string headers = "Content-Type: application/json\r\n";
   int res = WebRequest("POST", url, headers, 5000, body, result, NULL);
   if(res == -1) {
      Print("❌ WebRequest failed: ", GetLastError());
      return -1;
   }
   Print("✅ Supabase Response: ", CharArrayToString(result));
   return res;
}

// On every tick, send trade info
void OnTick() {
   for(int i=0; i<OrdersTotal(); i++) {
      if(OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) {
         string payload = "{" \
            +"\"symbol\":\""+OrderSymbol()+"\"," \
            +"\"type\":\""+(OrderType()==OP_BUY ? "BUY":"SELL")+"\"," \
            +"\"lots\":"+DoubleToString(OrderLots(),2)+"," \
            +"\"open_price\":"+DoubleToString(OrderOpenPrice(),5)+"," \
            +"\"profit\":"+DoubleToString(OrderProfit(),2)+"," \
            +"\"ticket\":"+IntegerToString(OrderTicket()) \
            +"}";

         HttpPost(SUPABASE_URL, payload);
      }
   }
}
