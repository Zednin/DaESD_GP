import { useState, useEffect, useMemo, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import shared from '../../pages/Producer/ProducerShared.module.css';
import local from './ProducerOrders.module.css';
const styles = { ...shared, ...local };
import { FiSearch, FiX, FiCheck, FiUser, FiMapPin, FiPackage, FiFileText, FiChevronUp, FiChevronDown, FiMail, FiClock } from 'react-icons/fi';
import DatePicker from '../DatePicker/DatePicker';
import apiClient from '../../utils/apiClient';

const ORDER_STATUS_CLASS = {
  pending:   styles.badgeWarning,
  accepted:  styles.badgeBlue,
  preparing: styles.badgeBlue,
  ready:     styles.badgePurple,
  delivered: styles.badgeGreen,
  completed: styles.badgeGreen,
  confirmed: styles.badgeGreen,
  active:    styles.badgeGreen,
  paused:    styles.badgeWarning,
  cancelled: styles.badgeGrey,
  rejected:  styles.badgeGrey,
};

// colours calendar orders by type
const calendarTypeClass = {
  normal: styles.calendarTypeNormal,
  bulk: styles.calendarTypeBulk,
  recurring: styles.calendarTypeRecurring,
};

const calendarStatusClass = {
  pending: styles.calendarStatusPending,
  accepted: styles.calendarStatusPreparing,
  preparing: styles.calendarStatusPreparing,
  ready: styles.calendarStatusReady,
  delivered: styles.calendarStatusDelivered,
  completed: styles.calendarStatusDelivered,
  cancelled: styles.calendarStatusCancelled,
  rejected: styles.calendarStatusCancelled,
};

const statusFilters = [
  { value: 'all', label: 'All' },
  { value: 'preparing', label: 'Preparing' },
  { value: 'ready', label: 'Ready' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

const calendarStatusItems = [
  { value: 'preparing', label: 'Preparing', countClass: styles.statusCountPreparing },
  { value: 'ready', label: 'Ready', countClass: styles.statusCountReady },
  { value: 'delivered', label: 'Delivered', countClass: styles.statusCountDelivered },
  { value: 'cancelled', label: 'Cancelled', countClass: styles.statusCountCancelled },
];

const orderTabs = [
  { value: 'all', label: 'All' },
  { value: 'normal', label: 'Standard Order' },
  { value: 'recurring', label: 'Recurring' },
  { value: 'bulk', label: 'Bulk' },
];

const weekdays = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-GB');
}

function formatFrequency(value) {
  return value === 'fortnightly' ? 'Fortnightly' : 'Weekly';
}

function formatWeekday(value) {
  return weekdays[Number(value)] ?? '—';
}

function matchesStatus(status, selectedStatus) {
  if (selectedStatus === 'all') return true;
  if (selectedStatus === 'cancelled') return ['cancelled', 'rejected'].includes(status);
  if (selectedStatus === 'delivered') return ['delivered', 'completed'].includes(status);
  return status === selectedStatus;
}

// backend marks standard, recurring, or bulk
function getOrderType(order) {
  return order.order_type || 'normal';
}

function getOrderTypeLabel(order) {
  const type = getOrderType(order);
  if (type === 'recurring') return 'Recurring';
  if (type === 'bulk') return 'Bulk';
  return 'Standard';
}

function normaliseProducerOrder(order) {
  return {
    ...order,
    order_type: order.order_type || 'normal',
    subtotal: parseFloat(order.subtotal),
    commission: parseFloat(order.commission),
    payout_amount: parseFloat(order.payout_amount),
  };
}

function getCalendarTitle(order) {
  return `Order | #${order.order} | ${order.status}`;
}

function getDayDate(dateValue, weekdayValue) {
  const day = weekdayValue === undefined || weekdayValue === null
    ? dateValue ? new Date(dateValue).toLocaleDateString('en-GB', { weekday: 'long' }) : '—'
    : formatWeekday(weekdayValue);
  return `${day} / ${formatDate(dateValue)}`;
}

// gets the schedule row shown to producers
function getRecurringSchedule(row) {
  return row.current_schedule || {};
}

// linked orders decide if a schedule is delivered
function getRecurringScheduleStatus(row) {
  const schedule = getRecurringSchedule(row);
  const linkedStatus = (row.linked_order_status || schedule.order_status || '').toLowerCase();
  if (linkedStatus) {
    return ['completed', 'complete'].includes(linkedStatus) ? 'delivered' : linkedStatus;
  }
  if (schedule.status === 'confirmed') return 'confirmed';
  return schedule.status || row.next_event_status || 'pending';
}

function getRecurringStatusLabel(status) {
  if (!status) return 'Pending';
  return status
    .replaceAll('_', ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}

function getRecurringOrderDate(row) {
  const schedule = getRecurringSchedule(row);
  return ['cancelled', 'delivered'].includes(getRecurringScheduleStatus(row))
    ? schedule.next_scheduled_for
    : schedule.scheduled_for || row.next_run_at;
}

function getRecurringDeliveryDate(row) {
  const schedule = getRecurringSchedule(row);
  return ['cancelled', 'delivered'].includes(getRecurringScheduleStatus(row))
    ? schedule.next_delivery_date
    : schedule.delivery_date || row.next_delivery_date;
}

function getRecurringScheduleMeta(row) {
  const schedule = getRecurringSchedule(row);
  const status = getRecurringScheduleStatus(row);

  if (status === 'confirmed') {
    return [
      schedule.order_reference ? `Order #${schedule.order_reference}` : null,
      `Paid ${formatDate(schedule.paid_at)}`,
      `Delivery ${getDayDate(schedule.delivery_date, row.delivery_day)}`,
    ].filter(Boolean);
  }

  if (status === 'delivered') {
    return [
      schedule.order_reference ? `Order #${schedule.order_reference}` : null,
      `Delivered ${getDayDate(schedule.delivery_date, row.delivery_day)}`,
      `Next order ${getDayDate(schedule.next_scheduled_for, row.order_day)}`,
    ].filter(Boolean);
  }

  if (status === 'cancelled') {
    return [
      `Next order ${getDayDate(schedule.next_scheduled_for, row.order_day)}`,
      `Next delivery ${getDayDate(schedule.next_delivery_date, row.delivery_day)}`,
    ];
  }

  return [
    `Order ${getDayDate(getRecurringOrderDate(row), row.order_day)}`,
    `Delivery ${getDayDate(getRecurringDeliveryDate(row), row.delivery_day)}`,
  ];
}

function isCompleteStatus(status) {
  return ['completed', 'delivered'].includes(status);
}

function isCancelledStatus(status) {
  return ['cancelled', 'rejected'].includes(status);
}

// gets hours between order and delivery
function getLeadTimeHours(createdAt, deliveryDate) {
  if (!createdAt || !deliveryDate) return null;
  const created = new Date(createdAt);
  const delivery = new Date(deliveryDate + 'T00:00:00');
  const diffMs = delivery - created;
  return Math.round(diffMs / (1000 * 60 * 60));
}

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

function StatCard({ label, value, sub, accent, active, compact, onClick }) {
  const content = (
    <>
      <p className={styles.statLabel}>{label}</p>
      <p className={`${styles.statValue} ${accent ? styles.statAccent : ''}`}>{value}</p>
      {sub && <p className={styles.statSub}>{sub}</p>}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={`${styles.statCard} ${styles.statCardButton} ${active ? styles.statCardActive : ''} ${compact ? styles.statCardCompact : ''}`}
        onClick={onClick}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={`${styles.statCard} ${compact ? styles.statCardCompact : ''}`}>
      {content}
    </div>
  );
}

function StatusWidget({ label, value, countClass, active, onClick }) {
  return (
    <button
      type="button"
      className={`${styles.statusWidget} ${active ? styles.statusWidgetActive : ''}`}
      onClick={onClick}
    >
      <span className={styles.statusWidgetText}>
        <span>{label}</span>
        <small>View orders</small>
      </span>
      <span className={`${styles.statusCountCircle} ${countClass}`}>{value}</span>
    </button>
  );
}

/* component */
export default function ProducerOrders({ producerId, producerName, onPendingCountChange }) {
  const [orders, setOrders]       = useState([]);
  // recurring templates come from their own endpoint
  const [recurringOrders, setRecurringOrders] = useState([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pendingOpen, setPendingOpen] = useState(false);
  const [recurringOpen, setRecurringOpen] = useState(false);
  const [schedulePanelMode, setSchedulePanelMode] = useState('recurring');
  const [search, setSearch]       = useState('');
  const [dateFrom, setDateFrom]   = useState('');
  const [dateTo, setDateTo]       = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedRecurringOrder, setSelectedRecurringOrder] = useState(null);
  const [modalClosing, setModalClosing]  = useState(false);
  const [statusOrder, setStatusOrder]       = useState(null);   // order for status-change modal
  const [statusChoice, setStatusChoice]     = useState('');      // selected new status
  const [statusClosing, setStatusClosing]   = useState(false);
  const [cancelReason, setCancelReason]     = useState('');
  const [updating, setUpdating] = useState(null); // id of order being updated
  const [sortKey, setSortKey]   = useState('created_at');
  const [sortDir, setSortDir]   = useState('desc');
  const orderListRef = useRef(null);
  const recurringListRef = useRef(null);

  // load normal orders and recurring templates together
  useEffect(() => {
    if (!producerId) {
      setOrders([]);
      setRecurringOrders([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError('');

    (async () => {
      try {
        const [ordersResponse, recurringResponse] = await Promise.all([
          apiClient.get(`/producer-orders/`, {
            params: { producer: producerId },
          }),
          apiClient.get(`/recurring-orders/producer/`, {
            params: { producer: producerId },
          }),
        ]);
        if (cancelled) return;

        setOrders((ordersResponse.data.results ?? ordersResponse.data).map(normaliseProducerOrder));

        // make recurring money fields safe for totals
        setRecurringOrders(
          (recurringResponse.data.results ?? recurringResponse.data).map(row => ({
            ...row,
            items: (row.items ?? []).map(item => ({
              ...item,
              price: Number(item.price),
              quantity: Number(item.quantity),
              line_total: Number(item.line_total),
            })),
            total_cost: Number(row.total_cost ?? 0),
            commission: Number(row.commission ?? 0),
            payout_amount: Number(row.payout_amount ?? 0),
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

  const dateRange = useMemo(() => {
    return {
      from: dateFrom ? new Date(dateFrom) : null,
      to: dateTo ? new Date(`${dateTo}T23:59:59`) : null,
    };
  }, [dateFrom, dateTo]);

  const searchedOrders = useMemo(() => {
    const q = search.trim().toLowerCase();

    return sorted.filter(order => {
      if (q) {
        const matchRef  = String(order.order).includes(q);
        const matchName = (order.customer_name ?? '').toLowerCase().includes(q);
        const matchRecurring = (order.recurring_name ?? '').toLowerCase().includes(q);
        if (!matchRef && !matchName && !matchRecurring) return false;
      }
      const orderDate = order.delivery_date ? new Date(`${order.delivery_date}T00:00:00`) : new Date(order.created_at);
      if (dateRange.from && orderDate < dateRange.from) return false;
      if (dateRange.to && orderDate > dateRange.to) return false;
      return true;
    });
  }, [sorted, search, dateRange]);

  const activeOrders = useMemo(() => {
    return searchedOrders.filter(order => order.status !== 'pending');
  }, [searchedOrders]);

  const typeFilteredOrders = useMemo(() => {
    if (activeTab === 'all') return activeOrders;
    return activeOrders.filter(order => getOrderType(order) === activeTab);
  }, [activeOrders, activeTab]);

  const filteredOrders = useMemo(() => {
    return typeFilteredOrders.filter(order => matchesStatus(order.status, statusFilter));
  }, [typeFilteredOrders, statusFilter]);

  const filteredRecurringOrders = useMemo(() => {
    const query = search.trim().toLowerCase();

    // recurring table shares the search and date filters
    return recurringOrders.filter(row => {
      if (query) {
        const matchesOrganisation = (row.organisation_name ?? '').toLowerCase().includes(query);
        const matchesName = (row.recurring_name ?? '').toLowerCase().includes(query);
        const matchesProduct = (row.items ?? []).some(item => (item.product_name ?? '').toLowerCase().includes(query));
        if (!matchesOrganisation && !matchesName && !matchesProduct) return false;
      }

      const nextDelivery = row.next_delivery_date ? new Date(`${row.next_delivery_date}T00:00:00`) : null;
      if (dateRange.from && (!nextDelivery || nextDelivery < dateRange.from)) return false;
      if (dateRange.to && (!nextDelivery || nextDelivery > dateRange.to)) return false;
      return true;
    });
  }, [recurringOrders, search, dateRange]);

  const orderCalendarEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // calendar prefers delivery date, then order date
    return orders
      .filter(order => order.delivery_date || order.created_at)
      .map(order => {
        const eventDate = order.delivery_date ? new Date(`${order.delivery_date}T00:00:00`) : new Date(order.created_at);
        return {
          id: String(order.id),
          title: getCalendarTitle(order),
          start: order.delivery_date || order.created_at,
          extendedProps: {
            orderType: getOrderType(order),
            status: order.status,
            isCompletePast: isCompleteStatus(order.status) && eventDate < today,
            isCancelled: isCancelledStatus(order.status),
          },
        };
      });
  }, [orders]);

  const ordersById = useMemo(() => {
    return new Map(orders.map(order => [String(order.id), order]));
  }, [orders]);

  const pendingOrders = useMemo(() => {
    return searchedOrders.filter(order => order.status === 'pending');
  }, [searchedOrders]);

  const recurringOrderCount = useMemo(() => {
    return recurringOrders.length;
  }, [recurringOrders]);

  const statusCounts = useMemo(() => {
    return {
      pending: orders.filter(order => order.status === 'pending').length,
      preparing: orders.filter(order => order.status === 'preparing').length,
      ready: orders.filter(order => order.status === 'ready').length,
      delivered: orders.filter(order => ['delivered', 'completed'].includes(order.status)).length,
      cancelled: orders.filter(order => ['cancelled', 'rejected'].includes(order.status)).length,
    };
  }, [orders]);

  useEffect(() => {
    // send pending count back to dashboard nav
    onPendingCountChange?.(statusCounts.pending);
  }, [onPendingCountChange, statusCounts.pending]);

  const hasActiveDateFilter = dateFrom || dateTo;
  const hasActiveFilters = search || statusFilter !== 'all' || hasActiveDateFilter;
  const displayedOrders = filteredOrders;
  const normalOrders = useMemo(() => {
    return activeOrders.filter(order => getOrderType(order) === 'normal' && matchesStatus(order.status, 'delivered'));
  }, [activeOrders]);

  const paidRecurringOrders = useMemo(() => {
    // stat card only counts delivered recurring orders
    return activeOrders.filter(order => getOrderType(order) === 'recurring' && matchesStatus(order.status, 'delivered'));
  }, [activeOrders]);

  const bulkOrders = useMemo(() => {
    // bulk list keeps every bulk status
    return activeOrders.filter(order => getOrderType(order) === 'bulk');
  }, [activeOrders]);

  const paidBulkOrders = useMemo(() => {
    return bulkOrders.filter(order => matchesStatus(order.status, 'delivered'));
  }, [bulkOrders]);

  function clearFilters() {
    setSearch('');
    setStatusFilter('all');
    setDateFrom('');
    setDateTo('');
  }

  function handleTabChange(nextTab) {
    setActiveTab(nextTab);
    setSortKey('created_at');
    setSortDir('desc');
  }

  function handleStatusFilter(nextStatus) {
    setStatusFilter(nextStatus);
  }

  function handleDateFromChange(value) {
    setDateFrom(value);
  }

  function handleDateToChange(value) {
    setDateTo(value);
  }

  function scrollToPanel(panelRef) {
    window.requestAnimationFrame(() => {
      panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function showOrderList(nextTab, nextStatus) {
    setActiveTab(nextTab);
    setStatusFilter(nextStatus);
    setSearch('');
    setDateFrom('');
    setDateTo('');
    scrollToPanel(orderListRef);
  }

  function showRecurringList() {
    // open the recurring summary from the stat card
    setActiveTab('recurring');
    setStatusFilter('delivered');
    setSearch('');
    setDateFrom('');
    setDateTo('');
    setSchedulePanelMode('recurring');
    setRecurringOpen(true);
    scrollToPanel(recurringListRef);
  }

  function showBulkList() {
    // open delivered bulk orders from the stat card
    setSchedulePanelMode('bulk');
    showOrderList('bulk', 'delivered');
  }

  /* status update handler */
  async function handleStatusChange(orderId, newStatus) {
    setUpdating(orderId);
    try {
      const { data: updated } = await apiClient.patch(
        `/producer-orders/${orderId}/`,
        { status: newStatus },
      );
      const normalisedOrder = normaliseProducerOrder(updated);
      setOrders(prev =>
        prev.map(o =>
          o.id === orderId
            ? normalisedOrder
            : o
        ),
      );
      setSelectedOrder(current => current?.id === orderId ? normalisedOrder : current);
      if (statusOrder?.id === orderId) closeStatusModal();
    } catch (err) {
      alert(`Failed to update order: ${err.message}`);
    } finally {
      setUpdating(null);
    }
  }

  /* guards */
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

  /* stats */
  const normalOrderCount = normalOrders.length;
  const paidRecurringOrderCount = paidRecurringOrders.length;
  const paidBulkOrderCount = paidBulkOrders.length;
  const totalOrderCount = activeOrders.length;

  return (
    <section className={styles.section}>

      {/* header */}
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>Orders</h2>
          <p className={styles.subtitle}>Manage incoming orders and update fulfilment status</p>
        </div>
      </div>

      <div className={styles.widgetsStack}>
        <div className={styles.primaryStatsGrid}>
          <StatCard label="Total orders" value={totalOrderCount} sub="All order records" accent active={activeTab === 'all' && statusFilter === 'all'} onClick={() => showOrderList('all', 'all')} />
          <StatCard label="Standard" value={normalOrderCount} sub="Delivered standard orders" active={activeTab === 'normal' && statusFilter === 'delivered'} onClick={() => showOrderList('normal', 'delivered')} />
          <StatCard label="Recurring" value={paidRecurringOrderCount} sub="Delivered recurring orders" active={activeTab === 'recurring' && statusFilter === 'delivered'} onClick={showRecurringList} />
          <StatCard label="Bulk" value={paidBulkOrderCount} sub="Delivered bulk orders" active={activeTab === 'bulk' && statusFilter === 'delivered'} onClick={showBulkList} />
        </div>

        <section className={styles.pendingPanel}>
          <button
            type="button"
            className={`${styles.pendingPanelButton} ${pendingOpen ? styles.pendingPanelButtonOpen : ''}`}
            onClick={() => setPendingOpen(open => !open)}
            aria-expanded={pendingOpen}
          >
            <span className={styles.pendingPanelText}>
              <span className={styles.pendingPanelTitle}>
                Pending
              </span>
              <span className={styles.pendingPanelSub}>Awaiting confirmation</span>
            </span>
            <span className={styles.pendingCountCircle}>{statusCounts.pending}</span>
            {pendingOpen ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
          </button>

          {pendingOpen && (
            <div className={styles.pendingDropdown}>
              {pendingOrders.length === 0 ? (
                <div className={styles.emptyCompact}>No pending orders awaiting confirmation.</div>
              ) : (
                <div className={styles.tableWrapper}>
                  <table className={`${styles.table} ${styles.pendingTable}`}>
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Order Ref</th>
                        <th>Customer</th>
                        <th>Items</th>
                        <th>Subtotal</th>
                        <th>Status Update Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingOrders.map(order => (
                        <tr key={order.id} className={styles.clickableRow} onClick={() => setSelectedOrder(order)}>
                          <td>
                            <span className={`${styles.typeBadge} ${styles[`type-${getOrderType(order)}`] || ''}`}>
                              {getOrderTypeLabel(order)}
                            </span>
                          </td>
                          <td className={styles.muted}>#{order.order}</td>
                          <td>{order.customer_name}</td>
                          <td className={styles.centredCell}>{order.items?.length ?? 0}</td>
                          <td><strong>£{order.subtotal.toFixed(2)}</strong></td>
                          <td className={styles.actionsCell} onClick={event => event.stopPropagation()}>
                            <div className={styles.pendingActionGroup}>
                              <button
                                type="button"
                                className={styles.acceptBtn}
                                disabled={updating === order.id}
                                onClick={() => handleStatusChange(order.id, 'accepted')}
                              >
                                Accept
                              </button>
                              <button
                                type="button"
                                className={styles.rejectBtn}
                                disabled={updating === order.id}
                                onClick={() => handleStatusChange(order.id, 'rejected')}
                              >
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      <div className={styles.calendarPanel}>
        <div className={styles.calendarStatusPanel}>
          {calendarStatusItems.map(item => (
            <StatusWidget
              key={item.value}
              label={item.label}
              value={statusCounts[item.value]}
              countClass={item.countClass}
              active={activeTab === 'all' && statusFilter === item.value}
              onClick={() => showOrderList('all', item.value)}
            />
          ))}
        </div>
        <div className={styles.calendarFrame}>
          <FullCalendar
            plugins={[dayGridPlugin]}
            initialView="dayGridMonth"
            events={orderCalendarEvents}
            height="auto"
            eventClick={eventInfo => {
              const order = ordersById.get(eventInfo.event.id);
              if (order) setSelectedOrder(order);
            }}
            eventClassNames={eventInfo => [
              styles.calendarEvent,
              calendarTypeClass[eventInfo.event.extendedProps.orderType],
              calendarStatusClass[eventInfo.event.extendedProps.status],
              eventInfo.event.extendedProps.isCompletePast ? styles.calendarEventComplete : '',
              eventInfo.event.extendedProps.isCancelled ? styles.calendarEventCancelled : '',
            ].filter(Boolean)}
          />
        </div>
      </div>

      <div className={styles.recurringOnlySection} ref={recurringListRef}>
        {/* dropdown for recurring templates and bulk orders */}
        <section className={`${styles.summaryPanel} ${styles.recurringSummaryPanel}`}>
          <div className={`${styles.schedulePanelHeader} ${recurringOpen ? styles.schedulePanelHeaderOpen : ''}`}>
            <div className={styles.scheduleSwitchGroup} role="tablist" aria-label={`${producerName || 'Producer'} scheduled order type`}>
              <button
                type="button"
                className={`${styles.scheduleSwitchBtn} ${schedulePanelMode === 'recurring' ? styles.scheduleSwitchActive : ''}`}
                onClick={() => {
                  setSchedulePanelMode('recurring');
                  setRecurringOpen(true);
                }}
                role="tab"
                aria-selected={schedulePanelMode === 'recurring'}
              >
                <span>Recurring Orders</span>
                <strong>{recurringOrderCount}</strong>
              </button>
              <button
                type="button"
                className={`${styles.scheduleSwitchBtn} ${schedulePanelMode === 'bulk' ? styles.scheduleSwitchActive : ''}`}
                onClick={() => {
                  setSchedulePanelMode('bulk');
                  setRecurringOpen(true);
                }}
                role="tab"
                aria-selected={schedulePanelMode === 'bulk'}
              >
                <span>Bulk Orders</span>
                <strong>{bulkOrders.length}</strong>
              </button>
            </div>
            <button
              type="button"
              className={styles.scheduleToggleBtn}
              onClick={() => setRecurringOpen(open => !open)}
              aria-expanded={recurringOpen}
              aria-label="Toggle scheduled order table"
            >
              {recurringOpen ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
            </button>
          </div>

          {recurringOpen && (
            <div className={styles.recurringDropdown}>
              {schedulePanelMode === 'recurring' && filteredRecurringOrders.length === 0 ? (
                <div className={styles.emptyCompact}>No recurring orders found.</div>
              ) : schedulePanelMode === 'bulk' && bulkOrders.length === 0 ? (
                <div className={styles.emptyCompact}>No bulk orders found.</div>
              ) : schedulePanelMode === 'bulk' ? (
                <div className={styles.tableWrapper}>
                  <table className={`${styles.table} ${styles.bulkSummaryTable}`}>
                    <thead>
                      <tr>
                        <th>Order Ref</th>
                        <th>Order Date</th>
                        <th>Delivery Date</th>
                        <th>Customer</th>
                        <th>Items</th>
                        <th>Subtotal</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkOrders.map(order => (
                        <tr
                          key={order.id}
                          className={styles.clickableRow}
                          onClick={() => setSelectedOrder(order)}
                        >
                          <td className={styles.muted}>#{order.order}</td>
                          <td className={styles.dateCell}>{formatDate(order.created_at)}</td>
                          <td className={styles.dateCell}>{formatDate(order.delivery_date)}</td>
                          <td>{order.customer_name}</td>
                          <td className={styles.centredCell}>{order.items?.length ?? 0}</td>
                          <td><strong>£{order.subtotal.toFixed(2)}</strong></td>
                          <td>
                            <span className={`${styles.orderStatusBadge} ${ORDER_STATUS_CLASS[order.status] ?? styles.badgeGrey}`}>
                              <span className={styles.badgeDot} />
                              {order.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className={styles.tableWrapper}>
                  <table className={`${styles.table} ${styles.recurringSummaryTable}`}>
                    <thead>
                      <tr>
                        <th>Recurring Ref</th>
                        <th>Last order Reference</th>
                        <th>Order Date</th>
                        <th>Delivery Date</th>
                        <th>Organisation</th>
                        <th>Items</th>
                        <th>Subtotal</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRecurringOrders.map(row => {
                        const recurringStatus = getRecurringScheduleStatus(row);

                        return (
                          <tr
                            key={row.recurring_order_id}
                            className={styles.clickableRow}
                            onClick={() => setSelectedRecurringOrder(row)}
                          >
                            <td className={styles.muted}>#{row.recurring_order_id}</td>
                            <td className={styles.muted}>{getRecurringSchedule(row).order_reference ? `#${getRecurringSchedule(row).order_reference}` : '—'}</td>
                            <td>{getDayDate(getRecurringOrderDate(row), row.order_day)}</td>
                            <td className={styles.dateCell}>{getDayDate(getRecurringDeliveryDate(row), row.delivery_day)}</td>
                            <td>{row.organisation_name}</td>
                            <td className={styles.centredCell}>{row.items?.length ?? 0}</td>
                            <td><strong>£{row.total_cost.toFixed(2)}</strong></td>
                            <td>
                              <div className={styles.scheduleCell}>
                                <span className={`${styles.orderStatusBadge} ${ORDER_STATUS_CLASS[recurringStatus] ?? styles.badgeWarning}`}>
                                  <span className={styles.badgeDot} />
                                  {getRecurringStatusLabel(recurringStatus)}
                                </span>
                                {getRecurringScheduleMeta(row).slice(0, 1).map(item => (
                                  <small key={item}>{item}</small>
                                ))}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      <div className={styles.ordersPanel} ref={orderListRef}>
          <div className={styles.tableToolbar}>
            <div className={styles.tableTitleRow}>
              <div>
                <h3 className={styles.tableTitle}>Order list</h3>
                <p>Active orders exclude pending confirmations.</p>
              </div>
              <span>{displayedOrders.length} visible</span>
            </div>

            <div className={styles.combinedFilters}>
              {orderTabs.map(tab => (
                <button
                  key={tab.value}
                  className={`${styles.filterTab} ${activeTab === tab.value ? styles.filterTabActive : ''}`}
                  onClick={() => handleTabChange(tab.value)}
                >
                  {tab.label}
                </button>
              ))}
              <span className={styles.filterDivider} />
              {statusFilters.map(filterItem => (
                <button
                  key={filterItem.value}
                  className={`${styles.filterTab} ${statusFilter === filterItem.value ? styles.filterTabActive : ''}`}
                  onClick={() => handleStatusFilter(filterItem.value)}
                >
                  {filterItem.label}
                </button>
              ))}
            </div>

            <div className={styles.ordersFilterBar}>
              <label className={styles.searchField}>
                <FiSearch size={15} />
                <input
                  type="text"
                  placeholder="Search by customer, organisation, product, or order ref…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </label>
              <label className={styles.dateLabel}>
                From
                <DatePicker
                  value={dateFrom}
                  onChange={handleDateFromChange}
                  max={dateTo || undefined}
                  placeholder="From date"
                  ariaLabel="Choose start date"
                  className={styles.filterDatePicker}
                />
              </label>
              <label className={styles.dateLabel}>
                To
                <DatePicker
                  value={dateTo}
                  onChange={handleDateToChange}
                  min={dateFrom || undefined}
                  placeholder="To date"
                  ariaLabel="Choose end date"
                  className={styles.filterDatePicker}
                />
              </label>
              {hasActiveFilters && (
                <button className={styles.clearFiltersBtn} onClick={clearFilters}>
                  <FiX size={14} /> Clear
                </button>
              )}
            </div>
          </div>
          {displayedOrders.length === 0 ? (
            <div className={styles.empty}>
              <p>No matching orders found.</p>
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={`${styles.table} ${styles.ordersTable}`}>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>
                      <button className={styles.sortBtn} onClick={() => toggleSort('order')}>
                        Order Ref
                        {sortKey === 'order' && (sortDir === 'asc' ? <FiChevronUp size={13} /> : <FiChevronDown size={13} />)}
                      </button>
                    </th>
                    <th>
                      <button className={styles.sortBtn} onClick={() => toggleSort('created_at')}>
                        Order Date
                        {sortKey === 'created_at' && (sortDir === 'asc' ? <FiChevronUp size={13} /> : <FiChevronDown size={13} />)}
                      </button>
                    </th>
                    <th>
                      <button className={styles.sortBtn} onClick={() => toggleSort('delivery_date')}>
                        Delivery Date
                        {sortKey === 'delivery_date' && (sortDir === 'asc' ? <FiChevronUp size={13} /> : <FiChevronDown size={13} />)}
                      </button>
                    </th>
                    <th>Customer</th>
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
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedOrders.map(order => {
                    const hasNext = getNextStatuses(order.status).length > 0;

                    return (
                      <tr
                        key={order.id}
                        onClick={() => setSelectedOrder(order)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td>
                          <span className={`${styles.typeBadge} ${styles[`type-${getOrderType(order)}`] || ''}`}>
                            {getOrderTypeLabel(order)}
                          </span>
                        </td>
                        <td className={styles.muted}>#{order.order}</td>
                        <td className={styles.dateCell}>
                          {new Date(order.created_at).toLocaleDateString('en-GB')}
                        </td>
                        <td className={styles.dateCell}>
                          {order.delivery_date
                            ? <>
                                {new Date(order.delivery_date).toLocaleDateString('en-GB')}
                                {(() => {
                                  const hrs = getLeadTimeHours(order.created_at, order.delivery_date);
                                  const minHrs = order.lead_time_hours || 48;
                                  return hrs !== null ? (
                                    <span className={`${styles.leadTimeBadge} ${hrs >= minHrs ? styles.leadTimeOk : styles.leadTimeWarn}`}>
                                      <FiClock size={10} /> {hrs}h
                                    </span>
                                  ) : null;
                                })()}
                              </>
                            : <span className={styles.muted}>—</span>}
                        </td>
                        <td>{order.customer_name}</td>
                        <td className={styles.centredCell}>
                          {order.items?.length ?? 0}
                        </td>
                        <td><strong>£{order.subtotal.toFixed(2)}</strong></td>
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
      </div>

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
              <div className={styles.modalHeaderActions}>
                {selectedOrder.status === 'pending' && (
                  <div className={styles.pendingModalActions}>
                    <button
                      type="button"
                      className={styles.acceptBtn}
                      disabled={updating === selectedOrder.id}
                      onClick={() => handleStatusChange(selectedOrder.id, 'accepted')}
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      className={styles.rejectBtn}
                      disabled={updating === selectedOrder.id}
                      onClick={() => handleStatusChange(selectedOrder.id, 'rejected')}
                    >
                      Reject
                    </button>
                  </div>
                )}
                <button className={styles.modalClose} onClick={closeModal} aria-label="Close order details">
                  <FiX size={20} />
                </button>
              </div>
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
                  <span className={styles.detailLabel}>Lead Time</span>
                  <span>
                    {(() => {
                      const hrs = getLeadTimeHours(selectedOrder.created_at, selectedOrder.delivery_date);
                      if (hrs === null) return <span className={styles.muted}>—</span>;
                      const minHrs = selectedOrder.lead_time_hours || 48;
                      return (
                        <span className={hrs >= minHrs ? styles.leadTimeOkText : styles.leadTimeWarnText}>
                          <FiClock size={13} /> {hrs}h (min {minHrs}h required)
                        </span>
                      );
                    })()}
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

      {selectedRecurringOrder && (
        <div className={styles.modalOverlay} onClick={() => setSelectedRecurringOrder(null)}>
          <div className={`${styles.modalContent} ${styles.recurringModalContent}`} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h3 className={styles.modalTitle}>{selectedRecurringOrder.recurring_name}</h3>
                <div className={styles.modalStatusLine}>
                  <span className={`${styles.orderStatusBadge} ${ORDER_STATUS_CLASS[getRecurringScheduleStatus(selectedRecurringOrder)] ?? styles.badgeWarning}`}>
                    <span className={styles.badgeDot} />
                    {getRecurringStatusLabel(getRecurringScheduleStatus(selectedRecurringOrder))}
                  </span>
                  {getRecurringScheduleMeta(selectedRecurringOrder).map(item => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
              </div>
              <button className={styles.modalClose} onClick={() => setSelectedRecurringOrder(null)} aria-label="Close recurring order details">
                <FiX size={20} />
              </button>
            </div>

            <div className={styles.recurringModalGrid}>
              <div className={styles.detailCard}>
                <h4 className={styles.detailCardTitle}><FiUser size={15} /> Organisation</h4>
                <p className={styles.addressLine}>{selectedRecurringOrder.organisation_name}</p>
              </div>
              <div className={styles.detailCard}>
                <h4 className={styles.detailCardTitle}><FiClock size={15} /> Arrangement</h4>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Frequency</span>
                  <span>{formatFrequency(selectedRecurringOrder.frequency)}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Order</span>
                  <span>{getDayDate(getRecurringOrderDate(selectedRecurringOrder), selectedRecurringOrder.order_day)}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Delivery</span>
                  <span>{getDayDate(getRecurringDeliveryDate(selectedRecurringOrder), selectedRecurringOrder.delivery_day)}</span>
                </div>
              </div>
              <div className={styles.detailCard}>
                <h4 className={styles.detailCardTitle}><FiFileText size={15} /> Producer Value</h4>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Subtotal</span>
                  <span><strong>£{selectedRecurringOrder.total_cost.toFixed(2)}</strong></span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Commission</span>
                  <span>£{selectedRecurringOrder.commission.toFixed(2)}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Payout</span>
                  <span><strong>£{selectedRecurringOrder.payout_amount.toFixed(2)}</strong></span>
                </div>
              </div>
            </div>

            <div className={styles.modalItemsSection}>
              <h4 className={styles.detailCardTitle}><FiPackage size={15} /> Producer Items</h4>
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
                  {(selectedRecurringOrder.items ?? []).map(item => (
                    <tr key={item.id}>
                      <td>{item.product_name}</td>
                      <td className={styles.centredCell}>{item.quantity}</td>
                      <td>£{item.price.toFixed(2)}</td>
                      <td><strong>£{item.line_total.toFixed(2)}</strong></td>
                    </tr>
                  ))}
                  <tr className={styles.totalRow}>
                    <td colSpan={3}><strong>Subtotal</strong></td>
                    <td><strong>£{selectedRecurringOrder.total_cost.toFixed(2)}</strong></td>
                  </tr>
                </tbody>
              </table>
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
