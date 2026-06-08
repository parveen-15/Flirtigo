import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { Pool } from 'pg';
import { DB_POOL } from '../database/database.module';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UsersService {
  constructor(@Inject(DB_POOL) private readonly db: Pool) {}

  async findById(id: string) {
    const result = await this.db.query(
      `SELECT u.*, p.bio, p.interests, p.gender, p.date_of_birth,
              p.preferred_match_type, p.language_preference, p.show_city, p.show_state
       FROM users u LEFT JOIN profiles p ON u.id = p.user_id
       WHERE u.id = $1`,
      [id],
    );
    return result.rows[0] || null;
  }

  async findByPhone(phone: string) {
    const result = await this.db.query('SELECT * FROM users WHERE phone = $1', [phone]);
    return result.rows[0] || null;
  }

  async findByEmail(email: string) {
    const result = await this.db.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] || null;
  }

  async findByGoogleId(googleId: string) {
    const result = await this.db.query('SELECT * FROM users WHERE google_id = $1', [googleId]);
    return result.rows[0] || null;
  }

  async createFromPhone(phone: string, meta: { city?: string; state?: string; ipAddress?: string }) {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');
      const userId = uuidv4();
      const displayName = `User${Math.floor(Math.random() * 90000) + 10000}`;

      const user = await client.query(
        `INSERT INTO users (id, phone, display_name, city, state, ip_address, is_verified)
         VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING *`,
        [userId, phone, displayName, meta.city, meta.state, meta.ipAddress],
      );

      await client.query(
        'INSERT INTO profiles (user_id) VALUES ($1)',
        [userId],
      );

      await client.query(
        'INSERT INTO subscriptions (user_id, plan, status) VALUES ($1, $2, $3)',
        [userId, 'free', 'active'],
      );

      await client.query('COMMIT');
      return user.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async createFromGoogle(data: {
    googleId: string; email: string; displayName: string; avatarUrl?: string;
    city?: string; state?: string; ipAddress?: string;
  }) {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');
      const userId = uuidv4();

      const user = await client.query(
        `INSERT INTO users (id, google_id, email, display_name, avatar_url, city, state, ip_address, is_verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true) RETURNING *`,
        [userId, data.googleId, data.email, data.displayName, data.avatarUrl, data.city, data.state, data.ipAddress],
      );

      await client.query('INSERT INTO profiles (user_id) VALUES ($1)', [userId]);
      await client.query(
        'INSERT INTO subscriptions (user_id, plan, status) VALUES ($1, $2, $3)',
        [userId, 'free', 'active'],
      );

      await client.query('COMMIT');
      return user.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async linkGoogleAccount(userId: string, googleId: string, avatarUrl?: string) {
    await this.db.query(
      'UPDATE users SET google_id = $1, avatar_url = COALESCE($2, avatar_url) WHERE id = $3',
      [googleId, avatarUrl, userId],
    );
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      if (dto.displayName) {
        await client.query(
          'UPDATE users SET display_name = $1 WHERE id = $2',
          [dto.displayName, userId],
        );
      }

      if (dto.bio !== undefined || dto.interests !== undefined || dto.gender !== undefined) {
        await client.query(
          `INSERT INTO profiles (user_id, bio, interests, gender, preferred_match_type)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (user_id) DO UPDATE SET
             bio = COALESCE(EXCLUDED.bio, profiles.bio),
             interests = COALESCE(EXCLUDED.interests, profiles.interests),
             gender = COALESCE(EXCLUDED.gender, profiles.gender),
             preferred_match_type = COALESCE(EXCLUDED.preferred_match_type, profiles.preferred_match_type)`,
          [userId, dto.bio, dto.interests, dto.gender, dto.preferredMatchType],
        );
      }

      if (dto.ageVerified) {
        await client.query(
          'UPDATE users SET age_verified = true WHERE id = $1',
          [userId],
        );
      }

      await client.query('COMMIT');
      return this.findById(userId);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async updateLastSeen(userId: string, ip: string) {
    await this.db.query(
      'UPDATE users SET last_seen_at = NOW(), ip_address = $1 WHERE id = $2',
      [ip, userId],
    );
  }

  async clearSessions(userId: string) {
    await this.db.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
  }

  async getBlockedUsers(userId: string): Promise<string[]> {
    const result = await this.db.query(
      'SELECT blocked_id FROM blocks WHERE blocker_id = $1',
      [userId],
    );
    return result.rows.map(r => r.blocked_id);
  }

  async blockUser(blockerId: string, blockedId: string) {
    await this.db.query(
      'INSERT INTO blocks (blocker_id, blocked_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [blockerId, blockedId],
    );
  }

  async checkDailySkipLimit(userId: string, freeLimit: number): Promise<{ canSkip: boolean; remaining: number }> {
    const result = await this.db.query(
      `INSERT INTO daily_skip_limits (user_id, skip_date, skip_count)
       VALUES ($1, CURRENT_DATE, 0)
       ON CONFLICT (user_id, skip_date) DO NOTHING;
       SELECT skip_count FROM daily_skip_limits WHERE user_id = $1 AND skip_date = CURRENT_DATE`,
      [userId],
    );
    const skipCount = result[1]?.rows[0]?.skip_count || 0;
    return { canSkip: skipCount < freeLimit, remaining: Math.max(0, freeLimit - skipCount) };
  }

  async incrementSkipCount(userId: string) {
    await this.db.query(
      `INSERT INTO daily_skip_limits (user_id, skip_date, skip_count)
       VALUES ($1, CURRENT_DATE, 1)
       ON CONFLICT (user_id, skip_date) DO UPDATE SET skip_count = daily_skip_limits.skip_count + 1`,
      [userId],
    );
  }
}
