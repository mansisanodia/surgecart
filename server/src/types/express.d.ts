import { IUserPayload } from './index';

declare global {
  namespace Express {
    interface Request {
      user?: IUserPayload;
      rawBody?: Buffer;
    }
  }
}
