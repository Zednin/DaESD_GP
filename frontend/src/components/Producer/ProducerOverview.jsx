import { useState, useEffect } from 'react';
import shared from '../../pages/Producer/ProducerShared.module.css';
import local from './ProducerOverview.module.css';
const styles = { ...shared, ...local };
import apiClient from '../../utils/apiClient';

/* Helpers */
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const ORDER_STATUS_CLASS = {
  pending:   styles.badgeWarning,
  accepted:  styles.badgeBlue,
  preparing: styles.badgeBlue,
  ready:     styles.badgePurple,
  delivered: styles.badgeGreen,
  completed: styles.badgeGreen,
  cancelled: styles.badgeGrey,
  rejected:  styles.badgeRed,
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

/** Pure-CSS bar chart — last 6 calendar months of net payout revenue */
function RevenueChart({ orders }) {
  const now = new Date();
  const buckets = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: MONTHS[d.getMonth()], revenue: 0 };
  });

  orders
    .filter(o => ['delivered', 'completed'].includes(o.status))
    .forEach(o => {
      const key = o.created_at.slice(0, 7);
      const bucket = buckets.find(b => b.key === key);
      if (bucket) bucket.revenue += o.payout_amount;
    });

  const max = Math.max(...buckets.map(b => b.revenue), 1);

  return (
    <div className={styles.chartCard}>
      <h3 className={styles.subheading}>Revenue — Last 6 Months</h3>
      <div className={styles.barChart}>
        {buckets.map(b => (
          <div key={b.key} className={styles.barCol}>
            <span className={styles.barLabel}>£{b.revenue > 0 ? b.revenue.toFixed(0) : '0'}</span>
            <div className={styles.barTrack}>
              <div
                className={styles.bar}
                style={{ height: `${(b.revenue / max) * 100}%` }}
                title={`£${b.revenue.toFixed(2)}`}
              />
            </div>
            <span className={styles.barMonth}>{b.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Component */
export default function ProducerOverview({ producerId, producerName }) {
  const [orders, setOrders]       = useState([]);
  const [products, setProducts]   = useState([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  useEffect(() => {
    if (!producerId) { setOrders([]); setProducts([]); return; }
    let cancelled = false;
    setLoading(true);
    setError('');

    (async () => {
      try {
        const [ordersResponse, productsResponse] = await Promise.all([
          apiClient.get('/producer-orders/', { params: { producer: producerId } }),
          apiClient.get('/products/', { params: { producer: producerId } }),
        ]);
        const ordersData   = ordersResponse.data;
        const productsData = productsResponse.data;
        if (cancelled) return;

        setOrders(
          (ordersData.results ?? ordersData).map(o => ({
            ...o,
            subtotal:      parseFloat(o.subtotal),
            commission:    parseFloat(o.commission),
            payout_amount: parseFloat(o.payout_amount),
          }))
        );
        setProducts(productsData.results ?? productsData);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [producerId]);

  /* Loading / error guards */
  if (!producerId) {
    return (
      <div className={styles.centred}>
        <p>Choose a producer above to view their overview.</p>
      </div>
    );
  }
  if (loading) {
    return (
      <div className={styles.centred}>
        <span className={styles.spinner} />
        Loading…
      </div>
    );
  }
  if (error) {
    return (
      <div className={styles.centred}>
        <p className={styles.errorText}>Error: {error}</p>
      </div>
    );
  }

  const completedOrders = orders.filter(o => ['delivered', 'completed'].includes(o.status));
  const pendingOrders   = orders.filter(o => ['pending', 'accepted', 'preparing', 'ready'].includes(o.status));
  const activeProducts  = products.filter(p => p.status === 'available').length;

  const totalRevenue    = completedOrders.reduce((s, o) => s + o.payout_amount, 0);
  const totalGross      = completedOrders.reduce((s, o) => s + o.subtotal, 0);
  const totalCommission = completedOrders.reduce((s, o) => s + o.commission, 0);

  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);

  const conversionRate = orders.length > 0
    ? ((completedOrders.length / orders.length) * 100).toFixed(1)
    : '0.0';

  return (
    <section className={styles.section}>

      {/* Header */}
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>Overview</h2>
          <p className={styles.subtitle}>Welcome back, {producerName}</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className={styles.statsGrid}>
        <StatCard label="Net Revenue"        value={`£${totalRevenue.toFixed(2)}`}    sub="After platform commission"       accent />
        <StatCard label="Gross Sales"        value={`£${totalGross.toFixed(2)}`}      sub="Before commission deduction" />
        <StatCard label="Commission Paid"    value={`£${totalCommission.toFixed(2)}`} sub="Platform fee on completed orders" />
        <StatCard label="Pending Orders"     value={pendingOrders.length}              sub="Awaiting action" />
        <StatCard label="Completed Orders"   value={completedOrders.length}            sub="Successfully delivered" />
        <StatCard label="Fulfilment Rate"    value={`${conversionRate}%`}              sub="Orders completed vs placed" />
        <StatCard label="Active Products"    value={activeProducts}                    sub={`of ${products.length} listed`} />
        <StatCard label="Total Orders"       value={orders.length}                     sub="All time" />
      </div>

      {/* Revenue chart */}
      <RevenueChart orders={orders} />

      {/* Recent orders */}
      <div>
        <h3 className={styles.subheading}>Recent Orders</h3>
        {recentOrders.length === 0 ? (
          <div className={styles.empty}>
            <p>No orders yet. Once customers place orders they will appear here.</p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Order Ref</th>
                  <th>Date</th>
                  <th>Gross</th>
                  <th>Net Payout</th>
                  <th>Delivery Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map(order => (
                  <tr key={order.id}>
                    <td className={styles.muted}>#{order.order}</td>
                    <td className={styles.dateCell}>
                      {new Date(order.created_at).toLocaleDateString('en-GB')}
                    </td>
                    <td>£{order.subtotal.toFixed(2)}</td>
                    <td><strong>£{order.payout_amount.toFixed(2)}</strong></td>
                    <td className={styles.dateCell}>
                      {order.delivery_date
                        ? new Date(order.delivery_date).toLocaleDateString('en-GB')
                        : <span className={styles.muted}>—</span>}
                    </td>
                    <td>
                      <span className={`${styles.badge} ${ORDER_STATUS_CLASS[order.status] ?? styles.badgeGrey}`}>
                        {order.status}
                      </span>
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
