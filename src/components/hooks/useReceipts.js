import { useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export function useReceipts(baseURL, opts) {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const prevKey = useRef("");

  const qs = useMemo(() => {
    const params = new URLSearchParams();
    if (opts && opts.companyId) params.append("companyId", opts.companyId);
    if (opts && opts.from) params.append("from", opts.from);
    if (opts && opts.to) params.append("to", opts.to);
    return params.toString();
  }, [opts ? opts.companyId : null, opts ? opts.from : null, opts ? opts.to : null]);

  useEffect(() => {
    const fetchReceipts = async () => {
      const key = `${baseURL}|${qs}`;
      
      // Clear immediately when filter changes to avoid showing stale results
      if (prevKey.current && prevKey.current !== key) {
        setReceipts([]);
      }
      prevKey.current = key;

      setLoading(true);
      setError(null);

      try {
        // Get token from AsyncStorage (React Native equivalent of localStorage)
        const token = await AsyncStorage.getItem("token") || "";
        
        // Build URL with query string
        let url = `${baseURL}/api/receipts`;
        if (qs) {
          url += `?${qs}`;
        }

        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
            // Add cache control for React Native
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const json = await response.json();
        
        // Handle different response formats
        let arr = [];
        if (Array.isArray(json)) {
          arr = json;
        } else if (json && Array.isArray(json.receipts)) {
          arr = json.receipts;
        } else if (json && Array.isArray(json.entries)) {
          arr = json.entries;
        } else if (json && Array.isArray(json.data)) {
          arr = json.data;
        } else if (json && typeof json === "object") {
          // Try to extract any array from the object
          const keys = Object.keys(json);
          for (const key of keys) {
            if (Array.isArray(json[key])) {
              arr = json[key];
              break;
            }
          }
        }

        setReceipts(arr);
      } catch (err) {
        console.error("Error fetching receipts:", err);
        setError(err.message || "Failed to fetch receipts");
        setReceipts([]);
        
        // Optionally show an alert to the user
        Alert.alert(
          "Error",
          "Failed to load receipts. Please check your connection and try again.",
          [{ text: "OK" }]
        );
      } finally {
        setLoading(false);
      }
    };

    fetchReceipts();

    // Cleanup function
    return () => {
      // Cancel any ongoing requests if needed
      // For fetch API, you can use AbortController
    };
  }, [baseURL, qs]);

  // Function to manually refresh receipts
  const refresh = () => {
    const key = `${baseURL}|${qs}`;
    prevKey.current = ""; // Reset to force fresh fetch
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = await AsyncStorage.getItem("token") || "";
        let url = `${baseURL}/api/receipts`;
        if (qs) {
          url += `?${qs}`;
        }

        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const json = await response.json();
        
        let arr = [];
        if (Array.isArray(json)) {
          arr = json;
        } else if (json && Array.isArray(json.receipts)) {
          arr = json.receipts;
        } else if (json && Array.isArray(json.entries)) {
          arr = json.entries;
        } else if (json && Array.isArray(json.data)) {
          arr = json.data;
        }

        setReceipts(arr);
      } catch (err) {
        console.error("Error refreshing receipts:", err);
        setError(err.message || "Failed to refresh receipts");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  };

  return { receipts, loading, error, refresh };
}