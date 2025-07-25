import fetch from 'node-fetch';

console.log('🔍 Investigating API Issues');
console.log('===========================\n');

async function investigateAPI() {
  // Test 1: Check if proxy returns HTML
  try {
    console.log('Test 1: Checking proxy response...');
    const proxyUrl =
      'http://localhost:5173/api/bitjita-proxy/player/search?name=Lusti';
    const response = await fetch(proxyUrl);
    console.log(`Status: ${response.status}`);
    console.log(`Content-Type: ${response.headers.get('content-type')}`);

    const text = await response.text();
    console.log(`Response length: ${text.length} characters`);
    console.log(`First 200 chars: ${text.substring(0, 200)}...`);
  } catch (error) {
    console.log(`Proxy error: ${error.message}`);
  }

  // Test 2: Test different API endpoints
  console.log('\nTest 2: Testing different API endpoints...');

  const endpoints = [
    'https://bitjita.com/api/player/search?name=Lusti',
    'https://bitjita.com/player/search?name=Lusti',
    'https://api.bitjita.com/player/search?name=Lusti',
    'https://bitjita.com/api/players/search?name=Lusti',
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`  Testing: ${endpoint}`);
      const response = await fetch(endpoint);
      console.log(`    Status: ${response.status} ${response.statusText}`);

      if (response.status === 200) {
        const data = await response.text();
        console.log(
          `    Response type: ${response.headers.get('content-type')}`,
        );
        console.log(`    First 100 chars: ${data.substring(0, 100)}...`);
      }
    } catch (error) {
      console.log(`    Error: ${error.message}`);
    }
  }

  // Test 3: Check if dev server is running
  console.log('\nTest 3: Checking dev server status...');
  try {
    const devResponse = await fetch('http://localhost:5173/');
    console.log(`Dev server status: ${devResponse.status}`);
    console.log(`Dev server running: ${devResponse.ok ? 'Yes' : 'No'}`);
  } catch (error) {
    console.log(`Dev server error: ${error.message}`);
  }
}

investigateAPI();
