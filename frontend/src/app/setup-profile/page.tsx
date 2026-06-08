'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Heart, Video, Mic, MessageSquare, ArrowRight, Loader2, User, MapPin, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { usersApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

const INTERESTS = [
  'Movies', 'Music', 'Sports', 'Gaming', 'Travel', 'Food', 'Books',
  'Photography', 'Fitness', 'Tech', 'Art', 'Dance', 'Yoga', 'Comedy',
  'Cricket', 'Bollywood', 'Business', 'Cooking', 'Nature', 'Fashion',
];

export default function SetupProfilePage() {
  const router = useRouter();
  const { setUser, updateUser } = useAuthStore();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    displayName: '',
    bio: '',
    gender: '',
    interests: [] as string[],
    preferredMatchType: 'video',
  });

  const toggleInterest = (interest: string) => {
    setForm(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : prev.interests.length < 8
          ? [...prev.interests, interest]
          : prev.interests,
    }));
  };

  const handleSubmit = async () => {
    if (!form.displayName.trim()) return toast.error('Display name is required');
    setLoading(true);
    try {
      const res = await usersApi.updateProfile({ ...form, ageVerified: true });
      updateUser({
        displayName: form.displayName,
        ageVerified: true,
        preferredMatchType: form.preferredMatchType as any,
      });
      toast.success('Profile set up!');
      router.push('/video-chat');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative py-12">
      <div className="fixed inset-0 pointer-events-none">
        <div className="orb orb-purple w-80 h-80 -top-20 -right-20 opacity-20" />
        <div className="orb orb-pink w-64 h-64 -bottom-20 -left-20 opacity-15" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg relative z-10"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
              <Heart className="w-5 h-5 text-white fill-white" />
            </div>
            <span className="text-2xl font-bold gradient-text-purple">Flirtigo</span>
          </div>
          <h1 className="text-3xl font-black text-white mb-2">Set up your profile</h1>
          <p className="text-white/40 text-sm">Step {step} of 3 — This takes 1 minute</p>

          {/* Progress */}
          <div className="flex items-center gap-2 mt-4 justify-center">
            {[1, 2, 3].map(s => (
              <div
                key={s}
                className={`h-1 rounded-full transition-all duration-500 ${
                  s <= step ? 'bg-brand-500' : 'bg-white/10'
                } ${s === step ? 'w-12' : 'w-6'}`}
              />
            ))}
          </div>
        </div>

        <div className="glass rounded-3xl p-8 border border-white/10">
          <AnimatePresence mode="wait">
            {/* Step 1: Basic Info */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div className="flex items-center gap-3 mb-2">
                  <User className="w-5 h-5 text-brand-400" />
                  <h2 className="text-lg font-bold text-white">Who are you?</h2>
                </div>

                <div>
                  <label className="text-white/50 text-sm mb-2 block">Display Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Rohan, Priya..."
                    value={form.displayName}
                    onChange={e => setForm(prev => ({ ...prev, displayName: e.target.value.slice(0, 50) }))}
                    className="w-full bg-white/5 rounded-2xl border border-white/10 px-4 py-3.5 text-white placeholder-white/20 outline-none focus:border-brand-500/50 transition-colors text-sm"
                    autoFocus
                  />
                  <p className="text-white/30 text-xs mt-1.5">This is what others will see. No real name needed!</p>
                </div>

                <div>
                  <label className="text-white/50 text-sm mb-2 block">Gender</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Male', 'Female', 'Other'].map(g => (
                      <button
                        key={g}
                        onClick={() => setForm(prev => ({ ...prev, gender: g.toLowerCase() }))}
                        className={`py-3 rounded-xl text-sm font-medium border transition-all ${
                          form.gender === g.toLowerCase()
                            ? 'bg-brand-500/20 border-brand-500 text-brand-300'
                            : 'bg-white/5 border-white/10 text-white/50 hover:border-white/20'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-white/50 text-sm mb-2 block">Bio (optional)</label>
                  <textarea
                    placeholder="Tell people a bit about yourself..."
                    value={form.bio}
                    onChange={e => setForm(prev => ({ ...prev, bio: e.target.value.slice(0, 200) }))}
                    rows={3}
                    className="w-full bg-white/5 rounded-2xl border border-white/10 px-4 py-3.5 text-white placeholder-white/20 outline-none focus:border-brand-500/50 transition-colors text-sm resize-none"
                  />
                  <p className="text-white/20 text-xs mt-1 text-right">{form.bio.length}/200</p>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { if (!form.displayName.trim()) { toast.error('Display name required'); return; } setStep(2); }}
                  className="w-full bg-gradient-to-r from-brand-600 to-brand-500 text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2"
                >
                  Next <ArrowRight className="w-5 h-5" />
                </motion.button>
              </motion.div>
            )}

            {/* Step 2: Interests */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div className="flex items-center gap-3 mb-2">
                  <Sparkles className="w-5 h-5 text-brand-400" />
                  <h2 className="text-lg font-bold text-white">Your interests</h2>
                </div>
                <p className="text-white/40 text-sm">Pick up to 8 topics you enjoy talking about</p>

                <div className="flex flex-wrap gap-2">
                  {INTERESTS.map(interest => (
                    <motion.button
                      key={interest}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => toggleInterest(interest)}
                      className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                        form.interests.includes(interest)
                          ? 'bg-brand-500/20 border-brand-500 text-brand-300'
                          : 'bg-white/5 border-white/10 text-white/50 hover:border-white/20'
                      }`}
                    >
                      {interest}
                    </motion.button>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(1)}
                    className="flex-1 glass border border-white/10 text-white/60 font-medium py-3.5 rounded-2xl hover:border-white/20 transition-all"
                  >
                    Back
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setStep(3)}
                    className="flex-1 bg-gradient-to-r from-brand-600 to-brand-500 text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2"
                  >
                    Next <ArrowRight className="w-5 h-5" />
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Chat Preference */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div className="flex items-center gap-3 mb-2">
                  <MapPin className="w-5 h-5 text-brand-400" />
                  <h2 className="text-lg font-bold text-white">Preferred chat mode</h2>
                </div>

                <div className="space-y-3">
                  {[
                    { value: 'video', icon: Video, label: 'Video Chat', desc: 'Face-to-face video conversations' },
                    { value: 'voice', icon: Mic, label: 'Voice Chat', desc: 'Audio-only, camera off' },
                    { value: 'text', icon: MessageSquare, label: 'Text Chat', desc: 'Type your conversations' },
                  ].map(({ value, icon: Icon, label, desc }) => (
                    <motion.button
                      key={value}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => setForm(prev => ({ ...prev, preferredMatchType: value }))}
                      className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${
                        form.preferredMatchType === value
                          ? 'bg-brand-500/15 border-brand-500/50'
                          : 'bg-white/5 border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        form.preferredMatchType === value ? 'bg-brand-500/30' : 'bg-white/10'
                      }`}>
                        <Icon className={`w-5 h-5 ${form.preferredMatchType === value ? 'text-brand-400' : 'text-white/40'}`} />
                      </div>
                      <div>
                        <div className="font-semibold text-white text-sm">{label}</div>
                        <div className="text-white/40 text-xs">{desc}</div>
                      </div>
                      {form.preferredMatchType === value && (
                        <div className="ml-auto w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center">
                          <span className="text-white text-xs">✓</span>
                        </div>
                      )}
                    </motion.button>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(2)}
                    className="flex-1 glass border border-white/10 text-white/60 font-medium py-3.5 rounded-2xl hover:border-white/20 transition-all"
                  >
                    Back
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex-1 bg-gradient-to-r from-brand-600 to-brand-500 text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Start Chatting! 🎉</>}
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
