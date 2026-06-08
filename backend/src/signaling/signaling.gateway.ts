import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  OnGatewayConnection, OnGatewayDisconnect, ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

/**
 * WebRTC signaling gateway — handles offer/answer/ICE exchange
 * Uses room-based routing; room IDs come from the matching gateway
 */
@WebSocketGateway({
  namespace: '/signaling',
  cors: { origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true },
  transports: ['websocket', 'polling'],
})
export class SignalingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(SignalingGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.config.get('JWT_SECRET'),
      });
      client.data.userId = payload.sub;

      const roomId = client.handshake.query.roomId as string;
      if (roomId) {
        client.join(roomId);
        client.data.roomId = roomId;
        this.logger.debug(`Signaling: ${client.id} joined room ${roomId}`);
      }
    } catch {
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const roomId = client.data.roomId;
    if (roomId) {
      client.to(roomId).emit('peer_left', { socketId: client.id });
    }
  }

  @SubscribeMessage('join_room')
  handleJoinRoom(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string }) {
    client.join(data.roomId);
    client.data.roomId = data.roomId;
    client.to(data.roomId).emit('peer_joined', { socketId: client.id });
  }

  @SubscribeMessage('offer')
  handleOffer(@ConnectedSocket() client: Socket, @MessageBody() data: { offer: RTCSessionDescriptionInit; roomId: string }) {
    client.to(data.roomId).emit('offer', { offer: data.offer, from: client.id });
  }

  @SubscribeMessage('answer')
  handleAnswer(@ConnectedSocket() client: Socket, @MessageBody() data: { answer: RTCSessionDescriptionInit; roomId: string }) {
    client.to(data.roomId).emit('answer', { answer: data.answer, from: client.id });
  }

  @SubscribeMessage('ice_candidate')
  handleIceCandidate(@ConnectedSocket() client: Socket, @MessageBody() data: { candidate: RTCIceCandidateInit; roomId: string }) {
    client.to(data.roomId).emit('ice_candidate', { candidate: data.candidate, from: client.id });
  }

  @SubscribeMessage('media_state')
  handleMediaState(@ConnectedSocket() client: Socket, @MessageBody() data: { video: boolean; audio: boolean; roomId: string }) {
    client.to(data.roomId).emit('partner_media_state', { video: data.video, audio: data.audio });
  }

  @SubscribeMessage('get_ice_config')
  handleGetIceConfig(@ConnectedSocket() client: Socket) {
    const iceServers = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ];

    const turnUrl = this.config.get('TURN_SERVER_URL');
    if (turnUrl) {
      iceServers.push({
        urls: turnUrl,
        username: this.config.get('TURN_SERVER_USERNAME'),
        credential: this.config.get('TURN_SERVER_CREDENTIAL'),
      } as any);
    }

    client.emit('ice_config', { iceServers });
  }

  private extractToken(client: Socket): string {
    const auth = client.handshake.auth?.token || client.handshake.headers?.authorization;
    if (!auth) throw new Error('No token');
    return auth.replace('Bearer ', '');
  }
}
