import { Controller, Get, Param,ParseUUIDPipe } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  
  @Get("users/:userId")
  async getUserWithStores(@Param("userId", ParseUUIDPipe) userId:string){
    return this.authService.getUserWithStores(userId)
  }
}
