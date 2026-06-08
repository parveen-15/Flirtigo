'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, Flag, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { reportsApi } from '@/lib/api';
import { formatRelativeTime } from '@/lib/utils';

export default function ReportCenterPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportsApi.getMyReports()
      .then(res => setReports(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const statusIcon = {
    pending: Clock,
    reviewed: AlertCircle,
    resolved: CheckCircle,
    dismissed: AlertCircle,
  };

  const statusColor = {
    pending: 'text-yellow-400',
    reviewed: 'text-blue-400',
    resolved: 'text-green-400',
    dismissed: 'text-white/30',
  };

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <Link href="/video-chat" className="inline-flex items-center gap-2 text-white/40 hover:text-white transition-colors mb-8 text-sm">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-2xl bg-red-500/20 flex items-center justify-center">
            <Flag className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Report Center</h1>
            <p className="text-white/40 text-sm">Your submitted reports</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="skeleton h-24 rounded-2xl" />)}
          </div>
        ) : reports.length === 0 ? (
          <div className="glass rounded-3xl p-12 border border-white/5 text-center">
            <Flag className="w-12 h-12 text-white/10 mx-auto mb-4" />
            <div className="text-white/30">No reports submitted</div>
            <p className="text-white/15 text-sm mt-2">Reports you submit will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => {
              const Icon = statusIcon[report.status as keyof typeof statusIcon] || Clock;
              const color = statusColor[report.status as keyof typeof statusColor] || 'text-white/40';
              return (
                <motion.div
                  key={report.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass rounded-2xl p-5 border border-white/5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-medium text-sm">Reported: {report.reported_name}</span>
                        <span className="glass rounded-full px-2 py-0.5 text-xs text-orange-300 border border-orange-500/20">
                          {report.reason.replace('_', ' ')}
                        </span>
                      </div>
                      {report.description && (
                        <p className="text-white/40 text-sm mb-2">{report.description}</p>
                      )}
                      <div className="text-white/20 text-xs">{formatRelativeTime(report.created_at)}</div>
                    </div>
                    <div className={`flex items-center gap-1.5 ${color}`}>
                      <Icon className="w-4 h-4" />
                      <span className="text-xs font-medium capitalize">{report.status}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
