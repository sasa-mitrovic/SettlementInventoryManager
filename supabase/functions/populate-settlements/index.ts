import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🏘️ Starting settlement population process...');

    // Step 1: Get all unique settlement_ids from settlement_roles table
    const { data: settlementRoles, error: rolesError } = await supabase
      .from('settlement_roles')
      .select('settlement_id')
      .order('settlement_id');

    if (rolesError) {
      console.error('❌ Error fetching settlement roles:', rolesError);
      throw rolesError;
    }

    // Get unique settlement IDs
    const uniqueSettlementIds = [
      ...new Set(settlementRoles.map((role) => role.settlement_id)),
    ];

    console.log(`🔍 Found ${uniqueSettlementIds.length} unique settlement IDs`);

    // Step 2: Check which settlements already exist
    const { data: existingSettlements, error: existingError } = await supabase
      .from('settlements')
      .select('settlement_id')
      .in('settlement_id', uniqueSettlementIds);

    if (existingError) {
      console.error('❌ Error fetching existing settlements:', existingError);
      throw existingError;
    }

    const existingIds = existingSettlements.map((s) => s.settlement_id);
    const missingIds = uniqueSettlementIds.filter(
      (id) => !existingIds.includes(id),
    );

    console.log(`✅ Found ${existingSettlements.length} existing settlements`);
    console.log(`📥 Need to fetch ${missingIds.length} new settlements`);

    if (missingIds.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'All settlements already exist in database!',
          existingCount: existingSettlements.length,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      );
    }

    // Step 3: Fetch settlement data from Bitjita API for missing settlements
    const newSettlements = [];

    for (let i = 0; i < missingIds.length; i++) {
      const settlementId = missingIds[i];
      console.log(
        `⏳ [${i + 1}/${missingIds.length}] Fetching settlement ${settlementId}...`,
      );

      try {
        const response = await fetch(
          `https://bitjita.com/api/claims/${settlementId}`,
        );

        if (!response.ok) {
          console.error(
            `❌ Failed to fetch settlement ${settlementId}: ${response.status}`,
          );
          // Create fallback entry
          newSettlements.push({
            settlement_id: settlementId,
            settlement_name: `Settlement ${settlementId}`,
            isActive: true,
          });
          continue;
        }

        const settlementData = await response.json();

        let settlementName = 'Unknown Settlement';
        if (settlementData?.claim?.name) {
          settlementName = settlementData.claim.name;
        }

        newSettlements.push({
          settlement_id: settlementId,
          settlement_name: settlementName,
          isActive: true,
        });

        console.log(`✅ Found settlement: ${settlementName} (${settlementId})`);

        // Add delay to be respectful to the API
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (fetchError) {
        console.error(
          `❌ Error fetching settlement ${settlementId}:`,
          fetchError.message,
        );
        // Create fallback entry
        newSettlements.push({
          settlement_id: settlementId,
          settlement_name: `Settlement ${settlementId}`,
          isActive: true,
        });
      }
    }

    // Step 4: Insert new settlements into database
    if (newSettlements.length > 0) {
      console.log(`💾 Inserting ${newSettlements.length} new settlements...`);

      const { data: insertedData, error: insertError } = await supabase
        .from('settlements')
        .insert(newSettlements)
        .select();

      if (insertError) {
        console.error('❌ Error inserting settlements:', insertError);
        throw insertError;
      }

      console.log('🎉 Successfully inserted settlements');

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Settlement population completed successfully!',
          insertedCount: insertedData.length,
          settlements: insertedData.map((s) => ({
            id: s.settlement_id,
            name: s.settlement_name,
          })),
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'No new settlements to add',
        existingCount: existingSettlements.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error('❌ Unexpected error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});
