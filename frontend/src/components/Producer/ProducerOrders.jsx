import { useState, useEffect, useMemo } from 'react';
import shared from '../../pages/Producer/ProducerShared.module.css';
import local from './ProducerOrders.module.css';
const styles = { ...shared, ...local };
import { FiSearch, FiX, FiCheck, FiUser, FiMapPin, FiPackage, FiFileText, FiChevronUp, FiChevronDown, FiMail } from 'react-icons/fi';
import apiClient from '../../utils/apiClient';

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

/** Returns the valid next statuses for the dropdown */
function getNextStatuses(status) {
  switch (status) {
    case 'pending':   return ['accepted', 'rejected'];
    case 'accepted':  return ['preparing', 'cancelled'];
    case 'preparing': return ['ready', 'cancelled'];
    case 'ready':     return ['delivered', 'cancelled'];
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
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modalClosing, setModalClosing]  = useState(false);
  const [statusOrder, setStatusOrder]       = useState(null);   // order for status-change modal
  const [statusChoice, setStatusChoice]     = useState('');      // selected new status
  const [statusClosing, setStatusClosing]   = useState(false);
  const [cancelReason, setCancelReason]     = useState('');
  const [updating, setUpdating] = useState(null); // id of order being updated
  const [sortKey, setSortKey]   = useState('created_at');
  const [sortDir, setSortDir]   = useState('desc');

  /* Fetch orders */
  useEffect(() => {
    if (!producerId) { setOrders([]); return; }
    let cancelled = false;
    setLoading(true);
    setError('');

    (async () => {
      try {
        const { data } = await apiClient.get('/producer-orders/', {
          params: { producer: producerId },
        });
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

  /* Close detail modal with fade-down animation */
  function closeModal() {
    setModalClosing(true);
    setTimeout(() => {
      setSelectedOrder(null);
      setModalClosing(false);
    }, 200);
  }

  /* Open status-change modal */
  function openStatusModal(order) {
    const next = getNextStatuses(order.status);
    setStatusChoice(next[0] || '');
    setStatusOrder(order);
  }

  /* Close status-change modal with fade-down */
  function closeStatusModal() {
    setStatusClosing(true);
    setTimeout(() => {
      setStatusOrder(null);
      setStatusChoice('');
      setCancelReason('');
      setStatusClosing(false);
    }, 200);
  }

  /* Sort toggle helper */
  function toggleSort(key) {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  /* Derived data */
  const sorted = useMemo(() => {
    const mult = sortDir === 'asc' ? 1 : -1;
    return [...orders].sort((a, b) => {
      let av, bv;
      switch (sortKey) {
        case 'order':
          av = a.order; bv = b.order; break;
        case 'created_at':
          av = new Date(a.created_at); bv = new Date(b.created_at); break;
        case 'items':
          av = a.items?.length ?? 0; bv = b.items?.length ?? 0; break;
        case 'subtotal':
          av = a.subtotal; bv = b.subtotal; break;
        case 'delivery_date':
          av = a.delivery_date ? new Date(a.delivery_date) : new Date(0);
          bv = b.delivery_date ? new Date(b.delivery_date) : new Date(0);
          break;
        default:
          av = new Date(a.created_at); bv = new Date(b.created_at);
      }
      if (av < bv) return -1 * mult;
      if (av > bv) return  1 * mult;
      return 0;
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
    setUpdating(orderId);
    try {
      const { data: updated } = await apiClient.patch(
        `/producer-orders/${orderId}/`,
        { status: newStatus },
      );
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
      closeStatusModal();
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
          <table className={`${styles.table} ${styles.ordersTable}`}>
            <thead>
              <tr>
                <th>
                  <button className={styles.sortBtn} onClick={() => toggleSort('order')}>
                    Order Ref
                    {sortKey === 'order' && (sortDir === 'asc' ? <FiChevronUp size={13} /> : <FiChevronDown size={13} />)}
                  </button>
                </th>
                <th>Customer</th>
                <th>
                  <button className={styles.sortBtn} onClick={() => toggleSort('created_at')}>
                    Date
                    {sortKey === 'created_at' && (sortDir === 'asc' ? <FiChevronUp size={13} /> : <FiChevronDown size={13} />)}
                  </button>
                </th>
                <th>
                  <button className={styles.sortBtn} onClick={() => toggleSort('items')}>
                    Items
                    {sortKey === 'items' && (sortDir === 'asc' ? <FiChevronUp size={13} /> : <FiChevronDown size={13} />)}
                  </button>
                </th>
                <th>
                  <button className={styles.sortBtn} onClick={() => toggleSort('subtotal')}>
                    Subtotal
                    {sortKey === 'subtotal' && (sortDir === 'asc' ? <FiChevronUp size={13} /> : <FiChevronDown size={13} />)}
                  </button>
                </th>
                <th>
                  <button className={styles.sortBtn} onClick={() => toggleSort('delivery_date')}>
                    Delivery Date
                    {sortKey === 'delivery_date' && (sortDir === 'asc' ? <FiChevronUp size={13} /> : <FiChevronDown size={13} />)}
                  </button>
                </th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(order => {
                const hasNext = getNextStatuses(order.status).length > 0;

                return (
                  <tr
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
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
                      {hasNext ? (
                        <button
                          className={styles.updateStatusBtn}
                          onClick={() => openStatusModal(order)}
                        >
                          Update Status
                        </button>
                      ) : (
                        <span className={styles.muted}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Order detail modal */}
      {selectedOrder && (
        <div className={`${styles.modalOverlay} ${modalClosing ? styles.modalOverlayClosing : ''}`} onClick={closeModal}>
          <div className={`${styles.modalContent} ${modalClosing ? styles.modalContentClosing : ''}`} onClick={e => e.stopPropagation()}>

            {/* Modal header */}
            <div className={styles.modalHeader}>
              <div>
                <h3 className={styles.modalTitle}>Order #{selectedOrder.order}</h3>
                <span className={`${styles.orderStatusBadge} ${ORDER_STATUS_CLASS[selectedOrder.status] ?? styles.badgeGrey}`}>
                  <span className={styles.badgeDot} />
                  {selectedOrder.status}
                </span>
              </div>
              <button className={styles.modalClose} onClick={closeModal}>
                <FiX size={20} />
              </button>
            </div>

            {/* Info grid */}
            <div className={styles.detailGrid}>

              {/* Customer contact information */}
              <div className={styles.detailCard}>
                <h4 className={styles.detailCardTitle}><FiUser size={15} /> Customer Contact</h4>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Name</span>
                  <span>{selectedOrder.customer_name}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Email</span>
                  <span>{selectedOrder.customer_email || <span className={styles.muted}>—</span>}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Phone</span>
                  <span>{selectedOrder.customer_phone || <span className={styles.muted}>—</span>}</span>
                </div>
              </div>

              {/* Delivery address */}
              <div className={styles.detailCard}>
                <h4 className={styles.detailCardTitle}><FiMapPin size={15} /> Delivery Address</h4>
                {selectedOrder.delivery_address ? (
                  <>
                    <p className={styles.addressLine}>{selectedOrder.delivery_address.address_line_1}</p>
                    {selectedOrder.delivery_address.address_line_2 && (
                      <p className={styles.addressLine}>{selectedOrder.delivery_address.address_line_2}</p>
                    )}
                    <p className={styles.addressLine}>{selectedOrder.delivery_address.city}</p>
                    <p className={styles.addressLine}>{selectedOrder.delivery_address.postcode}</p>
                  </>
                ) : (
                  <p className={styles.muted}>No delivery address on file</p>
                )}
              </div>

              {/* Order dates & value */}
              <div className={styles.detailCard}>
                <h4 className={styles.detailCardTitle}><FiFileText size={15} /> Order Details</h4>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Order Date</span>
                  <span>{new Date(selectedOrder.created_at).toLocaleDateString('en-GB')}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Delivery Date</span>
                  <span>
                    {selectedOrder.delivery_date
                      ? new Date(selectedOrder.delivery_date).toLocaleDateString('en-GB')
                      : <span className={styles.muted}>Not set</span>}
                  </span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Total Value</span>
                  <span><strong>£{selectedOrder.subtotal.toFixed(2)}</strong></span>
                </div>
              </div>
            </div>

            {/* Order instructions */}
            <div className={styles.specialInstructions}>
              <h4 className={styles.detailCardTitle}><FiFileText size={15} /> Order Instructions</h4>
              <p>{selectedOrder.special_instructions || <span className={styles.muted}>No instructions provided</span>}</p>
            </div>

            {/* Itemised product list */}
            <div className={styles.modalItemsSection}>
              <h4 className={styles.detailCardTitle}><FiPackage size={15} /> Items Ordered</h4>
              {selectedOrder.items?.length > 0 ? (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Qty</th>
                      <th>Unit Price</th>
                      <th>Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items.map(item => (
                      <tr key={item.id}>
                        <td>{item.product_name}</td>
                        <td className={styles.centredCell}>{item.quantity}</td>
                        <td>£{parseFloat(item.price_snapshot).toFixed(2)}</td>
                        <td><strong>£{parseFloat(item.line_total).toFixed(2)}</strong></td>
                      </tr>
                    ))}
                    <tr className={styles.totalRow}>
                      <td colSpan={3}><strong>Total</strong></td>
                      <td><strong>£{selectedOrder.subtotal.toFixed(2)}</strong></td>
                    </tr>
                  </tbody>
                </table>
              ) : (
                <p className={styles.muted}>No items</p>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Status-change modal */}
      {statusOrder && (() => {
        const nextStatuses = getNextStatuses(statusOrder.status);
        return (
          <div
            className={`${styles.modalOverlay} ${statusClosing ? styles.modalOverlayClosing : ''}`}
            onClick={closeStatusModal}
          >
            <div
              className={`${styles.statusModalContent} ${statusClosing ? styles.modalContentClosing : ''}`}
              onClick={e => e.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <div>
                  <h3 className={styles.modalTitle}>Update Order Status</h3>
                  <p className={styles.statusModalSub}>Order #{statusOrder.order} &middot; Currently <strong>{statusOrder.status}</strong></p>
                </div>
                <button className={styles.modalClose} onClick={closeStatusModal}>
                  <FiX size={20} />
                </button>
              </div>

              <div className={styles.statusModalBody}>
                <label className={styles.statusSelectLabel}>
                  New Status
                  <select
                    className={styles.statusSelect}
                    value={statusChoice}
                    onChange={e => setStatusChoice(e.target.value)}
                  >
                    {nextStatuses.map(s => (
                      <option key={s} value={s}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </option>
                    ))}
                  </select>
                </label>

                {(statusChoice === 'cancelled' || statusChoice === 'rejected') && (
                  <label className={styles.statusSelectLabel}>
                    Reason for {statusChoice === 'cancelled' ? 'Cancellation' : 'Rejection'}
                    <textarea
                      className={styles.cancelReasonInput}
                      rows={3}
                      placeholder="e.g. Out of stock, supplier delay…"
                      value={cancelReason}
                      onChange={e => setCancelReason(e.target.value)}
                    />
                  </label>
                )}

                <div className={styles.statusModalActions}>
                  <button
                    className={styles.statusSaveBtn}
                    disabled={
                      !statusChoice
                      || updating === statusOrder.id
                      || ((statusChoice === 'cancelled' || statusChoice === 'rejected') && !cancelReason.trim())
                    }
                    onClick={() => handleStatusChange(statusOrder.id, statusChoice)}
                  >
                    <FiCheck size={15} />
                    {updating === statusOrder.id ? 'Saving…' : 'Save Changes'}
                  </button>

                  <button
                    className={styles.notifyEmailBtn}
                    title="Send email notification to customer"
                  >
                    <FiMail size={15} />
                    Notify Customer
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

    </section>
  );
}
