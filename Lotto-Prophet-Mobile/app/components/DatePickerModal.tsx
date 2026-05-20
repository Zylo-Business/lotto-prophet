import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTheme, type AppColors } from '../context/ThemeContext';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (date: Date) => void;
  selectedDate?: Date;
  maxDate?: Date;
  minDate?: Date;
};

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function DatePickerModal({
  visible,
  onClose,
  onSelect,
  selectedDate,
  maxDate,
  minDate,
}: Props) {
  const { colors: COLORS, isDark } = useTheme();
  const styles = useMemo(() => createStyles(COLORS, isDark), [COLORS, isDark]);
  const today = useMemo(() => new Date(), []);

  // Default to showing a reasonable year for DOB (e.g. 2000)
  const initialDate = selectedDate ?? new Date(2000, 0, 1);
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());
  const [showYearPicker, setShowYearPicker] = useState(false);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
  }, [viewYear, viewMonth, daysInMonth, firstDay]);

  // Year range: 1920 to maxDate year (or current year)
  const maxYear = maxDate ? maxDate.getFullYear() : today.getFullYear();
  const years = useMemo(() => {
    const list: number[] = [];
    for (let y = maxYear; y >= 1920; y--) list.push(y);
    return list;
  }, [maxYear]);

  function goToPrevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  }

  function goToNextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  }

  function isDateDisabled(day: number): boolean {
    const date = new Date(viewYear, viewMonth, day);
    if (maxDate && date > maxDate) return true;
    if (minDate && date < minDate) return true;
    return false;
  }

  function handleDayPress(day: number) {
    if (isDateDisabled(day)) return;
    const date = new Date(viewYear, viewMonth, day);
    onSelect(date);
    onClose();
  }

  function handleYearSelect(year: number) {
    setViewYear(year);
    setShowYearPicker(false);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.container} onPress={() => {}}>
          {showYearPicker ? (
            // ─── Year picker ───────────────────────
            <View style={styles.yearPickerContainer}>
              <View style={styles.yearPickerHeader}>
                <Text style={styles.yearPickerTitle}>Select Year</Text>
                <Pressable onPress={() => setShowYearPicker(false)}>
                  <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                </Pressable>
              </View>
              <ScrollView
                style={styles.yearList}
                showsVerticalScrollIndicator={false}
              >
                {years.map((y) => (
                  <Pressable
                    key={y}
                    style={[
                      styles.yearItem,
                      y === viewYear && styles.yearItemSelected,
                    ]}
                    onPress={() => handleYearSelect(y)}
                  >
                    <Text
                      style={[
                        styles.yearItemText,
                        y === viewYear && styles.yearItemTextSelected,
                      ]}
                    >
                      {y}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : (
            // ─── Calendar ──────────────────────────
            <>
              {/* Navigation header */}
              <View style={styles.header}>
                <Pressable onPress={goToPrevMonth} style={styles.navButton}>
                  <Ionicons name="chevron-back" size={22} color={COLORS.text} />
                </Pressable>

                <Pressable
                  onPress={() => setShowYearPicker(true)}
                  style={styles.monthYearButton}
                >
                  <Text style={styles.monthYearText}>
                    {MONTHS[viewMonth]} {viewYear}
                  </Text>
                  <Ionicons name="caret-down" size={14} color={COLORS.primary} />
                </Pressable>

                <Pressable onPress={goToNextMonth} style={styles.navButton}>
                  <Ionicons name="chevron-forward" size={22} color={COLORS.text} />
                </Pressable>
              </View>

              {/* Weekday labels */}
              <View style={styles.weekRow}>
                {WEEKDAYS.map((wd) => (
                  <Text key={wd} style={styles.weekdayLabel}>
                    {wd}
                  </Text>
                ))}
              </View>

              {/* Days grid */}
              <View style={styles.daysGrid}>
                {calendarDays.map((day, idx) => {
                  if (day === null) {
                    return <View key={`empty-${idx}`} style={styles.dayCell} />;
                  }

                  const disabled = isDateDisabled(day);
                  const isSelected =
                    selectedDate &&
                    isSameDay(selectedDate, new Date(viewYear, viewMonth, day));
                  const isToday = isSameDay(
                    today,
                    new Date(viewYear, viewMonth, day),
                  );

                  return (
                    <Pressable
                      key={day}
                      style={[
                        styles.dayCell,
                        isToday && styles.todayCell,
                        isSelected && styles.selectedCell,
                        disabled && styles.disabledCell,
                      ]}
                      onPress={() => handleDayPress(day)}
                      disabled={disabled}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          isSelected && styles.selectedDayText,
                          disabled && styles.disabledDayText,
                        ]}
                      >
                        {day}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Footer */}
              <View style={styles.footer}>
                <Pressable onPress={onClose} style={styles.cancelButton}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
              </View>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const CELL_SIZE = 42;

const createStyles = (COLORS: AppColors & { today?: string }, isDark: boolean) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: 340,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  // ─── Header ──────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthYearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  monthYearText: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
  },
  // ─── Weekdays ────────────────────
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 4,
  },
  weekdayLabel: {
    width: CELL_SIZE,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  // ─── Days ────────────────────────
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  dayText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
  },
  todayCell: {
    backgroundColor: isDark ? '#1E2233' : '#EEF2FF',
  },
  selectedCell: {
    backgroundColor: COLORS.primary,
  },
  selectedDayText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  disabledCell: {
    opacity: 0.3,
  },
  disabledDayText: {
    color: COLORS.textSecondary,
  },
  // ─── Footer ──────────────────────
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  // ─── Year picker ─────────────────
  yearPickerContainer: {
    maxHeight: 380,
  },
  yearPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  yearPickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  yearList: {
    maxHeight: 320,
  },
  yearItem: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginVertical: 2,
  },
  yearItemSelected: {
    backgroundColor: `${COLORS.primary}15`,
  },
  yearItemText: {
    fontSize: 17,
    color: COLORS.text,
    textAlign: 'center',
  },
  yearItemTextSelected: {
    color: COLORS.primary,
    fontWeight: '700',
  },
});
