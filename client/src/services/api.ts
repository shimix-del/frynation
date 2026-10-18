// ============================================================
//  NANI FRYS POS — API Service
//  Connects to central Node.js/Express server on port 5000
//  Dynamically matches caller IP/host (laptop, phone, POS screen)
// ============================================================

export function getApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');
  if (typeof window !== 'undefined') {
    // Keep development overrides away from the deployed production site.
    if (import.meta.env.DEV) {
      const custom = localStorage.getItem('nanifrys_custom_api_url');
      if (custom) return custom.replace(/\/+$/, '');
    }

    if (import.meta.env.DEV && window.location && window.location.hostname) {
      const { protocol, hostname } = window.location;
      return `${protocol}//${hostname}:5000/api`;
    }
  }
  return '/api';
}

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}

function getAuthToken(): string | null {
  return localStorage.getItem('nanifrys_pos_token');
}

function getSelectedBranch(): string | null {
  return localStorage.getItem('nanifrys_pos_branch_id');
}

async function requestOnce<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const branchId = getSelectedBranch();
  const apiBase = getApiBaseUrl();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (branchId) {
    headers['x-branch-id'] = branchId;
  }

  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, 12000);
  const onAbort = () => controller.abort();
  options.signal?.addEventListener('abort', onAbort, { once: true });
  if (options.signal?.aborted) controller.abort();

  try {
    const response = await fetch(`${apiBase}${endpoint}`, {
      ...options,
      signal: controller.signal,
      headers,
    });

    if (!response.headers.get('content-type')?.includes('application/json')) {
      throw new ApiError('The service is unavailable. This request was not confirmed; check saved records before retrying.', response.status || 503);
    }
    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(data.error || data.message || `Request failed with status ${response.status}`, response.status);
    }

    return data as T;
  } catch (error: any) {
    if (timedOut) {
      const isRead = ['GET', 'HEAD'].includes((options.method || 'GET').toUpperCase());
      throw new ApiError(isRead
        ? 'The service took too long to respond. Please try again.'
        : 'The request timed out. Saving was not confirmed; check saved records before retrying.', 503);
    }
    // If running standalone (e.g. GitHub Pages without local backend running), seamlessly fallback to in-browser mockStore
    if (
      import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEMO_FALLBACK === 'true' &&
      typeof window !== 'undefined' &&
      (error.message?.includes('Failed to fetch') ||
        error.message?.includes('NetworkError') ||
        error.message?.includes('Load failed'))
    ) {
      console.warn(`[POS Standalone] Backend unavailable for ${endpoint}. Falling back to in-browser store.`);
      return handleMockFallback<T>(endpoint, options);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener('abort', onAbort);
  }
}

// Share concurrent reads only; writes are never retried or cached here.
const pendingReads = new Map<string, Promise<unknown>>();
function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  if ((options.method || 'GET').toUpperCase() !== 'GET' || options.signal) {
    return requestOnce<T>(endpoint, options);
  }
  const key = JSON.stringify([getApiBaseUrl(), endpoint, getAuthToken(), getSelectedBranch()]);
  const pending = pendingReads.get(key);
  if (pending) return pending as Promise<T>;
  const result = requestOnce<T>(endpoint, options);
  pendingReads.set(key, result);
  const clear = () => { if (pendingReads.get(key) === result) pendingReads.delete(key); };
  result.then(clear, clear);
  return result;
}

// Router for mock fallback
async function handleMockFallback<T>(endpoint: string, options: RequestInit): Promise<T> {
  // Import only on an explicitly enabled development demo. Loading mockStore
  // eagerly can reset browser-held records when its version changes.
  const { mockStore } = await import('./mockStore');
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body ? JSON.parse(options.body as string) : {};
  const [path, queryString] = endpoint.split('?');
  const params: Record<string, any> = {};
  if (queryString) {
    new URLSearchParams(queryString).forEach((val, key) => {
      params[key] = val;
    });
  }

  if (path === '/auth/login') return mockStore.login(body) as any;
  if (path === '/auth/me') return mockStore.getMe() as any;
  if (path === '/auth/users' && method === 'GET') return mockStore.getUsers() as any;
  if (path === '/auth/users' && method === 'POST') return mockStore.createUser(body) as any;
  if (path === '/branches' && method === 'GET') return mockStore.getBranches() as any;
  if (path === '/categories' && method === 'GET') return mockStore.getCategories() as any;
  if (path === '/categories' && method === 'POST') return mockStore.createCategory(body) as any;
  if (path === '/menu' && method === 'GET') return mockStore.getMenu(params) as any;
  if (path === '/menu' && method === 'POST') return mockStore.createMenuItem(body) as any;
  if (path.startsWith('/menu/') && path.endsWith('/toggle-stock')) {
    const id = path.split('/')[2];
    return mockStore.toggleStock(id) as any;
  }
  if (path.startsWith('/menu/') && method === 'PUT') {
    const id = path.split('/')[2];
    return mockStore.updateMenuItem(id, body) as any;
  }
  if (path.startsWith('/menu/') && method === 'DELETE') {
    const id = path.split('/')[2];
    return mockStore.deleteMenuItem(id) as any;
  }
  if (path === '/inventory' && method === 'GET') return mockStore.getInventory(params) as any;
  if (path === '/inventory' && method === 'POST') return mockStore.createStockItem(body) as any;
  if (path.startsWith('/inventory/') && method === 'PUT') {
    const id = path.split('/')[2];
    return mockStore.updateStockItem(id, body) as any;
  }
  if (path.startsWith('/inventory/') && method === 'DELETE') {
    const id = path.split('/')[2];
    return mockStore.deleteStockItem(id) as any;
  }
  if (path === '/inventory/restock') return mockStore.restock(body) as any;
  if (path === '/inventory/transfer') return mockStore.transferStock(body) as any;
  if (path === '/inventory/audit') return mockStore.auditStock(body) as any;
  if (path === '/orders' && method === 'GET') return mockStore.getOrders(params) as any;
  if (path === '/orders' && method === 'POST') return mockStore.createOrder(body) as any;
  if (path === '/orders/held') return mockStore.getHeldOrders(params) as any;
  if (path === '/shifts/current') return mockStore.getCurrentShift(params) as any;
  if (path === '/shifts/open') return mockStore.openShift(body) as any;
  if (path === '/shifts/close') return mockStore.closeShift(body) as any;
  if (path.startsWith('/shifts/history')) return mockStore.getShiftHistory(params) as any;
  if (path.startsWith('/shifts/cash-movement')) return mockStore.addCashMovement(body) as any;
  if (path === '/expenses' && method === 'GET') return mockStore.getExpenses(params) as any;
  if (path === '/expenses' && method === 'POST') return mockStore.createExpense(body) as any;
  if (path === '/reports/summary') return mockStore.getDashboardSummary(params) as any;
  if (path === '/reports/sales-by-category') return mockStore.getSalesByCategory(params) as any;
  if (path === '/reports/top-items') return mockStore.getTopItems() as any;
  if (path === '/reports/hourly') return mockStore.getHourlySales() as any;
  if (path === '/reports/branch-comparison') return mockStore.getBranchComparison() as any;
  if (path === '/reports/cashier-performance') return mockStore.getCashierPerformance() as any;
  if (path === '/reports/profit-loss') return mockStore.getProfitLoss() as any;

  return [] as any;
}

export const api = {
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
  getMenu: (params?: { categoryId?: string; search?: string; availableOnly?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.categoryId) q.append('categoryId', params.categoryId);
    if (params?.search) q.append('search', params.search);
    if (params?.availableOnly) q.append('availableOnly', 'true');
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
