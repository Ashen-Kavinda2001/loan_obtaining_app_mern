import { useState } from 'react';
import { Lock, Mail, Save, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import client from '../api/client';

export default function AccountSettings() {
  // ── Change Email ──
  const [emailForm, setEmailForm] = useState({ currentPassword: '', newEmail: '' });
  const [emailStatus, setEmailStatus] = useState(null); // { type: 'success'|'error', msg }
  const [emailLoading, setEmailLoading] = useState(false);

  // ── Change Password ──
  const [passForm, setPassForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passStatus, setPassStatus] = useState(null);
  const [passLoading, setPassLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleEmailSave = async (e) => {
    e.preventDefault();
    setEmailStatus(null);
    if (!emailForm.newEmail || !emailForm.currentPassword) {
      setEmailStatus({ type: 'error', msg: 'Please fill in all fields.' });
      return;
    }
    setEmailLoading(true);
    try {
      const { data } = await client.put('/auth/update-credentials', {
        currentPassword: emailForm.currentPassword,
        newEmail: emailForm.newEmail,
      });
      // Update stored token (new email is in the new token)
      localStorage.setItem('token', data.token);
      setEmailStatus({ type: 'success', msg: `Email updated to ${data.email}` });
      setEmailForm({ currentPassword: '', newEmail: '' });
    } catch (err) {
      setEmailStatus({ type: 'error', msg: err.response?.data?.message || 'Failed to update email.' });
    } finally {
      setEmailLoading(false);
    }
  };

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    setPassStatus(null);
    if (!passForm.currentPassword || !passForm.newPassword || !passForm.confirmPassword) {
      setPassStatus({ type: 'error', msg: 'Please fill in all fields.' });
      return;
    }
    if (passForm.newPassword !== passForm.confirmPassword) {
      setPassStatus({ type: 'error', msg: 'New passwords do not match.' });
      return;
    }
    if (passForm.newPassword.length < 6) {
      setPassStatus({ type: 'error', msg: 'Password must be at least 6 characters.' });
      return;
    }
    setPassLoading(true);
    try {
      const { data } = await client.put('/auth/update-credentials', {
        currentPassword: passForm.currentPassword,
        newPassword: passForm.newPassword,
      });
      localStorage.setItem('token', data.token);
      setPassStatus({ type: 'success', msg: 'Password changed successfully.' });
      setPassForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPassStatus({ type: 'error', msg: err.response?.data?.message || 'Failed to update password.' });
    } finally {
      setPassLoading(false);
    }
  };

  const StatusBox = ({ status }) => status ? (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
      borderRadius: 8, fontSize: 13, marginBottom: 16,
      background: status.type === 'success' ? '#F0FDF4' : '#FEF2F2',
      border: `1px solid ${status.type === 'success' ? '#BBF7D0' : '#FECACA'}`,
      color: status.type === 'success' ? '#166534' : '#991B1B',
    }}>
      {status.type === 'success'
        ? <CheckCircle size={15} />
        : <AlertCircle size={15} />}
      {status.msg}
    </div>
  ) : null;

  const PasswordField = ({ label, value, onChange, show, onToggle, placeholder }) => (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          type={show ? 'text' : 'password'}
          className="form-control"
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          style={{ paddingRight: 40 }}
        />
        <button type="button"
          style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}
          onClick={onToggle}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="page-content">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: 'var(--color-text)' }}>Account Settings</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--color-text-muted)' }}>
          Update your login email and password
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>

        {/* ── Change Email ── */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #4F46E5, #818CF8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Mail size={16} color="#fff" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Change Email</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Update your login email address</div>
            </div>
          </div>

          <StatusBox status={emailStatus} />

          <form onSubmit={handleEmailSave} noValidate>
            <div className="form-group">
              <label className="form-label">New Email Address</label>
              <input
                type="email" className="form-control"
                placeholder="new@example.com"
                value={emailForm.newEmail}
                onChange={e => setEmailForm({ ...emailForm, newEmail: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm with Current Password</label>
              <input
                type="password" className="form-control"
                placeholder="Enter current password"
                value={emailForm.currentPassword}
                onChange={e => setEmailForm({ ...emailForm, currentPassword: e.target.value })}
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={emailLoading}>
              {emailLoading ? 'Saving…' : <><Save size={14} /> Save Email</>}
            </button>
          </form>
        </div>

        {/* ── Change Password ── */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #059669, #34D399)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Lock size={16} color="#fff" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Change Password</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Use a strong, unique password</div>
            </div>
          </div>

          <StatusBox status={passStatus} />

          <form onSubmit={handlePasswordSave} noValidate>
            <PasswordField
              label="Current Password"
              value={passForm.currentPassword}
              onChange={e => setPassForm({ ...passForm, currentPassword: e.target.value })}
              show={showCurrent}
              onToggle={() => setShowCurrent(p => !p)}
              placeholder="Enter current password"
            />
            <PasswordField
              label="New Password"
              value={passForm.newPassword}
              onChange={e => setPassForm({ ...passForm, newPassword: e.target.value })}
              show={showNew}
              onToggle={() => setShowNew(p => !p)}
              placeholder="At least 6 characters"
            />
            <PasswordField
              label="Confirm New Password"
              value={passForm.confirmPassword}
              onChange={e => setPassForm({ ...passForm, confirmPassword: e.target.value })}
              show={showConfirm}
              onToggle={() => setShowConfirm(p => !p)}
              placeholder="Repeat new password"
            />
            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', background: 'linear-gradient(135deg, #059669, #10B981)' }} disabled={passLoading}>
              {passLoading ? 'Saving…' : <><Save size={14} /> Update Password</>}
            </button>
          </form>
        </div>

      </div>

      {/* ── Maintenance Info ── */}
      <div className="card" style={{ marginTop: 20, background: '#FAFAFA', border: '1px dashed #CBD5E1' }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>🔧 Developer / Maintenance Access</div>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.6 }}>
          To perform backend maintenance while the client is using the app:<br />
          <strong>1.</strong> Connect to MongoDB Atlas directly via the Atlas UI or MongoDB Compass — no impact on the live app.<br />
          <strong>2.</strong> To restart the server, SSH/RDP into the server machine and run <code style={{ background: '#F1F5F9', padding: '1px 5px', borderRadius: 4 }}>node index.js</code> or <code style={{ background: '#F1F5F9', padding: '1px 5px', borderRadius: 4 }}>npm run dev</code>.<br />
          <strong>3.</strong> The client's session will resume automatically after the server restarts (JWT tokens persist in localStorage).<br />
          <strong>4.</strong> To force a logout of all sessions, change the <code style={{ background: '#F1F5F9', padding: '1px 5px', borderRadius: 4 }}>JWT_SECRET</code> in <code style={{ background: '#F1F5F9', padding: '1px 5px', borderRadius: 4 }}>.env</code> and restart the server.
        </p>
      </div>
    </div>
  );
}
