import { Router, Request, Response } from 'express';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

// Stub — fully implemented in Week 4
router.post('/suggest-bid', authenticate, (_req: Request, res: Response) => {
  res.json({
    message: 'AI bid suggestion — implemented in Week 4',
    suggestion: null,
  });
});

router.post('/analyze-vehicle', authenticate, (_req: Request, res: Response) => {
  res.json({
    message: 'AI vehicle analysis — implemented in Week 4',
    analysis: null,
  });
});

export default router;
