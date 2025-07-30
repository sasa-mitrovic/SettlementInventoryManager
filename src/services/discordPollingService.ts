// Alternative Discord service using polling instead of WebSocket
// Use this if the realtime WebSocket approach doesn't work

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// Use service role key for full database access (needed to update discord_message_log)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

class DiscordPollingService {
  private intervalId: number | null = null;
  private isProcessing = false;

  start() {
    console.log('🔄 Starting Discord message polling service...');

    // Check for messages every 5 seconds
    this.intervalId = window.setInterval(() => {
      this.checkForMessages();
    }, 5000);

    // Also check immediately
    this.checkForMessages();
  }

  async checkForMessages() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      // Get pending Discord messages
      const { data: pendingMessages, error } = await supabase
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
        .eq('success', false)
        .is('discord_message_id', null)
        .limit(5);

      if (error) {
        console.error('❌ Error fetching pending messages:', error);
        return;
      }

      if (pendingMessages && pendingMessages.length > 0) {
        console.log(
          `📨 Found ${pendingMessages.length} pending Discord messages to send`,
        );

        for (const message of pendingMessages) {
          await this.processMessage(message);
        }
      } else {
        console.log('📭 No pending Discord messages found');
      }
    } catch (error) {
      console.error('❌ Error checking for Discord messages:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  async processMessage(message: any) {
    try {
      console.log(`🚀 Processing message ${message.id}...`);

      const channels =
        message.discord_channels as unknown as DiscordMessage['discord_channels'];

      if (!channels?.discord_integrations?.is_active) {
        console.log('⏭️ Skipping inactive integration');
        return;
      }

      console.log(`🚀 Processing Discord message ${message.id}...`);
      console.log(
        `📡 Webhook URL: ${channels.webhook_url.substring(0, 50)}...`,
      );

      // Parse and fix the webhook payload
      let webhookPayload = JSON.parse(message.webhook_response);
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

      console.log(`📊 Discord response status: ${response.status}`);

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
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('🛑 Discord polling service stopped');
    }
  }
}

// Export singleton instance
export const discordPollingService = new DiscordPollingService();
