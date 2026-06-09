import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { DB_POOL } from '../database/database.module';
import { createClient, RedisClientType } from 'redis';
import { v4 as uuidv4 } from 'uuid';

type MatchType = 'video' | 'voice' | 'text';
type Gender = 'male' | 'female' | 'any';

interface QueueEntry {
  userId: string;
  socketId: string;
  displayName: string;
  city?: string;
  state?: string;
  isPremium: boolean;
  blockedUsers: string[];
  joinedAt: number;
  gender?: 'male' | 'female';
}

// After this many ms without a preferred-gender match, fall back to same-gender
const FALLBACK_WAIT_MS = 15_000;

@Injectable()
export class MatchingService implements OnModuleInit {
  private readonly logger = new Logger(MatchingService.name);
  private redis: RedisClientType;
  private readonly QUEUE_KEY_PREFIX = 'match:queue:';
  private readonly ACTIVE_MATCH_PREFIX = 'match:active:';
  private readonly SOCKET_USER_PREFIX = 'socket:user:';

  constructor(
    @Inject(DB_POOL) private readonly db: Pool,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    this.redis = createClient({ url: this.config.get('REDIS_URL') }) as RedisClientType;
    this.redis.on('error', err => this.logger.error('Redis error:', err));
    await this.redis.connect();
    this.logger.log('Matching service Redis connected');
  }

  // Queue key: match:queue:{matchType}:{gender}
  getQueueKey(matchType: MatchType, gender: Gender): string {
    return `${this.QUEUE_KEY_PREFIX}${matchType}:${gender}`;
  }

  async joinQueue(entry: QueueEntry, matchType: MatchType) {
    await this.redis.setEx(
      `${this.SOCKET_USER_PREFIX}${entry.socketId}`,
      3600,
      JSON.stringify({ userId: entry.userId, matchType }),
    );

    await this.removeFromAllQueues(entry.userId);

    const gender: Gender = entry.gender ?? 'any';
    const queueKey = this.getQueueKey(matchType, gender);
    // Premium users get a boosted score so they appear earlier in range scans
    const score = entry.isPremium ? Date.now() - 100_000 : Date.now();

    await this.redis.zAdd(queueKey, { score, value: JSON.stringify(entry) });
    this.logger.debug(`User ${entry.userId} joined ${matchType}/${gender} queue`);

    return this.findMatch(entry, matchType);
  }

  async findMatch(entry: QueueEntry, matchType: MatchType): Promise<QueueEntry | null> {
    const waited = Date.now() - entry.joinedAt;
    const myGender: Gender = entry.gender ?? 'any';

    // Build ordered list of queues to search
    let searchOrder: Gender[];
    if (myGender === 'male') {
      // Male → prefer female, then neutral; fall back to male after wait
      searchOrder = ['female', 'any'];
      if (waited >= FALLBACK_WAIT_MS) searchOrder.push('male');
    } else if (myGender === 'female') {
      // Female → prefer male, then neutral; fall back to female after wait
      searchOrder = ['male', 'any'];
      if (waited >= FALLBACK_WAIT_MS) searchOrder.push('female');
    } else {
      // No preference → search all
      searchOrder = ['any', 'male', 'female'];
    }

    for (const targetGender of searchOrder) {
      const queueKey = this.getQueueKey(matchType, targetGender);
      const candidates = await this.redis.zRangeWithScores(queueKey, 0, 50);

      for (const candidate of candidates) {
        const candidateEntry: QueueEntry = JSON.parse(candidate.value);

        if (candidateEntry.userId === entry.userId) continue;
        if (entry.blockedUsers.includes(candidateEntry.userId)) continue;
        if (candidateEntry.blockedUsers.includes(entry.userId)) continue;

        // Atomically claim this candidate
        const removed = await this.redis.zRem(queueKey, candidate.value);
        if (removed === 0) continue; // Claimed by someone else

        // Remove current user from their own queue
        const myQueue = this.getQueueKey(matchType, myGender);
        const myEntry = await this.findInQueue(myQueue, entry.userId);
        if (myEntry) await this.redis.zRem(myQueue, myEntry);

        return candidateEntry;
      }
    }
    return null;
  }

  private async findInQueue(queueKey: string, userId: string): Promise<string | null> {
    const members = await this.redis.zRange(queueKey, 0, -1);
    for (const member of members) {
      const entry: QueueEntry = JSON.parse(member);
      if (entry.userId === userId) return member;
    }
    return null;
  }

  async removeFromAllQueues(userId: string) {
    const matchTypes: MatchType[] = ['video', 'voice', 'text'];
    const genders: Gender[] = ['male', 'female', 'any'];
    for (const type of matchTypes) {
      for (const gender of genders) {
        const key = this.getQueueKey(type, gender);
        const member = await this.findInQueue(key, userId);
        if (member) await this.redis.zRem(key, member);
      }
    }
  }

  async createMatch(user1Id: string, user2Id: string, matchType: MatchType, roomId: string) {
    const result = await this.db.query(
      `INSERT INTO matches (id, user1_id, user2_id, match_type, status, room_id, started_at)
       VALUES ($1, $2, $3, $4, 'connected', $5, NOW()) RETURNING *`,
      [uuidv4(), user1Id, user2Id, matchType, roomId],
    );

    const matchId = result.rows[0].id;
    await this.redis.setEx(
      `${this.ACTIVE_MATCH_PREFIX}${roomId}`,
      7200,
      JSON.stringify({ matchId, user1Id, user2Id, matchType, startedAt: Date.now() }),
    );

    return result.rows[0];
  }

  async endMatch(roomId: string, endedBy: string) {
    const activeMatch = await this.redis.get(`${this.ACTIVE_MATCH_PREFIX}${roomId}`);
    if (!activeMatch) return;

    const matchData = JSON.parse(activeMatch);
    const durationSeconds = Math.floor((Date.now() - matchData.startedAt) / 1000);

    await this.db.query(
      `UPDATE matches SET status = 'disconnected', ended_at = NOW(), duration_seconds = $1, skipped_by = $2
       WHERE id = $3`,
      [durationSeconds, endedBy, matchData.matchId],
    );

    await this.redis.del(`${this.ACTIVE_MATCH_PREFIX}${roomId}`);
  }

  async getUserBySocket(socketId: string) {
    const data = await this.redis.get(`${this.SOCKET_USER_PREFIX}${socketId}`);
    return data ? JSON.parse(data) : null;
  }

  async removeSocket(socketId: string) {
    await this.redis.del(`${this.SOCKET_USER_PREFIX}${socketId}`);
  }

  async getQueueStats() {
    const matchTypes: MatchType[] = ['video', 'voice', 'text'];
    const genders: Gender[] = ['male', 'female', 'any'];
    const stats: Record<string, number> = {};

    for (const type of matchTypes) {
      const counts = await Promise.all(
        genders.map(g => this.redis.zCard(this.getQueueKey(type, g))),
      );
      stats[type] = counts.reduce((a, b) => a + b, 0);
    }

    return stats;
  }
}
