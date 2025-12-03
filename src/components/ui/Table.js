import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";

// Simple utility to merge styles (alternative to cn())
const mergeStyles = (...styles) => {
  return StyleSheet.flatten(styles.filter(Boolean));
};

// Main Table container with scroll
const Table = React.forwardRef(({ style, children, ...props }, ref) => {
  return (
    <ScrollView 
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[styles.tableContainer, style]}
      {...props}
    >
      <View style={styles.table} ref={ref}>
        {children}
      </View>
    </ScrollView>
  );
});
Table.displayName = "Table";

// Table header section
const TableHeader = React.forwardRef(({ style, children, ...props }, ref) => {
  return (
    <View style={[styles.tableHeader, style]} ref={ref} {...props}>
      {children}
    </View>
  );
});
TableHeader.displayName = "TableHeader";

// Table body section
const TableBody = React.forwardRef(({ style, children, ...props }, ref) => {
  return (
    <View style={[styles.tableBody, style]} ref={ref} {...props}>
      {children}
    </View>
  );
});
TableBody.displayName = "TableBody";

// Table footer section
const TableFooter = React.forwardRef(({ style, children, ...props }, ref) => {
  return (
    <View style={[styles.tableFooter, style]} ref={ref} {...props}>
      {children}
    </View>
  );
});
TableFooter.displayName = "TableFooter";

// Table row
const TableRow = React.forwardRef(({ style, children, ...props }, ref) => {
  return (
    <View style={[styles.tableRow, style]} ref={ref} {...props}>
      {children}
    </View>
  );
});
TableRow.displayName = "TableRow";

// Table header cell
const TableHead = React.forwardRef(({ style, children, ...props }, ref) => {
  return (
    <View style={[styles.tableHead, style]} ref={ref} {...props}>
      <Text style={styles.tableHeadText}>{children}</Text>
    </View>
  );
});
TableHead.displayName = "TableHead";

// Table data cell
const TableCell = React.forwardRef(({ style, children, ...props }, ref) => {
  return (
    <View style={[styles.tableCell, style]} ref={ref} {...props}>
      {typeof children === 'string' ? (
        <Text style={styles.tableCellText}>{children}</Text>
      ) : (
        children
      )}
    </View>
  );
});
TableCell.displayName = "TableCell";

// Table caption
const TableCaption = React.forwardRef(({ style, children, ...props }, ref) => {
  return (
    <View style={[styles.tableCaption, style]} ref={ref} {...props}>
      <Text style={styles.tableCaptionText}>{children}</Text>
    </View>
  );
});
TableCaption.displayName = "TableCaption";

// Styles
const styles = StyleSheet.create({
  tableContainer: {
    width: "100%",
  },
  table: {
    width: "100%",
    minWidth: 300, // Minimum width for horizontal scrolling
  },
  tableHeader: {
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  tableBody: {
    // No specific styles needed for body container
  },
  tableFooter: {
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    backgroundColor: "rgba(243, 244, 246, 0.5)",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    minHeight: 48,
    alignItems: "center",
  },
  tableHead: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: "center",
  },
  tableHeadText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6b7280",
    textAlign: "left",
  },
  tableCell: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: "center",
  },
  tableCellText: {
    fontSize: 14,
    color: "#1f2937",
  },
  tableCaption: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  tableCaptionText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },
});

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};