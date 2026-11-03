/**
 * Generates an id_trans according to the specification:
 * Pattern: YYMMDDHHmmss + 6 random digits (18 characters total)
 */
export function generateIdTrans(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const yy = String(date.getFullYear()).slice(-2);
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const mi = pad(date.getMinutes());
  const ss = pad(date.getSeconds());

  const random6 = String(Math.floor(100000 + Math.random() * 900000));
  return `${yy}${mm}${dd}${hh}${mi}${ss}${random6}`;
}

