import React from "react";
import { View, Text, StyleSheet } from "react-native";

// Simple utility to merge styles
const mergeStyles = (...styles) => {
  return StyleSheet.flatten(styles.filter(Boolean));
};

// Main Card component
const Card = React.forwardRef(({ style, children, ...props }, ref) => {
  return (
    <View
      ref={ref}
      style={mergeStyles(styles.card, style)}
      {...props}
    >
      {children}
    </View>
  );
});
Card.displayName = "Card";

// Card Header
const CardHeader = React.forwardRef(({ style, children, ...props }, ref) => {
  return (
    <View
      ref={ref}
      style={mergeStyles(styles.cardHeader, style)}
      {...props}
    >
      {children}
    </View>
  );
});
CardHeader.displayName = "CardHeader";

// Card Title
const CardTitle = React.forwardRef(({ style, children, ...props }, ref) => {
  return (
    <View
      ref={ref}
      style={mergeStyles(styles.cardTitle, style)}
      {...props}
    >
      {typeof children === 'string' ? (
        <Text style={styles.cardTitleText}>{children}</Text>
      ) : (
        children
      )}
    </View>
  );
});
CardTitle.displayName = "CardTitle";

// Card Description
const CardDescription = React.forwardRef(({ style, children, ...props }, ref) => {
  return (
    <View
      ref={ref}
      style={mergeStyles(styles.cardDescription, style)}
      {...props}
    >
      {typeof children === 'string' ? (
        <Text style={styles.cardDescriptionText}>{children}</Text>
      ) : (
        children
      )}
    </View>
  );
});
CardDescription.displayName = "CardDescription";

// Card Content
const CardContent = React.forwardRef(({ style, children, ...props }, ref) => {
  return (
    <View
      ref={ref}
      style={mergeStyles(styles.cardContent, style)}
      {...props}
    >
      {children}
    </View>
  );
});
CardContent.displayName = "CardContent";

// Card Footer
const CardFooter = React.forwardRef(({ style, children, ...props }, ref) => {
  return (
    <View
      ref={ref}
      style={mergeStyles(styles.cardFooter, style)}
      {...props}
    >
      {children}
    </View>
  );
});
CardFooter.displayName = "CardFooter";

// Styles
const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    // borderWidth: 1,
    // borderColor: "#e5e7eb",
    // backgroundColor: "#ffffff",
    // shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    // shadowRadius: 2,
    // elevation: 2,
  },
  cardHeader: {
    flexDirection: "column",
    padding: 24,
    paddingBottom: 0,
  },
  cardTitle: {
    marginBottom: 4,
  },
  cardTitleText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    lineHeight: 24,
  },
  cardDescription: {
    marginTop: 4,
  },
  cardDescriptionText: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 20,
  },
  cardContent: {
    padding: 14,
    // paddingTop: 0,
    backgroundColor: "white",
    borderRadius: 20,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    padding: 24,
    paddingTop: 0,
  },
});

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };