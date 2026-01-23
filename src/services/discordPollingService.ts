// Discord polling service - calls Edge Function to process messages securely
// The Edge Function uses the service role key server-side for secure database updates

import { supabaseClient } from '../supabase/supabaseClient';

class DiscordPollingService {
  private intervalId: number | null = null;
  private isProcessing = false;

  start() {
    console.log('🔄 Starting Discord message polling service...');

    // Check for messages every 5 seconds
    this.intervalId = window.setInterval(() => {
      this.processMessages();
    }, 5000);

    // Also check immediately
    this.processMessages();
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
        console.log(`📨 Processed ${data.processed} Discord messages (${data.successCount} success, ${data.errorCount} errors)`);
      }
    } catch (error) {
      console.error('❌ Error in Discord polling service:', error);
    } finally {
      this.isProcessing = false;
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
