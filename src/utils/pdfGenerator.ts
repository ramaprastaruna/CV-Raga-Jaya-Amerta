import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface TransactionItem {
  product_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount_amount: number;
  discount_percent: number;
  discount_details?: { discount1: number; discount2: number } | null;
  subtotal: number;
}

interface Transaction {
  transaction_number: string;
  customer_name: string;
  customer_address?: string;
  sales_name?: string;
  transaction_date: string;
  payment_terms_days?: string;
  transaction_items: TransactionItem[];
  total_amount: number;
  grand_total: number;
}

const loadImageAsBase64 = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } else {
        reject(new Error('Failed to get canvas context'));
      }
    };
    img.onerror = reject;
    img.src = url;
  });
};

export const generateInvoicePDF = async (transaction: Transaction) => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a5',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 8;

  let logoBase64 = '';
  try {
    logoBase64 = await loadImageAsBase64('/logo.png');
  } catch (error) {
    console.error('Failed to load logo:', error);
  }

  const drawHeader = () => {
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, 26, 'F');

    let textStartX = margin;

    if (logoBase64) {
      const logoWidth = 12;
      const logoHeight = 12;
      const logoX = margin;
      const logoY = 4;

      try {
        doc.addImage(logoBase64, 'PNG', logoX, logoY, logoWidth, logoHeight);
        textStartX = logoX + logoWidth + 2;
      } catch (error) {
        console.error('Failed to add logo to PDF:', error);
      }
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('CV RAGA JAYA AMERTA', textStartX, 8);

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(90, 90, 90);
    doc.text('Perumahan Griya Melati Indah I, Kec Sananwetan, Kota Blitar 66125', textStartX, 12);
    doc.text('Telp: 082230403431 | Email: ragajayaamerta24@gmail.com', textStartX, 15.5);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('INVOICE', pageWidth - margin, 8, { align: 'right' });

    doc.setLineWidth(0.35);
    doc.setDrawColor(0, 0, 0);
    doc.line(margin, 18, pageWidth - margin, 18);

    doc.setLineWidth(0.15);
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, 26, pageWidth - margin, 26);
  };

  drawHeader();

  const customerY = 30;
  const boxHeight = 16;
  const gapBetweenBoxes = 3;
  const totalContentWidth = pageWidth - 2 * margin;
  const leftBoxWidth = (totalContentWidth - gapBetweenBoxes) / 2;
  const rightBoxWidth = (totalContentWidth - gapBetweenBoxes) / 2;
  const rightBoxX = margin + leftBoxWidth + gapBetweenBoxes;

  doc.setFillColor(255, 255, 255);
  doc.rect(margin, customerY, leftBoxWidth, boxHeight, 'F');
  doc.rect(rightBoxX, customerY, rightBoxWidth, boxHeight, 'F');

  doc.setDrawColor(210, 210, 210);
  doc.setLineWidth(0.3);
  doc.rect(margin, customerY, leftBoxWidth, boxHeight);
  doc.rect(rightBoxX, customerY, rightBoxWidth, boxHeight);

  const leftBoxRightEdge = margin + leftBoxWidth;
  const salesXPosition = leftBoxRightEdge - 2;

  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('KEPADA', margin + 1.5, customerY + 2.5);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(transaction.customer_name, margin + 1.5, customerY + 5.5);

  if (transaction.customer_address) {
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    const maxAddressWidth = leftBoxWidth * 0.45;
    const addressLines = doc.splitTextToSize(transaction.customer_address, maxAddressWidth);
    doc.text(addressLines, margin + 1.5, customerY + 8.5);
  }

  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('SALES', salesXPosition, customerY + 2.5, { align: 'right' });
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(transaction.sales_name || '-', salesXPosition, customerY + 5.5, { align: 'right' });

  const rightColX = rightBoxX + 1.5;
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('TANGGAL', rightColX, customerY + 2.5);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(new Date(transaction.transaction_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }), rightColX, customerY + 6);

  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('NO. FAKTUR', rightColX, customerY + 9.5);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(transaction.transaction_number.replace(/_/g, '/'), rightColX, customerY + 13);

  const tableStartY = customerY + boxHeight + 3;

  const tableData = transaction.transaction_items.map((item, index) => {
    const productName = item.product_name || '';
    const unitMatch = productName.match(/\(([^)]+)\)$/);
    const unitInParens = unitMatch ? unitMatch[1] : '';
    const qtyUnitMatch = unitInParens.match(/^(\d+)\s+(.+)$/);
    const displayQty = qtyUnitMatch ? parseInt(qtyUnitMatch[1]) : item.quantity;
    const displayUnit = qtyUnitMatch ? qtyUnitMatch[2] : (unitInParens || 'buah');
    const nameWithoutUnit = productName.replace(/\s*\([^)]+\)$/, '');

    const discountPercent = Number(item.discount_percent || 0);
    const discountAmountPerUnit = Number(item.discount_amount || 0);
    const unitPriceAfterDiscount = Number(item.unit_price || 0);
    const subtotal = Number(item.subtotal || 0);

    let discountDisplay = '-';
    if (item.discount_details && (item.discount_details.discount1 > 0 || item.discount_details.discount2 > 0)) {
      if (item.discount_details.discount2 > 0) {
        discountDisplay = `${item.discount_details.discount1}% + ${item.discount_details.discount2}%`;
      } else {
        discountDisplay = `${item.discount_details.discount1}%`;
      }
    } else if (discountPercent > 0) {
      discountDisplay = `${discountPercent.toFixed(0)}%`;
    }

    return [
      index + 1,
      nameWithoutUnit,
      displayQty,
      displayUnit,
      `Rp ${Math.round(unitPriceAfterDiscount).toLocaleString('id-ID')}`,
      discountDisplay,
      `Rp ${Math.round(subtotal).toLocaleString('id-ID')}`,
    ];
  });

  autoTable(doc, {
    startY: tableStartY,
    head: [['No', 'Item', 'Qty', 'Satuan', 'Harga', 'Disc', 'Subtotal']],
    body: tableData,
    foot: [
      ['', '', '', '', '', 'Total', `Rp ${Math.round(transaction.total_amount).toLocaleString('id-ID')}`],
    ],
    theme: 'grid',
    styles: {
      fontSize: 6.5,
      cellPadding: 1.5,
      lineWidth: 0.15,
      lineColor: [220, 220, 220],
      font: 'helvetica',
      textColor: [30, 30, 30],
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      lineWidth: 0.25,
      lineColor: [190, 190, 190],
      fontStyle: 'bold',
      halign: 'center',
      cellPadding: 1.8,
      fontSize: 6.5,
    },
    bodyStyles: {
      fillColor: [255, 255, 255],
      lineWidth: 0.15,
      lineColor: [230, 230, 230],
      textColor: [30, 30, 30],
      cellPadding: 1.5,
      fontSize: 6.5,
    },
    footStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      lineWidth: 0.25,
      lineColor: [190, 190, 190],
      cellPadding: 1.8,
      fontSize: 6.5,
      halign: 'right',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { halign: 'left', cellWidth: 'auto' },
      2: { halign: 'center', cellWidth: 10 },
      3: { halign: 'center', cellWidth: 13 },
      4: { halign: 'right', cellWidth: 23 },
      5: { halign: 'center', cellWidth: 10 },
      6: { halign: 'right', cellWidth: 26 },
    },
    margin: { left: margin, right: margin, bottom: 35 },
    didDrawPage: (data) => {
      if (data.pageNumber > 1) {
        drawHeader();
      }
    },
  });

  const tableEndY = (doc as any).lastAutoTable.finalY;
  const currentPage = (doc.internal as any).getCurrentPageInfo().pageNumber;

  if (tableEndY > pageHeight - 55) {
    doc.addPage();
    drawHeader();
  }

  const finalY = (doc.internal as any).getCurrentPageInfo().pageNumber > currentPage ? 30 : tableEndY + 3;

  const leftColWidth = pageWidth * 0.52;
  const rightColStart = leftColWidth + 2;
  const paymentBoxHeight = transaction.payment_terms_days ? 18 : 14;

  doc.setFillColor(255, 255, 255);
  doc.rect(margin, finalY, leftColWidth - margin - 1.5, paymentBoxHeight, 'F');
  doc.setDrawColor(210, 210, 210);
  doc.setLineWidth(0.25);
  doc.rect(margin, finalY, leftColWidth - margin - 1, paymentBoxHeight);

  let leftY = finalY + 2.5;

  if (transaction.payment_terms_days) {
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('TERM OF PAYMENT', margin + 1.5, leftY);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);

    const termText = transaction.payment_terms_days;
    const daysMatch = termText.match(/(\d+)\s*(hari|Hari|HARI|day|Day|DAY)/i);

    let displayText = termText;
    if (daysMatch) {
      const days = parseInt(daysMatch[1]);
      const transactionDate = new Date(transaction.transaction_date);
      const dueDate = new Date(transactionDate);
      dueDate.setDate(dueDate.getDate() + days);

      const dueDateFormatted = dueDate.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

      displayText = `${termText} (${dueDateFormatted})`;
    }

    doc.text(displayText, margin + 1.5, leftY + 3.5);
    leftY += 7;
  }

  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('PEMBAYARAN', margin + 1.5, leftY);
  leftY += 3;

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text('BANK CENTRAL ASIA', margin + 1.5, leftY);
  leftY += 3;

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);
  doc.text('0902680126 a.n ALDHI FAUZI LAZUARDI', margin + 1.5, leftY);

  const grandTotalBoxX = rightColStart;
  const grandTotalBoxY = finalY;
  const grandTotalBoxW = pageWidth - grandTotalBoxX - margin;
  const grandTotalBoxH = paymentBoxHeight;

  doc.setFillColor(255, 255, 255);
  doc.rect(grandTotalBoxX, grandTotalBoxY, grandTotalBoxW, grandTotalBoxH, 'F');
  doc.setDrawColor(210, 210, 210);
  doc.setLineWidth(0.25);
  doc.rect(grandTotalBoxX, grandTotalBoxY, grandTotalBoxW, grandTotalBoxH);

  const grandTotal = Number(transaction.grand_total) || Number(transaction.total_amount) || 0;

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('GRAND TOTAL', grandTotalBoxX + 2.5, grandTotalBoxY + 2.5);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(`Rp ${Math.round(grandTotal).toLocaleString('id-ID')}`, grandTotalBoxX + grandTotalBoxW - 2.5, grandTotalBoxY + 13, { align: 'right' });

  doc.setFontSize(6);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(110, 110, 110);
  doc.text('* Barang diterima dalam kondisi baik', margin, finalY + paymentBoxHeight + 3);

  const signatureY = pageHeight - 30;
  const leftSignX = margin + 30;
  const rightSignX = pageWidth - margin - 30;

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  const dateText = `Blitar, ${new Date(transaction.transaction_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`;
  doc.text(dateText, leftSignX, signatureY, { align: 'center' });
  doc.text(dateText, rightSignX, signatureY, { align: 'center' });

  doc.setLineWidth(0.15);
  doc.setDrawColor(0, 0, 0);
  doc.line(leftSignX - 15, signatureY + 17, leftSignX + 15, signatureY + 17);
  doc.line(rightSignX - 15, signatureY + 17, rightSignX + 15, signatureY + 17);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('CV Raga Jaya Amerta', leftSignX, signatureY + 20.5, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(transaction.customer_name, rightSignX, signatureY + 20.5, { align: 'center' });

  doc.save(`${transaction.transaction_number}.pdf`);
};
