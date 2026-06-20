const INR = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
const INR_COMPACT = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', notation: 'compact', maximumFractionDigits: 1 });

export function formatCurrency(amount: number | string): string {
  return INR.format(Number(amount));
}

export function formatCurrencyCompact(amount: number | string): string {
  return INR_COMPACT.format(Number(amount));
}

export function parseCurrency(value: string): number {
  return parseFloat(value.replace(/[^0-9.-]/g, '')) || 0;
}
