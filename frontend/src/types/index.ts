export interface User {
  id: string;
  displayName: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  city?: string;
  state?: string;
  isPremium: boolean;
  isAdmin: boolean;
  ageVerified: boolean;
  anonymousMode: boolean;
  status: 'active' | 'suspended' | 'banned';
  bio?: string;
  interests?: string[];
  preferredMatchType?: MatchType;
  createdAt: string;
}

export type MatchType = 'video' | 'voice' | 'text';

export interface Match {
  id: string;
  roomId: string;
  matchType: MatchType;
  partner: PartnerInfo;
  role: 'caller' | 'callee';
  startedAt?: string;
}

export interface PartnerInfo {
  displayName: string;
  city?: string;
  state?: string;
}

export interface Message {
  id: string;
  content: string;
  senderId: string;
  timestamp: string;
  isOwn?: boolean;
}

export interface Subscription {
  plan: 'free' | 'premium_monthly' | 'premium_yearly';
  status: 'active' | 'expired' | 'cancelled';
  expiresAt?: string;
}

export interface Report {
  reportedId: string;
  matchId?: string;
  reason: ReportReason;
  description?: string;
}

export type ReportReason = 'harassment' | 'nudity' | 'spam' | 'hate_speech' | 'underage' | 'violence' | 'other';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  isNewUser?: boolean;
  userId?: string;
}

export interface ApiError {
  message: string;
  statusCode: number;
}

export interface QueueStats {
  video: number;
  voice: number;
  text: number;
}

// WebRTC types
export interface IceConfig {
  iceServers: RTCIceServer[];
}

export interface MediaState {
  video: boolean;
  audio: boolean;
}

export type ConnectionStatus =
  | 'idle'
  | 'searching'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error';

// Admin types
export interface AdminUser {
  id: string;
  displayName: string;
  email?: string;
  phone?: string;
  status: string;
  isPremium: boolean;
  city?: string;
  state?: string;
  createdAt: string;
  lastSeenAt?: string;
  subscriptionPlan?: string;
}

export interface DashboardStats {
  users: {
    total: string;
    active: string;
    banned: string;
    premium: string;
    new_today: string;
    new_this_week: string;
  };
  activeMatches: number;
  pendingReports: number;
  revenue: {
    monthly: string;
    weekly: string;
    total: string;
  };
}
