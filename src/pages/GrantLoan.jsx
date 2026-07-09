import { useState, useEffect, useMemo } from 'react';
import { CreditCard, Calculator } from 'lucide-react';
import client from '../api/client';
import { formatCurrency } from '../data/demoData';

const initialForm = {
  memberId: '', loanAmount: '', interestRate: 30, loanDuration: '', startDate: ''
};

function Field({ label, error, children }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      {children}
      {error && <span style={{ fontSize: 12, color: 'var(--color-danger)' }}>{error}</span>}
    </div>
  );
}

export default function GrantLoan() {
  const [members, setMembers]   = useState([]);
  const [form, setForm]         = useState(initialForm);
  const [errors, setErrors]     = useState({});
  const [success, setSuccess]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [serverError, setServerError] = useState('');

  // Load members for dropdown
  useEffect(() => {
    client.get('/members').then(({ data }) => setMembers(data)).catch(() => {});
  }, []);

  const calc = useMemo(() => {
    const amt  = parseFloat(form.loanAmount)   || 0;
    const dur  = parseInt(form.loanDuration)   || 0;
    const rate = parseFloat(form.interestRate) || 0;
    if (amt > 0 && dur > 0) {
      const total   = amt * (1 + rate / 100);
      const monthly = total / dur;
      return { total: Math.round(total), monthly: Math.round(monthly) };
    }
    return { total: 0, monthly: 0 };
  }, [form.loanAmount, form.loanDuration, form.interestRate]);

  const validate = () => {
    const e = {};
    if (!form.memberId)                          e.memberId    = 'Please select a member';
    if (!form.loanAmount || form.loanAmount <= 0) e.loanAmount  = 'Enter a valid loan amount';
    if (!form.loanDuration || form.loanDuration <= 0) e.loanDuration = 'Enter a valid duration';
    if (!form.startDate)                         e.startDate   = 'Start date is required';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      await client.post('/loans', {
        memberId:     form.memberId,
        loanAmount:   parseFloat(form.loanAmount),
        interestRate: parseFloat(form.interestRate),
        loanDuration: parseInt(form.loanDuration),
        startDate:    form.startDate,
      });
      setSuccess(true);
      setForm(initialForm);
      setErrors({});
    } catch (err) {
      setServerError(err.response?.data?.message || 'Failed to grant loan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectedMember = members.find(m => m._id === form.memberId);

  return (
    <div className="page-content">
    <div className="grant-loan-grid">

        {/* Left — Form */}
        <div>
          {serverError && (
            <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: 'var(--radius-md)', padding: '14px 18px', marginBottom: 20, fontSize: 13, color: '#991B1B' }}>
              {serverError}
            </div>
          )}

          {success && (
            <div style={{ background: '#D1FAE5', border: '1px solid #6EE7B7', borderRadius: 'var(--radius-md)', padding: '14px 18px', marginBottom: 20, fontSize: 13, color: '#065F46', fontWeight: 600 }}>
              ✅ Loan granted successfully! Payment schedule has been created.
              <button style={{ marginLeft: 12, color: '#059669', fontSize: 12, cursor: 'pointer', background: 'none', border: 'none', textDecoration: 'underline' }}
                onClick={() => setSuccess(false)}>Grant another</button>
            </div>
          )}

          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CreditCard size={20} color="#10B981" />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>Loan Application</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Enter details to grant a loan</div>
              </div>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              {/* Member Selector */}
              <Field label="Select Member *" error={errors.memberId}>
                <select
                  className="form-control"
                  value={form.memberId}
                  onChange={e => { setForm({ ...form, memberId: e.target.value }); setErrors({ ...errors, memberId: '' }); }}
                  style={errors.memberId ? { borderColor: 'var(--color-danger)' } : {}}
                >
                  <option value="">-- Choose a member --</option>
                  {members.map(m => (
                    <option key={m._id} value={m._id}>{m.fullName} — {m.village}</option>
                  ))}
                </select>
              </Field>

              {selectedMember && (
                <div style={{ background: '#F8FAFC', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '12px 14px', marginBottom: 18, fontSize: 13 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{selectedMember.fullName}</div>
                  <div style={{ color: 'var(--color-text-muted)' }}>
                    NIC: {selectedMember.idNumber} &nbsp;·&nbsp; Village: {selectedMember.village} &nbsp;·&nbsp; Age: {selectedMember.age}
                  </div>
                </div>
              )}

              <div className="form-grid-2">
                <Field label="Loan Amount (Rs.) *" error={errors.loanAmount}>
                  <input type="number" className="form-control" placeholder="e.g. 50000"
                    value={form.loanAmount}
                    onChange={e => { setForm({ ...form, loanAmount: e.target.value }); setErrors({ ...errors, loanAmount: '' }); }}
                    style={errors.loanAmount ? { borderColor: 'var(--color-danger)' } : {}} />
                </Field>

                <Field label="Interest Rate (%)">
                  <input type="number" className="form-control" placeholder="30"
                    value={form.interestRate}
                    onChange={e => setForm({ ...form, interestRate: e.target.value })} />
                  <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Flat rate over full term</span>
                </Field>

                <Field label="Duration (Months) *" error={errors.loanDuration}>
                  <input type="number" className="form-control" placeholder="e.g. 12"
                    value={form.loanDuration}
                    onChange={e => { setForm({ ...form, loanDuration: e.target.value }); setErrors({ ...errors, loanDuration: '' }); }}
                    style={errors.loanDuration ? { borderColor: 'var(--color-danger)' } : {}} />
                </Field>

                <Field label="Start Date *" error={errors.startDate}>
                  <input type="date" className="form-control"
                    value={form.startDate}
                    onChange={e => { setForm({ ...form, startDate: e.target.value }); setErrors({ ...errors, startDate: '' }); }}
                    style={errors.startDate ? { borderColor: 'var(--color-danger)' } : {}} />
                </Field>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button type="submit" className="btn btn-success" disabled={loading}>
                  {loading ? 'Granting…' : <><CreditCard size={15} /> Grant Loan</>}
                </button>
                <button type="button" className="btn btn-outline" onClick={() => { setForm(initialForm); setErrors({}); }}>Clear</button>
              </div>
            </form>
          </div>
        </div>

        {/* Right — Live Calculator */}
        <div>
          <div className="card" style={{ position: 'sticky', top: 80 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--color-border)' }}>
              <Calculator size={18} color="#4F46E5" />
              <div style={{ fontWeight: 700 }}>Live Preview</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'Loan Amount',  value: form.loanAmount   ? formatCurrency(form.loanAmount)   : '—' },
                { label: 'Interest Rate', value: form.interestRate ? `${form.interestRate}%`            : '—' },
                { label: 'Duration',      value: form.loanDuration ? `${form.loanDuration} months`      : '—' },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
                  <span style={{ fontWeight: 600 }}>{value}</span>
                </div>
              ))}

              <div style={{ height: 1, background: 'var(--color-border)', margin: '4px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Total Repayable</span>
                <span style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: 15 }}>
                  {calc.total ? formatCurrency(calc.total) : '—'}
                </span>
              </div>

              <div style={{ background: 'linear-gradient(135deg, #4F46E5, #818CF8)', borderRadius: 'var(--radius-md)', padding: '16px', textAlign: 'center', color: '#fff' }}>
                <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>Monthly Installment</div>
                <div style={{ fontSize: 26, fontWeight: 800 }}>
                  {calc.monthly ? formatCurrency(calc.monthly) : '—'}
                </div>
                {form.loanDuration > 0 && <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>× {form.loanDuration} months</div>}
              </div>

              {calc.total > 0 && (
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', textAlign: 'center', lineHeight: 1.6 }}>
                  Interest charged: {formatCurrency(calc.total - (parseFloat(form.loanAmount) || 0))}
                  <br />({form.interestRate}% flat rate applied)
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
