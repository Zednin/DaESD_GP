import { useState, useEffect, useMemo } from 'react';
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

function formatTimeRemaining(endDate) {
  if (!endDate) return null;
  const diff = new Date(endDate) - new Date();
  if (diff <= 0) return 'Expired';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
  return `${hours}h ${mins}m`;
}

export default function AdminSurplus() {
  const [products, setProducts] = useState([]);
  const [orders, setOrders]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [prodRes, ordersRes] = await Promise.all([
          apiClient.get('/products/'),
          apiClient.get('/producer-orders/'),
        ]);
        if (cancelled) return;
        setProducts(prodRes.data.results ?? prodRes.data);
        setOrders((ordersRes.data.results ?? ordersRes.data).map(o => ({
          ...o, subtotal: parseFloat(o.subtotal),
        })));
      } catch (err) { if (!cancelled) setError(err.message); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const surplusProducts = useMemo(() => products.filter(p => p.is_surplus), [products]);
  const activeDeals = useMemo(() => surplusProducts.filter(p => p.surplus_active), [surplusProducts]);
  const expiredDeals = useMemo(() => surplusProducts.filter(p => !p.surplus_active), [surplusProducts]);

  const totalOriginalValue = surplusProducts.reduce((s, p) => s + parseFloat(p.price) * p.stock, 0);
  const totalDiscountedValue = surplusProducts.reduce((s, p) => s + parseFloat(p.surplus_price || p.price) * p.stock, 0);
  const totalSavings = totalOriginalValue - totalDiscountedValue;
  const avgDiscount = surplusProducts.length > 0
    ? (surplusProducts.reduce((s, p) => s + (p.discount_percentage || 0), 0) / surplusProducts.length).toFixed(1)
    : '0.0';

  const producersWithSurplus = [...new Set(surplusProducts.map(p => p.producer))].length;

  if (loading) return <div className={styles.centred}><span className={styles.spinner} /> Loading…</div>;
  if (error) return <div className={styles.centred}><p className={styles.errorText}>Error: {error}</p></div>;

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>Surplus Analytics</h2>
          <p className={styles.subtitle}>Food waste prevention and surplus deal performance</p>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <StatCard label="Active Deals" value={activeDeals.length} sub={`${expiredDeals.length} expired`} accent />
        <StatCard label="Total Surplus Products" value={surplusProducts.length} sub={`of ${products.length} total products`} />
        <StatCard label="Consumer Savings" value={`£${totalSavings.toFixed(2)}`} sub="Through discounted pricing" />
        <StatCard label="Avg Discount" value={`${avgDiscount}%`} sub={`${producersWithSurplus} producers participating`} />
      </div>

      <div>
        <h3 className={styles.subheading}>Active Surplus Deals</h3>
        {activeDeals.length === 0 ? (
          <div className={styles.empty}><p>No active surplus deals right now.</p></div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Producer</th>
                  <th>Original Price</th>
                  <th>Surplus Price</th>
                  <th>Discount</th>
                  <th>Stock</th>
                  <th>Time Remaining</th>
                  <th>Best Before</th>
                </tr>
              </thead>
              <tbody>
                {activeDeals.map(p => (
                  <tr key={p.id}>
                    <td><strong>{p.name}</strong></td>
                    <td>{p.producer_name || `#${p.producer}`}</td>
                    <td className={styles.muted} style={{ textDecoration: 'line-through' }}>£{parseFloat(p.price).toFixed(2)}</td>
                    <td><strong style={{ color: 'var(--success)' }}>£{parseFloat(p.surplus_price).toFixed(2)}</strong></td>
                    <td>
                      <span className={`${styles.badge} ${styles.badgeGreen}`}>-{p.discount_percentage}%</span>
                    </td>
                    <td className={styles.centredCell}>{p.stock} {p.unit}</td>
                    <td>
                      <span className={`${styles.badge} ${styles.badgeWarning}`}>{formatTimeRemaining(p.surplus_end_date)}</span>
                    </td>
                    <td className={styles.dateCell}>
                      {p.best_before_date ? new Date(p.best_before_date).toLocaleDateString('en-GB') : <span className={styles.muted}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {expiredDeals.length > 0 && (
        <div>
          <h3 className={styles.subheading}>Expired Deals</h3>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Producer</th>
                  <th>Discount Was</th>
                  <th>Stock Remaining</th>
                </tr>
              </thead>
              <tbody>
                {expiredDeals.slice(0, 10).map(p => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>{p.producer_name || `#${p.producer}`}</td>
                    <td><span className={`${styles.badge} ${styles.badgeGrey}`}>-{p.discount_percentage}%</span></td>
                    <td>{p.stock} {p.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
