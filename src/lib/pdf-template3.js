// pdf-template3.js
import { generatePDF } from 'react-native-html-to-pdf';
import {
  getUnifiedLines,
  getBillingAddress,
  getShippingAddress,
} from './pdf-utils';

// --- Utility Functions ---

const getCompanyGSTIN = company => {
  if (!company) return null;

  // Try different possible GSTIN fields
  const fields = [
    company.gstin,
    company.gstIn,
    company.gstNumber,
    company.gst_no,
    company.gst,
    company.gstinNumber,
    company?.tax?.gstin,
  ];

  for (const field of fields) {
    if (field && typeof field === 'string' && field.trim()) {
      return field.trim();
    }
  }

  return null;
};

const deriveTotals = (transaction, company, serviceNameById) => {
  const lines = getUnifiedLines(transaction, serviceNameById);

  const subtotal = lines.reduce((sum, item) => {
    return sum + (Number(item.amount) || 0);
  }, 0);

  const tax = lines.reduce((sum, item) => {
    return sum + (Number(item.lineTax) || 0);
  }, 0);

  const invoiceTotal = lines.reduce((sum, item) => {
    return sum + (Number(item.lineTotal) || 0);
  }, 0);

  const companyGSTIN = getCompanyGSTIN(company);
  const gstEnabled = tax > 0 && companyGSTIN;

  return { lines, subtotal, tax, invoiceTotal, gstEnabled };
};

const formatMoney = amount => {
  return `₹${Number(amount || 0).toLocaleString('en-IN')}`;
};

const formatDate = dateString => {
  try {
    if (!dateString) return 'N/A';
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(dateString));
  } catch (error) {
    return dateString || 'N/A';
  }
};

// --- Main Template Component ---
const Template3 = ({
  transaction,
  company,
  party,
  shippingAddress,
  serviceNameById,
}) => {
  // Calculate totals
  const { lines, subtotal, tax, invoiceTotal, gstEnabled } = deriveTotals(
    transaction,
    company,
    serviceNameById,
  );

  const companyGSTIN = getCompanyGSTIN(company);

  const billingAddress = getBillingAddress(party);
  const shippingAddressStr = getShippingAddress(
    shippingAddress,
    billingAddress,
  );

  // Prepare invoice data
  const invoiceData = {
    invoiceNumber: transaction.invoiceNumber || 'N/A',
    date: formatDate(transaction.date),
    company: {
      name: company?.businessName || 'Your Company',
      address: company?.address || 'Your Address',
      email: company?.emailId || 'yourbusinessaccount@mail.com',
      phone: company?.mobileNumber || '123 456 789',
    },
    party: {
      name: party?.name || 'Client Name',
      billingAddress,
      shippingAddress: shippingAddressStr,
      email: party?.email || '',
    },
  };

  // Prepare items for table
  let itemsForTable = lines.map((item, index) => ({
    sno: (index + 1).toString(),
    description: `${item.name}${
      item.description ? ' — ' + item.description : ''
    }`,
    code: item.code || '',
    quantity: item.itemType === 'service' ? '-' : item.quantity || 1,
    pricePerUnit: Number(item.pricePerUnit || item.amount || 0),
    gstPercentage: item.gstPercentage || 0,
    lineTax: Number(item.lineTax || 0),
    lineTotal: Number(item.lineTotal || item.amount || 0),
  }));

  // Fallback if no items
  if (itemsForTable.length === 0) {
    const amount = Number(transaction.amount ?? 0);
    const gstPct = Number(transaction?.gstPercentage ?? 0);
    const lineTax = (amount * gstPct) / 100;
    const lineTotal = amount + lineTax;

    itemsForTable.push({
      sno: '1',
      description: transaction.description || 'Item',
      code: '',
      quantity: 1,
      pricePerUnit: amount,
      gstPercentage: gstPct,
      lineTax,
      lineTotal,
    });
  }

  // Generate HTML
  const generateHTML = () => {
    // Generate table rows
    const itemRows = itemsForTable
      .map(
        item => `
      <tr style="border-bottom: 1px solid #e0e0e0;">
        <td style="padding: 8px; text-align: center; font-size: 10px; width: 5%;">${
          item.sno
        }</td>
        <td style="padding: 8px; font-size: 10px; width: 30%;">${
          item.description
        }</td>
        <td style="padding: 8px; font-size: 10px; width: 10%; text-align: center;">${
          item.code
        }</td>
        <td style="padding: 8px; font-size: 10px; width: 8%; text-align: right;">${
          item.quantity
        }</td>
        <td style="padding: 8px; font-size: 10px; width: 12%; text-align: right;">${formatMoney(
          item.pricePerUnit,
        )}</td>
        <td style="padding: 8px; font-size: 10px; width: 8%; text-align: right;">${
          item.gstPercentage
        }%</td>
        <td style="padding: 8px; font-size: 10px; width: 12%; text-align: right;">${formatMoney(
          item.lineTax,
        )}</td>
        <td style="padding: 8px; font-size: 10px; width: 15%; text-align: right; font-weight: bold;">${formatMoney(
          item.lineTotal,
        )}</td>
      </tr>
    `,
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          
          body {
            font-family: 'Helvetica', 'Arial', sans-serif;
            margin: 0;
            padding: 0;
            color: #1d2c4a;
            background: white;
            font-size: 12px;
            line-height: 1.4;
          }
          
          .page {
            position: relative;
            min-height: 100vh;
            padding: 20px;
          }
          
          /* Header Strip */
          .header-strip {
            background-color: #1d2c4a;
            color: #ccb57a;
            padding: 10px 15px;
            margin-bottom: 20px;
            border-radius: 4px;
          }
          
          .company-name {
            font-size: 16px;
            font-weight: bold;
            letter-spacing: 1.5px;
            text-align: center;
            text-transform: uppercase;
          }
          
          .gstin-badge {
            background-color: #1d2c4a;
            color: white;
            padding: 4px 8px;
            border-radius: 3px;
            font-size: 9px;
            display: inline-block;
            margin-top: 5px;
          }
          
          /* Header Section */
          .header-section {
            display: flex;
            justify-content: space-between;
            margin-bottom: 25px;
          }
          
          .bill-to {
            flex: 1;
          }
          
          .bill-to-label {
            font-size: 10px;
            font-weight: bold;
            color: #293042;
            margin-bottom: 5px;
          }
          
          .client-name {
            font-size: 12px;
            font-weight: bold;
            margin-bottom: 8px;
          }
          
          .address-block {
            font-size: 10px;
            color: #6e7789;
            margin-bottom: 12px;
            line-height: 1.4;
          }
          
          .invoice-info {
            text-align: right;
          }
          
          .invoice-number {
            font-size: 12px;
            font-weight: bold;
            color: #293042;
            margin-bottom: 5px;
          }
          
          .invoice-date {
            font-size: 10px;
            color: #6e7789;
          }
          
          /* Items Table */
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            margin-bottom: 30px;
          }
          
          .table-header {
            background-color: #f7f9fc;
            border-top: 1px solid #c4c8d0;
            border-bottom: 1px solid #ced4de;
          }
          
          .table-header th {
            padding: 10px;
            text-align: left;
            font-size: 10.5px;
            font-weight: bold;
            color: #1d2c4a;
            border-bottom: 1px solid #ced4de;
          }
          
          .table-header th.text-right {
            text-align: right;
          }
          
          .table-header th.text-center {
            text-align: center;
          }
          
          /* Totals Section */
          .totals-section {
            margin-top: 30px;
            border-top: 1px solid #dcdcdc;
            padding-top: 15px;
          }
          
          .totals-table {
            width: 300px;
            margin-left: auto;
            border-collapse: collapse;
          }
          
          .totals-table tr {
            border-bottom: 1px solid #f0f0f0;
          }
          
          .totals-table td {
            padding: 6px 0;
            font-size: 11px;
          }
          
          .subtotal-label,
          .gst-label {
            text-align: right;
            padding-right: 15px;
            font-weight: bold;
            color: #293042;
          }
          
          .subtotal-value,
          .gst-value {
            text-align: right;
            width: 120px;
            color: #293042;
          }
          
          .grand-total {
            border-top: 2px solid #1d2c4a;
            padding-top: 10px;
            margin-top: 10px;
          }
          
          .grand-total-label {
            text-align: right;
            padding-right: 15px;
            font-weight: bold;
            color: #1d2c4a;
            font-size: 12.5px;
          }
          
          .grand-total-value {
            text-align: right;
            width: 120px;
            font-weight: bold;
            color: #1d2c4a;
            font-size: 12.5px;
          }
          
          /* Footer */
          .footer {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            background-color: #1d2c4a;
            color: white;
            padding: 12px 20px;
            margin-top: 30px;
          }
          
          .footer-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 9px;
          }
          
          .footer-item {
            display: flex;
            align-items: center;
            gap: 8px;
          }
          
          .footer-bullet {
            width: 6px;
            height: 6px;
            background-color: #ccb57a;
            border-radius: 50%;
            flex-shrink: 0;
          }
          
          .footer-text {
            flex: 1;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 200px;
          }
          
          /* Utility Classes */
          .text-right {
            text-align: right;
          }
          
          .text-center {
            text-align: center;
          }
          
          .text-bold {
            font-weight: bold;
          }
          
          .mb-10 {
            margin-bottom: 10px;
          }
          
          .mb-15 {
            margin-bottom: 15px;
          }
          
          .mb-20 {
            margin-bottom: 20px;
          }
          
          .mt-10 {
            margin-top: 10px;
          }
          
          .mt-20 {
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="page">
          <!-- Header Strip -->
          <div class="header-strip">
            <div class="company-name">
              ${(invoiceData.company.name || '')
                .toUpperCase()
                .split('')
                .join(' ')}
            </div>
            ${
              companyGSTIN
                ? `<div class="gstin-badge">GSTIN: ${companyGSTIN}</div>`
                : ''
            }
          </div>
          
          <!-- Header Section -->
          <div class="header-section">
            <div class="bill-to">
              <div class="bill-to-label">BILL TO:</div>
              <div class="client-name">${invoiceData.party.name}</div>
              ${
                invoiceData.party.email
                  ? `<div class="address-block">${invoiceData.party.email}</div>`
                  : ''
              }
              <div class="address-block">${invoiceData.party.billingAddress.replace(
                /\n/g,
                '<br>',
              )}</div>
              
              <div class="bill-to-label mt-10">SHIP TO:</div>
              <div class="address-block">${invoiceData.party.shippingAddress.replace(
                /\n/g,
                '<br>',
              )}</div>
            </div>
            
            <div class="invoice-info">
              <div class="invoice-number">INVOICE NO. ${
                invoiceData.invoiceNumber
              }</div>
              <div class="invoice-date">DATE ${invoiceData.date}</div>
            </div>
          </div>
          
          <!-- Items Table -->
          <table class="items-table">
            <thead class="table-header">
              <tr>
                <th style="width: 5%;">S.No.</th>
                <th style="width: 30%;">ITEM</th>
                <th style="width: 10%;" class="text-center">HSN/SAC</th>
                <th style="width: 8%;" class="text-right">QTY</th>
                <th style="width: 12%;" class="text-right">PRICE</th>
                <th style="width: 8%;" class="text-right">GST%</th>
                <th style="width: 12%;" class="text-right">TAX</th>
                <th style="width: 15%;" class="text-right">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows}
            </tbody>
          </table>
          
          <!-- Totals Section -->
          <div class="totals-section">
            <table class="totals-table">
              <tr>
                <td class="subtotal-label">SUBTOTAL</td>
                <td class="subtotal-value">${formatMoney(subtotal)}</td>
              </tr>
              ${
                gstEnabled
                  ? `
                <tr>
                  <td class="gst-label">GST TOTAL</td>
                  <td class="gst-value">${formatMoney(tax)}</td>
                </tr>
              `
                  : ''
              }
              <tr class="grand-total">
                <td class="grand-total-label">GRAND TOTAL:</td>
                <td class="grand-total-value">${formatMoney(invoiceTotal)}</td>
              </tr>
            </table>
          </div>
          
          <!-- Footer -->
          <div class="footer">
            <div class="footer-content">
              <div class="footer-item">
                <div class="footer-bullet"></div>
                <div class="footer-text">${invoiceData.company.address}</div>
              </div>
              <div class="footer-item">
                <div class="footer-bullet"></div>
                <div class="footer-text">${invoiceData.company.email}</div>
              </div>
              <div class="footer-item">
                <div class="footer-bullet"></div>
                <div class="footer-text">${invoiceData.company.phone}</div>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  return generateHTML();
};

// --- PDF Generation Function ---
export const generatePdfForTemplate3 = async (
  transaction,
  company,
  party,
  serviceNameById,
  shippingAddress,
) => {
  try {
    console.log('🟡 PDF Generation Started - Template3');

    const htmlContent = Template3({
      transaction,
      company,
      party,
      shippingAddress,
      serviceNameById,
    });

    console.log('🟢 HTML Content Generated Successfully');
    console.log('HTML Length:', htmlContent.length);

    const options = {
      html: htmlContent,
      fileName: `invoice_${transaction.invoiceNumber || 'document'}_template3`,
      directory: 'Documents',
      width: 595, // A4 width in points
      height: 842, // A4 height in points
      base64: true,
    };

    const file = await generatePDF(options);
    console.log('🟢 PDF Generated Successfully!');

    // Return an object with output method for compatibility
    return {
      ...file,
      output: (format = 'base64') => {
        if (format === 'base64') return file.base64;
        if (format === 'filePath') return file.filePath;
        return file.base64;
      },
    };
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};
