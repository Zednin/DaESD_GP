import { useState, useEffect } from 'react';
import shared from '../../pages/Producer/ProducerShared.module.css';
import chartStyles from '../Producer/ProducerOverview.module.css';
const styles = { ...shared, ...chartStyles };
import apiClient from '../../utils/apiClient';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const ORDER_STATUS_CLASS = {
  pending: styles.badgeWarning, accepted: styles.badgeBlue, preparing: styles.badgeBlue,
  ready: styles.badgePurple, delivered: styles.badgeGreen, completed: styles.badgeGreen,
  cancelled: styles.badgeGrey, rejected: styles.badgeRed,
};

function StatCard({ label, value, sub, accent }) {
  return (
    <div className={styles.statCard}>
      <p className={styles.statLabel}>{label}</p>
      <p className={`${styles.statValue} ${accent ? styles.statAccent : ''}`}>{value}</p>
      {sub && <p className={styles.statSub}>{sub}</p>}
    </div>
  );
}

function RevenueChart({ orders }) {
  const now = new Date();
  const buckets = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: MONTHS[d.getMonth()], revenue: 0, commission: 0 };
  });

  orders
    .filter(o => ['delivered', 'completed'].includes(o.status))
    .forEach(o => {
      const key = o.created_at.slice(0, 7);
      const bucket = buckets.find(b => b.key === key);
      if (bucket) {
        bucket.revenue += o.subtotal;
        bucket.commission += o.commission;
      }
    });

  const max = Math.max(...buckets.map(b => b.revenue), 1);

  return (
    <div className={styles.chartCard}>
      <h3 className={styles.subheading}>Network Revenue — Last 6 Months</h3>
      <div className={styles.barChart}>
        {buckets.map(b => (
          <div key={b.key} className={styles.barCol}>
            <span className={styles.barLabel}>£{b.revenue > 0 ? b.revenue.toFixed(0) : '0'}</span>
            <div className={styles.barTrack}>
              <div
                className={styles.bar}
                style={{ height: `${(b.revenue / max) * 100}%` }}
                title={`Revenue: £${b.revenue.toFixed(2)} | Commission: £${b.commission.toFixed(2)}`}
              />
            </div>
            <span className={styles.barMonth}>{b.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminOverview() {
  const [orders, setOrders]       = useState([]);
  const [producers, setProducers] = useState([]);
  const [products, setProducts]   = useState([]);
  const [accounts, setAccounts]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [ordersRes, producersRes, productsRes, accountsRes] = await Promise.all([
          apiClient.get('/producer-orders/'),
          apiClient.get('/producers/'),
          apiClient.get('/products/'),
          apiClient.get('/accounts/'),
        ]);
        if (cancelled) return;

        setOrders((ordersRes.data.results ?? ordersRes.data).map(o => ({
          ...o, subtotal: parseFloat(o.subtotal), commission: parseFloat(o.commission), payout_amount: parseFloat(o.payout_amount),
        })));
        setProducers(producersRes.data.results ?? producersRes.data);
        setProducts(productsRes.data.results ?? productsRes.data);
        setAccounts(accountsRes.data.results ?? accountsRes.data);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className={styles.centred}><span className={styles.spinner} /> Loading…</div>;
  if (error) return <div className={styles.centred}><p className={styles.errorText}>Error: {error}</p></div>;

  const completed = orders.filter(o => ['delivered', 'completed'].includes(o.status));
  const totalRevenue    = completed.reduce((s, o) => s + o.subtotal, 0);
  const totalCommission = completed.reduce((s, o) => s + o.commission, 0);
  const totalPayout     = completed.reduce((s, o) => s + o.payout_amount, 0);
  const pending         = orders.filter(o => ['pending', 'accepted', 'preparing', 'ready'].includes(o.status));
  const activeProducts  = products.filter(p => p.status === 'available').length;
  const customerCount   = accounts.filter(a => a.account_type === 'customer').length;

  const recentOrders = [...orders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 8);

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>Network Overview</h2>
          <p className={styles.subtitle}>Platform-wide performance at a glance</p>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <StatCard label="Total Revenue"    value={`£${totalRevenue.toFixed(2)}`}    sub={`${completed.length} completed orders`} accent />
        <StatCard label="Commission (5%)"  value={`£${totalCommission.toFixed(2)}`} sub="Network earnings" />
        <StatCard label="Producer Payouts" value={`£${totalPayout.toFixed(2)}`}     sub="95% to producers" />
        <StatCard label="Pending Orders"   value={pending.length}                    sub="Awaiting fulfilment" />
        <StatCard label="Active Producers" value={producers.length}                  sub="Registered producers" />
        <StatCard label="Active Products"  value={activeProducts}                    sub={`of ${products.length} total`} />
        <StatCard label="Customers"        value={customerCount}                     sub="Registered customers" />
        <StatCard label="Total Orders"     value={orders.length}                     sub="All time" />
      </div>

      <RevenueChart orders={orders} />

      <div>
        <h3 className={styles.subheading}>Recent Orders</h3>
        {recentOrders.length === 0 ? (
          <div className={styles.empty}><p>No orders yet.</p></div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Producer</th>
                  <th>Date</th>
                  <th>Value</th>
                  <th>Commission</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map(o => (
                  <tr key={o.id}>
                    <td className={styles.muted}>#{o.order}</td>
                    <td>{o.producer_name || `Producer #${o.producer}`}</td>
                    <td className={styles.dateCell}>{new Date(o.created_at).toLocaleDateString('en-GB')}</td>
                    <td><strong>£{o.subtotal.toFixed(2)}</strong></td>
                    <td>£{o.commission.toFixed(2)}</td>
                    <td>
                      <span className={`${styles.badge} ${ORDER_STATUS_CLASS[o.status] ?? styles.badgeGrey}`}>{o.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
