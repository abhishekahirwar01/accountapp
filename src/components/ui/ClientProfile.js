import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  Platform,
  ImageBackground,
  ScrollView,
  Alert,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../../config';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CARD_WIDTH = SCREEN_WIDTH - 40;
const CARD_HEIGHT = CARD_WIDTH * 0.56;
const CARD_GAP = 16;
const ITEM_WIDTH = CARD_WIDTH + CARD_GAP;

const CARD_TEMPLATES = [
  {
    id: 'first',
    label: 'Classic Gold',
    image: require('../../../assets/Cards/first.png'),
    theme: {
      companyNameColor: '#c8a84b',
      jobTitleColor: '#d0e8e8',
      titleLineColor: '#c8a84b',
      contactIconColor: '#c8a84b',
      contactTextColor: '#1a3a3a',
      qrBg: 'rgba(255,255,255,0.9)',
      qrBlockColor: '#0d3535',
      qrBorderColor: '#e2e8f0',
    },
    layout: {
      titleBlock: {
        position: 'top-right',
        alignment: 'flex-end',
      },
      companyName: {
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 1.5,
      },
      jobTitle: {
        fontSize: 9,
        fontWeight: '400',
        letterSpacing: 1.2,
      },
      contactSection: {
        position: 'left',
        fontSize: 9,
        fontWeight: '500',
        iconSize: 11,
      },
      qr: { show: true },
    },
  },

  {
    id: 'second',
    label: 'Midnight Blue',
    image: require('../../../assets/Cards/second.png'),
    theme: {
      companyNameColor: '#ffffff',
      jobTitleColor: '#ffe0b2',
      titleLineColor: '#ff9800',
      contactIconColor: '#ff9800',
      contactTextColor: '#ffffff',
      qrBg: 'rgba(255,255,255,0.85)',
      qrBlockColor: '#1a237e',
      qrBorderColor: '#b3b3ff',
    },
    layout: {
      titleBlock: {
        position: 'top-left',
        alignment: 'flex-start',
      },
      companyName: {
        fontSize: 15,
        fontWeight: '800',
        letterSpacing: 2,
      },
      jobTitle: {
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 1,
      },
      contactSection: {
        position: 'right',
        fontSize: 10,
        fontWeight: '600',
        iconSize: 12,
      },
      qr: { show: true },
    },
  },

  {
    id: 'third',
    label: 'Sonic Blue',
    image: require('../../../assets/Cards/third.png'),
    theme: {
      companyNameColor: '#00e5ff',
      jobTitleColor: '#b2ebf2',
      titleLineColor: '#00e5ff',
      contactIconColor: '#00e5ff',
      contactTextColor: '#000000',
      qrBg: 'rgba(0,0,0,0.75)',
      qrBlockColor: '#00e5ff',
      qrBorderColor: '#00e5ff',
    },
    layout: {
      titleBlock: {
        position: 'top-left',
        alignment: 'left',
      },
      companyName: {
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 3,
      },
      jobTitle: {
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 2,
      },
      contactSection: {
        position: 'center',
        fontSize: 9,
        fontWeight: '700',
        iconSize: 11,
        marginRight: 50,
      },
      qr: { show: false },
    },
  },
];

const getTitleBlockStyle = position => {
  const base = { position: 'absolute' };
  switch (position) {
    case 'top-left':
      return { ...base, top: 14, left: 16 };
    case 'top-center':
      return { ...base, top: 14, left: 0, right: 0, alignItems: 'center' };
    case 'top-right':
      return { ...base, top: 14, right: 16 };
    case 'bottom-left':
      return { ...base, bottom: 12, left: 16 };
    case 'bottom-center':
      return { ...base, bottom: 12, left: 0, right: 0, alignItems: 'center' };
    case 'bottom-right':
      return { ...base, bottom: 12, right: 16 };
    default:
      return { ...base, top: 14, right: 16 };
  }
};

const QRPlaceholder = ({ size = 52, theme }) => (
  <View
    style={[
      styles.qrBox,
      {
        width: size,
        height: size,
        backgroundColor: theme.qrBg,
        borderColor: theme.qrBorderColor,
      },
    ]}
  >
    <View style={styles.qrInner}>
      <View style={styles.qrTopRow}>
        <View
          style={[styles.qrBlock, { backgroundColor: theme.qrBlockColor }]}
        />
        <View style={styles.qrGap} />
        <View
          style={[styles.qrBlock, { backgroundColor: theme.qrBlockColor }]}
        />
      </View>
      <View style={styles.qrMidRow}>
        <View
          style={[styles.qrSmall, { backgroundColor: theme.qrBlockColor }]}
        />
        <View
          style={[styles.qrSmall, { backgroundColor: theme.qrBlockColor }]}
        />
        <View
          style={[styles.qrSmall, { backgroundColor: theme.qrBlockColor }]}
        />
      </View>
      <View style={styles.qrTopRow}>
        <View
          style={[styles.qrBlock, { backgroundColor: theme.qrBlockColor }]}
        />
        <View style={styles.qrGap} />
        <View
          style={[
            styles.qrBlock,
            { backgroundColor: theme.qrBlockColor, opacity: 0.4 },
          ]}
        />
      </View>
    </View>
  </View>
);

const BusinessCard = ({ company, template }) => {
  const { image, theme, layout } = template;

  const name = (company?.businessName || 'COMPANY NAME').toUpperCase();
  const title = company?.businessType || 'Business Type';
  const address =
    [company?.address, company?.City, company?.addressState, company?.Country]
      .filter(Boolean)
      .join(', ') || null;
  const phone =
    company?.mobileNumber ||
    company?.phone ||
    company?.mobile ||
    company?.phoneNumber ||
    null;
  const email =
    company?.emailId || company?.email || company?.emailAddress || null;
  const website =
    company?.Website ||
    company?.website ||
    company?.websiteUrl ||
    company?.websiteURL ||
    company?.web ||
    null;

  const titleBlockStyle = getTitleBlockStyle(layout.titleBlock.position);
  const showQR = layout.qr?.show !== false;
  const contactPos = layout.contactSection.position; // 'left' | 'right' | 'center'

  const ContactItems = () => (
    <>
      {phone && (
        <View
          style={[
            styles.contactRow,
            contactPos === 'center' && { justifyContent: 'center' },
          ]}
        >
          <Ionicons
            name="call-outline"
            size={layout.contactSection.iconSize}
            color={theme.contactIconColor}
          />
          <Text
            style={[
              styles.contactText,
              {
                color: theme.contactTextColor,
                fontSize: layout.contactSection.fontSize,
                fontWeight: layout.contactSection.fontWeight,
              },
            ]}
            numberOfLines={1}
          >
            {phone}
          </Text>
        </View>
      )}
      {email && (
        <View
          style={[
            styles.contactRow,
            contactPos === 'center' && { justifyContent: 'center' },
          ]}
        >
          <Ionicons
            name="mail-outline"
            size={layout.contactSection.iconSize}
            color={theme.contactIconColor}
          />
          <Text
            style={[
              styles.contactText,
              {
                color: theme.contactTextColor,
                fontSize: layout.contactSection.fontSize,
                fontWeight: layout.contactSection.fontWeight,
              },
            ]}
            numberOfLines={1}
          >
            {email}
          </Text>
        </View>
      )}
      {website && (
        <View
          style={[
            styles.contactRow,
            contactPos === 'center' && { justifyContent: 'center' },
          ]}
        >
          <Ionicons
            name="globe-outline"
            size={layout.contactSection.iconSize}
            color={theme.contactIconColor}
          />
          <Text
            style={[
              styles.contactText,
              {
                color: theme.contactTextColor,
                fontSize: layout.contactSection.fontSize,
                fontWeight: layout.contactSection.fontWeight,
              },
            ]}
            numberOfLines={1}
          >
            {website}
          </Text>
        </View>
      )}
      {address && (
        <View
          style={[
            styles.contactRow,
            contactPos === 'center' && { justifyContent: 'center' },
          ]}
        >
          <Ionicons
            name="location-outline"
            size={layout.contactSection.iconSize}
            color={theme.contactIconColor}
          />
          <Text
            style={[
              styles.contactText,
              {
                color: theme.contactTextColor,
                fontSize: layout.contactSection.fontSize,
                fontWeight: layout.contactSection.fontWeight,
              },
            ]}
            numberOfLines={2}
          >
            {address}
          </Text>
        </View>
      )}
    </>
  );

  return (
    <ImageBackground
      source={image}
      style={[styles.card, { width: CARD_WIDTH, height: CARD_HEIGHT }]}
      imageStyle={styles.cardBgImage}
      resizeMode="cover"
    >
      {/* Title block — position controlled by layout */}
      <View
        style={[titleBlockStyle, { alignItems: layout.titleBlock.alignment }]}
      >
        <Text
          style={[
            styles.cardName,
            {
              color: theme.companyNameColor,
              fontSize: layout.companyName.fontSize,
              fontWeight: layout.companyName.fontWeight,
              letterSpacing: layout.companyName.letterSpacing,
              textAlign:
                layout.titleBlock.alignment === 'center'
                  ? 'center'
                  : layout.titleBlock.alignment === 'flex-start'
                  ? 'left'
                  : 'right',
            },
          ]}
          numberOfLines={1}
        >
          {name}
        </Text>
        <Text
          style={[
            styles.cardJobTitle,
            {
              color: theme.jobTitleColor,
              fontSize: layout.jobTitle.fontSize,
              fontWeight: layout.jobTitle.fontWeight,
              letterSpacing: layout.jobTitle.letterSpacing,
            },
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>
        <View
          style={[
            styles.cardTitleLine,
            { backgroundColor: theme.titleLineColor },
          ]}
        />
      </View>

      {/* Bottom contact section — layout depends on contactPos */}
      <View style={styles.cardBottom}>
        {contactPos === 'center' ? (
          // Centered layout — no QR, full width centered
          <View style={[styles.contactSection, { alignItems: 'center' }]}>
            <ContactItems />
          </View>
        ) : contactPos === 'right' ? (
          // QR on right, contact on left
          <>
            <View style={[styles.contactSection, { marginRight: 0 }]}>
              <ContactItems />
            </View>
            {showQR && (
              <View
                style={[styles.qrSection, { marginRight: 0, marginLeft: 10 }]}
              >
                <QRPlaceholder size={CARD_HEIGHT * 0.34} theme={theme} />
              </View>
            )}
          </>
        ) : (
          // Default: QR on left, contact on right
          <>
            {showQR && (
              <View style={styles.qrSection}>
                <QRPlaceholder size={CARD_HEIGHT * 0.34} theme={theme} />
              </View>
            )}
            <View style={styles.contactSection}>
              <ContactItems />
            </View>
          </>
        )}
      </View>
    </ImageBackground>
  );
};

// ══════════════════════════════════════════════════════════════════
//  Template Section (one image + its company carousel)
// ══════════════════════════════════════════════════════════════════
const TemplateSection = ({
  template,
  companies,
  selectedCompanyId,
  fadeAnim,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);

  const getItemLayout = useCallback(
    (_, index) => ({ length: ITEM_WIDTH, offset: ITEM_WIDTH * index, index }),
    [],
  );
  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== null) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const goToPrev = () => {
    if (currentIndex > 0) {
      const idx = currentIndex - 1;
      flatListRef.current?.scrollToIndex({ index: idx, animated: true });
      setCurrentIndex(idx);
    }
  };
  const goToNext = () => {
    if (currentIndex < companies.length - 1) {
      const idx = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: idx, animated: true });
      setCurrentIndex(idx);
    }
  };

  const renderCard = useCallback(
    ({ item }) => (
      <Animated.View style={[styles.cardWrapper, { opacity: fadeAnim }]}>
        <BusinessCard company={item} template={template} />
      </Animated.View>
    ),
    [fadeAnim, template],
  );

  return (
    <View style={styles.templateSection}>
      <View style={styles.templateHeader}>
        <View style={styles.templateLabelRow}>
          <View
            style={[
              styles.templateColorDot,
              { backgroundColor: template.theme.companyNameColor },
            ]}
          />
          <Text style={styles.templateLabel}>{template.label}</Text>
        </View>
        {companies.length > 0 && (
          <View style={[styles.cardCounter, { backgroundColor: '#1a3a3a' }]}>
            <Text
              style={[
                styles.cardCounterText,
                { color: template.theme.companyNameColor },
              ]}
            >
              {currentIndex + 1} / {companies.length}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.carouselContainer}>
        <FlatList
          ref={flatListRef}
          data={companies}
          keyExtractor={(item, index) => `${template.id}-${item._id || index}`}
          renderItem={renderCard}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={ITEM_WIDTH}
          snapToAlignment="start"
          decelerationRate="fast"
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          getItemLayout={getItemLayout}
          initialNumToRender={2}
          maxToRenderPerBatch={2}
          windowSize={3}
          removeClippedSubviews
        />

        {companies.length > 1 && (
          <TouchableOpacity
            style={[
              styles.arrowBtn,
              styles.arrowLeft,
              currentIndex === 0 && styles.arrowDisabled,
            ]}
            onPress={goToPrev}
            disabled={currentIndex === 0}
            activeOpacity={0.8}
          >
            <Ionicons
              name="chevron-back"
              size={22}
              color={currentIndex === 0 ? '#ccc' : '#1a5050'}
            />
          </TouchableOpacity>
        )}
        {companies.length > 1 && (
          <TouchableOpacity
            style={[
              styles.arrowBtn,
              styles.arrowRight,
              currentIndex === companies.length - 1 && styles.arrowDisabled,
            ]}
            onPress={goToNext}
            disabled={currentIndex === companies.length - 1}
            activeOpacity={0.8}
          >
            <Ionicons
              name="chevron-forward"
              size={22}
              color={currentIndex === companies.length - 1 ? '#ccc' : '#1a5050'}
            />
          </TouchableOpacity>
        )}

        {companies.length > 1 && (
          <View style={styles.dotsRow}>
            {companies.map((c, i) => (
              <TouchableOpacity
                key={`${template.id}-dot-${c._id || i}`}
                onPress={() => {
                  flatListRef.current?.scrollToIndex({
                    index: i,
                    animated: true,
                  });
                  setCurrentIndex(i);
                }}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              >
                <View
                  style={[
                    styles.dot,
                    i === currentIndex && [
                      styles.dotActive,
                      { backgroundColor: template.theme.companyNameColor },
                    ],
                    selectedCompanyId &&
                      c._id === selectedCompanyId &&
                      styles.dotSelected,
                  ]}
                />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

// ══════════════════════════════════════════════════════════════════
//  Supporting components
// ══════════════════════════════════════════════════════════════════
const DetailRow = ({ icon, label, value }) => (
  <View style={styles.detailRow}>
    <View style={styles.detailIconWrap}>
      <Ionicons name={icon} size={15} color="#8b77ff" />
    </View>
    <View style={styles.detailTextWrap}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} numberOfLines={2}>
        {value || 'Not provided'}
      </Text>
    </View>
  </View>
);

const LoadingSkeleton = () => (
  <View style={styles.skeletonContainer}>
    <View style={[styles.skeletonCard, { height: CARD_HEIGHT }]} />
    {[1, 2, 3].map(i => (
      <View key={i} style={styles.skeletonRow}>
        <View style={styles.skeletonIcon} />
        <View style={styles.skeletonText} />
      </View>
    ))}
  </View>
);

// ══════════════════════════════════════════════════════════════════
//  Main Screen
// ══════════════════════════════════════════════════════════════════
export default function BusinessCardsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { selectedClient, selectedClientId } = route.params || {};

  const [companies, setCompanies] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);
  const [selfUserData, setSelfUserData] = useState(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      const loadUser = async () => {
        try {
          const userStr = await AsyncStorage.getItem('user');
          if (userStr) {
            const parsed = JSON.parse(userStr);
            setCurrentUser(parsed);
          }
        } catch (e) {
          console.error('Error loading user:', e);
        }
      };
      loadUser();
    }, []),
  );

  const fetchCompanies = useCallback(async () => {
    if (!isMounted.current) return;
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');
      const clientId = selectedClientId || selectedClient?._id;
      const url = clientId
        ? `${BASE_URL}/api/clients/${clientId}`
        : `${BASE_URL}/api/companies/my`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch companies');
      const data = await response.json();
      const arr = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.companies)
        ? data.companies
        : [];

      if (!isMounted.current) return;
      setCompanies(arr);
      const savedId = await AsyncStorage.getItem('selectedCompanyId');
      setSelectedCompanyId(savedId && savedId !== 'all' ? savedId : null);
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }).start();
    } catch (error) {
      console.error('Error fetching companies:', error);
      if (isMounted.current)
        Alert.alert('Error', 'Failed to load company data. Please try again.');
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  }, [selectedClient?._id, selectedClientId, fadeAnim]);

  useFocusEffect(
    useCallback(() => {
      fetchCompanies();
      fetchSelfUserData();
    }, [fetchCompanies, fetchSelfUserData]),
  );

  const fetchSelfUserData = useCallback(async () => {
    try {
      if (!isOwnProfile) return;

      const token = await AsyncStorage.getItem('token');
      const roleStored = await AsyncStorage.getItem('role');
      const normalizedRole = (roleStored ?? '').toLowerCase();

      if (normalizedRole !== 'user' && normalizedRole !== 'admin') return;

      const res = await fetch(`${BASE_URL}/api/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();

      const base64Decode = str => {
        const chars =
          'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
        let output = '';
        str = String(str).replace(/=+$/, '');
        for (let bc = 0, bs, buffer, idx = 0; (buffer = str.charAt(idx++)); ) {
          buffer = chars.indexOf(buffer);
          if (buffer === -1) continue;
          bs = bc % 4 ? bs * 64 + buffer : buffer;
          if (bc++ % 4)
            output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6)));
        }
        return output;
      };

      const base64Url = token.split('.')[1];
      const payload = JSON.parse(base64Decode(base64Url));
      const currentUserId = payload.userId || payload.id || payload._id;

      const self = Array.isArray(data)
        ? data.find(u => u._id === currentUserId || u.userId === currentUserId)
        : null;

      if (self && isMounted.current) setSelfUserData(self);
    } catch (e) {
      console.error('fetchSelfUserData error:', e);
    }
  }, [isOwnProfile]);

  const isOwnProfile = !selectedClient && !selectedClientId;
  const clientData = isOwnProfile
    ? selfUserData || currentUser
    : selectedClient || {};
  const clientName =
    clientData?.userName ||
    clientData?.contactName ||
    clientData?.name ||
    clientData?.username ||
    'Client';
  const clientEmail = clientData?.email || null;
  const clientPhone =
    clientData?.contactNumber ||
    clientData?.phone ||
    clientData?.mobile ||
    clientData?.mobileNumber ||
    clientData?.phoneNumber ||
    clientData?.Phone ||
    clientData?.contactPhone ||
    clientData?.contactMobile ||
    clientData?.contact ||
    null;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.screenHeader}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#1a3a3a" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.screenTitle}>Profile Information</Text>
        </View>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.clientCard}>
          <View style={styles.clientCardHeader}>
            <View style={styles.clientAvatar}>
              <Ionicons name="person-outline" size={22} color="#8b77ff" />
            </View>
            <View style={styles.clientHeaderText}>
              <View style={styles.clientBadge}>
                <Text style={styles.clientBadgeText}>
                  {isOwnProfile ? 'My Profile' : 'Client Profile'}
                </Text>
              </View>
              <Text style={styles.clientName}>{clientName}</Text>
              <Text style={styles.clientSub}>Account holder details</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.clientDetails}>
            <DetailRow icon="mail-outline" label="Email" value={clientEmail} />
            <DetailRow icon="call-outline" label="Phone" value={clientPhone} />
            <DetailRow
              icon="business-outline"
              label="Total Companies"
              value={
                isLoading
                  ? 'Loading...'
                  : `${companies.length} compan${
                      companies.length !== 1 ? 'ies' : 'y'
                    }`
              }
            />
          </View>
        </View>

        <View style={styles.allTemplatesSection}>
          <View>
            <Text style={styles.sectionHeading}>Company Cards</Text>
            <Text style={styles.sectionSubHeading}>
              {CARD_TEMPLATES.length} template
              {CARD_TEMPLATES.length !== 1 ? 's' : ''} · each showing{' '}
              {isLoading
                ? '...'
                : `${companies.length} compan${
                    companies.length !== 1 ? 'ies' : 'y'
                  }`}
            </Text>
          </View>

          {isLoading ? (
            <LoadingSkeleton />
          ) : companies.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="card-outline" size={36} color="#8b77ff" />
              </View>
              <Text style={styles.emptyText}>No Companies Found</Text>
              <Text style={styles.emptySubText}>
                No companies are assigned to this account yet.
              </Text>
            </View>
          ) : (
            CARD_TEMPLATES.map(template => (
              <TemplateSection
                key={template.id}
                template={template}
                companies={companies}
                selectedCompanyId={selectedCompanyId}
                fadeAnim={fadeAnim}
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ══════════════════════════════════════════════════════════════════
//  Styles
// ══════════════════════════════════════════════════════════════════
const TEAL = '#0d3535';
const GOLD = '#c8a84b';

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f0f0ea' },
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backBtn: { padding: 6, borderRadius: 8 },
  headerCenter: { alignItems: 'center' },
  screenTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEAL,
    letterSpacing: 0.3,
  },
  screenSubtitle: { fontSize: 12, color: '#94a3b8', marginTop: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: 10, gap: 20, paddingBottom: 40 },

  clientCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
    }),
  },
  clientCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  clientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e4dfff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#d3cbff',
  },
  clientHeaderText: { flex: 1, gap: 2 },
  clientBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#f0edff',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 2,
  },
  clientBadgeText: { fontSize: 10, fontWeight: '700', color: '#8b77ff' },
  clientName: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  clientSub: { fontSize: 11, color: '#64748b' },
  divider: { height: 1, backgroundColor: '#e0daff', marginVertical: 12 },
  clientDetails: { gap: 8 },

  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f7f7ff',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 10,
    gap: 8,
  },
  detailIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ede9ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  detailTextWrap: { flex: 1 },
  detailLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
    marginTop: 1,
  },

  allTemplatesSection: { gap: 16 },
  sectionHeading: { fontSize: 18, fontWeight: '700', color: TEAL },
  sectionSubHeading: { fontSize: 12, color: '#94a3b8', marginTop: 2 },

  templateSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
    }),
  },
  templateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  templateLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  templateColorDot: { width: 10, height: 10, borderRadius: 5 },
  templateLabel: { fontSize: 15, fontWeight: '700', color: TEAL },
  cardCounter: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  cardCounterText: { fontSize: 11, fontWeight: '700' },

  carouselContainer: { position: 'relative', paddingBottom: 4 },
  cardWrapper: {
    width: CARD_WIDTH,
    marginRight: CARD_GAP,
    alignItems: 'center',
  },

  arrowBtn: {
    position: 'absolute',
    top: CARD_HEIGHT / 2 - 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.18,
        shadowRadius: 4,
      },
      android: { elevation: 6 },
    }),
  },
  arrowLeft: { left: -10 },
  arrowRight: { right: -10 },
  arrowDisabled: {
    backgroundColor: '#f1f5f9',
    ...Platform.select({
      ios: { shadowOpacity: 0 },
      android: { elevation: 0 },
    }),
  },

  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#cbd5e1' },
  dotActive: { width: 20, borderRadius: 3 },
  dotSelected: { backgroundColor: GOLD, width: 8, height: 8, borderRadius: 4 },

  card: { borderRadius: 14, overflow: 'hidden' },
  cardBgImage: { borderRadius: 14 },
  cardName: {
    fontWeight: '700',
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  cardJobTitle: { marginTop: 2 },
  cardTitleLine: { width: 52, height: 1, opacity: 0.6, marginTop: 4 },
  cardBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '52%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
    paddingRight: 14,
    paddingBottom: 10,
    paddingTop: 6,
  },
  qrSection: {
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactSection: { flex: 1, justifyContent: 'center', gap: 5 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  contactText: { flex: 1 },

  qrBox: {
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    padding: 4,
  },
  qrInner: { flex: 1, width: '100%', justifyContent: 'space-between' },
  qrTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  qrBlock: { width: '42%', height: 12, borderRadius: 2 },
  qrGap: { flex: 1 },
  qrMidRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  qrSmall: { width: '28%', height: 8, borderRadius: 1, opacity: 0.6 },

  skeletonContainer: { gap: 12 },
  skeletonCard: {
    width: CARD_WIDTH,
    borderRadius: 14,
    backgroundColor: '#e2e8f0',
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f7f7ff',
    borderRadius: 10,
    padding: 10,
  },
  skeletonIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e2e8f0',
  },
  skeletonText: {
    flex: 1,
    height: 14,
    borderRadius: 6,
    backgroundColor: '#e2e8f0',
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    gap: 10,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#f0edff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#d3cbff',
  },
  emptyText: { fontSize: 16, color: '#1a3a3a', fontWeight: '700' },
  emptySubText: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    maxWidth: '70%',
  },
});
