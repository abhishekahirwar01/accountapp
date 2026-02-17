// pdf-templateA5_2.js - Updated with proper pagination
import React from 'react';
import { generatePDF } from 'react-native-html-to-pdf';
import {
  formatCurrency,
  getBillingAddress,
  getShippingAddress,
  prepareTemplate8Data,
  getStateCode,
  numberToWords,
  getHsnSummary,
  formatQuantity,
  formatPhoneNumber,
} from './pdf-utils';
import { capitalizeWords, parseNotesHtml } from './utils';
import { BASE_URL } from '../config';

const getClientName = client => {
  if (!client) return 'Client Name';
  if (typeof client === 'string') return client;
  return client.companyName || client.contactName || 'Client Name';
};

// Constants
const ITEMS_PER_PAGE = 24; // Reduced from 20 for better fit on A5

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

// Split items into pages
const splitItemsIntoPages = (items, itemsPerPage = ITEMS_PER_PAGE) => {
  const pages = [];
  for (let i = 0; i < items.length; i += itemsPerPage) {
    pages.push(items.slice(i, i + itemsPerPage));
  }
  return pages;
};

// Generate table rows for a specific page
const generateTableRows = (
  items,
  startIndex = 0,
  isGSTApplicable,
  showIGST,
  showCGSTSGST,
  showNoTax,
) => {
  if (!items || items.length === 0) {
    return '<tr><td colspan="11" style="padding: 8px; text-align: center;">No items found</td></tr>';
  }

  return items
    .map((item, index) => {
      const itemName = capitalizeWords(
        item.name || item.description || 'Unnamed Item',
      );

      if (!isGSTApplicable || showNoTax) {
        return `
        <tr class="avoid-page-break">
          <td class="body-cell">${startIndex + index + 1}</td>
          <td class="body-cell body-left">${itemName}</td>
          <td class="body-cell">${item.code || '-'}</td>
          <td class="body-cell">${
            item.itemType === 'service'
              ? '-'
              : formatQuantity(item.quantity || 0, item.unit)
          }</td>
          <td class="body-cell">${formatCurrency(item.pricePerUnit || 0)}</td>
          <td class="body-cell">${formatCurrency(item.taxableValue)}</td>
          <td class="body-cell">${formatCurrency(item.total)}</td>
        </tr>
      `;
      } else if (showIGST) {
        return `
        <tr class="avoid-page-break">
          <td class="body-cell">${startIndex + index + 1}</td>
          <td class="body-cell body-left">${itemName}</td>
          <td class="body-cell">${item.code || '-'}</td>
          <td class="body-cell">${
            item.itemType === 'service'
              ? '-'
              : formatQuantity(item.quantity || 0, item.unit)
          }</td>
          <td class="body-cell">${formatCurrency(item.pricePerUnit || 0)}</td>
          <td class="body-cell">${formatCurrency(item.taxableValue)}</td>
          <td class="body-cell">${item.gstRate}</td>
          <td class="body-cell">${formatCurrency(item.igst)}</td>
          <td class="body-cell">${formatCurrency(item.total)}</td>
        </tr>
      `;
      } else {
        return `
        <tr class="avoid-page-break">
          <td class="body-cell">${startIndex + index + 1}</td>
          <td class="body-cell body-left">${itemName}</td>
          <td class="body-cell">${item.code || '-'}</td>
          <td class="body-cell">${
            item.itemType === 'service'
              ? '-'
              : formatQuantity(item.quantity || 0, item.unit)
          }</td>
          <td class="body-cell">${formatCurrency(item.pricePerUnit || 0)}</td>
          <td class="body-cell">${formatCurrency(item.taxableValue)}</td>
          <td class="body-cell">${(item.gstRate / 2).toFixed(2)}</td>
          <td class="body-cell">${formatCurrency(item.cgst)}</td>
          <td class="body-cell">${(item.gstRate / 2).toFixed(2)}</td>
          <td class="body-cell">${formatCurrency(item.sgst)}</td>
          <td class="body-cell">${formatCurrency(item.total)}</td>
        </tr>
      `;
      }
    })
    .join('');
};

// Generate total row
const generateTotalRow = (
  isGSTApplicable,
  showIGST,
  showCGSTSGST,
  totalTaxable,
  totalIGST,
  totalCGST,
  totalSGST,
  totalAmount,
  totalQty,
  isLastPage,
) => {
  if (!isLastPage) return ''; // Only show total row on last page

  if (!isGSTApplicable) {
    return `
      <tr class="total-row avoid-page-break">
        <td colspan="2" class="total-empty"></td>
        <td class="total-label">Total</td>
        <td class="total-value">${totalQty}</td>
        <td class="total-empty"></td>
        <td class="total-value">${formatCurrency(totalTaxable)}</td>
        <td class="total-value grand-total">${formatCurrency(totalAmount)}</td>
      </tr>
    `;
  } else if (showIGST) {
    return `
      <tr class="total-row avoid-page-break">
        <td colspan="2" class="total-empty"></td>
        <td class="total-label">Total</td>
        <td class="total-value">${totalQty}</td>
        <td class="total-empty"></td>
        <td class="total-value">${formatCurrency(totalTaxable)}</td>
        <td colspan="2" class="total-value">${formatCurrency(totalIGST)}</td>
        <td class="total-value grand-total">${formatCurrency(totalAmount)}</td>
      </tr>
    `;
  } else {
    return `
      <tr class="total-row avoid-page-break">
        <td colspan="2" class="total-empty"></td>
        <td class="total-label">Total</td>
        <td class="total-value">${totalQty}</td>
        <td class="total-empty"></td>
        <td class="total-value">${formatCurrency(totalTaxable)}</td>
        <td colspan="2" class="total-value">${formatCurrency(totalCGST)}</td>
        <td colspan="2" class="total-value">${formatCurrency(totalSGST)}</td>
        <td class="total-value grand-total">${formatCurrency(totalAmount)}</td>
      </tr>
    `;
  }
};

// Generate page HTML
const generatePageHTML = (
  pageData,
  pageIndex,
  totalPages,
  company,
  transaction,
  party,
  shippingAddress,
  isGSTApplicable,
  showIGST,
  showCGSTSGST,
  showNoTax,
  totalTaxable,
  totalIGST,
  totalCGST,
  totalSGST,
  totalAmount,
  totalItems,
  totalQty,
  amountInWords,
  bankData,
  isBankDetailAvailable,
  title,
  startIndex = 0,
  isLastPage = false,
) => {
  const logoSrc = company?.logo ? `${BASE_URL}${company.logo}` : null;

  // Helper functions
  const getCompanyValue = (key, defaultValue = '') => {
    try {
      return company?.[key] || defaultValue;
    } catch (error) {
      return defaultValue;
    }
  };

  const getPartyValue = (key, defaultValue = '') => {
    try {
      return party?.[key] || defaultValue;
    } catch (error) {
      return defaultValue;
    }
  };

  const getTransactionValue = (key, defaultValue = '') => {
    try {
      return transaction?.[key] || defaultValue;
    } catch (error) {
      return defaultValue;
    }
  };

  // Generate table headers based on GST type
  const generateTableHeaders = () => {
    if (!isGSTApplicable || showNoTax) {
      return `
        <tr class="avoid-page-break">
          <th class="header-cell" style="width: 8%;">Sr. No.</th>
          <th class="header-cell header-left" style="width: 25%;">Name of Product/Service</th>
          <th class="header-cell" style="width: 12%;">HSN/SAC</th>
          <th class="header-cell" style="width: 10%;">Qty</th>
          <th class="header-cell" style="width: 12%;">Rate<br/>(Rs.)</th>
          <th class="header-cell" style="width: 15%;">Taxable<br/>Value (Rs.)</th>
          <th class="header-cell" style="width: 18%;">Total (Rs.)</th>
        </tr>
      `;
    } else if (showIGST) {
      return `
        <tr class="avoid-page-break">
          <th class="header-cell" rowspan="2" style="width: 6%;">Sr.No.</th>
          <th class="header-cell header-left" rowspan="2" style="width: 20%;">Name of Product / Service</th>
          <th class="header-cell" rowspan="2" style="width: 10%;">HSN/SAC</th>
          <th class="header-cell" rowspan="2" style="width: 8%;">Qty</th>
          <th class="header-cell" rowspan="2" style="width: 10%;">Rate (Rs.)</th>
          <th class="header-cell" rowspan="2" style="width: 14%;">Taxable Value (Rs.)</th>
          <th class="header-cell" colspan="2" style="width: 18%;">IGST</th>
          <th class="header-cell" rowspan="2" style="width: 15%;">Total (Rs.)</th>
        </tr>
        <tr class="avoid-page-break">
          <th class="header-cell sub-header" style="width: 6%;">%</th>
          <th class="header-cell sub-header" style="width: 12%;">Amount (Rs.)</th>
        </tr>
      `;
    } else {
      return `
        <tr class="avoid-page-break">
          <th class="header-cell" rowspan="2" style="width: 5%;">Sr.<br/>No.</th>
          <th class="header-cell header-left" rowspan="2" style="width: 18%;">Name of<br/>Product/Service</th>
          <th class="header-cell" rowspan="2" style="width: 9%;">HSN/SAC</th>
          <th class="header-cell" rowspan="2" style="width: 7%;">Qty</th>
          <th class="header-cell" rowspan="2" style="width: 9%;">Rate<br/>(Rs.)</th>
          <th class="header-cell" rowspan="2" style="width: 12%;">Taxable Value<br/>(Rs.)</th>
          <th class="header-cell" colspan="2" style="width: 18%;">CGST</th>
          <th class="header-cell" colspan="2" style="width: 18%;">SGST</th>
          <th class="header-cell" rowspan="2" style="width: 14%;">Total (Rs.)</th>
        </tr>
        <tr class="avoid-page-break">
          <th class="header-cell sub-header" style="width: 5%;">%</th>
          <th class="header-cell sub-header" style="width: 8%;">Amount(Rs.)</th>
          <th class="header-cell sub-header" style="width: 5%;">%</th>
          <th class="header-cell sub-header" style="width: 8%;">Amount(Rs.)</th>
        </tr>
      `;
    }
  };

  return `
    <div class="page">
      <!-- Company Header -->
      <div class="company-header">
        <div class="company-header-content">
          ${logoSrc ? `<img src="${logoSrc}" class="header-logo" />` : ''}
          <div class="company-info">
            <div class="company-name-header">${capitalizeWords(
              getCompanyValue('businessName') ||
                getCompanyValue('companyName') ||
                'Tech Solutions Bhopal Pvt. Ltd.',
            )}</div>
            <div class="company-address-header">${
              [
                getCompanyValue('address'),
                getCompanyValue('City'),
                getCompanyValue('addressState'),
                getCompanyValue('Country'),
                getCompanyValue('Pincode'),
              ]
                .filter(Boolean)
                .join(', ') || '-'
            }</div>
            <div class="company-contact-header">
              <span><strong>Name :</strong> ${capitalizeWords(
                getClientName(party),
              )}</span>
              <span style="margin-left: 15px;"><strong>| Phone :</strong> ${
                getCompanyValue('mobileNumber')
                  ? formatPhoneNumber(getCompanyValue('mobileNumber'))
                  : getCompanyValue('Telephone')
                  ? formatPhoneNumber(getCompanyValue('Telephone'))
                  : '-'
              }</span>
            </div>
          </div>
        </div>
      </div>

      <!-- GSTIN and Tax Invoice Section -->
      <div class="tax-invoice-section">
        <div class="gstin-tax-row">
          <div class="gstin-part">
            <span class="label">GSTIN : </span>
            <span class="value">${
              getCompanyValue('gstin') || company.gstin
            }</span>
          </div>
          <div class="tax-invoice-part">
            <span class="tax-invoice-title">${title}</span>
          </div>
          <div class="recipient-part">
            <span class="recipient-text">ORIGINAL FOR RECIPIENT</span>
          </div>
        </div>
      </div>

      <!-- Main Content Grid - 2 Columns -->
      <div class="info-grid">
        <!-- Left Column - Buyer & Consignee Details -->
        <div class="info-column left-column">
          <div class="section-box">
            <div class="section-title">Details of Buyer | Billed to:</div>
            <div class="info-row">
              <span class="info-label">Name :</span>
              <span class="info-value">${capitalizeWords(
                getPartyValue('name') || 'N/A',
              )}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Address :</span>
              <span class="info-value">${
                capitalizeWords(getBillingAddress(party)) || '-'
              }</span>
            </div>
            <div class="info-row">
              <span class="info-label">Phone :</span>
              <span class="info-value">${
                getPartyValue('contactNumber')
                  ? formatPhoneNumber(getPartyValue('contactNumber'))
                  : '-'
              }</span>
            </div>
            <div class="info-row">
              <span class="info-label">GSTIN :</span>
              <span class="info-value">${getPartyValue('gstin') || '-'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">PAN :</span>
              <span class="info-value">${getPartyValue('pan') || '-'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Place of Supply :</span>
              <span class="info-value">${
                shippingAddress?.state
                  ? `${capitalizeWords(shippingAddress.state)} (${
                      getStateCode(shippingAddress.state) || '-'
                    })`
                  : getPartyValue('state')
                  ? `${capitalizeWords(getPartyValue('state'))} (${
                      getStateCode(getPartyValue('state')) || '-'
                    })`
                  : '-'
              }</span>
            </div>
          </div>

          <div class="section-box">
            <div class="section-title">Details of Consigned | Shipped to:</div>
            <div class="info-row">
              <span class="info-label">Name :</span>
              <span class="info-value">${capitalizeWords(
                shippingAddress?.label || getPartyValue('name') || 'N/A',
              )}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Address :</span>
              <span class="info-value">${capitalizeWords(
                getShippingAddress(shippingAddress, getBillingAddress(party)),
              )}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Country :</span>
              <span class="info-value">${company?.Country}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Phone :</span>
              <span class="info-value">${
                shippingAddress?.contactNumber
                  ? formatPhoneNumber(shippingAddress.contactNumber)
                  : getPartyValue('contactNumber')
                  ? formatPhoneNumber(getPartyValue('contactNumber'))
                  : '-'
              }</span>
            </div>
            <div class="info-row">
              <span class="info-label">GSTIN :</span>
              <span class="info-value">${getPartyValue('gstin') || '-'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">State :</span>
              <span class="info-value">${
                shippingAddress?.state
                  ? `${capitalizeWords(shippingAddress.state)} (${
                      getStateCode(shippingAddress.state) || '-'
                    })`
                  : getPartyValue('state')
                  ? `${capitalizeWords(getPartyValue('state'))} (${
                      getStateCode(getPartyValue('state')) || '-'
                    })`
                  : '-'
              }</span>
            </div>
          </div>
        </div>

        <!-- Right Column - Invoice Details + QR Code -->
        <div class="info-column right-column">
          <div class="invoice-details-full">
            <div class="section-box invoice-details-box">
              <div class="info-row">
                <span class="info-label">Invoice No.:</span>
                <span class="info-value">${
                  getTransactionValue('invoiceNumber') || 'INV001'
                }</span>
              </div>
              <div class="info-row">
                <span class="info-label">Invoice Date</span>
                <span class="info-value">${
                  getTransactionValue('date')
                    ? new Date(getTransactionValue('date')).toLocaleDateString(
                        'en-IN',
                        {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        },
                      )
                    : '3/12/2025'
                }</span>
              </div>
              <div class="info-row">
                <span class="info-label">Due Date</span>
                <span class="info-value">${
                  getTransactionValue('dueDate')
                    ? new Date(
                        getTransactionValue('dueDate'),
                      ).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })
                    : '3/12/2025'
                }</span>
              </div>
              <div class="info-row">
                <span class="info-label">P.O. No.</span>
                <span class="info-value">${
                  getTransactionValue('voucher') || '-'
                }</span>
              </div>
              <div class="info-row">
                <span class="info-label">E-Way No.</span>
                <span class="info-value">${
                  getTransactionValue('eway') || '-'
                }</span>
              </div>
            </div>
            
            <div class="qr-container">
              <div class="qr-title">QR Code</div>
              ${
                getTransactionValue('type') !== 'proforma' && bankData?.qrCode
                  ? `<img src="${BASE_URL}/${bankData.qrCode}" class="qr-code" />`
                  : '<div class="qr-placeholder">QR Code</div>'
              }
            </div>
          </div>
        </div>
      </div>

      <!-- Items Table -->
      <div class="items-section">
        <table class="items-table">
          <thead>
            ${generateTableHeaders()}
          </thead>
          <tbody>
            ${generateTableRows(
              pageData,
              startIndex,
              isGSTApplicable,
              showIGST,
              showCGSTSGST,
              showNoTax,
            )}
            ${generateTotalRow(
              isGSTApplicable,
              showIGST,
              showCGSTSGST,
              totalTaxable,
              totalIGST,
              totalCGST,
              totalSGST,
              totalAmount,
              totalQty,
              isLastPage,
            )}
          </tbody>
        </table>
      </div>

      ${
        isLastPage
          ? `
        <!-- Total in Words -->
        <div class="total-words avoid-page-break">
          TOTAL IN WORDS : ${amountInWords.toUpperCase()}
        </div>

        <!-- Combined Bank & Amount Details -->
        <div class="bottom-section-combined">
          <div class="combined-box">
            <!-- Left side - Bank Details -->
            <div class="bank-amount-left">
              ${
                getTransactionValue('type') !== 'proforma'
                  ? `
                <div class="bank-details-simple">
                  <div class="section-title">Bank Details</div>
                  ${
                    bankData && isBankDetailAvailable
                      ? `
                    ${
                      bankData.bankName
                        ? `
                      <div class="bank-row-simple">
                        <span class="bank-label-simple">Name:</span>
                        <span>${capitalizeWords(bankData.bankName)}</span>
                      </div>
                    `
                        : ''
                    }
                    ${
                      bankData.accountNo
                        ? `
                      <div class="bank-row-simple">
                        <span class="bank-label-simple">Acc. No:</span>
                        <span>${bankData.accountNo}</span>
                      </div>
                    `
                        : ''
                    }
                    ${
                      bankData.ifscCode
                        ? `
                      <div class="bank-row-simple">
                        <span class="bank-label-simple">IFSC:</span>
                        <span>${bankData.ifscCode}</span>
                      </div>
                    `
                        : ''
                    }
                    ${
                      bankData.branchAddress
                        ? `
                      <div class="bank-row-simple">
                        <span class="bank-label-simple">Branch:</span>
                        <span>${bankData.branchAddress}</span>
                      </div>
                    `
                        : ''
                    }
                    ${
                      bankData?.upiDetails?.upiId
                        ? `
                      <div class="bank-row-simple">
                        <span class="bank-label-simple">UPI ID:</span>
                        <span>${bankData.upiDetails.upiId}</span>
                      </div>
                    `
                        : ''
                    }
                    ${
                      bankData?.upiDetails?.upiName
                        ? `
                      <div class="bank-row-simple">
                        <span class="bank-label-simple">UPI Name:</span>
                        <span>${bankData.upiDetails.upiName}</span>
                      </div>
                    `
                        : ''
                    }
                    ${
                      bankData?.upiDetails?.upiMobile
                        ? `
                      <div class="bank-row-simple">
                        <span class="bank-label-simple">UPI Mobile:</span>
                        <span>${bankData.upiDetails.upiMobile}</span>
                      </div>
                    `
                        : ''
                    }
                  `
                      : ''
                  }
                </div>
              `
                  : ''
              }
            </div>
            
            <!-- Vertical separator -->
            <div class="vertical-separator"></div>
            
            <!-- Right side - Amount Details -->
            <div class="bank-amount-right">
              <div class="amount-details">
                <div class="amount-row">
                  <span class="amount-label">Taxable Amount</span>
                  <span class="amount-value">${formatCurrency(
                    totalTaxable,
                  )}</span>
                </div>
                ${
                  isGSTApplicable
                    ? `
                  <div class="amount-row">
                    <span class="amount-label">Total Tax</span>
                    <span class="amount-value">${formatCurrency(
                      showIGST ? totalIGST : totalCGST + totalSGST,
                    )}</span>
                  </div>
                `
                    : ''
                }
                <div class="amount-row amount-total">
                  <span class="amount-label-total">
                    ${
                      isGSTApplicable
                        ? 'Total Amount After Tax'
                        : 'Total Amount'
                    }
                  </span>
                  <span class="amount-value-total">${formatCurrency(
                    totalAmount,
                  )}</span>
                </div>
                <div class="amount-row signature">
                  <span class="amount-label-signature">
                    For ${capitalizeWords(
                      getCompanyValue('businessName') ||
                        getCompanyValue('companyName') ||
                        'Company Name',
                    )}
                  </span>
                  <span class="amount-value-signature">(E & O.E.)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Notes Section -->
        ${
          transaction?.notes
            ? `
          <div class="notes-section avoid-page-break">
            ${renderNotesHTML(transaction.notes)}
          </div>
        `
            : ''
        }
      `
          : ''
      }

      <!-- Page Number -->
      <div class="page-number">Page ${pageIndex + 1} of ${totalPages}</div>
    </div>
  `;
};

// Main Template Component
const TemplateA5_2PDF = ({
  transaction,
  company,
  party,
  shippingAddress,
  bank,
  client,
  serviceNameById = new Map(),
}) => {
  const actualShippingAddress = shippingAddress || transaction?.shippingAddress;
  const prepareData = () => {
    try {
      if (!transaction) {
        return getFallbackData();
      }

      const result = prepareTemplate8Data(
        transaction,
        company,
        party,
        actualShippingAddress,
      );

      if (!result || typeof result !== 'object') {
        return getFallbackData();
      }

      return result;
    } catch (error) {
      return getFallbackData();
    }
  };

  const getFallbackData = () => {
    return {
      totals: { total: 0, taxable: 0, tax: 0 },
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
  };

  const preparedData = prepareData();
  const {
    totalTaxable,
    totalAmount,
    totalItems,
    totalQty,
    itemsWithGST,
    totalCGST,
    totalSGST,
    totalIGST,
    isGSTApplicable,
    showIGST,
    showCGSTSGST,
    showNoTax,
  } = preparedData;

  const bankData = bank || transaction?.bank || {};
  const isBankDetailAvailable =
    bankData?.bankName ||
    bankData?.ifscCode ||
    bankData?.branchAddress ||
    bankData?.accountNo ||
    bankData?.upiDetails?.upiId;

  const title =
    transaction?.type === 'proforma'
      ? 'PROFORMA INVOICE'
      : isGSTApplicable
      ? 'TAX INVOICE'
      : 'INVOICE';

  const amountInWords = numberToWords(totalAmount) || 'FIFTY FIVE RUPEES ONLY';

  // Split items into pages
  const itemPages = splitItemsIntoPages(itemsWithGST, ITEMS_PER_PAGE);
  const totalPages = Math.max(1, itemPages.length); // Ensure at least 1 page

  // Generate HTML content for PDF
  const generateHTML = () => {
    // If items fit on one page, use single page template
    if (itemsWithGST.length <= ITEMS_PER_PAGE) {
      const singlePageHTML = generatePageHTML(
        itemsWithGST,
        0,
        1,
        company,
        transaction,
        party,
        actualShippingAddress,
        isGSTApplicable,
        showIGST,
        showCGSTSGST,
        showNoTax,
        totalTaxable,
        totalIGST,
        totalCGST,
        totalSGST,
        totalAmount,
        totalItems,
        totalQty,
        amountInWords,
        bankData,
        isBankDetailAvailable,
        title,
        0,
        true, // isLastPage
      );

      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    @media print {
      body { 
        -webkit-print-color-adjust: exact; 
        margin: 0;
        padding: 0;
      }
      
      .page {
        page-break-inside: avoid;
        break-inside: avoid;
      }
    }
    
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 8px;
      color: #000;
      line-height: 1.3;
      background: #fff;
      padding: 0;
    }

    .page {
      width: 148mm;
      min-height: 210mm;
      margin: 0 auto;
      background: white;
      position: relative;
      padding-bottom: 15mm;
    }

    /* Company Header */
    .company-header {
      margin-bottom: 3px;
      padding-bottom: 4px;
      // border-bottom: 2px solid #0066cc;
    }

    .company-header-content {
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }

    .header-logo {
      width: 50px;
      height: 50px;
      object-fit: contain;
      flex-shrink: 0;
    }

    .company-info {
      flex: 1;
    }

    .company-name-header {
      font-size: 12px;
      font-weight: bold;
      margin-bottom: 2px;
    }

    .company-address-header {
      font-size: 7px;
      margin-bottom: 2px;
      line-height: 1.3;
    }

    .company-contact-header {
      font-size: 7px;
      margin-top: 2px;
    }

    /* GSTIN and Tax Invoice Section */
    .tax-invoice-section {
      border: 1px solid #0066cc;
      margin-bottom: 0;
      background: white;
    }

    .gstin-tax-row {
      display: flex;
      align-items: center;
      padding: 3px 5px;
    }

    .gstin-part {
      flex: 0 0 35%;
      font-size: 7px;
    }

    .gstin-part .label {
      font-weight: bold;
    }

    .tax-invoice-part {
      flex: 0 0 30%;
      text-align: center;
    }

    .tax-invoice-title {
      font-size: 10px;
      font-weight: bold;
    }

    .recipient-part {
      flex: 0 0 35%;
      text-align: right;
    }

    .recipient-text {
      font-size: 7px;
      font-weight: bold;
    }

    /* Info Grid - 2 Columns */
    .info-grid {
      display: flex;
      border: 1px solid #0066cc;
      border-top: none;
      margin-bottom: 2px;
      background: white;
    }

    .info-column {
      border-right: 1px solid #0066cc;
      padding: 5px;
      vertical-align: top;
      min-height: 180px;
    }

    .info-column:last-child {
      border-right: none;
    }

    .left-column {
      width: 50%;
    }

    .right-column {
      width: 50%;
    }

    .invoice-details-full {
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .invoice-details-box {
      flex: 1;
      margin-bottom: 0;
    }

    .qr-container {
      text-align: center;
      padding-top: 8px;
      margin-top: 8px;
    }

    .qr-title {
      font-size: 8px;
      font-weight: bold;
      margin-bottom: 5px;
      color: #333;
    }

    .qr-code {
      width: 80px;
      height: 80px;
      border: 1px solid #ccc;
      background: white;
    }

    .qr-placeholder {
      width: 80px;
      height: 80px;
      border: 1px solid #ccc;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto;
      font-size: 8px;
      color: #999;
      background: #f5f5f5;
    }

    .section-box {
      margin-bottom: 10px;
    }

    .section-box:last-child {
      margin-bottom: 0;
    }

    .section-title {
      font-size: 7px;
      font-weight: bold;
      margin-bottom: 1px;
      color: #000;
    }

    .info-row {
      display: flex;
      font-size: 7px;
      margin-bottom: 2px;
      line-height: 1.4;
    }

    .info-label {
      width: 70px;
      font-weight: bold;
      flex-shrink: 0;
    }

    .info-value {
      flex: 1;
      word-wrap: break-word;
    }

    /* Items Table */
    .items-section {
      margin-bottom: 2px;
    }

    .items-table {
      width: 100%;
      border-collapse: collapse;
    }

    .items-table thead tr {
      background: rgba(3, 113, 193, 0.2);
    }

    .header-cell {
      border: 1px solid #0066cc;
      padding: 3px 2px;
      text-align: center;
      font-size: 7px;
      font-weight: bold;
      vertical-align: middle;
      line-height: 1.2;
    }

    .header-left {
      text-align: left;
      padding-left: 4px;
    }

    .sub-header {
      font-size: 6px;
      font-weight: normal;
    }

    .items-table tbody tr {
      border-bottom: 1px solid #0066cc;
      border-right: 1px solid #0066cc;
      border-left: 1px solid #0066cc;
    }

    .body-cell {
      border-right: 1px solid #0066cc;
      padding: 3px 2px;
      text-align: center;
      font-size: 7px;
      vertical-align: middle;
    }

    .body-cell:last-child {
      border-right: none;
    }

    .body-left {
      text-align: left;
      padding-left: 4px;
    }

    .total-row {
      background: rgba(3, 113, 193, 0.2);
      font-weight: bold;
    }

    .total-row td {
      padding: 4px 2px;
      text-align: center;
      font-size: 7px;
      border-right: 1px solid #0066cc;
    }

    .total-row td:last-child {
      border-right: none;
    }

    .total-empty {
      background: transparent;
      border-right: none !important;
    }

    .total-label {
      text-align: center;
      font-weight: bold;
    }

    .total-value {
      text-align: center;
      font-weight: bold;
    }

    .grand-total {
      font-weight: bold;
    }

    /* Total in Words */
    .total-words {
      border: 1px solid #0066cc;  
      padding: 7px;
      font-size: 7px;
      font-weight: bold;
    }

    /* Combined Bottom Section */
    .bottom-section-combined {
      border: 1px solid #0066cc;
      margin-bottom: 2px;
      background: white;
    }

    .combined-box {
      display: flex;
      min-height: 100px;
    }

    .bank-amount-left {
      flex: 1;
      padding: 8px;
    }

    .bank-amount-right {
      flex: 1;
      padding: 8px;
    }

    .vertical-separator {
      width: 1px;
      background: #0066cc;
    }

    .bank-details-simple {
      font-size: 7px;
    }

    .bank-row-simple {
      display: flex;
      margin-bottom: 3px;
      line-height: 1.4;
    }

    .bank-label-simple {
      width: 50px;
      font-weight: bold;
      margin-right: 5px;
      flex-shrink: 0;
    }

    .amount-details {
      font-size: 7px;
    }

    .amount-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
      padding-bottom: 2px;
    }

    .amount-label {
      font-weight: normal;
      color: #333;
    }

    .amount-value {
      font-weight: normal;
      text-align: right;
      color: #333;
    }

    .amount-total {
      background: rgba(3, 113, 193, 0.2);
      margin: 4px -8px;
      padding: 4px 8px;
    }

    .amount-label-total {
      font-weight: bold;
      color: #000;
    }

    .amount-value-total {
      font-weight: bold;
      text-align: right;
      color: #000;
    }

    .signature {
      margin-top: 8px;
      padding-top: 4px;
      border-top: 1px dashed #999;
    }

    .amount-label-signature {
      font-style: italic;
      color: #333;
    }

    .amount-value-signature {
      font-style: italic;
      text-align: right;
      color: #333;
    }

    /* Notes Section */
    .notes-section {
      border: 1px solid #0066cc;
      padding: 4px;
      font-size: 7px;
      margin-bottom: 2px;
      line-height: 1.4;
      background: white;
      padding-left: 15px;
    }

    /* Page Number */
    .page-number {
      text-align: right;
      font-size: 7px;
      color: #666;
      position: absolute;
      bottom: 5mm;
      right: 5mm;
    }
    
    /* Prevent page breaks */
    .avoid-page-break {
      page-break-inside: avoid;
      break-inside: avoid;
    }
  </style>
</head>
<body>
  ${singlePageHTML}
</body>
</html>`;
    }

    // Multi-page template
    let startIndex = 0;
    const pageHTMLs = itemPages.map((pageItems, pageIndex) => {
      const pageHTML = generatePageHTML(
        pageItems,
        pageIndex,
        totalPages,
        company,
        transaction,
        party,
        actualShippingAddress,
        isGSTApplicable,
        showIGST,
        showCGSTSGST,
        showNoTax,
        totalTaxable,
        totalIGST,
        totalCGST,
        totalSGST,
        totalAmount,
        totalItems,
        totalQty,
        amountInWords,
        bankData,
        isBankDetailAvailable,
        title,
        startIndex,
        pageIndex === totalPages - 1, // isLastPage
      );
      startIndex += pageItems.length;
      return pageHTML;
    });

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    @media print {
      body { 
        -webkit-print-color-adjust: exact; 
        margin: 0;
        padding: 0;
      }
      
      .page {
        page-break-after: always;
        page-break-inside: avoid;
      }
      
      .page:last-child {
        page-break-after: auto;
      }
    }
    
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 8px;
      color: #000;
      line-height: 1.3;
      background: #fff;
      padding: 0;
    }

    .page {
      width: 148mm;
      min-height: 210mm;
      max-height: 210mm;
      margin: 0 auto;
      background: white;
      position: relative;
      overflow: hidden;
      padding-bottom: 15mm;
    }

    /* Company Header */
    .company-header {
      margin-bottom: 3px;
      padding-bottom: 4px;
      border-bottom: 2px solid #0066cc;
    }

    .company-header-content {
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }

    .header-logo {
      width: 50px;
      height: 50px;
      object-fit: contain;
      flex-shrink: 0;
    }

    .company-info {
      flex: 1;
    }

    .company-name-header {
      font-size: 12px;
      font-weight: bold;
      margin-bottom: 2px;
    }

    .company-address-header {
      font-size: 7px;
      margin-bottom: 2px;
      line-height: 1.3;
    }

    .company-contact-header {
      font-size: 7px;
      margin-top: 2px;
    }

    /* GSTIN and Tax Invoice Section */
    .tax-invoice-section {
      border: 1px solid #0066cc;
      margin-bottom: 0;
      background: white;
    }

    .gstin-tax-row {
      display: flex;
      align-items: center;
      padding: 3px 5px;
    }

    .gstin-part {
      flex: 0 0 35%;
      font-size: 7px;
    }

    .gstin-part .label {
      font-weight: bold;
    }

    .tax-invoice-part {
      flex: 0 0 30%;
      text-align: center;
    }

    .tax-invoice-title {
      font-size: 10px;
      font-weight: bold;
    }

    .recipient-part {
      flex: 0 0 35%;
      text-align: right;
    }

    .recipient-text {
      font-size: 7px;
      font-weight: bold;
    }

    /* Info Grid - 2 Columns */
    .info-grid {
      display: flex;
      border: 1px solid #0066cc;
      border-top: none;
      margin-bottom: 2px;
      background: white;
    }

    .info-column {
      border-right: 1px solid #0066cc;
      padding: 5px;
      vertical-align: top;
      min-height: 180px;
    }

    .info-column:last-child {
      border-right: none;
    }

    .left-column {
      width: 50%;
    }

    .right-column {
      width: 50%;
    }

    .invoice-details-full {
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .invoice-details-box {
      flex: 1;
      margin-bottom: 0;
    }

    .qr-container {
      text-align: center;
      padding-top: 8px;
      margin-top: 8px;
    }

    .qr-title {
      font-size: 8px;
      font-weight: bold;
      margin-bottom: 5px;
      color: #333;
    }

    .qr-code {
      width: 80px;
      height: 80px;
      border: 1px solid #ccc;
      background: white;
    }

    .qr-placeholder {
      width: 80px;
      height: 80px;
      border: 1px solid #ccc;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto;
      font-size: 8px;
      color: #999;
      background: #f5f5f5;
    }

    .section-box {
      margin-bottom: 10px;
    }

    .section-box:last-child {
      margin-bottom: 0;
    }

    .section-title {
      font-size: 7px;
      font-weight: bold;
      margin-bottom: 1px;
      color: #000;
    }

    .info-row {
      display: flex;
      font-size: 7px;
      margin-bottom: 2px;
      line-height: 1.4;
    }

    .info-label {
      width: 70px;
      font-weight: bold;
      flex-shrink: 0;
    }

    .info-value {
      flex: 1;
      word-wrap: break-word;
    }

    /* Items Table */
    .items-section {
      margin-bottom: 2px;
    }

    .items-table {
      width: 100%;
      border-collapse: collapse;
    }

    .items-table thead tr {
      background: rgba(3, 113, 193, 0.2);
    }

    .header-cell {
      border: 1px solid #0066cc;
      padding: 3px 2px;
      text-align: center;
      font-size: 7px;
      font-weight: bold;
      vertical-align: middle;
      line-height: 1.2;
    }

    .header-left {
      text-align: left;
      padding-left: 4px;
    }

    .sub-header {
      font-size: 6px;
      font-weight: normal;
    }

    .items-table tbody tr {
      border-bottom: 1px solid #0066cc;
      border-right: 1px solid #0066cc;
      border-left: 1px solid #0066cc;
    }

    .body-cell {
      border-right: 1px solid #0066cc;
      padding: 3px 2px;
      text-align: center;
      font-size: 7px;
      vertical-align: middle;
    }

    .body-cell:last-child {
      border-right: none;
    }

    .body-left {
      text-align: left;
      padding-left: 4px;
    }

    .total-row {
      background: rgba(3, 113, 193, 0.2);
      font-weight: bold;
    }

    .total-row td {
      padding: 4px 2px;
      text-align: center;
      font-size: 7px;
      border-right: 1px solid #0066cc;
    }

    .total-row td:last-child {
      border-right: none;
    }

    .total-empty {
      background: transparent;
      border-right: none !important;
    }

    .total-label {
      text-align: center;
      font-weight: bold;
    }

    .total-value {
      text-align: center;
      font-weight: bold;
    }

    .grand-total {
      font-weight: bold;
    }

    /* Total in Words */
    .total-words {
      border: 1px solid #0066cc;  
      padding: 7px;
      font-size: 7px;
      font-weight: bold;
    }

    /* Combined Bottom Section */
    .bottom-section-combined {
      border: 1px solid #0066cc;
      margin-bottom: 2px;
      background: white;
    }

    .combined-box {
      display: flex;
      min-height: 100px;
    }

    .bank-amount-left {
      flex: 1;
      padding: 8px;
    }

    .bank-amount-right {
      flex: 1;
      padding: 8px;
    }

    .vertical-separator {
      width: 1px;
      background: #0066cc;
    }

    .bank-details-simple {
      font-size: 7px;
    }

    .bank-row-simple {
      display: flex;
      margin-bottom: 3px;
      line-height: 1.4;
    }

    .bank-label-simple {
      width: 50px;
      font-weight: bold;
      margin-right: 5px;
      flex-shrink: 0;
    }

    .amount-details {
      font-size: 7px;
    }

    .amount-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
      padding-bottom: 2px;
    }

    .amount-label {
      font-weight: normal;
      color: #333;
    }

    .amount-value {
      font-weight: normal;
      text-align: right;
      color: #333;
    }

    .amount-total {
      background: rgba(3, 113, 193, 0.2);
      margin: 4px -8px;
      padding: 4px 8px;
    }

    .amount-label-total {
      font-weight: bold;
      color: #000;
    }

    .amount-value-total {
      font-weight: bold;
      text-align: right;
      color: #000;
    }

    .signature {
      margin-top: 8px;
      padding-top: 4px;
      border-top: 1px dashed #999;
    }

    .amount-label-signature {
      font-style: italic;
      color: #333;
    }

    .amount-value-signature {
      font-style: italic;
      text-align: right;
      color: #333;
    }

    /* Notes Section */
    .notes-section {
      border: 1px solid #0066cc;
      padding: 4px;
      font-size: 7px;
      margin-bottom: 2px;
      line-height: 1.4;
      background: white;
    }

    /* Page Number */
    .page-number {
      text-align: right;
      font-size: 7px;
      color: #666;
      position: absolute;
      bottom: 5mm;
      right: 5mm;
    }
    
    /* Prevent page breaks */
    .avoid-page-break {
      page-break-inside: avoid;
      break-inside: avoid;
    }
  </style>
</head>
<body>
  ${pageHTMLs.join('')}
</body>
</html>`;
  };

  return generateHTML();
};

// Generate PDF function
export const generatePdfForTemplateA5_2 = async (
  transaction,
  company,
  party,
  serviceNameById = new Map(),
  shippingAddress,
  bank,
  client,
) => {
  try {
    if (!transaction) {
      throw new Error('Transaction is required to generate PDF');
    }

    const HTMLContent = TemplateA5_2PDF({
      transaction,
      company: company || {},
      party: party || {},
      shippingAddress,
      bank,
      client,
      serviceNameById,
    });

    const options = {
      html: HTMLContent,
      fileName: `invoice_${
        transaction?.invoiceNumber || 'document'
      }_${Date.now()}`,
      directory: 'Documents',
      base64: false,
      height: 595, // A5 height in points
      width: 420, // A5 width in points
    };

    const file = await generatePDF(options);

    if (!file || !file.filePath) {
      throw new Error('PDF generation failed - no file path returned');
    }

    return file;
  } catch (error) {
    throw new Error(`PDF generation failed: ${error.message}`);
  }
};

export default TemplateA5_2PDF;
