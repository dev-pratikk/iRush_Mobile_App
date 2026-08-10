import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text,
  BackHandler,
  ActivityIndicator,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Typography } from '../../constants/Typography';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuthContext } from '../../context/AuthContext';
import { formatOrderDate } from '../../lib/formatters';
import { fetchQuoteById, type QuoteDetail, type QuoteContact } from '../../services/api/quote-list.service';

// ─── Theme ────────────────────────────────────────────────────────────────────

const PRIMARY   = '#0F172A';
const SECONDARY = '#64748B';
const PAGE_BG   = '#F8FAFC';
const CARD_BG   = '#FFFFFF';
const CARD_BORDER = '#E2E8F0';
const GREEN     = '#16A34A';
const GREEN_BG  = '#DCFCE7';
const DARK_CARD = '#1E293B';

const hairline = StyleSheet.hairlineWidth > 0 ? StyleSheet.hairlineWidth : 0.5;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatPhone = (raw: string | null | undefined): string => {
  if (!raw) return 'N/A';
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  return raw;
};

const formatSpecKey = (key: string): string => {
  if (!key) return '';
  const lower = key.toLowerCase();
  if (lower === 'pcbpartno' || lower === 'partno') return 'Pcb Part No';
  if (lower === 'rev') return 'Revision';
  if (lower === 'itar') return 'ITAR';
  if (lower === 'ipcclass') return 'IPC Class';
  if (lower === 'rohs') return 'RoHS Compliance';
  if (lower === 'smdsided') return 'SMD Placement';
  if (lower === 'smdpitch') return 'SMD Pitch';
  if (lower === 'noofsmdpads') return 'SMD Pads Count';
  if (lower === 'approxholes') return 'Total Hole Count';
  if (lower === 'smallestholes') return 'Smallest Hole Size';
  if (lower === 'mintrace') return 'Min Trace Width';
  if (lower === 'minspace') return 'Min Trace Spacing';
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

// ─── Row Item ─────────────────────────────────────────────────────────────────

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

const RowItem = ({
  icon,
  label,
  value,
  last = false,
  valueColor,
}: {
  icon: string;
  label: string;
  value: any;
  last?: boolean;
  valueColor?: string;
}) => (
  <View style={[styles.rowItem, last ? { borderBottomWidth: 0 } : null]}>
    <View style={styles.rowLeft}>
      <Ionicons name={icon as any} size={17} color={SECONDARY} style={styles.rowIcon} />
      <Text style={styles.rowKey}>{label}</Text>
    </View>
    <Text style={[styles.rowValue, valueColor ? { color: valueColor } : null]} numberOfLines={2}>
      {safeDisplayString(value)}
    </Text>
  </View>
);

// ─── Section Card ─────────────────────────────────────────────────────────────

const SectionCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View style={styles.sectionWrap}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.cardGroup}>{children}</View>
  </View>
);

// ─── Contact Card ─────────────────────────────────────────────────────────────

const ContactCard = ({ contact, last }: { contact: QuoteContact; last: boolean }) => {
  const name = [contact.firstName, contact.lastName].filter(Boolean).map(safeDisplayString).join(' ') || 'N/A';
  return (
    <View style={[styles.contactCard, last && { marginBottom: 0 }]}>
      <View style={styles.contactHeader}>
        <View style={styles.contactAvatar}>
          <Ionicons name="person" size={18} color={PRIMARY} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.contactName}>{name}</Text>
          {contact.jobTitle ? <Text style={styles.contactJob}>{safeDisplayString(contact.jobTitle)}</Text> : null}
        </View>
        {contact.isPrimary && (
          <View style={styles.primaryBadge}>
            <Text style={styles.primaryBadgeText}>Primary</Text>
          </View>
        )}
      </View>
      {contact.email ? (
        <View style={styles.contactMeta}>
          <Ionicons name="mail-outline" size={14} color={SECONDARY} />
          <Text style={styles.contactMetaText}>{safeDisplayString(contact.email)}</Text>
        </View>
      ) : null}
      {contact.phone1 ? (
        <View style={styles.contactMeta}>
          <Ionicons name="call-outline" size={14} color={SECONDARY} />
          <Text style={styles.contactMetaText}>{formatPhone(safeDisplayString(contact.phone1))}</Text>
        </View>
      ) : null}
    </View>
  );
};

// ─── Specs Section ────────────────────────────────────────────────────────────

const IGNORED_SPEC_KEYS = new Set([
  'SPEC_ID', 'specId', 'ORDER_ID', 'orderId', 'QUOTE_ID', 'quoteId',
  'CUSTOMERID', 'customerId', 'CREATED_BY', 'UPDATED_BY',
  'CREATED_DATE', 'UPDATED_DATE', 'IS_ACTIVE', 'is_active', 'DELETED', 'deleted',
]);

const SpecsSection = ({ specs }: { specs: Record<string, unknown>[] }) => {
  const items = useMemo(() => {
    if (!Array.isArray(specs) || specs.length === 0) return [];
    const list: { label: string; value: string }[] = [];
    specs.forEach((specObj) => {
      if (!specObj || typeof specObj !== 'object') return;
      Object.entries(specObj).forEach(([k, v]) => {
        if (IGNORED_SPEC_KEYS.has(k)) return;
        if (v === null || v === undefined) return;
        const label = formatSpecKey(k);
        let val = safeDisplayString(v);
        if (val.toLowerCase() === 'true') val = 'Yes';
        if (val.toLowerCase() === 'false') val = 'No';
        list.push({ label, value: val });
      });
    });
    return list;
  }, [specs]);

  if (items.length === 0) return null;

  return (
    <View style={styles.sectionWrap}>
      <Text style={styles.sectionTitle}>SPECIFICATIONS</Text>
      <View style={styles.cardGroup}>
        {items.map((it, i) => (
          <View
            key={i}
            style={[styles.specRow, i === items.length - 1 ? { borderBottomWidth: 0 } : null]}
          >
            <Text style={styles.specKey}>{it.label}</Text>
            <Text style={styles.specValue}>{it.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function QuoteDetailsScreen() {
  const params = useLocalSearchParams<{ quoteId?: string }>();
  const { user } = useAuthContext();
  const token = (user as any)?.token ?? null;

  const [quote, setQuote] = useState<QuoteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (router.canGoBack()) router.back();
      else router.replace('/quotes');
      return true;
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const id = params.quoteId;
    if (!id) { setError('No quote ID provided'); setLoading(false); return; }

    setLoading(true);
    setError(null);
    fetchQuoteById(id, { token })
      .then((data) => { setQuote(data); setLoading(false); })
      .catch((err) => { setError(err?.message ?? 'Failed to load quote'); setLoading(false); });
  }, [params.quoteId, token]);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/quotes');
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={handleBack} hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}>
            <Ionicons name="arrow-back" size={20} color={PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Quote Details</Text>
        </View>
        <View style={styles.centered}>
          <ActivityIndicator color={PRIMARY} size="large" />
          <Text style={styles.loadingText}>Loading quote…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !quote) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={handleBack} hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}>
            <Ionicons name="arrow-back" size={20} color={PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Quote Details</Text>
        </View>
        <View style={styles.centered}>
          <Ionicons name="warning-outline" size={40} color="#CBD5E1" />
          <Text style={styles.errorTitle}>{error ?? 'Quote not found'}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={handleBack}>
            <Text style={styles.retryBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isConverted = quote.orderId != null && quote.orderId > 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={handleBack}
          hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
        >
          <Ionicons name="arrow-back" size={20} color={PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quote Details</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.hero}>
          <Text style={styles.heroCompany} numberOfLines={2}>{quote.companyName || 'N/A'}</Text>
          <Text style={styles.heroQuoteNo}>Quote #{quote.quoteNo}</Text>
          <View style={styles.heroStatusRow}>
            <View style={[styles.statusPill, isConverted ? styles.pillConverted : styles.pillPending]}>
              <Ionicons
                name={isConverted ? 'checkmark-circle' : 'time-outline'}
                size={13}
                color={isConverted ? GREEN : SECONDARY}
              />
              <Text style={[styles.statusText, isConverted ? styles.statusTextGreen : styles.statusTextGrey]}>
                {isConverted ? 'Converted to Order' : 'Pending'}
              </Text>
            </View>
          </View>
          {isConverted && quote.orderNo ? (
            <Text style={styles.heroOrderLink}>→ Order #{quote.orderNo}</Text>
          ) : null}
        </View>

        {/* Section 1: Overview */}
        <SectionCard title="OVERVIEW">
          <RowItem icon="document-text-outline" label="Quote No" value={`#${quote.quoteNo}`} />
          <RowItem icon="calendar-outline" label="Quote Date" value={formatOrderDate(quote.quoteDate)} />
          <RowItem icon="business-outline" label="Company" value={quote.companyName} />
          <RowItem icon="barcode-outline" label="Company Code" value={quote.companyCode} />
          <RowItem icon="person-outline" label="Salesperson" value={quote.salesPersonName ?? 'N/A'} />
          <RowItem
            icon="people-outline"
            label="Customer Category"
            value={quote.customerCategory ?? 'N/A'}
            last={!isConverted}
          />
          {isConverted ? (
            <RowItem
              icon="checkmark-done-outline"
              label="Order No"
              value={`#${quote.orderNo ?? ''}`}
              valueColor={GREEN}
              last
            />
          ) : null}
        </SectionCard>

        {/* Section 2: Contacts */}
        {quote.quoteContacts && quote.quoteContacts.length > 0 ? (
          <View style={styles.sectionWrap}>
            <Text style={styles.sectionTitle}>CONTACT</Text>
            <View style={styles.cardGroup}>
              {quote.quoteContacts.map((c, i) => (
                <ContactCard key={i} contact={c} last={i === quote.quoteContacts.length - 1} />
              ))}
            </View>
          </View>
        ) : null}

        {/* Section 3: Specifications */}
        {quote.quoteSpecifications && quote.quoteSpecifications.length > 0 ? (
          <SpecsSection specs={quote.quoteSpecifications} />
        ) : null}

        {/* Section 4: Quote Message */}
        {quote.quoteMessage ? (
          <View style={styles.sectionWrap}>
            <Text style={styles.sectionTitle}>QUOTE MESSAGE</Text>
            <View style={styles.cardGroup}>
              <View style={styles.messagePad}>
                <Ionicons name="chatbubble-outline" size={16} color={SECONDARY} style={{ marginBottom: 6 }} />
                <Text style={styles.messageText}>{quote.quoteMessage}</Text>
              </View>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: PAGE_BG },

  // Header
  header: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: CARD_BG,
    borderBottomWidth: hairline,
    borderBottomColor: CARD_BORDER,
    gap: 8,
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerTitle: {
    flex: 1,
    fontSize: 19,
    fontFamily: Typography.titleSerif,
    fontWeight: '500',
    color: PRIMARY,
  },

  // Loading / error
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14, fontFamily: Typography.bodyMedium, color: SECONDARY },
  errorTitle: { fontSize: 15, fontFamily: Typography.headingSemiBold, color: PRIMARY, textAlign: 'center' },
  retryBtn: {
    marginTop: 8,
    backgroundColor: PRIMARY,
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  retryBtnText: { fontSize: 14, fontFamily: Typography.headingSemiBold, color: '#FFFFFF' },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40, gap: 0 },

  // Hero
  hero: {
    backgroundColor: DARK_CARD,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 28,
    alignItems: 'center',
    gap: 6,
  },
  heroCompany: {
    fontSize: 18,
    fontFamily: Typography.headingSemiBold,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  heroQuoteNo: {
    fontSize: 14,
    fontFamily: Typography.bodyMedium,
    color: 'rgba(255,255,255,0.65)',
  },
  heroStatusRow: { flexDirection: 'row', marginTop: 4 },
  heroOrderLink: {
    fontSize: 13,
    fontFamily: Typography.bodyMedium,
    color: `${GREEN_BG}`,
    marginTop: 2,
  },

  // Status pills
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  pillConverted: { backgroundColor: GREEN_BG },
  pillPending: { backgroundColor: 'rgba(255,255,255,0.12)' },
  statusText: { fontSize: 13, fontFamily: Typography.headingSemiBold, fontWeight: '600' },
  statusTextGreen: { color: GREEN },
  statusTextGrey: { color: 'rgba(255,255,255,0.8)' },

  // Section
  sectionWrap: { paddingHorizontal: 16, paddingTop: 20 },
  sectionTitle: {
    fontSize: 11,
    fontFamily: Typography.headingSemiBold,
    fontWeight: '600',
    color: SECONDARY,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  cardGroup: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },

  // Row item
  rowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: hairline,
    borderBottomColor: CARD_BORDER,
    gap: 12,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  rowIcon: { marginRight: 10 },
  rowKey: { fontSize: 14, fontFamily: Typography.bodyMedium, color: SECONDARY, flex: 1 },
  rowValue: { fontSize: 14, fontFamily: Typography.headingSemiBold, fontWeight: '600', color: PRIMARY, textAlign: 'right', maxWidth: '55%' },

  // Contact card
  contactCard: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: hairline,
    borderBottomColor: CARD_BORDER,
    gap: 8,
  },
  contactHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  contactAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactName: { fontSize: 14, fontFamily: Typography.headingSemiBold, fontWeight: '600', color: PRIMARY },
  contactJob: { fontSize: 12, fontFamily: Typography.body, color: SECONDARY, marginTop: 1 },
  primaryBadge: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  primaryBadgeText: { fontSize: 11, fontFamily: Typography.bodyMedium, color: '#1D4ED8' },
  contactMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  contactMetaText: { fontSize: 13, fontFamily: Typography.body, color: PRIMARY },

  // Spec rows
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: hairline,
    borderBottomColor: CARD_BORDER,
    gap: 12,
  },
  specKey: { fontSize: 13, fontFamily: Typography.bodyMedium, color: SECONDARY, flex: 1 },
  specValue: { fontSize: 13, fontFamily: Typography.headingSemiBold, fontWeight: '600', color: PRIMARY, textAlign: 'right', maxWidth: '55%' },

  // Message
  messagePad: { padding: 16 },
  messageText: { fontSize: 14, fontFamily: Typography.body, color: PRIMARY, lineHeight: 22 },
});
