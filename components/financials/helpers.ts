export function currency(val: number | undefined | null): string {
  if (val === undefined || val === null) return '$0.00';
  return val.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
}

export function parseCurrency(val: string): number {
  const cleaned = val.replace(/[^0-9.]/g, '');
  if (!cleaned) return 0;
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export function parseNum(val: string): number | undefined {
  if (!val) return undefined;
  const num = parseFloat(val);
  return isNaN(num) ? undefined : num;
}
