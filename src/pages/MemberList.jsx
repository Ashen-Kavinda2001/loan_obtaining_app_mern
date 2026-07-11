import { useState, useEffect, useCallback } from 'react';
import {
  Search, Edit2, Trash2, UserPlus, Users, ChevronRight,
  ArrowLeft, Pencil, X, Check, FolderOpen
} from 'lucide-react';
import { Link } from 'react-router-dom';
import client from '../api/client';

const GROUP_GRADIENTS = [
  'linear-gradient(135deg,#4F46E5,#818CF8)',
  'linear-gradient(135deg,#059669,#34D399)',
  'linear-gradient(135deg,#D97706,#FCD34D)',
  'linear-gradient(135deg,#DC2626,#F87171)',
  'linear-gradient(135deg,#7C3AED,#C4B5FD)',
  'linear-gradient(135deg,#0891B2,#67E8F9)',
  'linear-gradient(135deg,#DB2777,#F9A8D4)',
  'linear-gradient(135deg,#65A30D,#BEF264)',
];

function Avatar({ name, size = 36 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg,#4F46E5,#818CF8)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 700, fontSize: size * 0.38,
    }}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export default function MemberList() {
  // ── Core state ─────────────────────────────────────────────
  const [searchMode, setSearchMode] = useState('group'); // 'group' | 'member'
  const [query, setQuery]           = useState('');
  const [groups, setGroups]         = useState([]);
  const [ungroupedCount, setUngroupedCount] = useState(0);
  const [selectedGroup, setSelectedGroup]   = useState(null); // null | group | 'ungrouped'
  const [members, setMembers]   = useState([]);   // members in current context
  const [loading, setLoading]   = useState(true);

  // ── Modal state ─────────────────────────────────────────────
  const [editGroup, setEditGroup]         = useState(null);
  const [editGroupName, setEditGroupName] = useState('');
  const [deleteGroupId, setDeleteGroupId] = useState(null);
  const [editMember, setEditMember]       = useState(null);
  const [deleteId, setDeleteId]           = useState(null);
  const [saving, setSaving]               = useState(false);

  // ── Fetch groups ─────────────────────────────────────────────
  const fetchGroups = useCallback(async () => {
    try {
      const { data } = await client.get('/groups');
      setGroups(data.groups || []);
      setUngroupedCount(data.ungroupedCount || 0);
    } catch { /* silent */ }
  }, []);

  // ── Fetch members (all, by group, or ungrouped) ─────────────
  const fetchMembers = useCallback(async (context) => {
    setLoading(true);
    try {
      let url = '/members';
      if (context && context !== 'ungrouped') url += `?groupId=${context._id}`;
      else if (context === 'ungrouped')        url += '?ungrouped=true';
      const { data } = await client.get(url);
      setMembers(data);
    } catch { setMembers([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchGroups();
    if (searchMode === 'member') fetchMembers(null);
    else setLoading(false);
  }, []);

  // When switching to member search mode fetch all members
  useEffect(() => {
    if (searchMode === 'member') {
      fetchMembers(null);
    }
  }, [searchMode]);

  // Drill into a group
  const enterGroup = (group) => {
    setSelectedGroup(group);
    setQuery('');
    fetchMembers(group);
  };
  const enterUngrouped = () => {
    setSelectedGroup('ungrouped');
    setQuery('');
    fetchMembers('ungrouped');
  };
  const goBack = () => {
    setSelectedGroup(null);
    setQuery('');
    fetchGroups();
  };

  // ── Group CRUD ───────────────────────────────────────────────
  const handleRenameGroup = async () => {
    if (!editGroupName.trim()) return;
    setSaving(true);
    try {
      const { data } = await client.put(`/groups/${editGroup._id}`, { name: editGroupName });
      setGroups(prev => prev.map(g => g._id === data._id ? data : g));
      if (selectedGroup && selectedGroup._id === data._id) setSelectedGroup(data);
      setEditGroup(null);
    } catch (err) { alert(err.response?.data?.message || 'Failed to rename'); }
    finally { setSaving(false); }
  };

  const handleDeleteGroup = async () => {
    try {
      await client.delete(`/groups/${deleteGroupId}`);
      setGroups(prev => prev.filter(g => g._id !== deleteGroupId));
      setDeleteGroupId(null);
      fetchGroups();
    } catch (err) { alert(err.response?.data?.message || 'Failed to delete'); }
  };

  // ── Member CRUD ──────────────────────────────────────────────
  const handleEditMember = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await client.put(`/members/${editMember._id}`, editMember);
      setMembers(prev => prev.map(m => m._id === data._id ? data : m));
      setEditMember(null);
      fetchGroups(); // refresh counts
    } catch (err) { alert(err.response?.data?.message || 'Failed to update'); }
    finally { setSaving(false); }
  };

  const handleDeleteMember = async () => {
    try {
      await client.delete(`/members/${deleteId}`);
      setMembers(prev => prev.filter(m => m._id !== deleteId));
      setDeleteId(null);
      fetchGroups();
    } catch (err) { alert(err.response?.data?.message || 'Failed to delete member'); }
  };

  // ── Derived lists ────────────────────────────────────────────
  const filteredGroups = groups.filter(g =>
    g.name.toLowerCase().includes(query.toLowerCase())
  );
  const filteredMembers = members.filter(m =>
    m.fullName.toLowerCase().includes(query.toLowerCase()) ||
    m.idNumber.includes(query)
  );

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="page-content">

      {/* ── Header ── */}
      <div style={{ marginBottom: 20 }}>
        {/* Breadcrumb when inside a group */}
        {selectedGroup && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, fontSize: 13, color: 'var(--color-text-muted)' }}>
            <button className="btn btn-ghost btn-sm" style={{ padding: '2px 6px', gap: 4 }} onClick={goBack}>
              <ArrowLeft size={13} /> Members
            </button>
            <ChevronRight size={13} />
            <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>
              {selectedGroup === 'ungrouped' ? 'Ungrouped' : selectedGroup.name}
            </span>
          </div>
        )}

        <div className="page-title">
          {selectedGroup
            ? (selectedGroup === 'ungrouped' ? 'Ungrouped Members' : selectedGroup.name)
            : 'Members'}
        </div>
        <div className="page-subtitle" style={{ marginBottom: 14 }}>
          {selectedGroup
            ? `${filteredMembers.length} member${filteredMembers.length !== 1 ? 's' : ''}`
            : `${groups.length} group${groups.length !== 1 ? 's' : ''} · ${groups.reduce((s, g) => s + g.memberCount, 0) + ungroupedCount} total members`}
        </div>

        {/* ── Search bar + mode toggle ── */}
        {!selectedGroup && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Mode toggle */}
            <div style={{
              display: 'flex', borderRadius: 8,
              border: '1px solid var(--color-border)',
              overflow: 'hidden', flexShrink: 0,
            }}>
              {['group', 'member'].map(mode => (
                <button key={mode}
                  onClick={() => { setSearchMode(mode); setQuery(''); }}
                  style={{
                    padding: '7px 14px', fontSize: 12, fontWeight: 600,
                    border: 'none', cursor: 'pointer',
                    background: searchMode === mode ? '#4F46E5' : 'var(--color-bg-card)',
                    color: searchMode === mode ? '#fff' : 'var(--color-text-muted)',
                    transition: 'all 0.15s',
                  }}>
                  {mode === 'group' ? '🗂 Search Group' : '👤 Search Member'}
                </button>
              ))}
            </div>

            <div className="search-wrapper" style={{ flex: '1 1 180px', minWidth: 0 }}>
              <Search size={15} />
              <input className="form-control" style={{ paddingLeft: 38, width: '100%' }}
                placeholder={searchMode === 'group' ? 'Search groups…' : 'Search by name or NIC…'}
                value={query} onChange={e => setQuery(e.target.value)} />
            </div>

            <Link to="/register" className="btn btn-primary" style={{ flexShrink: 0 }}>
              <UserPlus size={15} /> Add Member
            </Link>
          </div>
        )}

        {/* Search bar when inside a group */}
        {selectedGroup && (
          <div style={{ display: 'flex', gap: 8 }}>
            <div className="search-wrapper" style={{ flex: 1 }}>
              <Search size={15} />
              <input className="form-control" style={{ paddingLeft: 38, width: '100%' }}
                placeholder="Search by name or NIC…"
                value={query} onChange={e => setQuery(e.target.value)} />
            </div>
            <Link to="/register" className="btn btn-primary" style={{ flexShrink: 0 }}>
              <UserPlus size={15} /> Add Member
            </Link>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════
          VIEW 1 — GROUPS GRID (default)
      ══════════════════════════════════════════════════ */}
      {!selectedGroup && searchMode === 'group' && (
        <div>
          {filteredGroups.length === 0 && ungroupedCount === 0 && query === '' && (
            <div className="card">
              <div className="empty-state">
                <FolderOpen size={32} />
                <p>No groups yet. Create one from the <Link to="/register">Register Member</Link> page.</p>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))', gap: 14 }}>
            {filteredGroups.map((g, idx) => (
              <GroupCard
                key={g._id}
                group={g}
                gradient={GROUP_GRADIENTS[idx % GROUP_GRADIENTS.length]}
                onClick={() => enterGroup(g)}
                onEdit={() => { setEditGroup(g); setEditGroupName(g.name); }}
                onDelete={() => setDeleteGroupId(g._id)}
              />
            ))}

            {/* Ungrouped card — always shown if there are ungrouped members */}
            {ungroupedCount > 0 && (
              <div
                onClick={enterUngrouped}
                style={{
                  background: 'var(--color-bg-card)', border: '2px dashed var(--color-border)',
                  borderRadius: 12, padding: 20, cursor: 'pointer',
                  transition: 'box-shadow 0.2s',
                  display: 'flex', flexDirection: 'column', gap: 12,
                }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px var(--color-shadow)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 10,
                  background: '#F1F5F9',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Users size={22} color="#94A3B8" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text)' }}>Ungrouped</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                    {ungroupedCount} member{ungroupedCount !== 1 ? 's' : ''}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 4 }}>
                  View members <ChevronRight size={13} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          VIEW 2 — ALL MEMBERS (member search mode)
      ══════════════════════════════════════════════════ */}
      {!selectedGroup && searchMode === 'member' && (
        <MembersTable
          members={filteredMembers}
          query={query}
          loading={loading}
          showGroup
          onEdit={m => setEditMember({ ...m, groupId: m.groupId?._id || '' })}
          onDelete={id => setDeleteId(id)}
        />
      )}

      {/* ══════════════════════════════════════════════════
          VIEW 3 — MEMBERS INSIDE A GROUP
      ══════════════════════════════════════════════════ */}
      {selectedGroup && (
        <MembersTable
          members={filteredMembers}
          query={query}
          loading={loading}
          showGroup={false}
          onEdit={m => setEditMember({ ...m, groupId: m.groupId?._id || '' })}
          onDelete={id => setDeleteId(id)}
        />
      )}

      {/* ══════════════════════════════════════════════════
          MODALS
      ══════════════════════════════════════════════════ */}

      {/* Rename Group */}
      {editGroup && (
        <Modal onClose={() => setEditGroup(null)} title="Rename Group">
          <div className="form-group">
            <label className="form-label">Group Name</label>
            <input className="form-control" value={editGroupName}
              onChange={e => setEditGroupName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleRenameGroup()}
              autoFocus />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setEditGroup(null)}>Cancel</button>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleRenameGroup} disabled={saving}>
              {saving ? 'Saving…' : <><Check size={14} /> Save</>}
            </button>
          </div>
        </Modal>
      )}

      {/* Delete Group */}
      {deleteGroupId && (
        <Modal onClose={() => setDeleteGroupId(null)} title="">
          <div style={{ textAlign: 'center', padding: '0 0 16px' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <Trash2 size={22} color="#EF4444" />
            </div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Delete Group?</div>
            <div style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
              Members in this group will become <strong>Ungrouped</strong>. They will not be deleted.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setDeleteGroupId(null)}>Cancel</button>
            <button className="btn btn-danger"  style={{ flex: 1 }} onClick={handleDeleteGroup}>Delete</button>
          </div>
        </Modal>
      )}

      {/* Edit Member */}
      {editMember && (
        <Modal onClose={() => setEditMember(null)} title="Edit Member" wide>
          <form onSubmit={handleEditMember}>
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
                <label className="form-label">Contact</label>
                <input className="form-control" value={editMember.contactNumber}
                  onChange={e => setEditMember({ ...editMember, contactNumber: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Age</label>
                <input className="form-control" type="number" min={18} max={100} value={editMember.age}
                  onChange={e => setEditMember({ ...editMember, age: Number(e.target.value) })} required />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
              <button type="button" className="btn btn-outline" onClick={() => setEditMember(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Member */}
      {deleteId && (
        <Modal onClose={() => setDeleteId(null)} title="">
          <div style={{ textAlign: 'center', padding: '0 0 16px' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <Trash2 size={22} color="#EF4444" />
            </div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Delete Member?</div>
            <div style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
              This will permanently remove the member and all associated records.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setDeleteId(null)}>Cancel</button>
            <button className="btn btn-danger"  style={{ flex: 1 }} onClick={handleDeleteMember}>Delete</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────── */

function GroupCard({ group, gradient, onClick, onEdit, onDelete }) {
  return (
    <div style={{
      background: 'var(--color-bg-card)', border: '1px solid var(--color-border)',
      borderRadius: 12, overflow: 'hidden', cursor: 'pointer',
      boxShadow: '0 1px 4px var(--color-shadow)',
      transition: 'transform 0.15s, box-shadow 0.15s',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px var(--color-shadow)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 4px var(--color-shadow)'; }}
    >
      {/* Gradient banner */}
      <div style={{ height: 6, background: gradient }} />

      <div style={{ padding: '16px 16px 14px' }} onClick={onClick}>
        <div style={{
          width: 44, height: 44, borderRadius: 10, background: gradient,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 800, fontSize: 18, marginBottom: 12,
        }}>
          {group.name.charAt(0).toUpperCase()}
        </div>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{group.name}</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 3 }}>
          {group.memberCount} member{group.memberCount !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', borderTop: '1px solid var(--color-border)' }}>
        <button
          className="btn btn-ghost btn-sm"
          style={{ flex: 1, justifyContent: 'center', borderRadius: 0, borderRight: '1px solid var(--color-border)' }}
          onClick={e => { e.stopPropagation(); onEdit(); }}
          title="Rename group"
        >
          <Pencil size={13} /> Rename
        </button>
        <button
          className="btn btn-ghost btn-sm"
          style={{ flex: 1, justifyContent: 'center', borderRadius: 0, color: 'var(--color-danger)' }}
          onClick={e => { e.stopPropagation(); onDelete(); }}
          title="Delete group"
        >
          <Trash2 size={13} /> Delete
        </button>
      </div>
    </div>
  );
}

function MembersTable({ members, query, loading, showGroup, onEdit, onDelete }) {
  if (loading) return (
    <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-text-muted)' }}>Loading members…</div>
  );

  return (
    <>
      {/* Desktop */}
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
              {showGroup && <th>Group</th>}
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.length === 0 ? (
              <tr><td colSpan={showGroup ? 9 : 8}>
                <div className="empty-state"><Search size={28} /><p>{query ? `No results for "${query}"` : 'No members here.'}</p></div>
              </td></tr>
            ) : members.map((m, i) => (
              <tr key={m._id}>
                <td style={{ color: 'var(--color-text-muted)' }}>{i + 1}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#4F46E5,#818CF8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700 }}>
                      {m.fullName.charAt(0)}
                    </div>
                    <span style={{ fontWeight: 600 }}>{m.fullName}</span>
                  </div>
                </td>
                <td><code style={{ fontSize: 12, background: '#F1F5F9', padding: '2px 6px', borderRadius: 4 }}>{m.idNumber}</code></td>
                <td>{m.village}</td>
                <td>{m.contactNumber}</td>
                <td>{m.age}</td>
                {showGroup && (
                  <td>
                    {m.groupId
                      ? <span style={{ fontSize: 12, background: '#EEF2FF', color: '#4F46E5', padding: '2px 8px', borderRadius: 100, fontWeight: 600 }}>{m.groupId.name}</span>
                      : <span style={{ fontSize: 12, color: '#94A3B8' }}>Ungrouped</span>}
                  </td>
                )}
                <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
                  {new Date(m.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => onEdit(m)}><Edit2 size={14} /></button>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => onDelete(m._id)}><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="show-on-mobile" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {members.length === 0
          ? <div className="card"><div className="empty-state"><Search size={28} /><p>No members found</p></div></div>
          : members.map(m => (
            <div key={m._id} style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar name={m.fullName} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{m.fullName}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                    {m.village} · Age {m.age}
                    {showGroup && m.groupId && <> · <span style={{ color: '#4F46E5', fontWeight: 600 }}>{m.groupId.name}</span></>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => onEdit(m)}><Edit2 size={14} /></button>
                  <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => onDelete(m._id)}><Trash2 size={14} /></button>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--color-border)', fontSize: 12 }}>
                <div><div style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 1 }}>NIC</div><span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{m.idNumber}</span></div>
                <div><div style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 1 }}>Contact</div><span style={{ fontWeight: 600 }}>{m.contactNumber}</span></div>
              </div>
            </div>
          ))}
      </div>
    </>
  );
}

function Modal({ children, onClose, title, wide }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={wide ? { maxWidth: 560 } : { maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button className="btn btn-ghost" onClick={onClose}><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
