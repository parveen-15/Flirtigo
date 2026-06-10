'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function VoiceChatPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/video-chat'); }, [router]);
  return null;
}
