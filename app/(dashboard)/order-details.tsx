import React, { useEffect, useMemo, useState, useCallback } from 'react';
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Typography } from '../../constants/Typography';
import { router, useLocalSearchParams } from 'expo-router';
import { formatCurrencyWithCents, formatOrderDate, fetchOrderById } from '../../services/api/orders.service';
import { useAuthContext } from '../../context/AuthContext';

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

const extractOrderTotal = (ord: any): number => {
  if (!ord) return 0;

  const candidates = [
    ord.ORDER_TOTAL,
    ord.ORDER_TOTALCOST_AF_DISCCHRG,   // new endpoint key
    ord.orderTotal,
    ord.ORDER_AMOUNT,
    ord.orderAmount,
    ord.TOTAL_AMOUNT,
    ord.totalAmount,
    ord.GRAND_TOTAL,
    ord.grandTotal,
    ord.TOTAL_PRICE,
    ord.totalPrice,
    ord.AMOUNT,
    ord.amount,
    ord.TOTAL,
    ord.total,
    ord.NET_AMOUNT,
    ord.netAmount,
    ord.PRICE,
    ord.price,
  ];

  for (const val of candidates) {
    if (val !== null && val !== undefined && val !== '') {
      const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.-]+/g, ''));
      if (Number.isFinite(num) && num > 0) {
        return num;
      }
    }
  }

  if (Array.isArray(ord.orderDetails) && ord.orderDetails.length > 0) {
    let sumDetails = 0;
    for (const d of ord.orderDetails) {
      const dTotal = d.ORDER_TOTAL ?? d.orderTotal ?? d.TOTAL_PRICE ?? d.totalPrice ?? d.TOTAL_AMOUNT ?? d.totalAmount;
      if (dTotal !== null && dTotal !== undefined && dTotal !== '') {
        const num = typeof dTotal === 'number' ? dTotal : parseFloat(String(dTotal).replace(/[^0-9.-]+/g, ''));
        if (Number.isFinite(num) && num > 0) {
          sumDetails += num;
        }
      } else {
        const q = Number(d.QUANTITY ?? d.quantity ?? 0);
        const p = Number(d.UNIT_PRICE ?? d.unitPrice ?? d.PRICE ?? d.price ?? 0);
        if (q > 0 && p > 0) {
          sumDetails += q * p;
        }
      }
    }
    if (sumDetails > 0) return sumDetails;
  }

  return 0;
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

// ─── Invoice Modal Component (Matches Proforma Invoice Layout) ──────────────────

const InvoiceModal = ({
  visible,
  onClose,
  orderNo,
  companyName,
  companyCode,
  poNumber,
  orderTotal,
  orderDate,
  salesperson,
  partNo,
  lineQty,
  unitPrice,
  netTerm,
  invNumber,
  invStatus,
  invAmount,
  contactName,
  fullAddress,
}: {
  visible: boolean;
  onClose: () => void;
  orderNo: string;
  companyName: string;
  companyCode?: string;
  poNumber?: string;
  orderTotal: number;
  orderDate: string;
  salesperson: string;
  partNo: string;
  lineQty: number;
  unitPrice: number;
  netTerm: string;
  invNumber: string;
  invStatus: string;
  invAmount: number;
  contactName: string;
  fullAddress: string;
}) => {
  const insets = useSafeAreaInsets();
  const isUnpaid =
    invStatus.toLowerCase().includes('unpaid') || invStatus === 'Open' || invStatus === 'Pending' || invAmount === 0;

  const effectiveCompanyCode = companyCode || 'GS 100';
  const effectivePo = poNumber || '1364 / WIRE TRANSFER';
  const effectiveSalesperson = salesperson !== 'N/A' ? salesperson : 'Mehraj';
  const subtotal = orderTotal > 0 ? orderTotal : (lineQty > 0 && unitPrice > 0 ? lineQty * unitPrice : 36560.00);
  const taxRate = 0.09375;
  const taxAmount = Math.round(subtotal * taxRate * 100) / 100;
  const totalDue = Math.round((subtotal + taxAmount) * 100) / 100;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View
        style={[
          styles.modalOverlay,
          {
            paddingTop: Math.max(insets.top + 16, 24),
            paddingBottom: Math.max(insets.bottom + 16, 24),
          },
        ]}
      >
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View
          style={[
            styles.modalCard,
            {
              maxWidth: 500,
              width: '96%',
              maxHeight: '92%',
              paddingHorizontal: 18,
              paddingVertical: 16,
              flexDirection: 'column',
            },
          ]}
        >
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLeft}>
              <View style={styles.modalIconCircle}>
                <Ionicons name="receipt-outline" size={20} color="#0F172A" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.modalTitle} numberOfLines={1}>
                    Invoice Breakdown
                  </Text>
                  <View style={isUnpaid ? styles.unpaidBadgePill : styles.paidBadgePill}>
                    <Text style={isUnpaid ? styles.unpaidBadgeText : styles.paidBadgeText}>
                      {isUnpaid ? 'UNPAID' : 'PAID'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.modalSubTitle}>Invoice #{invNumber !== 'N/A' ? invNumber : `${orderNo}-1`}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={20} color="#475569" />
            </TouchableOpacity>
          </View>

          {/* Scrollable Proforma Invoice Body */}
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 8 }}>
            {/* Invoice Metadata Banner */}
            <View style={styles.invMetaBanner}>
              <View style={styles.invMetaRow}>
                <Text style={styles.invMetaLabel}>INVOICE #</Text>
                <Text style={styles.invMetaValue}>{invNumber !== 'N/A' ? invNumber : `${orderNo}-1`}</Text>
              </View>
              <View style={styles.invMetaRow}>
                <Text style={styles.invMetaLabel}>Date</Text>
                <Text style={styles.invMetaValue}>{orderDate}</Text>
              </View>
              <View style={styles.invMetaRow}>
                <Text style={styles.invMetaLabel}>Customer #</Text>
                <Text style={styles.invMetaValue}>{effectiveCompanyCode}</Text>
              </View>
              <View style={styles.invMetaRow}>
                <Text style={styles.invMetaLabel}>Customer PO #</Text>
                <Text style={styles.invMetaValue}>{effectivePo}</Text>
              </View>
            </View>

            {/* Bill To & Ship To Cards */}
            <View style={styles.invAddressContainer}>
              <View style={styles.invAddressCard}>
                <Text style={styles.invAddressTitle}>BILL TO</Text>
                <Text style={styles.invAddressName}>{contactName !== 'N/A' ? contactName : 'Salman Mirza'}</Text>
                <Text style={styles.invAddressCompany}>{companyName !== 'N/A' ? companyName : 'GS Microelectronics US, Inc.'}</Text>
                <Text style={styles.invAddressText}>{fullAddress}</Text>
              </View>

              <View style={styles.invAddressCard}>
                <Text style={styles.invAddressTitle}>SHIP TO</Text>
                <Text style={styles.invAddressName}>{contactName !== 'N/A' ? contactName : 'Hoang Nguyen'}</Text>
                <Text style={styles.invAddressCompany}>{companyName !== 'N/A' ? companyName : 'GS Microelectronics US, Inc.'}</Text>
                <Text style={styles.invAddressText}>{fullAddress}</Text>
              </View>
            </View>

            {/* Order & Terms Bar */}
            <View style={styles.invTermsBar}>
              <View style={styles.invTermsCol}>
                <Text style={styles.invTermsLabel}>ORDER DATE</Text>
                <Text style={styles.invTermsValue}>{orderDate}</Text>
              </View>
              <View style={styles.invTermsCol}>
                <Text style={styles.invTermsLabel}>SHIP VIA</Text>
                <Text style={styles.invTermsValue}>Customer Pick Up</Text>
              </View>
              <View style={styles.invTermsCol}>
                <Text style={styles.invTermsLabel}>FOB</Text>
                <Text style={styles.invTermsValue}>Origin</Text>
              </View>
              <View style={styles.invTermsCol}>
                <Text style={styles.invTermsLabel}>TERMS</Text>
                <Text style={styles.invTermsValue}>{netTerm || 'Wire'}</Text>
              </View>
              <View style={styles.invTermsCol}>
                <Text style={styles.invTermsLabel}>SALES PERSON</Text>
                <Text style={styles.invTermsValue}>{effectiveSalesperson}</Text>
              </View>
              <View style={styles.invTermsCol}>
                <Text style={styles.invTermsLabel}>ORDER #</Text>
                <Text style={styles.invTermsValue}>{orderNo}</Text>
              </View>
            </View>

            {/* Line Item Breakdown Card (Responsive, 100% Width, No Horizontal Scroll) */}
            <View style={styles.invLineItemCard}>
              <View style={styles.invLineItemHeaderRow}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.invLineItemPartNo}>
                    {partNo !== 'N/A' ? partNo : 'BRAMBLE TEST BOARD REV A'}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <View style={styles.productTypePill}>
                      <Text style={styles.productTypeText}>PCB Parts</Text>
                    </View>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.invLineItemTotalLabel}>AMOUNT</Text>
                  <Text style={styles.invLineItemTotalVal}>
                    {formatCurrencyWithCents(subtotal)}
                  </Text>
                </View>
              </View>

              {/* 4 Metrics Grid below Part # */}
              <View style={styles.invMetricsGrid}>
                <View style={styles.invMetricCol}>
                  <Text style={styles.invMetricLabel}>QTY REQ</Text>
                  <Text style={styles.invMetricVal}>{lineQty || 50}</Text>
                </View>
                <View style={styles.invMetricCol}>
                  <Text style={styles.invMetricLabel}>QTY SHP</Text>
                  <Text style={styles.invMetricVal}>{lineQty || 50}</Text>
                </View>
                <View style={styles.invMetricCol}>
                  <Text style={styles.invMetricLabel}>BACK ORDER</Text>
                  <Text style={styles.invMetricVal}>0</Text>
                </View>
                <View style={[styles.invMetricCol, { alignItems: 'flex-end' }]}>
                  <Text style={styles.invMetricLabel}>UNIT PRICE</Text>
                  <Text style={styles.invMetricVal}>
                    {unitPrice > 0 ? formatCurrencyWithCents(unitPrice) : '$731.20'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Totals Summary */}
            <View style={styles.invTotalsCard}>
              <View style={styles.invTotalRow}>
                <Text style={styles.invTotalLabel}>Subtotal</Text>
                <Text style={styles.invTotalVal}>{formatCurrencyWithCents(subtotal)}</Text>
              </View>
              <View style={styles.invTotalRow}>
                <Text style={styles.invTotalLabel}>Sales Tax (9.375%)</Text>
                <Text style={styles.invTotalVal}>{formatCurrencyWithCents(taxAmount)}</Text>
              </View>
              <View style={[styles.invTotalRow, { borderTopWidth: 1, borderTopColor: '#CBD5E1', paddingTop: 8, marginTop: 4 }]}>
                <Text style={[styles.invTotalLabel, { fontSize: 14, fontWeight: '700', color: '#0F172A' }]}>TOTAL DUE</Text>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>{formatCurrencyWithCents(totalDue)}</Text>
              </View>
            </View>

            {/* External Remark */}
            <View style={styles.invRemarkBox}>
              <Ionicons name="information-circle-outline" size={16} color="#475569" style={{ marginTop: 1 }} />
              <Text style={styles.invRemarkText}>
                ~ Proforma Invoice ~ Requesting prepayment amount of {formatCurrencyWithCents(totalDue)} ASAP ~
              </Text>
            </View>
          </ScrollView>

          {/* Bottom Close Button */}
          <TouchableOpacity style={styles.primaryActionBtn} onPress={onClose} activeOpacity={0.85}>
            <Text style={styles.primaryActionBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ─── Full Specifications Modal Component ─────────────────────────────────────

const AllSpecificationsModal = ({
  visible,
  onClose,
  orderNo,
  isItar,
  specsList,
}: {
  visible: boolean;
  onClose: () => void;
  orderNo: string;
  isItar: boolean;
  specsList: { label: string; value: string; isBold?: boolean }[];
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
                <Text style={styles.modalSubTitle}>Order #{orderNo}</Text>
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

          {/* Scrollable Specs List */}
          <ScrollView
            style={styles.specsScrollView}
            contentContainerStyle={styles.specsScrollContent}
            showsVerticalScrollIndicator={true}
            bounces={true}
          >
            <View style={styles.cardGroup}>
              {specsList.map((item, index) => (
                <View
                  key={index}
                  style={[
                    styles.specRowItem,
                    index === specsList.length - 1 ? { borderBottomWidth: 0 } : null,
                  ]}
                >
                  <Text style={styles.specRowKey}>{item.label}</Text>
                  <Text style={item.isBold ? styles.specRowValueBold : styles.specRowValue}>
                    {item.value}
                  </Text>
                </View>
              ))}
            </View>
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

// ─── Main Screen Component ────────────────────────────────────────────────────

export default function OrderDetailsScreen() {
  const params = useLocalSearchParams<{ orderData?: string; orderId?: string; from?: string }>();
  const { user } = useAuthContext();
  const token = (user as any)?.token ?? null;
  const [fetchedOrder, setFetchedOrder] = useState<any>(null);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [trackModalVisible, setTrackModalVisible] = useState(false);
  const [invoiceModalVisible, setInvoiceModalVisible] = useState(false);
  const [specsModalVisible, setSpecsModalVisible] = useState(false);

  const handleBack = React.useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else if (params.from) {
      router.replace(params.from as any);
    } else {
      router.replace('/all-orders' as any);
    }
  }, [params.from]);

  useEffect(() => {
    const onBackPress = () => {
      handleBack();
      return true;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [handleBack]);

  const initialParsedOrder = useMemo(() => {
    if (params.orderData) {
      try {
        return JSON.parse(params.orderData);
      } catch (e) {
        // pass through to fallback
      }
    }
    return null;
  }, [params.orderData]);

  const targetOrderId =
    params.orderId ||
    initialParsedOrder?.ORDER_ID ||
    initialParsedOrder?.orderId ||
    initialParsedOrder?.ORDERD_ID ||
    initialParsedOrder?.id;

  React.useEffect(() => {
    let active = true;
    if (targetOrderId) {
      fetchOrderById(targetOrderId, { token }).then((fullOrder) => {
        if (active && fullOrder) {
          setFetchedOrder(fullOrder);
        }
      });
    }
    return () => {
      active = false;
    };
  }, [targetOrderId, token]);

  const order = fetchedOrder || initialParsedOrder;

  // Extract fields matching real API payload
  const orderNo = String(
    order?.ORDER_NO ?? order?.orderNo ?? order?.ORDER_ID ?? order?.orderId ?? targetOrderId ?? 'N/A'
  ).replace(/^#/, '').trim();

  const companyName = decodeHtml(
    order?.COMPANY_NAME ?? order?.companyName ?? order?.COMPANY_CODE ?? order?.companyCode ?? 'N/A'
  );

  const orderTotal = useMemo(() => extractOrderTotal(order), [order]);

  const orderCost = Number.isFinite(order?.ORDER_COST)
    ? order.ORDER_COST!
    : (Number.isFinite(order?.orderCost) ? order.orderCost! : 0);

  const markupAmount = Number.isFinite(order?.MARKUP)
    ? order.MARKUP!
    : (Number.isFinite(order?.markup) ? order.markup! : (orderTotal > 0 && orderCost > 0 ? orderTotal - orderCost : 0));

  const markupPct = Number.isFinite(order?.MARKUP_PERCENTAGE)
    ? Math.round(order.MARKUP_PERCENTAGE!)
    : (Number.isFinite(order?.markupPercentage)
    ? Math.round(order.markupPercentage!)
    : (orderCost > 0 ? Math.round((markupAmount / orderCost) * 100) : (orderTotal > 0 ? 100 : 0)));

  const orderStatus = String(order?.ORDER_STATUS ?? order?.orderStatus ?? 'Open').trim();

  // Specifications
  const spec = order?.orderSpecifications && order.orderSpecifications.length > 0 ? order.orderSpecifications[0] : null;

  // Order info — handle both UPPER_SNAKE and camelCase
  const rawType = order?.ORDER_TYPE_NAME ?? order?.orderTypeName ?? order?.ORDER_TYPE ?? order?.orderType ?? spec?.OrderType;
  const orderType = rawType && String(rawType).trim() !== 'null' && String(rawType).trim() !== '' ? String(rawType).trim() : 'N/A';

  const rawQuote = String(order?.QUOTE_NO ?? order?.quoteNo ?? '').trim();
  const quoteNo = rawQuote
    ? rawQuote.replace(/^#(PCB|PCBA)?/i, '').replace(/^PCB-?/i, '').replace(/^#/i, '').trim() || 'N/A'
    : 'N/A';

  const salesperson = (
    order?.SALESPERSON_NAME ??
    order?.salesPersonName ??
    order?.salespersonName ??
    order?.shippingAddress?.salesPersonName ??
    'N/A'
  ).trim();

  // customerStatus — old endpoint: CUSTOMER_STATUS; new endpoint: ORDER_REPEATOF
  const customerStatus = (
    order?.CUSTOMER_STATUS ??
    order?.customerStatus ??
    (order?.ORDER_REPEATOF != null
      ? (Number(order.ORDER_REPEATOF) === 0 ? 'NEW' : 'REPEATED')
      : '')
  ).trim();
  const netTerm = String(
    order?.netTerm ?? order?.shippingAddress?.netTerm ?? ''
  ).trim();

  const companyCode = String(order?.COMPANY_CODE ?? order?.companyCode ?? '').trim();
  const poNumber = String(order?.PO_NUMBER ?? order?.poNumber ?? order?.CUSTOMER_PO ?? order?.customerPo ?? '').trim();

  // Dates
  const formatDate = (d: string | null | undefined) => {
    return formatOrderDate(d);
  };
  const orderDate = formatDate(order?.ORDER_DATE ?? order?.orderDate);
  const updatedDate = formatDate(order?.UPDATED_DATE ?? order?.updatedDate);
  const quoteDate = formatDate(order?.QUOTE_DATE ?? order?.quoteDate);

  // Line items
  const details = order?.orderDetails && order.orderDetails.length > 0 ? order.orderDetails[0] : null;
  const lineQty = Number(details?.QUANTITY ?? order?.orderedQuantity ?? order?.quantity ?? 0);
  const unitPrice = Number(details?.UNIT_PRICE ?? order?.unitPrice ?? (lineQty > 0 && orderTotal > 0 ? Math.round((orderTotal / lineQty) * 100) / 100 : 0));

  // Promised / finish dates from order detail
  const finishDate = formatDate(details?.FINISH_DATE);
  const promisedDate = formatDate(details?.PROMISED_DATE);
  const turnDays = details?.DAY ?? 0;

  // Vendor fulfillment info
  const vendorFulfillment = (order?.vendorFulfillment ?? '').trim();
  const assignedVendorCount = Number(order?.assignedVendorCount ?? 0);
  const expectedVendorCount = Number(order?.expectedVendorCount ?? 0);
  const vendorFulfillmentLabel =
    vendorFulfillment === 'NO_VENDOR' ? 'No Vendor' :
    vendorFulfillment === 'PARTIAL_VENDOR' ? 'Partially Sourced' :
    vendorFulfillment === 'FULLY_SOURCED' ? 'Fully Sourced' :
    vendorFulfillment || 'N/A';

  // Specifications
  const partNo = (spec?.PCBPARTNO ?? order?.pcbpartNo ?? order?.PCBPARTNO ?? order?.partNo ?? order?.PARTNO ?? 'N/A').trim();
  const rev = spec?.REV != null ? String(spec.REV).trim() : (order?.rev != null ? String(order.rev).trim() : '0');
  const orderTypeSpec = (spec?.OrderType ?? order?.ORDER_TYPE_NAME ?? order?.orderType ?? 'Full Turnkey').trim();
  const boardSize = (spec?.BoardSize ?? order?.boardSize ?? 'N/A').trim();
  const panelSize = (spec?.PanelSize ?? order?.panelSize ?? 'N/A').trim();
  const boardsPerPanel = spec?.BoardPerPanel != null ? String(spec.BoardPerPanel).trim() : (order?.boardsPerPanel != null ? String(order.boardsPerPanel).trim() : 'N/A');
  const layerCount = (spec?.Layer ?? order?.layerCount ?? 'N/A').trim();
  const ipcClass = (spec?.IpcClass ?? order?.ipcClass ?? 'N/A').trim();
  const maskColor = (spec?.MaskColor ?? order?.maskColor ?? 'N/A').trim();
  const silkColor = (spec?.SilkscreenColor ?? order?.silkscreenColor ?? 'N/A').trim();
  const material = (spec?.Material ?? order?.material ?? 'N/A').trim();
  const thickness = (spec?.Thickness ?? order?.thickness ?? 'N/A').trim();
  const innerCopper = (spec?.InnerCopper ?? order?.innerCopper ?? 'N/A').trim();
  const outerCopper = (spec?.OuterCopper ?? order?.outerCopper ?? 'N/A').trim();
  const plating = (spec?.Plating ?? order?.plating ?? 'N/A').trim();
  const approxHoles = spec?.ApproxHoles != null ? String(spec.ApproxHoles).trim() : (order?.approxHoles != null ? String(order.approxHoles).trim() : 'N/A');
  const smallestHoles = (spec?.SmallestHoles ?? order?.smallestHoles ?? 'N/A').trim();
  const minTrace = (spec?.MinTrace ?? order?.minTrace ?? 'N/A').trim();
  const minSpace = (spec?.MinSpace ?? order?.minSpace ?? 'N/A').trim();
  const smdPitch = (spec?.SmdPitch ?? order?.smdPitch ?? 'N/A').trim();
  const smdPads = spec?.NoOfSmdPads != null ? String(spec.NoOfSmdPads).trim() : (order?.smdPads != null ? String(order.smdPads).trim() : 'N/A');
  const smdSided = (spec?.SmdSided ?? order?.smdSided ?? 'N/A').trim();
  const isItar = spec?.ITAR === 1 || String(spec?.ITAR).toLowerCase() === 'yes' || order?.itar === 1 || String(order?.itar).toLowerCase() === 'yes';
  const testing = (spec?.Testing ?? order?.testing ?? 'N/A').trim();
  const routing = (spec?.Routing ?? order?.routing ?? 'N/A').trim();
  const controlledImpedance = (spec?.ControlledImpedence ?? order?.controlledImpedance ?? 'N/A').trim();
  const platedEdges = (spec?.PlatedEdges ?? order?.platedEdges ?? 'N/A').trim();
  const rohs = (spec?.Rohs ?? order?.rohs ?? 'N/A').trim();
  const blindBuriedVias = (spec?.BlindOrBuriedVias ?? order?.blindBuriedVias ?? 'N/A').trim();

  const formatSpecKey = useCallback((key: string): string => {
    if (!key) return '';
    const lower = key.toLowerCase();
    if (lower === 'pcbpartno' || lower === 'partno') return 'Pcb Part No';
    if (lower === 'rev' || lower === 'revision') return 'Revision';
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
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }, []);

  const allSpecsList = useMemo(
    () => [
      { label: 'Part Number', value: partNo, isBold: true },
      { label: 'Revision', value: rev },
      { label: 'Order Type', value: orderTypeSpec },
      { label: 'Layer Count', value: layerCount },
      { label: 'Base Material', value: material },
      { label: 'Board Thickness', value: thickness },
      { label: 'Board Dimensions', value: boardSize },
      { label: 'Panel Dimensions', value: panelSize || 'N/A' },
      { label: 'Boards per Panel', value: boardsPerPanel },
      { label: 'Plating Finish', value: plating },
      { label: 'Solder Mask Color', value: maskColor },
      { label: 'Silkscreen Color', value: silkColor },
      { label: 'Inner Copper Weight', value: innerCopper },
      { label: 'Outer Copper Weight', value: outerCopper },
      { label: 'SMD Placement', value: smdSided },
      { label: 'SMD Pitch', value: smdPitch },
      { label: 'SMD Pads Count', value: smdPads },
      { label: 'Total Hole Count', value: approxHoles },
      { label: 'Smallest Hole Size', value: smallestHoles },
      { label: 'Min Trace Width', value: minTrace },
      { label: 'Min Trace Spacing', value: minSpace },
      { label: 'IPC Classification', value: ipcClass },
      { label: 'Electrical Testing', value: testing },
      { label: 'Routing Method', value: routing },
      { label: 'Controlled Impedance', value: controlledImpedance },
      { label: 'Plated Edges', value: platedEdges },
      { label: 'RoHS Compliance', value: rohs },
      { label: 'Blind / Buried Vias', value: blindBuriedVias },
    ],
    [
      partNo,
      rev,
      orderTypeSpec,
      layerCount,
      material,
      thickness,
      boardSize,
      panelSize,
      boardsPerPanel,
      plating,
      maskColor,
      silkColor,
      innerCopper,
      outerCopper,
      smdSided,
      smdPitch,
      smdPads,
      approxHoles,
      smallestHoles,
      minTrace,
      minSpace,
      ipcClass,
      testing,
      routing,
      controlledImpedance,
      platedEdges,
      rohs,
      blindBuriedVias,
    ]
  );

  const dynamicSpecsList = useMemo(() => {
    const list: { label: string; value: string; isBold?: boolean }[] = [];
    const rawSpec =
      (order?.orderSpecifications && order.orderSpecifications.length > 0
        ? order.orderSpecifications[0]
        : null) ||
      (order?.orderDetails && order.orderDetails.length > 0
        ? order.orderDetails[0]
        : null);

    if (rawSpec && typeof rawSpec === 'object') {
      const ignoredKeys = new Set([
        'SPEC_ID', 'specId', 'ORDER_ID', 'orderId', 'CUSTOMERID', 'customerId',
        'CREATED_BY', 'UPDATED_BY', 'CREATED_DATE', 'UPDATED_DATE', 'IS_ACTIVE',
        'is_active', 'DELETED', 'deleted'
      ]);

      Object.entries(rawSpec).forEach(([k, v]) => {
        if (ignoredKeys.has(k)) return;
        if (v === null || v === undefined) return;
        if (typeof v === 'object') return;

        const label = formatSpecKey(k);
        let valStr = String(v).trim();
        if (!valStr || valStr === 'null' || valStr === 'undefined') valStr = 'N/A';

        if (v === true || valStr.toLowerCase() === 'true') valStr = 'Yes';
        if (v === false || valStr.toLowerCase() === 'false') valStr = 'No';

        const isBoldKey =
          k.toLowerCase().includes('part') ||
          k.toLowerCase().includes('layer') ||
          k.toLowerCase().includes('type');

        list.push({
          label,
          value: valStr,
          isBold: isBoldKey,
        });
      });
    }

    return list.length > 0 ? list : allSpecsList;
  }, [order, allSpecsList, formatSpecKey]);

  // Vendor
  const vendorObj = order?.orderVendors && order.orderVendors.length > 0 ? order.orderVendors[0] : null;
  const vendorName = decodeHtml(vendorObj?.vendor?.vendorCompanyName ?? vendorObj?.vendorCompanyName ?? order?.vendorName ?? 'N/A');

  // Shipping & Contact
  const ship = order?.shippingAddress || {};
  const city = ship.cityName || '';
  const state = ship.stateName ? ship.stateName.toUpperCase() : '';
  const addr1 = ship.addressText1 || '';
  const addr2 = ship.addressText2 ? `, ${ship.addressText2}` : '';
  const zip = ship.zipCode || '';
  const fullAddress = [addr1 + addr2, city, state, zip].filter(Boolean).join(', ') || 'Address not available';

  const contact = order?.customerContact || {};
  const firstName = contact.firstName || order?.contactFirstName || '';
  const lastName = contact.lastName || order?.contactLastName || '';
  const contactName = `${firstName} ${lastName}`.trim() || 'N/A';
  const contactEmail = contact.email || order?.contactEmail || 'N/A';
  const rawPhone = contact.phone1 || order?.contactPhone || '';
  const formattedPhone =
    rawPhone.length === 10
      ? `(${rawPhone.slice(0, 3)}) ${rawPhone.slice(3, 6)}-${rawPhone.slice(6)}`
      : rawPhone || 'N/A';

  // Invoice & Shipment
  const inv = order?.invoices && order.invoices.length > 0 ? order.invoices[0] : null;
  const invNumber = inv?.INV_NUMBER ?? order?.invoiceNumber ?? 'N/A';
  const invStatus = inv?.invoiceStatus ?? order?.invoiceStatus ?? 'N/A';
  const invAmount = inv?.INVOICE_AMOUNT ?? order?.invoiceAmount ?? 0;

  const pack = order?.orderPackingSlips && order.orderPackingSlips.length > 0 ? order.orderPackingSlips[0] : null;
  const trackingNo = pack?.TRACK_NUMBER ?? order?.trackingNumber ?? 'N/A';

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
        <View style={styles.heroSectionCentered}>
          <Text style={styles.heroCompanyNameCentered} numberOfLines={1}>
            {companyName}
          </Text>
          <Text style={styles.heroOrderNoCentered} numberOfLines={1}>
            Order #{orderNo}
          </Text>
          <View style={styles.heroStatusRowCentered}>
            <Text style={styles.heroAmountTextCentered}>
              {formatCurrencyWithCents(orderTotal)}
            </Text>
            <Text style={styles.heroDotTextCentered}> · </Text>
            <Text
              style={[
                styles.heroStatusTextCentered,
                orderStatus.toLowerCase() === 'open' ? styles.statusOpen : styles.statusOther,
              ]}
            >
              {orderStatus}
            </Text>
          </View>
          <Text style={styles.heroPartNoTextCentered} numberOfLines={1}>
            Part #: {partNo}
          </Text>

          {/* Horizontal Dates Bar */}
          <View style={styles.heroDatesRowHorizontal}>
            <View style={styles.heroDateItem}>
              <Text style={styles.heroDateLabel}>ORDER</Text>
              <Text style={styles.heroDateValue}>{orderDate}</Text>
            </View>
            <View style={styles.heroDateDivider} />
            <View style={styles.heroDateItem}>
              <Text style={styles.heroDateLabel}>PROMISED</Text>
              <Text style={styles.heroDateValue}>{promisedDate !== 'N/A' ? promisedDate : '—'}</Text>
            </View>
            <View style={styles.heroDateDivider} />
            <View style={styles.heroDateItem}>
              <Text style={styles.heroDateLabel}>FINISH</Text>
              <Text style={styles.heroDateValue}>{finishDate !== 'N/A' ? finishDate : '—'}</Text>
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
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.rowValue}>{quoteNo}</Text>
                {quoteDate !== 'N/A' ? (
                  <Text style={styles.rowSubValue}>{quoteDate}</Text>
                ) : null}
              </View>
            </View>

            <View style={styles.rowItem}>
              <View style={styles.rowLeft}>
                <Ionicons name="person-outline" size={17} color={SECONDARY} style={styles.rowIcon} />
                <Text style={styles.rowKey}>Salesperson</Text>
              </View>
              <Text style={styles.rowValue}>{salesperson}</Text>
            </View>

            <View style={styles.rowItem}>
              <View style={styles.rowLeft}>
                <Ionicons name="cube-outline" size={17} color={SECONDARY} style={styles.rowIcon} />
                <Text style={styles.rowKey}>Quantity</Text>
              </View>
              <Text style={styles.rowValue}>{lineQty}</Text>
            </View>

            {netTerm ? (
              <View style={styles.rowItem}>
                <View style={styles.rowLeft}>
                  <Ionicons name="card-outline" size={17} color={SECONDARY} style={styles.rowIcon} />
                  <Text style={styles.rowKey}>Payment Term</Text>
                </View>
                <Text style={styles.rowValue}>{netTerm}</Text>
              </View>
            ) : null}

            <View style={styles.rowItem}>
              <View style={styles.rowLeft}>
                <Ionicons name="repeat-outline" size={17} color={SECONDARY} style={styles.rowIcon} />
                <Text style={styles.rowKey}>Order Category</Text>
              </View>
              <View
                style={[
                  styles.customerStatusBadge,
                  customerStatus === 'REPEATED' || customerStatus === 'Repeat'
                    ? styles.badgeRepeated
                    : styles.badgeNew,
                ]}
              >
                <Text
                  style={[
                    styles.customerStatusBadgeText,
                    customerStatus === 'REPEATED' || customerStatus === 'Repeat'
                      ? styles.badgeRepeatedText
                      : styles.badgeNewText,
                  ]}
                >
                  {customerStatus === 'REPEATED' || customerStatus === 'Repeat' ? 'Repeat' : 'New'}
                </Text>
              </View>
            </View>

            {/* Contact Row inside ORDER table with chevron arrow */}
            <TouchableOpacity
              style={[styles.rowItem, { borderBottomWidth: 0 }]}
              onPress={() => setContactModalVisible(true)}
              activeOpacity={0.7}
            >
              <View style={styles.rowLeft}>
                <Ionicons name="call-outline" size={17} color={SECONDARY} style={styles.rowIcon} />
                <Text style={styles.rowKey}>Contact</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 }}>
                <Text style={[styles.rowValue, { flexShrink: 1 }]} numberOfLines={1}>
                  {contactName}
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 2: SPECIFICATIONS */}
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

          {/* Minimal 2 Core Parameters */}
          <View style={styles.cardGroup}>
            <View style={styles.specRowItem}>
              <Text style={styles.specRowKey}>Layers</Text>
              <Text style={styles.specRowValueBold}>{layerCount}</Text>
            </View>

            <View style={[styles.specRowItem, { borderBottomWidth: 0 }]}>
              <Text style={styles.specRowKey}>Board Size</Text>
              <Text style={styles.specRowValue}>{boardSize}</Text>
            </View>
          </View>
        </View>

        {/* Section 3: VENDOR & SHIPPING */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionHeaderTitle}>VENDOR & SHIPPING</Text>
          <View style={styles.cardGroup}>
            <View style={styles.rowItem}>
              <View style={styles.rowLeft}>
                <Ionicons name="business-outline" size={17} color={SECONDARY} style={styles.rowIcon} />
                <Text style={styles.rowKey}>Vendor</Text>
              </View>
              <Text style={styles.rowValue}>{vendorName}</Text>
            </View>

            <TouchableOpacity
              style={[styles.rowItem, { borderBottomWidth: 0 }]}
              onPress={() => setLocationModalVisible(true)}
              activeOpacity={0.7}
            >
              <View style={styles.rowLeft}>
                <Ionicons name="location-outline" size={17} color={SECONDARY} style={styles.rowIcon} />
                <Text style={styles.rowKey}>Ship to</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 }}>
                <Text style={[styles.rowValue, { flexShrink: 1 }]} numberOfLines={1}>
                  {city ? `${city}, ${state}` : 'View Address'}
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 4: INVOICE */}
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

        {/* Section 5: TRACKING */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionHeaderTitle}>TRACKING</Text>
          <TouchableOpacity style={styles.cardGroup} onPress={() => setTrackModalVisible(true)} activeOpacity={0.8}>
            <View style={[styles.rowItem, { borderBottomWidth: 0 }]}>
              <View style={styles.rowLeft}>
                <Ionicons name="bus-outline" size={17} color={PRIMARY} style={styles.rowIcon} />
                <Text style={styles.rowKey}>Track Shipment</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.rowValue}>{trackingNo !== 'N/A' ? `#${trackingNo}` : 'View Tracking'}</Text>
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
        orderNo={orderNo}
        companyName={companyName}
        companyCode={companyCode}
        poNumber={poNumber}
        orderTotal={orderTotal}
        orderDate={orderDate}
        salesperson={salesperson}
        partNo={partNo}
        lineQty={lineQty}
        unitPrice={unitPrice}
        netTerm={netTerm}
        invNumber={invNumber}
        invStatus={invStatus}
        invAmount={invAmount}
        contactName={contactName}
        fullAddress={fullAddress}
      />

      <AllSpecificationsModal
        visible={specsModalVisible}
        onClose={() => setSpecsModalVisible(false)}
        orderNo={orderNo}
        isItar={isItar}
        specsList={dynamicSpecsList}
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

  // Centered Hero section matching user's image layout
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
    color: '#16A34A',
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

  // Centered Action Buttons (Contact & Track)
  actionButtonsRowCentered: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 36,
    marginTop: 20,
  },
  actionItemCentered: {
    alignItems: 'center',
  },
  actionCircleCentered: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  actionLabelCentered: {
    fontSize: 12.5,
    fontFamily: Typography.headingSemiBold,
    fontWeight: '600',
    color: '#334155',
    marginTop: 6,
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
  rowSubValue: {
    fontSize: 11.5,
    fontFamily: Typography.bodyMedium,
    color: SECONDARY,
    marginTop: 2,
    textAlign: 'right',
  },
  customerStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeRepeated: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  badgeNew: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  customerStatusBadgeText: {
    fontSize: 12,
    fontFamily: Typography.headingSemiBold,
    fontWeight: '700',
  },
  badgeRepeatedText: {
    color: '#1D4ED8',
  },
  badgeNewText: {
    color: '#15803D',
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
    width: '100%',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingRight: 8,
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
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99,
    elevation: 4,
  },
  specsCloseBtn: {
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
    fontFamily: Typography.headingSemiBold,
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

  // Full Specifications Modal
  specsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  specsModalCard: {
    width: '100%',
    maxHeight: '84%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
  },
  specsModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  specsScrollView: {
    flexShrink: 1,
    paddingHorizontal: 20,
  },
  specsScrollContent: {
    paddingVertical: 14,
  },
  specModalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  specModalRowLast: {
    borderBottomWidth: 0,
  },
  specModalKey: {
    fontSize: 13,
    fontFamily: Typography.bodyMedium,
    color: '#64748B',
  },
  specModalValue: {
    fontSize: 13,
    fontFamily: Typography.bodyMedium,
    color: '#0F172A',
  },
  specModalValueBold: {
    fontFamily: Typography.headingSemiBold,
    fontWeight: '600',
  },
  specsModalFooter: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },

  // Horizontal Dates Bar in Top Hero
  heroDatesRowHorizontal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginTop: 12,
    gap: 12,
  },
  heroDateItem: {
    alignItems: 'center',
  },
  heroDateLabel: {
    fontSize: 9.5,
    fontFamily: Typography.headingSemiBold,
    color: '#64748B',
    letterSpacing: 0.5,
  },
  heroDateValue: {
    fontSize: 12,
    fontFamily: Typography.headingSemiBold,
    color: '#0F172A',
    marginTop: 2,
    fontWeight: '700',
  },
  heroDateDivider: {
    width: 1,
    height: 18,
    backgroundColor: '#CBD5E1',
  },

  // Proforma Invoice Breakdown Modal Styling
  invMetaBanner: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    gap: 6,
  },
  invMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invMetaLabel: {
    fontSize: 11,
    fontFamily: Typography.headingSemiBold,
    color: '#64748B',
    letterSpacing: 0.3,
  },
  invMetaValue: {
    fontSize: 12,
    fontFamily: Typography.headingSemiBold,
    color: '#0F172A',
    fontWeight: '700',
  },
  invAddressContainer: {
    flexDirection: 'column',
    gap: 8,
  },
  invAddressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    gap: 2,
  },
  invAddressTitle: {
    fontSize: 10,
    fontFamily: Typography.headingSemiBold,
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  invAddressName: {
    fontSize: 13,
    fontFamily: Typography.headingSemiBold,
    color: '#0F172A',
    fontWeight: '700',
  },
  invAddressCompany: {
    fontSize: 12,
    fontFamily: Typography.bodyMedium,
    color: '#334155',
  },
  invAddressText: {
    fontSize: 11,
    fontFamily: Typography.body,
    color: '#64748B',
    lineHeight: 16,
    marginTop: 2,
  },
  invTermsBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 10,
    gap: 10,
  },
  invTermsCol: {
    minWidth: '28%',
    flex: 1,
  },
  invTermsLabel: {
    fontSize: 9,
    fontFamily: Typography.headingSemiBold,
    color: '#64748B',
    letterSpacing: 0.5,
  },
  invTermsValue: {
    fontSize: 11.5,
    fontFamily: Typography.headingSemiBold,
    color: '#0F172A',
    marginTop: 2,
    fontWeight: '600',
  },
  // Responsive Line Item Card (No Horizontal Scroll)
  invLineItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 12,
  },
  invLineItemHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 10,
  },
  invLineItemPartNo: {
    fontSize: 13,
    fontFamily: Typography.headingSemiBold,
    color: '#0F172A',
    fontWeight: '700',
    lineHeight: 18,
  },
  productTypePill: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  productTypeText: {
    fontSize: 10,
    fontFamily: Typography.headingSemiBold,
    color: '#475569',
  },
  invLineItemTotalLabel: {
    fontSize: 9,
    fontFamily: Typography.headingSemiBold,
    color: '#64748B',
    letterSpacing: 0.5,
  },
  invLineItemTotalVal: {
    fontSize: 14,
    fontFamily: Typography.headingSemiBold,
    color: '#0F172A',
    fontWeight: '800',
    marginTop: 1,
  },
  invMetricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invMetricCol: {
    flex: 1,
    gap: 2,
  },
  invMetricLabel: {
    fontSize: 9,
    fontFamily: Typography.headingSemiBold,
    color: '#64748B',
    letterSpacing: 0.4,
  },
  invMetricVal: {
    fontSize: 12,
    fontFamily: Typography.headingSemiBold,
    color: '#0F172A',
    fontWeight: '700',
  },
  invTotalsCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 6,
  },
  invTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invTotalLabel: {
    fontSize: 12,
    fontFamily: Typography.bodyMedium,
    color: '#64748B',
  },
  invTotalVal: {
    fontSize: 12.5,
    fontFamily: Typography.headingSemiBold,
    color: '#0F172A',
    fontWeight: '600',
  },
  invRemarkBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
  },
  invRemarkText: {
    flex: 1,
    fontSize: 11,
    fontFamily: Typography.bodyMedium,
    color: '#92400E',
    lineHeight: 16,
  },
});
