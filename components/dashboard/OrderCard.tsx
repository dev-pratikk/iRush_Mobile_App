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
  onPress,
}: OrderCardProps) {
  const formattedNo = (orderNo || '').replace(/^#/, '').trim() || 'N/A';
  const formattedDate = formatOrderDate(orderDate);
  const calculatedMarkup = typeof markup === 'number' ? markup : orderTotal - orderCost;
  const isLate = typeof daysLeft === 'number' && daysLeft < 0;
  const daysBadge = isLate ? `+${Math.abs(daysLeft)}d late` : `${daysLeft}d left`;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      {/* Top Main Row */}
      <View style={styles.mainRow}>
        {/* Left Column: Order #, Company, Order Type */}
        <View style={styles.leftCol}>
          <Text style={styles.orderNoText} numberOfLines={1} ellipsizeMode="tail">
            #{formattedNo}
          </Text>
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

      {/* Bottom Financials & Vendor Row */}
      <View style={styles.footerRow}>
        {/* Vendor Assigned */}
        <View style={styles.footerItem}>
          <Ionicons name="people-outline" size={13} color="#64748B" />
          <Text style={styles.footerLabel}>
            <Text style={styles.footerValue}>{assignedVendorCount}/{expectedVendorCount}</Text> vendors
          </Text>
        </View>

        {/* Order Cost */}
        <View style={styles.footerItem}>
          <Ionicons name="wallet-outline" size={13} color="#64748B" />
          <Text style={styles.footerLabel}>
            Cost: <Text style={styles.footerValue}>{formatCurrencyWithCents(orderCost)}</Text>
          </Text>
        </View>

        {/* Markup Cost */}
        <View style={styles.footerItem}>
          <Ionicons name="trending-up-outline" size={13} color="#16A34A" />
          <Text style={styles.footerLabel}>
            Markup: <Text style={[styles.footerValue, { color: '#16A34A' }]}>{formatCurrencyWithCents(calculatedMarkup)}</Text>
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
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
  orderNoText: {
    fontSize: 16,
    fontFamily: Typography.headingSemiBold,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  companyText: {
    fontSize: 13.5,
    fontFamily: Typography.headingSemiBold,
    fontWeight: '600',
    color: '#334155',
    marginTop: 2,
  },
  orderTypeText: {
    fontSize: 12,
    fontFamily: Typography.bodyMedium,
    color: '#64748B',
    marginTop: 3,
  },
  rightCol: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 16,
    fontFamily: Typography.headingSemiBold,
    fontWeight: '700',
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
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
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
    fontWeight: '600',
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
    marginVertical: 10,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerLabel: {
    fontSize: 11.5,
    fontFamily: Typography.bodyMedium,
    color: '#64748B',
  },
  footerValue: {
    fontSize: 11.5,
    fontFamily: Typography.headingSemiBold,
    fontWeight: '600',
    color: '#0F172A',
  },
});
