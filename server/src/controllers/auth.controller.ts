import { Request, Response, NextFunction } from 'express';
import { User } from '../models/user.model';
import { generateToken } from '../utils/jwt';
import { BadRequestError, UnauthorizedError, ConflictError } from '../utils/errors';

export class AuthController {
  /**
   * Registers a new user
   */
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, email, password, role } = req.body;

      if (!name || !email || !password) {
        throw new BadRequestError('Name, email, and password are required');
      }

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        throw new ConflictError('Email is already registered');
      }

      const userRole = role && ['buyer', 'seller', 'admin'].includes(role) ? role : 'buyer';

      const user = await User.create({
        name,
        email,
        password,
        role: userRole,
      });

      const token = generateToken({
        id: user._id.toString(),
        email: user.email,
        role: user.role as any,
      });

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Log in an existing user
   */
  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        throw new BadRequestError('Email and password are required');
      }

      const user = await User.findOne({ email });
      if (!user) {
        throw new UnauthorizedError('Invalid email or password');
      }

      const isMatch = await (user as any).comparePassword(password);
      if (!isMatch) {
        throw new UnauthorizedError('Invalid email or password');
      }

      const token = generateToken({
        id: user._id.toString(),
        email: user.email,
        role: user.role as any,
      });

      res.status(200).json({
        success: true,
        message: 'Logged in successfully',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current authenticated user profile
   */
  static async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Not authenticated');
      }

      const user = await User.findById(req.user.id).select('-password');
      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      res.status(200).json({
        success: true,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
