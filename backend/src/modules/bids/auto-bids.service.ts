import { pool, query } from '../../config/database';
import { AppError } from '../../middleware/error.middleware';
import { logger } from '../../utils/logger';

export interface PlaceAutoBidDto {
  lotId: string;
  bidderId: string;
  maxAmount: number;
}

export class AutoBidsService {

  // ── Set / update a user's auto-bid max ──────────────────────────────
  async placeAutoBid(dto: PlaceAutoBidDto) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const lotResult = await client.query(
        `SELECT l.*, a.status AS auction_status
         FROM lots l
         JOIN auctions a ON a.id = l.auction_id
         WHERE l.id = $1 FOR UPDATE`,
        [dto.lotId]
      );
      if (!lotResult.rows.length) throw new AppError(404, 'Lot not found');
      const lot = lotResult.rows[0];

      if (lot.auction_status !== 'live') throw new AppError(400, 'Auction is not live');
      if (lot.status !== 'active')       throw new AppError(400, 'Lot is not active');

      const currentBid    = parseFloat(lot.current_bid || 0);
      const bidIncrement  = parseFloat(lot.bid_increment);
      const startingBid   = parseFloat(lot.starting_bid);
      const minRequired   = currentBid === 0 ? startingBid : currentBid + bidIncrement;

      if (dto.maxAmount < minRequired) {
        throw new AppError(400, `Auto-bid max must be at least $${minRequired.toFixed(2)}`);
      }

      // Upsert — user can raise their max at any time
      const result = await client.query(
        `INSERT INTO auto_bids (lot_id, bidder_id, max_amount, is_active)
         VALUES ($1, $2, $3, true)
         ON CONFLICT (lot_id, bidder_id)
         DO UPDATE SET max_amount = $3, is_active = true, updated_at = NOW()
         RETURNING *`,
        [dto.lotId, dto.bidderId, dto.maxAmount]
      );

      await client.query('COMMIT');

      const isAlreadyWinning = lot.current_bidder === dto.bidderId;

      // If not yet winning, fire the engine immediately
      if (!isAlreadyWinning) {
        setImmediate(() =>
          this.triggerAutoBid(dto.lotId, currentBid, lot.current_bidder ?? '').catch(
            err => logger.error('[AutoBid] trigger on placement failed', { err })
          )
        );
      }

      return {
        autoBid: this.formatAutoBid(result.rows[0]),
        isAlreadyWinning,
        currentBid,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // ── Core engine: called after every bid (manual or auto) ────────────
  async triggerAutoBid(
    lotId: string,
    _afterBidAmount: number,   // kept for future use / logging
    _afterBidderId: string,
    depth = 0
  ): Promise<void> {
    if (depth > 20) {
      logger.warn('[AutoBid] depth guard hit', { lotId });
      return;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Always re-read current lot state inside the transaction
      const lotResult = await client.query(
        'SELECT * FROM lots WHERE id = $1 FOR UPDATE',
        [lotId]
      );
      if (!lotResult.rows.length) { await client.query('ROLLBACK'); return; }
      const lot = lotResult.rows[0];
      if (lot.status !== 'active')  { await client.query('ROLLBACK'); return; }

      const currentBid     = parseFloat(lot.current_bid || 0);
      const bidIncrement   = parseFloat(lot.bid_increment);
      const currentWinnerId = lot.current_bidder as string | null;
      const nextBidAmount  = currentBid + bidIncrement;

      // Best competing auto-bid (not the current winner, can cover nextBidAmount)
      const compResult = await client.query(
        `SELECT ab.*, u.first_name, u.last_name, u.buyer_number
         FROM auto_bids ab
         JOIN users u ON u.id = ab.bidder_id
         WHERE ab.lot_id = $1
           AND ab.bidder_id != $2
           AND ab.is_active = true
           AND ab.max_amount >= $3
         ORDER BY ab.max_amount DESC, ab.created_at ASC
         LIMIT 1`,
        [lotId, currentWinnerId ?? '', nextBidAmount]
      );

      if (!compResult.rows.length) {
        // Nobody can beat the current price — engine stops
        await client.query('COMMIT');
        return;
      }

      const competitor   = compResult.rows[0];
      let   bidAmount    = nextBidAmount;

      // If current winner also has an auto-bid, resolve the competition in one step
      if (currentWinnerId) {
        const winnerAuto = await client.query(
          `SELECT max_amount FROM auto_bids
           WHERE lot_id = $1 AND bidder_id = $2 AND is_active = true`,
          [lotId, currentWinnerId]
        );

        if (winnerAuto.rows.length) {
          const winnerMax   = parseFloat(winnerAuto.rows[0].max_amount);
          const compMax     = parseFloat(competitor.max_amount);

          if (compMax > winnerMax) {
            // Competitor wins — just one increment above winner's ceiling
            bidAmount = winnerMax + bidIncrement;
          } else if (compMax === winnerMax) {
            // Exact tie — first bidder (current winner) keeps it
            await client.query('COMMIT');
            return;
          } else {
            // Winner's auto-bid is higher — no change needed
            await client.query('ROLLBACK');
            return;
          }
        }
        // else: current winner has no auto-bid; competitor bids at nextBidAmount (already set)
      }

      // ── Place the auto-bid ────────────────────────────────────────────
      const prevResult = await client.query(
        `UPDATE bids SET status = 'outbid'
         WHERE lot_id = $1 AND status IN ('active', 'winning')
         RETURNING bidder_id`,
        [lotId]
      );
      const outbidderIds: string[] = prevResult.rows
        .map((r: any) => r.bidder_id as string)
        .filter(id => id !== competitor.bidder_id);

      await client.query(
        `INSERT INTO bids (lot_id, bidder_id, amount, bid_type, status)
         VALUES ($1, $2, $3, 'auto', 'winning')`,
        [lotId, competitor.bidder_id, bidAmount]
      );

      await client.query(
        `UPDATE lots
         SET current_bid = $1, current_bidder = $2, bid_count = bid_count + 1
         WHERE id = $3`,
        [bidAmount, competitor.bidder_id, lotId]
      );

      await client.query('COMMIT');

      // ── Broadcast ────────────────────────────────────────────────────
      const { emitToAuction, emitToUser } = await import('../../websocket/socket');

      const auctionRow = await query('SELECT auction_id FROM lots WHERE id = $1', [lotId]);
      const auctionId  = auctionRow.rows[0]?.auction_id as string | undefined;

      if (auctionId) {
        emitToAuction(auctionId, 'bid_placed', {
          lotId,
          bidderId:    competitor.bidder_id,
          bidderName:  `${competitor.first_name} ${competitor.last_name}`,
          buyerNumber: competitor.buyer_number ?? null,
          amount:      bidAmount,
          currentBid:  bidAmount,
          bidCount:    parseInt(lot.bid_count) + 1,
          bidType:     'auto',
          timestamp:   new Date().toISOString(),
        });

        // Private: tell auto-bidder their proxy fired
        emitToUser(competitor.bidder_id, 'auto_bid_placed', {
          lotId,
          amount:    bidAmount,
          maxAmount: parseFloat(competitor.max_amount),
          timestamp: new Date().toISOString(),
        });

        // Private: outbid notifications
        outbidderIds.forEach(id =>
          emitToUser(id, 'you_were_outbid', {
            lotId,
            newCurrentBid: bidAmount,
            outbidBy:      competitor.bidder_id,
            bidType:       'auto',
            timestamp:     new Date().toISOString(),
          })
        );

        // Extend anti-snipe timer
        try {
          const { extendLotTimer } = await import('../../services/lotTimer');
          extendLotTimer(auctionId, lotId);
        } catch {}
      }

      logger.info(`[AutoBid] $${bidAmount} for bidder ${competitor.bidder_id} on lot ${lotId} (depth ${depth})`);

      // Recurse — check if THIS bid triggers yet another auto-bid
      setImmediate(() =>
        this.triggerAutoBid(lotId, bidAmount, competitor.bidder_id, depth + 1).catch(
          err => logger.error('[AutoBid] recursive trigger failed', { err })
        )
      );

    } catch (err) {
      await client.query('ROLLBACK');
      logger.error('[AutoBid] triggerAutoBid error', { err, lotId });
    } finally {
      client.release();
    }
  }

  // ── Cancel ──────────────────────────────────────────────────────────
  async cancelAutoBid(lotId: string, bidderId: string) {
    const result = await query(
      `UPDATE auto_bids SET is_active = false, updated_at = NOW()
       WHERE lot_id = $1 AND bidder_id = $2 AND is_active = true
       RETURNING *`,
      [lotId, bidderId]
    );
    if (!result.rows.length) throw new AppError(404, 'No active auto-bid found');
    return this.formatAutoBid(result.rows[0]);
  }

  // ── Get a user's own auto-bid (never expose other users' max) ───────
  async getAutoBid(lotId: string, bidderId: string) {
    const result = await query(
      `SELECT * FROM auto_bids
       WHERE lot_id = $1 AND bidder_id = $2 AND is_active = true`,
      [lotId, bidderId]
    );
    return result.rows.length ? this.formatAutoBid(result.rows[0]) : null;
  }

  // ── Called by AuctionEngine.advanceLot() to clean up ────────────────
  async deactivateForLot(lotId: string) {
    await query(
      `UPDATE auto_bids SET is_active = false, updated_at = NOW()
       WHERE lot_id = $1 AND is_active = true`,
      [lotId]
    );
  }

  private formatAutoBid(row: any) {
    return {
      id:        row.id,
      lotId:     row.lot_id,
      bidderId:  row.bidder_id,
      maxAmount: parseFloat(row.max_amount),
      isActive:  row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}