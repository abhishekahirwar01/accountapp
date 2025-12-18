// pdf-templateA5.js
import React from 'react';
import {
  formatCurrency,
  getBillingAddress,
  getShippingAddress,
  prepareTemplate8Data,
  getStateCode,
  numberToWords,
  getHsnSummary,
  formatPhoneNumber,
  formatQuantity,
} from './pdf-utils';
import { capitalizeWords } from './utils';
import { BASE_URL } from '../config';
import { generatePDF } from 'react-native-html-to-pdf';

// Constants
const PRIMARY_BLUE = '#0371C1';
const LIGHT_BLUE_BG = 'rgba(3, 113, 193, 0.2)';
const ITEMS_PER_PAGE = 15; // A5 में कम items दिखाएंगे

// HTML Notes Rendering Function
const renderNotesHTML = notes => {
  if (!notes) return '';

  try {
    let formattedNotes = notes
      .replace(/\n/g, '<br>')
      .replace(/<br\s*\/?>/gi, '<br>')
      .replace(/<p>/gi, '<div style="margin-bottom: 4px;">')
      .replace(/<\/p>/gi, '</div>')
      .replace(
        /<b>(.*?)<\/b>/gi,
        '<strong style="font-weight: bold;">$1</strong>',
      )
      .replace(
        /<strong>(.*?)<\/strong>/gi,
        '<strong style="font-weight: bold;">$1</strong>',
      )
      .replace(/<i>(.*?)<\/i>/gi, '<em style="font-style: italic;">$1</em>')
      .replace(
        /<u>(.*?)<\/u>/gi,
        '<span style="text-decoration: underline;">$1</span>',
      )
      .replace(/<ul>/gi, '<div style="padding-left: 10px;">')
      .replace(/<\/ul>/gi, '</div>')
      .replace(/<li>/gi, '<div style="margin-bottom: 2px;">• ')
      .replace(/<\/li>/gi, '</div>')
      .trim();

    return formattedNotes;
  } catch (error) {
    console.error('Error rendering notes HTML:', error);
    return notes.replace(/\n/g, '<br>');
  }
};

// Safe Phone Number Formatting
const safeFormatPhoneNumber = phoneNumber => {
  try {
    if (!phoneNumber) return '-';
    return formatPhoneNumber(phoneNumber);
  } catch (error) {
    console.error('Error formatting phone number:', error);
    return phoneNumber || '-';
  }
};

// Safe Number to Words
const safeNumberToWords = amount => {
  try {
    return numberToWords(amount);
  } catch (error) {
    console.error('Error converting number to words:', error);
    return `Rupees ${formatCurrency(amount)} Only`;
  }
};

// Split items into chunks for pagination
const splitItemsIntoPages = (items, itemsPerPage = ITEMS_PER_PAGE) => {
  const pages = [];
  for (let i = 0; i < items.length; i += itemsPerPage) {
    pages.push(items.slice(i, i + itemsPerPage));
  }
  return pages;
};

// Main PDF Component
const TemplateA5_5 = ({
  transaction,
  company,
  party,
  shippingAddress,
  bank,
  client,
}) => {
  const {
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
  } = prepareTemplate8Data(transaction, company, party, shippingAddress);

  const logoSrc = company?.logo ? `${BASE_URL}${company.logo}` : null;
  const bankData = bank || {};

  // Check if any bank detail is available
  const isBankDetailAvailable =
    bankData?.bankName ||
    bankData?.ifscCode ||
    bankData?.qrCode ||
    bankData?.branchAddress ||
    bankData?.accountNo ||
    bankData?.upiDetails?.upiId;

  // Column configurations for A5
  const colWidthsIGST = ['5%', '28%', '8%', '6%', '8%', '15%', '18%', '12%'];
  const totalColumnIndexIGST = 7;

  const colWidthsCGSTSGST = [
    '5%',
    '26%',
    '8%',
    '6%',
    '8%',
    '12%',
    '12%',
    '12%',
    '11%',
  ];
  const totalColumnIndexCGSTSGST = 8;

  const colWidthsNoTax = ['8%', '32%', '8%', '8%', '10%', '17%', '17%'];
  const totalColumnIndexNoTax = 6;

  const colWidths = showIGST
    ? colWidthsIGST
    : showCGSTSGST
    ? colWidthsCGSTSGST
    : colWidthsNoTax;
  const totalColumnIndex = showIGST
    ? totalColumnIndexIGST
    : showCGSTSGST
    ? totalColumnIndexCGSTSGST
    : totalColumnIndexNoTax;

  // Split items into pages
  const itemPages = splitItemsIntoPages(itemsWithGST, ITEMS_PER_PAGE);
  const totalPages = itemPages.length;

  // Safe date formatting
  const formatDateSafe = dateString => {
    try {
      if (!dateString) return '-';
      return new Date(dateString).toLocaleDateString('en-IN');
    } catch (error) {
      return dateString || '-';
    }
  };

  // Generate HSN Summary table HTML (only for last page)
  const generateHsnSummaryHTML = () => {
    if (!isGSTApplicable) return '';

    try {
      const hsnSummary = getHsnSummary(itemsWithGST, showIGST, showCGSTSGST);
      const hsnColWidths = showIGST
        ? ['25%', '18%', '32%', '25%']
        : showCGSTSGST
        ? ['18%', '18%', '22%', '22%', '20%']
        : ['38%', '31%', '31%'];

      const hsnTotalColumnIndex = showIGST ? 3 : showCGSTSGST ? 4 : 2;

      return `
        <div class="hsn-tax-table">
          <div class="hsn-tax-table-header">
            <div class="hsn-tax-header-cell" style="width: ${
              hsnColWidths[0]
            }">HSN / SAC</div>
            <div class="hsn-tax-header-cell" style="width: ${
              hsnColWidths[1]
            }">Taxable Value (Rs.)</div>
            ${
              showIGST
                ? `
              <div class="igst-header" style="width: ${hsnColWidths[2]}; border-right: 1px solid ${PRIMARY_BLUE};">
                <div class="igst-main-header">IGST</div>
                <div class="igst-sub-header">
                  <div class="igst-sub-percentage">%</div>
                  <div class="igst-sub-text">Amount (Rs.)</div>
                </div>
              </div>
            `
                : showCGSTSGST
                ? `
              <div class="igst-header" style="width: ${hsnColWidths[2]}; border-right: 1px solid ${PRIMARY_BLUE};">
                <div class="igst-main-header">CGST</div>
                <div class="igst-sub-header">
                  <div class="igst-sub-percentage">%</div>
                  <div class="igst-sub-text">Amount (Rs.)</div>
                </div>
              </div>
              <div class="igst-header" style="width: ${hsnColWidths[3]}">
                <div class="igst-main-header">SGST</div>
                <div class="igst-sub-header">
                  <div class="igst-sub-percentage">%</div>
                  <div class="igst-sub-text">Amount (Rs.)</div>
                </div>
              </div>
            `
                : ''
            }
            <div class="hsn-tax-header-cell" style="width: ${
              hsnColWidths[hsnTotalColumnIndex]
            }; border-left: 1px solid ${PRIMARY_BLUE}; border-right: none;">Total</div>
          </div>

          ${hsnSummary
            .map(
              (hsnItem, index) => `
            <div class="hsn-tax-table-row">
              <div class="hsn-tax-cell" style="width: ${hsnColWidths[0]}">${
                hsnItem.hsnCode
              }</div>
              <div class="hsn-tax-cell" style="width: ${
                hsnColWidths[1]
              }">${formatCurrency(hsnItem.taxableValue)}</div>
              ${
                showIGST
                  ? `
                <div class="igst-cell" style="width: ${hsnColWidths[2]}">
                  <div class="igst-percent">${hsnItem.taxRate}</div>
                  <div class="igst-amount">${formatCurrency(
                    hsnItem.taxAmount,
                  )}</div>
                </div>
              `
                  : showCGSTSGST
                  ? `
                <div class="igst-cell" style="width: ${
                  hsnColWidths[2]
                }; border-right: 1px solid ${PRIMARY_BLUE};">
                  <div class="igst-percent">${hsnItem.taxRate / 2}</div>
                  <div class="igst-amount">${formatCurrency(
                    hsnItem.cgstAmount,
                  )}</div>
                </div>
                <div class="igst-cell" style="width: ${hsnColWidths[3]}">
                  <div class="igst-percent">${hsnItem.taxRate / 2}</div>
                  <div class="igst-amount">${formatCurrency(
                    hsnItem.sgstAmount,
                  )}</div>
                </div>
              `
                  : ''
              }
              <div class="hsn-tax-cell" style="width: ${
                hsnColWidths[hsnTotalColumnIndex]
              }; border-left: 1px solid ${PRIMARY_BLUE}; border-right: none;">${formatCurrency(
                hsnItem.total,
              )}</div>
            </div>
          `,
            )
            .join('')}

          <div class="hsn-tax-table-total-row">
            <div class="hsn-tax-total-cell" style="width: ${
              hsnColWidths[0]
            }">Total</div>
            <div class="hsn-tax-total-cell" style="width: ${
              hsnColWidths[1]
            }">${formatCurrency(totalTaxable)}</div>
            ${
              showIGST
                ? `
              <div class="hsn-tax-total-cell" style="width: ${
                hsnColWidths[2]
              }; border-right: 1px solid ${PRIMARY_BLUE};">${formatCurrency(
                    totalIGST,
                  )}</div>
            `
                : showCGSTSGST
                ? `
              <div class="hsn-tax-total-cell" style="width: ${
                hsnColWidths[2]
              }; border-right: 1px solid ${PRIMARY_BLUE};">${formatCurrency(
                    totalCGST,
                  )}</div>
              <div class="hsn-tax-total-cell" style="width: ${
                hsnColWidths[3]
              }">${formatCurrency(totalSGST)}</div>
            `
                : ''
            }
            <div class="hsn-tax-total-cell" style="width: ${
              hsnColWidths[hsnTotalColumnIndex]
            }; border-left: 1px solid ${PRIMARY_BLUE}; border-right: none;">${formatCurrency(
        totalAmount,
      )}</div>
          </div>
        </div>
      `;
    } catch (error) {
      console.error('Error generating HSN summary:', error);
      return '';
    }
  };

  // Generate items table for each page
  const generateItemsTable = (pageItems, isLastPage, startIndex) => {
    return `
      <!-- Table Header -->
      <div class="items-table-header">
        <div class="header-cell" style="width: ${colWidths[0]}">Sr. No.</div>
        <div class="header-cell product-cell" style="width: ${
          colWidths[1]
        }">Name of Product/Service</div>
        <div class="header-cell" style="width: ${colWidths[2]}">HSN/SAC</div>
        <div class="header-cell" style="width: ${colWidths[3]}">Qty</div>
        <div class="header-cell" style="width: ${colWidths[4]}">Rate (Rs.)</div>
        <div class="header-cell bg-highlight" style="width: ${
          colWidths[5]
        }">Taxable Value (Rs.)</div>

        ${
          showIGST
            ? `
          <div class="igst-header" style="width: ${colWidths[6]}">
            <div class="igst-main-header">IGST</div>
            <div class="igst-sub-header">
              <div class="igst-sub-percentage">%</div>
              <div class="igst-sub-text">Amount (Rs.)</div>
            </div>
          </div>
          `
            : showCGSTSGST
            ? `
          <div class="igst-header" style="width: ${colWidths[6]}">
            <div class="igst-main-header">CGST</div>
            <div class="igst-sub-header">
              <div class="igst-sub-percentage">%</div>
              <div class="igst-sub-text">Amount (Rs.)</div>
            </div>
          </div>
          <div class="igst-header" style="width: ${colWidths[7]}">
            <div class="igst-main-header">SGST</div>
            <div class="igst-sub-header">
              <div class="igst-sub-percentage">%</div>
              <div class="igst-sub-text">Amount (Rs.)</div>
            </div>
          </div>
          `
            : ''
        }

        <div class="header-cell bg-highlight" style="width: ${
          colWidths[totalColumnIndex]
        }">Total (Rs.)</div>
      </div>

      <!-- Table Rows -->
      ${pageItems
        .map(
          (item, index) => `
        <div class="items-table-row">
          <div class="table-cell" style="width: ${colWidths[0]}">${
            startIndex + index + 1
          }</div>
          <div class="table-cell product-cell" style="width: ${
            colWidths[1]
          }">${capitalizeWords(item.name)}</div>
          <div class="table-cell" style="width: ${colWidths[2]}">${
            item.code || '-'
          }</div>
          <div class="table-cell" style="width: ${colWidths[3]}">
            ${
              item.itemType === 'service'
                ? '-'
                : formatQuantity(item.quantity || 0, item.unit)
            }
          </div>
          <div class="table-cell" style="width: ${
            colWidths[4]
          }">${formatCurrency(item.pricePerUnit || 0)}</div>
          <div class="table-cell bg-highlight" style="width: ${
            colWidths[5]
          }">${formatCurrency(item.taxableValue)}</div>
          
          ${
            showIGST
              ? `
          <div class="igst-cell" style="width: ${colWidths[6]}">
            <div class="igst-percent">${item.gstRate}</div>
            <div class="igst-amount">${formatCurrency(item.igst)}</div>
          </div>
          `
              : showCGSTSGST
              ? `
          <div class="igst-cell" style="width: ${colWidths[6]}">
            <div class="igst-percent">${item.gstRate / 2}</div>
            <div class="igst-amount">${formatCurrency(item.cgst)}</div>
          </div>
          <div class="igst-cell" style="width: ${colWidths[7]}">
            <div class="igst-percent">${item.gstRate / 2}</div>
            <div class="igst-amount">${formatCurrency(item.sgst)}</div>
          </div>
          `
              : ''
          }
          
          <div class="table-cell bg-highlight" style="width: ${
            colWidths[totalColumnIndex]
          }">${formatCurrency(item.total)}</div>
        </div>
      `,
        )
        .join('')}

      ${
        isLastPage
          ? `
      <!-- Total Row -->
      <div class="items-table-total-row">
        <div class="table-cell" style="width: ${colWidths[0]}"></div>
        <div class="table-cell" style="width: ${colWidths[1]}"></div>
        <div class="table-cell font-bold" style="width: ${
          colWidths[2]
        }">Total</div>
        <div class="table-cell font-bold" style="width: ${
          colWidths[3]
        }">${totalQty}</div>
        <div class="table-cell" style="width: ${colWidths[4]}"></div>
        <div class="table-cell font-bold bg-highlight" style="width: ${
          colWidths[5]
        }">${formatCurrency(totalTaxable)}</div>
        
        ${
          showIGST
            ? `
          <div class="table-cell font-bold" style="width: ${
            colWidths[6]
          }">${formatCurrency(totalIGST)}</div>
          `
            : showCGSTSGST
            ? `
          <div class="table-cell font-bold" style="width: ${
            colWidths[6]
          }">${formatCurrency(totalCGST)}</div>
          <div class="table-cell font-bold" style="width: ${
            colWidths[7]
          }">${formatCurrency(totalSGST)}</div>
          `
            : ''
        }
        
        <div class="table-cell font-bold bg-highlight" style="width: ${
          colWidths[totalColumnIndex]
        }">${formatCurrency(totalAmount)}</div>
      </div>
      `
          : ''
      }
    `;
  };

  // Generate new header section matching the image
  const generateHeaderSection = () => {
    const companyName =
      company?.businessName || company?.companyName || 'Ak Electronics Shop';

    return `
      <!-- Top Company Info Section -->
      <div class="top-company-info">
        <div class="company-name">${capitalizeWords(companyName)}</div>
        <div class="company-address">
          ${[
            company?.address || 'HIG B-58, Sector A, Volga Nagar, Bhopal',
            company?.City || 'Bhopal',
            company?.addressState || 'Madhya Pradesh',
            company?.Country || 'India',
            company?.Pincode || '462010',
          ]
            .filter(Boolean)
            .join(', ')}
        </div>
        <div class="company-contact">
          <span class="contact-item">
            Phone: ${
              company?.mobileNumber
                ? safeFormatPhoneNumber(String(company.mobileNumber))
                : company?.Telephone
                ? safeFormatPhoneNumber(String(company.Telephone))
                : '+9999-8889'
            }
          </span>
          <span class="contact-item">
            E-mail: ${company?.email || 'akelectronics@gmail.com'}
          </span>
          <span class="contact-item">
            Telephone: ${
              company?.mobileNumber
                ? safeFormatPhoneNumber(String(company.mobileNumber))
                : company?.Telephone
                ? safeFormatPhoneNumber(String(company.Telephone))
                : '+8888773680'
            }
          </span>
        </div>
      
      </div>

      <!-- GSTIN and Invoice Type Section -->
      <div class="gstin-invoice-section">
        <div class="gstin-number">
          GSTIN : ${company?.gstin || '1/ABCDE1234F225'}
        </div>
        <div class="invoice-type">
          ${
            transaction.type === 'proforma'
              ? 'PROFORMA INVOICE'
              : isGSTApplicable
              ? 'TAX INVOICE'
              : 'INVOICE'
          }
        </div>
        <div class="original-recipient">ORIGINAL FOR RECIPIENT</div>
      </div>
      

      <!-- Three Columns Section -->
      <div class="three-col-section">
        <!-- Column 1 - Details of Buyer -->
        <div class="col-section">
          <div class="col-header">
            <div class="col-header-title">Details of Buyer | Billed for</div>
          </div>
          <div class="col-data-row">
            <div class="col-label">Name</div>
            <div class="col-value">${capitalizeWords(
              party?.name || 'N/A',
            )}</div>
          </div>
          <div class="col-data-row">
            <div class="col-label">Address</div>
            <div class="col-value">
              ${capitalizeWords(getBillingAddress(party)) || '-'}
            </div>
          </div>
          <div class="col-data-row">
            <div class="col-label">Phone</div>
            <div class="col-value">
              ${
                party?.contactNumber
                  ? safeFormatPhoneNumber(party.contactNumber)
                  : '-'
              }
            </div>
          </div>
          <div class="col-data-row">
            <div class="col-label">GSTIN</div>
            <div class="col-value">${party?.gstin || '-'}</div>
          </div>
           <div class="col-data-row">
            <div class="col-label">PAN</div>
            <div class="col-value">${party?.pan || '-'}</div>
          </div>
          <div class="col-data-row">
            <div class="col-label">Place of Supply</div>
            <div class="col-value">
              ${
                shippingAddress?.state
                  ? `${capitalizeWords(shippingAddress.state)} (${
                      getStateCode(shippingAddress.state) || '-'
                    })`
                  : party?.state
                  ? `${capitalizeWords(party.state)} (${
                      getStateCode(party.state) || '-'
                    })`
                  : 'Maharashtra (27)'
              }
            </div>
          </div>
        </div>

        <!-- Column 2 - Details of Consigned -->
        <div class="col-section">
          <div class="col-header">
            <div class="col-header-title">Details of Consigned | Shipped for</div>
          </div>
          <div class="col-data-row">
            <div class="col-label">Name</div>
            <div class="col-value">Office Address</div>
          </div>
          <div class="col-data-row">
            <div class="col-label">Address</div>
            <div class="col-value">
              ${capitalizeWords(
                getShippingAddress(shippingAddress, getBillingAddress(party)) ||
                  'Ann Naguid, Kalajpur, Muhs-Abdullah, Māori',
              )}
            </div>
          </div>
          <div class="col-data-row">
            <div class="col-label">Country</div>
            <div class="col-value">India</div>
          </div>
          <div class="col-data-row">
            <div class="col-label">Phone</div>
            <div class="col-value">
              ${
                shippingAddress?.contactNumber
                  ? safeFormatPhoneNumber(String(shippingAddress.contactNumber))
                  : party?.contactNumber
                  ? safeFormatPhoneNumber(String(party.contactNumber))
                  : '84156-13521'
              }
            </div>
          </div>
          <div class="col-data-row">
            <div class="col-label">GSTIN</div>
            <div class="col-value">${party?.gstin || '-'}</div>
          </div>
          <div class="col-data-row">
            <div class="col-label">State</div>
            <div class="col-value">
              ${
                shippingAddress?.state
                  ? `${capitalizeWords(shippingAddress.state)} (${
                      getStateCode(shippingAddress.state) || '-'
                    })`
                  : party?.state
                  ? `${capitalizeWords(party.state)} (${
                      getStateCode(party.state) || '-'
                    })`
                  : 'Maharashtra (27)'
              }
            </div>
          </div>
        </div>

        <!-- Column 3 - Invoice Details -->
        <div class="col-section">
          <div class="col-header">
            <div class="col-header-title">Invoice Details</div>
          </div>
          <div class="col-data-row">
            <div class="col-label">Invoice No.</div>
            <div class="col-value">${
              transaction.invoiceNumber || 'AE85500022'
            }</div>
          </div>
          <div class="col-data-row">
            <div class="col-label">Invoice Date</div>
            <div class="col-value">${
              formatDateSafe(transaction.date) || '10/11/2025'
            }</div>
          </div>
          <div class="col-data-row">
            <div class="col-label">Due Date</div>
            <div class="col-value">${
              formatDateSafe(transaction.dueDate) || '10/11/2025'
            }</div>
          </div>
          <div class="col-data-row">
            <div class="col-label">DC Date</div>
            <div class="col-value">-</div>
          </div>
          <div class="col-data-row">
            <div class="col-label">DC No.</div>
            <div class="col-value">-</div>
          </div>
          <div class="col-data-row">
            <div class="col-label">E-Way Bill No.</div>
            <div class="col-value">-</div>
          </div>
        </div>
      </div>
    `;
  };

  // Generate footer section for last page
  const generateFooterSection = (pageNumber, totalPages) => {
    const companyName =
      company?.businessName || company?.companyName || 'Ak Electronics Shop';

    return `
      <!-- Bottom Sections -->
      <div class="bottom-section">
        <div class="left-section">
          <div class="total-in-words">
            Total in words : ${safeNumberToWords(totalAmount)}
          </div>

          ${isGSTApplicable ? generateHsnSummaryHTML() : ''}
        </div>

        <div class="right-section">
          <div class="total-row">
            <div class="label">Taxable Amount</div>
            <div class="value">${formatCurrency(totalTaxable)}</div>
          </div>

          ${
            isGSTApplicable
              ? `
            <div class="total-row">
              <div class="label">Total Tax</div>
              <div class="value">
                ${formatCurrency(showIGST ? totalIGST : totalCGST + totalSGST)}
              </div>
            </div>
            `
              : ''
          }

          <div class="total-row ${isGSTApplicable ? 'highlight-row' : ''}">
            <div class="${isGSTApplicable ? 'label-bold' : 'label'}">
              ${isGSTApplicable ? 'Total Amount After Tax' : 'Total Amount'}
            </div>
            <div class="${isGSTApplicable ? 'value-bold' : 'value'}">
              ${formatCurrency(totalAmount)}
            </div>
          </div>

          <div class="total-row">
            <div class="label">
              For ${capitalizeWords(companyName)}
            </div>
            <div class="value">(E & O.E.)</div>
          </div>

          <!-- Bank Details Section -->
          ${
            transaction.type !== 'proforma' && isBankDetailAvailable
              ? `
            <div class="bank-details">
              <div style="font-size: 7px; font-weight: bold; margin-bottom: 3px;">Bank Details:</div>
              <div class="bank-details-container">
                <div class="bank-info">
                  ${
                    bankData?.bankName
                      ? `
                    <div class="bank-row">
                      <span style="width: 50px; font-weight: bold;">Name:</span>
                      <span>${capitalizeWords(bankData.bankName)}</span>
                    </div>
                    `
                      : ''
                  }
                  
                  ${
                    bankData?.accountNo
                      ? `
                    <div class="bank-row">
                      <span style="width: 50px; font-weight: bold;">Acc. No:</span>
                      <span>${bankData.accountNo}</span>
                    </div>
                    `
                      : ''
                  }
                  
                  ${
                    bankData?.ifscCode
                      ? `
                    <div class="bank-row">
                      <span style="width: 50px; font-weight: bold;">IFSC:</span>
                      <span>${bankData.ifscCode}</span>
                    </div>
                    `
                      : ''
                  }
                  
                  ${
                    bankData?.branchAddress
                      ? `
                    <div class="bank-row">
                      <span style="width: 50px; font-weight: bold;">Branch:</span>
                      <span style="flex: 1;">${bankData.branchAddress}</span>
                    </div>
                    `
                      : ''
                  }
                  
                  ${
                    bankData?.upiDetails?.upiId
                      ? `
                    <div class="bank-row">
                      <span style="width: 50px; font-weight: bold;">UPI ID:</span>
                      <span>${bankData.upiDetails.upiId}</span>
                    </div>
                    `
                      : ''
                  }

                  ${
                    bankData?.upiDetails?.upiName
                      ? `
                    <div class="bank-row">
                      <span style="width: 50px; font-weight: bold;">UPI Name:</span>
                      <span>${bankData.upiDetails.upiName}</span>
                    </div>
                    `
                      : ''
                  }

                  ${
                    bankData?.upiDetails?.upiMobile
                      ? `
                    <div class="bank-row">
                      <span style="width: 50px; font-weight: bold;">UPI Mobile:</span>
                      <span>${bankData.upiDetails.upiMobile}</span>
                    </div>
                    `
                      : ''
                  }
                </div>
                
                ${
                  bankData?.qrCode
                    ? `
                  <div class="qr-container">
                    <div style="font-size: 7px; font-weight: bold; margin-bottom: 3px;">QR Code</div>
                    <img src="${BASE_URL}${bankData.qrCode}" class="qr-image" />
                  </div>
                  `
                    : ''
                }
              </div>
            </div>
            `
              : ''
          }
        </div>
      </div>

      <!-- Terms and Conditions -->
      ${
        transaction?.notes
          ? `
      <div class="terms-box">
        <div class="terms-content">
          ${renderNotesHTML(transaction.notes)}
        </div>
      </div>
        `
          : ''
      }

      <!-- Page Number - Outside all borders -->
      <div class="page-number-container">
        Page ${pageNumber} of ${totalPages}
      </div>
    `;
  };

  // Generate HTML content for PDF
  const generateHTML = () => {
    // Generate all pages
    let startIndex = 0;
    const pagesHTML = itemPages.map((pageItems, pageIndex) => {
      const isLastPage = pageIndex === itemPages.length - 1;
      const pageNumber = pageIndex + 1;

      const pageHTML = `
        <div class="page">
          ${generateHeaderSection()}
          
          <!-- Items Table -->
          <div class="table-container">
            ${generateItemsTable(pageItems, isLastPage, startIndex)}
          </div>

          ${
            isLastPage
              ? `
            ${generateFooterSection(pageNumber, totalPages)}
          `
              : `
            <!-- Page Number for non-last pages -->
            <div class="page-number-container">
              Page ${pageNumber} of ${totalPages}
            </div>
          `
          }
        </div>
      `;

      startIndex += pageItems.length;
      return pageHTML;
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          
          body {
            font-family: Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 10px;
            color: #000;
            font-size: 8px;
            line-height: 1.2;
            width: 595px;
          }
          
          .page {
            position: relative;
            width: 100%;
            min-height: 400px;
            page-break-after: always;
            margin-bottom: 10px;
          }
          
          .page:last-child {
            page-break-after: auto;
          }
          
          /* Top Company Info Styles */
          .top-company-info {
            margin-bottom: 8px;
          }
          
          .company-name {
            font-size: 14px;
            font-weight: bold;
            text-align: center;
            margin-bottom: 3px;
          }
          
          .company-address {
            font-size: 9px;
            text-align: center;
            margin-bottom: 2px;
          }
          
          .company-contact {
            font-size: 8px;
            text-align: center;
            margin-bottom: 4px;
          }
          
          .contact-item {
            margin: 0 5px;
          }
          
          .separator-line {
            border: none;
            border-top: 1px solid ${PRIMARY_BLUE};
            margin: 4px 0;
          }
          
          /* GSTIN and Invoice Type Section */
          .gstin-invoice-section {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 4px;
           border : 1.5px solid ${PRIMARY_BLUE};
           padding: 0 4px;
           padding-top: 2px;
           border-bottom: none;
           margin-bottom: -1px;
          }
          
          .gstin-number {
            font-size: 9px;
            font-weight: bold;
          }
          
          .invoice-type {
            font-size: 12px;
            font-weight: bold;
            color: ${PRIMARY_BLUE};
          }
          
          .original-recipient {
            font-size: 9px;
            font-weight: bold;
            color: #000;
          }
          
          /* Three Column Section Styles */
          .three-col-section {
            display: flex;
            flex-direction: row;
            border: 1.5px solid ${PRIMARY_BLUE};
          }
          
          .col-section {
            flex: 1;
            padding: 4px;
            border-left: 1px solid ${PRIMARY_BLUE};
          }
          
          .col-section:first-child {
            border-left: none;
          }
          
          .col-header {
            margin-bottom: 3px;
          }
          
          .col-header-title {
            font-size: 8px;
            font-weight: bold;
            color: ${PRIMARY_BLUE};
          }
          
          .col-data-row {
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            align-items: flex-start;
            padding: 1px 0;
            min-height: 14px;
          }
          
          .col-label {
            font-size: 7px;
            font-weight: bold;
            width: 45%;
            flex-shrink: 0;
          }
          
          .col-value {
            font-size: 7px;
            font-weight: normal;
            width: 55%;
            flex-shrink: 1;
            text-align: right;
          }
          
          /* Items Table Styles */
          .table-container {
            position: relative;
            width: 100%;
            border: 1.5px solid ${PRIMARY_BLUE};
            border-top: none;
            margin-bottom: 0;
          }
          
          .items-table-header {
            display: flex;
            flex-direction: row;
            background-color: rgba(3, 113, 193, 0.2);
            border-bottom: 1px solid ${PRIMARY_BLUE};
          }
          
          .header-cell {
            padding: 2px;
            text-align: center;
            font-size: 6px;
            font-weight: bold;
            border-right: 1px solid ${PRIMARY_BLUE};
          }
          
          .header-cell:last-child {
            border-right: none;
          }
          
          .items-table-row {
            display: flex;
            flex-direction: row;
            align-items: flex-start;
            border-bottom: 1px solid ${PRIMARY_BLUE};
          }
          
          .items-table-total-row {
            display: flex;
            flex-direction: row;
            background-color: rgba(3, 113, 193, 0.2);
            align-items: center;
            border-top: 1px solid ${PRIMARY_BLUE};
          }
          
          .table-cell {
            padding: 2px;
            font-size: 6px;
            text-align: center;
            border-right: 1px solid ${PRIMARY_BLUE};
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .table-cell:last-child {
            border-right: none;
          }
          
          .product-cell {
            text-align: left;
            justify-content: flex-start;
          }
          
          /* IGST/CGST/SGST Styles */
          .igst-header {
            display: flex;
            flex-direction: column;
            font-size: 6px;
            font-weight: bold;
            border-right: 1px solid ${PRIMARY_BLUE};
          }
          
          .igst-main-header {
            font-size: 6px;
            font-weight: bold;
            text-align: center;
            padding: 1px;
          }
          
          .igst-sub-header {
            display: flex;
            flex-direction: row;
            border-top: 1px solid ${PRIMARY_BLUE};
          }
          
          .igst-sub-text {
            font-size: 5px;
            font-weight: bold;
            width: 70%;
            text-align: center;
            padding: 1px;
          }
          
          .igst-sub-percentage {
            font-size: 5px;
            font-weight: bold;
            width: 30%;
            text-align: center;
            padding: 1px;
            border-right: 1px solid ${PRIMARY_BLUE};
          }
          
          .igst-cell {
            display: flex;
            flex-direction: row;
            justify-content: center;
            align-items: center;
            gap: 2px;
            text-align: center;
            padding: 1px 0;
            font-size: 6px;
            border-right: 1px solid ${PRIMARY_BLUE};
          }
          
          .igst-percent {
            font-size: 6px;
            text-align: center;
            padding: 1px;
            width: 30%;
          }
          
          .igst-amount {
            font-size: 6px;
            text-align: center;
            padding: 1px;
            width: 70%;
          }
          
          /* Bottom Section Styles */
          .bottom-section {
            display: flex;
            flex-direction: row;
            border: 1.5px solid ${PRIMARY_BLUE};
            border-top: none;
          }
          
          .left-section {
            width: 65%;
            padding: 4px;
            border-right: 1px solid ${PRIMARY_BLUE};
          }
          
          .right-section {
            width: 35%;
            padding: 4px;
          }
          
          .total-in-words {
            font-size: 6px;
            font-weight: bold;
            border-bottom: 1px solid ${PRIMARY_BLUE};
            padding: 2px;
            text-transform: uppercase;
            margin-bottom: 4px;
          }
          
          .total-row {
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            border-bottom: 1px solid ${PRIMARY_BLUE};
            padding: 2px;
            margin-bottom: 2px;
          }
          
          .label {
            font-size: 7px;
            font-weight: bold;
          }
          
          .value {
            font-size: 7px;
            font-weight: bold;
          }
          
          .label-bold {
            font-size: 7px;
            font-weight: bold;
          }
          
          .value-bold {
            font-size: 7px;
            font-weight: bold;
          }
          
          .highlight-row {
            background-color: ${LIGHT_BLUE_BG};
          }
          
          /* HSN Tax Table */
          .hsn-tax-table {
            margin-top: 4px;
            border: 1px solid ${PRIMARY_BLUE};
          }
          
          .hsn-tax-table-header {
            display: flex;
            flex-direction: row;
            background-color: #f0f8ff;
            border-bottom: 1px solid ${PRIMARY_BLUE};
          }
          
          .hsn-tax-header-cell {
            padding: 1px;
            font-size: 6px;
            font-weight: bold;
            border-right: 1px solid ${PRIMARY_BLUE};
            text-align: center;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .hsn-tax-table-row {
            display: flex;
            flex-direction: row;
            border-bottom: 1px solid ${PRIMARY_BLUE};
          }
          
          .hsn-tax-cell {
            padding: 1px;
            font-size: 6px;
            border-right: 1px solid ${PRIMARY_BLUE};
            text-align: center;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .hsn-tax-table-total-row {
            display: flex;
            flex-direction: row;
            background-color: rgba(3, 113, 193, 0.2);
          }
          
          .hsn-tax-total-cell {
            padding: 1px;
            font-size: 6px;
            font-weight: bold;
            border-right: 1px solid ${PRIMARY_BLUE};
            text-align: center;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          /* Bank Details */
          .bank-details {
            margin-top: 4px;
          }
          
          .bank-row {
            display: flex;
            flex-direction: row;
            margin-bottom: 1px;
            font-size: 6px;
            word-wrap: break-word;
            overflow-wrap: break-word;
          }
          
          .bank-details-container {
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            align-items: flex-start;
            overflow: hidden;
          }
          
          .bank-info {
            flex: 1;
            overflow: hidden;
            word-wrap: break-word;
          }
          
          .qr-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            margin-left: 5px;
          }
          
          .qr-image {
            width: 50px;
            height: 50px;
            object-fit: contain;
          }
          
          /* Terms and Conditions - FIXED */
          .terms-box {
            border: 1.5px solid ${PRIMARY_BLUE};
            border-top: none;
            padding: 4px;
            font-size: 6px;
            line-height: 1.1;
            min-height: 30px;
            overflow: hidden;
            word-wrap: break-word;
            overflow-wrap: break-word;
          }
          
          .terms-content {
            font-size: 6px;
            line-height: 1.1;
            max-width: 100%;
            word-break: break-word;
            overflow-wrap: break-word;
            white-space: normal;
          }
          
          /* Page Number Container - Fixed positioning */
          .page-number-container {
            text-align: right;
            font-size: 7px;
            font-weight: bold;
            margin-top: 2px;
            padding: 2px 4px;
            position: relative;
            width: 100%;
          }
          
          /* Utility classes */
          .text-left { text-align: left; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .bg-highlight { background-color: ${LIGHT_BLUE_BG}; }
        </style>
      </head>
      <body>
        ${pagesHTML.join('')}
      </body>
      </html>
    `;
  };

  return generateHTML();
};

// --- PDF Generation Function ---
export const generatePdfForTemplateA5_5 = async (
  transaction,
  company,
  party,
  serviceNameById,
  shippingAddress,
  bank,
  client,
) => {
  try {
    console.log('🟡 PDF Generation Started - TemplateA5');
    const htmlContent = TemplateA5_5({
      transaction,
      company,
      party,
      shippingAddress,
      bank,
      client,
    });

    console.log('🟢 HTML Content Generated Successfully');
    console.log('HTML Length:', htmlContent.length);

    const options = {
      html: htmlContent,
      fileName: `invoice_${transaction.invoiceNumber || 'document'}`,
      directory: 'Documents',
      width: 595, // A5 landscape width
      height: 420, // A5 landscape height
      base64: true,
    };

    const file = await generatePDF(options);
    console.log('🟢 PDF Generated Successfully!');

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

// Utility function to use the component directly
export const generateTemplateA5_5HTML = props => {
  return TemplateA5_5(props);
};

export default TemplateA5_5;