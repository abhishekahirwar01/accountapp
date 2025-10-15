import React, { useState, useMemo } from "react";
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    StatusBar,
    TouchableOpacity,
    Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Picker } from "@react-native-picker/picker";
import { Users, LayoutDashboard, FileText, Briefcase, ChevronDown } from "lucide-react-native";

// Mock Components (assuming they exist and are imported from the correct path)
import DashboardTab from "../../components/analytics/DashboardTab";
import TransactionsTab from "../../components/analytics/TransactionsTab";
import CompaniesTab from "../../components/analytics/CompaniesTab";
import UsersTab from "../../components/analytics/UsersTab"; // Assuming this is the correct path for the updated UsersTab.js
import ProfitAndLossTab from "../../components/analytics/ProfitAndLoss";
import BalanceSheetTab from "../../components/analytics/BalanceSheet";

// --- MOCK DATA (Keep the same) ---
const clients = [
    { _id: "1", contactName: "Client A" },
    { _id: "2", contactName: "Client B" },
    { _id: "3", contactName: "Client C (New)" },
];
const companies = [
    { _id: "1", businessName: "Company X" },
    { _id: "2", businessName: "Company Y" },
    { _id: "3", businessName: "Global Corp" },
];
// ---------------------------------

export default function AnalyticsScreen() {
    const [selectedClientId, setSelectedClientId] = useState("");
    const [selectedCompanyId, setSelectedCompanyId] = useState("");
    const [activeTab, setActiveTab] = useState("dashboard");
    const [activeReport, setActiveReport] = useState("profitandloss");

    const selectedClient = useMemo(
        () => clients.find((c) => c._id === selectedClientId),
        [selectedClientId]
    );

    const companyMap = useMemo(() => {
        const map = new Map();
        companies.forEach((c) => map.set(c._id, c.businessName));
        return map;
    }, []);

    const TABS = [
        { key: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
        { key: "transactions", label: "Transactions", Icon: FileText },
        { key: "companies", label: "Companies", Icon: Briefcase },
        { key: "users", label: "Users", Icon: Users },
        { key: "reports", label: "Reports", Icon: FileText },
    ];

    const renderTabContent = () => {
        switch (activeTab) {
            case "dashboard":
                // DashboardTab likely needs a ScrollView inside it if its content is long.
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
                // UsersTab contains a FlatList which handles its own scrolling.
                // It should have flex: 1 applied in its container style.
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
                        <View style={styles.reportTabs}>
                            <TouchableOpacity
                                style={[
                                    styles.reportTabButton,
                                    activeReport === "profitandloss" && styles.activeReportTab,
                                ]}
                                onPress={() => setActiveReport("profitandloss")}
                            >
                                <Text
                                    style={[
                                        styles.reportTabText,
                                        activeReport === "profitandloss" && styles.activeReportTabText,
                                    ]}
                                >
                                    Profit & Loss
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.reportTabButton,
                                    activeReport === "balancesheet" && styles.activeReportTab,
                                ]}
                                onPress={() => setActiveReport("balancesheet")}
                            >
                                <Text
                                    style={[
                                        styles.reportTabText,
                                        activeReport === "balancesheet" && styles.activeReportTabText,
                                    ]}
                                >
                                    Balance Sheet
                                </Text>
                            </TouchableOpacity>
                        </View>

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

    const renderPicker = (value, onValueChange, items, label, placeholder, customStyle = {}) => (
        <View style={[styles.pickerField, customStyle]}>
            <Text style={styles.selectionLabel}>{label}</Text>
            <View style={styles.pickerWrapper}>
                <Picker
                    selectedValue={value}
                    onValueChange={onValueChange}
                    style={styles.hiddenPicker}
                    dropdownIconColor={styles.pickerIcon.color}
                >
                    <Picker.Item label={placeholder} value="" style={styles.pickerPlaceholderText} />
                    {items.map((item) => (
                        <Picker.Item
                            key={item._id}
                            label={item.contactName || item.businessName}
                            value={item._id}
                            style={styles.pickerItemText}
                        />
                    ))}
                </Picker>
                <Text style={styles.pickerDisplay} numberOfLines={1}>
                    {value
                        ? (items.find(i => i._id === value)?.contactName || items.find(i => i._id === value)?.businessName)
                        : placeholder}
                </Text>
                <ChevronDown size={20} color={styles.pickerIcon.color} style={styles.pickerIcon} />
            </View>
        </View>
    );

    const renderHeaderAndSelection = () => (
        <View style={styles.headerContainer}>
            <View style={styles.headerTextContainer}>
                <Text style={styles.headerTitle}>Client Analytics</Text>
                <Text style={styles.headerSubtitle}>
                    Select a client and company to view their detailed dashboard.
                </Text>
            </View>

            <View style={styles.selectionContainer}>
                <View style={styles.twoColumnSelection}>
                    {/* Select Client (Always visible) */}
                    {renderPicker(
                        selectedClientId,
                        (value) => {
                            setSelectedClientId(value);
                            setSelectedCompanyId("");
                        },
                        clients,
                        "Select Client",
                        "-- Select Client --",
                        styles.pickerFieldHalf
                    )}

                    {/* Select Company (Visible only if a client is selected) */}
                    {selectedClientId ? (
                        renderPicker(
                            selectedCompanyId,
                            (value) => setSelectedCompanyId(value),
                            [{ _id: "", businessName: "All Companies" }, ...companies],
                            "Select Company",
                            "All Companies",
                            styles.pickerFieldHalf
                        )
                    ) : (
                        // Placeholder to maintain the 2-column layout spacing
                        <View style={styles.pickerFieldHalf} />
                    )}
                </View>
            </View>
        </View>
    );

    const renderMainTabs = () => (
        <View style={styles.tabsWrapper}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.tabScroll}
                contentContainerStyle={styles.tabsScrollContent}
            >
                {TABS.map(({ key, label, Icon }) => (
                    <TouchableOpacity
                        key={key}
                        style={[
                            styles.tabButton,
                            activeTab === key && styles.tabButtonActive,
                        ]}
                        onPress={() => setActiveTab(key)}
                    >
                        <Icon
                            size={16}
                            color={activeTab === key ? "#fff" : styles.tabButtonText.color}
                            style={styles.tabIcon}
                        />
                        <Text
                            style={[
                                styles.tabButtonText,
                                activeTab === key && styles.activeTabText,
                            ]}
                        >
                            {label.toUpperCase()}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            {/* Header and Selection are fixed at the top */}
            {renderHeaderAndSelection()} 

            {!selectedClient ? (
                /* Only scroll if no client is selected, and only for the message content */
                <ScrollView contentContainerStyle={styles.noClientScroll}>
                    <View style={styles.noClientContainer}>
                        <Users size={48} color={styles.noClientIcon.color} />
                        <Text style={styles.noClientText}>No Client Selected</Text>
                        <Text style={styles.noClientSubtext}>
                            Please select a client to view their data.
                        </Text>
                    </View>
                </ScrollView>
            ) : (
                /* Main Tab Content Area (Flex View for FlatList scrolling) */
                <View style={styles.tabsContainer}> 
                    {renderMainTabs()}
                    
                    {/* KEY FIX: The content area uses flex: 1. NO ScrollView here. 
                        The selected component (UsersTab) will handle its own scrolling. */}
                    <View style={styles.tabContentFlex}>
                        {renderTabContent()}
                    </View>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    // --- Colors & Constants ---
    PRIMARY_COLOR: "#007bff",
    SECONDARY_COLOR: "#6c757d",
    BACKGROUND_COLOR: "#f8f9fa",
    CARD_BACKGROUND: "#ffffff",
    TEXT_DARK: "#212529",
    TEXT_MUTED: "#6c757d",

    container: {
        flex: 1,
        backgroundColor: "#fff",
    },
    
    // --- Scroll Fix: New/Modified Styles ---
    tabsContainer: {
        flex: 1, // Crucial: Takes remaining screen space, allowing internal content to be flexible
        backgroundColor: "#f8f9fa",
    },
    tabContentFlex: { 
        flex: 1, // Crucial: Gives full available height to the content (UsersTab, etc.)
        // No padding here, padding should be inside the tabs (UsersTab's margin/padding)
    },
    noClientScroll: {
        flexGrow: 1,
        paddingHorizontal: 16,
    },
    // --- End Scroll Fix ---

    // --- Header ---
    headerContainer: {
        padding: 16,
        paddingBottom: 0,
        backgroundColor: "#fff",
    },
    headerTextContainer: {
        marginBottom: 16,
    },
    headerTitle: {
        fontSize: 26,
        fontWeight: "800",
        color: "#212529",
    },
    headerSubtitle: {
        fontSize: 14,
        color: "#6c757d",
    },

    // --- Selection pickers ---
    selectionContainer: {
        marginBottom: 10,
        paddingTop: 10,
    },
    twoColumnSelection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginHorizontal: -6, 
    },
    pickerField: {
        marginBottom: 10,
    },
    pickerFieldHalf: {
        flex: 1,
        marginHorizontal: 6, 
    },
    selectionLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: "#495057",
        marginBottom: 6,
    },
    pickerWrapper: {
        borderWidth: 1,
        borderColor: "#ced4da",
        borderRadius: 8,
        backgroundColor: "#fff",
        paddingVertical: Platform.OS === 'ios' ? 12 : 0,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        position: 'relative',
    },
    pickerDisplay: {
        flex: 1,
        fontSize: 16,
        color: '#212529',
    },
    pickerIcon: {
        color: '#6c757d',
        marginLeft: 8,
    },
    hiddenPicker: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity: Platform.OS === 'android' ? 0 : 1,
        zIndex: Platform.OS === 'android' ? 10 : 0,
        color: 'transparent',
    },
    pickerPlaceholderText: {
        color: '#adb5bd',
    },
    pickerItemText: {
        color: '#212529',
    },

    // --- No client selected message ---
    noClientContainer: {
        alignItems: "center",
        marginTop: 40,
        padding: 20,
        borderRadius: 12,
        backgroundColor: "#f1f3f5",
    },
    noClientIcon: {
        color: "#adb5bd",
    },
    noClientText: {
        fontSize: 20,
        fontWeight: "700",
        marginTop: 12,
        color: "#495057",
    },
    noClientSubtext: {
        fontSize: 14,
        color: "#868e96",
        textAlign: "center",
        marginTop: 4,
        maxWidth: '80%',
    },

    // --- Main Tabs ---
    tabsWrapper: {
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#e9ecef",
        paddingVertical: 10,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
            },
            android: {
                elevation: 1,
            },
        }),
    },
    tabScroll: {
        paddingLeft: 16,
    },
    tabsScrollContent: {
        paddingRight: 16,
    },
    tabButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: "#f1f3f5",
        marginRight: 8,
        minWidth: 100,
    },
    tabButtonActive: {
        backgroundColor: "#007bff",
        ...Platform.select({
            ios: {
                shadowColor: '#007bff',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 3,
            },
            android: {
                elevation: 3,
            }
        })
    },
    tabIcon: {
        marginRight: 6,
    },
    tabButtonText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#495057",
    },
    activeTabText: {
        color: "#fff",
    },

    // --- Reports Tabs (Nested) ---
    reportsContainer: {
        // Since tabContentFlex has padding, we don't need a top margin here
        // We do need padding for the content of non-FlatList tabs
        padding: 12, 
        flex: 1,
    },
    reportTabs: {
        flexDirection: "row",
        marginBottom: 16,
    },
    reportTabButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        marginRight: 10,
        borderRadius: 8,
        backgroundColor: "#e9ecef",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 140,
    },
    activeReportTab: {
        backgroundColor: "#007bff",
    },
    reportTabText: {
        fontSize: 14,
        color: "#495057",
        fontWeight: "600",
    },
    activeReportTabText: {
        color: "#fff",
    },
    reportContent: {
        // Flex is inherited by its children if needed, otherwise no change
    },
});