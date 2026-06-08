'use client';

import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { useRef, useState, useEffect, useMemo, memo } from 'react';
import Link from 'next/link';
import {
  Video, Mic, MessageSquare, Shield, Lock, MapPin,
  Heart, ChevronRight, Sparkles, Star, Check, Crown,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────────────────────────────────────

const CONVERSATION: Array<{ from: 'a' | 'b'; text: string }> = [
  { from: 'a', text: 'Namaste! 🙏' },
  { from: 'b', text: 'Hey! 😊 Kaise ho?' },
  { from: 'a', text: 'Bilkul mast! Aap?' },
  { from: 'b', text: 'Great! Kya haal hai? 🔥' },
  { from: 'a', text: 'Mumbai se ho kya?' },
  { from: 'b', text: 'Haan! Aap Delhi se? 😄' },
];

const CITY_BUBBLES = [
  { city: 'Mumbai',    flag: '🏙️', grad: 'from-orange-500/25 to-red-500/15',    border: 'border-orange-400/25', x: -32,  y: 48  },
  { city: 'Delhi',     flag: '🕌', grad: 'from-blue-500/25 to-indigo-400/15',   border: 'border-blue-400/25',   x: 220,  y: 28  },
  { city: 'Bengaluru', flag: '💻', grad: 'from-green-500/25 to-teal-400/15',    border: 'border-green-400/25',  x: -28,  y: 360 },
  { city: 'Chennai',   flag: '🌊', grad: 'from-cyan-500/25 to-sky-400/15',      border: 'border-cyan-400/25',   x: 228,  y: 380 },
  { city: 'Hyderabad', flag: '💎', grad: 'from-violet-500/25 to-purple-400/15', border: 'border-violet-400/25', x: 80,   y: -16 },
  { city: 'Jaipur',    flag: '🏰', grad: 'from-pink-500/25 to-rose-400/15',     border: 'border-pink-400/25',   x: 130,  y: 432 },
];

const LEFT_USER  = { name: 'Priya', city: 'Mumbai', state: 'MH', initials: 'P', grad: 'from-rose-500 via-fuchsia-500 to-purple-600' };
const RIGHT_USER = { name: 'Arjun', city: 'Bengaluru', state: 'KA', initials: 'A', grad: 'from-violet-600 via-blue-500 to-cyan-500' };

const HEADLINE = ['Meet', 'Real', 'Indians', 'Instantly'];

const FEATURES = [
  { icon: Video,          title: 'HD Video Chat',          desc: 'Crystal-clear peer-to-peer video powered by WebRTC with adaptive quality that adjusts to your connection.',   grad: 'from-purple-600 to-pink-600'  },
  { icon: Mic,            title: 'Voice-Only Mode',        desc: 'Prefer audio? Switch to voice-only. Connect through conversation without turning on your camera.',             grad: 'from-blue-600 to-cyan-600'    },
  { icon: MessageSquare,  title: 'Instant Text Chat',      desc: 'Real-time messaging with emoji support and typing indicators. Chat history auto-deletes when the session ends.', grad: 'from-green-600 to-emerald-600'},
  { icon: MapPin,         title: 'India-Wide Discovery',   desc: 'See city and state of your matches. Connect from Mumbai, Delhi, Bengaluru and everywhere across India.',       grad: 'from-orange-600 to-red-600'   },
  { icon: Lock,           title: 'Truly Anonymous',        desc: 'Your phone number, email, and precise location are never revealed. You control exactly what others see.',      grad: 'from-indigo-600 to-purple-600'},
  { icon: Shield,         title: 'Safe & Moderated',       desc: 'Advanced moderation, instant report and block. Our team reviews every report within 24 hours.',               grad: 'from-teal-600 to-green-600'   },
];

const STEPS = [
  { title: 'Create Account',  desc: 'Sign up with Google or your phone number in under 60 seconds. Confirm you are 18+.' },
  { title: 'Choose Mode',     desc: 'Select video, voice, or text chat. Hit Start and we instantly find you a match.' },
  { title: 'Start Chatting',  desc: 'Meet someone new from across India. Skip anytime if you want a fresh match.' },
];

// ─────────────────────────────────────────────────────────────────────────────
// PARTICLE FIELD
// ─────────────────────────────────────────────────────────────────────────────

const ParticleField = memo(function ParticleField() {
  const particles = useMemo(() =>
    Array.from({ length: 70 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2.4 + 0.6,
      dur: Math.random() * 14 + 8,
      delay: Math.random() * 7,
      opacity: Math.random() * 0.45 + 0.07,
      color: i % 5 === 0 ? '#ec4899' : i % 4 === 0 ? '#a78bfa' : i % 3 === 0 ? '#818cf8' : '#ffffff',
    })),
  []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, background: p.color, opacity: p.opacity }}
          animate={{ y: [0, -22, 0], opacity: [p.opacity, p.opacity * 0.25, p.opacity] }}
          transition={{ duration: p.dur, repeat: Infinity, delay: p.delay, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// TYPING DOTS
// ─────────────────────────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div className="flex items-center gap-[5px] px-3.5 py-2.5 bg-white/10 rounded-2xl rounded-bl-sm w-fit">
      {[0, 1, 2].map(i => (
        <motion.span
          key={i}
          className="block w-[5px] h-[5px] rounded-full bg-white/70"
          animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.75, repeat: Infinity, delay: i * 0.16 }}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CONVERSATION HOOK
// ─────────────────────────────────────────────────────────────────────────────

function useConversation() {
  const [msgs, setMsgs] = useState<typeof CONVERSATION>([]);
  const [typing, setTyping] = useState<'a' | 'b' | null>(null);

  useEffect(() => {
    let dead = false;
    const ts: ReturnType<typeof setTimeout>[] = [];
    const s = (fn: () => void, ms: number) => { const t = setTimeout(() => { if (!dead) fn(); }, ms); ts.push(t); };

    const run = () => {
      setMsgs([]);
      setTyping(null);
      let t = 600;
      CONVERSATION.forEach((msg, i) => {
        s(() => setTyping(msg.from), t);
        t += 1500;
        s(() => { setTyping(null); setMsgs(p => [...p, msg]); }, t);
        t += i < CONVERSATION.length - 1 ? 1100 : 0;
      });
      s(() => { setMsgs([]); setTyping(null); s(run, 900); }, t + 2200);
    };

    run();
    return () => { dead = true; ts.forEach(clearTimeout); };
  }, []);

  return { msgs, typing };
}

// ─────────────────────────────────────────────────────────────────────────────
// CHAT BUBBLE CARD
// ─────────────────────────────────────────────────────────────────────────────

interface CardProps {
  user: typeof LEFT_USER;
  side: 'a' | 'b';
  msgs: typeof CONVERSATION;
  typing: 'a' | 'b' | null;
  rotate: number;
  delay: number;
}

const ChatBubbleCard = memo(function ChatBubbleCard({ user, side, msgs, typing, rotate, delay }: CardProps) {
  const isSent = (f: 'a' | 'b') => f === side;
  const partnerTyping = typing !== null && typing !== side;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, rotate: rotate * 1.5, scale: 0.88 }}
      animate={{ opacity: 1, y: 0, rotate, scale: 1 }}
      transition={{ type: 'spring', stiffness: 70, damping: 18, delay }}
      className="relative select-none"
      style={{ width: 272 }}
    >
      {/* Ambient glow behind card */}
      <div
        className={`absolute -inset-3 rounded-[32px] bg-gradient-to-br ${user.grad} opacity-25 blur-2xl`}
        aria-hidden
      />

      {/* Card shell */}
      <div className="relative rounded-[28px] overflow-hidden border border-white/[0.12] shadow-[0_32px_64px_rgba(0,0,0,0.5)] bg-[rgba(18,12,40,0.75)] backdrop-blur-2xl">

        {/* ── Video preview header ── */}
        <div className={`relative h-[130px] bg-gradient-to-br ${user.grad} overflow-hidden`}>
          {/* Scan-line texture */}
          <div
            className="absolute inset-0 mix-blend-overlay opacity-30"
            style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)' }}
          />
          {/* Soft light blob */}
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-black/20 blur-xl" />

          {/* Avatar */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            animate={{ scale: [1, 1.03, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className="w-[60px] h-[60px] rounded-full bg-white/20 backdrop-blur-md border-[2px] border-white/40 flex items-center justify-center text-[22px] font-black text-white shadow-xl">
              {user.initials}
            </div>
          </motion.div>

          {/* Live pill */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-[5px] rounded-full bg-black/35 backdrop-blur-sm">
            <span className="w-[6px] h-[6px] rounded-full bg-green-400 animate-pulse block" />
            <span className="text-white text-[10px] font-bold tracking-wide">LIVE</span>
          </div>

          {/* Video icon */}
          <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/35 backdrop-blur-sm flex items-center justify-center">
            <Video className="w-3.5 h-3.5 text-white" />
          </div>
        </div>

        {/* ── User info row ── */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.07]">
          <div>
            <p className="text-white font-bold text-[13px] leading-tight">{user.name}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin className="w-[10px] h-[10px] text-white/35" />
              <span className="text-white/35 text-[11px]">{user.city}, {user.state}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-green-500/15 border border-green-500/25 rounded-full px-2 py-[3px]">
            <span className="w-[5px] h-[5px] rounded-full bg-green-400 block" />
            <span className="text-green-400 text-[10px] font-semibold">Online</span>
          </div>
        </div>

        {/* ── Message thread ── */}
        <div className="px-3.5 py-3 min-h-[118px] flex flex-col justify-end gap-1.5 overflow-hidden">
          <AnimatePresence initial={false}>
            {msgs.map((m, idx) => (
              <motion.div
                key={`${m.from}-${idx}`}
                initial={{ opacity: 0, scale: 0.82, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                className={`flex ${isSent(m.from) ? 'justify-end' : 'justify-start'}`}
              >
                <span
                  className={`inline-block px-3 py-[6px] rounded-2xl text-[12px] font-medium leading-snug max-w-[78%] ${
                    isSent(m.from)
                      ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white rounded-br-[4px]'
                      : 'bg-white/[0.12] text-white/90 rounded-bl-[4px]'
                  }`}
                >
                  {m.text}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Typing indicator */}
          <AnimatePresence>
            {partnerTyping && (
              <motion.div
                key="typing"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                className="flex justify-start"
              >
                <TypingDots />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// FLOATING CITY TAG
// ─────────────────────────────────────────────────────────────────────────────

function CityTag({ city, flag, grad, border, x, y, delay }: (typeof CITY_BUBBLES)[0] & { delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: delay + 1.2, type: 'spring', stiffness: 200 }}
      className="absolute pointer-events-none z-20"
      style={{ left: x, top: y }}
    >
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3.5 + delay, repeat: Infinity, ease: 'easeInOut', delay }}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r ${grad} border ${border} backdrop-blur-md shadow-lg`}
      >
        <span className="text-[13px]">{flag}</span>
        <span className="text-white/80 text-[11px] font-semibold tracking-wide whitespace-nowrap">{city}</span>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ANIMATED HEADLINE
// ─────────────────────────────────────────────────────────────────────────────

function Headline() {
  return (
    <div className="overflow-visible pb-2">
      {HEADLINE.map((word, i) => (
        <motion.span
          key={word}
          className={`block font-black leading-[0.9] tracking-tight ${
            word === 'Indians'
              ? 'gradient-text'
              : word === 'Instantly'
                ? 'text-white/60'
                : 'text-white'
          } ${word === 'Instantly' ? 'text-5xl sm:text-6xl md:text-7xl mt-2' : 'text-6xl sm:text-7xl md:text-[88px]'}`}
          initial={{ opacity: 0, y: 60, skewY: 4 }}
          animate={{ opacity: 1, y: 0, skewY: 0 }}
          transition={{ duration: 0.75, delay: 0.35 + i * 0.11, ease: [0.16, 1, 0.3, 1] }}
        >
          {word}
        </motion.span>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FADE + STAGGER HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 36 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.25, 0.46, 0.45, 0.94] } },
};
const stagger = { visible: { transition: { staggerChildren: 0.1 } } };

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const contentY = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.55], [1, 0]);

  const { msgs, typing } = useConversation();

  return (
    <div className="min-h-screen overflow-x-hidden">

      {/* ─── Navbar ─────────────────────────────────────────────────── */}
      <motion.nav
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
        className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] bg-[rgba(8,6,20,0.7)] backdrop-blur-xl"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg group-hover:shadow-brand-500/40 transition-shadow">
              <Heart className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="text-[19px] font-black gradient-text-purple">Flirtigo</span>
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-[13px] text-white/50">
            {['Features', 'How it works', 'Premium', 'Safety'].map(l => (
              <a key={l} href={`#${l.toLowerCase().replace(/ /g, '-')}`} className="hover:text-white transition-colors duration-200">
                {l}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/login">
              <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                className="text-[13px] text-white/60 hover:text-white transition-colors px-4 py-2">
                Sign In
              </motion.button>
            </Link>
            <Link href="/signup">
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: '0 0 28px rgba(168,85,247,0.5)' }}
                whileTap={{ scale: 0.95 }}
                className="bg-gradient-to-r from-brand-600 to-brand-500 text-white text-[13px] font-bold px-5 py-2 rounded-full"
              >
                Get Started
              </motion.button>
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* ─── HERO ───────────────────────────────────────────────────── */}
      <section ref={heroRef} className="relative min-h-screen overflow-hidden">

        {/* Background layers */}
        <div className="absolute inset-0 bg-[#080614]" />
        {/* Primary purple radial */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 90% 65% at 50% -5%, rgba(109,40,217,0.42) 0%, transparent 65%)' }} />
        {/* Pink accent right */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 55% 55% at 88% 55%, rgba(236,72,153,0.22) 0%, transparent 60%)' }} />
        {/* Violet accent left-bottom */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 50% 45% at 12% 80%, rgba(139,92,246,0.18) 0%, transparent 60%)' }} />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.028]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)', backgroundSize: '64px 64px' }}
        />

        <ParticleField />

        {/* Content */}
        <motion.div
          style={{ y: contentY, opacity: contentOpacity }}
          className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-24 pb-12 min-h-screen flex items-center"
        >
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-12 xl:gap-16 items-center w-full">

            {/* ── LEFT: Text ───────────────────────────────────────── */}
            <div className="text-center lg:text-left order-2 lg:order-1">

              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.1 }}
                className="inline-flex items-center gap-2.5 mb-7 rounded-full border border-brand-500/30 bg-brand-500/[0.09] px-2 py-1.5 backdrop-blur-sm"
              >
                <div className="flex items-center gap-1.5 bg-green-500/15 border border-green-500/30 rounded-full px-2.5 py-[4px]">
                  <span className="w-[6px] h-[6px] rounded-full bg-green-400 block animate-pulse" />
                  <span className="text-green-300 text-[10px] font-bold uppercase tracking-widest">Live</span>
                </div>
                <span className="text-brand-200/90 text-[13px] font-medium pr-1">12,847 Indians online now</span>
              </motion.div>

              {/* Animated headline */}
              <Headline />

              {/* Subtitle */}
              <motion.p
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.9 }}
                className="text-white/45 text-[17px] mt-6 mb-9 leading-relaxed max-w-[480px] mx-auto lg:mx-0"
              >
                Connect anonymously with real people across India — via video, voice, or text.
                Safe, spontaneous, and completely private.
              </motion.p>

              {/* CTA Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1.05 }}
                className="flex flex-col sm:flex-row gap-3.5 justify-center lg:justify-start mb-10"
              >
                <Link href="/signup">
                  <motion.button
                    whileHover={{ scale: 1.04, boxShadow: '0 0 56px rgba(168,85,247,0.55)' }}
                    whileTap={{ scale: 0.96 }}
                    className="group relative overflow-hidden bg-gradient-to-r from-brand-600 via-[#9f30f0] to-pink-500 text-white font-bold text-[15px] px-7 py-[14px] rounded-2xl shadow-2xl flex items-center justify-center gap-2.5"
                  >
                    {/* Shimmer sweep */}
                    <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-700 bg-gradient-to-r from-transparent via-white/18 to-transparent skew-x-[-18deg]" />
                    <Video className="w-[18px] h-[18px] relative z-10 flex-shrink-0" />
                    <span className="relative z-10">Start Video Chat</span>
                    <ChevronRight className="w-[18px] h-[18px] relative z-10 flex-shrink-0 group-hover:translate-x-1 transition-transform" />
                  </motion.button>
                </Link>

                <Link href="/signup">
                  <motion.button
                    whileHover={{ scale: 1.04, borderColor: 'rgba(168,85,247,0.45)', backgroundColor: 'rgba(255,255,255,0.07)' }}
                    whileTap={{ scale: 0.96 }}
                    className="flex items-center justify-center gap-2.5 bg-white/[0.05] backdrop-blur-sm border border-white/[0.1] text-white font-semibold text-[15px] px-7 py-[14px] rounded-2xl transition-all"
                  >
                    <MessageSquare className="w-[18px] h-[18px] text-brand-400 flex-shrink-0" />
                    Text Chat
                  </motion.button>
                </Link>
              </motion.div>

              {/* Trust strip */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.25 }}
                className="flex flex-wrap items-center gap-5 justify-center lg:justify-start"
              >
                {[
                  { icon: Shield, label: '18+ verified',       color: 'text-sky-400'    },
                  { icon: Lock,   label: 'End-to-end private', color: 'text-green-400'  },
                  { icon: MapPin, label: 'India only',          color: 'text-brand-400' },
                ].map(({ icon: Icon, label, color }) => (
                  <div key={label} className="flex items-center gap-1.5 text-white/30 text-[13px]">
                    <Icon className={`w-3.5 h-3.5 ${color} flex-shrink-0`} />
                    {label}
                  </div>
                ))}
              </motion.div>
            </div>

            {/* ── RIGHT: Animated Chat Cards ───────────────────────── */}
            <div className="relative order-1 lg:order-2 flex justify-center lg:justify-end">
              {/* Outer glow background */}
              <motion.div
                className="absolute inset-0 rounded-full opacity-20 blur-3xl"
                style={{ background: 'radial-gradient(ellipse at center, rgba(168,85,247,0.6) 0%, rgba(236,72,153,0.3) 50%, transparent 70%)' }}
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              />

              {/* Cards container — fixed-size positioning space */}
              <div className="relative" style={{ width: 340, height: 480 }}>

                {/* City tags */}
                {CITY_BUBBLES.map((c, i) => (
                  <CityTag key={c.city} {...c} delay={i * 0.18} />
                ))}

                {/* Left card — Priya */}
                <div className="absolute top-0 left-0 z-20">
                  <ChatBubbleCard
                    user={LEFT_USER}
                    side="a"
                    msgs={msgs}
                    typing={typing}
                    rotate={-4}
                    delay={0.5}
                  />
                </div>

                {/* Connection pulse orb */}
                <motion.div
                  className="absolute z-30"
                  style={{ left: '50%', top: '50%', transform: 'translate(-50%,-50%)' }}
                  animate={{ scale: [0.9, 1.15, 0.9], opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-500 to-pink-500 flex items-center justify-center shadow-[0_0_30px_rgba(168,85,247,0.7)]">
                    <Heart className="w-5 h-5 text-white fill-white" />
                  </div>
                  {/* Ripple rings */}
                  {[0, 1, 2].map(r => (
                    <motion.div
                      key={r}
                      className="absolute inset-0 rounded-full border border-brand-400/40"
                      animate={{ scale: [1, 2.2], opacity: [0.5, 0] }}
                      transition={{ duration: 2, repeat: Infinity, delay: r * 0.65, ease: 'easeOut' }}
                    />
                  ))}
                </motion.div>

                {/* Right card — Arjun */}
                <div className="absolute bottom-0 right-0 z-20">
                  <ChatBubbleCard
                    user={RIGHT_USER}
                    side="b"
                    msgs={msgs}
                    typing={typing}
                    rotate={4}
                    delay={0.85}
                  />
                </div>

                {/* Dashed connection arc (SVG) */}
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none z-10"
                  viewBox="0 0 340 480"
                  fill="none"
                >
                  <motion.path
                    d="M 136 180 Q 170 240 204 300"
                    stroke="url(#connGrad)"
                    strokeWidth="1.5"
                    strokeDasharray="5 6"
                    strokeLinecap="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 0.5 }}
                    transition={{ duration: 1.2, delay: 1.4, ease: 'easeInOut' }}
                  />
                  <defs>
                    <linearGradient id="connGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#a855f7" />
                      <stop offset="100%" stopColor="#ec4899" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Bottom fade gradient into features section */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0f0c29] to-transparent pointer-events-none" />
      </section>

      {/* ─── Features ───────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-4 relative">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden" whileInView="visible"
            viewport={{ once: true, margin: '-80px' }} variants={stagger}
            className="text-center mb-16"
          >
            <motion.span variants={fadeUp} className="text-brand-400 text-[11px] font-bold uppercase tracking-[0.2em]">
              Why Flirtigo
            </motion.span>
            <motion.h2 variants={fadeUp} className="text-4xl sm:text-5xl font-black text-white mt-3 mb-4">
              Built for India, by India
            </motion.h2>
            <motion.p variants={fadeUp} className="text-white/45 text-lg max-w-2xl mx-auto">
              A premium experience designed specifically for the Indian audience.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden" whileInView="visible"
            viewport={{ once: true }} variants={stagger}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {FEATURES.map((f, i) => (
              <motion.div
                key={i} variants={fadeUp}
                whileHover={{ y: -6, boxShadow: '0 24px 64px rgba(168,85,247,0.18)' }}
                className="glass rounded-3xl p-7 border border-white/[0.07] hover:border-brand-500/30 transition-all cursor-default"
              >
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${f.grad} flex items-center justify-center mb-5 shadow-lg`}>
                  <f.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-[18px] font-bold text-white mb-2.5">{f.title}</h3>
                <p className="text-white/45 text-[13px] leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── How it works ───────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-4 relative">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial="hidden" whileInView="visible"
            viewport={{ once: true }} variants={stagger}
            className="text-center mb-16"
          >
            <motion.h2 variants={fadeUp} className="text-4xl sm:text-5xl font-black text-white mb-4">
              How it works
            </motion.h2>
            <motion.p variants={fadeUp} className="text-white/45 text-lg">
              Three steps to your next great conversation
            </motion.p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 36 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.18 }}
                className="text-center relative"
              >
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-full w-full h-px bg-gradient-to-r from-brand-500/40 to-transparent z-0" />
                )}
                <div className="relative z-10">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-600 to-brand-400 flex items-center justify-center text-[22px] font-black text-white mx-auto mb-5 shadow-[0_0_24px_rgba(168,85,247,0.45)]">
                    {i + 1}
                  </div>
                  <h3 className="text-[17px] font-bold text-white mb-2">{s.title}</h3>
                  <p className="text-white/40 text-[13px] leading-relaxed">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing ────────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 px-4">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial="hidden" whileInView="visible"
            viewport={{ once: true }} variants={stagger}
            className="text-center mb-14"
          >
            <motion.h2 variants={fadeUp} className="text-4xl sm:text-5xl font-black text-white mb-4">
              Simple pricing
            </motion.h2>
            <motion.p variants={fadeUp} className="text-white/45 text-lg">
              Start free. Upgrade when you want more.
            </motion.p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Free */}
            <motion.div
              initial={{ opacity: 0, x: -32 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="glass rounded-3xl p-8 border border-white/[0.08]"
            >
              <div className="text-white/45 font-semibold mb-1.5 text-[15px]">Free</div>
              <div className="text-5xl font-black text-white mb-7">₹0</div>
              <ul className="space-y-3 mb-8">
                {['Unlimited text chat', '10 video skips/day', 'Random matching', 'India-wide discovery'].map(f => (
                  <li key={f} className="flex items-center gap-3 text-white/60 text-[13px]">
                    <div className="w-5 h-5 rounded-full bg-white/[0.08] flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-white/50" />
                    </div>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/signup">
                <button className="w-full glass border border-white/[0.1] text-white font-semibold py-3 rounded-xl hover:border-white/25 transition-all text-[14px]">
                  Get Started Free
                </button>
              </Link>
            </motion.div>

            {/* Premium */}
            <motion.div
              initial={{ opacity: 0, x: 32 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative rounded-3xl p-8 border border-brand-500/40 overflow-hidden shadow-[0_0_40px_rgba(168,85,247,0.2)] bg-gradient-to-br from-[#120828]/80 via-[rgba(109,40,217,0.18)] to-transparent"
            >
              <div className="absolute top-4 right-4 bg-gradient-to-r from-amber-400 to-amber-500 text-black text-[10px] font-black px-3 py-1 rounded-full tracking-widest">
                POPULAR
              </div>
              <div className="flex items-center gap-2 mb-1.5">
                <Crown className="w-4 h-4 text-amber-400" />
                <span className="text-brand-300 font-bold text-[15px]">Premium</span>
              </div>
              <div className="flex items-end gap-2 mb-1">
                <span className="text-5xl font-black text-white">₹199</span>
                <span className="text-white/35 mb-1.5 text-[14px]">/month</span>
              </div>
              <div className="text-white/35 text-[12px] mb-7">or ₹1,499/year — save 37%</div>
              <ul className="space-y-3 mb-8">
                {['Everything in Free', 'Unlimited video skips', 'Priority matchmaking', 'No ads', 'Premium badge', 'HD video quality'].map(f => (
                  <li key={f} className="flex items-center gap-3 text-white/75 text-[13px]">
                    <div className="w-5 h-5 rounded-full bg-brand-500/25 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-brand-300" />
                    </div>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/signup">
                <motion.button
                  whileHover={{ boxShadow: '0 0 40px rgba(168,85,247,0.55)' }}
                  className="w-full bg-gradient-to-r from-brand-600 to-brand-400 text-white font-bold py-3 rounded-xl transition-all text-[14px]"
                >
                  Start Premium
                </motion.button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── Footer ─────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.05] py-10 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
              <Heart className="w-3.5 h-3.5 text-white fill-white" />
            </div>
            <span className="font-bold gradient-text-purple">Flirtigo</span>
          </div>
          <p className="text-white/25 text-[12px] text-center">
            For users 18+ only · India only · Anonymous by default
          </p>
          <div className="flex items-center gap-5 text-[12px] text-white/25">
            {['Privacy', 'Terms', 'Safety', 'Contact'].map(l => (
              <a key={l} href="#" className="hover:text-white/50 transition-colors">{l}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
