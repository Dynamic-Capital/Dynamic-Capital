import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const BINANCE_API_KEY = Deno.env.get("BINANCE_API_KEY");
const BINANCE_SECRET_KEY = Deno.env.get("BINANCE_SECRET_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const ADMIN_USER_IDS = ["225513686"];

// User sessions for features
const userSessions = new Map();
const pendingBroadcasts = new Map();

// Supabase clients
const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
  auth: { persistSession: false },
});

const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function isAdmin(userId: string): boolean {
  return ADMIN_USER_IDS.includes(userId);
}

async function sendMessage(chatId: number, text: string, replyMarkup?: any) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const payload = {
    chat_id: chatId,
    text: text,
    reply_markup: replyMarkup,
    parse_mode: "Markdown"
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return response.ok;
  } catch (error) {
    console.error("Error sending message:", error);
    return false;
  }
}

function getUserSession(userId: string) {
  if (!userSessions.has(userId)) {
    userSessions.set(userId, {
      awaitingInput: null,
      messageHistory: []
    });
  }
  return userSessions.get(userId);
}

// Receipt upload and admin notification functions
async function uploadReceiptToStorage(fileId: string, paymentId: string, userId: string) {
  try {
    // Download file from Telegram
    const fileResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`);
    const fileData = await fileResponse.json();
    
    if (!fileData.ok) return null;
    
    const filePath = fileData.result.file_path;
    const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
    
    // Download the actual file
    const downloadResponse = await fetch(fileUrl);
    const fileBuffer = await downloadResponse.arrayBuffer();
    
    // Upload to Supabase Storage
    const fileName = `${paymentId}-${Date.now()}.jpg`;
    const { data, error } = await supabaseAdmin.storage
      .from('payment-receipts')
      .upload(fileName, fileBuffer, {
        contentType: downloadResponse.headers.get('content-type') || 'image/jpeg',
        upsert: false
      });
    
    if (error) {
      console.error('Storage upload error:', error);
      return null;
    }
    
    // Update payment record with receipt info
    await supabaseAdmin
      .from('payments')
      .update({ 
        receipt_file_path: fileName,
        receipt_telegram_file_id: fileId,
        status: 'pending_review'
      })
      .eq('id', paymentId);
    
    return fileName;
  } catch (error) {
    console.error('Receipt upload error:', error);
    return null;
  }
}

async function notifyAdminsOfNewReceipt(paymentId: string, userId: string, userName: string) {
  try {
    const { data: payment } = await supabaseAdmin
      .from('payments')
      .select('*, subscription_plans(*)')
      .eq('id', paymentId)
      .single();
    
    if (!payment) return;
    
    const adminMessage = `🧾 *New Payment Receipt Uploaded*

👤 User: ${userName} (${userId})
📦 Package: ${payment.subscription_plans?.name || 'Unknown'}
💰 Amount: $${payment.amount}
💳 Method: ${payment.payment_method}
📋 Payment ID: ${paymentId}

⏰ Uploaded: ${new Date().toLocaleString()}

Please review and approve/reject this payment:`;

    const adminKeyboard = {
      inline_keyboard: [
        [
          { text: "✅ Approve Payment", callback_data: `approve_payment_${paymentId}` },
          { text: "❌ Reject Payment", callback_data: `reject_payment_${paymentId}` }
        ]
      ]
    };

    // Send to all admins
    for (const adminId of ADMIN_USER_IDS) {
      await sendMessage(parseInt(adminId), adminMessage, adminKeyboard);
    }
  } catch (error) {
    console.error('Error notifying admins:', error);
  }
}

async function handlePaymentDecision(paymentId: string, action: 'approve' | 'reject', adminId: string) {
  try {
    const { data: payment } = await supabaseAdmin
      .from('payments')
      .select('*, subscription_plans(*)')
      .eq('id', paymentId)
      .single();
    
    if (!payment) return false;
    
    const newStatus = action === 'approve' ? 'completed' : 'rejected';
    
    // Update payment status
    await supabaseAdmin
      .from('payments')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentId);
    
    // If approved, create/update subscription
    if (action === 'approve') {
      const subscriptionEndDate = new Date();
      subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + payment.subscription_plans.duration_months);
      
      await supabaseAdmin
        .from('user_subscriptions')
        .upsert({
          telegram_user_id: payment.user_id,
          plan_id: payment.plan_id,
          is_active: true,
          payment_status: 'completed',
          subscription_start_date: new Date().toISOString(),
          subscription_end_date: subscriptionEndDate.toISOString()
        });
      
      // Update bot_users table
      await supabaseAdmin
        .from('bot_users')
        .update({
          is_vip: true,
          current_plan_id: payment.plan_id,
          subscription_expires_at: subscriptionEndDate.toISOString()
        })
        .eq('telegram_id', payment.user_id);
    }
    
    // Notify user
    const userMessage = action === 'approve' 
      ? `🎉 *Payment Approved!*

✅ Your payment has been approved!
📦 Package: ${payment.subscription_plans?.name}
💰 Amount: $${payment.amount}

🎊 Welcome to VIP! You now have access to:
• Premium trading signals
• VIP chat access  
• Daily market analysis
• Mentorship programs

Enjoy your VIP benefits!`
      : `❌ *Payment Rejected*

Unfortunately, your payment could not be verified.
📋 Payment ID: ${paymentId}
💰 Amount: $${payment.amount}

Please contact support for assistance or try uploading a clearer receipt.`;

    const userKeyboard = {
      inline_keyboard: [
        action === 'approve' 
          ? [{ text: "🎯 Access VIP Features", callback_data: "vip_features" }]
          : [{ text: "💬 Contact Support", callback_data: "contact_support" }],
        [{ text: "🔙 Main Menu", callback_data: "back_to_main" }]
      ]
    };

    await sendMessage(parseInt(payment.user_id), userMessage, userKeyboard);
    
    return true;
  } catch (error) {
    console.error('Error handling payment decision:', error);
    return false;
  }
}

// Database functions
async function fetchOrCreateBotUser(telegramId: string, firstName?: string, lastName?: string, username?: string) {
  try {
    let { data: user, error } = await supabaseAdmin
      .from("bot_users")
      .select("*")
      .eq("telegram_id", telegramId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error("Error fetching bot user:", error);
    }

    if (!user) {
      const { data, error } = await supabaseAdmin
        .from("bot_users")
        .insert([{ 
          telegram_id: telegramId,
          first_name: firstName || null,
          last_name: lastName || null,
          username: username || null
        }])
        .select("*")
        .single();

      if (error) {
        console.error("Error creating bot user:", error);
        return null;
}

// FAQ and Promo Code functions
async function getActivePromotions() {
  try {
    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .eq('is_active', true)
      .gte('valid_until', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Promotions query error:', error);
      return [];
    }

    console.log('Active promotions found:', data?.length || 0);
    return data || [];
  } catch (error) {
    console.error('Error fetching promotions:', error);
    return [];
  }
}

async function getFAQs() {
  // Static FAQ for now - you can move this to database later
  return [
    {
      question: "What is VIP membership?",
      answer: "VIP membership gives you access to premium trading signals, daily market analysis, mentorship programs, and exclusive VIP chat access."
    },
    {
      question: "How do I join the VIP community?",
      answer: "Select a VIP package, make payment via bank transfer, upload your receipt, and wait for admin approval (24-48 hours)."
    },
    {
      question: "What payment methods do you accept?",
      answer: "We accept bank transfers to BML and MIB accounts in both MVR and USD currencies."
    },
    {
      question: "How long does approval take?",
      answer: "Payment approvals typically take 24-48 hours. You'll receive a notification once approved."
    },
    {
      question: "Can I get a refund?",
      answer: "Refunds are available within 7 days of payment approval. Contact support for assistance."
    },
    {
      question: "How do I access mentorship programs?",
      answer: "Mentorship programs are available to VIP members. You'll receive access details once your membership is approved."
    }
  ];
}
      user = data;
    }

    return user;
  } catch (error) {
    console.error("Database error:", error);
    return null;
  }
}

async function getSubscriptionPlans() {
  try {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .order('price', { ascending: true });

    return data || [];
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    return [];
  }
}

// Analytics tracking function
async function trackDailyAnalytics() {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Get today's stats
    const [usersResult, newUsersResult] = await Promise.all([
      supabaseAdmin.from('bot_users').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('bot_users').select('id', { count: 'exact', head: true }).gte('created_at', today)
    ]);

    // Update or create daily analytics
    await supabaseAdmin
      .from('daily_analytics')
      .upsert({
        date: today,
        total_users: usersResult.count || 0,
        new_users: newUsersResult.count || 0
      });
  } catch (error) {
    console.error('Analytics tracking error:', error);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method === "GET") {
    return new Response("Bot is running!", { status: 200 });
  }

  try {
    const body = await req.text();
    const update = JSON.parse(body);

    console.log("Update received:", JSON.stringify(update));

    // Extract user info
    const from = update.message?.from || update.callback_query?.from;
    if (!from) return new Response("OK", { status: 200 });

    const chatId = update.message?.chat?.id || update.callback_query?.message?.chat?.id;
    const userId = from.id.toString();
    const firstName = from.first_name;
    const lastName = from.last_name;
    const username = from.username;

    // Fetch or create bot user
    const botUser = await fetchOrCreateBotUser(userId, firstName, lastName, username);

    // Handle regular messages
    if (update.message) {
      const text = update.message.text;
      const document = update.message.document;
      const photo = update.message.photo;
      
      // Handle receipt uploads (documents or photos)
      if (document || photo) {
        const session = getUserSession(userId);
        if (session.awaitingInput && session.awaitingInput.startsWith('upload_receipt_')) {
          const paymentId = session.awaitingInput.replace('upload_receipt_', '');
          const fileId = document ? document.file_id : photo[photo.length - 1].file_id;
          
          await sendMessage(chatId, "📤 *Uploading Receipt...*\n\nPlease wait while we process your receipt...");
          
          const fileName = await uploadReceiptToStorage(fileId, paymentId, userId);
          if (fileName) {
            session.awaitingInput = null;
            await notifyAdminsOfNewReceipt(paymentId, userId, firstName || 'Unknown');
            
            const successMessage = `✅ *Receipt Uploaded Successfully!*

📋 Payment ID: ${paymentId}
📎 Receipt: Uploaded and saved
⏰ Status: Under Review

Our team will review your payment within 24 hours and notify you once approved.

Thank you for your patience!`;

            const receiptKeyboard = {
              inline_keyboard: [
                [{ text: "🔍 Check Status", callback_data: `check_payment_${paymentId}` }],
                [{ text: "🔙 Main Menu", callback_data: "back_to_main" }]
              ]
            };

            await sendMessage(chatId, successMessage, receiptKeyboard);
          } else {
            await sendMessage(chatId, "❌ Failed to upload receipt. Please try again or contact support.");
          }
          
          return new Response("OK", { status: 200 });
        }
      }

      if (text === '/start') {
        const welcomeMessage = `🎯 *Welcome to Dynamic Capital VIP!*

👋 Hello ${firstName}! Ready to join our exclusive trading community?

🌟 *What Our VIP Community Offers:*
• 🔥 Premium trading signals & alerts
• 📊 Daily market analysis & insights  
• 🎓 Professional mentorship programs
• 💎 Exclusive VIP chat access
• 📈 Live market outlook sessions
• 🎯 Personalized trading strategies

🆓 *Free Member Benefits:*
• Basic market updates
• Limited community access
• 3 educational resources per month

💎 *Ready to unlock VIP benefits?*
Choose an option below:`;

        const keyboard = {
          inline_keyboard: [
            [
              { text: "💎 Join VIP Community", callback_data: "view_packages" },
              { text: "🎓 Education Hub", callback_data: "view_education" }
            ],
            [
              { text: "📊 Market Analysis", callback_data: "market_overview" },
              { text: "🎯 Trading Signals", callback_data: "trading_signals" }
            ],
            [
              { text: "🎁 Active Promotions", callback_data: "view_promotions" },
              { text: "👤 My Account", callback_data: "user_status" }
            ],
            [
              { text: "ℹ️ About Us", callback_data: "about_us" },
              { text: "💬 Get Support", callback_data: "contact_support" }
            ]
          ]
        };

        await sendMessage(chatId, welcomeMessage, keyboard);
        await trackDailyAnalytics();
        
        return new Response("OK", { status: 200 });
      }
    }

    // Handle callback queries (button presses)
    if (update.callback_query) {
      const data = update.callback_query.data;
      
      switch (true) {
        case data === 'view_packages':
          try {
            const packages = await getSubscriptionPlans();
            let packagesMessage = "💎 *VIP Membership Packages*\n\n";
            
            const packageKeyboard = {
              inline_keyboard: []
            };

            if (packages.length > 0) {
              packages.forEach((pkg: any, index: number) => {
                packagesMessage += `${index + 1}. **${pkg.name}**\n`;
                packagesMessage += `   💰 Price: $${pkg.price}/${pkg.duration_months}mo\n`;
                packagesMessage += `   ✨ Features: ${pkg.features ? pkg.features.join(', ') : 'Premium VIP benefits'}\n\n`;
                
                packageKeyboard.inline_keyboard.push([{
                  text: `📦 Select ${pkg.name}`,
                  callback_data: `select_package_${pkg.id}`
                }]);
              });
            }
            
            packageKeyboard.inline_keyboard.push([{ text: "🔙 Back to Menu", callback_data: "back_to_main" }]);
            
            await sendMessage(chatId, packagesMessage, packageKeyboard);
          } catch (error) {
            await sendMessage(chatId, "❌ Unable to load packages. Please try again later.");
          }
          break;

        case data.startsWith('select_package_'):
          const packageId = data.replace('select_package_', '');
          
          try {
            const { data: packageData, error } = await supabase
              .from('subscription_plans')
              .select('*')
              .eq('id', packageId)
              .single();

            if (error || !packageData) {
              await sendMessage(chatId, "❌ Package not found. Please try again.");
              break;
            }

            const paymentMessage = `💳 *Payment for ${packageData.name}*

📦 Package: ${packageData.name}
💰 Price: $${packageData.price}
⏱ Duration: ${packageData.duration_months} month(s)
✨ Features: ${packageData.features ? packageData.features.join(', ') : 'Premium features included'}

Choose your payment method:`;

            const paymentKeyboard = {
              inline_keyboard: [
                [{ text: "💳 Credit/Debit Card", callback_data: `pay_card_${packageId}` }],
                [{ text: "₿ Cryptocurrency", callback_data: `pay_crypto_${packageId}` }],
                [{ text: "🏦 Bank Transfer", callback_data: `pay_bank_${packageId}` }],
                [{ text: "🔙 Back to Packages", callback_data: "view_packages" }]
              ]
            };

            await sendMessage(chatId, paymentMessage, paymentKeyboard);
          } catch (error) {
            await sendMessage(chatId, "❌ Error loading package details. Please try again.");
          }
          break;

        case data.startsWith('pay_bank_'):
          const bankPackageId = data.replace('pay_bank_', '');
          
          try {
            const { data: packageData } = await supabase
              .from('subscription_plans')
              .select('*')
              .eq('id', bankPackageId)
              .single();

            if (!packageData) {
              await sendMessage(chatId, "❌ Package not found. Please try again.");
              break;
            }

            // Create payment record
            const { data: payment, error } = await supabaseAdmin
              .from('payments')
              .insert([{
                user_id: botUser.id, // Use the bot_user UUID
                plan_id: bankPackageId,
                payment_method: 'bank_transfer',
                amount: packageData.price,
                status: 'pending',
                currency: 'USD'
              }])
              .select('*')
              .single();

            if (error) {
              await sendMessage(chatId, "❌ Error creating payment. Please try again.");
              break;
            }

            const bankMessage = `🏦 *Bank Transfer Payment*

📦 Package: ${packageData.name}
💰 Amount: $${packageData.price}
📋 Payment ID: ${payment.id}

**Select Bank Account for Transfer:**

**1. BML (MVR)**
👤 ABDL.M.I.AFLHAL
💳 \`7730000133061\`

**2. MIB (MVR)**  
👤 ABDL.M.I.AFLHAL
💳 \`9010310167224100\`

**3. MIB (USD)**
👤 ABDL.M.I.AFLHAL
💳 \`9013101672242000\`

📋 **Payment Reference:** \`${payment.id}\`

📤 **Next Steps:**
1. Transfer the exact amount to any account above
2. Include the payment reference number
3. Upload your receipt/proof of payment
4. Wait for admin approval (24-48 hours)

Please upload your payment receipt now:`;

            const bankKeyboard = {
              inline_keyboard: [
                [{ text: "📤 Upload Receipt", callback_data: `upload_receipt_${payment.id}` }],
                [{ text: "💬 Contact Support", callback_data: "contact_support" }],
                [{ text: "🔙 Main Menu", callback_data: "back_to_main" }]
              ]
            };

            await sendMessage(chatId, bankMessage, bankKeyboard);
          } catch (error) {
            await sendMessage(chatId, "❌ Error processing payment. Please try again.");
          }
          break;

        case data.startsWith('upload_receipt_'):
          const receiptPaymentId = data.replace('upload_receipt_', '');
          const session = getUserSession(userId);
          session.awaitingInput = `upload_receipt_${receiptPaymentId}`;
          
          await sendMessage(chatId, `📤 *Upload Payment Receipt*

Please send your payment receipt as:
• 📷 Photo/Image
• 📄 PDF Document  
• 🗂 Any file format

Make sure the receipt clearly shows:
✅ Transaction amount
✅ Date and time
✅ Reference number: ${receiptPaymentId}

Send your receipt now:`);
          break;

        case data.startsWith('approve_payment_'):
          if (!isAdmin(userId)) {
            await sendMessage(chatId, "❌ Unauthorized access.");
            break;
          }
          
          const approvePaymentId = data.replace('approve_payment_', '');
          const approveSuccess = await handlePaymentDecision(approvePaymentId, 'approve', userId);
          
          if (approveSuccess) {
            await sendMessage(chatId, `✅ Payment ${approvePaymentId} has been approved and user has been granted VIP access.`);
          } else {
            await sendMessage(chatId, `❌ Failed to approve payment ${approvePaymentId}.`);
          }
          break;

        case data.startsWith('reject_payment_'):
          if (!isAdmin(userId)) {
            await sendMessage(chatId, "❌ Unauthorized access.");
            break;
          }
          
          const rejectPaymentId = data.replace('reject_payment_', '');
          const rejectSuccess = await handlePaymentDecision(rejectPaymentId, 'reject', userId);
          
          if (rejectSuccess) {
            await sendMessage(chatId, `❌ Payment ${rejectPaymentId} has been rejected and user has been notified.`);
          } else {
            await sendMessage(chatId, `❌ Failed to reject payment ${rejectPaymentId}.`);
          }
          break;

        case data === 'back_to_main':
          const mainMenuMessage = `🎯 *Dynamic Capital VIP*

Welcome back! Choose what you'd like to do:`;

          const mainKeyboard = {
            inline_keyboard: [
              [
                { text: "💎 Join VIP Community", callback_data: "view_packages" },
                { text: "🎓 Education Hub", callback_data: "view_education" }
              ],
              [
                { text: "📊 Market Analysis", callback_data: "market_overview" },
                { text: "🎯 Trading Signals", callback_data: "trading_signals" }
              ],
              [
                { text: "🎁 Active Promotions", callback_data: "view_promotions" },
                { text: "👤 My Account", callback_data: "user_status" }
              ],
              [
                { text: "ℹ️ About Us", callback_data: "about_us" },
                { text: "💬 Get Support", callback_data: "contact_support" }
              ]
            ]
          };

          await sendMessage(chatId, mainMenuMessage, mainKeyboard);
          break;

        case data === 'contact_support':
          const supportMessage = "💬 *Contact Support*\n\n" +
            "Our support team is here to help! Choose how you'd like to get assistance:";

          const supportKeyboard = {
            inline_keyboard: [
              [{ text: "📞 Live Chat", url: "https://t.me/DynamicCapital_Support" }],
              [{ text: "📧 Email Support", url: "mailto:support@dynamiccapital.com" }],
              [{ text: "❓ FAQ", callback_data: "view_faq" }],
              [{ text: "🔙 Back to Menu", callback_data: "back_to_main" }]
            ]
          };

          await sendMessage(chatId, supportMessage, supportKeyboard);
          break;

        case data === 'view_faq':
          const faqs = await getFAQs();
          let faqMessage = "❓ *Frequently Asked Questions*\n\n";
          
          faqs.forEach((faq, index) => {
            faqMessage += `**${index + 1}. ${faq.question}**\n`;
            faqMessage += `${faq.answer}\n\n`;
          });

          const faqKeyboard = {
            inline_keyboard: [
              [{ text: "💬 Ask Support", callback_data: "contact_support" }],
              [{ text: "🔙 Back to Menu", callback_data: "back_to_main" }]
            ]
          };

          await sendMessage(chatId, faqMessage, faqKeyboard);
          break;

        case data === 'view_promotions':
          try {
            const promotions = await getActivePromotions();
            let promoMessage = "🎁 *Active Promotions*\n\n";
            
            if (promotions.length > 0) {
              promotions.forEach((promo: any) => {
                promoMessage += `🏷 **${promo.description || 'Special Offer'}**\n`;
                promoMessage += `💰 Discount: ${promo.discount_type === 'percentage' ? promo.discount_value + '%' : '$' + promo.discount_value} OFF\n`;
                promoMessage += `🔑 Code: \`${promo.code}\`\n`;
                promoMessage += `📅 Valid until: ${new Date(promo.valid_until).toLocaleDateString()}\n\n`;
              });
              
              promoMessage += "💡 *How to use:*\n";
              promoMessage += "Copy the promo code and mention it when making your payment!\n";
            } else {
              promoMessage += "No active promotions at the moment.\nFollow us for updates on upcoming deals!";
            }

            const promoKeyboard = {
              inline_keyboard: [
                [{ text: "💎 Join VIP Community", callback_data: "view_packages" }],
                [{ text: "🔙 Back to Menu", callback_data: "back_to_main" }]
              ]
            };

            await sendMessage(chatId, promoMessage, promoKeyboard);
          } catch (error) {
            await sendMessage(chatId, "❌ Unable to load promotions. Please try again later.");
          }
          break;

        default:
          await sendMessage(chatId, "🚧 Feature coming soon!");
          break;
      }
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Error:", error);
    return new Response("Error", { status: 500 });
  }
});