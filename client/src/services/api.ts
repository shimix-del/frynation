// ============================================================
//  NANI FRYS POS — API Service
//  Connects to central Node.js/Express server on port 5000
//  Dynamically matches caller IP/host (laptop, phone, POS screen)
// ============================================================

export function isGitHubPages(): boolean {
  return typeof window !== 'undefined' && Boolean(window.location?.hostname?.endsWith('github.io'));
}

export function isLocalMode(): boolean {
  return localStorage.getItem('nanifrys_mode') === 'local';
}

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('nanifrys_custom_api_url');
    if (custom) return custom.replace(/\/+$/, '');

    if (window.location && window.location.hostname) {
      const { protocol, hostname } = window.location;
      if (['5000','5050'].includes(window.location.port)) return `${window.location.origin}/api`;
      // GitHub Pages connects to live cloud server on TrueHost
      if (hostname.endsWith('github.io')) {
        return 'https://nanifrys.com/api';
      }
      return hostname === 'localhost' || hostname === '127.0.0.1' || /^192\.168\.|^10\./.test(hostname)
        ? `${protocol}//${hostname}:5000/api` : `${window.location.origin}/api`;
    }
  }
  return 'http://localhost:5000/api';
}

function getAuthToken(): string | null {
  return localStorage.getItem('nanifrys_pos_token');
}

function getSelectedBranch(): string | null {
  return localStorage.getItem('nanifrys_pos_branch_id');
}


async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  if (isLocalMode()) throw new ApiError('Export any legacy browser records, then choose the synchronized POS.', 409);
  const token = getAuthToken();
  const branchId = getSelectedBranch();
  const apiBase = getApiBaseUrl();
  if (!apiBase) throw new ApiError('Configure your live API address or open the shop server at http://127.0.0.1:5050/.', 503);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (analyticsToken && endpoint.startsWith('/reports/') && endpoint !== '/reports/unlock') {
    headers['x-analytics-token'] = analyticsToken;
  }

  if (branchId) {
    headers['x-branch-id'] = branchId;
  }

  try {
    const response = await fetch(`${apiBase}${endpoint}`, {
      ...options,
      signal: options.signal || AbortSignal.timeout(15000),
      headers,
    });

    const data = await response.json().catch(() => { throw new ApiError('The central server returned an invalid response.', response.ok ? 502 : response.status); });

    if (!response.ok) {
      throw new ApiError(data.error || data.message || `Request failed with status ${response.status}`, response.status);
    }

    return data as T;
  } catch (error: any) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('The central server could not be reached. Please retry; pending sales remain on this device.', 0);
  }
}

let analyticsToken = '';
export function setAnalyticsToken(value: string) { analyticsToken = value; }
export const api = {
  unlockAnalytics: (pin: string) => request<{ token: string; expiresIn: number }>('/reports/unlock', { method: 'POST', body: JSON.stringify({ pin }) }),
  getSystemStatus: () => request<any>('/system/status'),
  recordLogout: () => request<any>('/auth/logout', { method: 'POST' }),
  getActivity: (params: Record<string, string> = {}) => request<any>(`/activity?${new URLSearchParams(params)}`),
  // ── Auth ──────────────────────────────────────────────────
  login: (credentials: { email?: string; password?: string; pinCode?: string; branchId?: string }) =>
    request<{ token: string; user: any; message: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  getMe: () => request<any>('/auth/me'),

  getUsers: () => request<any[]>('/auth/users'),

  createUser: (userData: any) =>
    request<any>('/auth/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),

  updateUser: (id: string, userData: any) =>
    request<any>(`/auth/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    }),

  // ── Branches ──────────────────────────────────────────────
  getBranches: () => request<any[]>('/branches'),

  getBranch: (id: string) => request<any>(`/branches/${id}`),

  createBranch: (branchData: any) =>
    request<any>('/branches', {
      method: 'POST',
      body: JSON.stringify(branchData),
    }),

  updateBranch: (id: string, branchData: any) =>
    request<any>(`/branches/${id}`, {
      method: 'PUT',
      body: JSON.stringify(branchData),
    }),

  // ── Categories ────────────────────────────────────────────
  getCategories: () => request<any[]>('/categories'),

  createCategory: (catData: any) =>
    request<any>('/categories', {
      method: 'POST',
      body: JSON.stringify(catData),
    }),

  // ── Menu & Variants ───────────────────────────────────────
  getMenu: (params?: { categoryId?: string; search?: string; availableOnly?: boolean; includeInactive?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.categoryId) q.append('categoryId', params.categoryId);
    if (params?.search) q.append('search', params.search);
    if (params?.availableOnly) q.append('availableOnly', 'true');
    if (params?.includeInactive) q.append('includeInactive', 'true');
    return request<any[]>(`/menu?${q.toString()}`);
  },

  createMenuItem: (itemData: any) =>
    request<any>('/menu', {
      method: 'POST',
      body: JSON.stringify(itemData),
    }),

  updateMenuItem: (id: string, itemData: any) =>
    request<any>(`/menu/${id}`, {
      method: 'PUT',
      body: JSON.stringify(itemData),
    }),

  toggleStock: (id: string) =>
    request<any>(`/menu/${id}/toggle-stock`, { method: 'PATCH' }),

  deleteMenuItem: (id: string) =>
    request<any>(`/menu/${id}`, { method: 'DELETE' }),

  // ── Inventory & Stock ─────────────────────────────────────
  getInventory: (params?: { branchId?: string; type?: string; lowStockOnly?: boolean; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.branchId) q.append('branchId', params.branchId);
    if (params?.type) q.append('type', params.type);
    if (params?.lowStockOnly) q.append('lowStockOnly', 'true');
    if (params?.search) q.append('search', params.search);
    return request<any[]>(`/inventory?${q.toString()}`);
  },

  createStockItem: (itemData: any) =>
    request<any>('/inventory', {
      method: 'POST',
      body: JSON.stringify(itemData),
    }),

  updateStockItem: (id: string, itemData: any) =>
    request<any>(`/inventory/${id}`, {
      method: 'PUT',
      body: JSON.stringify(itemData),
    }),

  deleteStockItem: (id: string) =>
    request<any>(`/inventory/${id}`, {
      method: 'DELETE',
    }),

  restock: (data: { stockItemId: string; quantityAdded: number; unitCost?: number; supplierName?: string; notes?: string }) =>
    request<any>('/inventory/restock', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  transferStock: (data: { sourceBranchId: string; destBranchId: string; stockItemId: string; quantity: number; notes?: string }) =>
    request<any>('/inventory/transfer', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  auditStock: (data: { stockItemId: string; countedStock: number; reason?: string; notes?: string }) =>
    request<any>('/inventory/audit', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getStockTransfers: (params?: { branchId?: string }) => {
    const q = new URLSearchParams();
    if (params?.branchId) q.append('branchId', params.branchId);
    return request<any[]>(`/inventory/transfers?${q.toString()}`);
  },

  getStockAudits: (params?: { branchId?: string }) => {
    const q = new URLSearchParams();
    if (params?.branchId) q.append('branchId', params.branchId);
    return request<any[]>(`/inventory/audits?${q.toString()}`);
  },

  // ── Recipes / BOM ─────────────────────────────────────────
  getRecipes: (params?: { menuItemId?: string }) => {
    const q = new URLSearchParams();
    if (params?.menuItemId) q.append('menuItemId', params.menuItemId);
    return request<any[]>(`/recipes?${q.toString()}`);
  },

  createRecipe: (data: { menuItemId: string; variantId?: string | null; stockItemId: string; quantityRequired: number }) =>
    request<any>('/recipes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteRecipe: (id: string) =>
    request<any>(`/recipes/${id}`, { method: 'DELETE' }),

  // ── Orders & POS Checkout ─────────────────────────────────
  getOrders: (params?: { branchId?: string; status?: string; search?: string; limit?: number; date?: string }) => {
    const q = new URLSearchParams();
    if (params?.branchId) q.append('branchId', params.branchId);
    if (params?.status) q.append('status', params.status);
    if (params?.search) q.append('search', params.search);
    if (params?.limit) q.append('limit', params.limit.toString());
    if (params?.date) q.append('date', params.date);
    return request<any[]>(`/orders?${q.toString()}`);
  },

  getHeldOrders: (params?: { branchId?: string }) => {
    const q = new URLSearchParams();
    if (params?.branchId) q.append('branchId', params.branchId);
    return request<any[]>(`/orders/held?${q.toString()}`);
  },

  createOrder: (orderData: any) =>
    request<{ order: any; warnings: string[]; message: string }>('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    }),

  resumeOrder: (id: string, paymentData: any) =>
    request<any>(`/orders/${id}/resume`, {
      method: 'PATCH',
      body: JSON.stringify(paymentData),
    }),

  cancelOrder: (id: string) =>
    request<any>(`/orders/${id}/cancel`, { method: 'DELETE' }),

  // ── Shifts & Cash Float ───────────────────────────────────
  getCurrentShift: (params?: { branchId?: string }) => {
    const q = new URLSearchParams();
    if (params?.branchId) q.append('branchId', params.branchId);
    return request<{ activeShift: any }>(`/shifts/current?${q.toString()}`);
  },

  openShift: (data: { branchId?: string; openingFloat: number; notes?: string }) =>
    request<any>('/shifts/open', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  closeShift: (data: { shiftId: string; closingCashActual: number; notes?: string }) =>
    request<{ message: string; shift: any; zReport: any }>('/shifts/close', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  addCashMovement: (data: { shiftId: string; type: 'FLOAT_IN' | 'CASH_DROP' | 'PAYOUT'; amount: number; reason: string }) =>
    request<any>('/shifts/cash-movement', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getShiftHistory: (params?: { branchId?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.branchId) q.append('branchId', params.branchId);
    if (params?.limit) q.append('limit', params.limit.toString());
    return request<any[]>(`/shifts/history?${q.toString()}`);
  },

  // ── Daily Expenses ────────────────────────────────────────
  getExpenses: (params?: { branchId?: string; category?: string; date?: string; startDate?: string; endDate?: string }) => {
    const q = new URLSearchParams();
    if (params?.branchId) q.append('branchId', params.branchId);
    if (params?.category) q.append('category', params.category);
    if (params?.date) q.append('date', params.date);
    if (params?.startDate) q.append('startDate', params.startDate);
    if (params?.endDate) q.append('endDate', params.endDate);
    return request<{ totalAmount: number; count: number; expenses: any[] }>(`/expenses?${q.toString()}`);
  },

  createExpense: (data: any) =>
    request<any>('/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteExpense: (id: string) =>
    request<any>(`/expenses/${id}`, { method: 'DELETE' }),

  // ── Reporting & Analytics ─────────────────────────────────
  getDashboardSummary: (params?: { branchId?: string; date?: string }) => {
    const q = new URLSearchParams();
    if (params?.branchId) q.append('branchId', params.branchId);
    if (params?.date) q.append('date', params.date);
    return request<any>(`/reports/summary?${q.toString()}`);
  },

  getSalesByCategory: (params?: { branchId?: string; days?: number }) => {
    const q = new URLSearchParams();
    if (params?.branchId) q.append('branchId', params.branchId);
    if (params?.days) q.append('days', params.days.toString());
    return request<any[]>(`/reports/sales-by-category?${q.toString()}`);
  },

  getTopItems: (params?: { branchId?: string; limit?: number; days?: number }) => {
    const q = new URLSearchParams();
    if (params?.branchId) q.append('branchId', params.branchId);
    if (params?.limit) q.append('limit', params.limit.toString());
    if (params?.days) q.append('days', params.days.toString());
    return request<any[]>(`/reports/top-items?${q.toString()}`);
  },

  getHourlySales: (params?: { branchId?: string }) => {
    const q = new URLSearchParams();
    if (params?.branchId) q.append('branchId', params.branchId);
    return request<any[]>(`/reports/hourly?${q.toString()}`);
  },

  getBranchComparison: () => request<any[]>('/reports/branch-comparison'),

  getCashierPerformance: (params?: { branchId?: string; days?: number }) => {
    const q = new URLSearchParams();
    if (params?.branchId) q.append('branchId', params.branchId);
    if (params?.days) q.append('days', params.days.toString());
    return request<any[]>(`/reports/cashier-performance?${q.toString()}`);
  },

  getProfitLoss: (params?: { branchId?: string; startDate?: string; endDate?: string }) => {
    const q = new URLSearchParams();
    if (params?.branchId) q.append('branchId', params.branchId);
    if (params?.startDate) q.append('startDate', params.startDate);
    if (params?.endDate) q.append('endDate', params.endDate);
    return request<any>(`/reports/profit-loss?${q.toString()}`);
  },
};
