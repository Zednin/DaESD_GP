import { useState, useEffect, useMemo } from 'react';
import { FiSearch, FiX } from 'react-icons/fi';
import shared from '../../pages/Producer/ProducerShared.module.css';
import local from '../Producer/ProducerOrders.module.css';
const styles = { ...shared, ...local };
import apiClient from '../../utils/apiClient';

const STATUS_FILTERS = ['all', 'available', 'unavailable'];

function StatCard({ label, value, sub, accent }) {
  return (
    <div className={styles.statCard}>
      <p className={styles.statLabel}>{label}</p>
      <p className={`${styles.statValue} ${accent ? styles.statAccent : ''}`}>{value}</p>
      {sub && <p className={styles.statSub}>{sub}</p>}
    </div>
  );
}

export default function AdminProducts() {
  const [products, setProducts]     = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [filter, setFilter]         = useState('all');
  const [search, setSearch]         = useState('');
  const [catFilter, setCatFilter]   = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [prodRes, catRes] = await Promise.all([
          apiClient.get('/products/'),
          apiClient.get('/categories/'),
        ]);
        if (cancelled) return;
        setProducts(prodRes.data.results ?? prodRes.data);
        setCategories(catRes.data.results ?? catRes.data);
      } catch (err) { if (!cancelled) setError(err.message); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const counts = useMemo(() => ({
    all: products.length,
    available: products.filter(p => p.status === 'available').length,
    unavailable: products.filter(p => p.status === 'unavailable').length,
  }), [products]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter(p => {
      if (filter !== 'all' && p.status !== filter) return false;
      if (catFilter && p.category_name !== catFilter) return false;
      if (q) {
        const matchName = p.name.toLowerCase().includes(q);
        const matchProd = (p.producer_name ?? '').toLowerCase().includes(q);
        if (!matchName && !matchProd) return false;
      }
      return true;
    });
  }, [products, filter, search, catFilter]);

  const hasActiveFilters = search || catFilter;
  const organicCount = products.filter(p => p.organic_certified).length;
  const surplusCount = products.filter(p => p.is_surplus).length;

  if (loading) return <div className={styles.centred}><span className={styles.spinner} /> Loading…</div>;
  if (error) return <div className={styles.centred}><p className={styles.errorText}>Error: {error}</p></div>;

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>Product Moderation</h2>
          <p className={styles.subtitle}>Review and manage all products across the network</p>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <StatCard label="Total Products" value={products.length} sub={`${counts.available} available`} accent />
        <StatCard label="Categories" value={categories.length} sub="Product categories" />
        <StatCard label="Organic" value={organicCount} sub="Certified organic products" />
        <StatCard label="Surplus" value={surplusCount} sub="Currently discounted" />
      </div>

      <div className={styles.filterTabs}>
        {STATUS_FILTERS.map(f => (
          <button key={f} className={`${styles.filterTab} ${filter === f ? styles.filterTabActive : ''}`} onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            <span className={styles.filterTabCount}>{counts[f]}</span>
          </button>
        ))}
      </div>

      <div className={styles.ordersFilterBar}>
        <label className={styles.searchField}>
          <FiSearch size={15} />
          <input type="text" placeholder="Search by product or producer…" value={search} onChange={e => setSearch(e.target.value)} />
        </label>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 14 }}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
        {hasActiveFilters && (
          <button className={styles.clearFiltersBtn} onClick={() => { setSearch(''); setCatFilter(''); }}>
            <FiX size={14} /> Clear
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className={styles.empty}><p>No products found.</p></div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Product</th>
                <th>Producer</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Organic</th>
                <th>Surplus</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id}>
                  <td><strong>{p.name}</strong></td>
                  <td>{p.producer_name || `#${p.producer}`}</td>
                  <td>{p.category_name ?? <span className={styles.muted}>—</span>}</td>
                  <td>£{parseFloat(p.price).toFixed(2)} / {p.unit}</td>
                  <td className={styles.centredCell}>
                    <span className={p.stock === 0 ? styles.stockZero : ''}>{p.stock}</span>
                  </td>
                  <td>
                    <span className={`${styles.badge} ${p.status === 'available' ? styles.badgeGreen : styles.badgeGrey}`}>{p.status}</span>
                  </td>
                  <td className={styles.centredCell}>{p.organic_certified ? '✓' : '—'}</td>
                  <td>
                    {p.is_surplus ? (
                      <span className={`${styles.badge} ${styles.badgeWarning}`}>-{p.discount_percentage}%</span>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
