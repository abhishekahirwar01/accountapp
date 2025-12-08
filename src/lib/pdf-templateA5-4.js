// pdf-templateA5.js
import React from 'react';
// Note: @react-pdf/renderer is not compatible with React Native
// This file uses react-native-html-to-pdf instead
// import {
//   Document,
//   Page,
//   Text,
//   View,
//   StyleSheet,
//   Image,
//   pdf,
// } from '@react-pdf/renderer';
import {
  deriveTotals,
  formatCurrency,
  getBillingAddress,
  getShippingAddress,
  getItemsBody,
  calculateGST,
  getUnifiedLines,
  prepareTemplate8Data,
  getStateCode,
  numberToWords,
  getHsnSummary,
} from './pdf-utils';
import { capitalizeWords, parseNotesHtml } from './utils';
import { formatQuantity } from './pdf-utils';
import { parseHtmlToElements, renderParsedElements } from './HtmlNoteRenderer';
import { formatPhoneNumber } from './pdf-utils';
import { templateA5_4Styles } from './pdf-template-styles';
import { BASE_URL } from '../config';

const getClientName = client => {
  if (!client) return 'Client Name';
  if (typeof client === 'string') return client;
  return client.companyName || client.contactName || 'Client Name';
};

const logo = '/assets/invoice-logos/R.png';

const TemplateA5_4PDF = ({
  transaction,
  company,
  party,
  shippingAddress,
  bank,
  client,
}) => {
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
  } = prepareTemplate8Data(transaction, company, party, shippingAddress);

  const logoSrc = company?.logo ? `${BASE_URL}${company.logo}` : null;

  const shouldHideBankDetails = transaction.type === 'proforma';

  const bankData = bank || {};

  // Check if any bank detail is available
  const isBankDetailAvailable =
    bankData?.bankName ||
    bankData?.ifscCode ||
    bankData?.qrCode ||
    bankData?.branchAddress ||
    bankData?.accountNo ||
    bankData?.upiDetails?.upiId;

  // For IGST (Interstate)
  const colWidthsIGST = ['4%', '30%', '10%', '8%', '10%', '15%', '20%', '12%'];
  const totalColumnIndexIGST = 7;

  const itemsPerPage = itemsWithGST.length;
  const pages = [];
  for (let i = 0; i < itemsWithGST.length; i += itemsPerPage) {
    pages.push(itemsWithGST.slice(i, i + itemsPerPage));
  }

  // For CGST/SGST (Intrastate)
  const colWidthsCGSTSGST = [
    '4%',
    '30%',
    '10%',
    '8%',
    '10%',
    '12%',
    '12%',
    '12%',
    '15%',
  ];
  const totalColumnIndexCGSTSGST = 8;

  // For No Tax
  const colWidthsNoTax = ['10%', '25%', '10%', '10%', '10%', '15%', '20%'];
  const totalColumnIndexNoTax = 6;

  // Use based on condition
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

  // Calculate table width in points
  const tableWidth = showCGSTSGST ? 488 : showIGST ? 505 : 550;

  // Calculate vertical border positions
  const borderPositions = [];
  let cumulative = 0;
  for (let i = 0; i < colWidths.length - 1; i++) {
    cumulative += parseFloat(colWidths[i]);
    borderPositions.push((cumulative / 100) * tableWidth);
  }

  return (
    <Document>
      {pages.map((pageItems, pageIndex) => {
        const isLastPage = pageIndex === pages.length - 1;
        return (
          <Page
            key={pageIndex}
            size="A5"
            orientation="landscape"
            style={templateA5_4Styles.page}
          >
            {/* Body - Items Table */}
            <View style={templateA5_4Styles.section}>
              {/* table three columns */}
              <View style={templateA5_4Styles.threeColSection} fixed>
                {/* Column 1 - Company details */}
                <View
                  style={[templateA5_4Styles.column, { borderLeft: 'none' }]}
                >
                  <View style={templateA5_4Styles.columnHeader}>
                    <Text style={templateA5_4Styles.threecoltableHeader}>
                      {capitalizeWords(
                        company?.businessName ||
                          company?.companyName ||
                          'Company Name',
                      )}
                    </Text>
                  </View>
                  <View style={templateA5_4Styles.dataRow}>
                    <Text style={templateA5_4Styles.tableLabel}>Address </Text>
                    <Text style={templateA5_4Styles.tableValue}>
                      {[
                        company?.address,
                        company?.City,
                        company?.addressState,
                        company?.Country,
                        company?.Pincode,
                      ]
                        .filter(Boolean)
                        .join(', ') || 'Address Line 1'}
                    </Text>
                  </View>

                  <View style={templateA5_4Styles.dataRow}>
                    <Text style={templateA5_4Styles.tableLabel}>Phone</Text>
                    <Text style={templateA5_4Styles.tableValue}>
                      {company?.mobileNumber
                        ? formatPhoneNumber(String(company.mobileNumber))
                        : company?.Telephone
                        ? formatPhoneNumber(String(company.Telephone))
                        : '-'}
                    </Text>
                  </View>
                  <View style={templateA5_4Styles.dataRow}>
                    <Text style={templateA5_4Styles.tableLabel}>GSTIN</Text>
                    <Text style={templateA5_4Styles.tableValue}>
                      {company?.gstin}
                    </Text>
                  </View>
                  <View style={templateA5_4Styles.dataRow}>
                    <Text style={templateA5_4Styles.tableLabel}>PAN</Text>
                    <Text style={templateA5_4Styles.tableValue}>
                      {company?.PANNumber}
                    </Text>
                  </View>
                </View>

                {/* Column 2 - Invoice Details */}
                <View
                  style={[
                    templateA5_4Styles.column,
                    { flex: 1, borderRight: 'none' },
                  ]}
                >
                  <View style={templateA5_4Styles.columnHeader}>
                    <Text style={templateA5_4Styles.threecoltableHeader}>
                      {transaction.type === 'proforma'
                        ? 'PROFORMA INVOICE'
                        : isGSTApplicable
                        ? 'TAX INVOICE'
                        : 'INVOICE'}
                    </Text>
                  </View>

                  <View
                    style={[
                      templateA5_4Styles.dataRow,
                      { display: 'flex', gap: 10 },
                    ]}
                  >
                    <Text
                      style={[templateA5_4Styles.tableLabel, { flexShrink: 0 }]}
                    >
                      Invoice No.
                    </Text>
                    <Text style={[templateA5_4Styles.tableValue, { flex: 1 }]}>
                      {transaction.invoiceNumber || 'N/A'}
                    </Text>
                  </View>

                  <View
                    style={[
                      templateA5_4Styles.dataRow,
                      { display: 'flex', gap: 10 },
                    ]}
                  >
                    <Text
                      style={[templateA5_4Styles.tableLabel, { flexShrink: 0 }]}
                    >
                      Invoice Date
                    </Text>
                    <Text style={[templateA5_4Styles.tableValue, { flex: 1 }]}>
                      {new Date(transaction.date).toLocaleDateString('en-IN')}
                    </Text>
                  </View>

                  <View
                    style={[
                      templateA5_4Styles.dataRow,
                      { display: 'flex', gap: 10 },
                    ]}
                  >
                    <Text
                      style={[templateA5_4Styles.tableLabel, { flexShrink: 0 }]}
                    >
                      Due Date
                    </Text>
                    <Text style={[templateA5_4Styles.tableValue, { flex: 1 }]}>
                      {new Date(transaction.dueDate).toLocaleDateString(
                        'en-IN',
                      )}
                    </Text>
                  </View>

                  {/* Empty Space Rows */}
                  <View
                    style={[
                      templateA5_4Styles.dataRow,
                      { display: 'flex', gap: 10 },
                    ]}
                  >
                    <Text style={templateA5_4Styles.tableLabel}></Text>
                    <Text style={templateA5_4Styles.tableValue}></Text>
                  </View>
                  <View
                    style={[
                      templateA5_4Styles.dataRow,
                      { display: 'flex', gap: 10 },
                    ]}
                  >
                    <Text style={templateA5_4Styles.tableLabel}></Text>
                    <Text style={templateA5_4Styles.tableValue}></Text>
                  </View>
                </View>

                {/* Column 3 - Details of Buyer */}
                <View style={[templateA5_4Styles.column]}>
                  <View style={templateA5_4Styles.columnHeader}>
                    <Text style={templateA5_4Styles.threecoltableHeader}>
                      To, {capitalizeWords(party?.name || 'N/A')}
                    </Text>
                  </View>
                  <View style={templateA5_4Styles.dataRow}>
                    <Text style={templateA5_4Styles.tableLabel}>Address </Text>
                    <Text style={templateA5_4Styles.tableValue}>
                      {capitalizeWords(getBillingAddress(party)) || '-'}
                    </Text>
                  </View>
                  <View style={templateA5_4Styles.dataRow}>
                    <Text style={templateA5_4Styles.tableLabel}>Phone</Text>
                    <Text style={templateA5_4Styles.tableValue}>
                      {party?.contactNumber
                        ? formatPhoneNumber(party.contactNumber)
                        : '-'}
                    </Text>
                  </View>
                  <View style={templateA5_4Styles.dataRow}>
                    <Text style={templateA5_4Styles.tableLabel}>GSTIN</Text>
                    <Text style={templateA5_4Styles.tableValue}>
                      {party?.gstin || '-'}
                    </Text>
                  </View>
                  <View style={templateA5_4Styles.dataRow}>
                    <Text style={templateA5_4Styles.tableLabel}>PAN</Text>
                    <Text style={templateA5_4Styles.tableValue}>
                      {party?.pan || '-'}
                    </Text>
                  </View>
                  <View style={templateA5_4Styles.dataRow}>
                    <Text style={templateA5_4Styles.tableLabel}>
                      Place of Supply
                    </Text>
                    <Text style={templateA5_4Styles.tableValue}>
                      {shippingAddress?.state
                        ? `${capitalizeWords(shippingAddress.state)} (${
                            getStateCode(shippingAddress.state) || '-'
                          })`
                        : party?.state
                        ? `${capitalizeWords(party.state)} (${
                            getStateCode(party.state) || '-'
                          })`
                        : '-'}
                    </Text>
                  </View>
                </View>

                {/* Column 4 - Details of Consigned */}
                <View style={templateA5_4Styles.column}>
                  <View style={templateA5_4Styles.columnHeader}>
                    <Text style={templateA5_4Styles.threecoltableHeader}>
                      Shipped To,{' '}
                      {capitalizeWords(
                        shippingAddress?.label || party?.name || 'N/A',
                      )}
                    </Text>
                  </View>

                  <View style={templateA5_4Styles.dataRow}>
                    <Text style={templateA5_4Styles.tableLabel}>Address </Text>
                    <Text style={templateA5_4Styles.tableValue}>
                      {capitalizeWords(
                        getShippingAddress(
                          shippingAddress,
                          getBillingAddress(party),
                        ),
                      )}
                    </Text>
                  </View>
                  <View style={templateA5_4Styles.dataRow}>
                    <Text style={templateA5_4Styles.tableLabel}>Country</Text>
                    <Text style={templateA5_4Styles.tableValue}>India</Text>
                  </View>
                  <View style={templateA5_4Styles.dataRow}>
                    <Text style={templateA5_4Styles.tableLabel}>Phone</Text>
                    <Text style={templateA5_4Styles.tableValue}>
                      {shippingAddress?.contactNumber
                        ? formatPhoneNumber(
                            String(shippingAddress.contactNumber),
                          )
                        : party?.contactNumber
                        ? formatPhoneNumber(String(party.contactNumber))
                        : '-'}
                    </Text>
                  </View>
                  <View style={templateA5_4Styles.dataRow}>
                    <Text style={templateA5_4Styles.tableLabel}>GSTIN</Text>
                    <Text style={templateA5_4Styles.tableValue}>
                      {party?.gstin || '-'}
                    </Text>
                  </View>
                  <View style={templateA5_4Styles.dataRow}>
                    <Text style={templateA5_4Styles.tableLabel}>State</Text>
                    <Text style={templateA5_4Styles.tableValue}>
                      {shippingAddress?.state
                        ? `${capitalizeWords(shippingAddress.state)} (${
                            getStateCode(shippingAddress.state) || '-'
                          })`
                        : party?.state
                        ? `${capitalizeWords(party.state)} (${
                            getStateCode(party.state) || '-'
                          })`
                        : '-'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Items Table */}
              <View style={templateA5_4Styles.tableContainer}>
                <View style={templateA5_4Styles.itemsTable}>
                  {/* Vertical borders */}
                  {borderPositions.map((pos, index) => (
                    <View
                      key={index}
                      style={[templateA5_4Styles.verticalBorder, { left: pos }]}
                    />
                  ))}

                  {/* Colored backgrounds */}
                  <View
                    style={[
                      templateA5_4Styles.columnBackground,
                      {
                        left: borderPositions[4],
                        width: (parseFloat(colWidths[5]) / 100) * tableWidth,
                        backgroundColor: 'rgba(3, 113, 193, 0.2)',
                      },
                    ]}
                  />

                  <View
                    style={[
                      templateA5_4Styles.columnBackground,
                      {
                        left: borderPositions[totalColumnIndex - 1],
                        width:
                          (parseFloat(colWidths[totalColumnIndex]) / 100) *
                          tableWidth,
                        backgroundColor: 'rgba(3, 113, 193, 0.2)',
                      },
                    ]}
                  />
                  {/* Table Header */}
                  <View style={templateA5_4Styles.itemsTableHeader} fixed>
                    <Text
                      style={[
                        templateA5_4Styles.srNoHeader,
                        { width: colWidths[0] },
                      ]}
                    >
                      Sr. No.
                    </Text>
                    <Text
                      style={[
                        templateA5_4Styles.productHeader,
                        { width: colWidths[1] },
                      ]}
                    >
                      Name of Product/Service
                    </Text>
                    <Text
                      style={[
                        templateA5_4Styles.hsnHeader,
                        { width: colWidths[2] },
                      ]}
                    >
                      HSN/SAC
                    </Text>
                    <Text
                      style={[
                        templateA5_4Styles.qtyHeader,
                        { width: colWidths[3] },
                      ]}
                    >
                      Qty
                    </Text>
                    <Text
                      style={[
                        templateA5_4Styles.rateHeader,
                        { width: colWidths[4] },
                      ]}
                    >
                      Rate (Rs.)
                    </Text>
                    <Text
                      style={[
                        templateA5_4Styles.taxableHeader,
                        { width: colWidths[5] },
                      ]}
                    >
                      Taxable Value (Rs.)
                    </Text>

                    {/* Dynamic GST columns */}
                    {showIGST ? (
                      <View
                        style={[
                          templateA5_4Styles.igstHeader,
                          { width: colWidths[6] },
                        ]}
                      >
                        <Text style={templateA5_4Styles.igstMainHeader}>
                          IGST
                        </Text>
                        <View style={templateA5_4Styles.igstSubHeader}>
                          <Text
                            style={[
                              templateA5_4Styles.igstSubPercentage,
                              { borderRight: '1px solid #0371C1' },
                            ]}
                          >
                            %
                          </Text>
                          <Text style={templateA5_4Styles.igstSubText}>
                            Amount (Rs.)
                          </Text>
                        </View>
                      </View>
                    ) : showCGSTSGST ? (
                      <>
                        <View
                          style={[
                            templateA5_4Styles.igstHeader,
                            { width: colWidths[6] },
                          ]}
                        >
                          <Text style={templateA5_4Styles.igstMainHeader}>
                            CGST
                          </Text>
                          <View style={templateA5_4Styles.igstSubHeader}>
                            <Text
                              style={[
                                templateA5_4Styles.igstSubPercentage,
                                { borderRight: '1px solid #0371C1' },
                              ]}
                            >
                              %
                            </Text>
                            <Text style={templateA5_4Styles.igstSubText}>
                              Amount (Rs.)
                            </Text>
                          </View>
                        </View>
                        <View
                          style={[
                            templateA5_4Styles.igstHeader,
                            { width: colWidths[7] },
                          ]}
                        >
                          <Text style={templateA5_4Styles.igstMainHeader}>
                            SGST
                          </Text>
                          <View style={templateA5_4Styles.igstSubHeader}>
                            <Text
                              style={[
                                templateA5_4Styles.igstSubPercentage,
                                { borderRight: '1px solid #0371C1' },
                              ]}
                            >
                              %
                            </Text>
                            <Text style={templateA5_4Styles.igstSubText}>
                              Amount (Rs.)
                            </Text>
                          </View>
                        </View>
                      </>
                    ) : null}

                    <Text
                      style={[
                        templateA5_4Styles.totalHeader,
                        { width: colWidths[totalColumnIndex] },
                      ]}
                    >
                      Total (Rs.)
                    </Text>
                  </View>

                  {pageItems.map((item, index) => (
                    <View
                      key={index}
                      style={templateA5_4Styles.itemsTableRow}
                      wrap={false}
                    >
                      <Text
                        style={[
                          templateA5_4Styles.srNoCell,
                          { width: colWidths[0] },
                        ]}
                      >
                        {pageIndex * itemsPerPage + index + 1}
                      </Text>
                      <Text
                        style={[
                          templateA5_4Styles.productCell,
                          { width: colWidths[1] },
                        ]}
                      >
                        {capitalizeWords(item.name)}
                      </Text>
                      <Text
                        style={[
                          templateA5_4Styles.hsnCell,
                          { width: colWidths[2] },
                        ]}
                      >
                        {item.code || '-'}
                      </Text>
                      <Text
                        style={[
                          templateA5_4Styles.qtyCell,
                          { width: colWidths[3] },
                        ]}
                      >
                        {item.itemType === 'service'
                          ? '-'
                          : formatQuantity(item.quantity || 0, item.unit)}
                      </Text>
                      <Text
                        style={[
                          templateA5_4Styles.rateCell,
                          { width: colWidths[4] },
                        ]}
                      >
                        {formatCurrency(item.pricePerUnit || 0)}
                      </Text>
                      <Text
                        style={[
                          templateA5_4Styles.taxableCell,
                          { width: colWidths[5] },
                        ]}
                      >
                        {formatCurrency(item.taxableValue)}
                      </Text>
                      {showIGST ? (
                        <View
                          style={[
                            templateA5_4Styles.igstCell,
                            { width: colWidths[6] },
                          ]}
                        >
                          <Text style={templateA5_4Styles.igstPercent}>
                            {item.gstRate}
                          </Text>
                          <Text style={templateA5_4Styles.igstAmount}>
                            {formatCurrency(item.igst)}
                          </Text>
                        </View>
                      ) : showCGSTSGST ? (
                        <>
                          <View
                            style={[
                              templateA5_4Styles.igstCell,
                              { width: colWidths[6] },
                            ]}
                          >
                            <Text style={templateA5_4Styles.igstPercent}>
                              {item.gstRate / 2}
                            </Text>
                            <Text style={templateA5_4Styles.igstAmount}>
                              {formatCurrency(item.cgst)}
                            </Text>
                          </View>
                          <View
                            style={[
                              templateA5_4Styles.igstCell,
                              { width: colWidths[7] },
                            ]}
                          >
                            <Text style={templateA5_4Styles.igstPercent}>
                              {item.gstRate / 2}
                            </Text>
                            <Text style={templateA5_4Styles.igstAmount}>
                              {formatCurrency(item.sgst)}
                            </Text>
                          </View>
                        </>
                      ) : null}
                      <Text
                        style={[
                          templateA5_4Styles.totalCell,
                          { width: colWidths[totalColumnIndex] },
                        ]}
                      >
                        {formatCurrency(item.total)}
                      </Text>
                    </View>
                  ))}

                  {isLastPage && (
                    <View style={templateA5_4Styles.itemsTableTotalRow}>
                      <Text
                        style={[
                          templateA5_4Styles.totalLabel,
                          { width: colWidths[0] },
                        ]}
                      ></Text>
                      <Text
                        style={[
                          templateA5_4Styles.totalEmpty,
                          { width: colWidths[1] },
                        ]}
                      ></Text>
                      <Text
                        style={[
                          templateA5_4Styles.totalEmpty,
                          { width: colWidths[2] },
                        ]}
                      >
                        Total
                      </Text>
                      <Text
                        style={[
                          templateA5_4Styles.totalQty,
                          { width: colWidths[3] },
                        ]}
                      >
                        {totalQty}
                      </Text>
                      <Text
                        style={[
                          templateA5_4Styles.totalEmpty,
                          { width: colWidths[4] },
                        ]}
                      ></Text>
                      <Text
                        style={[
                          templateA5_4Styles.totalTaxable,
                          { width: colWidths[5] },
                        ]}
                      >
                        {formatCurrency(totalTaxable)}
                      </Text>
                      {showIGST ? (
                        <View
                          style={[
                            templateA5_4Styles.igstTotal,
                            { width: colWidths[6], paddingRight: 10 },
                          ]}
                        >
                          <Text
                            style={[
                              templateA5_4Styles.totalIgstAmount,
                              { paddingRight: 10 },
                            ]}
                          >
                            {formatCurrency(totalIGST)}
                          </Text>
                        </View>
                      ) : showCGSTSGST ? (
                        <>
                          <View
                            style={[
                              templateA5_4Styles.igstTotal,
                              { width: colWidths[6], paddingRight: 7 },
                            ]}
                          >
                            <Text style={[templateA5_4Styles.totalIgstAmount]}>
                              {formatCurrency(totalCGST)}
                            </Text>
                          </View>
                          <View
                            style={[
                              templateA5_4Styles.igstTotal,
                              { width: colWidths[7], paddingRight: 7 },
                            ]}
                          >
                            <Text style={[templateA5_4Styles.totalIgstAmount]}>
                              {formatCurrency(totalSGST)}
                            </Text>
                          </View>
                        </>
                      ) : null}
                      <Text
                        style={[
                          templateA5_4Styles.grandTotal,
                          { width: colWidths[totalColumnIndex] },
                        ]}
                      >
                        {formatCurrency(totalAmount)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {isLastPage && (
                <>
                  <View style={templateA5_4Styles.bottomSection}>
                    {/* Left Column */}
                    <View style={templateA5_4Styles.leftSection}>
                      <Text style={templateA5_4Styles.totalInWords}>
                        Total in words : {numberToWords(totalAmount)}
                      </Text>

                      {/* HSN/SAC Tax Table */}
                      {isGSTApplicable && (
                        <View style={templateA5_4Styles.hsnTaxTable}>
                          {(() => {
                            const hsnColWidths = showIGST
                              ? ['25%', '20%', '30%', '25%']
                              : showCGSTSGST
                              ? ['18%', '20%', '22%', '22%', '20%']
                              : ['40%', '30%', '30%'];

                            const hsnTotalColumnIndex = showIGST
                              ? 3
                              : showCGSTSGST
                              ? 4
                              : 2;

                            return (
                              <>
                                <View
                                  style={templateA5_4Styles.hsnTaxTableHeader}
                                  fixed
                                >
                                  <Text
                                    style={[
                                      templateA5_4Styles.hsnTaxHeaderCell,
                                      { width: hsnColWidths[0] },
                                    ]}
                                  >
                                    HSN / SAC
                                  </Text>
                                  <Text
                                    style={[
                                      templateA5_4Styles.hsnTaxHeaderCell,
                                      { width: hsnColWidths[1] },
                                    ]}
                                  >
                                    Taxable Value (Rs.)
                                  </Text>

                                  {showIGST ? (
                                    <View
                                      style={[
                                        templateA5_4Styles.igstHeader,
                                        { width: hsnColWidths[2] },
                                      ]}
                                    >
                                      <Text
                                        style={
                                          templateA5_4Styles.igstMainHeader
                                        }
                                      >
                                        IGST
                                      </Text>
                                      <View
                                        style={templateA5_4Styles.igstSubHeader}
                                      >
                                        <Text
                                          style={[
                                            templateA5_4Styles.igstSubPercentage,
                                            {
                                              borderRight: '1px solid #0371C1',
                                            },
                                          ]}
                                        >
                                          %
                                        </Text>
                                        <Text
                                          style={templateA5_4Styles.igstSubText}
                                        >
                                          Amount (Rs.)
                                        </Text>
                                      </View>
                                    </View>
                                  ) : showCGSTSGST ? (
                                    <>
                                      <View
                                        style={[
                                          templateA5_4Styles.igstHeader,
                                          { width: hsnColWidths[2] },
                                        ]}
                                      >
                                        <Text
                                          style={
                                            templateA5_4Styles.igstMainHeader
                                          }
                                        >
                                          CGST
                                        </Text>
                                        <View
                                          style={
                                            templateA5_4Styles.igstSubHeader
                                          }
                                        >
                                          <Text
                                            style={[
                                              templateA5_4Styles.igstSubPercentage,
                                              {
                                                borderRight:
                                                  '1px solid #0371C1',
                                              },
                                            ]}
                                          >
                                            %
                                          </Text>
                                          <Text
                                            style={
                                              templateA5_4Styles.igstSubText
                                            }
                                          >
                                            Amount (Rs.)
                                          </Text>
                                        </View>
                                      </View>
                                      <View
                                        style={[
                                          templateA5_4Styles.igstHeader,
                                          { width: hsnColWidths[3] },
                                        ]}
                                      >
                                        <Text
                                          style={
                                            templateA5_4Styles.igstMainHeader
                                          }
                                        >
                                          SGST
                                        </Text>
                                        <View
                                          style={
                                            templateA5_4Styles.igstSubHeader
                                          }
                                        >
                                          <Text
                                            style={[
                                              templateA5_4Styles.igstSubPercentage,
                                              {
                                                borderRight:
                                                  '1px solid #0371C1',
                                                borderLeft: '1px solid #0371C1',
                                              },
                                            ]}
                                          >
                                            %
                                          </Text>
                                          <Text
                                            style={
                                              templateA5_4Styles.igstSubText
                                            }
                                          >
                                            Amount (Rs.)
                                          </Text>
                                        </View>
                                      </View>
                                    </>
                                  ) : null}

                                  <Text
                                    style={[
                                      templateA5_4Styles.hsnTaxHeaderCell,
                                      {
                                        width:
                                          hsnColWidths[hsnTotalColumnIndex],
                                        borderLeft: '1px solid #0371C1',
                                        borderRight: 'none',
                                      },
                                    ]}
                                  >
                                    Total (Rs.)
                                  </Text>
                                </View>

                                {getHsnSummary(
                                  itemsWithGST,
                                  showIGST,
                                  showCGSTSGST,
                                ).map((hsnItem, index, arr) => (
                                  <View
                                    key={index}
                                    style={templateA5_4Styles.hsnTaxTableRow}
                                    wrap={false}
                                  >
                                    <Text
                                      style={[
                                        templateA5_4Styles.hsnTaxCell,
                                        { width: hsnColWidths[0] },
                                      ]}
                                    >
                                      {hsnItem.hsnCode}
                                    </Text>
                                    <Text
                                      style={[
                                        templateA5_4Styles.hsnTaxCell,
                                        { width: hsnColWidths[1] },
                                      ]}
                                    >
                                      {formatCurrency(hsnItem.taxableValue)}
                                    </Text>

                                    {showIGST ? (
                                      <View
                                        style={[
                                          templateA5_4Styles.igstCell,
                                          { width: hsnColWidths[2] },
                                        ]}
                                      >
                                        <Text
                                          style={templateA5_4Styles.igstPercent}
                                        >
                                          {hsnItem.taxRate}
                                        </Text>
                                        <Text
                                          style={templateA5_4Styles.igstAmount}
                                        >
                                          {formatCurrency(hsnItem.taxAmount)}
                                        </Text>
                                      </View>
                                    ) : showCGSTSGST ? (
                                      <>
                                        <View
                                          style={[
                                            templateA5_4Styles.igstCell,
                                            { width: hsnColWidths[2] },
                                            {
                                              borderRight: '1px solid #0371C1',
                                            },
                                          ]}
                                        >
                                          <Text
                                            style={
                                              templateA5_4Styles.igstPercent
                                            }
                                          >
                                            {hsnItem.taxRate / 2}
                                          </Text>
                                          <Text
                                            style={[
                                              templateA5_4Styles.igstAmount,
                                            ]}
                                          >
                                            {formatCurrency(hsnItem.cgstAmount)}
                                          </Text>
                                        </View>
                                        <View
                                          style={[
                                            templateA5_4Styles.igstCell,
                                            { width: hsnColWidths[3] },
                                          ]}
                                        >
                                          <Text
                                            style={[
                                              templateA5_4Styles.igstPercent,
                                            ]}
                                          >
                                            {hsnItem.taxRate / 2}
                                          </Text>
                                          <Text
                                            style={
                                              templateA5_4Styles.igstAmount
                                            }
                                          >
                                            {formatCurrency(hsnItem.sgstAmount)}
                                          </Text>
                                        </View>
                                      </>
                                    ) : null}

                                    <Text
                                      style={[
                                        templateA5_4Styles.hsnTaxCell,
                                        {
                                          width:
                                            hsnColWidths[hsnTotalColumnIndex],
                                          borderLeft: '1px solid #0371C1',
                                          borderRight: 'none',
                                        },
                                      ]}
                                    >
                                      {formatCurrency(hsnItem.total)}
                                    </Text>
                                  </View>
                                ))}

                                <View
                                  style={templateA5_4Styles.hsnTaxTableTotalRow}
                                >
                                  <Text
                                    style={[
                                      templateA5_4Styles.hsnTaxTotalCell,
                                      { width: hsnColWidths[0] },
                                    ]}
                                  >
                                    Total
                                  </Text>
                                  <Text
                                    style={[
                                      templateA5_4Styles.hsnTaxTotalCell,
                                      { width: hsnColWidths[1] },
                                    ]}
                                  >
                                    {formatCurrency(totalTaxable)}
                                  </Text>

                                  {showIGST ? (
                                    <View
                                      style={[
                                        templateA5_4Styles.igstTotal,
                                        { width: hsnColWidths[2] },
                                      ]}
                                    >
                                      <Text
                                        style={[
                                          templateA5_4Styles.totalIgstAmount,
                                          { paddingRight: 18 },
                                        ]}
                                      >
                                        {formatCurrency(totalIGST)}
                                      </Text>
                                    </View>
                                  ) : showCGSTSGST ? (
                                    <>
                                      <View
                                        style={[
                                          templateA5_4Styles.igstTotal,
                                          {
                                            width: hsnColWidths[2],
                                            paddingRight: 8,
                                            borderRight: '1px solid #0371C1',
                                          },
                                        ]}
                                      >
                                        <Text
                                          style={[
                                            templateA5_4Styles.totalIgstAmount,
                                          ]}
                                        >
                                          {formatCurrency(totalCGST)}
                                        </Text>
                                      </View>
                                      <View
                                        style={[
                                          templateA5_4Styles.igstTotal,
                                          {
                                            width: hsnColWidths[3],
                                            paddingRight: 8,
                                          },
                                        ]}
                                      >
                                        <Text
                                          style={[
                                            templateA5_4Styles.totalIgstAmount,
                                          ]}
                                        >
                                          {formatCurrency(totalSGST)}
                                        </Text>
                                      </View>
                                    </>
                                  ) : null}

                                  <Text
                                    style={[
                                      templateA5_4Styles.hsnTaxTotalCell,
                                      {
                                        width:
                                          hsnColWidths[hsnTotalColumnIndex],
                                        borderLeft: '1px solid #0371C1',
                                        borderRight: 0,
                                      },
                                    ]}
                                  >
                                    {formatCurrency(totalAmount)}
                                  </Text>
                                </View>
                              </>
                            );
                          })()}
                        </View>
                      )}
                    </View>

                    {/* Right Column: Totals */}
                    <View style={templateA5_4Styles.rightSection}>
                      <View style={templateA5_4Styles.totalRow}>
                        <Text style={templateA5_4Styles.label}>
                          Taxable Amount
                        </Text>
                        <Text style={templateA5_4Styles.value}>
                          {`Rs.${formatCurrency(totalTaxable)}`}
                        </Text>
                      </View>

                      {isGSTApplicable && (
                        <View style={templateA5_4Styles.totalRow}>
                          <Text style={templateA5_4Styles.label}>
                            Total Tax
                          </Text>
                          <Text style={templateA5_4Styles.value}>
                            {`Rs.${formatCurrency(
                              showIGST ? totalIGST : totalCGST + totalSGST,
                            )}`}
                          </Text>
                        </View>
                      )}

                      <View
                        style={[
                          templateA5_4Styles.totalRow,
                          isGSTApplicable
                            ? templateA5_4Styles.highlightRow
                            : {},
                        ]}
                      >
                        <Text
                          style={
                            isGSTApplicable
                              ? templateA5_4Styles.labelBold
                              : templateA5_4Styles.label
                          }
                        >
                          {isGSTApplicable
                            ? 'Total Amount After Tax'
                            : 'Total Amount'}
                        </Text>
                        <Text
                          style={
                            isGSTApplicable
                              ? templateA5_4Styles.valueBold
                              : templateA5_4Styles.value
                          }
                        >
                          {`Rs.${formatCurrency(totalAmount)}`}
                        </Text>
                      </View>

                      <View style={templateA5_4Styles.totalRow}>
                        <Text style={templateA5_4Styles.label}>
                          For{' '}
                          {capitalizeWords(
                            company?.businessName ||
                              company?.companyName ||
                              'Company Name',
                          )}
                        </Text>
                        <Text style={templateA5_4Styles.value}>(E & O.E.)</Text>
                      </View>

                      {/* Bank Details Section */}
                      {transaction.type !== 'proforma' &&
                        isBankDetailAvailable && (
                          <View style={{ padding: 5 }} wrap={false}>
                            <View
                              style={{
                                display: 'flex',
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                              }}
                            >
                              {/* Bank Details Text */}
                              {!shouldHideBankDetails && (
                                <>
                                  <View style={{ flex: 1 }}>
                                    <Text
                                      style={{
                                        fontSize: 9,
                                        fontWeight: 'bold',
                                        marginBottom: 5,
                                      }}
                                    >
                                      Bank Details:
                                    </Text>

                                    <View>
                                      {/* Bank Name */}
                                      {bankData?.bankName && (
                                        <View
                                          style={{
                                            flexDirection: 'row',
                                            marginBottom: 2,
                                            fontSize: 8,
                                          }}
                                        >
                                          <Text
                                            style={{
                                              width: 70,
                                              fontWeight: 'bold',
                                            }}
                                          >
                                            Name:
                                          </Text>
                                          <Text>
                                            {capitalizeWords(bankData.bankName)}
                                          </Text>
                                        </View>
                                      )}

                                      {/* Account Number */}
                                      {bankData?.accountNo && (
                                        <View
                                          style={{
                                            flexDirection: 'row',
                                            marginBottom: 2,
                                            fontSize: 8,
                                          }}
                                        >
                                          <Text
                                            style={{
                                              width: 70,
                                              fontWeight: 'bold',
                                            }}
                                          >
                                            Acc. No:
                                          </Text>
                                          <Text>{bankData.accountNo}</Text>
                                        </View>
                                      )}
                                      {/* IFSC Code */}
                                      {bankData?.ifscCode && (
                                        <View
                                          style={{
                                            flexDirection: 'row',
                                            marginBottom: 2,
                                            fontSize: 8,
                                          }}
                                        >
                                          <Text
                                            style={{
                                              width: 70,
                                              fontWeight: 'bold',
                                            }}
                                          >
                                            IFSC:
                                          </Text>
                                          <Text>{bankData.ifscCode}</Text>
                                        </View>
                                      )}
                                      {bankData?.branchAddress && (
                                        <View
                                          style={{
                                            flexDirection: 'row',
                                            marginBottom: 2,
                                            fontSize: 8,
                                          }}
                                        >
                                          <Text
                                            style={{
                                              width: 70,
                                              fontWeight: 'bold',
                                            }}
                                          >
                                            Branch:
                                          </Text>
                                          <Text style={{ flex: 1 }}>
                                            {bankData.branchAddress}
                                          </Text>
                                        </View>
                                      )}

                                      {/* UPI ID */}
                                      {bankData?.upiDetails?.upiId && (
                                        <View
                                          style={{
                                            flexDirection: 'row',
                                            marginBottom: 2,
                                            fontSize: 8,
                                          }}
                                        >
                                          <Text
                                            style={{
                                              width: 70,
                                              fontWeight: 'bold',
                                            }}
                                          >
                                            UPI ID:
                                          </Text>
                                          <Text>
                                            {bankData.upiDetails.upiId}
                                          </Text>
                                        </View>
                                      )}
                                      {/* UPI Name */}
                                      {bankData?.upiDetails?.upiName && (
                                        <View
                                          style={{
                                            flexDirection: 'row',
                                            marginBottom: 2,
                                            fontSize: 8,
                                          }}
                                        >
                                          <Text
                                            style={{
                                              width: 70,
                                              fontWeight: 'bold',
                                            }}
                                          >
                                            UPI Name:
                                          </Text>
                                          <Text>
                                            {bankData.upiDetails.upiName}
                                          </Text>
                                        </View>
                                      )}

                                      {/* UPI Mobile */}
                                      {bankData?.upiDetails?.upiMobile && (
                                        <View
                                          style={{
                                            flexDirection: 'row',
                                            marginBottom: 2,
                                            fontSize: 8,
                                          }}
                                        >
                                          <Text
                                            style={{
                                              width: 70,
                                              fontWeight: 'bold',
                                            }}
                                          >
                                            UPI Mobile:
                                          </Text>
                                          <Text>
                                            {bankData.upiDetails.upiMobile}
                                          </Text>
                                        </View>
                                      )}
                                    </View>
                                  </View>

                                  {/* QR Code Section */}
                                  {bankData?.qrCode ? (
                                    <View
                                      style={{
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: 5,
                                        marginLeft: 10,
                                      }}
                                    >
                                      <Text
                                        style={{
                                          fontSize: 9,
                                          fontWeight: 'bold',
                                          marginBottom: 5,
                                        }}
                                      >
                                        QR Code
                                      </Text>
                                      <View
                                        style={{
                                          backgroundColor: '#fff',
                                        }}
                                      >
                                        <Image
                                          src={`${BASE_URL}/${bankData.qrCode}`}
                                          style={{
                                            width: 70,
                                            height: 70,
                                            objectFit: 'contain',
                                          }}
                                        />
                                      </View>
                                    </View>
                                  ) : null}
                                </>
                              )}
                            </View>
                          </View>
                        )}
                    </View>
                  </View>

                  {/* Terms and Conditions Section */}
                  {transaction?.notes ? (
                    <View
                      style={[
                        templateA5_4Styles.termsBox,
                        {
                          borderBottom: 0,
                          borderLeft: '1pt solid #0371C1',
                          borderRight: '1pt solid #0371C1',
                        },
                      ]}
                      wrap={false}
                    >
                      <Text
                        style={[
                          templateA5_4Styles.termLine,
                          { fontWeight: 'bold' },
                        ]}
                      ></Text>

                      <>
                        {renderParsedElements(
                          parseHtmlToElements(transaction.notes, 7),
                          7,
                        )}
                      </>
                    </View>
                  ) : null}

                  {/* Table Bottom Border on Each Page */}
                  <View
                    fixed
                    style={{
                      height: 1,
                      backgroundColor: '#0371C1',
                      width: '100%',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  />
                </>
              )}
            </View>

            {/* Page Number */}
            <Text
              fixed
              style={templateA5_4Styles.pageNumber}
              render={({ pageNumber, totalPages }) =>
                `${pageNumber} / ${totalPages} page`
              }
            />
          </Page>
        );
      })}
    </Document>
  );
};

export const generatePdfForTemplateA5_4 = async (
  transaction,
  company,
  party,
  serviceNameById,
  shippingAddress,
  bank,
  client,
) => {
  const pdfDoc = pdf(
    <TemplateA5_4PDF
      transaction={transaction}
      company={company}
      party={party}
      shippingAddress={shippingAddress}
      bank={bank}
      client={client}
    />,
  );

  return await pdfDoc.toBlob();
};

export default TemplateA5_4PDF;
