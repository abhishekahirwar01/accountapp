import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Dimensions,
  Modal,
  FlatList,
} from 'react-native';
import {
  RichEditor,
  RichToolbar,
  actions,
} from 'react-native-pell-rich-editor';

// --- FONT SIZE DATA ---
const FONT_SIZES_MAP = {
  Small: '1',
  Normal: '3',
  Large: '5',
  Huge: '7',
};
const FONT_SIZE_LABELS = Object.keys(FONT_SIZES_MAP);
const FONT_SIZE_DEFAULT_LABEL = 'Normal';
const FONT_FAMILY_DEFAULT = 'Times New Roman';

const htmlSizeToPx = size => {
  switch (size) {
    case '1':
      return 12;
    case '3':
      return 16;
    case '5':
      return 20;
    case '7':
      return 24;
    default:
      return 16;
  }
};

const WORD_LIMIT = 50;
const DROPDOWN_HEIGHT = 200;

const PickerButton = ({ label, onPress, isActive, style = {} }) => (
  <TouchableOpacity
    onPress={onPress}
    style={[styles.pickerButton, isActive && styles.pickerButtonActive, style]}
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
  placeholder = 'Add detailed notes with formatting...',
  style = {},
}) => {
  const richText = useRef(null);
  const sizeDropdownRef = useRef(null);

  const [editorValue, setEditorValue] = useState(value);
  const [currentFontSize, setCurrentFontSize] = useState(
    FONT_SIZE_DEFAULT_LABEL,
  );
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const [isOpeningUpward, setIsOpeningUpward] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({
    pageX: 0,
    pageY: 0,
    width: 0,
    height: 0,
  });
  const [defaultEditorCss, setDefaultEditorCss] = useState('');
  const [wordCount, setWordCount] = useState(0);

  const history = useRef([]);
  const historyIndex = useRef(-1);
  const isRestoring = useRef(false);
  const [showLimitWarning, setShowLimitWarning] = useState(false);
  const lastValidHtml = useRef(value || '');

  const countWords = html => {
    if (!html) return 0;
    const text = html
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .trim();
    if (text.length === 0) return 0;
    return text.split(/\s+/).filter(word => word.length > 0).length;
  };

  const measureAndSetPosition = useCallback(ref => {
    if (ref.current) {
      ref.current.measureInWindow((pageX, pageY, width, height) => {
        setDropdownPosition({ pageX, pageY, width, height });
        const screenHeight = Dimensions.get('window').height;
        setIsOpeningUpward(
          screenHeight - pageY - height < DROPDOWN_HEIGHT + 50,
        );
      });
    }
  }, []);

  const applyFontSize = useCallback(label => {
    const size = FONT_SIZES_MAP[label];
    if (size) {
      richText.current?.setFontSize(size);
      const px = htmlSizeToPx(size);
      setDefaultEditorCss(
        `font-size: ${px}px; font-family: ${FONT_FAMILY_DEFAULT};`,
      );
      setCurrentFontSize(label);
    }
    setIsPickerVisible(false);
  }, []);

  const handleUndo = useCallback(() => {
    if (historyIndex.current > 0) {
      isRestoring.current = true;
      historyIndex.current -= 1;
      const content = history.current[historyIndex.current];
      richText.current?.setContentHTML(content);
      setEditorValue(content);
      lastValidHtml.current = content;
      setWordCount(countWords(content));
      onChange(content);
    }
  }, [onChange]);

  const handleRedo = useCallback(() => {
    if (historyIndex.current < history.current.length - 1) {
      isRestoring.current = true;
      historyIndex.current += 1;
      const content = history.current[historyIndex.current];
      richText.current?.setContentHTML(content);
      setEditorValue(content);
      lastValidHtml.current = content;
      setWordCount(countWords(content));
      onChange(content);
    }
  }, [onChange]);

  useEffect(() => {
    const initialValue = value || '';
    setEditorValue(initialValue);
    lastValidHtml.current = initialValue;
    setWordCount(countWords(initialValue));
    if (historyIndex.current === -1) {
      history.current = [initialValue];
      historyIndex.current = 0;
    }
    const initialCss = `font-size: 16px; font-family: ${FONT_FAMILY_DEFAULT};`;
    setDefaultEditorCss(initialCss);
  }, [value]);

  const handleContentChange = htmlContent => {
    if (isRestoring.current) {
      isRestoring.current = false;
      return;
    }
    const words = countWords(htmlContent);
    if (words <= WORD_LIMIT) {
      setEditorValue(htmlContent);
      lastValidHtml.current = htmlContent;
      setWordCount(words);
      onChange(htmlContent);
      history.current = [
        ...history.current.slice(0, historyIndex.current + 1),
        htmlContent,
      ];
      historyIndex.current = history.current.length - 1;
      setShowLimitWarning(false);
    } else {
      isRestoring.current = true;
      richText.current?.setContentHTML(lastValidHtml.current);
      setShowLimitWarning(true);
    }
  };

  const renderPickerModal = () => {
    if (!isPickerVisible) return null;
    return (
      <Modal visible={isPickerVisible} transparent animationType="none">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsPickerVisible(false)}
        >
          <View
            style={[
              styles.pickerStyle,
              {
                left: dropdownPosition.pageX,
                ...(isOpeningUpward
                  ? {
                      bottom:
                        Dimensions.get('window').height -
                        dropdownPosition.pageY,
                    }
                  : { top: dropdownPosition.pageY + dropdownPosition.height }),
              },
            ]}
          >
            <FlatList
              data={FONT_SIZE_LABELS}
              renderItem={({ item }) => (
                <PickerButton
                  label={item}
                  onPress={() => applyFontSize(item)}
                  isActive={currentFontSize === item}
                />
              )}
              keyExtractor={item => item}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  const toolbarActions = [
    actions.setBold,
    actions.setItalic,
    actions.setUnderline,
    actions.setStrikethrough,
    actions.insertBulletsList,
    actions.insertOrderedList,
    actions.alignLeft,
    actions.alignCenter,
    actions.alignRight,
    actions.removeFormat,
  ];

  return (
    <View style={[styles.container, style]}>
      {/* Word Limit Modal */}
      <Modal visible={showLimitWarning} transparent animationType="fade">
        <View style={styles.warningOverlay}>
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              ⚠️ Word limit reached ({WORD_LIMIT} words).
            </Text>
            <TouchableOpacity
              onPress={() => setShowLimitWarning(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {renderPickerModal()}

      {/* Main Toolbar - Fixed Alignment */}
      <View style={styles.richToolbarContainer}>
        <TouchableOpacity
          ref={sizeDropdownRef}
          onLayout={() => measureAndSetPosition(sizeDropdownRef)}
          onPress={() => {
            measureAndSetPosition(sizeDropdownRef);
            setIsPickerVisible(true);
          }}
          style={styles.fontDropdown}
        >
          <Text style={styles.dropdownText}>{currentFontSize} ▾</Text>
        </TouchableOpacity>

        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.toolbarFlatList}
          contentContainerStyle={styles.toolbarContent}
          data={toolbarActions}
          renderItem={({ item }) => (
            <RichToolbar
              editor={richText}
              actions={[item]}
              iconTint="#333"
              style={styles.singleActionToolbar}
              flatContainerStyle={{ backgroundColor: 'transparent' }}
            />
          )}
          keyExtractor={(item, index) => `action-${index}`}
        />
      </View>

      {/* Undo/Redo & Count */}
      <View style={styles.extraToolbar}>
        <TouchableOpacity
          onPress={handleUndo}
          style={styles.extraButton}
          disabled={historyIndex.current <= 0}
        >
          <Text style={styles.extraButtonText}>⏪ Undo</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleRedo}
          style={styles.extraButton}
          disabled={historyIndex.current >= history.current.length - 1}
        >
          <Text style={styles.extraButtonText}>⏩ Redo</Text>
        </TouchableOpacity>
        <View style={styles.wordCountContainer}>
          <Text
            style={[
              styles.wordCountText,
              wordCount >= WORD_LIMIT && styles.wordCountExceeded,
            ]}
          >
            {wordCount}/{WORD_LIMIT}
          </Text>
        </View>
      </View>

      <RichEditor
        ref={richText}
        initialContentHTML={value}
        placeholder={placeholder}
        onChange={handleContentChange}
        style={styles.editor}
        editorStyle={{
          ...styles.editorContent,
          ...(defaultEditorCss ? { cssText: defaultEditorCss } : {}),
        }}
        initialHeight={250}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  richToolbarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    height: 50,
    paddingHorizontal: 10,
  },
  fontDropdown: {
    height: 34,
    minWidth: 80,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  dropdownText: {
    fontSize: 13,
    color: '#333',
    fontWeight: '600',
  },
  toolbarFlatList: {
    flex: 1,
  },
  toolbarContent: {
    alignItems: 'center',
  },
  singleActionToolbar: {
    backgroundColor: 'transparent',
    width: 38,
    height: 38,
    justifyContent: 'center',
  },
  extraToolbar: {
    flexDirection: 'row',
    padding: 10,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  extraButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    marginRight: 8,
  },
  extraButtonText: { fontSize: 12, color: '#444' },
  wordCountContainer: {
    marginLeft: 'auto',
    backgroundColor: '#eee',
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  wordCountText: { fontSize: 12, color: '#666' },
  wordCountExceeded: { color: 'red', fontWeight: 'bold' },
  editor: { flex: 1 },
  editorContent: { padding: 15 },
  modalOverlay: { flex: 1 },
  pickerStyle: {
    position: 'absolute',
    width: 120,
    backgroundColor: 'white',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ddd',
    elevation: 5,
    zIndex: 2000,
  },
  pickerButton: {
    padding: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#eee',
  },
  pickerButtonActive: { backgroundColor: '#f0f0f0' },
  pickerButtonText: { fontSize: 14, color: '#333' },
  pickerButtonTextActive: { fontWeight: 'bold' },
  warningOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  warningBox: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  warningText: { color: 'red', marginBottom: 15 },
  closeButton: {
    backgroundColor: '#007aff',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 5,
  },
  closeButtonText: { color: '#fff', fontWeight: 'bold' },
});

export default QuillEditor;
