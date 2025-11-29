import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ScrollView,
  Modal,
  TextInput,
  Platform,
  Pressable,
} from 'react-native';
import {
  RichEditor,
  RichToolbar,
  actions,
} from 'react-native-pell-rich-editor';

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
  style = {},
}) => {
  const richText = useRef(null);
  const [editorValue, setEditorValue] = useState(value);
  const [currentFontSize, setCurrentFontSize] = useState(
    FONT_SIZE_DEFAULT_LABEL,
  );
  const [currentFontFamily, setCurrentFontFamily] =
    useState(FONT_FAMILY_DEFAULT);
  const [isPickerVisible, setIsPickerVisible] = useState(null); // 'size' or 'family'
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(null); // 'fore'|'back'|null
  const [defaultEditorCss, setDefaultEditorCss] = useState('');

  // 🔄 UNDO/REDO STATE MANAGEMENT (Manual Tracking)
  const history = useRef([]);
  const historyIndex = useRef(-1);
  const isRestoring = useRef(false); // Flag to prevent history updates during undo/redo

  // Function to apply Font Size
  const applyFontSize = useCallback(
    label => {
      const size = FONT_SIZES_MAP[label];
      if (size) {
        // 1. Apply formatting to current selection/typing via direct Pell function
        richText.current?.setFontSize && richText.current.setFontSize(size);

        // 2. Fallback: set default editor CSS for subsequent typing (uses px value)
        const px =
          size === '1' ? 12 : size === '3' ? 16 : size === '5' ? 20 : 24;
        setDefaultEditorCss(prev => {
          const familyMatch = prev.match(/font-family:\s*([^;]+);?/);
          const family = familyMatch ? familyMatch[1] : currentFontFamily;
          return `font-size: ${px}px; font-family: ${family};`;
        });
        setCurrentFontSize(label);
      }
      setIsPickerVisible(null);
    },
    [currentFontFamily],
  );

  // Function to apply Font Family
  const applyFontFamily = useCallback(family => {
    // 1. Apply formatting to current selection/typing via direct Pell function
    richText.current?.setFontName && richText.current.setFontName(family);

    // 2. Fallback: set default editor CSS for subsequent typing
    setDefaultEditorCss(prev => {
      const sizeMatch = prev.match(/font-size:\s*([^;]+);?/);
      const size = sizeMatch ? sizeMatch[1] : '16px';
      return `font-family: ${family}; font-size: ${size};`;
    });
    setCurrentFontFamily(family);
    setIsPickerVisible(null);
  }, []);

  // Insert link
  const handleInsertLink = useCallback(() => {
    if (!linkUrl) return;
    try {
      richText.current?.insertLink(linkUrl, linkTitle || linkUrl);
    } catch (e) {
      // no-op
    }
    setLinkUrl('');
    setLinkTitle('');
    setShowLinkModal(false);
  }, [linkUrl, linkTitle]);

  // Insert image by URL
  const handleInsertImage = useCallback(() => {
    if (!imageUrl) return;
    try {
      richText.current?.insertImage(imageUrl);
    } catch (e) {
      // no-op fallback
    }
    setImageUrl('');
    setShowImageModal(false);
  }, [imageUrl]);

  // ⚡ UPDATED: Manual Undo
  const handleUndo = useCallback(() => {
    if (historyIndex.current > 0) {
      isRestoring.current = true; // Set flag
      historyIndex.current -= 1;
      const previousContent = history.current[historyIndex.current];
      // Set content directly
      richText.current?.setContentHTML(previousContent);
      setEditorValue(previousContent); // Update local state
      onChange(previousContent); // Notify parent
    }
  }, [onChange]);

  // ⚡ UPDATED: Manual Redo
  const handleRedo = useCallback(() => {
    if (historyIndex.current < history.current.length - 1) {
      isRestoring.current = true; // Set flag
      historyIndex.current += 1;
      const nextContent = history.current[historyIndex.current];
      // Set content directly
      richText.current?.setContentHTML(nextContent);
      setEditorValue(nextContent); // Update local state
      onChange(nextContent); // Notify parent
    }
  }, [onChange]);

  const applyColor = color => {
    if (!color) return;
    if (showColorPicker === 'fore') {
      richText.current?.setForeColor
        ? richText.current.setForeColor(color)
        : richText.current?.sendAction &&
          richText.current.sendAction('foreColor', color);
    } else if (showColorPicker === 'back') {
      richText.current?.setHiliteColor
        ? richText.current.setHiliteColor(color)
        : richText.current?.sendAction &&
          richText.current.sendAction('hiliteColor', color);
    }
    setShowColorPicker(null);
  };

  // Sync editor when parent value changes
  useEffect(() => {
    if (value !== editorValue) {
      setEditorValue(value);
      if (richText.current) {
        richText.current.setContentHTML(value);
      }
    }
    // Initialize history with initial value
    if (historyIndex.current === -1 && value) {
      history.current = [value];
      historyIndex.current = 0;
    }
  }, [value]);

  // ⚡ UPDATED: Manual History Tracking in content change
  const handleContentChange = htmlContent => {
    setEditorValue(htmlContent);
    onChange(htmlContent);

    // Track history only if we are NOT restoring content
    if (!isRestoring.current) {
      // Debounce history saving here if needed, but keeping it simple for now:
      // 1. Cut off future history (for redo)
      history.current = history.current.slice(0, historyIndex.current + 1);
      // 2. Add current content
      history.current.push(htmlContent);
      // 3. Update index
      historyIndex.current = history.current.length - 1;
    }
    // Reset flag after content change
    isRestoring.current = false;
  };

  // Removed native undo/redo actions from toolbar, relying on manual buttons
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
    // Native link/image actions removed as we use modals/custom buttons
    // Native undo/redo actions removed as we use manual logic
  ];

  const handleEditorFocus = () => {
    setIsPickerVisible(null); // Hide pickers when editing starts
  };

  // Render Font/Size Picker
  const renderPicker = () => {
    if (!isPickerVisible) return null;

    const items = isPickerVisible === 'size' ? FONT_SIZE_LABELS : FONT_FAMILIES;
    const onPress =
      isPickerVisible === 'size' ? applyFontSize : applyFontFamily;

    return (
      <Modal visible={!!isPickerVisible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsPickerVisible(null)} // Close modal on overlay click
        >
          <View style={styles.pickerModalContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pickerScroll}
            >
              {items.map(item => (
                <PickerButton
                  key={item}
                  label={item}
                  onPress={() => onPress(item)}
                  isActive={
                    isPickerVisible === 'size'
                      ? currentFontSize === item
                      : currentFontFamily === item
                  }
                />
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  return (
    <View style={[styles.container, style]}>
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

      {/* Font/Size Selection UI (modal) */}
      {renderPicker()}

      {/* Rich Toolbar (Main actions) */}
      <RichToolbar
        editor={richText}
        actions={toolbarActions}
        style={styles.richToolbar}
        iconTint="#333"
      />

      {/* Extra small toolbar controls: Link/Image/Colors/Undo/Redo */}
      <View style={styles.extraToolbar}>
        <TouchableOpacity
          onPress={() => setShowLinkModal(true)}
          style={styles.extraButton}
        >
          <Text style={styles.extraButtonText}>🔗 Link</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setShowImageModal(true)}
          style={styles.extraButton}
        >
          <Text style={styles.extraButtonText}>🖼️ Image</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() =>
            setShowColorPicker(showColorPicker === 'fore' ? null : 'fore')
          }
          style={styles.extraButton}
        >
          <Text style={styles.extraButtonText}>A</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() =>
            setShowColorPicker(showColorPicker === 'back' ? null : 'back')
          }
          style={styles.extraButton}
        >
          <Text style={styles.extraButtonText}>BG</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleUndo} style={styles.extraButton}>
          <Text style={styles.extraButtonText}>⏪ Undo</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleRedo} style={styles.extraButton}>
          <Text style={styles.extraButtonText}>⏩ Redo</Text>
        </TouchableOpacity>
      </View>

      {/* Color picker rendered as Modal overlay so it stays above the editor */}
      <Modal
        visible={!!showColorPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowColorPicker(null)}
        presentationStyle="overFullScreen"
      >
        <Pressable
          style={styles.colorModalOverlay}
          onPress={() => setShowColorPicker(null)}
        >
          <Pressable style={styles.colorModalContainer} onPress={() => {}}>
            <Text style={styles.modalTitle}>Choose Color</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.colorPickerScroll}
              keyboardShouldPersistTaps="handled"
            >
              {[
                '#000000',
                '#DC2626',
                '#16A34A',
                '#1E40AF',
                '#F59E0B',
                '#9333EA',
                '#6B7280',
                '#FFFFFF',
              ].map(c => (
                <TouchableOpacity
                  key={c}
                  onPress={() => applyColor(c)}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: c },
                    c === '#FFFFFF' && { borderWidth: 1, borderColor: '#ccc' },
                  ]}
                />
              ))}
            </ScrollView>
            <View style={styles.colorModalActions}>
              <TouchableOpacity
                onPress={() => setShowColorPicker(null)}
                style={[styles.modalButton, { marginRight: 8 }]}
              >
                <Text>Close</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Link Modal */}
      <Modal visible={showLinkModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Insert Link</Text>
            <TextInput
              placeholder="URL"
              value={linkUrl}
              onChangeText={setLinkUrl}
              style={styles.modalInput}
              keyboardType={Platform.OS === 'ios' ? 'url' : 'default'}
              autoCapitalize="none"
            />
            <TextInput
              placeholder="Text (optional)"
              value={linkTitle}
              onChangeText={setLinkTitle}
              style={styles.modalInput}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setShowLinkModal(false)}
                style={styles.modalButton}
              >
                <Text>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleInsertLink}
                style={[styles.modalButton, styles.modalPrimary]}
              >
                <Text style={{ color: 'white' }}>Insert</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Image Modal */}
      <Modal visible={showImageModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Insert Image (URL)</Text>
            <TextInput
              placeholder="Image URL"
              value={imageUrl}
              onChangeText={setImageUrl}
              style={styles.modalInput}
              autoCapitalize="none"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setShowImageModal(false)}
                style={styles.modalButton}
              >
                <Text>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleInsertImage}
                style={[styles.modalButton, styles.modalPrimary]}
              >
                <Text style={{ color: 'white' }}>Insert</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Rich Editor */}
      <RichEditor
        ref={richText}
        initialContentHTML={editorValue}
        placeholder={placeholder}
        onChange={handleContentChange}
        onFocus={handleEditorFocus}
        style={[styles.editor, style && style.editor]}
        editorStyle={{
          ...styles.editorContent,
          // Apply custom CSS for initial/default typing style
          ...(defaultEditorCss ? { cssText: defaultEditorCss } : {}),
        }}
        initialHeight={200} // Ensure enough space
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    margin: 0,
    borderWidth: 0,
    borderColor: 'transparent',
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    padding: 6,
  },
  // --- Custom Toolbar Styles ---
  customToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#fbfbfb',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  richToolbar: {
    backgroundColor: '#f9f9f9',
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  pickerDropdown: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#E6EEF5',
    borderRadius: 6,
    marginRight: 8,
    minWidth: 72,
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
  pickerModalContainer: {
    width: '90%',
    maxWidth: 700,
    backgroundColor: 'white',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  pickerScroll: {
    alignItems: 'center',
    paddingVertical: 6,
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
  extraToolbar: {
    flexDirection: 'row',
    paddingHorizontal: 6,
    paddingVertical: 8,
    gap: 8,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    flexWrap: 'wrap',
  },
  extraButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#eef2f6',
    minWidth: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  extraButtonText: {
    fontSize: 13,
    color: '#374151',
    textAlign: 'center',
  },
  colorPicker: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: 6,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#eef2f6',
    elevation: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '92%',
    maxWidth: 560,
    backgroundColor: 'white',
    padding: 14,
    borderRadius: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  modalInput: {
    height: 44,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 6,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  modalButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  modalPrimary: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  colorModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  colorModalContainer: {
    width: '100%',
    maxWidth: 720,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 14,
    elevation: 30,
    zIndex: 1000,
  },
  colorPickerScroll: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  colorModalActions: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
});

export default QuillEditor;
