import { clsx } from 'clsx';

// Simplified cn function without tailwind-merge
export function cn(...inputs) {
  return clsx(inputs);
}

export function capitalizeWords(str) {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/\b\w/g, l => l.toUpperCase());
}

// Safely get a short id tail for fallback labels
const tail = id => (id ? id.toString().slice(-6) : '');

// Build a unified list of product + service lines from a transaction
export function getUnifiedLines(
  tx,
  serviceNameById,
  productsList = [],
  servicesList = [],
) {
  if (!tx || typeof tx !== 'object') return [];

  // Helper to parse numbers safely
  const num = (n, d = 0) => {
    if (n == null || n === '') return d;
    const parsed = Number(n);
    return isNaN(parsed) ? d : parsed;
  };

  // Helper: lookup HSN/SAC from master lists when possible
  const getHsnSac = (id, type) => {
    if (!id) return '';
    if (type === 'product') {
      const p = productsList.find(
        it =>
          it &&
          it._id !== undefined &&
          it._id !== null &&
          String(it._id) === String(id),
      );
      return p?.hsn || p?.hsnCode || '';
    }
    const s = servicesList.find(
      it =>
        it &&
        it._id !== undefined &&
        it._id !== null &&
        String(it._id) === String(id),
    );
    return s?.sac || s?.sacCode || '';
  };

  const out = [];

  const pushRow = (row, itemType) => {
    const isService = itemType === 'service';

    const nameRaw =
      row.name ??
      row.productName ??
      (row.product && typeof row.product === 'object'
        ? row.product.name
        : undefined) ??
      (isService
        ? row.serviceName ??
          (row.service && typeof row.service === 'object'
            ? row.service.serviceName
            : undefined) ??
          (row.service ? serviceNameById?.get(String(row.service)) : undefined)
        : undefined) ??
      'Item';
    const name = String(nameRaw);

    const quantity = isService ? '' : row.quantity ?? '';
    const amount =
      num(row.amount) || num(row.pricePerUnit) * (Number(quantity) || 1);
    const pricePerUnit =
      num(row.pricePerUnit) ||
      (Number(quantity) > 0 ? amount / Number(quantity) : undefined);

    const gstPercentage = num(row.gstPercentage);
    const lineTax =
      row.lineTax != null
        ? num(row.lineTax)
        : gstPercentage
        ? (amount * gstPercentage) / 100
        : 0;
    const lineTotal = num(row.lineTotal) || amount + lineTax;

    const code = isService
      ? row.sac ||
        row.sacCode ||
        getHsnSac(row.service || row.serviceName, 'service')
      : row.hsn ||
        row.hsnCode ||
        (row.product && typeof row.product === 'object'
          ? row.product.hsn || row.product.hsnCode
          : getHsnSac(row.product || row.productId, 'product'));

    out.push({
      itemType,
      name,
      description: row.description || '',
      quantity: quantity === '' ? undefined : quantity,
      unit: row.unitType || row.unit || row.unitName || '',
      pricePerUnit: pricePerUnit !== undefined ? pricePerUnit : undefined,
      amount,
      gstPercentage: gstPercentage > 0 ? gstPercentage : undefined,
      lineTax: lineTax > 0 ? lineTax : undefined,
      lineTotal: lineTotal > 0 ? lineTotal : amount,
      code: code || undefined,
    });
  };

  // Legacy items
  if (Array.isArray(tx.items)) {
    tx.items.forEach(i => {
      if (i && i.product) pushRow(i, 'product');
    });
  }

  // products[]
  if (Array.isArray(tx.products)) {
    tx.products.forEach(p => {
      if (p) {
        const productId =
          p.product && typeof p.product === 'object'
            ? p.product._id
            : p.product;
        const productObj =
          p.product && typeof p.product === 'object' ? p.product : undefined;
        pushRow(
          {
            ...p,
            product: productObj,
            hsn: p.hsn || p.hsnCode || productObj?.hsn || productObj?.hsnCode,
          },
          'product',
        );
      }
    });
  }

  // services[] / service[]
  const svcArray = Array.isArray(tx.service)
    ? tx.service
    : Array.isArray(tx.services)
    ? tx.services
    : [];

  if (Array.isArray(svcArray)) {
    svcArray.forEach(s => {
      if (s) {
        pushRow(
          {
            ...s,
            service: s.service || s.serviceName,
            sac: s.sac || s.sacCode,
          },
          'service',
        );
      }
    });
  }

  // If no items, create a default from tx-level fields
  if (out.length === 0) {
    const amount = num(tx.amount);
    const gstPercentage = num(tx.gstPercentage);
    const lineTax =
      num(tx.lineTax) ||
      (amount && gstPercentage ? (amount * gstPercentage) / 100 : 0);
    const lineTotal = num(tx.totalAmount) || amount + lineTax;

    out.push({
      itemType: 'service',
      name: tx.description || 'Item',
      description: '',
      quantity: undefined,
      unit: '',
      pricePerUnit: amount,
      amount,
      gstPercentage: gstPercentage > 0 ? gstPercentage : undefined,
      lineTax: lineTax > 0 ? lineTax : undefined,
      lineTotal,
      code: undefined,
    });
  }

  return out;
}

export function parseNotesHtml(notesHtml) {
  // Extract title from first <p>
  const titleMatch = notesHtml.match(/<p[^>]*>(.*?)<\/p>/);
  const title = titleMatch
    ? titleMatch[1]
        .replace(/<[^>]*>/g, '')
        .replace(/&/g, '&')
        .trim()
    : 'Terms and Conditions';

  // Check if it's a list or paragraphs
  const isList = /<li[^>]*>/.test(notesHtml);

  if (isList) {
    // Parse as list
    const listItems = [];
    const liRegex = /<li[^>]*>(.*?)<\/li>/g;
    let match;
    while ((match = liRegex.exec(notesHtml)) !== null) {
      const cleanItem = match[1]
        .replace(/<[^>]*>/g, '')
        .replace(/&/g, '&')
        .trim();
      if (cleanItem) listItems.push(cleanItem);
    }

    return { title, isList: true, items: listItems };
  } else {
    // Parse as paragraphs
    const paragraphs = [];
    const pRegex = /<p[^>]*>(.*?)<\/p>/g;
    let match;
    let firstSkipped = false;
    while ((match = pRegex.exec(notesHtml)) !== null) {
      if (!firstSkipped) {
        firstSkipped = true; // Skip the title paragraph
        continue;
      }
      const cleanPara = match[1]
        .replace(/<[^>]*>/g, '')
        .replace(/&/g, '&')
        .trim();
      if (cleanPara) {
        paragraphs.push(cleanPara);
      }
    }

    return { title, isList: false, items: paragraphs };
  }
}
