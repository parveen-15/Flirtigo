'use client';
import { useEffect, useCallback, useRef } from 'react';
import { useMatchStore } from '@/store/matchStore';
import { getMatchingSocket, disconnectMatching } from '@/lib/socket';
import { MatchType } from '@/types';
import toast from 'react-hot-toast';

export function useMatching() {
  const { setStatus, setMatch, clearMatch, setQueuedMatchType } = useMatchStore();
  const socketRef = useRef(getMatchingSocket());

  const joinQueue = useCallback((matchType: MatchType) => {
    const socket = socketRef.current;
    setStatus('searching');
    setQueuedMatchType(matchType);
    socket.emit('join_queue', { matchType });
  }, [setStatus, setQueuedMatchType]);

  const skip = useCallback(() => {
    socketRef.current.emit('skip');
    clearMatch();
    setStatus('idle');
  }, [clearMatch, setStatus]);

  const disconnect = useCallback(() => {
    socketRef.current.emit('disconnect_match');
    clearMatch();
    setStatus('idle');
    disconnectMatching();
  }, [clearMatch, setStatus]);

  useEffect(() => {
    const socket = socketRef.current;

    socket.on('queue_joined', ({ matchType }: { matchType: string }) => {
      setStatus('searching');
    });

    socket.on('match_found', (data: any) => {
      setStatus('connecting');
      setMatch({
        id: data.matchId || '',
        roomId: data.roomId,
        matchType: data.matchType,
        partner: data.partner,
        role: data.role,
      });
      toast.success(`Connected with ${data.partner.displayName}!`, { icon: '🎉' });
    });

    socket.on('partner_disconnected', () => {
      toast('Your partner disconnected', { icon: '👋' });
      clearMatch();
    });

    socket.on('partner_skipped', () => {
      toast('Your partner skipped', { icon: '⏭️' });
      clearMatch();
    });

    socket.on('error', ({ message }: { message: string }) => {
      toast.error(message);
      setStatus('error');
    });

    socket.on('skipped', () => {
      setStatus('idle');
    });

    socket.on('skip_limit_warning', ({ remaining }: { remaining: number }) => {
      toast(`${remaining} skip${remaining === 1 ? '' : 's'} remaining today as guest`, { icon: '⚠️' });
    });

    socket.on('skip_limit_reached', ({ message }: { message: string }) => {
      toast.error(message, { duration: 5000 });
      setStatus('idle');
    });

    return () => {
      socket.off('queue_joined');
      socket.off('match_found');
      socket.off('partner_disconnected');
      socket.off('partner_skipped');
      socket.off('error');
      socket.off('skipped');
      socket.off('skip_limit_warning');
      socket.off('skip_limit_reached');
    };
  }, [setStatus, setMatch, clearMatch]);

  return { joinQueue, skip, disconnect };
}
