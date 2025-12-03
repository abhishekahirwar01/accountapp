import React from "react";
import { View } from "react-native";

const Separator = React.forwardRef((props, ref) => {
  const {
    className,
    orientation = "horizontal",
    decorative = true,
    style,
    ...restProps
  } = props;

  // Convert Tailwind-like classes to React Native styles
  const getStyles = () => {
    const baseStyle = {
      backgroundColor: "#e5e7eb", // equivalent to bg-border color
    };

    const orientationStyle = orientation === "horizontal" 
      ? { height: 1, width: "100%" }
      : { height: "100%", width: 1 };

    // Handle className prop if provided (for compatibility)
    let customStyle = {};
    if (className) {
      // You can parse className string here if needed
      // For now, we'll accept style object directly
      if (typeof className === "object") {
        customStyle = className;
      }
    }

    return [baseStyle, orientationStyle, style, customStyle];
  };

  return (
    <View
      ref={ref}
      style={getStyles()}
      {...restProps}
    />
  );
});

Separator.displayName = "Separator";

export { Separator };