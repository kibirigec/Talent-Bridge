import type { ProbationIndicator, PlacementStatus } from '../types';

export function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getTodayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDaysToIsoDate(isoDate: string, days: number): string {
  if (!isoDate) return '';
  const parts = isoDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return '';
  const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  date.setUTCDate(date.getUTCDate() + Math.max(0, Math.round(days)));
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function daysBetweenIsoDates(fromIso: string, toIso: string): number {
  const fromParts = fromIso.split('-').map(Number);
  const toParts = toIso.split('-').map(Number);
  if (fromParts.length !== 3 || toParts.length !== 3) return 0;
  const fromUtc = Date.UTC(fromParts[0], fromParts[1] - 1, fromParts[2]);
  const toUtc = Date.UTC(toParts[0], toParts[1] - 1, toParts[2]);
  return Math.round((toUtc - fromUtc) / (1000 * 60 * 60 * 24));
}

export function getProbationInfo(
  probationEndDate: string,
  placementStatus: PlacementStatus
): {
  daysRemaining: number;
  indicator: ProbationIndicator;
} {
  const today = getTodayIsoDate();
  const diff = daysBetweenIsoDates(today, probationEndDate);
  const daysRemaining = Math.max(0, diff);

  if (placementStatus === 'Completed' || diff <= 0) {
    return { daysRemaining: 0, indicator: 'Completed' };
  }
  if (diff <= 14) {
    return { daysRemaining, indicator: 'Ending soon' };
  }
  return { daysRemaining, indicator: 'Ongoing' };
}

export function formatUgx(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.round(amount) : 0;
  return `UGX ${safe.toLocaleString('en-UG')}`;
}

export function formatShortDate(isoDate: string): string {
  if (!isoDate) return '—';
  const parts = isoDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return isoDate;
  const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function calculateAge(dobIso: string): number | null {
  if (!dobIso) return null;
  const parts = dobIso.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  const today = new Date();
  let age = today.getFullYear() - parts[0];
  const m = today.getMonth() + 1 - parts[1];
  if (m < 0 || (m === 0 && today.getDate() < parts[2])) {
    age--;
  }
  return age >= 0 && age < 120 ? age : null;
}

export function generateNextCode(prefix: string, existingCodes: string[]): string {
  let maxNum = 0;
  const pattern = new RegExp(`^${prefix}-(\\d+)$`);
  for (const code of existingCodes) {
    const match = code.match(pattern);
    if (match) {
      const parsed = parseInt(match[1], 10);
      if (parsed > maxNum) maxNum = parsed;
    }
  }
  return `${prefix}-${String(maxNum + 1).padStart(3, '0')}`;
}

export function exportToCsv(filename: string, headers: string[], rows: (string | number | boolean | undefined | null)[][]): void {
  const escapeCell = (val: string | number | boolean | undefined | null): string => {
    const str = val === null || val === undefined ? '' : String(val);
    if (/[",\n\r]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvLines = [
    headers.map(escapeCell).join(','),
    ...rows.map((row) => row.map(escapeCell).join(',')),
  ];

  const blob = new Blob([csvLines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
