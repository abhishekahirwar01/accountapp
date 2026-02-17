// components/profit-loss/TradingAccountSection.js
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { formatCurrency } from "../utils/profitLossCalculations";

export const TradingAccountSection = ({ profitLossData }) => {
  // Add null/undefined checking
  if (!profitLossData || !profitLossData.trading) {
    console.log("No trading data available:", profitLossData);
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Trading Account</Text>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No trading data available for this period</Text>
        </View>
      </View>
    );
  }

  const { trading, income } = profitLossData;
  
  // Safely access all values with defaults
  const openingStock = trading.openingStock || 0;
  const purchases = trading.purchases || 0;
  const grossProfit = trading.grossProfit || 0;
  const grossLoss = trading.grossLoss || 0;
  const closingStock = trading.closingStock || 0;
  
  // Safely access sales data
  const salesTotal = trading.sales?.total || income?.breakdown?.productSales?.amount || 0;
  
  // Safely access payment methods
  const paymentMethods = income?.breakdown?.productSales?.paymentMethods || {};
  const cashSales = paymentMethods.cash || 0;
  const creditSales = paymentMethods.credit || 0;
  const upiSales = paymentMethods.upi || 0;
  const bankTransferSales = paymentMethods.bank_transfer || 0;

  const calculateTradingTotals = () => {
    try {
      const lhsTotal = openingStock + purchases + (grossProfit > 0 ? grossProfit : 0);
      const rhsTotal = salesTotal + closingStock + (grossLoss > 0 ? grossLoss : 0);
      
      return { lhsTotal, rhsTotal };
    } catch (error) {
      console.error("Error calculating trading totals:", error);
      return { lhsTotal: 0, rhsTotal: 0 };
    }
  };

  const { lhsTotal, rhsTotal } = calculateTradingTotals();

  // Payment method colors
  const paymentMethodColors = {
    cash: "#3b82f6", // blue
    credit: "#8b5cf6", // purple
    upi: "#f97316", // orange
    bank_transfer: "#ef4444", // red
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Trading Account</Text>
      
      <View style={styles.content}>
        {/* LEFT SIDE – EXPENSES & COSTS */}
        <View style={styles.sideContainer}>
          <Text style={[styles.sideTitle, styles.leftTitle]}>Dr. (Expenses & Costs)</Text>
          
          <View style={styles.itemsContainer}>
            {/* Opening Stock */}
            <View style={[styles.itemRow, styles.leftItem]}>
              <Text style={styles.itemLabel}>To Opening Stock</Text>
              <Text style={[styles.itemAmount, styles.leftAmount]}>
                {formatCurrency(openingStock)}
              </Text>
            </View>

            {/* Purchases */}
            <View style={[styles.itemRow, styles.leftItem]}>
              <Text style={styles.itemLabel}>To Purchases</Text>
              <Text style={[styles.itemAmount, styles.leftAmount]}>
                {formatCurrency(purchases)}
              </Text>
            </View>

            {/* Gross Profit */}
            {grossProfit > 0 && (
              <View style={[styles.itemRow, styles.grossProfitItem]}>
                <Text style={styles.itemLabel}>To Gross Profit c/d</Text>
                <Text style={[styles.itemAmount, styles.grossProfitAmount]}>
                  {formatCurrency(grossProfit)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* RIGHT SIDE – INCOME & ASSETS */}
        <View style={styles.sideContainer}>
          <Text style={[styles.sideTitle, styles.rightTitle]}>Cr. (Income & Assets)</Text>
          
          <View style={styles.itemsContainer}>
            {/* Sales - Main Total */}
            <View style={[styles.itemRow, styles.rightItem]}>
              <Text style={styles.itemLabel}>By Sales</Text>
              <Text style={[styles.itemAmount, styles.rightAmount]}>
                {formatCurrency(salesTotal)}
              </Text>
            </View>

            {/* Sales Breakdown - Payment Methods */}
            <View style={styles.paymentMethodsContainer}>
              {/* Cash Sales */}
              {(cashSales > 0) && (
                <View style={styles.paymentMethodRow}>
                  <View style={styles.paymentMethodLabel}>
                    <View style={[styles.colorDot, { backgroundColor: paymentMethodColors.cash }]} />
                    <Text style={styles.paymentMethodText}>Cash</Text>
                  </View>
                  <Text style={styles.paymentMethodAmount}>
                    {formatCurrency(cashSales)}
                  </Text>
                </View>
              )}

              {/* Credit Sales */}
              {(creditSales > 0) && (
                <View style={styles.paymentMethodRow}>
                  <View style={styles.paymentMethodLabel}>
                    <View style={[styles.colorDot, { backgroundColor: paymentMethodColors.credit }]} />
                    <Text style={styles.paymentMethodText}>Credit</Text>
                  </View>
                  <Text style={styles.paymentMethodAmount}>
                    {formatCurrency(creditSales)}
                  </Text>
                </View>
              )}

              {/* UPI Payments */}
              {(upiSales > 0) && (
                <View style={styles.paymentMethodRow}>
                  <View style={styles.paymentMethodLabel}>
                    <View style={[styles.colorDot, { backgroundColor: paymentMethodColors.upi }]} />
                    <Text style={styles.paymentMethodText}>UPI</Text>
                  </View>
                  <Text style={styles.paymentMethodAmount}>
                    {formatCurrency(upiSales)}
                  </Text>
                </View>
              )}

              {/* Bank Transfer */}
              {(bankTransferSales > 0) && (
                <View style={styles.paymentMethodRow}>
                  <View style={styles.paymentMethodLabel}>
                    <View style={[styles.colorDot, { backgroundColor: paymentMethodColors.bank_transfer }]} />
                    <Text style={styles.paymentMethodText}>Bank Transfer</Text>
                  </View>
                  <Text style={styles.paymentMethodAmount}>
                    {formatCurrency(bankTransferSales)}
                  </Text>
                </View>
              )}
              
              {/* Show message if no payment methods */}
              {(cashSales === 0 && creditSales === 0 && upiSales === 0 && bankTransferSales === 0) && (
                <View style={styles.paymentMethodRow}>
                  <Text style={styles.noPaymentMethodsText}>No payment method details available</Text>
                </View>
              )}
            </View>

            {/* Closing Stock */}
            <View style={[styles.itemRow, styles.rightItem]}>
              <Text style={styles.itemLabel}>By Closing Stock</Text>
              <Text style={[styles.itemAmount, styles.rightAmount]}>
                {formatCurrency(closingStock)}
              </Text>
            </View>

            {/* Gross Loss */}
            {grossLoss > 0 && (
              <View style={[styles.itemRow, styles.grossLossItem]}>
                <Text style={styles.itemLabel}>By Gross Loss c/d</Text>
                <Text style={[styles.itemAmount, styles.grossLossAmount]}>
                  {formatCurrency(grossLoss)}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* TOTALS SECTION */}
      <View style={styles.totalsContainer}>
        {/* LEFT TOTAL */}
        <View style={styles.totalColumn}>
          <View style={styles.totalDivider} />
          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalAmount}>
              {formatCurrency(lhsTotal)}
            </Text>
          </View>
        </View>

        {/* RIGHT TOTAL */}
        <View style={styles.totalColumn}>
          <View style={styles.totalDivider} />
          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalAmount}>
              {formatCurrency(rhsTotal)}
            </Text>
          </View>
        </View>
      </View>
      
      {/* Balance Status */}
      {/* <View style={[
        styles.balanceContainer,
        Math.abs(lhsTotal - rhsTotal) < 0.01 ? styles.balanced : styles.unbalanced
      ]}>
        <Text style={styles.balanceText}>
          {Math.abs(lhsTotal - rhsTotal) < 0.01 
            ? "✓ Balanced" 
            : `Unbalanced: ${formatCurrency(Math.abs(lhsTotal - rhsTotal))}`}
        </Text>
      </View> */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 16,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 16,
  },
  emptyContainer: {
    padding: 24,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },
  content: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 24,
    marginBottom: 16,
  },
  sideContainer: {
    flex: 1,
    minWidth: 300,
  },
  sideTitle: {
    fontSize: 14,
    fontWeight: "600",
    borderBottomWidth: 1,
    paddingBottom: 8,
    marginBottom: 12,
  },
  leftTitle: {
    color: "#1d4ed8", // blue-700
    borderBottomColor: "#bfdbfe", // blue-200
  },
  rightTitle: {
    color: "#059669", // green-700
    borderBottomColor: "#a7f3d0", // green-200
  },
  itemsContainer: {
    gap: 8,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    minHeight: 44,
  },
  leftItem: {
    backgroundColor: "#dbeafe", // blue-50
  },
  rightItem: {
    backgroundColor: "#d1fae5", // green-50
  },
  grossProfitItem: {
    backgroundColor: "#dcfce7", // green-100
    marginTop: 8,
  },
  grossLossItem: {
    backgroundColor: "#fee2e2", // red-50
  },
  itemLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#374151",
  },
  itemAmount: {
    fontSize: 12,
    fontWeight: "600",
  },
  leftAmount: {
    color: "#1d4ed8", // blue-700
  },
  rightAmount: {
    color: "#059669", // green-700
  },
  grossProfitAmount: {
    color: "#059669", // green-700
  },
  grossLossAmount: {
    color: "#dc2626", // red-700
  },
  paymentMethodsContainer: {
    marginLeft: 16,
    marginTop: 8,
    marginBottom: 8,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: "#a7f3d0", // green-200
    gap: 6,
  },
  paymentMethodRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  paymentMethodLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  colorDot: {
    width: 5,
    height: 5,
    borderRadius: 4,
  },
  paymentMethodText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#4b5563",
  },
  paymentMethodAmount: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
  },
  noPaymentMethodsText: {
    fontSize: 12,
    fontStyle: "italic",
    color: "#9ca3af",
    textAlign: "center",
    paddingVertical: 4,
  },
  totalsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 24,
    marginTop: 8,
  },
  totalColumn: {
    flex: 1,
    minWidth: 300,
  },
  totalDivider: {
    height: 1,
    backgroundColor: "#d1d5db",
    marginBottom: 16,
  },
  totalBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#111827",
  },
  totalAmount: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#111827",
  },
  balanceContainer: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  balanced: {
    backgroundColor: "#dcfce7", // green-50
    borderWidth: 1,
    borderColor: "#bbf7d0", // green-200
  },
  unbalanced: {
    backgroundColor: "#fef3c7", // yellow-50
    borderWidth: 1,
    borderColor: "#fde68a", // yellow-200
  },
  balanceText: {
    fontSize: 14,
    fontWeight: "600",
  },
});

export default TradingAccountSection;