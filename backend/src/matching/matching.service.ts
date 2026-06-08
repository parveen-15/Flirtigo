import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { DB_POOL } from '../database/database.module';
import { createClient, RedisClientType } from 'redis';
import { v4 as uuidv4 } from 'uuid';

type MatchType = 'video' | 'voice' | 'text';

interface QueueEntry {
  userId: string;
  socketId: string;
  displayName: string;
  city?: string;
  state?: string;
  isPremium: boolean;
  blockedUsers: string[];
  joinedAt: number;
}

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);
  private redis: RedisClientType;
  private readonly QUEUE_KEY_PREFIX = 'match:queue:';
  private readonly ACTIVE_MATCH_PREFIX = 'match:active:';
  private readonly SOCKET_USER_PREFIX = 'socket:user:';

  constructor(
    @Inject(DB_POOL) private readonly db: Pool,
    private readonly config: ConfigService,
  ) {
    this.initRedis();
  }

  private async initRedis() {
    this.redis = createClient({ url: this.config.get('REDIS_URL') }) as RedisClientType;
    this.redis.on('error', err => this.logger.error('Redis error:', err));
    await this.redis.connect();
    this.logger.log('Matching service Redis connected');
  }

  getQueueKey(matchType: MatchType, isPremium: boolean): string {
    return `${this.QUEUE_KEY_PREFIX}${matchType}:${isPremium ? 'premium' : 'free'}`;
  }

  async joinQueue(entry: QueueEntry, matchType: MatchType) {
    // Register socket -> user mapping
    await this.redis.setEx(
      `${this.SOCKET_USER_PREFIX}${entry.socketId}`,
      3600,
      JSON.stringify({ userId: entry.userId, matchType }),
    );

    // Check if user already in queue
    await this.removeFromAllQueues(entry.userId);

    // Premium users get priority queue
    const queueKey = this.getQueueKey(matchType, entry.isPremium);
    const score = entry.isPremium ? Date.now() - 100000 : Date.now(); // Premium matches faster

    await this.redis.zAdd(queueKey, {
      score,
      value: JSON.stringify(entry),
    });

    this.logger.debug(`User ${entry.userId} joined ${matchType} queue`);
    return this.findMatch(entry, matchType);
  }

  async findMatch(entry: QueueEntry, matchType: MatchType): Promise<QueueEntry | null> {
    // Try premium queue first if user is premium, then free queue
    const queuesToSearch = entry.isPremium
      ? [this.getQueueKey(matchType, true), this.getQueueKey(matchType, false)]
      : [this.getQueueKey(matchType, false), this.getQueueKey(matchType, true)];

    for (const queueKey of queuesToSearch) {
      const candidates = await this.redis.zRangeWithScores(queueKey, 0, 50);

      for (const candidate of candidates) {
        const candidateEntry: QueueEntry = JSON.parse(candidate.value);

        if (candidateEntry.userId === entry.userId) continue;
        if (entry.blockedUsers.includes(candidateEntry.userId)) continue;
        if (candidateEntry.blockedUsers.includes(entry.userId)) continue;

        // Try to atomically claim this candidate
        const removed = await this.redis.zRem(queueKey, candidate.value);
        if (removed === 0) continue; // Another process claimed it

        // Remove current user from queue too
        const myQueueKey = this.getQueueKey(matchType, entry.isPremium);
        const myEntry = await this.findInQueue(myQueueKey, entry.userId);
        if (myEntry) await this.redis.zRem(myQueueKey, myEntry);

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
    for (const type of matchTypes) {
      for (const isPremium of [true, false]) {
        const key = this.getQueueKey(type, isPremium);
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
    const stats: Record<string, number> = {};

    for (const type of matchTypes) {
      const freeCount = await this.redis.zCard(this.getQueueKey(type, false));
      const premiumCount = await this.redis.zCard(this.getQueueKey(type, true));
      stats[type] = freeCount + premiumCount;
    }

    return stats;
  }
}
