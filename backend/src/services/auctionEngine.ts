import { query, pool } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { logger } from '../utils/logger';

export interface AuctionEngineResult {
  action: string;
  auctionId: string;
  currentLot?: any;
  previousLot?: any;
  message: string;
}

const emit = async (auctionId: string, event: string, data: any) => {
  try {
    const { emitToAuction } = await import('../websocket/socket');
    emitToAuction(auctionId, event, data);
  } catch {}
};

const startTimer = async (auctionId: string, lot: any) => {
  try {
    const { startLotTimer } = await import('./lotTimer');
    startLotTimer(auctionId, lot.id, new Date(lot.started_at));
  } catch {}
};

const clearTimer = async (auctionId: string) => {
  try {
    const { clearLotTimer } = await import('./lotTimer');
    clearLotTimer(auctionId);
  } catch {}
};

export class AuctionEngine {
  calculateNextIncrement(currentBid: number): number {
    if (currentBid < 500)   return 25;
    if (currentBid < 1000)  return 50;
    if (currentBid < 5000)  return 100;
    if (currentBid < 10000) return 250;
    if (currentBid < 50000) return 500;
    return 1000;
  }

  async startAuction(auctionId: string): Promise<AuctionEngineResult> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const auctionResult = await client.query(
        'SELECT * FROM auctions WHERE id = $1 FOR UPDATE', [auctionId]
      );
      if (!auctionResult.rows.length) throw new AppError(404, 'Auction not found');
      const auction = auctionResult.rows[0];
      if (auction.status === 'live')      throw new AppError(400, 'Auction already live');
      if (auction.status === 'completed') throw new AppError(400, 'Auction already completed');
      if (auction.status === 'cancelled') throw new AppError(400, 'Cannot start cancelled auction');

      const lotsCheck = await client.query(
        'SELECT COUNT(*) FROM lots WHERE auction_id = $1', [auctionId]
      );
      if (parseInt(lotsCheck.rows[0].count) === 0) {
        throw new AppError(400, 'Cannot start auction with no lots');
      }

      await client.query('UPDATE auctions SET status = $1 WHERE id = $2', ['live', auctionId]);

      const firstLot = await client.query(
        `UPDATE lots SET status = 'active', started_at = NOW()
         WHERE id = (
           SELECT id FROM lots WHERE auction_id = $1 AND status = 'pending'
           ORDER BY lot_order ASC LIMIT 1
         ) RETURNING *`,
        [auctionId]
      );

      await client.query('COMMIT');
      const currentLot = firstLot.rows[0] || null;

      await emit(auctionId, 'auction_started', { auctionId, status: 'live', currentLot });
      if (currentLot) {
        await emit(auctionId, 'lot_updated', { lot: currentLot });
        await startTimer(auctionId, currentLot);
      }

      logger.info(`[AuctionEngine] Auction ${auctionId} started`);
      return { action: 'auction_started', auctionId, currentLot, message: `Auction started. Lot ${currentLot?.lot_order} active.` };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async advanceLot(auctionId: string): Promise<AuctionEngineResult> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const auctionResult = await client.query(
        'SELECT * FROM auctions WHERE id = $1 FOR UPDATE', [auctionId]
      );
      if (!auctionResult.rows.length) throw new AppError(404, 'Auction not found');
      if (auctionResult.rows[0].status !== 'live') throw new AppError(400, 'Auction not live');

      await clearTimer(auctionId);

      const closedLot = await client.query(
        `UPDATE lots
         SET status = CASE
           WHEN current_bid > 0 AND (reserve_price IS NULL OR current_bid >= reserve_price) THEN 'sold'
           ELSE 'no_sale'
         END,
         sold_price = CASE
           WHEN current_bid > 0 AND (reserve_price IS NULL OR current_bid >= reserve_price) THEN current_bid
           ELSE NULL
         END,
         sold_to = CASE
           WHEN current_bid > 0 AND (reserve_price IS NULL OR current_bid >= reserve_price) THEN current_bidder
           ELSE NULL
         END,
         closed_at = NOW()
         WHERE auction_id = $1 AND status = 'active'
         RETURNING *`,
        [auctionId]
      );

      const previousLot = closedLot.rows[0] || null;

      const nextLot = await client.query(
        `UPDATE lots SET status = 'active', started_at = NOW()
         WHERE id = (
           SELECT id FROM lots WHERE auction_id = $1 AND status = 'pending'
           ORDER BY lot_order ASC LIMIT 1
         ) RETURNING *`,
        [auctionId]
      );

      await client.query('COMMIT');
      const currentLot = nextLot.rows[0] || null;

      if (previousLot) await emit(auctionId, 'lot_updated', { lot: previousLot });

      if (currentLot) {
        await emit(auctionId, 'lot_advanced', { previousLot, currentLot });
        await emit(auctionId, 'lot_updated', { lot: currentLot });
        await startTimer(auctionId, currentLot);
      } else {
        await emit(auctionId, 'no_more_lots', { auctionId, previousLot });
      }

      logger.info(`[AuctionEngine] Advanced lot in auction ${auctionId}`);
      return {
        action: currentLot ? 'lot_advanced' : 'no_more_lots',
        auctionId, previousLot, currentLot,
        message: currentLot ? `Advanced to lot ${currentLot.lot_order}` : 'No more lots.',
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async endAuction(auctionId: string): Promise<AuctionEngineResult> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const auctionResult = await client.query(
        'SELECT * FROM auctions WHERE id = $1 FOR UPDATE', [auctionId]
      );
      if (!auctionResult.rows.length) throw new AppError(404, 'Auction not found');
      if (auctionResult.rows[0].status === 'completed') throw new AppError(400, 'Already completed');

      await clearTimer(auctionId);

      await client.query(
        `UPDATE lots
         SET status = CASE
           WHEN current_bid > 0 AND (reserve_price IS NULL OR current_bid >= reserve_price) THEN 'sold'
           ELSE 'no_sale'
         END,
         sold_price = CASE
           WHEN current_bid > 0 AND (reserve_price IS NULL OR current_bid >= reserve_price) THEN current_bid
           ELSE NULL
         END,
         sold_to = CASE
           WHEN current_bid > 0 AND (reserve_price IS NULL OR current_bid >= reserve_price) THEN current_bidder
           ELSE NULL
         END,
         closed_at = NOW()
         WHERE auction_id = $1 AND status = 'active'`,
        [auctionId]
      );
      await client.query(
        `UPDATE lots SET status = 'withdrawn' WHERE auction_id = $1 AND status = 'pending'`,
        [auctionId]
      );
      await client.query(
        `UPDATE auctions SET status = 'completed', end_date = NOW() WHERE id = $1`,
        [auctionId]
      );

      await client.query('COMMIT');
      await emit(auctionId, 'auction_ended', { auctionId, status: 'completed' });

      logger.info(`[AuctionEngine] Auction ${auctionId} completed`);
      return { action: 'auction_ended', auctionId, message: 'Auction completed' };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

export const auctionEngine = new AuctionEngine();
