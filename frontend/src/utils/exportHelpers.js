import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/* ── Read CSS variables at runtime ── */
function getCSSVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function hexToRGB(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
}

function cssColor(varName, fallback) {
  try {
    const val = getCSSVar(varName);
    if (val && val.startsWith('#')) return hexToRGB(val);
    if (val && val.startsWith('rgb')) {
      const nums = val.match(/\d+/g);
      if (nums && nums.length >= 3) return nums.slice(0, 3).map(Number);
    }
  } catch { /* fallback */ }
  return fallback;
}

/* ── Colour palette (reads from CSS vars, falls back to hardcoded) ── */
function getColors() {
  return {
    PRIMARY:  cssColor('--primary',  [110, 35, 50]),
    ACCENT:   cssColor('--secondary', [251, 146, 60]),
    TEXT:     cssColor('--text',     [31, 41, 55]),
    MUTED:    cssColor('--muted',    [107, 114, 128]),
    SURFACE2: cssColor('--surface-2', [246, 247, 249]),
    SUCCESS:  cssColor('--success',  [34, 197, 94]),
    WARNING:  cssColor('--warning',  [234, 179, 8]),
    ERROR:    cssColor('--error',    [239, 68, 68]),
    WHITE:    [255, 255, 255],
    ALT_ROW:  [249, 250, 251],
    BORDER:   [229, 231, 235],
    FOOTER_BG: [240, 240, 240],
  };
}

/* ── CSV ── */
function escapeCSV(val) {
  const str = String(val ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n'))
    return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function downloadCSV(filename, headers, rows) {
  const bom = '\uFEFF';
  const csv = [
    headers.map(escapeCSV).join(','),
    ...rows.map(r => r.map(escapeCSV).join(',')),
  ].join('\r\n');

  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ── PDF helpers ── */
let _cachedLogo = null;

async function loadLogoBase64(logoUrl) {
  if (_cachedLogo) return _cachedLogo;
  try {
    const img    = new Image();
    img.crossOrigin = 'anonymous';
    img.src      = logoUrl;
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    canvas.getContext('2d').drawImage(img, 0, 0);
    _cachedLogo = canvas.toDataURL('image/png');
    return _cachedLogo;
  } catch {
    return null;
  }
}

function addHeader(doc, logoBase64, C) {
  const pageW = doc.internal.pageSize.getWidth();

  // Maroon band
  doc.setFillColor(...C.PRIMARY);
  doc.rect(0, 0, pageW, 32, 'F');

  // Logo
  if (logoBase64) {
    try { doc.addImage(logoBase64, 'PNG', 12, 6, 20, 20); } catch { /* skip */ }
  }

  // Brand name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...C.WHITE);
  doc.text('BRFN', logoBase64 ? 36 : 12, 20);

  // Tagline
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('Bristol Regional Food Network', logoBase64 ? 36 : 12, 27);
}

function addTitle(doc, title, subtitle, y, C) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...C.TEXT);
  doc.text(title, 14, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...C.MUTED);
  doc.text(subtitle, 14, y + 7);

  return y + 14;
}

function addSummaryCards(doc, cards, y, C) {
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  const gap = 6;
  const cardW = (pageW - margin * 2 - gap * (cards.length - 1)) / cards.length;
  const cardH = 28;

  cards.forEach((card, i) => {
    const x = margin + i * (cardW + gap);
    const isPrimary = i === 0;

    // Card background
    if (isPrimary) {
      doc.setFillColor(...C.PRIMARY);
    } else {
      doc.setFillColor(...C.SURFACE2);
    }
    doc.roundedRect(x, y, cardW, cardH, 3, 3, 'F');

    // Label
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...(isPrimary ? C.WHITE : C.MUTED));
    doc.text(card.label.toUpperCase(), x + 5, y + 9);

    // Value
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...(isPrimary ? C.WHITE : C.TEXT));
    doc.text(card.value, x + 5, y + 20);
  });

  return y + cardH + 8;
}

function addPageFooter(doc, C) {
  const pageCount = doc.internal.getNumberOfPages();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...C.MUTED);

    doc.text(
      `Generated on ${new Date().toLocaleDateString('en-GB')} — BRFN`,
      14,
      pageH - 10
    );
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageW - 14,
      pageH - 10,
      { align: 'right' }
    );

    doc.setDrawColor(...C.ACCENT);
    doc.setLineWidth(0.5);
    doc.line(14, pageH - 14, pageW - 14, pageH - 14);
  }
}

/* ── Helpers for payment report ── */
function anonymiseName(fullName) {
  if (!fullName) return 'Customer';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

function paymentStatusLabel(orderStatus) {
  if (['delivered', 'completed'].includes(orderStatus)) return 'Processed';
  if (['cancelled', 'rejected'].includes(orderStatus)) return 'Cancelled';
  return 'Pending Bank Transfer';
}


/* ══════════════════════════════════════════════════════════════════
   Payment Report PDF 
══════════════════════════════════════════════════════════════════ */
export async function generatePaymentReportPDF({
  producerName, weekRows, weeklyReport, weekTotal, allTimeTotals,
  taxYearTotals, summaryStats, logoUrl, title,
}) {
  const C = getColors();
  const doc = new jsPDF('landscape', 'mm', 'a4');
  const logoBase64 = await loadLogoBase64(logoUrl);

  /* ── Page 1: Header + summary ── */
  addHeader(doc, logoBase64, C);

  let y = addTitle(
    doc,
    title || 'Payment Report',
    `${producerName}  •  Generated ${new Date().toLocaleDateString('en-GB')}`,
    42,
    C,
  );

  // Summary cards
  y = addSummaryCards(doc, [
    { label: 'Producer Payment (95%)', value: `£${summaryStats.totalNet.toFixed(2)}` },
    { label: 'Total Orders Value',     value: `£${summaryStats.totalGross.toFixed(2)}` },
    { label: 'Commission (5%)',        value: `£${summaryStats.totalCommission.toFixed(2)}` },
    { label: 'Orders',                 value: `${weekRows.length}` },
  ], y, C);

  // Tax year running total box
  if (taxYearTotals) {
    doc.setFillColor(...C.SURFACE2);
    const pageW = doc.internal.pageSize.getWidth();
    doc.roundedRect(14, y, pageW - 28, 18, 3, 3, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...C.TEXT);
    doc.text(`Tax Year ${taxYearTotals.label} Running Total`, 20, y + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...C.MUTED);
    const taxSummary = `Gross: £${taxYearTotals.gross.toFixed(2)}   |   Commission: £${taxYearTotals.commission.toFixed(2)}   |   Net Earnings: £${taxYearTotals.net.toFixed(2)}   |   ${taxYearTotals.orderCount} completed orders`;
    doc.text(taxSummary, 20, y + 14);

    y += 24;
  }

  /* ── Section: Individual Order Breakdown ── */
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...C.TEXT);
  doc.text('Individual Order Breakdown', 14, y);
  y += 6;

  // Order detail table
  const orderHeaders = [[
    'Order #', 'Stripe Ref', 'Date', 'Customer',
    'Items Sold', 'Gross', 'Commission', 'Net Payout', 'Status',
  ]];

  const orderRows = weekRows.map(r => {
    const stripeRef = r.stripeRef ?? r.stripe_ref ?? '';
    const customer = anonymiseName(r.customerName ?? r.customer_name ?? '');
    const items = (r.items || []);
    const itemsSummary = items.length > 0
      ? items.map(it => `${it.quantity}x ${it.product_name}`).join(', ')
      : '—';
    const gross = r.subtotal ?? parseFloat(r.total_amount ?? 0);
    const commission = r.commission ?? (gross * 0.05);
    const payout = r.payout ?? r.payout_amount ?? (gross - commission);
    const status = paymentStatusLabel(r.orderStatus ?? r.status ?? '');

    return [
      `#${r.orderId ?? r.order}`,
      stripeRef || '—',
      new Date(r.date ?? r.created_at).toLocaleDateString('en-GB'),
      customer,
      itemsSummary,
      `£${gross.toFixed(2)}`,
      `£${commission.toFixed(2)}`,
      `£${payout.toFixed(2)}`,
      status,
    ];
  });

  // Totals row
  const totalGross = weekRows.reduce((s, r) => s + (r.subtotal ?? parseFloat(r.total_amount ?? 0)), 0);
  const totalCommission = weekRows.reduce((s, r) => s + (r.commission ?? (r.subtotal ?? 0) * 0.05), 0);
  const totalPayout = weekRows.reduce((s, r) => s + (r.payout ?? r.payout_amount ?? 0), 0);

  orderRows.push([
    { content: `${weekRows.length} orders`, styles: { fontStyle: 'bold', fillColor: C.FOOTER_BG } },
    { content: 'TOTAL', styles: { fontStyle: 'bold', fillColor: C.FOOTER_BG } },
    { content: '', styles: { fillColor: C.FOOTER_BG } },
    { content: '', styles: { fillColor: C.FOOTER_BG } },
    { content: '', styles: { fillColor: C.FOOTER_BG } },
    { content: `£${totalGross.toFixed(2)}`, styles: { fontStyle: 'bold', fillColor: C.FOOTER_BG } },
    { content: `£${totalCommission.toFixed(2)}`, styles: { fontStyle: 'bold', fillColor: C.FOOTER_BG } },
    { content: `£${totalPayout.toFixed(2)}`, styles: { fontStyle: 'bold', fillColor: C.FOOTER_BG } },
    { content: '', styles: { fillColor: C.FOOTER_BG } },
  ]);

  autoTable(doc, {
    head: orderHeaders,
    body: orderRows,
    startY: y,
    margin: { left: 14, right: 14 },
    styles: {
      fontSize: 7,
      cellPadding: 2.5,
      textColor: C.TEXT,
      lineColor: C.BORDER,
      lineWidth: 0.2,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: C.PRIMARY,
      textColor: C.WHITE,
      fontStyle: 'bold',
      fontSize: 7,
    },
    alternateRowStyles: {
      fillColor: C.ALT_ROW,
    },
    columnStyles: {
      0: { cellWidth: 18 },              // Order #
      1: { cellWidth: 38 },              // Stripe Ref
      2: { cellWidth: 22 },              // Date
      3: { cellWidth: 26 },              // Customer
      4: { cellWidth: 'auto' },          // Items Sold
      5: { cellWidth: 20, halign: 'right' },  // Gross
      6: { cellWidth: 22, halign: 'right' },  // Commission
      7: { cellWidth: 22, halign: 'right' },  // Net Payout
      8: { cellWidth: 28 },              // Status
    },
  });

  /* ── Page 2+: Weekly settlement summary (if weeklyReport provided) ── */
  if (weeklyReport && weeklyReport.length > 0) {
    doc.addPage();
    addHeader(doc, logoBase64, C);

    let y2 = addTitle(
      doc,
      'Weekly Settlement Summary',
      `${producerName}  •  ${new Date().toLocaleDateString('en-GB')}`,
      42,
      C,
    );

    const settlementHeaders = [['Period', 'Orders', 'Total Orders Value', 'Commission (5%)', 'Rate', 'Producer Payment (95%)', 'Processed', 'Pending Transfer', 'Cancelled']];

    const settlementRows = weeklyReport.map(r => [
      r.label,
      r.count,
      `£${r.gross.toFixed(2)}`,
      `£${r.commission.toFixed(2)}`,
      `${r.effectiveRate}%`,
      `£${r.net.toFixed(2)}`,
      r.processed ?? r.paid ?? '—',
      r.pending_transfer ?? r.pending ?? '—',
      r.cancelled || '—',
    ]);

    const WEEK_BG = [235, 225, 228];

    if (weekTotal) {
      settlementRows.push([
        { content: 'Week Total', styles: { fontStyle: 'bold', fillColor: WEEK_BG, textColor: C.PRIMARY } },
        { content: `${weekTotal.count}`, styles: { fontStyle: 'bold', fillColor: WEEK_BG, textColor: C.PRIMARY } },
        { content: `£${weekTotal.gross.toFixed(2)}`, styles: { fontStyle: 'bold', fillColor: WEEK_BG, textColor: C.PRIMARY } },
        { content: `£${weekTotal.commission.toFixed(2)}`, styles: { fontStyle: 'bold', fillColor: WEEK_BG, textColor: C.PRIMARY } },
        { content: `${weekTotal.rate}%`, styles: { fontStyle: 'bold', fillColor: WEEK_BG, textColor: C.PRIMARY } },
        { content: `£${weekTotal.net.toFixed(2)}`, styles: { fontStyle: 'bold', fillColor: WEEK_BG, textColor: C.PRIMARY } },
        { content: `${weekTotal.processed ?? weekTotal.paid ?? 0}`, styles: { fontStyle: 'bold', fillColor: WEEK_BG, textColor: C.PRIMARY } },
        { content: `${weekTotal.pending_transfer ?? weekTotal.pending ?? 0}`, styles: { fontStyle: 'bold', fillColor: WEEK_BG, textColor: C.PRIMARY } },
        { content: `${weekTotal.cancelled}`, styles: { fontStyle: 'bold', fillColor: WEEK_BG, textColor: C.PRIMARY } },
      ]);
    }

    // All-time footer
    settlementRows.push([
      { content: 'All Time', styles: { fontStyle: 'bold', fillColor: C.FOOTER_BG } },
      { content: `${allTimeTotals.count}`, styles: { fontStyle: 'bold', fillColor: C.FOOTER_BG } },
      { content: `£${allTimeTotals.gross.toFixed(2)}`, styles: { fontStyle: 'bold', fillColor: C.FOOTER_BG } },
      { content: `£${allTimeTotals.commission.toFixed(2)}`, styles: { fontStyle: 'bold', fillColor: C.FOOTER_BG } },
      { content: `${allTimeTotals.rate}%`, styles: { fontStyle: 'bold', fillColor: C.FOOTER_BG } },
      { content: `£${allTimeTotals.net.toFixed(2)}`, styles: { fontStyle: 'bold', fillColor: C.FOOTER_BG } },
      { content: `${allTimeTotals.processed ?? allTimeTotals.paid ?? 0}`, styles: { fontStyle: 'bold', fillColor: C.FOOTER_BG } },
      { content: `${allTimeTotals.pending_transfer ?? allTimeTotals.pending ?? 0}`, styles: { fontStyle: 'bold', fillColor: C.FOOTER_BG } },
      { content: `${allTimeTotals.cancelled}`, styles: { fontStyle: 'bold', fillColor: C.FOOTER_BG } },
    ]);

    autoTable(doc, {
      head: settlementHeaders,
      body: settlementRows,
      startY: y2,
      margin: { left: 14, right: 14 },
      styles: {
        fontSize: 8,
        cellPadding: 3,
        textColor: C.TEXT,
        lineColor: C.BORDER,
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: C.PRIMARY,
        textColor: C.WHITE,
        fontStyle: 'bold',
        fontSize: 8,
      },
      alternateRowStyles: {
        fillColor: C.ALT_ROW,
      },
      columnStyles: {
        1: { halign: 'center' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'center' },
        5: { halign: 'right' },
        6: { halign: 'center' },
        7: { halign: 'center' },
        8: { halign: 'center' },
      },
    });

    // Tax year note at bottom of settlement page
    if (taxYearTotals) {
      const finalY = doc.lastAutoTable.finalY + 10;
      doc.setFillColor(...C.SURFACE2);
      const pageW = doc.internal.pageSize.getWidth();
      doc.roundedRect(14, finalY, pageW - 28, 14, 3, 3, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...C.TEXT);
      doc.text(`Tax Year ${taxYearTotals.label} Running Total:`, 20, finalY + 6);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Gross: £${taxYearTotals.gross.toFixed(2)}  |  Commission: £${taxYearTotals.commission.toFixed(2)}  |  Net Earnings: £${taxYearTotals.net.toFixed(2)}  |  ${taxYearTotals.orderCount} completed orders`,
        20, finalY + 11,
      );
    }
  }

  addPageFooter(doc, C);
  doc.save(`payment-report-${producerName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
