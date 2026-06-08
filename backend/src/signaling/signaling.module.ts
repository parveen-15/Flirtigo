import { Module } from '@nestjs/common';
import { SignalingGateway } from './signaling.gateway';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [SignalingGateway],
})
export class SignalingModule {}
