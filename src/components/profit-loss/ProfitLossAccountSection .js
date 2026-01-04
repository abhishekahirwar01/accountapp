// components/profit-loss/ProfitLossAccountSection.js - Alternative
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { formatCurrency } from "../utils/profitLossCalculations";
import { ProfitLossResponse } from "../types/profitLoss.types";



export const ProfitLossAccountSection = ({ profitLossData= ProfitLossResponse }) => {
      console.log("ProfitLossAccountSection data:", profitLossData);
  const expenses = profitLossData?.expenses?.breakdown?.expenseBreakdown || [];
  const income = profitLossData?.income?.breakdown?.otherIncome || [];

  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalIncome = income.reduce((sum, i) => sum + (i?.amount || 0), 0);

  const netBalance = totalIncome - totalExpenses;
  const hasData = expenses.length > 0 || income.length > 0;

  if (!hasData) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Profit & Loss Account (Indirect)</Text>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            No indirect expenses or income recorded for this period
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profit & Loss Account (Indirect)</Text>

      <View style={styles.content}>
        {/* Left Column - Expenses */}
        <View style={styles.column}>
          <View style={[styles.columnHeader, styles.expenseHeader]}>
            <Text style={styles.columnTitle}>Dr. (Indirect Expenses)</Text>
          </View>
          
          
          {expenses.length === 0 ? (
            <View style={styles.emptyItem}>
              <Text style={styles.emptyItemText}>No expenses</Text>
              <Text style={styles.emptyItemAmount}>{formatCurrency(0)}</Text>
            </View>
          ) : (
            expenses.map((expense, index) => (
              <View key={index} style={styles.expenseItem}>
                <Text style={styles.itemName}>{expense.label}</Text>
                <Text style={styles.expenseAmount}>
                  {formatCurrency(expense.amount)}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Right Column - Income */}
        <View style={styles.column}>
          <View style={[styles.columnHeader, styles.incomeHeader]}>
            <Text style={styles.columnTitle}>Cr. (Indirect Income)</Text>
          </View>
          
          {income.length === 0 ? (
            <View style={styles.emptyItem}>
              <Text style={styles.emptyItemText}>No income</Text>
              <Text style={styles.emptyItemAmount}>{formatCurrency(0)}</Text>
            </View>
          ) : (
            income.map((item, index) => (
              <View key={index} style={styles.incomeItem}>
                <Text style={styles.itemName}>{item.label}</Text>
                <Text style={styles.incomeAmount}>
                  {formatCurrency(item.amount)}
                </Text>
              </View>
            ))
          )}
        </View>
      </View>

      {/* Totals */}
      <View style={styles.totalsRow}>
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total Expenses</Text>
          <Text style={[styles.totalValue, styles.expenseTotal]}>
            {formatCurrency(totalExpenses)}
          </Text>
        </View>
        
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total Income</Text>
          <Text style={[styles.totalValue, styles.incomeTotal]}>
            {formatCurrency(totalIncome)}
          </Text>
        </View>
        
        <View style={[styles.totalCard, styles.netTotalCard]}>
          <Text style={styles.totalLabel}>Net Balance</Text>
          <Text style={[
            styles.totalValue,
            netBalance >= 0 ? styles.netPositive : styles.netNegative
          ]}>
            {formatCurrency(netBalance)}
          </Text>
        </View>
      </View>
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
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 18,
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
    gap: 20,
    marginBottom: 24,
  },
  column: {
    flex: 1,
    minWidth: 300,
  },
  columnHeader: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    marginBottom: 8,
  },
  expenseHeader: {
    backgroundColor: "#fee2e2", // red-50
  },
  incomeHeader: {
    backgroundColor: "#d1fae5", // green-50
  },
  columnTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
//   expenseHeader ,columnTitle: {
//     color: "#dc2626", // red-700
//   },
//   incomeHeader ,columnTitle: {
//     color: "#059669", // green-700
//   },
  emptyItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
  },
  emptyItemText: {
    fontSize: 14,
    color: "#6b7280",
  },
  emptyItemAmount: {
    fontSize: 14,
    color: "#9ca3af",
  },
  expenseItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#fee2e2",
    borderRadius: 8,
    marginBottom: 8,
  },
  incomeItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#d1fae5",
    borderRadius: 8,
    marginBottom: 8,
  },
  itemName: {
    fontSize: 14,
    color: "#374151",
    flex: 1,
  },
  expenseAmount: {
    fontSize: 14,
    fontWeight: "600",
    color: "#dc2626",
  },
  incomeAmount: {
    fontSize: 14,
    fontWeight: "600",
    color: "#059669",
  },
  totalsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  totalCard: {
    flex: 1,
    minWidth: 120,
    backgroundColor: "#f9fafb",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  netTotalCard: {
    backgroundColor: "#eff6ff", // blue-50
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6b7280",
    marginBottom: 8,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: "bold",
  },
  expenseTotal: {
    color: "#dc2626", // red-700
  },
  incomeTotal: {
    color: "#059669", // green-700
  },
  netPositive: {
    color: "#059669", // green-700
  },
  netNegative: {
    color: "#dc2626", // red-700
  },
});