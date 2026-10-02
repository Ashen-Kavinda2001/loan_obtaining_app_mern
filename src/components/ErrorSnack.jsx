import { AlertTriangle, X } from 'lucide-react';

// Error message at the bottom of the screen (replaces alert()); shown while `message` is set
export default function ErrorSnack({ message, onClose }) {
  if (!message) return null;
  return (
    <div role="alert" style={{
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
      <button onClick={onClose} aria-label="Dismiss" style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 2, display:'flex' }}>
        <X size={14} />
      </button>
    </div>
  );
}
