-- Migration: Add app downloads configuration table
-- This table stores configuration for mobile app downloads (APK/IPA files or store links)

CREATE TABLE IF NOT EXISTS app_downloads (
  id SERIAL PRIMARY KEY,
  platform VARCHAR(20) NOT NULL CHECK (platform IN ('android', 'ios')),
  download_type VARCHAR(20) NOT NULL CHECK (download_type IN ('direct', 'store')),
  store_url TEXT, -- URL for Google Play Store or Apple App Store
  store_badge_url TEXT, -- URL for custom store badge image
  file_url TEXT, -- URL for direct download (APK/IPA)
  file_name VARCHAR(255), -- Original filename
  file_size VARCHAR(50), -- File size as string (e.g., "50 MB")
  version VARCHAR(50), -- App version (e.g., "1.0.0")
  build_number VARCHAR(50), -- Build number
  release_notes TEXT, -- Release notes
  is_active BOOLEAN DEFAULT true,
  updated_by INTEGER REFERENCES admin_users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(platform) -- Only one active config per platform
);

-- Create index for faster queries
CREATE INDEX idx_app_downloads_platform ON app_downloads(platform);
CREATE INDEX idx_app_downloads_active ON app_downloads(is_active);

-- Insert default configurations
INSERT INTO app_downloads (platform, download_type, store_url, is_active, version)
VALUES 
  ('android', 'store', 'https://play.google.com/store/apps/details?id=com.yourapp', true, '1.0.0'),
  ('ios', 'store', 'https://apps.apple.com/app/yourapp/id123456789', true, '1.0.0')
ON CONFLICT (platform) DO NOTHING;
