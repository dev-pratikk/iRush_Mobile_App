import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Typography } from '../../constants/Typography';
import { formatNumber } from '../../services/api/orders.service';

const PRIMARY = '#2C2C2A';
const SECONDARY = '#9C9B95';
const DIVIDER = '#E7E6E2';

interface PaginationFooterProps {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  limit?: number;
  isFetchingNextPage?: boolean;
  onPrev: () => void;
  onNext: () => void;
  style?: any;
}

export const PaginationFooter: React.FC<PaginationFooterProps> = ({
  currentPage,
  totalPages,
  totalRecords,
  limit = 10,
  isFetchingNextPage = false,
  onPrev,
  onNext,
  style,
}) => {
  const pageStart = totalRecords === 0 ? 0 : (currentPage - 1) * limit + 1;
  const pageEnd = Math.min(currentPage * limit, totalRecords);

  const prevDisabled = currentPage <= 1;
  const nextDisabled = currentPage >= totalPages || isFetchingNextPage;

  return (
    <View style={[styles.paginationWrap, style]}>
      <Text style={styles.paginationSummary}>
        {totalRecords === 0 ? 'No orders' : `Showing ${pageStart}–${pageEnd} of ${formatNumber(totalRecords)}`}
      </Text>
      <View style={styles.paginationControls}>
        <TouchableOpacity
          style={[styles.pageButton, prevDisabled && styles.pageButtonDisabled]}
          onPress={onPrev}
          disabled={prevDisabled}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={15} color={prevDisabled ? SECONDARY : PRIMARY} />
          <Text style={[styles.pageButtonText, prevDisabled && styles.pageButtonTextDisabled]}>
            Previous
          </Text>
        </TouchableOpacity>

        <Text style={styles.pageIndicator}>
          {isFetchingNextPage ? '…' : `${currentPage} / ${totalPages}`}
        </Text>

        <TouchableOpacity
          style={[styles.pageButton, nextDisabled && styles.pageButtonDisabled]}
          onPress={onNext}
          disabled={nextDisabled}
          activeOpacity={0.7}
        >
          {isFetchingNextPage ? (
            <ActivityIndicator size="small" color={PRIMARY} style={{ marginRight: 4 }} />
          ) : null}
          <Text style={[styles.pageButtonText, nextDisabled && styles.pageButtonTextDisabled]}>
            Next
          </Text>
          <Ionicons name="chevron-forward" size={15} color={nextDisabled ? SECONDARY : PRIMARY} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const hairline = StyleSheet.hairlineWidth > 0 ? StyleSheet.hairlineWidth : 0.5;

const styles = StyleSheet.create({
  paginationWrap: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 12,
    borderTopWidth: hairline,
    borderTopColor: DIVIDER,
    backgroundColor: '#FAFAF8',
    marginTop: 4,
  },
  paginationSummary: {
    fontSize: 12,
    fontFamily: Typography.body,
    color: SECONDARY,
    textAlign: 'center',
  },
  paginationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 96,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#EFEFEC',
    justifyContent: 'center',
  },
  pageButtonDisabled: { backgroundColor: '#F5F5F2' },
  pageButtonText: {
    fontSize: 13,
    fontFamily: Typography.bodySemiBold,
    fontWeight: '600',
    color: PRIMARY,
  },
  pageButtonTextDisabled: { color: SECONDARY },
  pageIndicator: {
    fontSize: 13,
    fontFamily: Typography.bodySemiBold,
    fontWeight: '600',
    color: PRIMARY,
    minWidth: 64,
    textAlign: 'center',
  },
});
