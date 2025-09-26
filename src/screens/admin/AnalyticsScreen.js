import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { Users } from "lucide-react-native";

// Import your existing components
import DashboardTab from "../../components/analytics/DashboardTab";
import TransactionsTab from "../../components/analytics/TransactionsTab";
import CompaniesTab from "../../components/analytics/CompaniesTab";
import UsersTab from "../../components/analytics/UsersTab";
import ProfitAndLossTab from "../../components/analytics/ProfitAndLoss";
import BalanceSheetTab from "../../components/analytics/BalanceSheet";

// Dummy clients and companies (replace with API if needed)
const clients = [
  { _id: "1", contactName: "Client A" },
  { _id: "2", contactName: "Client B" },
];
const companies = [
  { _id: "1", businessName: "Company X" },
  { _id: "2", businessName: "Company Y" },
];

export default function AnalyticsScreen() {
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [activeReport, setActiveReport] = useState("profitandloss"); // Default report type

  const selectedClient = useMemo(
    () => clients.find((c) => c._id === selectedClientId),
    [selectedClientId]
  );

  const companyMap = useMemo(() => {
    const map = new Map();
    companies.forEach((c) => map.set(c._id, c.businessName));
    return map;
  }, []);

  const renderTabContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <DashboardTab
            selectedClient={selectedClient}
            selectedCompanyId={selectedCompanyId}
          />
        );
      case "transactions":
        return (
          <TransactionsTab
            selectedClient={selectedClient}
            selectedCompanyId={selectedCompanyId}
            companyMap={companyMap}
          />
        );
      case "companies":
        return (
          <CompaniesTab
            selectedClient={selectedClient}
            selectedClientId={selectedClientId}
          />
        );
      case "users":
        return (
          <UsersTab
            selectedClient={selectedClient}
            selectedCompanyId={selectedCompanyId}
            companyMap={companyMap}
          />
        );
      case "reports":
        return (
          <View style={styles.reportsContainer}>
            {/* Report Type Selection */}
            <View style={styles.reportTypeSelector}>
              <Text
                style={[
                  styles.reportTypeButton,
                  activeReport === "profitandloss" && styles.reportTypeButtonActive
                ]}
                onPress={() => setActiveReport("profitandloss")}
              >
                Profit & Loss
              </Text>
              <Text
                style={[
                  styles.reportTypeButton,
                  activeReport === "balancesheet" && styles.reportTypeButtonActive
                ]}
                onPress={() => setActiveReport("balancesheet")}
              >
                Balance Sheet
              </Text>
            </View>

            {/* Report Content */}
            <View style={styles.reportContent}>
              {activeReport === "profitandloss" && <ProfitAndLossTab />}
              {activeReport === "balancesheet" && <BalanceSheetTab />}
            </View>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Client Analytics</Text>
        <Text style={styles.subtitle}>
          Select a client and company to view their detailed dashboard.
        </Text>
      </View>

      {/* Client & Company selection */}
      <View style={styles.selectionRow}>
        {/* Client Dropdown */}
        <View style={styles.selectionBox}>
          <Text style={styles.label}>Select Client:</Text>
          <View style={styles.dropdownWrapper}>
            <Picker
              selectedValue={selectedClientId}
              onValueChange={(value) => {
                setSelectedClientId(value);
                setSelectedCompanyId(""); // reset company when client changes
              }}
            >
              <Picker.Item label="-- Select Client --" value="" />
              {clients.map((client) => (
                <Picker.Item
                  key={client._id}
                  label={client.contactName}
                  value={client._id}
                />
              ))}
            </Picker>
          </View>
        </View>

        {/* Company Dropdown (only if client selected) */}
        {selectedClientId && (
          <View style={styles.selectionBox}>
            <Text style={styles.label}>Select Company:</Text>
            <View style={styles.dropdownWrapper}>
              <Picker
                selectedValue={selectedCompanyId}
                onValueChange={(value) => setSelectedCompanyId(value)}
              >
                <Picker.Item label="All Companies" value="" />
                {companies.map((company) => (
                  <Picker.Item
                    key={company._id}
                    label={company.businessName}
                    value={company._id}
                  />
                ))}
              </Picker>
            </View>
          </View>
        )}
      </View>

      {/* No client selected */}
      {!selectedClient && (
        <View style={styles.noClientCard}>
          <Users size={48} color="#999" />
          <Text style={styles.noClientTitle}>No Client Selected</Text>
          <Text style={styles.noClientText}>
            Please select a client to view their data.
          </Text>
        </View>
      )}

      {/* Tabs */}
      {selectedClient && (
        <View style={styles.tabsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[
              "dashboard",
              "transactions",
              "companies",
              "users",
              "reports",
            ].map((tab) => (
              <View key={tab} style={{ marginRight: 6 }}>
                <Text
                  style={[
                    styles.tabButton,
                    activeTab === tab && styles.tabButtonActive,
                  ]}
                  onPress={() => setActiveTab(tab)}
                >
                  {tab === "reports" ? "REPORTS" : tab.toUpperCase()}
                </Text>
              </View>
            ))}
          </ScrollView>

          {/* Tab content */}
          <View style={styles.tabContent}>
            {renderTabContent()}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#f7f7f7" },
  header: { marginBottom: 20 },
  title: { fontSize: 24, fontWeight: "bold" },
  subtitle: { fontSize: 14, color: "#555", marginTop: 4 },

  selectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  selectionBox: {
    flex: 1,
    marginRight: 10,
  },
  label: { fontWeight: "bold", marginBottom: 6 },
  dropdownWrapper: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    backgroundColor: "#fff",
  },

  noClientCard: {
    padding: 20,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    backgroundColor: "#fff",
    alignItems: "center",
    marginBottom: 20,
  },
  noClientTitle: { fontSize: 16, fontWeight: "bold", marginTop: 8 },
  noClientText: { color: "#555", marginTop: 4 },

  tabsContainer: { marginTop: 10 },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: "#eee",
  },
  tabButtonActive: { backgroundColor: "#3399ff", color: "#fff" },
  tabContent: {
    padding: 12,
    backgroundColor: "#fff",
    borderRadius: 6,
    minHeight: 100,
    marginTop: 12,
  },

  // Reports specific styles
  reportsContainer: {
    flex: 1,
  },
  reportTypeSelector: {
    flexDirection: "row",
    marginBottom: 16,
    backgroundColor: "#f5f5f5",
    borderRadius: 6,
    padding: 4,
  },
  reportTypeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    textAlign: "center",
    borderRadius: 4,
    fontWeight: "500",
  },
  reportTypeButtonActive: {
    backgroundColor: "#3399ff",
    color: "#fff",
  },
  reportContent: {
    flex: 1,
  },
});