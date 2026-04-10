import { useState, useEffect, useMemo, useCallback } from 'react';
import { FiSearch, FiX } from 'react-icons/fi';
import shared from '../../pages/Producer/ProducerShared.module.css';
import local from '../Producer/ProducerOrders.module.css';
const styles = { ...shared, ...local };
import apiClient from '../../utils/apiClient';

const TYPE_CLASS = {
  customer: styles.badgeGreen, producer: styles.badgeBlue,
  admin: styles.badgePurple, restaurant: styles.badgeWarning, community_group: styles.badgeWarning,
};

const TYPE_FILTERS = ['all', 'customer', 'producer', 'admin'];
const ACCOUNT_TYPES = ['customer', 'producer', 'admin', 'restaurant', 'community_group'];

function StatCard({ label, value, sub, accent }) {
  return (
    <div className={styles.statCard}>
      <p className={styles.statLabel}>{label}</p>
      <p className={`${styles.statValue} ${accent ? styles.statAccent : ''}`}>{value}</p>
      {sub && <p className={styles.statSub}>{sub}</p>}
    </div>
  );
}

export default function AdminUsers() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [filter, setFilter]     = useState('all');
  const [search, setSearch]     = useState('');

  // Edit state
  const [editingId, setEditingId]       = useState(null);
  const [editForm, setEditForm]         = useState({});
  const [editSaving, setEditSaving]     = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]         = useState(false);
  const [deleteClosing, setDeleteClosing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await apiClient.get('/accounts/');
        if (cancelled) return;
        setAccounts(data.results ?? data);
      } catch (err) { if (!cancelled) setError(err.message); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const counts = useMemo(() => {
    const c = { all: accounts.length };
    TYPE_FILTERS.slice(1).forEach(t => { c[t] = accounts.filter(a => a.account_type === t).length; });
    return c;
  }, [accounts]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return accounts.filter(a => {
      if (filter !== 'all' && a.account_type !== filter) return false;
      if (q) {
        const name = `${a.first_name} ${a.last_name}`.toLowerCase();
        const email = (a.email ?? '').toLowerCase();
        const username = (a.username ?? '').toLowerCase();
        if (!name.includes(q) && !email.includes(q) && !username.includes(q)) return false;
      }
      return true;
    });
  }, [accounts, filter, search]);

  function startEdit(account) {
    setEditingId(account.id);
    setEditForm({
      first_name: account.first_name ?? '',
      last_name: account.last_name ?? '',
      email: account.email ?? '',
      account_type: account.account_type ?? 'customer',
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm({});
  }

  async function saveEdit(id) {
    setEditSaving(true);
    try {
      const { data } = await apiClient.patch(`/accounts/${id}/`, editForm);
      setAccounts(prev => prev.map(a => a.id === id ? { ...a, ...data } : a));
      setEditingId(null);
    } catch (err) {
      alert(err.response?.data?.detail || err.response?.data?.email?.[0] || 'Failed to update user.');
    } finally {
      setEditSaving(false);
    }
  }

  const closeDeleteModal = useCallback(() => {
    setDeleteClosing(true);
    setTimeout(() => { setDeleteTarget(null); setDeleteClosing(false); }, 200);
  }, []);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/accounts/${deleteTarget.id}/`);
      setAccounts(prev => prev.filter(a => a.id !== deleteTarget.id));
      closeDeleteModal();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete user.');
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <div className={styles.centred}><span className={styles.spinner} /> Loading…</div>;
  if (error) return <div className={styles.centred}><p className={styles.errorText}>Error: {error}</p></div>;

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>User Management</h2>
          <p className={styles.subtitle}>All registered accounts on the platform</p>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <StatCard label="Total Users" value={accounts.length} sub="All account types" accent />
        <StatCard label="Customers" value={counts.customer} sub="Consumer accounts" />
        <StatCard label="Producers" value={counts.producer} sub="Supplier accounts" />
        <StatCard label="Admins" value={counts.admin} sub="Platform administrators" />
      </div>

      <div className={styles.filterTabs}>
        {TYPE_FILTERS.map(f => (
          <button key={f} className={`${styles.filterTab} ${filter === f ? styles.filterTabActive : ''}`} onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            <span className={styles.filterTabCount}>{counts[f]}</span>
          </button>
        ))}
      </div>

      <div className={styles.ordersFilterBar}>
        <label className={styles.searchField}>
          <FiSearch size={15} />
          <input type="text" placeholder="Search by name, email, or username…" value={search} onChange={e => setSearch(e.target.value)} />
        </label>
        {search && (
          <button className={styles.clearFiltersBtn} onClick={() => setSearch('')}>
            <FiX size={14} /> Clear
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className={styles.empty}><p>No users found.</p></div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Username</th>
                <th>Account Type</th>
                <th>Joined</th>
                <th className={styles.actionsCol}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => (
                <tr key={a.id}>
                  {editingId === a.id ? (
                    <>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <input type="text" value={editForm.first_name} onChange={e => setEditForm(f => ({ ...f, first_name: e.target.value }))}
                            placeholder="First" style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 13, width: '50%' }} />
                          <input type="text" value={editForm.last_name} onChange={e => setEditForm(f => ({ ...f, last_name: e.target.value }))}
                            placeholder="Last" style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 13, width: '50%' }} />
                        </div>
                      </td>
                      <td>
                        <input type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                          style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 13, width: '100%' }} />
                      </td>
                      <td className={styles.muted}>{a.username}</td>
                      <td>
                        <select value={editForm.account_type} onChange={e => setEditForm(f => ({ ...f, account_type: e.target.value }))}
                          style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 13 }}>
                          {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </td>
                      <td className={styles.dateCell}>{new Date(a.date_joined).toLocaleDateString('en-GB')}</td>
                      <td className={styles.actionsCell}>
                        <div className={styles.actionsBtns}>
                          <button className={styles.editBtn} onClick={() => saveEdit(a.id)} disabled={editSaving}>
                            {editSaving ? 'Saving…' : 'Save'}
                          </button>
                          <button className={styles.deleteRowBtn} onClick={cancelEdit}>Cancel</button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td><strong>{`${a.first_name ?? ''} ${a.last_name ?? ''}`.trim() || '—'}</strong></td>
                      <td>{a.email}</td>
                      <td className={styles.muted}>{a.username}</td>
                      <td>
                        <span className={`${styles.badge} ${TYPE_CLASS[a.account_type] ?? styles.badgeGrey}`}>
                          {a.account_type}
                        </span>
                      </td>
                      <td className={styles.dateCell}>{new Date(a.date_joined).toLocaleDateString('en-GB')}</td>
                      <td className={styles.actionsCell}>
                        <div className={styles.actionsBtns}>
                          <button className={styles.editBtn} onClick={() => startEdit(a)}>Edit</button>
                          <button className={styles.deleteRowBtn} onClick={() => setDeleteTarget(a)}>Delete</button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className={`${styles.overlay} ${deleteClosing ? styles.overlayClosing : ''}`} onClick={e => e.target === e.currentTarget && closeDeleteModal()}>
          <div className={`${styles.modal} ${styles.deleteModal}`}>
            <h3>Delete User</h3>
            <p>
              Are you sure you want to delete <strong>{`${deleteTarget.first_name ?? ''} ${deleteTarget.last_name ?? ''}`.trim() || deleteTarget.username}</strong> ({deleteTarget.email})?
              This cannot be undone.
            </p>
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={closeDeleteModal} disabled={deleting}>Cancel</button>
              <button className={styles.deleteBtn} onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
