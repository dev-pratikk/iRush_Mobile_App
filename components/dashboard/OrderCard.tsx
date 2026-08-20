import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Typography } from '../../constants/Typography';
import { formatCurrencyWithCents, formatOrderDate } from '../../lib/formatters';
import { isOrderNew, isOrderRepeat } from '../../services/api/orders.service';

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

  const isLate = typeof daysLeft === 'number' && daysLeft < 0;
  const daysBadge = isLate ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d remaining`;

  const itemPayload = { customerStatus, orderCategory, ORDER_CATEGORY: orderCategory, CUSTOMER_STATUS: customerStatus };
  const isNewCustomer = isOrderNew(itemPayload);
  const isRepeatCustomer = isOrderRepeat(itemPayload);

  return (
    <TouchableOpacity style={styles.cardContainer} onPress={onPress} activeOpacity={0.82}>
      {/* Top Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.orderBadge}>
          <Ionicons name="cube-outline" size={13} color="#0F172A" />
          <Text style={styles.orderNoText}>Order #{formattedNo}</Text>
        </View>

        <View style={styles.tagContainer}>
          {isNewCustomer ? (
            <View style={styles.newTag}>
              <Text style={styles.newTagText}>NEW</Text>
            </View>
          ) : isRepeatCustomer ? (
            <View style={styles.repeatTag}>
              <Text style={styles.repeatTagText}>REPEAT</Text>
            </View>
          ) : null}

          {daysLeft !== undefined && (
            <View style={[styles.daysBadge, isLate ? styles.daysBadgeLate : styles.daysBadgeNormal]}>
              <Ionicons
                name={isLate ? 'warning-outline' : 'time-outline'}
                size={11}
                color={isLate ? '#DC2626' : '#2563EB'}
              />
              <Text style={[styles.daysBadgeText, isLate ? styles.daysBadgeTextLate : styles.daysBadgeTextNormal]}>
                {daysBadge}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Body Section */}
      <View style={styles.bodyRow}>
        <View style={styles.infoCol}>
          <Text style={styles.companyName} numberOfLines={1} ellipsizeMode="tail">
            {companyName || 'N/A'}
          </Text>
          <View style={styles.typeRow}>
            <Ionicons name="hardware-chip-outline" size={12} color="#64748B" />
            <Text style={styles.orderTypeText} numberOfLines={1}>
              {orderType.trim() || 'Full Turnkey'}
            </Text>
            {formattedDate ? (
              <>
                <Text style={styles.dotSeparator}>•</Text>
                <Text style={styles.dateText}>{formattedDate}</Text>
              </>
            ) : null}
          </View>
        </View>

        <View style={styles.amountCol}>
          <Text style={styles.amountText}>{formatCurrencyWithCents(orderTotal)}</Text>
          <Ionicons name="chevron-forward" size={16} color="#94A3B8" style={{ marginTop: 2 }} />
        </View>
      </View>

      {/* Footer Pill Details */}
      <View style={styles.footerRow}>
        <View style={styles.pill}>
          <Ionicons name="people-outline" size={12} color="#475569" />
          <Text style={styles.pillText}>
            Vendors: <Text style={styles.pillBold}>{assignedVendorCount}/{expectedVendorCount}</Text>
          </Text>
        </View>

        {orderCost > 0 ? (
          <View style={styles.pill}>
            <Ionicons name="wallet-outline" size={12} color="#475569" />
            <Text style={styles.pillText}>
              Cost: <Text style={styles.pillBold}>{formatCurrencyWithCents(orderCost)}</Text>
            </Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  orderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  orderNoText: {
    fontSize: 13,
    fontFamily: Typography.headingSemiBold,
    color: '#0F172A',
    letterSpacing: -0.1,
  },
  tagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  newTag: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  newTagText: {
    fontSize: 10,
    fontFamily: Typography.headingSemiBold,
    color: '#1D4ED8',
  },
  repeatTag: {
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  repeatTagText: {
    fontSize: 10,
    fontFamily: Typography.headingSemiBold,
    color: '#6D28D9',
  },
  daysBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  daysBadgeNormal: {
    backgroundColor: '#EFF6FF',
  },
  daysBadgeLate: {
    backgroundColor: '#FEF2F2',
  },
  daysBadgeText: {
    fontSize: 10.5,
    fontFamily: Typography.headingSemiBold,
  },
  daysBadgeTextNormal: {
    color: '#2563EB',
  },
  daysBadgeTextLate: {
    color: '#DC2626',
  },
  bodyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  infoCol: {
    flex: 1,
    paddingRight: 10,
  },
  companyName: {
    fontSize: 15,
    fontFamily: Typography.headingSemiBold,
    color: '#1E293B',
    marginBottom: 4,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  orderTypeText: {
    fontSize: 12,
    fontFamily: Typography.bodyMedium,
    color: '#64748B',
  },
  dotSeparator: {
    fontSize: 12,
    color: '#94A3B8',
  },
  dateText: {
    fontSize: 12,
    fontFamily: Typography.bodyMedium,
    color: '#64748B',
  },
  amountCol: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 4,
  },
  amountText: {
    fontSize: 17,
    fontFamily: Typography.headingSemiBold,
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pillText: {
    fontSize: 11,
    fontFamily: Typography.bodyMedium,
    color: '#475569',
  },
  pillBold: {
    fontFamily: Typography.headingSemiBold,
    color: '#0F172A',
  },
});
