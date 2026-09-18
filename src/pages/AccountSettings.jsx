import { useState, useEffect } from 'react';
import { Lock, Mail, Save, CheckCircle, AlertCircle, Eye, EyeOff, User, ShieldCheck } from 'lucide-react';
import client from '../api/client';

// ── Top-level sub-components ──

function StatusBox({ status }) {
  if (!status) return null;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
      borderRadius: 8, fontSize: 13, marginBottom: 16,
      background: status.type === 'success' ? '#F0FDF4' : '#FEF2F2',
      border: `1px solid ${status.type === 'success' ? '#BBF7D0' : '#FECACA'}`,
      color: status.type === 'success' ? '#166534' : '#991B1B',
      animation: 'slideUp 0.2s ease',
    }}>
      {status.type === 'success'
        ? <CheckCircle size={15} style={{ flexShrink: 0 }} />
        : <AlertCircle size={15} style={{ flexShrink: 0 }} />}
      <span>{status.msg}</span>
    </div>
  );
}

function PasswordField({ label, value, onChange, show, onToggle, placeholder }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          type={show ? 'text' : 'password'}
          className="form-control"
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          style={{ paddingRight: 42 }}
          autoComplete="new-password"
        />
        <button
          type="button"
          style={{
            position: 'absolute', right: 12, top: '50%',
            transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#94A3B8', display: 'flex', alignItems: 'center',
            padding: 0,
          }}
          onClick={onToggle}
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}

export default function AccountSettings() {
  const [currentEmail, setCurrentEmail] = useState('');
  const [emailFetching, setEmailFetching] = useState(true);

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

  // Load current email from server on mount
  // Note: the JWT only contains `id`, NOT email — so we must fetch /auth/me
  useEffect(() => {
    client.get('/auth/me')
      .then(({ data }) => setCurrentEmail(data.email || ''))
      .catch(() => setCurrentEmail(''))
      .finally(() => setEmailFetching(false));
  }, []);

  // Auto-clear status messages after 6 seconds
  useEffect(() => {
    if (!emailStatus) return;
    const t = setTimeout(() => setEmailStatus(null), 6000);
    return () => clearTimeout(t);
  }, [emailStatus]);

  useEffect(() => {
    if (!passStatus) return;
    const t = setTimeout(() => setPassStatus(null), 6000);
    return () => clearTimeout(t);
  }, [passStatus]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleEmailSave = async (e) => {
    e.preventDefault();
    setEmailStatus(null);

    const trimmedEmail = emailForm.newEmail.trim().toLowerCase();

    if (!trimmedEmail || !emailForm.currentPassword) {
      setEmailStatus({ type: 'error', msg: 'Please fill in all fields.' });
      return;
    }
    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEmailStatus({ type: 'error', msg: 'Please enter a valid email address.' });
      return;
    }
    if (trimmedEmail === currentEmail.toLowerCase()) {
      setEmailStatus({ type: 'error', msg: 'New email is the same as your current email.' });
      return;
    }

    setEmailLoading(true);
    try {
      const { data } = await client.put('/auth/update-credentials', {
        currentPassword: emailForm.currentPassword,
        newEmail: trimmedEmail,
      });
      // Session cookie is automatically refreshed by server
      setCurrentEmail(data.email);
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
    if (passForm.newPassword.length < 8) {
      setPassStatus({ type: 'error', msg: 'Password must be at least 8 characters.' });
      return;
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(passForm.newPassword)) {
      setPassStatus({
        type: 'error',
        msg: 'Password must contain at least one uppercase letter, one lowercase letter, and one number.',
      });
      return;
    }
    if (passForm.newPassword === passForm.currentPassword) {
      setPassStatus({ type: 'error', msg: 'New password must be different from the current password.' });
      return;
    }

    setPassLoading(true);
    try {
      const { data } = await client.put('/auth/update-credentials', {
        currentPassword: passForm.currentPassword,
        newPassword: passForm.newPassword,
      });
      // Session cookie is automatically refreshed by server
      setPassStatus({ type: 'success', msg: 'Password changed successfully.' });
      setPassForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPassStatus({ type: 'error', msg: err.response?.data?.message || 'Failed to update password.' });
    } finally {
      setPassLoading(false);
    }
  };

  // ── Password strength ─────────────────────────────────────────────────────
  const getPasswordStrength = (pwd) => {
    if (!pwd) return null;
    let score = 0;
    if (pwd.length >= 8)            score++;
    if (/[A-Z]/.test(pwd))          score++;
    if (/[0-9]/.test(pwd))          score++;
    if (/[^A-Za-z0-9]/.test(pwd))  score++;
    if (score <= 1) return { label: 'Weak',   color: '#EF4444', width: '25%' };
    if (score === 2) return { label: 'Fair',   color: '#F59E0B', width: '50%' };
    if (score === 3) return { label: 'Good',   color: '#3B82F6', width: '75%' };
    return             { label: 'Strong', color: '#10B981', width: '100%' };
  };
  const strength = getPasswordStrength(passForm.newPassword);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="page-content">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: 'var(--color-text)' }}>
          Account Settings
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--color-text-muted)' }}>
          Update your login email and password
        </p>
      </div>

      {/* Current account info pill */}
      <div style={{ marginBottom: 24 }}>
        {emailFetching ? (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: '#F1F5F9', borderRadius: 100, padding: '6px 20px',
            fontSize: 13, color: '#94A3B8',
          }}>
            Loading account info…
          </div>
        ) : currentEmail ? (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: '#EEF2FF', border: '1px solid #C7D2FE',
            borderRadius: 100, padding: '6px 14px',
            fontSize: 13, color: '#4338CA', fontWeight: 500,
          }}>
            <User size={13} />
            Logged in as: <strong style={{ marginLeft: 4 }}>{currentEmail}</strong>
          </div>
        ) : null}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>

        {/* ── Change Email ── */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #4F46E5, #818CF8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Mail size={16} color="#fff" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Change Email</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                Update your login email address
              </div>
            </div>
          </div>

          <StatusBox status={emailStatus} />

          <form onSubmit={handleEmailSave} noValidate>
            <div className="form-group">
              <label className="form-label">New Email Address</label>
              <input
                type="email"
                className="form-control"
                placeholder="new@example.com"
                value={emailForm.newEmail}
                onChange={e => setEmailForm({ ...emailForm, newEmail: e.target.value })}
                autoComplete="email"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm with Current Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Enter current password"
                  value={emailForm.currentPassword}
                  onChange={e => setEmailForm({ ...emailForm, currentPassword: e.target.value })}
                  autoComplete="current-password"
                />
              </div>
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', gap: 6 }}
              disabled={emailLoading}
            >
              {emailLoading
                ? 'Saving\u2026'
                : <><Save size={14} />{' '}Save Email</>
              }
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
              flexShrink: 0,
            }}>
              <Lock size={16} color="#fff" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Change Password</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                Use a strong, unique password
              </div>
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

            {/* Password strength bar */}
            {strength && (
              <div style={{ marginTop: -10, marginBottom: 16 }}>
                <div style={{
                  height: 4, borderRadius: 4,
                  background: '#E2E8F0', overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%', width: strength.width,
                    background: strength.color,
                    borderRadius: 4,
                    transition: 'width 0.3s ease, background 0.3s ease',
                  }} />
                </div>
                <span style={{
                  fontSize: 11, color: strength.color,
                  fontWeight: 600, marginTop: 3, display: 'block',
                }}>
                  {strength.label}
                </span>
              </div>
            )}

            <PasswordField
              label="Confirm New Password"
              value={passForm.confirmPassword}
              onChange={e => setPassForm({ ...passForm, confirmPassword: e.target.value })}
              show={showConfirm}
              onToggle={() => setShowConfirm(p => !p)}
              placeholder="Repeat new password"
            />

            {/* Real-time mismatch warning */}
            {passForm.confirmPassword && passForm.newPassword !== passForm.confirmPassword && (
              <div style={{
                fontSize: 12, color: '#DC2626',
                marginTop: -10, marginBottom: 14,
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <AlertCircle size={12} />{' '}Passwords do not match
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{
                width: '100%', justifyContent: 'center', gap: 6,
                background: 'linear-gradient(135deg, #059669, #10B981)',
              }}
              disabled={passLoading}
            >
              {passLoading
                ? 'Saving\u2026'
                : <><ShieldCheck size={14} />{' '}Update Password</>
              }
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
