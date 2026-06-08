import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface LocationData {
  country_code2?: string;
  city?: string;
  state_prov?: string;
  is_eu?: boolean;
}

@Injectable()
export class GeolocationService {
  private readonly logger = new Logger(GeolocationService.name);
  private cache = new Map<string, { data: LocationData; expiry: number }>();
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24h

  constructor(private readonly config: ConfigService) {}

  async getLocationByIp(ip: string): Promise<{ country: string; city: string; state: string } | null> {
    if (this.isPrivateIp(ip)) {
      return { country: 'IN', city: 'Mumbai', state: 'Maharashtra' };
    }

    const cached = this.cache.get(ip);
    if (cached && cached.expiry > Date.now()) {
      return this.mapLocation(cached.data);
    }

    try {
      const apiKey = this.config.get('IPGEOLOCATION_API_KEY');
      const response = await axios.get<LocationData>(
        `https://api.ipgeolocation.io/ipgeo?apiKey=${apiKey}&ip=${ip}&fields=country_code2,city,state_prov`,
        { timeout: 3000 },
      );

      this.cache.set(ip, { data: response.data, expiry: Date.now() + this.CACHE_TTL });
      return this.mapLocation(response.data);
    } catch (err) {
      this.logger.warn(`Geolocation failed for IP ${ip}: ${err.message}`);
      return null;
    }
  }

  async isIndianIp(ip: string): Promise<boolean> {
    if (this.isPrivateIp(ip)) return true;

    const location = await this.getLocationByIp(ip);
    return location?.country === 'IN';
  }

  private mapLocation(data: LocationData) {
    return {
      country: data.country_code2 || 'IN',
      city: data.city || '',
      state: data.state_prov || '',
    };
  }

  private isPrivateIp(ip: string): boolean {
    return (
      ip === '127.0.0.1' ||
      ip === '::1' ||
      ip.startsWith('192.168.') ||
      ip.startsWith('10.') ||
      ip.startsWith('172.16.') ||
      ip === 'localhost'
    );
  }
}
