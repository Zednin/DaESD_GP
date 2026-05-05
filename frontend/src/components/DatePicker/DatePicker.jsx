import { useEffect, useMemo, useRef, useState } from 'react';
import { FiCalendar, FiChevronLeft, FiChevronRight, FiClock } from 'react-icons/fi';
import styles from './DatePicker.module.css';

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function padDatePart(value) {
  return String(value).padStart(2, '0');
}

export function getCurrentLocalDateTimeInputValue(date = new Date()) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
}

function formatDateInputValue(date) {
  return getCurrentLocalDateTimeInputValue(date).slice(0, 10);
}

function formatPickerValue(date, includeTime) {
  return includeTime ? getCurrentLocalDateTimeInputValue(date) : formatDateInputValue(date);
}

function parsePickerValue(value) {
  if (!value) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getDayStart(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isBeforeDay(a, b) {
  return getDayStart(a) < getDayStart(b);
}

function isAfterDay(a, b) {
  return getDayStart(a) > getDayStart(b);
}

function isAfterMonth(a, b) {
  return new Date(a.getFullYear(), a.getMonth(), 1) > new Date(b.getFullYear(), b.getMonth(), 1);
}

function isBeforeMonth(a, b) {
  return new Date(a.getFullYear(), a.getMonth(), 1) < new Date(b.getFullYear(), b.getMonth(), 1);
}

function formatDisplayValue(value, includeTime, placeholder) {
  if (!value) return placeholder;

  const date = parsePickerValue(value);
  if (!date) return placeholder;

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(date);
}

function getTimeInputValue(value) {
  const date = parsePickerValue(value);
  if (!date) return '';

  return `${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}`;
}

function getCalendarDays(viewDate) {
  const firstOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const startOffset = (firstOfMonth.getDay() + 6) % 7;
  const startDate = new Date(firstOfMonth);
  startDate.setDate(firstOfMonth.getDate() - startOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    return date;
  });
}

export default function DatePicker({
  value,
  onChange,
  min,
  max,
  includeTime = false,
  placeholder = includeTime ? 'Select date and time' : 'Select date',
  ariaLabel = 'Choose date',
  className = '',
}) {
  const minDate = useMemo(() => parsePickerValue(min), [min]);
  const maxDate = useMemo(() => parsePickerValue(max), [max]);
  const selectedDate = useMemo(() => parsePickerValue(value), [value]);
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(selectedDate ?? maxDate ?? minDate ?? new Date());
  const pickerRef = useRef(null);

  useEffect(() => {
    if (selectedDate) {
      setViewDate(selectedDate);
    }
  }, [selectedDate]);

  useEffect(() => {
    if (!open) return undefined;

    function handleClickAway(event) {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickAway);
    return () => document.removeEventListener('mousedown', handleClickAway);
  }, [open]);

  const calendarDays = useMemo(() => getCalendarDays(viewDate), [viewDate]);
  const selectedTime = getTimeInputValue(value);
  const previousMonthDisabled = minDate
    ? isBeforeMonth(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1), minDate)
    : false;
  const nextMonthDisabled = maxDate
    ? isAfterMonth(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1), maxDate)
    : false;
  const maxTimeForSelectedDay =
    includeTime && selectedDate && maxDate && isSameDay(selectedDate, maxDate)
      ? `${padDatePart(maxDate.getHours())}:${padDatePart(maxDate.getMinutes())}`
      : undefined;
  const minTimeForSelectedDay =
    includeTime && selectedDate && minDate && isSameDay(selectedDate, minDate)
      ? `${padDatePart(minDate.getHours())}:${padDatePart(minDate.getMinutes())}`
      : undefined;

  function clampDate(date) {
    if (maxDate && date > maxDate) return maxDate;
    if (minDate && date < minDate) return minDate;
    return date;
  }

  function commitDate(date) {
    const currentTime = selectedDate ?? new Date();
    const nextDate = new Date(date);

    if (includeTime) {
      nextDate.setHours(currentTime.getHours(), currentTime.getMinutes(), 0, 0);
    }

    const safeDate = clampDate(nextDate);
    onChange(formatPickerValue(safeDate, includeTime));

    if (!includeTime) {
      setOpen(false);
    }
  }

  function handleTimeChange(event) {
    const [hours, minutes] = event.target.value.split(':').map(Number);
    const nextDate = selectedDate ? new Date(selectedDate) : new Date();
    nextDate.setHours(hours, minutes, 0, 0);

    const safeDate = clampDate(nextDate);
    onChange(formatPickerValue(safeDate, includeTime));
  }

  function shiftMonth(offset) {
    setViewDate((date) => new Date(date.getFullYear(), date.getMonth() + offset, 1));
  }

  function goToToday() {
    const today = clampDate(new Date());
    setViewDate(today);
    onChange(formatPickerValue(today, includeTime));
    if (!includeTime) {
      setOpen(false);
    }
  }

  return (
    <div className={`${styles.datePicker} ${className}`} ref={pickerRef}>
      <button
        type="button"
        className={`${styles.datePickerTrigger} ${open ? styles.datePickerTriggerOpen : ''}`}
        onClick={() => setOpen((isOpen) => !isOpen)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <FiCalendar className={styles.dateInputIcon} aria-hidden="true" />
        <span className={value ? styles.datePickerValue : styles.datePickerPlaceholder}>
          {formatDisplayValue(value, includeTime, placeholder)}
        </span>
      </button>

      {open && (
        <div className={styles.calendarPanel} role="dialog" aria-label={ariaLabel}>
          <div className={styles.calendarHeader}>
            <button
              type="button"
              className={styles.calendarIconBtn}
              onClick={() => shiftMonth(-1)}
              disabled={previousMonthDisabled}
              aria-label="Previous month"
            >
              <FiChevronLeft />
            </button>
            <span className={styles.calendarMonth}>
              {viewDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
            </span>
            <button
              type="button"
              className={styles.calendarIconBtn}
              onClick={() => shiftMonth(1)}
              disabled={nextMonthDisabled}
              aria-label="Next month"
            >
              <FiChevronRight />
            </button>
          </div>

          <div className={styles.calendarWeekdays}>
            {WEEKDAY_LABELS.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>

          <div className={styles.calendarGrid}>
            {calendarDays.map((day) => {
              const outsideMonth = day.getMonth() !== viewDate.getMonth();
              const disabled =
                (maxDate ? isAfterDay(day, maxDate) : false) ||
                (minDate ? isBeforeDay(day, minDate) : false);
              const selected = selectedDate ? isSameDay(day, selectedDate) : false;
              const today = isSameDay(day, new Date());

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  className={[
                    styles.calendarDay,
                    outsideMonth ? styles.calendarDayMuted : '',
                    today ? styles.calendarDayToday : '',
                    selected ? styles.calendarDaySelected : '',
                  ].filter(Boolean).join(' ')}
                  onClick={() => commitDate(day)}
                  disabled={disabled}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>

          <div className={styles.calendarFooter}>
            {includeTime && (
              <label className={styles.timeField}>
                <FiClock aria-hidden="true" />
                <input
                  type="time"
                  value={selectedTime}
                  min={minTimeForSelectedDay}
                  max={maxTimeForSelectedDay}
                  onChange={handleTimeChange}
                  aria-label="Time"
                />
              </label>
            )}
            <div className={styles.calendarFooterActions}>
              <button type="button" className={styles.calendarTextBtn} onClick={() => onChange('')}>
                Clear
              </button>
              <button type="button" className={styles.calendarTodayBtn} onClick={goToToday}>
                Today
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
