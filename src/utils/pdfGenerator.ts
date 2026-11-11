import { jsPDF } from 'jspdf';
import { Order } from '../types';
import { formatCOP } from './formatCurrency';

export function generateInvoicePdf(order: Order): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Primary Header bar: Midnight Harbor (#0b3658)
  doc.setFillColor(11, 54, 88);
  doc.rect(0, 0, pageWidth, 40, 'F');

  // Brand Name
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('velo', 16, 20);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(78, 154, 217); // Signal Blue (#4e9ad9)
  doc.text('Velo Colombia S.A.S. | Servicios para el Hogar con Pago Protegido', 16, 28);
  doc.text('Garantía de Fondos en Custodia Fiduciaria Velo (0 $ cobro oculto)', 16, 33);

  // Invoice Number & Date (right aligned)
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`CUENTA / FACTURA: COL-${order.id.toUpperCase()}`, pageWidth - 16, 18, { align: 'right' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(200, 216, 228);
  const dateFormatted = new Date(order.scheduledDate).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  doc.text(`Fecha de emisión: ${dateFormatted}`, pageWidth - 16, 25, { align: 'right' });
  doc.text(`Custodia Segura: ${order.escrowTransactionId}`, pageWidth - 16, 31, { align: 'right' });

  // Parties Split
  let y = 52;
  doc.setTextColor(11, 54, 88);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('PRESTADOR DEL SERVICIO (PROFESIONAL)', 16, y);
  doc.text('USUARIO CONTRATANTE (CLIENTE)', 110, y);

  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(72, 105, 132); // Slate Channel
  
  // Pro block
  doc.text(`${order.proName}`, 16, y);
  doc.text(`Especialidad: ${order.proTrade}`, 16, y + 5);
  doc.text(`C.C. / RUT: 1.024.${order.id.slice(-4)}.890`, 16, y + 10);
  doc.text(`Técnico Verificado Velo Colombia`, 16, y + 15);

  // Client block
  doc.text(`${order.clientName}`, 110, y);
  doc.text(`${order.address}`, 110, y + 5);
  doc.text(`Email: ${order.clientEmail}`, 110, y + 10);
  doc.text(`Teléfono: ${order.clientPhone}`, 110, y + 15);

  // Items table header
  y += 28;
  doc.setFillColor(230, 241, 250); // Ice Tint
  doc.roundedRect(16, y, pageWidth - 32, 9, 1, 1, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(11, 54, 88);
  doc.text('CONCEPTO / SERVICIO EN COLOMBIA', 20, y + 6);
  doc.text('CATEGORÍA', 110, y + 6);
  doc.text('VALOR ALL-IN (COP)', pageWidth - 20, y + 6, { align: 'right' });

  // Items Row
  y += 15;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(11, 54, 88);
  doc.text(order.serviceTitle, 20, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(72, 105, 132);
  doc.text(order.category.toUpperCase(), 110, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(11, 54, 88);
  doc.text(`${formatCOP(order.allInPrice, true)}`, pageWidth - 20, y, { align: 'right' });

  // Sub-description
  y += 5;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(104, 141, 172);
  doc.text(`Horario acordado: ${order.scheduledTimeSlot} - Sin cobros ocultos ni sobrecostos`, 20, y);

  // Financial Breakdown Box (Colombian IVA 19% if applicable)
  y += 22;
  const subtotal = Math.round(order.allInPrice / 1.19);
  const vat = Math.round(order.allInPrice - subtotal);

  doc.setDrawColor(221, 231, 238);
  doc.line(16, y, pageWidth - 16, y);

  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(72, 105, 132);
  doc.text('Subtotal Base:', 120, y);
  doc.text(`${formatCOP(subtotal)}`, pageWidth - 20, y, { align: 'right' });

  y += 6;
  doc.text('IVA (19% Incluido):', 120, y);
  doc.text(`${formatCOP(vat)}`, pageWidth - 20, y, { align: 'right' });

  y += 7;
  doc.setFillColor(11, 54, 88);
  doc.roundedRect(118, y - 4, pageWidth - 118 - 16, 12, 1.5, 1.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('TOTAL A PAGAR:', 122, y + 4);
  doc.text(`${formatCOP(order.allInPrice, true)}`, pageWidth - 20, y + 4, { align: 'right' });

  // Reverse take rate badge on invoice
  y += 20;
  doc.setFillColor(230, 241, 250); // Ice Tint
  doc.setDrawColor(221, 231, 238); // Sea Fog
  doc.roundedRect(16, y, pageWidth - 32, 24, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(11, 54, 88);
  doc.text('MODELO REVERSE TAKE RATE (GANAR-GANAR-GANAR)', 22, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(78, 154, 217);
  doc.text(`Servicio recurrente con el profesional: Nº ${order.commission.transactionNumberWithPro}`, 22, y + 13);
  doc.text(`Comisión Velo: ${order.commission.effectiveRatePercent}% (Ahorro por fidelidad de ${order.commission.discountPercent}%)`, 22, y + 18);
  doc.text(`Ingreso neto del técnico: ${formatCOP(order.commission.proNetEarnings)}`, 115, y + 18);

  // Status Stamp Box
  y += 32;
  const isReleased = order.escrowStatus === 'RELEASED';
  doc.setDrawColor(78, 154, 217);
  doc.setLineWidth(0.8);
  doc.roundedRect(16, y, 95, 18, 2, 2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(isReleased ? 66 : 78, isReleased ? 179 : 154, isReleased ? 177 : 217);
  doc.text(isReleased ? 'FONDOS EN CUSTODIA LIBERADOS AL PROFESIONAL' : 'FONDOS PROTEGIDOS EN CUSTODIA SEGURA', 20, y + 7);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`ID Transacción: ${order.escrowTransactionId}`, 20, y + 13);

  // Footer notes
  doc.setFontSize(7.5);
  doc.setTextColor(104, 141, 172);
  doc.text('Velo Colombia S.A.S. - NIT 901.845.210-4 - Carrera 7 # 72-13, Bogotá D.C., Colombia.', 16, 280);
  doc.text('Documento oficial generado electrónicamente por la Suite SaaS Velo Colombia conforme a la normativa comercial.', 16, 285);

  doc.save(`Factura_Velo_COL_${order.id.toUpperCase()}.pdf`);
}
