//+------------------------------------------------------------------+
//| Trading session filter                                           |
//| Allows trading only within user-defined time window              |
//+------------------------------------------------------------------+
#property strict

input int SessionStartHour   = 8;   // Trading session start hour
input int SessionStartMinute = 0;   // Trading session start minute
input int SessionEndHour     = 16;  // Trading session end hour
input int SessionEndMinute   = 0;   // Trading session end minute

//+------------------------------------------------------------------+
//| Determine if current broker time is within trading session       |
//+------------------------------------------------------------------+
bool IsTradingSession()
{
   datetime now = TimeCurrent();
   MqlDateTime tm; TimeToStruct(now, tm);
   datetime start = now; datetime end = now;
   tm.hour = SessionStartHour; tm.min = SessionStartMinute; tm.sec = 0;
   start = StructToTime(tm);
   tm.hour = SessionEndHour; tm.min = SessionEndMinute; tm.sec = 0;
   end = StructToTime(tm);
   if(end <= start)
      end += 24 * 60 * 60; // handle sessions crossing midnight
   if(now >= start && now <= end)
      return true;
   return false;
}

