/**
 * Centralized formatting utilities for the application.
 */

/**
 * Formats a number as IDR currency string.
 * @param amount - The number to format
 * @param withSymbol - Whether to include the 'Rp' symbol
 * @returns Formatted string
 */
export const formatIDR = (amount: number, withSymbol: boolean = true) => {
  const formatted = new Intl.NumberFormat('id-ID', {
    style: withSymbol ? 'currency' : 'decimal',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);

  return formatted;
};

/**
 * Parses a formatted number string back to a number.
 * Useful for processing inputs with thousand separators.
 * @param value - The string to parse
 * @returns Valid number
 */
export const parseNumber = (value: string): number => {
  if (!value) return 0;
  // Remove non-digit characters except decimals if needed (standard ID uses , for decimal but we handle integers mostly)
  return Number(value.replace(/[^0-9]/g, ''));
};

/**
 * Formats a number with thousand separators.
 * @param val - The number or string to format
 * @returns Formatted string (e.g., 1.000.000)
 */
export const formatNumber = (val: number | string): string => {
  const num = typeof val === 'string' ? parseNumber(val) : val;
  return new Intl.NumberFormat('id-ID').format(num || 0);
};
