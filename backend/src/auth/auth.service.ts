import { Injectable, UnauthorizedException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { UsersService } from '../users/users.service';
import { OtpService } from '../otp/otp.service';
import { GeolocationService } from '../geolocation/geolocation.service';
import { GuestSessionService } from './guest-session.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly otpService: OtpService,
    private readonly geolocationService: GeolocationService,
    private readonly guestSessionService: GuestSessionService,
  ) {}

  async sendOtp(dto: SendOtpDto, ip: string) {
    const normalizedPhone = this.normalizePhone(dto.phone);
    await this.otpService.sendOtp(normalizedPhone);
    return { message: 'OTP sent successfully', phone: this.maskPhone(normalizedPhone) };
  }

  async verifyOtpAndLogin(dto: VerifyOtpDto, ip: string) {
    const normalizedPhone = this.normalizePhone(dto.phone);
    const isValid = await this.otpService.verifyOtp(normalizedPhone, dto.otp);
    if (!isValid) throw new UnauthorizedException('Invalid or expired OTP');

    const locationData = await this.geolocationService.getLocationByIp(ip);

    let user = await this.usersService.findByPhone(normalizedPhone);
    const isNewUser = !user;

    if (!user) {
      user = await this.usersService.createFromPhone(normalizedPhone, {
        city: locationData?.city,
        state: locationData?.state,
        ipAddress: ip,
      });
    } else {
      await this.usersService.updateLastSeen(user.id, ip);
    }

    if (user.status === 'banned') throw new ForbiddenException('Account has been banned');
    if (user.status === 'suspended') throw new ForbiddenException('Account is temporarily suspended');

    const tokens = await this.generateTokens(user.id, user.phone);
    return { ...tokens, isNewUser, userId: user.id };
  }

  async googleLogin(googleUser: GoogleAuthDto, ip: string) {
    const locationData = await this.geolocationService.getLocationByIp(ip);
    let user = await this.usersService.findByGoogleId(googleUser.googleId);
    const isNewUser = !user;

    if (!user) {
      user = await this.usersService.findByEmail(googleUser.email);
      if (user) {
        await this.usersService.linkGoogleAccount(user.id, googleUser.googleId, googleUser.avatarUrl);
      } else {
        user = await this.usersService.createFromGoogle({
          googleId: googleUser.googleId,
          email: googleUser.email,
          displayName: googleUser.displayName,
          avatarUrl: googleUser.avatarUrl,
          city: locationData?.city,
          state: locationData?.state,
          ipAddress: ip,
        });
      }
    } else {
      await this.usersService.updateLastSeen(user.id, ip);
    }

    if (user.status === 'banned') throw new ForbiddenException('Account has been banned');

    const tokens = await this.generateTokens(user.id, user.email);
    return { ...tokens, isNewUser, userId: user.id };
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException();

    const tokenHash = await bcrypt.hash(refreshToken, 10);
    const tokens = await this.generateTokens(user.id, user.email || user.phone);
    return tokens;
  }

  async logout(userId: string) {
    await this.usersService.clearSessions(userId);
    return { message: 'Logged out successfully' };
  }

  async guestLogin(ip: string) {
    const guestId = uuidv4();
    const guestNumber = Math.floor(Math.random() * 90000) + 10000;
    const displayName = `Guest${guestNumber}`;
    const locationData = await this.geolocationService.getLocationByIp(ip);

    await this.guestSessionService.createSession(guestId, {
      guestId,
      displayName,
      city: locationData?.city,
      state: locationData?.state,
      createdAt: Date.now(),
      matchesCount: 0,
    });

    const accessToken = await this.jwtService.signAsync(
      { sub: guestId, isGuest: true, displayName },
      { secret: this.config.get('JWT_SECRET'), expiresIn: '24h' },
    );

    return {
      accessToken,
      guestId,
      displayName,
      city: locationData?.city,
      state: locationData?.state,
      isGuest: true,
      skipLimit: this.guestSessionService.getSkipLimit(),
    };
  }

  async guestLogout(guestId: string) {
    await this.guestSessionService.deleteSession(guestId);
    return { message: 'Guest session ended' };
  }

  private async generateTokens(userId: string, identifier: string) {
    const payload = { sub: userId, identifier };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.get('JWT_SECRET'),
        expiresIn: this.config.get('JWT_EXPIRES_IN', '15m'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      }),
    ]);
    return { accessToken, refreshToken };
  }

  private normalizePhone(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('91') && cleaned.length === 12) return `+${cleaned}`;
    if (cleaned.length === 10) return `+91${cleaned}`;
    return `+${cleaned}`;
  }

  private maskPhone(phone: string): string {
    return phone.replace(/(\+\d{2})(\d{5})(\d{5})/, '$1*****$3');
  }
}
