import { useState, useEffect, useMemo, Fragment } from 'react';
import shared from '../../pages/Producer/ProducerShared.module.css';
import local from './ProducerOrders.module.css';
const styles = { ...shared, ...local };
import { FiSearch, FiX, FiCheck } from 'react-icons/fi';

/* Helpers */
function getCookie(name) {
  return document.cookie
    .split('; ')
    .find(r => r.startsWith(name + '='))
    ?.split('=')[1];
}

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

const STATUS_FILTERS = ['all', 'pending', 'accepted', 'preparing', 'ready', 'delivered', 'rejected', 'cancelled'];

/** Returns the next-step actions available for a given status */
function getActions(status) {
  switch (status) {
    case 'pending':   return [{ label: 'Accept', next: 'accepted', style: 'save' }, { label: 'Reject', next: 'rejected', style: 'delete' }];
    case 'accepted':  return [{ label: 'Start Preparing', next: 'preparing', style: 'save' }];
    case 'preparing': return [{ label: 'Mark Ready', next: 'ready', style: 'save' }];
    case 'ready':     return [{ label: 'Mark Delivered', next: 'ready_delivered', style: 'save' }];
    default:          return [];
  }
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div className={styles.statCard}>
      <p className={styles.statLabel}>{label}</p>
      <p className={`${styles.statValue} ${accent ? styles.statAccent : ''}`}>{value}</p>
      {sub && <p className={styles.statSub}>{sub}</p>}
    </div>
  );
}

/* Component */
export default function ProducerOrders({ producerId }) {
  const [orders, setOrders]       = useState([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [filter, setFilter]       = useState('all');
  const [search, setSearch]       = useState('');
  const [dateFrom, setDateFrom]   = useState('');
  const [dateTo, setDateTo]       = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [updating, setUpdating] = useState(null); // id of order being updated

  /* Fetch orders */
  useEffect(() => {
    if (!producerId) { setOrders([]); return; }
    let cancelled = false;
    setLoading(true);
    setError('');

    (async () => {
      try {
        const res = await fetch(
          `/api/producer-orders/?producer=${producerId}`,
          { credentials: 'include' },
        );
        if (!res.ok) throw new Error('Failed to load orders');
        const data = await res.json();
        if (cancelled) return;

        setOrders(
          (data.results ?? data).map(o => ({
            ...o,
            subtotal:      parseFloat(o.subtotal),
            commission:    parseFloat(o.commission),
            payout_amount: parseFloat(o.payout_amount),
          }))
        );
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [producerId]);

  /* Derived data */
  const sorted = useMemo(
    () => [...orders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [orders],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const from = dateFrom ? new Date(dateFrom) : null;
    const to   = dateTo   ? new Date(dateTo + 'T23:59:59') : null;

    return sorted.filter(o => {
      if (filter !== 'all' && o.status !== filter) return false;
      if (q) {
        const matchRef  = String(o.order).includes(q);
        const matchName = (o.customer_name ?? '').toLowerCase().includes(q);
        if (!matchRef && !matchName) return false;
      }
      const created = new Date(o.created_at);
      if (from && created < from) return false;
      if (to   && created > to)   return false;
      return true;
    });
  }, [sorted, filter, search, dateFrom, dateTo]);

  const counts = useMemo(() => {
    const c = { all: orders.length };
    STATUS_FILTERS.slice(1).forEach(s => { c[s] = orders.filter(o => o.status === s).length; });
    return c;
  }, [orders]);

  const hasActiveFilters = search || dateFrom || dateTo;
  function clearFilters() { setSearch(''); setDateFrom(''); setDateTo(''); }

  /* Status update handler */
  async function handleStatusChange(orderId, newStatus) {
    // "ready_delivered" is our internal key for the ready → delivered transition
    const actualStatus = newStatus === 'ready_delivered' ? 'delivered' : newStatus;
    setUpdating(orderId);
    try {
      const res = await fetch(`/api/producer-orders/${orderId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCookie('csrftoken'),
        },
        credentials: 'include',
        body: JSON.stringify({ status: actualStatus }),
      });
      if (!res.ok) throw new Error('Update failed');
      const updated = await res.json();
      setOrders(prev =>
        prev.map(o =>
          o.id === orderId
            ? {
                ...o,
                ...updated,
                subtotal:      parseFloat(updated.subtotal),
                commission:    parseFloat(updated.commission),
                payout_amount: parseFloat(updated.payout_amount),
              }
            : o
        ),
      );
    } catch (err) {
      alert(`Failed to update order: ${err.message}`);
    } finally {
      setUpdating(null);
    }
  }

  /* Guards */
  if (!producerId) {
    return (
      <div className={styles.centred}>
        <p>Choose a producer above to view their orders.</p>
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

  /* Stats */
  const pendingCount    = orders.filter(o => o.status === 'pending').length;
  const preparingCount  = orders.filter(o => o.status === 'preparing').length;
  const readyCount      = orders.filter(o => o.status === 'ready').length;
  const deliveredCount  = orders.filter(o => o.status === 'delivered').length;
  const cancelledCount  = orders.filter(o => ['cancelled', 'rejected'].includes(o.status)).length;

  return (
    <section className={styles.section}>

      {/* Header */}
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>Orders</h2>
          <p className={styles.subtitle}>Manage incoming orders and update fulfilment status</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className={styles.statsGrid}>
        <StatCard label="Total Orders" value={orders.length}    sub="All time" accent />
        <StatCard label="Pending"      value={pendingCount}     sub="Awaiting your response" />
        <StatCard label="Preparing"    value={preparingCount}   sub="Being prepared" />
        <StatCard label="Ready"        value={readyCount}       sub="Ready for delivery" />
        <StatCard label="Delivered"    value={deliveredCount}   sub="Successfully delivered" />
        <StatCard label="Cancelled"    value={cancelledCount}   sub="Cancelled or rejected" />
      </div>

      {/* Filter tabs */}
      <div className={styles.filterTabs}>
        {STATUS_FILTERS.map(f => (
          <button
            key={f}
            className={`${styles.filterTab} ${filter === f ? styles.filterTabActive : ''}`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            <span className={styles.filterTabCount}>{counts[f]}</span>
          </button>
        ))}
      </div>

      {/* Search + date filters */}
      <div className={styles.ordersFilterBar}>
        <label className={styles.searchField}>
          <FiSearch size={15} />
          <input
            type="text"
            placeholder="Search by customer or order ref…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </label>
        <label className={styles.dateLabel}>
          From
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        </label>
        <label className={styles.dateLabel}>
          To
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </label>
        {hasActiveFilters && (
          <button className={styles.clearFiltersBtn} onClick={clearFilters}>
            <FiX size={14} /> Clear
          </button>
        )}
      </div>

      {/* Orders table */}
      {filtered.length === 0 ? (
        <div className={styles.empty}>
          <p>No {filter !== 'all' ? filter : ''} orders found.</p>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Order Ref</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Items</th>
                <th>Subtotal</th>
                <th>Delivery Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(order => {
                const actions = getActions(order.status);
                const isExpanded = expandedId === order.id;

                return (
                  <Fragment key={order.id}>
                    <tr
                      onClick={() => setExpandedId(isExpanded ? null : order.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td className={styles.muted}>#{order.order}</td>
                      <td>{order.customer_name}</td>
                      <td className={styles.dateCell}>
                        {new Date(order.created_at).toLocaleDateString('en-GB')}
                      </td>
                      <td className={styles.centredCell}>
                        {order.items?.length ?? 0}
                      </td>
                      <td><strong>£{order.subtotal.toFixed(2)}</strong></td>
                      <td className={styles.dateCell}>
                        {order.delivery_date
                          ? new Date(order.delivery_date).toLocaleDateString('en-GB')
                          : <span className={styles.muted}>—</span>}
                      </td>
                      <td>
                        <span className={`${styles.orderStatusBadge} ${ORDER_STATUS_CLASS[order.status] ?? styles.badgeGrey}`}>
                          <span className={styles.badgeDot} />
                          {order.status}
                        </span>
                      </td>
                      <td className={styles.actionsCell} onClick={e => e.stopPropagation()}>
                        {actions.length > 0 ? (() => {
                          // Multiple options (pending: Accept / Reject) → direct icon buttons
                          if (actions.length > 1) {
                            return (
                              <div className={styles.actionIconBtns}>
                                {actions.map(a => (
                                  <button
                                    key={a.next}
                                    className={a.style === 'delete' ? styles.actionIconDanger : styles.actionIconSafe}
                                    disabled={updating === order.id}
                                    onClick={() => handleStatusChange(order.id, a.next)}
                                    title={a.label}
                                  >
                                    {updating === order.id ? '…' : a.style === 'delete' ? <FiX size={13} /> : <FiCheck size={13} />}
                                  </button>
                                ))}
                              </div>
                            );
                          }
                          // Single next step → pill chip + confirm tick
                          const action = actions[0];
                          return (
                            <div className={styles.statusPicker}>
                              <span className={styles.nextStatusChip}>{action.label}</span>
                              <button
                                className={styles.confirmIconBtn}
                                disabled={updating === order.id}
                                onClick={() => handleStatusChange(order.id, action.next)}
                                title="Confirm"
                              >
                                {updating === order.id ? '…' : <FiCheck size={13} />}
                              </button>
                            </div>
                          );
                        })() : (
                          <span className={styles.muted}>—</span>
                        )}
                      </td>
                    </tr>

                    {/* Expanded items row */}
                    {isExpanded && order.items?.length > 0 && (
                      <tr>
                        <td colSpan={8} style={{ padding: 0, background: 'var(--surface-2)' }}>
                          <table className={styles.table} style={{ margin: 0, border: 'none' }}>
                            <thead>
                              <tr>
                                <th>Product</th>
                                <th>Qty</th>
                                <th>Unit Price</th>
                                <th>Line Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {order.items.map(item => (
                                <tr key={item.id}>
                                  <td>{item.product_name}</td>
                                  <td className={styles.centredCell}>{item.quantity}</td>
                                  <td>£{parseFloat(item.price_snapshot).toFixed(2)}</td>
                                  <td><strong>£{parseFloat(item.line_total).toFixed(2)}</strong></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

    </section>
  );
}
