import { Router } from 'express';
import {
  getAuctions, getAuction,
  createAuction, createAuctionValidation,
  updateAuctionStatus, addLotToAuction,
  startAuction, advanceLot, endAuction,
} from './auctions.controller';
import { authenticate, requireRole } from '../../middleware/auth.middleware';

const router = Router();

router.get('/', getAuctions);
router.get('/:id', getAuction);
router.post('/', authenticate, requireRole('admin', 'auctioneer'), createAuctionValidation, createAuction);
router.patch('/:id/status', authenticate, requireRole('admin', 'auctioneer'), updateAuctionStatus);
router.post('/:id/lots', authenticate, requireRole('admin', 'auctioneer'), addLotToAuction);
router.post('/:id/start', authenticate, requireRole('admin', 'auctioneer'), startAuction);
router.post('/:id/advance', authenticate, requireRole('admin', 'auctioneer'), advanceLot);
router.post('/:id/end', authenticate, requireRole('admin', 'auctioneer'), endAuction);

export default router;
