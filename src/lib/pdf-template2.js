// Remove TypeScript imports and types for pure JS environment

import {
  deriveTotals,
  formatCurrency,
  renderNotes,
  invNo,
  getCompanyGSTIN,
  getUnifiedLines,
  getBillingAddress,
  getShippingAddress,
} from './pdf-utils';

import RNHTMLtoPDF from 'react-native-html-to-pdf';
import { BASE_URL } from '../config';
// --- Utility Functions (Identical to Web helpers for data prep) ---

const getItemsBodyTemplate2 = (transaction, serviceNameById) => {
  const lines = getUnifiedLines(transaction, serviceNameById);

  if (lines.length === 0) {
    const amt = Number(transaction.amount ?? 0);
    const gstPct = Number(transaction?.gstPercentage ?? 0);
    const tax = (amt * gstPct) / 100;
    const total = amt + tax;

    return [
      {
        sno: '1',
        description: transaction.description || 'Item',
        code: '',
        quantity: 1,
        gstPercentage: gstPct,
        pricePerUnit: amt,
        lineTax: tax,
        lineTotal: total,
      },
    ];
  }

  return lines.map((item, index) => ({
    sno: (index + 1).toString(),
    description: `${item.name}${
      item.description ? ' - ' + item.description : ''
    }`,
    code: item.code || '',
    quantity: item.itemType === 'service' ? '-' : item.quantity || 1,
    gstPercentage: item.gstPercentage || 0,
    pricePerUnit: Number(item.pricePerUnit || item.amount),
    lineTax: item.lineTax || 0,
    lineTotal: item.lineTotal || item.amount || 0,
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
  // Convert data to table rows
  const itemRows = itemsForTable
    .map(
      item => `
        <tr style="border-bottom: 1px solid #ccc;">
            <td style="width: 5%;">${item.sno}</td>
            <td style="width: 35%;">${item.description}</td>
            <td style="width: 10%;">${item.code}</td>
            <td style="width: 10%; text-align: right;">${item.quantity}</td>
            <td style="width: 10%; text-align: right;">${
              item.gstPercentage
            }%</td>
            <td style="width: 10%; text-align: right;">${formatCurrency(
              item.pricePerUnit,
            )}</td>
            <td style="width: 10%; text-align: right;">${formatCurrency(
              item.lineTax,
            )}</td>
            <td style="width: 10%; text-align: right;">${formatCurrency(
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
            <td style="text-align: right; padding-right: 10px;">GST Total</td>
            <td style="text-align: right; width: 100px;">${formatCurrency(
              totals.tax,
            )}</td>
        </tr>
    `
    : '';

  const totalsSection = `
        <table style="width: 250px; margin-left: auto; margin-top: 15px; font-size: 10pt;">
            <tr>
                <td style="text-align: right; padding-right: 10px;">Sub Total</td>
                <td style="text-align: right; width: 100px;">${formatCurrency(
                  totals.subtotal,
                )}</td>
            </tr>
            ${gstTotalRow}
            <tr style="font-weight: bold; border-top: 1px solid #000; padding-top: 5px;">
                <td style="text-align: right; padding-right: 10px;">GRAND TOTAL</td>
                <td style="text-align: right; width: 100px;">${formatCurrency(
                  totals.invoiceTotal,
                )}</td>
            </tr>
        </table>
    `;

  // Notes/Footer is placed near the bottom
  const notesAndFooter = `
        <div style="margin-top: 30px; border-top: 1px solid #ccc; padding-top: 10px;">
            <p style="font-size: 10pt; font-weight: bold;">Notes/Terms:</p>
            <div style="white-space: pre-wrap; font-size: 9pt; color: #555;">
                ${renderNotes(transaction)} 
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
                    font-size: 10pt;
                }
                .header-line { border-bottom: 1px solid #000; margin: 15px 0; }
                .client-info p { margin: 0; line-height: 1.5; }
                
                .item-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 30px;
                    border: 1px solid #ccc; /* Match jspdf grid theme */
                }
                .item-table th, .item-table td {
                    padding: 8px;
                    border: 1px solid #ccc;
                    text-align: left;
                }
                .item-table th {
                    background-color: #eee; /* Match jspdf headStyles */
                    font-weight: bold;
                    color: #000;
                    font-size: 10pt;
                }
            </style>
        </head>
        <body>
            <div style="padding: 10px 20px;">
                <table style="width: 100%;">
                    <tr>
                        <td style="width: 60%; vertical-align: top;">
                            <h1 style="font-size: 22pt; margin: 0;">${
                              invoiceData.company.name
                            }</h1>
                            <p style="font-size: 10pt; margin-top: 5px;">${
                              invoiceData.company.email
                            }</p>
                            <p style="font-size: 10pt;">${
                              invoiceData.company.phone
                            }</p>
                            ${
                              companyGSTIN
                                ? `<p style="font-size: 10pt;">GSTIN: ${companyGSTIN}</p>`
                                : ''
                            }
                        </td>
                        <td style="width: 40%; text-align: right; vertical-align: top;">
                            <h2 style="font-size: 18pt; margin: 0;">Invoice ${
                              invoiceData.invoice.number
                            }</h2>
                            <p style="font-size: 10pt; margin-top: 5px;">Issued: ${
                              invoiceData.invoice.date
                            }</p>
                            <p style="font-size: 10pt;">Payment Due: ${
                              invoiceData.invoice.dueDate
                            }</p>
                        </td>
                    </tr>
                </table>

                <div class="header-line"></div>

                <div class="client-info">
                    <p style="font-size: 14pt; font-weight: bold;">${
                      invoiceData.party.name
                    }</p>
                    ${
                      invoiceData.party.email
                        ? `<p>${invoiceData.party.email}</p>`
                        : ''
                    }
                    <p style="font-weight: bold; margin-top: 10px;">Bill To:</p>
                    <div style="white-space: pre-wrap;">${invoiceData.party.billingAddress.replace(
                      /\n/g,
                      '<br/>',
                    )}</div>
                    <p style="font-weight: bold; margin-top: 5px;">Ship To:</p>
                    <div style="white-space: pre-wrap;">${invoiceData.party.shippingAddress.replace(
                      /\n/g,
                      '<br/>',
                    )}</div>
                </div>

                <table class="item-table">
                    <thead>
                        <tr>
                            <th style="width: 5%;">S.No.</th>
                            <th style="width: 35%;">Item Description</th>
                            <th style="width: 10%;">HSN/SAC</th>
                            <th style="width: 10%; text-align: right;">Qty</th>
                            <th style="width: 10%; text-align: right;">GST%</th>
                            <th style="width: 10%; text-align: right;">Rate</th>
                            <th style="width: 10%; text-align: right;">Tax</th>
                            <th style="width: 10%; text-align: right;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemRows}
                    </tbody>
                </table>

                ${totalsSection}
                ${notesAndFooter}
            </div>
            
            <div style="position: fixed; bottom: 20px; right: 20px; font-size: 9pt; color: #777;">
                </div>
        </body>
        </html>
    `;
};

// --- Main Exported React Native Function ---

export const generatePdfForTemplate2 = async (
  transaction,
  company,
  party,
  serviceNameById,
  shippingAddress,
) => {
  // Data Processing
  const totals = deriveTotals(transaction, company, serviceNameById);
  const companyGSTIN = getCompanyGSTIN(company);

  const billingAddress = getBillingAddress(party);
  const shippingAddressStr = getShippingAddress(
    shippingAddress,
    billingAddress,
  );

  const dueDate = new Intl.DateTimeFormat('en-US').format(
    new Date(
      new Date(transaction.date).setDate(
        new Date(transaction.date).getDate() + 30,
      ),
    ),
  );

  const invoiceData = {
    company: {
      name: company?.businessName || 'Your Company',
      email: company?.emailId || 'yourbusinessaccount@mail.com',
      phone: company?.mobileNumber || '123 456 789',
    },
    invoice: {
      number: invNo(transaction),
      date: new Intl.DateTimeFormat('en-US').format(new Date(transaction.date)),
      dueDate: dueDate,
    },
    party: {
      name: party?.name || 'Client Name',
      billingAddress,
      shippingAddress: shippingAddressStr,
      email: party?.email || '',
    },
  };

  const itemsForTable = getItemsBodyTemplate2(transaction, serviceNameById);

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
    throw new Error('Failed to generate PDF.');
  }
};
