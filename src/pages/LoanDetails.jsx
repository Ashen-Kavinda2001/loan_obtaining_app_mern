import { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle, Clock, Search } from 'lucide-react';
import { demoLoans, demoPayments, formatCurrency } from '../data/demoData';

const TABS = ['all', 'active', 'completed', 'overdue'];

export default function LoanDetails() {
  const [activeTab, setActiveTab] = useState('all');
  const [expanded, setExpanded]   = useState(null);
  const [payments, setPayments]   = useState(demoPayments);
  const [search, setSearch]       = useState('');

  const filtered = demoLoans.filter(l => {
    const matchTab    = activeTab === 'all' || l.status === activeTab;
    const matchSearch = l.memberName.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  const getLoanPayments = (loanId) => payments.filter(p => p.loanId === loanId);

  const markPaid = (paymentId) => {
    setPayments(prev => prev.map(p =>
      p._id === paymentId
        ? { ...p, status: 'paid', amountPaid: p.amountDue, paidAt: new Date().toISOString() }
        : p
    ));
  };

  const tabCount = (tab) =>
    tab === 'all' ? demoLoans.length : demoLoans.filter(l => l.status === tab).length;

  return (
    <div className="page-content">

      {/* ── Tab bar ── */}
      <div className="tab-bar" style={{ marginBottom: 16 }}>
        {TABS.map(tab => (
          <button
            key={tab}
            className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            <span style={{
              marginLeft: 5,
              background: activeTab === tab ? '#EEF2FF' : '#F1F5F9',
              color:      activeTab === tab ? '#4F46E5' : '#94A3B8',
              padding: '1px 6px', borderRadius: 100, fontSize: 11, fontWeight: 700
            }}>{tabCount(tab)}</span>
          </button>
        ))}
      </div>

      {/* ── Search ── */}
      <div style={{ marginBottom: 16 }}>
        <div className="search-wrapper">
          <Search size={15} />
          <input
            className="form-control search-input"
            style={{ width: '100%' }}
            placeholder="Search by member name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ── Loan cards ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.length === 0 && (
          <div className="card">
            <div className="empty-state"><p>No loans found.</p></div>
          </div>
        )}

        {filtered.map(loan => {
          const loanPayments = getLoanPayments(loan._id);
          const isExpanded   = expanded === loan._id;
          const paidMonths   = loanPayments.filter(p => p.status === 'paid').length;
          const progress     = loan.loanDuration > 0 ? (paidMonths / loan.loanDuration) * 100 : 0;

          return (
            <div key={loan._id} className="card" style={{ padding: 0, overflow: 'hidden' }}>

              {/* ── Loan summary row (clickable) ── */}
              <div
                style={{ padding: '16px 18px', cursor: 'pointer' }}
                onClick={() => setExpanded(isExpanded ? null : loan._id)}
              >
                {/* Top: avatar + name + status + chevron */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg, #4F46E5, #818CF8)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 700, fontSize: 15
                  }}>
                    {loan.memberName.charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{loan.memberName}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{loan.memberVillage}</div>
                  </div>
                  <span className={`badge badge-${loan.status}`}>{loan.status}</span>
                  {isExpanded
                    ? <ChevronUp size={16} color="#94A3B8" style={{ flexShrink: 0 }} />
                    : <ChevronDown size={16} color="#94A3B8" style={{ flexShrink: 0 }} />}
                </div>

                {/* Loan stats grid — 2×2 on mobile, 4 in a row on desktop */}
                <div className="loan-stats-grid">
                  <div className="loan-stat-item">
                    <span className="loan-stat-label">Loan Amount</span>
                    <span className="loan-stat-value">{formatCurrency(loan.loanAmount)}</span>
                  </div>
                  <div className="loan-stat-item">
                    <span className="loan-stat-label">Monthly</span>
                    <span className="loan-stat-value">{formatCurrency(loan.monthlyInstallment)}</span>
                  </div>
                  <div className="loan-stat-item">
                    <span className="loan-stat-label">Remaining</span>
                    <span className="loan-stat-value" style={{ color: loan.remainingBalance > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                      {formatCurrency(loan.remainingBalance)}
                    </span>
                  </div>
                  <div className="loan-stat-item">
                    <span className="loan-stat-label">Duration</span>
                    <span className="loan-stat-value">{loan.loanDuration} months</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>
                    <span>{paidMonths} of {loan.loanDuration} months paid</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div style={{ height: 6, background: '#F1F5F9', borderRadius: 100, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${progress}%`, borderRadius: 100,
                      background: loan.status === 'overdue'
                        ? 'var(--color-danger)'
                        : loan.status === 'completed'
                        ? 'var(--color-success)'
                        : 'var(--color-primary)',
                      transition: 'width 0.5s ease'
                    }} />
                  </div>
                </div>
              </div>

              {/* ── Expanded payment schedule ── */}
              {isExpanded && (
                <div style={{ borderTop: '1px solid var(--color-border)' }}>
                  <div style={{ padding: '12px 18px 6px', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Payment Schedule
                  </div>

                  {loanPayments.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>
                      No payment records — generated when connected to backend.
                    </div>
                  ) : (
                    <>
                      {/* Desktop payment table */}
                      <div className="table-wrapper hide-on-mobile" style={{ borderRadius: 0, border: 'none' }}>
                        <table>
                          <thead>
                            <tr>
                              <th>Month</th>
                              <th>Due Date</th>
                              <th>Amount Due</th>
                              <th>Amount Paid</th>
                              <th>Paid On</th>
                              <th>Status</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {loanPayments.map(p => (
                              <tr key={p._id}>
                                <td style={{ fontWeight: 600 }}>Month {p.monthNumber}</td>
                                <td>{new Date(p.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                <td>{formatCurrency(p.amountDue)}</td>
                                <td>{p.amountPaid > 0 ? formatCurrency(p.amountPaid) : <span style={{ color: 'var(--color-text-muted)' }}>—</span>}</td>
                                <td style={{ color: 'var(--color-text-muted)' }}>
                                  {p.paidAt ? new Date(p.paidAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}
                                </td>
                                <td><span className={`badge badge-${p.status}`}>{p.status}</span></td>
                                <td>
                                  {p.status === 'pending' ? (
                                    <button className="btn btn-success btn-sm" onClick={() => markPaid(p._id)}>
                                      <CheckCircle size={13} /> Mark Paid
                                    </button>
                                  ) : p.status === 'paid' ? (
                                    <span style={{ fontSize: 12, color: 'var(--color-success)' }}>✓ Paid</span>
                                  ) : (
                                    <button className="btn btn-danger btn-sm"><Clock size={13} /> Overdue</button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile payment cards */}
                      <div className="show-on-mobile" style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {loanPayments.map(p => (
                          <div key={p._id} style={{
                            border: '1px solid var(--color-border)', borderRadius: 8, padding: '12px'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                              <span style={{ fontWeight: 700, fontSize: 13 }}>Month {p.monthNumber}</span>
                              <span className={`badge badge-${p.status}`}>{p.status}</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', fontSize: 12, marginBottom: 10 }}>
                              <div><span style={{ color: 'var(--color-text-muted)' }}>Due: </span>{new Date(p.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</div>
                              <div><span style={{ color: 'var(--color-text-muted)' }}>Amount: </span>{formatCurrency(p.amountDue)}</div>
                              {p.paidAt && <div><span style={{ color: 'var(--color-text-muted)' }}>Paid on: </span>{new Date(p.paidAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</div>}
                              {p.amountPaid > 0 && <div><span style={{ color: 'var(--color-text-muted)' }}>Paid: </span>{formatCurrency(p.amountPaid)}</div>}
                            </div>
                            {p.status === 'pending' && (
                              <button className="btn btn-success btn-sm" style={{ width: '100%', justifyContent: 'center' }} onClick={() => markPaid(p._id)}>
                                <CheckCircle size={13} /> Mark as Paid
                              </button>
                            )}
                            {p.status === 'paid' && (
                              <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--color-success)', fontWeight: 600 }}>✓ Payment Completed</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
