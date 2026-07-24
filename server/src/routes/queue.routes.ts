import { Router } from 'express';
import { QueueController } from '../controllers/queue.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { queueRateLimiter } from '../middleware/rate-limit.middleware';

const router = Router();

router.use(authMiddleware);

router.post('/join', queueRateLimiter, QueueController.joinQueue);
router.get('/status/:productId', QueueController.getQueueStatus);
router.post('/leave', QueueController.leaveQueue);

export default router;
