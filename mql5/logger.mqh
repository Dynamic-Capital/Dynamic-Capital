//+------------------------------------------------------------------+
//| Logger module                                                    |
//| Provides logging utilities, version reporting and debugging      |
//+------------------------------------------------------------------+
#property strict

input bool  DebugMode = false;              // Enable verbose debug output
string LogFileName = "EA_Log.txt";          // File for persistent logging
input string VersionID = "1.0";             // EA version identifier
input string ChangeLog = "Initial release"; // Changelog description

//+------------------------------------------------------------------+
//| Write a message to log and file                                   |
//+------------------------------------------------------------------+
void Log(string msg)
{
   Print(msg);
   int handle = FileOpen(LogFileName, FILE_TXT | FILE_WRITE | FILE_READ | FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_APPEND);
   if(handle != INVALID_HANDLE)
   {
      FileWrite(handle, TimeToString(TimeCurrent(), TIME_DATE|TIME_SECONDS) + " - " + msg);
      FileClose(handle);
   }
}

//+------------------------------------------------------------------+
//| Log EA version and changelog                                      |
//+------------------------------------------------------------------+
void LogVersion(string version)
{
   Log("EA Version: " + version);
   Log("Changelog: " + ChangeLog);
}

//+------------------------------------------------------------------+
//| Debugging helper                                                 |
//+------------------------------------------------------------------+
void Debug(string msg, bool showInTester)
{
   if(DebugMode)
   {
      if(showInTester || !MQLInfoInteger(MQL_TESTER))
         Log("DEBUG: " + msg);
   }
}

