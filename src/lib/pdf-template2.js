// pdf-template2.js
import { generatePDF } from 'react-native-html-to-pdf';
import {
  deriveTotals,
  formatCurrency,
  getBillingAddress,
  getShippingAddress,
  getUnifiedLines,
  getCompanyGSTIN,
} from './pdf-utils';

// --- Utility Functions ---

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

// Safe Phone Number Formatting
const safeFormatPhoneNumber = phoneNumber => {
  try {
    if (!phoneNumber) return '-';
    return String(phoneNumber).trim();
  } catch (error) {
    console.error('Error formatting phone number:', error);
    return phoneNumber || '-';
  }
};

// Safe Date Formatting
const formatDateSafe = (dateString, formatType = 'en-IN') => {
  try {
    if (!dateString) return '-';
    return new Intl.DateTimeFormat(formatType).format(new Date(dateString));
  } catch (error) {
    return dateString || '-';
  }
};

// --- Main PDF Component ---
const Template2 = ({
  transaction,
  company,
  party,
  shippingAddress,
  serviceNameById,
}) => {
  // Data Processing
  const totals = deriveTotals(transaction, company, serviceNameById);
  const companyGSTIN = getCompanyGSTIN(company);

  const billingAddress = getBillingAddress(party);
  const shippingAddressStr = getShippingAddress(
    shippingAddress,
    billingAddress,
  );

  // Calculate due date (30 days from transaction date)
  const dueDate = new Date(transaction.date);
  dueDate.setDate(dueDate.getDate() + 30);

  const invoiceData = {
    company: {
      name: company?.businessName || company?.companyName || 'Your Company',
      email: company?.emailId || 'yourbusinessaccount@mail.com',
      phone: company?.mobileNumber || company?.Telephone || '123 456 789',
      address: [
        company?.address,
        company?.City,
        company?.addressState,
        company?.Country,
        company?.Pincode,
      ]
        .filter(Boolean)
        .join(', '),
    },
    invoice: {
      number: transaction.invoiceNumber || 'N/A',
      date: formatDateSafe(transaction.date),
      dueDate: formatDateSafe(dueDate),
    },
    party: {
      name: party?.name || 'Client Name',
      billingAddress,
      shippingAddress: shippingAddressStr,
      email: party?.email || '',
      phone: party?.contactNumber || '',
      gstin: party?.gstin || '',
    },
  };

  const itemsForTable = getItemsBodyTemplate2(transaction, serviceNameById);

  // Generate HTML content for PDF
  const generateHTML = () => {
    // Convert data to table rows
    const itemRows = itemsForTable
      .map(
        item => `
          <tr style="border-bottom: 1px solid #ccc;">
              <td style="width: 5%; text-align: center; padding: 4px;">${
                item.sno
              }</td>
              <td style="width: 35%; padding: 4px 8px;">${item.description}</td>
              <td style="width: 10%; text-align: center; padding: 4px;">${
                item.code
              }</td>
              <td style="width: 10%; text-align: right; padding: 4px;">${
                item.quantity
              }</td>
              <td style="width: 10%; text-align: right; padding: 4px;">${
                item.gstPercentage
              }%</td>
              <td style="width: 10%; text-align: right; padding: 4px;">${formatCurrency(
                item.pricePerUnit,
              )}</td>
              <td style="width: 10%; text-align: right; padding: 4px;">${formatCurrency(
                item.lineTax,
              )}</td>
              <td style="width: 10%; text-align: right; padding: 4px;">${formatCurrency(
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
              <td style="text-align: right; padding-right: 10px; font-weight: bold; padding-top: 8px;">GST Total</td>
              <td style="text-align: right; width: 100px; font-weight: bold; padding-top: 8px;">${formatCurrency(
                totals.tax,
              )}</td>
          </tr>
      `
      : '';

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
            padding: 20px;
            color: #000;
            font-size: 12px;
            line-height: 1.2;
          }
          
          .page {
            position: relative;
            min-height: 100vh;
          }
          
          /* Header Styles */
          .header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
          }
          
          .company-info {
            flex: 1;
          }
          
          .company-name {
            font-size: 22px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          
          .company-details {
            font-size: 10px;
            line-height: 1.3;
          }
          
          .company-details div {
            margin-bottom: 2px;
          }
          
          .invoice-info {
            text-align: right;
          }
          
          .invoice-title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 5px;
            color: #333;
          }
          
          .invoice-details {
            font-size: 10px;
            line-height: 1.3;
          }
          
          .invoice-details div {
            margin-bottom: 2px;
          }
          
          /* Client Info Styles */
          .client-section {
            margin-bottom: 20px;
          }
          
          .client-info {
            margin-bottom: 15px;
          }
          
          .client-name {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          
          .address-section {
            font-size: 10px;
            line-height: 1.3;
            margin-bottom: 10px;
          }
          
          .address-label {
            font-weight: bold;
            margin-bottom: 2px;
          }
          
          /* Table Styles */
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            border: 1px solid #ccc;
          }
          
          .items-table th {
            background-color: #f0f0f0;
            padding: 8px;
            text-align: left;
            border: 1px solid #ccc;
            font-size: 10px;
            font-weight: bold;
          }
          
          .items-table td {
            padding: 8px;
            border: 1px solid #ccc;
            font-size: 10px;
            vertical-align: top;
          }
          
          /* Totals Section */
          .totals-section {
            margin-top: 20px;
            width: 250px;
            margin-left: auto;
          }
          
          .totals-table {
            width: 100%;
            border-collapse: collapse;
          }
          
          .totals-table tr {
            border-bottom: 1px solid #ccc;
          }
          
          .totals-table td {
            padding: 5px 0;
            font-size: 11px;
          }
          
          .grand-total {
            font-weight: bold;
            border-top: 2px solid #000;
            padding-top: 8px;
          }
          
          /* Notes Section */
          .notes-section {
            margin-top: 30px;
            border-top: 1px solid #ccc;
            padding-top: 10px;
            font-size: 10px;
          }
          
          .notes-label {
            font-weight: bold;
            margin-bottom: 5px;
          }
          
          /* Footer */
          .footer {
            position: absolute;
            bottom: 20px;
            right: 20px;
            font-size: 9px;
            color: #777;
          }
          
          .text-right {
            text-align: right;
          }
          .text-center {
            text-align: center;
          }
          .font-bold {
            font-weight: bold;
          }
          
          /* Page Number */
          .page-number {
            position: absolute;
            bottom: 20px;
            right: 20px;
            font-size: 9px;
            color: #777;
          }
        </style>
      </head>
      <body>
        <div class="page">
          <!-- Header -->
          <div class="header">
            <div class="company-info">
              <div class="company-name">${invoiceData.company.name}</div>
              <div class="company-details">
                <div>${invoiceData.company.address || 'Address'}</div>
                <div>Phone: ${safeFormatPhoneNumber(
                  invoiceData.company.phone,
                )}</div>
                <div>Email: ${invoiceData.company.email}</div>
                ${companyGSTIN ? `<div>GSTIN: ${companyGSTIN}</div>` : ''}
              </div>
            </div>
            
            <div class="invoice-info">
              <div class="invoice-title">INVOICE</div>
              <div class="invoice-details">
                <div><strong>Invoice No:</strong> ${
                  invoiceData.invoice.number
                }</div>
                <div><strong>Date:</strong> ${invoiceData.invoice.date}</div>
                <div><strong>Due Date:</strong> ${
                  invoiceData.invoice.dueDate
                }</div>
              </div>
            </div>
          </div>

          <!-- Client Information -->
          <div class="client-section">
            <div class="client-info">
              <div class="client-name">${invoiceData.party.name}</div>
              ${
                invoiceData.party.email
                  ? `<div>Email: ${invoiceData.party.email}</div>`
                  : ''
              }
              ${
                invoiceData.party.phone
                  ? `<div>Phone: ${safeFormatPhoneNumber(
                      invoiceData.party.phone,
                    )}</div>`
                  : ''
              }
              ${
                invoiceData.party.gstin
                  ? `<div>GSTIN: ${invoiceData.party.gstin}</div>`
                  : ''
              }
            </div>
            
            <div class="address-section">
              <div class="address-label">Bill To:</div>
              <div>${
                invoiceData.party.billingAddress
                  ? invoiceData.party.billingAddress.replace(/\n/g, '<br>')
                  : 'No billing address provided'
              }</div>
            </div>
            
            <div class="address-section">
              <div class="address-label">Ship To:</div>
              <div>${
                invoiceData.party.shippingAddress
                  ? invoiceData.party.shippingAddress.replace(/\n/g, '<br>')
                  : invoiceData.party.billingAddress
                  ? invoiceData.party.billingAddress.replace(/\n/g, '<br>')
                  : 'Same as billing address'
              }</div>
            </div>
          </div>

          <!-- Items Table -->
          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 5%;">S.No.</th>
                <th style="width: 35%;">Item Description</th>
                <th style="width: 10%;">HSN/SAC</th>
                <th style="width: 10%;" class="text-right">Qty</th>
                <th style="width: 10%;" class="text-right">GST%</th>
                <th style="width: 10%;" class="text-right">Rate</th>
                <th style="width: 10%;" class="text-right">Tax</th>
                <th style="width: 10%;" class="text-right">Total</th>
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
                <td class="text-right">Sub Total</td>
                <td class="text-right">${formatCurrency(totals.subtotal)}</td>
              </tr>
              ${gstTotalRow}
              <tr class="grand-total">
                <td class="text-right">GRAND TOTAL</td>
                <td class="text-right">${formatCurrency(
                  totals.invoiceTotal,
                )}</td>
              </tr>
            </table>
          </div>

          <!-- Notes Section -->
          ${
            transaction?.notes
              ? `
          <div class="notes-section">
            <div class="notes-label">Notes/Terms:</div>
            <div style="white-space: pre-wrap; line-height: 1.4;">
              ${transaction.notes.replace(/\n/g, '<br>')}
            </div>
          </div>
          `
              : ''
          }

          <!-- Page Number -->
          <div class="page-number">1 / 1 page</div>
        </div>
      </body>
      </html>
    `;
  };

  return generateHTML();
};

// --- PDF Generation Function ---
export const generatePdfForTemplate2 = async (
  transaction,
  company,
  party,
  serviceNameById,
  shippingAddress,
) => {
  try {
    console.log('🟡 PDF Generation Started - Template2');

    const htmlContent = Template2({
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
      fileName: `invoice_${transaction.invoiceNumber || 'document'}_template2`,
      directory: 'Documents',
      width: 595, // A4 width in points
      height: 842, // A4 height in points
      base64: true,
    };

    // Use generatePDF
    const file = await generatePDF(options);
    console.log('🟢 PDF Generated Successfully!');
    console.log('📊 PDF File Object:', {
      type: typeof file,
      constructor: file?.constructor?.name,
      keys: Object.keys(file || {}),
      hasBase64: typeof file?.base64,
      base64Length: file?.base64?.length || 0,
      hasFilePath: !!file?.filePath,
    });

    // Return a wrapper object with the output method
    const wrapper = {
      ...file,
      output: (format = 'base64') => {
        console.log(`📋 output() called with format: ${format}`);
        if (format === 'base64') {
          console.log('📤 Returning base64, length:', file.base64?.length || 0);
          return file.base64;
        }
        if (format === 'filePath') {
          console.log('📤 Returning filePath:', file.filePath);
          return file.filePath;
        }
        console.log('📤 Returning base64 (default)');
        return file.base64;
      },
    };

    console.log('📦 Wrapper object keys:', Object.keys(wrapper));
    return wrapper;
  } catch (error) {
    console.error('❌ Error generating PDF:', error);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    throw error;
  }
};
