-- Performance indexes for frequently queried columns
-- Run this in the Supabase SQL Editor

CREATE INDEX IF NOT EXISTS idx_campaigns_share_token ON campaigns (share_token);
CREATE INDEX IF NOT EXISTS idx_ads_campaign_id ON ads (campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_comments_campaign_id ON campaign_comments (campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_comments_ad_id ON campaign_comments (ad_id);
