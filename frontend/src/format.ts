const pesoFormat = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 });
const dateFormat = new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
const dateTimeFormat = new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export const peso = (n: number) => pesoFormat.format(n);
export const shortDate = (iso: string) => dateFormat.format(new Date(iso));
export const shortDateTime = (iso: string) => dateTimeFormat.format(new Date(iso));

/** "2026-11-20" for <input type="date">, in local time. */
export function toDateInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

// Like the demo data: pick-up at 8:00 AM, return at 6:00 PM.
// Sent without a time zone, so the server reads it as Philippine local time.
export const pickupDateTime = (date: string) => `${date}T08:00:00`;
export const returnDateTime = (date: string) => `${date}T18:00:00`;

export const depositLabel: Record<string, string> = {
  None: 'none',
  Unpaid: 'due at pick-up',
  Held: 'held, refunded after return check',
  Refunded: 'settled',
};

export const paymentLabel: Record<string, string> = {
  GCash: 'GCash',
  Card: 'Credit/Debit Card',
  CashOnPickup: 'Cash on pick-up',
};
