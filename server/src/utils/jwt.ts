import jwt from 'jsonwebtoken';
import { IUserPayload } from '../types';

const jwtSecret = process.env.JWT_SECRET || 'super_secret_jwt_key_change_me_in_production';
const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';

export const generateToken = (payload: IUserPayload): string => {
  return jwt.sign(payload, jwtSecret, { expiresIn: jwtExpiresIn as jwt.SignOptions['expiresIn'] });
};

export const verifyToken = (token: string): IUserPayload => {
  try {
    const decoded = jwt.verify(token, jwtSecret) as IUserPayload;
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};
