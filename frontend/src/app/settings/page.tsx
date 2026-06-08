'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, User, Bell, Shield, Eye, EyeOff, LogOut,
  Crown, ChevronRight, Moon, Globe, Trash2, Heart
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { usersApi, authApi } from '@/lib/api';
import { getInitials } from '@/lib/utils';

export default function SettingsPage() {
  const router = useRouter();
  const { user, updateUser, logout, isGuest } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    displayName: user?.displayName || '',
    anonymousMode: user?.anonymousMode ?? true,
    showCity: true,
    showState: true,
  });

  useEffect(() => {
    if (isGuest) router.replace('/login');
  }, [isGuest, router]);

  if (isGuest) return null;

  const handleSave = async () => {
    setLoading(true);
    try {
      await usersApi.updateProfile(form);
      updateUser({ displayName: form.displayName, anonymousMode: form.anonymousMode });
      toast.success('Settings saved!');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } finally {
      logout();
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-lg mx-auto">
        <Link href="/video-chat" className="inline-flex items-center gap-2 text-white/40 hover:text-white transition-colors mb-8 text-sm">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>

        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-3xl p-6 border border-white/10 mb-6"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-pink-500 flex items-center justify-center text-2xl font-black text-white">
              {user ? getInitials(user.displayName) : '?'}
            </div>
            <div>
              <div className="text-white font-bold text-lg">{user?.displayName}</div>
              <div className="text-white/40 text-sm">{user?.email || user?.phone}</div>
              {user?.isPremium && (
                <div className="flex items-center gap-1.5 mt-1">
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-amber-400 text-xs font-semibold">Premium</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-white/50 text-sm mb-2 block">Display Name</label>
              <input
                type="text"
                value={form.displayName}
                onChange={e => setForm(prev => ({ ...prev, displayName: e.target.value.slice(0, 50) }))}
                className="w-full bg-white/5 rounded-xl border border-white/10 px-4 py-3 text-white placeholder-white/20 outline-none focus:border-brand-500/50 transition-colors text-sm"
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSave}
              disabled={loading}
              className="w-full bg-gradient-to-r from-brand-600 to-brand-500 text-white font-bold py-3 rounded-xl text-sm disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </motion.button>
          </div>
        </motion.div>

        {/* Privacy Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-3xl p-6 border border-white/10 mb-6"
        >
          <h2 className="text-white font-bold mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4 text-brand-400" />
            Privacy
          </h2>

          <div className="space-y-3">
            {[
              { key: 'anonymousMode', label: 'Anonymous Mode', desc: 'Hide your real name and use display name only', icon: EyeOff },
              { key: 'showCity', label: 'Show City', desc: 'Let matches see your city', icon: Globe },
              { key: 'showState', label: 'Show State', desc: 'Let matches see your state', icon: Globe },
            ].map(({ key, label, desc, icon: Icon }) => (
              <div key={key} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                <div className="flex items-start gap-3">
                  <Icon className="w-4 h-4 text-white/40 mt-0.5" />
                  <div>
                    <div className="text-white text-sm font-medium">{label}</div>
                    <div className="text-white/30 text-xs">{desc}</div>
                  </div>
                </div>
                <button
                  onClick={() => setForm(prev => ({ ...prev, [key]: !prev[key as keyof typeof form] }))}
                  className={`w-12 h-6 rounded-full transition-all relative ${
                    form[key as keyof typeof form] ? 'bg-brand-500' : 'bg-white/10'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all ${
                    form[key as keyof typeof form] ? 'left-6' : 'left-0.5'
                  }`} />
                </button>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Account Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-3xl border border-white/10 overflow-hidden mb-6"
        >
          {!user?.isPremium && (
            <Link href="/subscription">
              <div className="flex items-center justify-between p-5 hover:bg-white/5 transition-colors border-b border-white/5 cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center">
                    <Crown className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <div className="text-white text-sm font-medium">Upgrade to Premium</div>
                    <div className="text-white/30 text-xs">Unlimited skips, no ads</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-white/20" />
              </div>
            </Link>
          )}

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 p-5 hover:bg-white/5 transition-colors text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-red-500/20 flex items-center justify-center">
              <LogOut className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <div className="text-red-400 text-sm font-medium">Sign Out</div>
              <div className="text-white/30 text-xs">Sign out of your account</div>
            </div>
          </button>
        </motion.div>

        <div className="text-center text-white/15 text-xs">
          Flirtigo v1.0 · India only · 18+
        </div>
      </div>
    </div>
  );
}
