export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      abuse_bans: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          reason: string | null
          telegram_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          reason?: string | null
          telegram_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          reason?: string | null
          telegram_id?: string
        }
        Relationships: []
      }
      admin_logs: {
        Row: {
          action_description: string
          action_type: string
          admin_telegram_id: string
          affected_record_id: string | null
          affected_table: string | null
          created_at: string
          id: string
          new_values: Json | null
          old_values: Json | null
        }
        Insert: {
          action_description: string
          action_type: string
          admin_telegram_id: string
          affected_record_id?: string | null
          affected_table?: string | null
          created_at?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
        }
        Update: {
          action_description?: string
          action_type?: string
          admin_telegram_id?: string
          affected_record_id?: string | null
          affected_table?: string | null
          created_at?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
        }
        Relationships: []
      }
      auto_reply_templates: {
        Row: {
          conditions: Json | null
          created_at: string
          display_order: number | null
          id: string
          is_active: boolean
          message_template: string
          name: string
          trigger_type: string
          updated_at: string
        }
        Insert: {
          conditions?: Json | null
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean
          message_template: string
          name: string
          trigger_type: string
          updated_at?: string
        }
        Update: {
          conditions?: Json | null
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean
          message_template?: string
          name?: string
          trigger_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      bank_accounts: {
        Row: {
          account_name: string
          account_number: string
          bank_name: string
          created_at: string
          currency: string
          display_order: number | null
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          account_name: string
          account_number: string
          bank_name: string
          created_at?: string
          currency?: string
          display_order?: number | null
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          account_name?: string
          account_number?: string
          bank_name?: string
          created_at?: string
          currency?: string
          display_order?: number | null
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      bot_content: {
        Row: {
          content_key: string
          content_type: string
          content_value: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          last_modified_by: string | null
          updated_at: string
        }
        Insert: {
          content_key: string
          content_type?: string
          content_value: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          last_modified_by?: string | null
          updated_at?: string
        }
        Update: {
          content_key?: string
          content_type?: string
          content_value?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          last_modified_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      bot_sessions: {
        Row: {
          activity_count: number | null
          created_at: string
          duration_minutes: number | null
          id: string
          ip_address: string | null
          session_data: Json | null
          session_end: string | null
          session_start: string
          telegram_user_id: string
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          activity_count?: number | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          ip_address?: string | null
          session_data?: Json | null
          session_end?: string | null
          session_start?: string
          telegram_user_id: string
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          activity_count?: number | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          ip_address?: string | null
          session_data?: Json | null
          session_end?: string | null
          session_start?: string
          telegram_user_id?: string
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      bot_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          setting_key: string
          setting_type: string
          setting_value: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          setting_key: string
          setting_type?: string
          setting_value: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          setting_key?: string
          setting_type?: string
          setting_value?: string
          updated_at?: string
        }
        Relationships: []
      }
      bot_users: {
        Row: {
          created_at: string
          current_plan_id: string | null
          first_name: string | null
          follow_up_count: number | null
          id: string
          is_admin: boolean | null
          is_vip: boolean
          last_follow_up: string | null
          last_name: string | null
          notes: string | null
          subscription_expires_at: string | null
          telegram_id: string
          updated_at: string
          username: string | null
        }
        Insert: {
          created_at?: string
          current_plan_id?: string | null
          first_name?: string | null
          follow_up_count?: number | null
          id?: string
          is_admin?: boolean | null
          is_vip?: boolean
          last_follow_up?: string | null
          last_name?: string | null
          notes?: string | null
          subscription_expires_at?: string | null
          telegram_id: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          created_at?: string
          current_plan_id?: string | null
          first_name?: string | null
          follow_up_count?: number | null
          id?: string
          is_admin?: boolean | null
          is_vip?: boolean
          last_follow_up?: string | null
          last_name?: string | null
          notes?: string | null
          subscription_expires_at?: string | null
          telegram_id?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bot_users_current_plan_id_fkey"
            columns: ["current_plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      broadcast_messages: {
        Row: {
          content: string | null
          created_at: string | null
          delivery_status: string | null
          failed_deliveries: number | null
          id: string
          media_file_id: string | null
          media_file_path: string | null
          media_file_size: number | null
          media_mime_type: string | null
          media_type: string | null
          media_url: string | null
          scheduled_at: string | null
          sent_at: string | null
          successful_deliveries: number | null
          target_audience: Json | null
          title: string
          total_recipients: number | null
          updated_at: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          delivery_status?: string | null
          failed_deliveries?: number | null
          id?: string
          media_file_id?: string | null
          media_file_path?: string | null
          media_file_size?: number | null
          media_mime_type?: string | null
          media_type?: string | null
          media_url?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          successful_deliveries?: number | null
          target_audience?: Json | null
          title: string
          total_recipients?: number | null
          updated_at?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          delivery_status?: string | null
          failed_deliveries?: number | null
          id?: string
          media_file_id?: string | null
          media_file_path?: string | null
          media_file_size?: number | null
          media_mime_type?: string | null
          media_type?: string | null
          media_url?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          successful_deliveries?: number | null
          target_audience?: Json | null
          title?: string
          total_recipients?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "broadcast_messages_media_file_id_fkey"
            columns: ["media_file_id"]
            isOneToOne: false
            referencedRelation: "media_files"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_memberships: {
        Row: {
          added_at: string | null
          added_by: string | null
          channel_id: string
          channel_name: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          package_id: string | null
          telegram_user_id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          added_at?: string | null
          added_by?: string | null
          channel_id: string
          channel_name?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          package_id?: string | null
          telegram_user_id: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          added_at?: string | null
          added_by?: string | null
          channel_id?: string
          channel_name?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          package_id?: string | null
          telegram_user_id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "channel_memberships_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_memberships_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_links: {
        Row: {
          created_at: string
          display_name: string
          display_order: number | null
          icon_emoji: string | null
          id: string
          is_active: boolean
          platform: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          display_name: string
          display_order?: number | null
          icon_emoji?: string | null
          id?: string
          is_active?: boolean
          platform: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          display_name?: string
          display_order?: number | null
          icon_emoji?: string | null
          id?: string
          is_active?: boolean
          platform?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      conversion_tracking: {
        Row: {
          conversion_data: Json | null
          conversion_type: string
          conversion_value: number | null
          created_at: string
          funnel_step: number | null
          id: string
          plan_id: string | null
          promo_code: string | null
          telegram_user_id: string
        }
        Insert: {
          conversion_data?: Json | null
          conversion_type: string
          conversion_value?: number | null
          created_at?: string
          funnel_step?: number | null
          id?: string
          plan_id?: string | null
          promo_code?: string | null
          telegram_user_id: string
        }
        Update: {
          conversion_data?: Json | null
          conversion_type?: string
          conversion_value?: number | null
          created_at?: string
          funnel_step?: number | null
          id?: string
          plan_id?: string | null
          promo_code?: string | null
          telegram_user_id?: string
        }
        Relationships: []
      }
      daily_analytics: {
        Row: {
          button_clicks: Json | null
          conversion_rates: Json | null
          created_at: string
          date: string
          id: string
          new_users: number | null
          revenue: number | null
          top_promo_codes: Json | null
          total_users: number | null
          updated_at: string
        }
        Insert: {
          button_clicks?: Json | null
          conversion_rates?: Json | null
          created_at?: string
          date: string
          id?: string
          new_users?: number | null
          revenue?: number | null
          top_promo_codes?: Json | null
          total_users?: number | null
          updated_at?: string
        }
        Update: {
          button_clicks?: Json | null
          conversion_rates?: Json | null
          created_at?: string
          date?: string
          id?: string
          new_users?: number | null
          revenue?: number | null
          top_promo_codes?: Json | null
          total_users?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      education_categories: {
        Row: {
          created_at: string
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      education_enrollments: {
        Row: {
          completion_date: string | null
          created_at: string
          enrollment_date: string
          enrollment_status: string
          id: string
          notes: string | null
          package_id: string
          payment_amount: number | null
          payment_method: string | null
          payment_reference: string | null
          payment_status: string
          progress_percentage: number | null
          receipt_file_path: string | null
          receipt_telegram_file_id: string | null
          start_date: string | null
          student_email: string | null
          student_first_name: string | null
          student_last_name: string | null
          student_phone: string | null
          student_telegram_id: string
          student_telegram_username: string | null
          updated_at: string
        }
        Insert: {
          completion_date?: string | null
          created_at?: string
          enrollment_date?: string
          enrollment_status?: string
          id?: string
          notes?: string | null
          package_id: string
          payment_amount?: number | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string
          progress_percentage?: number | null
          receipt_file_path?: string | null
          receipt_telegram_file_id?: string | null
          start_date?: string | null
          student_email?: string | null
          student_first_name?: string | null
          student_last_name?: string | null
          student_phone?: string | null
          student_telegram_id: string
          student_telegram_username?: string | null
          updated_at?: string
        }
        Update: {
          completion_date?: string | null
          created_at?: string
          enrollment_date?: string
          enrollment_status?: string
          id?: string
          notes?: string | null
          package_id?: string
          payment_amount?: number | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string
          progress_percentage?: number | null
          receipt_file_path?: string | null
          receipt_telegram_file_id?: string | null
          start_date?: string | null
          student_email?: string | null
          student_first_name?: string | null
          student_last_name?: string | null
          student_phone?: string | null
          student_telegram_id?: string
          student_telegram_username?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "education_enrollments_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "education_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      education_packages: {
        Row: {
          category_id: string | null
          created_at: string
          currency: string
          current_students: number | null
          description: string | null
          detailed_description: string | null
          difficulty_level: string | null
          duration_weeks: number
          enrollment_deadline: string | null
          features: string[] | null
          id: string
          instructor_bio: string | null
          instructor_image_url: string | null
          instructor_name: string | null
          is_active: boolean
          is_featured: boolean
          is_lifetime: boolean
          learning_outcomes: string[] | null
          max_students: number | null
          name: string
          price: number
          requirements: string[] | null
          starts_at: string | null
          thumbnail_url: string | null
          updated_at: string
          video_preview_url: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          currency?: string
          current_students?: number | null
          description?: string | null
          detailed_description?: string | null
          difficulty_level?: string | null
          duration_weeks: number
          enrollment_deadline?: string | null
          features?: string[] | null
          id?: string
          instructor_bio?: string | null
          instructor_image_url?: string | null
          instructor_name?: string | null
          is_active?: boolean
          is_featured?: boolean
          is_lifetime?: boolean
          learning_outcomes?: string[] | null
          max_students?: number | null
          name: string
          price: number
          requirements?: string[] | null
          starts_at?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          video_preview_url?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string
          currency?: string
          current_students?: number | null
          description?: string | null
          detailed_description?: string | null
          difficulty_level?: string | null
          duration_weeks?: number
          enrollment_deadline?: string | null
          features?: string[] | null
          id?: string
          instructor_bio?: string | null
          instructor_image_url?: string | null
          instructor_name?: string | null
          is_active?: boolean
          is_featured?: boolean
          is_lifetime?: boolean
          learning_outcomes?: string[] | null
          max_students?: number | null
          name?: string
          price?: number
          requirements?: string[] | null
          starts_at?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          video_preview_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "education_packages_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "education_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      kv_config: {
        Row: {
          created_at: string
          key: string
          updated_at: string
          value: Json | null
        }
        Insert: {
          created_at?: string
          key: string
          updated_at?: string
          value?: Json | null
        }
        Update: {
          created_at?: string
          key?: string
          updated_at?: string
          value?: Json | null
        }
        Relationships: []
      }
      media_files: {
        Row: {
          caption: string | null
          created_at: string | null
          file_path: string
          file_size: number | null
          file_type: string
          filename: string
          id: string
          telegram_file_id: string | null
          updated_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          file_path: string
          file_size?: number | null
          file_type: string
          filename: string
          id?: string
          telegram_file_id?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          file_path?: string
          file_size?: number | null
          file_type?: string
          filename?: string
          id?: string
          telegram_file_id?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: []
      }
      payment_intents: {
        Row: {
          created_at: string
          currency: string
          expected_amount: number
          id: string
          method: string
          notes: string | null
          pay_code: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          expected_amount: number
          id?: string
          method: string
          notes?: string | null
          pay_code?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          expected_amount?: number
          id?: string
          method?: string
          notes?: string | null
          pay_code?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          payment_method: string
          payment_provider_id: string | null
          plan_id: string
          status: string
          updated_at: string
          user_id: string
          webhook_data: Json | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          payment_method: string
          payment_provider_id?: string | null
          plan_id: string
          status?: string
          updated_at?: string
          user_id: string
          webhook_data?: Json | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          payment_method?: string
          payment_provider_id?: string | null
          plan_id?: string
          status?: string
          updated_at?: string
          user_id?: string
          webhook_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "bot_users"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_channels: {
        Row: {
          channel_name: string
          channel_type: string | null
          chat_id: string | null
          created_at: string | null
          id: string
          invite_link: string
          is_active: boolean | null
          plan_id: string | null
          updated_at: string | null
        }
        Insert: {
          channel_name: string
          channel_type?: string | null
          chat_id?: string | null
          created_at?: string | null
          id?: string
          invite_link: string
          is_active?: boolean | null
          plan_id?: string | null
          updated_at?: string | null
        }
        Update: {
          channel_name?: string
          channel_type?: string | null
          chat_id?: string | null
          created_at?: string | null
          id?: string
          invite_link?: string
          is_active?: boolean | null
          plan_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_channels_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          email: string | null
          first_name: string | null
          id: string
          is_active: boolean | null
          last_name: string | null
          phone: string | null
          role: string | null
          telegram_id: string | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          first_name?: string | null
          id: string
          is_active?: boolean | null
          last_name?: string | null
          phone?: string | null
          role?: string | null
          telegram_id?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          is_active?: boolean | null
          last_name?: string | null
          phone?: string | null
          role?: string | null
          telegram_id?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      promo_analytics: {
        Row: {
          created_at: string
          discount_amount: number | null
          event_type: string
          final_amount: number | null
          id: string
          plan_id: string | null
          promo_code: string
          telegram_user_id: string
        }
        Insert: {
          created_at?: string
          discount_amount?: number | null
          event_type: string
          final_amount?: number | null
          id?: string
          plan_id?: string | null
          promo_code: string
          telegram_user_id: string
        }
        Update: {
          created_at?: string
          discount_amount?: number | null
          event_type?: string
          final_amount?: number | null
          id?: string
          plan_id?: string | null
          promo_code?: string
          telegram_user_id?: string
        }
        Relationships: []
      }
      promotion_usage: {
        Row: {
          id: string
          promotion_id: string
          telegram_user_id: string
          used_at: string
        }
        Insert: {
          id?: string
          promotion_id: string
          telegram_user_id: string
          used_at?: string
        }
        Update: {
          id?: string
          promotion_id?: string
          telegram_user_id?: string
          used_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotion_usage_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          code: string
          created_at: string
          current_uses: number | null
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean | null
          max_uses: number | null
          updated_at: string
          valid_from: string
          valid_until: string
        }
        Insert: {
          code: string
          created_at?: string
          current_uses?: number | null
          description?: string | null
          discount_type: string
          discount_value: number
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          updated_at?: string
          valid_from?: string
          valid_until: string
        }
        Update: {
          code?: string
          created_at?: string
          current_uses?: number | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          updated_at?: string
          valid_from?: string
          valid_until?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          created_at: string
          currency: string
          duration_months: number
          features: string[] | null
          id: string
          is_lifetime: boolean
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          duration_months: number
          features?: string[] | null
          id?: string
          is_lifetime?: boolean
          name: string
          price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          duration_months?: number
          features?: string[] | null
          id?: string
          is_lifetime?: boolean
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_analytics: {
        Row: {
          browser: string | null
          created_at: string | null
          device_type: string | null
          event_data: Json | null
          event_type: string
          id: string
          ip_address: unknown | null
          page_url: string | null
          referrer: string | null
          session_id: string | null
          telegram_user_id: string
          user_agent: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          browser?: string | null
          created_at?: string | null
          device_type?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown | null
          page_url?: string | null
          referrer?: string | null
          session_id?: string | null
          telegram_user_id: string
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          browser?: string | null
          created_at?: string | null
          device_type?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown | null
          page_url?: string | null
          referrer?: string | null
          session_id?: string | null
          telegram_user_id?: string
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      user_interactions: {
        Row: {
          created_at: string
          id: string
          interaction_data: Json | null
          interaction_type: string
          page_context: string | null
          session_id: string | null
          telegram_user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          interaction_data?: Json | null
          interaction_type: string
          page_context?: string | null
          session_id?: string | null
          telegram_user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          interaction_data?: Json | null
          interaction_type?: string
          page_context?: string | null
          session_id?: string | null
          telegram_user_id?: string
        }
        Relationships: []
      }
      user_package_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          notes: string | null
          package_id: string | null
          telegram_added: boolean | null
          telegram_channels: string[] | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          package_id?: string | null
          telegram_added?: boolean | null
          telegram_channels?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          package_id?: string | null
          telegram_added?: boolean | null
          telegram_channels?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_package_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_package_assignments_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_package_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          awaiting_input: string | null
          created_at: string
          end_reason: string | null
          ended_at: string | null
          id: string
          is_active: boolean
          last_activity: string
          package_data: Json | null
          promo_data: Json | null
          session_data: Json | null
          telegram_user_id: string
        }
        Insert: {
          awaiting_input?: string | null
          created_at?: string
          end_reason?: string | null
          ended_at?: string | null
          id?: string
          is_active?: boolean
          last_activity?: string
          package_data?: Json | null
          promo_data?: Json | null
          session_data?: Json | null
          telegram_user_id: string
        }
        Update: {
          awaiting_input?: string | null
          created_at?: string
          end_reason?: string | null
          ended_at?: string | null
          id?: string
          is_active?: boolean
          last_activity?: string
          package_data?: Json | null
          promo_data?: Json | null
          session_data?: Json | null
          telegram_user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          bank_details: string | null
          created_at: string
          id: string
          is_active: boolean | null
          payment_instructions: string | null
          payment_method: string | null
          payment_status: string | null
          plan_id: string | null
          receipt_file_path: string | null
          receipt_telegram_file_id: string | null
          subscription_end_date: string | null
          subscription_start_date: string | null
          telegram_user_id: string
          telegram_username: string | null
          updated_at: string
        }
        Insert: {
          bank_details?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          payment_instructions?: string | null
          payment_method?: string | null
          payment_status?: string | null
          plan_id?: string | null
          receipt_file_path?: string | null
          receipt_telegram_file_id?: string | null
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          telegram_user_id: string
          telegram_username?: string | null
          updated_at?: string
        }
        Update: {
          bank_details?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          payment_instructions?: string | null
          payment_method?: string | null
          payment_status?: string | null
          plan_id?: string | null
          receipt_file_path?: string | null
          receipt_telegram_file_id?: string | null
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          telegram_user_id?: string
          telegram_username?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      user_surveys: {
        Row: {
          created_at: string
          id: string
          main_goal: string
          monthly_budget: string
          recommended_plan_id: string | null
          survey_completed_at: string | null
          telegram_user_id: string
          trading_frequency: string
          trading_level: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          main_goal: string
          monthly_budget: string
          recommended_plan_id?: string | null
          survey_completed_at?: string | null
          telegram_user_id: string
          trading_frequency: string
          trading_level: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          main_goal?: string
          monthly_budget?: string
          recommended_plan_id?: string | null
          survey_completed_at?: string | null
          telegram_user_id?: string
          trading_frequency?: string
          trading_level?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_admin: {
        Args: { full_name: string; username: string }
        Returns: undefined
      }
      batch_insert_user_interactions: {
        Args: { interactions: Json }
        Returns: undefined
      }
      check_extensions_in_public: {
        Args: Record<PropertyKey, never>
        Returns: {
          extension_name: unknown
          schema_name: unknown
        }[]
      }
      cleanup_old_media_files: {
        Args: { cleanup_days?: number }
        Returns: Json
      }
      generate_uuid: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_bot_content_batch: {
        Args: { content_keys: string[] }
        Returns: {
          content_key: string
          content_value: string
        }[]
      }
      get_bot_settings_batch: {
        Args: { setting_keys: string[] }
        Returns: {
          setting_key: string
          setting_value: string
        }[]
      }
      get_bot_stats: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_telegram_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_dashboard_stats_fast: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_masked_payment_info: {
        Args: { payment_id: string }
        Returns: Json
      }
      get_remaining_security_notes: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_security_recommendations: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_analytics_summary: {
        Args: { p_days?: number; p_telegram_user_id: string }
        Returns: Json
      }
      get_user_complete_data: {
        Args: { telegram_user_id_param: string }
        Returns: Json
      }
      get_user_role: {
        Args: { user_telegram_id: string }
        Returns: string
      }
      get_user_subscription_status: {
        Args: { telegram_user_id: string }
        Returns: {
          days_remaining: number
          is_expired: boolean
          is_vip: boolean
          payment_status: string
          plan_name: string
          subscription_end_date: string
        }[]
      }
      is_service_role: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_telegram_admin: {
        Args: { telegram_user_id: string }
        Returns: boolean
      }
      is_user_admin: {
        Args: { user_telegram_id: string }
        Returns: boolean
      }
      is_valid_otp_timeframe: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      make_secure_http_request: {
        Args: { body?: string; headers?: Json; method: string; url: string }
        Returns: Json
      }
      record_promo_usage: {
        Args: { p_promotion_id: string; p_telegram_user_id: string }
        Returns: undefined
      }
      track_user_event: {
        Args: {
          p_event_data?: Json
          p_event_type: string
          p_page_url?: string
          p_referrer?: string
          p_session_id?: string
          p_telegram_user_id: string
          p_user_agent?: string
        }
        Returns: string
      }
      update_daily_analytics: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      validate_promo_code: {
        Args: { p_code: string; p_telegram_user_id: string }
        Returns: {
          discount_type: string
          discount_value: number
          promotion_id: string
          reason: string
          valid: boolean
        }[]
      }
      validate_telegram_user_id: {
        Args: { telegram_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
