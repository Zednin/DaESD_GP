import { useState, useEffect, useMemo } from 'react';
import { FiSearch, FiX, FiChevronUp, FiChevronDown } from 'react-icons/fi';
import shared from '../../pages/Producer/ProducerShared.module.css';
import local from '../Producer/ProducerOrders.module.css';
const styles = { ...shared, ...local };
import apiClient from '../../utils/apiClient';

const ORDER_STATUS_CLASS = {
  pending: styles.badgeWarning, accepted: styles.badgeBlue, preparing: styles.badgeBlue,
  ready: styles.badgePurple, delivered: styles.badgeGreen, completed: styles.badgeGreen,
  cancelled: styles.badgeGrey, rejected: styles.badgeRed,
};

const STATUS_FILTERS = ['all', 'pending', 'accepted', 'preparing', 'ready', 'delivered', 'rejected', 'cancelled'];

function StatCard({ label, value, sub, accent }) {
  return (
    <div className={styles.statCard}>
      <p className={styles.statLabel}>{label}</p>
      <p className={`${styles.statValue} ${accent ? styles.statAccent : ''}`}>{value}</p>
      {sub && <p className={styles.statSub}>{sub}</p>}
    </div>
  );
}

export default function AdminOrders() {
  const [orders, setOrders]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [filter, setFilter]     = useState('all');
  const [search, setSearch]     = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]     = useState('');
  const [sortKey, setSortKey]   = useState('created_at');
  const [sortDir, setSortDir]   = useState('desc');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await apiClient.get('/producer-orders/');
        if (cancelled) return;
        setOrders((data.results ?? data).map(o => ({
          ...o, subtotal: parseFloat(o.subtotal), commission: parseFloat(o.commission), payout_amount: parseFloat(o.payout_amount),
        })));
      } catch (err) { if (!cancelled) setError(err.message); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  }

  const sorted = useMemo(() => {
    const m = sortDir === 'asc' ? 1 : -1;
    return [...orders].sort((a, b) => {
      let av, bv;
      switch (sortKey) {
        case 'order': av = a.order; bv = b.order; break;
        case 'created_at': av = new Date(a.created_at); bv = new Date(b.created_at); break;
        case 'subtotal': av = a.subtotal; bv = b.subtotal; break;
        default: av = new Date(a.created_at); bv = new Date(b.created_at);
      }
      return av < bv ? -1 * m : av > bv ? 1 * m : 0;
    });
  }, [orders, sortKey, sortDir]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const from = dateFrom ? new Date(dateFrom) : null;
    const to   = dateTo   ? new Date(dateTo + 'T23:59:59') : null;
    return sorted.filter(o => {
      if (filter !== 'all' && o.status !== filter) return false;
      if (q) {
        const matchRef  = String(o.order).includes(q);
        const matchName = (o.customer_name ?? '').toLowerCase().includes(q);
        const matchProd = (o.producer_name ?? '').toLowerCase().includes(q);
        if (!matchRef && !matchName && !matchProd) return false;
      }
      const d = new Date(o.created_at);
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });
  }, [sorted, filter, search, dateFrom, dateTo]);

  const counts = useMemo(() => {
    const c = { all: orders.length };
    STATUS_FILTERS.slice(1).forEach(s => { c[s] = orders.filter(o => o.status === s).length; });
    return c;
  }, [orders]);

  const hasActiveFilters = search || dateFrom || dateTo;

  if (loading) return <div className={styles.centred}><span className={styles.spinner} /> Loading…</div>;
  if (error) return <div className={styles.centred}><p className={styles.errorText}>Error: {error}</p></div>;

  const totalValue = filtered.reduce((s, o) => s + o.subtotal, 0);

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>All Orders</h2>
          <p className={styles.subtitle}>View and manage orders across the entire network</p>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <StatCard label="Total Orders" value={orders.length} sub="Across all producers" accent />
        <StatCard label="Pending" value={counts.pending} sub="Awaiting action" />
        <StatCard label="Delivered" value={counts.delivered} sub="Successfully delivered" />
        <StatCard label="Cancelled" value={(counts.cancelled || 0) + (counts.rejected || 0)} sub="Cancelled or rejected" />
      </div>

      <div className={styles.filterTabs}>
        {STATUS_FILTERS.map(f => (
          <button key={f} className={`${styles.filterTab} ${filter === f ? styles.filterTabActive : ''}`} onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
            <span className={styles.filterTabCount}>{counts[f]}</span>
          </button>
        ))}
      </div>

      <div className={styles.ordersFilterBar}>
        <label className={styles.searchField}>
          <FiSearch size={15} />
          <input type="text" placeholder="Search by customer, producer, or order ref…" value={search} onChange={e => setSearch(e.target.value)} />
        </label>
        <label className={styles.dateLabel}>From <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} /></label>
        <label className={styles.dateLabel}>To <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} /></label>
        {hasActiveFilters && (
          <button className={styles.clearFiltersBtn} onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); }}>
            <FiX size={14} /> Clear
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className={styles.empty}><p>No orders found.</p></div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>
                  <button className={styles.sortBtn} onClick={() => toggleSort('order')}>
                    Order {sortKey === 'order' && (sortDir === 'asc' ? <FiChevronUp size={13} /> : <FiChevronDown size={13} />)}
                  </button>
                </th>
                <th>Producer</th>
                <th>Customer</th>
                <th>
                  <button className={styles.sortBtn} onClick={() => toggleSort('created_at')}>
                    Date {sortKey === 'created_at' && (sortDir === 'asc' ? <FiChevronUp size={13} /> : <FiChevronDown size={13} />)}
                  </button>
                </th>
                <th>Items</th>
                <th>
                  <button className={styles.sortBtn} onClick={() => toggleSort('subtotal')}>
                    Value {sortKey === 'subtotal' && (sortDir === 'asc' ? <FiChevronUp size={13} /> : <FiChevronDown size={13} />)}
                  </button>
                </th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(o => (
                <tr key={o.id}>
                  <td className={styles.muted}>#{o.order}</td>
                  <td><strong>{o.producer_name || `#${o.producer}`}</strong></td>
                  <td>{o.customer_name}</td>
                  <td className={styles.dateCell}>{new Date(o.created_at).toLocaleDateString('en-GB')}</td>
                  <td className={styles.centredCell}>{o.items?.length ?? 0}</td>
                  <td><strong>£{o.subtotal.toFixed(2)}</strong></td>
                  <td>
                    <span className={`${styles.badge} ${ORDER_STATUS_CLASS[o.status] ?? styles.badgeGrey}`}>{o.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: 'var(--surface-2)', borderTop: '2px solid var(--border)' }}>
                <td colSpan={5}><strong>{filtered.length} orders</strong></td>
                <td><strong>£{totalValue.toFixed(2)}</strong></td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
}
