-- Add PDPL consent tracking to the org_seats table
ALTER TABLE org_seats ADD COLUMN IF NOT EXISTS pdpl_consent boolean DEFAULT false;
ALTER TABLE org_seats ADD COLUMN IF NOT EXISTS pdpl_consented_at timestamptz;

-- Create analytics summary table for pre-aggregated cohort health
CREATE TABLE IF NOT EXISTS org_analytics_summary (
  org_id text NOT NULL PRIMARY KEY REFERENCES orgs(id) ON DELETE CASCADE,
  health_score numeric(5, 2) NOT NULL DEFAULT 0,
  pass_probability numeric(5, 2) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

