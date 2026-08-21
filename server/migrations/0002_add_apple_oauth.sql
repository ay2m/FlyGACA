-- Add Apple OAuth support to users table

ALTER TABLE users ADD COLUMN apple_sub text UNIQUE;
