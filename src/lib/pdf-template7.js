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
const PRIMARY_BLUE = '#264653'; // Dark Teal/Blue
const SECONDARY_GRAY = '#6c757d'; // Muted dark gray
const TEXT_COLOR = '#343a40'; // Near black
const LIGHT_BORDER = '#ced4da'; // Light gray
const BG_LIGHT = '#f8f9fa'; // Very light background
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
            <td style="text-align: left; padding: 4px 0;">GST TOTAL</td>
            <td style="text-align: right; font-weight: bold;">${money(
              totals.tax,
            )}</td>
        </tr>
    `
    : '';

  const totalsSection = `
        <div style="width: 250px; margin-left: auto; margin-top: 15px; font-size: 9pt;">
            <table style="width: 100%; color: ${TEXT_COLOR};">
                <tr>
                    <td style="text-align: left; padding: 4px 0;">SUBTOTAL</td>
                    <td style="text-align: right; font-weight: bold; width: 100px;">${money(
                      totals.subtotal,
                    )}</td>
                </tr>
                ${gstTotalRow}
            </table>
            
            <div style="margin-top: 10px; background-color: ${PRIMARY_BLUE}; color: ${WHITE}; padding: 5px 0;">
                <table style="width: 100%; font-size: 12pt; font-weight: bold;">
                    <tr>
                        <td style="text-align: left; padding-left: 5px; width: 60%;">GRAND TOTAL</td>
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
                    color: ${TEXT_COLOR};
                    font-size: 10pt;
                }
                .content { padding: 20px; padding-top: 0; }

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
                    margin-bottom: 70px; 
                }

                #header { 
                    position: running(header-box);
                    padding-bottom: 0;
                }
                #footer {
                    position: running(footer-box);
                    padding: 0 20px;
                }

                /* Header Styling */
                .header-bg {
                    background-color: ${BG_LIGHT};
                    padding: 20px;
                }
                .company-name { font-weight: bold; font-size: 16pt; color: ${PRIMARY_BLUE}; }
                .invoice-title { font-weight: bold; font-size: 28pt; color: ${TEXT_COLOR}; }
                
                /* Info Block Styling */
                .muted-info { font-size: 8pt; color: ${SECONDARY_GRAY}; }
                .info-block-box {
                    border: 0.2px solid ${LIGHT_BORDER};
                    background-color: ${BG_LIGHT};
                    padding: 5px;
                    font-size: 9pt;
                    color: ${TEXT_COLOR};
                }
                .info-label { font-weight: bold; color: ${PRIMARY_BLUE}; }

                /* Table Styling */
                .item-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 0;
                    font-size: 8pt;
                    border-left: 1px solid ${LIGHT_BORDER};
                    border-right: 1px solid ${LIGHT_BORDER};
                }
                .table-head {
                    background-color: ${PRIMARY_BLUE};
                    font-weight: bold;
                    color: ${WHITE};
                    height: 10px; /* Matches TABLE_HEADER_HEIGHT */
                    border-bottom: 0.2px solid ${LIGHT_BORDER};
                }
                .item-row {
                    height: 10px; /* Matches ROW_H in jspdf */
                    border-bottom: 0.1px solid ${LIGHT_BORDER};
                }
                .striped-row {
                    background-color: ${BG_LIGHT};
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
                <div class="header-bg">
                    <table style="width: 100%;">
                        <tr>
                            <td style="width: 50%; vertical-align: top;">
                                <div class="company-name">${invoiceData.company.name.toUpperCase()}</div>
                            </td>
                            <td style="width: 50%; text-align: right; vertical-align: top;">
                                <div class="invoice-title">INVOICE</div>
                            </td>
                        </tr>
                    </table>
                </div>
                <div style="border-top: 0.8px solid ${LIGHT_BORDER}; margin: 0 20px;"></div>

                <table style="width: 100%; margin: 20px 20px 0 20px;">
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
                        <td style="width: 50%; vertical-align: top; text-align: left;">
                            <div style="width: 160px; margin-left: auto;">
                                <div class="info-block-box">
                                    <table style="width: 100%; border-collapse: collapse;">
                                        <tr>
                                            <td class="info-label" style="width: 50%;">INVOICE NO:</td>
                                            <td style="text-align: right; font-weight: bold;">${
                                              invoiceData.invoiceNumber
                                            }</td>
                                        </tr>
                                        <tr>
                                            <td class="info-label">DATE:</td>
                                            <td style="text-align: right;">${
                                              invoiceData.date
                                            }</td>
                                        </tr>
                                    </table>
                                </div>
                            </div>
                            

                            <div style="width: 160px; margin-left: auto; margin-top: 10px; font-size: 9pt;">
                                <div style="font-weight: bold; color: ${PRIMARY_BLUE};">BILL TO:</div>
                                <div style="font-weight: bold; color: ${TEXT_COLOR};">${
    invoiceData.invoiceTo.name
  }</div>
                                <div class="muted-info">${invoiceData.invoiceTo.billingAddress.replace(
                                  /\n/g,
                                  '<br/>',
                                )}</div>
                                
                                <div style="font-weight: bold; color: ${PRIMARY_BLUE}; margin-top: 5px;">SHIP TO:</div>
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
                            </div>
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
                <div style="border-top: 1px solid ${PRIMARY_BLUE}; margin-top: 5px;"></div>
                <table style="width: 100%; margin-top: 5px;">
                    <tr>
                        <td style="width: 70%; vertical-align: top;">
                            <div style="font-weight: bold; font-size: 9pt; color: ${TEXT_COLOR};">Notes/Terms:</div>
                            <div style="font-size: 8pt; color: ${SECONDARY_GRAY}; white-space: pre-wrap;">
                                ${renderNotes(transaction)} 
                            </div>
                        </td>
                        <td style="width: 30%; vertical-align: top; text-align: right;">
                            <div style="font-size: 8pt; color: ${SECONDARY_GRAY}; margin-top: 5px;">
                                ${invoiceData.company.address} | ${
    invoiceData.company.email
  } | ${invoiceData.company.phone}
                            </div>
                            <div style="font-size: 8pt; color: ${SECONDARY_GRAY}; margin-top: 5px;">
                                Page <span class="pageNumber"></span> of <span class="totalPages"></span>
                            </div>
                        </td>
                    </tr>
                </table>
            </div>

            <div class="content">
                
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

export const generatePdfForTemplate7 = async (
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
    invoiceNumber: invNo(transaction),
    date: transaction.date
      ? new Intl.DateTimeFormat('en-GB').format(new Date(transaction.date))
      : '01 / 10 / 2024',
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
    throw new Error('Failed to generate PDF.');
  }
};
