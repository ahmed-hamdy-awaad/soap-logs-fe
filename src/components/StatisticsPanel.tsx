import React, { useState } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { ChevronDown, ChevronUp, TrendingUp, CheckCircle, AlertTriangle, Activity } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

export interface CountByLabel {
  label: string;
  count: number;
}

export interface ServiceLatency {
  serviceName: string;
  avgLatencyMs: number;
  callCount: number;
}

export interface LogStatistics {
  statusBreakdown: CountByLabel[];
  httpStatusBreakdown: CountByLabel[];
  avgLatencyByService: ServiceLatency[];
  callsByService: CountByLabel[];
  overallAvgLatencyMs: number;
  errorCount: number;
  successCount: number;
}

interface Props {
  stats: LogStatistics;
  totalItems: number;
}

// ── Colour palettes ──────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  Pending:      '#f59e0b',
  Resolved:     '#10b981',
  Investigating:'#3b82f6',
  Ignored:      '#6b7280',
};

const HTTP_COLORS: Record<string, string> = {
  '200': '#10b981',
  '201': '#34d399',
  '400': '#f59e0b',
  '401': '#fb923c',
  '403': '#f97316',
  '404': '#ef4444',
  '500': '#dc2626',
  '503': '#b91c1c',
};

const FALLBACK_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe'];

function colorForHttp(code: string): string {
  return HTTP_COLORS[code] ?? FALLBACK_COLORS[parseInt(code, 10) % FALLBACK_COLORS.length];
}

// ── Custom tooltip ────────────────────────────────────────────────────────────

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(15, 23, 42, 0.95)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '8px',
      padding: '10px 14px',
      fontSize: '0.82rem',
      color: '#e2e8f0',
    }}>
      {label && <div style={{ fontWeight: 700, marginBottom: '4px', color: '#94a3b8' }}>{label}</div>}
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.fill ?? p.color, display: 'inline-block' }} />
          <span style={{ color: '#cbd5e1' }}>{p.name}:</span>
          <span style={{ fontWeight: 700, color: '#f1f5f9' }}>
            {typeof p.value === 'number' && p.name?.toLowerCase().includes('latency')
              ? `${p.value.toFixed(1)} ms`
              : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

// ── Stat card ─────────────────────────────────────────────────────────────────

const StatCard: React.FC<{ label: string; value: string | number; sub?: string; color?: string; icon: React.ReactNode }> = ({
  label, value, sub, color = '#3b82f6', icon,
}) => (
  <div style={{
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '12px',
    padding: '18px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    flex: '1 1 160px',
    minWidth: 0,
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      <span style={{ color }}>{icon}</span>
      {label}
    </div>
    <div style={{ fontSize: '1.8rem', fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
    {sub && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{sub}</div>}
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────

export const StatisticsPanel: React.FC<Props> = ({ stats, totalItems }) => {
  const [collapsed, setCollapsed] = useState(false);

  const errorRate = totalItems > 0 ? ((stats.errorCount / totalItems) * 100).toFixed(1) : '0.0';
  const successRate = totalItems > 0 ? ((stats.successCount / totalItems) * 100).toFixed(1) : '0.0';

  // Pie data for status breakdown
  const statusPieData = stats.statusBreakdown.map(s => ({
    name: s.label,
    value: s.count,
  }));

  // Pie data for HTTP status
  const httpPieData = stats.httpStatusBreakdown.map(h => ({
    name: `HTTP ${h.label}`,
    value: h.count,
    code: h.label,
  }));

  // Bar data for calls by service
  const callsBarData = stats.callsByService.map(s => ({
    name: s.label.length > 16 ? s.label.slice(0, 14) + '…' : s.label,
    fullName: s.label,
    Calls: s.count,
  }));

  // Bar data for avg latency by service
  const latencyBarData = stats.avgLatencyByService.map(s => ({
    name: s.serviceName.length > 16 ? s.serviceName.slice(0, 14) + '…' : s.serviceName,
    fullName: s.serviceName,
    'Avg Latency (ms)': Math.round(s.avgLatencyMs),
  }));

  const hasData = totalItems > 0;

  return (
    <div className="glass-panel" style={{ marginBottom: '24px', borderRadius: '12px', overflow: 'hidden' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: collapsed ? 'none' : '1px solid var(--border)',
          cursor: 'pointer', userSelect: 'none',
        }}
        onClick={() => setCollapsed(c => !c)}
        role="button"
        aria-expanded={!collapsed}
        aria-label="Toggle statistics panel"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <TrendingUp size={18} style={{ color: 'var(--accent-light)' }} />
          <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Query Statistics</span>
          <span style={{
            background: 'rgba(99,102,241,0.15)', color: '#818cf8',
            border: '1px solid rgba(99,102,241,0.3)',
            borderRadius: '20px', padding: '1px 10px', fontSize: '0.75rem', fontWeight: 700,
          }}>
            {totalItems.toLocaleString()} logs
          </span>
        </div>
        <span style={{ color: 'var(--text-secondary)' }}>
          {collapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
        </span>
      </div>

      {!collapsed && (
        <div style={{ padding: '20px' }}>
          {!hasData ? (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              No data to display — apply filters and search to see statistics.
            </div>
          ) : (
            <>
              {/* KPI cards row */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '28px' }}>
                <StatCard
                  label="Total Logs"
                  value={totalItems.toLocaleString()}
                  icon={<Activity size={15} />}
                  color="#6366f1"
                />
                <StatCard
                  label="Success Rate"
                  value={`${successRate}%`}
                  sub={`${stats.successCount.toLocaleString()} successful calls`}
                  icon={<CheckCircle size={15} />}
                  color="#10b981"
                />
                <StatCard
                  label="Error Rate"
                  value={`${errorRate}%`}
                  sub={`${stats.errorCount.toLocaleString()} failed calls (4xx/5xx)`}
                  icon={<AlertTriangle size={15} />}
                  color={stats.errorCount > 0 ? '#ef4444' : '#6b7280'}
                />
                <StatCard
                  label="Avg Latency"
                  value={`${stats.overallAvgLatencyMs.toFixed(1)} ms`}
                  sub="across all matched logs"
                  icon={<TrendingUp size={15} />}
                  color={stats.overallAvgLatencyMs > 500 ? '#f59e0b' : '#3b82f6'}
                />
              </div>

              {/* Charts grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>

                {/* Tracking Status — Pie */}
                {statusPieData.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Tracking Status Distribution
                    </div>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={statusPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={3}
                          dataKey="value"
                          nameKey="name"
                        >
                          {statusPieData.map((entry, i) => (
                            <Cell
                              key={entry.name}
                              fill={STATUS_COLORS[entry.name] ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip content={<ChartTooltip />} />
                        <Legend
                          iconType="circle"
                          iconSize={8}
                          wrapperStyle={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* HTTP Status — Pie */}
                {httpPieData.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      HTTP Status Code Distribution
                    </div>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={httpPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={3}
                          dataKey="value"
                          nameKey="name"
                        >
                          {httpPieData.map((entry) => (
                            <Cell key={entry.name} fill={colorForHttp(entry.code)} />
                          ))}
                        </Pie>
                        <Tooltip content={<ChartTooltip />} />
                        <Legend
                          iconType="circle"
                          iconSize={8}
                          wrapperStyle={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Calls by Service — Bar */}
                {callsBarData.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Calls by Service (top 10)
                    </div>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={callsBarData} margin={{ top: 4, right: 8, left: -10, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis
                          dataKey="name"
                          tick={{ fill: '#94a3b8', fontSize: 11 }}
                          angle={-35}
                          textAnchor="end"
                          interval={0}
                        />
                        <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} allowDecimals={false} />
                        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                        <Bar dataKey="Calls" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Avg Latency by Service — Bar */}
                {latencyBarData.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Avg Latency by Service (ms)
                    </div>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={latencyBarData} margin={{ top: 4, right: 8, left: -10, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis
                          dataKey="name"
                          tick={{ fill: '#94a3b8', fontSize: 11 }}
                          angle={-35}
                          textAnchor="end"
                          interval={0}
                        />
                        <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                        <Bar dataKey="Avg Latency (ms)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
