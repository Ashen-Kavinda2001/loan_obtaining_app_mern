import { X, ShieldCheck, FileText } from 'lucide-react';

export default function PrivacyPolicyModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        maxWidth: '680px',
        width: '100%',
        maxHeight: '85vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#EEF2FF',
              color: '#4F46E5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                Data Privacy Policy & Terms of Service
              </h2>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                FGI Community Loan Management System • Sri Lanka PDPA Aligned
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#94A3B8',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{
          padding: '24px',
          overflowY: 'auto',
          fontSize: '13px',
          lineHeight: '1.6',
          color: '#334155',
        }}>
          <div style={{ marginBottom: '18px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B', marginBottom: '6px' }}>
              1. Purpose of Data Collection
            </h3>
            <p style={{ margin: 0 }}>
              FGI Community Loan Services collects and processes borrower information exclusively for credit risk
              underwriting, installment scheduling, loan balance calculation, and financial ledger accounting.
            </p>
          </div>

          <div style={{ marginBottom: '18px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B', marginBottom: '6px' }}>
              2. Personal & Sensitive Identifiers Collected
            </h3>
            <p style={{ margin: 0 }}>
              In compliance with local financial regulations, the following borrower records are captured:
            </p>
            <ul style={{ paddingLeft: '20px', marginTop: '6px', marginBottom: 0 }}>
              <li><strong>National Identity Card (NIC):</strong> Used solely as a unique civic identifier to prevent duplicate lending and impersonation.</li>
              <li><strong>Contact Number:</strong> Used to dispatch automated SMS receipts, payment reminders, and balance updates.</li>
              <li><strong>Village / Residential Area:</strong> Used for community credit group clustering and field agent assignment.</li>
              <li><strong>Transaction Ledger:</strong> Monitored history of installments, excess payment cascades, and remaining balances.</li>
            </ul>
          </div>

          <div style={{ marginBottom: '18px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B', marginBottom: '6px' }}>
              3. Third-Party Processors & Infrastructure
            </h3>
            <p style={{ margin: 0 }}>
              Personal data is never sold or shared for commercial advertising. Data is processed through:
            </p>
            <ul style={{ paddingLeft: '20px', marginTop: '6px', marginBottom: 0 }}>
              <li><strong>Text.lk SMS Gateway:</strong> Dispatches transactional SMS messages via TLS-encrypted API calls.</li>
              <li><strong>MongoDB Atlas:</strong> Stores borrower data with automated encryption-at-rest.</li>
            </ul>
          </div>

          <div style={{ marginBottom: '18px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B', marginBottom: '6px' }}>
              4. Data Retention & Erasure Policy
            </h3>
            <p style={{ margin: 0 }}>
              Per statutory financial record-keeping standards, transaction ledgers and active loan histories must be retained
              for a minimum period of <strong>7 years</strong>. Borrowers with no open loans or active financial liabilities may
              request account removal through an authorized loan officer.
            </p>
          </div>

          <div>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B', marginBottom: '6px' }}>
              5. Security Measures
            </h3>
            <p style={{ margin: 0 }}>
              All administrative sessions operate over HTTPS with Strict-Transport-Security, HttpOnly cookies,
              per-user rate limiters, and server-side cryptographic access control.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #E2E8F0',
          backgroundColor: '#F8FAFC',
          display: 'flex',
          justifyContent: 'flex-end',
        }}>
          <button
            onClick={onClose}
            className="btn btn-primary"
            style={{ padding: '8px 20px', fontSize: '13px' }}
          >
            I Understand & Close
          </button>
        </div>
      </div>
    </div>
  );
}
