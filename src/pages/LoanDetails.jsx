import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, CheckCircle, RotateCcw, Search } from 'lucide-react';
import client from '../api/client';
import { formatCurrency } from '../data/demoData';

const TABS = ['all', 'active', 'completed', 'overdue'];

export default function LoanDetails() {
  const [loans, setLoans]         = useState([]);
  const [payments, setPayments]   = useState({});
  const [activeTab, setActiveTab] = useState('all');
  const [expanded, setExpanded]   = useState(null);
  const [search, setSearch]       = useState('');
  const [loading, setLoading]     = useState(true);
  const [loadingPayments, setLoadingPayments] = useState({});
  // Stores the typed "amount paid" per payment row: { paymentId: string }
  const [amountInputs, setAmountInputs] = useState({});

  // ── Fetch all loans ──────────────────────────────────────
  useEffect(() => {
    client.get('/loans')
      .then(({ data }) => setLoans(data))
      .catch(() => console.error('Failed to load loans'))
      .finally(() => setLoading(false));
  }, []);

  // ── Fetch payments when a loan row is expanded ───────────
  const loadPayments = async (loanId) => {
    if (payments[loanId]) return;
    setLoadingPayments(prev => ({ ...prev, [loanId]: true }));
    try {
      const { data } = await client.get(`/payments?loanId=${loanId}`);
      setPayments(prev => ({ ...prev, [loanId]: data }));
    } catch {
      console.error('Failed to load payments');
    } finally {
      setLoadingPayments(prev => ({ ...prev, [loanId]: false }));
    }
  };

  const handleExpand = (loanId) => {
    if (expanded === loanId) { setExpanded(null); return; }
    setExpanded(loanId);
    loadPayments(loanId);
  };

  // Re-fetch both loans list and payment rows after any mutation
  const refresh = async (loanId) => {
    const [{ data: updatedLoans }, { data: updatedPayments }] = await Promise.all([
      client.get('/loans'),
      client.get(`/payments?loanId=${loanId}`),
    ]);
    setLoans(updatedLoans);
    setPayments(prev => ({ ...prev, [loanId]: updatedPayments }));
  };

  // ── Mark a payment as PAID ────────────────────────────────
  const markPaid = async (p, loanId) => {
    const raw    = amountInputs[p._id];
    const amount = parseFloat(raw);
    if (!raw || isNaN(amount) || amount <= 0) {
      alert('Please enter the amount paid before marking as paid.');
      return;
    }
    try {
      await client.patch(`/payments/${p._id}/pay`, { amountPaid: amount });
      setAmountInputs(prev => { const n = { ...prev }; delete n[p._id]; return n; });
      await refresh(loanId);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to mark payment');
    }
  };

  // ── Revert a PAID payment back to pending ─────────────────
  const markUnpaid = async (p, loanId) => {
    if (!window.confirm('Revert this payment to pending? The loan balance will be updated.')) return;
    try {
      await client.patch(`/payments/${p._id}/unpay`);
      await refresh(loanId);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to revert payment');
    }
  };

  const filtered = loans.filter(l => {
    const matchTab    = activeTab === 'all' || l.status === activeTab;
    const matchSearch = l.memberName.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  const tabCount = (tab) =>
    tab === 'all' ? loans.length : loans.filter(l => l.status === tab).length;

  if (loading) return (
    <div className="page-content">
      <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-text-muted)' }}>Loading loans…</div>
    </div>
  );

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
          const loanPayments = payments[loan._id] || [];
          const isExpanded   = expanded === loan._id;
          const paidMonths   = loanPayments.filter(p => p.status === 'paid').length;
          const progress     = loan.loanDuration > 0 ? (paidMonths / loan.loanDuration) * 100 : 0;

          return (
            <div key={loan._id} className="card" style={{ padding: 0, overflow: 'hidden' }}>

              {/* ── Loan summary row (clickable header) ── */}
              <div style={{ padding: '16px 18px', cursor: 'pointer' }} onClick={() => handleExpand(loan._id)}>
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
                      background: loan.status === 'overdue' ? 'var(--color-danger)' : loan.status === 'completed' ? 'var(--color-success)' : 'var(--color-primary)',
                      transition: 'width 0.5s ease'
                    }} />
                  </div>
                </div>
              </div>

              {/* ── Expanded: Payment schedule table ── */}
              {isExpanded && (
                <div style={{ borderTop: '1px solid var(--color-border)' }}>
                  <div style={{ padding: '12px 18px 6px', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Payment Schedule
                  </div>

                  {loadingPayments[loan._id] ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>Loading payments…</div>
                  ) : loanPayments.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>No payment records found.</div>
                  ) : (
                    <>
                      {/* ── Desktop table ── */}
                      <div className="table-wrapper hide-on-mobile" style={{ borderRadius: 0, border: 'none' }}>
                        <table>
                          <thead>
                            <tr>
                              <th>Month</th>
                              <th>Amount Paid</th>
                              <th>Short Amount</th>
                              <th>Paid On</th>
                              <th>Status</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {loanPayments.map(p => {
                              const isPaid    = p.status === 'paid';
                              const shortfall = isPaid ? Math.max(0, p.amountDue - p.amountPaid) : 0;

                              return (
                                <tr key={p._id}>
                                  {/* Month */}
                                  <td style={{ fontWeight: 600 }}>Month {p.monthNumber}</td>

                                  {/* Amount Paid — input when unpaid, value when paid */}
                                  <td>
                                    {isPaid ? (
                                      <span style={{ fontWeight: 600, color: shortfall > 0 ? '#D97706' : 'var(--color-success)' }}>
                                        {formatCurrency(p.amountPaid)}
                                      </span>
                                    ) : (
                                      <input
                                        type="number"
                                        min="1"
                                        placeholder={`Rs. ${p.amountDue}`}
                                        value={amountInputs[p._id] || ''}
                                        onChange={e => setAmountInputs(prev => ({ ...prev, [p._id]: e.target.value }))}
                                        onClick={e => e.stopPropagation()}
                                        style={{
                                          width: 120, padding: '5px 8px', fontSize: 13,
                                          border: '1px solid var(--color-border)', borderRadius: 6,
                                          outline: 'none', fontFamily: 'inherit'
                                        }}
                                      />
                                    )}
                                  </td>

                                  {/* Short Amount */}
                                  <td>
                                    {isPaid && shortfall > 0 ? (
                                      <span style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 4,
                                        color: '#D97706', fontWeight: 600, fontSize: 13
                                      }}>
                                        ⚠ {formatCurrency(shortfall)}
                                      </span>
                                    ) : (
                                      <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                                    )}
                                  </td>

                                  {/* Paid On */}
                                  <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
                                    {p.paidAt
                                      ? new Date(p.paidAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                                      : '—'}
                                  </td>

                                  {/* Status badge */}
                                  <td>
                                    <span className={`badge badge-${p.status}`}>
                                      {isPaid && shortfall > 0 ? 'partial' : p.status}
                                    </span>
                                  </td>

                                  {/* Action — toggle button only */}
                                  <td>
                                    {isPaid ? (
                                      <button
                                        className="btn btn-sm"
                                        style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', gap: 4 }}
                                        onClick={e => { e.stopPropagation(); markUnpaid(p, loan._id); }}
                                      >
                                        <RotateCcw size={12} /> Mark Unpaid
                                      </button>
                                    ) : (
                                      <button
                                        className="btn btn-success btn-sm"
                                        onClick={e => { e.stopPropagation(); markPaid(p, loan._id); }}
                                      >
                                        <CheckCircle size={13} /> Mark Paid
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* ── Mobile cards ── */}
                      <div className="show-on-mobile" style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {loanPayments.map(p => {
                          const isPaid    = p.status === 'paid';
                          const shortfall = isPaid ? Math.max(0, p.amountDue - p.amountPaid) : 0;

                          return (
                            <div key={p._id} style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: '12px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                <span style={{ fontWeight: 700, fontSize: 13 }}>Month {p.monthNumber}</span>
                                <span className={`badge badge-${p.status}`}>
                                  {isPaid && shortfall > 0 ? 'partial' : p.status}
                                </span>
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', fontSize: 12, marginBottom: 10 }}>
                                {/* Amount Paid */}
                                <div style={{ gridColumn: '1/-1' }}>
                                  <div style={{ color: 'var(--color-text-muted)', marginBottom: 4 }}>Amount Paid</div>
                                  {isPaid ? (
                                    <span style={{ fontWeight: 600, color: shortfall > 0 ? '#D97706' : 'var(--color-success)' }}>
                                      {formatCurrency(p.amountPaid)}
                                    </span>
                                  ) : (
                                    <input
                                      type="number"
                                      min="1"
                                      placeholder={`Rs. ${p.amountDue}`}
                                      value={amountInputs[p._id] || ''}
                                      onChange={e => setAmountInputs(prev => ({ ...prev, [p._id]: e.target.value }))}
                                      style={{
                                        width: '100%', padding: '7px 10px', fontSize: 13,
                                        border: '1px solid var(--color-border)', borderRadius: 6,
                                        outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit'
                                      }}
                                    />
                                  )}
                                </div>

                                {/* Short Amount */}
                                {isPaid && shortfall > 0 && (
                                  <div style={{ gridColumn: '1/-1', color: '#D97706', fontWeight: 600 }}>
                                    ⚠ Short: {formatCurrency(shortfall)}
                                  </div>
                                )}

                                {/* Paid On */}
                                {p.paidAt && (
                                  <div>
                                    <span style={{ color: 'var(--color-text-muted)' }}>Paid on: </span>
                                    {new Date(p.paidAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                  </div>
                                )}
                              </div>

                              {/* Action button */}
                              {isPaid ? (
                                <button
                                  className="btn btn-sm"
                                  style={{ width: '100%', justifyContent: 'center', background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}
                                  onClick={() => markUnpaid(p, loan._id)}
                                >
                                  <RotateCcw size={12} /> Mark Unpaid
                                </button>
                              ) : (
                                <button
                                  className="btn btn-success btn-sm"
                                  style={{ width: '100%', justifyContent: 'center' }}
                                  onClick={() => markPaid(p, loan._id)}
                                >
                                  <CheckCircle size={13} /> Mark Paid
                                </button>
                              )}
                            </div>
                          );
                        })}
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
