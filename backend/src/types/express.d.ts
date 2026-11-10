import { JwtPayload } from './api.types';
import { VerifiedToken } from '../services/session.service';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      session?: VerifiedToken;
      rawBody?: Buffer;
    }
  }
}

export {};
