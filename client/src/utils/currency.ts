/**
 * Formats a number to Kenyan Shillings (KES / Ksh)
 */
export function formatKES(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return 'KES 0';
  }
  return `KES ${amount.toLocaleString('en-KE', { maximumFractionDigits: 2 })}`;
}

export function formatKESDecimals(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return 'KES 0.00';
  }
  return `KES ${amount.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Format timestamp into Kenyan readable format
 */
export function formatKenyaDateTime(dateString?: string | Date | null): string {
  if (!dateString) return '-';
  const d = new Date(dateString);
  return d.toLocaleString('en-KE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Africa/Nairobi',
  });
}

export function formatKenyaTimeOnly(dateString?: string | Date | null): string {
  if (!dateString) return '-';
  const d = new Date(dateString);
  return d.toLocaleTimeString('en-KE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Africa/Nairobi',
  });
}
