import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class JwtHelper {
  constructor(private readonly config: ConfigService) {}

  /**
   * Generate a signed JWT token
   * @param payload - The data you want to encode inside the token
   * @param expiresIn - Optional expiry time (default: 1h)
   * @returns a token
   */
  async generateToken(
    payload: any,
    expiresIn: string  = '1h',
  ): Promise<string> {
    const secret = this.config.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }

    return jwt.sign(payload, secret, { expiresIn });
  }

  /**
   * Verify and decode a JWT token
   * @param token - The token to verify
   * @returns The decoded payload if valid
   */
  async verifyToken<T = any>(token: string): Promise<T> {
    const secret = this.config.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }

    try {
      return jwt.verify(token, secret) as T;
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
