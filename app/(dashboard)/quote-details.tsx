import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text,
  BackHandler,
  ActivityIndicator,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Typography } from '../../constants/Typography';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuthContext } from '../../context/AuthContext';
import { formatOrderDate } from '../../lib/formatters';
import { fetchQuoteById, type QuoteDetail, type QuoteContact } from '../../services/api/quote-list.service';

// ─── Theme ────────────────────────────────────────────────────────────────────

const PRIMARY     = '#0F172A';
const SECONDARY   = '#64748B';
const PAGE_BG     = '#F8FAFC';
const CARD_BG     = '#FFFFFF';
const CARD_BORDER = '#E2E8F0';
const GREEN       = '#16A34A';
const GREEN_BG    = '#DCFCE7';

const hairline = StyleSheet.hairlineWidth > 0 ? StyleSheet.hairlineWidth : 0.5;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const stripQuotePrefix = (raw: string | null | undefined): string => {
  if (!raw) return 'N/A';
  return raw.replace(/^[A-Za-z\-]+/, '').trim() || raw.trim();
};

const safeDisplayString = (val: any): string => {
  if (val === null || val === undefined) return 'N/A';
  if (typeof val === 'string') return val.trim() || 'N/A';
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (typeof val === 'object') {
    if (val.name) return String(val.name);
    if (val.label) return String(val.label);
    if (val.categoryName) return String(val.categoryName);
    return JSON.stringify(val);
  }
  return String(val);
};

const formatPhone = (raw: string | null | undefined): string => {
  if (!raw) return 'N/A';
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  return raw;
};

// Formats raw API key to Title Case (first letter capital, rest lowercase per word)
const formatRawKeyToTitleCase = (key: string): string => {
  if (!key) return '';
  const spaced = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/_/g, ' ');

  return spaced
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
};

// ─── Contact Info Modal Component ─────────────────────────────────────────────

const ContactModal = ({
  visible,
  onClose,
  quoteNo,
  contacts,
}: {
  visible: boolean;
  onClose: () => void;
  quoteNo: string;
  contacts: QuoteContact[];
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalCard}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderLeft}>
                  <View style={styles.modalIconCircle}>
                    <Ionicons name="person-outline" size={20} color="#0F172A" />
                  </View>
                  <View>
                    <Text style={styles.modalTitle}>Contact Information</Text>
                    <Text style={styles.modalSubTitle}>Quote {quoteNo}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={onClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              {/* Info Grid */}
              <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                {contacts.length === 0 ? (
                  <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                    <Text style={{ fontSize: 13, color: SECONDARY, fontFamily: Typography.body }}>
                      No contact details available
                    </Text>
                  </View>
                ) : (
                  contacts.map((c, idx) => {
                    const fullName = [c.firstName, c.lastName].filter(Boolean).map(safeDisplayString).join(' ') || 'N/A';
                    return (
                      <View
                        key={idx}
                        style={[
                          styles.modalBodyGrid,
                          idx < contacts.length - 1 ? { borderBottomWidth: 1, borderBottomColor: '#E2E8F0', paddingBottom: 12, marginBottom: 12 } : null,
                        ]}
                      >
                        <View style={styles.modalGridRow}>
                          <Text style={styles.gridKey}>Contact Name</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={styles.gridValueBold}>{fullName}</Text>
                            {c.isPrimary ? (
                              <View style={styles.primaryBadge}>
                                <Text style={styles.primaryBadgeText}>Primary</Text>
                              </View>
                            ) : null}
                          </View>
                        </View>
                        {c.jobTitle ? (
                          <View style={styles.modalGridRow}>
                            <Text style={styles.gridKey}>Job Title</Text>
                            <Text style={styles.gridValue}>{safeDisplayString(c.jobTitle)}</Text>
                          </View>
                        ) : null}
                        {c.phone1 ? (
                          <View style={styles.modalGridRow}>
                            <Text style={styles.gridKey}>Phone</Text>
                            <Text style={styles.gridValue}>{formatPhone(safeDisplayString(c.phone1))}</Text>
                          </View>
                        ) : null}
                        {c.email ? (
                          <View style={styles.modalGridRow}>
                            <Text style={styles.gridKey}>Email</Text>
                            <Text style={styles.gridValue}>{safeDisplayString(c.email)}</Text>
                          </View>
                        ) : null}
                      </View>
                    );
                  })
                )}
              </ScrollView>

              {/* Close Button */}
              <TouchableOpacity style={styles.primaryActionBtn} onPress={onClose} activeOpacity={0.85}>
                <Text style={styles.primaryActionBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// ─── All Specifications Modal Component (Exact Response Keys & Values) ─────────

const AllSpecificationsModal = ({
  visible,
  onClose,
  quoteNo,
  isItar,
  rawEntries,
}: {
  visible: boolean;
  onClose: () => void;
  quoteNo: string;
  isItar: boolean;
  rawEntries: { label: string; rawKey: string; value: string }[];
}) => {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View
        style={[
          styles.specsModalOverlay,
          {
            paddingTop: Math.max(insets.top + 16, 24),
            paddingBottom: Math.max(insets.bottom + 16, 24),
          },
        ]}
      >
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={[styles.specsModalCard, { width: '96%', maxWidth: 480, maxHeight: '88%' }]}>
          {/* Header */}
          <View style={styles.specsModalHeader}>
            <View style={styles.modalHeaderLeft}>
              <View style={styles.modalIconCircle}>
                <Ionicons name="list-outline" size={20} color="#0F172A" />
              </View>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.modalTitle}>All Specifications</Text>
                  {isItar ? (
                    <View style={styles.itarBadge}>
                      <Ionicons name="shield-checkmark" size={10} color="#DC2626" />
                      <Text style={styles.itarBadgeText}>ITAR</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.modalSubTitle}>Quote {quoteNo}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.specsCloseBtn}
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Scrollable Raw Specs List */}
          <ScrollView
            style={styles.specsScrollView}
            contentContainerStyle={styles.specsScrollContent}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
            bounces={true}
          >
            {rawEntries.length === 0 ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ fontSize: 13, color: SECONDARY, fontFamily: Typography.body }}>
                  No specifications found in response
                </Text>
              </View>
            ) : (
              <View style={styles.cardGroup}>
                {rawEntries.map((item, index) => (
                  <View
                    key={index}
                    style={[
                      styles.specRowItem,
                      index === rawEntries.length - 1 ? { borderBottomWidth: 0 } : null,
                    ]}
                  >
                    <Text style={styles.specRowKey}>{item.label}</Text>
                    <Text style={styles.specRowValueBold}>{item.value}</Text>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          {/* Footer Close Button */}
          <View style={styles.specsModalFooter}>
            <TouchableOpacity style={styles.primaryActionBtn} onPress={onClose} activeOpacity={0.85}>
              <Text style={styles.primaryActionBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ─── Quote Message Full Modal Component ────────────────────────────────────────

const QuoteMessageModal = ({
  visible,
  onClose,
  quoteNo,
  message,
}: {
  visible: boolean;
  onClose: () => void;
  quoteNo: string;
  message: string;
}) => {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View
        style={[
          styles.specsModalOverlay,
          {
            paddingTop: Math.max(insets.top + 16, 24),
            paddingBottom: Math.max(insets.bottom + 16, 24),
          },
        ]}
      >
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={[styles.specsModalCard, { width: '94%', maxWidth: 480, maxHeight: '82%' }]}>
          {/* Header */}
          <View style={styles.specsModalHeader}>
            <View style={styles.modalHeaderLeft}>
              <View style={styles.modalIconCircle}>
                <Ionicons name="chatbubble-ellipses-outline" size={20} color="#0F172A" />
              </View>
              <View>
                <Text style={styles.modalTitle}>Full Quote Message</Text>
                <Text style={styles.modalSubTitle}>Quote {quoteNo}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.specsCloseBtn}
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Message Content */}
          <ScrollView
            style={styles.specsScrollView}
            contentContainerStyle={styles.specsScrollContent}
            showsVerticalScrollIndicator={true}
          >
            <View style={styles.messageContentCardFull}>
              <Text style={styles.messageContentTextFull}>{message}</Text>
            </View>
          </ScrollView>

          {/* Footer Close Button */}
          <View style={styles.specsModalFooter}>
            <TouchableOpacity style={styles.primaryActionBtn} onPress={onClose} activeOpacity={0.85}>
              <Text style={styles.primaryActionBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ─── Main Screen Component ────────────────────────────────────────────────────

export default function QuoteDetailsScreen() {
  const params = useLocalSearchParams<{ quoteId?: string }>();
  const { user } = useAuthContext();
  const token = (user as any)?.token ?? null;

  const [quote, setQuote] = useState<QuoteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [specsModalVisible, setSpecsModalVisible] = useState(false);
  const [messageModalVisible, setMessageModalVisible] = useState(false);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/quotes');
  }, []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleBack();
      return true;
    });
    return () => sub.remove();
  }, [handleBack]);

  useEffect(() => {
    const id = params.quoteId;
    if (!id) {
      setError('No quote ID provided');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    fetchQuoteById(id, { token })
      .then((data) => {
        setQuote(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err?.message ?? 'Failed to load quote details');
        setLoading(false);
      });
  }, [params.quoteId, token]);

  const isConverted = quote?.orderId != null && quote.orderId > 0;
  const quoteNo = stripQuotePrefix(quote?.quoteNo);

  // Extract raw entries directly from response for the specs modal
  const rawSpecsEntries = useMemo(() => {
    if (!quote?.quoteSpecifications || quote.quoteSpecifications.length === 0) return [];
    const specObj = quote.quoteSpecifications[0];
    if (!specObj || typeof specObj !== 'object') return [];

    return Object.entries(specObj).map(([key, val]) => ({
      label: formatRawKeyToTitleCase(key),
      rawKey: key,
      value: val === null || val === undefined ? 'null' : String(val),
    }));
  }, [quote?.quoteSpecifications]);

  // Check ITAR restriction
  const isItar = useMemo(() => {
    if (!quote?.quoteSpecifications || quote.quoteSpecifications.length === 0) return false;
    const firstSpec = quote.quoteSpecifications[0] as any;
    const val = String(firstSpec?.ITAR ?? firstSpec?.itar ?? '').toLowerCase().trim();
    return val === '1' || val === 'yes' || val === 'true';
  }, [quote?.quoteSpecifications]);

  // Compute inline core specs: ONLY Layers and Board Size
  const inlineLayers = useMemo(() => {
    if (!quote?.quoteSpecifications || quote.quoteSpecifications.length === 0) return 'N/A';
    const spec = quote.quoteSpecifications[0] as any;
    if (!spec) return 'N/A';
    return String(spec.layer ?? spec.Layer ?? spec.layerCount ?? 'N/A');
  }, [quote?.quoteSpecifications]);

  const inlineBoardSize = useMemo(() => {
    if (!quote?.quoteSpecifications || quote.quoteSpecifications.length === 0) return 'N/A';
    const spec = quote.quoteSpecifications[0] as any;
    if (!spec) return 'N/A';
    if (spec.dimensionl != null && spec.dimensionb != null) {
      return `${spec.dimensionl} × ${spec.dimensionb} mils`;
    }
    if (spec.BoardSize || spec.boardSize) {
      return String(spec.BoardSize || spec.boardSize);
    }
    return 'N/A';
  }, [quote?.quoteSpecifications]);

  // Primary Contact Name for the table row
  const primaryContactName = useMemo(() => {
    if (!quote?.quoteContacts || quote.quoteContacts.length === 0) return 'N/A';
    const primary = quote.quoteContacts.find((c) => c.isPrimary) || quote.quoteContacts[0];
    return [primary.firstName, primary.lastName].filter(Boolean).map(safeDisplayString).join(' ') || 'N/A';
  }, [quote?.quoteContacts]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack} hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}>
            <Ionicons name="arrow-back" size={20} color={PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.headerTitleLeft}>Quote Details</Text>
        </View>
        <View style={styles.centeredWrap}>
          <ActivityIndicator color={PRIMARY} size="large" />
          <Text style={styles.loadingText}>Loading quote details…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !quote) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack} hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}>
            <Ionicons name="arrow-back" size={20} color={PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.headerTitleLeft}>Quote Details</Text>
        </View>
        <View style={styles.centeredWrap}>
          <Ionicons name="warning-outline" size={38} color={SECONDARY} />
          <Text style={styles.errorTitle}>{error ?? 'Quote not found'}</Text>
          <TouchableOpacity style={styles.primaryActionBtn} onPress={handleBack}>
            <Text style={styles.primaryActionBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
        >
          <Ionicons name="arrow-back" size={20} color={PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitleLeft}>Quote Details</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Hero Section */}
        <View style={styles.heroSectionCentered}>
          <Text style={styles.heroCompanyNameCentered} numberOfLines={1}>
            {quote.companyName || 'N/A'}
          </Text>
          <Text style={styles.heroOrderNoCentered} numberOfLines={1}>
            {quoteNo}
          </Text>
          <View style={styles.heroStatusRowCentered}>
            <Text style={styles.heroAmountTextCentered}>
              {formatOrderDate(quote.quoteDate)}
            </Text>
            <Text style={styles.heroDotTextCentered}> · </Text>
            <Text style={[styles.heroStatusTextCentered, isConverted ? styles.statusOpen : styles.statusOther]}>
              {isConverted ? 'Converted' : 'Pending'}
            </Text>
          </View>
          {isConverted && quote.orderNo ? (
            <Text style={styles.heroPartNoTextCentered}>
              Order #{quote.orderNo}
            </Text>
          ) : null}
        </View>

        {/* Section 1: QUOTE OVERVIEW */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionHeaderTitle}>QUOTE</Text>
          <View style={styles.cardGroup}>
            <View style={styles.rowItem}>
              <View style={styles.rowLeft}>
                <Ionicons name="document-text-outline" size={17} color={SECONDARY} style={styles.rowIcon} />
                <Text style={styles.rowKey}>Quote No</Text>
              </View>
              <Text style={styles.rowValue}>{quoteNo}</Text>
            </View>

            <View style={styles.rowItem}>
              <View style={styles.rowLeft}>
                <Ionicons name="calendar-outline" size={17} color={SECONDARY} style={styles.rowIcon} />
                <Text style={styles.rowKey}>Quote Date</Text>
              </View>
              <Text style={styles.rowValue}>{formatOrderDate(quote.quoteDate)}</Text>
            </View>

            <View style={styles.rowItem}>
              <View style={styles.rowLeft}>
                <Ionicons name="business-outline" size={17} color={SECONDARY} style={styles.rowIcon} />
                <Text style={styles.rowKey}>Company</Text>
              </View>
              <Text style={styles.rowValue}>{quote.companyName || 'N/A'}</Text>
            </View>

            {quote.companyCode ? (
              <View style={styles.rowItem}>
                <View style={styles.rowLeft}>
                  <Ionicons name="barcode-outline" size={17} color={SECONDARY} style={styles.rowIcon} />
                  <Text style={styles.rowKey}>Company Code</Text>
                </View>
                <Text style={styles.rowValue}>{quote.companyCode}</Text>
              </View>
            ) : null}

            <View style={styles.rowItem}>
              <View style={styles.rowLeft}>
                <Ionicons name="person-outline" size={17} color={SECONDARY} style={styles.rowIcon} />
                <Text style={styles.rowKey}>Salesperson</Text>
              </View>
              <Text style={styles.rowValue}>{quote.salesPersonName || 'N/A'}</Text>
            </View>

            {quote.customerCategory ? (
              <View style={styles.rowItem}>
                <View style={styles.rowLeft}>
                  <Ionicons name="person-circle-outline" size={17} color={SECONDARY} style={styles.rowIcon} />
                  <Text style={styles.rowKey}>Category</Text>
                </View>
                <View style={styles.customerCategoryPill}>
                  <Text style={styles.customerCategoryText}>{safeDisplayString(quote.customerCategory)}</Text>
                </View>
              </View>
            ) : null}

            {/* Contact Row directly below Category with arrow */}
            <TouchableOpacity
              style={[styles.rowItem, !isConverted ? { borderBottomWidth: 0 } : null]}
              onPress={() => setContactModalVisible(true)}
              activeOpacity={0.7}
            >
              <View style={styles.rowLeft}>
                <Ionicons name="call-outline" size={17} color={SECONDARY} style={styles.rowIcon} />
                <Text style={styles.rowKey}>Contact</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.rowValue}>{primaryContactName}</Text>
                <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
              </View>
            </TouchableOpacity>

            {isConverted ? (
              <View style={[styles.rowItem, { borderBottomWidth: 0 }]}>
                <View style={styles.rowLeft}>
                  <Ionicons name="checkmark-done-outline" size={17} color={GREEN} style={styles.rowIcon} />
                  <Text style={styles.rowKey}>Order Link</Text>
                </View>
                <Text style={[styles.rowValue, { color: GREEN }]}>Order #{quote.orderNo ?? ''}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Section 2: SPECIFICATIONS (Displays ONLY Layers and Board Size inline) */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.sectionHeaderTitle}>SPECIFICATIONS</Text>
              {isItar ? (
                <View style={styles.itarBadge}>
                  <Ionicons name="shield-checkmark" size={12} color="#DC2626" />
                  <Text style={styles.itarBadgeText}>ITAR RESTRICTED</Text>
                </View>
              ) : null}
            </View>

            <TouchableOpacity
              style={styles.viewAllHeaderBtn}
              onPress={() => setSpecsModalVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.viewAllHeaderBtnText}>View All</Text>
              <Ionicons name="chevron-forward" size={14} color="#2563EB" />
            </TouchableOpacity>
          </View>

          <View style={styles.cardGroup}>
            <View style={styles.specRowItem}>
              <Text style={styles.specRowKey}>Layers</Text>
              <Text style={styles.specRowValueBold}>{inlineLayers}</Text>
            </View>
            <View style={[styles.specRowItem, { borderBottomWidth: 0 }]}>
              <Text style={styles.specRowKey}>Board Size</Text>
              <Text style={styles.specRowValueBold}>{inlineBoardSize}</Text>
            </View>
          </View>
        </View>

        {/* Section 3: QUOTE MESSAGE (Shows Data Snippet + View Full Message Button) */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionHeaderTitle}>QUOTE MESSAGE</Text>
          <View style={styles.cardGroup}>
            <View style={styles.messageBoxContainer}>
              <View style={styles.messageBoxHeader}>
                <Ionicons name="chatbubble-ellipses-outline" size={16} color="#0F172A" />
                <Text style={styles.messageBoxHeaderTitle}>Message Note</Text>
              </View>

              {quote.quoteMessage ? (
                <View style={styles.messageContentCard}>
                  <Text style={styles.messageContentText} numberOfLines={3} ellipsizeMode="tail">
                    {safeDisplayString(quote.quoteMessage)}
                  </Text>
                  <TouchableOpacity
                    style={styles.viewFullMessageBtn}
                    onPress={() => setMessageModalVisible(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.viewFullMessageBtnText}>View Full Message</Text>
                    <Ionicons name="chevron-forward" size={14} color="#2563EB" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.emptyMessageWrap}>
                  <Ionicons name="chatbox-outline" size={24} color="#CBD5E1" />
                  <Text style={styles.emptyMessageText}>No message attached to this quote.</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Pop-up Modals */}
      <ContactModal
        visible={contactModalVisible}
        onClose={() => setContactModalVisible(false)}
        quoteNo={quoteNo}
        contacts={quote.quoteContacts || []}
      />

      <AllSpecificationsModal
        visible={specsModalVisible}
        onClose={() => setSpecsModalVisible(false)}
        quoteNo={quoteNo}
        isItar={isItar}
        rawEntries={rawSpecsEntries}
      />

      <QuoteMessageModal
        visible={messageModalVisible}
        onClose={() => setMessageModalVisible(false)}
        quoteNo={quoteNo}
        message={safeDisplayString(quote.quoteMessage)}
      />
    </SafeAreaView>
  );
}

// ─── Styles (matches order-details.tsx styles exactly) ─────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: PAGE_BG,
  },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: hairline,
    borderBottomColor: CARD_BORDER,
    backgroundColor: CARD_BG,
  },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleLeft: {
    fontSize: 18,
    fontFamily: Typography.titleSerif,
    fontWeight: '500',
    color: PRIMARY,
    marginLeft: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 36,
    gap: 18,
  },
  centeredWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 24,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: Typography.bodyMedium,
    color: SECONDARY,
  },
  errorTitle: {
    fontSize: 15,
    fontFamily: Typography.headingSemiBold,
    color: PRIMARY,
    textAlign: 'center',
  },

  // Centered Hero section
  heroSectionCentered: {
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  heroCompanyNameCentered: {
    fontSize: 14,
    fontFamily: Typography.headingSemiBold,
    color: '#475569',
    marginBottom: 4,
    textAlign: 'center',
  },
  heroOrderNoCentered: {
    fontSize: 30,
    fontFamily: Typography.headingExtraBold,
    color: '#0F172A',
    letterSpacing: -0.5,
    marginBottom: 6,
    textAlign: 'center',
  },
  heroStatusRowCentered: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAmountTextCentered: {
    fontSize: 15,
    fontFamily: Typography.headingSemiBold,
    color: '#475569',
  },
  heroDotTextCentered: {
    fontSize: 15,
    fontFamily: Typography.headingSemiBold,
    color: '#94A3B8',
  },
  heroStatusTextCentered: {
    fontSize: 15,
    fontFamily: Typography.heading,
  },
  statusOpen: {
    color: GREEN,
  },
  statusOther: {
    color: '#3B82F6',
  },
  heroPartNoTextCentered: {
    fontSize: 13.5,
    fontFamily: Typography.bodyMedium,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },

  // Sections
  sectionWrap: {
    gap: 6,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 2,
  },
  sectionHeaderTitle: {
    fontSize: 12,
    fontFamily: Typography.headingSemiBold,
    color: SECONDARY,
    letterSpacing: 0.8,
    marginLeft: 2,
  },
  viewAllHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  viewAllHeaderBtnText: {
    fontSize: 13,
    fontFamily: Typography.headingSemiBold,
    color: '#2563EB',
    fontWeight: '600',
  },
  itarBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  itarBadgeText: {
    fontSize: 10,
    fontFamily: Typography.headingSemiBold,
    color: '#DC2626',
    letterSpacing: 0.5,
  },
  cardGroup: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    overflow: 'hidden',
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rowIcon: {
    marginRight: 10,
  },
  rowKey: {
    fontSize: 13.5,
    fontFamily: Typography.bodyMedium,
    color: SECONDARY,
  },
  rowValue: {
    fontSize: 13.5,
    fontFamily: Typography.headingSemiBold,
    color: PRIMARY,
    textAlign: 'right',
    maxWidth: '60%',
  },
  customerCategoryPill: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  customerCategoryText: {
    fontSize: 11,
    fontFamily: Typography.headingSemiBold,
    color: '#1D4ED8',
  },

  // Specs Rows
  specRowItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  specRowKey: {
    flex: 1,
    fontSize: 13.5,
    fontFamily: Typography.bodyMedium,
    color: SECONDARY,
    paddingRight: 10,
  },
  specRowValueBold: {
    flex: 1.3,
    fontSize: 13.5,
    fontFamily: Typography.headingSemiBold,
    fontWeight: '700',
    color: PRIMARY,
    textAlign: 'right',
  },

  // Quote Message Container & View Full Message Button
  messageBoxContainer: {
    padding: 16,
  },
  messageBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  messageBoxHeaderTitle: {
    fontSize: 13,
    fontFamily: Typography.headingSemiBold,
    color: PRIMARY,
    fontWeight: '600',
  },
  messageContentCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 3.5,
    borderLeftColor: '#0F172A',
    borderRadius: 8,
    padding: 14,
  },
  messageContentText: {
    fontSize: 13.5,
    fontFamily: Typography.body,
    color: '#1E293B',
    lineHeight: 22,
  },
  viewFullMessageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  viewFullMessageBtnText: {
    fontSize: 13,
    fontFamily: Typography.headingSemiBold,
    color: '#2563EB',
    fontWeight: '600',
  },
  messageContentCardFull: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 16,
  },
  messageContentTextFull: {
    fontSize: 13.5,
    fontFamily: Typography.body,
    color: '#1E293B',
    lineHeight: 22,
  },
  emptyMessageWrap: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 6,
  },
  emptyMessageText: {
    fontSize: 13,
    fontFamily: Typography.body,
    color: SECONDARY,
  },

  // Modals Styling
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '92%',
    maxWidth: 420,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  modalIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: Typography.headingSemiBold,
    color: '#0F172A',
  },
  modalSubTitle: {
    fontSize: 12,
    fontFamily: Typography.bodyMedium,
    color: '#64748B',
    marginTop: 1,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalBodyGrid: {
    gap: 10,
  },
  modalGridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  gridKey: {
    fontSize: 13,
    fontFamily: Typography.bodyMedium,
    color: SECONDARY,
  },
  gridValue: {
    fontSize: 13,
    fontFamily: Typography.bodyMedium,
    color: PRIMARY,
  },
  gridValueBold: {
    fontSize: 13.5,
    fontFamily: Typography.headingSemiBold,
    fontWeight: '700',
    color: PRIMARY,
  },
  primaryBadge: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  primaryBadgeText: {
    fontSize: 10,
    fontFamily: Typography.headingSemiBold,
    color: '#1D4ED8',
  },
  primaryActionBtn: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  primaryActionBtnText: {
    fontSize: 14,
    fontFamily: Typography.headingSemiBold,
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // Specs Modal
  specsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  specsModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
  },
  specsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  specsCloseBtn: {
    padding: 4,
  },
  specsScrollView: {
    flex: 1,
  },
  specsScrollContent: {
    padding: 16,
  },
  specsModalFooter: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
});
