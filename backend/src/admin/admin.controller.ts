import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { GetUser } from '../common/decorators/get-user.decorator';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  getDashboard() {
    return this.adminService.getDashboardStats();
  }

  @Get('users')
  getUsers(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.getUsers(+page, +limit, search, status);
  }

  @Post('users/:id/ban')
  banUser(
    @GetUser('sub') adminId: string,
    @Param('id') userId: string,
    @Body() body: { reason: string; banType: 'temporary' | 'permanent'; durationDays?: number },
  ) {
    return this.adminService.banUser(adminId, userId, body.reason, body.banType, body.durationDays);
  }

  @Post('users/:id/unban')
  unbanUser(@GetUser('sub') adminId: string, @Param('id') userId: string) {
    return this.adminService.unbanUser(adminId, userId);
  }

  @Get('reports')
  getReports(@Query('page') page = 1, @Query('limit') limit = 20, @Query('status') status?: string) {
    return this.adminService.getReports(+page, +limit, status);
  }

  @Patch('reports/:id')
  resolveReport(
    @GetUser('sub') adminId: string,
    @Param('id') reportId: string,
    @Body() body: { action: string; notes: string },
  ) {
    return this.adminService.resolveReport(adminId, reportId, body.action, body.notes);
  }

  @Get('analytics')
  getAnalytics(@Query('period') period: '7d' | '30d' | '90d' = '30d') {
    return this.adminService.getAnalytics(period);
  }
}
