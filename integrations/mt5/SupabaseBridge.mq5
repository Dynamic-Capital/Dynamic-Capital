#property strict
#include <Trade/Trade.mqh>

input string InpSupabaseUrl = "https://<PROJECT_REF>.functions.supabase.co/mt5";
input string InpSupabaseKey = "";
input string InpCommandsUrl = "https://<PROJECT_REF>.functions.supabase.co/mt5-commands";
input string InpCommandsSecret = "";
input string InpRiskUrl = "https://<PROJECT_REF>.functions.supabase.co/mt5-risk";
input string InpRiskSecret = "";
input string InpTerminalKey = "";
input int InpHeartbeatSeconds = 15;

struct TradeHeartbeat {
   long     ticket;
   datetime lastSent;
};

struct Mt5Command {
   string id;
   string action;
   string symbol;
   string side;
   double volume;
   double price;
   double stopLoss;
   double takeProfit;
   double trailingStop;
   string ticket;
   string comment;
};

struct RiskAdjustment {
   string id;
   string ticket;
   string symbol;
   double stopLoss;
   double takeProfit;
   double trailingStop;
   string notes;
};

struct AckPayload {
   string id;
   string status;
   string message;
};

TradeHeartbeat heartbeats[];
datetime lastAccountHeartbeat = 0;
CTrade trade;

int FindHeartbeatIndex(long ticket) {
   for(int i = 0; i < ArraySize(heartbeats); i++) {
      if(heartbeats[i].ticket == ticket)
         return i;
   }
   return -1;
}

string Trim(const string text) {
   string tmp = text;
   StringTrimLeft(tmp);
   StringTrimRight(tmp);
   return tmp;
}

string EscapeJson(const string value) {
   string result = value;
   StringReplace(result, "\\", "\\\\");
   StringReplace(result, "\"", "\\\"");
   StringReplace(result, "\n", "\\n");
   StringReplace(result, "\r", "\\r");
   return result;
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

string BuildHeaders(bool includeJson, const string apiKey, const string bearer) {
   string headers = "";
   if(includeJson)
      headers += "Content-Type: application/json\r\n";
   if(StringLen(apiKey) > 0)
      headers += "x-api-key: " + apiKey + "\r\n";
   if(StringLen(bearer) > 0)
      headers += "Authorization: Bearer " + bearer + "\r\n";
   return headers;
}

bool HttpRequest(const string method, const string url, const string body, const string headers, string &response) {
   ResetLastError();
   char result[];
   int status = WebRequest(method, url, headers, 10000, body, result, NULL);
   if(status == -1) {
      Print("❌ WebRequest failed: ", GetLastError(), " url=", url);
      return false;
   }
   response = CharArrayToString(result);
   if(status >= 200 && status < 300) {
      return true;
   }
   Print("⚠️ HTTP status ", status, " body=", response);
   return false;
}

bool SendTradePayload(const string payload) {
   string response = "";
   string headers = BuildHeaders(true, InpSupabaseKey, "");
   bool ok = HttpRequest("POST", InpSupabaseUrl, payload, headers, response);
   if(!ok)
      Print("❌ Failed to sync trade: ", response);
   return ok;
}

bool SendAccountHeartbeat(const string accountLogin) {
   if(StringLen(InpSupabaseUrl) == 0)
      return false;

   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   double equity = AccountInfoDouble(ACCOUNT_EQUITY);
   double marginFree = AccountInfoDouble(ACCOUNT_MARGIN_FREE);

   string payload = "{" \
      +"\"status\":\"alive\"," \
      +"\"account\":\""+accountLogin+"\"," \
      +"\"balance\":"+DoubleToString(balance,2)+"," \
      +"\"equity\":"+DoubleToString(equity,2)+"," \
      +"\"free_margin\":"+DoubleToString(marginFree,2) \
      +"}";

   string response = "";
   string headers = BuildHeaders(true, InpSupabaseKey, "");
   bool ok = HttpRequest("POST", InpSupabaseUrl, payload, headers, response);
   if(!ok)
      Print("❌ Failed to send account heartbeat: ", response);
   else
      lastAccountHeartbeat = TimeCurrent();
   return ok;
}

bool JsonExtractValue(const string json, const string key, string &value) {
   string pattern = "\"" + key + "\"";
   int pos = StringFind(json, pattern);
   if(pos == -1)
      return false;
   pos = StringFind(json, ":", pos);
   if(pos == -1)
      return false;
   pos++;
   int len = StringLen(json);
   while(pos < len) {
      int ch = StringGetCharacter(json, pos);
      if(ch != ' ' && ch != '\n' && ch != '\r' && ch != '\t')
         break;
      pos++;
   }
   if(pos >= len)
      return false;
   int ch = StringGetCharacter(json, pos);
   if(ch == '"') {
      pos++;
      int start = pos;
      bool escape = false;
      for(; pos < len; pos++) {
         ch = StringGetCharacter(json, pos);
         if(ch == '\\') {
            escape = !escape;
            continue;
         }
         if(ch == '"' && !escape) {
            value = StringSubstr(json, start, pos - start);
            StringReplace(value, "\\\"", "\"");
            StringReplace(value, "\\\\", "\\");
            return true;
         }
         escape = false;
      }
      return false;
   }
   int start = pos;
   while(pos < len) {
      ch = StringGetCharacter(json, pos);
      if(ch == ',' || ch == '}' || ch == ']')
         break;
      pos++;
   }
   value = Trim(StringSubstr(json, start, pos - start));
   return true;
}

bool JsonNextObject(const string json, int &index, string &object) {
   int len = StringLen(json);
   int start = -1;
   int depth = 0;
   bool inString = false;
   for(int i = index; i < len; i++) {
      int ch = StringGetCharacter(json, i);
      if(ch == '"') {
         int prev = (i > 0) ? StringGetCharacter(json, i - 1) : 0;
         if(prev != '\\')
            inString = !inString;
      }
      if(inString)
         continue;
      if(ch == '{') {
         if(depth == 0)
            start = i;
         depth++;
      } else if(ch == '}') {
         depth--;
         if(depth == 0 && start != -1) {
            object = StringSubstr(json, start, i - start + 1);
            index = i + 1;
            return true;
         }
      }
   }
   return false;
}

double ParseDouble(const string value, double fallback = 0.0) {
   string trimmed = Trim(value);
   if(StringLen(trimmed) == 0 || trimmed == "null")
      return fallback;
   return StringToDouble(trimmed);
}

bool ParseCommand(const string object, Mt5Command &command) {
   string val;
   if(!JsonExtractValue(object, "id", val))
      return false;
   command.id = val;
   if(!JsonExtractValue(object, "action", val))
      return false;
   command.action = StringToLower(val);
   if(!JsonExtractValue(object, "symbol", val))
      return false;
   command.symbol = val;
   if(JsonExtractValue(object, "side", val))
      command.side = StringToLower(val);
   else
      command.side = "";
   if(JsonExtractValue(object, "volume", val))
      command.volume = ParseDouble(val, 0.0);
   else
      command.volume = 0.0;
   if(JsonExtractValue(object, "price", val))
      command.price = ParseDouble(val, 0.0);
   else
      command.price = 0.0;
   if(JsonExtractValue(object, "stop_loss", val))
      command.stopLoss = ParseDouble(val, 0.0);
   else
      command.stopLoss = 0.0;
   if(JsonExtractValue(object, "take_profit", val))
      command.takeProfit = ParseDouble(val, 0.0);
   else
      command.takeProfit = 0.0;
   if(JsonExtractValue(object, "trailing_stop", val))
      command.trailingStop = ParseDouble(val, 0.0);
   else
      command.trailingStop = 0.0;
   if(JsonExtractValue(object, "ticket", val))
      command.ticket = val;
   else
      command.ticket = "";
   if(JsonExtractValue(object, "comment", val))
      command.comment = val;
   else
      command.comment = "";
   return true;
}

bool ParseAdjustment(const string object, RiskAdjustment &adj) {
   string val;
   if(!JsonExtractValue(object, "id", val))
      return false;
   adj.id = val;
   if(JsonExtractValue(object, "ticket", val))
      adj.ticket = val;
   else
      adj.ticket = "";
   if(JsonExtractValue(object, "symbol", val))
      adj.symbol = val;
   else
      adj.symbol = "";
   if(JsonExtractValue(object, "desired_stop_loss", val))
      adj.stopLoss = ParseDouble(val, 0.0);
   else
      adj.stopLoss = 0.0;
   if(JsonExtractValue(object, "desired_take_profit", val))
      adj.takeProfit = ParseDouble(val, 0.0);
   else
      adj.takeProfit = 0.0;
   if(JsonExtractValue(object, "trailing_stop_distance", val))
      adj.trailingStop = ParseDouble(val, 0.0);
   else
      adj.trailingStop = 0.0;
   if(JsonExtractValue(object, "notes", val))
      adj.notes = val;
   else
      adj.notes = "";
   return true;
}

bool ExecuteCommand(const Mt5Command &command, string &statusMessage) {
   bool success = false;
   statusMessage = "";
   if(command.action == "open") {
      ENUM_ORDER_TYPE orderType = (command.side == "sell") ? ORDER_TYPE_SELL : ORDER_TYPE_BUY;
      double sl = command.stopLoss > 0 ? command.stopLoss : 0.0;
      double tp = command.takeProfit > 0 ? command.takeProfit : 0.0;
      double price = command.price > 0 ? command.price : 0.0;
      bool result = (orderType == ORDER_TYPE_BUY)
         ? trade.Buy(command.volume, command.symbol, price, sl, tp, command.comment)
         : trade.Sell(command.volume, command.symbol, price, sl, tp, command.comment);
      if(!result) {
         statusMessage = "Order send failed: " + IntegerToString(_LastError);
      }
      success = result;
   } else if(command.action == "close") {
      bool result = false;
      if(StringLen(command.ticket) > 0) {
         ulong ticket = (ulong)StringToInteger(command.ticket);
         if(PositionSelectByTicket(ticket)) {
            string symbol = PositionGetString(POSITION_SYMBOL);
            result = trade.PositionClose(symbol);
         }
      } else {
         result = trade.PositionClose(command.symbol);
      }
      if(!result)
         statusMessage = "Close failed: " + IntegerToString(_LastError);
      success = result;
   } else if(command.action == "modify") {
      double sl = command.stopLoss;
      double tp = command.takeProfit;
      if(command.trailingStop > 0.0) {
         if(PositionSelect(command.symbol)) {
            ENUM_POSITION_TYPE type = (ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE);
            double priceCurrent = PositionGetDouble(POSITION_PRICE_CURRENT);
            if(type == POSITION_TYPE_BUY)
               sl = priceCurrent - command.trailingStop;
            else if(type == POSITION_TYPE_SELL)
               sl = priceCurrent + command.trailingStop;
         }
      }
      bool result = trade.PositionModify(command.symbol, sl, tp);
      if(!result)
         statusMessage = "Modify failed: " + IntegerToString(_LastError);
      success = result;
   } else {
      statusMessage = "Unsupported action";
   }
   return success;
}

bool ApplyRiskAdjustment(const RiskAdjustment &adj, string &statusMessage) {
   string symbol = adj.symbol;
   if(StringLen(symbol) == 0 && StringLen(adj.ticket) > 0) {
      ulong ticket = (ulong)StringToInteger(adj.ticket);
      if(PositionSelectByTicket(ticket))
         symbol = PositionGetString(POSITION_SYMBOL);
   }
   if(StringLen(symbol) == 0) {
      statusMessage = "Position not found";
      return false;
   }
   if(!PositionSelect(symbol)) {
      statusMessage = "Position unavailable";
      return false;
   }
   double sl = adj.stopLoss;
   double tp = adj.takeProfit;
   if(adj.trailingStop > 0.0) {
      ENUM_POSITION_TYPE type = (ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE);
      double priceCurrent = PositionGetDouble(POSITION_PRICE_CURRENT);
      double step = SymbolInfoDouble(symbol, SYMBOL_POINT);
      if(type == POSITION_TYPE_BUY)
         sl = priceCurrent - adj.trailingStop;
      else if(type == POSITION_TYPE_SELL)
         sl = priceCurrent + adj.trailingStop;
      sl = NormalizeDouble(sl, (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS));
      if(step > 0 && adj.trailingStop > 0)
         sl = MathFloor(sl / step) * step;
   }
   bool result = trade.PositionModify(symbol, sl, tp);
   if(!result)
      statusMessage = "Risk modify failed: " + IntegerToString(_LastError);
   return result;
}

void SendAcknowledgements(const string url, const AckPayload &acks[], const string secret) {
   if(ArraySize(acks) == 0)
      return;
   string body = "{\"results\":[";
   for(int i = 0; i < ArraySize(acks); i++) {
      if(i > 0) body += ",";
      body += "{\"id\":\"" + EscapeJson(acks[i].id) + "\",\"status\":\"" + EscapeJson(acks[i].status) + "\"";
      if(StringLen(acks[i].message) > 0)
         body += ",\"message\":\"" + EscapeJson(acks[i].message) + "\"";
      body += "}";
   }
   body += "]}";
   string response = "";
   string headers = BuildHeaders(true, "", StringLen(InpTerminalKey) > 0 ? InpTerminalKey : secret);
   HttpRequest("PATCH", url, body, headers, response);
}

void PollCommands(const string accountLogin) {
   if(StringLen(InpCommandsUrl) == 0)
      return;
   string url = InpCommandsUrl + "?account=" + accountLogin;
   string response = "";
   string headers = BuildHeaders(false, "", StringLen(InpTerminalKey) > 0 ? InpTerminalKey : InpCommandsSecret);
   if(!HttpRequest("GET", url, "", headers, response))
      return;

   int arrPos = StringFind(response, "\"commands\"");
   if(arrPos == -1)
      return;
   arrPos = StringFind(response, "[", arrPos);
   if(arrPos == -1)
      return;
   int index = arrPos;
   string object;
   Mt5Command commands[];
   while(JsonNextObject(response, index, object)) {
      Mt5Command cmd;
      if(ParseCommand(object, cmd)) {
         int newIndex = ArraySize(commands);
         ArrayResize(commands, newIndex + 1);
         commands[newIndex] = cmd;
      }
   }
   if(ArraySize(commands) == 0)
      return;

   AckPayload acks[];
   for(int i = 0; i < ArraySize(commands); i++) {
      string message;
      bool success = ExecuteCommand(commands[i], message);
      AckPayload ack;
      ack.id = commands[i].id;
      ack.status = success ? "filled" : "failed";
      ack.message = message;
      int newIndex = ArraySize(acks);
      ArrayResize(acks, newIndex + 1);
      acks[newIndex] = ack;
   }
   SendAcknowledgements(InpCommandsUrl, acks, InpCommandsSecret);
}

void PollRiskAdjustments(const string accountLogin) {
   if(StringLen(InpRiskUrl) == 0)
      return;
   string url = InpRiskUrl + "?account=" + accountLogin;
   string response = "";
   string headers = BuildHeaders(false, "", StringLen(InpTerminalKey) > 0 ? InpTerminalKey : InpRiskSecret);
   if(!HttpRequest("GET", url, "", headers, response))
      return;

   int arrPos = StringFind(response, "\"adjustments\"");
   if(arrPos == -1)
      return;
   arrPos = StringFind(response, "[", arrPos);
   if(arrPos == -1)
      return;
   int index = arrPos;
   string object;
   RiskAdjustment adjustments[];
   while(JsonNextObject(response, index, object)) {
      RiskAdjustment adj;
      if(ParseAdjustment(object, adj)) {
         int newIndex = ArraySize(adjustments);
         ArrayResize(adjustments, newIndex + 1);
         adjustments[newIndex] = adj;
      }
   }
   if(ArraySize(adjustments) == 0)
      return;

   AckPayload acks[];
   for(int i = 0; i < ArraySize(adjustments); i++) {
      string message;
      bool success = ApplyRiskAdjustment(adjustments[i], message);
      AckPayload ack;
      ack.id = adjustments[i].id;
      ack.status = success ? "applied" : "failed";
      ack.message = message;
      int newIndex = ArraySize(acks);
      ArrayResize(acks, newIndex + 1);
      acks[newIndex] = ack;
   }
   SendAcknowledgements(InpRiskUrl, acks, InpRiskSecret);
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
   EventSetTimer(MathMax(5, InpHeartbeatSeconds));
   return INIT_SUCCEEDED;
}

void OnDeinit(const int reason) {
   ArrayResize(heartbeats, 0);
   EventKillTimer();
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

      string side = (OrderType() == ORDER_TYPE_BUY ? "BUY" : "SELL");
      string payload = "{" \
         +"\"symbol\":\""+OrderSymbol()+"\"," \
         +"\"type\":\""+side+"\"," \
         +"\"lots\":"+DoubleToString(OrderLots(),2)+"," \
         +"\"open_price\":"+DoubleToString(OrderOpenPrice(),5)+"," \
         +"\"profit\":"+DoubleToString(OrderProfit(),2)+"," \
         +"\"ticket\":\""+LongToString(ticket)+"\"," \
         +"\"account\":\""+accountLogin+"\"," \
         +"\"open_time\":"+LongToString((long)OrderOpenTime())+"," \
         +"\"source\":\"mt5\"" \
         +"}";

      SendTradePayload(payload);
   }
}

void OnTimer() {
   string accountLogin = LongToString(AccountInfoInteger(ACCOUNT_LOGIN));
   if(TimeCurrent() - lastAccountHeartbeat >= InpHeartbeatSeconds)
      SendAccountHeartbeat(accountLogin);
   PollCommands(accountLogin);
   PollRiskAdjustments(accountLogin);
}
