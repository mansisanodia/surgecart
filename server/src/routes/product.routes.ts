import { Router } from 'express';
import { ProductController } from '../controllers/product.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';

const router = Router();

// Public routes
router.get('/', ProductController.getProducts);
router.get('/:id', ProductController.getProductById);

// Seller/Admin protected routes
router.get('/seller/list', authMiddleware, roleMiddleware('seller', 'admin'), ProductController.getSellerProducts);
router.post('/', authMiddleware, roleMiddleware('seller', 'admin'), ProductController.createProduct);
router.put('/:id', authMiddleware, roleMiddleware('seller', 'admin'), ProductController.updateProduct);
router.delete('/:id', authMiddleware, roleMiddleware('seller', 'admin'), ProductController.deleteProduct);

export default router;
