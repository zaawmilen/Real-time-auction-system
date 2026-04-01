import { Router, Request, Response, NextFunction } from 'express';
import { BidsService } from './bids.service';
import { authenticate } from '../../middleware/auth.middleware';
import { AuthRequest } from '../../middleware/auth.middleware';

const router = Router();
const bidsService = new BidsService();

// GET /api/bids/lot/:lotId
router.get('/lot/:lotId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bids = await bidsService.getLotBids(req.params.lotId);
    res.json({ data: bids });
  } catch (error) { next(error); }
});

// GET /api/bids/my
router.get('/my', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const bids = await bidsService.getUserBids(req.user!.userId);
    res.json({ data: bids });
  } catch (error) { next(error); }
});

// POST /api/bids
router.post('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { lotId, amount, bidType } = req.body;
    if (!lotId || !amount) {
      res.status(400).json({ error: 'lotId and amount are required' });
      return;
    }
    const result = await bidsService.placeBid({
      lotId,
      bidderId: req.user!.userId,
      amount: parseFloat(amount),
      bidType,
      ipAddress: req.ip,
    });
    res.status(201).json(result);
  } catch (error) { next(error); }
});

export default router;
