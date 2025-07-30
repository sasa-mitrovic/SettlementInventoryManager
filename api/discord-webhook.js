// Discord webhook handler for crafting order notifications
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get pending Discord messages that need to be sent
    const { data: pendingMessages, error: fetchError } = await supabase
      .from('discord_message_log')
      .select(
        `
        id,
        crafting_order_id,
        message_type,
        webhook_response,
        discord_channels (
          webhook_url,
          channel_name,
          sector,
          discord_integrations (
            is_active
          )
        )
      `,
      )
      .eq('success', false)
      .is('discord_message_id', null)
      .order('created_at', { ascending: true })
      .limit(10); // Process up to 10 messages at a time

    if (fetchError) {
      console.error('Error fetching pending messages:', fetchError);
      return res
        .status(500)
        .json({ error: 'Failed to fetch pending messages' });
    }

    const results = [];

    for (const message of pendingMessages) {
      if (!message.discord_channels?.discord_integrations?.is_active) {
        // Skip inactive integrations
        continue;
      }

      try {
        const webhookUrl = message.discord_channels.webhook_url;
        let webhookPayload = JSON.parse(message.webhook_response);

        // Fix escaped newlines in the content
        if (webhookPayload.content) {
          webhookPayload.content = webhookPayload.content.replace(/\\n/g, '\n');
        }

        // Send to Discord
        const discordResponse = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(webhookPayload),
        });

        if (discordResponse.ok) {
          // Get Discord message ID from response
          let discordMessageId = null;
          try {
            const responseData = await discordResponse.json();
            discordMessageId = responseData.id;
          } catch {
            // Discord might not return JSON for some webhook responses
          }

          // Update message log as successful
          await supabase
            .from('discord_message_log')
            .update({
              success: true,
              discord_message_id: discordMessageId,
              error_message: null,
            })
            .eq('id', message.id);

          results.push({
            messageId: message.id,
            status: 'success',
            channel: message.discord_channels.channel_name,
          });
        } else {
          const errorText = await discordResponse.text();

          // Update message log with error
          await supabase
            .from('discord_message_log')
            .update({
              error_message: `HTTP ${discordResponse.status}: ${errorText}`,
            })
            .eq('id', message.id);

          results.push({
            messageId: message.id,
            status: 'error',
            error: `HTTP ${discordResponse.status}: ${errorText}`,
            channel: message.discord_channels.channel_name,
          });
        }
      } catch (error) {
        console.error(`Error sending Discord message ${message.id}:`, error);

        // Update message log with error
        await supabase
          .from('discord_message_log')
          .update({
            error_message: error.message,
          })
          .eq('id', message.id);

        results.push({
          messageId: message.id,
          status: 'error',
          error: error.message,
          channel: message.discord_channels?.channel_name || 'unknown',
        });
      }
    }

    return res.status(200).json({
      success: true,
      processed: results.length,
      results,
    });
  } catch (error) {
    console.error('Discord webhook handler error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message,
    });
  }
}
