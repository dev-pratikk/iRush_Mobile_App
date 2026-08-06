import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Typography } from '../../constants/Typography';
import { formatCurrencyWithCents, formatOrderDate } from '../../lib/formatters';

export interface OrderCardProps {
  orderNo: string;
  companyName: string;
  orderType?: string;
  orderTotal: number;
  orderDate?: string;
  daysLeft?: number;
  assignedVendorCount?: number;
  expectedVendorCount?: number;
  orderCost?: number;
  markup?: number;
  markupPercentage?: number;
  customerStatus?: string;
  orderCategory?: string;
  onPress?: () => void;
}

export const OrderCard = React.memo(function OrderCard({
  orderNo,
  companyName,
  orderType = 'Full Turnkey',
  orderTotal = 0,
  orderDate,
  daysLeft = 0,
  assignedVendorCount = 0,
  expectedVendorCount = 1,
  orderCost = 0,
  markup,
  markupPercentage,
  customerStatus,
  orderCategory,
  onPress,
}: OrderCardProps) {
  const formattedNo = (orderNo || '').replace(/^#/, '').trim() || 'N/A';
  const formattedDate = formatOrderDate(orderDate);

  const calculatedMarkupPct = React.useMemo(() => {
    if (typeof markupPercentage === 'number' && Number.isFinite(markupPercentage)) {
      return Math.round(markupPercentage);
    }
    const cost = orderCost || 0;
    const total = orderTotal || 0;
    const rawMarkup = typeof markup === 'number' ? markup : total - cost;
    if (cost > 0) {
      return Math.round((rawMarkup / cost) * 100);
    }
    return total > 0 ? 100 : 0;
  }, [markupPercentage, orderCost, orderTotal, markup]);

  const isLate = typeof daysLeft === 'number' && daysLeft < 0;
  const daysBadge = isLate ? `+${Math.abs(daysLeft)}d late` : `${daysLeft}d left`;

  const category = String(customerStatus || orderCategory || '').toUpperCase().trim();
  const isNewCustomer = category === 'NEW';
  const isRepeatCustomer = category === 'REPEATED' || category === 'REPEAT';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      {/* Top Main Section */}
      <View style={styles.mainRow}>
        {/* Left Column: Order No (Highlighted Badge, no #), Company, Order Type */}
        <View style={styles.leftCol}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <View style={styles.orderNoHighlightBadge}>
              <Text style={styles.orderNoHighlightText} numberOfLines={1}>
                {formattedNo}
              </Text>
            </View>
            {isNewCustomer ? (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>NEW</Text>
              </View>
            ) : isRepeatCustomer ? (
              <View style={styles.repeatBadge}>
                <Text style={styles.repeatBadgeText}>REPEAT</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.companyText} numberOfLines={1} ellipsizeMode="tail">
            {companyName || 'N/A'}
          </Text>
          <Text style={styles.orderTypeText} numberOfLines={1} ellipsizeMode="tail">
            {orderType.trim() || 'Full Turnkey'}
          </Text>
        </View>

        {/* Right Column: Order Value, Date, Days Left */}
        <View style={styles.rightCol}>
          <Text style={styles.amountText}>{formatCurrencyWithCents(orderTotal)}</Text>
          {formattedDate ? <Text style={styles.dateText}>{formattedDate}</Text> : null}
          <View style={[styles.daysBadge, isLate ? styles.daysBadgeLate : styles.daysBadgeNormal]}>
            <Ionicons
              name="time-outline"
              size={11}
              color={isLate ? '#DC2626' : '#2563EB'}
              style={{ marginRight: 3 }}
            />
            <Text style={[styles.daysBadgeText, isLate ? styles.daysBadgeTextLate : styles.daysBadgeTextNormal]}>
              {daysBadge}
            </Text>
          </View>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Bottom Row of Clean Styled Pills */}
      <View style={styles.footerPillRow}>
        {/* Vendor Assigned Pill */}
        <View style={styles.vendorPill}>
          <Ionicons name="people-outline" size={12} color="#475569" />
          <Text style={styles.pillText}>
            <Text style={styles.pillValueBold}>{assignedVendorCount}/{expectedVendorCount}</Text> vendors
          </Text>
        </View>

        {/* Order Cost Pill */}
        <View style={styles.costPill}>
          <Ionicons name="wallet-outline" size={12} color="#475569" />
          <Text style={styles.pillText}>
            Cost: <Text style={styles.pillValueBold}>{formatCurrencyWithCents(orderCost)}</Text>
          </Text>
        </View>

        {/* Markup Percentage Pill */}
        <View style={styles.costPill}>
          <Ionicons name="trending-up-outline" size={12} color="#475569" />
          <Text style={styles.pillText}>
            Markup: <Text style={styles.pillValueBold}>{calculatedMarkupPct}%</Text>
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  mainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  leftCol: {
    flex: 1,
    paddingRight: 10,
  },
  orderNoHighlightBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  orderNoHighlightText: {
    fontSize: 14,
    fontFamily: Typography.heading,
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  newBadge: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  newBadgeText: {
    fontSize: 10,
    fontFamily: Typography.headingSemiBold,
    color: '#1D4ED8',
  },
  repeatBadge: {
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  repeatBadgeText: {
    fontSize: 10,
    fontFamily: Typography.headingSemiBold,
    color: '#6D28D9',
  },
  companyText: {
    fontSize: 14,
    fontFamily: Typography.headingSemiBold,
    color: '#334155',
  },
  orderTypeText: {
    fontSize: 12,
    fontFamily: Typography.bodyMedium,
    color: '#64748B',
    marginTop: 2,
  },
  rightCol: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 16.5,
    fontFamily: Typography.heading,
    color: '#0F172A',
  },
  dateText: {
    fontSize: 12,
    fontFamily: Typography.bodyMedium,
    color: '#64748B',
    marginTop: 2,
  },
  daysBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 5,
  },
  daysBadgeNormal: {
    backgroundColor: '#EFF6FF',
  },
  daysBadgeLate: {
    backgroundColor: '#FEF2F2',
  },
  daysBadgeText: {
    fontSize: 11,
    fontFamily: Typography.headingSemiBold,
  },
  daysBadgeTextNormal: {
    color: '#2563EB',
  },
  daysBadgeTextLate: {
    color: '#DC2626',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  footerPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  vendorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
  },
  costPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
  },
  pillText: {
    fontSize: 11.5,
    fontFamily: Typography.bodyMedium,
    color: '#475569',
  },
  pillValueBold: {
    fontSize: 11.5,
    fontFamily: Typography.headingSemiBold,
    color: '#0F172A',
  },
});
