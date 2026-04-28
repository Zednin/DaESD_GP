import { useState, useEffect } from 'react';
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

export default function AdminProducers() {
  const [producers, setProducers] = useState([]);
  const [orders, setOrders]       = useState([]);
  const [products, setProducts]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [prodRes, ordersRes, productsRes] = await Promise.all([
          apiClient.get('/producers/'),
          apiClient.get('/producer-orders/'),
          apiClient.get('/products/'),
        ]);
        if (cancelled) return;
        setProducers(prodRes.data.results ?? prodRes.data);
        setOrders((ordersRes.data.results ?? ordersRes.data).map(o => ({
          ...o, subtotal: parseFloat(o.subtotal), commission: parseFloat(o.commission), payout_amount: parseFloat(o.payout_amount),
        })));
        setProducts(productsRes.data.results ?? productsRes.data);
      } catch (err) { if (!cancelled) setError(err.message); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className={styles.centred}><span className={styles.spinner} /> Loading…</div>;
  if (error) return <div className={styles.centred}><p className={styles.errorText}>Error: {error}</p></div>;

  const producerStats = producers.map(p => {
    const pOrders = orders.filter(o => o.producer === p.id);
    const completed = pOrders.filter(o => ['delivered', 'completed'].includes(o.status));
    const totalSales = completed.reduce((s, o) => s + o.subtotal, 0);
    const totalCommission = completed.reduce((s, o) => s + o.commission, 0);
    const pProducts = products.filter(pr => pr.producer === p.id);
    const activeProducts = pProducts.filter(pr => pr.status === 'available').length;
    const fulfilmentRate = pOrders.length > 0 ? ((completed.length / pOrders.length) * 100).toFixed(1) : '0.0';

    return { ...p, totalOrders: pOrders.length, completedOrders: completed.length, totalSales, totalCommission, activeProducts, totalProducts: pProducts.length, fulfilmentRate };
  }).sort((a, b) => b.totalSales - a.totalSales);

  const totalNetworkSales = producerStats.reduce((s, p) => s + p.totalSales, 0);
  const totalNetworkCommission = producerStats.reduce((s, p) => s + p.totalCommission, 0);

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>Producer Management</h2>
          <p className={styles.subtitle}>Performance overview of all registered producers</p>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <StatCard label="Total Producers" value={producers.length} sub="Registered on platform" accent />
        <StatCard label="Network Sales" value={`£${totalNetworkSales.toFixed(2)}`} sub="All completed orders" />
        <StatCard label="Commission Earned" value={`£${totalNetworkCommission.toFixed(2)}`} sub="5% platform fee" />
        <StatCard label="Total Products" value={products.length} sub={`${products.filter(p => p.status === 'available').length} active`} />
      </div>

      {producers.length === 0 ? (
        <div className={styles.empty}><p>No producers registered yet.</p></div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Producer</th>
                <th style={{ textAlign: 'center' }}>Total Orders</th>
                <th style={{ textAlign: 'center' }}>Completed</th>
                <th>Total Sales</th>
                <th>Commission</th>
                <th style={{ textAlign: 'center' }}>Products</th>
                <th>Fulfilment Rate</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {producerStats.map(p => (
                <tr key={p.id}>
                  <td>
                    <strong>{p.company_name}</strong>
                    {p.company_number && <span className={styles.muted} style={{ display: 'block', fontSize: 12 }}>{p.company_number}</span>}
                  </td>
                  <td className={styles.centredCell}>{p.totalOrders}</td>
                  <td className={styles.centredCell}>{p.completedOrders}</td>
                  <td><strong>£{p.totalSales.toFixed(2)}</strong></td>
                  <td>£{p.totalCommission.toFixed(2)}</td>
                  <td className={styles.centredCell}>
                    {p.activeProducts} <span className={styles.muted}>/ {p.totalProducts}</span>
                  </td>
                  <td>
                    <span className={`${styles.badge} ${parseFloat(p.fulfilmentRate) >= 80 ? styles.badgeGreen : parseFloat(p.fulfilmentRate) >= 50 ? styles.badgeWarning : styles.badgeRed}`}>
                      {p.fulfilmentRate}%
                    </span>
                  </td>
                  <td className={styles.dateCell}>{new Date(p.created_at).toLocaleDateString('en-GB')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
