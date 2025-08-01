// Settlement population service for client-side automation
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

class SettlementPopulationService {
  private intervalId: number | null = null;
  private isRunning = false;

  async populateSettlements() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    try {
      // Step 1: Get all unique settlement_ids from settlement_roles table
      const { data: settlementRoles, error: rolesError } = await supabase
        .from('settlement_roles')
        .select('settlement_id')
        .order('settlement_id');

      if (rolesError) {
        console.error('❌ Error fetching settlement roles:', rolesError);
        return;
      }

      // Get unique settlement IDs
      const uniqueSettlementIds = [
        ...new Set(settlementRoles.map((role) => role.settlement_id)),
      ];

      // Step 2: Check which settlements already exist in our table
      const { data: existingSettlements, error: existingError } = await supabase
        .from('settlements')
        .select('settlement_id')
        .in('settlement_id', uniqueSettlementIds);

      if (existingError) {
        console.error('❌ Error fetching existing settlements:', existingError);
        return;
      }

      const existingIds = existingSettlements.map((s) => s.settlement_id);
      const missingIds = uniqueSettlementIds.filter(
        (id) => !existingIds.includes(id),
      );

      if (missingIds.length === 0) {
        return;
      }

      // Step 3: Fetch settlement data from Bitjita API for missing settlements
      const newSettlements = [];

      for (let i = 0; i < missingIds.length; i++) {
        const settlementId = missingIds[i];
        console.log(
          `⏳ [${i + 1}/${missingIds.length}] Fetching settlement ${settlementId}...`,
        );

        try {
          // Use the Bitjita API endpoint
          const response = await fetch(
            `https://bitjita.com/api/claims/${settlementId}`,
          );

          if (!response.ok) {
            console.error(
              `❌ Failed to fetch settlement ${settlementId}: ${response.status} ${response.statusText}`,
            );
            // Create a fallback entry with placeholder name
            newSettlements.push({
              settlement_id: settlementId,
              settlement_name: `Settlement ${settlementId}`,
              isActive: true,
            });
            continue;
          }

          const settlementData = await response.json();

          // Extract settlement name from the API response
          let settlementName = 'Unknown Settlement';
          if (
            settlementData &&
            settlementData.claim &&
            settlementData.claim.name
          ) {
            settlementName = settlementData.claim.name;
          }

          newSettlements.push({
            settlement_id: settlementId,
            settlement_name: settlementName,
            isActive: true,
          });

          // Add a small delay to be respectful to the API
          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (fetchError) {
          console.error(
            `❌ Error fetching settlement ${settlementId}:`,
            fetchError instanceof Error
              ? fetchError.message
              : String(fetchError),
          );
          // Create a fallback entry
          newSettlements.push({
            settlement_id: settlementId,
            settlement_name: `Settlement ${settlementId}`,
            isActive: true,
          });
          continue;
        }
      }

      // Step 4: Insert new settlements into database
      if (newSettlements.length > 0) {
        const { data: insertedData, error: insertError } = await supabase
          .from('settlements')
          .insert(newSettlements)
          .select();

        if (insertError) {
          console.error('❌ Error inserting settlements:', insertError);
          return;
        }

        insertedData.forEach((settlement) => {
          console.log(
            `  - ${settlement.settlement_name} (${settlement.settlement_id})`,
          );
        });
      }
    } catch (error) {
      console.error('❌ Unexpected error during settlement population:', error);
    } finally {
      this.isRunning = false;
    }
  }

  start() {
    console.log(
      '🔄 Starting settlement population timer (every 30 minutes)...',
    );

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
      console.log('🛑 Settlement population timer stopped');
    }
  }

  // Call this when a user completes signup
  async onUserSignup() {
    console.log(
      '👤 User completed signup, triggering settlement population...',
    );
    await this.populateSettlements();
  }
}

export const settlementPopulationService = new SettlementPopulationService();
