import React, { useMemo, useCallback, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Typography } from '../../constants/Typography';
import { router, useLocalSearchParams } from 'expo-router';
import { formatCurrencyWithCents, formatOrderDate } from '../../services/api/orders.service';
import { fetchARDetailBySearch } from '../../services/api/ar.service';
import { useAuthContext } from '../../context/AuthContext';
import type { ARItem } from '../../types/api/ar';

const PRIMARY = '#0F172A';
const SECONDARY = '#64748B';
const PAGE_BG = '#F8FAFC';
const CARD_BG = '#FFFFFF';
const CARD_BORDER = '#E2E8F0';

const safeDisplayString = (val: any): string => {
  if (val === null || val === undefined || val === '') return 'N/A';
  return String(val).trim();
};

export default function ARDetailsScreen() {
  const params = useLocalSearchParams<{ invoiceData?: string; invNumber?: string }>();
  const { user } = useAuthContext();
  const token = (user as any)?.token ?? null;

  const parsedItem: ARItem | null = useMemo(() => {
    if (params.invoiceData) {
      try {
        return JSON.parse(params.invoiceData);
      } catch (e) {
        if (__DEV__) console.log('[ARDetails] JSON parse error:', e);
      }
    }
    return null;
  }, [params.invoiceData]);

  const [item, setItem] = useState<ARItem | null>(parsedItem);
  const [loading, setLoading] = useState<boolean>(!parsedItem && !!params.invNumber);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const invNo = params.invNumber || parsedItem?.INV_NUMBER || parsedItem?.invoiceNumber;
    if (!invNo) {
      if (!parsedItem) {
        setError('No invoice number provided');
        setLoading(false);
      }
      return;
    }

    let active = true;
    // Fetch complete invoice data from /dashboard/ar?search={invNo}
    fetchARDetailBySearch(invNo, { token })
      .then((detail) => {
        if (active) {
          if (detail) {
            setItem((prev) => ({ ...(prev || {}), ...detail }));
          } else if (!parsedItem) {
            setError('Invoice details not found');
          }
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          if (__DEV__) console.log('[ARDetails] fetchARDetailBySearch error:', err);
          if (!parsedItem) {
            setError(err?.message || 'Failed to load invoice details');
          }
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [params.invNumber, parsedItem, token]);

  const handleBack = useCallback(() => {
    router.back();
  }, []);

  if (loading && !item) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack} hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}>
            <Ionicons name="arrow-back" size={20} color={PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.headerTitleLeft}>AR Details</Text>
        </View>
        <View style={styles.centeredWrap}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={{ fontSize: 13, fontFamily: Typography.bodyMedium, color: SECONDARY, marginTop: 12 }}>
            Loading invoice details…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !item) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack} hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}>
            <Ionicons name="arrow-back" size={20} color={PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.headerTitleLeft}>AR Details</Text>
        </View>
        <View style={styles.centeredWrap}>
          <Ionicons name="warning-outline" size={38} color={SECONDARY} />
          <Text style={styles.errorTitle}>{error || 'Invoice details not found'}</Text>
          <TouchableOpacity style={styles.primaryActionBtn} onPress={handleBack}>
            <Text style={styles.primaryActionBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const statusRaw = (item.status || '').toLowerCase();
  const isCrossed = statusRaw.includes('crossed') || statusRaw.includes('overdue');
  const isToday = statusRaw.includes('today') || statusRaw.includes('due');

  const statusLabel =
    isCrossed ? 'Crossed (Overdue)' :
      isToday ? 'Due Today' :
        'Future Dues';

  const statusStyle =
    isCrossed ? styles.statusCrossed :
      isToday ? styles.statusToday :
        styles.statusFuture;

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
        <Text style={styles.headerTitleLeft}>AR Details</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Hero Card */}
        <View style={styles.heroCard}>
          <Text style={styles.heroCompany} numberOfLines={1}>
            {safeDisplayString(item.CompanyName)}
          </Text>
          <Text style={styles.heroInvNumber}>
            Invoice #{safeDisplayString(item.INV_NUMBER)}
          </Text>
          <View style={styles.heroAmountRow}>
            <Text style={styles.heroAmountText}>
              {formatCurrencyWithCents(item.DUE_AMOUNT ?? item.InvoiceAmount ?? 0)}
            </Text>
            <Text style={styles.heroAmountSub}> (Due Amount)</Text>
          </View>
          <View style={styles.heroStatusWrap}>
            <View style={[styles.statusBadge, statusStyle]}>
              <Text style={styles.statusBadgeText}>{statusLabel}</Text>
            </View>
          </View>
        </View>

        {/* Section 1: INVOICE & ORDER INFO */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionHeaderTitle}>INVOICE & ORDER</Text>
          <View style={styles.cardGroup}>
            <View style={styles.rowItem}>
              <View style={styles.rowLeft}>
                <Ionicons name="receipt-outline" size={17} color={SECONDARY} style={styles.rowIcon} />
                <Text style={styles.rowKey}>Invoice Number</Text>
              </View>
              <Text style={styles.rowValueBold}>{safeDisplayString(item.INV_NUMBER)}</Text>
            </View>

            <View style={styles.rowItem}>
              <View style={styles.rowLeft}>
                <Ionicons name="document-text-outline" size={17} color={SECONDARY} style={styles.rowIcon} />
                <Text style={styles.rowKey}>Order Number</Text>
              </View>
              <Text style={styles.rowValueBold}>{safeDisplayString(item.ORDER_NO)}</Text>
            </View>

            <View style={styles.rowItem}>
              <View style={styles.rowLeft}>
                <Ionicons name="calendar-outline" size={17} color={SECONDARY} style={styles.rowIcon} />
                <Text style={styles.rowKey}>Invoice Date</Text>
              </View>
              <Text style={styles.rowValue}>{formatOrderDate(item.INV_DATE)}</Text>
            </View>



            <View style={[styles.rowItem, { borderBottomWidth: 0 }]}>
              <View style={styles.rowLeft}>
                <Ionicons name="time-outline" size={17} color={SECONDARY} style={styles.rowIcon} />
                <Text style={styles.rowKey}>Order Date</Text>
              </View>
              <Text style={styles.rowValue}>{formatOrderDate(item.ORDER_DATE)}</Text>
            </View>
          </View>
        </View>

        {/* Section 2: COMPANY & SALESPERSON */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionHeaderTitle}>COMPANY & SALESPERSON</Text>
          <View style={styles.cardGroup}>
            <View style={styles.rowItem}>
              <View style={styles.rowLeft}>
                <Ionicons name="business-outline" size={17} color={SECONDARY} style={styles.rowIcon} />
                <Text style={styles.rowKey}>Company Name</Text>
              </View>
              <Text style={[styles.rowValue, { flexShrink: 1 }]} numberOfLines={2}>{safeDisplayString(item.CompanyName)}</Text>
            </View>

            <View style={styles.rowItem}>
              <View style={styles.rowLeft}>
                <Ionicons name="barcode-outline" size={17} color={SECONDARY} style={styles.rowIcon} />
                <Text style={styles.rowKey}>Company Code</Text>
              </View>
              <View style={styles.codePill}>
                <Text style={styles.codePillText}>{safeDisplayString(item.CompanyCode)}</Text>
              </View>
            </View>

            <View style={[styles.rowItem, { borderBottomWidth: 0 }]}>
              <View style={styles.rowLeft}>
                <Ionicons name="person-outline" size={17} color={SECONDARY} style={styles.rowIcon} />
                <Text style={styles.rowKey}>Salesperson</Text>
              </View>
              <Text style={styles.rowValueBold}>{safeDisplayString(item.salespersonName)}</Text>
            </View>
          </View>
        </View>

        {/* Section 3: CREDIT TERMS & DUES */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionHeaderTitle}>CREDIT TERMS & DUES</Text>
          <View style={styles.cardGroup}>
            <View style={styles.rowItem}>
              <View style={styles.rowLeft}>
                <Ionicons name="cash-outline" size={17} color={SECONDARY} style={styles.rowIcon} />
                <Text style={styles.rowKey}>Invoice Amount</Text>
              </View>
              <Text style={styles.rowValueBold}>{formatCurrencyWithCents(item.InvoiceAmount)}</Text>
            </View>

            <View style={styles.rowItem}>
              <View style={styles.rowLeft}>
                <Ionicons name="wallet-outline" size={17} color={SECONDARY} style={styles.rowIcon} />
                <Text style={styles.rowKey}>Due Amount</Text>
              </View>
              <Text style={[styles.rowValueBold, { color: '#DC2626' }]}>{formatCurrencyWithCents(item.DUE_AMOUNT)}</Text>
            </View>

            <View style={styles.rowItem}>
              <View style={styles.rowLeft}>
                <Ionicons name="card-outline" size={17} color={SECONDARY} style={styles.rowIcon} />
                <Text style={styles.rowKey}>Credit Term</Text>
              </View>
              <Text style={styles.rowValue}>{safeDisplayString(item.creditTerm)}</Text>
            </View>

            <View style={styles.rowItem}>
              <View style={styles.rowLeft}>
                <Ionicons name="alarm-outline" size={17} color={SECONDARY} style={styles.rowIcon} />
                <Text style={styles.rowKey}>Invoiced Age (Days)</Text>
              </View>
              <Text style={styles.rowValue}>{item.invoiceDays != null ? String(item.invoiceDays) : 'N/A'}</Text>
            </View>

            <View style={[styles.rowItem, { borderBottomWidth: 0 }]}>
              <View style={styles.rowLeft}>
                <Ionicons name="warning-outline" size={17} color={item.overDueDays > 0 ? '#DC2626' : SECONDARY} style={styles.rowIcon} />
                <Text style={styles.rowKey}>Overdue Days</Text>
              </View>
              <Text style={[styles.rowValueBold, item.overDueDays > 0 ? { color: '#DC2626' } : null]}>
                {item.overDueDays != null ? String(item.overDueDays) : '0'}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

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
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 6,
    marginRight: 8,
  },
  headerTitleLeft: {
    fontSize: 18,
    fontFamily: Typography.titleSerif,
    fontWeight: '500',
    color: PRIMARY,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
  },
  centeredWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  errorTitle: {
    fontSize: 16,
    fontFamily: Typography.headingSemiBold,
    color: PRIMARY,
  },
  primaryActionBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryActionBtnText: {
    fontSize: 14,
    fontFamily: Typography.headingSemiBold,
    color: '#FFFFFF',
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: 20,
    alignItems: 'center',
    gap: 6,
  },
  heroCompany: {
    fontSize: 16,
    fontFamily: Typography.headingSemiBold,
    color: PRIMARY,
    textAlign: 'center',
  },
  heroInvNumber: {
    fontSize: 13,
    fontFamily: Typography.bodyMedium,
    color: SECONDARY,
  },
  heroAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
  },
  heroAmountText: {
    fontSize: 26,
    fontFamily: Typography.numberHeavy,
    color: PRIMARY,
  },
  heroAmountSub: {
    fontSize: 13,
    fontFamily: Typography.bodyMedium,
    color: SECONDARY,
  },
  heroStatusWrap: {
    marginTop: 6,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontFamily: Typography.headingSemiBold,
  },
  statusCrossed: {
    backgroundColor: '#FEE2E2',
  },
  statusToday: {
    backgroundColor: '#FEF3C7',
  },
  statusFuture: {
    backgroundColor: '#E0F2FE',
  },
  sectionWrap: {
    gap: 8,
  },
  sectionHeaderTitle: {
    fontSize: 12,
    fontFamily: Typography.headingSemiBold,
    color: SECONDARY,
    letterSpacing: 0.5,
    marginLeft: 4,
  },
  cardGroup: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    paddingHorizontal: 16,
  },
  rowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: CARD_BORDER,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowIcon: {
    width: 20,
  },
  rowKey: {
    fontSize: 13.5,
    fontFamily: Typography.bodyMedium,
    color: SECONDARY,
  },
  rowValue: {
    fontSize: 13.5,
    fontFamily: Typography.bodyMedium,
    color: PRIMARY,
  },
  rowValueBold: {
    fontSize: 14,
    fontFamily: Typography.headingSemiBold,
    fontWeight: '600',
    color: PRIMARY,
  },
  codePill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  codePillText: {
    fontSize: 12,
    fontFamily: Typography.headingSemiBold,
    color: PRIMARY,
  },
});
