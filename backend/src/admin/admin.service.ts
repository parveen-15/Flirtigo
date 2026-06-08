import { Injectable, Inject, ForbiddenException } from '@nestjs/common';
import { Pool } from 'pg';
import { DB_POOL } from '../database/database.module';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AdminService {
  constructor(@Inject(DB_POOL) private readonly db: Pool) {}

  async getDashboardStats() {
    const [users, activeMatches, pendingReports, revenue] = await Promise.all([
      this.db.query(`SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'banned') as banned,
        COUNT(*) FILTER (WHERE is_premium = true) as premium,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as new_today,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as new_this_week
        FROM users`),
      this.db.query(`SELECT COUNT(*) FROM matches WHERE status = 'connected'`),
      this.db.query(`SELECT COUNT(*) FROM reports WHERE status = 'pending'`),
      this.db.query(`SELECT
        COALESCE(SUM(amount) FILTER (WHERE created_at > NOW() - INTERVAL '30 days'), 0) as monthly,
        COALESCE(SUM(amount) FILTER (WHERE created_at > NOW() - INTERVAL '7 days'), 0) as weekly,
        COALESCE(SUM(amount), 0) as total
        FROM payments WHERE status = 'success'`),
    ]);

    return {
      users: users.rows[0],
      activeMatches: parseInt(activeMatches.rows[0].count),
      pendingReports: parseInt(pendingReports.rows[0].count),
      revenue: revenue.rows[0],
    };
  }

  async getUsers(page = 1, limit = 20, search?: string, status?: string) {
    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const params: any[] = [limit, offset];
    let paramIndex = 3;

    if (search) {
      conditions.push(`(u.display_name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex} OR u.phone ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (status) {
      conditions.push(`u.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await this.db.query(
      `SELECT u.id, u.display_name, u.email, u.phone, u.status, u.is_premium,
              u.city, u.state, u.created_at, u.last_seen_at,
              s.plan as subscription_plan, s.expires_at as subscription_expires
       FROM users u LEFT JOIN subscriptions s ON u.id = s.user_id
       ${where} ORDER BY u.created_at DESC LIMIT $1 OFFSET $2`,
      params,
    );

    const countResult = await this.db.query(`SELECT COUNT(*) FROM users u ${where}`, params.slice(2));
    return { users: result.rows, total: parseInt(countResult.rows[0].count), page, limit };
  }

  async banUser(adminId: string, userId: string, reason: string, banType: 'temporary' | 'permanent', durationDays?: number) {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      const expiresAt = banType === 'temporary' && durationDays
        ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000)
        : null;

      await client.query(
        `INSERT INTO bans (id, user_id, banned_by, ban_type, reason, expires_at, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, true)`,
        [uuidv4(), userId, adminId, banType, reason, expiresAt],
      );

      await client.query(
        'UPDATE users SET status = $1 WHERE id = $2',
        [banType === 'permanent' ? 'banned' : 'suspended', userId],
      );

      await client.query(
        `INSERT INTO admin_logs (id, admin_id, action, target_user_id, details)
         VALUES ($1, $2, 'ban_user', $3, $4)`,
        [uuidv4(), adminId, userId, JSON.stringify({ reason, banType, durationDays })],
      );

      await client.query('COMMIT');
      return { message: 'User banned successfully' };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async unbanUser(adminId: string, userId: string) {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');
      await client.query('UPDATE bans SET is_active = false WHERE user_id = $1', [userId]);
      await client.query('UPDATE users SET status = $1 WHERE id = $2', ['active', userId]);
      await client.query(
        `INSERT INTO admin_logs (id, admin_id, action, target_user_id)
         VALUES ($1, $2, 'unban_user', $3)`,
        [uuidv4(), adminId, userId],
      );
      await client.query('COMMIT');
      return { message: 'User unbanned' };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getReports(page = 1, limit = 20, status?: string) {
    const offset = (page - 1) * limit;
    const params: any[] = [limit, offset];
    const where = status ? `WHERE r.status = $3` : '';
    if (status) params.push(status);

    const result = await this.db.query(
      `SELECT r.*, reporter.display_name as reporter_name,
              reported.display_name as reported_name
       FROM reports r
       JOIN users reporter ON r.reporter_id = reporter.id
       JOIN users reported ON r.reported_id = reported.id
       ${where} ORDER BY r.created_at DESC LIMIT $1 OFFSET $2`,
      params,
    );

    const count = await this.db.query(
      `SELECT COUNT(*) FROM reports r ${where ? where.replace('$3', '$1') : ''}`,
      status ? [status] : [],
    );

    return { reports: result.rows, total: parseInt(count.rows[0].count), page, limit };
  }

  async resolveReport(adminId: string, reportId: string, action: string, notes: string) {
    await this.db.query(
      `UPDATE reports SET status = $1, admin_notes = $2, reviewed_by = $3, reviewed_at = NOW()
       WHERE id = $4`,
      [action === 'ban' ? 'resolved' : 'dismissed', notes, adminId, reportId],
    );

    await this.db.query(
      `INSERT INTO admin_logs (id, admin_id, action, target_report_id, details)
       VALUES ($1, $2, 'resolve_report', $3, $4)`,
      [uuidv4(), adminId, reportId, JSON.stringify({ action, notes })],
    );

    return { message: 'Report updated' };
  }

  async getAnalytics(period: '7d' | '30d' | '90d' = '30d') {
    const intervalMap = { '7d': '7 days', '30d': '30 days', '90d': '90 days' };
    const interval = intervalMap[period];

    const [matchesByType, dailyActive, matchesTrend, revenueByDay] = await Promise.all([
      this.db.query(`SELECT match_type, COUNT(*) FROM matches WHERE created_at > NOW() - INTERVAL '${interval}' GROUP BY match_type`),
      this.db.query(`SELECT DATE(last_seen_at) as date, COUNT(*) FROM users WHERE last_seen_at > NOW() - INTERVAL '${interval}' GROUP BY DATE(last_seen_at) ORDER BY date DESC`),
      this.db.query(`SELECT DATE(created_at) as date, COUNT(*) FROM matches WHERE created_at > NOW() - INTERVAL '${interval}' GROUP BY DATE(created_at) ORDER BY date`),
      this.db.query(`SELECT DATE(created_at) as date, SUM(amount) FROM payments WHERE status = 'success' AND created_at > NOW() - INTERVAL '${interval}' GROUP BY DATE(created_at) ORDER BY date`),
    ]);

    return { matchesByType: matchesByType.rows, dailyActive: dailyActive.rows, matchesTrend: matchesTrend.rows, revenueByDay: revenueByDay.rows };
  }
}
