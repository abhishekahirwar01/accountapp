import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useCompany } from "../../../contexts/company-context";
import { useProfitLossData } from "../../../components/hooks/useProfitLossData";
import DateTimePicker from '@react-native-community/datetimepicker';

// Import utilities
import {formatCurrency,getProfitLossStatus,} from "../../../components/utils/profitLossCalculations";
import {
  getDefaultDateRange,
  getMinMaxDates,
  validateDateRange,
} from "../../../components/utils/dateUtils";

// Import sub-components (you need to create these)
import { HeaderSection } from "../../../components/profit-loss/HeaderSection";
import { TradingAccountSection } from "../../../components/profit-loss/TradingAccountSection";
import { SummarySection } from "../../../components/profit-loss/SummarySection";
import { LoadingState } from "../../../components/profit-loss/LoadingState";
import { ErrorState } from "../../../components/profit-loss/ErrorState";
import { ProfitLossAccountSection } from "../../../components/profit-loss/ProfitLossAccountSection ";

export default function SimplePLTwoSide() {
  const { selectedCompanyId } = useCompany();
  
  // State management
  const [dateRange, setDateRange] = useState(getDefaultDateRange());
  const { minDate, maxDate } = getMinMaxDates();

  // Use custom hook for data fetching
  const { data: profitLossData, loading, error, refetch } = useProfitLossData({
    fromDate: dateRange.from,
    toDate: dateRange.to,
    companyId: selectedCompanyId || undefined,
  });

  // Date handlers
  const handleFromDateChange = (newFrom) => {
    const validationError = validateDateRange(newFrom, dateRange.to);
    if (validationError) {
      // Auto-adjust to date if from date is after to date
      setDateRange({ from: newFrom, to: newFrom });
    } else {
      setDateRange(prev => ({ ...prev, from: newFrom }));
    }
  };

  const handleToDateChange = (newTo) => {
    const validationError = validateDateRange(dateRange.from, newTo);
    if (validationError) {
      // Auto-adjust from date if to date is before from date
      setDateRange({ from: newTo, to: newTo });
    } else {
      setDateRange(prev => ({ ...prev, to: newTo }));
    }
  };

  const setDefaultPeriod = () => {
    setDateRange(getDefaultDateRange());
  };

  // Get profit/loss status for styling
  const profitLossStatus = profitLossData
    ? getProfitLossStatus(profitLossData.summary.netProfit)
    : null;

  const handleApplyFilter = (fromDate, toDate) => {
    // This will trigger the data refetch with new dates
    setDateRange({ from: fromDate, to: toDate });
  };

  // ------------------------------
  // RENDER STATES
  // ------------------------------
  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={refetch} />;
  }

  // ------------------------------
  // RENDER MAIN COMPONENT
  // ------------------------------
  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Header Section */}
        <HeaderSection
          from={dateRange.from}
          to={dateRange.to}
          minDate={minDate}
          maxDate={maxDate}
          onFromChange={handleFromDateChange}
          onToChange={handleToDateChange}
          onSetDefault={setDefaultPeriod}
          onApplyFilter={handleApplyFilter}
        />

        {/* Trading Account Section */}
        {profitLossData && profitLossData.trading && (
          <TradingAccountSection profitLossData={profitLossData} />
        )}

        {profitLossData && (
          <ProfitLossAccountSection profitLossData={profitLossData} />
        )}

        {/* Summary Section */}
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
    backgroundColor: "#f8f9fa",
  },
  content: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical:4,
    maxWidth: 1200,
    alignSelf: "center",
    width: "100%",
  },
});