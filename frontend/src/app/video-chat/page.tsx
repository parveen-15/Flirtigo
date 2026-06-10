'use client';
import { useState, useEffect, useRef, useMemo, useCallback, Component, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Video, VideoOff, Mic, MicOff, PhoneOff, SkipForward,
  MessageSquare, Flag, ChevronRight, Heart,
  Users, MapPin, RefreshCw, User, Send,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useMatchStore } from '@/store/matchStore';
import { useAuthStore } from '@/store/authStore';
import { useProfileStore } from '@/store/profileStore';
import { useMatching } from '@/hooks/useMatching';
import { useWebRTC } from '@/hooks/useWebRTC';
import { getSignalingSocket, getChatSocket } from '@/lib/socket';
import { formatDuration } from '@/lib/utils';
import { guestApi, reportsApi } from '@/lib/api';

class ErrorBoundary extends Component<{ children: ReactNode }, { crashed: boolean }> {
  state = { crashed: false };
  static getDerivedStateFromError() { return { crashed: true }; }
  render() {
    if (this.state.crashed) {
      return (
        <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center gap-4 px-4">
          <Heart className="w-10 h-10 text-pink-400 fill-pink-400/20" />
          <h2 className="text-white font-bold text-lg">Something went wrong</h2>
          <button onClick={() => window.location.reload()} className="flex items-center gap-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white px-6 py-3 rounded-2xl font-semibold">
            <RefreshCw className="w-4 h-4" /> Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Profile Setup Form ───────────────────────────────────────────────────────
function ProfileSetup({ onDone }: { onDone: () => void }) {
  const { setProfile } = useProfileStore();
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!name.trim()) { setError('Please enter your name'); return; }
    const ageNum = parseInt(age);
    if (!age || isNaN(ageNum) || ageNum < 18 || ageNum > 80) { setError('Age must be 18–80'); return; }
    if (!gender) { setError('Please select your gender'); return; }
    setProfile({ displayName: name.trim(), age: ageNum, gender });
    onDone();
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-lg">
            <Heart className="w-5 h-5 text-white fill-white" />
          </div>
          <span className="text-2xl font-black bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">Flirtigo</span>
        </div>

        <div className="glass rounded-3xl p-8 border border-white/10">
          <h1 className="text-2xl font-black text-white text-center mb-1">Create Your Profile</h1>
          <p className="text-white/40 text-sm text-center mb-7">Others will see this when you match</p>

          {/* Name */}
          <div className="mb-4">
            <label className="text-white/50 text-xs font-semibold uppercase tracking-wide mb-2 block">Your Name</label>
            <input
              value={name}
              onChange={e => { setName(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="Enter your name"
              maxLength={30}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 outline-none focus:border-pink-500/50 transition-colors text-sm"
            />
          </div>

          {/* Age */}
          <div className="mb-4">
            <label className="text-white/50 text-xs font-semibold uppercase tracking-wide mb-2 block">Age (18+)</label>
            <input
              type="number"
              value={age}
              onChange={e => { setAge(e.target.value); setError(''); }}
              placeholder="Your age"
              min={18}
              max={80}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 outline-none focus:border-pink-500/50 transition-colors text-sm"
            />
          </div>

          {/* Gender */}
          <div className="mb-6">
            <label className="text-white/50 text-xs font-semibold uppercase tracking-wide mb-2 block">Gender</label>
            <div className="grid grid-cols-2 gap-3">
              {([
                { value: 'male', emoji: '♂', label: 'Male' },
                { value: 'female', emoji: '♀', label: 'Female' },
              ] as const).map(({ value, emoji, label }) => (
                <button
                  key={value}
                  onClick={() => { setGender(value); setError(''); }}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${
                    gender === value
                      ? 'bg-gradient-to-r from-pink-600 to-purple-600 border-pink-400 text-white'
                      : 'bg-white/5 border-white/15 text-white/60 hover:border-white/30'
                  }`}
                >
                  <span>{emoji}</span> {label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-xs text-center mb-4">{error}</p>
          )}

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleSubmit}
            className="w-full bg-gradient-to-r from-pink-600 to-purple-600 text-white font-bold py-3.5 rounded-xl shadow-lg hover:shadow-pink-500/25 transition-all"
          >
            Start Chatting →
          </motion.button>
        </div>

        <p className="text-white/20 text-xs text-center mt-4">18+ only · Anonymous · For India</p>
      </motion.div>
    </div>
  );
}

// ─── Outer shell ─────────────────────────────────────────────────────────────
export default function VideoChatPage() {
  const { setGuestSession } = useAuthStore();
  const { isSetup } = useProfileStore();
  const [state, setState] = useState<'profile' | 'loading' | 'ready' | 'error'>('loading');

  const init = () => {
    const { isAuthenticated, isGuest } = useAuthStore.getState();
    const { isSetup: profileDone } = useProfileStore.getState();

    if (!profileDone) { setState('profile'); return; }
    if (isAuthenticated || isGuest) { setState('ready'); return; }

    setState('loading');
    guestApi.createSession()
      .then(res => {
        const { accessToken, guestId, displayName, city, state: st, skipLimit } = res.data;
        setGuestSession(accessToken, { guestId, displayName, city, state: st, skipLimit });
        setState('ready');
      })
      .catch(() => setState('error'));
  };

  useEffect(() => { init(); }, []);

  if (state === 'profile') {
    return <ProfileSetup onDone={() => {
      const { isAuthenticated, isGuest } = useAuthStore.getState();
      if (isAuthenticated || isGuest) { setState('ready'); return; }
      setState('loading');
      guestApi.createSession()
        .then(res => {
          const { accessToken, guestId, displayName, city, state: st, skipLimit } = res.data;
          setGuestSession(accessToken, { guestId, displayName, city, state: st, skipLimit });
          setState('ready');
        })
        .catch(() => setState('error'));
    }} />;
  }

  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
          <Heart className="w-6 h-6 text-white fill-white" />
        </div>
        <div className="w-8 h-8 border-2 border-pink-500/30 border-t-pink-500 rounded-full animate-spin" />
        <span className="text-white/40 text-sm">Connecting...</span>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center gap-4 px-4">
        <Heart className="w-10 h-10 text-pink-400 fill-pink-400/20" />
        <h2 className="text-white font-bold text-lg">Could not connect</h2>
        <p className="text-white/40 text-sm text-center">Check your connection and try again.</p>
        <button onClick={init} className="flex items-center gap-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white px-6 py-3 rounded-2xl font-semibold">
          <RefreshCw className="w-4 h-4" /> Try Again
        </button>
      </div>
    );
  }

  return <ErrorBoundary><VideoChatInner /></ErrorBoundary>;
}

// ─── Inner chat component ─────────────────────────────────────────────────────
function VideoChatInner() {
  const { status, currentMatch, messages, mediaState, partnerMediaState, isPartnerTyping, sessionDuration,
    setMediaState, addMessage, setPartnerTyping, setPartnerMediaState, incrementDuration, resetDuration } = useMatchStore();
  const { user: authUser, guestId } = useAuthStore();
  const { displayName: myName, age: myAge, gender: myGender } = useProfileStore();
  const { joinQueue, skip, disconnect } = useMatching();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);

  const myId = guestId || authUser?.id || '';

  const signalingSocket = useMemo(
    () => currentMatch ? getSignalingSocket(currentMatch.roomId) : null,
    [currentMatch?.roomId],
  );
  const chatSocket = useMemo(
    () => currentMatch ? getChatSocket(currentMatch.roomId) : null,
    [currentMatch?.roomId],
  );

  const handleRemoteStream = useCallback((stream: MediaStream) => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = stream;
      remoteVideoRef.current.play().catch(() => {});
    }
  }, []);

  const handleConnectionStateChange = useCallback((state: RTCPeerConnectionState) => {
    if (state === 'failed' || state === 'disconnected') {
      toast.error('Connection lost. Finding new match...');
    }
  }, []);

  const webRTC = useWebRTC({
    roomId: currentMatch?.roomId ?? '',
    role: currentMatch?.role ?? 'callee',
    signalingSocket: signalingSocket as any,
    onRemoteStream: handleRemoteStream,
    onConnectionStateChange: handleConnectionStateChange,
  });

  // Start camera when matched
  useEffect(() => {
    if (!currentMatch) return;
    (async () => {
      try {
        const stream = await webRTC.getUserMedia(true, true);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play().catch(() => {});
        }
        await webRTC.startCall(stream);
      } catch {
        toast.error('Could not access camera/microphone. Please allow access.');
      }
    })();
  }, [currentMatch?.roomId]);

  // Session timer
  useEffect(() => {
    if (status !== 'connected') { resetDuration(); return; }
    const interval = setInterval(incrementDuration, 1000);
    return () => clearInterval(interval);
  }, [status]);

  // Chat socket
  useEffect(() => {
    if (!chatSocket || !currentMatch) return;
    chatSocket.emit('join_chat_room', { roomId: currentMatch.roomId, matchId: currentMatch.id || '' });
    chatSocket.on('new_message', (msg: any) => {
      addMessage({ ...msg, isOwn: msg.senderId === (useAuthStore.getState().user?.id) });
    });
    chatSocket.on('partner_typing', ({ typing }: { typing: boolean }) => setPartnerTyping(typing));
    chatSocket.on('partner_media_state', (state: any) => setPartnerMediaState(state));
    return () => {
      chatSocket.off('new_message');
      chatSocket.off('partner_typing');
      chatSocket.off('partner_media_state');
    };
  }, [currentMatch?.roomId, chatSocket]);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleToggleVideo = () => {
    const next = !mediaState.video;
    webRTC?.toggleVideo(next);
    setMediaState({ video: next });
    signalingSocket?.emit('media_state', { video: next, audio: mediaState.audio, roomId: currentMatch?.roomId });
  };

  const handleToggleMic = () => {
    const next = !mediaState.audio;
    webRTC?.toggleAudio(next);
    setMediaState({ audio: next });
    signalingSocket?.emit('media_state', { video: mediaState.video, audio: next, roomId: currentMatch?.roomId });
  };

  const handleSendMessage = () => {
    if (!chatMessage.trim() || !chatSocket) return;
    chatSocket.emit('send_message', { content: chatMessage, matchId: currentMatch?.id || '' });
    setChatMessage('');
  };

  const handleSkip = () => {
    webRTC?.stopMedia();
    skip();
    setTimeout(() => joinQueue('video', myGender ?? undefined), 300);
  };

  const handleReport = async (reason: string) => {
    if (!currentMatch) return;
    try {
      await reportsApi.create({ reportedId: currentMatch.partner.userId || currentMatch.partner.displayName, matchId: currentMatch.id, reason });
      toast.success('Report submitted');
      setShowReportModal(false);
      handleSkip();
    } catch {
      toast.error('Failed to submit report');
    }
  };

  const partner = currentMatch?.partner;

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/40 backdrop-blur-xl border-b border-white/5 relative z-20">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
            <Heart className="w-4 h-4 text-white fill-white" />
          </div>
          <span className="text-lg font-black bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent hidden sm:block">Flirtigo</span>
        </Link>

        <div className="flex items-center gap-3 text-xs text-white/40">
          {currentMatch && (
            <div className="flex items-center gap-2 bg-white/5 rounded-full px-3 py-1.5 border border-white/10">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span>{formatDuration(sessionDuration)}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            <span>~15k online</span>
          </div>
        </div>

        {/* My profile pill */}
        <div className="flex items-center gap-1.5 bg-white/5 rounded-full px-3 py-1.5 border border-white/10">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-[9px] font-bold text-white">
            {myName ? myName[0].toUpperCase() : 'Y'}
          </div>
          <span className="text-white/60 text-xs font-medium hidden sm:block">{myName || 'You'}</span>
          {myAge && <span className="text-white/30 text-xs hidden sm:block">· {myAge}</span>}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex relative overflow-hidden">
        <div className={`flex-1 flex flex-col relative transition-all duration-300 ${chatOpen ? 'mr-80' : ''}`}>

          {/* Idle State */}
          <AnimatePresence>
            {status === 'idle' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center z-10 px-4"
              >
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, type: 'spring' }}
                  className="text-center mb-8"
                >
                  {/* Avatar */}
                  <div className="w-28 h-28 rounded-full bg-gradient-to-br from-pink-600/30 to-purple-600/20 border-2 border-pink-500/30 flex items-center justify-center mx-auto mb-5 relative">
                    <span className="text-4xl font-black text-white/80">
                      {myName ? myName[0].toUpperCase() : '?'}
                    </span>
                    <div className="absolute inset-0 rounded-full border-2 border-pink-500/20 animate-ping" />
                  </div>

                  {/* My info */}
                  <div className="mb-2">
                    <span className="text-white font-bold text-xl">{myName || 'You'}</span>
                    {myAge && <span className="text-white/40 text-sm ml-2">{myAge} yrs</span>}
                    {myGender && (
                      <span className={`ml-2 text-xs px-2 py-0.5 rounded-full font-medium ${myGender === 'female' ? 'bg-pink-500/20 text-pink-300' : 'bg-blue-500/20 text-blue-300'}`}>
                        {myGender === 'female' ? '♀ Female' : '♂ Male'}
                      </span>
                    )}
                  </div>

                  {myId && (
                    <p className="text-white/20 text-xs font-mono">ID: {myId.slice(0, 16)}…</p>
                  )}

                  <h2 className="text-3xl font-black text-white mt-6 mb-2">Ready to connect?</h2>
                  <p className="text-white/40 text-sm">Tap Start to meet someone new via video chat</p>
                </motion.div>

                <motion.button
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  whileHover={{ scale: 1.05, boxShadow: '0 0 50px rgba(236,72,153,0.5)' }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => joinQueue('video', myGender ?? undefined)}
                  className="bg-gradient-to-r from-pink-600 to-purple-600 text-white font-black text-xl px-16 py-5 rounded-3xl shadow-2xl flex items-center gap-3"
                >
                  <Video className="w-6 h-6" />
                  Start Matching
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Searching State */}
          <AnimatePresence>
            {status === 'searching' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center z-10"
              >
                <div className="relative mb-8">
                  <div className="w-24 h-24 rounded-full border-4 border-pink-500/20 border-t-pink-500 animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Users className="w-10 h-10 text-pink-400" />
                  </div>
                </div>
                <h2 className="text-2xl font-black text-white mb-2">Finding your match…</h2>
                <p className="text-white/40 text-sm">Connecting you with someone new</p>
                <button
                  onClick={() => disconnect()}
                  className="mt-8 bg-white/5 border border-red-500/30 text-red-400 px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-red-500/10 transition-all"
                >
                  Cancel
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Connected State */}
          {(status === 'connected' || status === 'connecting') && currentMatch && (
            <>
              {/* Remote Video */}
              <div className="absolute inset-0 bg-black">
                <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />

                {/* Partner info overlay */}
                <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-md rounded-2xl px-3 py-2 border border-white/10">
                  <div className="flex items-center gap-2 mb-0.5">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-white text-sm font-bold">{partner?.displayName}</span>
                    {partner?.age && <span className="text-white/50 text-xs">{partner.age} yrs</span>}
                    {partner?.gender && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${partner.gender === 'female' ? 'bg-pink-500/30 text-pink-300' : 'bg-blue-500/30 text-blue-300'}`}>
                        {partner.gender === 'female' ? '♀' : '♂'}
                      </span>
                    )}
                  </div>
                  {(partner?.city || partner?.state) && (
                    <div className="flex items-center gap-1 text-white/40 text-xs">
                      <MapPin className="w-3 h-3" />
                      <span>{[partner.city, partner.state].filter(Boolean).join(', ')}</span>
                    </div>
                  )}
                  {partner?.userId && (
                    <p className="text-white/25 text-[10px] font-mono mt-0.5">ID: {partner.userId.slice(0, 14)}…</p>
                  )}
                </div>

                {/* Partner media state icons */}
                <div className="absolute top-4 right-4 flex items-center gap-2">
                  {!partnerMediaState.video && (
                    <div className="bg-black/50 rounded-full p-1.5"><VideoOff className="w-4 h-4 text-red-400" /></div>
                  )}
                  {!partnerMediaState.audio && (
                    <div className="bg-black/50 rounded-full p-1.5"><MicOff className="w-4 h-4 text-red-400" /></div>
                  )}
                </div>

                {/* Local video PiP */}
                <motion.div
                  drag
                  dragConstraints={{ left: 0, right: 200, top: 0, bottom: 300 }}
                  className="absolute bottom-20 right-4 w-32 h-44 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl cursor-grab active:cursor-grabbing"
                >
                  <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
                  {!mediaState.video && (
                    <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
                      <VideoOff className="w-8 h-8 text-white/30" />
                    </div>
                  )}
                  {/* My name tag on PiP */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-1">
                    <p className="text-white text-[9px] font-semibold">{myName || 'You'}{myAge ? ` · ${myAge}` : ''}</p>
                  </div>
                </motion.div>
              </div>
            </>
          )}

          {/* Controls */}
          {(status === 'connected' || status === 'connecting') && (
            <div className="absolute bottom-0 left-0 right-0 z-20">
              <div className="bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 pb-6">
                <div className="flex items-center justify-center gap-3">
                  <button onClick={handleSkip} className="flex flex-col items-center gap-1">
                    <div className="w-12 h-12 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center transition-all">
                      <SkipForward className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-white/40 text-xs">Skip</span>
                  </button>

                  <button onClick={handleToggleMic} className="flex flex-col items-center gap-1">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all ${mediaState.audio ? 'bg-white/10 border-white/10 hover:bg-white/20' : 'bg-red-500/20 border-red-500/50'}`}>
                      {mediaState.audio ? <Mic className="w-5 h-5 text-white" /> : <MicOff className="w-5 h-5 text-red-400" />}
                    </div>
                    <span className="text-white/40 text-xs">{mediaState.audio ? 'Mute' : 'Unmute'}</span>
                  </button>

                  <button onClick={() => { webRTC?.stopMedia(); disconnect(); }} className="flex flex-col items-center gap-1">
                    <div className="w-16 h-16 rounded-2xl bg-red-500 hover:bg-red-600 flex items-center justify-center transition-all shadow-lg">
                      <PhoneOff className="w-7 h-7 text-white" />
                    </div>
                    <span className="text-white/40 text-xs">End</span>
                  </button>

                  <button onClick={handleToggleVideo} className="flex flex-col items-center gap-1">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all ${mediaState.video ? 'bg-white/10 border-white/10 hover:bg-white/20' : 'bg-red-500/20 border-red-500/50'}`}>
                      {mediaState.video ? <Video className="w-5 h-5 text-white" /> : <VideoOff className="w-5 h-5 text-red-400" />}
                    </div>
                    <span className="text-white/40 text-xs">{mediaState.video ? 'Cam Off' : 'Cam On'}</span>
                  </button>

                  <button onClick={() => setChatOpen(!chatOpen)} className="flex flex-col items-center gap-1">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all relative ${chatOpen ? 'bg-pink-500/20 border-pink-500/50' : 'bg-white/10 border-white/10 hover:bg-white/20'}`}>
                      <MessageSquare className={`w-5 h-5 ${chatOpen ? 'text-pink-400' : 'text-white'}`} />
                      {messages.length > 0 && !chatOpen && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-pink-500 flex items-center justify-center">
                          <span className="text-white text-[9px] font-bold">{messages.length > 9 ? '9+' : messages.length}</span>
                        </div>
                      )}
                    </div>
                    <span className="text-white/40 text-xs">Chat</span>
                  </button>

                  <button onClick={() => setShowReportModal(true)} className="flex flex-col items-center gap-1">
                    <div className="w-12 h-12 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center transition-all">
                      <Flag className="w-5 h-5 text-orange-400" />
                    </div>
                    <span className="text-white/40 text-xs">Report</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Chat Sidebar */}
        <AnimatePresence>
          {chatOpen && (
            <motion.div
              initial={{ x: 320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 320, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="absolute right-0 top-0 bottom-0 w-80 bg-black/80 backdrop-blur-xl border-l border-white/10 flex flex-col z-30"
            >
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-pink-400" />
                  <span className="font-bold text-white text-sm">Chat with {partner?.displayName}</span>
                </div>
                <button onClick={() => setChatOpen(false)} className="text-white/30 hover:text-white/60 transition-colors text-xs">✕</button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 && (
                  <div className="text-center text-white/20 text-sm mt-8">Say something! 👋</div>
                )}
                {messages.map(msg => (
                  <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`flex ${msg.isOwn ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm ${
                      msg.isOwn ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-br-sm' : 'bg-white/10 text-white/90 rounded-bl-sm'
                    }`}>
                      {msg.content}
                    </div>
                  </motion.div>
                ))}
                {isPartnerTyping && (
                  <div className="flex justify-start">
                    <div className="bg-white/10 rounded-2xl rounded-bl-sm px-4 py-2.5 flex items-center gap-1">
                      {[0,1,2].map(i => <span key={i} className="w-1.5 h-1.5 rounded-full bg-white/50 inline-block animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 border-t border-white/10">
                <div className="flex items-center gap-2 bg-white/5 rounded-xl border border-white/10 px-3 py-2.5 focus-within:border-pink-500/50 transition-colors">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={chatMessage}
                    onChange={e => { setChatMessage(e.target.value); chatSocket?.emit(e.target.value ? 'typing_start' : 'typing_stop'); }}
                    onKeyDown={e => { if (e.key === 'Enter') { handleSendMessage(); chatSocket?.emit('typing_stop'); } }}
                    onBlur={() => chatSocket?.emit('typing_stop')}
                    className="flex-1 bg-transparent text-white placeholder-white/20 outline-none text-sm"
                    maxLength={500}
                  />
                  <button onClick={handleSendMessage} disabled={!chatMessage.trim()} className="w-8 h-8 rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 disabled:opacity-30 flex items-center justify-center transition-opacity">
                    <Send className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Report Modal */}
      <AnimatePresence>
        {showReportModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4"
            onClick={() => setShowReportModal(false)}
          >
            <motion.div
              initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-black/90 backdrop-blur-xl rounded-3xl p-6 w-full max-w-sm border border-white/10"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                  <Flag className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="font-bold text-white">Report User</h3>
                  <p className="text-white/40 text-xs">Select a reason</p>
                </div>
              </div>
              <div className="space-y-2 mb-4">
                {[
                  { value: 'harassment', label: 'Harassment or bullying' },
                  { value: 'nudity', label: 'Nudity / sexual content' },
                  { value: 'spam', label: 'Spam or scam' },
                  { value: 'hate_speech', label: 'Hate speech' },
                  { value: 'underage', label: 'Appears to be underage' },
                  { value: 'violence', label: 'Violence or threats' },
                ].map(({ value, label }) => (
                  <button key={value} onClick={() => handleReport(value)} className="w-full text-left px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-red-500/20 text-white/70 text-sm transition-all">
                    {label}
                  </button>
                ))}
              </div>
              <button onClick={() => setShowReportModal(false)} className="w-full text-white/30 text-sm hover:text-white/50 transition-colors">Cancel</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
