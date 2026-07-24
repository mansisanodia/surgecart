import { Request, Response, NextFunction } from 'express';
import { Product } from '../models/product.model';
import { RedisService } from '../services/redis.service';
import { SocketService } from '../services/socket.service';
import { BadRequestError, NotFoundError, ForbiddenError } from '../utils/errors';

export class ProductController {
  /**
   * Creates a new product and loads its stock into Redis
   */
  static async createProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, description, price, stock, saleStartTime, saleEndTime, image } = req.body;
      const sellerId = req.user?.id;

      if (!sellerId) {
        throw new ForbiddenError('Only sellers can create products');
      }

      if (!name || !description || price === undefined || stock === undefined || !saleStartTime || !saleEndTime) {
        throw new BadRequestError('Required fields are missing');
      }

      const product = await Product.create({
        name,
        description,
        price,
        stock,
        sellerId,
        saleStartTime: new Date(saleStartTime),
        saleEndTime: new Date(saleEndTime),
        image,
      });

      // Load stock into Redis cache immediately
      await RedisService.loadStock(product._id.toString(), stock);

      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        product,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Updates an existing product
   */
  static async updateProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const sellerId = req.user?.id;
      const { name, description, price, stock, saleStartTime, saleEndTime, image } = req.body;

      const product = await Product.findById(id);
      if (!product) {
        throw new NotFoundError('Product not found');
      }

      // Check ownership
      if (product.sellerId.toString() !== sellerId && req.user?.role !== 'admin') {
        throw new ForbiddenError('You are not authorized to update this product');
      }

      if (name) product.name = name;
      if (description) product.description = description;
      if (price !== undefined) product.price = price;
      if (image) product.image = image;
      if (saleStartTime) product.saleStartTime = new Date(saleStartTime);
      if (saleEndTime) product.saleEndTime = new Date(saleEndTime);

      // Handle stock update
      if (stock !== undefined && stock !== product.stock) {
        product.stock = stock;
        // Update Redis stock
        await RedisService.loadStock(product._id.toString(), stock);
        // Notify socket clients of stock change
        SocketService.emitStockUpdate(product._id.toString(), stock);
      }

      await product.save();

      res.status(200).json({
        success: true,
        message: 'Product updated successfully',
        product,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Deletes a product
   */
  static async deleteProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const sellerId = req.user?.id;

      const product = await Product.findById(id);
      if (!product) {
        throw new NotFoundError('Product not found');
      }

      // Check ownership
      if (product.sellerId.toString() !== sellerId && req.user?.role !== 'admin') {
        throw new ForbiddenError('You are not authorized to delete this product');
      }

      await Product.findByIdAndDelete(id);
      
      // Delete Redis stock key
      await RedisService.deleteStock(id);

      res.status(200).json({
        success: true,
        message: 'Product deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieves all products
   */
  static async getProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Find all products
      const products = await Product.find().sort({ createdAt: -1 });

      // Build listing, fetching live Redis stock for active flash sales
      const productsWithLiveStock = await Promise.all(
        products.map(async (product) => {
          const liveStock = await RedisService.getStock(product._id.toString());
          const productObj = product.toObject();
          return {
            ...productObj,
            stock: liveStock !== null ? liveStock : product.stock,
            isLiveStock: liveStock !== null,
          };
        })
      );

      res.status(200).json({
        success: true,
        products: productsWithLiveStock,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieves details of a single product
   */
  static async getProductById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const product = await Product.findById(id);
      if (!product) {
        throw new NotFoundError('Product not found');
      }

      // Fetch live stock from Redis
      let liveStock = await RedisService.getStock(id);
      
      // If stock is not in Redis (e.g. server restarted or not loaded), load it
      if (liveStock === null) {
        await RedisService.loadStock(id, product.stock);
        liveStock = product.stock;
      }

      const productObj = product.toObject();
      res.status(200).json({
        success: true,
        product: {
          ...productObj,
          stock: liveStock,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get products listed by the authenticated seller
   */
  static async getSellerProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sellerId = req.user?.id;
      if (!sellerId) {
        throw new ForbiddenError('Seller identity required');
      }

      const products = await Product.find({ sellerId }).sort({ createdAt: -1 });

      const productsWithLiveStock = await Promise.all(
        products.map(async (product) => {
          const liveStock = await RedisService.getStock(product._id.toString());
          const productObj = product.toObject();
          return {
            ...productObj,
            stock: liveStock !== null ? liveStock : product.stock,
          };
        })
      );

      res.status(200).json({
        success: true,
        products: productsWithLiveStock,
      });
    } catch (error) {
      next(error);
    }
  }
}
