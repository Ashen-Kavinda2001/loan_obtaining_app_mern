import { useState } from 'react';
import { Lock, Landmark, Eye, EyeOff } from 'lucide-react';

export default function Login({ onLogin }) {
  const [form, setForm]       = useState({ email: '', password: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!form.email || !form.password) { setError('Please fill in all fields.'); return; }
    setLoading(true);
    // Demo: accept any credentials
    setTimeout(() => {
      setLoading(false);
      if (form.password.length >= 4) { onLogin(); }
      else { setError('Invalid credentials. (Demo: use any password ≥ 4 chars)'); }
    }, 900);
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
          <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 6 }}>Welcome back</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 24 }}>Sign in to access the dashboard</div>

          <form onSubmit={handleSubmit} noValidate>
            {error && (
              <div style={{
                background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: 8,
                padding: '10px 14px', fontSize: 13, color: '#991B1B', marginBottom: 16
              }}>{error}</div>
            )}

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email" className="form-control" placeholder="admin@example.com"
                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div className="form-group" style={{ position: 'relative' }}>
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'} className="form-control" placeholder="Enter your password"
                  value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                  style={{ paddingRight: 40 }}
                />
                <button type="button"
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}
                  onClick={() => setShowPass(!showPass)}
                >
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

         
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
