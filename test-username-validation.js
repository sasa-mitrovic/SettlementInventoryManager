// Test script for username validation system
// This script demonstrates how the check_username_availability function works

import { createClient } from '@supabase/supabase-js';

// You'll need to replace these with your actual Supabase credentials
const supabaseUrl = 'your-supabase-url';
const supabaseKey = 'your-supabase-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUsernameValidation() {
  console.log('Testing username validation system...\n');

  // Test cases
  const testUsernames = [
    'TestUser123',
    'existinguser',
    'NewPlayer456',
    'admin',
    'user@example.com',
  ];

  for (const username of testUsernames) {
    try {
      console.log(`Testing username: "${username}"`);

      const { data, error } = await supabase.rpc(
        'check_username_availability',
        {
          username_to_check: username,
        },
      );

      if (error) {
        console.error(`Error: ${error.message}`);
      } else {
        console.log(`Result:`, data);
        console.log(`Available: ${data.available}`);
        console.log(`Message: ${data.message}`);

        if (!data.available && data.existing_user_id) {
          console.log(`Existing user ID: ${data.existing_user_id}`);
        }
        if (!data.available && data.existing_email) {
          console.log(`Existing email: ${data.existing_email}`);
        }
      }

      console.log('---');
    } catch (err) {
      console.error(`Unexpected error testing "${username}":`, err);
      console.log('---');
    }
  }
}

// Note: This is a demo script. To actually run it, you would need to:
// 1. Install @supabase/supabase-js: npm install @supabase/supabase-js
// 2. Replace the supabaseUrl and supabaseKey with your actual values
// 3. Run with: node test-username-validation.js

console.log('Username Validation Test Script');
console.log('================================');
console.log('');
console.log('This script demonstrates the username validation functionality.');
console.log('To run this test:');
console.log('1. Update the Supabase credentials in this file');
console.log('2. Install dependencies: npm install @supabase/supabase-js');
console.log('3. Run: node test-username-validation.js');
console.log('');
console.log('The validation system checks if a username is already taken');
console.log('and provides detailed information about existing accounts.');
