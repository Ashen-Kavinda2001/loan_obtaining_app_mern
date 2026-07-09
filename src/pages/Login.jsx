import { useState } from 'react';
import { Lock, Landmark, Eye, EyeOff, Mail, KeyRound, ArrowLeft, CheckCircle } from 'lucide-react';
import client from '../api/client';

// ── Forgot Password sub-flow ────────────────────────────────────────────────
function ForgotPassword({ onBack }) {
  const [step, setStep]       = useState(1); // 1 = enter email, 2 = enter OTP + new password
  const [email, setEmail]     = useState('');
  const [otp, setOtp]         = useState('');
  const [newPass, setNewPass] = useState('');
  const [confPass, setConfPass] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const sendOtp = async (e) => {
    e.preventDefault();
    setError('');
    if (!email) { setError('Please enter your email.'); return; }
    setLoading(true);
    try {
      await client.post('/auth/forgot-password', { email });
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (!otp || !newPass || !confPass) { setError('Please fill in all fields.'); return; }
    if (newPass !== confPass) { setError('Passwords do not match.'); return; }
    if (newPass.length < 6)  { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      await client.post('/auth/verify-otp', { email, otp, newPassword: newPass });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired OTP.');
    } finally {
      setLoading(false);
    }
  };

  if (success) return (
    <div style={{ textAlign: 'center' }}>
      <CheckCircle size={48} color="#059669" style={{ marginBottom: 12 }} />
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Password Reset!</div>
      <div style={{ fontSize: 13, color: '#64748B', marginBottom: 20 }}>You can now log in with your new password.</div>
      <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={onBack}>
        Back to Login
      </button>
    </div>
  );

  return (
    <div>
      <button type="button" onClick={onBack}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, marginBottom: 16, padding: 0 }}>
        <ArrowLeft size={14} /> Back to Login
      </button>

      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
        {step === 1 ? 'Forgot Password' : 'Enter Reset Code'}
      </div>
      <div style={{ fontSize: 13, color: '#64748B', marginBottom: 20 }}>
        {step === 1
          ? 'Enter your email to receive a 6-digit reset code.'
          : `We sent a code to ${email}. Enter it below.`}
      </div>

      {error && (
        <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#991B1B', marginBottom: 16 }}>
          {error}
        </div>
      )}

      {step === 1 ? (
        <form onSubmit={sendOtp} noValidate>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input type="email" className="form-control" placeholder="admin@example.com"
              value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 14 }}>
            {loading ? 'Sending…' : <><Mail size={14} /> Send Reset Code</>}
          </button>
        </form>
      ) : (
        <form onSubmit={resetPassword} noValidate>
          <div className="form-group">
            <label className="form-label">6-Digit Code</label>
            <input type="text" className="form-control" placeholder="123456"
              value={otp} onChange={e => setOtp(e.target.value)} maxLength={6}
              style={{ letterSpacing: 8, fontSize: 20, textAlign: 'center', fontWeight: 700 }} />
          </div>
          <div className="form-group">
            <label className="form-label">New Password</label>
            <div style={{ position: 'relative' }}>
              <input type={showNew ? 'text' : 'password'} className="form-control"
                placeholder="At least 6 characters"
                value={newPass} onChange={e => setNewPass(e.target.value)}
                style={{ paddingRight: 40 }} />
              <button type="button"
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}
                onClick={() => setShowNew(p => !p)}>
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Confirm New Password</label>
            <input type="password" className="form-control" placeholder="Repeat password"
              value={confPass} onChange={e => setConfPass(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 14 }}>
            {loading ? 'Resetting…' : <><KeyRound size={14} /> Reset Password</>}
          </button>
          <button type="button"
            style={{ width: '100%', marginTop: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', fontSize: 13 }}
            onClick={() => { setStep(1); setError(''); setOtp(''); setNewPass(''); setConfPass(''); }}>
            Resend code
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.email || !form.password) { setError('Please fill in all fields.'); return; }

    setLoading(true);
    try {
      const { data } = await client.post('/auth/login', form);
      onLogin(data.token);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password.');
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
            width: 56, height: 56, borderRadius: 16, background: 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px',
            backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)'
          }}>
            <Landmark size={26} color="#fff" />
          </div>
          <div style={{ color: '#fff', fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>LoanManager</div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 4 }}>Admin Portal — Secure Login</div>
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

              <form onSubmit={handleSubmit} noValidate>
                {error && (
                  <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#991B1B', marginBottom: 16 }}>
                    {error}
                  </div>
                )}

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
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
