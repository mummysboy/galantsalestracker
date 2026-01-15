-- Sales Tracker Supabase Migration
-- This migration creates all necessary tables for the Sales Tracker application

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Sales Records Table
CREATE TABLE IF NOT EXISTS sales_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  distributor VARCHAR(50) NOT NULL,
  period VARCHAR(20) NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  product_code VARCHAR(100),
  cases DECIMAL(10, 2) NOT NULL DEFAULT 0,
  revenue DECIMAL(10, 2) NOT NULL DEFAULT 0,
  invoice_key VARCHAR(255) NOT NULL,
  source VARCHAR(255),
  timestamp TIMESTAMPTZ,
  account_name VARCHAR(255),
  customer_id VARCHAR(100),
  item_number VARCHAR(100),
  size VARCHAR(50),
  weight_lbs DECIMAL(10, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_sales_records_distributor ON sales_records(distributor);
CREATE INDEX IF NOT EXISTS idx_sales_records_period ON sales_records(period);
CREATE INDEX IF NOT EXISTS idx_sales_records_customer_name ON sales_records(customer_name);
CREATE INDEX IF NOT EXISTS idx_sales_records_invoice_key ON sales_records(invoice_key);
CREATE INDEX IF NOT EXISTS idx_sales_records_distributor_period ON sales_records(distributor, period);

-- Customer Progressions Table
CREATE TABLE IF NOT EXISTS customer_progressions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  distributor VARCHAR(50) NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  progression JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(distributor, customer_name)
);

-- Indexes for customer progressions
CREATE INDEX IF NOT EXISTS idx_customer_progressions_distributor ON customer_progressions(distributor);
CREATE INDEX IF NOT EXISTS idx_customer_progressions_customer_name ON customer_progressions(customer_name);

-- App State Table
CREATE TABLE IF NOT EXISTS app_state (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(255) NOT NULL UNIQUE,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_sales_records_updated_at BEFORE UPDATE ON sales_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_progressions_updated_at BEFORE UPDATE ON customer_progressions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_app_state_updated_at BEFORE UPDATE ON app_state
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
-- Enable RLS on all tables
ALTER TABLE sales_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_progressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_state ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read all sales records
CREATE POLICY "Users can read sales records" ON sales_records
  FOR SELECT USING (auth.role() = 'authenticated');

-- Policy: Users can insert sales records
CREATE POLICY "Users can insert sales records" ON sales_records
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy: Users can update sales records
CREATE POLICY "Users can update sales records" ON sales_records
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Policy: Users can delete sales records
CREATE POLICY "Users can delete sales records" ON sales_records
  FOR DELETE USING (auth.role() = 'authenticated');

-- Policy: Users can read customer progressions
CREATE POLICY "Users can read customer progressions" ON customer_progressions
  FOR SELECT USING (auth.role() = 'authenticated');

-- Policy: Users can insert customer progressions
CREATE POLICY "Users can insert customer progressions" ON customer_progressions
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy: Users can update customer progressions
CREATE POLICY "Users can update customer progressions" ON customer_progressions
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Policy: Users can delete customer progressions
CREATE POLICY "Users can delete customer progressions" ON customer_progressions
  FOR DELETE USING (auth.role() = 'authenticated');

-- Policy: Users can read app state
CREATE POLICY "Users can read app state" ON app_state
  FOR SELECT USING (auth.role() = 'authenticated');

-- Policy: Users can insert app state
CREATE POLICY "Users can insert app state" ON app_state
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy: Users can update app state
CREATE POLICY "Users can update app state" ON app_state
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Policy: Users can delete app state
CREATE POLICY "Users can delete app state" ON app_state
  FOR DELETE USING (auth.role() = 'authenticated');

-- User Profiles Table (for storing user metadata like groups/roles)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(255),
  groups TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for user profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);

-- Enable RLS on user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own profile
CREATE POLICY "Users can read own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Policy: Authenticated users can insert their own profile
CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
