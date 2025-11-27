// Template11InvoicePDF.js
import RNHTMLtoPDF from 'react-native-html-to-pdf';
import RNFS from 'react-native-fs';
import {
  formatQuantity,
  formatPhoneNumber,
  numberToWords,
  getStateCode,
  invNo,
  getBillingAddress,
  getShippingAddress,
  prepareTemplate8Data,
  getUnifiedLines,
} from './pdf-utils';
import { capitalizeWords } from './utils';
import { BASE_URL } from '../config';

const COLOR = {
  PRIMARY: '#264653',
  TEXT: '#343a40',
  SUB: '#6c757d',
  BORDER: '#ced4da',
  BG: '#f8f9fa',
  WHITE: '#ffffff',
  BLUE: '#0066cc',
  LIGHT_BLUE: '#c8e1ff',
};

const detectGSTIN = x => {
  if (!x) return null;
  const gstin =
    x?.gstin ??
    x?.GSTIN ??
    x?.gstIn ??
    x?.GSTIn ??
    x?.gstNumber ??
    x?.GSTNumber ??
    x?.gst_no ??
    x?.GST_no ??
    x?.GST ??
    x?.gstinNumber ??
    x?.tax?.gstin;
  return (gstin || '').toString().trim() || null;
};

const money = n =>
  Number(n || 0).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });

const rupeesInWords = n =>
  `${numberToWords(Math.floor(Number(n) || 0)).toUpperCase()} RUPEES ONLY`;

const handleUndefined = (value, fallback = '-') => {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'string' && value.trim() === '') return fallback;
  if (value === 'N/A') return fallback;
  return value.toString();
};

const getBankDetailsFallback = () => ({
  name: 'Bank Details Not Available',
  branch: 'N/A',
  accNumber: 'N/A',
  ifsc: 'N/A',
  upiId: 'N/A',
  contactNumber: 'N/A',
  city: 'N/A',
});

// Enhanced HTML notes parsing with better formatting
const parseHtmlNotes = html => {
  if (!html) return '';

  // Remove script and style tags
  let cleanedHtml = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '');

  // Convert common HTML tags to formatted text
  cleanedHtml = cleanedHtml
    .replace(/<br\s*\/?>/gi, '<br/>')
    .replace(/<p[^>]*>/gi, '<br/>')
    .replace(/<\/p>/gi, '<br/>')
    .replace(/<div[^>]*>/gi, '<br/>')
    .replace(/<\/div>/gi, '<br/>')
    .replace(/<ul[^>]*>/gi, '<br/>')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/li>/gi, '<br/>')
    .replace(/<\/ul>/gi, '<br/>')
    .replace(/<ol[^>]*>/gi, '<br/>')
    .replace(/<\/ol>/gi, '<br/>')
    .replace(/<h[1-6][^>]*>/gi, '<br/><strong>')
    .replace(/<\/h[1-6]>/gi, '</strong><br/>')
    .replace(/<strong[^>]*>/gi, '<strong>')
    .replace(/<\/strong>/gi, '</strong>')
    .replace(/<b[^>]*>/gi, '<strong>')
    .replace(/<\/b>/gi, '</strong>')
    .replace(/<em[^>]*>/gi, '<em>')
    .replace(/<\/em>/gi, '</em>')
    .replace(/<i[^>]*>/gi, '<em>')
    .replace(/<\/i>/gi, '</em>');

  // Remove any remaining HTML tags but preserve line breaks and basic formatting
  cleanedHtml = cleanedHtml
    .replace(/<[^>]*>/g, '')
    .replace(/\n\s*\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>')
    .replace(/(<br\/>\s*){3,}/g, '<br/><br/>')
    .trim();

  return cleanedHtml;
};

// Function to get base64 from image URL (for QR codes and stamps)
const getImageBase64 = async imageUrl => {
  if (!imageUrl) return null;

  try {
    // For local images
    if (imageUrl.startsWith('file://') || imageUrl.startsWith('/')) {
      const base64 = await RNFS.readFile(imageUrl, 'base64');
      return `data:image/png;base64,${base64}`;
    }

    // For remote images - you might need to implement download logic
    // This is a simplified version - you may need proper image downloading
    return imageUrl;
  } catch (error) {
    console.error('Error loading image:', error);
    return null;
  }
};

export const generatePdfForTemplate11 = async (
  transaction,
  company,
  party,
  serviceNameById,
  shippingAddress,
  opts,
  bank,
) => {
  const shouldHideBankDetails = transaction.type === 'proforma';

  const dynamicBankDetails = (() => {
    if (!bank || typeof bank !== 'object') return getBankDetailsFallback();
    const bankObj = bank;
    const hasBankDetails =
      bankObj.bankName ||
      bankObj.branchName ||
      bankObj.branchAddress ||
      bankObj.accountNumber ||
      bankObj.accountNo ||
      bankObj.ifscCode ||
      bankObj.upiDetails?.upiId ||
      bankObj.upiId;
    if (!hasBankDetails) return getBankDetailsFallback();
    const accountNumber =
      bankObj.accountNo ||
      bankObj.accountNumber ||
      bankObj.account_number ||
      'N/A';
    const upiId =
      bankObj.upiDetails?.upiId || bankObj.upiId || bankObj.upi_id || 'N/A';
    return {
      name: handleUndefined(capitalizeWords(bankObj.bankName)),
      branch: handleUndefined(
        capitalizeWords(bankObj.branchName || bankObj.branchAddress),
      ),
      accNumber: handleUndefined(String(accountNumber)),
      ifsc: handleUndefined(capitalizeWords(bankObj.ifscCode)),
      upiId: handleUndefined(String(upiId)),
      contactNumber: handleUndefined(bankObj.contactNumber),
      city: handleUndefined(capitalizeWords(bankObj.city)),
    };
  })();

  const areBankDetailsAvailable =
    dynamicBankDetails.name !== 'Bank Details Not Available';

  const {
    totalTaxable,
    totalAmount,
    itemsWithGST,
    totalCGST,
    totalSGST,
    totalIGST,
    isGSTApplicable,
    showIGST,
    showCGSTSGST,
  } = prepareTemplate8Data(transaction, company, party, shippingAddress);

  const unifiedLines = itemsWithGST?.length
    ? itemsWithGST
    : getUnifiedLines(transaction, serviceNameById)?.map(it => ({
        name: it.name || transaction.description || 'Service Rendered',
        description: it.description || '',
        quantity: it.itemType === 'service' ? '-' : it.quantity || 1,
        pricePerUnit:
          it.pricePerUnit ?? it.amount ?? Number(transaction?.amount || 0),
        taxableValue: Number(
          it.amount ??
            (it.quantity || 1) *
              (it.pricePerUnit ?? Number(transaction?.amount || 0)),
        ),
        gstRate: Number(it.gstPercentage || 0),
        cgst: 0,
        sgst: 0,
        igst: 0,
        total: 0,
        code: it.code || transaction?.hsn || 'N/A',
        unit: it.unit || it.uom || '',
      }));

  const calcRows = (itemsWithGST?.length ? itemsWithGST : unifiedLines).map(
    (it, i) => {
      const qty = Number(it.quantity || 1);
      const rate =
        it.pricePerUnit ?? (it.taxableValue && qty ? it.taxableValue / qty : 0);
      const taxable = Number(it.taxableValue ?? qty * rate);
      const gstPct = Number(it.gstRate ?? it.gstPercentage ?? 0);
      const cgst = Number(it.cgst || 0);
      const sgst = Number(it.sgst || 0);
      const igst = Number(it.igst || 0);
      const total = Number(it.total ?? taxable + cgst + sgst + igst);
      const desc = `${capitalizeWords(it?.name || '')}${
        it?.description ? ' — ' + it.description : ''
      }`;
      return {
        sr: i + 1,
        desc,
        hsn: it?.code || 'N/A',
        qty: it.itemType === 'service' ? '-' : it.quantity,
        unit: it?.unit || '',
        rate: Number(rate || 0),
        taxable,
        gstPct,
        cgst,
        sgst,
        igst,
        total,
      };
    },
  );

  const totalTaxableValue = Number(totalTaxable || 0);
  const invoiceTotalAmount = Number(totalAmount || 0);
  const sumCGST = Number(totalCGST || 0);
  const sumSGST = Number(totalSGST || 0);
  const sumIGST = Number(totalIGST || 0);
  const gstEnabled = !!isGSTApplicable;
  const shouldShowIGSTColumns = !!showIGST;
  const shouldShowCGSTSGSTColumns = !!showCGSTSGST;

  const companyGSTIN = detectGSTIN(company) || '';
  const billingAddress = getBillingAddress(party);
  const shippingAddressStr = getShippingAddress(
    shippingAddress,
    billingAddress,
  );
  const displayedCompanyName =
    opts?.displayCompanyName?.trim() || (company?.businessName || '').trim();
  const partyPhone =
    party?.mobileNumber?.trim() ||
    party?.phone?.trim() ||
    party?.contactNumber?.trim() ||
    '-';

  const invoiceData = {
    invoiceNumber: invNo(transaction),
    date: transaction.date
      ? new Intl.DateTimeFormat('en-GB').format(new Date(transaction.date))
      : new Intl.DateTimeFormat('en-GB').format(new Date()),
    company: {
      name: displayedCompanyName || ' ',
      address: company?.address || '',
      email: company?.emailId || '',
      phone: company?.mobileNumber || '',
      gstin: companyGSTIN,
      logoUrl: opts?.logoUrl || company?.logoUrl || '',
      state: company?.addressState || '-',
      stampDataUrl: company?.stampDataUrl || '',
    },
    billTo: {
      name: party?.name || '',
      billing: billingAddress || '-',
      shipping: shippingAddressStr || '-',
      email: party?.email || '',
      gstin: detectGSTIN(party) || '',
    },
    notes: transaction?.notes || '',
    totalInWords: rupeesInWords(invoiceTotalAmount),
  };

  const buyerState = party?.state || '-';
  const consigneeState = shippingAddress?.state
    ? `${shippingAddress.state} (${getStateCode(shippingAddress.state) || '-'})`
    : party?.state
    ? `${party.state} (${getStateCode(party.state) || '-'})`
    : '-';

  // Get base64 images for QR code and stamp
  const qrCodeBase64 = bank?.qrCode ? await getImageBase64(bank.qrCode) : null;
  const stampBase64 = invoiceData.company.stampDataUrl
    ? await getImageBase64(invoiceData.company.stampDataUrl)
    : null;

  const generateTableHeaders = () => {
    if (shouldShowIGSTColumns) {
      return `<tr style="background:${COLOR.LIGHT_BLUE}"><th style="width:30px">Sr.</th><th style="width:113px">Name of Product / Service</th><th style="width:50px">HSN/SAC</th><th style="width:45px">Qty</th><th style="width:50px">Rate (Rs)</th><th style="width:70px">Taxable Value (Rs)</th><th style="width:40px">IGST%</th><th style="width:60px">IGST Amt (Rs)</th><th style="width:65px">Total (Rs)</th></tr>`;
    } else if (shouldShowCGSTSGSTColumns) {
      return `<tr style="background:${COLOR.LIGHT_BLUE}"><th style="width:20px">Sr.</th><th style="width:100px">Name of Product / Service</th><th style="width:43px">HSN/SAC</th><th style="width:38px">Qty</th><th style="width:42px">Rate (Rs)</th><th style="width:60px">Taxable Value (Rs)</th><th style="width:38px">CGST%</th><th style="width:45px">CGST Amt</th><th style="width:38px">SGST%</th><th style="width:45px">SGST Amt</th><th style="width:55px">Total (Rs)</th></tr>`;
    }
    return `<tr style="background:${COLOR.LIGHT_BLUE}"><th style="width:35px">Sr.</th><th style="width:122px">Name of Product / Service</th><th style="width:60px">HSN/SAC</th><th style="width:60px">Qty</th><th style="width:75px">Rate (Rs)</th><th style="width:85px">Taxable Value (Rs)</th><th style="width:85px">Total (Rs)</th></tr>`;
  };

  const generateTableRows = () =>
    calcRows
      .map(r => {
        const qtyDisplay =
          typeof r.qty === 'string' ? r.qty : formatQuantity(r.qty, r.unit);
        if (shouldShowIGSTColumns) {
          return `<tr><td>${r.sr}</td><td style="text-align:left">${
            r.desc
          }</td><td>${
            r.hsn
          }</td><td>${qtyDisplay}</td><td style="text-align:right">${money(
            r.rate,
          )}</td><td style="text-align:right">${money(r.taxable)}</td><td>${(
            r.gstPct || 0
          ).toFixed(2)}%</td><td style="text-align:right">${money(
            r.igst,
          )}</td><td style="text-align:right">${money(r.total)}</td></tr>`;
        } else if (shouldShowCGSTSGSTColumns) {
          const halfPct = ((r.gstPct || 0) / 2).toFixed(2);
          return `<tr><td>${r.sr}</td><td style="text-align:left">${
            r.desc
          }</td><td>${
            r.hsn
          }</td><td>${qtyDisplay}</td><td style="text-align:right">${money(
            r.rate,
          )}</td><td style="text-align:right">${money(
            r.taxable,
          )}</td><td>${halfPct}%</td><td style="text-align:right">${money(
            r.cgst,
          )}</td><td>${halfPct}%</td><td style="text-align:right">${money(
            r.sgst,
          )}</td><td style="text-align:right">${money(r.total)}</td></tr>`;
        }
        return `<tr><td>${r.sr}</td><td style="text-align:left">${
          r.desc
        }</td><td>${
          r.hsn
        }</td><td>${qtyDisplay}</td><td style="text-align:right">${money(
          r.rate,
        )}</td><td style="text-align:right">${money(
          r.taxable,
        )}</td><td style="text-align:right">${money(r.total)}</td></tr>`;
      })
      .join('');

  const generateTableFooter = () => {
    if (shouldShowIGSTColumns) {
      return `<tr style="font-weight:bold"><td colspan="5" style="text-align:left">Total</td><td style="text-align:right">${money(
        totalTaxableValue,
      )}</td><td></td><td style="text-align:right">${money(
        sumIGST,
      )}</td><td style="text-align:right">${money(
        invoiceTotalAmount,
      )}</td></tr>`;
    } else if (shouldShowCGSTSGSTColumns) {
      return `<tr style="font-weight:bold"><td colspan="5" style="text-align:left">Total</td><td style="text-align:right">${money(
        totalTaxableValue,
      )}</td><td></td><td style="text-align:right">${money(
        sumCGST,
      )}</td><td></td><td style="text-align:right">${money(
        sumSGST,
      )}</td><td style="text-align:right">${money(
        invoiceTotalAmount,
      )}</td></tr>`;
    }
    return `<tr style="font-weight:bold"><td colspan="5" style="text-align:left">Total</td><td style="text-align:right">${money(
      totalTaxableValue,
    )}</td><td style="text-align:right">${money(invoiceTotalAmount)}</td></tr>`;
  };

  const taxSummaryRows = shouldShowIGSTColumns
    ? `<tr><td>Taxable Amount</td><td style="text-align:right">Rs ${money(
        totalTaxableValue,
      )}</td></tr><tr><td>Add: IGST</td><td style="text-align:right">Rs ${money(
        sumIGST,
      )}</td></tr><tr><td>Total Tax</td><td style="text-align:right">Rs ${money(
        sumIGST,
      )}</td></tr>`
    : shouldShowCGSTSGSTColumns
    ? `<tr><td>Taxable Amount</td><td style="text-align:right">Rs ${money(
        totalTaxableValue,
      )}</td></tr><tr><td>Add: CGST</td><td style="text-align:right">Rs ${money(
        sumCGST,
      )}</td></tr><tr><td>Add: SGST</td><td style="text-align:right">Rs ${money(
        sumSGST,
      )}</td></tr><tr><td>Total Tax</td><td style="text-align:right">Rs ${money(
        sumCGST + sumSGST,
      )}</td></tr>`
    : `<tr><td>Taxable Amount</td><td style="text-align:right">Rs ${money(
        totalTaxableValue,
      )}</td></tr><tr><td>Total Tax</td><td style="text-align:right">Rs ${money(
        0,
      )}</td></tr>`;

  // Enhanced bank details with QR code
  const bankDetailsHtml =
    !shouldHideBankDetails && areBankDetailsAvailable
      ? `
    <div class="section-header">Bank Details</div>
    <div class="bank-details" style="position:relative;">
      <div style="width:70%;">
        ${
          bank?.bankName
            ? `<div class="bank-row"><span class="label">Bank Name:</span> ${dynamicBankDetails.name}</div>`
            : ''
        }
        ${
          bank?.ifscCode
            ? `<div class="bank-row"><span class="label">IFSC Code:</span> ${dynamicBankDetails.ifsc}</div>`
            : ''
        }
        ${
          bank?.accountNo || bank?.accountNumber
            ? `<div class="bank-row"><span class="label">A/C Number:</span> ${dynamicBankDetails.accNumber}</div>`
            : ''
        }
        ${
          bank?.branchAddress || bank?.branchName
            ? `<div class="bank-row"><span class="label">Branch:</span> ${dynamicBankDetails.branch}</div>`
            : ''
        }
        ${
          bank?.upiDetails?.upiId || bank?.upiId
            ? `<div class="bank-row"><span class="label">UPI ID:</span> ${dynamicBankDetails.upiId}</div>`
            : ''
        }
        ${
          bank?.upiDetails?.upiName
            ? `<div class="bank-row"><span class="label">UPI Name:</span> ${capitalizeWords(
                bank.upiDetails.upiName,
              )}</div>`
            : ''
        }
      </div>
      ${
        qrCodeBase64
          ? `<div style="position:absolute;right:10px;top:10px;text-align:center;">
               <div style="font-weight:bold;font-size:9pt;margin-bottom:2px;">QR Code</div>
               <img src="${qrCodeBase64}" style="width:85px;height:73px;object-fit:contain;" />
             </div>`
          : ''
      }
    </div>`
      : !shouldHideBankDetails
      ? '<div class="section-header">Bank Details</div><div class="bank-details">Bank details not available</div>'
      : '';

  // Enhanced signature section with stamp
  const signatureSection = `
    <div class="signature-section">
      <div style="font-weight:bold;margin-bottom:10px;">For ${capitalizeWords(
        company?.businessName || company?.companyName || 'Company Name',
      )}</div>
      ${
        stampBase64
          ? `<div style="margin:10px 0;">
               <img src="${stampBase64}" style="width:70px;height:70px;opacity:0.7;object-fit:contain;" />
             </div>`
          : ''
      }
      <div class="signature-line">Authorised Signatory</div>
    </div>
  `;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: Helvetica, Arial, sans-serif; 
      font-size: 9pt; 
      color: ${COLOR.TEXT}; 
      padding: 36pt; 
      line-height: 1.4;
    }
    .header { 
      display: flex; 
      justify-content: space-between; 
      align-items: flex-start; 
      margin-bottom: 15pt; 
    }
    .company-info { flex: 1; }
    .company-name { 
      font-size: 16pt; 
      font-weight: bold; 
      color: ${COLOR.PRIMARY}; 
      margin-bottom: 5pt; 
    }
    .company-details { 
      color: ${COLOR.SUB}; 
      font-size: 9pt; 
      line-height: 1.4; 
    }
    .logo { 
      width: 60pt; 
      height: 56pt; 
      object-fit: contain; 
      margin-right: 15pt; 
    }
    .header-bar { 
      border-top: 1px solid ${COLOR.BLUE}; 
      padding: 8pt 0; 
      display: flex; 
      justify-content: space-between; 
      font-weight: bold; 
      font-size: 11pt; 
      margin-bottom: 15pt; 
    }
    .info-grid { 
      display: table; 
      width: 100%; 
      border: 1px solid ${COLOR.BLUE}; 
      border-collapse: collapse; 
      margin-bottom: 20pt; 
    }
    .info-col { 
      display: table-cell; 
      width: 33.33%; 
      vertical-align: top; 
      border-right: 1px solid ${COLOR.BLUE}; 
      padding: 0; 
    }
    .info-col:last-child { border-right: none; }
    .col-header { 
      background: ${COLOR.LIGHT_BLUE}; 
      padding: 5pt 8pt; 
      font-weight: bold; 
      font-size: 10pt; 
      border-bottom: 1px solid ${COLOR.BLUE}; 
    }
    .col-content { padding: 8pt; }
    .info-row { 
      margin-bottom: 6pt; 
      display: flex; 
      flex-wrap: wrap; 
    }
    .info-row .label { 
      font-weight: bold; 
      min-width: 80pt; 
    }
    .meta-row { 
      display: flex; 
      justify-content: space-between; 
      margin-bottom: 4pt; 
      font-size: 9pt; 
    }
    table.items { 
      width: 100%; 
      border-collapse: collapse; 
      margin-bottom: 20pt; 
    }
    table.items th, table.items td { 
      border: 1px solid ${COLOR.BLUE}; 
      padding: 5pt; 
      text-align: center; 
      font-size: 8pt; 
    }
    table.items th { 
      background: ${COLOR.LIGHT_BLUE}; 
      font-weight: bold; 
    }
    .footer-grid { 
      display: table; 
      width: 100%; 
      border: 1px solid ${COLOR.BLUE}; 
      border-collapse: collapse; 
    }
    .footer-left { 
      display: table-cell; 
      width: 58%; 
      vertical-align: top; 
      border-right: 1px solid ${COLOR.BLUE}; 
    }
    .footer-right { 
      display: table-cell; 
      width: 42%; 
      vertical-align: top; 
    }
    .section-header { 
      background: ${COLOR.LIGHT_BLUE}; 
      padding: 5pt 8pt; 
      font-weight: bold; 
      text-align: center; 
      border-bottom: 1px solid ${COLOR.BLUE}; 
      font-size: 10pt; 
    }
    .section-content { padding: 10pt 8pt; }
    .bank-details { 
      padding: 8pt; 
      font-size: 9pt; 
    }
    .bank-row { 
      margin-bottom: 5pt; 
    }
    .bank-row .label { 
      font-weight: bold; 
    }
    .tax-table { 
      width: 100%; 
      font-size: 9pt; 
    }
    .tax-table td { 
      padding: 4pt 8pt; 
    }
    .total-row { 
      font-weight: bold; 
      border-top: 1px solid ${COLOR.BLUE}; 
      padding-top: 8pt; 
      margin-top: 8pt; 
    }
    .signature-section { 
      text-align: center; 
      padding: 15pt 8pt; 
    }
    .signature-line { 
      border-top: 1px solid ${COLOR.BLUE}; 
      margin-top: 60pt; 
      padding-top: 8pt; 
    }
    .divider { 
      border-top: 1px solid ${COLOR.BLUE}; 
      margin: 8pt 0; 
    }
    .notes-section { 
      padding: 8pt; 
      font-size: 9pt; 
      line-height: 1.4;
    }
    .page-number { 
      position: fixed; 
      bottom: 20pt; 
      right: 36pt; 
      font-size: 8pt; 
      color: ${COLOR.SUB};
    }
    @media print {
      @page { 
        size: A4; 
        margin: 36pt;
      }
      .page-number { 
        position: running(footer); 
      }
    }
  </style>
</head>
<body>
  <div class="header">
    ${
      invoiceData.company.logoUrl
        ? `<img src="${invoiceData.company.logoUrl}" class="logo" alt="Logo"/>`
        : ''
    }
    <div class="company-info">
      <div class="company-name">${capitalizeWords(
        (invoiceData.company.name || '').toUpperCase(),
      )}</div>
      <div class="company-details">
        ${invoiceData.company.address}${
    invoiceData.company.state ? ', ' + invoiceData.company.state : ''
  }<br/>
        ${
          invoiceData.company.phone
            ? `<strong>Phone No:</strong> ${formatPhoneNumber(
                invoiceData.company.phone,
              )}`
            : ''
        }
      </div>
    </div>
  </div>
  
  <div class="header-bar">
    <span>GSTIN: ${invoiceData.company.gstin || '-'}</span>
    <span>${
      transaction.type === 'proforma'
        ? 'PROFORMA INVOICE'
        : gstEnabled
        ? 'TAX INVOICE'
        : 'INVOICE'
    }</span>
    <span>ORIGINAL FOR RECIPIENT</span>
  </div>
  
  <div class="info-grid">
    <div class="info-col">
      <div class="col-header">Details of Buyer | Billed to :</div>
      <div class="col-content">
        <div class="info-row"><span class="label">Name:</span> ${
          invoiceData.billTo.name
        }</div>
        <div class="info-row"><span class="label">Address:</span> ${
          invoiceData.billTo.billing || '-'
        }</div>
        <div class="info-row"><span class="label">Phone:</span> ${
          partyPhone !== '-' ? formatPhoneNumber(partyPhone) : '-'
        }</div>
        <div class="info-row"><span class="label">GSTIN:</span> ${
          invoiceData.billTo.gstin || '-'
        }</div>
        <div class="info-row"><span class="label">PAN:</span> ${
          party?.pan || '-'
        }</div>
        <div class="info-row"><span class="label">Place of Supply:</span> ${consigneeState}</div>
      </div>
    </div>
    
    <div class="info-col">
      <div class="col-header">Details of Consigned | Shipped to :</div>
      <div class="col-content">
        <div class="info-row"><span class="label">Name:</span> ${
          shippingAddress?.label || invoiceData.billTo.name || '-'
        }</div>
        <div class="info-row"><span class="label">Address:</span> ${
          invoiceData.billTo.shipping || invoiceData.billTo.billing || '-'
        }</div>
        <div class="info-row"><span class="label">Country:</span> ${capitalizeWords(
          shippingAddress?.country || party?.country || 'India',
        )}</div>
        <div class="info-row"><span class="label">Phone:</span> ${
          shippingAddress?.contactNumber
            ? formatPhoneNumber(shippingAddress.contactNumber)
            : partyPhone !== '-'
            ? formatPhoneNumber(partyPhone)
            : '-'
        }</div>
        <div class="info-row"><span class="label">GSTIN:</span> ${
          invoiceData.billTo.gstin || '-'
        }</div>
        <div class="info-row"><span class="label">State:</span> ${capitalizeWords(
          consigneeState,
        )}</div>
      </div>
    </div>
    
    <div class="info-col">
      <div class="col-header" style="visibility:hidden">Invoice Details</div>
      <div class="col-content">
        <div class="meta-row"><span class="label">Invoice No:</span> <span>${
          invoiceData.invoiceNumber
        }</span></div>
        <div class="meta-row"><span class="label">Invoice Date:</span> <span>${
          invoiceData.date
        }</span></div>
        <div class="meta-row"><span class="label">Due Date:</span> <span>${
          transaction?.dueDate
            ? new Intl.DateTimeFormat('en-GB').format(
                new Date(transaction.dueDate),
              )
            : '-'
        }</span></div>
        <div class="meta-row"><span class="label">P.O. No:</span> <span>${
          transaction?.poNumber || '-'
        }</span></div>
        <div class="meta-row"><span class="label">P.O. Date:</span> <span>${
          transaction?.poDate
            ? new Intl.DateTimeFormat('en-GB').format(
                new Date(transaction.poDate),
              )
            : '-'
        }</span></div>
        <div class="meta-row"><span class="label">E-Way No:</span> <span>${
          transaction?.ewayBillNo || '-'
        }</span></div>
      </div>
    </div>
  </div>
  
  <table class="items">
    <thead>${generateTableHeaders()}</thead>
    <tbody>${generateTableRows()}</tbody>
    <tfoot>${generateTableFooter()}</tfoot>
  </table>
  
  <div class="footer-grid">
    <div class="footer-left">
      <div class="section-header">Total in Words</div>
      <div class="section-content">${invoiceData.totalInWords}</div>
      <div class="divider"></div>
      ${bankDetailsHtml}
      ${!shouldHideBankDetails ? '<div class="divider"></div>' : ''}
      ${
        invoiceData.notes
          ? `<div class="section-header">Terms & Conditions</div>
             <div class="notes-section">${parseHtmlNotes(
               invoiceData.notes,
             )}</div>`
          : ''
      }
    </div>
    
    <div class="footer-right">
      <div class="section-header">Tax Summary</div>
      <div class="section-content">
        <table class="tax-table">${taxSummaryRows}</table>
      </div>
      <div class="divider"></div>
      <div class="section-content total-row" style="display:flex;justify-content:space-between">
        <span>Total Amount After Tax :</span>
        <span>Rs. ${money(invoiceTotalAmount)}</span>
      </div>
      <div class="divider"></div>
      <div class="section-content">
        <strong>GST Payable on Reverse Charge :</strong> N.A.
      </div>
      <div class="divider"></div>
      <div class="section-content" style="font-size:8pt">
        Certified that the particulars given above are true and correct.
      </div>
      ${signatureSection}
    </div>
  </div>
  
  <div class="page-number">Page 1 of 1</div>
</body>
</html>`;

  try {
    const options = {
      html,
      fileName: `Invoice_${invoiceData.invoiceNumber}_${Date.now()}`,
      directory: 'Documents',
      base64: false,
      height: 842, // A4 height in points
      width: 595, // A4 width in points
      padding: 0,
    };

    const file = await RNHTMLtoPDF.convert(options);
    return {
      success: true,
      filePath: file.filePath,
      fileName: options.fileName,
    };
  } catch (error) {
    console.error('PDF Generation Error:', error);
    return { success: false, error: error.message };
  }
};
