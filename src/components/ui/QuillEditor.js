import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ScrollView,
} from 'react-native';
import {
  RichEditor,
  RichToolbar,
  actions,
} from 'react-native-pell-rich-editor';

// 1. Custom Action Keys (Removed, using direct actions now)
// 2. Font/Size Data
const FONT_SIZES_MAP = {
  // Mapping Quill-like names to HTML font sizes (1-7) for pell-rich-editor
  Small: '1',
  Normal: '3', // Default
  Large: '5',
  Huge: '7',
};
const FONT_SIZE_LABELS = Object.keys(FONT_SIZES_MAP);
const FONT_SIZE_DEFAULT_LABEL = 'Normal';

const FONT_FAMILIES = ['Arial', 'Georgia', 'Times New Roman', 'Verdana'];
const FONT_FAMILY_DEFAULT = 'Arial';

// Custom Toolbar Picker Component
const PickerButton = ({ label, onPress, isActive }) => (
  <TouchableOpacity
    onPress={onPress}
    style={[styles.pickerButton, isActive && styles.pickerButtonActive]}
  >
    <Text
      style={[
        styles.pickerButtonText,
        isActive && styles.pickerButtonTextActive,
      ]}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

const QuillEditor = ({
  value,
  onChange,
  placeholder = 'Enter your notes here...',
}) => {
  const richText = useRef(null);
  const [editorValue, setEditorValue] = useState(value);
  const [currentFontSize, setCurrentFontSize] = useState(
    FONT_SIZE_DEFAULT_LABEL,
  );
  const [currentFontFamily, setCurrentFontFamily] =
    useState(FONT_FAMILY_DEFAULT);
  const [isPickerVisible, setIsPickerVisible] = useState(null); // 'size' or 'family'

  // Function to apply Font Size
  const applyFontSize = useCallback(label => {
    const size = FONT_SIZES_MAP[label];
    if (size) {
      richText.current?.sendAction(actions.fontSize, 'result', size);
      setCurrentFontSize(label);
    }
    setIsPickerVisible(null);
  }, []);

  // Function to apply Font Family
  const applyFontFamily = useCallback(family => {
    richText.current?.sendAction(actions.fontName, 'result', family);
    setCurrentFontFamily(family);
    setIsPickerVisible(null);
  }, []);

  // Sync editor when parent value changes
  useEffect(() => {
    if (value !== editorValue) {
      setEditorValue(value);
      if (richText.current) {
        // Only set content if the editor is ready and value has changed externally
        richText.current.setContentHTML(value);
      }
    }
  }, [value]);

  const handleContentChange = htmlContent => {
    setEditorValue(htmlContent);
    onChange(htmlContent);
  };

  const toolbarActions = [
    actions.setBold,
    actions.setItalic,
    actions.setUnderline,
    actions.setStrikethrough,
    actions.heading1,
    actions.heading2,
    actions.heading3,
    actions.insertBulletsList,
    actions.insertOrderedList,
    actions.alignLeft,
    actions.alignCenter,
    actions.alignRight,
    actions.removeFormat,
  ];

  const handleEditorFocus = () => {
    setIsPickerVisible(null); // Hide pickers when editing starts
  };

  // Render Font/Size Picker
  const renderPicker = () => {
    if (isPickerVisible === 'size') {
      return (
        <ScrollView horizontal style={styles.pickerContainer}>
          {FONT_SIZE_LABELS.map(label => (
            <PickerButton
              key={label}
              label={label}
              onPress={() => applyFontSize(label)}
              isActive={currentFontSize === label}
            />
          ))}
        </ScrollView>
      );
    }
    if (isPickerVisible === 'family') {
      return (
        <ScrollView horizontal style={styles.pickerContainer}>
          {FONT_FAMILIES.map(family => (
            <PickerButton
              key={family}
              label={family}
              onPress={() => applyFontFamily(family)}
              isActive={currentFontFamily === family}
            />
          ))}
        </ScrollView>
      );
    }
    return null;
  };

  return (
    <View style={styles.container}>
      {/* Custom Header Toolbar */}
      <View style={styles.customToolbar}>
        {/* Size Dropdown */}
        <TouchableOpacity
          onPress={() =>
            setIsPickerVisible(isPickerVisible === 'size' ? null : 'size')
          }
          style={styles.pickerDropdown}
        >
          <Text style={styles.dropdownText}>{currentFontSize} ▾</Text>
        </TouchableOpacity>

        {/* Family Dropdown */}
        <TouchableOpacity
          onPress={() =>
            setIsPickerVisible(isPickerVisible === 'family' ? null : 'family')
          }
          style={styles.pickerDropdown}
        >
          <Text style={styles.dropdownText}>
            {currentFontFamily.slice(0, 5)}... ▾
          </Text>
        </TouchableOpacity>

        {/* Separator */}
        <View style={styles.separator} />
      </View>

      {/* Font/Size Selection UI */}
      {renderPicker()}

      {/* Rich Toolbar (Main actions) */}
      <RichToolbar
        editor={richText}
        actions={toolbarActions}
        style={styles.richToolbar}
        iconTint="#333"
      />

      {/* Rich Editor */}
      <RichEditor
        ref={richText}
        initialContentHTML={editorValue}
        placeholder={placeholder}
        onChange={handleContentChange}
        onFocus={handleEditorFocus}
        style={styles.editor}
        editorStyle={styles.editorContent}
        initialHeight={200} // Ensure enough space
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    margin: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  // --- Custom Toolbar Styles ---
  customToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#f9f9f9',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  richToolbar: {
    backgroundColor: '#f9f9f9',
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  pickerDropdown: {
    padding: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    marginRight: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  dropdownText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  separator: {
    width: 1,
    height: '80%',
    backgroundColor: '#ddd',
    marginHorizontal: 10,
  },
  // --- Picker Menu Styles ---
  pickerContainer: {
    flexDirection: 'row',
    padding: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  pickerButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 8,
    borderRadius: 4,
    backgroundColor: '#eee',
  },
  pickerButtonActive: {
    backgroundColor: '#007aff',
  },
  pickerButtonText: {
    color: '#333',
    fontSize: 14,
  },
  pickerButtonTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  // --- Editor Styles ---
  editor: {
    flex: 1,
    minHeight: 120,
    backgroundColor: '#fff',
  },
  editorContent: {
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
});

export default QuillEditor;
