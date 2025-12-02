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
const DARK_TEXT = '#323232'; // Near black
const ACCENT_GOLD = '#b8975d'; // Refined gold/tan
const LIGHT_GRAY_BG = '#f8f8f8'; // Subtle background
const DIVIDER_LINE = '#dcdcdc'; // Light gray for dividers
const MUTED_INFO = '#787878'; // Muted color for secondary info
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
      (item, i) => `
        <tr class="item-row ${i % 2 !== 0 ? 'striped-row' : ''}">
            <td style="width: 4%;">${item.sno}</td>
            <td style="width: 45%;">${item.description}</td>
            <td style="width: 8%; text-align: right;">${item.quantity}</td>
            <td style="width: 10%; text-align: right;">${money(
              item.pricePerUnit,
            )}</td>
            <td style="width: 8%; text-align: right;">${
              item.gstPercentage
            }%</td>
            <td style="width: 10%; text-align: right;">${money(
              item.lineTax,
            )}</td>
            <td style="width: 15%; text-align: right; font-weight: bold;">${money(
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
            <td style="text-align: right; padding: 4px 5px 4px 0;">GST TOTAL</td>
            <td style="text-align: right; font-weight: bold; width: 100px;">${money(
              totals.tax,
            )}</td>
        </tr>
    `
    : '';

  const totalsSection = `
        <div style="width: 250px; margin-left: auto; margin-top: 15px; font-size: 10pt;">
            <table style="width: 100%; color: ${DARK_TEXT};">
                <tr>
                    <td style="text-align: right; padding: 4px 5px 4px 0;">SUBTOTAL</td>
                    <td style="text-align: right; font-weight: bold; width: 100px;">${money(
                      totals.subtotal,
                    )}</td>
                </tr>
                ${gstTotalRow}
            </table>
            
            <div style="margin-top: 10px; border: 0.5px solid ${ACCENT_GOLD}; background-color: ${LIGHT_GRAY_BG};">
                <table style="width: 100%; font-size: 12pt; font-weight: bold;">
                    <tr>
                        <td style="text-align: right; padding: 5px 5px 5px 0; color: ${ACCENT_GOLD};">GRAND TOTAL</td>
                        <td style="text-align: right; padding: 5px 2px 5px 0; color: ${ACCENT_GOLD}; width: 100px;">${money(
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
                    color: ${DARK_TEXT};
                    font-size: 10pt;
                }
                .content { padding: 20px; }

                /* Fixed Header on every page */
                @page { 
                    @top-center { 
                        content: element(header-box); 
                    }
                    @bottom-center {
                        content: element(footer-box);
                    }
                    /* Margins adjusted for fixed header/footer heights */
                    margin-top: 160px; 
                    margin-bottom: 50px; 
                }

                #header { 
                    position: running(header-box);
                    padding: 20px;
                    padding-bottom: 0;
                }
                #footer {
                    position: running(footer-box);
                    padding: 0 20px;
                }
                
                /* Header Styling */
                .muted-info { font-size: 8pt; color: ${MUTED_INFO}; }

                /* Table Styling */
                .item-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 2px;
                    font-size: 8pt;
                    border-bottom: 0.2px solid ${DIVIDER_LINE};
                }
                .table-head {
                    font-weight: bold;
                    color: ${DARK_TEXT};
                    height: 8px; /* Matches TABLE_HEADER_HEIGHT */
                }
                .item-row {
                    height: 10px; /* Matches ROW_H in jspdf */
                    border-bottom: 0.1px solid ${LIGHT_GRAY_BG};
                }
                .striped-row {
                    background-color: ${LIGHT_GRAY_BG};
                }
                .item-table th, .item-table td {
                    padding: 3px 2px;
                    vertical-align: middle;
                    overflow: hidden;
                }
            </style>
        </head>
        <body>
            <div id="header">
                
                <table style="width: 100%;">
                    <tr>
                        <td style="width: 50%; vertical-align: top;">
                            <div style="font-weight: bold; font-size: 18pt; color: ${ACCENT_GOLD};">${invoiceData.company.name.toUpperCase()}</div>
                        </td>
                        <td style="width: 50%; text-align: right; vertical-align: top;">
                            <div style="font-weight: bold; font-size: 24pt; color: ${DARK_TEXT};">INVOICE</div>
                        </td>
                    </tr>
                </table>
                <div style="border-top: 0.5px solid ${DIVIDER_LINE}; margin-top: 5px;"></div>

                <table style="width: 100%; margin-top: 15px;">
                    <tr>
                        <td style="width: 50%; vertical-align: top;">
                            <div class="muted-info">${invoiceData.company.address.replace(
                              /\n/g,
                              '<br/>',
                            )}</div>
                            <div class="muted-info" style="margin-top: 4px;">Email: ${
                              invoiceData.company.email
                            }</div>
                            <div class="muted-info">Phone: ${
                              invoiceData.company.phone
                            }</div>
                            ${
                              companyGSTIN
                                ? `<div class="muted-info">GSTIN: ${companyGSTIN}</div>`
                                : ''
                            }
                        </td>
                        <td style="width: 50%; vertical-align: top; text-align: right;">
                            <table style="margin-left: auto;">
                                <tr>
                                    <td style="text-align: right; font-weight: bold; font-size: 9pt; color: ${DARK_TEXT};">Invoice No:</td>
                                    <td style="text-align: right; font-size: 9pt; color: ${DARK_TEXT}; padding-left: 5px;">${
    invoiceData.invoiceNumber
  }</td>
                                </tr>
                                <tr>
                                    <td style="text-align: right; font-weight: bold; font-size: 9pt; color: ${DARK_TEXT};">Date:</td>
                                    <td style="text-align: right; font-size: 9pt; color: ${DARK_TEXT}; padding-left: 5px;">${
    invoiceData.date
  }</td>
                                </tr>
                            </table>

                            <div style="font-weight: bold; font-size: 10pt; color: ${DARK_TEXT}; margin-top: 10px;">BILL TO:</div>
                            <div style="font-weight: bold; font-size: 9pt; color: ${DARK_TEXT}; margin-top: 5px;">${
    invoiceData.invoiceTo.name
  }</div>
                            <div class="muted-info">${invoiceData.invoiceTo.billingAddress.replace(
                              /\n/g,
                              '<br/>',
                            )}</div>
                            
                            <div style="font-weight: bold; font-size: 10pt; color: ${DARK_TEXT}; margin-top: 5px;">SHIP TO:</div>
                            <div class="muted-info">${invoiceData.invoiceTo.shippingAddress.replace(
                              /\n/g,
                              '<br/>',
                            )}</div>
                            ${
                              invoiceData.invoiceTo.email
                                ? `<div class="muted-info">${invoiceData.invoiceTo.email}</div>`
                                : ''
                            }
                            ${
                              invoiceData.invoiceTo.gstin
                                ? `<div class="muted-info">GSTIN: ${invoiceData.invoiceTo.gstin}</div>`
                                : ''
                            }
                        </td>
                    </tr>
                </table>

                <table class="item-table" style="margin-top: 15px;">
                    <thead>
                        <tr class="table-head">
                            <th style="width: 4%; text-align: left; padding-left: 5px;">S.No.</th>
                            <th style="width: 45%; text-align: left;">ITEM DESCRIPTION</th>
                            <th style="width: 8%; text-align: right;">QTY</th>
                            <th style="width: 10%; text-align: right;">RATE</th>
                            <th style="width: 8%; text-align: right;">GST%</th>
                            <th style="width: 10%; text-align: right;">TAX</th>
                            <th style="width: 15%; text-align: right; padding-right: 5px;">TOTAL</th>
                        </tr>
                    </thead>
                </table>
            </div>

            <div id="footer">
                <div style="border-top: 0.5px solid ${DIVIDER_LINE}; margin-top: 5px;"></div>
                <table style="width: 100%; margin-top: 5px;">
                    <tr>
                        <td style="width: 50%; vertical-align: top;">
                            <div style="font-weight: bold; font-size: 9pt; color: ${DARK_TEXT};">Notes/Terms:</div>
                            <div style="font-size: 8pt; color: ${MUTED_INFO}; white-space: pre-wrap;">
                                ${renderNotes(transaction)} 
                            </div>
                        </td>
                        <td style="width: 50%; vertical-align: top; text-align: right;">
                            <div class="muted-info">${
                              invoiceData.company.address
                            }</div>
                            <div class="muted-info">${
                              invoiceData.company.email
                            } | ${invoiceData.company.phone}</div>
                            <div class="muted-info" style="margin-top: 5px;">
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

export const generatePdfForTemplate6 = async (
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

  const partyGSTIN = _getCompanyGSTIN(party);

  const invoiceData = {
    company: {
      name: company?.businessName || 'Your Company Name',
      address: company?.address || '123 Business Lane, City, State - 123456',
      email: company?.emailId || 'contact@yourcompany.com',
      phone: company?.mobileNumber || '+91 98765 43210',
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
