// Discord message service - uses Supabase Realtime to trigger Edge Function processing
// The Edge Function uses the service role key server-side for secure database updates

import { RealtimeChannel } from '@supabase/supabase-js';
import { supabaseClient } from '../supabase/supabaseClient';

class DiscordPollingService {
  private subscription: RealtimeChannel | null = null;
  private isProcessing = false;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private fallbackIntervalId: ReturnType<typeof setInterval> | null = null;

  // Debounce delay in ms - wait this long after last message before processing
  private readonly DEBOUNCE_DELAY = 1000;
  // Fallback interval in ms - check for missed messages periodically
  private readonly FALLBACK_INTERVAL = 60000;

  start() {
    console.log('🔄 Starting Discord message service with Realtime...');

    // Subscribe to new messages in discord_message_log
    this.subscription = supabaseClient
      .channel('discord_message_queue')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'discord_message_log',
        },
        (payload) => {
          console.log('📨 New Discord message queued:', payload.new);
          this.scheduleProcessing();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Discord Realtime subscription active');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Discord Realtime subscription error');
        } else if (status === 'TIMED_OUT') {
          console.warn('⏰ Discord Realtime subscription timed out, will retry...');
        }
      });

    // Process any pending messages immediately on start
    this.processMessages();

    // Set up a fallback interval to catch any missed messages
    this.fallbackIntervalId = setInterval(() => {
      this.processMessages();
    }, this.FALLBACK_INTERVAL);
  }

  // Debounce processing to batch rapid inserts
  private scheduleProcessing() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.processMessages();
      this.debounceTimer = null;
    }, this.DEBOUNCE_DELAY);
  }

  async processMessages() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      // Call the Edge Function to process pending Discord messages
      const { data, error } = await supabaseClient.functions.invoke(
        'process-discord-messages',
        { method: 'POST' }
      );

      if (error) {
        console.error('❌ Error calling Discord processing function:', error);
        return;
      }

      if (data?.processed > 0) {
        console.log(
          `📨 Processed ${data.processed} Discord messages (${data.successCount} success, ${data.errorCount} errors)`
        );
      }
    } catch (error) {
      console.error('❌ Error in Discord message service:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  stop() {
    // Clean up Realtime subscription
    if (this.subscription) {
      supabaseClient.removeChannel(this.subscription);
      this.subscription = null;
    }

    // Clean up debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    // Clean up fallback interval
    if (this.fallbackIntervalId) {
      clearInterval(this.fallbackIntervalId);
      this.fallbackIntervalId = null;
    }

    console.log('🛑 Discord message service stopped');
  }
}

// Export singleton instance
export const discordPollingService = new DiscordPollingService();
