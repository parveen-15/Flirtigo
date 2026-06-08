import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

export interface GuestSession {
  guestId: string;
  displayName: string;
  city?: string;
  state?: string;
  createdAt: number;
  matchesCount: number;
}

@Injectable()
export class GuestSessionService implements OnModuleInit {
  private redis: RedisClientType;
  private readonly logger = new Logger(GuestSessionService.name);
  private readonly SESSION_PREFIX = 'guest:session:';
  private readonly SKIPS_PREFIX = 'guest:skips:';
  private readonly GUEST_SKIP_LIMIT = 5;
  private readonly SESSION_TTL = 86400; // 24 hours

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    this.redis = createClient({ url: this.config.get('REDIS_URL') }) as RedisClientType;
    this.redis.on('error', (err) => this.logger.error('Guest Redis error:', err));
    await this.redis.connect();
    this.logger.log('GuestSessionService Redis connected');
  }

  async createSession(guestId: string, data: GuestSession): Promise<void> {
    await this.redis.setEx(
      `${this.SESSION_PREFIX}${guestId}`,
      this.SESSION_TTL,
      JSON.stringify(data),
    );
  }

  async getSession(guestId: string): Promise<GuestSession | null> {
    const data = await this.redis.get(`${this.SESSION_PREFIX}${guestId}`);
    return data ? JSON.parse(data) : null;
  }

  async deleteSession(guestId: string): Promise<void> {
    await this.redis.del(`${this.SESSION_PREFIX}${guestId}`);
    const today = new Date().toISOString().split('T')[0];
    await this.redis.del(`${this.SKIPS_PREFIX}${guestId}:${today}`);
  }

  async incrementSkips(guestId: string): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    const key = `${this.SKIPS_PREFIX}${guestId}:${today}`;
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, 86400);
    }
    return count;
  }

  async getSkipsToday(guestId: string): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    const data = await this.redis.get(`${this.SKIPS_PREFIX}${guestId}:${today}`);
    return data ? parseInt(data, 10) : 0;
  }

  async incrementMatches(guestId: string): Promise<void> {
    const session = await this.getSession(guestId);
    if (session) {
      session.matchesCount = (session.matchesCount || 0) + 1;
      await this.redis.setEx(
        `${this.SESSION_PREFIX}${guestId}`,
        this.SESSION_TTL,
        JSON.stringify(session),
      );
    }
  }

  getSkipLimit(): number {
    return this.GUEST_SKIP_LIMIT;
  }

  async canSkip(guestId: string): Promise<{ canSkip: boolean; remaining: number; used: number }> {
    const used = await this.getSkipsToday(guestId);
    const canSkip = used < this.GUEST_SKIP_LIMIT;
    return { canSkip, remaining: Math.max(0, this.GUEST_SKIP_LIMIT - used), used };
  }
}
