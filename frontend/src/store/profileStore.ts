import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface ProfileState {
  displayName: string;
  age: number | null;
  gender: 'male' | 'female' | null;
  isSetup: boolean;
  setProfile: (data: { displayName: string; age: number; gender: 'male' | 'female' }) => void;
  clearProfile: () => void;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      displayName: '',
      age: null,
      gender: null,
      isSetup: false,
      setProfile: (data) => set({ ...data, isSetup: true }),
      clearProfile: () => set({ displayName: '', age: null, gender: null, isSetup: false }),
    }),
    {
      name: 'flirtigo-profile',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
