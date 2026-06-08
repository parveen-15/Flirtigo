'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Heart, Phone, ArrowRight, Loader2, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

type Step = 'phone' | 'otp' | 'age';

export default function LoginPage() {
  const router = useRouter();
  const { setTokens, setUser } = useAuthStore();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);

  const handleGoogleLogin = () => {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/google`;
  };

  const handleSendOtp = async () => {
    if (!phone || phone.length < 10) return toast.error('Enter a valid Indian phone number');
    if (!ageConfirmed) return toast.error('Please confirm you are 18+ to continue');

    setLoading(true);
    try {
      await authApi.sendOtp(phone);
      toast.success('OTP sent!');
      setStep('otp');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) return toast.error('Enter the 6-digit OTP');
    setLoading(true);
    try {
      const res = await authApi.verifyOtp(phone, otp);
      const { accessToken, refreshToken, isNewUser, userId } = res.data;
      setTokens(accessToken, refreshToken);

      if (isNewUser) {
        router.push('/setup-profile');
      } else {
        const meRes = await authApi.getMe();
        setUser(meRes.data.user);
        router.push('/video-chat');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="orb orb-purple w-80 h-80 top-0 right-0 opacity-20" />
        <div className="orb orb-pink w-64 h-64 bottom-0 left-0 opacity-20" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
              <Heart className="w-5 h-5 text-white fill-white" />
            </div>
            <span className="text-2xl font-bold gradient-text-purple">Flirtigo</span>
          </Link>
          <h1 className="text-3xl font-black text-white mb-2">Welcome back</h1>
          <p className="text-white/40 text-sm">India's premier anonymous chat platform</p>
        </div>

        {/* Card */}
        <div className="glass rounded-3xl p-8 border border-white/10">
          {/* Google Login */}
          <motion.button
            whileHover={{ scale: 1.02, boxShadow: '0 0 20px rgba(255,255,255,0.1)' }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white text-gray-800 font-semibold py-3.5 rounded-2xl mb-6 transition-all"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </motion.button>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-white/30 text-xs">or</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Phone/OTP Steps */}
          <AnimatePresence mode="wait">
            {step === 'phone' && (
              <motion.div
                key="phone"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div>
                  <label className="text-white/60 text-sm mb-2 block">Phone Number</label>
                  <div className="flex items-center gap-2 bg-white/5 rounded-2xl border border-white/10 px-4 py-3.5 focus-within:border-brand-500/50 transition-colors">
                    <span className="text-white/60 text-sm font-medium">🇮🇳 +91</span>
                    <div className="w-px h-5 bg-white/10" />
                    <input
                      type="tel"
                      placeholder="9876543210"
                      value={phone}
                      onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className="flex-1 bg-transparent text-white placeholder-white/20 outline-none text-sm"
                      maxLength={10}
                    />
                    <Phone className="w-4 h-4 text-white/20" />
                  </div>
                </div>

                {/* Age confirmation */}
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div
                    onClick={() => setAgeConfirmed(!ageConfirmed)}
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                      ageConfirmed ? 'bg-brand-500 border-brand-500' : 'border-white/20 bg-transparent'
                    }`}
                  >
                    {ageConfirmed && <span className="text-white text-xs">✓</span>}
                  </div>
                  <span className="text-white/50 text-sm leading-snug">
                    I confirm that I am <strong className="text-white/80">18 years or older</strong> and agree to the{' '}
                    <a href="#" className="text-brand-400 hover:underline">Terms of Service</a>
                  </span>
                </label>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSendOtp}
                  disabled={loading || phone.length < 10 || !ageConfirmed}
                  className="w-full bg-gradient-to-r from-brand-600 to-brand-500 text-white font-bold py-3.5 rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Send OTP <ArrowRight className="w-5 h-5" /></>}
                </motion.button>
              </motion.div>
            )}

            {step === 'otp' && (
              <motion.div
                key="otp"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="text-center mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-brand-500/20 flex items-center justify-center mx-auto mb-3">
                    <ShieldCheck className="w-6 h-6 text-brand-400" />
                  </div>
                  <p className="text-white/60 text-sm">
                    OTP sent to <strong className="text-white">+91 {phone}</strong>
                  </p>
                </div>

                <div>
                  <label className="text-white/60 text-sm mb-2 block">6-digit OTP</label>
                  <input
                    type="text"
                    placeholder="• • • • • •"
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full bg-white/5 rounded-2xl border border-white/10 px-4 py-3.5 text-white text-center text-2xl tracking-[0.5em] placeholder-white/20 outline-none focus:border-brand-500/50 transition-colors"
                    maxLength={6}
                    autoFocus
                  />
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleVerifyOtp}
                  disabled={loading || otp.length !== 6}
                  className="w-full bg-gradient-to-r from-brand-600 to-brand-500 text-white font-bold py-3.5 rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify & Login'}
                </motion.button>

                <button
                  onClick={() => { setStep('phone'); setOtp(''); }}
                  className="w-full text-white/40 text-sm hover:text-white/60 transition-colors"
                >
                  ← Change phone number
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="text-center text-white/30 text-xs mt-6">
          New to Flirtigo?{' '}
          <Link href="/signup" className="text-brand-400 hover:text-brand-300 transition-colors">
            Create account
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
