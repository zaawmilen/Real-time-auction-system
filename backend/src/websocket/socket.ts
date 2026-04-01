import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import { JwtPayload } from '../middleware/auth.middleware';
import { query } from '../config/database';

let ioInstance: SocketServer | null = null;

export const getIO = (): SocketServer => {
  if (!ioInstance) throw new Error('Socket.IO not initialized');
  return ioInstance;
};

export const emitToAuction = (auctionId: string, event: string, data: any) => {
  if (!ioInstance) return;
  ioInstance.to(`auction:${auctionId}`).emit(event, data);
};

export const initializeSocket = (httpServer: HttpServer): SocketServer => {
  const allowedFrontend = [process.env.FRONTEND_URL || 'http://localhost:5173', 'http://localhost:5174'];
  const io = new SocketServer(httpServer, {
    cors: {
      origin: (incomingOrigin, callback) => {
        // incomingOrigin can be undefined for some clients
        if (!incomingOrigin) return callback(null, true);
        if (allowedFrontend.includes(incomingOrigin)) return callback(null, true);
        return callback(new Error('Not allowed by CORS'));
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  ioInstance = io;

  // ── Auth middleware ────────────────────────────────────────
  io.use((socket: Socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.split(' ')[1];
    if (!token) return next(new Error('Authentication required'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as JwtPayload;
      (socket as any).user = decoded;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  // ── Participant tracking ───────────────────────────────────
  const roomParticipants = new Map<string, Set<string>>();
  // Map of userId -> set of socket ids for targeted emits
  const userSockets = new Map<string, Set<string>>();

  const emitToUser = (userId: string, event: string, data: any) => {
    const sockets = userSockets.get(userId);
    if (!sockets || !sockets.size) return;
    sockets.forEach(sid => io.to(sid).emit(event, data));
  };

  const joinRoom = (socket: Socket, auctionId: string) => {
    socket.join(`auction:${auctionId}`);
    if (!roomParticipants.has(auctionId)) roomParticipants.set(auctionId, new Set());
    roomParticipants.get(auctionId)!.add(socket.id);
    const count = roomParticipants.get(auctionId)!.size;
    io.to(`auction:${auctionId}`).emit('participant_count', { count });
    logger.info(`[Socket] ${(socket as any).user.email} joined auction ${auctionId} (${count} participants)`);
  };

  const leaveRoom = (socket: Socket, auctionId: string) => {
    socket.leave(`auction:${auctionId}`);
    roomParticipants.get(auctionId)?.delete(socket.id);
    const count = roomParticipants.get(auctionId)?.size || 0;
    io.to(`auction:${auctionId}`).emit('participant_count', { count });
  };

  // ── Connection handler ─────────────────────────────────────
  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user as JwtPayload;
    logger.info(`[Socket] Connected: ${user.email} (${socket.id})`);

    // Track this socket under the user so we can emit targeted events later
    if (!userSockets.has(user.userId)) userSockets.set(user.userId, new Set());
    userSockets.get(user.userId)!.add(socket.id);

    // Lazy-load BidsService here to avoid circular dependency at module load time
    const { BidsService } = require('../modules/bids/bids.service');
    const bidsService = new BidsService();

    const joinedAuctions = new Set<string>();

    // ── join_auction ───────────────────────────────────────
    socket.on('join_auction', async ({ auctionId }: { auctionId: string }) => {
      try {
        const result = await query('SELECT id, status, title FROM auctions WHERE id = $1', [auctionId]);
        if (!result.rows.length) { socket.emit('error', { message: 'Auction not found' }); return; }

        joinRoom(socket, auctionId);
        joinedAuctions.add(auctionId);

        const activeLot = await query(
          `SELECT l.*, v.year, v.make, v.model, v.images
           FROM lots l JOIN vehicles v ON v.id = l.vehicle_id
           WHERE l.auction_id = $1 AND l.status = 'active' LIMIT 1`,
          [auctionId]
        );

        // Send current timer state if lot is active
        let timerInfo = null;
        if (activeLot.rows[0]?.started_at) {
          const { getLotDuration } = await import('../services/lotTimer');
          const elapsed = Math.floor((Date.now() - new Date(activeLot.rows[0].started_at).getTime()) / 1000);
          const remaining = Math.max(getLotDuration() - elapsed, 0);
          timerInfo = {
            lotId: activeLot.rows[0].id,
            totalSeconds: getLotDuration(),
            remainingSeconds: remaining,
            endsAt: new Date(new Date(activeLot.rows[0].started_at).getTime() + getLotDuration() * 1000).toISOString(),
          };
        }

        socket.emit('joined', {
          auctionId,
          auction: result.rows[0],
          activeLot: activeLot.rows[0] || null,
          timerInfo,
        });
      } catch (err) {
        logger.error('[Socket] join_auction error', { err });
        socket.emit('error', { message: 'Failed to join auction' });
      }
    });

    // ── leave_auction ──────────────────────────────────────
    socket.on('leave_auction', ({ auctionId }: { auctionId: string }) => {
      leaveRoom(socket, auctionId);
      joinedAuctions.delete(auctionId);
    });

    // ── place_bid ──────────────────────────────────────────
    socket.on('place_bid', async ({ lotId, amount }: { lotId: string; amount: number }) => {
      try {
        if (!lotId || !amount || isNaN(amount)) {
          socket.emit('bid_rejected', { reason: 'Invalid bid data' });
          return;
        }

        const lotResult = await query('SELECT auction_id FROM lots WHERE id = $1', [lotId]);
        if (!lotResult.rows.length) { socket.emit('bid_rejected', { reason: 'Lot not found' }); return; }
        const auctionId = lotResult.rows[0].auction_id;

        const result = await bidsService.placeBid({
          lotId,
          bidderId: user.userId,
          amount,
          bidType: 'manual',
        });

        io.to(`auction:${auctionId}`).emit('bid_placed', {
          lotId,
          bidderId: user.userId,
          bidderEmail: user.email,
          amount,
          currentBid: result.lot.currentBid,
          bidCount: result.lot.bidCount,
          timestamp: new Date().toISOString(),
        });

        // Notify any previous winning bidder(s) that they have been outbid
        if (result.previousOutbidders && Array.isArray(result.previousOutbidders)) {
          result.previousOutbidders.forEach((prevId: string) => {
            if (!prevId || prevId === user.userId) return;
            emitToUser(prevId, 'you_were_outbid', {
              lotId,
              newCurrentBid: result.lot.currentBid,
              outbidBy: user.userId,
              timestamp: new Date().toISOString(),
            });
          });
        }

        socket.emit('bid_confirmed', {
          bid: result.bid,
          currentBid: result.lot.currentBid,
        });

        // Extend timer if bid placed — gives urgency effect
        try {
          const { extendLotTimer } = await import('../services/lotTimer');
          extendLotTimer(auctionId, lotId);
        } catch {}

        logger.info(`[Socket] Bid $${amount} on lot ${lotId} by ${user.email}`);
      } catch (err: any) {
        socket.emit('bid_rejected', { reason: err.message || 'Bid failed' });
        logger.warn(`[Socket] Bid rejected for ${user.email}: ${err.message}`);
      }
    });

    // ── request_lot_state ──────────────────────────────────
    socket.on('request_lot_state', async ({ lotId }: { lotId: string }) => {
      try {
        const result = await query(
          `SELECT l.*, v.year, v.make, v.model FROM lots l
           JOIN vehicles v ON v.id = l.vehicle_id WHERE l.id = $1`,
          [lotId]
        );
        if (result.rows.length) socket.emit('lot_state', result.rows[0]);
      } catch (err) {
        logger.error('[Socket] request_lot_state error', { err });
      }
    });

    socket.on('ping', () => socket.emit('pong', { timestamp: Date.now() }));

    // ── disconnect ─────────────────────────────────────────
    socket.on('disconnect', (reason) => {
      for (const auctionId of joinedAuctions) leaveRoom(socket, auctionId);
      joinedAuctions.clear();
      // Remove socket from user->sockets map
      const set = userSockets.get(user.userId);
      if (set) {
        set.delete(socket.id);
        if (set.size === 0) userSockets.delete(user.userId);
      }
      logger.info(`[Socket] Disconnected: ${user.email} (${reason})`);
    });
  });

  logger.info('[Socket] Socket.IO initialized — real-time bidding active');
  return io;
};
