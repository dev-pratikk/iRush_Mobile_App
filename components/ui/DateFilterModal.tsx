import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Typography } from '../../constants/Typography';
import {
  DateFilterPreset,
  getLosAngelesISODate,
  getLosAngelesDateParts,
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

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

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
  const [activeDateTarget, setActiveDateTarget] = useState<'start' | 'end'>('start');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Calendar navigation state (year and month 0-indexed)
  const currentParts = getLosAngelesDateParts();
  const [calendarYear, setCalendarYear] = useState(currentParts.year);
  const [calendarMonth, setCalendarMonth] = useState(currentParts.month - 1);

  useEffect(() => {
    if (visible) {
      setSelectedPreset(activePreset);
      if (customRange) {
        setStartDateInput(customRange.startDate);
        setEndDateInput(customRange.endDate);
      }
      setValidationError(null);
      setActiveDateTarget('start');
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

    const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!isoRegex.test(start) || !isoRegex.test(end)) {
      setValidationError('Please use YYYY-MM-DD format');
      return;
    }

    if (start > end) {
      setValidationError('From date cannot be after To date');
      return;
    }

    onApply('custom', { startDate: start, endDate: end });
    onClose();
  };

  // Quick range shortcuts
  const applyQuickRange = (daysAgo: number) => {
    const today = new Date();
    const past = new Date();
    past.setDate(today.getDate() - daysAgo);

    const pastYear = past.getFullYear();
    const pastMonth = String(past.getMonth() + 1).padStart(2, '0');
    const pastDay = String(past.getDate()).padStart(2, '0');
    const pastISO = `${pastYear}-${pastMonth}-${pastDay}`;

    setStartDateInput(pastISO);
    setEndDateInput(todayISO);
    setValidationError(null);
  };

  // Calendar Day Picker logic
  const daysInMonth = useMemo(() => {
    return new Date(calendarYear, calendarMonth + 1, 0).getDate();
  }, [calendarYear, calendarMonth]);

  const firstDayOfWeek = useMemo(() => {
    return new Date(calendarYear, calendarMonth, 1).getDay();
  }, [calendarYear, calendarMonth]);

  const calendarDays = useMemo(() => {
    const days: Array<{ day: number | null; iso: string | null }> = [];
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push({ day: null, iso: null });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const mStr = String(calendarMonth + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      const iso = `${calendarYear}-${mStr}-${dStr}`;
      days.push({ day: d, iso });
    }
    return days;
  }, [calendarYear, calendarMonth, daysInMonth, firstDayOfWeek]);

  const handleSelectDay = (iso: string) => {
    setValidationError(null);
    if (activeDateTarget === 'start') {
      setStartDateInput(iso);
      if (iso > endDateInput) {
        setEndDateInput(iso);
      }
      setActiveDateTarget('end');
    } else {
      if (iso < startDateInput) {
        setStartDateInput(iso);
      } else {
        setEndDateInput(iso);
      }
    }
  };

  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear((y) => y - 1);
    } else {
      setCalendarMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear((y) => y + 1);
    } else {
      setCalendarMonth((m) => m + 1);
    }
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
              {/* Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Date Range</Text>
                <TouchableOpacity
                  onPress={onClose}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Ionicons name="close" size={20} color="#2C2C2A" />
                </TouchableOpacity>
              </View>

              {/* Compact Preset Selector Grid */}
              <View style={styles.presetGrid}>
                <TouchableOpacity
                  style={[
                    styles.presetPill,
                    selectedPreset === 'today' && styles.presetPillActive,
                  ]}
                  onPress={() => handleSelectPreset('today')}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.presetPillText,
                      selectedPreset === 'today' && styles.presetPillTextActive,
                    ]}
                  >
                    Today
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.presetPill,
                    selectedPreset === 'week' && styles.presetPillActive,
                  ]}
                  onPress={() => handleSelectPreset('week')}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.presetPillText,
                      selectedPreset === 'week' && styles.presetPillTextActive,
                    ]}
                  >
                    This Week
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.presetPill,
                    selectedPreset === 'month' && styles.presetPillActive,
                  ]}
                  onPress={() => handleSelectPreset('month')}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.presetPillText,
                      selectedPreset === 'month' && styles.presetPillTextActive,
                    ]}
                  >
                    This Month
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.presetPill,
                    selectedPreset === 'custom' && styles.presetPillActive,
                  ]}
                  onPress={() => setSelectedPreset('custom')}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.presetPillText,
                      selectedPreset === 'custom' && styles.presetPillTextActive,
                    ]}
                  >
                    Custom Range
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Custom Range View (Expanded Full Heights without Internal Scroll) */}
              {selectedPreset === 'custom' && (
                <View style={styles.customSection}>
                  {/* Range Tabs (From Date / To Date) */}
                  <View style={styles.rangeSelectorRow}>
                    <TouchableOpacity
                      style={[
                        styles.rangeTab,
                        activeDateTarget === 'start' && styles.rangeTabActive,
                      ]}
                      onPress={() => setActiveDateTarget('start')}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.rangeTabSub}>From Date</Text>
                      <Text style={styles.rangeTabValue}>{startDateInput || 'YYYY-MM-DD'}</Text>
                    </TouchableOpacity>

                    <Ionicons name="arrow-forward" size={14} color="#94A3B8" />

                    <TouchableOpacity
                      style={[
                        styles.rangeTab,
                        activeDateTarget === 'end' && styles.rangeTabActive,
                      ]}
                      onPress={() => setActiveDateTarget('end')}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.rangeTabSub}>To Date</Text>
                      <Text style={styles.rangeTabValue}>{endDateInput || 'YYYY-MM-DD'}</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Calendar Month Header */}
                  <View style={styles.calendarNavRow}>
                    <TouchableOpacity
                      onPress={handlePrevMonth}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="chevron-back" size={18} color="#0F172A" />
                    </TouchableOpacity>
                    <Text style={styles.calendarNavTitle}>
                      {MONTH_NAMES[calendarMonth]} {calendarYear}
                    </Text>
                    <TouchableOpacity
                      onPress={handleNextMonth}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="chevron-forward" size={18} color="#0F172A" />
                    </TouchableOpacity>
                  </View>

                  {/* Days of Week Header */}
                  <View style={styles.weekHeaderRow}>
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                      <Text key={idx} style={styles.weekDayLabel}>
                        {day}
                      </Text>
                    ))}
                  </View>

                  {/* Calendar Grid */}
                  <View style={styles.calendarGrid}>
                    {calendarDays.map((item, idx) => {
                      if (!item.day || !item.iso) {
                        return <View key={idx} style={styles.calendarCellEmpty} />;
                      }

                      const isStart = item.iso === startDateInput;
                      const isEnd = item.iso === endDateInput;
                      const isInRange =
                        item.iso > startDateInput && item.iso < endDateInput;

                      return (
                        <TouchableOpacity
                          key={idx}
                          style={[
                            styles.calendarCell,
                            isInRange && styles.calendarCellInRange,
                            (isStart || isEnd) && styles.calendarCellSelected,
                          ]}
                          onPress={() => handleSelectDay(item.iso!)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.calendarCellText,
                              (isStart || isEnd) && styles.calendarCellTextSelected,
                              isInRange && styles.calendarCellTextInRange,
                            ]}
                          >
                            {item.day}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Quick Range Shortcuts */}
                  <View style={styles.quickPillsRow}>
                    <TouchableOpacity
                      style={styles.quickPill}
                      onPress={() => applyQuickRange(6)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.quickPillText}>Last 7 Days</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.quickPill}
                      onPress={() => applyQuickRange(13)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.quickPillText}>Last 14 Days</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.quickPill}
                      onPress={() => applyQuickRange(29)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.quickPillText}>Last 30 Days</Text>
                    </TouchableOpacity>
                  </View>

                  {validationError ? (
                    <Text style={styles.errorText}>{validationError}</Text>
                  ) : null}

                  <TouchableOpacity
                    style={styles.applyBtn}
                    onPress={handleApplyCustom}
                    activeOpacity={0.85}
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
    padding: 16,
  },
  modalContainer: {
    width: '94%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: Typography.headingSemiBold,
    color: '#0F172A',
  },

  // 2x2 Compact Preset Grid
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetPill: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetPillActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  presetPillText: {
    fontSize: 13,
    fontFamily: Typography.bodyMedium,
    color: '#475569',
  },
  presetPillTextActive: {
    fontFamily: Typography.headingSemiBold,
    color: '#FFFFFF',
  },

  customSection: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 12,
  },
  rangeSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  rangeTab: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  rangeTabActive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#0F172A',
    elevation: 1,
  },
  rangeTabSub: {
    fontSize: 10,
    fontFamily: Typography.bodyMedium,
    color: '#64748B',
    textTransform: 'uppercase',
  },
  rangeTabValue: {
    fontSize: 13,
    fontFamily: Typography.headingSemiBold,
    color: '#0F172A',
    marginTop: 2,
  },
  calendarNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginTop: 2,
  },
  calendarNavTitle: {
    fontSize: 14,
    fontFamily: Typography.headingSemiBold,
    color: '#0F172A',
  },
  weekHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 4,
    paddingBottom: 4,
  },
  weekDayLabel: {
    width: 36,
    textAlign: 'center',
    fontSize: 11,
    fontFamily: Typography.headingSemiBold,
    color: '#94A3B8',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  calendarCellEmpty: {
    width: '14.28%',
    height: 34,
  },
  calendarCell: {
    width: '14.28%',
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  calendarCellInRange: {
    backgroundColor: '#E2E8F0',
    borderRadius: 0,
  },
  calendarCellSelected: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
  },
  calendarCellText: {
    fontSize: 13,
    fontFamily: Typography.bodyMedium,
    color: '#334155',
  },
  calendarCellTextInRange: {
    color: '#0F172A',
    fontFamily: Typography.headingSemiBold,
  },
  calendarCellTextSelected: {
    color: '#FFFFFF',
    fontFamily: Typography.headingSemiBold,
  },
  quickPillsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 2,
  },
  quickPill: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
  },
  quickPillText: {
    fontSize: 11,
    fontFamily: Typography.headingSemiBold,
    color: '#334155',
  },
  errorText: {
    fontSize: 11,
    fontFamily: Typography.bodyMedium,
    color: '#DC2626',
    textAlign: 'center',
  },
  applyBtn: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Typography.headingSemiBold,
  },
});
