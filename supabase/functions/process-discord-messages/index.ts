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

    // Use service role key to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('📨 Checking for pending Discord messages...');

    // Get pending Discord messages
    const { data: pendingMessages, error: fetchError } = await supabase
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
      .limit(10);

    if (fetchError) {
      console.error('❌ Error fetching pending messages:', fetchError);
      throw fetchError;
    }

    if (!pendingMessages || pendingMessages.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No pending messages',
          processed: 0,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      );
    }

    console.log(`📨 Found ${pendingMessages.length} pending Discord messages`);

    let successCount = 0;
    let errorCount = 0;
    const results: Array<{ id: string; status: string; error?: string }> = [];

    for (const message of pendingMessages) {
      try {
        const channel = message.discord_channels as any;

        if (!channel) {
          console.log(`❌ Message ${message.id}: No channel found`);
          results.push({ id: message.id, status: 'skipped', error: 'No channel' });
          continue;
        }

        const integration = channel.discord_integrations;

        if (!integration) {
          console.log(`❌ Message ${message.id}: No integration found`);
          results.push({ id: message.id, status: 'skipped', error: 'No integration' });
          continue;
        }

        if (!integration.is_active) {
          console.log(`⏭️ Message ${message.id}: Integration inactive`);
          results.push({ id: message.id, status: 'skipped', error: 'Integration inactive' });
          continue;
        }

        console.log(`🚀 Processing message ${message.id}...`);

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

        if (response.ok) {
          // Mark as successful
          const { error: updateError } = await supabase
            .from('discord_message_log')
            .update({
              success: true,
              error_message: null,
            })
            .eq('id', message.id);

          if (updateError) {
            console.error(`❌ Failed to update message ${message.id}:`, updateError);
            results.push({ id: message.id, status: 'sent_but_update_failed', error: updateError.message });
          } else {
            console.log(`✅ Message ${message.id} sent successfully`);
            results.push({ id: message.id, status: 'success' });
            successCount++;
          }
        } else {
          const errorText = await response.text();
          console.error(`❌ Discord webhook failed for ${message.id}: ${response.status}`);

          // Update with error
          await supabase
            .from('discord_message_log')
            .update({
              error_message: `HTTP ${response.status}: ${errorText}`,
            })
            .eq('id', message.id);

          results.push({ id: message.id, status: 'webhook_failed', error: `HTTP ${response.status}` });
          errorCount++;
        }
      } catch (msgError) {
        console.error(`❌ Error processing message ${message.id}:`, msgError);

        // Update with error
        await supabase
          .from('discord_message_log')
          .update({
            error_message: msgError instanceof Error ? msgError.message : 'Unknown error',
          })
          .eq('id', message.id);

        results.push({
          id: message.id,
          status: 'error',
          error: msgError instanceof Error ? msgError.message : 'Unknown error',
        });
        errorCount++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${pendingMessages.length} messages`,
        processed: pendingMessages.length,
        successCount,
        errorCount,
        results,
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
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});
