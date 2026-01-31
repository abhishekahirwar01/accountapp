// pdf-template12.js - Complete Code with Pagination
import { generatePDF } from 'react-native-html-to-pdf';
import {
  prepareTemplate8Data,
  formatCurrency,
  getBillingAddress,
  getShippingAddress,
  getStateCode,
  numberToWords,
  formatPhoneNumber,
  formatQuantity,
} from './pdf-utils';
import { BASE_URL } from '../config';
import { capitalizeWords } from './utils';

// Constants
const ITEMS_PER_PAGE = 40; // Adjust based on your needs
const A4_WIDTH = 595; // A4 width in points
const A4_HEIGHT = 842; // A4 height in points

// Split items into pages
const splitItemsIntoPages = (items, itemsPerPage = ITEMS_PER_PAGE) => {
  const pages = [];
  for (let i = 0; i < items.length; i += itemsPerPage) {
    pages.push(items.slice(i, i + itemsPerPage));
  }
  return pages;
};

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

// --- Main Template Component ---
const Template12 = ({
  transaction,
  company,
  party,
  shippingAddress,
  bank,
  client,
  clientName,
}) => {
  const actualShippingAddress = shippingAddress || transaction?.shippingAddress;

  // Prepare data
  const {
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
  } = prepareTemplate8Data(transaction, company, party, actualShippingAddress);

  const logoSrc = company?.logo ? `${BASE_URL}${company.logo}` : null;
  const shouldHideBankDetails = transaction.type === 'proforma';

  const bankData = bank || transaction?.bank || {};

  const isBankDetailAvailable =
    bankData?.bankName ||
    bankData?.ifscCode ||
    bankData?.qrCode ||
    bankData?.branchAddress ||
    bankData?.accountNo ||
    bankData?.upiDetails?.upiId;

  // Split items into pages
  const itemPages = splitItemsIntoPages(itemsWithGST, ITEMS_PER_PAGE);

  // Check if GST summary needs pagination
  const GST_ROWS_PER_PAGE = 15; // Rows that fit with header on a page
  const gstNeedsPagination = itemsWithGST.length > GST_ROWS_PER_PAGE;

  // Calculate total pages including GST overflow
  let totalPages = itemPages.length;
  if (gstNeedsPagination && isGSTApplicable) {
    const gstPages = Math.ceil(itemsWithGST.length / GST_ROWS_PER_PAGE);
    if (gstPages > 1) {
      totalPages += gstPages - 1; // Add extra pages for GST summary
    }
  }

  // Safe phone number formatting
  const safeFormatPhoneNumber = phoneNumber => {
    try {
      if (!phoneNumber) return '-';
      return formatPhoneNumber(phoneNumber);
    } catch (error) {
      return phoneNumber || '-';
    }
  };

  // Safe number to words
  const safeNumberToWords = amount => {
    try {
      return numberToWords(amount);
    } catch (error) {
      return `Rupees ${formatCurrency(amount)} Only`;
    }
  };

  // Format date
  const formatDateSafe = dateString => {
    try {
      if (!dateString) return '-';
      return new Date(dateString).toLocaleDateString('en-IN');
    } catch (error) {
      return dateString || '-';
    }
  };

  // Generate reusable header HTML
  const generateHeaderHTML = () => {
    return `
      <!-- Header - Logo on left, details on right -->
      <div class="header-section">
        ${
          logoSrc
            ? `
          <div class="logo-container">
            <img src="${logoSrc}" class="company-logo" />
          </div>
        `
            : ''
        }
        
        <div class="company-details-right">
          <div class="company-name">
            ${capitalizeWords(
              company?.businessName || company?.companyName || 'Company Name',
            )}
          </div>
          
          ${
            company?.gstin
              ? `
            <div class="gstin">
              <span class="bold">GSTIN:</span> ${company.gstin}
            </div>
          `
              : ''
          }
          
          <div class="company-address">
            <div>${capitalizeWords(company?.address || 'Address Line 1')}</div>
            <div>${capitalizeWords(company?.City || 'City')}, ${capitalizeWords(
      company?.addressState || 'State',
    )} - ${company?.Pincode || 'Pincode'}</div>
            <div><span class="bold">Phone:</span> ${safeFormatPhoneNumber(
              company?.mobileNumber || company?.Telephone || 'Phone',
            )}</div>
          </div>
        </div>
      </div>
      
      <!-- Invoice Title -->
      <div class="invoice-title">
        ${
          transaction.type === 'proforma'
            ? 'PROFORMA INVOICE'
            : isGSTApplicable
            ? 'TAX INVOICE'
            : 'INVOICE'
        }
      </div>
      
      <!-- Blue Divider -->
      <div class="divider-blue"></div>
      
      <!-- Three Column Section with proper alignment -->
      <div class="three-columns">
        <!-- Bill To - Left aligned -->
        <div class="column-left">
          <div class="column-title">Details of Buyer | Billed to :</div>
          
          <div class="detail-row-left">
            <div class="detail-label">Name:</div>
            <div class="detail-value">${capitalizeWords(
              party?.name || 'N/A',
            )}</div>
          </div>
          
          <div class="detail-row-left">
            <div class="detail-label">Phone:</div>
            <div class="detail-value">${safeFormatPhoneNumber(
              party?.contactNumber || '-',
            )}</div>
          </div>
          
          <div class="detail-row-left">
            <div class="detail-label">Address:</div>
            <div class="detail-value">${capitalizeWords(
              getBillingAddress(party),
            )}</div>
          </div>
          
          <div class="detail-row-left">
            <div class="detail-label">PAN:</div>
            <div class="detail-value">${party?.pan || '-'}</div>
          </div>
          
          <div class="detail-row-left">
            <div class="detail-label">GSTIN:</div>
            <div class="detail-value">${party?.gstin || '-'}</div>
          </div>
          
          <div class="detail-row-left">
            <div class="detail-label">Place of Supply:</div>
            <div class="detail-value">
              ${
                actualShippingAddress?.state
                  ? `${actualShippingAddress.state} (${
                      getStateCode(actualShippingAddress.state) || '-'
                    })`
                  : party?.state
                  ? `${party.state} (${getStateCode(party.state) || '-'})`
                  : '-'
              }
            </div>
          </div>
        </div>
        
        <!-- Ship To - Center aligned -->
        <div class="column-center">
          <div class="column-center-details">
          <div class="column-title">Details of Consigned | Shipped to :</div>
          
          <div class="detail-row">
            <div class="detail-label">Name:</div>
            <div class="detail-value">${capitalizeWords(
              actualShippingAddress?.label || party?.name || 'N/A',
            )}</div>
          </div>
          
          <div class="detail-row">
            <div class="detail-label">Address:</div>
            <div class="detail-value">
              ${capitalizeWords(
                getShippingAddress(
                  actualShippingAddress,
                  getBillingAddress(party),
                ),
              )}
            </div>
          </div>
          
          <div class="detail-row">
            <div class="detail-label">Country:</div>
            <div class="detail-value">${company?.Country}</div>
          </div>
          
          <div class="detail-row">
            <div class="detail-label">Phone:</div>
            <div class="detail-value">
              ${safeFormatPhoneNumber(
                actualShippingAddress?.phone ||
                  actualShippingAddress?.mobileNumber ||
                  party?.contactNumber ||
                  '-',
              )}
            </div>
          </div>
          
           <div class="detail-row">
            <div class="detail-label">GSTIN:</div>
            <div class="detail-value">${party?.gstin || '-'}</div>
          </div>
          
          <div class="detail-row">
            <div class="detail-label">State:</div>
            <div class="detail-value">
              ${
                actualShippingAddress?.state
                  ? `${actualShippingAddress.state} (${
                      getStateCode(actualShippingAddress.state) || '-'
                    })`
                  : party?.state
                  ? `${party.state} (${getStateCode(party.state) || '-'})`
                  : '-'
              }
            </div>
          </div>
          </div>
        </div>
        
        <!-- Invoice Details - Right aligned -->
        <div class="column-right">
          <div class="column-title" style="visibility: hidden;">Placeholder</div>
          
          <div class="detail-row-right">
            <div class="detail-label">Invoice #:</div>
            <div class="detail-value">${
              transaction?.invoiceNumber || 'N/A'
            }</div>
          </div>
          
          <div class="detail-row-right">
            <div class="detail-label">Invoice Date:</div>
            <div class="detail-value">${formatDateSafe(transaction?.date)}</div>
          </div>
          
          <div class="detail-row-right">
            <div class="detail-label">P.O. No.:</div>
            <div class="detail-value">${transaction?.voucher || '-'}</div>
          </div>
          
          <div class="detail-row-right">
            <div class="detail-label">P.O. Date:</div>
            <div class="detail-value">
              ${transaction?.poDate ? formatDateSafe(transaction.poDate) : '-'}
            </div>
          </div>
          
          ${
            isGSTApplicable
              ? `
            <div class="detail-row-right">
              <div class="detail-label">E-Way No.:</div>
              <div class="detail-value">${transaction?.eway || '-'}</div>
            </div>
          `
              : ''
          }
        </div>
      </div>
    `;
  };

  // Generate table rows for a specific page
  const generateItemRows = (pageItems, startIndex) => {
    return pageItems
      .map((item, index) => {
        return `
        <tr>
          <td style="text-align: center; padding: 3px; font-size: 9px; border-right: 1px solid #bfbfbf;">${
            startIndex + index + 1
          }</td>
          <td style="padding: 3px; font-size: 9px; border-right: 1px solid #bfbfbf; text-align: left;">${capitalizeWords(
            item.name,
          )}</td>
          <td style="text-align: center; padding: 3px; font-size: 9px; border-right: 1px solid #bfbfbf;">${
            item.code || '-'
          }</td>
          <td style="text-align: center; padding: 3px; font-size: 9px; border-right: 1px solid #bfbfbf;">${
            item.itemType === 'service'
              ? '-'
              : formatQuantity(item.quantity || 0, item.unit)
          }</td>
          <td style="text-align: center; padding: 3px; font-size: 9px; border-right: 1px solid #bfbfbf;">${formatCurrency(
            item.pricePerUnit || 0,
          )}</td>
          <td style="text-align: center; padding: 3px; font-size: 9px;">${formatCurrency(
            item.taxableValue,
          )}</td>
        </tr>
      `;
      })
      .join('');
  };

  // Generate GST summary table rows with pagination support
  const generateGSTSummaryRows = (
    startIdx = 0,
    endIdx = itemsWithGST.length,
  ) => {
    return itemsWithGST
      .slice(startIdx, endIdx)
      .map((item, index) => {
        if (showIGST) {
          return `
          <tr>
            <td style="text-align: center; padding: 5px; font-size: 10px; border-right: 1px solid #bfbfbf; border-bottom: 1px solid #bfbfbf;">${
              item.code || '-'
            }</td>
            <td style="text-align: center; padding: 5px; font-size: 10px; border-right: 1px solid #bfbfbf; border-bottom: 1px solid #bfbfbf;">${formatCurrency(
              item.taxableValue,
            )}</td>
            <td style="text-align: center; padding: 5px; font-size: 10px; border-right: 1px solid #bfbfbf; border-bottom: 1px solid #bfbfbf;">${item.gstRate.toFixed(
              2,
            )}</td>
            <td style="text-align: center; padding: 5px; font-size: 10px; border-right: 1px solid #bfbfbf; border-bottom: 1px solid #bfbfbf;">${formatCurrency(
              item.igst,
            )}</td>
            <td style="text-align: center; padding: 5px; font-size: 10px; border-bottom: 1px solid #bfbfbf;">${formatCurrency(
              item.total,
            )}</td>
          </tr>
        `;
        } else if (showCGSTSGST) {
          return `
          <tr>
            <td style="text-align: center; padding: 5px; font-size: 10px; border-right: 1px solid #bfbfbf; border-bottom: 1px solid #bfbfbf;">${
              item.code || '-'
            }</td>
            <td style="text-align: center; padding: 5px; font-size: 10px; border-right: 1px solid #bfbfbf; border-bottom: 1px solid #bfbfbf;">${formatCurrency(
              item.taxableValue,
            )}</td>
            <td style="text-align: center; padding: 5px; font-size: 10px; border-right: 1px solid #bfbfbf; border-bottom: 1px solid #bfbfbf;">${(
              item.gstRate / 2
            ).toFixed(2)}</td>
            <td style="text-align: center; padding: 5px; font-size: 10px; border-right: 1px solid #bfbfbf; border-bottom: 1px solid #bfbfbf;">${formatCurrency(
              item.cgst,
            )}</td>
            <td style="text-align: center; padding: 5px; font-size: 10px; border-right: 1px solid #bfbfbf; border-bottom: 1px solid #bfbfbf;">${(
              item.gstRate / 2
            ).toFixed(2)}</td>
            <td style="text-align: center; padding: 5px; font-size: 10px; border-right: 1px solid #bfbfbf; border-bottom: 1px solid #bfbfbf;">${formatCurrency(
              item.sgst,
            )}</td>
            <td style="text-align: center; padding: 5px; font-size: 10px; border-bottom: 1px solid #bfbfbf;">${formatCurrency(
              item.total,
            )}</td>
          </tr>
        `;
        } else {
          return `
          <tr>
            <td style="text-align: center; padding: 5px; font-size: 10px; border-right: 1px solid #bfbfbf; border-bottom: 1px solid #bfbfbf;">${
              item.code || '-'
            }</td>
            <td style="text-align: center; padding: 5px; font-size: 10px; border-right: 1px solid #bfbfbf; border-bottom: 1px solid #bfbfbf;">${formatCurrency(
              item.taxableValue,
            )}</td>
            <td style="text-align: center; padding: 5px; font-size: 10px; border-bottom: 1px solid #bfbfbf;">${formatCurrency(
              item.total,
            )}</td>
          </tr>
        `;
        }
      })
      .join('');
  };

  // Generate GST table header
  const generateGSTTableHeader = () => {
    if (showIGST) {
      return `
        <th>HSN/SAC</th>
        <th>Taxable Value (Rs.)</th>
        <th>IGST %</th>
        <th>IGST Amt (Rs.)</th>
        <th>Total (Rs.)</th>
      `;
    } else if (showCGSTSGST) {
      return `
        <th>HSN/SAC</th>
        <th>Taxable Value (Rs.)</th>
        <th>CGST %</th>
        <th>CGST Amt (Rs.)</th>
        <th>SGST %</th>
        <th>SGST Amt (Rs.)</th>
        <th>Total (Rs.)</th>
      `;
    } else {
      return `
        <th>HSN/SAC</th>
        <th>Taxable Value (Rs.)</th>
        <th>Total (Rs.)</th>
      `;
    }
  };

  // Generate GST continuation page
  const generateGSTContinuationPage = (
    startIdx,
    endIdx,
    pageIndex,
    isLastGSTPage,
  ) => {
    return `
      <div class="page">
        ${generateHeaderHTML()}
        
        <!-- GST Summary Table Continuation -->
       
        
        <table class="gst-summary-table">
          <thead>
            <tr>
              ${generateGSTTableHeader()}
            </tr>
          </thead>
          <tbody>
            ${generateGSTSummaryRows(startIdx, endIdx)}
            ${isLastGSTPage ? generateGSTTotalRow() : ''}
          </tbody>
        </table>
        
        ${
          isLastGSTPage
            ? `
        <!-- Bank Details, QR Code, and Signature -->
        <div class="bottom-section">
          <div class="bank-details-column">
            ${
              !shouldHideBankDetails && isBankDetailAvailable
                ? `
              <div class="bank-section">
                <div class="bold">Bank Details:</div>
                ${
                  bankData.bankName
                    ? `
                  <div class="bank-row">
                    <div class="bank-label">Name:</div>
                    <div class="bank-value">${capitalizeWords(
                      bankData.bankName,
                    )}</div>
                  </div>
                `
                    : ''
                }
                ${
                  bankData.branchAddress
                    ? `
                  <div class="bank-row">
                    <div class="bank-label">Branch:</div>
                    <div class="bank-value">${capitalizeWords(
                      bankData.branchAddress,
                    )}</div>
                  </div>
                `
                    : ''
                }
                ${
                  bankData.ifscCode
                    ? `
                  <div class="bank-row">
                    <div class="bank-label">IFSC:</div>
                    <div class="bank-value">${bankData.ifscCode}</div>
                  </div>
                `
                    : ''
                }
                ${
                  bankData.accountNo
                    ? `
                  <div class="bank-row">
                    <div class="bank-label">Acc. No:</div>
                    <div class="bank-value">${bankData.accountNo}</div>
                  </div>
                `
                    : ''
                }
                ${
                  bankData.upiDetails?.upiId
                    ? `
                  <div class="bank-row">
                    <div class="bank-label">UPI ID:</div>
                    <div class="bank-value">${bankData.upiDetails.upiId}</div>
                  </div>
                `
                    : ''
                }
                ${
                  bankData.upiDetails?.upiName
                    ? `
                  <div class="bank-row">
                    <div class="bank-label">UPI Name:</div>
                    <div class="bank-value">${bankData.upiDetails.upiName}</div>
                  </div>
                `
                    : ''
                }
                ${
                  bankData.upiDetails?.upiMobile
                    ? `
                  <div class="bank-row">
                    <div class="bank-label">UPI Mobile:</div>
                    <div class="bank-value">${bankData.upiDetails.upiMobile}</div>
                  </div>
                `
                    : ''
                }
              </div>
            `
                : ''
            }
          </div>
          
          ${
            bankData?.qrCode
              ? `
            <div class="qr-column">
              <div class="bold">QR Code</div>
              <img src="${BASE_URL}${bankData.qrCode}" class="qr-image" />
            </div>
          `
              : '<div class="qr-column"></div>'
          }
          
          <div class="signature-column">
            <div class="bold">For ${capitalizeWords(
              company?.businessName || 'Company',
            )}</div>
            <div class="signature-line"></div>
            <div class="Authorised">Authorised Signatory</div>
          </div>
        </div>
        
        ${
          transaction?.notes
            ? `
          <div class="notes-section">
            ${transaction.notes.replace(/\n/g, '<br>')}
          </div>
        `
            : ''
        }
        `
            : ''
        }
        
        <div class="page-number-container">
          Page ${pageIndex + 1} of ${totalPages}
        </div>
      </div>
    `;
  };
  const generateGSTTotalRow = () => {
    if (showIGST) {
      return `
      <tr>
        <td style="text-align: center; padding: 5px; font-size: 10px; border-right: 1px solid #bfbfbf; font-weight: bold;">Total</td>
        <td style="text-align: center; padding: 5px; font-size: 10px; border-right: 1px solid #bfbfbf; font-weight: bold;">${formatCurrency(
          totalTaxable,
        )}</td>
        <td style="text-align: center; padding: 5px; font-size: 10px; border-right: 1px solid #bfbfbf; font-weight: bold;">-</td>
        <td style="text-align: center; padding: 5px; font-size: 10px; border-right: 1px solid #bfbfbf; font-weight: bold;">${formatCurrency(
          totalIGST,
        )}</td>
        <td style="text-align: center; padding: 5px; font-size: 10px; font-weight: bold;">${formatCurrency(
          totalAmount,
        )}</td>
      </tr>
    `;
    } else if (showCGSTSGST) {
      return `
      <tr>
        <td style="text-align: center; padding: 5px; font-size: 10px; border-right: 1px solid #bfbfbf; font-weight: bold;">Total</td>
        <td style="text-align: center; padding: 5px; font-size: 10px; border-right: 1px solid #bfbfbf; font-weight: bold;">${formatCurrency(
          totalTaxable,
        )}</td>
        <td style="text-align: center; padding: 5px; font-size: 10px; border-right: 1px solid #bfbfbf; font-weight: bold;">-</td>
        <td style="text-align: center; padding: 5px; font-size: 10px; border-right: 1px solid #bfbfbf; font-weight: bold;">${formatCurrency(
          totalCGST,
        )}</td>
        <td style="text-align: center; padding: 5px; font-size: 10px; border-right: 1px solid #bfbfbf; font-weight: bold;">-</td>
        <td style="text-align: center; padding: 5px; font-size: 10px; border-right: 1px solid #bfbfbf; font-weight: bold;">${formatCurrency(
          totalSGST,
        )}</td>
        <td style="text-align: center; padding: 5px; font-size: 10px; font-weight: bold;">${formatCurrency(
          totalAmount,
        )}</td>
      </tr>
    `;
    } else {
      return `
      <tr>
        <td style="text-align: center; padding: 5px; font-size: 10px; border-right: 1px solid #bfbfbf; font-weight: bold;">Total</td>
        <td style="text-align: center; padding: 5px; font-size: 10px; border-right: 1px solid #bfbfbf; font-weight: bold;">${formatCurrency(
          totalTaxable,
        )}</td>
        <td style="text-align: center; padding: 5px; font-size: 10px; font-weight: bold;">${formatCurrency(
          totalAmount,
        )}</td>
      </tr>
    `;
    }
  };

  // Generate page HTML
  const generatePageHTML = (pageItems, pageIndex, startIndex, isLastPage) => {
    return `
      <div class="page">
        ${generateHeaderHTML()}
        
        <!-- Items Table -->
        <table class="items-table">
          <thead>
            <tr>
              <th>Sr. No</th>
              <th>Name of Product / Service</th>
              <th>HSN/SAC</th>
              <th>Qty</th>
              <th>Rate (Rs.)</th>
              <th>Taxable Value(Rs.)</th>
            </tr>
          </thead>
          <tbody>
            ${generateItemRows(pageItems, startIndex)}
          </tbody>
        </table>
        
        ${
          isLastPage
            ? `
        <!-- Total Items/Qty -->
        <div class="total-items">
          <span class="bold">Total Items / Qty :</span> ${totalItems} / ${totalQty}
        </div>
        
        <!-- Totals Section -->
        <div class="totals-section">
          <div class="totals-box">
            <div class="total-row">
              <div class="total-label">Taxable Amount:</div>
              <div class="total-value">Rs. ${formatCurrency(totalTaxable)}</div>
            </div>
            
            ${
              showIGST
                ? `
              <div class="total-row">
                <div class="total-label">IGST:</div>
                <div class="total-value">Rs. ${formatCurrency(totalIGST)}</div>
              </div>
            `
                : ''
            }
            
            ${
              showCGSTSGST
                ? `
              <div class="total-row">
                <div class="total-label">CGST:</div>
                <div class="total-value">Rs. ${formatCurrency(totalCGST)}</div>
              </div>
              <div class="total-row">
                <div class="total-label">SGST:</div>
                <div class="total-value">Rs. ${formatCurrency(totalSGST)}</div>
              </div>
            `
                : ''
            }
            
            <div class="total-row total-final">
              <div class="total-label">
                ${isGSTApplicable ? 'Total Amount After Tax' : 'Total Amount'}:
              </div>
              <div class="total-value">Rs. ${formatCurrency(totalAmount)}</div>
            </div>
          </div>
        </div>
        
        <!-- Total in Words -->
        <div class="total-words">
          <span class="total-words-label">Total (in words):</span> ${safeNumberToWords(
            totalAmount,
          )}
        </div>
        
        <!-- GST Summary Table - ONLY ON LAST PAGE -->
        ${
          isGSTApplicable
            ? `
        <table class="gst-summary-table">
          <thead>
            <tr>
              ${generateGSTTableHeader()}
            </tr>
          </thead>
          <tbody>
            ${
              gstNeedsPagination
                ? generateGSTSummaryRows(0, 15)
                : generateGSTSummaryRows()
            }
            ${!gstNeedsPagination ? generateGSTTotalRow() : ''}
          </tbody>
        </table>
        `
            : ''
        }
        
        <!-- Bank Details, QR Code, and Signature -->
        <div class="bottom-section">
          <!-- Bank Details -->
          <div class="bank-details-column">
            ${
              !shouldHideBankDetails && isBankDetailAvailable
                ? `
              <div class="bank-section">
                <div class="bold">Bank Details:</div>
                
                ${
                  bankData.bankName
                    ? `
                  <div class="bank-row">
                    <div class="bank-label">Name:</div>
                    <div class="bank-value">${capitalizeWords(
                      bankData.bankName,
                    )}</div>
                  </div>
                `
                    : ''
                }
                
                ${
                  bankData.branchAddress
                    ? `
                  <div class="bank-row">
                    <div class="bank-label">Branch:</div>
                    <div class="bank-value">${capitalizeWords(
                      bankData.branchAddress,
                    )}</div>
                  </div>
                `
                    : ''
                }
                
                ${
                  bankData.ifscCode
                    ? `
                  <div class="bank-row">
                    <div class="bank-label">IFSC:</div>
                    <div class="bank-value">${bankData.ifscCode}</div>
                  </div>
                `
                    : ''
                }
                
                ${
                  bankData.accountNo
                    ? `
                  <div class="bank-row">
                    <div class="bank-label">Acc. No:</div>
                    <div class="bank-value">${bankData.accountNo}</div>
                  </div>
                `
                    : ''
                }
                
                ${
                  bankData.upiDetails?.upiId
                    ? `
                  <div class="bank-row">
                    <div class="bank-label">UPI ID:</div>
                    <div class="bank-value">${bankData.upiDetails.upiId}</div>
                  </div>
                `
                    : ''
                }
                
                ${
                  bankData.upiDetails?.upiName
                    ? `
                  <div class="bank-row">
                    <div class="bank-label">UPI Name:</div>
                    <div class="bank-value">${bankData.upiDetails.upiName}</div>
                  </div>
                `
                    : ''
                }
                
                ${
                  bankData.upiDetails?.upiMobile
                    ? `
                  <div class="bank-row">
                    <div class="bank-label">UPI Mobile:</div>
                    <div class="bank-value">${bankData.upiDetails.upiMobile}</div>
                  </div>
                `
                    : ''
                }
              </div>
            `
                : ''
            }
          </div>
          
          <!-- QR Code -->
          ${
            bankData?.qrCode
              ? `
            <div class="qr-column">
              <div class="bold">QR Code</div>
              <img src="${BASE_URL}${bankData.qrCode}" class="qr-image" />
            </div>
          `
              : '<div class="qr-column"></div>'
          }
          
          <!-- Signature -->
          <div class="signature-column">
            <div class="bold">For ${capitalizeWords(
              company?.businessName || 'Company',
            )}</div>
            <div class="signature-line"></div>
            <div class="Authorised">Authorised Signatory</div>
          </div>
        </div>
        
        <!-- Notes Section -->
        ${
          transaction?.notes
            ? `
          <div class="notes-section">
            ${renderNotesHTML(transaction.notes)}
          </div>
        `
            : ''
        }
        `
            : ''
        }
        
        <!-- Page Number - Dynamic -->
        <div class="page-number-container">
          Page ${pageIndex + 1} of ${totalPages}
        </div>
      </div>
    `;
  };

  // Generate HTML
  const generateHTML = () => {
    const GST_ROWS_PER_PAGE = 15;
    const allPages = [];
    let currentPageIndex = 0;

    // Generate item pages
    let startIndex = 0;
    itemPages.forEach((pageItems, idx) => {
      const isLastItemPage = idx === itemPages.length - 1;

      allPages.push(
        generatePageHTML(
          pageItems,
          currentPageIndex,
          startIndex,
          isLastItemPage && !gstNeedsPagination,
        ),
      );

      startIndex += pageItems.length;
      currentPageIndex++;
    });

    // Generate GST continuation pages if needed
    if (
      gstNeedsPagination &&
      isGSTApplicable &&
      itemsWithGST.length > GST_ROWS_PER_PAGE
    ) {
      const gstStartIdx = GST_ROWS_PER_PAGE;
      const gstRemaining = itemsWithGST.length - GST_ROWS_PER_PAGE;
      const gstExtraPages = Math.ceil(gstRemaining / 32); // 20 rows per continuation page

      for (let i = 0; i < gstExtraPages; i++) {
        const start = gstStartIdx + i * 32;
        const end = Math.min(start + 32, itemsWithGST.length);
        const isLastGSTPage = i === gstExtraPages - 1;

        allPages.push(
          generateGSTContinuationPage(
            start,
            end,
            currentPageIndex,
            isLastGSTPage,
          ),
        );

        currentPageIndex++;
      }
    }

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
          
          html, body {
            height: auto !important;
            min-height: 100vh !important;
            width: 100%;
            overflow: visible !important;
          }
          
          body {
            font-family: Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 0;
            color: #000;
            font-size: 12px;
            line-height: 1.2;
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
            padding: 20pt 20pt 50pt 20pt;
            margin: 0 auto 15pt auto;
            box-sizing: border-box;
            overflow: visible;
            border: 1px solid #ddd;
          }
          
          .page:last-child {
            page-break-after: auto;
          }
          
          /* Header Section - Updated with logo on left, details on right */
          .header-section {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 8px;
          }
          
          .logo-container {
            flex: 0 0 auto;
            margin-right: 15px;
          }
          
          .company-logo {
            width: 60px;
            height: 60px;
          }
          
          .company-details-right {
            flex: 1;
            text-align: right;
          }
          
          .company-name {
            font-size: 14px;
            font-weight: bold;
            color: #000;
            margin-bottom: 2px;
            line-height: 1.3;
          }
          
          .gstin {
            font-size: 9px;
            margin-bottom: 2px;
            line-height: 1.3;
          }
          
          .company-address {
            font-size: 9px;
            color: #000;
            line-height: 1.3;
          }
          
          .company-address div {
            margin-bottom: 1px;
          }
          
          .invoice-title {
            text-align: center;
            font-size: 14px;
            font-weight: bold;
            margin: 8px 0;
            color: #2583C6;
          }
          
          /* Blue divider line */
          .divider-blue {
            height: 1px;
            background-color: #2583C6;
            margin: 4px 0 8px 0;
          }
          
          /* Three column layout with proper alignment */
          .three-columns {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            gap: 12px;
          }
          
          .column-left {
            flex: 1;
            text-align: left;
          }
          
          .column-center {
            flex: 1;
            text-align: center;
            padding: 0 8px;
            margin-left:40px;
          }
            .column-center-details{
            text-align: left;
            }
          
          .column-right {
            flex: 1;
            text-align: right;
          }
          
          .column-title {
            font-size: 10px;
            font-weight: bold;
            margin-bottom: 4px;
            color: #000;
          }
          
          .detail-row {
            display: flex;
            margin-bottom: 2px;
            font-size: 8px;
            line-height: 1.2;
          }
          
          .detail-row-left {
            display: flex;
            margin-bottom: 2px;
            font-size: 8px;
            line-height: 1.2;
            text-align: left;
          }
          
          .detail-row-right {
            display: flex;
            margin-bottom: 2px;
            font-size: 8px;
            line-height: 1.2;
            justify-content: flex-end;
          }
          
          .detail-label {
            width: 75px;
            font-weight: bold;
            flex-shrink: 0;
          }
          
          .detail-value {
            flex: 1;
          }
          
          /* Items Table */
          .items-table {
            width: 100%;
            border: 1px solid #bfbfbf;
            border-collapse: collapse;
            margin: 8px 0 5px 0;
          }
          
          .items-table th {
            background-color: #2583C6;
            color: white;
            font-weight: bold;
            font-size: 9px;
            padding: 4px;
            border-right: 1px solid white;
            text-align: center;
          }
          
          .items-table th:last-child {
            border-right: none;
          }
          
          .items-table td {
            padding: 3px;
            font-size: 9px;
            border-right: 1px solid #bfbfbf;
            border-bottom: 1px solid #bfbfbf;
          }
          
          .items-table td:last-child {
            border-right: none;
          }
          
          .items-table tr:last-child td {
            border-bottom: 1px solid #bfbfbf;
          }
          
          /* Total items/qty */
          .total-items {
            font-size: 9px;
            margin-bottom: 10px;
            line-height: 1.3;
          }
          
          /* Totals section */
          .totals-section {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 10px;
          }
          
          .totals-box {
            width: 250px;
          }
          
          .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
            font-size: 10px;
            line-height: 1.3;
          }
          
          .total-label {
            font-weight: bold;
          }
          
          .total-value {
            font-weight: normal;
          }
          
          .total-final {
            border-top: 1px solid #000;
            padding-top: 3px;
            margin-top: 3px;
            font-weight: bold;
          }
          
          /* Total in words */
          .total-words {
            font-size: 10px;
            margin-bottom: 15px;
            line-height: 1.3;
          }
          
          .total-words-label {
            font-weight: bold;
          }
          
          /* GST Summary Table */
          .gst-summary-table {
            width: 100%;
            border: 1px solid #bfbfbf;
            border-collapse: collapse;
            margin: 10px 0 15px 0;
          }
          
          .gst-summary-table th {
            background-color: #2583C6;
            color: white;
            font-weight: bold;
            font-size: 9px;
            padding: 5px;
            border-right: 1px solid white;
            text-align: center;
          }
          
          .gst-summary-table th:last-child {
            border-right: none;
          }
          
          .gst-summary-table td {
            padding: 4px;
            font-size: 9px;
            border-right: 1px solid #bfbfbf;
            border-bottom: 1px solid #bfbfbf;
            text-align: center;
          }
          
          .gst-summary-table td:last-child {
            border-right: none;
          }
          
          /* Bank details section */
          .bank-section {
            margin-bottom: 10px;
          }
          
          .bank-row {
            display: flex;
            font-size: 9px;
            margin-bottom: 2px;
            line-height: 1.3;
          }
          
          .bank-label {
            width: 80px;
            font-weight: bold;
            flex-shrink: 0;
          }
          
          .bank-value {
            flex: 1;
          }
          
          /* Bank + QR + Signature row */
          .bottom-section {
            display: flex;
            justify-content: space-between;
            margin-top: 15px;
            border-top: 1px solid #2583C6;
            padding-top: 10px;
          }
          
          .bank-details-column {
            flex: 2;
          }
          
          .qr-column {
            flex: 1;
            text-align: center;
            margin-right:50px;
          }
          
          .signature-column {
            flex: 1;
            text-align: center;
            margin-left:80px;
            margin-top:20px;
          }
            .Authorised{
            text-align:center;
            }
          
          .qr-image {
            width: 80px;
            height: 80px;
            margin-top: 5px;
          }
          
          .signature-line {
            margin-top: 40px;
            border-top: 1px solid #000;
            width: 150px;
            display: inline-block;
          }
          
          /* Notes section */
          .notes-section {
            // margin-top: 8px;
            border-top: 1px solid #2583C6;
            padding-top: 10px;
            font-size: 9px;
            line-height: 1.4;
            padding-left:10px;
          }
          
          /* Page number - Dynamic */
          .page-number-container {
            position: absolute;
            bottom: 20pt;
            right: 20pt;
            font-size: 9pt;
            color: #666;
            font-weight: bold;
          }
          
          /* Utility */
          .bold {
            font-weight: bold;
            margin-bottom:5px;
          }
          
          .text-center {
            text-align: center;
          }
          
          .text-right {
            text-align: right;
          }
          
          .text-left {
            text-align: left;
          }
        </style>
      </head>
      <body>
        ${allPages.join('')}
      </body>
      </html>
    `;
  };

  return generateHTML();
};

// --- PDF Generation Function ---
export const generatePdfForTemplate12 = async (
  transaction,
  company,
  party,
  serviceNameById,
  shippingAddress,
  bank,
  client,
  clientName,
) => {
  try {
    const htmlContent = Template12({
      transaction,
      company,
      party,
      shippingAddress,
      bank,
      client,
      clientName,
    });

    const options = {
      html: htmlContent,
      fileName: `invoice_${transaction.invoiceNumber || 'document'}_template12`,
      directory: 'Documents',
      width: A4_WIDTH,
      height: A4_HEIGHT,
      base64: true,
    };

    const file = await generatePDF(options);

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

export default Template12;
