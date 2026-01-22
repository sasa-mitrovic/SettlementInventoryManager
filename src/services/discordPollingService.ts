// Alternative Discord service using polling instead of WebSocket
// Uses anon key for security - may need RLS policies adjusted for updates

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
// Use anon key for client-side access (secure)
const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
          discord_channel_id,
          discord_channels (
            id,
            webhook_url,
            channel_name,
            discord_integrations (
              id,
              is_active
            )
          )
        `,
        )
        .or('success.is.null,success.eq.false')
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
      console.log('📋 Full message data:', JSON.stringify(message, null, 2));

      const channel = message.discord_channels;
      console.log('📡 Channel data:', channel);

      if (!channel) {
        console.log('❌ No discord_channels found in message');
        return;
      }

      const integration = channel.discord_integrations;
      console.log('🔗 Integration data:', integration);

      if (!integration) {
        console.log('❌ No discord_integrations found in channel');
        return;
      }

      if (!integration.is_active) {
        console.log('⏭️ Skipping inactive integration');
        return;
      }

      console.log(`🚀 Processing Discord message ${message.id}...`);
      console.log(`📡 Webhook URL: ${channel.webhook_url.substring(0, 50)}...`);

      // Parse and fix the webhook payload
      let webhookPayload = JSON.parse(message.webhook_response);
      if (webhookPayload.content) {
        webhookPayload.content = webhookPayload.content.replace(/\\n/g, '\n');
      }

      // Send to Discord
      const response = await fetch(channel.webhook_url, {
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
