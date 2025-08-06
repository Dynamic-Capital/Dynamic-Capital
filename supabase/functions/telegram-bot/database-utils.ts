// Database utility functions for the Telegram bot
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

// Content management functions
export async function getBotContent(contentKey: string): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('bot_content')
      .select('content_value')
      .eq('content_key', contentKey)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error(`Error fetching content for ${contentKey}:`, error);
      return null;
    }

    return data?.content_value || null;
  } catch (error) {
    console.error(`Exception in getBotContent for ${contentKey}:`, error);
    return null;
  }
}

export async function setBotContent(contentKey: string, contentValue: string, adminId: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('bot_content')
      .upsert({
        content_key: contentKey,
        content_value: contentValue,
        last_modified_by: adminId,
        updated_at: new Date().toISOString()
      });

    if (!error) {
      // Log admin action
      await logAdminAction(adminId, 'content_update', `Updated content: ${contentKey}`, 'bot_content', null, {}, { content_key: contentKey, content_value: contentValue });
    }

    return !error;
  } catch (error) {
    console.error('Exception in setBotContent:', error);
    return false;
  }
}

// Settings management functions
export async function getBotSetting(settingKey: string): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('bot_settings')
      .select('setting_value')
      .eq('setting_key', settingKey)
      .eq('is_active', true)
      .single();

    return data?.setting_value || null;
  } catch (error) {
    console.error(`Error fetching setting ${settingKey}:`, error);
    return null;
  }
}

export async function setBotSetting(settingKey: string, settingValue: string, adminId: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('bot_settings')
      .upsert({
        setting_key: settingKey,
        setting_value: settingValue,
        updated_at: new Date().toISOString()
      });

    if (!error) {
      await logAdminAction(adminId, 'setting_update', `Updated setting: ${settingKey}`, 'bot_settings', null, {}, { setting_key: settingKey, setting_value: settingValue });
    }

    return !error;
  } catch (error) {
    console.error('Exception in setBotSetting:', error);
    return false;
  }
}

// VIP package management functions
export async function getVipPackages(): Promise<any[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('subscription_plans')
      .select('*')
      .order('price', { ascending: true });

    return data || [];
  } catch (error) {
    console.error('Error fetching VIP packages:', error);
    return [];
  }
}

export async function createVipPackage(packageData: any, adminId: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('subscription_plans')
      .insert(packageData);

    if (!error) {
      await logAdminAction(adminId, 'package_create', `Created VIP package: ${packageData.name}`, 'subscription_plans', null, {}, packageData);
    }

    return !error;
  } catch (error) {
    console.error('Exception in createVipPackage:', error);
    return false;
  }
}

export async function updateVipPackage(packageId: string, packageData: any, adminId: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('subscription_plans')
      .update(packageData)
      .eq('id', packageId);

    if (!error) {
      await logAdminAction(adminId, 'package_update', `Updated VIP package: ${packageId}`, 'subscription_plans', packageId, {}, packageData);
    }

    return !error;
  } catch (error) {
    console.error('Exception in updateVipPackage:', error);
    return false;
  }
}

export async function deleteVipPackage(packageId: string, adminId: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('subscription_plans')
      .delete()
      .eq('id', packageId);

    if (!error) {
      await logAdminAction(adminId, 'package_delete', `Deleted VIP package: ${packageId}`, 'subscription_plans', packageId, {}, {});
    }

    return !error;
  } catch (error) {
    console.error('Exception in deleteVipPackage:', error);
    return false;
  }
}

// Education package management functions
export async function getEducationPackages(): Promise<any[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('education_packages')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true });

    return data || [];
  } catch (error) {
    console.error('Error fetching education packages:', error);
    return [];
  }
}

export async function createEducationPackage(packageData: any, adminId: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('education_packages')
      .insert(packageData);

    if (!error) {
      await logAdminAction(adminId, 'edu_package_create', `Created education package: ${packageData.name}`, 'education_packages', null, {}, packageData);
    }

    return !error;
  } catch (error) {
    console.error('Exception in createEducationPackage:', error);
    return false;
  }
}

// Promotion management functions
export async function getActivePromotions(): Promise<any[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('promotions')
      .select('*')
      .eq('is_active', true)
      .gte('valid_until', new Date().toISOString())
      .order('created_at', { ascending: false });

    return data || [];
  } catch (error) {
    console.error('Error fetching promotions:', error);
    return [];
  }
}

export async function createPromotion(promoData: any, adminId: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('promotions')
      .insert(promoData);

    if (!error) {
      await logAdminAction(adminId, 'promo_create', `Created promotion: ${promoData.code}`, 'promotions', null, {}, promoData);
    }

    return !error;
  } catch (error) {
    console.error('Exception in createPromotion:', error);
    return false;
  }
}

// Admin logging function
export async function logAdminAction(
  adminId: string,
  actionType: string,
  description: string,
  affectedTable?: string,
  affectedRecordId?: string,
  oldValues?: any,
  newValues?: any
): Promise<void> {
  try {
    await supabaseAdmin
      .from('admin_logs')
      .insert({
        admin_telegram_id: adminId,
        action_type: actionType,
        action_description: description,
        affected_table: affectedTable,
        affected_record_id: affectedRecordId,
        old_values: oldValues,
        new_values: newValues
      });
  } catch (error) {
    console.error('Error logging admin action:', error);
  }
}

// User activity functions
export async function updateUserActivity(telegramUserId: string, activityData: any = {}): Promise<void> {
  try {
    // Update user's last activity
    await supabaseAdmin
      .from('bot_users')
      .upsert({
        telegram_id: telegramUserId,
        updated_at: new Date().toISOString(),
        follow_up_count: 0 // Reset follow-up count on activity
      }, {
        onConflict: 'telegram_id'
      });

    // Update active session
    await supabaseAdmin
      .from('user_sessions')
      .update({
        last_activity: new Date().toISOString(),
        session_data: activityData
      })
      .eq('telegram_user_id', telegramUserId)
      .eq('is_active', true);

    // Track interaction
    await supabaseAdmin
      .from('user_interactions')
      .insert({
        telegram_user_id: telegramUserId,
        interaction_type: 'message',
        interaction_data: activityData,
        created_at: new Date().toISOString()
      });

  } catch (error) {
    console.error('Error updating user activity:', error);
  }
}

// Utility function to format content with variables
export function formatContent(content: string, variables: Record<string, string>): string {
  let formattedContent = content;
  
  Object.entries(variables).forEach(([key, value]) => {
    const placeholder = `{${key}}`;
    formattedContent = formattedContent.replace(new RegExp(placeholder, 'g'), value || '');
  });
  
  return formattedContent;
}