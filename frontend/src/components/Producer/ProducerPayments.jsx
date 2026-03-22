import { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import { FiDownload, FiChevronDown, FiChevronRight } from 'react-icons/fi';
import shared from '../../pages/Producer/ProducerShared.module.css';
import local from './ProducerPayments.module.css';
const styles = { ...shared, ...local };
import { downloadCSV, generatePaymentReportPDF } from '../../utils/exportHelpers';
import leafLogo from '../../assets/leaf.png';

/* ── Helpers ── */
function inferPaymentStatus(orderStatus) {
  if (['delivered', 'completed'].includes(orderStatus)) return 'processed';
  if (['cancelled', 'rejected'].includes(orderStatus))  return 'cancelled';
  return 'pending_transfer';
}

function paymentStatusLabel(status) {
  if (status === 'processed') return 'Processed';
  if (status === 'pending_transfer') return 'Pending Bank Transfer';
  if (status === 'cancelled') return 'Cancelled';
  return status;
}

const PAYOUT_STATUS_CLASS = {
  processed:        styles.badgeGreen,
  pending_transfer: styles.badgeWarning,
  cancelled:        styles.badgeGrey,
};

const FILTER_OPTIONS = ['all', 'processed', 'pending_transfer', 'cancelled'];
const FILTER_LABELS = {
  all: 'All',
  processed: 'Processed',
  pending_transfer: 'Pending Transfer',
  cancelled: 'Cancelled',
};

/** Anonymise customer name: "John Smith" → "John S." */
function anonymiseName(fullName) {
  if (!fullName) return 'Customer';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

function getWeekStart(dateStr) {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(d);
  mon.setDate(diff);
  mon.setHours(0, 0, 0, 0);
  return mon;
}

function formatWeekLabel(weekStart) {
  const sun = new Date(weekStart);
  sun.setDate(sun.getDate() + 6);
  const fmt = d => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${fmt(weekStart)} — ${fmt(sun)}`;
}

function getTaxYearStart(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const apr6 = new Date(year, 3, 6);
  if (d >= apr6) return apr6;
  return new Date(year - 1, 3, 6);
}

function formatTaxYearLabel(taxYearStart) {
  const startYear = taxYearStart.getFullYear();
  return `${startYear}/${startYear + 1}`;
}

function buildWeeklyReport(orders) {
  const groups = {};
  orders.forEach(o => {
    const ws = getWeekStart(o.created_at);
    const key = ws.toISOString().slice(0, 10);
    if (!groups[key]) groups[key] = { weekStart: ws, gross: 0, commission: 0, net: 0, count: 0, processed: 0, pending_transfer: 0, cancelled: 0 };
    const ps = inferPaymentStatus(o.status);
    groups[key].gross      += o.subtotal;
    groups[key].commission += o.commission;
    groups[key].net        += o.payout_amount;
    groups[key].count      += 1;
    groups[key][ps]        += 1;
  });

  return Object.entries(groups)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, v]) => ({
      key,
      label: formatWeekLabel(v.weekStart),
      ...v,
      effectiveRate: v.gross > 0 ? ((v.commission / v.gross) * 100).toFixed(1) : '0.0',
    }));
}

function buildDailyReport(rows) {
  const groups = {};
  rows.forEach(r => {
    const key = new Date(r.date).toISOString().slice(0, 10);
    if (!groups[key]) groups[key] = { gross: 0, commission: 0, net: 0, count: 0, processed: 0, pending_transfer: 0, cancelled: 0 };
    groups[key].gross      += r.subtotal;
    groups[key].commission += r.commission;
    groups[key].net        += r.payout;
    groups[key].count      += 1;
    groups[key][r.paymentStatus] = (groups[key][r.paymentStatus] ?? 0) + 1;
  });

  return Object.entries(groups)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, v]) => ({
      key,
      label: new Date(key).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }),
      ...v,
      effectiveRate: v.gross > 0 ? ((v.commission / v.gross) * 100).toFixed(1) : '0.0',
    }));
}

function getRowsForWeek(rows, weekKey) {
  const monday = new Date(weekKey);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return rows.filter(r => {
    const d = new Date(r.date);
    return d >= monday && d <= sunday;
  });
}

/* ── Component ── */
export default function ProducerPayments({ producerId, producerName }) {
  const [orders, setOrders]           = useState([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [filter, setFilter]           = useState('all');
  const [activeTab, setActiveTab]     = useState('transactions');
  const [expandedRows, setExpandedRows] = useState(new Set());
  const tabBarRef = useRef(null);
  const tabRefs = useRef({});
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  const [dlDropdown, setDlDropdown] = useState(null);
  const dlDropdownRef = useRef(null);

  useLayoutEffect(() => {
    const btn = tabRefs.current[activeTab];
    const bar = tabBarRef.current;
    if (btn && bar) {
      const barRect = bar.getBoundingClientRect();
      const btnRect = btn.getBoundingClientRect();
      setIndicator({ left: btnRect.left - barRect.left, width: btnRect.width });
    }
  }, [activeTab]);

  useEffect(() => {
    if (!dlDropdown) return;
    function onClickOutside(e) {
      if (dlDropdownRef.current && !dlDropdownRef.current.contains(e.target)) {
        setDlDropdown(null);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [dlDropdown]);

  useEffect(() => {
    if (!producerId) { setOrders([]); return; }
    let cancelled = false;
    setLoading(true);
    setError('');

    (async () => {
      try {
        const ordersRes = await fetch(
          `/api/producer-orders/?producer=${producerId}`,
          { credentials: 'include' },
        );
        if (!ordersRes.ok) throw new Error('Failed to load orders');
        const ordersData = await ordersRes.json();
        if (cancelled) return;

        setOrders(
          (ordersData.results ?? ordersData).map(o => ({
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

  const weeklyReport = useMemo(() => buildWeeklyReport(orders), [orders]);

  const rows = useMemo(() =>
    [...orders]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .map(o => ({
        id:             o.id,
        orderId:        o.order,
        date:           o.created_at,
        subtotal:       o.subtotal,
        commission:     o.commission,
        payout:         o.payout_amount,
        orderStatus:    o.status,
        paymentStatus:  inferPaymentStatus(o.status),
        deliveryDate:   o.delivery_date,
        customerName:   o.customer_name || '',
        items:          o.items || [],
        stripeRef:      o.stripe_ref || '',
      })),
    [orders]
  );

  const filteredRows = filter === 'all' ? rows : rows.filter(r => r.paymentStatus === filter);

  // Summary stats (completed orders only)
  const completed       = orders.filter(o => ['delivered', 'completed'].includes(o.status));
  const totalGross      = completed.reduce((s, o) => s + o.subtotal, 0);
  const totalCommission = completed.reduce((s, o) => s + o.commission, 0);
  const totalNet        = completed.reduce((s, o) => s + o.payout_amount, 0);
  const pendingAmount   = orders.filter(o => ['pending','accepted','preparing','ready'].includes(o.status)).reduce((s, o) => s + o.payout_amount, 0);
  const overallRate     = totalGross > 0 ? ((totalCommission / totalGross) * 100).toFixed(1) : '0.0';

  const summaryStats = { totalGross, totalCommission, totalNet, pendingAmount };

  // Tax year running total
  const taxYearTotals = useMemo(() => {
    const now = new Date();
    const taxStart = getTaxYearStart(now);
    const taxLabel = formatTaxYearLabel(taxStart);

    const taxOrders = orders.filter(o => {
      const d = new Date(o.created_at);
      return d >= taxStart && ['delivered', 'completed'].includes(o.status);
    });

    return {
      label: taxLabel,
      gross: taxOrders.reduce((s, o) => s + o.subtotal, 0),
      commission: taxOrders.reduce((s, o) => s + o.commission, 0),
      net: taxOrders.reduce((s, o) => s + o.payout_amount, 0),
      orderCount: taxOrders.length,
    };
  }, [orders]);

  // All-time totals
  const allTimeTotals = useMemo(() => ({
    count: orders.length,
    gross: weeklyReport.reduce((s, r) => s + r.gross, 0),
    commission: weeklyReport.reduce((s, r) => s + r.commission, 0),
    net: weeklyReport.reduce((s, r) => s + r.net, 0),
    rate: overallRate,
    processed: weeklyReport.reduce((s, r) => s + r.processed, 0),
    pending_transfer: weeklyReport.reduce((s, r) => s + r.pending_transfer, 0),
    cancelled: weeklyReport.reduce((s, r) => s + r.cancelled, 0),
  }), [orders, weeklyReport, overallRate]);

  /* ── Row expand toggle ── */
  function toggleRow(id) {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /* ── Export handlers ── */
  function handleWeekCSV(weekKey) {
    setDlDropdown(null);
    const safeName = producerName.replace(/\s+/g, '-').toLowerCase();
    const weekRows = getRowsForWeek(rows, weekKey);

    // Individual order rows (matches PDF order breakdown)
    const orderCsvRows = weekRows.map(r => [
      `#${r.orderId}`,
      r.stripeRef || '',
      new Date(r.date).toLocaleDateString('en-GB'),
      anonymiseName(r.customerName),
      (r.items || []).map(it => `${it.quantity}x ${it.product_name}`).join('; ') || '',
      r.subtotal.toFixed(2),
      r.commission.toFixed(2),
      r.payout.toFixed(2),
      paymentStatusLabel(r.paymentStatus),
    ]);
    orderCsvRows.push([
      `${weekRows.length} orders`, 'TOTAL', '', '', '',
      weekRows.reduce((s, r) => s + r.subtotal, 0).toFixed(2),
      weekRows.reduce((s, r) => s + r.commission, 0).toFixed(2),
      weekRows.reduce((s, r) => s + r.payout, 0).toFixed(2),
      '',
    ]);

    // Daily settlement summary
    const dailyReport = buildDailyReport(weekRows);
    orderCsvRows.push([]);
    orderCsvRows.push(['Daily Settlement Summary']);
    orderCsvRows.push(['Day', 'Orders', 'Gross (GBP)', 'Commission (GBP)', 'Rate (%)', 'Net (GBP)', 'Processed', 'Pending', 'Cancelled']);
    dailyReport.forEach(r => {
      orderCsvRows.push([
        r.label, r.count, r.gross.toFixed(2), r.commission.toFixed(2),
        r.effectiveRate, r.net.toFixed(2), r.processed, r.pending_transfer, r.cancelled,
      ]);
    });
    orderCsvRows.push([
      'Week Total', weekRows.length,
      weekRows.reduce((s, r) => s + r.subtotal, 0).toFixed(2),
      weekRows.reduce((s, r) => s + r.commission, 0).toFixed(2),
      '',
      weekRows.reduce((s, r) => s + r.payout, 0).toFixed(2),
      weekRows.filter(r => r.paymentStatus === 'processed').length,
      weekRows.filter(r => r.paymentStatus === 'pending_transfer').length,
      weekRows.filter(r => r.paymentStatus === 'cancelled').length,
    ]);

    downloadCSV(
      `finance-report-${weekKey}-${safeName}.csv`,
      ['Order #', 'Stripe Ref', 'Date', 'Customer', 'Items Sold', 'Gross (GBP)', 'Commission (GBP)', 'Net Payout (GBP)', 'Status'],
      orderCsvRows,
    );
  }

  async function handleWeekPDF(weekKey) {
    setDlDropdown(null);
    try {
      const weekRows = getRowsForWeek(rows, weekKey);
      const dailyReport = buildDailyReport(weekRows);
      const weekTotal = {
        count: weekRows.length,
        gross: weekRows.reduce((s, r) => s + r.subtotal, 0),
        commission: weekRows.reduce((s, r) => s + r.commission, 0),
        net: weekRows.reduce((s, r) => s + r.payout, 0),
        processed: weekRows.filter(r => r.paymentStatus === 'processed').length,
        pending_transfer: weekRows.filter(r => r.paymentStatus === 'pending_transfer').length,
        cancelled: weekRows.filter(r => r.paymentStatus === 'cancelled').length,
      };
      weekTotal.rate = weekTotal.gross > 0
        ? ((weekTotal.commission / weekTotal.gross) * 100).toFixed(1) : '0.0';

      const scopedStats = {
        totalGross: weekTotal.gross,
        totalCommission: weekTotal.commission,
        totalNet: weekTotal.net,
        pendingAmount: weekRows.filter(r => r.paymentStatus === 'pending_transfer').reduce((s, r) => s + r.payout, 0),
      };

      const week = weeklyReport.find(w => w.key === weekKey);
      await generatePaymentReportPDF({
        producerName,
        weekRows,
        weeklyReport: dailyReport,
        weekTotal,
        allTimeTotals,
        taxYearTotals,
        summaryStats: scopedStats,
        logoUrl: leafLogo,
        title: `Payment Report — ${week?.label ?? 'Week of ' + weekKey}`,
      });
    } catch (err) {
      console.error('PDF export failed:', err);
    }
  }

  function handleAllTimeCSV() {
    setDlDropdown(null);
    const safeName = producerName.replace(/\s+/g, '-').toLowerCase();

    // Individual order rows (matches PDF order breakdown)
    const csvRows = rows.map(r => [
      `#${r.orderId}`,
      r.stripeRef || '',
      new Date(r.date).toLocaleDateString('en-GB'),
      anonymiseName(r.customerName),
      (r.items || []).map(it => `${it.quantity}x ${it.product_name}`).join('; ') || '',
      r.subtotal.toFixed(2),
      r.commission.toFixed(2),
      r.payout.toFixed(2),
      paymentStatusLabel(r.paymentStatus),
    ]);
    csvRows.push([
      `${rows.length} orders`, 'TOTAL', '', '', '',
      rows.reduce((s, r) => s + r.subtotal, 0).toFixed(2),
      rows.reduce((s, r) => s + r.commission, 0).toFixed(2),
      rows.reduce((s, r) => s + r.payout, 0).toFixed(2),
      '',
    ]);

    // Weekly settlement summary
    csvRows.push([]);
    csvRows.push(['Weekly Settlement Summary']);
    csvRows.push(['Period', 'Orders', 'Gross (GBP)', 'Commission (GBP)', 'Rate (%)', 'Net (GBP)', 'Processed', 'Pending', 'Cancelled']);
    weeklyReport.forEach(r => {
      csvRows.push([
        r.label, r.count, r.gross.toFixed(2), r.commission.toFixed(2),
        r.effectiveRate, r.net.toFixed(2), r.processed, r.pending_transfer, r.cancelled,
      ]);
    });
    csvRows.push([
      'All Time', allTimeTotals.count,
      allTimeTotals.gross.toFixed(2), allTimeTotals.commission.toFixed(2),
      allTimeTotals.rate, allTimeTotals.net.toFixed(2),
      allTimeTotals.processed, allTimeTotals.pending_transfer, allTimeTotals.cancelled,
    ]);

    downloadCSV(
      `finance-report-all-time-${safeName}.csv`,
      ['Order #', 'Stripe Ref', 'Date', 'Customer', 'Items Sold', 'Gross (GBP)', 'Commission (GBP)', 'Net Payout (GBP)', 'Status'],
      csvRows,
    );
  }

  async function handleAllTimePDF() {
    setDlDropdown(null);
    try {
      await generatePaymentReportPDF({
        producerName,
        weekRows: rows,
        weeklyReport,
        allTimeTotals,
        taxYearTotals,
        summaryStats,
        logoUrl: leafLogo,
        title: 'Payment Report — All Time',
      });
    } catch (err) {
      console.error('PDF export failed:', err);
    }
  }

  /* ── Loading / error guards ── */
  if (!producerId) {
    return (
      <div className={styles.centred}>
        <p>Choose a producer above to view payments.</p>
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

  /* ── Number of main table columns (for colSpan) ── */
  const TX_COLS = 7;

  return (
    <section className={styles.section}>

      {/* Header */}
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>Payments &amp; Finance</h2>
          <p className={styles.subtitle}>Your earnings, commission breakdown, and payment reports</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Net Revenue</p>
          <p className={`${styles.statValue} ${styles.statAccent}`}>£{totalNet.toFixed(2)}</p>
          <p className={styles.statSub}>After {overallRate}% commission</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Gross Sales</p>
          <p className={styles.statValue}>£{totalGross.toFixed(2)}</p>
          <p className={styles.statSub}>Before commission</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Commission</p>
          <p className={styles.statValue}>£{totalCommission.toFixed(2)}</p>
          <p className={styles.statSub}>5% platform fee</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Pending</p>
          <p className={styles.statValue}>£{pendingAmount.toFixed(2)}</p>
          <p className={styles.statSub}>Awaiting transfer</p>
        </div>
      </div>

      {/* Tax year running total */}
      <div className={styles.taxYearBanner}>
        <div className={styles.taxYearHeader}>
          <h3 className={styles.taxYearTitle}>Tax Year {taxYearTotals.label} — Running Total</h3>
          <span className={`${styles.badge} ${styles.badgeBlue}`}>{taxYearTotals.orderCount} orders</span>
        </div>
        <div className={styles.taxYearGrid}>
          <div className={styles.taxYearStat}>
            <span className={styles.taxYearLabel}>Gross Income</span>
            <span className={styles.taxYearValue}>£{taxYearTotals.gross.toFixed(2)}</span>
          </div>
          <div className={styles.taxYearStat}>
            <span className={styles.taxYearLabel}>Commission</span>
            <span className={styles.taxYearValue}>£{taxYearTotals.commission.toFixed(2)}</span>
          </div>
          <div className={styles.taxYearStat}>
            <span className={styles.taxYearLabel}>Net Earnings</span>
            <span className={`${styles.taxYearValue} ${styles.taxYearValueAccent}`}>£{taxYearTotals.net.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Tab switcher */}
      <div className={styles.tabBar} ref={tabBarRef}>
        <button
          ref={el => (tabRefs.current['transactions'] = el)}
          className={`${styles.tabBtn} ${activeTab === 'transactions' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('transactions')}
        >
          Transactions
        </button>
        <button
          ref={el => (tabRefs.current['finance-report'] = el)}
          className={`${styles.tabBtn} ${activeTab === 'finance-report' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('finance-report')}
        >
          Finance Report
        </button>
        <span
          className={styles.tabIndicator}
          style={{ left: indicator.left, width: indicator.width }}
        />
      </div>

      {/* ═══ TAB: Transactions ═══ */}
      {activeTab === 'transactions' && (
        <>
          <div className={styles.filterRow}>
            <div className={styles.filterTabs}>
              {FILTER_OPTIONS.map(f => (
                <button
                  key={f}
                  className={`${styles.filterTab} ${filter === f ? styles.filterTabActive : ''}`}
                  onClick={() => setFilter(f)}
                >
                  {FILTER_LABELS[f]}
                  <span className={styles.filterTabCount}>
                    {f === 'all' ? rows.length : rows.filter(r => r.paymentStatus === f).length}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {filteredRows.length === 0 ? (
            <div className={styles.empty}>
              <p>No {filter !== 'all' ? FILTER_LABELS[filter].toLowerCase() : ''} transactions found.</p>
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th></th>
                    <th>Order</th>
                    <th>Date</th>
                    <th>Gross</th>
                    <th>Commission</th>
                    <th>Net Payout</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map(row => (
                    <>
                      <tr key={row.id} className={expandedRows.has(row.id) ? styles.expandedParent : ''}>
                        <td className={styles.expandCell}>
                          {row.items.length > 0 && (
                            <button
                              className={styles.expandBtn}
                              onClick={() => toggleRow(row.id)}
                              title="View order details"
                            >
                              {expandedRows.has(row.id) ? <FiChevronDown size={16} /> : <FiChevronRight size={16} />}
                            </button>
                          )}
                        </td>
                        <td>
                          <span className={styles.muted}>#{row.orderId}</span>
                          {row.stripeRef && (
                            <span className={styles.txRef} title={row.stripeRef}>
                              {row.stripeRef.length > 20 ? row.stripeRef.slice(0, 20) + '…' : row.stripeRef}
                            </span>
                          )}
                        </td>
                        <td className={styles.dateCell}>
                          {new Date(row.date).toLocaleDateString('en-GB')}
                        </td>
                        <td>£{row.subtotal.toFixed(2)}</td>
                        <td>
                          <span className={styles.commissionCell}>
                            £{row.commission.toFixed(2)}
                          </span>
                        </td>
                        <td><strong>£{row.payout.toFixed(2)}</strong></td>
                        <td>
                          <span className={`${styles.badge} ${PAYOUT_STATUS_CLASS[row.paymentStatus] ?? styles.badgeGrey}`}>
                            {paymentStatusLabel(row.paymentStatus)}
                          </span>
                        </td>
                      </tr>
                      {/* Expanded: order items + customer + Stripe ref */}
                      {expandedRows.has(row.id) && row.items.length > 0 && (
                        <tr key={`${row.id}-items`} className={styles.itemsRow}>
                          <td colSpan={TX_COLS}>
                            <div className={styles.itemsBreakdown}>
                              <div className={styles.itemsMeta}>
                                <span><strong>Customer:</strong> {anonymiseName(row.customerName)}</span>
                                <span><strong>Delivery:</strong> {row.deliveryDate ? new Date(row.deliveryDate).toLocaleDateString('en-GB') : 'Not set'}</span>
                                {row.stripeRef && <span><strong>Stripe Ref:</strong> {row.stripeRef}</span>}
                              </div>
                              <table className={styles.itemsTable}>
                                <thead>
                                  <tr>
                                    <th>Product</th>
                                    <th>Qty</th>
                                    <th>Unit Price</th>
                                    <th>Line Total</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {row.items.map(item => (
                                    <tr key={item.id}>
                                      <td>{item.product_name}</td>
                                      <td className={styles.centredCell}>{item.quantity}</td>
                                      <td>£{parseFloat(item.price_snapshot).toFixed(2)}</td>
                                      <td>£{parseFloat(item.line_total).toFixed(2)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              <div className={styles.itemsSummary}>
                                <span>Subtotal: <strong>£{row.subtotal.toFixed(2)}</strong></span>
                                <span>Commission (5%): <strong>−£{row.commission.toFixed(2)}</strong></span>
                                <span>Producer Payment: <strong className={styles.statAccent}>£{row.payout.toFixed(2)}</strong></span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
                <tfoot>
                  <tr className={styles.tableFoot}>
                    <td colSpan={3}><strong>Totals ({filteredRows.length} orders)</strong></td>
                    <td><strong>£{filteredRows.reduce((s, r) => s + r.subtotal, 0).toFixed(2)}</strong></td>
                    <td><strong>£{filteredRows.reduce((s, r) => s + r.commission, 0).toFixed(2)}</strong></td>
                    <td><strong>£{filteredRows.reduce((s, r) => s + r.payout, 0).toFixed(2)}</strong></td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </>
      )}

      {/* ═══ TAB: Finance Report ═══ */}
      {activeTab === 'finance-report' && (
        <>
          <div className={styles.filterRow}>
            <div>
              <div className={styles.headingWithInfo}>
                <h3 className={styles.subheading} style={{ margin: 0 }}>Weekly Settlement Report</h3>
                <span className={styles.infoHint}>
                  <span className={styles.infoHintIcon} aria-hidden="true">i</span>
                  <span className={styles.infoTooltip} role="tooltip">
                    Settlements are processed weekly (Monday – Sunday). The 5% network commission is deducted from each order and the remaining 95% is your producer payment.
                  </span>
                </span>
              </div>
              <p className={styles.subtitle} style={{ margin: 0 }}>
                5% network commission deducted, 95% producer payment — settled weekly
              </p>
            </div>
          </div>

          {weeklyReport.length === 0 ? (
            <div className={styles.empty}>
              <p>No financial data to report yet.</p>
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Orders</th>
                    <th>Gross</th>
                    <th>Commission</th>
                    <th>Net Payout</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {weeklyReport.map(row => (
                    <tr key={row.key}>
                      <td><strong>{row.label}</strong></td>
                      <td className={styles.centredCell}>{row.count}</td>
                      <td>£{row.gross.toFixed(2)}</td>
                      <td>£{row.commission.toFixed(2)}</td>
                      <td><strong>£{row.net.toFixed(2)}</strong></td>
                      <td>
                        <span className={styles.statusCounts}>
                          {row.processed > 0 && <span className={`${styles.badge} ${styles.badgeGreen}`}>{row.processed} processed</span>}
                          {row.pending_transfer > 0 && <span className={`${styles.badge} ${styles.badgeWarning}`}>{row.pending_transfer} pending</span>}
                          {row.cancelled > 0 && <span className={`${styles.badge} ${styles.badgeGrey}`}>{row.cancelled} cancelled</span>}
                          {row.processed === 0 && row.pending_transfer === 0 && row.cancelled === 0 && <span className={styles.muted}>—</span>}
                        </span>
                      </td>
                      <td className={styles.centredCell}>
                        <div className={styles.dlWrap} ref={dlDropdown === row.key ? dlDropdownRef : null}>
                          <button
                            className={styles.dlIconBtn}
                            onClick={() => setDlDropdown(dlDropdown === row.key ? null : row.key)}
                            title="Download report"
                          >
                            <FiDownload size={16} />
                          </button>
                          {dlDropdown === row.key && (
                            <div className={styles.dlDropdown}>
                              <button className={styles.dlDropdownItem} onClick={() => handleWeekCSV(row.key)}>Download CSV</button>
                              <button className={styles.dlDropdownItem} onClick={() => handleWeekPDF(row.key)}>Download PDF</button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className={styles.tableFoot}>
                    <td><strong>All Time</strong></td>
                    <td className={styles.centredCell}><strong>{allTimeTotals.count}</strong></td>
                    <td><strong>£{allTimeTotals.gross.toFixed(2)}</strong></td>
                    <td><strong>£{allTimeTotals.commission.toFixed(2)}</strong></td>
                    <td><strong>£{allTimeTotals.net.toFixed(2)}</strong></td>
                    <td>
                      <span className={styles.statusCounts}>
                        {allTimeTotals.processed > 0 && <span className={`${styles.badge} ${styles.badgeGreen}`}>{allTimeTotals.processed}</span>}
                        {allTimeTotals.pending_transfer > 0 && <span className={`${styles.badge} ${styles.badgeWarning}`}>{allTimeTotals.pending_transfer}</span>}
                        {allTimeTotals.cancelled > 0 && <span className={`${styles.badge} ${styles.badgeGrey}`}>{allTimeTotals.cancelled}</span>}
                      </span>
                    </td>
                    <td className={styles.centredCell}>
                      <div className={styles.dlWrap} ref={dlDropdown === 'alltime' ? dlDropdownRef : null}>
                        <button
                          className={styles.dlIconBtn}
                          onClick={() => setDlDropdown(dlDropdown === 'alltime' ? null : 'alltime')}
                          title="Download all-time report"
                        >
                          <FiDownload size={16} />
                        </button>
                        {dlDropdown === 'alltime' && (
                          <div className={styles.dlDropdown}>
                            <button className={styles.dlDropdownItem} onClick={handleAllTimeCSV}>Download CSV</button>
                            <button className={styles.dlDropdownItem} onClick={handleAllTimePDF}>Download PDF</button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </>
      )}

    </section>
  );
}
