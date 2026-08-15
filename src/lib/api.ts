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

// ---- Utility Functions ----

export function formatCurrency(amount: number): string {
  return `AED ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
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
  const [year, month] = monthYear.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
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
