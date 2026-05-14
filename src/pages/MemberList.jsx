import { useState } from 'react';
import { Search, Edit2, Trash2, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { demoMembers } from '../data/demoData';

export default function MemberList() {
  const [members, setMembers] = useState(demoMembers);
  const [query, setQuery]     = useState('');
  const [editMember, setEditMember] = useState(null);
  const [deleteId, setDeleteId]     = useState(null);

  const filtered = members.filter(m =>
    m.fullName.toLowerCase().includes(query.toLowerCase()) ||
    m.idNumber.includes(query)
  );

  const handleDelete = () => {
    setMembers(prev => prev.filter(m => m._id !== deleteId));
    setDeleteId(null);
  };

  const handleEdit = (e) => {
    e.preventDefault();
    setMembers(prev => prev.map(m => m._id === editMember._id ? { ...editMember } : m));
    setEditMember(null);
  };

  /* Avatar circle */
  const Avatar = ({ name }) => (
    <div style={{
      width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg, #4F46E5, #818CF8)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontSize: 15, fontWeight: 700,
    }}>
      {name.charAt(0)}
    </div>
  );

  return (
    <div className="page-content">

      {/* ── Page Header ── */}
      <div style={{ marginBottom: 20 }}>
        <div className="page-title">Members</div>
        <div className="page-subtitle">{members.length} registered members</div>

        {/* Search + Add row — stacks naturally on mobile due to flex-wrap */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="search-wrapper" style={{ flex: '1 1 200px', minWidth: 0 }}>
            <Search size={15} />
            <input
              className="form-control"
              style={{ paddingLeft: 38, width: '100%' }}
              placeholder="Search by name or NIC…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          <Link to="/register" className="btn btn-primary" style={{ flexShrink: 0 }}>
            <UserPlus size={15} /> Add Member
          </Link>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          DESKTOP TABLE (hidden on mobile)
      ══════════════════════════════════════════ */}
      <div className="table-wrapper hide-on-mobile">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Full Name</th>
              <th>NIC Number</th>
              <th>Village</th>
              <th>Contact</th>
              <th>Age</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="empty-state">
                    <Search size={32} />
                    <p>No members found for &ldquo;{query}&rdquo;</p>
                  </div>
                </td>
              </tr>
            ) : filtered.map((m, i) => (
              <tr key={m._id}>
                <td style={{ color: 'var(--color-text-muted)' }}>{i + 1}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: '50%',
                      background: 'linear-gradient(135deg, #4F46E5, #818CF8)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0
                    }}>
                      {m.fullName.charAt(0)}
                    </div>
                    <span style={{ fontWeight: 600 }}>{m.fullName}</span>
                  </div>
                </td>
                <td>
                  <code style={{ fontSize: 12, background: '#F1F5F9', padding: '2px 6px', borderRadius: 4 }}>
                    {m.idNumber}
                  </code>
                </td>
                <td>{m.village}</td>
                <td>{m.contactNumber}</td>
                <td>{m.age}</td>
                <td style={{ color: 'var(--color-text-muted)' }}>
                  {new Date(m.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditMember({ ...m })} title="Edit">
                      <Edit2 size={14} />
                    </button>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }}
                      onClick={() => setDeleteId(m._id)} title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ══════════════════════════════════════════
          MOBILE CARDS (hidden on desktop)
      ══════════════════════════════════════════ */}
      <div className="show-on-mobile">
        {filtered.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <Search size={32} />
              <p>No members found</p>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(m => (
              <div key={m._id} style={{
                background: 'var(--color-bg-card)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '14px 16px',
                boxShadow: '0 1px 3px var(--color-shadow)',
              }}>
                {/* Top row: avatar + name + action buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Avatar name={m.fullName} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{m.fullName}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                      {m.village} &nbsp;·&nbsp; Age {m.age}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditMember({ ...m })}>
                      <Edit2 size={14} />
                    </button>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }}
                      onClick={() => setDeleteId(m._id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Bottom row: NIC + Contact */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr',
                  gap: '6px 16px', marginTop: 12, paddingTop: 10,
                  borderTop: '1px solid var(--color-border)',
                }}>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>NIC</div>
                    <div style={{ fontSize: 12, fontWeight: 600, fontFamily: 'monospace' }}>{m.idNumber}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Contact</div>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{m.contactNumber}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Pagination ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginTop: 16, color: 'var(--color-text-muted)', fontSize: 13,
        flexWrap: 'wrap', gap: 8
      }}>
        <span>Showing {filtered.length} of {members.length} members</span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-outline btn-sm">Previous</button>
          <button className="btn btn-primary btn-sm">1</button>
          <button className="btn btn-outline btn-sm">Next</button>
        </div>
      </div>

      {/* ── Edit Modal ── */}
      {editMember && (
        <div className="modal-overlay" onClick={() => setEditMember(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Edit Member</div>
              <button className="btn btn-ghost" onClick={() => setEditMember(null)}>✕</button>
            </div>
            <form onSubmit={handleEdit}>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input className="form-control" value={editMember.fullName}
                    onChange={e => setEditMember({ ...editMember, fullName: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">NIC Number</label>
                  <input className="form-control" value={editMember.idNumber}
                    onChange={e => setEditMember({ ...editMember, idNumber: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Village</label>
                  <input className="form-control" value={editMember.village}
                    onChange={e => setEditMember({ ...editMember, village: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Contact Number</label>
                  <input className="form-control" value={editMember.contactNumber}
                    onChange={e => setEditMember({ ...editMember, contactNumber: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Age</label>
                  <input className="form-control" type="number" min={18} max={100} value={editMember.age}
                    onChange={e => setEditMember({ ...editMember, age: Number(e.target.value) })} required />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                <button type="button" className="btn btn-outline" onClick={() => setEditMember(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: 'center', padding: '8px 0 20px' }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%', background: '#FEE2E2',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px'
              }}>
                <Trash2 size={22} color="#EF4444" />
              </div>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Delete Member?</div>
              <div style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
                This will permanently remove the member and all associated records.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setDeleteId(null)}>Cancel</button>
              <button className="btn btn-danger"  style={{ flex: 1 }} onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
