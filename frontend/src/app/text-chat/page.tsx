'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TextChatPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/video-chat'); }, [router]);
  return null;
}
