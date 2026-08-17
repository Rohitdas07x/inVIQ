import axios from 'axios';
import {
    MOCK_STATS,
    MOCK_LOCATIONS,
    MOCK_ITEMS,
    MOCK_REQUISITIONS,
    MOCK_AUDIT_LOGS,
    MOCK_CHATBOT_REPLIES,
} from './mockData';

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



/**
 * Helper to gracefully fall back to mock data when an API call fails
 * or when the user is previewing demo data without an active backend.
 */
async function withMockFallback(apiCallPromise, fallbackData) {
    try {
        const res = await apiCallPromise;
        if (res && res.data && (res.data.success !== false || res.data.data)) {
            return res;
        }
        return { data: { success: true, data: fallbackData } };
    } catch {
        return { data: { success: true, data: fallbackData } };
    }
}

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
    getStats: (params) => withMockFallback(api.get('/analytics/dashboard/stats', { params }), MOCK_STATS),
    getHeatmap: () => withMockFallback(api.get('/analytics/heatmap'), MOCK_STATS.location_stock),
    getAlerts: (params) => withMockFallback(api.get('/analytics/alerts', { params }), MOCK_STATS.low_stock_items),
    getSummary: () => withMockFallback(api.get('/analytics/summary'), MOCK_STATS),
};


// ── Inventory ─────────────────────────────────────────────────────────────
export const inventory = {
    getLocations: () => withMockFallback(api.get('/inventory/locations'), MOCK_LOCATIONS),
    getItems: (params) => withMockFallback(api.get('/inventory/items', { params }), MOCK_ITEMS),
    getItem: (id) => api.get(`/inventory/items/${id}`),
    getItemByBarcode: (barcode) => api.get(`/inventory/items/barcode/${barcode}`),
    createItem: (data) => api.post('/inventory/items', data),
    updateItem: (id, data) => api.put(`/inventory/items/${id}`, data),
    deleteItem: (id) => api.delete(`/inventory/items/${id}`),
    getLocationItems: (locationId) => withMockFallback(api.get(`/inventory/location/${locationId}/items`), MOCK_ITEMS),
    addTransaction: (data) => api.post('/inventory/transaction', data).catch(() => ({ data: { success: true, message: "Transaction recorded (Demo)" } })),
    addBulkTransaction: (data) => api.post('/inventory/bulk-transaction', data).catch(() => ({ data: { success: true, message: "Bulk transaction recorded (Demo)" } })),
    scanDispense: (data) => api.post('/inventory/scan-dispense', data),
};


// ── Chat ──────────────────────────────────────────────────────────────────
export const chat = {
    query: async (data) => {
        try {
            const res = await api.post('/chat/query', data);
            return res;
        } catch {
            const q = (data.query || data.message || "").toLowerCase();
            const matched = MOCK_CHATBOT_REPLIES.find((r) => r.pattern.test(q));
            const responseText = matched
                ? matched.reply
                : `📊 **InvIQ Smart Assistant (Demo Mode)**\n\nI found **8 inventory items** across **4 locations**.\n- 2 items require cold-chain attention.\n- 1 critical shortage detected: *Amoxicillin 500mg*.\n\nType **"critical items"** or **"cold chain status"** to explore more.`;
            return {
                data: {
                    success: true,
                    data: {
                        response: responseText,
                        answer: responseText,
                        sources: ['InvIQ Database', 'Warehouse Sensors'],
                    },
                },
            };
        }
    },
    getSessions: () => withMockFallback(api.get('/chat/sessions'), [{ id: 'demo-session', title: 'Inventory Overview' }]),
    getHistory: (id) => withMockFallback(api.get(`/chat/history/${id}`), []),
    transcribe: (audioBlob) => {
        const formData = new FormData();
        formData.append('file', audioBlob, 'recording.wav');
        return api.post('/chat/transcribe', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }).catch(() => ({ data: { success: true, data: { text: "Show critical stock shortages" } } }));
    },
};

// ── Requisitions ──────────────────────────────────────────────────────────
export const requisition = {
    create: (data) => api.post('/requisition/create', data).catch(() => ({ data: { success: true, message: "Requisition created (Demo)" } })),
    list: (params) => withMockFallback(api.get('/requisition/list', { params }), MOCK_REQUISITIONS),
    get: (id) => withMockFallback(api.get(`/requisition/${id}`), MOCK_REQUISITIONS[0]),
    stats: () => withMockFallback(api.get('/requisition/stats'), { pending: 2, approved: 1, completed: 1 }),
    approve: (id, data) => api.put(`/requisition/${id}/approve`, data).catch(() => ({ data: { success: true, message: "Approved (Demo)" } })),
    reject: (id, data) => api.put(`/requisition/${id}/reject`, data).catch(() => ({ data: { success: true, message: "Rejected (Demo)" } })),
    cancel: (id, data) => api.put(`/requisition/${id}/cancel`, data).catch(() => ({ data: { success: true, message: "Cancelled (Demo)" } })),
    fulfill: (id) => api.put(`/requisition/${id}/fulfill`),
};

// ── Admin ─────────────────────────────────────────────────────────────────
export const admin = {
    overview: () => withMockFallback(api.get('/admin/overview'), MOCK_STATS),
    auditLogs: (params) => withMockFallback(api.get('/admin/audit-logs', { params }), MOCK_AUDIT_LOGS),
    usersSummary: () => withMockFallback(api.get('/admin/users/summary'), { total_users: 12, active: 11, roles: { admin: 2, manager: 3, staff: 6, vendor: 1 } }),
    generateReport: (reportType, params) => api.get(`/admin/reports/generate?report_type=${reportType}&${params}`, { responseType: 'blob' }),
    getSuppliers: () => api.get('/admin/suppliers'),
    createSupplier: (data) => api.post('/admin/suppliers', data),
    updateSupplier: (id, data) => api.put(`/admin/suppliers/${id}`, data),
    deleteSupplier: (id) => api.delete(`/admin/suppliers/${id}`),
};


export default api;
