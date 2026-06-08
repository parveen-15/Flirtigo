import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  OnGatewayConnection, OnGatewayDisconnect, ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ChatService } from './chat.service';

@WebSocketGateway({
  namespace: '/chat',
  cors: { origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true },
  transports: ['websocket', 'polling'],
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly chatService: ChatService,
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
      }
    } catch {
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const roomId = client.data.roomId;
    if (roomId) {
      client.to(roomId).emit('partner_left');
    }
  }

  @SubscribeMessage('join_chat_room')
  handleJoinRoom(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string; matchId: string }) {
    client.join(data.roomId);
    client.data.roomId = data.roomId;
    client.data.matchId = data.matchId;
    client.emit('chat_joined', { roomId: data.roomId });
  }

  @SubscribeMessage('send_message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { content: string; matchId: string },
  ) {
    const userId = client.data.userId;
    const roomId = client.data.roomId;

    if (!userId || !roomId) return;

    // Basic spam/abuse check
    const isToxic = await this.chatService.checkToxicContent(data.content);
    if (isToxic) {
      client.emit('message_rejected', { reason: 'Message contains inappropriate content' });
      return;
    }

    const message = await this.chatService.saveMessage(data.matchId, userId, data.content);

    this.server.to(roomId).emit('new_message', {
      id: message.id,
      content: data.content,
      senderId: userId,
      timestamp: message.created_at,
    });
  }

  @SubscribeMessage('typing_start')
  handleTypingStart(@ConnectedSocket() client: Socket) {
    const roomId = client.data.roomId;
    if (roomId) client.to(roomId).emit('partner_typing', { typing: true });
  }

  @SubscribeMessage('typing_stop')
  handleTypingStop(@ConnectedSocket() client: Socket) {
    const roomId = client.data.roomId;
    if (roomId) client.to(roomId).emit('partner_typing', { typing: false });
  }

  @SubscribeMessage('send_emoji')
  handleEmoji(@ConnectedSocket() client: Socket, @MessageBody() data: { emoji: string }) {
    const roomId = client.data.roomId;
    if (roomId) {
      this.server.to(roomId).emit('emoji_received', { emoji: data.emoji, from: client.data.userId });
    }
  }

  private extractToken(client: Socket): string {
    const auth = client.handshake.auth?.token || client.handshake.headers?.authorization;
    if (!auth) throw new Error('No token');
    return auth.replace('Bearer ', '');
  }
}
