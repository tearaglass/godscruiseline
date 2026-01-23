-- Supabase schema for Gods Cruiseline
-- Run this SQL in the Supabase SQL Editor to create tables

-- ============ RECORDS TABLE ============

CREATE TABLE IF NOT EXISTS records (
  id TEXT PRIMARY KEY,                    -- GC-R-###
  title TEXT NOT NULL,
  division TEXT NOT NULL,
  medium TEXT NOT NULL,
  year INTEGER NOT NULL,
  status TEXT NOT NULL,
  content TEXT,
  project TEXT[],                         -- Array of project IDs
  author TEXT[],
  origin TEXT,
  source_ref TEXT,
  date_created DATE,
  date_published DATE,
  tags TEXT[],
  sensitivity_level TEXT,
  sensitivity_note TEXT,
  archival_state TEXT DEFAULT 'active',
  archival_since INTEGER,
  archival_note TEXT,
  context TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for common queries
CREATE INDEX IF NOT EXISTS idx_records_division ON records(division);
CREATE INDEX IF NOT EXISTS idx_records_status ON records(status);
CREATE INDEX IF NOT EXISTS idx_records_year ON records(year);

-- Enable Row Level Security
ALTER TABLE records ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations (protected by API key on server-side)
CREATE POLICY "Allow all operations" ON records
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_records_updated_at ON records;
CREATE TRIGGER update_records_updated_at
  BEFORE UPDATE ON records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============ PROJECTS TABLE ============

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,                    -- project-slug
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL,
  lead TEXT,
  scope TEXT,
  start_year INTEGER,
  end_year INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for common queries
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

-- Enable Row Level Security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations (protected by API key on server-side)
CREATE POLICY "Allow all operations" ON projects
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Seed projects data
INSERT INTO projects (id, name, description, status, start_year) VALUES
('signal-architecture', 'Signal Architecture', 'Infrastructure and protocols for broadcast distribution.', 'public', 2023),
('terminal-ops', 'Terminal Operations', 'Maintenance and development of the information system interface.', 'registered', 2025),
('continuity-ledger', 'Continuity Ledger', 'Ongoing record of decisions, events, and historical accounts.', 'public', 2020)
ON CONFLICT (id) DO NOTHING;

-- ============ ADMIN TOKENS TABLE ============
-- For secure admin authentication (tokens granted in person)

CREATE TABLE IF NOT EXISTS admin_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  label TEXT,                             -- Optional description like "Laney's laptop"
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used TIMESTAMPTZ,
  revoked BOOLEAN DEFAULT FALSE
);

-- Enable Row Level Security
ALTER TABLE admin_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations (protected by API key on server-side)
CREATE POLICY "Allow all operations" ON admin_tokens
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============ SEED DATA ============

-- Seed data (existing records from records-data.js)
-- You can run this after table creation to migrate existing data

INSERT INTO records (id, title, division, medium, year, status, content) VALUES
('GC-R-000', 'System Charter', 'access', 'system', 2026, 'public',
'The Gods Cruiseline Information System exists to maintain continuity,
record decisions, preserve artifacts, and regulate access.

This system does not promise transparency.
It promises consistency.

Records may be incomplete.
Archives may decay.
Access may be revoked.

Participation constitutes acknowledgment.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO records (id, title, division, medium, year, status, project, content) VALUES
('GC-R-001', 'Broadcast Protocol v1', 'broadcast', 'system', 2024, 'public', ARRAY['signal-architecture'],
'Standard operating procedures for signal distribution.

1. All transmissions are logged.
2. Public notices require clearance review before release.
3. Official transmissions carry a verification hash.
4. Retransmission without authorization is prohibited.

Protocol subject to revision without notice.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO records (id, title, division, medium, year, status, content) VALUES
('GC-R-002', 'Works Registry Guidelines', 'works', 'text', 2025, 'registered',
'Guidelines for registering works within the system.

All creative output must be cataloged before distribution.
Asset stewardship remains with the originator unless transferred.
Release protocols vary by medium and intended audience.

Works without registry entries are considered unratified.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO records (id, title, division, medium, year, status, project, content) VALUES
('GC-R-003', 'Field Notes: Terminal Migration', 'research', 'text', 2025, 'registered', ARRAY['terminal-ops'],
'Documentation of the system migration to current architecture.

Previous infrastructure was deprecated due to maintenance burden.
New terminal operates on static principles with localStorage persistence.
Annotation capabilities added for witness-level participants.

Migration considered complete. Legacy references archived.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO records (id, title, division, medium, year, status, project, archival_state, archival_since, archival_note) VALUES
('GC-R-004', 'Continuity Ledger: 2020-2024', 'narrative', 'dataset', 2024, 'authorized', ARRAY['continuity-ledger'], 'archived', 2025, 'Superseded by active ledger. Retained for historical reference.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO records (id, title, division, medium, year, status, content) VALUES
('GC-R-005', 'Exchange Agreement Template', 'exchange', 'text', 2026, 'authorized',
'Standard template for partner access agreements.

Terms include: access duration, permitted use, attribution requirements,
and termination conditions.

All agreements require countersignature before activation.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO records (id, title, division, medium, year, status) VALUES
('GC-R-006', 'Clearance Audit: Q4 2025', 'access', 'dataset', 2025, 'restricted')
ON CONFLICT (id) DO NOTHING;

INSERT INTO records (id, title, division, medium, year, status, project, archival_state, archival_since, archival_note) VALUES
('GC-R-007', 'Signal Test Transmission', 'broadcast', 'audio', 2023, 'public', ARRAY['signal-architecture'], 'decayed', 2024, 'Source media degraded. Metadata preserved.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO records (id, title, division, medium, year, status, content) VALUES
('GC-R-008', 'Research Index: Methodology Standards', 'research', 'text', 2026, 'registered',
'Standards for internal research documentation.

All studies must include: scope, methodology, findings, and limitations.
Field documentation follows separate protocols.
Internal publications require peer notation before filing.

Standards apply retroactively to unfiled research.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO records (id, title, division, medium, year, status, project, content) VALUES
('GC-R-009', 'Narrative Style Guide', 'narrative', 'text', 2026, 'public', ARRAY['continuity-ledger'],
'Editorial standards for historical accounts and continuity records.

Tone: Neutral, factual, without embellishment.
Attribution: Required for all quoted material.
Revision: Changes must be logged, not overwritten.

Consistency over transparency. Accuracy over speed.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO records (id, title, division, medium, year, status) VALUES
('GC-R-010', 'Partner Access Log: 2025', 'exchange', 'dataset', 2025, 'restricted')
ON CONFLICT (id) DO NOTHING;
