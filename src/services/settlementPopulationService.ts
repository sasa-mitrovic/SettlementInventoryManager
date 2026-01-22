// Settlement population service for client-side automation
// This service calls the Supabase Edge Function to populate settlements
// The edge function has proper server-side access to handle database operations

import { supabaseClient } from '../supabase/supabaseClient';

interface PopulateSettlementsResponse {
  success: boolean;
  message?: string;
  insertedCount?: number;
  existingCount?: number;
  error?: string;
}

class SettlementPopulationService {
  private intervalId: number | null = null;
  private isRunning = false;

  async populateSettlements() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    try {
      // Call the Supabase Edge Function to populate settlements
      // The edge function has server-side access and handles all DB operations
      const { data, error } = await supabaseClient.functions.invoke<PopulateSettlementsResponse>(
        'populate-settlements',
        {
          method: 'POST',
        }
      );

      if (error) {
        console.error('Error calling populate-settlements function:', error);
        return;
      }

      if (data?.success) {
        if (data.insertedCount && data.insertedCount > 0) {
          console.log(`Populated ${data.insertedCount} new settlements`);
        }
      } else if (data?.error) {
        console.error('Settlement population failed:', data.error);
      }
    } catch (error) {
      console.error('Unexpected error during settlement population:', error);
    } finally {
      this.isRunning = false;
    }
  }

  start() {
    // Run immediately
    this.populateSettlements();

    // Then run every 30 minutes (30 * 60 * 1000 ms)
    this.intervalId = window.setInterval(
      () => {
        this.populateSettlements();
      },
      30 * 60 * 1000,
    );
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  // Call this when a user completes signup
  async onUserSignup() {
    await this.populateSettlements();
  }
}

export const settlementPopulationService = new SettlementPopulationService();
