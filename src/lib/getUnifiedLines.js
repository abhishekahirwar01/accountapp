// utils/getUnifiedLines.ts
export function getUnifiedLines(tx, serviceNameById) {
  const out = [];

  // ✅ FIX: Agar transaction undefined hai toh return empty array
  if (!tx) {
    return [];
  }

  const num = (n, d = 0) => {
    if (n == null || n === '') return d;
    const parsed = Number(n);
    return isNaN(parsed) ? d : parsed;
  };

  const pushRow = (row, itemType) => {
    const isService = itemType === 'service';

    // Name fallbacks for products and services:
    const name =
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

    const quantity = isService ? 1 : num(row.quantity, 1);
    const amount = num(row.amount) || num(row.pricePerUnit) * quantity;
    const pricePerUnit =
      num(row.pricePerUnit) || (quantity > 0 ? amount / quantity : 0);

    // FIX: Handle unitType and otherUnit properly
    let unit = 'piece'; // default fallback

    if (row.unitType === 'Other' && row.otherUnit) {
      // If unitType is "Other", use otherUnit value
      unit = row.otherUnit;
    } else if (row.unitType) {
      // If unitType has a value and it's not "Other", use unitType
      unit = row.unitType;
    } else if (row.unit) {
      // Fallback to unit if unitType is not available
      unit = row.unit;
    } else if (row.unitName) {
      // Fallback to unitName
      unit = row.unitName;
    }

    // Extract GST information
    const gstPercentage = num(row.gstPercentage);
    const lineTax = num(row.lineTax);
    const lineTotal = num(row.lineTotal) || amount + lineTax;

    const finalRow = {
      itemType,
      name,
      description: row.description || '',
      quantity,
      unit, // This will now correctly show "ft" for sand instead of "piece"
      pricePerUnit,
      amount,
      gstPercentage: gstPercentage > 0 ? gstPercentage : undefined,
      lineTax: lineTax > 0 ? lineTax : undefined,
      lineTotal: lineTotal > 0 ? lineTotal : amount,
      code: isService ? row.sac : row.hsn,
    };

    out.push(finalRow);
  };

  // Process products

  if (Array.isArray(tx.products)) {
    tx.products.forEach((p, index) => {
      pushRow(p, 'product');
    });
  } else {
  }

  // Process services

  if (Array.isArray(tx.services)) {
    tx.services.forEach((s, index) => {
      pushRow(s, 'service');
    });
  } else {
  }

  // Legacy support

  if (Array.isArray(tx.service)) {
    tx.service.forEach((s, index) => {
      pushRow(s, 'service');
    });
  } else {
  }

  // If no items found, create a default item from transaction level data
  if (out.length === 0) {
    const amount = num(tx.amount);
    const gstPercentage = num(tx.gstPercentage);
    const lineTax = num(tx.lineTax) || (amount * gstPercentage) / 100;
    const lineTotal = num(tx.totalAmount) || amount + lineTax;

    const defaultItem = {
      itemType: 'service',
      name: tx.description || 'Item',
      description: '',
      quantity: 1,
      pricePerUnit: amount,
      amount,
      gstPercentage: gstPercentage > 0 ? gstPercentage : undefined,
      lineTax: lineTax > 0 ? lineTax : undefined,
      lineTotal,
      code: undefined,
    };

    out.push(defaultItem);
  }

  return out;
}
