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

/* ── Finance Report PDF ── */
export async function generateFinanceReportPDF({ producerName, weeklyReport, weekTotal, allTimeTotals, summaryStats, logoUrl, title }) {
  const C = getColors();
  const doc = new jsPDF('landscape', 'mm', 'a4');
  const logoBase64 = await loadLogoBase64(logoUrl);

  addHeader(doc, logoBase64, C);

  let y = addTitle(
    doc,
    title || 'Finance Report — Weekly Settlement Summary',
    `${producerName}  •  ${new Date().toLocaleDateString('en-GB')}`,
    42,
    C,
  );

  y = addSummaryCards(doc, [
    { label: 'Net Revenue',     value: `£${summaryStats.totalNet.toFixed(2)}` },
    { label: 'Gross Sales',     value: `£${summaryStats.totalGross.toFixed(2)}` },
    { label: 'Commission Paid', value: `£${summaryStats.totalCommission.toFixed(2)}` },
    { label: 'Total Orders',    value: `${weekTotal ? weekTotal.count : allTimeTotals.count}` },
  ], y, C);

  const tableHeaders = [['Period', 'Orders', 'Gross Sales', 'Commission', 'Rate', 'Net Payout', 'Paid', 'Pending', 'Cancelled']];

  const tableRows = weeklyReport.map(r => [
    r.label,
    r.count,
    `£${r.gross.toFixed(2)}`,
    `£${r.commission.toFixed(2)}`,
    `${r.effectiveRate}%`,
    `£${r.net.toFixed(2)}`,
    r.paid || '—',
    r.pending || '—',
    r.cancelled || '—',
  ]);

  const WEEK_BG = [235, 225, 228];

  // Week Total row (only present for weekly reports)
  if (weekTotal) {
    tableRows.push([
      { content: 'Week Total', styles: { fontStyle: 'bold', fillColor: WEEK_BG, textColor: C.PRIMARY } },
      { content: `${weekTotal.count}`, styles: { fontStyle: 'bold', fillColor: WEEK_BG, textColor: C.PRIMARY } },
      { content: `£${weekTotal.gross.toFixed(2)}`, styles: { fontStyle: 'bold', fillColor: WEEK_BG, textColor: C.PRIMARY } },
      { content: `£${weekTotal.commission.toFixed(2)}`, styles: { fontStyle: 'bold', fillColor: WEEK_BG, textColor: C.PRIMARY } },
      { content: `${weekTotal.rate}%`, styles: { fontStyle: 'bold', fillColor: WEEK_BG, textColor: C.PRIMARY } },
      { content: `£${weekTotal.net.toFixed(2)}`, styles: { fontStyle: 'bold', fillColor: WEEK_BG, textColor: C.PRIMARY } },
      { content: `${weekTotal.paid}`, styles: { fontStyle: 'bold', fillColor: WEEK_BG, textColor: C.PRIMARY } },
      { content: `${weekTotal.pending}`, styles: { fontStyle: 'bold', fillColor: WEEK_BG, textColor: C.PRIMARY } },
      { content: `${weekTotal.cancelled}`, styles: { fontStyle: 'bold', fillColor: WEEK_BG, textColor: C.PRIMARY } },
    ]);
  }

  // All-time footer row
  tableRows.push([
    { content: 'All Time', styles: { fontStyle: 'bold', fillColor: C.FOOTER_BG } },
    { content: `${allTimeTotals.count}`, styles: { fontStyle: 'bold', fillColor: C.FOOTER_BG } },
    { content: `£${allTimeTotals.gross.toFixed(2)}`, styles: { fontStyle: 'bold', fillColor: C.FOOTER_BG } },
    { content: `£${allTimeTotals.commission.toFixed(2)}`, styles: { fontStyle: 'bold', fillColor: C.FOOTER_BG } },
    { content: `${allTimeTotals.rate}%`, styles: { fontStyle: 'bold', fillColor: C.FOOTER_BG } },
    { content: `£${allTimeTotals.net.toFixed(2)}`, styles: { fontStyle: 'bold', fillColor: C.FOOTER_BG } },
    { content: `${allTimeTotals.paid}`, styles: { fontStyle: 'bold', fillColor: C.FOOTER_BG } },
    { content: `${allTimeTotals.pending}`, styles: { fontStyle: 'bold', fillColor: C.FOOTER_BG } },
    { content: `${allTimeTotals.cancelled}`, styles: { fontStyle: 'bold', fillColor: C.FOOTER_BG } },
  ]);

  autoTable(doc, {
    head: tableHeaders,
    body: tableRows,
    startY: y,
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

  addPageFooter(doc, C);
  doc.save(`finance-report-${producerName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
