import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Typography } from '../../constants/Typography';
import { useThemeColors } from '../../context/ThemeContext';
import { formatNumber } from '../../services/api/orders.service';

interface PaginationFooterProps {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  limit?: number;
  isFetchingNextPage?: boolean;
  onPrev: () => void;
  onNext: () => void;
  style?: any;
  recordLabel?: string;
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
  recordLabel = 'orders',
}) => {
  const colors = useThemeColors();
  const pageStart = totalRecords === 0 ? 0 : (currentPage - 1) * limit + 1;
  const pageEnd = Math.min(currentPage * limit, totalRecords);

  const prevDisabled = currentPage <= 1;
  const nextDisabled = currentPage >= totalPages || isFetchingNextPage;

  return (
    <View style={[styles.container, { borderTopColor: colors.border }, style]}>
      <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
        {totalRecords === 0
          ? `No ${recordLabel}`
          : `Showing ${pageStart}–${pageEnd} of ${formatNumber(totalRecords)}`}
      </Text>

      <View style={styles.buttonsRow}>
        <TouchableOpacity
          style={[
            styles.button,
            { borderColor: colors.border, backgroundColor: colors.card },
            prevDisabled && styles.buttonDisabled,
          ]}
          onPress={onPrev}
          disabled={prevDisabled}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.buttonText,
              { color: prevDisabled ? colors.textMuted : colors.textPrimary },
            ]}
          >
            Previous
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            { borderColor: colors.border, backgroundColor: colors.card },
            nextDisabled && styles.buttonDisabled,
          ]}
          onPress={onNext}
          disabled={nextDisabled}
          activeOpacity={0.7}
        >
          {isFetchingNextPage ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 4 }} />
          ) : null}
          <Text
            style={[
              styles.buttonText,
              { color: nextDisabled ? colors.textMuted : colors.textPrimary },
            ]}
          >
            Next
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const hairline = StyleSheet.hairlineWidth > 0 ? StyleSheet.hairlineWidth : 0.5;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: hairline,
    marginTop: 8,
  },
  summaryText: {
    fontSize: 13,
    fontFamily: Typography.body,
  },
  buttonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonText: {
    fontSize: 13,
    fontFamily: Typography.headingSemiBold,
    fontWeight: '600',
  },
});
