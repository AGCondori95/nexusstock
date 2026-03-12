import type { JwtPayload } from './index';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      user?: JwtPayload;
    }
  }
}

export {};
