import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  FlatList,
  RefreshControl,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Save } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import RNFS from 'react-native-fs';

import { generatePdfForTemplate1 } from '../../lib/pdf-template1';
import { generatePdfForTemplate8 } from '../../lib/pdf-template8';
import { generatePdfForTemplate11 } from '../../lib/pdf-template11';
import { generatePdfForTemplate12 } from '../../lib/pdf-template12';
import { generatePdfForTemplate16 } from '../../lib/pdf-template16';
import { generatePdfForTemplate17 } from '../../lib/pdf-template17';
import { generatePdfForTemplate18 } from '../../lib/pdf-template18';
import { generatePdfForTemplate19 } from '../../lib/pdf-template19';
import { generatePdfForTemplate20 } from '../../lib/pdf-template20';
import { generatePdfForTemplate21 } from '../../lib/pdf-template21';
import { generatePdfForTemplateA5 } from '../../lib/pdf-templateA5';
import { generatePdfForTemplateA5_2 } from '../../lib/pdf-templateA3-2';
import { generatePdfForTemplateA5_3 } from '../../lib/pdf-templateA5-3';
import { generatePdfForTemplateA5_4 } from '../../lib/pdf-templateA5-4';
import { generatePdfForTemplatet3 } from '../../lib/pdf-template-t3';
import { generatePdfForTemplate3 } from '../../lib/pdf-template3';
import { generatePdfForTemplateA5_5 } from '../../lib/pdf-templateA5-5';

import { BASE_URL } from '../../config';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const scale = Math.min(SCREEN_WIDTH, 450) / 375;
const normalize = size => Math.round(size * scale);

const SIDE_PADDING = normalize(16);
const CARD_GAP = normalize(8);
const CARD_WIDTH = SCREEN_WIDTH - SIDE_PADDING * 2;
const SNAP_INTERVAL = CARD_WIDTH + CARD_GAP;
const CARD_HEIGHT = SCREEN_HEIGHT * 0.55;
const THUMB_SIZE = normalize(80);
const THUMB_MARGIN = normalize(6);
const THUMB_ITEM_LENGTH = THUMB_SIZE + THUMB_MARGIN * 2;
const FOOTER_PADDING = normalize(16);
const HEADER_PADDING = normalize(16);
const BUTTON_HEIGHT = normalize(52);
const DOT_SIZE = normalize(6);
const DOT_ACTIVE_WIDTH = normalize(18);

const FONT_SIZE_CARD_HEADER = normalize(15);
const FONT_SIZE_THUMB_LABEL = normalize(10);
const FONT_SIZE_HINT = normalize(12);
const FONT_SIZE_BUTTON = normalize(16);

// ─────────────────────────────────────────────
// MODULE-LEVEL CACHE
// ─────────────────────────────────────────────
let MODULE_SETTINGS_CACHE = null;

// ─────────────────────────────────────────────
// TEMPLATE LIST
// ─────────────────────────────────────────────
const templateOptions = [
  {
    value: 'template1',
    label: 'Template 1',
    color: '#8b77ff',
    paperSize: 'A4',
    preview: require('../../../assets/templates/Template1.png'),
  },
  {
    value: 'template8',
    label: 'Template 2',
    color: '#a855f7',
    paperSize: 'A4',
    preview: require('../../../assets/templates/Template2.png'),
  },
  {
    value: 'template11',
    label: 'Template 3',
    color: '#1f2937',
    paperSize: 'A4',
    preview: require('../../../assets/templates/Template3.png'),
  },
  {
    value: 'template12',
    label: 'Template 4',
    color: '#22c55e',
    paperSize: 'A4',
    preview: require('../../../assets/templates/Template4.png'),
  },
  {
    value: 'template16',
    label: 'Template 5',
    color: '#d97706',
    paperSize: 'A4',
    preview: require('../../../assets/templates/Template5.png'),
  },
  {
    value: 'template17',
    label: 'Template 6',
    color: '#4f46e5',
    paperSize: 'A4',
    preview: require('../../../assets/templates/Template6.png'),
  },
  {
    value: 'template19',
    label: 'Template 7',
    color: '#0d9488',
    paperSize: 'A4',
    preview: require('../../../assets/templates/Template7.png'),
  },
  {
    value: 'template20',
    label: 'Template 8',
    color: '#4f46e5',
    paperSize: 'A4',
    preview: require('../../../assets/templates/Template8.png'),
  },
  {
    value: 'template21',
    label: 'Template 9',
    color: '#0d9488',
    paperSize: 'A4',
    preview: require('../../../assets/templates/Template9.png'),
  },
  {
    value: 'templateA5',
    label: 'Template A5',
    color: '#ec4899',
    paperSize: 'A5 Landscape',
    preview: require('../../../assets/templates/TemplateA5.png'),
  },
  {
    value: 'templateA5_2',
    label: 'Template A5-2',
    color: '#22c55e',
    paperSize: 'A5',
    preview: require('../../../assets/templates/TemplateA5-2.png'),
  },
  {
    value: 'templateA5_3',
    label: 'Template A5-3',
    color: '#f97316',
    paperSize: 'A5',
    preview: require('../../../assets/templates/TemplateA5-3.png'),
  },
  {
    value: 'templateA5_4',
    label: 'TemplateA5-4',
    color: '#06b6d4',
    paperSize: 'A5 Landscape',
    preview: require('../../../assets/templates/TemplateA5-4.png'),
  },
  {
    value: 'templateA5_5',
    label: 'TemplateA5-5',
    color: '#06b6d4',
    paperSize: 'A5 Landscape',
    preview: require('../../../assets/templates/TemplateA5-5.png'),
  },
  {
    value: 'template-t3',
    label: 'Template T3',
    color: '#84cc16',
    paperSize: 'Thermal Invoice',
    preview: require('../../../assets/templates/Template T3.png'),
  },
  {
    value: 'template18',
    label: 'Template T3-2',
    color: '#f43f5e',
    paperSize: 'Thermal Invoice',
    preview: require('../../../assets/templates/Templatet T3-2.png'),
  },
];

// ─────────────────────────────────────────────
// DUMMY DATA (used only during save to generate actual PDF)
// ─────────────────────────────────────────────
const dummyData = {
  company: {
    businessName: 'Demo Company',
    companyName: 'Demo Company',
    address: '123 Tech Lane, Silicon Valley',
    City: 'Techville',
    addressState: 'California',
    Country: 'USA',
    Pincode: '94043',
    gstin: '27ABCDE1234F1Z0',
    mobileNumber: '9876543210',
    Telephone: '022-23456789',
    email: 'contact@democompany.com',
    logo: '/static/images/default-logo.png',
  },
  party: {
    name: 'Valued Client',
    address: '456 Client Avenue',
    city: 'Client City',
    state: 'California',
    pincode: '90210',
    contactNumber: '1234567890',
    gstin: '27XYZGH5678I2Z0',
    pan: 'ABCDE1234F',
  },
  transaction: {
    invoiceNumber: 'INV-001',
    date: new Date().toISOString(),
    products: [
      {
        name: 'Sample Item',
        quantity: 1,
        pricePerUnit: 100,
        gstPercentage: 18,
        lineTax: 18,
        lineTotal: 118,
        amount: 100,
      },
    ],
    services: [],
  },
  serviceNames: new Map(),
  bank: {
    bankName: 'Demo Bank',
    accountNumber: '123456789',
    ifscCode: 'DEMO0000001',
  },
  client: { clientUsername: 'demo', clientName: 'Demo Client' },
};

// ─────────────────────────────────────────────
// THUMB CARD — pure image, zero loading
// ─────────────────────────────────────────────
const ThumbCard = memo(({ templateKey, isSelected, onPress }) => {
  const template = templateOptions.find(t => t.value === templateKey);

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.thumb,
        isSelected && { borderColor: template?.color, borderWidth: 2.5 },
      ]}
      activeOpacity={0.7}
    >
      <Image
        source={template?.preview}
        style={styles.thumbImage}
        resizeMode="cover"
      />
      <Text
        style={[
          styles.thumbLabel,
          isSelected && { color: template?.color, fontWeight: '700' },
        ]}
        numberOfLines={1}
      >
        {template?.label}
      </Text>
      {isSelected && (
        <View style={[styles.thumbCheck, { backgroundColor: template?.color }]}>
          <Text style={styles.thumbCheckText}>✓</Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

// ─────────────────────────────────────────────
// ACTIVE CARD — pure image, zero loading
// ─────────────────────────────────────────────
const ActiveCard = memo(({ templateKey }) => {
  const template = templateOptions.find(t => t.value === templateKey);

  return (
    <View
      style={[
        styles.carouselCard,
        { height: CARD_HEIGHT, borderColor: template?.color, borderWidth: 2 },
      ]}
    >
      <View style={[styles.cardHeader, { backgroundColor: template?.color }]}>
        <Text style={styles.cardHeaderText}>{template?.label}</Text>
        <Text style={styles.cardPaperSize}>{template?.paperSize}</Text>
      </View>
      <View style={styles.cardPdfArea}>
        <Image
          source={template?.preview}
          style={styles.pdfFull}
          resizeMode="contain"
        />
      </View>
    </View>
  );
});

// ─────────────────────────────────────────────
// INACTIVE CARD — pure image, zero loading
// ─────────────────────────────────────────────
const InactiveCard = memo(({ templateKey }) => {
  const template = templateOptions.find(t => t.value === templateKey);

  return (
    <View style={[styles.carouselCard, { height: CARD_HEIGHT, opacity: 0.75 }]}>
      <View style={[styles.cardHeader, { backgroundColor: template?.color }]}>
        <Text style={styles.cardHeaderText}>{template?.label}</Text>
        <Text style={styles.cardPaperSize}>{template?.paperSize}</Text>
      </View>
      <View style={styles.cardPdfArea}>
        <Image
          source={template?.preview}
          style={styles.pdfFull}
          resizeMode="contain"
        />
      </View>
    </View>
  );
});

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
export default function TemplateSettings({ navigation }) {
  const [selectedTemplate, setSelectedTemplate] = useState('template1');
  const [fetchedTemplate, setFetchedTemplate] = useState('template1');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const carouselRef = useRef(null);
  const thumbsRef = useRef(null);
  const carouselScrolling = useRef(false);

  const hasUnsavedChanges = selectedTemplate !== fetchedTemplate;

  useEffect(() => {
    loadSettings(false);
  }, []);

  const loadSettings = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh && MODULE_SETTINGS_CACHE) {
      const { defaultTemplate } = MODULE_SETTINGS_CACHE;
      const idx = templateOptions.findIndex(t => t.value === defaultTemplate);
      setSelectedTemplate(defaultTemplate);
      setFetchedTemplate(defaultTemplate);
      if (idx >= 0) {
        setCurrentIndex(idx);
        if (idx > 0)
          setTimeout(
            () =>
              carouselRef.current?.scrollToIndex({
                index: idx,
                animated: false,
              }),
            400,
          );
      }
      return;
    }

    forceRefresh ? setIsRefreshing(true) : setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(
        `${BASE_URL}/api/settings/default-template`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (response.ok) {
        const data = await response.json();
        const template = data.defaultTemplate || 'template1';
        MODULE_SETTINGS_CACHE = { defaultTemplate: template };
        const idx = templateOptions.findIndex(t => t.value === template);
        setSelectedTemplate(template);
        setFetchedTemplate(template);
        if (idx >= 0) {
          setCurrentIndex(idx);
          setTimeout(() => {
            if (idx > 0)
              carouselRef.current?.scrollToIndex({
                index: idx,
                animated: false,
              });
          }, 400);
        }
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Load Error', text2: error.message });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const handleRefresh = useCallback(() => loadSettings(true), [loadSettings]);

  const handleCarouselScroll = useCallback(e => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SNAP_INTERVAL);
    if (idx >= 0 && idx < templateOptions.length) {
      setCurrentIndex(idx);
      setSelectedTemplate(templateOptions[idx].value);
      thumbsRef.current?.scrollToIndex({
        index: idx,
        animated: true,
        viewPosition: 0.5,
      });
    }
    carouselScrolling.current = false;
  }, []);

  const handleCarouselScrollBegin = useCallback(() => {
    carouselScrolling.current = true;
  }, []);

  const handleThumbPress = useCallback(idx => {
    if (carouselScrolling.current) return;
    carouselScrolling.current = true;
    setCurrentIndex(idx);
    setSelectedTemplate(templateOptions[idx].value);
    carouselRef.current?.scrollToIndex({ index: idx, animated: true });
  }, []);

  const handleCarouselScrollToIndexFailed = useCallback(info => {
    setTimeout(
      () =>
        carouselRef.current?.scrollToIndex({
          index: info.index,
          animated: false,
        }),
      500,
    );
  }, []);

  // ── SAVE: API call only, no PDF generation needed here ──
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(
        `${BASE_URL}/api/settings/default-template`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ defaultTemplate: selectedTemplate }),
        },
      );
      if (response.ok) {
        MODULE_SETTINGS_CACHE = { defaultTemplate: selectedTemplate };
        setFetchedTemplate(selectedTemplate);
        Toast.show({ type: 'success', text1: 'Template Updated Successfully' });
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Save Failed' });
    } finally {
      setIsSaving(false);
    }
  };

  const getCarouselItemLayout = useCallback(
    (_, index) => ({
      length: SNAP_INTERVAL,
      offset: SNAP_INTERVAL * index,
      index,
    }),
    [],
  );

  const getThumbItemLayout = useCallback(
    (_, index) => ({
      length: THUMB_ITEM_LENGTH,
      offset: THUMB_ITEM_LENGTH * index,
      index,
    }),
    [],
  );

  const renderCarouselItem = useCallback(
    ({ item, index }) => (
      <View style={{ width: CARD_WIDTH, marginHorizontal: CARD_GAP / 2 }}>
        {index === currentIndex ? (
          <ActiveCard templateKey={item.value} />
        ) : (
          <InactiveCard templateKey={item.value} />
        )}
      </View>
    ),
    [currentIndex],
  );

  const renderThumbItem = useCallback(
    ({ item, index }) => (
      <ThumbCard
        templateKey={item.value}
        isSelected={index === currentIndex}
        onPress={() => handleThumbPress(index)}
      />
    ),
    [currentIndex, handleThumbPress],
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#8b77ff" />
        <Text style={styles.initLoadText}>Loading settings…</Text>
      </View>
    );
  }

  const selectedTemplateData = templateOptions.find(
    t => t.value === selectedTemplate,
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flex: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#8b77ff"
            title="Refreshing settings…"
            titleColor="#6b7280"
          />
        }
        scrollEnabled={isRefreshing}
      >
        {/* Selected template badge */}
        <View style={styles.selectedBadge}>
          <View
            style={[
              styles.selectedDot,
              { backgroundColor: selectedTemplateData?.color },
            ]}
          />
          <Text style={styles.selectedText}>
            {selectedTemplateData?.label} • {selectedTemplateData?.paperSize}
          </Text>
          {hasUnsavedChanges && <View style={styles.unsavedDot} />}
        </View>

        {/* Main carousel */}
        <FlatList
          ref={carouselRef}
          data={templateOptions}
          keyExtractor={item => item.value}
          horizontal
          snapToInterval={SNAP_INTERVAL}
          snapToAlignment="center"
          decelerationRate="fast"
          disableIntervalMomentum
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleCarouselScroll}
          onScrollBeginDrag={handleCarouselScrollBegin}
          initialScrollIndex={currentIndex}
          getItemLayout={getCarouselItemLayout}
          onScrollToIndexFailed={handleCarouselScrollToIndexFailed}
          contentContainerStyle={{ paddingRight: 0 }}
          renderItem={renderCarouselItem}
          maxToRenderPerBatch={3}
          windowSize={5}
          removeClippedSubviews={true}
          initialNumToRender={3}
        />

        {/* Dot indicators */}
        <View style={styles.dotsRow}>
          {templateOptions.map((_, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => handleThumbPress(i)}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            >
              <View
                style={[styles.dot, i === currentIndex && styles.dotActive]}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Thumbnail strip */}
        <FlatList
          ref={thumbsRef}
          data={templateOptions}
          keyExtractor={item => item.value + '_thumb'}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.thumbsContent}
          getItemLayout={getThumbItemLayout}
          onScrollToIndexFailed={() => {}}
          renderItem={renderThumbItem}
          maxToRenderPerBatch={6}
          windowSize={7}
          removeClippedSubviews={true}
          initialNumToRender={8}
        />

        {/* Footer */}
        <View style={styles.footer}>
          {hasUnsavedChanges && (
            <View style={styles.hintRow}>
              <Text style={styles.hintText}>
                💡 Tap "Update Template" to save your selection.
              </Text>
            </View>
          )}
          <TouchableOpacity
            style={[
              styles.saveButton,
              (!hasUnsavedChanges || isSaving) && styles.saveButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={isSaving || !hasUnsavedChanges}
            activeOpacity={0.85}
          >
            {isSaving ? (
              <ActivityIndicator color="#fff" size={normalize(20)} />
            ) : (
              <>
                <Save size={normalize(18)} color="#fff" />
                <Text style={styles.saveButtonText}>Update Template</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Toast />
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f9fafb',
    paddingTop: -55,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: normalize(10),
  },
  initLoadText: {
    fontSize: normalize(13),
    color: '#6b7280',
    includeFontPadding: false,
  },
  selectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: HEADER_PADDING,
    paddingVertical: normalize(8),
    gap: normalize(6),
  },
  selectedDot: {
    width: normalize(8),
    height: normalize(8),
    borderRadius: normalize(4),
  },
  selectedText: {
    fontSize: normalize(13),
    fontWeight: '600',
    color: '#374151',
    flex: 1,
  },
  unsavedDot: {
    width: normalize(6),
    height: normalize(6),
    borderRadius: normalize(3),
    backgroundColor: '#f59e0b',
  },
  carouselCard: {
    width: CARD_WIDTH,
    borderRadius: normalize(16),
    backgroundColor: '#fff',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: normalize(4) },
    shadowOpacity: 0.1,
    shadowRadius: normalize(12),
    elevation: 5,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: normalize(16),
    paddingVertical: normalize(10),
  },
  cardHeaderText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: FONT_SIZE_CARD_HEADER,
    letterSpacing: -0.2,
    includeFontPadding: false,
  },
  cardPaperSize: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: normalize(10),
    fontWeight: '500',
    includeFontPadding: false,
  },
  cardPdfArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  pdfFull: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: normalize(10),
    flexWrap: 'wrap',
    paddingHorizontal: HEADER_PADDING,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: '#d1d5db',
    margin: normalize(3),
  },
  dotActive: {
    backgroundColor: '#8b77ff',
    width: DOT_ACTIVE_WIDTH,
    borderRadius: DOT_ACTIVE_WIDTH / 2,
  },
  thumbsContent: {
    paddingHorizontal: normalize(12),
    paddingVertical: normalize(4),
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE + normalize(20),
    marginHorizontal: THUMB_MARGIN,
    borderRadius: normalize(10),
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: normalize(1) },
    shadowOpacity: 0.06,
    shadowRadius: normalize(4),
    elevation: 2,
  },
  thumbImage: {
    width: THUMB_SIZE,
    height: THUMB_SIZE - normalize(18),
  },
  thumbLabel: {
    fontSize: FONT_SIZE_THUMB_LABEL,
    color: '#6b7280',
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: normalize(4),
    marginTop: normalize(2),
    includeFontPadding: false,
  },
  thumbCheck: {
    position: 'absolute',
    top: normalize(4),
    right: normalize(4),
    width: normalize(16),
    height: normalize(16),
    borderRadius: normalize(8),
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbCheckText: {
    color: '#fff',
    fontSize: normalize(10),
    fontWeight: '700',
    includeFontPadding: false,
  },
  footer: {
    paddingHorizontal: FOOTER_PADDING,
    paddingBottom: FOOTER_PADDING,
    paddingTop: normalize(8),
  },
  hintRow: {
    backgroundColor: '#fefce8',
    borderRadius: normalize(8),
    paddingHorizontal: normalize(12),
    paddingVertical: normalize(8),
    marginBottom: normalize(10),
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  hintText: {
    fontSize: FONT_SIZE_HINT,
    color: '#92400e',
    includeFontPadding: false,
  },
  saveButton: {
    backgroundColor: '#8b77ff',
    borderRadius: normalize(14),
    height: BUTTON_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: normalize(8),
    shadowColor: '#8b77ff',
    shadowOffset: { width: 0, height: normalize(4) },
    shadowOpacity: 0.35,
    shadowRadius: normalize(8),
    elevation: 6,
  },
  saveButtonDisabled: {
    backgroundColor: '#c5bcfa',
    shadowOpacity: 0.1,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: FONT_SIZE_BUTTON,
    fontWeight: '700',
    letterSpacing: 0.2,
    includeFontPadding: false,
  },
});
