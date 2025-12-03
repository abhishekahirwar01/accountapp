// utils/dateUtils.js

/**
 * Date utility functions for P&L component
 */

/**
 * Get default date range (last 30 days)
 */
export const getDefaultDateRange = () => {
  const today = new Date();
  const lastMonth = new Date();
  lastMonth.setDate(today.getDate() - 30);

  const formatDate = (date) => date.toISOString().split("T")[0];

  return {
    from: formatDate(lastMonth),
    to: formatDate(today),
  };
};

/**
 * Get min/max dates for input constraints
 */
export const getMinMaxDates = () => {
  const today = new Date();
  const minDate = new Date("2000-01-01");

  return {
    minDate: minDate.toISOString().split("T")[0],
    maxDate: today.toISOString().split("T")[0],
    today: today.toISOString().split("T")[0],
  };
};

/**
 * Validate date range
 */
export const validateDateRange = (from, to) => {
  if (!from || !to) {
    return "Both from and to dates are required";
  }

  const fromDate = new Date(from);
  const toDate = new Date(to);

  if (fromDate > toDate) {
    return "From date cannot be after to date";
  }

  return null;
};

/**
 * Format date for display
 */
export const formatDateForDisplay = (dateString) => {
  if (!dateString) return "";
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";
  
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/**
 * Format date for input (YYYY-MM-DD)
 */
export const formatDateForInput = (date) => {
  if (!date) return "";
  
  if (date instanceof Date) {
    return date.toISOString().split("T")[0];
  }
  
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().split("T")[0];
  } catch (error) {
    return "";
  }
};

/**
 * Check if date is within range
 */
export const isDateInRange = (date, from, to) => {
  if (!date || !from || !to) return false;
  
  const checkDate = new Date(date);
  const fromDate = new Date(from);
  const toDate = new Date(to);
  
  if (isNaN(checkDate.getTime()) || isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    return false;
  }
  
  return checkDate >= fromDate && checkDate <= toDate;
};

/**
 * Get start and end of month
 */
export const getMonthRange = (dateString) => {
  const date = new Date(dateString || new Date());
  
  const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  
  return {
    from: startOfMonth.toISOString().split("T")[0],
    to: endOfMonth.toISOString().split("T")[0],
  };
};

/**
 * Get start and end of quarter
 */
export const getQuarterRange = (dateString) => {
  const date = new Date(dateString || new Date());
  const quarter = Math.floor(date.getMonth() / 3);
  
  const startOfQuarter = new Date(date.getFullYear(), quarter * 3, 1);
  const endOfQuarter = new Date(date.getFullYear(), (quarter + 1) * 3, 0);
  
  return {
    from: startOfQuarter.toISOString().split("T")[0],
    to: endOfQuarter.toISOString().split("T")[0],
  };
};

/**
 * Get start and end of year
 */
export const getYearRange = (dateString) => {
  const date = new Date(dateString || new Date());
  
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const endOfYear = new Date(date.getFullYear(), 11, 31);
  
  return {
    from: startOfYear.toISOString().split("T")[0],
    to: endOfYear.toISOString().split("T")[0],
  };
};

/**
 * Get yesterday's date
 */
export const getYesterday = () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split("T")[0];
};

/**
 * Get last week range
 */
export const getLastWeekRange = () => {
  const today = new Date();
  const lastWeekStart = new Date();
  lastWeekStart.setDate(today.getDate() - 7);
  
  return {
    from: lastWeekStart.toISOString().split("T")[0],
    to: today.toISOString().split("T")[0],
  };
};

/**
 * Get last month range
 */
export const getLastMonthRange = () => {
  const today = new Date();
  const lastMonthStart = new Date();
  lastMonthStart.setMonth(today.getMonth() - 1);
  lastMonthStart.setDate(1);
  
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
  
  return {
    from: lastMonthStart.toISOString().split("T")[0],
    to: lastMonthEnd.toISOString().split("T")[0],
  };
};

/**
 * Get date difference in days
 */
export const getDateDifference = (date1, date2) => {
  if (!date1 || !date2) return 0;
  
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 0;
  
  const diffTime = Math.abs(d2 - d1);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

/**
 * Generate array of dates between two dates
 */
export const getDatesBetween = (startDate, endDate) => {
  if (!startDate || !endDate) return [];
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return [];
  
  const dates = [];
  const currentDate = new Date(start);
  
  while (currentDate <= end) {
    dates.push(new Date(currentDate).toISOString().split("T")[0]);
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return dates;
};

/**
 * Get financial year range (April 1 to March 31)
 */
export const getFinancialYearRange = (dateString) => {
  const date = new Date(dateString || new Date());
  let financialYearStart, financialYearEnd;
  
  if (date.getMonth() >= 3) { // April (3) to December (11)
    financialYearStart = new Date(date.getFullYear(), 3, 1); // April 1
    financialYearEnd = new Date(date.getFullYear() + 1, 2, 31); // March 31 next year
  } else { // January (0) to March (2)
    financialYearStart = new Date(date.getFullYear() - 1, 3, 1); // April 1 previous year
    financialYearEnd = new Date(date.getFullYear(), 2, 31); // March 31 current year
  }
  
  return {
    from: financialYearStart.toISOString().split("T")[0],
    to: financialYearEnd.toISOString().split("T")[0],
    label: `FY ${financialYearStart.getFullYear()}-${financialYearEnd.getFullYear().toString().slice(2)}`
  };
};

/**
 * Check if date is valid
 */
export const isValidDate = (dateString) => {
  if (!dateString) return false;
  
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && dateString === date.toISOString().split("T")[0];
};