import { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import { FiDownload } from 'react-icons/fi';
import shared from '../../pages/Producer/ProducerShared.module.css';
import local from './ProducerPayments.module.css';
const styles = { ...shared, ...local };
import { downloadCSV, generateFinanceReportPDF } from '../../utils/exportHelpers';
import leafLogo from '../../assets/leaf.png';

/* Helpers */
function inferPaymentStatus(orderStatus) {
  if (['delivered', 'completed'].includes(orderStatus)) return 'paid';
  if (['cancelled', 'rejected'].includes(orderStatus))  return 'cancelled';
  return 'pending';
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

const PAYOUT_STATUS_CLASS = {
  paid:      styles.badgeGreen,
  pending:   styles.badgeWarning,
  cancelled: styles.badgeGrey,
};

const FILTER_OPTIONS = ['all', 'paid', 'pending', 'cancelled'];

function getWeekStart(dateStr) {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
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

function buildWeeklyReport(orders) {
  const groups = {};
  orders.forEach(o => {
    const ws = getWeekStart(o.created_at);
    const key = ws.toISOString().slice(0, 10); // YYYY-MM-DD of Monday
    if (!groups[key]) groups[key] = { weekStart: ws, gross: 0, commission: 0, net: 0, count: 0, paid: 0, pending: 0, cancelled: 0 };
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
    if (!groups[key]) groups[key] = { gross: 0, commission: 0, net: 0, count: 0, paid: 0, pending: 0, cancelled: 0 };
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

/* Component */
export default function ProducerPayments({ producerId, producerName }) {
  const [orders, setOrders]       = useState([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [filter, setFilter]       = useState('all');
  const [activeTab, setActiveTab] = useState('transactions');
  const tabBarRef = useRef(null);
  const tabRefs = useRef({});
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  const [dlDropdown, setDlDropdown] = useState(null); // null | weekKey | 'alltime'
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

  // Close download dropdown on outside click
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
        commissionRate: o.subtotal > 0 ? ((o.commission / o.subtotal) * 100).toFixed(1) : '0.0',
        orderStatus:    o.status,
        paymentStatus:  inferPaymentStatus(o.status),
        deliveryDate:   o.delivery_date,
      })),
    [orders]
  );

  const filteredRows = filter === 'all' ? rows : rows.filter(r => r.paymentStatus === filter);

  // Summary stats
  const completed       = orders.filter(o => ['delivered', 'completed'].includes(o.status));
  const totalGross      = completed.reduce((s, o) => s + o.subtotal, 0);
  const totalCommission = completed.reduce((s, o) => s + o.commission, 0);
  const totalNet        = completed.reduce((s, o) => s + o.payout_amount, 0);
  const pendingAmount   = orders.filter(o => ['pending','accepted','preparing','ready'].includes(o.status)).reduce((s, o) => s + o.payout_amount, 0);
  const overallRate     = totalGross > 0 ? ((totalCommission / totalGross) * 100).toFixed(1) : '0.0';

  const summaryStats = { totalGross, totalCommission, totalNet, pendingAmount };

  // All-time totals (always full dataset)
  const allTimeTotals = useMemo(() => ({
    count: orders.length,
    gross: weeklyReport.reduce((s, r) => s + r.gross, 0),
    commission: weeklyReport.reduce((s, r) => s + r.commission, 0),
    net: weeklyReport.reduce((s, r) => s + r.net, 0),
    rate: overallRate,
    paid: weeklyReport.reduce((s, r) => s + r.paid, 0),
    pending: weeklyReport.reduce((s, r) => s + r.pending, 0),
    cancelled: weeklyReport.reduce((s, r) => s + r.cancelled, 0),
  }), [orders, weeklyReport, overallRate]);

  /* ── Export handlers ── */
  function handleWeekCSV(weekKey) {
    setDlDropdown(null);
    const safeName = producerName.replace(/\s+/g, '-').toLowerCase();
    const weekRows = getRowsForWeek(rows, weekKey);
    const dailyReport = buildDailyReport(weekRows);

    const csvRows = dailyReport.map(r => [
      r.label, r.count, r.gross.toFixed(2), r.commission.toFixed(2),
      r.effectiveRate, r.net.toFixed(2), r.paid, r.pending, r.cancelled,
    ]);
    csvRows.push([
      'Week Total', weekRows.length,
      weekRows.reduce((s, r) => s + r.subtotal, 0).toFixed(2),
      weekRows.reduce((s, r) => s + r.commission, 0).toFixed(2),
      '',
      weekRows.reduce((s, r) => s + r.payout, 0).toFixed(2),
      weekRows.filter(r => r.paymentStatus === 'paid').length,
      weekRows.filter(r => r.paymentStatus === 'pending').length,
      weekRows.filter(r => r.paymentStatus === 'cancelled').length,
    ]);

    downloadCSV(
      `finance-report-${weekKey}-${safeName}.csv`,
      ['Day', 'Orders', 'Gross Sales (GBP)', 'Commission (GBP)', 'Commission Rate (%)', 'Net Payout (GBP)', 'Paid', 'Pending', 'Cancelled'],
      csvRows,
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
        paid: weekRows.filter(r => r.paymentStatus === 'paid').length,
        pending: weekRows.filter(r => r.paymentStatus === 'pending').length,
        cancelled: weekRows.filter(r => r.paymentStatus === 'cancelled').length,
      };
      weekTotal.rate = weekTotal.gross > 0
        ? ((weekTotal.commission / weekTotal.gross) * 100).toFixed(1) : '0.0';

      const scopedStats = {
        totalGross: weekTotal.gross,
        totalCommission: weekTotal.commission,
        totalNet: weekTotal.net,
        pendingAmount: weekRows.filter(r => r.paymentStatus === 'pending').reduce((s, r) => s + r.payout, 0),
      };

      const week = weeklyReport.find(w => w.key === weekKey);
      await generateFinanceReportPDF({
        producerName,
        weeklyReport: dailyReport,
        weekTotal,
        allTimeTotals,
        summaryStats: scopedStats,
        logoUrl: leafLogo,
        title: `Finance Report — ${week?.label ?? 'Week of ' + weekKey}`,
      });
    } catch (err) {
      console.error('PDF export failed:', err);
    }
  }

  function handleAllTimeCSV() {
    setDlDropdown(null);
    const safeName = producerName.replace(/\s+/g, '-').toLowerCase();
    const csvRows = weeklyReport.map(r => [
      r.label, r.count, r.gross.toFixed(2), r.commission.toFixed(2),
      r.effectiveRate, r.net.toFixed(2), r.paid, r.pending, r.cancelled,
    ]);
    csvRows.push([
      'All Time', allTimeTotals.count,
      allTimeTotals.gross.toFixed(2), allTimeTotals.commission.toFixed(2),
      allTimeTotals.rate, allTimeTotals.net.toFixed(2),
      allTimeTotals.paid, allTimeTotals.pending, allTimeTotals.cancelled,
    ]);
    downloadCSV(
      `finance-report-all-time-${safeName}.csv`,
      ['Period', 'Orders', 'Gross Sales (GBP)', 'Commission (GBP)', 'Commission Rate (%)', 'Net Payout (GBP)', 'Paid', 'Pending', 'Cancelled'],
      csvRows,
    );
  }

  async function handleAllTimePDF() {
    setDlDropdown(null);
    try {
      await generateFinanceReportPDF({
        producerName,
        weeklyReport,
        allTimeTotals,
        summaryStats,
        logoUrl: leafLogo,
        title: 'Finance Report — All Time',
      });
    } catch (err) {
      console.error('PDF export failed:', err);
    }
  }

  /* Loading / error guards */
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

  return (
    <section className={styles.section}>

      {/* Header */}
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>Payments &amp; Finance</h2>
          <p className={styles.subtitle}>Your earnings, commission breakdown, and finance reports</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Net Revenue</p>
          <p className={`${styles.statValue} ${styles.statAccent}`}>£{totalNet.toFixed(2)}</p>
          <p className={styles.statSub}>After {overallRate}% platform commission</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Gross Sales</p>
          <p className={styles.statValue}>£{totalGross.toFixed(2)}</p>
          <p className={styles.statSub}>Total before commission</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Commission Paid</p>
          <p className={styles.statValue}>£{totalCommission.toFixed(2)}</p>
          <p className={styles.statSub}>Platform fee on completed orders</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Pending Payouts</p>
          <p className={styles.statValue}>£{pendingAmount.toFixed(2)}</p>
          <p className={styles.statSub}>Orders in progress</p>
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

      {/* TAB: Transactions */}
      {activeTab === 'transactions' && (
        <>
          {/* Filter pills + export buttons */}
          <div className={styles.filterRow}>
            <div className={styles.filterTabs}>
              {FILTER_OPTIONS.map(f => (
                <button
                  key={f}
                  className={`${styles.filterTab} ${filter === f ? styles.filterTabActive : ''}`}
                  onClick={() => setFilter(f)}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                  <span className={styles.filterTabCount}>
                    {f === 'all' ? rows.length : rows.filter(r => r.paymentStatus === f).length}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {filteredRows.length === 0 ? (
            <div className={styles.empty}>
              <p>No {filter !== 'all' ? filter : ''} transactions found.</p>
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Order Ref</th>
                    <th>Date</th>
                    <th>Delivery Date</th>
                    <th>Gross Sales</th>
                    <th>Commission</th>
                    <th>Net Payout</th>
                    <th>Order Status</th>
                    <th>Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map(row => (
                    <tr key={row.id}>
                      <td className={styles.muted}>#{row.orderId}</td>
                      <td className={styles.dateCell}>
                        {new Date(row.date).toLocaleDateString('en-GB')}
                      </td>
                      <td className={styles.dateCell}>
                        {row.deliveryDate
                          ? new Date(row.deliveryDate).toLocaleDateString('en-GB')
                          : <span className={styles.muted}>—</span>}
                      </td>
                      <td>£{row.subtotal.toFixed(2)}</td>
                      <td>
                        <span className={styles.commissionCell}>
                          £{row.commission.toFixed(2)}
                          <span className={styles.commissionRate}>({row.commissionRate}%)</span>
                        </span>
                      </td>
                      <td><strong>£{row.payout.toFixed(2)}</strong></td>
                      <td>
                        <span className={`${styles.badge} ${ORDER_STATUS_CLASS[row.orderStatus] ?? styles.badgeGrey}`}>
                          {row.orderStatus}
                        </span>
                      </td>
                      <td>
                        <span className={`${styles.badge} ${PAYOUT_STATUS_CLASS[row.paymentStatus] ?? styles.badgeGrey}`}>
                          {row.paymentStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className={styles.tableFoot}>
                    <td colSpan={3}><strong>Totals ({filteredRows.length} orders)</strong></td>
                    <td><strong>£{filteredRows.reduce((s, r) => s + r.subtotal, 0).toFixed(2)}</strong></td>
                    <td><strong>£{filteredRows.reduce((s, r) => s + r.commission, 0).toFixed(2)}</strong></td>
                    <td><strong>£{filteredRows.reduce((s, r) => s + r.payout, 0).toFixed(2)}</strong></td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </>
      )}

      {/* TAB: Finance Report (weekly settlement summary) */}
      {activeTab === 'finance-report' && (
        <>
          <div className={styles.filterRow}>
            <div>
              <div className={styles.headingWithInfo}>
                <h3 className={styles.subheading} style={{ margin: 0 }}>Weekly Settlement Report</h3>
                <span className={styles.infoHint}>
                  <span className={styles.infoHintIcon} aria-hidden="true">
                    i
                  </span>
                  <span className={styles.infoTooltip} role="tooltip">
                    Commission is rounded to the nearest penny on each order before weekly totals are added, so the displayed effective rate can occasionally appear as 5.1% instead of exactly 5.0%.
                  </span>
                </span>
              </div>
              <p className={styles.subtitle} style={{ margin: 0 }}>
                Gross sales, platform commission, and net payout — settled weekly
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
                    <th>Gross Sales</th>
                    <th>Commission</th>
                    <th>Commission Rate</th>
                    <th>Net Payout</th>
                    <th>Paid</th>
                    <th>Pending</th>
                    <th>Cancelled</th>
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
                      <td className={styles.centredCell}>
                        <span className={`${styles.badge} ${styles.badgeGrey}`}>
                          {row.effectiveRate}%
                        </span>
                      </td>
                      <td><strong>£{row.net.toFixed(2)}</strong></td>
                      <td className={styles.centredCell}>
                        {row.paid > 0
                          ? <span className={`${styles.badge} ${styles.badgeGreen}`}>{row.paid}</span>
                          : <span className={styles.muted}>—</span>}
                      </td>
                      <td className={styles.centredCell}>
                        {row.pending > 0
                          ? <span className={`${styles.badge} ${styles.badgeWarning}`}>{row.pending}</span>
                          : <span className={styles.muted}>—</span>}
                      </td>
                      <td className={styles.centredCell}>
                        {row.cancelled > 0
                          ? <span className={`${styles.badge} ${styles.badgeGrey}`}>{row.cancelled}</span>
                          : <span className={styles.muted}>—</span>}
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
                    <td className={styles.centredCell}>
                      <span className={`${styles.badge} ${styles.badgeGrey}`}>{allTimeTotals.rate}%</span>
                    </td>
                    <td><strong>£{allTimeTotals.net.toFixed(2)}</strong></td>
                    <td className={styles.centredCell}><strong>{allTimeTotals.paid}</strong></td>
                    <td className={styles.centredCell}><strong>{allTimeTotals.pending}</strong></td>
                    <td className={styles.centredCell}><strong>{allTimeTotals.cancelled}</strong></td>
                    <td className={styles.centredCell}>
                      <div className={styles.dlWrap} ref={dlDropdown === 'alltime' ? dlDropdownRef : null}>
                        <button
                          className={styles.dlIconBtn}
                          onClick={() => setDlDropdown(dlDropdown === 'alltime' ? null : 'alltime')}
                          title="Download report"
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M8 1v9m0 0L5 7m3 3 3-3M2 12v1a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
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
