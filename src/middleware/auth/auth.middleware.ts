// src/middleware/auth.middleware.ts
import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private readonly configService: ConfigService) {}
  async use(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Missing or invalid authorization header',
      );
    }

    const token = authHeader.split(' ')[1];

    try {
      // Verify Supabase JWT with your SUPABASE_JWT_SECRET
      const decoded = jwt.verify(
        token,
        this.configService.get<string>('SUPABASE_JWT_SECRET'),
      );

      // Attach the user payload from the token to the request
      req['user'] = decoded;
      next();
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired Supabase token');
    }
  }
}
