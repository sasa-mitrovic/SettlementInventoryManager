// Real-time Discord message sender
// This listens to database changes and sends Discord messages immediately

import { createClient, RealtimeChannel } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

interface DiscordMessage {
  id: string;
  webhook_response: string;
  discord_channels: {
    webhook_url: string;
    channel_name: string;
    discord_integrations: {
      is_active: boolean;
    };
  };
}

class DiscordMessageService {
  private subscription: RealtimeChannel | null = null;

  async start() {
    console.log('🎧 Starting Discord message listener...');

    try {
      // Listen for new records in discord_message_log
      this.subscription = supabase
        .channel('discord_messages')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'discord_message_log',
            filter: 'success=eq.false',
          },
          (payload) => {
            console.log('📨 New Discord message detected:', payload.new);
            this.processMessage(payload.new as { id: string });
          },
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('✅ Discord message listener connected');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Discord message listener error');
          } else if (status === 'TIMED_OUT') {
            console.warn('⏰ Discord message listener timed out');
          }
        });
    } catch (error) {
      console.error('❌ Failed to start Discord message listener:', error);
      console.log(
        '💡 Discord messages will need to be sent manually using the script',
      );
    }
  }

  async processMessage(message: { id: string }) {
    try {
      console.log(`🚀 Processing message ${message.id}...`);

      // Get the full message details including channel info
      const { data: fullMessage, error } = await supabase
        .from('discord_message_log')
        .select(
          `
          id,
          webhook_response,
          discord_channels (
            webhook_url,
            channel_name,
            discord_integrations (
              is_active
            )
          )
        `,
        )
        .eq('id', message.id)
        .single();

      if (error || !fullMessage) {
        console.error('❌ Error fetching message details:', error);
        return;
      }

      const channels =
        fullMessage.discord_channels as unknown as DiscordMessage['discord_channels'];

      if (!channels?.discord_integrations?.is_active) {
        console.log('⏭️ Skipping inactive integration');
        return;
      }

      // Parse and fix the webhook payload
      let webhookPayload = JSON.parse(fullMessage.webhook_response);
      if (webhookPayload.content) {
        webhookPayload.content = webhookPayload.content.replace(/\\n/g, '\n');
      }

      // Send to Discord
      const response = await fetch(channels.webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload),
      });

      if (response.ok) {
        // Mark as successful
        await supabase
          .from('discord_message_log')
          .update({
            success: true,
            error_message: null,
          })
          .eq('id', message.id);

        console.log('✅ Discord message sent successfully!');

        // Optional: Show a notification (uncomment if you want visual feedback)
        // if (window.showNotification) {
        //   window.showNotification('Discord message sent!', 'success');
        // }
      } else {
        const errorText = await response.text();
        console.error(`❌ Discord webhook failed: ${response.status}`);

        // Update with error
        await supabase
          .from('discord_message_log')
          .update({
            error_message: `HTTP ${response.status}: ${errorText}`,
          })
          .eq('id', message.id);
      }
    } catch (error) {
      console.error('❌ Error processing Discord message:', error);

      // Update with error
      await supabase
        .from('discord_message_log')
        .update({
          error_message:
            error instanceof Error ? error.message : 'Unknown error',
        })
        .eq('id', message.id);
    }
  }

  stop() {
    if (this.subscription) {
      supabase.removeChannel(this.subscription);
      this.subscription = null;
      console.log('🛑 Discord message listener stopped');
    }
  }
}

// Export singleton instance
export const discordMessageService = new DiscordMessageService();
