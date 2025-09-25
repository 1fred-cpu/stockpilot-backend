import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('users')
  async getUserWithStores(@Body() dto: { email: string }) {
    return this.authService.getUserWithStores(dto.email);
  }

  @Post('google')
  async signupOrInWithGoogle(@Body() dto: { email: string; name: string }) {
    return this.authService.signUpOrInWithGoogle(dto);
  }

  @Post('signup')
  async signupUser(
    @Body() dto: { email: string; name: string; userId: string },
  ) {
    return this.authService.signupUser(dto);
  }
}
