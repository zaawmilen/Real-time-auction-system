import { query, pool } from '../../config/database';
import { AppError } from '../../middleware/error.middleware';

export interface PlaceBidDto {
  lotId: string;
  bidderId: string;
  amount: number;
  bidType?: string;
  ipAddress?: string;
}

export class BidsService {
  async placeBid(dto: PlaceBidDto) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Lock the lot row for update
      const lotResult = await client.query(
        `SELECT l.*, a.status as auction_status
         FROM lots l
         JOIN auctions a ON a.id = l.auction_id
         WHERE l.id = $1
         FOR UPDATE`,
        [dto.lotId]
      );

      if (!lotResult.rows.length) throw new AppError(404, 'Lot not found');
      const lot = lotResult.rows[0];

      // Validations
      if (lot.auction_status !== 'live') {
        throw new AppError(400, 'Auction is not live');
      }
      if (lot.status !== 'active') {
        throw new AppError(400, 'Lot is not active for bidding');
      }
      if (lot.current_bidder === dto.bidderId) {
        throw new AppError(400, 'You are already the highest bidder');
      }

      const currentBid = parseFloat(lot.current_bid);
      const minBid = currentBid === 0
        ? parseFloat(lot.starting_bid)
        : currentBid + parseFloat(lot.bid_increment);

      if (dto.amount < minBid) {
        throw new AppError(400, `Minimum bid is $${minBid.toFixed(2)}`);
      }

      // Check user bid limit
      const userResult = await client.query(
        'SELECT bid_limit FROM users WHERE id = $1',
        [dto.bidderId]
      );
      if (userResult.rows.length && parseFloat(userResult.rows[0].bid_limit) < dto.amount) {
        throw new AppError(400, `Bid exceeds your limit of $${userResult.rows[0].bid_limit}`);
      }

      // Mark previous winning bid(s) as outbid and capture who they were
      const prevResult = await client.query(
        `UPDATE bids SET status = 'outbid'
         WHERE lot_id = $1 AND status IN ('active', 'winning')
         RETURNING *`,
        [dto.lotId]
      );
      const previousOutbidders: string[] = prevResult.rows.map((r: any) => r.bidder_id).filter((id: string) => id !== dto.bidderId);

      // Insert new bid
      const bidResult = await client.query(
        `INSERT INTO bids (lot_id, bidder_id, amount, bid_type, status, ip_address)
         VALUES ($1, $2, $3, $4, 'winning', $5)
         RETURNING *`,
        [dto.lotId, dto.bidderId, dto.amount, dto.bidType || 'manual', dto.ipAddress]
      );

      // Update lot
      await client.query(
        `UPDATE lots
         SET current_bid = $1, current_bidder = $2, bid_count = bid_count + 1
         WHERE id = $3`,
        [dto.amount, dto.bidderId, dto.lotId]
      );

      await client.query('COMMIT');

      return {
        bid: this.formatBid(bidResult.rows[0]),
        lot: {
          id: lot.id,
          currentBid: dto.amount,
          currentBidder: dto.bidderId,
          bidCount: parseInt(lot.bid_count) + 1,
        },
        previousOutbidders,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getLotBids(lotId: string, limit = 20) {
    const result = await query(
      `SELECT b.*, u.first_name, u.last_name, u.buyer_number
       FROM bids b
       JOIN users u ON u.id = b.bidder_id
       WHERE b.lot_id = $1
       ORDER BY b.created_at DESC
       LIMIT $2`,
      [lotId, limit]
    );
    return result.rows.map(this.formatBid);
  }

  async getUserBids(userId: string) {
    const result = await query(
      `SELECT b.*,
              l.lot_order, l.status as lot_status,
              v.year, v.make, v.model, v.lot_number,
              a.title as auction_title
       FROM bids b
       JOIN lots l ON l.id = b.lot_id
       JOIN vehicles v ON v.id = l.vehicle_id
       JOIN auctions a ON a.id = l.auction_id
       WHERE b.bidder_id = $1
         AND l.status IN ('active', 'sold')
       ORDER BY b.created_at DESC
       LIMIT 50`,
      [userId]
    );
    return result.rows.map(this.formatBid);
  }

  private formatBid(row: any) {
    return {
      id: row.id,
      lotId: row.lot_id,
      bidderId: row.bidder_id,
      bidderName: row.first_name ? `${row.first_name} ${row.last_name}` : null,
      buyerNumber: row.buyer_number || null,
      amount: parseFloat(row.amount),
      bidType: row.bid_type,
      status: row.status,
      createdAt: row.created_at,
      lotOrder: row.lot_order,
      lotStatus: row.lot_status,
      vehicle: row.make ? {
        year: row.year, make: row.make, model: row.model, lotNumber: row.lot_number
      } : null,
      auctionTitle: row.auction_title || null,
    };
  }
}
