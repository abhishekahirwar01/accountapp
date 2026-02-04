// Template11InvoicePDF.js - Updated with Pagination
import RNHTMLtoPDF from 'react-native-html-to-pdf';
import { generatePDF } from 'react-native-html-to-pdf';
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

// Constants
const ITEMS_PER_PAGE = 28; // Adjust based on layout
const A4_WIDTH = 595; // A4 width in points
const A4_HEIGHT = 842; // A4 height in points

const COLOR = {
  PRIMARY: '#2583C6',
  TEXT: '#343a40',
  SUB: ' rgba(3, 113, 193, 0.2)',
  BORDER: '#2583C6',
  BG: 'rgba(3, 113, 193, 0.2)',
  WHITE: ' rgba(3, 113, 193, 0.2)',
  BLACK: '#000000',
  LIGHT_GRAY: 'rgba(3, 113, 193, 0.2)',
};

// Helper functions
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

 const renderNotesHTML = notes => {
  if (!notes) return '';
  try {
    return notes
      .replace(/\n/g, '<br>')
      .replace(/<br\s*\/?>/gi, '<br>')
      .replace(/<p>/gi, '<div style="margin-bottom: 8px;">')
      .replace(/<\/p>/gi, '</div>')
      .replace(/<b>(.*?)<\/b>/gi, '<strong>$1</strong>')
      .replace(/<i>(.*?)<\/i>/gi, '<em>$1</em>')
      .replace(/<u>(.*?)<\/u>/gi, '<u>$1</u>')
      .replace(/<ul>/gi, '<ul style="padding-left: 15px;">')
      .replace(/<li>/gi, '<li style="margin-bottom: 4px;">');
  } catch (error) {
    return notes.replace(/\n/g, '<br>');
  }
};


const getImageBase64 = async imageUrl => {
  if (!imageUrl) return null;
  try {
    if (imageUrl.startsWith('file://') || imageUrl.startsWith('/')) {
      const base64 = await RNFS.readFile(imageUrl, 'base64');
      return `data:image/png;base64,${base64}`;
    }
    return imageUrl;
  } catch (error) {
    console.error('Error loading image:', error);
    return null;
  }
};

// Split items into pages
const splitItemsIntoPages = (items, itemsPerPage = ITEMS_PER_PAGE) => {
  const pages = [];
  for (let i = 0; i < items.length; i += itemsPerPage) {
    pages.push(items.slice(i, i + itemsPerPage));
  }
  return pages;
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

  const bankData = bank || transaction?.bank || {};

  const isBankDetailAvailable =
    bankData?.bankName ||
    bankData?.ifscCode ||
    bankData?.qrCode ||
    bankData?.branchAddress ||
    bankData?.accountNo ||
    bankData?.upiDetails?.upiId;



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

  const qrCodeBase64 = bank?.qrCode ? await getImageBase64(bank.qrCode) : null;
  const stampBase64 = invoiceData.company.stampDataUrl
    ? await getImageBase64(invoiceData.company.stampDataUrl)
    : null;

  // Split items into pages
  const itemPages = splitItemsIntoPages(calcRows, ITEMS_PER_PAGE);
  
  // Calculate actual total pages (items pages + potential overflow page)
  let totalPages = itemPages.length;
  
  // Check if footer content will fit on last page, if not add extra page
  const hasLargeFooter = 
    (!shouldHideBankDetails) || 
    (invoiceData.notes && invoiceData.notes.length > 200);
  
  // If last page has many items AND large footer, we need an extra page
  const lastPageItemCount = itemPages[itemPages.length - 1]?.length || 0;
  if (lastPageItemCount > 15 && hasLargeFooter) {
    totalPages += 1;
  }

  // Generate header HTML (reusable)
  const generateHeaderHTML = () => {
    return `
      <div class="page-header">
        <div class="header-content">
          <div class="company-info">
            <div class="company-name">${capitalizeWords(invoiceData.company.name || '')}</div>
            <div class="company-address">
              ${invoiceData.company.address}
              ${invoiceData.company.state ? ', ' + invoiceData.company.state : ''}<br/>
              <strong>Phone No:</strong> ${formatPhoneNumber(invoiceData.company.phone || '')}
            </div>
          </div>
          ${
            invoiceData.company.logoUrl
              ? `<img src="${invoiceData.company.logoUrl}" class="logo" alt="Logo"/>`
              : ''
          }
        </div>
        <div class="invoice-header-bar">
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
        
        <!-- Info Grid -->
        <div class="info-grid">
          <div class="info-col">
            <div class="col-header">Details of Buyer | Billed to :</div>
            <div class="col-content">
              <div class="info-row"><span class="label">Name:</span> ${invoiceData.billTo.name}</div>
              <div class="info-row"><span class="label">Address:</span> ${invoiceData.billTo.billing}</div>
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
                shippingAddress?.country || party?.country ,
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
            <div  style="height: 10%;
                //  background: ${COLOR.LIGHT_GRAY};
      padding: 10.5px 6px;
      font-weight: bold;
      font-size: 9pt;
      border-bottom: 1px solid ${COLOR.BORDER};"></div>
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
      </div>
    `;
  };

  // Generate table headers
  const generateTableHeaders = () => {
    if (shouldShowIGSTColumns) {
      return `<tr style="background:${COLOR.BG}">
        <th style="width:4%;border:1px solid ${COLOR.BORDER};padding:2px;text-align:center;font-size:8pt;">Sr.</th>
        <th style="width:28%;border:1px solid ${COLOR.BORDER};padding:2px;text-align:left;font-size:8pt;">Name of Product / Service</th>
        <th style="width:9%;border:1px solid ${COLOR.BORDER};padding:2px;font-size:8pt;">HSN/SAC</th>
        <th style="width:7%;border:1px solid ${COLOR.BORDER};padding:2px;font-size:8pt;">Qty</th>
        <th style="width:11%;border:1px solid ${COLOR.BORDER};padding:2px;font-size:8pt;">Rate (Rs)</th>
        <th style="width:13%;border:1px solid ${COLOR.BORDER};padding:2px;font-size:8pt;">Taxable Value (Rs)</th>
        <th style="width:6%;border:1px solid ${COLOR.BORDER};padding:2px;font-size:8pt;">IGST%</th>
        <th style="width:10%;border:1px solid ${COLOR.BORDER};padding:2px;font-size:8pt;">IGST Amt (Rs)</th>
        <th style="width:15%;border:1px solid ${COLOR.BORDER};padding:2px;font-size:8pt;">Total (Rs)</th>
      </tr>`;
    } else if (shouldShowCGSTSGSTColumns) {
      return `<tr style="background:${COLOR.BG}">
        <th style="width:4%;border:1px solid ${COLOR.BORDER};padding:2px;text-align:center;font-size:8pt;">Sr.</th>
        <th style="width:26%;border:1px solid ${COLOR.BORDER};padding:2px;text-align:left;font-size:8pt;">Name of Product / Service</th>
        <th style="width:8%;border:1px solid ${COLOR.BORDER};padding:2px;font-size:8pt;">HSN/SAC</th>
        <th style="width:6%;border:1px solid ${COLOR.BORDER};padding:2px;font-size:8pt;">Qty</th>
        <th style="width:9%;border:1px solid ${COLOR.BORDER};padding:2px;font-size:8pt;">Rate (Rs)</th>
        <th style="width:11%;border:1px solid ${COLOR.BORDER};padding:2px;font-size:8pt;">Taxable Value (Rs)</th>
        <th style="width:7%;border:1px solid ${COLOR.BORDER};padding:2px;font-size:8pt;">CGST%</th>
        <th style="width:9%;border:1px solid ${COLOR.BORDER};padding:2px;font-size:8pt;">CGST Amt</th>
        <th style="width:7%;border:1px solid ${COLOR.BORDER};padding:2px;font-size:8pt;">SGST%</th>
        <th style="width:9%;border:1px solid ${COLOR.BORDER};padding:2px;font-size:8pt;">SGST Amt</th>
        <th style="width:11%;border:1px solid ${COLOR.BORDER};padding:2px;font-size:8pt;">Total (Rs)</th>
      </tr>`;
    }
    return `<tr style="background:${COLOR.BG}">
      <th style="width:4%;border:1px solid ${COLOR.BORDER};padding:2px;text-align:center;font-size:8pt;">Sr.</th>
      <th style="width:28%;border:1px solid ${COLOR.BORDER};padding:2px;text-align:left;font-size:8pt;">Name of Product / Service</th>
      <th style="width:10%;border:1px solid ${COLOR.BORDER};padding:2px;font-size:8pt;">HSN/SAC</th>
      <th style="width:9%;border:1px solid ${COLOR.BORDER};padding:2px;font-size:8pt;">Qty</th>
      <th style="width:14%;border:1px solid ${COLOR.BORDER};padding:2px;text-align:center;font-size:8pt;">Rate (Rs)</th>
      <th style="width:18%;border:1px solid ${COLOR.BORDER};padding:2px;text-align:center;font-size:8pt;">Taxable Value (Rs)</th>
      <th style="width:18%;border:1px solid ${COLOR.BORDER};padding:2px;text-align:center;font-size:8pt;">Total (Rs)</th>
    </tr>`;
  };

  // Generate table rows for a specific page
  const generateTableRows = (pageRows) =>
    pageRows
      .map(r => {
        const qtyDisplay =
          typeof r.qty === 'string' ? r.qty : formatQuantity(r.qty, r.unit);
        if (shouldShowIGSTColumns) {
          return `<tr>
            <td style="border:1px solid ${COLOR.BORDER};padding:2px 3px;text-align:center;font-size:8pt;">${r.sr}</td>
            <td style="border:1px solid ${COLOR.BORDER};padding:2px 3px;text-align:left;font-size:8pt;">${r.desc}</td>
            <td style="border:1px solid ${COLOR.BORDER};padding:2px 3px;text-align:center;font-size:8pt;">${r.hsn}</td>
            <td style="border:1px solid ${COLOR.BORDER};padding:2px 3px;text-align:center;font-size:8pt;">${qtyDisplay}</td>
            <td style="border:1px solid ${COLOR.BORDER};padding:2px 3px;text-align:center;font-size:8pt;">${money(r.rate)}</td>
            <td style="border:1px solid ${COLOR.BORDER};padding:2px 3px;text-align:center;font-size:8pt;">${money(r.taxable)}</td>
            <td style="border:1px solid ${COLOR.BORDER};padding:2px 3px;text-align:center;font-size:8pt;">${(r.gstPct || 0).toFixed(2)}%</td>
            <td style="border:1px solid ${COLOR.BORDER};padding:2px 3px;text-align:center;font-size:8pt;">${money(r.igst)}</td>
            <td style="border:1px solid ${COLOR.BORDER};padding:2px 3px;text-align:center;font-size:8pt;">${money(r.total)}</td>
          </tr>`;
        } else if (shouldShowCGSTSGSTColumns) {
          const halfPct = ((r.gstPct || 0) / 2).toFixed(2);
          return `<tr>
            <td style="border:1px solid ${COLOR.BORDER};padding:2px 3px;text-align:center;font-size:8pt;">${r.sr}</td>
            <td style="border:1px solid ${COLOR.BORDER};padding:2px 3px;text-align:left;font-size:8pt;">${r.desc}</td>
            <td style="border:1px solid ${COLOR.BORDER};padding:2px 3px;text-align:center;font-size:8pt;">${r.hsn}</td>
            <td style="border:1px solid ${COLOR.BORDER};padding:2px 3px;text-align:center;font-size:8pt;">${qtyDisplay}</td>
            <td style="border:1px solid ${COLOR.BORDER};padding:2px 3px;text-align:center;font-size:8pt;">${money(r.rate)}</td>
            <td style="border:1px solid ${COLOR.BORDER};padding:2px 3px;text-align:center;font-size:8pt;">${money(r.taxable)}</td>
            <td style="border:1px solid ${COLOR.BORDER};padding:2px 3px;text-align:center;font-size:8pt;">${halfPct}%</td>
            <td style="border:1px solid ${COLOR.BORDER};padding:2px 3px;text-align:center;font-size:8pt;">${money(r.cgst)}</td>
            <td style="border:1px solid ${COLOR.BORDER};padding:2px 3px;text-align:center;font-size:8pt;">${halfPct}%</td>
            <td style="border:1px solid ${COLOR.BORDER};padding:2px 3px;text-align:center;font-size:8pt;">${money(r.sgst)}</td>
            <td style="border:1px solid ${COLOR.BORDER};padding:2px 3px;text-align:center;font-size:8pt;">${money(r.total)}</td>
          </tr>`;
        }
        return `<tr>
          <td style="border:1px solid ${COLOR.BORDER};padding:2px 3px;text-align:center;font-size:8pt;">${r.sr}</td>
          <td style="border:1px solid ${COLOR.BORDER};padding:2px 3px;text-align:left;font-size:8pt;">${r.desc}</td>
          <td style="border:1px solid ${COLOR.BORDER};padding:2px 3px;text-align:center;font-size:8pt;">${r.hsn}</td>
          <td style="border:1px solid ${COLOR.BORDER};padding:2px 3px;text-align:center;font-size:8pt;">${qtyDisplay}</td>
          <td style="border:1px solid ${COLOR.BORDER};padding:2px 3px;text-align:center;font-size:8pt;">${money(r.rate)}</td>
          <td style="border:1px solid ${COLOR.BORDER};padding:2px 3px;text-align:center;font-size:8pt;">${money(r.taxable)}</td>
          <td style="border:1px solid ${COLOR.BORDER};padding:2px 3px;text-align:center;font-size:8pt;">${money(r.total)}</td>
        </tr>`;
      })
      .join('');

  // Generate table footer (only on last page)
  const generateTableFooter = () => {
    if (shouldShowIGSTColumns) {
      return `<tr style="font-weight:bold;background:#f8f9fa;">
        <td colspan="5" style="border:1px solid ${COLOR.BORDER};padding:4px;text-align:left;">Total</td>
        <td style="border:1px solid ${COLOR.BORDER};padding:4px;text-align:center;">${money(totalTaxableValue)}</td>
        <td style="border:1px solid ${COLOR.BORDER};padding:4px;"></td>
        <td style="border:1px solid ${COLOR.BORDER};padding:4px;text-align:center;">${money(sumIGST)}</td>
        <td style="border:1px solid ${COLOR.BORDER};padding:4px;text-align:center;">${money(invoiceTotalAmount)}</td>
      </tr>`;
    } else if (shouldShowCGSTSGSTColumns) {
      return `<tr style="font-weight:bold;background:#f8f9fa;">
        <td colspan="5" style="border:1px solid ${COLOR.BORDER};padding:4px;text-align:left;">Total</td>
        <td style="border:1px solid ${COLOR.BORDER};padding:4px;text-align:center;">${money(totalTaxableValue)}</td>
        <td style="border:1px solid ${COLOR.BORDER};padding:4px;"></td>
        <td style="border:1px solid ${COLOR.BORDER};padding:4px;text-align:center;">${money(sumCGST)}</td>
        <td style="border:1px solid ${COLOR.BORDER};padding:4px;"></td>
        <td style="border:1px solid ${COLOR.BORDER};padding:4px;text-align:center;">${money(sumSGST)}</td>
        <td style="border:1px solid ${COLOR.BORDER};padding:4px;text-align:center;">${money(invoiceTotalAmount)}</td>
      </tr>`;
    }
    return `<tr style="font-weight:bold;background:#f8f9fa;">
      <td colspan="5" style="border:1px solid ${COLOR.BORDER};padding:4px;text-align:left;">Total</td>
      <td style="border:1px solid ${COLOR.BORDER};padding:4px;text-align:center;">${money(totalTaxableValue)}</td>
      <td style="border:1px solid ${COLOR.BORDER};padding:4px;text-align:center;">${money(invoiceTotalAmount)}</td>
    </tr>`;
  };

  // Tax summary
  const taxSummaryRows = shouldShowIGSTColumns
    ? `<tr><td style="padding:3px 0;">Taxable Amount</td><td style="text-align:right;padding:3px 0;">Rs ${money(totalTaxableValue)}</td></tr>
       <tr><td style="padding:3px 0;">Add: IGST</td><td style="text-align:right;padding:3px 0;">Rs ${money(sumIGST)}</td></tr>
       <tr><td style="padding:3px 0;font-weight:bold;">Total Tax</td><td style="text-align:right;padding:3px 0;font-weight:bold;">Rs ${money(sumIGST)}</td></tr>`
    : shouldShowCGSTSGSTColumns
    ? `<tr><td style="padding:3px 0;">Taxable Amount</td><td style="text-align:right;padding:3px 0;">Rs ${money(totalTaxableValue)}</td></tr>
       <tr><td style="padding:3px 0;">Add: CGST</td><td style="text-align:right;padding:3px 0;">Rs ${money(sumCGST)}</td></tr>
       <tr><td style="padding:3px 0;">Add: SGST</td><td style="text-align:right;padding:3px 0;">Rs ${money(sumSGST)}</td></tr>
       <tr><td style="padding:3px 0;font-weight:bold;">Total Tax</td><td style="text-align:right;padding:3px 0;font-weight:bold;">Rs ${money(sumCGST + sumSGST)}</td></tr>`
    : `<tr><td style="padding:3px 0;">Taxable Amount</td><td style="text-align:right;padding:3px 0;">Rs ${money(totalTaxableValue)}</td></tr>
       <tr><td style="padding:3px 0;font-weight:bold;">Total Tax</td><td style="text-align:right;padding:3px 0;font-weight:bold;">Rs ${money(0)}</td></tr>`;

  // Generate page HTML
  const generatePageHTML = (pageRows, pageIndex, isLastPage) => {
    return `
      <div class="page">
        ${generateHeaderHTML()}
        
        <!-- Items Table -->
        <table class="items">
          <thead>${generateTableHeaders()}</thead>
          <tbody>${generateTableRows(pageRows)}</tbody>
          ${isLastPage ? `<tfoot>${generateTableFooter()}</tfoot>` : ''}
        </table>
        
        ${
          isLastPage
            ? `
        <!-- Footer Section -->
        <div class="footer-grid">
          <div class="footer-left">
            <div class="section-header">Total in Words</div>
            <div class="section-content">${invoiceData.totalInWords}</div>
            
            ${
              !shouldHideBankDetails && isBankDetailAvailable
                ? `
                <div class="section-header">Bank Details</div>
                <div class="section-content bank-details">
                <div>
                  ${
                    bankData.bankName
                      ? `<div class="bank-row"><span class="label">Bank Name:</span> ${bankData.bankName}</div>`
                      : ''
                  }
                  ${
                    bankData.branchAddress
                      ? `<div class="bank-row"><span class="label">Branch:</span> ${bankData.branchAddress}</div>`
                      : ''
                  }
                  ${
                    bankData.ifscCode
                      ? `<div class="bank-row"><span class="label">IFSC Code:</span> ${bankData.ifscCode}</div>`
                      : ''
                  }
                  ${
                    bankData.accountNo
                      ? `<div class="bank-row"><span class="label">A/C Number:</span> ${bankData.accountNo}</div>`
                      : ''
                  }
                  ${
                    bankData.upiDetails?.upiId
                      ? `<div class="bank-row"><span class="label">UPI Mobile:</span> ${bankData.upiDetails?.upiId}</div>`
                      : ''
                  }
                  ${
                    bankData.upiDetails?.upiName
                      ? `<div class="bank-row"><span class="label">UPI Mobile:</span> ${bankData.upiDetails?.upiName}</div>`
                      : ''
                  }
                  ${
                    bankData.upiDetails?.upiMobile
                      ? `<div class="bank-row"><span class="label">UPI Mobile:</span> ${bankData.upiDetails?.upiMobile}</div>`
                      : ''
                  }
                  </div>
                  ${
                    bankData.qrCode
                      ? `<div style="margin-top:10px;text-align:center;">
                           <div style="font-weight:bold;font-size:9pt;margin-bottom:5px;">QR Code</div>
                           <img src="${BASE_URL}${bankData.qrCode}" style="width:70px;height:70px;object-fit:contain;" />
                         </div>`
                      : ''
                  }
                </div>`
                : !shouldHideBankDetails
                ? '<div class="section-header">Bank Details</div><div class="section-content">Bank details not available</div>'
                : ''
            }
            
            ${
              invoiceData.notes
                ? `<div class="section-header">Terms & Conditions</div>
                   <div class="section-content terms-section">
                     
                     ${renderNotesHTML(invoiceData.notes)}
                   </div>`
                : ''
            }
          </div>
          
          <div class="footer-right">
            <div class="section-header">Tax Summary</div>
            <div class="section-content">
              <table class="tax-table">
                ${taxSummaryRows}
                <tr class="total-row">
                  <td style="padding:8px 0;">Total Amount After Tax :</td>
                  <td style="text-align:right;padding:8px 0;">Rs. ${money(invoiceTotalAmount)}</td>
                </tr>
              </table>
            </div>
            
            <div class="section-content">
              <strong>GST Payable on Reverse Charge :</strong> N.A.
            </div>
            
            <div class="section-content" style="font-size:8pt;margin-top:10px;">
              Certified that the particulars given above are true and correct.
            </div>
            
            <div class="signature-section">
              <div style="font-weight:bold;margin-bottom:5px;">For ${capitalizeWords(
                company?.businessName || company?.companyName || 'Company Name',
              )}</div>
              ${
                stampBase64
                  ? `<div style="margin:5px 0;">
                       <img src="${stampBase64}" style="width:60px;height:60px;opacity:0.7;object-fit:contain;" />
                     </div>`
                  : ''
              }
              <div class="signature-line">Authorised Signatory</div>
            </div>
          </div>
        </div>
        
      
        `
            : ''
        }
        
        <!-- Page Number -->
        <div class="page-number">Page ${pageIndex + 1} of ${totalPages}</div>
      </div>
    `;
  };

  // Build all pages
  const allPagesHTML = itemPages
    .map((pageRows, pageIndex) =>
      generatePageHTML(pageRows, pageIndex, pageIndex === totalPages - 1)
    )
    .join('');

  // Complete HTML
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    html, body {
      height: auto !important;
      min-height: 100vh !important;
      width: 100%;
      overflow: visible !important;
    }
    
    body { 
      font-family: Arial, sans-serif; 
      font-size: 10pt; 
      color: ${COLOR.TEXT}; 
      line-height: 1.3;
      min-height: 100vh;
      width: 100%;
      overflow: visible;
      background: white;
    }
    
    .page {
      page-break-after: always;
      position: relative;
      min-height: ${A4_HEIGHT}pt;
      width: ${A4_WIDTH}pt;
      padding: 15pt 15pt 30pt 15pt;
      margin: 0 auto;
      box-sizing: border-box;
      overflow: visible;
      border: 1px solid #ddd;
      margin-bottom: 10pt;
    }
    
    .page:last-child {
      page-break-after: auto;
    }
    
    .page-header {
      width: 100%;
      margin-bottom: 8px;
    }
    
    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 4px;
    }
    
    .company-info { 
      flex: 1;
      margin-right: 10px;
    }
    
    .company-name { 
      font-size: 13pt; 
      font-weight: bold; 
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    
    .company-address { 
      font-size: 8pt; 
      line-height: 1.1;
    }
    
    .logo { 
      width: 50px; 
      height: 50px; 
      object-fit: contain; 
    }
    
    .invoice-header-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: bold;
      font-size: 9pt;
      margin-top: 4px;
      padding: 4px 6px;
      border: 1px solid ${COLOR.BORDER};
      
      margin-bottom: 8px;
    }
    
    .info-grid {
      display: table;
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 8px;
      border: 1px solid ${COLOR.BORDER};
    }
    
    .info-col {
      display: table-cell;
      width: 33.33%;
      vertical-align: top;
      border-right: 1px solid ${COLOR.BORDER};
    }
    
    .info-col:last-child {
      border-right: none;
    }
    
    .col-header {
      // background: ${COLOR.LIGHT_GRAY};
      padding: 3px 6px;
      font-weight: bold;
      font-size: 9pt;
      border-bottom: 1px solid ${COLOR.BORDER};
      text-align: center;
    }
    
    .col-content {
      padding: 6px;
      font-size: 8pt;
    }
    
    .info-row {
      margin-bottom: 3px;
      display: flex;
    }
    
    .info-row .label {
      font-weight: bold;
      min-width: 70px;
    }
    
    .meta-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 3px;
      font-size: 8pt;
    }
    
    .meta-row .label {
      font-weight: bold;
    }
    
    table.items {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 8px;
      font-size: 8pt;
    }
    
    table.items th, table.items td {
      border: 1px solid ${COLOR.BORDER};
      padding: 2px 3px;
      vertical-align: top;
      text-align: center;
      line-height: 1.2;
    }
    
    table.items th {
      // background: #e9ecef;
      font-weight: bold;
      font-size: 8pt;
    }
    
    .footer-grid {
      display: table;
      width: 100%;
      border: 1px solid ${COLOR.BORDER};
      border-collapse: collapse;
      table-layout: fixed;
    }
    
    .footer-left {
      display: table-cell;
      width: 60%;
      vertical-align: top;
      border-right: 1px solid ${COLOR.BORDER};
      padding: 0;
    }
    
    .footer-right {
      display: table-cell;
      width: 40%;
      vertical-align: top;
      padding: 0;
    }
    
    .section-header {
      background: ${COLOR.LIGHT_GRAY};
      padding: 3px 6px;
      font-weight: bold;
      font-size: 9pt;
      border-bottom: 1px solid ${COLOR.BORDER};
      margin: 0;
    }
    
    .section-content {
      padding: 6px;
      border-bottom: 1px solid ${COLOR.BORDER};
      font-size: 8pt;
    }
    
    .section-content:last-child {
      border-bottom: none;
    }
    
    .bank-details {
      font-size: 8pt;
      line-height: 1.3;
      flex-direction: row;
      display: flex;
      gap: 100px;
    }
    
    .bank-row {
      margin-bottom: 2px;
    }
    
    .bank-row .label {
      font-weight: bold;
    }
    
    .tax-table {
      width: 100%;
      font-size: 8pt;
    }
    
    .tax-table td {
      padding: 2px 0;
    }
    
    .total-row {
      font-weight: bold;
      border-top: 2px solid ${COLOR.BORDER};
      padding-top: 6px;
      margin-top: 6px;
    }
    
    .signature-section {
      text-align: center;
      padding: 10px 6px 6px 6px;
      border-top: 1px solid ${COLOR.BORDER};
      margin: 0;
    }
    
    .signature-line {
      border-top: 1px solid ${COLOR.BORDER};
      margin-top: 40px;
      padding-top: 4px;
      width: 80%;
      margin-left: auto;
      margin-right: auto;
    }
    
    .terms-section {
      padding: 6px;
      font-size: 7pt;
      line-height: 1.2;
      margin-left: 10px;
    }
    
    .terms-title {
      font-weight: bold;
      margin-bottom: 4px;
      font-size: 8pt;
    }
    
    .watermark {
      position: fixed;
      top: 40%;
      left: 25%;
      font-size: 72px;
      color: rgba(0,0,0,0.1);
      transform: rotate(-45deg);
      z-index: -1;
      font-weight: bold;
    }
    
    .footer-note {
      font-size: 7pt;
      text-align: center;
      margin-top: 6px;
      margin-bottom: 15px;
      color: #666;
    }
    
    .page-number {
      position: absolute;
      bottom: 6pt;
      right: 15pt;
      font-size: 8pt;
      color: #666;
      text-align: right;
      z-index: 100;
    }
  </style>
</head>
<body>
  ${
    transaction.type === 'proforma'
      ? '<div class="watermark">PROFORMA</div>'
      : ''
  }
  
  ${allPagesHTML}
</body>
</html>`;

  try {
    const options = {
      html,
      fileName: `Invoice_${invoiceData.invoiceNumber}_${Date.now()}`,
      directory: 'Documents',
      base64: false,
      height: A4_HEIGHT,
      width: A4_WIDTH,
      padding: 0,
    };

    const file = await generatePDF(options);
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