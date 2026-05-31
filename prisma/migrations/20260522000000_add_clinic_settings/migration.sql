-- Add settings JSONB column to clinics table for storing app-level configuration
ALTER TABLE "clinics" ADD COLUMN "settings" jsonb DEFAULT '{}'::jsonb;
