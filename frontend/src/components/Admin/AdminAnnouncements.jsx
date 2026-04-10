import { useState, useEffect, useCallback } from 'react';
import shared from '../../pages/Producer/ProducerShared.module.css';
const styles = { ...shared };
import apiClient from '../../utils/apiClient';

function StatCard({ label, value, sub, accent }) {
  return (
    <div className={styles.statCard}>
      <p className={styles.statLabel}>{label}</p>
      <p className={`${styles.statValue} ${accent ? styles.statAccent : ''}`}>{value}</p>
      {sub && <p className={styles.statSub}>{sub}</p>}
    </div>
  );
}

export default function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [title, setTitle]     = useState('');
  const [body, setBody]       = useState('');
  const [saving, setSaving]   = useState(false);

  const loadAnnouncements = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/announcements/');
      setAnnouncements(data.results ?? data);
    } catch {
      // Endpoint may not exist yet — show empty state
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAnnouncements(); }, [loadAnnouncements]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError('');
    try {
      const { data } = await apiClient.post('/announcements/', { title: title.trim(), body: body.trim() });
      setAnnouncements(prev => [data, ...prev]);
      setTitle('');
      setBody('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create announcement. Make sure the backend endpoint exists.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this announcement?')) return;
    try {
      await apiClient.delete(`/announcements/${id}/`);
      setAnnouncements(prev => prev.filter(a => a.id !== id));
    } catch { alert('Failed to delete announcement.'); }
  }

  if (loading) return <div className={styles.centred}><span className={styles.spinner} /> Loading…</div>;

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>Announcements</h2>
          <p className={styles.subtitle}>Broadcast messages to all producers on the platform</p>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <StatCard label="Total Announcements" value={announcements.length} sub="All time" accent />
      </div>

      {/* Create form */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, marginBottom: 24 }}>
        <h3 className={styles.subheading} style={{ marginTop: 0 }}>New Announcement</h3>
        {error && <p className={styles.errorBanner}>{error}</p>}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 12 }}>
            <input
              type="text" placeholder="Announcement title" value={title} onChange={e => setTitle(e.target.value)} required
              style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)', fontSize: 15, fontWeight: 600 }}
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <textarea
              placeholder="Message body…" value={body} onChange={e => setBody(e.target.value)} rows={4}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)', fontSize: 14, resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>
          <button type="submit" className={styles.addBtn} disabled={saving || !title.trim()}>
            {saving ? 'Posting…' : 'Post Announcement'}
          </button>
        </form>
      </div>

      {/* List */}
      {announcements.length === 0 ? (
        <div className={styles.empty}><p>No announcements yet. Create your first one above.</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {announcements.map(a => (
            <div key={a.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 6 }}>
                <h4 style={{ margin: 0, fontSize: 15, color: 'var(--text)' }}>{a.title}</h4>
                <button className={styles.deleteRowBtn} onClick={() => handleDelete(a.id)} style={{ flexShrink: 0 }}>Delete</button>
              </div>
              {a.body && <p style={{ margin: '0 0 8px', fontSize: 14, color: 'var(--muted)', lineHeight: 1.5 }}>{a.body}</p>}
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                {a.created_at ? new Date(a.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
