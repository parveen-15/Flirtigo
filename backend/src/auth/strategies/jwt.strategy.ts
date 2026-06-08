import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { GuestSessionService } from '../guest-session.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly config: ConfigService,
    private readonly usersService: UsersService,
    private readonly guestSessionService: GuestSessionService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    if (payload.isGuest) {
      const session = await this.guestSessionService.getSession(payload.sub);
      if (!session) throw new UnauthorizedException('Guest session expired');
      return {
        ...payload,
        isGuest: true,
        user: {
          id: payload.sub,
          display_name: session.displayName,
          city: session.city,
          state: session.state,
          is_premium: false,
          is_admin: false,
          age_verified: true,
          status: 'active',
          show_city: true,
          show_state: true,
        },
      };
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user || user.status === 'banned') throw new UnauthorizedException();
    return { ...payload, user };
  }
}
