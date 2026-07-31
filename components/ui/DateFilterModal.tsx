import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  TouchableWithoutFeedback,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Typography } from '../../constants/Typography';
import {
  DateFilterPreset,
  getLosAngelesISODate,
  getDateRangeForFilter,
} from '../../lib/date';

interface DateFilterModalProps {
  visible: boolean;
  onClose: () => void;
  activePreset: DateFilterPreset;
  customRange?: { startDate: string; endDate: string } | null;
  onApply: (
    preset: DateFilterPreset,
    customRange: { startDate: string; endDate: string } | null
  ) => void;
}

export const DateFilterModal: React.FC<DateFilterModalProps> = ({
  visible,
  onClose,
  activePreset,
  customRange,
  onApply,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<DateFilterPreset>(activePreset);
  const todayISO = getLosAngelesISODate();
  const [startDateInput, setStartDateInput] = useState(
    customRange?.startDate || '2026-07-01'
  );
  const [endDateInput, setEndDateInput] = useState(customRange?.endDate || todayISO);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setSelectedPreset(activePreset);
      if (customRange) {
        setStartDateInput(customRange.startDate);
        setEndDateInput(customRange.endDate);
      }
      setValidationError(null);
    }
  }, [visible, activePreset, customRange]);

  const handleSelectPreset = (preset: DateFilterPreset) => {
    setSelectedPreset(preset);
    setValidationError(null);
    if (preset !== 'custom') {
      onApply(preset, null);
      onClose();
    }
  };

  const handleApplyCustom = () => {
    const start = startDateInput.trim();
    const end = endDateInput.trim();

    // Simple ISO date regex YYYY-MM-DD
    const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!isoRegex.test(start) || !isoRegex.test(end)) {
      setValidationError('Please use YYYY-MM-DD format (e.g. 2026-07-01)');
      return;
    }

    if (start > end) {
      setValidationError('From date cannot be after To date');
      return;
    }

    onApply('custom', { startDate: start, endDate: end });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Date Range</Text>
                <TouchableOpacity
                  onPress={onClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={20} color="#2C2C2A" />
                </TouchableOpacity>
              </View>

              <View style={styles.optionsList}>
                {/* Today */}
                <TouchableOpacity
                  style={[
                    styles.optionItem,
                    selectedPreset === 'today' && styles.optionItemActive,
                  ]}
                  onPress={() => handleSelectPreset('today')}
                  activeOpacity={0.7}
                >
                  <View style={styles.optionLeft}>
                    <Ionicons
                      name="today-outline"
                      size={18}
                      color={selectedPreset === 'today' ? '#0F172A' : '#64748B'}
                    />
                    <Text
                      style={[
                        styles.optionText,
                        selectedPreset === 'today' && styles.optionTextActive,
                      ]}
                    >
                      Today
                    </Text>
                  </View>
                  {selectedPreset === 'today' && (
                    <Ionicons name="checkmark-circle" size={18} color="#0F172A" />
                  )}
                </TouchableOpacity>

                {/* This Week */}
                <TouchableOpacity
                  style={[
                    styles.optionItem,
                    selectedPreset === 'week' && styles.optionItemActive,
                  ]}
                  onPress={() => handleSelectPreset('week')}
                  activeOpacity={0.7}
                >
                  <View style={styles.optionLeft}>
                    <Ionicons
                      name="calendar-outline"
                      size={18}
                      color={selectedPreset === 'week' ? '#0F172A' : '#64748B'}
                    />
                    <Text
                      style={[
                        styles.optionText,
                        selectedPreset === 'week' && styles.optionTextActive,
                      ]}
                    >
                      This Week
                    </Text>
                  </View>
                  {selectedPreset === 'week' && (
                    <Ionicons name="checkmark-circle" size={18} color="#0F172A" />
                  )}
                </TouchableOpacity>

                {/* This Month */}
                <TouchableOpacity
                  style={[
                    styles.optionItem,
                    selectedPreset === 'month' && styles.optionItemActive,
                  ]}
                  onPress={() => handleSelectPreset('month')}
                  activeOpacity={0.7}
                >
                  <View style={styles.optionLeft}>
                    <Ionicons
                      name="calendar-number-outline"
                      size={18}
                      color={selectedPreset === 'month' ? '#0F172A' : '#64748B'}
                    />
                    <Text
                      style={[
                        styles.optionText,
                        selectedPreset === 'month' && styles.optionTextActive,
                      ]}
                    >
                      This Month
                    </Text>
                  </View>
                  {selectedPreset === 'month' && (
                    <Ionicons name="checkmark-circle" size={18} color="#0F172A" />
                  )}
                </TouchableOpacity>

                {/* Custom Range */}
                <TouchableOpacity
                  style={[
                    styles.optionItem,
                    selectedPreset === 'custom' && styles.optionItemActive,
                  ]}
                  onPress={() => setSelectedPreset('custom')}
                  activeOpacity={0.7}
                >
                  <View style={styles.optionLeft}>
                    <Ionicons
                      name="options-outline"
                      size={18}
                      color={selectedPreset === 'custom' ? '#0F172A' : '#64748B'}
                    />
                    <Text
                      style={[
                        styles.optionText,
                        selectedPreset === 'custom' && styles.optionTextActive,
                      ]}
                    >
                      Custom Range
                    </Text>
                  </View>
                  {selectedPreset === 'custom' && (
                    <Ionicons name="checkmark-circle" size={18} color="#0F172A" />
                  )}
                </TouchableOpacity>
              </View>

              {/* Custom Date Range Inputs */}
              {selectedPreset === 'custom' && (
                <View style={styles.customSection}>
                  <Text style={styles.customSectionTitle}>Enter Date Range</Text>
                  
                  <View style={styles.dateInputsRow}>
                    <View style={styles.dateInputCol}>
                      <Text style={styles.inputLabel}>From Date</Text>
                      <TextInput
                        style={styles.dateInput}
                        value={startDateInput}
                        onChangeText={setStartDateInput}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor="#94A3B8"
                        keyboardType="numbers-and-punctuation"
                      />
                    </View>

                    <View style={styles.dateInputCol}>
                      <Text style={styles.inputLabel}>To Date</Text>
                      <TextInput
                        style={styles.dateInput}
                        value={endDateInput}
                        onChangeText={setEndDateInput}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor="#94A3B8"
                        keyboardType="numbers-and-punctuation"
                      />
                    </View>
                  </View>

                  {validationError ? (
                    <Text style={styles.errorText}>{validationError}</Text>
                  ) : null}

                  <TouchableOpacity
                    style={styles.applyBtn}
                    onPress={handleApplyCustom}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.applyBtnText}>Apply Custom Range</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: Typography.headingSemiBold,
    color: '#0F172A',
  },
  optionsList: {
    gap: 8,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  optionItemActive: {
    backgroundColor: '#F1F5F9',
    borderColor: '#0F172A',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  optionText: {
    fontSize: 14,
    fontFamily: Typography.bodyMedium,
    color: '#475569',
  },
  optionTextActive: {
    fontFamily: Typography.headingSemiBold,
    color: '#0F172A',
  },
  customSection: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 10,
  },
  customSectionTitle: {
    fontSize: 13,
    fontFamily: Typography.headingSemiBold,
    color: '#334155',
  },
  dateInputsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dateInputCol: {
    flex: 1,
    gap: 4,
  },
  inputLabel: {
    fontSize: 11,
    fontFamily: Typography.bodyMedium,
    color: '#64748B',
  },
  dateInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    fontFamily: Typography.bodyMedium,
    color: '#0F172A',
  },
  errorText: {
    fontSize: 11,
    fontFamily: Typography.bodyMedium,
    color: '#DC2626',
  },
  applyBtn: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: Typography.headingSemiBold,
  },
});
