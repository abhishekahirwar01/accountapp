import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";

// Assuming you have these React Native components created
// You'll need to create these components or use alternatives

import { Download } from "lucide-react-native"; // Note: lucide-react-native instead of lucide-react
import { Separator } from "../../components/ui/Separator";
import { useCompany } from "../../contexts/company-context";
import { useReceipts } from "..//hooks/useReceipts";
import { usePayments } from "../hooks/usePayments";

const INR = (n) =>
  new Intl.NumberFormat("en-IN", { 
    style: "currency", 
    currency: "INR", 
    maximumFractionDigits: 2 
  }).format(n || 0);

// helpers to safely read company fields whether populated or not
const getCompanyId = (c) => (typeof c === "object" ? c?._id : c) || null;
const getCompanyName = (c) =>
  (typeof c === "object" && (c?.businessName || c?.name)) || "Unassigned Company";

export default function ProfitAndLossTab() {
  const baseURL = "https://accountbackend.sharda.co.in";
  const { selectedCompanyId } = useCompany();

  const [from, setFrom] = useState("2024-07-01");
  const [to, setTo] = useState("2024-07-31");

  // Fetch raw data (server *may* filter by companyId; we also enforce client-side)
  const { receipts, loading: loadingReceipts } = useReceipts(baseURL, {
    companyId: selectedCompanyId || undefined,
    from, to,
  });
  const { payments, loading: loadingPayments } = usePayments(baseURL, {
    companyId: selectedCompanyId || undefined,
    from, to,
  });

  const loading = loadingReceipts || loadingPayments;

  // --- Client-side company filter (defensive, in case API ignores companyId) ---
  const filteredReceipts = useMemo(() => {
    if (!selectedCompanyId) return receipts || [];
    return (receipts || []).filter(r => getCompanyId(r.company) === selectedCompanyId);
  }, [receipts, selectedCompanyId]);

  const filteredPayments = useMemo(() => {
    if (!selectedCompanyId) return payments || [];
    return (payments || []).filter(p => getCompanyId(p.company) === selectedCompanyId);
  }, [payments, selectedCompanyId]);

  // --- Revenue lines (group by company if "All", otherwise the single selected company) ---
  const revenueLines = useMemo(() => {
    const src = selectedCompanyId ? filteredReceipts : (receipts || []);
    const map = new Map();
    for (const r of src) {
      const key = getCompanyName(r.company);
      map.set(key, (map.get(key) || 0) + (Number(r.amount) || 0));
    }
    return Array.from(map.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [receipts, filteredReceipts, selectedCompanyId]);

  const totalRevenue = useMemo(
    () => revenueLines.reduce((s, l) => s + l.amount, 0),
    [revenueLines]
  );

  // --- Expense lines (group by company if "All") ---
  const expenseLines = useMemo(() => {
    const src = selectedCompanyId ? filteredPayments : (payments || []);
    const map = new Map();
    for (const p of src) {
      const key = getCompanyName(p.company);
      map.set(key, (map.get(key) || 0) + (Number(p.amount) || 0)); // swap to net field if needed
    }
    return Array.from(map.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [payments, filteredPayments, selectedCompanyId]);

  const totalExpenses = useMemo(
    () => expenseLines.reduce((s, l) => s + l.amount, 0),
    [expenseLines]
  );

  const netIncome = totalRevenue - totalExpenses;

  // Handle export functionality
  const handleExport = () => {
    console.log("Exporting P&L data...");
    // Implement actual export functionality here
  };

  // Handle date change
  const handleFromChange = (text) => {
    setFrom(text);
  };

  const handleToChange = (text) => {
    setTo(text);
  };

  // Render function for table rows
  const renderTableRow = (label, value, isHeader = false, isSection = false, isTotal = false, indent = false) => {
    return (
      <View style={[
        styles.row,
        isHeader && styles.tableHeader,
        isSection && styles.sectionHeader,
        isTotal && styles.totalRow
      ]}>
        <View style={[styles.cell, styles.descriptionCell, indent && styles.indentedCell]}>
          <Text style={[
            styles.cellText,
            isHeader && styles.headerText,
            isSection && styles.sectionText,
            isTotal && styles.totalText
          ]}>
            {label}
          </Text>
        </View>
        <View style={[styles.cell, styles.amountCell]}>
          <Text style={[
            styles.cellText,
            styles.amountText,
            isHeader && styles.headerText,
            isTotal && styles.totalText
          ]}>
            {value}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>Profit & Loss Statement</Text>
          <Text style={styles.subtitle}>
            {from && to ? `For the period ${from} to ${to}` : "For the selected period"}
          </Text>
        </View>
        <TouchableOpacity style={styles.exportButton} onPress={handleExport}>
          <Download size={16} color="#fff" />
          <Text style={styles.exportButtonText}>Export</Text>
        </TouchableOpacity>
      </View>

      {/* Date controls */}
      <View style={styles.dateControls}>
        <TextInput
          style={styles.dateInput}
          value={from}
          onChangeText={handleFromChange}
          placeholder="YYYY-MM-DD"
        />
        <Text style={styles.dateSeparator}>to</Text>
        <TextInput
          style={styles.dateInput}
          value={to}
          onChangeText={handleToChange}
          placeholder="YYYY-MM-DD"
        />
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Income Statement</Text>
          <Text style={styles.cardDescription}>Summary of financial performance.</Text>
        </View>

        <View style={styles.cardContent}>
          {/* Table Header */}
          {renderTableRow("Description", "Amount", true)}

          {/* Revenue Section */}
          {renderTableRow("Revenue", "", false, true)}

          {loading ? (
            <View style={styles.row}>
              <View style={[styles.cell, styles.descriptionCell, styles.indentedCell]}>
                <ActivityIndicator size="small" color="#3b82f6" />
                <Text style={[styles.cellText, styles.loadingText]}>Loading…</Text>
              </View>
              <View style={[styles.cell, styles.amountCell]}>
                <Text style={[styles.cellText, styles.amountText]}>—</Text>
              </View>
            </View>
          ) : revenueLines.length === 0 ? (
            renderTableRow("No receipts for the selection", "—", false, false, false, true)
          ) : (
            revenueLines.map((item) => (
              renderTableRow(item.name, INR(item.amount), false, false, false, true)
            ))
          )}

          {/* Total Revenue */}
          {renderTableRow("Total Revenue", INR(totalRevenue), false, false, true, true)}

          {/* Expenses Section */}
          {renderTableRow("Expenses", "", false, true)}

          {loading ? (
            <View style={styles.row}>
              <View style={[styles.cell, styles.descriptionCell, styles.indentedCell]}>
                <ActivityIndicator size="small" color="#3b82f6" />
                <Text style={[styles.cellText, styles.loadingText]}>Loading…</Text>
              </View>
              <View style={[styles.cell, styles.amountCell]}>
                <Text style={[styles.cellText, styles.amountText]}>—</Text>
              </View>
            </View>
          ) : expenseLines.length === 0 ? (
            renderTableRow("No payments for the selection", "—", false, false, false, true)
          ) : (
            expenseLines.map((item) => (
              renderTableRow(item.name, INR(item.amount), false, false, false, true)
            ))
          )}

          {/* Total Expenses */}
          {renderTableRow("Total Expenses", INR(totalExpenses), false, false, true, true)}
        </View>

        <View style={styles.cardFooter}>
          <Separator />
          <View style={styles.netIncomeContainer}>
            <Text style={styles.netIncomeLabel}>Net Income</Text>
            <Text style={styles.netIncomeAmount}>{INR(netIncome)}</Text>
          </View>
          <Separator />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1f2937",
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 4,
  },
  exportButton: {
    flexDirection: "row",
    backgroundColor: "#3b82f6",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: "center",
    marginLeft: 16,
  },
  exportButtonText: {
    color: "#fff",
    marginLeft: 8,
    fontWeight: "500",
  },
  dateControls: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  dateInput: {
    flex: 1,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 6,
    padding: 12,
    fontSize: 14,
  },
  dateSeparator: {
    marginHorizontal: 12,
    color: "#6b7280",
    fontSize: 14,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 20,
  },
  cardHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
  },
  cardDescription: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 4,
  },
  cardContent: {
    padding: 0,
  },
  cardFooter: {
    padding: 24,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    minHeight: 48,
    alignItems: "center",
  },
  tableHeader: {
    backgroundColor: "#f9fafb",
    borderBottomColor: "#e5e7eb",
  },
  sectionHeader: {
    backgroundColor: "rgba(243, 244, 246, 0.5)",
    borderBottomColor: "#e5e7eb",
  },
  totalRow: {
    backgroundColor: "#f9fafb",
    borderBottomColor: "#e5e7eb",
  },
  cell: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  descriptionCell: {
    flex: 7,
  },
  amountCell: {
    flex: 3,
    alignItems: "flex-end",
  },
  indentedCell: {
    paddingLeft: 32,
  },
  cellText: {
    fontSize: 14,
    color: "#374151",
  },
  headerText: {
    fontWeight: "600",
    color: "#374151",
  },
  sectionText: {
    fontWeight: "600",
    color: "#1f2937",
  },
  totalText: {
    fontWeight: "500",
  },
  amountText: {
    textAlign: "right",
  },
  loadingText: {
    marginLeft: 8,
    color: "#6b7280",
  },
  netIncomeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 12,
  },
  netIncomeLabel: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
  },
  netIncomeAmount: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
  },
});