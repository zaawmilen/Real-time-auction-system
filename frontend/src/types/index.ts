// ============================================================
// Core domain types for Copart Auction Simulator
// ============================================================

export type UserRole = 'admin' | 'auctioneer' | 'bidder';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  buyerNumber: string | null;
  bidLimit: number;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// ─── Vehicle ──────────────────────────────────────────────

export type VehicleCondition = 'run_drive' | 'enhanced_vehicle' | 'stationary' | 'parts_only';

export interface Vehicle {
  id: string;
  vin: string;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  bodyStyle: string | null;
  color: string | null;
  odometer: number | null;
  odometerUnit: string;
  condition: VehicleCondition;
  damageType: string | null;
  secondaryDamage: string | null;
  keysAvailable: boolean;
  titleState: string | null;
  titleType: string | null;
  cylinders: number | null;
  engineSize: string | null;
  transmission: string | null;
  drive: string | null;
  fuelType: string | null;
  airbags: string | null;
  estimatedRepair: number | null;
  actualCashValue: number | null;
  images: string[];
  locationCity: string | null;
  locationState: string | null;
  locationZip: string | null;
  lotNumber: string | null;
  createdAt: string;
  updatedAt: string;
  currentLot?: LotSummary | null;
}

// ─── Auction ──────────────────────────────────────────────

export type AuctionStatus = 'scheduled' | 'live' | 'paused' | 'completed' | 'cancelled';

export interface Auction {
  id: string;
  title: string;
  description: string | null;
  auctionDate: string;
  endDate: string | null;
  location: string | null;
  status: AuctionStatus;
  auctioneerId: string | null;
  maxLots: number;
  laneCount: number;
  /** Total sales amount (sum of sold lot prices) */
  totalSales?: number;
  createdAt: string;
  lots?: Lot[];
  lotCount?: number;
  soldCount?: number;
}

// ─── Lot ──────────────────────────────────────────────────

export type LotStatus = 'pending' | 'active' | 'sold' | 'no_sale' | 'withdrawn';

export interface Lot {
  endsAt: any;
  id: string;
  auctionId: string;
  vehicleId: string;
  lotOrder: number;
  lane: number;
  startingBid: number;
  reservePrice: number | null;
  currentBid: number;
  currentBidder: string | null;
  currentBidderName: string | null;
  bidCount: number;
  status: LotStatus;
  soldPrice: number | null;
  soldTo: string | null;
  bidIncrement: number;
  startedAt: string | null;
  closedAt: string | null;
  vehicle?: Vehicle;
  activeLot: boolean; 
  LotTimer?: number; 
//  onLotAdded?: () => void; // Optional callback to trigger when lot is added (for real-time updates)
}

export interface LotSummary {
  id: string;
  currentBid: number;
  bidCount: number;
  status: LotStatus;
  auction: { id: string; title: string; auctionDate: string } | null;
}

// ─── Bid ──────────────────────────────────────────────────

export type BidType = 'manual' | 'auto' | 'proxy' | 'ai_suggested';
export type BidStatus = 'active' | 'outbid' | 'winning' | 'won' | 'cancelled';

export interface Bid {
  id: string;
  lotId: string;
  bidderId: string;
  amount: number;
  bidType: BidType;
  // status: BidStatus;
  status: 'winning' | 'lost' | 'pending'; 
  lotStatus: 'sold' | 'active';           // add this if your data has it
  createdAt: string;
}

// ─── API Response wrappers ────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiError {
  error: string;
  errors?: { msg: string; path: string }[];
}

// ─── WebSocket Events ─────────────────────────────────────

export interface BidPlacedEvent {
  lotId: string;
  bidderId: string;
  amount: number;
  currentBid: number;
  bidCount: number;
}

export interface LotUpdatedEvent {
  lot: Lot;
}

export interface LotAdvancedEvent {
  previousLot: Lot;
  currentLot: Lot;
}

export interface AuctionEndedEvent {
  auctionId: string;
}

// ─── Filters ──────────────────────────────────────────────

export interface VehicleFilters {
  make?: string;
  model?: string;
  yearMin?: number;
  yearMax?: number;
  condition?: VehicleCondition;
  titleType?: string;
  locationState?: string;
  priceMin?: number;
  priceMax?: number;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}
