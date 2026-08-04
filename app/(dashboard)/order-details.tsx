import React, { useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text,
  BackHandler,
  Alert,
  Modal,
  TouchableWithoutFeedback,
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

// ─── Location / Address Modal Component ───────────────────────────────────────

const LocationModal = ({
  visible,
  onClose,
  orderNo,
  address,
}: {
  visible: boolean;
  onClose: () => void;
  orderNo: string;
  address: string;
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
                    <Ionicons name="location-outline" size={20} color="#0F172A" />
                  </View>
                  <View>
                    <Text style={styles.modalTitle}>Shipping Address</Text>
                    <Text style={styles.modalSubTitle}>Order #{orderNo}</Text>
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

              {/* Address Body */}
              <View style={styles.modalBodyGrid}>
                <Text style={styles.gridKey}>Destination Address</Text>
                <Text style={[styles.gridValueBold, { fontSize: 14, lineHeight: 20, marginTop: 4 }]}>
                  {address}
                </Text>
              </View>

              {/* Primary Close Button */}
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

// ─── Contact Info Modal Component (No Dialer execution) ───────────────────────

const ContactModal = ({
  visible,
  onClose,
  orderNo,
  contactName,
  contactPhone,
  contactEmail,
}: {
  visible: boolean;
  onClose: () => void;
  orderNo: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
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
                    <Text style={styles.modalSubTitle}>Order #{orderNo}</Text>
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
              <View style={styles.modalBodyGrid}>
                <View style={styles.modalGridRow}>
                  <Text style={styles.gridKey}>Contact Name</Text>
                  <Text style={styles.gridValueBold}>{contactName}</Text>
                </View>

                <View style={styles.modalGridRow}>
                  <Text style={styles.gridKey}>Phone</Text>
                  <Text style={styles.gridValue}>{contactPhone}</Text>
                </View>

                <View style={styles.modalGridRow}>
                  <Text style={styles.gridKey}>Email</Text>
                  <Text style={styles.gridValue}>{contactEmail}</Text>
                </View>
              </View>

              {/* Primary Close Button */}
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

// ─── Tracking Modal Component ──────────────────────────────────────────────────

const TrackModal = ({
  visible,
  onClose,
  orderNo,
  trackingNo,
  carrier = 'FedEx Express',
  shipDate = 'Jul 22, 2026',
  estDelivery = 'Jul 25, 2026',
  status = 'In Transit',
}: {
  visible: boolean;
  onClose: () => void;
  orderNo: string;
  trackingNo: string;
  carrier?: string;
  shipDate?: string;
  estDelivery?: string;
  status?: string;
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
                    <Ionicons name="bus-outline" size={20} color="#0F172A" />
                  </View>
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.modalTitle}>Shipment Tracking</Text>
                      <View style={styles.demoTagPill}>
                        <Text style={styles.demoTagText}>Demo Data</Text>
                      </View>
                    </View>
                    <Text style={styles.modalSubTitle}>Order #{orderNo}</Text>
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

              {/* Status Banner */}
              <View style={styles.trackCardBanner}>
                <View style={styles.trackStatusPill}>
                  <View style={styles.statusDotActive} />
                  <Text style={styles.trackStatusText}>{status}</Text>
                </View>
                <Text style={styles.carrierText}>{carrier}</Text>
              </View>

              {/* Info Grid */}
              <View style={styles.modalBodyGrid}>
                <View style={styles.modalGridRow}>
                  <Text style={styles.gridKey}>Tracking Number</Text>
                  <Text style={styles.gridValueBold}>#{trackingNo}</Text>
                </View>

                <View style={styles.modalGridRow}>
                  <Text style={styles.gridKey}>Shipped Date</Text>
                  <Text style={styles.gridValue}>{shipDate}</Text>
                </View>

                <View style={styles.modalGridRow}>
                  <Text style={styles.gridKey}>Estimated Delivery</Text>
                  <Text style={styles.gridValueHighlight}>{estDelivery}</Text>
                </View>
              </View>

              {/* Progress Steps */}
              <View style={styles.timelineContainer}>
                <View style={styles.timelineStep}>
                  <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
                  <Text style={styles.timelineTextDone}>Processed</Text>
                </View>
                <View style={styles.timelineLineDone} />
                <View style={styles.timelineStep}>
                  <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
                  <Text style={styles.timelineTextDone}>Shipped</Text>
                </View>
                <View style={styles.timelineLineDone} />
                <View style={styles.timelineStep}>
                  <Ionicons name="radio-button-on" size={18} color="#2563EB" />
                  <Text style={styles.timelineTextActive}>In Transit</Text>
                </View>
                <View style={styles.timelineLinePending} />
                <View style={styles.timelineStep}>
                  <Ionicons name="ellipse-outline" size={18} color="#94A3B8" />
                  <Text style={styles.timelineTextPending}>Delivered</Text>
                </View>
              </View>

              {/* Primary Close Button */}
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

// ─── Invoice Modal Component ───────────────────────────────────────────────────

const InvoiceModal = ({
  visible,
  onClose,
  invNumber,
  invStatus,
  invAmount,
  companyName,
  orderNo,
}: {
  visible: boolean;
  onClose: () => void;
  invNumber: string;
  invStatus: string;
  invAmount: number;
  companyName: string;
  orderNo: string;
}) => {
  const isUnpaid = invStatus.toLowerCase().includes('unpaid');

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
                    <Ionicons name="document-text-outline" size={20} color="#0F172A" />
                  </View>
                  <View>
                    <Text style={styles.modalTitle}>Invoice Summary</Text>
                    <Text style={styles.modalSubTitle}>Order #{orderNo}</Text>
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

              {/* Invoice Hero Block */}
              <View style={styles.invoiceHeroCard}>
                <Text style={styles.invoiceHeroCompany}>{companyName}</Text>
                <Text style={styles.invoiceHeroAmount}>{formatCurrencyWithCents(invAmount)}</Text>
                <View style={isUnpaid ? styles.unpaidBadgePill : styles.paidBadgePill}>
                  <Ionicons
                    name={isUnpaid ? 'alert-circle' : 'checkmark-circle'}
                    size={14}
                    color={isUnpaid ? '#DC2626' : '#16A34A'}
                  />
                  <Text style={isUnpaid ? styles.unpaidBadgeText : styles.paidBadgeText}>{invStatus}</Text>
                </View>
              </View>

              {/* Info Grid */}
              <View style={styles.modalBodyGrid}>
                <View style={styles.modalGridRow}>
                  <Text style={styles.gridKey}>Invoice Number</Text>
                  <Text style={styles.gridValueBold}>#{invNumber}</Text>
                </View>

                <View style={styles.modalGridRow}>
                  <Text style={styles.gridKey}>Payment Term</Text>
                  <Text style={styles.gridValue}>Net 30</Text>
                </View>

                <View style={styles.modalGridRow}>
                  <Text style={styles.gridKey}>Due Date</Text>
                  <Text style={styles.gridValue}>Aug 10, 2026</Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.modalFooterRow}>
                <TouchableOpacity style={styles.secondaryActionBtn} onPress={onClose} activeOpacity={0.8}>
                  <Text style={styles.secondaryActionBtnText}>Close</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.primaryActionBtnFlex}
                  onPress={() => {
                    onClose();
                    Alert.alert('Invoice', `Viewing invoice #${invNumber}`);
                  }}
                  activeOpacity={0.85}
                >
                  <Ionicons name="document-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.primaryActionBtnText}>View Invoice</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// ─── Main Screen Component ────────────────────────────────────────────────────

export default function OrderDetailsScreen() {
  const params = useLocalSearchParams<{ orderData?: string; from?: string }>();
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [trackModalVisible, setTrackModalVisible] = useState(false);
  const [invoiceModalVisible, setInvoiceModalVisible] = useState(false);
  const [showAllSpecs, setShowAllSpecs] = useState(false);

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
  const lineQty = details?.QUANTITY ?? order?.orderedQuantity ?? 38;
  const unitPrice = details?.UNIT_PRICE ?? 22.65;

  // Specifications (Full 25-parameter technical set)
  const spec = order?.orderSpecifications && order.orderSpecifications.length > 0 ? order.orderSpecifications[0] : null;

  const partNo = (spec?.PCBPARTNO || order?.pcbpartNo || '000-906-9030-001 Rev A').trim();
  const rev = spec?.REV != null ? String(spec.REV).trim() : '0';
  const orderTypeSpec = (spec?.OrderType || order?.ORDER_TYPE_NAME || order?.orderType || 'Full Turnkey').trim();
  const boardSize = (spec?.BoardSize || '9.6 x 6.125').trim();
  const panelSize = (spec?.PanelSize || '9.6 x 6.925').trim();
  const boardsPerPanel = spec?.BoardPerPanel != null ? String(spec.BoardPerPanel).trim() : '1';
  const layerCount = (spec?.Layer || '6').trim();
  const ipcClass = (spec?.IpcClass || 'IPC CLASS-II').trim();
  const maskColor = (spec?.MaskColor || 'GREEN').trim();
  const silkColor = (spec?.SilkscreenColor || 'WHITE').trim();
  const material = (spec?.Material || 'FR4 TG170').trim();
  const thickness = (spec?.Thickness || '0.093" +/- 10 %').trim();
  const innerCopper = (spec?.InnerCopper || '1OZ').trim();
  const outerCopper = (spec?.OuterCopper || '1OZ').trim();
  const plating = (spec?.Plating || 'ENIG').trim();
  const approxHoles = spec?.ApproxHoles != null ? String(spec.ApproxHoles).trim() : '986';
  const smallestHoles = (spec?.SmallestHoles || '9.84 MIL').trim();
  const minTrace = (spec?.MinTrace || '10.00 MIL').trim();
  const minSpace = (spec?.MinSpace || '5.00 MIL').trim();
  const smdPitch = (spec?.SmdPitch || '19.68 MIL').trim();
  const smdPads = spec?.NoOfSmdPads != null ? String(spec.NoOfSmdPads).trim() : '4300';
  const smdSided = (spec?.SmdSided || 'BOTH').trim();
  const isItar = spec?.ITAR === 1 || String(spec?.ITAR).toLowerCase() === 'yes';
  const testing = (spec?.Testing || 'YES').trim();
  const routing = (spec?.Routing || 'ROUTE & RETAIN').trim();
  const controlledImpedance = (spec?.ControlledImpedence || 'NO').trim();
  const platedEdges = (spec?.PlatedEdges || 'No').trim();
  const rohs = (spec?.Rohs || 'Yes').trim();
  const blindBuriedVias = (spec?.BlindOrBuriedVias || 'No').trim();

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
  const fullAddress = `${addr1}${addr2}, ${city}, ${state} ${zip}`;

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
        {/* Top Hero Section matching exact screenshot */}
        <View style={styles.heroHeaderContainer}>
          {/* Left Column: Company, Order #, Amount & Status */}
          <View style={styles.heroLeftCol}>
            <Text style={styles.heroCompanyName} numberOfLines={1}>
              {companyName}
            </Text>
            <Text style={styles.heroOrderNo} numberOfLines={1}>
              Order #{orderNo}
            </Text>
            <View style={styles.heroStatusRow}>
              <Text style={styles.heroAmountText}>
                {formatCurrencyWithCents(orderTotal)}
              </Text>
              <Text style={styles.heroDotText}> · </Text>
              <Text style={[styles.heroStatusText, orderStatus.toLowerCase() === 'open' ? styles.statusOpen : styles.statusOther]}>
                {orderStatus}
              </Text>
            </View>
          </View>

          {/* Right Column: 2x2 Grid Action Buttons */}
          <View style={styles.actionGridContainer}>
            {/* Row 1: Location & Contact */}
            <View style={styles.actionGridRow}>
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => setLocationModalVisible(true)}
                activeOpacity={0.75}
              >
                <Ionicons name="location-outline" size={20} color="#0F172A" />
                <Text style={styles.actionCardLabel}>Location</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => setContactModalVisible(true)}
                activeOpacity={0.75}
              >
                <Ionicons name="call-outline" size={20} color="#0F172A" />
                <Text style={styles.actionCardLabel}>Contact</Text>
              </TouchableOpacity>
            </View>

            {/* Row 2: Track & Invoice */}
            <View style={styles.actionGridRow}>
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => setTrackModalVisible(true)}
                activeOpacity={0.75}
              >
                <Ionicons name="bus-outline" size={20} color="#0F172A" />
                <Text style={styles.actionCardLabel}>Track</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => setInvoiceModalVisible(true)}
                activeOpacity={0.75}
              >
                <Ionicons name="document-text-outline" size={20} color="#0F172A" />
                <Text style={styles.actionCardLabel}>Invoice</Text>
              </TouchableOpacity>
            </View>
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

        {/* Section 2: SPECIFICATIONS */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeaderTitle}>SPECIFICATIONS</Text>
            {isItar ? (
              <View style={styles.itarBadge}>
                <Ionicons name="shield-checkmark" size={12} color="#DC2626" />
                <Text style={styles.itarBadgeText}>ITAR RESTRICTED</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.cardGroup}>
            {/* Primary Parameters */}
            <View style={styles.specRowItem}>
              <Text style={styles.specRowKey}>Part Number</Text>
              <Text style={styles.specRowValueBold}>{partNo}</Text>
            </View>

            <View style={styles.specRowItem}>
              <Text style={styles.specRowKey}>Revision</Text>
              <Text style={styles.specRowValue}>{rev}</Text>
            </View>

            <View style={styles.specRowItem}>
              <Text style={styles.specRowKey}>Order Type</Text>
              <Text style={styles.specRowValue}>{orderTypeSpec}</Text>
            </View>

            <View style={styles.specRowItem}>
              <Text style={styles.specRowKey}>Layer Count</Text>
              <Text style={styles.specRowValue}>{layerCount}</Text>
            </View>

            <View style={styles.specRowItem}>
              <Text style={styles.specRowKey}>Base Material</Text>
              <Text style={styles.specRowValue}>{material}</Text>
            </View>

            <View style={styles.specRowItem}>
              <Text style={styles.specRowKey}>Board Thickness</Text>
              <Text style={styles.specRowValue}>{thickness}</Text>
            </View>

            <View style={styles.specRowItem}>
              <Text style={styles.specRowKey}>Board Dimensions</Text>
              <Text style={styles.specRowValue}>{boardSize}</Text>
            </View>

            <View style={styles.specRowItem}>
              <Text style={styles.specRowKey}>Panel Dimensions</Text>
              <Text style={styles.specRowValue}>{panelSize || 'N/A'}</Text>
            </View>

            <View style={styles.specRowItem}>
              <Text style={styles.specRowKey}>Plating Finish</Text>
              <Text style={styles.specRowValue}>{plating}</Text>
            </View>

            <View style={styles.specRowItem}>
              <Text style={styles.specRowKey}>Solder Mask Color</Text>
              <Text style={styles.specRowValue}>{maskColor}</Text>
            </View>

            <View style={styles.specRowItem}>
              <Text style={styles.specRowKey}>Silkscreen Color</Text>
              <Text style={styles.specRowValue}>{silkColor}</Text>
            </View>

            {/* Extended Specs (Shown when expanded) */}
            {showAllSpecs && (
              <>
                <View style={styles.specRowItem}>
                  <Text style={styles.specRowKey}>Boards per Panel</Text>
                  <Text style={styles.specRowValue}>{boardsPerPanel}</Text>
                </View>

                <View style={styles.specRowItem}>
                  <Text style={styles.specRowKey}>Inner Copper Weight</Text>
                  <Text style={styles.specRowValue}>{innerCopper}</Text>
                </View>

                <View style={styles.specRowItem}>
                  <Text style={styles.specRowKey}>Outer Copper Weight</Text>
                  <Text style={styles.specRowValue}>{outerCopper}</Text>
                </View>

                <View style={styles.specRowItem}>
                  <Text style={styles.specRowKey}>SMD Placement</Text>
                  <Text style={styles.specRowValue}>{smdSided}</Text>
                </View>

                <View style={styles.specRowItem}>
                  <Text style={styles.specRowKey}>SMD Pitch</Text>
                  <Text style={styles.specRowValue}>{smdPitch}</Text>
                </View>

                <View style={styles.specRowItem}>
                  <Text style={styles.specRowKey}>SMD Pads Count</Text>
                  <Text style={styles.specRowValue}>{smdPads}</Text>
                </View>

                <View style={styles.specRowItem}>
                  <Text style={styles.specRowKey}>Total Hole Count</Text>
                  <Text style={styles.specRowValue}>{approxHoles}</Text>
                </View>

                <View style={styles.specRowItem}>
                  <Text style={styles.specRowKey}>Smallest Hole Size</Text>
                  <Text style={styles.specRowValue}>{smallestHoles}</Text>
                </View>

                <View style={styles.specRowItem}>
                  <Text style={styles.specRowKey}>Min Trace</Text>
                  <Text style={styles.specRowValue}>{minTrace}</Text>
                </View>

                <View style={styles.specRowItem}>
                  <Text style={styles.specRowKey}>Min Space</Text>
                  <Text style={styles.specRowValue}>{minSpace}</Text>
                </View>

                <View style={styles.specRowItem}>
                  <Text style={styles.specRowKey}>IPC Class</Text>
                  <Text style={styles.specRowValue}>{ipcClass}</Text>
                </View>

                <View style={styles.specRowItem}>
                  <Text style={styles.specRowKey}>Electrical Testing</Text>
                  <Text style={styles.specRowValue}>{testing}</Text>
                </View>

                <View style={styles.specRowItem}>
                  <Text style={styles.specRowKey}>Routing Method</Text>
                  <Text style={styles.specRowValue}>{routing}</Text>
                </View>

                <View style={styles.specRowItem}>
                  <Text style={styles.specRowKey}>Controlled Impedance</Text>
                  <Text style={styles.specRowValue}>{controlledImpedance}</Text>
                </View>

                <View style={styles.specRowItem}>
                  <Text style={styles.specRowKey}>Plated Edges</Text>
                  <Text style={styles.specRowValue}>{platedEdges}</Text>
                </View>

                <View style={styles.specRowItem}>
                  <Text style={styles.specRowKey}>RoHS Compliant</Text>
                  <Text style={styles.specRowValue}>{rohs}</Text>
                </View>

                <View style={[styles.specRowItem, { borderBottomWidth: 0 }]}>
                  <Text style={styles.specRowKey}>Blind / Buried Vias</Text>
                  <Text style={styles.specRowValue}>{blindBuriedVias}</Text>
                </View>
              </>
            )}

            {/* Toggle Button */}
            <TouchableOpacity
              style={styles.specToggleBtn}
              onPress={() => setShowAllSpecs(!showAllSpecs)}
              activeOpacity={0.7}
            >
              <Text style={styles.specToggleBtnText}>
                {showAllSpecs ? 'Show Less' : 'Show All Specifications (25 Parameters)'}
              </Text>
              <Ionicons
                name={showAllSpecs ? 'chevron-up' : 'chevron-down'}
                size={16}
                color="#0F172A"
              />
            </TouchableOpacity>
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
          <TouchableOpacity style={styles.cardGroup} onPress={() => setInvoiceModalVisible(true)} activeOpacity={0.8}>
            <View style={[styles.rowItem, { borderBottomWidth: 0 }]}>
              <View style={styles.rowLeft}>
                <Ionicons name="alert-circle-outline" size={17} color={RED_TEXT} style={styles.rowIcon} />
                <Text style={styles.rowKey}>{invNumber}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.rowValue, { color: RED_TEXT }]}>
                  {invStatus} · {formatCurrencyWithCents(invAmount)}
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Pop-up Modals */}
      <LocationModal
        visible={locationModalVisible}
        onClose={() => setLocationModalVisible(false)}
        orderNo={orderNo}
        address={fullAddress}
      />

      <ContactModal
        visible={contactModalVisible}
        onClose={() => setContactModalVisible(false)}
        orderNo={orderNo}
        contactName={contactName}
        contactPhone={formattedPhone}
        contactEmail={contactEmail}
      />

      <TrackModal
        visible={trackModalVisible}
        onClose={() => setTrackModalVisible(false)}
        orderNo={orderNo}
        trackingNo={trackingNo}
      />

      <InvoiceModal
        visible={invoiceModalVisible}
        onClose={() => setInvoiceModalVisible(false)}
        invNumber={invNumber}
        invStatus={invStatus}
        invAmount={invAmount}
        companyName={companyName}
        orderNo={orderNo}
      />
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

  // Top Hero Container matching exact screenshot
  heroHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 2,
    marginBottom: 4,
  },
  heroLeftCol: {
    flex: 1,
    paddingRight: 10,
    justifyContent: 'center',
  },
  heroCompanyName: {
    fontSize: 15,
    fontFamily: Typography.headingSemiBold,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 2,
  },
  heroOrderNo: {
    fontSize: 24,
    fontFamily: Typography.headingSemiBold,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  heroStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroAmountText: {
    fontSize: 15,
    fontFamily: Typography.headingSemiBold,
    fontWeight: '600',
    color: '#475569',
  },
  heroDotText: {
    fontSize: 15,
    fontFamily: Typography.headingSemiBold,
    color: '#94A3B8',
  },
  heroStatusText: {
    fontSize: 15,
    fontFamily: Typography.headingSemiBold,
    fontWeight: '700',
  },
  statusOpen: {
    color: '#16A34A',
  },
  statusOther: {
    color: '#3B82F6',
  },

  // Right Side 2x2 Grid Action Cards
  actionGridContainer: {
    gap: 6,
  },
  actionGridRow: {
    flexDirection: 'row',
    gap: 6,
  },
  actionCard: {
    width: 82,
    height: 64,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 3,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  actionCardLabel: {
    fontSize: 12,
    fontFamily: Typography.headingSemiBold,
    fontWeight: '600',
    color: '#334155',
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
  rowValueBold: {
    fontSize: 14,
    fontFamily: Typography.headingSemiBold,
    fontWeight: '700',
    color: PRIMARY,
  },
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
  specRowValue: {
    flex: 1.3,
    fontSize: 13.5,
    fontFamily: Typography.headingSemiBold,
    color: PRIMARY,
    textAlign: 'right',
  },
  specRowValueBold: {
    flex: 1.3,
    fontSize: 13.5,
    fontFamily: Typography.headingSemiBold,
    fontWeight: '700',
    color: PRIMARY,
    textAlign: 'right',
  },
  specToggleBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    backgroundColor: '#F8FAFC',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  specToggleBtnText: {
    fontSize: 13,
    fontFamily: Typography.headingSemiBold,
    color: PRIMARY,
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

  // ─── Modal Styles ─────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
    gap: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },

  demoTagPill: {
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  demoTagText: {
    fontSize: 10,
    fontFamily: Typography.headingSemiBold,
    color: '#64748B',
  },

  // Tracking Modal Styles
  trackCardBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  trackStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusDotActive: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#2563EB',
  },
  trackStatusText: {
    fontSize: 12,
    fontFamily: Typography.headingSemiBold,
    color: '#1E40AF',
  },
  carrierText: {
    fontSize: 13,
    fontFamily: Typography.headingSemiBold,
    color: '#475569',
  },

  modalBodyGrid: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 10,
  },
  modalGridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gridKey: {
    fontSize: 13,
    fontFamily: Typography.bodyMedium,
    color: '#64748B',
  },
  gridValue: {
    fontSize: 13,
    fontFamily: Typography.bodyMedium,
    color: '#0F172A',
  },
  gridValueBold: {
    fontSize: 13,
    fontFamily: Typography.headingSemiBold,
    color: '#0F172A',
  },
  gridValueHighlight: {
    fontSize: 13,
    fontFamily: Typography.headingSemiBold,
    color: '#2563EB',
  },

  // Timeline
  timelineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  timelineStep: {
    alignItems: 'center',
    gap: 4,
  },
  timelineLineDone: {
    flex: 1,
    height: 2,
    backgroundColor: '#16A34A',
    marginBottom: 14,
  },
  timelineLinePending: {
    flex: 1,
    height: 2,
    backgroundColor: '#E2E8F0',
    marginBottom: 14,
  },
  timelineTextDone: {
    fontSize: 10,
    fontFamily: Typography.bodyMedium,
    color: '#16A34A',
  },
  timelineTextActive: {
    fontSize: 10,
    fontFamily: Typography.headingSemiBold,
    color: '#2563EB',
  },
  timelineTextPending: {
    fontSize: 10,
    fontFamily: Typography.bodyMedium,
    color: '#94A3B8',
  },

  // Invoice Hero
  invoiceHeroCard: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 4,
  },
  invoiceHeroCompany: {
    fontSize: 13,
    fontFamily: Typography.bodyMedium,
    color: '#64748B',
  },
  invoiceHeroAmount: {
    fontSize: 26,
    fontFamily: Typography.titleSerif,
    fontWeight: '700',
    color: '#0F172A',
  },
  unpaidBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 2,
  },
  unpaidBadgeText: {
    fontSize: 12,
    fontFamily: Typography.headingSemiBold,
    color: '#DC2626',
  },
  paidBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 2,
  },
  paidBadgeText: {
    fontSize: 12,
    fontFamily: Typography.headingSemiBold,
    color: '#16A34A',
  },

  // Footer Buttons
  primaryActionBtn: {
    height: 44,
    backgroundColor: '#0F172A',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  primaryActionBtnText: {
    fontSize: 14,
    fontFamily: Typography.headingSemiBold,
    color: '#FFFFFF',
  },
  modalFooterRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  secondaryActionBtn: {
    flex: 1,
    height: 44,
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryActionBtnText: {
    fontSize: 14,
    fontFamily: Typography.headingSemiBold,
    color: '#475569',
  },
  primaryActionBtnFlex: {
    flex: 1.5,
    height: 44,
    backgroundColor: '#0F172A',
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
