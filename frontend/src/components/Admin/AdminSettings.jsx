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

export default function AdminSettings() {
  const [categories, setCategories] = useState([]);
  const [allergens, setAllergens]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');

  // Category form
  const [newCatName, setNewCatName]   = useState('');
  const [newCatDesc, setNewCatDesc]   = useState('');
  const [catSaving, setCatSaving]     = useState(false);
  const [editingCat, setEditingCat]   = useState(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatDesc, setEditCatDesc] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [catRes, allRes] = await Promise.all([
        apiClient.get('/categories/'),
        apiClient.get('/allergens/'),
      ]);
      setCategories(catRes.data.results ?? catRes.data);
      setAllergens(allRes.data.results ?? allRes.data);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleAddCategory(e) {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setCatSaving(true);
    try {
      const { data } = await apiClient.post('/categories/', { name: newCatName.trim(), description: newCatDesc.trim() });
      setCategories(prev => [...prev, data]);
      setNewCatName('');
      setNewCatDesc('');
    } catch (err) { alert(err.response?.data?.name?.[0] || 'Failed to add category.'); }
    finally { setCatSaving(false); }
  }

  async function handleUpdateCategory(id) {
    try {
      const { data } = await apiClient.put(`/categories/${id}/`, { name: editCatName.trim(), description: editCatDesc.trim() });
      setCategories(prev => prev.map(c => c.id === id ? data : c));
      setEditingCat(null);
    } catch (err) { alert('Failed to update category.'); }
  }

  async function handleDeleteCategory(id, name) {
    if (!confirm(`Delete category "${name}"? Products in this category will become uncategorised.`)) return;
    try {
      await apiClient.delete(`/categories/${id}/`);
      setCategories(prev => prev.filter(c => c.id !== id));
    } catch (err) { alert('Failed to delete category.'); }
  }

  if (loading) return <div className={styles.centred}><span className={styles.spinner} /> Loading…</div>;
  if (error) return <div className={styles.centred}><p className={styles.errorText}>Error: {error}</p></div>;

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>Platform Settings</h2>
          <p className={styles.subtitle}>Manage categories, allergens, and platform configuration</p>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <StatCard label="Commission Rate" value="5%" sub="Network commission on all orders" accent />
        <StatCard label="Categories" value={categories.length} sub="Product categories" />
        <StatCard label="Allergens" value={allergens.length} sub="Tracked allergens" />
      </div>

      {/* Categories */}
      <div>
        <h3 className={styles.subheading}>Product Categories</h3>
        <form onSubmit={handleAddCategory} style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <input
            type="text" placeholder="Category name" value={newCatName} onChange={e => setNewCatName(e.target.value)} required
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 14, flex: 1, minWidth: 180 }}
          />
          <input
            type="text" placeholder="Description (optional)" value={newCatDesc} onChange={e => setNewCatDesc(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 14, flex: 2, minWidth: 200 }}
          />
          <button type="submit" className={styles.addBtn} disabled={catSaving}>
            {catSaving ? 'Adding…' : '+ Add Category'}
          </button>
        </form>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th className={styles.actionsCol}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map(c => (
                <tr key={c.id}>
                  {editingCat === c.id ? (
                    <>
                      <td>
                        <input type="text" value={editCatName} onChange={e => setEditCatName(e.target.value)}
                          style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 14, width: '100%' }}
                        />
                      </td>
                      <td>
                        <input type="text" value={editCatDesc} onChange={e => setEditCatDesc(e.target.value)}
                          style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 14, width: '100%' }}
                        />
                      </td>
                      <td className={styles.actionsCell}>
                        <div className={styles.actionsBtns}>
                          <button className={styles.editBtn} onClick={() => handleUpdateCategory(c.id)}>Save</button>
                          <button className={styles.deleteRowBtn} onClick={() => setEditingCat(null)}>Cancel</button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td><strong>{c.name}</strong></td>
                      <td className={styles.muted}>{c.description || '—'}</td>
                      <td className={styles.actionsCell}>
                        <div className={styles.actionsBtns}>
                          <button className={styles.editBtn} onClick={() => { setEditingCat(c.id); setEditCatName(c.name); setEditCatDesc(c.description || ''); }}>Edit</button>
                          <button className={styles.deleteRowBtn} onClick={() => handleDeleteCategory(c.id, c.name)}>Delete</button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Allergens */}
      <div style={{ marginTop: 32 }}>
        <h3 className={styles.subheading}>Registered Allergens</h3>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Allergen Name</th>
              </tr>
            </thead>
            <tbody>
              {allergens.map(a => (
                <tr key={a.id}>
                  <td className={styles.muted}>{a.id}</td>
                  <td><strong>{a.name}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
