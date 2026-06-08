'use client';
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/lib/api';
import { Loader2, Heart } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { setTokens, setUser } = useAuthStore();

  useEffect(() => {
    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');
    const isNewUser = params.get('isNewUser') === 'true';

    if (!accessToken || !refreshToken) {
      router.replace('/login');
      return;
    }

    setTokens(accessToken, refreshToken);

    if (isNewUser) {
      router.replace('/setup-profile');
    } else {
      authApi.getMe()
        .then(res => {
          setUser(res.data.user);
          router.replace('/video-chat');
        })
        .catch(() => router.replace('/video-chat'));
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
        <Heart className="w-7 h-7 text-white fill-white" />
      </div>
      <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
      <span className="text-white/40 text-sm">Signing you in...</span>
    </div>
  );
}
