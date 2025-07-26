// API endpoint for on-demand settlement scraping
// This would be integrated into your Vite server or backend

import { DynamicSettlementScraper } from '../scraper/dynamic-settlement-scraper.js';

const scraper = new DynamicSettlementScraper();

// Cache to prevent too frequent scraping of the same settlement
const scrapeCache = new Map();
const SCRAPE_COOLDOWN = 5 * 60 * 1000; // 5 minutes between scrapes per settlement

export async function handleScrapeRequest(req, res) {
  try {
    const { settlementId, userId, force = false } = req.body;

    if (!settlementId || !userId) {
      return res.status(400).json({
        error: 'settlementId and userId are required',
      });
    }

    // Check if we've scraped this settlement recently (unless forced)
    const cacheKey = `${settlementId}_${userId}`;
    const lastScrape = scrapeCache.get(cacheKey);

    if (!force && lastScrape && Date.now() - lastScrape < SCRAPE_COOLDOWN) {
      const remainingCooldown = Math.ceil(
        (SCRAPE_COOLDOWN - (Date.now() - lastScrape)) / 1000,
      );
      return res.status(429).json({
        error: 'Scrape cooldown active',
        remainingSeconds: remainingCooldown,
        lastScrape: new Date(lastScrape).toISOString(),
      });
    }

    console.log(
      `[ScrapeAPI] Starting scrape for user ${userId}, settlement ${settlementId}`,
    );

    // Perform the scrape
    const result = await scraper.scrapeForUser(userId, settlementId);

    if (result.success) {
      // Update cache
      scrapeCache.set(cacheKey, Date.now());

      console.log(
        `[ScrapeAPI] Scrape completed: ${result.itemCount} items for settlement ${settlementId}`,
      );

      return res.status(200).json({
        success: true,
        message: `Successfully scraped ${result.itemCount} items`,
        ...result,
      });
    } else {
      console.error(`[ScrapeAPI] Scrape failed:`, result.error);

      return res.status(500).json({
        success: false,
        error: result.error,
        ...result,
      });
    }
  } catch (error) {
    console.error(`[ScrapeAPI] Unexpected error:`, error);

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message,
    });
  }
}

// New endpoint for getting user settlements
export async function handleUserSettlementsRequest(req, res) {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        error: 'userId is required',
      });
    }

    console.log(`[ScrapeAPI] Getting settlements for user ${userId}`);

    // Use the dynamic scraper to get user settlements
    const settlements = await scraper.getUserSettlements(userId);

    return res.json({
      success: true,
      settlements,
      userId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[ScrapeAPI] Error getting user settlements:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get user settlements',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}

// For Vite dev server integration
export function setupScrapeAPI(app) {
  app.post('/api/scrape-settlement', handleScrapeRequest);

  // Add the settlements endpoint
  app.get('/api/user-settlements/:userId', handleUserSettlementsRequest);

  // Also add a status endpoint
  app.get('/api/scrape-status/:settlementId/:userId', (req, res) => {
    const { settlementId, userId } = req.params;
    const cacheKey = `${settlementId}_${userId}`;
    const lastScrape = scrapeCache.get(cacheKey);

    const status = {
      settlementId,
      userId,
      lastScrape: lastScrape ? new Date(lastScrape).toISOString() : null,
      canScrape: !lastScrape || Date.now() - lastScrape >= SCRAPE_COOLDOWN,
      cooldownRemaining: lastScrape
        ? Math.max(0, SCRAPE_COOLDOWN - (Date.now() - lastScrape))
        : 0,
    };

    res.json(status);
  });
}
