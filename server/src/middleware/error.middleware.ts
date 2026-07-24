import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';

export const errorMiddleware = (
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      stack: isDevelopment ? err.stack : undefined,
    });
    return;
  }

  // Handle Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((val: any) => val.message);
    res.status(400).json({
      success: false,
      message: messages.join(', '),
      stack: isDevelopment ? err.stack : undefined,
    });
    return;
  }

  // Handle Mongoose CastError (e.g. invalid ObjectId)
  if (err.name === 'CastError') {
    res.status(400).json({
      success: false,
      message: `Invalid ${err.path}: ${err.value}`,
      stack: isDevelopment ? err.stack : undefined,
    });
    return;
  }

  // Handle Duplicate Key Error (MongoDB)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    res.status(409).json({
      success: false,
      message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`,
      stack: isDevelopment ? err.stack : undefined,
    });
    return;
  }

  // Internal Server Error fallback
  console.error('Unhandled Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    stack: isDevelopment ? err.stack : undefined,
  });
};
export default errorMiddleware;
