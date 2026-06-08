'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Crown, Check, Zap, Shield, Video, SkipForward, Heart,
  ArrowLeft, Loader2, Star, BadgeCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import { subscriptionsApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function SubscriptionPage() {
  const router = useRouter();
  const { user, updateUser, isGuest } = useAuthStore();
  const [selectedPlan, setSelectedPlan] = useState<'premium_monthly' | 'premium_yearly'>('premium_monthly');
  const [loading, setLoading] = useState(false);
  const [currentSub, setCurrentSub] = useState<any>(null);

  useEffect(() => {
    if (isGuest) {
      router.replace('/login');
      return;
    }
    subscriptionsApi.getCurrent().then(res => setCurrentSub(res.data)).catch(() => {});

    // Load Razorpay script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, []);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const orderRes = await subscriptionsApi.createOrder(selectedPlan);
      const { orderId, amount, keyId } = orderRes.data;

      const options = {
        key: keyId,
        amount,
        currency: 'INR',
        name: 'Flirtigo Premium',
        description: selectedPlan === 'premium_monthly' ? 'Monthly Subscription' : 'Yearly Subscription',
        order_id: orderId,
        prefill: {
          name: user?.displayName,
          email: user?.email,
          contact: user?.phone,
        },
        theme: { color: '#a855f7' },
        handler: async (response: any) => {
          try {
            await subscriptionsApi.verifyPayment({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            updateUser({ isPremium: true });
            toast.success('Welcome to Flirtigo Premium! 🎉');
            router.push('/video-chat');
          } catch {
            toast.error('Payment verification failed');
          }
        },
        modal: {
          ondismiss: () => setLoading(false),
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
      rzp.on('payment.failed', () => {
        toast.error('Payment failed. Please try again.');
        setLoading(false);
      });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to initialize payment');
      setLoading(false);
    }
  };

  const features = {
    free: [
      { text: 'Unlimited text chat', included: true },
      { text: '10 video skips per day', included: true },
      { text: 'Random matching', included: true },
      { text: 'Report & block', included: true },
      { text: 'Unlimited video skips', included: false },
      { text: 'Priority matchmaking', included: false },
      { text: 'No ads', included: false },
      { text: 'Premium badge', included: false },
    ],
    premium: [
      { text: 'Unlimited text chat', included: true },
      { text: 'Unlimited video skips', included: true },
      { text: 'Priority matchmaking', included: true },
      { text: 'Report & block', included: true },
      { text: 'No advertisements', included: true },
      { text: 'Premium badge', included: true },
      { text: 'HD video quality', included: true },
      { text: 'First access to new features', included: true },
    ],
  };

  return (
    <div className="min-h-screen px-4 py-8 relative">
      <div className="fixed inset-0 pointer-events-none">
        <div className="orb orb-purple w-96 h-96 -top-20 right-0 opacity-10" />
        <div className="orb orb-pink w-80 h-80 bottom-0 left-0 opacity-10" />
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Back */}
        <Link href="/video-chat" className="inline-flex items-center gap-2 text-white/40 hover:text-white transition-colors mb-8 text-sm">
          <ArrowLeft className="w-4 h-4" />
          Back to chat
        </Link>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-2 mb-4 border border-amber-500/30">
            <Crown className="w-4 h-4 text-amber-400" />
            <span className="text-sm text-amber-300 font-medium">Flirtigo Premium</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-3">
            Unlock your full <span className="gradient-text">potential</span>
          </h1>
          <p className="text-white/40 text-lg">Get unlimited access and the best matching experience</p>
        </motion.div>

        {/* Active Subscription Banner */}
        {user?.isPremium && currentSub?.status === 'active' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-4 mb-8 border border-amber-500/30 flex items-center gap-4"
          >
            <Crown className="w-8 h-8 text-amber-400" />
            <div>
              <div className="text-white font-bold flex items-center gap-2">
                Active Premium Subscription
                <BadgeCheck className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-white/40 text-sm">
                {currentSub.plan === 'premium_yearly' ? 'Yearly Plan' : 'Monthly Plan'} •
                {currentSub.expires_at ? ` Renews ${new Date(currentSub.expires_at).toLocaleDateString('en-IN')}` : ''}
              </div>
            </div>
          </motion.div>
        )}

        {/* Plan Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center justify-center mb-8"
        >
          <div className="glass rounded-2xl p-1.5 border border-white/10">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSelectedPlan('premium_monthly')}
                className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  selectedPlan === 'premium_monthly'
                    ? 'bg-brand-600 text-white'
                    : 'text-white/40 hover:text-white/70'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setSelectedPlan('premium_yearly')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  selectedPlan === 'premium_yearly'
                    ? 'bg-brand-600 text-white'
                    : 'text-white/40 hover:text-white/70'
                }`}
              >
                Yearly
                <span className="bg-green-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                  -37%
                </span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Free */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="glass rounded-3xl p-8 border border-white/10"
          >
            <div className="text-white/50 font-semibold mb-1">Free</div>
            <div className="text-4xl font-black text-white mb-6">₹0</div>
            <ul className="space-y-3 mb-6">
              {features.free.map((f, i) => (
                <li key={i} className={`flex items-center gap-3 text-sm ${f.included ? 'text-white/70' : 'text-white/25 line-through'}`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${f.included ? 'bg-green-500/20' : 'bg-white/5'}`}>
                    {f.included && <Check className="w-3 h-3 text-green-400" />}
                  </div>
                  {f.text}
                </li>
              ))}
            </ul>
            <div className="text-center text-white/30 text-sm py-3 border border-white/10 rounded-xl">
              Your current plan
            </div>
          </motion.div>

          {/* Premium */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="relative rounded-3xl p-8 border border-brand-500/40 bg-gradient-to-br from-brand-950/80 via-brand-900/40 to-brand-800/20 overflow-hidden neon-purple"
          >
            <div className="absolute top-4 right-4 premium-badge text-black text-xs font-black px-3 py-1 rounded-full">
              BEST VALUE
            </div>
            <div className="flex items-center gap-2 mb-1">
              <Crown className="w-5 h-5 text-amber-400" />
              <span className="text-brand-300 font-semibold">Premium</span>
            </div>
            <div className="flex items-end gap-2 mb-1">
              <span className="text-4xl font-black text-white">
                {selectedPlan === 'premium_monthly' ? '₹199' : '₹125'}
              </span>
              <span className="text-white/40 mb-1">/month</span>
            </div>
            {selectedPlan === 'premium_yearly' && (
              <div className="text-white/40 text-sm mb-4">Billed as ₹1,499/year</div>
            )}

            <ul className="space-y-3 mb-6 mt-4">
              {features.premium.map((f, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-white/80">
                  <div className="w-5 h-5 rounded-full bg-brand-500/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-brand-400" />
                  </div>
                  {f.text}
                </li>
              ))}
            </ul>

            <motion.button
              whileHover={{ scale: 1.02, boxShadow: '0 0 40px rgba(168,85,247,0.5)' }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSubscribe}
              disabled={loading || user?.isPremium}
              className="w-full bg-gradient-to-r from-brand-600 to-brand-500 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : user?.isPremium ? (
                'Already Premium'
              ) : (
                <>
                  <Crown className="w-5 h-5" />
                  Subscribe with UPI / Card
                </>
              )}
            </motion.button>

            <div className="flex items-center justify-center gap-4 mt-4 text-white/20 text-xs">
              <span>UPI</span>
              <span>•</span>
              <span>Cards</span>
              <span>•</span>
              <span>Net Banking</span>
              <span>•</span>
              <span>Wallets</span>
            </div>
          </motion.div>
        </div>

        {/* Trust indicators */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-3 gap-4 text-center"
        >
          {[
            { icon: Shield, text: 'Secure payments via Razorpay' },
            { icon: Star, text: 'Cancel anytime' },
            { icon: Zap, text: 'Instant activation' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="glass rounded-2xl p-4 border border-white/5 flex flex-col items-center gap-2">
              <Icon className="w-5 h-5 text-brand-400" />
              <span className="text-white/40 text-xs leading-snug">{text}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
