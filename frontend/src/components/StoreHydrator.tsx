'use client';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';

export default function StoreHydrator() {
  useEffect(() => {
    useAuthStore.persist.rehydrate();
  }, []);
  return null;
}
