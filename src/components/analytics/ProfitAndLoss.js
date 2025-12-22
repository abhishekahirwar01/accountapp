import React, { useState, useMemo } from 'react';
import { View, ScrollView, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Card } from '../ui/Card';
import { Loader2 } from 'lucide-react-native';

// Import components
import { HeaderSection } from '../../components/profit-loss/HeaderSection';
import { TradingAccountSection } from '../../components/profit-loss/TradingAccountSection';
import { SummarySection } from '../../components/profit-loss/SummarySection';
import { ProfitLossAccountSection } from '../../components/profit-loss/ProfitLossAccountSection ';
import { LoadingState } from '../../components/profit-loss/LoadingState';
import { ErrorState } from '../../components/profit-loss/ErrorState';

// Import hooks and utils
import { useProfitLossData } from '../hooks/useProfitLossData';
import { getProfitLossStatus } from '../../components/utils/profitLossCalculations';
import { 
    getDefaultDateRange, 
    getMinMaxDates, 
    validateDateRange 
} from '../../components/utils/dateUtils';

export default function ProfitAndLossTab({
    selectedClient,
    selectedCompanyId,
    companyMap,
}) {
    const [dateRange, setDateRange] = useState(getDefaultDateRange());
    const { minDate, maxDate } = getMinMaxDates();
    
    // API parameters derived from props
    const companyIdForApi = selectedCompanyId || undefined;
    const clientIdForApi = selectedClient?._id;

    // Data fetching
    const { 
        data: profitLossData, 
        loading, 
        error, 
        refetch 
    } = useProfitLossData({
        fromDate: dateRange.from,
        toDate: dateRange.to,
        clientId: clientIdForApi, 
        companyId: companyIdForApi, 
    });

    // Date handlers
    const handleFromDateChange = (newFrom) => {
        const validationError = validateDateRange(newFrom, dateRange.to);
        setDateRange({ 
            from: newFrom, 
            to: validationError ? newFrom : dateRange.to 
        });
    };

    const handleToDateChange = (newTo) => {
        const validationError = validateDateRange(dateRange.from, newTo);
        setDateRange({ 
            from: validationError ? newTo : dateRange.from, 
            to: newTo 
        });
    };

    const setDefaultPeriod = () => {
        setDateRange(getDefaultDateRange());
    };
    
    const handleApplyFilter = (fromDate, toDate) => {
        setDateRange({ from: fromDate, to: toDate });
    };

    const profitLossStatus = useMemo(() => {
        return profitLossData && profitLossData.summary
            ? getProfitLossStatus(profitLossData.summary.netProfit)
            : null;
    }, [profitLossData]);

    // Report display details
    const clientName = selectedClient?.contactName || "Client Not Selected";
    const companyName = selectedCompanyId
        ? (companyMap.get(selectedCompanyId) || "Selected Company")
        : "All Companies";

    // Render states
    if (!selectedClient) {
        return (
            <Card style={styles.noClientCard}>
                <View style={styles.noClientContainer}>
                    <Text style={styles.noClientTitle}>⚠️ Please Select a Client</Text>
                    <Text style={styles.noClientText}>
                        Choose a client from the dropdown menu at the top to view the analytics dashboard.
                    </Text>
                </View>
            </Card>
        );
    }
    
    if (loading) {
        return <LoadingState />;
    }

    if (error) {
        const errorMessage = 
            (error && typeof error === 'object' && 'message' in error) 
            ? error.message 
            : String(error);
            
        return <ErrorState 
            error={errorMessage} 
            onRetry={refetch} 
        />;
    }

    // Render main detailed P&L report
    return (
        <ScrollView style={styles.container}>
            <View style={styles.contentContainer}>
                
                {/* 1. Header Section (Client and Date Filters) */}
                <HeaderSection
                    from={dateRange.from}
                    to={dateRange.to}
                    minDate={minDate}
                    maxDate={maxDate}
                    onFromChange={handleFromDateChange}
                    onToChange={handleToDateChange}
                    onSetDefault={setDefaultPeriod}
                    onApplyFilter={handleApplyFilter}
                    clientName={clientName}
                    companyName={companyName}
                    isDetailedReport={true}
                />

                {/* 2. Trading Account Section */}
                {profitLossData && profitLossData.trading && (
                    <TradingAccountSection profitLossData={profitLossData} />
                )}

                {/* 3. Profit & Loss Account Section */}
                {profitLossData && (
                    <ProfitLossAccountSection profitLossData={profitLossData} />
                )}

                {/* 4. Summary Section */}
                {profitLossData && (
                    <SummarySection
                        summary={profitLossData.summary}
                        status={profitLossStatus}
                    />
                )}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    contentContainer: {
        padding: 16,
        paddingBottom: 32,
    },
    noClientCard: {
        margin: 16,
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
    },
    noClientContainer: {
        padding: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    noClientTitle: {
        marginTop: 16,
        fontSize: 20,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 8,
    },
    noClientText: {
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
        lineHeight: 20,
    },
});