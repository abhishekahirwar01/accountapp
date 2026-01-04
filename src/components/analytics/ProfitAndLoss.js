import React, { useState, useMemo, useCallback } from 'react';
import { 
  View, 
  ScrollView, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  RefreshControl 
} from 'react-native';
import { Card } from '../ui/Card';

// Import components
import { HeaderSection } from '../../components/profit-loss/HeaderSection';
import { TradingAccountSection } from '../../components/profit-loss/TradingAccountSection';
import { SummarySection } from '../../components/profit-loss/SummarySection';
import { ProfitLossAccountSection } from '../profit-loss/ProfitLossAccountSection ';
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
    const [refreshing, setRefreshing] = useState(false);
    const { minDate, maxDate } = getMinMaxDates();
    
    // FIX: Properly handle empty string for "All Companies"
    const companyIdForApi = selectedCompanyId && selectedCompanyId.trim() !== '' 
        ? selectedCompanyId 
        : undefined;
    
    const clientIdForApi = selectedClient?._id;
    
    // Create a unique key to force re-fetch when client/company changes
    const fetchKey = useMemo(() => {
        return `${clientIdForApi || 'no-client'}-${companyIdForApi || 'all-companies'}-${dateRange.from}-${dateRange.to}`;
    }, [clientIdForApi, companyIdForApi, dateRange.from, dateRange.to]);
    
    // Data fetching with ALL required parameters
    const { 
        data: profitLossData, 
        loading, 
        error, 
        refetch 
    } = useProfitLossData({
        fromDate: dateRange.from,
        toDate: dateRange.to,
        companyId: companyIdForApi,
        clientId: clientIdForApi, // PASS CLIENT ID
        key: fetchKey,
    });
    
    // Pull-to-refresh handler
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await refetch();
        } catch (error) {
            console.error('Refresh error:', error);
        } finally {
            setRefreshing(false);
        }
    }, [refetch]);
    
    // Debug logging
    React.useEffect(() => {
        console.log('🔍 ProfitAndLossTab Debug:', {
            selectedClientId: clientIdForApi,
            selectedClientName: selectedClient?.contactName,
            selectedCompanyId: selectedCompanyId,
            companyIdForApi,
            dateRange,
            hasData: !!profitLossData,
            loading,
            error,
        });
    }, [clientIdForApi, selectedClient, selectedCompanyId, companyIdForApi, dateRange, profitLossData, loading, error]);
    
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
    const companyName = selectedCompanyId && selectedCompanyId.trim() !== ''
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
    
    if (loading && !refreshing) {
        return <LoadingState />;
    }

    if (error && !refreshing) {
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
        <ScrollView 
            style={styles.container}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    colors={['#007bff']}
                    tintColor="#007bff"
                />
            }
        >
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
                {profitLossData && profitLossData.income && profitLossData.expenses && (
                    <ProfitLossAccountSection profitLossData={profitLossData} />
                )}

                {/* 4. Summary Section */}
                {profitLossData && profitLossData.summary && (
                    <SummarySection
                        summary={profitLossData.summary}
                        status={profitLossStatus}
                    />
                )}

                {/* Empty state when no data */}
                {!loading && !error && (!profitLossData || !profitLossData.success) && (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyTitle}>No Profit & Loss Data Available</Text>
                        <Text style={styles.emptyText}>
                            {profitLossData?.message || 'No data found for the selected period, client, or company.'}
                        </Text>
                        <TouchableOpacity 
                            style={styles.retryButton}
                            onPress={refetch}
                        >
                            <Text style={styles.retryButtonText}>Retry</Text>
                        </TouchableOpacity>
                    </View>
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
        minHeight: '100%',
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
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        borderRadius: 8,
        marginTop: 20,
        borderWidth: 1,
        borderColor: '#e9ecef',
        borderStyle: 'dashed',
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#495057',
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        color: '#6c757d',
        textAlign: 'center',
        marginBottom: 20,
    },
    retryButton: {
        backgroundColor: '#007bff',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 6,
    },
    retryButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
});

