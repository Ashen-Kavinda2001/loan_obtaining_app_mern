import { Link } from 'react-router-dom';
import {
  Users, CreditCard, DollarSign, AlertCircle,
  TrendingUp, ArrowUpRight, CheckCircle, PlusCircle
} from 'lucide-react';
import { dashboardStats, recentActivity, demoLoans, formatCurrency } from '../data/demoData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const chartData = [
  { month: 'Dec', collected: 28000 },
  { month: 'Jan', collected: 35000 },
  { month: 'Feb', collected: 42000 },
  { month: 'Mar', collected: 31000 },
  { month: 'Apr', collected: 48000 },
  { month: 'May', collected: 16250 },
];

export default function Dashboard() {
  const stats = dashboardStats;
  const activeLoans = demoLoans.filter(l => l.status !== 'completed');

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
            <div className="stat-value">{stats.totalMembers}</div>
            <div className="stat-sub">+2 this month</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#D1FAE5' }}>
            <CreditCard size={22} color="#10B981" />
          </div>
          <div className="stat-info">
            <div className="stat-label">Active Loans</div>
            <div className="stat-value">{stats.activeLoans}</div>
            <div className="stat-sub">{stats.overdueLoans} overdue</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#FEF3C7' }}>
            <DollarSign size={22} color="#F59E0B" />
          </div>
          <div className="stat-info">
            <div className="stat-label">Total Lent</div>
            <div className="stat-value" style={{ fontSize: 16 }}>{formatCurrency(stats.totalAmountLent)}</div>
            <div className="stat-sub">All time</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#FEE2E2' }}>
            <AlertCircle size={22} color="#EF4444" />
          </div>
          <div className="stat-info">
            <div className="stat-label">Pending</div>
            <div className="stat-value">{stats.pendingPayments}</div>
            <div className="stat-sub">Requires follow-up</div>
          </div>
        </div>
      </div>

      {/* ── Chart + Recent Activity ── */}
      <div className="dashboard-grid">
        {/* Bar Chart */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Monthly Collections</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Payments received per month</div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <TrendingUp size={14} />+18% vs last month
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} barSize={24}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} style={{ fontSize: 11 }} />
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
            {recentActivity.map((act) => (
              <div key={act.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: act.type === 'payment' ? '#D1FAE5' : act.type === 'loan' ? '#EEF2FF' : '#DBEAFE'
                }}>
                  {act.type === 'payment'  && <CheckCircle size={15} color="#10B981" />}
                  {act.type === 'loan'     && <CreditCard  size={15} color="#4F46E5" />}
                  {act.type === 'complete' && <CheckCircle size={15} color="#3B82F6" />}
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

      {/* ── Active Loans — TABLE on desktop, CARDS on mobile ── */}
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
                <th>Monthly</th>
                <th>Balance</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {activeLoans.map(loan => (
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
                <div><span className="mobile-stat-label">Monthly</span><span className="mobile-stat-value">{formatCurrency(loan.monthlyInstallment)}</span></div>
                <div><span className="mobile-stat-label">Balance</span><span className="mobile-stat-value" style={{ color: 'var(--color-danger)' }}>{formatCurrency(loan.remainingBalance)}</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
