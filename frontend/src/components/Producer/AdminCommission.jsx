import { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import { FiDownload, FiChevronDown, FiChevronRight } from 'react-icons/fi';
import shared from '../../pages/Producer/ProducerShared.module.css';
import local from '../Producer/ProducerPayments.module.css';
const styles = { ...shared, ...local };
import { downloadCSV, generatePaymentReportPDF } from '../../utils/exportHelpers';
import leafLogo from '../../assets/leaf.png';
import apiClient from '../../utils/apiClient';

const COMMISSION_RATE = 0.05;

/* ── Helpers ── */
function inferPaymentStatus(orderStatus) {
  if (['delivered', 'completed'].includes(orderStatus)) return 'processed';
  if (['cancelled', 'rejected'].includes(orderStatus))  return 'cancelled';
  return 'pending_transfer';
}

function paymentStatusLabel(status) {
  if (status === 'processed') return 'Processed';
  if (status === 'pending_transfer') return 'Pending';
  if (status === 'cancelled') return 'Cancelled';
  return status;
}

const PAYOUT_STATUS_CLASS = {
  processed:        styles.badgeGreen,
  pending_transfer: styles.badgeWarning,
  cancelled:        styles.badgeGrey,
};

function anonymiseName(fullName) {
  if (!fullName) return 'Customer';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
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


/* ── Weekly settlement helpers ── */
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

function buildWeeklyReport(rows) {
  const groups = {};
  rows.forEach(r => {
    const ws = getWeekStart(r.date);
    const key = ws.toISOString().slice(0, 10);
    if (!groups[key]) groups[key] = { weekStart: ws, gross: 0, commission: 0, net: 0, count: 0, processed: 0, pending_transfer: 0, cancelled: 0 };
    groups[key].gross      += r.subtotal;
    groups[key].commission += r.commission;
    groups[key].net        += r.payout;
    groups[key].count      += 1;
    groups[key][r.paymentStatus] += 1;
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

/* Group orders by parent order ID to show multi-vendor breakdowns */
function groupByParentOrder(rows) {
  const groups = {};
  rows.forEach(r => {
    const oid = r.orderId;
    if (!groups[oid]) groups[oid] = [];
    groups[oid].push(r);
  });
  return groups;
}

/* ── Date range presets ── */
function getDateRange(preset) {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  switch (preset) {
    case '1week': {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      return { start, end, label: 'This Week' };
    }
    case '2weeks': {
      const start = new Date(now);
      start.setDate(start.getDate() - 14);
      start.setHours(0, 0, 0, 0);
      return { start, end, label: 'Previous 2 Weeks' };
    }
    case '1month': {
      const start = new Date(now);
      start.setMonth(start.getMonth() - 1);
      start.setHours(0, 0, 0, 0);
      return { start, end, label: 'Previous Month' };
    }
    case '3months': {
      const start = new Date(now);
      start.setMonth(start.getMonth() - 3);
      start.setHours(0, 0, 0, 0);
      return { start, end, label: 'Previous 3 Months' };
    }
    case 'taxyear': {
      const start = getTaxYearStart(now);
      return { start, end, label: `Tax Year ${formatTaxYearLabel(start)}` };
    }
    case 'all':
    default:
      return { start: null, end: null, label: 'All Time' };
  }
}

/* ── Component ── */
export default function AdminCommission() {
  const [allOrders, setAllOrders] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [datePreset, setDatePreset] = useState('1week');
  const [activeTab, setActiveTab]   = useState('orders');
  const [expandedRows, setExpandedRows] = useState(new Set());
  const tabBarRef = useRef(null);
  const tabRefs   = useRef({});
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

  /* Fetch ALL producer orders (admin sees everything) */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    (async () => {
      try {
        const { data } = await apiClient.get('/producer-orders/');
        if (cancelled) return;
        setAllOrders(
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
  }, []);

  /* Filter by date range */
  const dateRange = useMemo(() => getDateRange(datePreset), [datePreset]);

  const filteredOrders = useMemo(() => {
    if (!dateRange.start) return allOrders;
    return allOrders.filter(o => {
      const d = new Date(o.created_at);
      return d >= dateRange.start && d <= dateRange.end;
    });
  }, [allOrders, dateRange]);

  /* Build rows */
  const rows = useMemo(() =>
    [...filteredOrders]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .map(o => ({
        id:             o.id,
        orderId:        o.order,
        producerId:     o.producer,
        producerName:   o.producer_name || `Producer #${o.producer}`,
        date:           o.created_at,
        subtotal:       o.subtotal,
        commission:     o.commission,
        payout:         o.payout_amount,
        orderStatus:    o.status,
        paymentStatus:  inferPaymentStatus(o.status),
        customerName:   o.customer_name || '',
        items:          o.items || [],
        stripeRef:      o.stripe_ref || '',
      })),
    [filteredOrders]
  );

  /* Summary stats */
  const stats = useMemo(() => {
    const completed = rows.filter(r => r.paymentStatus === 'processed');
    const totalOrderValue = completed.reduce((s, r) => s + r.subtotal, 0);
    const totalCommission = completed.reduce((s, r) => s + r.commission, 0);
    const totalProducerPayments = completed.reduce((s, r) => s + r.payout, 0);
    const pendingValue = rows.filter(r => r.paymentStatus === 'pending_transfer').reduce((s, r) => s + r.subtotal, 0);
    return {
      totalOrderValue,
      totalCommission,
      totalProducerPayments,
      pendingValue,
      orderCount: rows.length,
      processedCount: completed.length,
    };
  }, [rows]);

  /* Weekly settlement report */
  const weeklyReport = useMemo(() => buildWeeklyReport(rows), [rows]);

  const allTimeTotals = useMemo(() => ({
    count: rows.length,
    gross: weeklyReport.reduce((s, r) => s + r.gross, 0),
    commission: weeklyReport.reduce((s, r) => s + r.commission, 0),
    net: weeklyReport.reduce((s, r) => s + r.net, 0),
    rate: stats.totalOrderValue > 0 ? ((stats.totalCommission / stats.totalOrderValue) * 100).toFixed(1) : '0.0',
    processed: weeklyReport.reduce((s, r) => s + r.processed, 0),
    pending_transfer: weeklyReport.reduce((s, r) => s + r.pending_transfer, 0),
    cancelled: weeklyReport.reduce((s, r) => s + r.cancelled, 0),
  }), [rows, weeklyReport, stats]);

  /* Tax year YTD totals */
  const taxYearTotals = useMemo(() => {
    const now = new Date();
    const taxStart = getTaxYearStart(now);
    const taxLabel = formatTaxYearLabel(taxStart);
    const taxOrders = allOrders.filter(o => {
      const d = new Date(o.created_at);
      return d >= taxStart && ['delivered', 'completed'].includes(o.status);
    });
    return {
      label: taxLabel,
      gross: taxOrders.reduce((s, o) => s + o.subtotal, 0),
      commission: taxOrders.reduce((s, o) => s + o.commission, 0),
      producerPay: taxOrders.reduce((s, o) => s + o.payout_amount, 0),
      orderCount: taxOrders.length,
    };
  }, [allOrders]);

  /* Multi-vendor grouping for expanded view */
  const parentGroups = useMemo(() => groupByParentOrder(rows), [rows]);

  /* Row expand */
  function toggleRow(id) {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /* ── Per-week CSV ── */
  function handleWeekCSV(weekKey) {
    setDlDropdown(null);
    const weekRows = getRowsForWeek(rows, weekKey);
    const csvRows = weekRows.map(r => [
      `#${r.orderId}`, r.producerName,
      new Date(r.date).toLocaleDateString('en-GB'), anonymiseName(r.customerName),
      (r.items || []).map(it => `${it.quantity}x ${it.product_name}`).join('; ') || '',
      r.subtotal.toFixed(2), r.commission.toFixed(2), r.payout.toFixed(2),
      paymentStatusLabel(r.paymentStatus),
    ]);
    csvRows.push([
      `${weekRows.length} orders`, '', 'TOTAL', '', '',
      weekRows.reduce((s, r) => s + r.subtotal, 0).toFixed(2),
      weekRows.reduce((s, r) => s + r.commission, 0).toFixed(2),
      weekRows.reduce((s, r) => s + r.payout, 0).toFixed(2), '',
    ]);

    const dailyReport = buildDailyReport(weekRows);
    csvRows.push([]);
    csvRows.push(['Daily Settlement Summary']);
    csvRows.push(['Day', 'Orders', 'Gross (GBP)', 'Commission (GBP)', 'Rate (%)', 'Net (GBP)', 'Processed', 'Pending', 'Cancelled']);
    dailyReport.forEach(r => {
      csvRows.push([r.label, r.count, r.gross.toFixed(2), r.commission.toFixed(2), r.effectiveRate, r.net.toFixed(2), r.processed, r.pending_transfer, r.cancelled]);
    });

    downloadCSV(
      `commission-report-${weekKey}.csv`,
      ['Order #', 'Producer', 'Date', 'Customer', 'Items', 'Order Value (GBP)', 'Commission 5% (GBP)', 'Producer Payment 95% (GBP)', 'Status'],
      csvRows,
    );
  }

  /* ── Per-week PDF ── */
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
      weekTotal.rate = weekTotal.gross > 0 ? ((weekTotal.commission / weekTotal.gross) * 100).toFixed(1) : '0.0';

      const week = weeklyReport.find(w => w.key === weekKey);
      await generatePaymentReportPDF({
        producerName: 'BRFN Network',
        weekRows, weeklyReport: dailyReport, weekTotal, allTimeTotals,
        taxYearTotals: { ...taxYearTotals, net: taxYearTotals.producerPay },
        summaryStats: {
          totalGross: weekTotal.gross, totalCommission: weekTotal.commission,
          totalNet: weekTotal.net,
          pendingAmount: weekRows.filter(r => r.paymentStatus === 'pending_transfer').reduce((s, r) => s + r.payout, 0),
        },
        logoUrl: leafLogo,
        title: `Commission Report — ${week?.label ?? 'Week of ' + weekKey}`,
      });
    } catch (err) { console.error('PDF export failed:', err); }
  }

  /* ── All-time CSV ── */
  function handleAllTimeCSV() {
    setDlDropdown(null);
    const csvRows = rows.map(r => [
      `#${r.orderId}`, r.producerName,
      new Date(r.date).toLocaleDateString('en-GB'), anonymiseName(r.customerName),
      (r.items || []).map(it => `${it.quantity}x ${it.product_name}`).join('; ') || '',
      r.subtotal.toFixed(2), r.commission.toFixed(2), r.payout.toFixed(2),
      paymentStatusLabel(r.paymentStatus),
    ]);
    csvRows.push([
      `${rows.length} orders`, '', 'TOTAL', '', '',
      rows.reduce((s, r) => s + r.subtotal, 0).toFixed(2),
      rows.reduce((s, r) => s + r.commission, 0).toFixed(2),
      rows.reduce((s, r) => s + r.payout, 0).toFixed(2), '',
    ]);

    csvRows.push([]);
    csvRows.push(['Weekly Settlement Summary']);
    csvRows.push(['Period', 'Orders', 'Gross (GBP)', 'Commission (GBP)', 'Rate (%)', 'Net (GBP)', 'Processed', 'Pending', 'Cancelled']);
    weeklyReport.forEach(r => {
      csvRows.push([r.label, r.count, r.gross.toFixed(2), r.commission.toFixed(2), r.effectiveRate, r.net.toFixed(2), r.processed, r.pending_transfer, r.cancelled]);
    });
    csvRows.push(['All Time', allTimeTotals.count, allTimeTotals.gross.toFixed(2), allTimeTotals.commission.toFixed(2), allTimeTotals.rate, allTimeTotals.net.toFixed(2), allTimeTotals.processed, allTimeTotals.pending_transfer, allTimeTotals.cancelled]);

    downloadCSV(
      `commission-report-all-time-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Order #', 'Producer', 'Date', 'Customer', 'Items', 'Order Value (GBP)', 'Commission 5% (GBP)', 'Producer Payment 95% (GBP)', 'Status'],
      csvRows,
    );
  }

  /* ── All-time PDF ── */
  async function handleAllTimePDF() {
    setDlDropdown(null);
    try {
      await generatePaymentReportPDF({
        producerName: 'BRFN Network',
        weekRows: rows, weeklyReport, allTimeTotals,
        taxYearTotals: { ...taxYearTotals, net: taxYearTotals.producerPay },
        summaryStats: {
          totalGross: stats.totalOrderValue, totalCommission: stats.totalCommission,
          totalNet: stats.totalProducerPayments, pendingAmount: stats.pendingValue,
        },
        logoUrl: leafLogo,
        title: 'Commission Report — All Time',
      });
    } catch (err) { console.error('PDF export failed:', err); }
  }

  /* ── Guards ── */
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

  const TX_COLS = 8;

  return (
    <section className={styles.section}>
      {/* Header */}
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>Network Commission</h2>
          <p className={styles.subtitle}>
            5% network commission, 95% producer payment — all orders across the network
          </p>
        </div>
      </div>

      {/* Date range selector */}
      <div className={styles.filterRow}>
        <div className={styles.filterTabs}>
          {[
            { key: '1week', label: 'This Week' },
            { key: '2weeks', label: '2 Weeks' },
            { key: '1month', label: '1 Month' },
            { key: '3months', label: '3 Months' },
            { key: 'taxyear', label: 'Tax Year' },
            { key: 'all', label: 'All Time' },
          ].map(p => (
            <button
              key={p.key}
              className={`${styles.filterTab} ${datePreset === p.key ? styles.filterTabActive : ''}`}
              onClick={() => setDatePreset(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Commission Earned (5%)</p>
          <p className={`${styles.statValue} ${styles.statAccent}`}>£{stats.totalCommission.toFixed(2)}</p>
          <p className={styles.statSub}>Network revenue</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Total Order Value</p>
          <p className={styles.statValue}>£{stats.totalOrderValue.toFixed(2)}</p>
          <p className={styles.statSub}>{stats.orderCount} orders in period</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Producer Payments (95%)</p>
          <p className={styles.statValue}>£{stats.totalProducerPayments.toFixed(2)}</p>
          <p className={styles.statSub}>{stats.processedCount} processed</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Pending Orders</p>
          <p className={styles.statValue}>£{stats.pendingValue.toFixed(2)}</p>
          <p className={styles.statSub}>Awaiting completion</p>
        </div>
      </div>

      {/* Tax year YTD */}
      <div className={styles.taxYearBanner}>
        <div className={styles.taxYearHeader}>
          <h3 className={styles.taxYearTitle}>Tax Year {taxYearTotals.label} — Year-to-Date</h3>
          <span className={`${styles.badge} ${styles.badgeBlue}`}>{taxYearTotals.orderCount} orders</span>
        </div>
        <div className={styles.taxYearGrid}>
          <div className={styles.taxYearStat}>
            <span className={styles.taxYearLabel}>Total Order Value</span>
            <span className={styles.taxYearValue}>£{taxYearTotals.gross.toFixed(2)}</span>
          </div>
          <div className={styles.taxYearStat}>
            <span className={styles.taxYearLabel}>Commission (5%)</span>
            <span className={`${styles.taxYearValue} ${styles.taxYearValueAccent}`}>£{taxYearTotals.commission.toFixed(2)}</span>
          </div>
          <div className={styles.taxYearStat}>
            <span className={styles.taxYearLabel}>Producer Payments (95%)</span>
            <span className={styles.taxYearValue}>£{taxYearTotals.producerPay.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Tab switcher */}
      <div className={styles.tabBar} ref={tabBarRef}>
        <button
          ref={el => (tabRefs.current['orders'] = el)}
          className={`${styles.tabBtn} ${activeTab === 'orders' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('orders')}
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

      {/* ═══ TAB: Order Breakdown ═══ */}
      {activeTab === 'orders' && (
        <>
          {rows.length === 0 ? (
            <div className={styles.empty}>
              <p>No orders found for this period.</p>
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th></th>
                    <th>Order</th>
                    <th>Producer</th>
                    <th>Date</th>
                    <th>Order Total</th>
                    <th>Commission (5%)</th>
                    <th>Producer Payment (95%)</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => {
                    const isMultiVendor = parentGroups[row.orderId]?.length > 1;
                    return (
                      <>
                        <tr key={row.id} className={expandedRows.has(row.id) ? styles.expandedParent : ''}>
                          <td className={styles.expandCell}>
                            {(row.items.length > 0 || isMultiVendor) && (
                              <button
                                className={styles.expandBtn}
                                onClick={() => toggleRow(row.id)}
                                title="View breakdown"
                              >
                                {expandedRows.has(row.id) ? <FiChevronDown size={16} /> : <FiChevronRight size={16} />}
                              </button>
                            )}
                          </td>
                          <td>
                            <span className={styles.muted}>#{row.orderId}</span>
                            {isMultiVendor && (
                              <span className={`${styles.badge} ${styles.badgePurple}`} style={{ marginLeft: 6, fontSize: 10 }}>
                                Multi-vendor
                              </span>
                            )}
                          </td>
                          <td><strong>{row.producerName}</strong></td>
                          <td className={styles.dateCell}>
                            {new Date(row.date).toLocaleDateString('en-GB')}
                          </td>
                          <td>£{row.subtotal.toFixed(2)}</td>
                          <td>
                            <span className={styles.commissionCell}>£{row.commission.toFixed(2)}</span>
                          </td>
                          <td><strong>£{row.payout.toFixed(2)}</strong></td>
                          <td>
                            <span className={`${styles.badge} ${PAYOUT_STATUS_CLASS[row.paymentStatus] ?? styles.badgeGrey}`}>
                              {paymentStatusLabel(row.paymentStatus)}
                            </span>
                          </td>
                        </tr>

                        {/* Expanded: items + multi-vendor breakdown */}
                        {expandedRows.has(row.id) && (
                          <tr key={`${row.id}-detail`} className={styles.itemsRow}>
                            <td colSpan={TX_COLS}>
                              <div className={styles.itemsBreakdown}>
                                <div className={styles.itemsMeta}>
                                  <span><strong>Customer:</strong> {anonymiseName(row.customerName)}</span>
                                  {row.stripeRef && <span><strong>Stripe Ref:</strong> {row.stripeRef}</span>}
                                </div>

                                {/* Item-level breakdown */}
                                {row.items.length > 0 && (
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
                                )}

                                {/* Commission calculation */}
                                <div className={styles.itemsSummary}>
                                  <span>Order Total: <strong>£{row.subtotal.toFixed(2)}</strong></span>
                                  <span>Commission (5%): <strong>£{row.commission.toFixed(2)}</strong></span>
                                  <span>Producer Payment (95%): <strong className={styles.statAccent}>£{row.payout.toFixed(2)}</strong></span>
                                </div>

                                {/* Multi-vendor: show other producers in this order */}
                                {isMultiVendor && (
                                  <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid var(--border)` }}>
                                    <strong style={{ fontSize: 13, color: 'var(--text)' }}>
                                      Full Order #{row.orderId} — All Producers
                                    </strong>
                                    <table className={styles.itemsTable} style={{ marginTop: 8 }}>
                                      <thead>
                                        <tr>
                                          <th>Producer</th>
                                          <th>Subtotal</th>
                                          <th>Commission (5%)</th>
                                          <th>Payment (95%)</th>
                                          <th>Status</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {parentGroups[row.orderId].map(pr => (
                                          <tr key={pr.id}>
                                            <td>{pr.producerName}</td>
                                            <td>£{pr.subtotal.toFixed(2)}</td>
                                            <td>£{pr.commission.toFixed(2)}</td>
                                            <td><strong>£{pr.payout.toFixed(2)}</strong></td>
                                            <td>
                                              <span className={`${styles.badge} ${PAYOUT_STATUS_CLASS[pr.paymentStatus] ?? styles.badgeGrey}`}>
                                                {paymentStatusLabel(pr.paymentStatus)}
                                              </span>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                      <tfoot>
                                        <tr style={{ fontWeight: 700 }}>
                                          <td>Order Total</td>
                                          <td>£{parentGroups[row.orderId].reduce((s, r) => s + r.subtotal, 0).toFixed(2)}</td>
                                          <td>£{parentGroups[row.orderId].reduce((s, r) => s + r.commission, 0).toFixed(2)}</td>
                                          <td>£{parentGroups[row.orderId].reduce((s, r) => s + r.payout, 0).toFixed(2)}</td>
                                          <td></td>
                                        </tr>
                                      </tfoot>
                                    </table>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className={styles.tableFoot}>
                    <td colSpan={4}><strong>Totals ({rows.length} orders)</strong></td>
                    <td><strong>£{rows.reduce((s, r) => s + r.subtotal, 0).toFixed(2)}</strong></td>
                    <td><strong>£{rows.reduce((s, r) => s + r.commission, 0).toFixed(2)}</strong></td>
                    <td><strong>£{rows.reduce((s, r) => s + r.payout, 0).toFixed(2)}</strong></td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </>
      )}

      {/* ═══ TAB: Finance Report (Weekly Settlements) ═══ */}
      {activeTab === 'finance-report' && (
        <>
          <div className={styles.filterRow}>
            <div>
              <div className={styles.headingWithInfo}>
                <h3 className={styles.subheading} style={{ margin: 0 }}>Weekly Settlement Report</h3>
                <span className={styles.infoHint}>
                  <span className={styles.infoHintIcon} aria-hidden="true">i</span>
                  <span className={styles.infoTooltip} role="tooltip">
                    Settlements are processed weekly (Monday – Sunday). The 5% network commission is deducted from each order and the remaining 95% is the producer payment.
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
                    <th>Producer Payments</th>
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
