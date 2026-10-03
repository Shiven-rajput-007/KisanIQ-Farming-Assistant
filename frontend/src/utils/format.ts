/**
 * Format a number using Indian number system (lakhs, crores)
 */
export function formatIndianNumber(num: number, locale: string = 'en-IN'): string {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Format currency in Indian Rupees
 */
export function formatCurrency(amount: number, locale: string = 'en-IN'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format price per quintal
 */
export function formatPricePerQuintal(price: number): string {
  return `₹${formatIndianNumber(price)}/q`;
}

/**
 * Format temperature
 */
export function formatTemperature(temp: number): string {
  return `${temp}°`;
}

/**
 * Format percentage
 */
export function formatPercentage(value: number): string {
  return `${value}%`;
}

/**
 * Format distance in km
 */
export function formatDistance(km: number): string {
  return `${km} km`;
}

/**
 * Format quantity in quintals
 */
export function formatQuantity(quintals: number): string {
  return `${quintals} quintal`;
}

/**
 * Format area in acres
 */
export function formatArea(acres: number): string {
  return `${acres} acres`;
}
