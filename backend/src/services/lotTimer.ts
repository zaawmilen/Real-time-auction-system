import { query } from '../config/database';
import { logger } from '../utils/logger';

const LOT_DURATION_SECONDS = 180; // 3 minutes per lot
const BID_EXTENSION_SECONDS = 30;  // extend 30s if bid in last 30s

// Active timers: auctionId -> timeout handle
const activeTimers = new Map<string, ReturnType<typeof setTimeout>>();

const emit = async (auctionId: string, event: string, data: any) => {
  try {
    const { emitToAuction } = await import('../websocket/socket');
    emitToAuction(auctionId, event, data);
  } catch {}
};

export const startLotTimer = (auctionId: string, lotId: string, startedAt: Date) => {
  // Clear any existing timer for this auction
  clearLotTimer(auctionId);

  const elapsed = Math.floor((Date.now() - startedAt.getTime()) / 1000);
  const remaining = Math.max(LOT_DURATION_SECONDS - elapsed, 0);

  logger.info(`[LotTimer] Auction ${auctionId}: lot ${lotId} — ${remaining}s remaining`);

  // Emit initial countdown
  emit(auctionId, 'lot_timer', {
    lotId,
    totalSeconds: LOT_DURATION_SECONDS,
    remainingSeconds: remaining,
    endsAt: new Date(startedAt.getTime() + LOT_DURATION_SECONDS * 1000).toISOString(),
  });

  // Countdown tick every second via WebSocket
  let remainingSeconds = remaining;
  const tickInterval = setInterval(() => {
    remainingSeconds--;
    emit(auctionId, 'lot_timer', {
      lotId,
      totalSeconds: LOT_DURATION_SECONDS,
      remainingSeconds,
      endsAt: new Date(startedAt.getTime() + LOT_DURATION_SECONDS * 1000).toISOString(),
    });

    // Warning at 30s
    if (remainingSeconds === 30) {
      emit(auctionId, 'lot_closing_soon', { lotId, secondsLeft: 30 });
    }

    if (remainingSeconds <= 0) {
      clearInterval(tickInterval);
    }
  }, 1000);

  // Auto-advance when timer expires
  const timer = setTimeout(async () => {
    clearInterval(tickInterval);
    try {
      logger.info(`[LotTimer] Auto-advancing lot ${lotId} in auction ${auctionId}`);
      const { auctionEngine } = await import('./auctionEngine');

      // Check lot is still active
      const lotCheck = await query(
        'SELECT status FROM lots WHERE id = $1',
        [lotId]
      );
      if (!lotCheck.rows.length || lotCheck.rows[0].status !== 'active') {
        logger.info(`[LotTimer] Lot ${lotId} already closed — skipping auto-advance`);
        return;
      }

      const result = await auctionEngine.advanceLot(auctionId);
      emit(auctionId, 'lot_auto_advanced', {
        message: result.message,
        previousLot: result.previousLot,
        currentLot: result.currentLot,
      });

      // Start timer for next lot if exists
      if (result.currentLot) {
        startLotTimer(auctionId, result.currentLot.id, new Date(result.currentLot.started_at));
      } else {
        // No more lots — end auction
        const { auctionEngine: ae } = await import('./auctionEngine');
        await ae.endAuction(auctionId);
      }
    } catch (err: any) {
      logger.error(`[LotTimer] Auto-advance failed: ${err.message}`);
    }
  }, remaining * 1000);

  activeTimers.set(auctionId, timer);
};

export const extendLotTimer = (auctionId: string, lotId: string) => {
  // Called when a bid is placed in the last 30 seconds
  const existing = activeTimers.get(auctionId);
  if (!existing) return;

  // We restart with extended time
  clearLotTimer(auctionId);

  const newEndsAt = new Date(Date.now() + BID_EXTENSION_SECONDS * 1000);
  emit(auctionId, 'lot_timer_extended', {
    lotId,
    extendedBy: BID_EXTENSION_SECONDS,
    newEndsAt: newEndsAt.toISOString(),
    remainingSeconds: BID_EXTENSION_SECONDS,
  });

  logger.info(`[LotTimer] Extended lot ${lotId} by ${BID_EXTENSION_SECONDS}s`);

  // Restart timer with extension
  startLotTimer(auctionId, lotId, new Date(Date.now() - (LOT_DURATION_SECONDS - BID_EXTENSION_SECONDS) * 1000));
};

export const clearLotTimer = (auctionId: string) => {
  const timer = activeTimers.get(auctionId);
  if (timer) {
    clearTimeout(timer);
    activeTimers.delete(auctionId);
  }
};

export const getLotDuration = () => LOT_DURATION_SECONDS;
