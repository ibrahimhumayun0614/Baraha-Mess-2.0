// ============================================
// API Client Utility
// ============================================
import type { ApiResponse } from '../types';

const API_BASE = '/api';

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = localStorage.getItem('baraha_token');
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const contentType = response.headers.get('content-type') || '';
    const text = await response.text();

    if (!contentType.includes('application/json')) {
      return {
        success: false,
        error: response.status === 404
          ? 'API route not found. Check that Pages Functions deployed successfully.'
          : `API returned non-JSON (HTTP ${response.status}). Functions may not be bound or D1 may be missing.`,
      };
    }

    let data: ApiResponse<T>;
    try {
      data = JSON.parse(text);
    } catch {
      return {
        success: false,
        error: 'Invalid JSON from API',
      };
    }

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `Request failed with status ${response.status}`,
      };
    }

    return data;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint),
  
  post: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  put: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  delete: <T>(endpoint: string) =>
    request<T>(endpoint, { method: 'DELETE' }),
};

// ---- Utility Functions & Cached Formatters for Fast Rendering ----

const currencyFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const monthYearFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'long',
});

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function formatCurrency(amount: number): string {
  if (typeof amount !== 'number' || isNaN(amount)) return 'AED 0.00';
  return `AED ${currencyFormatter.format(amount)}`;
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  // Parse YYYY-MM-DD safely without timezone shift or slow Date constructor
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      const date = new Date(year, month, day);
      return dateFormatter.format(date);
    }
  }
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? dateStr : dateFormatter.format(date);
}

export function formatDateTime(dateStr: string): string {
  if (!dateStr) return '—';
  const normalized = dateStr.includes(' ') && !dateStr.includes('T')
    ? dateStr.replace(' ', 'T') + 'Z'
    : dateStr;
  const date = new Date(normalized);
  return isNaN(date.getTime()) ? dateStr : dateTimeFormatter.format(date);
}

export function formatNote(note?: string | null): string {
  const value = (note || '').trim();
  return value || '—';
}

export function formatPaidBy(expense: { creator_name?: string }): string {
  return expense.creator_name?.trim() || '—';
}

export function formatAddedBy(expense: {
  added_by_type?: 'admin' | 'member' | null;
  added_by_name?: string;
  creator_name?: string;
}): string {
  if (expense.added_by_type === 'admin' || expense.added_by_name === 'Admin') {
    return 'Admin';
  }
  return expense.added_by_name?.trim() || expense.creator_name?.trim() || '—';
}

export function formatPeriod(expense: { month_status?: string; month_year?: string }): string {
  if (expense.month_status === 'active') return 'Current';
  if (expense.month_year) return formatMonthYear(expense.month_year);
  return '—';
}

export function formatMonthYear(monthYear: string): string {
  if (!monthYear) return '—';
  const parts = monthYear.split('-');
  if (parts.length === 2) {
    const year = parseInt(parts[0], 10);
    const monthIndex = parseInt(parts[1], 10) - 1;
    if (!isNaN(year) && monthIndex >= 0 && monthIndex < 12) {
      return `${monthNames[monthIndex]} ${year}`;
    }
  }
  const [year, month] = monthYear.split('-');
  const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1);
  return isNaN(date.getTime()) ? monthYear : monthYearFormatter.format(date);
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function getCurrentMonthYear(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function getDaysInMonth(monthYear: string): number {
  const [year, month] = monthYear.split('-');
  return new Date(parseInt(year), parseInt(month), 0).getDate();
}

export function getDayOfMonth(): number {
  return new Date().getDate();
}

export function buildQueryString(params: Record<string, unknown>): string {
  const query = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return query ? `?${query}` : '';
}
