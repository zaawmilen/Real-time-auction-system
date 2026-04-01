import { Router, Request, Response, NextFunction } from 'express';
import { LotsService } from './lots.service';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();
const lotsService = new LotsService();

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lot = await lotsService.findById(req.params.id);
    res.json(lot);
  } catch (error) { next(error); }
});

router.get('/auction/:auctionId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lots = await lotsService.findByAuction(req.params.auctionId);
    res.json({ data: lots });
  } catch (error) { next(error); }
});

router.get('/auction/:auctionId/active', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lot = await lotsService.getActiveLot(req.params.auctionId);
    res.json(lot || null);
  } catch (error) { next(error); }
});

export default router;
