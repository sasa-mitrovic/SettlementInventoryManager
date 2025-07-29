import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://pqjvpgrtcyhosovnubmq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxanZwZ3J0Y3lob3Nvdm51Ym1xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzgyMDk4MSwiZXhwIjoyMDUzMzk2OTgxfQ.VCJaGdEKZF0yVEWlxjQJEhOPpECc6lsNO96ZDx6HdcE',
);

async function checkTriggerFunction() {
  console.log('🔍 Checking trigger function...');

  try {
    // Check if target_status column exists
    const { data: columnData, error: columnError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'discord_message_log')
      .eq('table_schema', 'public')
      .eq('column_name', 'target_status');

    if (columnError) {
      console.error('❌ Error checking columns:', columnError);
    } else {
      console.log('📋 target_status column exists:', columnData.length > 0);
    }

    // Test the trigger by creating and unclaiming an order
    console.log('🧪 Testing unclaim operation...');

    // First, find an assigned order to test with
    const { data: orders, error: ordersError } = await supabase
      .from('crafting_orders')
      .select('*')
      .eq('status', 'assigned')
      .limit(1);

    if (ordersError) {
      console.error('❌ Error finding orders:', ordersError);
      return;
    }

    if (orders && orders.length > 0) {
      const order = orders[0];
      console.log('📦 Found order to test:', order.id, order.item_name);

      // Try to unclaim it
      const { data: updateData, error: updateError } = await supabase
        .from('crafting_orders')
        .update({
          status: 'unassigned',
          claimed_by: null,
          claimed_at: null,
        })
        .eq('id', order.id)
        .select();

      if (updateError) {
        console.error('❌ Unclaim error:', updateError);
        console.log(
          'This is likely the ambiguous column error we need to fix!',
        );
      } else {
        console.log('✅ Unclaim successful:', updateData);
      }
    } else {
      console.log('ℹ️ No assigned orders found to test with');
    }
  } catch (err) {
    console.error('💥 Exception:', err);
  }
}

checkTriggerFunction();
