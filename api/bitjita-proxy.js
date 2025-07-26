// Serverless function to proxy Bitjita API requests
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { endpoint } = req.query;

    if (!endpoint) {
      res.status(400).json({ error: 'endpoint parameter is required' });
      return;
    }

    const bitjitaUrl = `https://bitjita.com/api/${endpoint}`;
    console.log(`[Bitjita Proxy] Fetching: ${bitjitaUrl}`);

    const response = await fetch(bitjitaUrl, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'SettlementInventoryManager/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(
        `Bitjita API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();

    res.status(200).json(data);
  } catch (error) {
    console.error('[Bitjita Proxy] Error:', error);
    res.status(500).json({
      error: 'Failed to fetch from Bitjita API',
      details: error.message,
    });
  }
}
