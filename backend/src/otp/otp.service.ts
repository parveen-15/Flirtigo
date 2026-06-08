import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import twilio from 'twilio';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class OtpService {
  private twilioClient: twilio.Twilio;
  private redis: RedisClientType;
  private readonly OTP_PREFIX = 'otp:';
  private readonly OTP_TTL = 300; // 5 minutes
  private readonly MAX_ATTEMPTS = 3;

  constructor(private readonly config: ConfigService) {
    const sid = config.get('TWILIO_ACCOUNT_SID');
    const token = config.get('TWILIO_AUTH_TOKEN');
    if (sid && token && sid !== 'your_twilio_account_sid') {
      this.twilioClient = twilio(sid, token);
    }
    this.initRedis();
  }

  private async initRedis() {
    this.redis = createClient({ url: this.config.get('REDIS_URL') }) as RedisClientType;
    await this.redis.connect();
  }

  async sendOtp(phone: string): Promise<void> {
    const attemptsKey = `${this.OTP_PREFIX}attempts:${phone}`;
    const attempts = await this.redis.get(attemptsKey);

    if (attempts && parseInt(attempts) >= this.MAX_ATTEMPTS) {
      throw new BadRequestException('Too many OTP requests. Please try again after 15 minutes.');
    }

    const otp = this.generateOtp();

    if (this.config.get('NODE_ENV') !== 'production') {
      // Dev mode: just log OTP
      console.log(`[DEV] OTP for ${phone}: ${otp}`);
    } else {
      await this.twilioClient.messages.create({
        body: `Your Flirtigo verification code is: ${otp}. Valid for 5 minutes. Do not share this code.`,
        from: this.config.get('TWILIO_PHONE_NUMBER'),
        to: phone,
      });
    }

    await this.redis.setEx(`${this.OTP_PREFIX}${phone}`, this.OTP_TTL, otp);
    await this.redis.setEx(
      attemptsKey,
      15 * 60,
      ((parseInt(attempts || '0') || 0) + 1).toString(),
    );
  }

  async verifyOtp(phone: string, otp: string): Promise<boolean> {
    const storedOtp = await this.redis.get(`${this.OTP_PREFIX}${phone}`);
    if (!storedOtp || storedOtp !== otp) return false;

    await this.redis.del(`${this.OTP_PREFIX}${phone}`);
    await this.redis.del(`${this.OTP_PREFIX}attempts:${phone}`);
    return true;
  }

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}
