#property strict
#include <stdlib.mqh>

input string InpSupabaseUrl = "https://<PROJECT_REF>.functions.supabase.co/mt5";
input int InpHeartbeatSeconds = 15;

struct TradeHeartbeat {
   long     ticket;
   datetime lastSent;
};

TradeHeartbeat heartbeats[];

int FindHeartbeatIndex(long ticket) {
   for(int i = 0; i < ArraySize(heartbeats); i++) {
      if(heartbeats[i].ticket == ticket)
         return i;
   }
   return -1;
}

bool ShouldSend(long ticket, datetime now) {
   int idx = FindHeartbeatIndex(ticket);
   if(idx == -1) {
      TradeHeartbeat hb;
      hb.ticket = ticket;
      hb.lastSent = now;
      ArrayResize(heartbeats, ArraySize(heartbeats) + 1);
      heartbeats[ArraySize(heartbeats) - 1] = hb;
      return true;
   }

   if(now - heartbeats[idx].lastSent < InpHeartbeatSeconds)
      return false;

   heartbeats[idx].lastSent = now;
   return true;
}

int OnInit() {
   if(StringFind(InpSupabaseUrl, "<PROJECT_REF>") >= 0) {
      Print("❌ Supabase URL is not configured. Update InpSupabaseUrl input parameter.");
      return INIT_PARAMETERS_INCORRECT;
   }
   if(InpHeartbeatSeconds < 1) {
      Print("❌ Heartbeat interval must be >= 1 second.");
      return INIT_PARAMETERS_INCORRECT;
   }
   return INIT_SUCCEEDED;
}

void OnDeinit(const int reason) {
   ArrayResize(heartbeats, 0);
}

int HttpPost(string url, string body) {
   ResetLastError();
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

void OnTick() {
   datetime now = TimeCurrent();
   string accountLogin = LongToString(AccountInfoInteger(ACCOUNT_LOGIN));

   for(int i = 0; i < OrdersTotal(); i++) {
      if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES))
         continue;

      long ticket = OrderTicket();
      if(!ShouldSend(ticket, now))
         continue;

      string side = (OrderType() == OP_BUY ? "BUY" : "SELL");
      string payload = "{" \
         +"\"symbol\":\""+OrderSymbol()+"\"," \
         +"\"type\":\""+side+"\"," \
         +"\"lots\":"+DoubleToString(OrderLots(),2)+"," \
         +"\"open_price\":"+DoubleToString(OrderOpenPrice(),5)+"," \
         +"\"profit\":"+DoubleToString(OrderProfit(),2)+"," \
         +"\"ticket\":\""+LongToString(ticket)+"\"," \
         +"\"account\":\""+accountLogin+"\"," \
         +"\"open_time\":"+LongToString((long)OrderOpenTime()) \
         +"}";

      HttpPost(InpSupabaseUrl, payload);
   }
}
