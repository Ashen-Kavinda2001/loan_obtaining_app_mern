import { useState, useEffect, useCallback } from 'react';
import { MessageSquare, RotateCcw, RefreshCw } from 'lucide-react';
import client from '../api/client';
import { useIsAdmin } from '../auth';

const STATUS = {
  sent:    { label: 'Sent',          color: '#059669', bg: '#D1FAE5' },
  sending: { label: 'Sending…',      color: '#4F46E5', bg: '#EEF2FF' },
  failed:  { label: 'Failed',        color: '#DC2626', bg: '#FEE2E2' },
  unknown: { label: 'Not confirmed', color: '#B45309', bg: '#FEF3C7' },
  skipped: { label: 'Not sent',      color: '#64748B', bg: '#F1F5F9' },
};
const HINT = {
  failed:  'The SMS gateway did not send it. It is retried automatically; you can also resend it now.',
  unknown: 'No clear answer from the SMS gateway; the customer may or may not have received it.',
  skipped: 'SMS sending was switched off or the phone number was not valid.',
};

const when = (d) => new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
const recentlySending = (logs) => logs.some(l => l.status === 'sending' && Date.now() - new Date(l.lastAttemptAt) < 2 * 60 * 1000);

/**
 * Receipt SMS for one loan, under its payment schedule. Loads on its own: if it fails (for example
 * before the SmsLogs table exists) it shows nothing and the schedule is unaffected.
 * `refreshKey` changes when the schedule reloads (after a payment), which reloads this list.
 */
export default function SmsReceipts({ loanId, weekOf, refreshKey }) {
  const isAdmin = useIsAdmin();
  const [logs, setLogs] = useState(null);      // null = not loaded or unavailable
  const [busyId, setBusyId] = useState(null);
  const [note, setNote] = useState('');

  const load = useCallback(() =>
    client.get('/sms-logs', { params: { loanId } })
      .then(({ data }) => setLogs(Array.isArray(data) ? data : null))
      .catch(() => setLogs(null)), [loanId]);

  useEffect(() => { load(); }, [load, refreshKey]);

  // While a receipt is going out, look again every 5 s (the gateway can take up to 30 s)
  useEffect(() => {
    if (!logs || !recentlySending(logs)) return;
    const t = setTimeout(load, 5000);
    return () => clearTimeout(t);
  }, [logs, load]);

  const resend = async (log) => {
    setBusyId(log.id);
    setNote('');
    try {
      await client.post(`/sms-logs/${log.id}/resend`);
      setLogs(prev => prev.map(l => (l.id === log.id ? { ...l, status: 'sending', lastAttemptAt: new Date().toISOString() } : l)));
    } catch (err) {
      setNote(err.response?.data?.message || 'Could not resend the SMS.');
    } finally {
      setBusyId(null);
    }
  };

  if (!logs || logs.length === 0) return null;

  return (
    <div style={{ borderTop: '1px solid var(--color-border)', padding: '10px 20px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 6 }}>
          <MessageSquare size={13} /> SMS Receipts
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load} aria-label="Refresh SMS receipts" title="Refresh">
          <RefreshCw size={12} />
        </button>
      </div>

      {note && <div role="alert" style={{ fontSize: 12, color: 'var(--color-danger)', marginBottom: 6 }}>{note}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {logs.map(log => {
          const s = STATUS[log.status] || STATUS.unknown;
          const week = weekOf(log.paymentId);
          const canResend = isAdmin && log.status !== 'sending';
          return (
            <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 12 }}>
              <span style={{ background: s.bg, color: s.color, padding: '2px 8px', borderRadius: 100, fontWeight: 700, fontSize: 11 }} title={HINT[log.status] || ''}>
                {s.label}
              </span>
              <span style={{ fontWeight: 600 }}>{week ? `Week ${week}` : 'Payment'}</span>
              <span style={{ color: 'var(--color-text-muted)' }}>
                {when(log.lastAttemptAt || log.createdAt)}
                {log.attempts > 1 && ` · ${log.attempts} attempts`}
                {log.error && log.status !== 'sent' && ` · ${log.error}`}
              </span>
              {canResend && (log.status !== 'sent' || busyId === log.id) && (
                <button className="btn btn-outline btn-sm" style={{ marginLeft: 'auto', padding: '2px 10px' }}
                  disabled={busyId === log.id} onClick={() => resend(log)}>
                  <RotateCcw size={11} /> Resend
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
