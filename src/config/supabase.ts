// Centralized Supabase configuration
export const SUPABASE_CONFIG = {
  // Project configuration
  PROJECT_ID: 'qeejuomcapbdlhnjqjcc',
  URL: 'https://qeejuomcapbdlhnjqjcc.supabase.co',
  ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlZWp1b21jYXBiZGxobmpxamNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyMDE4MTUsImV4cCI6MjA2OTc3NzgxNX0.GfK9Wwx0WX_GhDIz1sIQzNstyAQIF2Jd6p7t02G44zk',
  
  // Edge functions base URL
  FUNCTIONS_URL: 'https://qeejuomcapbdlhnjqjcc.functions.supabase.co',
  
  // Edge function endpoints
  FUNCTIONS: {
    // Payment & checkout
    CHECKOUT_INIT: 'checkout-init',
    INTENT: 'intent',
    PLANS: 'plans',
    PROMO_VALIDATE: 'promo-validate',
    ACTIVE_PROMOS: 'active-promos',
    SUBSCRIPTION_STATUS: 'subscription-status',
    CRYPTO_TXID: 'crypto-txid',
    
    // Admin functions
    ADMIN_SESSION: 'admin-session',
    ADMIN_BANS: 'admin-bans',
    ADMIN_LOGS: 'admin-logs',
    ADMIN_ACT_ON_PAYMENT: 'admin-act-on-payment',
    ADMIN_LIST_PENDING: 'admin-list-pending',
    
    // Bot & system
    BOT_STATUS_CHECK: 'bot-status-check',
    ROTATE_WEBHOOK_SECRET: 'rotate-webhook-secret',
    RESET_BOT: 'reset-bot',
    BROADCAST_DISPATCH: 'broadcast-dispatch',
    WEB_APP_HEALTH: 'web-app-health',
    THEME_GET: 'theme-get',
    THEME_SAVE: 'theme-save',
    
    // Content & data
    CONTENT_BATCH: 'content-batch',
    ANALYTICS_DATA: 'analytics-data',
    MINIAPP: 'miniapp',
    
    // Verification
    VERIFY_INITDATA: 'verify-initdata',
  }
} as const;

// Helper function to build function URLs
export const buildFunctionUrl = (functionName: keyof typeof SUPABASE_CONFIG.FUNCTIONS): string => {
  return `${SUPABASE_CONFIG.FUNCTIONS_URL}/${SUPABASE_CONFIG.FUNCTIONS[functionName]}`;
};

// Helper function for making authenticated requests to edge functions
export const callEdgeFunction = async (
  functionName: keyof typeof SUPABASE_CONFIG.FUNCTIONS,
  options: {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
    token?: string;
  } = {}
): Promise<Response> => {
  const { method = 'GET', body, headers = {}, token } = options;
  
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_CONFIG.ANON_KEY,
    ...headers,
  };

  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }

  return fetch(buildFunctionUrl(functionName), {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });
};

// Telegram bot configuration
export const TELEGRAM_CONFIG = {
  BOT_USERNAME: 'Dynamic_VIP_BOT',
  BOT_URL: 'https://t.me/Dynamic_VIP_BOT',
} as const;

// Crypto configuration  
export const CRYPTO_CONFIG = {
  USDT_TRC20_ADDRESS: 'TEX7N2YKZX2KJR8HXRZ5WQGK5JFCGR7',
  NETWORKS: {
    TRC20: 'TRON (TRC20)',
    ERC20: 'Ethereum (ERC20)',
  }
} as const;