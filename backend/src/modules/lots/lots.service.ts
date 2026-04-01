import { query } from '../../config/database';
import { AppError } from '../../middleware/error.middleware';

export class LotsService {
  async findById(id: string) {
    const result = await query(
      `SELECT l.*,
              v.id as v_id, v.vin, v.year, v.make, v.model, v.trim, v.body_style,
              v.color, v.odometer, v.condition, v.damage_type, v.secondary_damage,
              v.keys_available, v.title_type, v.engine_size, v.transmission,
              v.fuel_type, v.images, v.lot_number, v.actual_cash_value, v.estimated_repair,
              v.location_city, v.location_state,
              u.first_name as bidder_first, u.last_name as bidder_last, u.buyer_number
       FROM lots l
       JOIN vehicles v ON v.id = l.vehicle_id
       LEFT JOIN users u ON u.id = l.current_bidder
       WHERE l.id = $1`,
      [id]
    );
    if (!result.rows.length) throw new AppError(404, 'Lot not found');
    return this.formatLotDetail(result.rows[0]);
  }

  async findByAuction(auctionId: string) {
    const result = await query(
      `SELECT l.*,
              v.year, v.make, v.model, v.trim, v.color, v.odometer,
              v.condition, v.damage_type, v.images, v.lot_number,
              v.actual_cash_value, v.estimated_repair
       FROM lots l
       JOIN vehicles v ON v.id = l.vehicle_id
       WHERE l.auction_id = $1
       ORDER BY l.lot_order ASC`,
      [auctionId]
    );
    return result.rows.map(this.formatLotDetail.bind(this));
  }

  async getActiveLot(auctionId: string) {
    const result = await query(
      `SELECT l.*,
              v.year, v.make, v.model, v.trim, v.color, v.odometer,
              v.condition, v.damage_type, v.secondary_damage, v.keys_available,
              v.title_type, v.engine_size, v.transmission, v.fuel_type,
              v.images, v.lot_number, v.actual_cash_value, v.estimated_repair,
              v.location_city, v.location_state, v.vin,
              u.first_name as bidder_first, u.last_name as bidder_last
       FROM lots l
       JOIN vehicles v ON v.id = l.vehicle_id
       LEFT JOIN users u ON u.id = l.current_bidder
       WHERE l.auction_id = $1 AND l.status = 'active'
       LIMIT 1`,
      [auctionId]
    );
    if (!result.rows.length) return null;
    return this.formatLotDetail(result.rows[0]);
  }

  private formatLotDetail(row: any) {
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
      currentBidderName: row.bidder_first
        ? `${row.bidder_first} ${row.bidder_last}`
        : null,
      bidderBuyerNumber: row.buyer_number || null,
      bidCount: parseInt(row.bid_count || 0),
      status: row.status,
      soldPrice: row.sold_price ? parseFloat(row.sold_price) : null,
      soldTo: row.sold_to,
      bidIncrement: parseFloat(row.bid_increment),
      startedAt: row.started_at,
      closedAt: row.closed_at,
      vehicle: row.make ? {
        id: row.v_id || row.vehicle_id,
        vin: row.vin,
        year: row.year,
        make: row.make,
        model: row.model,
        trim: row.trim,
        bodyStyle: row.body_style,
        color: row.color,
        odometer: row.odometer,
        condition: row.condition,
        damageType: row.damage_type,
        secondaryDamage: row.secondary_damage,
        keysAvailable: row.keys_available,
        titleType: row.title_type,
        engineSize: row.engine_size,
        transmission: row.transmission,
        fuelType: row.fuel_type,
        images: typeof row.images === 'string' ? JSON.parse(row.images) : row.images || [],
        lotNumber: row.lot_number,
        actualCashValue: row.actual_cash_value ? parseFloat(row.actual_cash_value) : null,
        estimatedRepair: row.estimated_repair ? parseFloat(row.estimated_repair) : null,
        locationCity: row.location_city,
        locationState: row.location_state,
      } : null,
    };
  }
}
