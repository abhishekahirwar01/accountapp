// Remove TypeScript imports and types for pure JS environment

import {
  renderNotes,
  getUnifiedLines,
  invNo,
  getBillingAddress,
  getShippingAddress,
} from './pdf-utils';

import RNHTMLtoPDF from 'react-native-html-to-pdf';
import { BASE_URL } from '../config';

// --- Color Palette (Matching jsPDF RGB to Hex) ---
const PRIMARY_DARK = '#263238'; // Dark Slate Gray
const ACCENT_TEAL = '#009688'; // Vibrant Teal
const LIGHT_TEXT = '#647378'; // Muted gray
const BORDER_GRAY = '#e6e6e6'; // Light gray
const TABLE_HEADER_BG = '#f0f5f8'; // Very light blue-gray
const WHITE = '#ffffff';

// --- Utility Functions (Cloned from your input for data processing) ---

const _getCompanyGSTIN = c => {
  const x = c;
  return (
    x?.gstin ??
    x?.gstIn ??
    x?.gstNumber ??
    x?.gst_no ??
    x?.gst ??
    x?.gstinNumber ??
    x?.tax?.gstin ??
    null
  );
};

const _deriveTotals = (tx, co, svcNameById) => {
  const lines = getUnifiedLines(tx, svcNameById);
  const subtotal = lines.reduce((s, it) => s + (Number(it.amount) || 0), 0);
  const totalTax = lines.reduce((s, it) => s + (Number(it.lineTax) || 0), 0);
  const invoiceTotal = lines.reduce(
    (s, it) => s + (Number(it.lineTotal) || 0),
    0,
  );
  const gstEnabled = totalTax > 0 && !!_getCompanyGSTIN(co)?.trim();
  return { lines, subtotal, tax: totalTax, invoiceTotal, gstEnabled };
};

const money = n => `Rs ${Number(n || 0).toLocaleString('en-IN')}`;

const getItemsForTable = (transaction, lines) => {
  if (lines.length === 0) {
    const amount = Number(transaction.amount ?? 0);
    const gstPct = Number(transaction?.gstPercentage ?? 0);
    const lineTax = (amount * gstPct) / 100;
    const lineTotal = amount + lineTax;
    lines.push({
      name: transaction.description || 'Service Rendered',
      description: '',
      quantity: 1,
      pricePerUnit: amount,
      amount,
      gstPercentage: gstPct,
      lineTax,
      lineTotal,
    });
  }

  return lines.map((l, index) => ({
    sno: (index + 1).toString(),
    description: `${l.name}${l.description ? ' — ' + l.description : ''}`,
    quantity: l.quantity || 1,
    pricePerUnit: Number(l.pricePerUnit || l.amount || 0),
    amount: Number(l.amount || 0),
    gstPercentage: l.gstPercentage || 0,
    lineTax: Number(l.lineTax || 0),
    lineTotal: Number(l.lineTotal || l.amount || 0),
  }));
};

// --- HTML Generation Logic ---

const generateInvoiceHtml = (
  transaction,
  invoiceData,
  itemsForTable,
  totals,
  companyGSTIN,
) => {
  // Item Table Rows
  const itemRows = itemsForTable
    .map(
      item => `
        <tr class="item-row">
            <td style="width: 4%;">${item.sno}</td>
            <td style="width: 33%;">${item.description}</td>
            <td style="width: 10%; text-align: right;">${item.quantity}</td>
            <td style="width: 13%; text-align: right;">${money(
              item.pricePerUnit,
            )}</td>
            <td style="width: 10%; text-align: right;">${
              item.gstPercentage
            }%</td>
            <td style="width: 15%; text-align: right;">${money(
              item.lineTax,
            )}</td>
            <td style="width: 15%; text-align: right;">${money(
              item.lineTotal,
            )}</td>
        </tr>
    `,
    )
    .join('');

  // Totals Section
  const gstTotalRow = totals.gstEnabled
    ? `
        <tr>
            <td style="width: 100px; text-align: left; padding: 3px 0;">GST Total:</td>
            <td style="text-align: right; font-weight: bold;">${money(
              totals.tax,
            )}</td>
        </tr>
    `
    : '';

  const totalsSection = `
        <div style="width: 250px; margin-left: auto; margin-top: 20px;">
            <table style="width: 100%; font-size: 10pt; color: ${PRIMARY_DARK};">
                <tr>
                    <td style="width: 100px; text-align: left; padding: 3px 0; border-top: 0.5px solid ${BORDER_GRAY};">Subtotal:</td>
                    <td style="text-align: right; font-weight: bold; border-top: 0.5px solid ${BORDER_GRAY};">${money(
    totals.subtotal,
  )}</td>
                </tr>
                ${gstTotalRow}
            </table>
            
            <div style="background-color: ${ACCENT_TEAL}; color: ${WHITE}; padding: 5px 0; margin-top: 10px; border: 1px solid ${ACCENT_TEAL};">
                <table style="width: 100%; font-size: 12pt; font-weight: bold;">
                    <tr>
                        <td style="width: 100px; text-align: left; padding-left: 5px;">GRAND TOTAL</td>
                        <td style="text-align: right; padding-right: 5px;">${money(
                          totals.invoiceTotal,
                        )}</td>
                    </tr>
                </table>
            </div>
        </div>
    `;

  // Final HTML Structure
  return `
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {
                    font-family: 'Helvetica', sans-serif;
                    padding: 0;
                    margin: 0;
                    color: ${PRIMARY_DARK};
                    font-size: 10pt;
                }
                .content { padding: 18px; }

                /* Fixed Header on every page */
                @page { 
                    @top-center { 
                        content: element(header-box); 
                    }
                    @bottom-center {
                        content: element(footer-box);
                    }
                    /* Margins adjusted for fixed header/footer heights */
                    margin-top: 150px; 
                    margin-bottom: 50px; 
                }

                #header { 
                    position: running(header-box);
                    padding: 18px;
                    padding-bottom: 0;
                }
                #footer {
                    position: running(footer-box);
                    padding: 0 18px;
                }

                /* Header Styling */
                .company-info { font-size: 9pt; color: ${LIGHT_TEXT}; }
                .invoice-title { font-size: 30pt; color: ${ACCENT_TEAL}; font-weight: bold; }
                .detail-label { font-size: 10pt; font-weight: bold; color: ${PRIMARY_DARK}; }
                .detail-text { font-size: 9pt; color: ${LIGHT_TEXT}; }

                /* Table Styling */
                .item-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 10px;
                    font-size: 8pt;
                }
                .table-head {
                    background-color: ${TABLE_HEADER_BG};
                    border: 0.5px solid ${BORDER_GRAY};
                    font-weight: bold;
                    color: ${PRIMARY_DARK};
                    height: 10px; /* Matches TABLE_HEADER_HEIGHT */
                }
                .item-row {
                    height: 9px; /* Matches ROW_H in jspdf */
                    border-bottom: 0.1px solid ${BORDER_GRAY}; /* Subtle line */
                }
                .item-table th, .item-table td {
                    padding: 4px 2px;
                    vertical-align: middle;
                    white-space: nowrap; /* Prevent wrap where possible */
                    overflow: hidden;
                }
            </style>
        </head>
        <body>
            <div id="header">
                <table style="width: 100%;">
                    <tr>
                        <td style="width: 60%; vertical-align: top;">
                            <div style="font-weight: bold; font-size: 16pt; color: ${PRIMARY_DARK};">${invoiceData.company.name.toUpperCase()}</div>
                            <div class="company-info" style="margin-top: 5px;">${
                              invoiceData.company.address
                            }</div>
                            <div class="company-info">${
                              invoiceData.company.email
                            }</div>
                        </td>
                        <td style="width: 40%; text-align: right; vertical-align: top;">
                            <div class="invoice-title">INVOICE</div>
                        </td>
                    </tr>
                </table>

                <div style="border-top: 0.7px solid ${BORDER_GRAY}; margin-top: 10px; margin-bottom: 20px;"></div>

                <table style="width: 100%;">
                    <tr>
                        <td style="width: 50%; vertical-align: top;">
                            <div class="detail-label">INVOICE DETAILS</div>
                            <div class="detail-text" style="margin-top: 5px;">Invoice No: ${
                              invoiceData.invoiceNumber
                            }</div>
                            <div class="detail-text">Date: ${
                              invoiceData.date
                            }</div>
                        </td>
                        <td style="width: 50%; vertical-align: top; text-align: right;">
                            <div class="detail-label">BILL TO:</div>
                            <div style="font-weight: bold; font-size: 9pt; color: ${PRIMARY_DARK}; margin-top: 5px;">${
    invoiceData.invoiceTo.name
  }</div>
                            <div class="detail-text">${invoiceData.invoiceTo.billingAddress.replace(
                              /\n/g,
                              '<br/>',
                            )}</div>
                            
                            <div class="detail-label" style="margin-top: 8px;">SHIP TO:</div>
                            <div class="detail-text">${invoiceData.invoiceTo.shippingAddress.replace(
                              /\n/g,
                              '<br/>',
                            )}</div>
                            ${
                              invoiceData.invoiceTo.email
                                ? `<div class="detail-text">${invoiceData.invoiceTo.email}</div>`
                                : ''
                            }
                            ${
                              invoiceData.invoiceTo.gstin
                                ? `<div class="detail-text">GSTIN: ${invoiceData.invoiceTo.gstin}</div>`
                                : ''
                            }
                        </td>
                    </tr>
                </table>

                <div style="border-bottom: 0.3px solid ${BORDER_GRAY}; margin-top: 15px;"></div>
                
                <table class="item-table" style="margin-top: 0;">
                    <thead>
                        <tr class="table-head">
                            <th style="width: 4%; text-align: left; padding-left: 5px;">S.No.</th>
                            <th style="width: 33%; text-align: left;">ITEM DESCRIPTION</th>
                            <th style="width: 10%; text-align: right;">QTY</th>
                            <th style="width: 13%; text-align: right;">RATE</th>
                            <th style="width: 10%; text-align: right;">GST%</th>
                            <th style="width: 15%; text-align: right;">TAX</th>
                            <th style="width: 15%; text-align: right; padding-right: 5px;">TOTAL</th>
                        </tr>
                    </thead>
                </table>
            </div>

            <div id="footer">
                <div style="border-top: 0.5px solid ${BORDER_GRAY}; margin-top: 5px;"></div>
                <table style="width: 100%; margin-top: 5px;">
                    <tr>
                        <td style="width: 50%; vertical-align: top;">
                            <div style="font-weight: bold; font-size: 9pt; color: ${PRIMARY_DARK};">Notes/Terms:</div>
                            <div style="font-size: 8pt; color: ${LIGHT_TEXT}; white-space: pre-wrap;">
                                ${renderNotes(transaction)} 
                            </div>
                        </td>
                        <td style="width: 50%; vertical-align: top; text-align: right;">
                            <div style="font-size: 8pt; color: ${LIGHT_TEXT}; margin-top: 5px;">
                                ${invoiceData.company.contactLine}
                            </div>
                            <div style="font-size: 8pt; color: ${LIGHT_TEXT}; margin-top: 5px;">
                                Page <span class="pageNumber"></span> of <span class="totalPages"></span>
                            </div>
                        </td>
                    </tr>
                </table>
            </div>

            <div class="content" style="padding-top: 0;">
                
                <table class="item-table">
                    <tbody>
                        ${itemRows}
                    </tbody>
                </table>
                
                ${totalsSection}
                
            </div>
        </body>
        </html>
    `;
};

// --- Main Exported React Native Function ---

export const generatePdfForTemplate5 = async (
  transaction,
  company,
  party,
  serviceNameById,
  shippingAddress,
) => {
  // Data Processing
  const totals = _deriveTotals(transaction, company, serviceNameById);
  const companyGSTIN = _getCompanyGSTIN(company);

  const billingAddress = getBillingAddress(party);
  const shippingAddressStr = getShippingAddress(
    shippingAddress,
    billingAddress,
  );

  const itemsForTable = getItemsForTable(transaction, totals.lines);

  const contactLine = [
    company?.address || '',
    company?.emailId || '',
    company?.mobileNumber || '',
  ]
    .filter(Boolean)
    .join(' • ');

  const partyGSTIN = _getCompanyGSTIN(party);

  const invoiceData = {
    company: {
      name: company?.businessName || 'Your Company Name',
      address: company?.address || '123 Business Lane, City, State - 123456',
      email: company?.emailId || 'contact@yourcompany.com',
      phone: company?.mobileNumber || '+91 98765 43210',
      contactLine: contactLine,
    },
    invoice: {
      number: invNo(transaction),
      date: transaction.date
        ? new Intl.DateTimeFormat('en-GB').format(new Date(transaction.date))
        : '01 / 10 / 2024',
    },
    invoiceTo: {
      name: party?.name || 'Client Name',
      billingAddress,
      shippingAddress: shippingAddressStr,
      email: party?.email || '',
      gstin: partyGSTIN || '',
    },
  };

  // Generate HTML Content
  const htmlContent = generateInvoiceHtml(
    transaction,
    invoiceData,
    itemsForTable,
    totals,
    companyGSTIN,
  );

  // Configure and Convert to PDF
  const options = {
    html: htmlContent,
    fileName: `Invoice_${invoiceData.invoiceNumber}`,
    directory: 'Documents',
    base64: false,
    padding: 0, // Padding set to 0 as it's handled by CSS
  };

  try {
    const file = await RNHTMLtoPDF.convert(options);

    // Return the file path (string)
    return file.filePath;
  } catch (error) {
    console.error('PDF generation failed:', error);
    throw error;
  }
};
