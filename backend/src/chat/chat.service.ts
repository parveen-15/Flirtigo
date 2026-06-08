import { Injectable, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { DB_POOL } from '../database/database.module';
import { v4 as uuidv4 } from 'uuid';

const TOXIC_PATTERNS = [
  /\b(fuck|shit|bitch|whore|slut|rape|kill yourself|kys)\b/i,
  // Add more patterns — in production, integrate with Perspective API or similar
];

@Injectable()
export class ChatService {
  constructor(@Inject(DB_POOL) private readonly db: Pool) {}

  async saveMessage(matchId: string, senderId: string, content: string) {
    const result = await this.db.query(
      `INSERT INTO messages (id, match_id, sender_id, content, message_type)
       VALUES ($1, $2, $3, $4, 'text') RETURNING *`,
      [uuidv4(), matchId, senderId, content],
    );
    return result.rows[0];
  }

  async deleteMatchMessages(matchId: string) {
    await this.db.query('DELETE FROM messages WHERE match_id = $1', [matchId]);
  }

  async checkToxicContent(content: string): Promise<boolean> {
    for (const pattern of TOXIC_PATTERNS) {
      if (pattern.test(content)) return true;
    }
    return false;
  }

  async getMatchMessages(matchId: string) {
    const result = await this.db.query(
      `SELECT m.*, u.display_name FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.match_id = $1 AND m.is_deleted = false
       ORDER BY m.created_at ASC`,
      [matchId],
    );
    return result.rows;
  }
}
