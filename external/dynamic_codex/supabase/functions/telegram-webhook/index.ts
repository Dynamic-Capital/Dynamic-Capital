import { createClient } from 'npm:@supabase/supabase-js@2.53.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface TelegramMessage {
  message_id: number;
  from: {
    id: number;
    username?: string;
    first_name?: string;
    last_name?: string;
  };
  text?: string;
  date: number;
  chat: {
    id: number;
    type: string;
  };
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

Deno.serve(async (req: Request) => {
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] === WEBHOOK START ===`);
  console.log(`Method: ${req.method}, URL: ${req.url}`);
  
  try {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      console.log("✅ CORS preflight request handled");
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    // Only accept POST requests
    if (req.method !== "POST") {
      console.log(`❌ Method ${req.method} not allowed`);
      return new Response(JSON.stringify({ error: "Method not allowed" }), { 
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Get and validate environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const telegramToken = Deno.env.get("TELEGRAM_BOT_TOKEN") || "8423362395:AAGVVE-Fy6NPMWTQ77nDDKYZUYXh7Z2eIhc";
    const adminId = Deno.env.get("ADMIN_USER_ID") || "225513686";

    console.log("🔧 Environment variables check:");
    console.log(`- Supabase URL: ${supabaseUrl ? '✅ Set' : '❌ Missing'}`);
    console.log(`- Supabase Key: ${supabaseKey ? '✅ Set' : '❌ Missing'}`);
    console.log(`- Telegram Token: ${telegramToken ? '✅ Set' : '❌ Missing'}`);
    console.log(`- Admin ID: ${adminId ? '✅ Set' : '❌ Missing'}`);

    if (!supabaseUrl || !supabaseKey) {
      console.error("❌ Missing critical Supabase configuration");
      return new Response(JSON.stringify({ 
        error: "Server configuration error",
        details: "Missing Supabase credentials"
      }), { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Parse the incoming update
    let update: TelegramUpdate;
    try {
      const body = await req.text();
      console.log("📨 Raw request body:", body);
      update = JSON.parse(body);
      console.log("📋 Parsed update:", JSON.stringify(update, null, 2));
    } catch (error) {
      console.error("❌ Failed to parse request body:", error);
      return new Response(JSON.stringify({ 
        error: "Invalid JSON payload" 
      }), { 
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    const message = update.message;

    if (!message || !message.from) {
      console.log("⚠️ No message to process in update");
      return new Response(JSON.stringify({ 
        status: "ok", 
        message: "No message to process" 
      }), { 
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Handle commands first
    if (message.text && message.text.startsWith('/')) {
      console.log(`🤖 Processing command: ${message.text}`);
      
      let responseText = "";
      
      switch (message.text.toLowerCase()) {
        case '/start':
          responseText = `🤖 Welcome to the Dynamic Pool Bot!\n\n` +
                        `I'm here to help you manage your pool activities.\n\n` +
                        `Available commands:\n` +
                        `• /start - Show this welcome message\n` +
                        `• /help - Get help information\n` +
                        `• /status - Check bot status\n\n` +
                        `Just send me any message and I'll store it for you!`;
          break;
        case '/help':
          responseText = `🆘 Help Information\n\n` +
                        `This bot stores all your messages and provides real-time monitoring.\n\n` +
                        `Features:\n` +
                        `• Message storage in database\n` +
                        `• Real-time dashboard updates\n` +
                        `• Admin notifications\n` +
                        `• Message history tracking\n\n` +
                        `Send any message to get started!`;
          break;
        case '/status':
          responseText = `✅ Bot Status: Active\n\n` +
                        `• Database: Connected\n` +
                        `• Webhook: Working\n` +
                        `• Real-time: Enabled\n` +
                        `• Admin ID: ${adminId}\n\n` +
                        `Everything is working perfectly!`;
          break;
        default:
          responseText = `❓ Unknown command: ${message.text}\n\n` +
                        `Available commands:\n` +
                        `• /start - Welcome message\n` +
                        `• /help - Help information\n` +
                        `• /status - Bot status\n\n` +
                        `Or just send me a regular message!`;
      }
      
      // Send command response immediately
      if (telegramToken && responseText) {
        console.log("📤 Sending command response...");
        try {
          const telegramResponse = await fetch(
            `https://api.telegram.org/bot${telegramToken}/sendMessage`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ 
                chat_id: message.chat.id, 
                text: responseText,
                parse_mode: "HTML"
              }),
            }
          );

          if (!telegramResponse.ok) {
            const errorText = await telegramResponse.text();
            console.error("❌ Failed to send command response:", errorText);
          } else {
            console.log("✅ Command response sent successfully");
          }
        } catch (error) {
          console.error("❌ Error sending command response:", error);
        }
      }
      
      // Still store the command in database for tracking
    }
    // Initialize Supabase client
    console.log("🔌 Initializing Supabase client...");
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Prepare message data
    const { id: user_id, username, first_name, last_name } = message.from;
    const text = message.text || "";
    const date = new Date(message.date * 1000).toISOString();
    const display_name = username || `${first_name || ''} ${last_name || ''}`.trim() || `User ${user_id}`;

    console.log("📝 Processing message:");
    console.log(`- User ID: ${user_id}`);
    console.log(`- Display Name: ${display_name}`);
    console.log(`- Text: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`);
    console.log(`- Date: ${date}`);
    console.log(`- Chat ID: ${message.chat.id}`);

    // Test database connection first
    console.log("🔍 Testing database connection...");
    try {
      const { error: testError } = await supabase
        .from("messages")
        .select("count")
        .limit(1);

      if (testError) {
        console.error("❌ Database connection test failed:", testError);
        throw testError;
      }
      console.log("✅ Database connection successful");
    } catch (error) {
      console.error("❌ Database connection failed:", error);
      return new Response(JSON.stringify({
        error: "Database connection failed",
        details: error.message
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Insert message into database
    console.log("💾 Inserting message into database...");
    const { data: insertData, error: insertError } = await supabase
      .from("messages")
      .insert([{ 
        user_id: Number(user_id), 
        username: display_name, 
        text: text, 
        date: date 
      }])
      .select();

    if (insertError) {
      console.error("❌ Database insert error:", insertError);
      return new Response(JSON.stringify({ 
        error: "Database insert failed",
        details: insertError.message
      }), { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log("✅ Message inserted successfully:", insertData);

    // Send confirmation message back to user (only for non-commands)
    if (telegramToken && text.trim() && !text.startsWith('/')) {
      console.log("📤 Sending confirmation to user...");
      try {
        const confirmationMessage = `✅ Message received and stored!\n\nYour message: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"`;
        
        const telegramResponse = await fetch(
          `https://api.telegram.org/bot${telegramToken}/sendMessage`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              chat_id: message.chat.id, 
              text: confirmationMessage,
              parse_mode: "HTML"
            }),
          }
        );

        if (!telegramResponse.ok) {
          const errorText = await telegramResponse.text();
          console.error("❌ Failed to send confirmation to user:", errorText);
        } else {
          console.log("✅ Confirmation sent to user successfully");
        }
      } catch (error) {
        console.error("❌ Error sending confirmation to user:", error);
      }
    }

    // Forward message to admin if configured and different from sender (skip commands)
    if (telegramToken && adminId && text.trim() && user_id.toString() !== adminId && !text.startsWith('/')) {
      console.log("📨 Forwarding message to admin...");
      try {
        const adminMessage = `📨 <b>New message from ${display_name}</b>\n` +
                           `👤 User ID: <code>${user_id}</code>\n` +
                           `💬 Chat ID: <code>${message.chat.id}</code>\n` +
                           `🕒 Time: ${new Date(message.date * 1000).toLocaleString()}\n\n` +
                           `📝 Message:\n<blockquote>${text}</blockquote>`;
        
        const telegramResponse = await fetch(
          `https://api.telegram.org/bot${telegramToken}/sendMessage`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              chat_id: adminId, 
              text: adminMessage,
              parse_mode: "HTML"
            }),
          }
        );

        if (!telegramResponse.ok) {
          const errorText = await telegramResponse.text();
          console.error("❌ Failed to send message to admin:", errorText);
        } else {
          console.log("✅ Message forwarded to admin successfully");
        }
      } catch (error) {
        console.error("❌ Error sending message to admin:", error);
      }
    }

    const processingTime = Date.now() - startTime;
    console.log(`✅ Webhook processing completed successfully in ${processingTime}ms`);
    console.log(`[${new Date().toISOString()}] === WEBHOOK END ===`);
    
    return new Response(JSON.stringify({ 
      status: "ok",
      message: "Message processed successfully",
      processing_time_ms: processingTime
    }), { 
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error("❌ Webhook error:", error);
    console.log(`[${new Date().toISOString()}] === WEBHOOK ERROR END (${processingTime}ms) ===`);
    
    return new Response(JSON.stringify({ 
      error: "Internal server error",
      details: error.message,
      processing_time_ms: processingTime
    }), { 
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});