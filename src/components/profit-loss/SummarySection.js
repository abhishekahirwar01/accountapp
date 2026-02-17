// components/profit-loss/SummarySection.js
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { formatCurrency } from "../utils/profitLossCalculations";

const ProfitLossCard = ({ type, amount, label }) => {
  const isActive = type === "profit" ? amount > 0 : amount < 0;
  const displayAmount = type === "profit" ? amount : Math.abs(amount);

  // Get styles based on card type and active state
  const getCardStyles = () => {
    if (isActive) {
      if (type === "profit") {
        return {
          container: [styles.cardContainer, styles.profitCardActive],
          amount: styles.profitAmountActive
        };
      } else {
        return {
          container: [styles.cardContainer, styles.lossCardActive],
          amount: styles.lossAmountActive
        };
      }
    } else {
      return {
        container: [styles.cardContainer, styles.inactiveCard],
        amount: styles.inactiveAmount
      };
    }
  };

  const cardStyles = getCardStyles();

  return (
    <View style={cardStyles.container}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={cardStyles.amount}>
        {isActive ? formatCurrency(displayAmount) : `No ${type}`}
      </Text>
    </View>
  );
};

export const SummarySection = ({ summary, status }) => {
  // Handle null/undefined summary
  if (!summary) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No summary data available</Text>
      </View>
    );
  }

  // Calculate profit margin percentage
  const profitMargin = summary.totalIncome > 0 
    ? ((summary.netProfit / summary.totalIncome) * 100).toFixed(1)
    : "0";

  // Ensure we have valid expenseRatio and netMargin
  const expenseRatio = summary.expenseRatio || 0;
  const netMargin = summary.netMargin || 0;

  return (
    <View style={styles.container}>
      {/* Profit/Loss Cards */}
      <View style={styles.cardsRow}>
        {/* Profit Card */}
        <ProfitLossCard
          type="profit"
          amount={summary.netProfit || 0}
          label="Net Profit"
        />

        {/* Loss Card */}
        <ProfitLossCard
          type="loss"
          amount={summary.netProfit || 0}
          label="Net Loss"
        />
      </View>

      {/* Status Indicator */}
      {status && (
        <View style={[
          styles.statusContainer,
          { backgroundColor: status.bgColor || "#e5e7eb", 
            borderColor: status.borderColor || "#d1d5db" }
        ]}>
          <Text style={[styles.statusText, { color: status.textColor || "#374151" }]}>
            {status.icon || ""} {status.label || "No Status"}
          </Text>
        </View>
      )}

      {/* Additional Summary Metrics */}
      

      {/* Financial Ratios */}
      
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
  errorText: {
    textAlign: "center",
    color: "#6b7280",
    fontSize: 14,
    padding: 20,
  },
  cardsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  cardContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    marginHorizontal: 6,
  },
  profitCardActive: {
    backgroundColor: "#dcfce7", // green-50
    borderColor: "#bbf7d0", // green-200
  },
  lossCardActive: {
    backgroundColor: "#fee2e2", // red-50
    borderColor: "#fecaca", // red-200
  },
  inactiveCard: {
    backgroundColor: "#f9fafb", // gray-50
    borderColor: "#e5e7eb", // gray-200
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#4b5563",
    marginBottom: 4,
  },
  profitAmountActive: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#059669", // green-600
  },
  lossAmountActive: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#dc2626", // red-600
  },
  inactiveAmount: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#9ca3af", // gray-400
  },
  statusContainer: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    marginBottom: 16,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "600",
  },
  metricsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    marginBottom: 16,
  },
  metricCard: {
    width: "48%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  grossProfitCard: {
    backgroundColor: "#dbeafe", // blue-50
  },
  totalIncomeCard: {
    backgroundColor: "#dcfce7", // green-50
  },
  totalExpensesCard: {
    backgroundColor: "#fee2e2", // red-50
  },
  profitMarginCard: {
    backgroundColor: "#f3e8ff", // purple-50
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: "#6b7280",
    marginBottom: 4,
    textAlign: "center",
  },
  grossProfitAmount: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1d4ed8", // blue-700
  },
  totalIncomeAmount: {
    fontSize: 14,
    fontWeight: "600",
    color: "#059669", // green-700
  },
  totalExpensesAmount: {
    fontSize: 14,
    fontWeight: "600",
    color: "#dc2626", // red-700
  },
  profitMarginAmount: {
    fontSize: 14,
    fontWeight: "600",
    color: "#7c3aed", // purple-700
  },
  ratiosContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  ratioItem: {
    alignItems: "center",
  },
  ratioLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: "#6b7280",
    marginBottom: 4,
  },
  ratioValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  profitableText: {
    color: "#059669", // green-700
  },
  lossText: {
    color: "#dc2626", // red-700
  },
});

// Optional: Add PropTypes for better development
import PropTypes from 'prop-types';

SummarySection.propTypes = {
  summary: PropTypes.shape({
    grossProfit: PropTypes.number,
    netProfit: PropTypes.number,
    totalIncome: PropTypes.number,
    totalExpenses: PropTypes.number,
    profitMargin: PropTypes.number,
    netMargin: PropTypes.number,
    expenseRatio: PropTypes.number,
    isProfitable: PropTypes.bool,
  }),
  status: PropTypes.shape({
    label: PropTypes.string,
    bgColor: PropTypes.string,
    textColor: PropTypes.string,
    borderColor: PropTypes.string,
    icon: PropTypes.string,
  }),
};

SummarySection.defaultProps = {
  summary: {
    grossProfit: 0,
    netProfit: 0,
    totalIncome: 0,
    totalExpenses: 0,
    profitMargin: 0,
    netMargin: 0,
    expenseRatio: 0,
    isProfitable: false,
  },
};

export default SummarySection;

