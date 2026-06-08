import { Injectable, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { DB_POOL } from '../database/database.module';
import { v4 as uuidv4 } from 'uuid';
import { CreateReportDto } from './dto/create-report.dto';

@Injectable()
export class ReportsService {
  constructor(@Inject(DB_POOL) private readonly db: Pool) {}

  async createReport(reporterId: string, dto: CreateReportDto) {
    const result = await this.db.query(
      `INSERT INTO reports (id, reporter_id, reported_id, match_id, reason, description, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending') RETURNING *`,
      [uuidv4(), reporterId, dto.reportedId, dto.matchId, dto.reason, dto.description],
    );
    return result.rows[0];
  }

  async getMyReports(userId: string) {
    const result = await this.db.query(
      `SELECT r.*, u.display_name as reported_name FROM reports r
       JOIN users u ON r.reported_id = u.id
       WHERE r.reporter_id = $1 ORDER BY r.created_at DESC`,
      [userId],
    );
    return result.rows;
  }

  async getAllReports(page = 1, limit = 20, status?: string) {
    const offset = (page - 1) * limit;
    const params: any[] = [limit, offset];
    let whereClause = '';

    if (status) {
      whereClause = 'WHERE r.status = $3';
      params.push(status);
    }

    const result = await this.db.query(
      `SELECT r.*,
              reporter.display_name as reporter_name,
              reported.display_name as reported_name
       FROM reports r
       JOIN users reporter ON r.reporter_id = reporter.id
       JOIN users reported ON r.reported_id = reported.id
       ${whereClause}
       ORDER BY r.created_at DESC LIMIT $1 OFFSET $2`,
      params,
    );

    const countResult = await this.db.query(
      `SELECT COUNT(*) FROM reports ${whereClause ? whereClause.replace('$3', '$1') : ''}`,
      status ? [status] : [],
    );

    return {
      reports: result.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      limit,
    };
  }

  async updateReportStatus(reportId: string, adminId: string, status: string, notes: string) {
    const result = await this.db.query(
      `UPDATE reports SET status = $1, admin_notes = $2, reviewed_by = $3, reviewed_at = NOW()
       WHERE id = $4 RETURNING *`,
      [status, notes, adminId, reportId],
    );
    return result.rows[0];
  }
}
