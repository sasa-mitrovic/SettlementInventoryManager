import fetch from 'node-fetch';

console.log('🔍 Finding Working Bitjita API');
console.log('==============================\n');

async function findWorkingAPI() {
  // Test the main bitjita.com website to see what's available
  console.log('Test 1: Checking main website...');
  try {
    const response = await fetch('https://bitjita.com/');
    console.log(`Main site status: ${response.status}`);
    console.log(`Main site accessible: ${response.ok ? 'Yes' : 'No'}`);
  } catch (error) {
    console.log(`Main site error: ${error.message}`);
  }

  // Test different possible API structures
  console.log('\nTest 2: Testing various API patterns...');

  const testPatterns = [
    // Different base paths
    'https://bitjita.com/api/v1/player/search?name=Lusti',
    'https://bitjita.com/api/v2/player/search?name=Lusti',
    'https://bitjita.com/api/search/player?name=Lusti',
    'https://bitjita.com/search/player?name=Lusti',

    // Different parameter names
    'https://bitjita.com/api/player/search?username=Lusti',
    'https://bitjita.com/api/player/search?player=Lusti',
    'https://bitjita.com/api/player/search?q=Lusti',

    // GraphQL or different formats
    'https://bitjita.com/graphql',
    'https://bitjita.com/api/graphql',
  ];

  for (const url of testPatterns) {
    try {
      console.log(`  Testing: ${url}`);
      const response = await fetch(url);
      console.log(`    Status: ${response.status} ${response.statusText}`);

      const contentType = response.headers.get('content-type') || '';
      console.log(`    Content-Type: ${contentType}`);

      if (response.status === 200 && contentType.includes('json')) {
        const data = await response.text();
        console.log(`    ✅ JSON Response found! First 200 chars:`);
        console.log(`    ${data.substring(0, 200)}...`);
      }
    } catch (error) {
      console.log(`    Error: ${error.message}`);
    }
  }

  // Test if we can access a player profile directly (like from browser)
  console.log('\nTest 3: Testing direct player access...');
  try {
    const playerUrl = 'https://bitjita.com/player/Lusti'; // Direct player page
    const response = await fetch(playerUrl);
    console.log(`Player page status: ${response.status}`);

    if (response.ok) {
      const html = await response.text();
      console.log(`Player page accessible: Yes (${html.length} chars)`);

      // Look for API calls in the HTML/JavaScript
      const apiMatches = html.match(/\/api\/[^"'\s]+/g);
      if (apiMatches) {
        console.log('Found potential API endpoints in HTML:');
        [...new Set(apiMatches)].slice(0, 5).forEach((match) => {
          console.log(`  - https://bitjita.com${match}`);
        });
      }
    }
  } catch (error) {
    console.log(`Player page error: ${error.message}`);
  }
}

findWorkingAPI();
