import { query } from '../../config/database';
import { AppError } from '../../middleware/error.middleware';

export interface CreateAuctionDto {
  title: string;
  description?: string;
  auctionDate: string;
  endDate?: string;
  location?: string;
  maxLots?: number;
  laneCount?: number;
  auctioneerId?: string;
}

export class AuctionsService {
  async findAll(status?: string) {
    const conditions = status ? `WHERE status = $1` : '';
    const params = status ? [status] : [];

    const result = await query(
      `SELECT a.*,
              COUNT(l.id) as lot_count,
              COUNT(l.id) FILTER (WHERE l.status = 'sold') as sold_count,
              COALESCE(SUM(l.sold_price) FILTER (WHERE l.status = 'sold'), 0) as total_sales
       FROM auctions a
       LEFT JOIN lots l ON l.auction_id = a.id
       ${conditions}
       GROUP BY a.id
       ORDER BY a.auction_date DESC`,
      params
    );

    return result.rows.map(this.formatAuction);
  }

  async findById(id: string) {
    const auctionResult = await query(
      `SELECT a.*,
              COUNT(l.id) as lot_count,
              COUNT(l.id) FILTER (WHERE l.status = 'sold') as sold_count,
              COALESCE(SUM(l.sold_price) FILTER (WHERE l.status = 'sold'), 0) as total_sales
       FROM auctions a
       LEFT JOIN lots l ON l.auction_id = a.id
       WHERE a.id = $1
       GROUP BY a.id`,
      [id]
    );

    if (!auctionResult.rows.length) throw new AppError(404, 'Auction not found');

    const lotsResult = await query(
      `SELECT l.*,
              v.year, v.make, v.model, v.trim, v.color, v.odometer,
              v.condition, v.damage_type, v.images, v.lot_number,
              v.actual_cash_value, v.estimated_repair,
              u.first_name as bidder_first, u.last_name as bidder_last
       FROM lots l
       JOIN vehicles v ON v.id = l.vehicle_id
       LEFT JOIN users u ON u.id = l.current_bidder
       WHERE l.auction_id = $1
       ORDER BY l.lot_order ASC`,
      [id]
    );

    return {
      ...this.formatAuction(auctionResult.rows[0]),
      lots: lotsResult.rows.map(this.formatLot),
    };
  }

  async create(dto: CreateAuctionDto) {
    const result = await query(
      `INSERT INTO auctions (title, description, auction_date, end_date, location, max_lots, lane_count, auctioneer_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [dto.title, dto.description, dto.auctionDate, dto.endDate,
       dto.location, dto.maxLots || 500, dto.laneCount || 1, dto.auctioneerId]
    );
    return this.formatAuction(result.rows[0]);
  }

  async updateStatus(id: string, status: string) {
    const valid = ['scheduled', 'live', 'paused', 'completed', 'cancelled'];
    if (!valid.includes(status)) throw new AppError(400, 'Invalid status');

    const result = await query(
      `UPDATE auctions SET status = $1 WHERE id = $2 RETURNING *`,
      [status, id]
    );
    if (!result.rows.length) throw new AppError(404, 'Auction not found');
    return this.formatAuction(result.rows[0]);
  }

  async addLot(auctionId: string, vehicleId: string, options: {
    lotOrder?: number;
    startingBid?: number;
    reservePrice?: number;
    bidIncrement?: number;
    lane?: number;
  } = {}) {
    // Verify auction exists and is scheduled
    const auction = await query('SELECT id, status, max_lots FROM auctions WHERE id = $1', [auctionId]);
    if (!auction.rows.length) throw new AppError(404, 'Auction not found');
    if (!['scheduled', 'paused'].includes(auction.rows[0].status)) {
      throw new AppError(400, 'Can only add lots to scheduled auctions');
    }

    // Get next lot order if not provided
    let lotOrder = options.lotOrder;
    if (!lotOrder) {
      const maxOrder = await query(
        'SELECT COALESCE(MAX(lot_order), 0) + 1 as next_order FROM lots WHERE auction_id = $1',
        [auctionId]
      );
      lotOrder = maxOrder.rows[0].next_order;
    }

    const result = await query(
      `INSERT INTO lots (auction_id, vehicle_id, lot_order, starting_bid, reserve_price, bid_increment, lane)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [auctionId, vehicleId, lotOrder, options.startingBid || 0,
       options.reservePrice, options.bidIncrement || 25, options.lane || 1]
    );
    return this.formatLot(result.rows[0]);
  }

  private formatAuction(row: any) {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      auctionDate: row.auction_date,
      endDate: row.end_date,
      location: row.location,
      status: row.status,
      auctioneerId: row.auctioneer_id,
      maxLots: row.max_lots,
      laneCount: row.lane_count,
      lotCount: parseInt(row.lot_count || 0),
      soldCount: parseInt(row.sold_count || 0),
      totalSales: parseFloat(row.total_sales || 0),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private formatLot(row: any) {
    return {
      id: row.id,
      auctionId: row.auction_id,
      vehicleId: row.vehicle_id,
      lotOrder: row.lot_order,
      lane: row.lane,
      startingBid: parseFloat(row.starting_bid),
      reservePrice: row.reserve_price ? parseFloat(row.reserve_price) : null,
      currentBid: parseFloat(row.current_bid || 0),
      currentBidder: row.current_bidder,
      currentBidderName: row.bidder_first ? `${row.bidder_first} ${row.bidder_last}` : null,
      bidCount: parseInt(row.bid_count || 0),
      status: row.status,
      soldPrice: row.sold_price ? parseFloat(row.sold_price) : null,
      soldTo: row.sold_to,
      bidIncrement: parseFloat(row.bid_increment),
      startedAt: row.started_at,
      closedAt: row.closed_at,
      vehicle: row.make ? {
        year: row.year,
        make: row.make,
        model: row.model,
        trim: row.trim,
        color: row.color,
        odometer: row.odometer,
        condition: row.condition,
        damageType: row.damage_type,
        images: typeof row.images === 'string' ? JSON.parse(row.images) : row.images || [],
        lotNumber: row.lot_number,
        actualCashValue: row.actual_cash_value ? parseFloat(row.actual_cash_value) : null,
        estimatedRepair: row.estimated_repair ? parseFloat(row.estimated_repair) : null,
      } : null,
    };
  }
}
