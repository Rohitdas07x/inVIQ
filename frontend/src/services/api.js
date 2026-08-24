import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

let inMemoryAccessToken = null;

export const setAuthToken = (token) => {
    inMemoryAccessToken = token;
    if (token) {
        sessionStorage.setItem('access_token', token);
    } else {
        sessionStorage.removeItem('access_token');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
    }
};

export const getAuthToken = () => {
    return inMemoryAccessToken || sessionStorage.getItem('access_token') || localStorage.getItem('access_token');
};

const api = axios.create({
    baseURL: API_URL,
    timeout: 30000,
    withCredentials: true, // Send HttpOnly SameSite cookies automatically
});


// ── Request Interceptor: attach JWT if present ────────────────────────────
api.interceptors.request.use(
    (config) => {
        const token = getAuthToken();
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);


// ── Auth ──────────────────────────────────────────────────────────────────
export const auth = {
    login: (data) => api.post('/auth/login', data),
    logout: () => api.post('/auth/logout'),
    register: (data) => api.post('/auth/signup', data),
    adminCreateUser: (data) => api.post('/auth/register', data),
    me: () => api.get('/auth/me'),
    list: (params) => api.get('/auth/users', { params }),
    get: (id) => api.get(`/auth/users/${id}`),
    update: (id, data) => api.put(`/auth/users/${id}`, data),
    delete: (id) => api.delete(`/auth/users/${id}`),
    activateUser: (id) => api.put(`/auth/users/${id}/activate`),
    deactivateUser: (id) => api.put(`/auth/users/${id}/deactivate`),
    resetPassword: (id, data) => api.post(`/auth/users/${id}/reset-password`, data),
    updateRole: (id, data) => api.put(`/auth/users/${id}/role`, data),
    changePassword: (data) => api.post('/auth/change-password', data),
    refresh: (data) => api.post('/auth/refresh', data),
    requestPasswordReset: (data) => api.post('/auth/request-password-reset', data),
    resetPassword: (data) => api.post('/auth/reset-password', data),
    verifyEmail: (data) => api.post('/auth/verify-email', data),
    googleAuth: (idToken) => api.post('/auth/google-auth', { id_token: idToken }),
};


// ── Analytics ─────────────────────────────────────────────────────────────
export const analytics = {
    getStats: (params) => api.get('/analytics/dashboard/stats', { params }),
    getHeatmap: () => api.get('/analytics/heatmap'),
    getAlerts: (params) => api.get('/analytics/alerts', { params }),
    getSummary: () => api.get('/analytics/summary'),
};


// ── Inventory ─────────────────────────────────────────────────────────────
export const inventory = {
    getLocations: () => api.get('/inventory/locations'),
    getItems: (params) => api.get('/inventory/items', { params }),
    getItem: (id) => api.get(`/inventory/items/${id}`),
    getItemByBarcode: (barcode) => api.get(`/inventory/items/barcode/${barcode}`),
    createItem: (data) => api.post('/inventory/items', data),
    updateItem: (id, data) => api.put(`/inventory/items/${id}`, data),
    deleteItem: (id) => api.delete(`/inventory/items/${id}`),
    getLocationItems: (locationId) => api.get(`/inventory/location/${locationId}/items`),
    getPackagings: (itemId) => api.get(`/inventory/items/${itemId}/packagings`),
    addPackaging: (itemId, data) => api.post(`/inventory/items/${itemId}/packagings`, data),
    updatePackaging: (itemId, pkgId, data) => api.put(`/inventory/items/${itemId}/packagings/${pkgId}`, data),
    deletePackaging: (itemId, pkgId) => api.delete(`/inventory/items/${itemId}/packagings/${pkgId}`),
    addTransaction: (data) => api.post('/inventory/transaction', data),
    addBulkTransaction: (data) => api.post('/inventory/bulk-transaction', data),
    scanDispense: (data) => api.post('/inventory/scan-dispense', data),
};


// ── Chat ──────────────────────────────────────────────────────────────────
export const chat = {
    query: (data) => api.post('/chat/query', data),
    getSessions: () => api.get('/chat/sessions'),
    getHistory: (id) => api.get(`/chat/history/${id}`),
    transcribe: (audioBlob) => {
        const formData = new FormData();
        formData.append('file', audioBlob, 'recording.wav');
        return api.post('/chat/transcribe', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },
};

// ── Requisitions ──────────────────────────────────────────────────────────
export const requisition = {
    create: (data) => api.post('/requisition/create', data),
    list: (params) => api.get('/requisition/list', { params }),
    get: (id) => api.get(`/requisition/${id}`),
    stats: () => api.get('/requisition/stats'),
    approve: (id, data) => api.put(`/requisition/${id}/approve`, data),
    reject: (id, data) => api.put(`/requisition/${id}/reject`, data),
    cancel: (id, data) => api.put(`/requisition/${id}/cancel`, data),
    fulfill: (id) => api.put(`/requisition/${id}/fulfill`),
};

// ── Admin ─────────────────────────────────────────────────────────────────
export const admin = {
    overview: () => api.get('/admin/overview'),
    auditLogs: (params) => api.get('/admin/audit-logs', { params }),
    usersSummary: () => api.get('/admin/users/summary'),
    generateReport: (reportType, params) => api.get(`/admin/reports/generate?report_type=${reportType}&${params}`, { responseType: 'blob' }),
    getMonthlySalesReport: (year, month) => api.get(`/admin/reports/monthly-sales?year=${year}&month=${month}`),
    getSuppliers: () => api.get('/admin/suppliers'),
    createSupplier: (data) => api.post('/admin/suppliers', data),
    updateSupplier: (id, data) => api.put(`/admin/suppliers/${id}`, data),
    deleteSupplier: (id) => api.delete(`/admin/suppliers/${id}`),
};

// ── Billing ───────────────────────────────────────────────────────────────
export const billing = {
    openSession: (data) => api.post('/billing/sessions', data),
    scanItem: (sessionId, data) => api.post(`/billing/sessions/${sessionId}/scan`, data),
    checkout: (sessionId) => api.post(`/billing/sessions/${sessionId}/checkout`),
    getSession: (sessionId) => api.get(`/billing/sessions/${sessionId}`),
    cancelSession: (sessionId) => api.delete(`/billing/sessions/${sessionId}`),
};


export default api;
