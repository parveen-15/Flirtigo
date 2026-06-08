'use client';
// Voice chat uses the same matching system as video — just with audio-only WebRTC
// Reuses VideoChatPage with selectedMatchType pre-set to 'voice'
import { useEffect } from 'react';
import { useMatchStore } from '@/store/matchStore';
import VideoChatWrapper from '../video-chat/page';

export default function VoiceChatPage() {
  return <VideoChatWrapper />;
}
