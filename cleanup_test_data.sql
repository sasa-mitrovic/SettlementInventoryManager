-- One-time cleanup script to remove test data from settlement tables
-- Run this script once in your Supabase SQL Editor to clear old test data

-- Clear all existing settlement data (this will be repopulated by the scraper)
DELETE FROM public.settlement_skills;
DELETE FROM public.settlement_inventory; 
DELETE FROM public.settlement_members;

-- Reset sequences if they exist (for auto-incrementing fields)
-- Note: Since we're using custom IDs, this may not be necessary

-- Verify cleanup
SELECT 'settlement_members count:' as info, COUNT(*) as count FROM public.settlement_members
UNION ALL
SELECT 'settlement_inventory count:' as info, COUNT(*) as count FROM public.settlement_inventory  
UNION ALL
SELECT 'settlement_skills count:' as info, COUNT(*) as count FROM public.settlement_skills;

-- Cleanup completed! 
-- All settlement tables are now empty and ready for fresh data from the scraper
