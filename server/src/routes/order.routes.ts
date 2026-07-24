import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';

const router = Router();

router.use(authMiddleware);

router.post('/reserve', roleMiddleware('buyer', 'admin'), OrderController.reserveProduct);
router.get('/', OrderController.getOrderHistory);
router.get('/:id', OrderController.getOrderById);
router.post('/:id/cancel', OrderController.cancelOrder);

export default router;
