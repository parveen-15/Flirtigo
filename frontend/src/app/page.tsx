'use client';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Video, Shield, Lock, Heart, ChevronRight, Sparkles,
  Star, Check, Crown, MapPin, Flame, Zap, Globe,
} from 'lucide-react';

// ─── Animated Orbs Background ─────────────────────────────────────────────────
function AnimatedBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {/* Large glowing orbs */}
      <motion.div
        className="absolute rounded-full"
        style={{ width: 600, height: 600, left: '5%', top: '-10%', background: 'radial-gradient(circle, rgba(236,72,153,0.35) 0%, transparent 70%)' }}
        animate={{ x: [0, 80, 0], y: [0, 60, 0], scale: [1, 1.15, 1] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute rounded-full"
        style={{ width: 500, height: 500, right: '0%', top: '15%', background: 'radial-gradient(circle, rgba(124,58,237,0.4) 0%, transparent 70%)' }}
        animate={{ x: [0, -60, 0], y: [0, 80, 0], scale: [1, 1.2, 1] }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />
      <motion.div
        className="absolute rounded-full"
        style={{ width: 400, height: 400, left: '30%', bottom: '5%', background: 'radial-gradient(circle, rgba(59,130,246,0.3) 0%, transparent 70%)' }}
        animate={{ x: [0, 40, 0], y: [0, -50, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
      />
      {/* Bright floating particles */}
      {[
        { x: '15%', y: '25%', color: '#FF3CAC', size: 6 },
        { x: '80%', y: '15%', color: '#784BA0', size: 7 },
        { x: '65%', y: '70%', color: '#FF6B6B', size: 5 },
        { x: '25%', y: '75%', color: '#4ECDC4', size: 6 },
        { x: '45%', y: '30%', color: '#FFE66D', size: 5 },
        { x: '88%', y: '55%', color: '#FF3CAC', size: 7 },
        { x: '10%', y: '60%', color: '#a855f7', size: 6 },
        { x: '55%', y: '85%', color: '#ec4899', size: 5 },
        { x: '35%', y: '10%', color: '#6366f1', size: 6 },
        { x: '75%', y: '40%', color: '#FF3CAC', size: 4 },
        { x: '5%', y: '45%', color: '#FFE66D', size: 7 },
        { x: '92%', y: '80%', color: '#784BA0', size: 5 },
        { x: '50%', y: '50%', color: '#FF3CAC', size: 4 },
        { x: '20%', y: '90%', color: '#a855f7', size: 6 },
        { x: '70%', y: '5%', color: '#4ECDC4', size: 5 },
      ].map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size,
            background: p.color,
            boxShadow: `0 0 ${p.size * 5}px ${p.color}, 0 0 ${p.size * 10}px ${p.color}40`,
          }}
          animate={{ y: [0, -25, 0], opacity: [0.7, 1, 0.7], scale: [1, 1.6, 1] }}
          transition={{ duration: 3 + i * 0.4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.25 }}
        />
      ))}
    </div>
  );
}

// ─── Floating Video Card ──────────────────────────────────────────────────────
function VideoCard({ name, city, initials, grad, delay, side }: {
  name: string; city: string; initials: string; grad: string; delay: number; side: 'left' | 'right';
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 60, scale: 0.85 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 60, damping: 15, delay }}
      style={{ [side]: 20, top: '50%', marginTop: -140, position: 'absolute', width: 190 }}
    >
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 4 + delay, repeat: Infinity, ease: 'easeInOut' }}
        className="rounded-3xl overflow-hidden border border-white/15 bg-[#0d0820]/90 backdrop-blur-xl"
        style={{ boxShadow: '0 20px 60px rgba(236,72,153,0.25)' }}
      >
        <div className={`h-28 bg-gradient-to-br ${grad} relative overflow-hidden`}>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center text-xl font-black text-white">
              {initials}
            </div>
          </div>
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/40 rounded-full px-2 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-white text-[9px] font-bold">LIVE</span>
          </div>
        </div>
        <div className="px-3 py-2.5">
          <p className="text-white font-bold text-xs">{name}</p>
          <div className="flex items-center gap-1 mt-0.5">
            <MapPin className="w-2.5 h-2.5 text-white/35" />
            <span className="text-white/40 text-[10px]">{city}</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function StatCount({ end, label }: { end: string; label: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="text-center"
    >
      <div className="text-3xl sm:text-4xl font-black mb-1" style={{ background: 'linear-gradient(90deg, #FF3CAC, #784BA0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        {end}
      </div>
      <div className="text-white/40 text-xs sm:text-sm">{label}</div>
    </motion.div>
  );
}

const FEATURES = [
  { icon: Video, title: 'HD Video Chat', desc: 'Crystal-clear peer-to-peer video powered by WebRTC.', grad: 'from-pink-600 to-rose-600' },
  { icon: MapPin, title: 'India-Wide', desc: 'Meet people from Mumbai, Delhi, Bengaluru and everywhere.', grad: 'from-purple-600 to-indigo-600' },
  { icon: Lock, title: 'Anonymous', desc: 'Your identity is never revealed. You control what others see.', grad: 'from-cyan-600 to-blue-600' },
  { icon: Shield, title: 'Safe & Moderated', desc: 'Advanced moderation and instant reporting system.', grad: 'from-emerald-600 to-teal-600' },
  { icon: Zap, title: 'Instant Match', desc: 'No waiting — get matched in under 3 seconds.', grad: 'from-amber-500 to-orange-600' },
  { icon: Globe, title: 'Live Chat', desc: 'Text chat while on video call. Emojis, typing indicators.', grad: 'from-violet-600 to-purple-600' },
];

const STEPS = [
  { num: '01', title: 'Create Profile', desc: 'Enter your name, age, and gender. No phone number needed.' },
  { num: '02', title: 'Start Matching', desc: 'Hit Start and get instantly matched with someone real.' },
  { num: '03', title: 'Connect & Chat', desc: 'Video call, audio, and text chat — all in one screen.' },
];

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="min-h-screen bg-[#07040e] text-white overflow-x-hidden">

      {/* ─── Nav ─────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#07040e]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2"
          >
            <motion.div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #FF3CAC, #784BA0)', boxShadow: '0 0 20px rgba(255,60,172,0.5)' }}
              whileHover={{ rotate: 10, scale: 1.1 }}
            >
              <Flame className="w-5 h-5 text-white" />
            </motion.div>
            <span
              className="text-xl font-black"
              style={{ background: 'linear-gradient(90deg, #FF3CAC, #784BA0, #2B86C5)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
            >
              Flirtigo
            </span>
          </motion.div>

          <div className="hidden md:flex items-center gap-8 text-sm text-white/50">
            {['Features', 'How it works', 'Pricing'].map(l => (
              <a key={l} href={`#${l.toLowerCase().replace(/ /g, '-')}`} className="hover:text-white transition-colors">{l}</a>
            ))}
          </div>

          <Link href="/video-chat">
            <motion.button
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="text-white text-sm font-bold px-5 py-2.5 rounded-xl"
              style={{ background: 'linear-gradient(135deg, #FF3CAC, #784BA0)', boxShadow: '0 0 20px rgba(255,60,172,0.3)' }}
            >
              Start Free →
            </motion.button>
          </Link>
        </div>
      </nav>

      {/* ─── Hero ────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
        <div className="absolute inset-0 bg-[#07040e]" />
        {mounted && <AnimatedBackground />}

        {/* Floating cards */}
        <div className="absolute inset-0 pointer-events-none hidden lg:block">
          <VideoCard name="Priya S." city="Mumbai" initials="P" grad="from-rose-500 via-pink-500 to-purple-600" delay={0.3} side="left" />
          <VideoCard name="Arjun K." city="Bengaluru" initials="A" grad="from-violet-600 via-blue-500 to-cyan-500" delay={0.5} side="right" />
        </div>

        {/* Hero content */}
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 mb-8"
            style={{ background: 'rgba(255,60,172,0.12)', border: '1px solid rgba(255,60,172,0.35)' }}
          >
            <Sparkles className="w-3.5 h-3.5 text-pink-400" />
            <span className="text-pink-300 text-xs font-semibold">India's #1 Random Video Chat</span>
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-5xl sm:text-6xl md:text-8xl font-black leading-none mb-6"
          >
            <span
              className="block"
              style={{ background: 'linear-gradient(90deg, #FF3CAC, #FF6B9D, #784BA0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
            >
              Meet Real
            </span>
            <span className="text-white block">Indians</span>
            <span
              className="block"
              style={{ background: 'linear-gradient(90deg, #FFD700, #FF6B6B, #FF3CAC)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
            >
              Instantly
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-white/50 text-lg sm:text-xl max-w-xl mx-auto mb-10"
          >
            HD video chat with strangers across India. Anonymous, safe, and free.
            No sign-up required — just enter your name and start.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link href="/video-chat">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.96 }}
                className="relative text-white font-black text-xl px-14 py-5 rounded-3xl overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #FF3CAC, #784BA0, #2B86C5)', boxShadow: '0 0 50px rgba(255,60,172,0.55)' }}
              >
                <motion.div
                  className="absolute inset-0"
                  style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.25), transparent)' }}
                  animate={{ opacity: [0, 0.6, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <span className="relative flex items-center gap-3">
                  <Video className="w-6 h-6" />
                  Start Video Chat
                </span>
              </motion.button>
            </Link>
            <a href="#how-it-works" className="text-white/40 hover:text-white/70 transition-colors text-sm flex items-center gap-1">
              How does it work? <ChevronRight className="w-4 h-4" />
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-10 flex items-center justify-center gap-6 text-xs text-white/30"
          >
            <span className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-400 fill-amber-400" /> 4.9 rating</span>
            <span>·</span>
            <span>15,000+ online now</span>
            <span>·</span>
            <span>18+ only</span>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-white/20"
        >
          <div className="w-5 h-8 rounded-full border border-white/20 flex items-start justify-center pt-1.5">
            <div className="w-1 h-2 rounded-full bg-white/40" />
          </div>
        </motion.div>
      </section>

      {/* ─── Stats ───────────────────────────────────────────────────── */}
      <section className="py-16 px-4 border-y border-white/5" style={{ background: 'linear-gradient(90deg, rgba(255,60,172,0.05), rgba(120,75,160,0.06), rgba(43,134,197,0.05))' }}>
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-8">
          <StatCount end="15K+" label="Online right now" />
          <StatCount end="2M+" label="Matches made" />
          <StatCount end="50+" label="Cities in India" />
        </div>
      </section>

      {/* ─── Features ────────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="text-pink-400 text-xs font-bold uppercase tracking-[0.2em] mb-3 block">Why Flirtigo</span>
            <h2 className="text-4xl sm:text-5xl font-black text-white mb-4">
              Built for{' '}
              <span style={{ background: 'linear-gradient(90deg, #FF3CAC, #784BA0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>India</span>
            </h2>
            <p className="text-white/40 text-lg max-w-xl mx-auto">Every feature designed for the Indian experience.</p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ y: -6 }}
                className="bg-white/[0.03] border border-white/[0.07] rounded-3xl p-7 hover:border-pink-500/20 transition-all cursor-default group"
              >
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${f.grad} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform`}>
                  <f.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-[17px] font-bold text-white mb-2">{f.title}</h3>
                <p className="text-white/40 text-[13px] leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How it works ────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-4" style={{ background: 'linear-gradient(180deg, #0d0820 0%, #07040e 100%)' }}>
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl sm:text-5xl font-black text-white mb-4">How it works</h2>
            <p className="text-white/40 text-lg">Ready in 30 seconds</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="text-center"
              >
                <motion.div
                  className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-5"
                  style={{ background: 'linear-gradient(135deg, rgba(255,60,172,0.15), rgba(120,75,160,0.15))', border: '1px solid rgba(255,60,172,0.2)' }}
                  animate={{ boxShadow: ['0 0 0px rgba(255,60,172,0)', '0 0 30px rgba(255,60,172,0.35)', '0 0 0px rgba(255,60,172,0)'] }}
                  transition={{ duration: 2, delay: i * 0.5, repeat: Infinity }}
                >
                  <span
                    className="text-2xl font-black"
                    style={{ background: 'linear-gradient(135deg, #FF3CAC, #784BA0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
                  >
                    {s.num}
                  </span>
                </motion.div>
                <h3 className="text-lg font-bold text-white mb-2">{s.title}</h3>
                <p className="text-white/40 text-sm leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mt-14"
          >
            <Link href="/video-chat">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="text-white font-black text-lg px-12 py-4 rounded-2xl"
                style={{ background: 'linear-gradient(135deg, #FF3CAC, #784BA0)', boxShadow: '0 0 30px rgba(255,60,172,0.35)' }}
              >
                Try it now — it's free
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ─── Pricing ─────────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 px-4">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="text-4xl sm:text-5xl font-black text-white mb-4">Simple pricing</h2>
            <p className="text-white/40 text-lg">Start free. Upgrade anytime.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-white/[0.03] border border-white/[0.08] rounded-3xl p-8"
            >
              <div className="text-white/40 font-semibold mb-1">Free</div>
              <div className="text-5xl font-black text-white mb-7">₹0</div>
              <ul className="space-y-3 mb-8">
                {['Unlimited video chat', '10 skips/day', 'Random matching', 'Text chat in call'].map(f => (
                  <li key={f} className="flex items-center gap-3 text-white/60 text-sm">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,60,172,0.15)' }}>
                      <Check className="w-3 h-3 text-pink-400" />
                    </div>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/video-chat">
                <button className="w-full bg-white/5 border border-white/10 text-white font-semibold py-3 rounded-xl hover:bg-white/10 transition-all text-sm">
                  Get Started Free
                </button>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative rounded-3xl p-8 overflow-hidden"
              style={{ border: '1px solid rgba(255,60,172,0.35)', background: 'linear-gradient(135deg, rgba(255,60,172,0.08), rgba(120,75,160,0.08))', boxShadow: '0 0 60px rgba(255,60,172,0.15)' }}
            >
              <div
                className="absolute top-4 right-4 text-black text-[10px] font-black px-3 py-1 rounded-full"
                style={{ background: 'linear-gradient(135deg, #FFD700, #FF6B6B)' }}
              >
                POPULAR
              </div>
              <div className="flex items-center gap-2 mb-1">
                <Crown className="w-4 h-4 text-amber-400" />
                <span className="text-pink-300 font-bold">Premium</span>
              </div>
              <div className="flex items-end gap-2 mb-1">
                <span className="text-5xl font-black text-white">₹199</span>
                <span className="text-white/30 mb-1.5 text-sm">/month</span>
              </div>
              <div className="text-white/30 text-xs mb-7">or ₹1,499/year — save 37%</div>
              <ul className="space-y-3 mb-8">
                {['Everything in Free', 'Unlimited skips', 'Priority matchmaking', 'No ads', 'Premium badge', 'HD quality'].map(f => (
                  <li key={f} className="flex items-center gap-3 text-white/75 text-sm">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,60,172,0.25)' }}>
                      <Check className="w-3 h-3 text-pink-300" />
                    </div>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/video-chat">
                <motion.button
                  whileHover={{ boxShadow: '0 0 40px rgba(255,60,172,0.5)' }}
                  className="w-full text-white font-bold py-3 rounded-xl transition-all text-sm"
                  style={{ background: 'linear-gradient(135deg, #FF3CAC, #784BA0)' }}
                >
                  Start Premium
                </motion.button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── CTA Banner ──────────────────────────────────────────────── */}
      <section className="py-20 px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center relative rounded-3xl p-12 overflow-hidden"
          style={{ border: '1px solid rgba(255,60,172,0.25)', background: 'linear-gradient(135deg, rgba(255,60,172,0.08), rgba(120,75,160,0.08))' }}
        >
          <motion.div
            className="absolute inset-0 rounded-3xl"
            animate={{ boxShadow: ['0 0 30px rgba(255,60,172,0.1)', '0 0 70px rgba(255,60,172,0.3)', '0 0 30px rgba(255,60,172,0.1)'] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
          <div className="relative">
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">Ready to meet someone new?</h2>
            <p className="text-white/40 mb-8">Join 15,000+ Indians online right now.</p>
            <Link href="/video-chat">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="text-white font-black text-xl px-14 py-5 rounded-2xl"
                style={{ background: 'linear-gradient(135deg, #FF3CAC, #784BA0)', boxShadow: '0 0 50px rgba(255,60,172,0.5)' }}
              >
                Start Now — Free ✨
              </motion.button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-10 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FF3CAC, #784BA0)' }}>
              <Flame className="w-3.5 h-3.5 text-white" />
            </div>
            <span
              className="font-black"
              style={{ background: 'linear-gradient(90deg, #FF3CAC, #784BA0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
            >
              Flirtigo
            </span>
          </div>
          <p className="text-white/20 text-xs text-center">18+ only · India only · Anonymous by default</p>
          <div className="flex items-center gap-5 text-xs text-white/25">
            {['Privacy', 'Terms', 'Safety', 'Contact'].map(l => (
              <a key={l} href="#" className="hover:text-white/50 transition-colors">{l}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
