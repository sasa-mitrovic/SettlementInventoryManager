# Bitjita Settlement Data Scraper

This service automatically scrapes settlement data from bitjita.com and updates the Supabase database with real-time information.

## Features

- **Inventory Scraping**: Extracts all settlement inventory items organized by storage containers
- **Member Scraping**: Gets settlement member data including online status and roles
- **Skills Scraping**: Collects member skill levels and experience points
- **Real-time Updates**: Runs every minute to keep data current
- **Fallback Data**: Provides sample data for testing when scraping fails

## Setup

1. **Install Dependencies**:

   ```bash
   cd scraper
   npm install
   ```

2. **Configure Environment**:

   - Copy your Supabase URL and Service Role Key to `.env`
   - Get the Service Role Key from Supabase Dashboard > Settings > API
   - **Important**: Use the Service Role Key, not the Anon Key for full database access

3. **Run the Scraper**:
   - **Windows**: Double-click `start-scraper.bat`
   - **Command Line**: `npm start` or `node scraper.js`

## How It Works

### Data Collection

The scraper attempts to extract data using multiple CSS selector strategies to handle different HTML structures:

- **Inventory**: Looks for containers and items within them
- **Members**: Searches for player names, online status, and permissions
- **Skills**: Extracts skill names, levels, and experience points

### Data Storage

All scraped data is stored in Supabase tables:

- `settlement_inventory` - Item quantities by container
- `settlement_members` - Member info and permissions
- `settlement_skills` - Player skill progression

### Real-time Updates

The React app automatically receives updates through Supabase real-time subscriptions when new data is scraped.

## Testing

The scraper includes fallback sample data for testing when the actual website is unavailable or returns no data. This ensures the application always has data to work with during development.

## Configuration

- **Settlement ID**: Currently set to `144115188105096768`
- **Scrape Interval**: Every 1 minute (configurable)
- **Batch Size**: 100 items per database insert (for performance)

## Troubleshooting

1. **No Data Scraped**: Check if the website structure has changed
2. **Database Errors**: Verify Service Role Key permissions
3. **Network Issues**: The scraper will continue retrying automatically
4. **Sample Data**: If scraping fails, sample data will be used instead

## Security Notes

- Store the Service Role Key securely and never commit it to version control
- The scraper only reads public settlement data from bitjita.com
- Database access is restricted by Supabase Row Level Security policies
