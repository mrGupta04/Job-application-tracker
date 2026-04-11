import { Request } from 'express';

export interface AuthenticatedUser {
  _id: string;
  email: string;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

