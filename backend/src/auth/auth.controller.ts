import {
  Controller, Post, Body, Get, UseGuards, Req, Res,
  HttpCode, HttpStatus, Ip,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { GetUser } from '../common/decorators/get-user.decorator';
import { RealIp } from '../common/decorators/real-ip.decorator';

@ApiTags('Authentication')
@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('auth/otp/send')
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @HttpCode(HttpStatus.OK)
  sendOtp(@Body() dto: SendOtpDto, @RealIp() ip: string) {
    return this.authService.sendOtp(dto, ip);
  }

  @Post('auth/otp/verify')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  verifyOtp(@Body() dto: VerifyOtpDto, @RealIp() ip: string) {
    return this.authService.verifyOtpAndLogin(dto, ip);
  }

  @Get('auth/google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {}

  @Get('auth/google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: any, @RealIp() ip: string, @Res() res: any) {
    const result = await this.authService.googleLogin(req.user, ip);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const query = new URLSearchParams({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      isNewUser: result.isNewUser.toString(),
      userId: result.userId,
    });
    res.redirect(`${frontendUrl}/auth/callback?${query.toString()}`);
  }

  @Post('auth/refresh')
  @UseGuards(JwtRefreshGuard)
  @HttpCode(HttpStatus.OK)
  refreshTokens(@GetUser('sub') userId: string, @GetUser('refreshToken') refreshToken: string) {
    return this.authService.refreshTokens(userId, refreshToken);
  }

  @Post('auth/logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  logout(@GetUser('sub') userId: string) {
    return this.authService.logout(userId);
  }

  @Get('auth/me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  getMe(@GetUser() user: any) {
    return user;
  }

  @Post('auth/guest')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @HttpCode(HttpStatus.OK)
  guestLogin(@RealIp() ip: string) {
    return this.authService.guestLogin(ip);
  }

  @Post('auth/guest/logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  guestLogout(@GetUser('sub') guestId: string) {
    return this.authService.guestLogout(guestId);
  }
}
