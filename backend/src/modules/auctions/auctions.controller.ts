import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { AuctionsService } from './auctions.service';
import { AuthRequest } from '../../middleware/auth.middleware';

const auctionsService = new AuctionsService();

export const createAuctionValidation = [
  body('title').trim().notEmpty().withMessage('Title required'),
  body('auctionDate').isISO8601().withMessage('Valid auction date required'),
];

export const getAuctions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const status = req.query.status as string | undefined;
    const auctions = await auctionsService.findAll(status);
    res.json({ data: auctions, total: auctions.length });
  } catch (error) { next(error); }
};

export const getAuction = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const auction = await auctionsService.findById(req.params.id);
    res.json(auction);
  } catch (error) { next(error); }
};

export const createAuction = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }
    const auction = await auctionsService.create({ ...req.body, auctioneerId: req.user!.userId });
    res.status(201).json(auction);
  } catch (error) { next(error); }
};

export const updateAuctionStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const auction = await auctionsService.updateStatus(req.params.id, req.body.status);
    res.json(auction);
  } catch (error) { next(error); }
};

export const addLotToAuction = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { vehicleId, startingBid, reservePrice, bidIncrement, lane } = req.body;
    if (!vehicleId) { res.status(400).json({ error: 'vehicleId required' }); return; }
    const lot = await auctionsService.addLot(req.params.id, vehicleId, {
      startingBid, reservePrice, bidIncrement, lane
    });
    res.status(201).json(lot);
  } catch (error) { next(error); }
};

export const startAuction = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { auctionEngine } = await import('../../services/auctionEngine');
    await auctionEngine.startAuction(req.params.id);
    const auction = await auctionsService.findById(req.params.id);
    res.json(auction);
  } catch (error) { next(error); }
};

export const advanceLot = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { auctionEngine } = await import('../../services/auctionEngine');
    const result = await auctionEngine.advanceLot(req.params.id);
    res.json(result);
  } catch (error) { next(error); }
};

export const endAuction = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { auctionEngine } = await import('../../services/auctionEngine');
    await auctionEngine.endAuction(req.params.id);
    const auction = await auctionsService.findById(req.params.id);
    res.json(auction);
  } catch (error) { next(error); }
};
