import { Module } from '@nestjs/common';
import { MatchingGateway } from './matching.gateway';
import { MatchingService } from './matching.service';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [UsersModule, AuthModule],
  providers: [MatchingGateway, MatchingService],
  exports: [MatchingService],
})
export class MatchingModule {}
