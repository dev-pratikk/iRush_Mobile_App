import React, { useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text,
  BackHandler,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Typography } from '../../constants/Typography';
import { router, useLocalSearchParams } from 'expo-router';
import { formatCurrencyWithCents } from '../../services/api/orders.service';

const PRIMARY = '#2C2C2A';
const SECONDARY = '#9C9B95';
const PAGE_BG = '#FFFFFF';
const SUMMARY_CARD_BG = '#3A4151';
const CARD_BG = '#FFFFFF';
const CARD_BORDER = '#E7E6E2';
const RED_TEXT = '#8A1C1C';

// Helper to decode HTML entities like &amp; -> &
const decodeHtml = (str: string | null | undefined): string => {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
};

// Formats date string to "Jul 9, 2026" or "Jul 17"
const formatDateFormatted = (dateStr: string | null | undefined, includeYear = true): string => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const day = d.getDate();
    if (!includeYear) return `${month} ${day}`;
    return `${month} ${day}, ${d.getFullYear()}`;
  } catch {
    return dateStr || '';
  }
};

export default function OrderDetailsScreen() {
  const params = useLocalSearchParams<{ orderData?: string }>();

  // Hardware Back button handling (Android)
  React.useEffect(() => {
    const onBackPress = () => {
      router.back();
      return true;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, []);

  // Parse raw order payload or fallback to sample structure provided by user
  const order = useMemo(() => {
    if (params.orderData) {
      try {
        return JSON.parse(params.orderData);
      } catch {
        // pass through to fallback
      }
    }
    return null;
  }, [params.orderData]);

  // Extract fields with full fallbacks matching user sample data
  const orderNo = order?.ORDER_NO || order?.orderNo || '482663';
  const companyName = decodeHtml(order?.COMPANY_NAME || order?.companyName || 'Higher Ground, LLC');
  const orderTotal = Number.isFinite(order?.ORDER_TOTAL || order?.orderTotal)
    ? order?.ORDER_TOTAL || order?.orderTotal
    : 1069.92;
  const orderStatus = order?.ORDER_STATUS || order?.orderStatus || 'Open';
  const orderDate = formatDateFormatted(order?.ORDER_DATE || order?.orderDate || '2026-07-09');

  // Order info
  const orderType = (order?.ORDER_TYPE_NAME || order?.orderTypeName || 'PCB Parts').trim();
  const category = (order?.ORDER_CATEGORY || order?.orderCategory || 'New').trim();
  const quoteNo = (order?.QUOTE_NO || order?.quoteNo || 'PCB304352').trim();
  const salesperson = (order?.SALESPERSON_NAME || order?.salespersonName || 'Jodi').trim();

  // Line items
  const details = order?.orderDetails && order.orderDetails.length > 0 ? order.orderDetails[0] : null;
  const lineQty = details?.QUANTITY ?? 38;
  const unitPrice = details?.UNIT_PRICE ?? 22.65;
  const lineTotal = details?.LINE_TOTAL ?? 860.7;
  const promisedDateStr = formatDateFormatted(details?.PROMISED_DATE || '2026-07-17', false);
  const invoicedQty = details?.INVOICED_QTY ?? 1;

  // Vendor
  const vendorObj = order?.orderVendors && order.orderVendors.length > 0 ? order.orderVendors[0] : null;
  const vendorName = decodeHtml(vendorObj?.vendor?.vendorCompanyName || 'R&D Tech');
  const vendorCost = vendorObj?.VENDOR_ALLTOTALCOST || vendorObj?.VENDOR_TOTALCOST || 556.7;
  const vendorCity = vendorObj?.vendor?.city || 'Milpitas';
  const vendorState = vendorObj?.vendor?.state || 'CA';

  // Shipping & Contact
  const ship = order?.shippingAddress || {};
  const addr1 = ship.addressText1 || '2595 E Bayshore Rd';
  const addr2 = ship.addressText2 ? `, ${ship.addressText2}` : ', Ste 200';
  const city = ship.cityName || 'Palo Alto';
  const state = ship.stateName ? ship.stateName.toUpperCase() : 'CA';
  const zip = ship.zipCode || '94303';

  const contact = order?.customerContact || {};
  const contactName = `${contact.firstName || 'Darren'} ${contact.lastName || 'Reis'}`.trim();
  const contactEmail = contact.email || 'darren@higherground.earth.com';
  const rawPhone = contact.phone1 || '6507042320';
  const formattedPhone =
    rawPhone.length === 10
      ? `(${rawPhone.slice(0, 3)}) ${rawPhone.slice(3, 6)}-${rawPhone.slice(6)}`
      : rawPhone;

  // Invoice & Shipment
  const inv = order?.invoices && order.invoices.length > 0 ? order.invoices[0] : null;
  const invNumber = inv?.INV_NUMBER || '482630-1';
  const invStatus = inv?.invoiceStatus || 'Unpaid';
  const invAmount = inv?.INVOICE_AMOUNT ?? 22.65;

  const pack = order?.orderPackingSlips && order.orderPackingSlips.length > 0 ? order.orderPackingSlips[0] : null;
  const trackingNo = pack?.TRACK_NUMBER || '123';
  const shipDateStr = formatDateFormatted(pack?.SHIPOUT_DATETIME || pack?.SHIP_DATE || '2026-07-22', false);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
        >
          <Ionicons name="arrow-back" size={20} color={PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* 1. Top Summary Card (Matching App Grey Box Theme) */}
        <View style={styles.topSummaryCard}>
          <View style={styles.topHeaderRow}>
            <View style={styles.topHeaderLeft}>
              <Text style={styles.orderNoTitle}>#{orderNo}</Text>
              <Text style={styles.companySubTitle}>{companyName}</Text>
            </View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>{orderStatus}</Text>
            </View>
          </View>

          <View style={styles.topHeaderBottomRow}>
            <Text style={styles.totalAmountText}>{formatCurrencyWithCents(orderTotal)}</Text>
            <Text style={styles.orderDateText}>{orderDate}</Text>
          </View>
        </View>

        {/* 2. Order info Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="document-text-outline" size={18} color={SECONDARY} />
            <Text style={styles.cardTitle}>Order info</Text>
          </View>

          <View style={styles.kvList}>
            <View style={styles.kvRow}>
              <Text style={styles.kvKey}>Type</Text>
              <Text style={styles.kvValueBold}>{orderType}</Text>
            </View>
            <View style={styles.kvRow}>
              <Text style={styles.kvKey}>Category</Text>
              <Text style={styles.kvValueBold}>{category}</Text>
            </View>
            <View style={styles.kvRow}>
              <Text style={styles.kvKey}>Quote no</Text>
              <Text style={styles.kvValueBold}>{quoteNo}</Text>
            </View>
            <View style={styles.kvRow}>
              <Text style={styles.kvKey}>Salesperson</Text>
              <Text style={styles.kvValueBold}>{salesperson}</Text>
            </View>
          </View>
        </View>

        {/* 3. Line items Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="list-outline" size={18} color={SECONDARY} />
            <Text style={styles.cardTitle}>Line items</Text>
          </View>

          <View style={styles.sectionBody}>
            <View style={styles.rowBetween}>
              <Text style={styles.itemTitleText}>
                {lineQty} pcs · {formatCurrencyWithCents(unitPrice)} ea
              </Text>
              <Text style={styles.itemAmountText}>{formatCurrencyWithCents(lineTotal)}</Text>
            </View>
            <Text style={styles.itemSubText}>
              Promised {promisedDateStr} · invoiced {invoicedQty} of {lineQty}
            </Text>
          </View>
        </View>

        {/* 4. Vendor Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="car-outline" size={18} color={SECONDARY} />
            <Text style={styles.cardTitle}>Vendor</Text>
          </View>

          <View style={styles.sectionBody}>
            <View style={styles.rowBetween}>
              <Text style={styles.itemTitleText}>{vendorName}</Text>
              <Text style={styles.itemAmountText}>{formatCurrencyWithCents(vendorCost)}</Text>
            </View>
            <Text style={styles.itemSubText}>
              {vendorCity}, {vendorState}
            </Text>
          </View>
        </View>

        {/* 5. Shipping and contact Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="location-outline" size={18} color={SECONDARY} />
            <Text style={styles.cardTitle}>Shipping and contact</Text>
          </View>

          <View style={styles.sectionBody}>
            <Text style={styles.itemTitleText}>
              {addr1}{addr2}
            </Text>
            <Text style={styles.itemTitleText}>
              {city}, {state} {zip}
            </Text>

            <View style={styles.cardDivider} />

            <Text style={styles.contactNameText}>{contactName}</Text>
            <Text style={styles.contactDetailText}>
              {contactEmail} · {formattedPhone}
            </Text>
          </View>
        </View>

        {/* 6. Invoice and shipment Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="receipt-outline" size={18} color={SECONDARY} />
            <Text style={styles.cardTitle}>Invoice and shipment</Text>
          </View>

          <View style={styles.sectionBody}>
            <View style={styles.rowBetween}>
              <Text style={styles.itemTitleText}>Invoice {invNumber}</Text>
              <View style={styles.invoiceRightCol}>
                <Text style={styles.unpaidText}>{invStatus}</Text>
                <Text style={styles.itemAmountText}>{formatCurrencyWithCents(invAmount)}</Text>
              </View>
            </View>
            <Text style={styles.itemSubText}>
              Tracking {trackingNo} · shipped {shipDateStr}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const hairline = StyleSheet.hairlineWidth > 0 ? StyleSheet.hairlineWidth : 0.5;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: PAGE_BG,
  },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: hairline,
    borderBottomColor: CARD_BORDER,
    backgroundColor: PAGE_BG,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
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
    gap: 14,
    paddingBottom: 32,
  },

  // 1. Top Summary Card (Matching App Theme)
  topSummaryCard: {
    backgroundColor: SUMMARY_CARD_BG,
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  topHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  topHeaderLeft: {
    gap: 4,
    flex: 1,
    paddingRight: 10,
  },
  orderNoTitle: {
    fontSize: 24,
    fontFamily: Typography.numberHeavy,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  companySubTitle: {
    fontSize: 14,
    fontFamily: Typography.body,
    color: 'rgba(255, 255, 255, 0.75)',
  },
  statusBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontFamily: Typography.headingSemiBold,
    color: '#FFFFFF',
  },
  topHeaderBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 4,
  },
  totalAmountText: {
    fontSize: 26,
    fontFamily: Typography.numberHeavy,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  orderDateText: {
    fontSize: 13,
    fontFamily: Typography.body,
    color: 'rgba(255, 255, 255, 0.75)',
  },

  // Generic White Cards (App Light Theme)
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontFamily: Typography.headingSemiBold,
    color: PRIMARY,
  },

  // Key-Value List inside Card
  kvList: {
    gap: 10,
    paddingTop: 2,
  },
  kvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kvKey: {
    fontSize: 14,
    fontFamily: Typography.body,
    color: SECONDARY,
  },
  kvValueBold: {
    fontSize: 14,
    fontFamily: Typography.headingSemiBold,
    fontWeight: '600',
    color: PRIMARY,
  },

  // Section Body
  sectionBody: {
    gap: 4,
    paddingTop: 2,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemTitleText: {
    fontSize: 14,
    fontFamily: Typography.headingSemiBold,
    fontWeight: '600',
    color: PRIMARY,
  },
  itemAmountText: {
    fontSize: 14,
    fontFamily: Typography.headingSemiBold,
    fontWeight: '600',
    color: PRIMARY,
  },
  itemSubText: {
    fontSize: 13,
    fontFamily: Typography.body,
    color: SECONDARY,
    marginTop: 4,
  },

  cardDivider: {
    height: hairline,
    backgroundColor: CARD_BORDER,
    marginVertical: 10,
  },

  contactNameText: {
    fontSize: 14,
    fontFamily: Typography.headingSemiBold,
    fontWeight: '600',
    color: PRIMARY,
  },
  contactDetailText: {
    fontSize: 13,
    fontFamily: Typography.body,
    color: SECONDARY,
    marginTop: 2,
  },

  invoiceRightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unpaidText: {
    fontSize: 12,
    fontFamily: Typography.headingSemiBold,
    color: RED_TEXT,
    marginRight: 4,
  },
});
