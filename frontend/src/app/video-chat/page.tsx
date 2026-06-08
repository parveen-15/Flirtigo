'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Video, VideoOff, Mic, MicOff, PhoneOff, SkipForward,
  MessageSquare, Flag, Shield, Settings, ChevronRight, Heart,
  Users, MapPin, Wifi, WifiOff, Maximize, Minimize, RotateCcw,
  Crown, UserRound, Zap
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useMatchStore } from '@/store/matchStore';
import { useAuthStore } from '@/store/authStore';
import { useMatching } from '@/hooks/useMatching';
import { useWebRTC } from '@/hooks/useWebRTC';
import { getSignalingSocket, getChatSocket } from '@/lib/socket';
import { formatDuration } from '@/lib/utils';
import { MatchType, Message } from '@/types';
import { reportsApi } from '@/lib/api';
import GuestConversionModal from '@/components/GuestConversionModal';

export default function VideoChatPage() {
  const { user, isGuest, guestSkipsUsed, guestMatchesCount, guestSkipLimit, incrementGuestSkips, incrementGuestMatches } = useAuthStore();
  const { status, currentMatch, messages, mediaState, partnerMediaState, isPartnerTyping, sessionDuration, setMediaState, addMessage, setPartnerTyping, setPartnerMediaState, incrementDuration, resetDuration } = useMatchStore();
  const { joinQueue, skip, disconnect } = useMatching();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [chatOpen, setChatOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedMatchType, setSelectedMatchType] = useState<MatchType>('video');
  const [showConversionModal, setShowConversionModal] = useState(false);
  const [conversionTrigger, setConversionTrigger] = useState<'skip_limit' | 'match_count' | 'manual'>('manual');

  const signalingSocket = currentMatch ? getSignalingSocket(currentMatch.roomId) : null;
  const chatSocket = currentMatch ? getChatSocket(currentMatch.roomId) : null;

  const webRTC = currentMatch && signalingSocket ? useWebRTC({
    roomId: currentMatch.roomId,
    role: currentMatch.role,
    signalingSocket,
    onRemoteStream: (stream) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
      }
    },
    onConnectionStateChange: (state) => {
      if (state === 'failed' || state === 'disconnected') {
        toast.error('Connection lost. Finding new match...');
      }
    },
  }) : null;

  // Start media and call when match is found
  useEffect(() => {
    if (!currentMatch || !webRTC) return;

    const startMedia = async () => {
      try {
        const stream = await webRTC.getUserMedia(
          selectedMatchType === 'video',
          selectedMatchType !== 'text',
        );
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        await webRTC.startCall(stream);
      } catch (err) {
        toast.error('Could not access camera/microphone');
      }
    };

    startMedia();
  }, [currentMatch?.roomId]);

  // Timer
  useEffect(() => {
    if (status !== 'connected') { resetDuration(); return; }
    const interval = setInterval(incrementDuration, 1000);
    return () => clearInterval(interval);
  }, [status]);

  // Track guest match and show conversion modal
  useEffect(() => {
    if (!isGuest || status !== 'connected' || !currentMatch) return;
    incrementGuestMatches();
  }, [currentMatch?.roomId]);

  useEffect(() => {
    if (isGuest && guestMatchesCount > 0 && guestMatchesCount % 3 === 0) {
      const timer = setTimeout(() => {
        setConversionTrigger('match_count');
        setShowConversionModal(true);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [guestMatchesCount]);

  // Chat socket events
  useEffect(() => {
    if (!chatSocket || !currentMatch) return;

    chatSocket.emit('join_chat_room', { roomId: currentMatch.roomId, matchId: currentMatch.id });

    chatSocket.on('new_message', (msg: any) => {
      addMessage({ ...msg, isOwn: msg.senderId === user?.id });
    });

    chatSocket.on('partner_typing', ({ typing }: { typing: boolean }) => {
      setPartnerTyping(typing);
    });

    chatSocket.on('partner_media_state', (state: any) => {
      setPartnerMediaState(state);
    });

    return () => {
      chatSocket.off('new_message');
      chatSocket.off('partner_typing');
      chatSocket.off('partner_media_state');
    };
  }, [currentMatch?.roomId, chatSocket]);

  // Auto scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleToggleVideo = () => {
    const newState = !mediaState.video;
    webRTC?.toggleVideo(newState);
    setMediaState({ video: newState });
    signalingSocket?.emit('media_state', { video: newState, audio: mediaState.audio, roomId: currentMatch?.roomId });
  };

  const handleToggleMic = () => {
    const newState = !mediaState.audio;
    webRTC?.toggleAudio(newState);
    setMediaState({ audio: newState });
    signalingSocket?.emit('media_state', { video: mediaState.video, audio: newState, roomId: currentMatch?.roomId });
  };

  const handleSendMessage = () => {
    if (!chatMessage.trim() || !chatSocket || !currentMatch) return;
    chatSocket.emit('send_message', { content: chatMessage, matchId: currentMatch.id });
    setChatMessage('');
  };

  const handleTyping = (typing: boolean) => {
    if (!chatSocket) return;
    chatSocket.emit(typing ? 'typing_start' : 'typing_stop');
  };

  const handleSkip = () => {
    if (isGuest && guestSkipsUsed >= guestSkipLimit) {
      setConversionTrigger('skip_limit');
      setShowConversionModal(true);
      return;
    }
    if (isGuest) {
      incrementGuestSkips();
      const remaining = guestSkipLimit - guestSkipsUsed - 1;
      if (remaining === 0) {
        toast('Last skip! Create an account for unlimited.', { icon: '⚠️' });
      } else if (remaining <= 2) {
        toast(`${remaining} skip${remaining === 1 ? '' : 's'} remaining today`, { icon: '⏭️' });
      }
    }
    webRTC?.stopMedia();
    skip();
    setTimeout(() => joinQueue(selectedMatchType), 300);
  };

  const handleReport = async (reason: string) => {
    if (!currentMatch) return;
    try {
      await reportsApi.create({ reportedId: currentMatch.partner.displayName, matchId: currentMatch.id, reason });
      toast.success('Report submitted');
      setShowReportModal(false);
      handleSkip();
    } catch {
      toast.error('Failed to submit report');
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 glass border-b border-white/5 relative z-20">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
            <Heart className="w-4 h-4 text-white fill-white" />
          </div>
          <span className="text-lg font-bold gradient-text-purple hidden sm:block">Flirtigo</span>
        </Link>

        <div className="flex items-center gap-3 text-xs text-white/40">
          {currentMatch && (
            <div className="flex items-center gap-2 glass rounded-full px-3 py-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span>{formatDuration(sessionDuration)}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            <span>~15k online</span>
          </div>

          {isGuest ? (
            <>
              {/* Guest skip counter */}
              <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 border ${
                guestSkipsUsed >= guestSkipLimit
                  ? 'bg-red-500/15 border-red-500/30 text-red-400'
                  : guestSkipsUsed >= guestSkipLimit - 2
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                    : 'bg-white/5 border-white/10 text-white/40'
              }`}>
                <Zap className="w-3 h-3" />
                <span>{guestSkipLimit - guestSkipsUsed}/{guestSkipLimit} skips</span>
              </div>
              {/* Guest badge / upgrade CTA */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={() => { setConversionTrigger('manual'); setShowConversionModal(true); }}
                className="flex items-center gap-1.5 bg-gradient-to-r from-brand-500/20 to-pink-500/20 border border-brand-500/30 rounded-full px-3 py-1.5 text-brand-300 cursor-pointer"
              >
                <UserRound className="w-3.5 h-3.5" />
                <span>Sign up free</span>
              </motion.button>
            </>
          ) : (
            !user?.isPremium && (
              <Link href="/subscription">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500/20 to-amber-600/20 border border-amber-500/30 rounded-full px-3 py-1.5 text-amber-400 cursor-pointer"
                >
                  <Crown className="w-3.5 h-3.5" />
                  <span>Upgrade</span>
                </motion.div>
              </Link>
            )
          )}
        </div>

        <div className="flex items-center gap-2">
          {isGuest ? (
            <button
              onClick={() => { setConversionTrigger('manual'); setShowConversionModal(true); }}
              className="w-9 h-9 glass rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors"
              title="Sign in to access settings"
            >
              <Settings className="w-4 h-4 text-white/30" />
            </button>
          ) : (
            <Link href="/settings">
              <button className="w-9 h-9 glass rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors">
                <Settings className="w-4 h-4 text-white/50" />
              </button>
            </Link>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Video Area */}
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
                {/* Mode Selector */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="flex items-center gap-2 glass rounded-2xl p-1.5 mb-8"
                >
                  {([
                    { value: 'video', icon: Video, label: 'Video' },
                    { value: 'voice', icon: Mic, label: 'Voice' },
                    { value: 'text', icon: MessageSquare, label: 'Text' },
                  ] as const).map(({ value, icon: Icon, label }) => (
                    <button
                      key={value}
                      onClick={() => setSelectedMatchType(value)}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                        selectedMatchType === value
                          ? 'bg-brand-600 text-white shadow-lg'
                          : 'text-white/40 hover:text-white/70'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </motion.div>

                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                  className="text-center mb-8"
                >
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-brand-600/30 to-brand-400/10 border border-brand-500/20 flex items-center justify-center mx-auto mb-6 relative">
                    <Video className="w-16 h-16 text-brand-400/50" />
                    <div className="absolute inset-0 rounded-full border-2 border-brand-500/30 animate-ping" />
                  </div>
                  <h2 className="text-3xl font-black text-white mb-3">Ready to connect?</h2>
                  <p className="text-white/40 text-sm max-w-xs">
                    Hit Start to be matched with a random Indian user for {selectedMatchType} chat
                  </p>
                </motion.div>

                <motion.button
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  whileHover={{ scale: 1.05, boxShadow: '0 0 50px rgba(168,85,247,0.5)' }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => joinQueue(selectedMatchType)}
                  className="bg-gradient-to-r from-brand-600 to-brand-500 text-white font-black text-xl px-16 py-5 rounded-3xl shadow-2xl flex items-center gap-3"
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
                  <div className="w-24 h-24 rounded-full border-4 border-brand-500/20 border-t-brand-500 animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Users className="w-10 h-10 text-brand-400" />
                  </div>
                </div>
                <h2 className="text-2xl font-black text-white mb-2">Finding your match...</h2>
                <p className="text-white/40 text-sm">Searching across India</p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { disconnect(); }}
                  className="mt-8 glass border border-red-500/30 text-red-400 px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-red-500/10 transition-all"
                >
                  Cancel
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Connected State - Video */}
          {(status === 'connected' || status === 'connecting') && currentMatch && (
            <>
              {/* Remote Video */}
              <div className="absolute inset-0 bg-black">
                {selectedMatchType !== 'text' ? (
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-brand-500 to-pink-500 flex items-center justify-center text-4xl font-black mx-auto mb-4">
                        {currentMatch.partner.displayName[0].toUpperCase()}
                      </div>
                      <div className="text-white font-semibold">{currentMatch.partner.displayName}</div>
                    </div>
                  </div>
                )}

                {/* Partner info overlay */}
                <div className="absolute top-4 left-4 glass rounded-2xl px-3 py-2 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400" />
                  <span className="text-white text-sm font-semibold">{currentMatch.partner.displayName}</span>
                  {(currentMatch.partner.city || currentMatch.partner.state) && (
                    <div className="flex items-center gap-1 text-white/40 text-xs">
                      <MapPin className="w-3 h-3" />
                      <span>{[currentMatch.partner.city, currentMatch.partner.state].filter(Boolean).join(', ')}</span>
                    </div>
                  )}
                </div>

                {/* Partner video/mic status */}
                <div className="absolute top-4 right-4 flex items-center gap-2">
                  {!partnerMediaState.video && (
                    <div className="glass rounded-full p-1.5">
                      <VideoOff className="w-4 h-4 text-red-400" />
                    </div>
                  )}
                  {!partnerMediaState.audio && (
                    <div className="glass rounded-full p-1.5">
                      <MicOff className="w-4 h-4 text-red-400" />
                    </div>
                  )}
                </div>

                {/* Local video PiP */}
                {selectedMatchType === 'video' && (
                  <motion.div
                    drag
                    dragConstraints={{ left: 0, right: 200, top: 0, bottom: 300 }}
                    className="absolute bottom-20 right-4 w-32 h-44 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl cursor-grab active:cursor-grabbing"
                  >
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover scale-x-[-1]"
                    />
                    {!mediaState.video && (
                      <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
                        <VideoOff className="w-8 h-8 text-white/30" />
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
            </>
          )}

          {/* Controls Bar */}
          {(status === 'connected' || status === 'connecting') && (
            <div className="absolute bottom-0 left-0 right-0 z-20">
              <div className="bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 pb-6">
                <div className="flex items-center justify-center gap-3">
                  {/* Skip */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleSkip}
                    className="flex flex-col items-center gap-1"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center transition-all">
                      <SkipForward className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-white/40 text-xs">Skip</span>
                  </motion.button>

                  {/* Mic */}
                  {selectedMatchType !== 'text' && (
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={handleToggleMic}
                      className="flex flex-col items-center gap-1"
                    >
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all ${
                        mediaState.audio ? 'bg-white/10 border-white/10 hover:bg-white/20' : 'bg-red-500/20 border-red-500/50'
                      }`}>
                        {mediaState.audio ? <Mic className="w-5 h-5 text-white" /> : <MicOff className="w-5 h-5 text-red-400" />}
                      </div>
                      <span className="text-white/40 text-xs">{mediaState.audio ? 'Mute' : 'Unmute'}</span>
                    </motion.button>
                  )}

                  {/* Disconnect */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => { webRTC?.stopMedia(); disconnect(); }}
                    className="flex flex-col items-center gap-1"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-red-500 hover:bg-red-600 flex items-center justify-center transition-all shadow-lg neon-pink">
                      <PhoneOff className="w-7 h-7 text-white" />
                    </div>
                    <span className="text-white/40 text-xs">End</span>
                  </motion.button>

                  {/* Video toggle */}
                  {selectedMatchType === 'video' && (
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={handleToggleVideo}
                      className="flex flex-col items-center gap-1"
                    >
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all ${
                        mediaState.video ? 'bg-white/10 border-white/10 hover:bg-white/20' : 'bg-red-500/20 border-red-500/50'
                      }`}>
                        {mediaState.video ? <Video className="w-5 h-5 text-white" /> : <VideoOff className="w-5 h-5 text-red-400" />}
                      </div>
                      <span className="text-white/40 text-xs">{mediaState.video ? 'Cam Off' : 'Cam On'}</span>
                    </motion.button>
                  )}

                  {/* Chat */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setChatOpen(!chatOpen)}
                    className="flex flex-col items-center gap-1"
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all relative ${
                      chatOpen ? 'bg-brand-500/20 border-brand-500/50' : 'bg-white/10 border-white/10 hover:bg-white/20'
                    }`}>
                      <MessageSquare className={`w-5 h-5 ${chatOpen ? 'text-brand-400' : 'text-white'}`} />
                      {messages.length > 0 && !chatOpen && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-brand-500 flex items-center justify-center">
                          <span className="text-white text-[9px] font-bold">{messages.length > 9 ? '9+' : messages.length}</span>
                        </div>
                      )}
                    </div>
                    <span className="text-white/40 text-xs">Chat</span>
                  </motion.button>

                  {/* Report */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowReportModal(true)}
                    className="flex flex-col items-center gap-1"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center transition-all">
                      <Flag className="w-5 h-5 text-orange-400" />
                    </div>
                    <span className="text-white/40 text-xs">Report</span>
                  </motion.button>
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
              className="absolute right-0 top-0 bottom-0 w-80 glass border-l border-white/10 flex flex-col z-30"
            >
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <span className="font-semibold text-white text-sm">Chat</span>
                <button onClick={() => setChatOpen(false)} className="text-white/40 hover:text-white transition-colors text-xs">
                  Close
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 && (
                  <div className="text-center text-white/20 text-sm mt-8">
                    Send a message to start chatting!
                  </div>
                )}
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm ${
                      msg.isOwn
                        ? 'bg-brand-600 text-white rounded-br-sm'
                        : 'bg-white/10 text-white/90 rounded-bl-sm'
                    }`}>
                      {msg.content}
                    </div>
                  </motion.div>
                ))}
                {isPartnerTyping && (
                  <div className="flex justify-start">
                    <div className="bg-white/10 rounded-2xl rounded-bl-sm px-4 py-2.5 flex items-center gap-1">
                      <span className="typing-dot w-1.5 h-1.5 rounded-full bg-white/50 inline-block" />
                      <span className="typing-dot w-1.5 h-1.5 rounded-full bg-white/50 inline-block" />
                      <span className="typing-dot w-1.5 h-1.5 rounded-full bg-white/50 inline-block" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 border-t border-white/10">
                <div className="flex items-center gap-2 bg-white/5 rounded-xl border border-white/10 px-3 py-2.5 focus-within:border-brand-500/50 transition-colors">
                  <input
                    ref={chatInputRef}
                    type="text"
                    placeholder="Type a message..."
                    value={chatMessage}
                    onChange={e => { setChatMessage(e.target.value); handleTyping(!!e.target.value); }}
                    onKeyDown={e => { if (e.key === 'Enter') { handleSendMessage(); handleTyping(false); } }}
                    onBlur={() => handleTyping(false)}
                    className="flex-1 bg-transparent text-white placeholder-white/20 outline-none text-sm"
                    maxLength={500}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!chatMessage.trim()}
                    className="w-8 h-8 rounded-lg bg-brand-500 disabled:opacity-30 flex items-center justify-center transition-opacity"
                  >
                    <ChevronRight className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Guest Conversion Modal */}
      <GuestConversionModal
        open={showConversionModal}
        onClose={() => setShowConversionModal(false)}
        trigger={conversionTrigger}
      />

      {/* Guest sticky bottom banner — shown after 2+ matches */}
      <AnimatePresence>
        {isGuest && guestMatchesCount >= 2 && !showConversionModal && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-4 pointer-events-none"
          >
            <div className="max-w-sm mx-auto glass border border-brand-500/25 rounded-2xl px-4 py-3 flex items-center gap-3 pointer-events-auto">
              <Heart className="w-5 h-5 text-brand-400 flex-shrink-0 fill-brand-400/30" />
              <p className="text-white/70 text-sm flex-1">Create a free account to unlock more features.</p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => { setConversionTrigger('match_count'); setShowConversionModal(true); }}
                className="text-brand-300 text-sm font-semibold whitespace-nowrap hover:text-brand-200 transition-colors"
              >
                Sign up →
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Report Modal */}
      <AnimatePresence>
        {showReportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4"
            onClick={() => setShowReportModal(false)}
          >
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="glass rounded-3xl p-6 w-full max-w-sm border border-white/10"
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
                  <button
                    key={value}
                    onClick={() => handleReport(value)}
                    className="w-full text-left px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 text-white/70 text-sm transition-all"
                  >
                    {label}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowReportModal(false)}
                className="w-full text-white/30 text-sm hover:text-white/50 transition-colors"
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
