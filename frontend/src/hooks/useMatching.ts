'use client';
import { useEffect, useCallback, useRef } from 'react';
import { useMatchStore } from '@/store/matchStore';
import { useProfileStore } from '@/store/profileStore';
import { getMatchingSocket, disconnectMatching } from '@/lib/socket';
import { MatchType } from '@/types';
import toast from 'react-hot-toast';

export function useMatching() {
  const { setStatus, setMatch, clearMatch, setQueuedMatchType, setQueuedGender } = useMatchStore();
  const socketRef = useRef(getMatchingSocket());

  const joinQueue = useCallback((matchType: MatchType, gender?: 'male' | 'female') => {
    const socket = socketRef.current;
    const { displayName, age } = useProfileStore.getState();
    setStatus('searching');
    setQueuedMatchType(matchType);
    setQueuedGender(gender ?? null);
    socket.emit('join_queue', {
      matchType,
      gender,
      displayName: displayName || undefined,
      age: age || undefined,
    });
  }, [setStatus, setQueuedMatchType, setQueuedGender]);

  const skip = useCallback(() => {
    socketRef.current.emit('skip');
    clearMatch();
    setStatus('idle');
  }, [clearMatch, setStatus]);

  // Don't call disconnectMatching() here — keeping the socket alive lets the
  // user click Start Matching again without creating a new connection.
  // The socket is cleaned up when the component unmounts (see cleanup useEffect).
  const disconnect = useCallback(() => {
    socketRef.current.emit('disconnect_match');
    clearMatch();
    setStatus('idle');
  }, [clearMatch, setStatus]);

  useEffect(() => {
    const socket = socketRef.current;

    // On reconnect (socket got a new server-side ID), re-emit join_queue so the
    // queue entry is updated with the fresh socket ID. Without this, the stale
    // entry causes match_found to be delivered to the old (disconnected) socket.
    const handleConnect = () => {
      const { status, queuedMatchType, queuedGender } = useMatchStore.getState();
      const { displayName, age } = useProfileStore.getState();
      if (status === 'searching' && queuedMatchType) {
        socket.emit('join_queue', {
          matchType: queuedMatchType,
          gender: queuedGender,
          displayName: displayName || undefined,
          age: age || undefined,
        });
      }
    };

    socket.on('connect', handleConnect);

    socket.on('queue_joined', () => {
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
      socket.off('connect', handleConnect);
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

  // Disconnect the matching socket when the user leaves the page entirely.
  useEffect(() => {
    return () => { disconnectMatching(); };
  }, []);

  return { joinQueue, skip, disconnect };
}
