// src/middleware/role.middleware.ts
import {
  Injectable,
  NestMiddleware,
  ForbiddenException,
  Inject,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

interface RouteRoleConfig {
  path: string;
  method: string;
  roles: string[];
}

@Injectable()
export class RoleMiddleware implements NestMiddleware {
  constructor(@Inject('SUPABASE_CLIENT') private readonly supabase: any) {}

  // Central role-per-route mapping
  private readonly routeRoleMap: RouteRoleConfig[] = [
    { path: '/sales/analytics', method: 'GET', roles: ['admin', 'manager'] },
    { path: '/discounts', method: 'POST', roles: ['admin'] },
    { path: '/products', method: 'POST', roles: ['admin', 'editor'] },
    { path: '/orders', method: 'GET', roles: ['admin', 'manager', 'support'] },
    // Add as many as you need...
  ];

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      const reqData = req['user']; // from AuthMiddleware
      if (!reqData) {
        throw new ForbiddenException("User data was'nt provided");
      }

      const { data: user, error: fetchError } = await this.supabase
        .from('users')
        .select('role')
        .eq('id', reqData.id)
        .maybeSingle();

      if (fetchError) {
        throw new BadRequestException(
          `Error fetching user: ${fetchError.message}`,
        );
      }

      if (!user || !user.role) {
        throw new ForbiddenException('Role not found');
      }

      const requestPath = req.baseUrl || req.path;
      const requestMethod = req.method.toUpperCase();

      // Find matching config
      const routeConfig = this.routeRoleMap.find(
        (r) =>
          requestPath.startsWith(r.path) &&
          requestMethod === r.method.toUpperCase(),
      );

      // If route not in map, allow access by default
      if (!routeConfig) {
        return next();
      }

      // Check role
      if (!routeConfig.roles.includes(user.role)) {
        throw new ForbiddenException(
          'You do not have permission to access this resource',
        );
      }

      next();
    } catch (error) {
      if (error instanceof BadRequestException || ForbiddenException)
        throw error;
      console.error(error.message);
      throw new InternalServerErrorException(
        'An error ocuured while validating role',
      );
    }
  }
}
