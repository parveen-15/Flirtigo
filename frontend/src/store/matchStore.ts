import { create } from 'zustand';
import { Match, MatchType, Message, ConnectionStatus, MediaState, PartnerInfo } from '@/types';

interface MatchState {
  status: ConnectionStatus;
  currentMatch: Match | null;
  messages: Message[];
  mediaState: MediaState;
  partnerMediaState: MediaState;
  isPartnerTyping: boolean;
  sessionDuration: number;
  queuedMatchType: MatchType | null;
  queuedGender: 'male' | 'female' | null;

  setStatus: (status: ConnectionStatus) => void;
  setMatch: (match: Match) => void;
  clearMatch: () => void;
  addMessage: (message: Message) => void;
  setMediaState: (state: Partial<MediaState>) => void;
  setPartnerMediaState: (state: MediaState) => void;
  setPartnerTyping: (typing: boolean) => void;
  incrementDuration: () => void;
  resetDuration: () => void;
  setQueuedMatchType: (type: MatchType | null) => void;
  setQueuedGender: (gender: 'male' | 'female' | null) => void;
}

export const useMatchStore = create<MatchState>((set) => ({
  status: 'idle',
  currentMatch: null,
  messages: [],
  mediaState: { video: true, audio: true },
  partnerMediaState: { video: true, audio: true },
  isPartnerTyping: false,
  sessionDuration: 0,
  queuedMatchType: null,
  queuedGender: null,

  setStatus: (status) => set({ status }),

  setMatch: (match) => set({ currentMatch: match, messages: [], status: 'connected' }),

  clearMatch: () => set({
    currentMatch: null,
    messages: [],
    status: 'idle',
    isPartnerTyping: false,
    sessionDuration: 0,
  }),

  addMessage: (message) =>
    set(state => ({ messages: [...state.messages, message] })),

  setMediaState: (update) =>
    set(state => ({ mediaState: { ...state.mediaState, ...update } })),

  setPartnerMediaState: (partnerMediaState) => set({ partnerMediaState }),

  setPartnerTyping: (isPartnerTyping) => set({ isPartnerTyping }),

  incrementDuration: () => set(state => ({ sessionDuration: state.sessionDuration + 1 })),

  resetDuration: () => set({ sessionDuration: 0 }),

  setQueuedMatchType: (queuedMatchType) => set({ queuedMatchType }),
  setQueuedGender: (queuedGender) => set({ queuedGender }),
}));
