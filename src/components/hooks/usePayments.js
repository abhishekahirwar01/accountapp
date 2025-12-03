import { useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export function usePayments(baseURL, opts) {
  const [payments, setPayments] = useState([]);
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
    const fetchPayments = async () => {
      const key = `${baseURL}|${qs}`;
      if (prevKey.current && prevKey.current !== key) {
        setPayments([]);
      }
      prevKey.current = key;

      setLoading(true);
      setError(null);

      try {
        const token = await AsyncStorage.getItem("token") || "";
        let url = `${baseURL}/api/payments`;
        if (qs) {
          url += `?${qs}`;
        }

        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const json = await response.json();
        
        let arr = [];
        if (Array.isArray(json)) {
          arr = json;
        } else if (json && Array.isArray(json.payments)) {
          arr = json.payments;
        } else if (json && Array.isArray(json.entries)) {
          arr = json.entries;
        } else if (json && Array.isArray(json.data)) {
          arr = json.data;
        } else if (json && typeof json === "object") {
          const keys = Object.keys(json);
          for (const key of keys) {
            if (Array.isArray(json[key])) {
              arr = json[key];
              break;
            }
          }
        }

        setPayments(arr);
      } catch (err) {
        console.error("Error fetching payments:", err);
        setError(err.message || "Failed to fetch payments");
        setPayments([]);
        
        Alert.alert(
          "Error",
          "Failed to load payments. Please check your connection and try again.",
          [{ text: "OK" }]
        );
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();

    return () => {
      // Cleanup if needed
    };
  }, [baseURL, qs]);

  const refresh = () => {
    const key = `${baseURL}|${qs}`;
    prevKey.current = "";
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = await AsyncStorage.getItem("token") || "";
        let url = `${baseURL}/api/payments`;
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
        } else if (json && Array.isArray(json.payments)) {
          arr = json.payments;
        } else if (json && Array.isArray(json.entries)) {
          arr = json.entries;
        } else if (json && Array.isArray(json.data)) {
          arr = json.data;
        }

        setPayments(arr);
      } catch (err) {
        console.error("Error refreshing payments:", err);
        setError(err.message || "Failed to refresh payments");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  };

  return { payments, loading, error, refresh };
}