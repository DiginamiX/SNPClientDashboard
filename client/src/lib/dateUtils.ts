import { format, formatDistance, formatDistanceToNow, parseISO, isValid, isAfter, isBefore, isSameDay } from 'date-fns';

/**
 * Formats a date string to a human-readable format
 * @param dateString ISO date string
 * @param formatStr Optional format string
 * @returns Formatted date string
 */
export const formatDate = (dateString: string, formatStr: string = 'MMM d, yyyy'): string => {
  const date = parseISO(dateString);
  if (!isValid(date)) return 'Invalid date';
  return format(date, formatStr);
};

/**
 * Formats a time string to a human-readable format
 * @param dateTimeString ISO date-time string
 * @param formatStr Optional format string
 * @returns Formatted time string
 */
export const formatTime = (dateTimeString: string, formatStr: string = 'h:mm a'): string => {
  const date = parseISO(dateTimeString);
  if (!isValid(date)) return 'Invalid time';
  return format(date, formatStr);
};

/**
 * Formats a date-time string to a relative time (e.g., "2 hours ago")
 * @param dateTimeString ISO date-time string
 * @returns Relative time string
 */
export const formatRelativeTime = (dateTimeString: string): string => {
  const date = parseISO(dateTimeString);
  if (!isValid(date)) return 'Invalid date';
  return formatDistanceToNow(date, { addSuffix: true });
};

/**
 * Returns a date string in YYYY-MM-DD format for use in date inputs
 * @param dateString ISO date string or Date object
 * @returns Date string in YYYY-MM-DD format
 */
export const formatForDateInput = (dateString?: string | Date): string => {
  if (!dateString) return format(new Date(), 'yyyy-MM-dd');
  
  const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
  if (!isValid(date)) return format(new Date(), 'yyyy-MM-dd');
  
  return format(date, 'yyyy-MM-dd');
};

/**
 * Checks if a date is in the future
 * @param dateString ISO date string
 * @returns Boolean indicating if date is in the future
 */
export const isFutureDate = (dateString: string): boolean => {
  const date = parseISO(dateString);
  if (!isValid(date)) return false;
  return isAfter(date, new Date());
};

/**
 * Checks if a date is in the past
 * @param dateString ISO date string
 * @returns Boolean indicating if date is in the past
 */
export const isPastDate = (dateString: string): boolean => {
  const date = parseISO(dateString);
  if (!isValid(date)) return false;
  return isBefore(date, new Date());
};

/**
 * Checks if a date is today
 * @param dateString ISO date string
 * @returns Boolean indicating if date is today
 */
export const isToday = (dateString: string): boolean => {
  const date = parseISO(dateString);
  if (!isValid(date)) return false;
  return isSameDay(date, new Date());
};

/**
 * Formats start and end times for display
 * @param startTime ISO date-time string for start time
 * @param endTime ISO date-time string for end time
 * @returns Formatted time range
 */
export const formatTimeRange = (startTime: string, endTime: string): string => {
  const start = parseISO(startTime);
  const end = parseISO(endTime);
  
  if (!isValid(start) || !isValid(end)) return 'Invalid time range';
  
  return `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`;
};

/**
 * Gets the month name from a date string
 * @param dateString ISO date string
 * @returns Month name in uppercase (e.g., "JUN")
 */
export const getMonthName = (dateString: string): string => {
  const date = parseISO(dateString);
  if (!isValid(date)) return '';
  return format(date, 'MMM').toUpperCase();
};

/**
 * Gets the day of month from a date string
 * @param dateString ISO date string
 * @returns Day of month (e.g., "15")
 */
export const getDayOfMonth = (dateString: string): string => {
  const date = parseISO(dateString);
  if (!isValid(date)) return '';
  return format(date, 'd');
};
