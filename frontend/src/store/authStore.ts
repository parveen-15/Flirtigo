import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User } from '@/types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isGuest: boolean;
  guestId: string | null;
  guestSkipsUsed: number;
  guestMatchesCount: number;
  guestSkipLimit: number;

  setUser: (user: User) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setGuestSession: (token: string, guestData: { guestId: string; displayName: string; city?: string; state?: string; skipLimit: number }) => void;
  updateUser: (updates: Partial<User>) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  incrementGuestSkips: () => void;
  incrementGuestMatches: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      isGuest: false,
      guestId: null,
      guestSkipsUsed: 0,
      guestMatchesCount: 0,
      guestSkipLimit: 5,

      setUser: (user) => set({ user, isAuthenticated: true }),

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken, isAuthenticated: true }),

      setGuestSession: (token, guestData) =>
        set({
          accessToken: token,
          refreshToken: null,
          isAuthenticated: true,
          isGuest: true,
          guestId: guestData.guestId,
          guestSkipLimit: guestData.skipLimit,
          guestSkipsUsed: 0,
          guestMatchesCount: 0,
          user: {
            id: guestData.guestId,
            displayName: guestData.displayName,
            city: guestData.city,
            state: guestData.state,
            isPremium: false,
            isAdmin: false,
            ageVerified: true,
            anonymousMode: true,
            status: 'active',
            createdAt: new Date().toISOString(),
            isGuest: true,
          },
        }),

      updateUser: (updates) =>
        set(state => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),

      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isGuest: false,
          guestId: null,
          guestSkipsUsed: 0,
          guestMatchesCount: 0,
        }),

      setLoading: (isLoading) => set({ isLoading }),

      incrementGuestSkips: () =>
        set(state => ({ guestSkipsUsed: state.guestSkipsUsed + 1 })),

      incrementGuestMatches: () =>
        set(state => ({ guestMatchesCount: state.guestMatchesCount + 1 })),
    }),
    {
      name: 'flirtigo-auth',
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: state => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        isGuest: state.isGuest,
        guestId: state.guestId,
        guestSkipsUsed: state.guestSkipsUsed,
        guestMatchesCount: state.guestMatchesCount,
        guestSkipLimit: state.guestSkipLimit,
      }),
    },
  ),
);
