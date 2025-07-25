import fetch from 'node-fetch';

console.log('🔍 Examining Bitjita API Response Structure');
console.log('===========================================\n');

async function examineAPIResponse() {
  try {
    console.log('Testing with username: Lusti');
    const response = await fetch('https://bitjita.com/api/players?q=Lusti');
    console.log(`Status: ${response.status}`);
    console.log(`Content-Type: ${response.headers.get('content-type')}`);

    if (response.ok) {
      const data = await response.json();
      console.log('\nResponse structure:');
      console.log(`Type: ${typeof data}`);
      console.log(`Is Array: ${Array.isArray(data)}`);
      console.log(
        `Keys: ${typeof data === 'object' ? Object.keys(data) : 'N/A'}`,
      );

      console.log('\nFull response:');
      console.log(JSON.stringify(data, null, 2));

      // Try to find the player data
      if (Array.isArray(data)) {
        console.log(`\nFound ${data.length} players in array`);
        if (data.length > 0) {
          console.log('\nFirst player structure:');
          console.log(JSON.stringify(data[0], null, 2));
        }
      } else if (data.data && Array.isArray(data.data)) {
        console.log(`\nFound ${data.data.length} players in data.data`);
        if (data.data.length > 0) {
          console.log('\nFirst player structure:');
          console.log(JSON.stringify(data.data[0], null, 2));
        }
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

examineAPIResponse();
