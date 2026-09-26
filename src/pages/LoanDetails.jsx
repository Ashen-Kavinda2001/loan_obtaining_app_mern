import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, CheckCircle, RotateCcw, Search, CreditCard, Trash2, AlertTriangle, X } from 'lucide-react';
import client from '../api/client';
import { formatCurrency } from '../data/demoData';

/* ─────────────────────────────────────────────────────────────
   ConfirmModal — replaces window.confirm() with a styled dialog
   ───────────────────────────────────────────────────────────── */
function ConfirmModal({ title, message, confirmLabel = 'Confirm', danger = false, onConfirm, onCancel }) {
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)',
      zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16, animation: 'fadeIn 0.15s ease',
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: '28px 28px 24px',
        width: '100%', maxWidth: 420,
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        animation: 'slideUp 0.2s ease',
      }}>
        {/* Icon + title */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 12 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 10, flexShrink: 0,
            background: danger ? '#FEF2F2' : '#FFF7ED',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <AlertTriangle size={20} color={danger ? '#DC2626' : '#D97706'} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#0F172A', marginBottom: 4 }}>{title}</div>
            <div style={{ fontSize: 13, color: '#64748B', lineHeight: 1.5 }}>{message}</div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <button
            className="btn btn-outline"
            style={{ minWidth: 90 }}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="btn"
            style={{
              minWidth: 90,
              background: danger
                ? 'linear-gradient(135deg,#DC2626,#EF4444)'
                : 'linear-gradient(135deg,#D97706,#F59E0B)',
              color: '#fff',
            }}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   ErrorSnack — replaces alert() for API errors
   ───────────────────────────────────────────────────────────── */
function ErrorSnack({ message, onClose }) {
  if (!message) return null;
  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      zIndex: 999, display: 'flex', alignItems: 'center', gap: 10,
      background: '#1E293B', color: '#fff',
      padding: '12px 18px', borderRadius: 10,
      boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
      fontSize: 13, fontWeight: 500,
      animation: 'slideUp 0.2s ease',
      maxWidth: 'calc(100vw - 48px)',
    }}>
      <AlertTriangle size={15} color="#F87171" style={{ flexShrink: 0 }} />
      <span style={{ flex: 1 }}>{message}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 2, display:'flex' }}>
        <X size={14} />
      </button>
    </div>
  );
}

const TABS = ['all', 'active', 'completed', 'overdue'];

export default function LoanDetails() {
  const [loans, setLoans]         = useState([]);
  const [payments, setPayments]   = useState({});
  const [activeTab, setActiveTab] = useState('all');
  const [expanded, setExpanded]   = useState(null);   // loanId of expanded row
  const [search, setSearch]       = useState('');
  const [loading, setLoading]     = useState(true);
  const [loadingPayments, setLoadingPayments] = useState({});
  const [amountInputs, setAmountInputs] = useState({});

  // ── Custom confirm modal state ──────────────────────────────
  const [confirm, setConfirm] = useState(null); // { title, message, confirmLabel, danger, onConfirm }
  const [errMsg, setErrMsg]   = useState('');    // replaces alert()

  // ── Fetch all loans ──────────────────────────────────────
  useEffect(() => {
    client.get('/loans')
      .then(({ data }) => setLoans(Array.isArray(data) ? data : []))
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
    const amount = (raw !== undefined && raw !== '') ? parseFloat(raw) : parseFloat(p.amountDue);
    if (isNaN(amount) || amount <= 0) {
      setErrMsg('Please enter a valid amount paid.');
      return;
    }
    try {
      await client.patch(`/payments/${p._id}/pay`, { amountPaid: amount });
      setAmountInputs(prev => { const n = { ...prev }; delete n[p._id]; return n; });
      await refresh(loanId);
    } catch (err) {
      setErrMsg(err.response?.data?.message || 'Failed to mark payment.');
    }
  };

  // ── Revert a PAID payment back to pending ─────────────────
  const markUnpaid = (p, loanId) => {
    setConfirm({
      title:        'Revert Payment',
      message:      'Revert this payment to pending? The loan balance will be updated.',
      confirmLabel: 'Revert',
      danger:       false,
      onConfirm: async () => {
        setConfirm(null);
        try {
          await client.patch(`/payments/${p._id}/unpay`);
          await refresh(loanId);
        } catch (err) {
          setErrMsg(err.response?.data?.message || 'Failed to revert payment.');
        }
      },
    });
  };

  // ── Delete a loan and its entire payment schedule ─────────
  const deleteLoan = (loanId, memberName) => {
    setConfirm({
      title:        'Delete Loan',
      message:      `Permanently delete this loan for ${memberName}? All payment records will also be removed. This cannot be undone.`,
      confirmLabel: 'Delete',
      danger:       true,
      onConfirm: async () => {
        setConfirm(null);
        try {
          await client.delete(`/loans/${loanId}`);
          setLoans(prev => prev.filter(l => l._id !== loanId));
          setPayments(prev => { const n = { ...prev }; delete n[loanId]; return n; });
          if (expanded === loanId) setExpanded(null);
        } catch (err) {
          setErrMsg(err.response?.data?.message || 'Failed to delete loan.');
        }
      },
    });
  };

  // ── Filter loans by tab + search ──────────────────────────
  const filtered = loans.filter(l => {
    const matchTab    = activeTab === 'all' || l.status === activeTab;
    const matchSearch = l.memberName.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  const tabCount = (tab) =>
    tab === 'all' ? loans.length : loans.filter(l => l.status === tab).length;

  // ── Group filtered loans by memberId ──────────────────────
  // Result: [{ memberId, memberName, memberVillage, loans: [...] }, ...]
  const grouped = Object.values(
    filtered.reduce((acc, loan) => {
      const key = loan.memberId || loan.memberName; // fallback to name if no id
      if (!acc[key]) {
        acc[key] = {
          memberId:      key,
          memberName:    loan.memberName,
          memberVillage: loan.memberVillage,
          loans:         [],
        };
      }
      acc[key].loans.push(loan);
      return acc;
    }, {})
  );

  if (loading) return (
    <div className="page-content">
      <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-text-muted)' }}>Loading loans…</div>
    </div>
  );

  return (
    <div className="page-content">

      {/* ── Custom confirm modal ── */}
      {confirm && (
        <ConfirmModal
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          danger={confirm.danger}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}

      {/* ── Error snackbar ── */}
      <ErrorSnack message={errMsg} onClose={() => setErrMsg('')} />

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

      {/* ── Member groups ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {grouped.length === 0 && (
          <div className="card">
            <div className="empty-state"><p>No loans found.</p></div>
          </div>
        )}

        {grouped.map(group => (
          <MemberLoanGroup
            key={group.memberId}
            group={group}
            expanded={expanded}
            payments={payments}
            loadingPayments={loadingPayments}
            amountInputs={amountInputs}
            onExpand={handleExpand}
            onMarkPaid={markPaid}
            onMarkUnpaid={markUnpaid}
            onDeleteLoan={deleteLoan}
            onAmountChange={(paymentId, val) =>
              setAmountInputs(prev => ({ ...prev, [paymentId]: val }))
            }
          />
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   MemberLoanGroup — single profile header + multiple loan cards
   ───────────────────────────────────────────────────────────── */
function MemberLoanGroup({ group, expanded, payments, loadingPayments, amountInputs, onExpand, onMarkPaid, onMarkUnpaid, onDeleteLoan, onAmountChange }) {
  const { memberName, memberVillage, loans } = group;

  // Aggregate stats across all this member's loans
  const totalRemaining    = loans.reduce((s, l) => s + l.remainingBalance, 0);
  const activeCount       = loans.filter(l => l.status === 'active').length;
  const completedCount    = loans.filter(l => l.status === 'completed').length;
  const overdueCount      = loans.filter(l => l.status === 'overdue').length;

  return (
    <div style={{
      background: 'var(--color-bg-card)',
      border: '1px solid var(--color-border)',
      borderRadius: 14,
      boxShadow: '0 2px 8px var(--color-shadow)',
    }}>
      {/* ── Member Profile Header ── */}
      <div style={{
        padding: '14px 16px',
        borderBottom: '1px solid var(--color-border)',
        background: 'linear-gradient(135deg, #F8F9FF 0%, #F0F2FF 100%)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
      }}>
        {/* Avatar */}
        <div style={{
          width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, #4F46E5, #818CF8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 800, fontSize: 18,
          boxShadow: '0 2px 8px rgba(79,70,229,0.35)',
        }}>
          {memberName.charAt(0).toUpperCase()}
        </div>

        {/* Name + Village */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--color-text)' }}>{memberName}</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 1 }}>{memberVillage}</div>
        </div>

        {/* Summary pills */}
        <div className="member-header-pills">
          {/* Loan count pill */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: '#EEF2FF', color: '#4F46E5',
            padding: '4px 10px', borderRadius: 100, fontSize: 12, fontWeight: 700,
          }}>
            <CreditCard size={12} />
            {loans.length} Loan{loans.length !== 1 ? 's' : ''}
          </div>

          {/* Status pills */}
          {activeCount > 0 && (
            <span style={{ background: '#D1FAE5', color: '#059669', padding: '3px 9px', borderRadius: 100, fontSize: 11, fontWeight: 700 }}>
              {activeCount} Active
            </span>
          )}
          {overdueCount > 0 && (
            <span style={{ background: '#FEE2E2', color: '#DC2626', padding: '3px 9px', borderRadius: 100, fontSize: 11, fontWeight: 700 }}>
              {overdueCount} Overdue
            </span>
          )}
          {completedCount > 0 && (
            <span style={{ background: '#F1F5F9', color: '#64748B', padding: '3px 9px', borderRadius: 100, fontSize: 11, fontWeight: 700 }}>
              {completedCount} Done
            </span>
          )}
        </div>

        {/* Total remaining */}
        {totalRemaining > 0 && (
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Remaining</div>
            <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--color-danger)' }}>{formatCurrency(totalRemaining)}</div>
          </div>
        )}
      </div>

      {/* ── Individual loan sub-cards ── */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {loans.map((loan, loanIdx) => {
          const loanPayments = payments[loan._id] || [];
          const isExpanded   = expanded === loan._id;
          const paidWeeks    = loanPayments.filter(p => p.status === 'paid').length;
          const progress     = loan.loanDuration > 0 ? (paidWeeks / loan.loanDuration) * 100 : 0;

          return (
            <div key={loan._id} style={{
              borderTop: loanIdx > 0 ? '1px solid var(--color-border)' : 'none',
            }}>
              {/* Loan number label + delete button */}
              <div className="loan-card-label-row">
                <div style={{
                  background: loan.status === 'overdue' ? '#FEE2E2' :
                               loan.status === 'completed' ? '#D1FAE5' : '#EEF2FF',
                  color: loan.status === 'overdue' ? '#DC2626' :
                          loan.status === 'completed' ? '#059669' : '#4F46E5',
                  fontSize: 10, fontWeight: 700,
                  padding: '2px 8px', borderRadius: 100,
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                  whiteSpace: 'nowrap',
                }}>
                  Loan #{loanIdx + 1}
                </div>
                <div style={{ fontSize: 10, color: 'var(--color-text-muted)', flex: 1, minWidth: 0 }}>
                  Granted: {(loan.grantedAt || loan.startDate) ? new Date(loan.grantedAt || loan.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                </div>
                <button
                  title="Delete this loan"
                  onClick={e => { e.stopPropagation(); onDeleteLoan(loan._id, memberName); }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#DC2626', padding: '2px 4px', borderRadius: 6,
                    display: 'flex', alignItems: 'center', flexShrink: 0,
                    opacity: 0.7,
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = 1}
                  onMouseLeave={e => e.currentTarget.style.opacity = 0.7}
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* ── Loan summary row (clickable) ── */}
              <div
                className="loan-summary-row"
                style={{ padding: '12px 20px 14px', cursor: 'pointer' }}
                onClick={() => onExpand(loan._id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ flex: 1 }} />
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
                    <span className="loan-stat-label">Interest Rate</span>
                    <span className="loan-stat-value" style={{ color: '#D97706' }}>{loan.interestRate ?? 30}%</span>
                  </div>
                  <div className="loan-stat-item">
                    <span className="loan-stat-label">Total Repayable</span>
                    <span className="loan-stat-value" style={{ color: '#7C3AED', fontWeight: 800 }}>{formatCurrency(loan.totalRepayable)}</span>
                  </div>
                  <div className="loan-stat-item">
                    <span className="loan-stat-label">Weekly</span>
                    <span className="loan-stat-value">{formatCurrency(loan.monthlyInstallment)}</span>
                  </div>
                  <div className="loan-stat-item">
                    <span className="loan-stat-label">Paid So Far</span>
                    <span className="loan-stat-value" style={{ color: 'var(--color-success)' }}>{formatCurrency(loan.paidAmount)}</span>
                  </div>
                  <div className="loan-stat-item">
                    <span className="loan-stat-label">Remaining</span>
                    <span className="loan-stat-value" style={{ color: loan.remainingBalance > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                      {formatCurrency(loan.remainingBalance)}
                    </span>
                  </div>
                  <div className="loan-stat-item">
                    <span className="loan-stat-label">Duration</span>
                    <span className="loan-stat-value">{loan.loanDuration} weeks</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>
                    <span>{paidWeeks} of {loan.loanDuration} weeks paid</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div style={{ height: 6, background: '#F1F5F9', borderRadius: 100, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${progress}%`, borderRadius: 100,
                      background: loan.status === 'overdue' ? 'var(--color-danger)' :
                                  loan.status === 'completed' ? 'var(--color-success)' : 'var(--color-primary)',
                      transition: 'width 0.5s ease'
                    }} />
                  </div>
                </div>
              </div>

              {/* ── Expanded: Payment schedule ── */}
              {isExpanded && (
                <PaymentSchedule
                  loan={loan}
                  loanPayments={loanPayments}
                  loadingPayments={loadingPayments}
                  amountInputs={amountInputs}
                  onMarkPaid={onMarkPaid}
                  onMarkUnpaid={onMarkUnpaid}
                  onAmountChange={onAmountChange}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   PaymentSchedule — desktop table + mobile cards
   ───────────────────────────────────────────────────────────── */
function PaymentSchedule({ loan, loanPayments, loadingPayments, amountInputs, onMarkPaid, onMarkUnpaid, onAmountChange }) {
  return (
    <div style={{ borderTop: '1px solid var(--color-border)', background: '#FAFBFF' }}>
      <div style={{ padding: '10px 20px 6px', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Payment Schedule
      </div>

      {loadingPayments[loan._id] ? (
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>Loading payments…</div>
      ) : loanPayments.length === 0 ? (
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>No payment records found.</div>
      ) : (
        <>
          {/* ── Desktop table (hidden on mobile) ── */}
          <div className="table-wrapper hide-on-mobile" style={{ borderRadius: 0, border: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>Week</th>
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
                      <td style={{ fontWeight: 600 }}>Week {p.monthNumber}</td>

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
                            onChange={e => onAmountChange(p._id, e.target.value)}
                            onClick={e => e.stopPropagation()}
                            style={{
                              width: 120, padding: '5px 8px', fontSize: 13,
                              border: '1px solid var(--color-border)', borderRadius: 6,
                              outline: 'none', fontFamily: 'inherit'
                            }}
                          />
                        )}
                      </td>

                      <td>
                        {isPaid && shortfall > 0 ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#D97706', fontWeight: 600, fontSize: 13 }}>
                            ⚠ {formatCurrency(shortfall)}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                        )}
                      </td>

                      <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
                        {p.paidAt
                          ? new Date(p.paidAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                          : '—'}
                      </td>

                      <td>
                        <span className={`badge badge-${p.status}`}>
                          {isPaid && shortfall > 0 ? 'partial' : p.status}
                        </span>
                      </td>

                      <td>
                        {isPaid ? (
                          <button
                            className="btn btn-sm"
                            style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', gap: 4 }}
                            onClick={e => { e.stopPropagation(); onMarkUnpaid(p, loan._id); }}
                          >
                            <RotateCcw size={12} /> Mark Unpaid
                          </button>
                        ) : (
                          <button
                            className="btn btn-success btn-sm"
                            onClick={e => { e.stopPropagation(); onMarkPaid(p, loan._id); }}
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

          {/* ── Mobile cards (shown only on mobile) ── */}
          <div className="show-on-mobile" style={{ padding: '0 12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {loanPayments.map(p => {
              const isPaid    = p.status === 'paid';
              const shortfall = isPaid ? Math.max(0, p.amountDue - p.amountPaid) : 0;

              return (
                <div key={p._id} style={{
                  border: `1px solid ${isPaid && shortfall === 0 ? '#A7F3D0' : isPaid ? '#FDE68A' : 'var(--color-border)'}`,
                  borderRadius: 10,
                  padding: '12px',
                  background: isPaid && shortfall === 0 ? '#F0FDF4' : isPaid ? '#FFFBEB' : 'var(--color-bg-card)',
                }}>
                  {/* Card header: week + status */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>Week {p.monthNumber}</span>
                    <span className={`badge badge-${p.status}`}>
                      {isPaid && shortfall > 0 ? 'partial' : p.status}
                    </span>
                  </div>

                  {/* Info row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', fontSize: 12, marginBottom: 10 }}>
                    <div>
                      <div style={{ color: 'var(--color-text-muted)', marginBottom: 2 }}>Due Amount</div>
                      <div style={{ fontWeight: 600 }}>{formatCurrency(p.amountDue)}</div>
                    </div>

                    {isPaid ? (
                      <div>
                        <div style={{ color: 'var(--color-text-muted)', marginBottom: 2 }}>Amount Paid</div>
                        <div style={{ fontWeight: 700, color: shortfall > 0 ? '#D97706' : 'var(--color-success)' }}>
                          {formatCurrency(p.amountPaid)}
                        </div>
                      </div>
                    ) : null}

                    {isPaid && p.paidAt && (
                      <div>
                        <div style={{ color: 'var(--color-text-muted)', marginBottom: 2 }}>Paid On</div>
                        <div style={{ fontWeight: 600 }}>
                          {new Date(p.paidAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                    )}

                    {isPaid && shortfall > 0 && (
                      <div style={{ gridColumn: '1/-1', color: '#D97706', fontWeight: 600, fontSize: 12 }}>
                        ⚠ Short by {formatCurrency(shortfall)}
                      </div>
                    )}
                  </div>

                  {/* Input for pending payments */}
                  {!isPaid && (
                    <input
                      type="number"
                      min="1"
                      placeholder={`Enter amount (due: Rs. ${p.amountDue})`}
                      value={amountInputs[p._id] || ''}
                      onChange={e => onAmountChange(p._id, e.target.value)}
                      style={{
                        width: '100%', padding: '9px 12px', fontSize: 14,
                        border: '1.5px solid var(--color-border)', borderRadius: 8,
                        outline: 'none', boxSizing: 'border-box',
                        fontFamily: 'inherit', marginBottom: 10,
                      }}
                    />
                  )}

                  {/* Full-width action button */}
                  {isPaid ? (
                    <button
                      className="btn btn-sm"
                      style={{
                        width: '100%', justifyContent: 'center',
                        background: '#FEF2F2', color: '#DC2626',
                        border: '1px solid #FECACA', padding: '10px',
                      }}
                      onClick={() => onMarkUnpaid(p, loan._id)}
                    >
                      <RotateCcw size={13} /> Mark Unpaid
                    </button>
                  ) : (
                    <button
                      className="btn btn-success btn-sm"
                      style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
                      onClick={() => onMarkPaid(p, loan._id)}
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
  );
}
