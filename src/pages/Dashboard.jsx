import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, CreditCard, DollarSign,
  TrendingUp, TrendingDown, ArrowUpRight, CheckCircle, PlusCircle
} from 'lucide-react';
import client from '../api/client';
import { formatCurrency } from '../data/demoData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// "2026-09-28" → "28 Sep" (weekStart is a local date string, so parse it as local, not UTC)
const weekLabel = (weekStart) => {
  const [y, m, d] = weekStart.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};

export default function Dashboard() {
  const [stats, setStats]   = useState(null);
  const [loans, setLoans]   = useState([]);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [statsRes, loansRes, collectionsRes] = await Promise.all([
          client.get('/loans/stats'),
          client.get('/loans'),
          client.get('/loans/collections', { params: { weeks: 8 } }).catch(() => ({ data: [] })),
        ]);
        setStats(statsRes?.data || null);
        setLoans(Array.isArray(loansRes?.data) ? loansRes.data : []);
        setCollections(Array.isArray(collectionsRes?.data) ? collectionsRes.data : []);
      } catch (err) {
        console.error('Dashboard fetch error', err);
        setLoans([]);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  // B15: cash actually collected per week (Monday to Sunday), oldest first, current week last
  const chartData = collections.map(w => ({ week: weekLabel(w.weekStart), collected: w.amount }));
  const thisWeek = collections[collections.length - 1]?.amount ?? 0;
  const lastWeek = collections[collections.length - 2]?.amount ?? 0;
  const weekChange = lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : null;

  if (loading) return (
    <div className="page-content">
      <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-text-muted)' }}>Loading dashboard…</div>
    </div>
  );

  const loansList = Array.isArray(loans) ? loans : [];
  const activeLoans = loansList.filter(l => l.status !== 'completed');

  return (
    <div className="page-content">

      {/* ── Stat Cards ── */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#EEF2FF' }}>
            <Users size={22} color="#4F46E5" />
          </div>
          <div className="stat-info">
            <div className="stat-label">Total Members</div>
            <div className="stat-value">{stats?.totalMembers ?? 0}</div>
            <div className="stat-sub">Registered in system</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#D1FAE5' }}>
            <CreditCard size={22} color="#10B981" />
          </div>
          <div className="stat-info">
            <div className="stat-label">Active Loans</div>
            <div className="stat-value">{stats?.activeLoans ?? 0}</div>
            <div className="stat-sub">{stats?.overdueLoans ?? 0} overdue</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#FEF3C7' }}>
            <DollarSign size={22} color="#F59E0B" />
          </div>
          <div className="stat-info">
            <div className="stat-label">Total Lent</div>
            <div className="stat-value" style={{ fontSize: 16 }}>{formatCurrency(stats?.totalAmountLent ?? 0)}</div>
            <div className="stat-sub">All time</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#DCFCE7' }}>
            <CheckCircle size={22} color="#16A34A" />
          </div>
          <div className="stat-info">
            <div className="stat-label">Received from Members</div>
            <div className="stat-value" style={{ fontSize: 16 }}>
              {formatCurrency(
                stats?.totalReceivedAmount ??
                stats?.totalAmountReceived ??
                loansList.reduce((sum, l) => sum + parseFloat(l.paidAmount || 0), 0)
              )}
            </div>
            <div className="stat-sub">Total payments collected</div>
          </div>
        </div>
      </div>

      {/* ── Chart + Recent Activity ── */}
      <div className="dashboard-grid">
        {/* Bar Chart */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Weekly Collections</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Payments received per week (last 8 weeks)</div>
            </div>
            {weekChange !== null && (
              <div style={{ fontSize: 13, fontWeight: 600, color: weekChange >= 0 ? 'var(--color-success)' : 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: 4 }}>
                {weekChange >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {weekChange >= 0 ? '+' : ''}{weekChange}% vs last week
              </div>
            )}
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} barSize={24}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="week" axisLine={false} tickLine={false} style={{ fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} style={{ fontSize: 11 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} width={36} />
              <Tooltip
                formatter={(v) => [formatCurrency(v), 'Collected']}
                contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12 }}
              />
              <Bar dataKey="collected" fill="#4F46E5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Recent Activity</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(stats?.recentActivity || []).length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>No recent activity.</div>
            ) : (stats.recentActivity).map((act) => (
              <div key={act.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: '#D1FAE5'
                }}>
                  <CheckCircle size={15} color="#10B981" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{act.member}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{act.note} · {formatCurrency(act.amount)}</div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {new Date(act.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Quick Actions ── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Quick Actions</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link to="/register"   className="btn btn-primary" ><PlusCircle  size={14} /> Register Member</Link>
          <Link to="/grant-loan" className="btn btn-success" ><CreditCard  size={14} /> Grant Loan</Link>
          <Link to="/members"    className="btn btn-outline" ><Users       size={14} /> Members</Link>
          <Link to="/loans"      className="btn btn-outline" ><ArrowUpRight size={14} /> All Loans</Link>
        </div>
      </div>

      {/* ── Active Loans Overview ── */}
      <div className="card">
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Active Loans Overview</div>

        {/* Desktop table */}
        <div className="table-wrapper hide-on-mobile">
          <table>
            <thead>
              <tr>
                <th>Member</th>
                <th>Village</th>
                <th>Loan Amount</th>
                <th>Weekly</th>
                <th>Balance</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {activeLoans.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 24 }}>No active loans.</td></tr>
              ) : activeLoans.map(loan => (
                <tr key={loan._id}>
                  <td style={{ fontWeight: 600 }}>{loan.memberName}</td>
                  <td style={{ color: 'var(--color-text-muted)' }}>{loan.memberVillage}</td>
                  <td>{formatCurrency(loan.loanAmount)}</td>
                  <td>{formatCurrency(loan.monthlyInstallment)}</td>
                  <td style={{ fontWeight: 600 }}>{formatCurrency(loan.remainingBalance)}</td>
                  <td><span className={`badge badge-${loan.status}`}>{loan.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="mobile-cards show-on-mobile">
          {activeLoans.map(loan => (
            <div key={loan._id} className="mobile-loan-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{loan.memberName}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{loan.memberVillage}</div>
                </div>
                <span className={`badge badge-${loan.status}`}>{loan.status}</span>
              </div>
              <div className="mobile-loan-stats">
                <div><span className="mobile-stat-label">Amount</span><span className="mobile-stat-value">{formatCurrency(loan.loanAmount)}</span></div>
                <div><span className="mobile-stat-label">Weekly</span><span className="mobile-stat-value">{formatCurrency(loan.monthlyInstallment)}</span></div>
                <div><span className="mobile-stat-label">Balance</span><span className="mobile-stat-value" style={{ color: 'var(--color-danger)' }}>{formatCurrency(loan.remainingBalance)}</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
