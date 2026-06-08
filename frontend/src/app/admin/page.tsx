'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Flag, TrendingUp, DollarSign, Shield, Ban, CheckCircle,
  XCircle, Eye, Search, Filter, RefreshCw, Activity, Heart,
  AlertTriangle, Video, MessageSquare
} from 'lucide-react';
import { adminApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { formatRelativeTime, formatCurrency } from '@/lib/utils';

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [tab, setTab] = useState<'overview' | 'users' | 'reports' | 'analytics'>('overview');
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.isAdmin) {
      router.replace('/video-chat');
      return;
    }
    loadDashboard();
  }, [user]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, reportsRes] = await Promise.all([
        adminApi.getDashboard(),
        adminApi.getUsers({ page: 1, limit: 20 }),
        adminApi.getReports({ page: 1, limit: 20, status: 'pending' }),
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data.users);
      setReports(reportsRes.data.reports);
    } catch {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleBanUser = async (userId: string, displayName: string) => {
    if (!confirm(`Ban ${displayName}?`)) return;
    try {
      await adminApi.banUser(userId, { reason: 'Admin ban', banType: 'permanent' });
      toast.success(`${displayName} banned`);
      loadDashboard();
    } catch {
      toast.error('Failed to ban user');
    }
  };

  const handleResolveReport = async (reportId: string, action: 'resolve' | 'dismiss') => {
    try {
      await adminApi.resolveReport(reportId, { action, notes: `Admin ${action}` });
      toast.success(`Report ${action}d`);
      setReports(prev => prev.filter(r => r.id !== reportId));
    } catch {
      toast.error('Failed to resolve report');
    }
  };

  if (!user?.isAdmin) return null;

  return (
    <div className="min-h-screen">
      {/* Admin Header */}
      <div className="glass border-b border-white/5 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
              <Heart className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="text-lg font-bold gradient-text-purple">Flirtigo Admin</span>
            <div className="glass rounded-full px-2.5 py-1 flex items-center gap-1.5 text-xs text-white/40">
              <Shield className="w-3 h-3 text-brand-400" />
              Admin Panel
            </div>
          </div>
          <button onClick={loadDashboard} className="glass rounded-xl p-2 hover:bg-white/10 transition-colors">
            <RefreshCw className="w-4 h-4 text-white/40" />
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex items-center gap-2 mb-8 glass rounded-2xl p-1.5 w-fit">
          {[
            { value: 'overview', label: 'Overview', icon: Activity },
            { value: 'users', label: 'Users', icon: Users },
            { value: 'reports', label: 'Reports', icon: Flag },
            { value: 'analytics', label: 'Analytics', icon: TrendingUp },
          ].map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setTab(value as any)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                tab === value ? 'bg-brand-600 text-white' : 'text-white/40 hover:text-white/70'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
              {value === 'reports' && reports.length > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                  {reports.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {tab === 'overview' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* Stats Grid */}
            {stats && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Total Users', value: stats.users?.total, sub: `+${stats.users?.new_today} today`, icon: Users, color: 'text-brand-400' },
                  { label: 'Active Now', value: stats.activeMatches, sub: 'live matches', icon: Video, color: 'text-green-400' },
                  { label: 'Pending Reports', value: stats.pendingReports, sub: 'need review', icon: Flag, color: 'text-red-400' },
                  { label: 'Monthly Revenue', value: formatCurrency(parseFloat(stats.revenue?.monthly || '0')), sub: 'this month', icon: DollarSign, color: 'text-amber-400' },
                ].map(({ label, value, sub, icon: Icon, color }) => (
                  <div key={label} className="glass rounded-2xl p-5 border border-white/5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-white/40 text-sm">{label}</span>
                      <Icon className={`w-5 h-5 ${color}`} />
                    </div>
                    <div className="text-2xl font-black text-white mb-1">{value || 0}</div>
                    <div className="text-white/30 text-xs">{sub}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Premium Users */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass rounded-2xl p-5 border border-white/5">
                  <div className="text-white/40 text-sm mb-2">Premium Users</div>
                  <div className="text-3xl font-black text-amber-400 mb-1">{stats.users?.premium || 0}</div>
                  <div className="text-white/20 text-xs">
                    {stats.users?.total > 0
                      ? `${Math.round((stats.users?.premium / stats.users?.total) * 100)}% of total users`
                      : '0%'}
                  </div>
                </div>
                <div className="glass rounded-2xl p-5 border border-white/5">
                  <div className="text-white/40 text-sm mb-2">Weekly Revenue</div>
                  <div className="text-3xl font-black text-green-400 mb-1">
                    {formatCurrency(parseFloat(stats.revenue?.weekly || '0'))}
                  </div>
                  <div className="text-white/20 text-xs">Last 7 days</div>
                </div>
                <div className="glass rounded-2xl p-5 border border-white/5">
                  <div className="text-white/40 text-sm mb-2">Banned Users</div>
                  <div className="text-3xl font-black text-red-400 mb-1">{stats.users?.banned || 0}</div>
                  <div className="text-white/20 text-xs">Total banned accounts</div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Users Tab */}
        {tab === 'users' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 flex items-center gap-2 glass rounded-xl border border-white/10 px-4 py-2.5 focus-within:border-brand-500/50 transition-colors">
                <Search className="w-4 h-4 text-white/30" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="flex-1 bg-transparent text-white placeholder-white/20 outline-none text-sm"
                />
              </div>
            </div>

            <div className="glass rounded-2xl border border-white/5 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left p-4 text-white/40 text-xs font-semibold uppercase">User</th>
                    <th className="text-left p-4 text-white/40 text-xs font-semibold uppercase hidden md:table-cell">Location</th>
                    <th className="text-left p-4 text-white/40 text-xs font-semibold uppercase">Status</th>
                    <th className="text-left p-4 text-white/40 text-xs font-semibold uppercase hidden lg:table-cell">Joined</th>
                    <th className="text-right p-4 text-white/40 text-xs font-semibold uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.filter(u =>
                    !search || u.display_name.toLowerCase().includes(search.toLowerCase()) || u.email?.includes(search)
                  ).map((u) => (
                    <tr key={u.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-pink-500 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                            {u.display_name[0]}
                          </div>
                          <div>
                            <div className="text-white text-sm font-medium flex items-center gap-2">
                              {u.display_name}
                              {u.is_premium && <span className="text-[10px] premium-badge text-black px-1.5 py-0.5 rounded-full font-black">PRO</span>}
                            </div>
                            <div className="text-white/30 text-xs">{u.email || u.phone}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 hidden md:table-cell">
                        <span className="text-white/50 text-sm">{[u.city, u.state].filter(Boolean).join(', ') || '—'}</span>
                      </td>
                      <td className="p-4">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                          u.status === 'active' ? 'bg-green-500/20 text-green-400' :
                          u.status === 'banned' ? 'bg-red-500/20 text-red-400' :
                          'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {u.status}
                        </span>
                      </td>
                      <td className="p-4 hidden lg:table-cell">
                        <span className="text-white/30 text-sm">{formatRelativeTime(u.created_at)}</span>
                      </td>
                      <td className="p-4 text-right">
                        {u.status !== 'banned' && (
                          <button
                            onClick={() => handleBanUser(u.id, u.display_name)}
                            className="glass border border-red-500/30 text-red-400 text-xs px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition-all"
                          >
                            Ban
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Reports Tab */}
        {tab === 'reports' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            {reports.length === 0 && (
              <div className="glass rounded-2xl p-12 border border-white/5 text-center">
                <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3 opacity-50" />
                <div className="text-white/30">No pending reports</div>
              </div>
            )}
            {reports.map((report) => (
              <div key={report.id} className="glass rounded-2xl p-5 border border-white/5 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
                  <Flag className="w-5 h-5 text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-white font-semibold text-sm">{report.reporter_name}</span>
                    <span className="text-white/30 text-sm">reported</span>
                    <span className="text-white font-semibold text-sm">{report.reported_name}</span>
                    <span className="glass rounded-full px-2 py-0.5 text-xs text-orange-300 border border-orange-500/20">
                      {report.reason.replace('_', ' ')}
                    </span>
                  </div>
                  {report.description && (
                    <p className="text-white/40 text-sm mb-3">{report.description}</p>
                  )}
                  <div className="text-white/20 text-xs">{formatRelativeTime(report.created_at)}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleResolveReport(report.id, 'resolve')}
                    className="flex items-center gap-1.5 glass border border-green-500/30 text-green-400 text-xs px-3 py-1.5 rounded-lg hover:bg-green-500/10 transition-all"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Resolve
                  </button>
                  <button
                    onClick={() => handleResolveReport(report.id, 'dismiss')}
                    className="flex items-center gap-1.5 glass border border-white/10 text-white/40 text-xs px-3 py-1.5 rounded-lg hover:bg-white/5 transition-all"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* Analytics Tab */}
        {tab === 'analytics' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="glass rounded-2xl p-8 border border-white/5 text-center">
              <TrendingUp className="w-12 h-12 text-brand-400 mx-auto mb-4 opacity-50" />
              <div className="text-white/40 mb-2">Analytics Dashboard</div>
              <div className="text-white/20 text-sm">
                Detailed charts and analytics coming soon. Currently tracking {stats?.users?.total || 0} users
                and {stats?.activeMatches || 0} active matches.
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
