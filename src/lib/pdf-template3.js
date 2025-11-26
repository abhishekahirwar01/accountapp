import {
  renderNotes,
  getUnifiedLines,
  invNo,
  getBillingAddress,
  getShippingAddress,
} from './pdf-utils';

import RNHTMLtoPDF from 'react-native-html-to-pdf';
import { BASE_URL } from '../config';

const NAVY = '#1D2C4A';
const GOLD = '#CCB57A';
const TEXT_COLOR = '#293042';
const MUTED = '#6E7789';
const BORDER_COLOR = '#CFD6E2';

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
  const tax = lines.reduce((s, it) => s + (Number(it.lineTax) || 0), 0);
  const invoiceTotal = lines.reduce(
    (s, it) => s + (Number(it.lineTotal) || 0),
    0,
  );

  const gstEnabled = tax > 0 && !!_getCompanyGSTIN(co)?.trim();
  return { lines, subtotal, tax, invoiceTotal, gstEnabled };
};

const money = n => `Rs. ${Number(n || 0).toLocaleString('en-IN')}`;

const generateInvoiceHtml = (
  transaction,
  invoiceData,
  items,
  totals,
  companyGSTIN,
) => {
  const spacedCompanyName = (invoiceData.footer.companyName || 'Your Company')
    .toUpperCase()
    .split('')
    .join(' ');

  const itemRows = items
    .map(
      item => `
        <tr style="height: 30px; border-bottom: 0.5px solid #eee;">
            <td>${item.sno}</td>
            <td>${item.description}</td>
            <td>${item.code}</td>
            <td style="text-align:right;">${item.quantity}</td>
            <td style="text-align:right;">${money(item.pricePerUnit)}</td>
            <td style="text-align:right;">${item.gstPercentage}%</td>
            <td style="text-align:right;">${money(item.lineTax)}</td>
            <td style="text-align:right;font-weight:bold;">${money(
              item.lineTotal,
            )}</td>
        </tr>
      `,
    )
    .join('');

  const gstRow = totals.gstEnabled
    ? `
      <tr>
        <td style="text-align:right;padding-right:10px;">GST TOTAL</td>
        <td style="text-align:right;">${money(totals.tax)}</td>
      </tr>`
    : '';

  const totalsSection = `
      <table style="width:350px;margin-left:auto;margin-top:15px;font-size:10.5pt;color:${TEXT_COLOR}">
        <tr>
          <td style="text-align:right;padding-right:10px;font-weight:bold;">SUBTOTAL</td>
          <td style="text-align:right;">${money(totals.subtotal)}</td>
        </tr>
        ${gstRow}
        <tr style="font-size:12.5pt;border-top:1px solid #ddd;">
          <td style="text-align:right;padding-right:10px;font-weight:bold;">GRAND TOTAL:</td>
          <td style="text-align:right;font-weight:bold;">${money(
            totals.invoiceTotal,
          )}</td>
        </tr>
      </table>
    `;

  const logoUrl =
    'https://i.pinimg.com/736x/71/b3/e4/71b3e4159892bb319292ab3b76900930.jpg';

  return `
      <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          body {
            font-family: Helvetica, sans-serif;
            margin: 0;
            padding: 0;
            color: ${TEXT_COLOR};
            font-size: 10pt;
          }
          .strip {
            background-color: ${NAVY};
            color: ${GOLD};
            padding: 10px 20px;
            text-align: center;
            font-size: 16pt;
            font-weight: bold;
            letter-spacing: 2px;
            position: relative;
          }
          .strip img {
            position: absolute;
            right: 25px;
            top: 5px;
            width: 24px;
            height: 24px;
          }
          .content { padding: 20px; }
          .gstin { color: ${NAVY}; font-size: 9pt; margin-top: 7px; }

          .item-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 30px;
            font-size: 9pt;
            border-top: 0.5px solid #C4C8D0;
          }
          .item-table th {
            background: #F7F9FC;
            height: 30px;
            font-weight: bold;
            color: ${NAVY};
            border-bottom: 0.5px solid ${BORDER_COLOR};
            text-align: left;
          }
          .item-table th:nth-child(4),
          .item-table th:nth-child(5),
          .item-table th:nth-child(6),
          .item-table th:nth-child(7),
          .item-table th:nth-child(8) {
            text-align: right;
          }

          .footer {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: ${NAVY};
            color: white;
            padding: 10px 20px;
            display: flex;
            justify-content: space-between;
            font-size: 8.5pt;
          }
        </style>
      </head>

      <body>
        <div class="strip">
          ${spacedCompanyName}
          <img src="${logoUrl}" />
        </div>

        <div class="content">
          ${
            companyGSTIN
              ? `<div class="gstin">GSTIN: ${companyGSTIN}</div>`
              : ''
          }

          <table style="width:100%;margin-top:15px;">
            <tr>
              <td>
                <div style="font-weight:bold;color:${NAVY}">BILL TO:</div>
                <div style="font-weight:bold;">${
                  invoiceData.invoiceTo.name
                }</div>
                ${
                  invoiceData.invoiceTo.email
                    ? `<div style="color:${MUTED}">${invoiceData.invoiceTo.email}</div>`
                    : ''
                }
                <div style="color:${MUTED}">
                  ${invoiceData.invoiceTo.billingAddress.replace(
                    /\n/g,
                    '<br/>',
                  )}
                </div>
              </td>
              <td style="text-align:right;">
                <div style="font-weight:bold;color:${NAVY}">INVOICE NO. ${
    invoiceData.invoiceNumber
  }</div>
                <div style="color:${MUTED}">DATE ${invoiceData.date}</div>
              </td>
            </tr>

            <tr>
              <td style="padding-top:15px;">
                <div style="font-weight:bold;color:${NAVY}">SHIP TO:</div>
                <div style="color:${MUTED}">
                  ${invoiceData.invoiceTo.shippingAddress.replace(
                    /\n/g,
                    '<br/>',
                  )}
                </div>
              </td>
            </tr>
          </table>

          <table class="item-table">
            <thead>
              <tr>
                <th>S.No.</th>
                <th>ITEM</th>
                <th>HSN/SAC</th>
                <th>QTY</th>
                <th>PRICE</th>
                <th>GST%</th>
                <th>TAX</th>
                <th>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows}
            </tbody>
          </table>

          ${totalsSection}

          <div style="margin-top:25px;color:${MUTED};font-size:9pt;">
            ${renderNotes(transaction)}
          </div>
        </div>

        <div class="footer">
          <div>${invoiceData.footer.address}</div>
          <div>${invoiceData.footer.email}</div>
          <div>${invoiceData.footer.phone}</div>
        </div>
      </body>
      </html>
    `;
};

export const generatePdfForTemplate3 = async (
  transaction,
  company,
  party,
  serviceNameById,
  shippingAddress,
) => {
  const totals = _deriveTotals(transaction, company, serviceNameById);
  const companyGSTIN = _getCompanyGSTIN(company);

  const billingAddress = getBillingAddress(party);
  const shippingAddressStr = getShippingAddress(
    shippingAddress,
    billingAddress,
  );

  const invoiceData = {
    invoiceNumber: invNo(transaction),
    date: transaction.date
      ? new Intl.DateTimeFormat('en-GB').format(new Date(transaction.date))
      : '01/10/2024',
    footer: {
      companyName: company?.businessName || 'Your Company',
      address: company?.address || 'your address here',
      email: company?.emailId || 'yourbusinessaccount@mail.com',
      phone: company?.mobileNumber || '123 456 789',
    },
    invoiceTo: {
      name: party?.name || 'Client Name',
      billingAddress,
      shippingAddress: shippingAddressStr,
      email: party?.email || '',
    },
  };

  let items = totals.lines.map((l, i) => ({
    sno: (i + 1).toString(),
    description: `${l.name}${l.description ? ' — ' + l.description : ''}`,
    code: l.code || '',
    quantity: l.quantity || 1,
    pricePerUnit: Number(l.pricePerUnit || l.amount || 0),
    amount: Number(l.amount || 0),
    gstPercentage: l.gstPercentage || 0,
    lineTax: Number(l.lineTax || 0),
    lineTotal: Number(l.lineTotal || l.amount || 0),
  }));

  if (items.length === 0) {
    const amount = Number(transaction.amount ?? 0);
    const gst = Number(transaction.gstPercentage ?? 0);
    const lineTax = (amount * gst) / 100;
    items.push({
      sno: '1',
      description: transaction.description || 'Item',
      code: '',
      quantity: 1,
      pricePerUnit: amount,
      amount,
      gstPercentage: gst,
      lineTax,
      lineTotal: amount + lineTax,
    });
  }

  const html = generateInvoiceHtml(
    transaction,
    invoiceData,
    items,
    totals,
    companyGSTIN,
  );

  const options = {
    html,
    fileName: `Invoice_${invoiceData.invoiceNumber}`,
    directory: 'Documents',
    base64: false,
  };

  try {
    const file = await RNHTMLtoPDF.convert(options);
    return file.filePath;
  } catch (err) {
    console.error('PDF generation failed:', err);
    throw new Error('Failed to generate PDF.');
  }
};
