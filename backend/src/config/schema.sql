-- ============================================================
-- Copart Auction Simulator - PostgreSQL Schema
-- Run against Supabase via SQL editor or psql
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name    VARCHAR(100) NOT NULL,
  last_name     VARCHAR(100) NOT NULL,
  role          VARCHAR(20) NOT NULL DEFAULT 'bidder' CHECK (role IN ('admin', 'auctioneer', 'bidder')),
  buyer_number  VARCHAR(20) UNIQUE,
  is_active     BOOLEAN DEFAULT TRUE,
  is_verified   BOOLEAN DEFAULT FALSE,
  bid_limit     DECIMAL(12, 2) DEFAULT 50000.00,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ============================================================
-- REFRESH TOKENS
-- ============================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);

-- ============================================================
-- VEHICLES
-- ============================================================
CREATE TABLE IF NOT EXISTS vehicles (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vin               VARCHAR(17) UNIQUE NOT NULL,
  year              SMALLINT NOT NULL,
  make              VARCHAR(100) NOT NULL,
  model             VARCHAR(100) NOT NULL,
  trim              VARCHAR(100),
  body_style        VARCHAR(50),
  color             VARCHAR(50),
  odometer          INTEGER,
  odometer_unit     VARCHAR(5) DEFAULT 'miles',
  condition         VARCHAR(20) CHECK (condition IN ('run_drive', 'enhanced_vehicle', 'stationary', 'parts_only')),
  damage_type       VARCHAR(100),
  secondary_damage  VARCHAR(100),
  keys_available    BOOLEAN DEFAULT FALSE,
  title_state       VARCHAR(50),
  title_type        VARCHAR(50),
  sale_doc_type     VARCHAR(50),
  cylinders         SMALLINT,
  engine_size       VARCHAR(20),
  transmission      VARCHAR(20),
  drive             VARCHAR(10),
  fuel_type         VARCHAR(20),
  airbags           VARCHAR(50),
  estimated_repair  DECIMAL(10, 2),
  actual_cash_value DECIMAL(10, 2),
  images            JSONB DEFAULT '[]',
  location_city     VARCHAR(100),
  location_state    VARCHAR(50),
  location_zip      VARCHAR(10),
  lot_number        VARCHAR(20) UNIQUE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicles_vin ON vehicles(vin);
CREATE INDEX IF NOT EXISTS idx_vehicles_make_model ON vehicles(make, model);
CREATE INDEX IF NOT EXISTS idx_vehicles_year ON vehicles(year);
CREATE INDEX IF NOT EXISTS idx_vehicles_condition ON vehicles(condition);
CREATE INDEX IF NOT EXISTS idx_vehicles_lot_number ON vehicles(lot_number);

-- ============================================================
-- AUCTIONS (Week 2 - scaffold only)
-- ============================================================
CREATE TABLE IF NOT EXISTS auctions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title           VARCHAR(255) NOT NULL,
  description     TEXT,
  auction_date    TIMESTAMPTZ NOT NULL,
  end_date        TIMESTAMPTZ,
  location        VARCHAR(255),
  status          VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'paused', 'completed', 'cancelled')),
  auctioneer_id   UUID REFERENCES users(id),
  max_lots        INTEGER DEFAULT 500,
  lane_count      INTEGER DEFAULT 1,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auctions_status ON auctions(status);
CREATE INDEX IF NOT EXISTS idx_auctions_date ON auctions(auction_date);

-- ============================================================
-- LOTS (Week 2 - scaffold only)
-- ============================================================
CREATE TABLE IF NOT EXISTS lots (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auction_id       UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  vehicle_id       UUID NOT NULL REFERENCES vehicles(id),
  lot_order        INTEGER NOT NULL,
  lane             INTEGER DEFAULT 1,
  starting_bid     DECIMAL(10, 2) DEFAULT 0.00,
  reserve_price    DECIMAL(10, 2),
  current_bid      DECIMAL(10, 2) DEFAULT 0.00,
  current_bidder   UUID REFERENCES users(id),
  bid_count        INTEGER DEFAULT 0,
  status           VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'sold', 'no_sale', 'withdrawn')),
  sold_price       DECIMAL(10, 2),
  sold_to          UUID REFERENCES users(id),
  bid_increment    DECIMAL(8, 2) DEFAULT 25.00,
  started_at       TIMESTAMPTZ,
  closed_at        TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(auction_id, lot_order)
);

CREATE INDEX IF NOT EXISTS idx_lots_auction_id ON lots(auction_id);
CREATE INDEX IF NOT EXISTS idx_lots_vehicle_id ON lots(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_lots_status ON lots(status);

-- ============================================================
-- BIDS (Week 2 - scaffold only)
-- ============================================================
CREATE TABLE IF NOT EXISTS bids (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lot_id     UUID NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
  bidder_id  UUID NOT NULL REFERENCES users(id),
  amount     DECIMAL(10, 2) NOT NULL,
  bid_type   VARCHAR(20) DEFAULT 'manual' CHECK (bid_type IN ('manual', 'auto', 'proxy', 'ai_suggested')),
  status     VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'outbid', 'winning', 'won', 'cancelled')),
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bids_lot_id ON bids(lot_id);
CREATE INDEX IF NOT EXISTS idx_bids_bidder_id ON bids(bidder_id);
CREATE INDEX IF NOT EXISTS idx_bids_amount ON bids(amount DESC);
CREATE INDEX IF NOT EXISTS idx_bids_created_at ON bids(created_at DESC);

-- ============================================================
-- WATCHLIST (scaffold)
-- ============================================================
CREATE TABLE IF NOT EXISTS watchlist (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, vehicle_id)
);

-- ============================================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_vehicles_updated_at ON vehicles;
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_auctions_updated_at ON auctions;
CREATE TRIGGER update_auctions_updated_at BEFORE UPDATE ON auctions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_lots_updated_at ON lots;
CREATE TRIGGER update_lots_updated_at BEFORE UPDATE ON lots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- SEED: Default admin user (password: Admin@1234)
-- ============================================================
INSERT INTO users (email, password_hash, first_name, last_name, role, buyer_number, is_active, is_verified)
VALUES (
  'admin@copart-sim.com',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj2QReZ5wOGG',
  'Admin',
  'User',
  'admin',
  'ADM-001',
  TRUE,
  TRUE
) ON CONFLICT (email) DO NOTHING;
