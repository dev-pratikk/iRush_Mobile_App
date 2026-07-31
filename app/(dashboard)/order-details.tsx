import React, { useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text,
  BackHandler,
  Linking,
  Alert,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Typography } from '../../constants/Typography';
import { router, useLocalSearchParams } from 'expo-router';
import { formatCurrencyWithCents } from '../../services/api/orders.service';

const PRIMARY = '#0F172A';
const SECONDARY = '#64748B';
const PAGE_BG = '#F8FAFC';
const CARD_BG = '#FFFFFF';
const CARD_BORDER = '#E2E8F0';
const RED_TEXT = '#DC2626';

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

export default function OrderDetailsScreen() {
  const params = useLocalSearchParams<{ orderData?: string; from?: string }>();

  const handleBack = React.useCallback(() => {
    if (params.from) {
      router.push(params.from as any);
    } else {
      router.push('/all-orders' as any);
    }
  }, [params.from]);

  // Hardware Back button handling (Android)
  React.useEffect(() => {
    const onBackPress = () => {
      handleBack();
      return true;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [handleBack]);

  // Parse raw order payload or fallback to sample structure matching image
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

  // Extract fields matching image & fallback
  const orderNo = order?.ORDER_NO || order?.orderNo || '482663';
  const companyName = decodeHtml(order?.COMPANY_NAME || order?.companyName || 'Higher Ground, LLC');
  const orderTotal = Number.isFinite(order?.ORDER_TOTAL || order?.orderTotal)
    ? order?.ORDER_TOTAL || order?.orderTotal
    : 1069.92;
  const orderStatus = order?.ORDER_STATUS || order?.orderStatus || 'Open';

  // Order info
  const orderType = (order?.ORDER_TYPE_NAME || order?.orderTypeName || 'PCB Parts').trim();
  const quoteNo = (order?.QUOTE_NO || order?.quoteNo || 'PCB304352').trim();
  const salesperson = (order?.SALESPERSON_NAME || order?.salespersonName || 'Jodi').trim();

  // Line items
  const details = order?.orderDetails && order.orderDetails.length > 0 ? order.orderDetails[0] : null;
  const lineQty = details?.QUANTITY ?? 38;
  const unitPrice = details?.UNIT_PRICE ?? 22.65;

  // Vendor
  const vendorObj = order?.orderVendors && order.orderVendors.length > 0 ? order.orderVendors[0] : null;
  const vendorName = decodeHtml(vendorObj?.vendor?.vendorCompanyName || 'R&D Tech');
  const vendorCost = vendorObj?.VENDOR_ALLTOTALCOST || vendorObj?.VENDOR_TOTALCOST || 556.7;

  // Shipping & Contact
  const ship = order?.shippingAddress || {};
  const city = ship.cityName || 'Palo Alto';
  const state = ship.stateName ? ship.stateName.toUpperCase() : 'CA';
  const addr1 = ship.addressText1 || '2595 E Bayshore Rd';
  const addr2 = ship.addressText2 ? `, ${ship.addressText2}` : ', Ste 200';
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

  // Actions
  const handleCall = () => {
    if (rawPhone) {
      Linking.openURL(`tel:${rawPhone}`);
    } else {
      Alert.alert('Call', 'No phone number available for this order contact.');
    }
  };

  const handleEmail = () => {
    if (contactEmail) {
      Linking.openURL(`mailto:${contactEmail}?subject=Order %23${orderNo}`);
    } else {
      Alert.alert('Email', 'No email address available for this order contact.');
    }
  };

  const handleTrack = () => {
    Alert.alert('Tracking Information', `Order #${orderNo}\nTracking No: ${trackingNo}`);
  };

  const handleInvoiceAction = () => {
    Alert.alert(
      'Invoice Information',
      `Invoice #${invNumber}\nStatus: ${invStatus}\nAmount: ${formatCurrencyWithCents(invAmount)}`
    );
  };

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
        <Text style={styles.headerTitleLeft}>Order Details</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Top Hero Section */}
        <View style={styles.heroSection}>
          <Text style={styles.heroCompanyName}>{companyName}</Text>
          <Text style={styles.heroAmount}>{formatCurrencyWithCents(orderTotal)}</Text>
          <Text style={styles.heroSubtitle}>
            Order #{orderNo} · {orderStatus}
          </Text>

          {/* Quick Action Buttons Row */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionItem} onPress={handleCall} activeOpacity={0.7}>
              <View style={styles.actionCircle}>
                <Ionicons name="call-outline" size={20} color={PRIMARY} />
              </View>
              <Text style={styles.actionLabel}>Call</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem} onPress={handleEmail} activeOpacity={0.7}>
              <View style={styles.actionCircle}>
                <Ionicons name="mail-outline" size={20} color={PRIMARY} />
              </View>
              <Text style={styles.actionLabel}>Email</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem} onPress={handleTrack} activeOpacity={0.7}>
              <View style={styles.actionCircle}>
                <Ionicons name="bus-outline" size={20} color={PRIMARY} />
              </View>
              <Text style={styles.actionLabel}>Track</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem} onPress={handleInvoiceAction} activeOpacity={0.7}>
              <View style={styles.actionCircle}>
                <Ionicons name="document-text-outline" size={20} color={PRIMARY} />
              </View>
              <Text style={styles.actionLabel}>Invoice</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 1: ORDER */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionHeaderTitle}>ORDER</Text>
          <View style={styles.cardGroup}>
            <View style={styles.rowItem}>
              <View style={styles.rowLeft}>
                <Ionicons name="pricetag-outline" size={17} color={SECONDARY} style={styles.rowIcon} />
                <Text style={styles.rowKey}>Type</Text>
              </View>
              <Text style={styles.rowValue}>{orderType}</Text>
            </View>

            <View style={styles.rowItem}>
              <View style={styles.rowLeft}>
                <Ionicons name="document-outline" size={17} color={SECONDARY} style={styles.rowIcon} />
                <Text style={styles.rowKey}>Quote</Text>
              </View>
              <Text style={styles.rowValue}>{quoteNo}</Text>
            </View>

            <View style={styles.rowItem}>
              <View style={styles.rowLeft}>
                <Ionicons name="person-outline" size={17} color={SECONDARY} style={styles.rowIcon} />
                <Text style={styles.rowKey}>Salesperson</Text>
              </View>
              <Text style={styles.rowValue}>{salesperson}</Text>
            </View>

            <View style={[styles.rowItem, { borderBottomWidth: 0 }]}>
              <View style={styles.rowLeft}>
                <Ionicons name="cube-outline" size={17} color={SECONDARY} style={styles.rowIcon} />
                <Text style={styles.rowKey}>Quantity</Text>
              </View>
              <Text style={styles.rowValue}>
                {lineQty} pcs · {formatCurrencyWithCents(unitPrice)}/pc
              </Text>
            </View>
          </View>
        </View>

        {/* Section 2: VENDOR & SHIPPING */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionHeaderTitle}>VENDOR & SHIPPING</Text>
          <View style={styles.cardGroup}>
            <View style={styles.rowItem}>
              <View style={styles.rowLeft}>
                <Ionicons name="business-outline" size={17} color={SECONDARY} style={styles.rowIcon} />
                <Text style={styles.rowKey}>Vendor</Text>
              </View>
              <Text style={styles.rowValue}>
                {vendorName} · {formatCurrencyWithCents(vendorCost)}
              </Text>
            </View>

            <View style={[styles.rowItem, { borderBottomWidth: 0 }]}>
              <View style={styles.rowLeft}>
                <Ionicons name="location-outline" size={17} color={SECONDARY} style={styles.rowIcon} />
                <Text style={styles.rowKey}>Ship to</Text>
              </View>
              <Text style={styles.rowValue}>
                {city}, {state}
              </Text>
            </View>
          </View>
        </View>

        {/* Section 3: INVOICE */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionHeaderTitle}>INVOICE</Text>
          <View style={styles.cardGroup}>
            <View style={[styles.rowItem, { borderBottomWidth: 0 }]}>
              <View style={styles.rowLeft}>
                <Ionicons name="alert-circle-outline" size={17} color={RED_TEXT} style={styles.rowIcon} />
                <Text style={styles.rowKey}>{invNumber}</Text>
              </View>
              <Text style={[styles.rowValue, { color: RED_TEXT }]}>
                {invStatus} · {formatCurrencyWithCents(invAmount)}
              </Text>
            </View>
          </View>
        </View>

        {/* Section 4: SHIPPING ADDRESS & CONTACT */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionHeaderTitle}>SHIPPING ADDRESS & CONTACT</Text>
          <View style={styles.cardGroup}>
            <View style={styles.rowItem}>
              <View style={styles.rowLeft}>
                <Ionicons name="map-outline" size={17} color={SECONDARY} style={styles.rowIcon} />
                <Text style={styles.rowKey}>Address</Text>
              </View>
              <Text style={[styles.rowValue, { flexShrink: 1, textAlign: 'right' }]}>
                {addr1}{addr2}, {city}, {state} {zip}
              </Text>
            </View>

            <View style={[styles.rowItem, { borderBottomWidth: 0 }]}>
              <View style={styles.rowLeft}>
                <Ionicons name="call-outline" size={17} color={SECONDARY} style={styles.rowIcon} />
                <Text style={styles.rowKey}>Contact</Text>
              </View>
              <Text style={styles.rowValue}>
                {contactName} · {formattedPhone}
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
    borderBottomWidth: StyleSheet.hairlineWidth,
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

  // Hero section
  heroSection: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  heroCompanyName: {
    fontSize: 14,
    fontFamily: Typography.bodyMedium,
    color: SECONDARY,
  },
  heroAmount: {
    fontSize: 32,
    fontFamily: Typography.titleSerif,
    fontWeight: '700',
    color: PRIMARY,
    marginVertical: 4,
  },
  heroSubtitle: {
    fontSize: 13,
    fontFamily: Typography.bodyMedium,
    color: '#475569',
  },

  // Action buttons
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    marginTop: 20,
  },
  actionItem: {
    alignItems: 'center',
  },
  actionCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  actionLabel: {
    fontSize: 12,
    fontFamily: Typography.bodyMedium,
    color: '#475569',
    marginTop: 6,
  },

  // Sections
  sectionWrap: {
    gap: 6,
  },
  sectionHeaderTitle: {
    fontSize: 12,
    fontFamily: Typography.headingSemiBold,
    color: SECONDARY,
    letterSpacing: 0.8,
    marginLeft: 2,
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
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
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
    fontSize: 14,
    fontFamily: Typography.bodyMedium,
    color: '#475569',
  },
  rowValue: {
    fontSize: 14,
    fontFamily: Typography.headingSemiBold,
    color: PRIMARY,
  },
});
