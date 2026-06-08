import { Controller, Get, Post, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { CreateReportDto } from './dto/create-report.dto';
import { UsersService } from '../users/users.service';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly usersService: UsersService,
  ) {}

  @Post()
  async createReport(@GetUser('sub') userId: string, @Body() dto: CreateReportDto) {
    return this.reportsService.createReport(userId, dto);
  }

  @Post('block')
  async blockUser(@GetUser('sub') userId: string, @Body() body: { blockedId: string }) {
    await this.usersService.blockUser(userId, body.blockedId);
    return { message: 'User blocked successfully' };
  }

  @Get('my-reports')
  getMyReports(@GetUser('sub') userId: string) {
    return this.reportsService.getMyReports(userId);
  }
}
