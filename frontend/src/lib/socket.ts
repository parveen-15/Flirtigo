import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/authStore';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

let matchingSocket: Socket | null = null;
let signalingSocket: Socket | null = null;
let chatSocket: Socket | null = null;

const getAuthOptions = () => ({
  auth: { token: useAuthStore.getState().accessToken },
  transports: ['websocket', 'polling'] as ('websocket' | 'polling')[],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

export const getMatchingSocket = (roomId?: string): Socket => {
  if (!matchingSocket || !matchingSocket.connected) {
    matchingSocket = io(`${SOCKET_URL}/matching`, getAuthOptions());
  }
  return matchingSocket;
};

export const getSignalingSocket = (roomId: string): Socket => {
  const existing = signalingSocket as any;
  if (existing && !existing.disconnected && existing._roomId === roomId) {
    return signalingSocket!;
  }
  signalingSocket?.disconnect();
  const s = io(`${SOCKET_URL}/signaling`, {
    ...getAuthOptions(),
    query: { roomId },
  });
  (s as any)._roomId = roomId;
  signalingSocket = s;
  return signalingSocket;
};

export const getChatSocket = (roomId: string): Socket => {
  const existing = chatSocket as any;
  if (existing && !existing.disconnected && existing._roomId === roomId) {
    return chatSocket!;
  }
  chatSocket?.disconnect();
  const s = io(`${SOCKET_URL}/chat`, {
    ...getAuthOptions(),
    query: { roomId },
  });
  (s as any)._roomId = roomId;
  chatSocket = s;
  return chatSocket;
};

export const disconnectAll = () => {
  matchingSocket?.disconnect();
  signalingSocket?.disconnect();
  chatSocket?.disconnect();
  matchingSocket = null;
  signalingSocket = null;
  chatSocket = null;
};

export const disconnectMatching = () => {
  matchingSocket?.disconnect();
  matchingSocket = null;
};

export const disconnectSignaling = () => {
  signalingSocket?.disconnect();
  signalingSocket = null;
};

export const disconnectChat = () => {
  chatSocket?.disconnect();
  chatSocket = null;
};
