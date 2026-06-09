import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  OnGatewayConnection, OnGatewayDisconnect, ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MatchingService } from './matching.service';
import { UsersService } from '../users/users.service';
import { GuestSessionService } from '../auth/guest-session.service';
import { v4 as uuidv4 } from 'uuid';

@WebSocketGateway({
  namespace: '/matching',
  cors: { origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true },
  transports: ['websocket', 'polling'],
})
export class MatchingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(MatchingGateway.name);

  constructor(
    private readonly matchingService: MatchingService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly guestSessionService: GuestSessionService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.config.get('JWT_SECRET'),
      });
      client.data.userId = payload.sub;
      client.data.isGuest = !!payload.isGuest;
      this.logger.log(`Client connected: ${client.id} (user: ${payload.sub}, guest: ${!!payload.isGuest})`);
    } catch {
      client.emit('error', { message: 'Unauthorized' });
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    const userId = client.data.userId;
    if (!userId) return;

    // Remove from matching queue
    await this.matchingService.removeFromAllQueues(userId);

    // If in a room, notify partner
    const room = client.data.roomId;
    if (room) {
      await this.matchingService.endMatch(room, userId);
      client.to(room).emit('partner_disconnected');
      client.leave(room);
    }

    await this.matchingService.removeSocket(client.id);
  }

  @SubscribeMessage('join_queue')
  async handleJoinQueue(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { matchType: 'video' | 'voice' | 'text'; gender?: 'male' | 'female' },
  ) {
    const userId = client.data.userId;
    const isGuest = client.data.isGuest;
    if (!userId) return;

    let displayName: string;
    let city: string | undefined;
    let state: string | undefined;
    let isPremium = false;
    let blockedUsers: string[] = [];

    if (isGuest) {
      const session = await this.guestSessionService.getSession(userId);
      if (!session) {
        client.emit('error', { message: 'Guest session expired. Please refresh.' });
        return;
      }
      displayName = session.displayName;
      city = session.city;
      state = session.state;
    } else {
      const user = await this.usersService.findById(userId);
      if (!user || user.status !== 'active') {
        client.emit('error', { message: 'Account not active' });
        return;
      }
      if (!user.age_verified) {
        client.emit('error', { message: 'Age verification required' });
        return;
      }
      displayName = user.display_name;
      city = user.show_city ? user.city : undefined;
      state = user.show_state ? user.state : undefined;
      isPremium = user.is_premium;
      blockedUsers = await this.usersService.getBlockedUsers(userId);
    }

    const entry = {
      userId,
      socketId: client.id,
      displayName,
      city,
      state,
      isPremium,
      blockedUsers,
      joinedAt: Date.now(),
      gender: data.gender,
    };

    client.emit('queue_joined', { matchType: data.matchType });

    const partner = await this.matchingService.joinQueue(entry, data.matchType);

    if (partner) {
      const roomId = uuidv4();
      client.data.roomId = roomId;

      const partnerSocket = (this.server.sockets as any).sockets?.get(partner.socketId);
      if (partnerSocket) {
        partnerSocket.data.roomId = roomId;
        partnerSocket.join(roomId);
      }
      client.join(roomId);

      if (!isGuest) {
        await this.matchingService.createMatch(userId, partner.userId, data.matchType, roomId);
      }

      if (isGuest) await this.guestSessionService.incrementMatches(userId);

      const myInfo = { displayName, city: entry.city, state: entry.state };
      const partnerInfo = { displayName: partner.displayName, city: partner.city, state: partner.state };

      client.emit('match_found', { roomId, matchType: data.matchType, partner: partnerInfo, role: 'caller' });
      if (partnerSocket) {
        partnerSocket.emit('match_found', { roomId, matchType: data.matchType, partner: myInfo, role: 'callee' });
      }
    }
  }

  @SubscribeMessage('skip')
  async handleSkip(@ConnectedSocket() client: Socket) {
    const userId = client.data.userId;
    const roomId = client.data.roomId;

    if (roomId) {
      await this.matchingService.endMatch(roomId, userId);
      client.to(roomId).emit('partner_skipped');
      client.leave(roomId);
      delete client.data.roomId;
    }

    await this.matchingService.removeFromAllQueues(userId);
    client.emit('skipped');
  }

  @SubscribeMessage('disconnect_match')
  async handleDisconnectMatch(@ConnectedSocket() client: Socket) {
    const userId = client.data.userId;
    const roomId = client.data.roomId;

    if (roomId) {
      await this.matchingService.endMatch(roomId, userId);
      client.to(roomId).emit('partner_disconnected');
      client.leave(roomId);
      delete client.data.roomId;
    }
  }

  @SubscribeMessage('get_queue_stats')
  async handleQueueStats(@ConnectedSocket() client: Socket) {
    const stats = await this.matchingService.getQueueStats();
    client.emit('queue_stats', stats);
  }

  private extractToken(client: Socket): string {
    const auth = client.handshake.auth?.token || client.handshake.headers?.authorization;
    if (!auth) throw new Error('No token');
    return auth.replace('Bearer ', '');
  }
}
