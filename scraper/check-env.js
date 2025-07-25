import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('🔍 Environment Variable Check');
console.log('============================\n');

console.log(
  'VITE_SUPABASE_URL:',
  process.env.VITE_SUPABASE_URL ? '✅ SET' : '❌ MISSING',
);
console.log(
  'SUPABASE_SERVICE_ROLE_KEY:',
  process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ SET' : '❌ MISSING',
);

if (!process.env.VITE_SUPABASE_URL) {
  console.log('\n❌ VITE_SUPABASE_URL is missing from .env file');
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log('\n❌ SUPABASE_SERVICE_ROLE_KEY is missing from .env file');
}

if (process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log('\n✅ Both environment variables are set');
  console.log(
    'Supabase URL:',
    process.env.VITE_SUPABASE_URL.substring(0, 30) + '...',
  );
  console.log(
    'Service Key:',
    process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 20) + '...',
  );
}
