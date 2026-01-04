// services/profitLossApiService.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const baseURL = 'https://accountapp-backend-shardaassociates.onrender.com';

class ProfitLossApiService {
  /**
   * Fetch profit and loss data from API
   */
  static async fetchProfitLossData(params) {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error("Authentication token not found");
      }

      const { fromDate, toDate, companyId , clientId} = params;
      
      // Build query parameters - Note: using fromDate, toDate (not 'from' and 'to')
      const queryParams = new URLSearchParams({
        fromDate,
        toDate,
        clientId,
        ...(companyId && { companyId })
      });

      console.log(`Fetching P&L from: ${baseURL}/api/profitloss/statement?${queryParams}`);

      const response = await fetch(
        `${baseURL}/api/profitloss/statement?${queryParams}`, 
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log(`Response status: ${response.status}`);

      if (!response.ok) {
        let errorData = {};
        try {
          errorData = await response.json();
        } catch (e) {
          // If response is not JSON, get text instead
          const errorText = await response.text();
          errorData = { message: errorText || `HTTP error! status: ${response.status}` };
        }
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("P&L API Response:", data);

      if (!data.success) {
        throw new Error(data.message || "Failed to load profit & loss data");
      }

      return data;
    } catch (error) {
      console.error("Error fetching P&L data:", error);
      throw error;
    }
  }

  /**
   * Fetch daily stock ledger data
   */
  static async fetchDailyStockLedger(params) {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error("Authentication token not found");
      }

      const { companyId, startDate, endDate, page = 1, limit = 30 } = params;
      
      const queryParams = new URLSearchParams({
        companyId,
        startDate,
        endDate,
        page: page.toString(),
        limit: limit.toString(),
      });

      const response = await fetch(
        `${baseURL}/api/daily-stock-ledger?${queryParams}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        let errorData = {};
        try {
          errorData = await response.json();
        } catch (e) {
          const errorText = await response.text();
          errorData = { message: errorText || `HTTP error! status: ${response.status}` };
        }
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching daily stock ledger:", error);
      throw error;
    }
  }

  /**
   * Fetch today's stock data
   */
  static async fetchTodayStock(companyId) {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error("Authentication token not found");
      }

      const response = await fetch(
        `${baseURL}/api/daily-stock-ledger/today?companyId=${companyId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        let errorData = {};
        try {
          errorData = await response.json();
        } catch (e) {
          const errorText = await response.text();
          errorData = { message: errorText || `HTTP error! status: ${response.status}` };
        }
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching today's stock:", error);
      throw error;
    }
  }

  /**
   * Fetch current stock status across all companies
   */
  static async fetchCurrentStockStatus() {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error("Authentication token not found");
      }

      const response = await fetch(
        `${baseURL}/api/daily-stock-ledger/current-status`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        let errorData = {};
        try {
          errorData = await response.json();
        } catch (e) {
          const errorText = await response.text();
          errorData = { message: errorText || `HTTP error! status: ${response.status}` };
        }
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching current stock status:", error);
      throw error;
    }
  }

  /**
   * Fix carry forward manually
   */
  static async fixCarryForward(params) {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error("Authentication token not found");
      }

      const response = await fetch(
        `${baseURL}/api/daily-stock-ledger/fix-carried-forward`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(params),
        }
      );

      if (!response.ok) {
        let errorData = {};
        try {
          errorData = await response.json();
        } catch (e) {
          const errorText = await response.text();
          errorData = { message: errorText || `HTTP error! status: ${response.status}` };
        }
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error fixing carry forward:", error);
      throw error;
    }
  }
}

export default ProfitLossApiService;