import { useState, useEffect } from 'react';
import { CheckCircle, UserPlus, Plus, X } from 'lucide-react';
import client from '../api/client';

const initialForm = {
  fullName: '', idNumber: '', village: '', contactNumber: '', age: '', groupId: ''
};

function Field({ label, type = 'text', placeholder, value, onChange, error }) {
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
  const [form, setForm]           = useState(initialForm);
  const [errors, setErrors]       = useState({});
  const [success, setSuccess]     = useState(false);
  const [submitted, setSubmitted] = useState(null);
  const [loading, setLoading]     = useState(false);
  const [serverError, setServerError] = useState('');

  // Groups
  const [groups, setGroups]               = useState([]);
  const [showNewGroup, setShowNewGroup]   = useState(false);
  const [newGroupName, setNewGroupName]   = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [groupError, setGroupError]       = useState('');

  useEffect(() => {
    client.get('/groups')
      .then(({ data }) => setGroups(data.groups || []))
      .catch(() => {});
  }, []);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) { setGroupError('Group name is required'); return; }
    setCreatingGroup(true);
    setGroupError('');
    try {
      const { data } = await client.post('/groups', { name: newGroupName.trim() });
      setGroups(prev => [...prev, data]);
      setForm(f => ({ ...f, groupId: data._id }));
      setNewGroupName('');
      setShowNewGroup(false);
    } catch (err) {
      setGroupError(err.response?.data?.message || 'Failed to create group');
    } finally {
      setCreatingGroup(false);
    }
  };

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      const { data } = await client.post('/members', {
        ...form,
        age:     Number(form.age),
        groupId: form.groupId || null,
      });
      setSubmitted(data);
      setSuccess(true);
      setForm(initialForm);
      setErrors({});
    } catch (err) {
      setServerError(err.response?.data?.message || 'Failed to register member.');
    } finally {
      setLoading(false);
    }
  };

  const set = (field) => (e) => {
    setForm(f => ({ ...f, [field]: e.target.value }));
    setErrors(err => ({ ...err, [field]: '' }));
  };

  return (
    <div className="page-content">
      <div style={{ maxWidth: 680 }}>

        {serverError && (
          <div style={{
            background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: 'var(--radius-md)',
            padding: '14px 18px', marginBottom: 20, fontSize: 13, color: '#991B1B'
          }}>{serverError}</div>
        )}

        {success && submitted && (
          <div style={{
            background: '#D1FAE5', border: '1px solid #6EE7B7', borderRadius: 'var(--radius-md)',
            padding: '16px 20px', marginBottom: 24, display: 'flex', alignItems: 'flex-start', gap: 12
          }}>
            <CheckCircle size={20} color="#10B981" style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <div style={{ fontWeight: 700, color: '#065F46', marginBottom: 2 }}>Member Registered Successfully!</div>
              <div style={{ fontSize: 13, color: '#065F46' }}>
                <strong>{submitted.fullName}</strong> from {submitted.village} has been added
                {submitted.groupId ? <> to group <strong>{submitted.groupId.name}</strong></> : ' as Ungrouped'}.
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
            {/* Personal Info */}
            <div style={{ marginBottom: 8, fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Personal Information
            </div>
            <div className="form-grid-2">
              <Field label="Full Name *" placeholder="e.g. Kamal Perera"
                value={form.fullName} error={errors.fullName} onChange={set('fullName')} />
              <Field label="NIC Number *" placeholder="e.g. 199012345678"
                value={form.idNumber} error={errors.idNumber} onChange={set('idNumber')} />
            </div>
            <div className="form-grid-2">
              <Field label="Village / Town *" placeholder="e.g. Matara"
                value={form.village} error={errors.village} onChange={set('village')} />
              <Field label="Contact Number *" placeholder="e.g. 077-123-4567"
                value={form.contactNumber} error={errors.contactNumber} onChange={set('contactNumber')} />
            </div>
            <div style={{ maxWidth: 200 }}>
              <Field label="Age *" type="number" placeholder="e.g. 28"
                value={form.age} error={errors.age} onChange={set('age')} />
            </div>

            {/* ── Group Assignment ── */}
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--color-border)' }}>
              <div style={{ marginBottom: 8, fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Group Assignment <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
              </div>

              {/* Group selector */}
              {!showNewGroup ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div className="form-group" style={{ flex: '1 1 200px', margin: 0 }}>
                    <select
                      className="form-control"
                      value={form.groupId}
                      onChange={e => setForm(f => ({ ...f, groupId: e.target.value }))}
                    >
                      <option value="">— No Group (Ungrouped) —</option>
                      {groups.map(g => (
                        <option key={g._id} value={g._id}>{g.name}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{ marginTop: 0, flexShrink: 0, height: 40 }}
                    onClick={() => setShowNewGroup(true)}
                  >
                    <Plus size={14} /> New Group
                  </button>
                </div>
              ) : (
                /* Inline create group */
                <div style={{
                  background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: 8,
                  padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8
                }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>Create New Group</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <input
                        className="form-control"
                        placeholder="e.g. Village A, Group 2026…"
                        value={newGroupName}
                        onChange={e => { setNewGroupName(e.target.value); setGroupError(''); }}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleCreateGroup())}
                        autoFocus
                      />
                      {groupError && <div style={{ fontSize: 12, color: 'var(--color-danger)', marginTop: 3 }}>{groupError}</div>}
                    </div>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      style={{ height: 40, flexShrink: 0 }}
                      onClick={handleCreateGroup}
                      disabled={creatingGroup}
                    >
                      {creatingGroup ? '…' : <><Plus size={13} /> Create</>}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ height: 40, flexShrink: 0 }}
                      onClick={() => { setShowNewGroup(false); setNewGroupName(''); setGroupError(''); }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* Show selected group name */}
              {form.groupId && !showNewGroup && (
                <div style={{ marginTop: 6, fontSize: 12, color: '#4F46E5', fontWeight: 600 }}>
                  ✓ Assigning to: {groups.find(g => g._id === form.groupId)?.name}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Registering…' : <><UserPlus size={15} /> Register Member</>}
              </button>
              <button type="button" className="btn btn-outline"
                onClick={() => { setForm(initialForm); setErrors({}); setSuccess(false); setServerError(''); }}>
                Clear Form
              </button>
            </div>
          </form>
        </div>

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
