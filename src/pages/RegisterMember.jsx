import { useState } from 'react';
import { CheckCircle, UserPlus } from 'lucide-react';

const initialForm = {
  fullName: '', idNumber: '', village: '', contactNumber: '', age: ''
};

// Field component defined OUTSIDE to avoid re-mount on every render
function Field({ name, label, type = 'text', placeholder, value, onChange, error }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <input
        type={type}
        className="form-control"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        style={error ? { borderColor: 'var(--color-danger)' } : {}}
      />
      {error && <span style={{ fontSize: 12, color: 'var(--color-danger)', marginTop: 2 }}>{error}</span>}
    </div>
  );
}

export default function RegisterMember() {
  const [form, setForm]       = useState(initialForm);
  const [errors, setErrors]   = useState({});
  const [success, setSuccess] = useState(false);
  const [submitted, setSubmitted] = useState(null);

  const validate = () => {
    const e = {};
    if (!form.fullName.trim())        e.fullName      = 'Full name is required';
    if (!form.idNumber.trim())        e.idNumber      = 'NIC number is required';
    else if (!/^\d{9}[Vv]$|^\d{12}$/.test(form.idNumber.trim()))
                                      e.idNumber      = 'Enter a valid NIC (9 digits + V or 12 digits)';
    if (!form.village.trim())         e.village       = 'Village is required';
    if (!form.contactNumber.trim())   e.contactNumber = 'Contact number is required';
    if (!form.age)                    e.age           = 'Age is required';
    else if (Number(form.age) < 18 || Number(form.age) > 100)
                                      e.age           = 'Age must be between 18 and 100';
    return e;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSubmitted({ ...form, _id: `m_${Date.now()}`, createdAt: new Date().toISOString() });
    setSuccess(true);
    setForm(initialForm);
    setErrors({});
  };

  return (
    <div className="page-content">
      <div style={{ maxWidth: 680 }}>

        {/* Success Banner */}
        {success && submitted && (
          <div style={{
            background: '#D1FAE5', border: '1px solid #6EE7B7', borderRadius: 'var(--radius-md)',
            padding: '16px 20px', marginBottom: 24, display: 'flex', alignItems: 'flex-start', gap: 12
          }}>
            <CheckCircle size={20} color="#10B981" style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <div style={{ fontWeight: 700, color: '#065F46', marginBottom: 2 }}>Member Registered Successfully!</div>
              <div style={{ fontSize: 13, color: '#065F46' }}>
                <strong>{submitted.fullName}</strong> from {submitted.village} has been added to the system.
              </div>
              <button
                className="btn btn-sm"
                style={{ marginTop: 8, color: '#059669', background: 'transparent', padding: 0, fontSize: 13 }}
                onClick={() => setSuccess(false)}
              >
                + Register another member
              </button>
            </div>
          </div>
        )}

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid var(--color-border)' }}>
            <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UserPlus size={20} color="#4F46E5" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>New Member Registration</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Fill in all fields to register a member</div>
            </div>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div style={{ marginBottom: 8, fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Personal Information
            </div>
            <div className="form-grid-2">
              <Field name="fullName"      label="Full Name *"      placeholder="e.g. Kamal Perera"
                value={form.fullName}      error={errors.fullName}      onChange={e => { setForm({ ...form, fullName: e.target.value });      setErrors({ ...errors, fullName: '' }); }} />
              <Field name="idNumber"      label="NIC Number *"     placeholder="e.g. 199012345678"
                value={form.idNumber}      error={errors.idNumber}      onChange={e => { setForm({ ...form, idNumber: e.target.value });      setErrors({ ...errors, idNumber: '' }); }} />
            </div>
            <div className="form-grid-2">
              <Field name="village"       label="Village / Town *" placeholder="e.g. Matara"
                value={form.village}       error={errors.village}       onChange={e => { setForm({ ...form, village: e.target.value });       setErrors({ ...errors, village: '' }); }} />
              <Field name="contactNumber" label="Contact Number *"  placeholder="e.g. 077-123-4567"
                value={form.contactNumber} error={errors.contactNumber} onChange={e => { setForm({ ...form, contactNumber: e.target.value }); setErrors({ ...errors, contactNumber: '' }); }} />
            </div>
            <div style={{ maxWidth: 200 }}>
              <Field name="age" label="Age *" type="number" placeholder="e.g. 28"
                value={form.age} error={errors.age} onChange={e => { setForm({ ...form, age: e.target.value }); setErrors({ ...errors, age: '' }); }} />
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button type="submit" className="btn btn-primary">
                <UserPlus size={15} /> Register Member
              </button>
              <button type="button" className="btn btn-outline" onClick={() => { setForm(initialForm); setErrors({}); setSuccess(false); }}>
                Clear Form
              </button>
            </div>
          </form>
        </div>

        {/* Info Box */}
        <div style={{
          marginTop: 20, background: '#EFF6FF', border: '1px solid #BFDBFE',
          borderRadius: 'var(--radius-md)', padding: '14px 18px', fontSize: 13, color: '#1E40AF'
        }}>
          <strong>Note:</strong> After registration, you can grant a loan to this member from the <strong>Grant Loan</strong> page.
        </div>
      </div>
    </div>
  );
}
