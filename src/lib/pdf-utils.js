import { getUnifiedLines } from './getUnifiedLines';
import RNFS from 'react-native-fs';

export { getUnifiedLines };

// ==================== STATE & COMPANY UTILITIES ====================

const stateCodeMap = {
  'Jammu & Kashmir': '01',
  'Himachal Pradesh': '02',
  Punjab: '03',
  Chandigarh: '04',
  Uttarakhand: '05',
  Haryana: '06',
  Delhi: '07',
  Rajasthan: '08',
  'Uttar Pradesh': '09',
  Bihar: '10',
  Sikkim: '11',
  'Arunachal Pradesh': '12',
  Nagaland: '13',
  Manipur: '14',
  Mizoram: '15',
  Tripura: '16',
  Meghalaya: '17',
  Assam: '18',
  'West Bengal': '19',
  Jharkhand: '20',
  Odisha: '21',
  Chhattisgarh: '22',
  'Madhya Pradesh': '23',
  Gujarat: '24',
  'Daman & Diu': '25',
  'Dadra & Nagar Haveli': '26',
  Maharashtra: '27',
  'Andhra Pradesh': '28',
  Karnataka: '29',
  Goa: '30',
  Lakshadweep: '31',
  Kerala: '32',
  'Tamil Nadu': '33',
  Puducherry: '34',
  'Andaman & Nicobar Islands': '35',
  Telangana: '36',
  Ladakh: '37',
};

export const getStateCode = stateName => {
  return stateCodeMap[stateName] || null;
};

export const normalizeState = state => {
  return state
    .toLowerCase()
    .trim()
    .replace(/\s*\([^)]*\)\s*$/, '');
};

export const getCompanyGSTIN = c => {
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

// ==================== FORMATTING UTILITIES ====================

export const formatCurrency = amount => {
  if (amount === null || amount === undefined) return '0';

  const num = parseFloat(amount);
  if (isNaN(num)) return '0';

  // Use Intl.NumberFormat for proper Indian formatting
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
};

export const numberToWords = num => {
  if (num === 0) return 'ZERO RUPEES ONLY';

  const ones = [
    '',
    'ONE',
    'TWO',
    'THREE',
    'FOUR',
    'FIVE',
    'SIX',
    'SEVEN',
    'EIGHT',
    'NINE',
    'TEN',
    'ELEVEN',
    'TWELVE',
    'THIRTEEN',
    'FOURTEEN',
    'FIFTEEN',
    'SIXTEEN',
    'SEVENTEEN',
    'EIGHTEEN',
    'NINETEEN',
  ];

  const tens = [
    '',
    '',
    'TWENTY',
    'THIRTY',
    'FORTY',
    'FIFTY',
    'SIXTY',
    'SEVENTY',
    'EIGHTY',
    'NINETY',
  ];

  const convertBelowHundred = n => {
    if (n < 20) return ones[n];
    const ten = Math.floor(n / 10);
    const unit = n % 10;
    return tens[ten] + (unit > 0 ? ' ' + ones[unit] : '');
  };

  const convertHundreds = n => {
    if (n === 0) return '';
    let str = '';

    if (n > 99) {
      str += ones[Math.floor(n / 100)] + ' HUNDRED';
      n %= 100;
      if (n > 0) str += ' ';
    }

    if (n > 0) {
      str += convertBelowHundred(n);
    }

    return str.trim();
  };

  const convertToWords = n => {
    if (n === 0) return 'ZERO';

    let words = '';

    if (n >= 10000000) {
      const crores = Math.floor(n / 10000000);
      words += convertHundreds(crores) + ' CRORE ';
      n %= 10000000;
    }

    if (n >= 100000) {
      const lakhs = Math.floor(n / 100000);
      words += convertHundreds(lakhs) + ' LAKH ';
      n %= 100000;
    }

    if (n >= 1000) {
      const thousands = Math.floor(n / 1000);
      words += convertHundreds(thousands) + ' THOUSAND ';
      n %= 1000;
    }

    if (n > 0) {
      words += convertHundreds(n);
    }

    return words.trim();
  };

  const integerPart = Math.floor(num);
  const decimalPart = Math.round((num - integerPart) * 100);

  let result = convertToWords(integerPart);

  if (decimalPart > 0) {
    result += ' AND ' + convertToWords(decimalPart) + ' PAISE ONLY';
  } else {
    result += ' RUPEES ONLY';
  }

  return result.trim().replace(/\s+/g, ' ');
};

export function formatQuantity(qty, unit) {
  if (!unit) return String(qty ?? '-');

  const normalized = unit.trim().toLowerCase();

  const unitMap = {
    piece: { singular: 'Pc', plural: 'Pcs' },
    kilogram: { singular: 'Kg', plural: 'Kgs' },
    kg: { singular: 'Kg', plural: 'Kgs' },
    gram: { singular: 'g', plural: 'g' },
    g: { singular: 'g', plural: 'g' },
    litre: { singular: 'Ltr', plural: 'Ltrs' },
    ltr: { singular: 'Ltr', plural: 'Ltrs' },
    box: { singular: 'Box', plural: 'Boxes' },
    bag: { singular: 'Bag', plural: 'Bags' },
    packet: { singular: 'Pkt', plural: 'Pkts' },
    pkt: { singular: 'Pkt', plural: 'Pkts' },
    dozen: { singular: 'dz', plural: 'dz' },
    meter: { singular: 'm', plural: 'm' },
    m: { singular: 'm', plural: 'm' },
    foot: { singular: 'ft', plural: 'ft' },
    ft: { singular: 'ft', plural: 'ft' },
    unit: { singular: 'Unit', plural: 'Units' },
  };

  const singularKey = normalized.endsWith('s')
    ? normalized.slice(0, -1)
    : normalized;
  const entry = unitMap[normalized] || unitMap[singularKey];

  if (!entry) return `${qty ?? '-'} ${unit}`;

  const shortForm = qty === 1 ? entry.singular : entry.plural;
  return `${qty ?? '-'} ${shortForm}`;
}

export function formatPhoneNumber(phone) {
  if (!phone) return '';

  const digits = String(phone).replace(/\D/g, '');
  const cleaned = digits.slice(-10);

  if (cleaned.length !== 10) return String(phone);

  return `${cleaned.slice(0, 5)}-${cleaned.slice(5)}`;
}

// ==================== HTML PARSING FOR REACT NATIVE ====================

// Enhanced HTML parser for Quill editor content
export const parseNotesForReactNative = notes => {
  if (!notes) return [];

  const result = [];
  let listCounter = 1;

  // Helper to extract text preserving nested tags
  const extractContent = htmlString => {
    // First try to get content from strong tag
    const strongMatch = htmlString.match(/<strong[^>]*>(.*?)<\/strong>/is);
    if (strongMatch) {
      const innerContent = strongMatch[1];
      // Check if there's u tag inside strong
      const uMatch = innerContent.match(/<u[^>]*>(.*?)<\/u>/is);
      if (uMatch) return uMatch[1].replace(/<[^>]*>/g, '').trim();
      return innerContent.replace(/<[^>]*>/g, '').trim();
    }

    // Then try u tag
    const uMatch = htmlString.match(/<u[^>]*>(.*?)<\/u>/is);
    if (uMatch) {
      return uMatch[1].replace(/<[^>]*>/g, '').trim();
    }

    // Finally strip all tags
    return htmlString.replace(/<[^>]*>/g, '').trim();
  };

  // Extract style properties
  const extractStyle = (element, tagType = 'p') => {
    const styles = { fontSize: 10 };

    // Alignment
    if (element.includes('ql-align-center')) styles.textAlign = 'center';
    if (element.includes('ql-align-right')) styles.textAlign = 'right';
    if (element.includes('ql-align-left')) styles.textAlign = 'left';

    // Font size
    if (element.includes('ql-size-large')) styles.fontSize = 14;
    else if (element.includes('ql-size-small')) styles.fontSize = 8;
    else if (element.includes('ql-size-huge')) styles.fontSize = 18;

    // Bold - check for strong tag
    if (element.includes('<strong')) styles.fontWeight = 'bold';

    // Underline - check for u tag
    if (element.includes('<u')) styles.textDecorationLine = 'underline';

    // Color - priority: strong > element style
    const strongColorMatch = element.match(
      /<strong[^>]*style="[^"]*color:\s*rgb\((\d+),\s*(\d+),\s*(\d+)\)/i,
    );
    if (strongColorMatch) {
      styles.color = `rgb(${strongColorMatch[1]}, ${strongColorMatch[2]}, ${strongColorMatch[3]})`;
    } else {
      const colorMatch = element.match(
        /style="[^"]*color:\s*rgb\((\d+),\s*(\d+),\s*(\d+)\)/i,
      );
      if (colorMatch) {
        styles.color = `rgb(${colorMatch[1]}, ${colorMatch[2]}, ${colorMatch[3]})`;
      }
    }

    // Background color
    const bgMatch = element.match(
      /style="[^"]*background-color:\s*rgb\((\d+),\s*(\d+),\s*(\d+)\)/i,
    );
    if (bgMatch) {
      styles.backgroundColor = `rgb(${bgMatch[1]}, ${bgMatch[2]}, ${bgMatch[3]})`;
    }

    return styles;
  };

  // Parse paragraphs
  const paragraphs = notes.match(/<p[^>]*>.*?<\/p>/gis) || [];
  paragraphs.forEach(p => {
    const text = extractContent(p);
    if (!text) return;

    const styles = extractStyle(p, 'p');

    result.push({
      type: 'paragraph',
      content: text,
      styles,
    });
  });

  // Parse ordered lists
  const lists = notes.match(/<ol[^>]*>.*?<\/ol>/gis) || [];
  lists.forEach(ol => {
    const items = ol.match(/<li[^>]*>.*?<\/li>/gis) || [];

    items.forEach(li => {
      const text = extractContent(li);
      if (!text) return;

      const styles = extractStyle(li, 'li');

      result.push({
        type: 'list',
        content: `${listCounter}. ${text}`,
        styles,
      });

      listCounter++;
    });
  });

  return result;
};

// Parse notes for React PDF (@react-pdf/renderer)
export const parseNotesForReactPDF = notes => {
  // Same as parseNotesForReactNative but formatted for @react-pdf/renderer
  return parseNotesForReactNative(notes);
};

// Render notes as HTML string for templates that expect HTML output
export const renderNotes = input => {
  const notes =
    input && typeof input === 'object' ? input.notes || '' : input || '';
  if (!notes) return '';

  try {
    let formattedNotes = String(notes)
      // Convert newlines to breaks
      .replace(/\r\n|\r|\n/g, '<br>')
      // Standardize paragraph tags to divs
      .replace(/<p>/gi, '<div style="margin-bottom:8px;">')
      .replace(/<\/p>/gi, '</div>')
      // Handle bold/strong
      .replace(/<b>(.*?)<\/b>/gi, '<strong>$1</strong>')
      // Handle italic
      .replace(/<i>(.*?)<\/i>/gi, '<em>$1</em>')
      // Handle underline
      .replace(
        /<u>(.*?)<\/u>/gi,
        '<span style="text-decoration:underline;">$1</span>',
      )
      // Convert lists to simple divs
      .replace(/<ul>/gi, '<div style="padding-left:15px;">')
      .replace(/<\/ul>/gi, '</div>')
      .replace(/<li>/gi, '<div>• ')
      .replace(/<\/li>/gi, '</div>')
      // Remove any script/style tags for safety
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .trim();

    return formattedNotes;
  } catch (e) {
    return String(notes).replace(/\r\n|\r|\n/g, '<br>');
  }
};

// ==================== INVOICE DATA UTILITIES ====================

export const getItemsBody = (transaction, serviceNameById) => {
  const lines = getUnifiedLines(transaction, serviceNameById);

  if (lines.length === 0) {
    return [
      [
        '1',
        1,
        transaction.description || 'Item',
        '',
        formatCurrency(transaction.amount ?? 0),
        '0%',
        formatCurrency(0),
        formatCurrency(transaction.amount ?? 0),
      ],
    ];
  }

  return lines.map((item, index) => [
    (index + 1).toString(),
    item.quantity || 1,
    `${item.name}\n${item.description || ''}`,
    item.code || '',
    formatCurrency(Number(item.pricePerUnit || item.amount)),
    `${item.gstPercentage || 0}%`,
    formatCurrency(item.lineTax || 0),
    formatCurrency(item.lineTotal || item.amount || 0),
  ]);
};

export const invNo = tx => {
  if (tx?.invoiceNumber) return String(tx.invoiceNumber);
  if (tx?.referenceNumber) return String(tx.referenceNumber);
  const id = tx?._id ? String(tx._id) : '';
  return `INV-${id.slice(-6).toUpperCase() || '000000'}`;
};

export const getBillingAddress = party => {
  if (!party) return 'Address not available';
  return [party.address, party.city, party.state, party.pincode]
    .filter(Boolean)
    .join(', ');
};

export const getShippingAddress = (shippingAddress, billingAddress) => {
  if (!shippingAddress) return billingAddress || 'Address not available';
  return [
    shippingAddress.address,
    shippingAddress.city,
    shippingAddress.state,
    shippingAddress.pincode,
  ]
    .filter(Boolean)
    .join(', ');
};

export const getBankDetails = bank => {
  if (!bank) return 'Bank details not available';
  if (typeof bank === 'string') return bank;
  return [
    bank.bankName,
    bank.branchAddress,
    bank.city,
    `IFSC: ${bank.ifscCode}`,
  ]
    .filter(Boolean)
    .join(', ');
};

// ==================== GST CALCULATIONS ====================

export const calculateGST = (
  amount,
  gstRate,
  tx,
  company,
  party,
  shippingAddress,
) => {
  const companyGstin = getCompanyGSTIN(company);

  // If company doesn't have GSTIN, no tax applies (unregistered dealer)
  if (!companyGstin) {
    return {
      cgst: 0,
      sgst: 0,
      igst: 0,
      isInterstate: false,
      isGSTApplicable: false,
    };
  }

  // Check if supplier state and recipient state are different (interstate)
  // If shipping address exists, compare with shipping state, otherwise compare with party billing state
  const recipientState = shippingAddress?.state || party?.state;
  const supplierState = company?.addressState;
  const isInterstate =
    supplierState && recipientState
      ? normalizeState(supplierState) !== normalizeState(recipientState)
      : false;

  // Calculate GST amounts
  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  if (isInterstate) {
    // IGST for interstate transactions
    igst = (amount * gstRate) / 100;
  } else {
    // CGST and SGST for intrastate transactions (split equally)
    const halfRate = gstRate / 2;
    cgst = (amount * halfRate) / 100;
    sgst = (amount * halfRate) / 100;
  }

  return {
    cgst,
    sgst,
    igst,
    isInterstate,
    isGSTApplicable: true,
  };
};

export const deriveTotals = (tx, company, serviceNameById) => {
  const lines = getUnifiedLines(tx, serviceNameById);

  const subtotal = lines.reduce(
    (sum, item) => sum + (Number(item.amount) || 0),
    0,
  );

  const totalTax = lines.reduce(
    (sum, item) => sum + (Number(item.lineTax) || 0),
    0,
  );

  const invoiceTotal = lines.reduce(
    (sum, item) => sum + (Number(item.lineTotal) || 0),
    0,
  );

  const gstEnabled = totalTax > 0 && !!getCompanyGSTIN(company)?.trim();

  // Apply IGST/CGST/SGST calculations
  let cgstTotal = 0;
  let sgstTotal = 0;
  let igstTotal = 0;
  lines.forEach(item => {
    const gst = calculateGST(
      item.amount || 0,
      item.gstPercentage || 0,
      tx,
      company,
    );
    cgstTotal += gst.cgst;
    sgstTotal += gst.sgst;
    igstTotal += gst.igst;
  });

  return {
    lines,
    subtotal,
    tax: totalTax,
    invoiceTotal,
    gstPct: 0, // This will be handled per item now
    gstEnabled,
    cgstTotal,
    sgstTotal,
    igstTotal,
  };
};

export const getHsnSummary = (items, showIGST, showCGSTSGST) => {
  const hsnMap = new Map();

  items.forEach(item => {
    const hsnCode = item.code || '-';
    if (!hsnMap.has(hsnCode)) {
      hsnMap.set(hsnCode, {
        hsnCode,
        taxableValue: 0,
        taxRate: item.gstRate || 0,
        taxAmount: 0,
        cgstAmount: 0,
        sgstAmount: 0,
        total: 0,
      });
    }

    const existing = hsnMap.get(hsnCode);
    existing.taxableValue += item.taxableValue;

    if (showIGST) {
      existing.taxAmount += item.igst || 0;
    } else if (showCGSTSGST) {
      existing.cgstAmount += item.cgst || 0;
      existing.sgstAmount += item.sgst || 0;
      existing.taxAmount = existing.cgstAmount + existing.sgstAmount;
    }

    existing.total += item.total;
  });

  return Array.from(hsnMap.values());
};

export const prepareTemplate8Data = (
  transaction,
  company,
  party,
  shippingAddress,
) => {
  // ✅ FIX: Agar transaction undefined hai toh return karein
  if (!transaction) {
    return {
      totals: { subTotal: 0, totalTax: 0, invoiceTotal: 0 },
      totalTaxable: 0,
      totalAmount: 0,
      items: [],
      totalItems: 0,
      totalQty: 0,
      itemsBody: [],
      itemsWithGST: [],
      totalCGST: 0,
      totalSGST: 0,
      totalIGST: 0,
      isGSTApplicable: false,
      isInterstate: false,
      showIGST: false,
      showCGSTSGST: false,
      showNoTax: true,
    };
  }

  // ✅ FIX: Agar products nahi hai toh bhi handle karein
  if (!transaction.products || !Array.isArray(transaction.products)) {
    return {
      totals: { subTotal: 0, totalTax: 0, invoiceTotal: 0 },
      totalTaxable: 0,
      totalAmount: 0,
      items: [],
      totalItems: 0,
      totalQty: 0,
      itemsBody: [],
      itemsWithGST: [],
      totalCGST: 0,
      totalSGST: 0,
      totalIGST: 0,
      isGSTApplicable: false,
      isInterstate: false,
      showIGST: false,
      showCGSTSGST: false,
      showNoTax: true,
    };
  }

  const totals = deriveTotals(transaction, company || undefined);

  const totalTaxable = totals.subtotal;
  const totalAmount = totals.invoiceTotal;

  const items = getUnifiedLines(transaction);

  const totalItems = items.length;
  const totalQty = items.reduce((sum, item) => sum + (item.quantity || 0), 0);

  const itemsBody = getItemsBody(transaction);

  // Calculate GST for each item with proper party and shipping address context
  const itemsWithGST = items.map((item, index) => {
    const taxableValue = item.amount || 0;
    const gstRate = item.gstPercentage || 0;

    const gst = calculateGST(
      taxableValue,
      gstRate,
      transaction,
      company,
      party,
      shippingAddress,
    );

    const itemResult = {
      ...item,
      taxableValue,
      cgst: gst.cgst || 0,
      sgst: gst.sgst || 0,
      igst: gst.igst || 0,
      total: taxableValue + (gst.cgst || 0) + (gst.sgst || 0) + (gst.igst || 0),
      isGSTApplicable: gst.isGSTApplicable || false,
      isInterstate: gst.isInterstate || false,
      gstRate,
    };

    return itemResult;
  });

  // Calculate total GST amounts
  const totalCGST = itemsWithGST.reduce(
    (sum, item) => sum + (item.cgst || 0),
    0,
  );
  const totalSGST = itemsWithGST.reduce(
    (sum, item) => sum + (item.sgst || 0),
    0,
  );
  const totalIGST = itemsWithGST.reduce(
    (sum, item) => sum + (item.igst || 0),
    0,
  );

  // Determine GST type based on actual calculations
  const isGSTApplicable = itemsWithGST.some(item => item.isGSTApplicable);
  const isInterstate = itemsWithGST.some(item => item.isInterstate);
  const showIGST = isGSTApplicable && isInterstate;
  const showCGSTSGST = isGSTApplicable && !isInterstate;
  const showNoTax = !isGSTApplicable;

  const finalResult = {
    totals,
    totalTaxable,
    totalAmount,
    items,
    totalItems,
    totalQty,
    itemsBody,
    itemsWithGST,
    totalCGST,
    totalSGST,
    totalIGST,
    isGSTApplicable,
    isInterstate,
    showIGST,
    showCGSTSGST,
    showNoTax,
  };

  return finalResult;
};

// ==================== PDF GENERATION (REACT NATIVE) ====================

// Generate HTML template for PDF
const generateInvoiceHTML = (
  invoiceData,
  transaction,
  company,
  party,
  shippingAddress,
) => {
  const {
    itemsWithGST,
    totalTaxable,
    totalCGST,
    totalSGST,
    totalIGST,
    totalAmount,
    showIGST,
    showCGSTSGST,
  } = invoiceData;

  const invoiceNo = invNo(transaction);
  const invoiceDate = transaction.date
    ? new Date(transaction.date).toLocaleDateString('en-IN')
    : '-';

  // Build items rows
  const itemsRows = itemsWithGST
    .map(
      (item, idx) => `
    <tr>
      <td style="border: 1px solid #ddd; padding: 8px;">${idx + 1}</td>
      <td style="border: 1px solid #ddd; padding: 8px;">${item.name || '-'}</td>
      <td style="border: 1px solid #ddd; padding: 8px;">${item.code || '-'}</td>
      <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${formatQuantity(
        item.quantity,
        item.unit,
      )}</td>
      <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${formatCurrency(
        item.amount,
      )}</td>
      <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${
        item.gstRate
      }%</td>
      <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${formatCurrency(
        item.total,
      )}</td>
    </tr>
  `,
    )
    .join('');

  // Parse and render notes
  const parsedNotes = parseNotesForReactNative(transaction.notes || '');
  const notesHTML = parsedNotes
    .map(note => {
      const style = `
      font-size: ${note.styles.fontSize}px;
      font-weight: ${note.styles.fontWeight || 'normal'};
      text-align: ${note.styles.textAlign || 'left'};
      color: ${note.styles.color || '#000'};
      background-color: ${note.styles.backgroundColor || 'transparent'};
      text-decoration: ${note.styles.textDecorationLine || 'none'};
      margin: 5px 0;
    `;
      return `<p style="${style}">${note.content}</p>`;
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .company-name { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
        .invoice-details { margin: 20px 0; }
        .address-section { display: flex; justify-content: space-between; margin: 20px 0; }
        .address-box { width: 48%; border: 1px solid #ddd; padding: 10px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th { background-color: #f5f5f5; border: 1px solid #ddd; padding: 8px; text-align: left; }
        td { border: 1px solid #ddd; padding: 8px; }
        .totals { margin-top: 20px; }
        .total-row { display: flex; justify-content: space-between; padding: 5px 0; }
        .final-total { font-weight: bold; font-size: 18px; border-top: 2px solid #000; margin-top: 10px; padding-top: 10px; }
        .notes { margin-top: 30px; padding: 15px; background-color: #f9f9f9; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-name">${company?.name || 'Company Name'}</div>
        <div>${getBillingAddress(company)}</div>
        ${
          company?.phone
            ? `<div>Phone: ${formatPhoneNumber(company.phone)}</div>`
            : ''
        }
        ${company?.email ? `<div>Email: ${company.email}</div>` : ''}
        ${
          getCompanyGSTIN(company)
            ? `<div>GSTIN: ${getCompanyGSTIN(company)}</div>`
            : ''
        }
      </div>

      <h2 style="text-align: center; margin: 20px 0;">TAX INVOICE</h2>

      <div class="invoice-details">
        <div style="display: flex; justify-content: space-between;">
          <div><strong>Invoice No:</strong> ${invoiceNo}</div>
          <div><strong>Date:</strong> ${invoiceDate}</div>
        </div>
      </div>

      <div class="address-section">
        <div class="address-box">
          <strong>Bill To:</strong><br/>
          ${party?.name || '-'}<br/>
          ${getBillingAddress(party)}<br/>
          ${party?.phone ? `Phone: ${formatPhoneNumber(party.phone)}` : ''}<br/>
          ${party?.gstin ? `GSTIN: ${party.gstin}` : ''}
        </div>
        <div class="address-box">
          <strong>Ship To:</strong><br/>
          ${
            shippingAddress
              ? getShippingAddress(shippingAddress)
              : getBillingAddress(party)
          }
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>S.No</th>
            <th>Item</th>
            <th>HSN/SAC</th>
            <th>Qty</th>
            <th>Amount</th>
            <th>GST %</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>

      <div class="totals">
        <div class="total-row">
          <span>Subtotal:</span>
          <span>${formatCurrency(totalTaxable)}</span>
        </div>
        ${
          showCGSTSGST
            ? `
          <div class="total-row">
            <span>CGST:</span>
            <span>${formatCurrency(totalCGST)}</span>
          </div>
          <div class="total-row">
            <span>SGST:</span>
            <span>${formatCurrency(totalSGST)}</span>
          </div>
        `
            : ''
        }
        ${
          showIGST
            ? `
          <div class="total-row">
            <span>IGST:</span>
            <span>${formatCurrency(totalIGST)}</span>
          </div>
        `
            : ''
        }
        <div class="total-row final-total">
          <span>Total Amount:</span>
          <span>${formatCurrency(totalAmount)}</span>
        </div>
        <div style="margin-top: 10px; font-style: italic;">
          <strong>Amount in Words:</strong> ${numberToWords(totalAmount)}
        </div>
      </div>

      ${
        notesHTML
          ? `
        <div class="notes">
          <strong>Notes:</strong>
          ${notesHTML}
        </div>
      `
          : ''
      }

      ${
        company?.bankDetails
          ? `
        <div style="margin-top: 30px; padding: 15px; border: 1px solid #ddd;">
          <strong>Bank Details:</strong><br/>
          ${getBankDetails(company.bankDetails)}
        </div>
      `
          : ''
      }

      <div style="margin-top: 40px; text-align: right;">
        <div style="margin-top: 60px; border-top: 1px solid #000; padding-top: 10px;">
          <strong>Authorized Signature</strong>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Generate PDF using react-native-html-to-pdf
export const generateInvoicePDF = async (
  invoiceData,
  transaction,
  company,
  party,
  shippingAddress = null,
  fileName = null,
) => {
  try {
    // Import react-native-html-to-pdf
    const RNHTMLtoPDF = require('react-native-html-to-pdf');

    const invoiceNo = invNo(transaction);
    const defaultFileName =
      fileName || `Invoice_${invoiceNo}_${Date.now()}.pdf`;

    // Generate HTML content
    const htmlContent = generateInvoiceHTML(
      invoiceData,
      transaction,
      company,
      party,
      shippingAddress,
    );

    // PDF options
    const options = {
      html: htmlContent,
      fileName: defaultFileName,
      directory: 'Documents',
      base64: false,
    };

    // Generate PDF
    const file = await RNHTMLtoPDF.convert(options);

    return {
      success: true,
      filePath: file.filePath,
      fileName: defaultFileName,
      message: 'PDF generated successfully',
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      filePath: null,
    };
  }
};

// Alternative: Generate PDF using jsPDF (if you prefer jsPDF approach)
export const generateInvoicePDFWithJSPDF = async (
  invoiceData,
  transaction,
  company,
  party,
  shippingAddress = null,
) => {
  try {
    // Note: This requires 'jspdf' package
    // npm install jspdf
    const jsPDF = require('jspdf').jsPDF;

    const doc = new jsPDF();
    let yPos = 20;

    // Header - Company Info
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(company?.name || 'Company Name', 105, yPos, { align: 'center' });

    yPos += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(getBillingAddress(company), 105, yPos, { align: 'center' });

    if (company?.phone) {
      yPos += 5;
      doc.text(`Phone: ${formatPhoneNumber(company.phone)}`, 105, yPos, {
        align: 'center',
      });
    }

    if (getCompanyGSTIN(company)) {
      yPos += 5;
      doc.text(`GSTIN: ${getCompanyGSTIN(company)}`, 105, yPos, {
        align: 'center',
      });
    }

    // Invoice Title
    yPos += 15;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('TAX INVOICE', 105, yPos, { align: 'center' });

    // Invoice Details
    yPos += 15;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    const invoiceNo = invNo(transaction);
    const invoiceDate = transaction.date
      ? new Date(transaction.date).toLocaleDateString('en-IN')
      : '-';

    doc.text(`Invoice No: ${invoiceNo}`, 20, yPos);
    doc.text(`Date: ${invoiceDate}`, 150, yPos);

    // Bill To & Ship To
    yPos += 10;
    doc.setFont('helvetica', 'bold');
    doc.text('Bill To:', 20, yPos);
    doc.text('Ship To:', 115, yPos);

    yPos += 5;
    doc.setFont('helvetica', 'normal');

    const billToLines = [
      party?.name || '-',
      getBillingAddress(party),
      party?.phone ? `Phone: ${formatPhoneNumber(party.phone)}` : null,
      party?.gstin ? `GSTIN: ${party.gstin}` : null,
    ].filter(Boolean);

    const shipToLines = shippingAddress
      ? getShippingAddress(shippingAddress).split(', ')
      : billToLines;

    billToLines.forEach(line => {
      doc.text(line, 20, yPos);
      yPos += 5;
    });

    let shipYPos = yPos - billToLines.length * 5;
    shipToLines.forEach(line => {
      doc.text(line, 115, shipYPos);
      shipYPos += 5;
    });

    yPos = Math.max(yPos, shipYPos) + 10;

    // Items Table
    const {
      itemsWithGST,
      totalTaxable,
      totalCGST,
      totalSGST,
      totalIGST,
      totalAmount,
      showIGST,
      showCGSTSGST,
    } = invoiceData;

    // Table headers
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(245, 245, 245);
    doc.rect(15, yPos - 5, 180, 8, 'F');

    doc.text('No', 17, yPos);
    doc.text('Item', 30, yPos);
    doc.text('HSN', 80, yPos);
    doc.text('Qty', 100, yPos);
    doc.text('Amount', 120, yPos, { align: 'right' });
    doc.text('GST%', 145, yPos, { align: 'right' });
    doc.text('Total', 180, yPos, { align: 'right' });

    yPos += 8;
    doc.setFont('helvetica', 'normal');

    // Table rows
    itemsWithGST.forEach((item, idx) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }

      doc.text((idx + 1).toString(), 17, yPos);
      doc.text(item.name || '-', 30, yPos);
      doc.text(item.code || '-', 80, yPos);
      doc.text(formatQuantity(item.quantity, item.unit), 100, yPos);
      doc.text(formatCurrency(item.amount), 120, yPos, { align: 'right' });
      doc.text(`${item.gstRate}%`, 145, yPos, { align: 'right' });
      doc.text(formatCurrency(item.total), 180, yPos, { align: 'right' });

      yPos += 7;
    });

    // Totals
    yPos += 10;
    doc.line(120, yPos - 5, 190, yPos - 5);

    doc.text('Subtotal:', 120, yPos);
    doc.text(formatCurrency(totalTaxable), 180, yPos, { align: 'right' });
    yPos += 6;

    if (showCGSTSGST) {
      doc.text('CGST:', 120, yPos);
      doc.text(formatCurrency(totalCGST), 180, yPos, { align: 'right' });
      yPos += 6;

      doc.text('SGST:', 120, yPos);
      doc.text(formatCurrency(totalSGST), 180, yPos, { align: 'right' });
      yPos += 6;
    }

    if (showIGST) {
      doc.text('IGST:', 120, yPos);
      doc.text(formatCurrency(totalIGST), 180, yPos, { align: 'right' });
      yPos += 6;
    }

    doc.setFont('helvetica', 'bold');
    doc.line(120, yPos - 2, 190, yPos - 2);
    doc.setFontSize(12);
    doc.text('Total Amount:', 120, yPos);
    doc.text(formatCurrency(totalAmount), 180, yPos, { align: 'right' });

    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    const amountWords = numberToWords(totalAmount);
    const wrappedWords = doc.splitTextToSize(
      `Amount in Words: ${amountWords}`,
      170,
    );
    doc.text(wrappedWords, 20, yPos);
    yPos += wrappedWords.length * 5 + 5;

    // Notes
    if (transaction.notes) {
      yPos += 10;
      doc.setFont('helvetica', 'bold');
      doc.text('Notes:', 20, yPos);
      yPos += 5;
      doc.setFont('helvetica', 'normal');

      const parsedNotes = parseNotesForReactNative(transaction.notes);
      parsedNotes.forEach(note => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }

        const fontSize = note.styles.fontSize || 10;
        doc.setFontSize(fontSize);

        if (note.styles.fontWeight === 'bold') {
          doc.setFont('helvetica', 'bold');
        } else {
          doc.setFont('helvetica', 'normal');
        }

        const lines = doc.splitTextToSize(note.content, 170);
        doc.text(lines, 20, yPos);
        yPos += lines.length * (fontSize * 0.4 + 2) + 3;
      });
    }

    // Bank Details
    if (company?.bankDetails) {
      yPos += 10;
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Bank Details:', 20, yPos);
      yPos += 5;
      doc.setFont('helvetica', 'normal');

      const bankLines = doc.splitTextToSize(
        getBankDetails(company.bankDetails),
        170,
      );
      doc.text(bankLines, 20, yPos);
      yPos += bankLines.length * 5;
    }

    // Signature
    doc.setFont('helvetica', 'bold');
    doc.text('Authorized Signature', 150, 280);
    doc.line(140, 278, 190, 278);

    // Save PDF to file system
    const pdfOutput = doc.output('datauristring');
    const base64Data = pdfOutput.split(',')[1];

    const fileName = `Invoice_${invoiceNo}_${Date.now()}.pdf`;
    const filePath = `${RNFS.DocumentDirectoryPath}/${fileName}`;

    await RNFS.writeFile(filePath, base64Data, 'base64');

    return {
      success: true,
      filePath,
      fileName,
      message: 'PDF generated successfully',
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      filePath: null,
    };
  }
};

// ==================== FILE OPERATIONS ====================

export const readFileFromDevice = async filePath => {
  try {
    const exists = await RNFS.exists(filePath);

    if (!exists) {
      throw new Error('File does not exist');
    }

    const content = await RNFS.readFile(filePath, 'utf8');

    return {
      success: true,
      content,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};

export const writeFileToDevice = async (filePath, content) => {
  try {
    await RNFS.writeFile(filePath, content, 'utf8');

    return {
      success: true,
      path: filePath,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};

export const shareInvoiceFile = async (filePath, title = 'Invoice') => {
  try {
    // Requires react-native-share package
    const Share = require('react-native-share');

    const shareOptions = {
      title,
      url: `file://${filePath}`,
      type: 'application/pdf',
      message: `Sharing ${title}`,
    };

    await Share.open(shareOptions);

    return {
      success: true,
      message: 'File shared successfully',
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};

export const deleteFile = async filePath => {
  try {
    const exists = await RNFS.exists(filePath);

    if (!exists) {
      throw new Error('File does not exist');
    }

    await RNFS.unlink(filePath);

    return {
      success: true,
      message: 'File deleted successfully',
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};

// ==================== COMPLETE INVOICE WORKFLOW ====================

// Complete workflow: Prepare data, generate PDF, and share
export const createAndShareInvoice = async (
  transaction,
  company,
  party,
  shippingAddress = null,
  method = 'html-to-pdf', // 'html-to-pdf' or 'jspdf'
) => {
  try {
    // Step 1: Prepare invoice data
    const invoiceData = prepareTemplate8Data(
      transaction,
      company,
      party,
      shippingAddress,
    );

    // Step 2: Generate PDF
    let pdfResult;
    if (method === 'jspdf') {
      pdfResult = await generateInvoicePDFWithJSPDF(
        invoiceData,
        transaction,
        company,
        party,
        shippingAddress,
      );
    } else {
      pdfResult = await generateInvoicePDF(
        invoiceData,
        transaction,
        company,
        party,
        shippingAddress,
      );
    }

    if (!pdfResult.success) {
      return pdfResult;
    }

    // Step 3: Share PDF
    const shareResult = await shareInvoiceFile(
      pdfResult.filePath,
      `Invoice ${invNo(transaction)}`,
    );

    return {
      success: true,
      filePath: pdfResult.filePath,
      fileName: pdfResult.fileName,
      shared: shareResult.success,
      message: 'Invoice created and shared successfully',
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};

// ==================== EXPORTS ====================

export default {
  // State utilities
  getStateCode,
  normalizeState,

  // Company utilities
  getCompanyGSTIN,

  // Formatting utilities
  formatCurrency,
  numberToWords,
  formatQuantity,
  formatPhoneNumber,

  // HTML parsing
  parseNotesForReactNative,
  parseNotesForReactPDF,

  // Invoice data utilities
  getItemsBody,
  invNo,
  getBillingAddress,
  getShippingAddress,
  getBankDetails,

  // GST calculations
  calculateGST,
  deriveTotals,
  getHsnSummary,

  // Template data
  prepareTemplate8Data,
  renderNotes,

  // PDF generation
  generateInvoiceHTML,
  generateInvoicePDF,
  generateInvoicePDFWithJSPDF,

  // File operations
  readFileFromDevice,
  writeFileToDevice,
  shareInvoiceFile,
  deleteFile,

  // Complete workflow
  createAndShareInvoice,

  // Line items
  getUnifiedLines,
};
