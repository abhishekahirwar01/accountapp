import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { Download } from "lucide-react-native";

// Import your actual data - update the path as needed
import { balanceSheetData } from "../../lib/data";

const { width } = Dimensions.get("window");
const isSmallScreen = width < 768;

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(amount || 0);
};

export default function BalanceSheetTab() {
  const totalLiabilitiesAndEquity = balanceSheetData.liabilities.total + balanceSheetData.equity.total;

  const handleExport = () => {
    console.log("Exporting balance sheet...");
  };

  // Render a table row item
  const renderTableItem = (item, isIndented = false) => {
    return (
      <View key={item.name} style={styles.row}>
        <View style={[styles.descriptionCell, isIndented && styles.indentedCell]}>
          <Text style={styles.cellText}>{item.name}</Text>
        </View>
        <View style={styles.amountCell}>
          <Text style={[styles.cellText, styles.amountText]}>
            {formatCurrency(item.amount)}
          </Text>
        </View>
      </View>
    );
  };

  // Render a table section header
  const renderSectionHeader = (title) => {
    return (
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeaderText}>{title}</Text>
      </View>
    );
  };

  // Render a column
  const renderColumn = (title, data, showEquity = false) => {
    return (
      <View style={styles.column}>
        <Text style={styles.columnTitle}>{title}</Text>
        
        {renderSectionHeader("Current " + (title.includes("Assets") ? "Assets" : "Liabilities"))}
        {data.current.map(item => renderTableItem(item, true))}
        
        {renderSectionHeader("Non-Current " + (title.includes("Assets") ? "Assets" : "Liabilities"))}
        {data.nonCurrent.map(item => renderTableItem(item, true))}
        
        {showEquity && (
          <>
            {renderSectionHeader("Equity")}
            <View style={styles.row}>
              <View style={[styles.descriptionCell, styles.indentedCell]}>
                <Text style={styles.cellText}>Retained Earnings</Text>
              </View>
              <View style={styles.amountCell}>
                <Text style={[styles.cellText, styles.amountText]}>
                  {formatCurrency(balanceSheetData.equity.retainedEarnings)}
                </Text>
              </View>
            </View>
          </>
        )}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>Balance Sheet</Text>
          <Text style={styles.subtitle}>
            As of July 31, 2024
          </Text>
        </View>
        <TouchableOpacity style={styles.exportButton} onPress={handleExport}>
          <Download size={20} color="#fff" />
          <Text style={styles.exportButtonText}>Export</Text>
        </TouchableOpacity>
      </View>
      
      {/* Main Container */}
      <View style={styles.mainCard}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Statement of Financial Position</Text>
          <Text style={styles.cardDescription}>A snapshot of the company's financial health.</Text>
        </View>
        
        {/* Content - Responsive layout */}
        <View style={styles.content}>
          {isSmallScreen ? (
            // Mobile layout - stacked
            <View style={styles.mobileLayout}>
              {renderColumn("Assets", balanceSheetData.assets)}
              {renderColumn("Liabilities & Equity", balanceSheetData.liabilities, true)}
            </View>
          ) : (
            // Desktop layout - side by side
            <View style={styles.desktopLayout}>
              {renderColumn("Assets", balanceSheetData.assets)}
              <View style={styles.verticalDivider} />
              {renderColumn("Liabilities & Equity", balanceSheetData.liabilities, true)}
            </View>
          )}
        </View>
        
        {/* Footer with totals */}
        <View style={styles.footer}>
          <View style={styles.separator} />
          
          <View style={styles.totalContainer}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Assets</Text>
              <Text style={styles.totalAmount}>
                {formatCurrency(balanceSheetData.assets.total)}
              </Text>
            </View>
            
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Liabilities & Equity</Text>
              <Text style={styles.totalAmount}>
                {formatCurrency(totalLiabilitiesAndEquity)}
              </Text>
            </View>
          </View>
          
          <View style={styles.separator} />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  headerTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#64748b",
    fontWeight: "500",
  },
  exportButton: {
    flexDirection: "row",
    backgroundColor: "#2563eb",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 120,
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  exportButtonText: {
    color: "#fff",
    marginLeft: 8,
    fontWeight: "600",
    fontSize: 15,
  },
  mainCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
    overflow: "hidden",
  },
  cardHeader: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    backgroundColor: "#f8fafc",
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 6,
  },
  cardDescription: {
    fontSize: 15,
    color: "#64748b",
    lineHeight: 22,
  },
  content: {
    padding: 0,
  },
  mobileLayout: {
    padding: 16,
  },
  desktopLayout: {
    flexDirection: "row",
    padding: 24,
  },
  column: {
    flex: 1,
    marginBottom: isSmallScreen ? 32 : 0,
  },
  verticalDivider: {
    width: 1,
    backgroundColor: "#e2e8f0",
    marginHorizontal: 24,
  },
  columnTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  sectionHeaderRow: {
    backgroundColor: "#f8fafc",
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  sectionHeaderText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#475569",
  },
  descriptionCell: {
    flex: 2,
    paddingRight: 8,
  },
  amountCell: {
    flex: 1,
    alignItems: "flex-end",
  },
  indentedCell: {
    paddingLeft: 24,
  },
  cellText: {
    fontSize: 15,
    color: "#334155",
    lineHeight: 20,
  },
  amountText: {
    fontWeight: "500",
    color: "#1e293b",
  },
  footer: {
    padding: 24,
    backgroundColor: "#f8fafc",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  totalContainer: {
    marginVertical: 8,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2563eb",
  },
  separator: {
    height: 1,
    backgroundColor: "#e2e8f0",
    width: "100%",
  },
});