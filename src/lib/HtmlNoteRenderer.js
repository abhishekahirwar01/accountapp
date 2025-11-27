// HtmlNoteRenderer.js
import React from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import RenderHtml from 'react-native-render-html';

// ACTUAL LIBERATION FONTS MAPPING - Your downloaded fonts
const getLiberationFont = (
  baseFont = 'LiberationSans-Regular',
  bold = false,
  italic = false,
) => {
  // Liberation Fonts Mapping - EXACT font file names
  const liberationFontMap = {
    // Times Roman equivalent - Liberation Serif
    'Times-Roman': {
      normal: 'LiberationSerif-Regular',
      bold: 'LiberationSerif-Bold',
      italic: 'LiberationSerif-Italic',
      boldItalic: 'LiberationSerif-BoldItalic',
    },
    // Helvetica equivalent - Liberation Sans
    Helvetica: {
      normal: 'LiberationSans-Regular',
      bold: 'LiberationSans-Bold',
      italic: 'LiberationSans-Italic',
      boldItalic: 'LiberationSans-BoldItalic',
    },
    // Courier equivalent - Liberation Mono
    Courier: {
      normal: 'LiberationMono-Regular',
      bold: 'LiberationMono-Bold',
      italic: 'LiberationMono-Italic',
      boldItalic: 'LiberationMono-BoldItalic',
    },
    // Default to Liberation Sans
    System: {
      normal: 'LiberationSans-Regular',
      bold: 'LiberationSans-Bold',
      italic: 'LiberationSans-Italic',
      boldItalic: 'LiberationSans-BoldItalic',
    },
  };

  const family = liberationFontMap[baseFont] || liberationFontMap['System'];

  if (bold && italic) return family.boldItalic;
  if (bold) return family.bold;
  if (italic) return family.italic;
  return family.normal;
};

// Enhanced font mapping with ACTUAL Liberation fonts
const getMappedFontFamily = (fontFamily, bold = false, italic = false) => {
  if (!fontFamily) {
    return getLiberationFont('Helvetica', bold, italic);
  }

  const familyLower = fontFamily.toLowerCase();

  // Map to actual Liberation fonts
  if (familyLower.includes('serif') && !familyLower.includes('sans')) {
    return getLiberationFont('Times-Roman', bold, italic);
  } else if (familyLower.includes('mono') || familyLower.includes('courier')) {
    return getLiberationFont('Courier', bold, italic);
  } else if (
    familyLower.includes('helvetica') ||
    familyLower.includes('arial') ||
    familyLower.includes('sans')
  ) {
    return getLiberationFont('Helvetica', bold, italic);
  }

  return getLiberationFont('Helvetica', bold, italic);
};

// Helper functions - TypeScript version जैसे ही
const parseFontSize = (styleString, defaultSize = 12, parentFontSize) => {
  const sizeMatch = styleString.match(
    /font-size:\s*(\d+(?:\.\d+)?)(px|pt|em|rem)?/,
  );
  if (sizeMatch) {
    const size = parseFloat(sizeMatch[1]);
    const unit = sizeMatch[2];

    if (!unit || unit === 'px') {
      return size;
    } else if (unit === 'pt') {
      return size * 1.33; // Convert pt to px
    } else if (unit === 'em') {
      return (parentFontSize || defaultSize) * size;
    } else if (unit === 'rem') {
      return 16 * size; // rem based on 16px default
    }
  }

  // Check for Quill size classes - TypeScript version जैसे values
  if (styleString.includes('ql-size-small')) return defaultSize * 0.85;
  if (styleString.includes('ql-size-large')) return defaultSize * 1.25;
  if (styleString.includes('ql-size-huge')) return defaultSize * 1.5;

  return defaultSize;
};

// Enhanced color parsing (RGB support)
const parseColor = (styleString, type = 'color') => {
  const match = styleString.match(
    new RegExp(`${type}:\\s*rgb\\((\\d+),\\s*(\\d+),\\s*(\\d+)\\)`),
  );
  if (match) {
    return `rgb(${match[1]}, ${match[2]}, ${match[3]})`;
  }
  return null;
};

// Build text decorations like web version
const buildTextDecoration = (underline, strikethrough) => {
  const decorations = [];
  if (underline) decorations.push('underline');
  if (strikethrough) decorations.push('line-through');
  return decorations.length > 0 ? decorations.join(' ') : 'none';
};

export const HtmlNoteRenderer = ({
  html,
  fontSize = 12,
  style,
  baseStyle,
  onLinkPress,
}) => {
  const { width: contentWidth } = useWindowDimensions();

  // Custom styling for HTML elements - WITH ACTUAL LIBERATION FONTS
  const tagsStyles = {
    body: {
      fontSize,
      lineHeight: fontSize * 1.4,
      color: '#000000',
      fontFamily: 'LiberationSans-Regular',
    },
    p: {
      fontSize,
      marginTop: 4,
      marginBottom: 4,
      lineHeight: fontSize * 1.4,
      textAlign: 'left',
      fontFamily: 'LiberationSans-Regular',
    },
    h1: {
      fontSize: fontSize + 8,
      fontWeight: 'bold',
      marginTop: 12,
      marginBottom: 6,
      lineHeight: (fontSize + 8) * 1.4,
      fontFamily: 'LiberationSans-Bold',
    },
    h2: {
      fontSize: fontSize + 6,
      fontWeight: 'bold',
      marginTop: 10,
      marginBottom: 5,
      lineHeight: (fontSize + 6) * 1.4,
      fontFamily: 'LiberationSans-Bold',
    },
    h3: {
      fontSize: fontSize + 4,
      fontWeight: 'bold',
      marginTop: 8,
      marginBottom: 4,
      lineHeight: (fontSize + 4) * 1.4,
      fontFamily: 'LiberationSans-Bold',
    },
    ul: {
      marginTop: 6,
      marginBottom: 6,
      paddingLeft: 20,
    },
    ol: {
      marginTop: 6,
      marginBottom: 6,
      paddingLeft: 20,
    },
    li: {
      fontSize,
      marginBottom: 4,
      lineHeight: fontSize * 1.4,
      fontFamily: 'LiberationSans-Regular',
    },
    strong: {
      fontWeight: 'bold',
      fontFamily: 'LiberationSans-Bold',
    },
    b: {
      fontWeight: 'bold',
      fontFamily: 'LiberationSans-Bold',
    },
    em: {
      fontStyle: 'italic',
      fontFamily: 'LiberationSans-Italic',
    },
    i: {
      fontStyle: 'italic',
      fontFamily: 'LiberationSans-Italic',
    },
    u: {
      textDecorationLine: 'underline',
    },
    s: {
      textDecorationLine: 'line-through',
    },
    strike: {
      textDecorationLine: 'line-through',
    },
    del: {
      textDecorationLine: 'line-through',
    },
    // Quill.js specific classes
    '.ql-size-small': {
      fontSize: fontSize * 0.85,
    },
    '.ql-size-large': {
      fontSize: fontSize * 1.25,
    },
    '.ql-size-huge': {
      fontSize: fontSize * 1.5,
    },
    '.ql-align-center': {
      textAlign: 'center',
    },
    '.ql-align-right': {
      textAlign: 'right',
    },
    '.ql-align-justify': {
      textAlign: 'justify',
    },
  };

  // ENHANCED recursive content renderer with ACTUAL LIBERATION FONTS
  const renderNodeContent = (tnode, inheritedStyles = {}) => {
    if (!tnode.children || tnode.children.length === 0) {
      return tnode.content || '';
    }

    return tnode.children.map((child, index) => {
      if (child.type === 'text') {
        return (
          <Text key={index} style={inheritedStyles}>
            {child.content}
          </Text>
        );
      }

      // Track formatting state
      let isBold = inheritedStyles.fontWeight === 'bold';
      let isItalic = inheritedStyles.fontStyle === 'italic';
      let isUnderline =
        inheritedStyles.textDecorationLine?.includes('underline');
      let isStrikethrough =
        inheritedStyles.textDecorationLine?.includes('line-through');
      let currentFontFamily = inheritedStyles.fontFamily;

      // Apply tag-based formatting
      if (child.name === 'strong' || child.name === 'b') {
        isBold = true;
      } else if (child.name === 'em' || child.name === 'i') {
        isItalic = true;
      } else if (child.name === 'u') {
        isUnderline = true;
      } else if (
        child.name === 's' ||
        child.name === 'strike' ||
        child.name === 'del'
      ) {
        isStrikethrough = true;
      }

      // Build child style with ACTUAL LIBERATION FONTS logic
      let childStyle = { ...inheritedStyles };

      // Apply formatting to style
      if (isBold) childStyle.fontWeight = 'bold';
      if (isItalic) childStyle.fontStyle = 'italic';

      // CRITICAL: Apply Liberation fonts combination logic
      childStyle.fontFamily = getMappedFontFamily(
        currentFontFamily,
        isBold,
        isItalic,
      );

      // Enhanced text decoration combinations
      if (isUnderline || isStrikethrough) {
        childStyle.textDecorationLine = buildTextDecoration(
          isUnderline,
          isStrikethrough,
        );
      }

      // Enhanced inline style parsing with font family support
      if (child.domNode) {
        const inlineStyle = child.domNode.getAttribute('style') || '';

        if (inlineStyle) {
          // Parse font size with inheritance
          const fontSizeFromStyle = parseFontSize(
            inlineStyle,
            childStyle.fontSize || fontSize,
            childStyle.fontSize || fontSize,
          );
          if (fontSizeFromStyle !== fontSize) {
            childStyle.fontSize = fontSizeFromStyle;
          }

          // Parse colors
          const color = parseColor(inlineStyle, 'color');
          if (color) {
            childStyle.color = color;
          }

          // Parse background color with padding
          const backgroundColor = parseColor(inlineStyle, 'background-color');
          if (backgroundColor && backgroundColor !== 'transparent') {
            childStyle.backgroundColor = backgroundColor;
            childStyle.paddingHorizontal = 2;
            childStyle.paddingVertical = 1;
          }

          // Parse font family from inline style
          const fontFamilyMatch = inlineStyle.match(
            /font-family:\s*["']?([^;"']+)["']?/,
          );
          if (fontFamilyMatch) {
            const newFontFamily = fontFamilyMatch[1];
            // RE-APPLY Liberation fonts logic with new font family
            childStyle.fontFamily = getMappedFontFamily(
              newFontFamily,
              isBold,
              isItalic,
            );
          }
        }

        // Handle Quill classes
        const classNames = child.domNode.className || '';
        if (classNames.includes('ql-size-small')) {
          childStyle.fontSize = fontSize * 0.85;
        } else if (classNames.includes('ql-size-large')) {
          childStyle.fontSize = fontSize * 1.25;
        } else if (classNames.includes('ql-size-huge')) {
          childStyle.fontSize = fontSize * 1.5;
        }
      }

      return (
        <Text key={index} style={childStyle}>
          {renderNodeContent(child, childStyle)}
        </Text>
      );
    });
  };

  // Advanced list rendering with data-list attribute support
  const renderListItem = ({ tnode, style, key }) => {
    const element = tnode.domNode;

    // CRITICAL: Quill's data-list attribute detection
    const dataListAttr = element?.getAttribute('data-list');
    let isOrdered = false;
    let listNumber;

    // Priority 1: data-list attribute
    if (dataListAttr === 'ordered') {
      isOrdered = true;
    } else if (dataListAttr === 'bullet') {
      isOrdered = false;
    }
    // Priority 2: Parent element type
    else if (tnode.parent?.name === 'ol') {
      isOrdered = true;
    } else if (tnode.parent?.name === 'ul') {
      isOrdered = false;
    }
    // Priority 3: Default to unordered
    else {
      isOrdered = false;
    }

    // Calculate list number for ordered lists
    if (isOrdered && tnode.parent) {
      const siblings = tnode.parent.children || [];
      const currentIndex = siblings.indexOf(tnode);
      listNumber = currentIndex + 1;
    }

    const prefix = isOrdered ? `${listNumber}. ` : '• ';

    return (
      <View
        key={key}
        style={{ flexDirection: 'row', marginBottom: 4, marginLeft: 10 }}
      >
        <Text style={[style, { marginRight: 8, fontWeight: 'normal' }]}>
          {prefix}
        </Text>
        <Text style={[style, { flex: 1 }]}>{renderNodeContent(tnode)}</Text>
      </View>
    );
  };

  // Advanced span rendering with all formatting
  const renderSpan = ({ tnode, style, key }) => {
    const element = tnode.domNode;
    let customStyle = { ...style };

    // Track formatting state
    let isBold = style.fontWeight === 'bold';
    let isItalic = style.fontStyle === 'italic';

    // Handle Quill size classes
    const classNames = element?.className || '';
    if (classNames.includes('ql-size-small')) {
      customStyle.fontSize = fontSize * 0.85;
    } else if (classNames.includes('ql-size-large')) {
      customStyle.fontSize = fontSize * 1.25;
    } else if (classNames.includes('ql-size-huge')) {
      customStyle.fontSize = fontSize * 1.5;
    }

    // Handle inline styles
    const inlineStyle = element?.getAttribute('style') || '';
    if (inlineStyle) {
      // Parse color
      const colorMatch = inlineStyle.match(
        /color:\s*rgb\((\d+),\s*(\d+),\s*(\d+)\)/,
      );
      if (colorMatch) {
        customStyle.color = `rgb(${colorMatch[1]}, ${colorMatch[2]}, ${colorMatch[3]})`;
      }

      // Parse background color
      const bgMatch = inlineStyle.match(
        /background-color:\s*rgb\((\d+),\s*(\d+),\s*(\d+)\)/,
      );
      if (bgMatch) {
        customStyle.backgroundColor = `rgb(${bgMatch[1]}, ${bgMatch[2]}, ${bgMatch[3]})`;
        customStyle.paddingHorizontal = 2;
        customStyle.paddingVertical = 1;
      }

      // Parse font size with parent inheritance
      const fontSizeMatch = inlineStyle.match(
        /font-size:\s*(\d+(?:\.\d+)?)(px|pt|em|rem)?/,
      );
      if (fontSizeMatch) {
        const size = parseFloat(fontSizeMatch[1]);
        const unit = fontSizeMatch[2];

        if (!unit || unit === 'px') {
          customStyle.fontSize = size;
        } else if (unit === 'pt') {
          customStyle.fontSize = size * 1.33;
        } else if (unit === 'em') {
          customStyle.fontSize = fontSize * size;
        } else if (unit === 'rem') {
          customStyle.fontSize = 16 * size;
        }
      }

      // Parse font family
      const fontFamilyMatch = inlineStyle.match(
        /font-family:\s*["']?([^;"']+)["']?/,
      );
      if (fontFamilyMatch) {
        const fontFamily = fontFamilyMatch[1];
        customStyle.fontFamily = getMappedFontFamily(
          fontFamily,
          isBold,
          isItalic,
        );
      }
    }

    // FINAL: Apply Liberation fonts combination logic
    if (!customStyle.fontFamily) {
      customStyle.fontFamily = getMappedFontFamily(null, isBold, isItalic);
    }

    return (
      <Text key={key} style={customStyle}>
        {tnode.content}
      </Text>
    );
  };

  // Advanced paragraph rendering
  const renderParagraph = ({ tnode, style, key }) => {
    const element = tnode.domNode;
    const classNames = element?.className || '';

    let alignment = 'left';
    let customStyle = { ...style };

    // Handle alignment
    if (classNames.includes('ql-align-center')) {
      alignment = 'center';
    } else if (classNames.includes('ql-align-right')) {
      alignment = 'right';
    } else if (classNames.includes('ql-align-justify')) {
      alignment = 'justify';
    }

    // Handle Quill size classes on paragraph
    if (classNames.includes('ql-size-small')) {
      customStyle.fontSize = fontSize * 0.85;
    } else if (classNames.includes('ql-size-large')) {
      customStyle.fontSize = fontSize * 1.25;
    } else if (classNames.includes('ql-size-huge')) {
      customStyle.fontSize = fontSize * 1.5;
    }

    // Handle inline styles on paragraph
    const inlineStyle = element?.getAttribute('style') || '';
    if (inlineStyle) {
      const fontSizeFromStyle = parseFontSize(
        inlineStyle,
        customStyle.fontSize || fontSize,
      );
      if (fontSizeFromStyle !== fontSize) {
        customStyle.fontSize = fontSizeFromStyle;
      }
    }

    return (
      <View
        key={key}
        style={{
          alignItems:
            alignment === 'center'
              ? 'center'
              : alignment === 'right'
              ? 'flex-end'
              : 'flex-start',
          width: '100%',
          marginBottom: 4,
        }}
      >
        <Text style={[customStyle, { textAlign: alignment }]}>
          {renderNodeContent(tnode)}
        </Text>
      </View>
    );
  };

  // Heading renderers with level support
  const renderHeading = (tnode, style, key, level, baseFontSize) => {
    const element = tnode.domNode;
    const classNames = element?.className || '';

    let alignment = 'left';
    let customStyle = { ...style };

    // Calculate font size
    customStyle.fontSize = baseFontSize + (8 - level * 2);
    customStyle.fontWeight = 'bold';
    customStyle.fontFamily = 'LiberationSans-Bold';

    // Handle alignment
    if (classNames.includes('ql-align-center')) {
      alignment = 'center';
    } else if (classNames.includes('ql-align-right')) {
      alignment = 'right';
    } else if (classNames.includes('ql-align-justify')) {
      alignment = 'justify';
    }

    return (
      <View
        key={key}
        style={{
          alignItems:
            alignment === 'center'
              ? 'center'
              : alignment === 'right'
              ? 'flex-end'
              : 'flex-start',
          width: '100%',
          marginTop: 8,
          marginBottom: 4,
        }}
      >
        <Text style={[customStyle, { textAlign: alignment }]}>
          {renderNodeContent(tnode)}
        </Text>
      </View>
    );
  };

  // Renderers object
  const renderers = {
    li: renderListItem,
    span: renderSpan,
    p: renderParagraph,
    h1: ({ tnode, style, key }) =>
      renderHeading(tnode, style, key, 1, fontSize),
    h2: ({ tnode, style, key }) =>
      renderHeading(tnode, style, key, 2, fontSize),
    h3: ({ tnode, style, key }) =>
      renderHeading(tnode, style, key, 3, fontSize),
  };

  // ALL LIBERATION FONTS for systemFonts
  const systemFonts = [
    // Liberation Serif Family
    'LiberationSerif-Regular',
    'LiberationSerif-Bold',
    'LiberationSerif-Italic',
    'LiberationSerif-BoldItalic',
    // Liberation Sans Family
    'LiberationSans-Regular',
    'LiberationSans-Bold',
    'LiberationSans-Italic',
    'LiberationSans-BoldItalic',
    // Liberation Mono Family
    'LiberationMono-Regular',
    'LiberationMono-Bold',
    'LiberationMono-Italic',
    'LiberationMono-BoldItalic',
  ];

  return (
    <View style={style}>
      <RenderHtml
        contentWidth={contentWidth - 40}
        source={{ html }}
        tagsStyles={tagsStyles}
        renderers={renderers}
        baseStyle={baseStyle}
        onLinkPress={onLinkPress}
        enableExperimentalMarginCollapsing={true}
        systemFonts={systemFonts}
      />
    </View>
  );
};

export default HtmlNoteRenderer;
