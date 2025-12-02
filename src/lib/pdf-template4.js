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
const PRIMARY = '#3b82f6'; // [59, 130, 246]
const SECONDARY = '#6e7789'; // [107, 114, 128]
const TEXT = '#1f2937'; // [31, 41, 55]
const LIGHT_BG = '#f9fafb'; // [249, 250, 251]
const BORDER_COLOR = '#e5e7eb'; // Light border

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

const money = n =>
  `Rs ${new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(n || 0))}`;

const getItemsForTable = (transaction, lines) => {
  return (
    lines.length
      ? lines
      : [
          {
            name: transaction.description || 'Item',
            description: '',
            quantity: 1,
            pricePerUnit: transaction.amount ?? 0,
            amount: transaction.amount ?? 0,
            gstPercentage: transaction?.gstPercentage ?? 0,
            lineTax:
              (Number(transaction.amount ?? 0) *
                Number(transaction?.gstPercentage ?? 0)) /
                100 || 0,
            lineTotal:
              Number(transaction.amount ?? 0) +
              ((Number(transaction.amount ?? 0) *
                Number(transaction?.gstPercentage ?? 0)) /
                100 || 0),
          },
        ]
  ).map((l, i) => ({
    sno: (i + 1).toString(),
    description: `${l.name}${l.description ? ' — ' + l.description : ''}`,
    quantity: l.quantity || 1,
    pricePerUnit: Number(l.pricePerUnit ?? l.amount ?? 0),
    gstPercentage: Number(l.gstPercentage ?? 0),
    lineTax: Number(l.lineTax ?? 0),
    lineTotal: Number(l.lineTotal ?? l.amount ?? 0),
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
      (item, i) => `
        <tr class="item-row ${i % 2 === 0 ? 'striped-row' : ''}">
            <td style="width: 4%;">${item.sno}</td>
            <td style="width: 40%;">${item.description}</td>
            <td style="width: 8%; text-align: right;">${item.quantity}</td>
            <td style="width: 16%; text-align: right;">${money(
              item.pricePerUnit,
            )}</td>
            <td style="width: 8%; text-align: right;">${
              item.gstPercentage
            }%</td>
            <td style="width: 10%; text-align: right;">${money(
              item.lineTax,
            )}</td>
            <td style="width: 14%; text-align: right; font-weight: bold;">${money(
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
            <td style="text-align: right; padding-right: 10px;">GST:</td>
            <td style="text-align: right; width: 100px;">${money(
              totals.tax,
            )}</td>
        </tr>
    `
    : '';

  const totalsSection = `
        <div style="width: 250px; margin-left: auto; margin-top: 20px;">
            <div class="total-divider"></div>
            <table style="width: 100%; font-size: 10pt; color: ${TEXT};">
                <tr>
                    <td style="text-align: right; padding-right: 10px; padding-top: 5px;">Subtotal:</td>
                    <td style="text-align: right; width: 100px; padding-top: 5px;">${money(
                      totals.subtotal,
                    )}</td>
                </tr>
                ${gstTotalRow}
            </table>
            <table style="width: 100%; font-size: 12pt; color: ${PRIMARY}; margin-top: 5px;">
                <tr style="font-weight: bold;">
                    <td style="text-align: right; padding-right: 10px;">Total:</td>
                    <td style="text-align: right; width: 100px;">${money(
                      totals.invoiceTotal,
                    )}</td>
                </tr>
            </table>
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
                    color: ${TEXT};
                    font-size: 10pt;
                }
                .content { padding: 20px; }

                /* Header & Footer (to repeat on every page) */
                .header-content, .footer-content {
                    padding: 0 20px;
                }
                .header-content {
                    padding-bottom: 5px;
                    border-bottom: 0.6px solid ${BORDER_COLOR};
                }

                /* Fixed Header on every page */
                @page { 
                    @top-center { 
                        content: element(header-box); 
                    }
                    @bottom-center {
                        content: element(footer-box);
                    }
                    margin-top: 130px; /* Space for the header */
                    margin-bottom: 50px; /* Space for the footer */
                }

                #header { 
                    position: running(header-box);
                }
                #footer {
                    position: running(footer-box);
                }

                /* Table Styles */
                .item-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 10px; /* Aligns with billToY + 60 equivalent */
                    font-size: 9pt;
                }
                .table-head {
                    background-color: ${LIGHT_BG};
                    border-top: 0.6px solid #ced4de;
                    border-bottom: 0.6px solid #ced4de;
                    height: 10px;
                    font-weight: bold;
                    color: ${TEXT};
                }
                .item-row {
                    height: 14px; /* Matches ROW_H in jspdf */
                    border-bottom: 0.5px solid #dce0e6;
                }
                .striped-row {
                    background-color: ${LIGHT_BG};
                }
                .item-table th, .item-table td {
                    padding: 5px 2px; /* reduced padding for single-line text */
                    vertical-align: middle;
                }
                .total-divider {
                    border-top: 0.5px solid #d1d5db;
                    width: 120px;
                    margin-left: auto;
                }
                
                /* Footer contact and page number */
                .footer-text {
                    font-size: 8pt;
                    color: ${SECONDARY};
                    text-align: right;
                }
            </style>
        </head>
        <body>
            <div id="header">
                <div class="header-content">
                    <table style="width: 100%;">
                        <tr>
                            <td style="width: 50%; vertical-align: top;">
                                <div style="font-weight: bold; font-size: 16pt; color: ${PRIMARY}; margin-bottom: 5px;">
                                    ${invoiceData.company.name}
                                </div>
                                <div style="font-size: 9pt; color: ${SECONDARY};">${
    invoiceData.company.address
  }</div>
                                ${
                                  companyGSTIN
                                    ? `<div style="font-size: 9pt; color: ${SECONDARY};">GSTIN: ${companyGSTIN}</div>`
                                    : ''
                                }
                            </td>
                            <td style="width: 50%; text-align: right; vertical-align: top;">
                                <div style="font-weight: bold; font-size: 20pt; color: ${PRIMARY};">
                                    INVOICE
                                </div>
                                <div style="font-size: 10pt; color: ${SECONDARY};">No. ${
    invoiceData.invoice.number
  }</div>
                                <div style="font-size: 9pt; color: ${SECONDARY};">Date: ${
    invoiceData.invoice.date
  }</div>
                            </td>
                        </tr>
                    </table>

                    <div style="margin-top: 15px;">
                        <table style="width: 100%;">
                            <tr>
                                <td style="width: 50%; vertical-align: top;">
                                    <div style="font-weight: bold; font-size: 11pt; color: ${TEXT};">BILL TO:</div>
                                    <div style="font-weight: bold; font-size: 12pt; margin-top: 5px;">${
                                      invoiceData.party.name
                                    }</div>
                                    <div style="font-size: 10pt; color: ${SECONDARY}; white-space: pre-wrap;">${invoiceData.party.billingAddress.replace(
    /\n/g,
    '<br/>',
  )}</div>
                                    <div style="font-weight: bold; font-size: 11pt; color: ${TEXT}; margin-top: 5px;">SHIP TO:</div>
                                    <div style="font-size: 10pt; color: ${SECONDARY}; white-space: pre-wrap;">${invoiceData.party.shippingAddress.replace(
    /\n/g,
    '<br/>',
  )}</div>
                                </td>
                                <td style="width: 50%;"></td>
                            </tr>
                        </table>
                    </div>
                </div>
            </div>

            <div id="footer">
                <div class="footer-content">
                    <div style="margin-top: 10px;">
                        <div style="font-weight: bold; font-size: 10pt; color: ${TEXT};">Notes:</div>
                        <div style="font-size: 9pt; color: ${SECONDARY}; white-space: pre-wrap;">
                            ${renderNotes(transaction)} 
                        </div>
                    </div>
                    <div class="footer-text" style="margin-top: 5px;">
                        ${
                          invoiceData.company.contactLine
                        } | Page <span class="pageNumber"></span> of <span class="totalPages"></span>
                    </div>
                </div>
            </div>

            <div class="content">
                
                <table class="item-table" style="margin-top: 0;">
                    <thead>
                        <tr class="table-head">
                            <th style="width: 4%; text-align: left;">#</th>
                            <th style="width: 40%; text-align: left;">DESCRIPTION</th>
                            <th style="width: 8%; text-align: right;">QTY</th>
                            <th style="width: 16%; text-align: right;">PRICE</th>
                            <th style="width: 8%; text-align: right;">GST%</th>
                            <th style="width: 10%; text-align: right;">TAX</th>
                            <th style="width: 14%; text-align: right;">TOTAL</th>
                        </tr>
                    </thead>
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

export const generatePdfForTemplate4 = async (
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

  const invoiceData = {
    company: {
      name: company?.businessName || 'Your Company',
      address: company?.address || 'Company Address',
      email: company?.emailId || 'yourbusinessaccount@mail.com',
      phone: company?.mobileNumber || '123 456 789',
      contactLine: contactLine,
    },
    invoice: {
      number: invNo(transaction),
      date: transaction.date
        ? new Intl.DateTimeFormat('en-GB').format(new Date(transaction.date))
        : '01/10/2024',
    },
    party: {
      name: party?.name || 'Client Name',
      billingAddress,
      shippingAddress: shippingAddressStr,
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
    fileName: `Invoice_${invoiceData.invoice.number}`,
    directory: 'Documents',
    base64: false,
    padding: 20,
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
