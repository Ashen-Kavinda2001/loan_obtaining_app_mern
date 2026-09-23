import { useState } from 'react';
import { Lock, Eye, EyeOff, Mail, KeyRound, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import client from '../api/client';
import fgiLogo from '../assets/logo.jpeg';
import PrivacyPolicyModal from '../components/PrivacyPolicyModal';

// ── Forgot Password sub-flow ────────────────────────────────────────────────
function ForgotPassword({ onBack }) {
  const [step, setStep]         = useState(1); // 1=email, 2=OTP+new-password
  const [email, setEmail]       = useState('');
  const [otp, setOtp]           = useState('');
  const [newPass, setNewPass]   = useState('');
  const [confPass, setConfPass] = useState('');
  const [loading, setLoading]   = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState(false);
  const [showNew, setShowNew]   = useState(false);
  const [showConf, setShowConf] = useState(false);

  // Step 1: Send OTP
  const sendOtp = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) { setError('Please enter your email.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.'); return;
    }
    setLoading(true);
    try {
      await client.post('/auth/forgot-password', { email: email.trim() });
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP + reset
  const resetPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (!otp)      { setError('Please enter the 6-digit code.'); return; }
    if (otp.length < 6) { setError('Code must be exactly 6 digits.'); return; }
    if (!newPass)  { setError('Please enter a new password.'); return; }
    if (!confPass) { setError('Please confirm your new password.'); return; }
    if (newPass.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPass)) {
      setError('Password must include at least one uppercase letter, one lowercase letter, and one number.');
      return;
    }
    setLoading(true);
    try {
      await client.post('/auth/verify-otp', { email: email.trim(), otp, newPassword: newPass });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP (actually calls the API again)
  const handleResend = async () => {
    setError('');
    setResending(true);
    setOtp(''); setNewPass(''); setConfPass('');
    try {
      await client.post('/auth/forgot-password', { email: email.trim() });
      setError(''); // clear any previous error
      // Show brief confirmation inline
    } catch (err) {
      setError(err.response?.data?.message || 'Could not resend code. Try again.');
    } finally {
      setResending(false);
    }
  };

  // ── Success screen ────────────────────────────────────────────────────────
  if (success) return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        background: '#D1FAE5', display: 'flex', alignItems: 'center',
        justifyContent: 'center', margin: '0 auto 16px',
      }}>
        <CheckCircle size={32} color="#059669" />
      </div>
      <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 8 }}>Password Reset!</div>
      <div style={{ fontSize: 13, color: '#64748B', marginBottom: 24 }}>
        Your password has been updated. You can now sign in with your new password.
      </div>
      <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px' }} onClick={onBack}>
        Back to Login
      </button>
    </div>
  );

  return (
    <div>
      <button type="button" onClick={onBack}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, marginBottom: 20, padding: 0 }}>
        <ArrowLeft size={14} /> Back to Login
      </button>

      {/* Step indicator dots */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
        {[1, 2].map(s => (
          <div key={s} style={{
            width: s === step ? 20 : 8, height: 8, borderRadius: 4,
            background: s <= step ? '#4F46E5' : '#CBD5E1',
            transition: 'width 0.3s ease, background 0.3s ease',
          }} />
        ))}
      </div>

      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
        {step === 1 ? 'Forgot Password' : 'Reset Your Password'}
      </div>
      <div style={{ fontSize: 13, color: '#64748B', marginBottom: 20 }}>
        {step === 1
          ? 'Enter your account email to receive a 6-digit reset code.'
          : <>Code sent to <strong>{email}</strong>. Check your inbox (and spam folder).</>}
      </div>

      {/* Error box */}
      {error && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 8,
          background: '#FEF2F2', border: '1px solid #FECACA',
          borderRadius: 8, padding: '10px 14px',
          fontSize: 13, color: '#991B1B', marginBottom: 16,
        }}>
          <AlertCircle size={14} style={{ marginTop: 1, flexShrink: 0 }} />
          {error}
        </div>
      )}

      {/* ── Step 1: Email ── */}
      {step === 1 && (
        <form onSubmit={sendOtp} noValidate>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email" className="form-control"
              placeholder="admin@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 14, gap: 6 }}>
            {loading ? 'Sending code…' : <><Mail size={14} /> Send Reset Code</>}
          </button>
        </form>
      )}

      {/* ── Step 2: OTP + New Password ── */}
      {step === 2 && (
        <form onSubmit={resetPassword} noValidate>
          {/* OTP input */}
          <div className="form-group">
            <label className="form-label">6-Digit Reset Code</label>
            <input
              type="text" className="form-control"
              placeholder="000000"
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6} inputMode="numeric" autoFocus
              style={{ letterSpacing: 10, fontSize: 22, textAlign: 'center', fontWeight: 800 }}
            />
            <span style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
              Code expires in 15 minutes
            </span>
          </div>

          {/* New password */}
          <div className="form-group">
            <label className="form-label">New Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showNew ? 'text' : 'password'} className="form-control"
                placeholder="At least 8 characters"
                value={newPass} onChange={e => setNewPass(e.target.value)}
                style={{ paddingRight: 42 }} autoComplete="new-password"
              />
              <button type="button"
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex', alignItems: 'center', padding: 0 }}
                onClick={() => setShowNew(p => !p)} aria-label={showNew ? 'Hide' : 'Show'}>
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Confirm password */}
          <div className="form-group">
            <label className="form-label">Confirm New Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showConf ? 'text' : 'password'} className="form-control"
                placeholder="Repeat new password"
                value={confPass} onChange={e => setConfPass(e.target.value)}
                style={{ paddingRight: 42 }} autoComplete="new-password"
              />
              <button type="button"
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex', alignItems: 'center', padding: 0 }}
                onClick={() => setShowConf(p => !p)} aria-label={showConf ? 'Hide' : 'Show'}>
                {showConf ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {confPass && newPass !== confPass && (
              <span style={{ fontSize: 11, color: '#EF4444', marginTop: 3, display: 'block' }}>
                Passwords do not match
              </span>
            )}
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 14, gap: 6 }}>
            {loading ? 'Resetting…' : <><KeyRound size={14} /> Reset Password</>}
          </button>

          {/* Resend — actually calls the API */}
          <button type="button"
            style={{
              width: '100%', marginTop: 10,
              background: 'none', border: '1.5px dashed #CBD5E1',
              borderRadius: 6, cursor: resending ? 'default' : 'pointer',
              color: '#64748B', fontSize: 13, padding: '9px 0',
              opacity: resending ? 0.6 : 1,
            }}
            disabled={resending}
            onClick={handleResend}>
            {resending ? 'Resending…' : `Resend code to ${email}`}
          </button>
        </form>
      )}
    </div>
  );
}

// ── Main Login page ─────────────────────────────────────────────────────────
export default function Login({ onLogin }) {
  const [form, setForm]       = useState({ email: '', password: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const trimmedEmail = form.email ? form.email.trim() : '';
    if (!trimmedEmail || !form.password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await client.post('/auth/login', {
        email: trimmedEmail,
        password: form.password,
      });
      onLogin(data);
    } catch (err) {
      console.error('Login failure:', err);
      const serverMsg = err.response?.data?.message;
      if (serverMsg) {
        setError(serverMsg);
      } else if (err.code === 'ERR_NETWORK' || !err.response) {
        setError('Cannot connect to server. Please check your internet connection.');
      } else {
        setError('Invalid email or password. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #4338CA 100%)',
      padding: 16
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20,
            overflow: 'hidden',
            margin: '0 auto 14px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
            border: '2px solid rgba(255,255,255,0.3)',
          }}>
            <img src={fgiLogo} alt="FGI Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div style={{ color: '#fff', fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>FGI Loan App</div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 4 }}>Admin Portal</div>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(255,255,255,0.95)', borderRadius: 20, padding: '36px 32px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
        }}>
          {showForgot ? (
            <ForgotPassword onBack={() => setShowForgot(false)} />
          ) : (
            <>
              <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 6 }}>Welcome back</div>
              <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 24 }}>Sign in to access the dashboard</div>

              {/* ── Error banner — lives OUTSIDE the form to avoid re-render flash */}
              <div
                role="alert"
                style={{
                  overflow: 'hidden',
                  maxHeight: error ? 80 : 0,
                  opacity: error ? 1 : 0,
                  marginBottom: error ? 16 : 0,
                  transition: 'max-height 0.25s ease, opacity 0.25s ease, margin-bottom 0.25s ease',
                }}
              >
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: '#FEF2F2', border: '1px solid #FECACA',
                  borderRadius: 8, padding: '10px 14px',
                  fontSize: 13, color: '#991B1B',
                }}>
                  <AlertCircle size={15} style={{ flexShrink: 0 }} />
                  <span>{error}</span>
                </div>
              </div>

              <form onSubmit={handleSubmit} noValidate>

                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email" className="form-control" placeholder="admin@example.com"
                    value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label className="form-label" style={{ margin: 0 }}>Password</label>
                    <button type="button"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4F46E5', fontSize: 12, fontWeight: 600, padding: 0 }}
                      onClick={() => setShowForgot(true)}>
                      Forgot password?
                    </button>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPass ? 'text' : 'password'} className="form-control" placeholder="Enter your password"
                      value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                      style={{ paddingRight: 40 }}
                    />
                    <button type="button"
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}
                      onClick={() => setShowPass(!showPass)}>
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit" className="btn btn-primary" disabled={loading}
                  style={{ width: '100%', justifyContent: 'center', padding: '12px', marginTop: 8, fontSize: 14 }}
                >
                  {loading ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)',
                        borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite'
                      }} />
                      Signing in…
                    </span>
                  ) : (
                    <><Lock size={15} /> Sign In</>
                  )}
                </button>
              </form>
            </>
          )}
        </div>

        {/* Footer legal link */}
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button
            type="button"
            onClick={() => setShowPrivacy(true)}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.65)',
              fontSize: 12,
              cursor: 'pointer',
              textDecoration: 'underline',
              transition: 'color 0.2s',
            }}
            onMouseOver={(e) => e.currentTarget.style.color = '#fff'}
            onMouseOut={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.65)'}
          >
            Data Privacy Policy & Terms of Service
          </button>
        </div>
      </div>

      <PrivacyPolicyModal isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
