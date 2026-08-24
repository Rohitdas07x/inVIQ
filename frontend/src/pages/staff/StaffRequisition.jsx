import React, { useState, useEffect } from 'react';
import { inventory, requisition } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  Plus, Trash2, Send, ClipboardList, Clock, CheckCircle2, XCircle,
  Building2, User, LogOut, MessageSquare, AlertTriangle, ShieldCheck
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const URGENCY_OPTIONS = ['LOW', 'NORMAL', 'HIGH', 'EMERGENCY'];
const DEPARTMENTS = ['Pharmacy Counter', 'Emergency', 'ICU', 'Cardiology', 'General Ward', 'OT', 'Pediatrics', 'Oncology', 'Lab'];

const STATUS_STYLES = {
    PENDING: 'bg-amber-50 text-amber-700 border border-amber-200',
    APPROVED: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    REJECTED: 'bg-red-50 text-red-700 border border-red-200',
    CANCELLED: 'bg-slate-50 text-slate-500 border border-slate-200',
};

const URGENCY_STYLES = {
    LOW: 'bg-slate-100 text-slate-600',
    NORMAL: 'bg-blue-50 text-blue-700 border border-blue-200',
    HIGH: 'bg-amber-50 text-amber-700 border border-amber-200',
    EMERGENCY: 'bg-red-50 text-red-700 border border-red-200 animate-pulse font-bold',
};

const StaffRequisition = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [locations, setLocations] = useState([]);
    const [items, setItems] = useState([]);
    const [myRequests, setMyRequests] = useState([]);
    const [activeTab, setActiveTab] = useState('form'); // 'form' | 'history'
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(null);
    const [error, setError] = useState(null);

    const [form, setForm] = useState({
        location_id: '',
        department: 'Pharmacy Counter',
        urgency: 'NORMAL',
        requested_by: user?.full_name || user?.username || 'Staff Pharmacist',
        notes: '',
        items: [{ item_id: '', quantity: 1, notes: '' }],
    });

    useEffect(() => {
        if (user) {
            setForm(prev => ({
                ...prev,
                requested_by: user.full_name || user.username || 'Staff Pharmacist'
            }));
        }
    }, [user]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [locRes, itemRes] = await Promise.all([
                    inventory.getLocations(),
                    inventory.getItems(),
                ]);
                if (locRes.data.success) {
                    const locs = locRes.data.data;
                    setLocations(locs);
                    if (locs.length > 0 && !form.location_id) {
                        setForm(prev => ({ ...prev, location_id: locs[0].id }));
                    }
                }
                if (itemRes.data.success) setItems(itemRes.data.data);
            } catch (err) {
                console.error('Failed to fetch data', err);
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        if (activeTab === 'history' && form.requested_by) {
            loadHistory();
        }
    }, [activeTab]);

    const loadHistory = async () => {
        try {
            const res = await requisition.list({ requested_by: form.requested_by });
            if (res.data.success) setMyRequests(res.data.data);
        } catch (err) {
            console.error('Failed to load history', err);
        }
    };

    const addItemRow = () => {
        setForm(prev => ({
            ...prev,
            items: [...prev.items, { item_id: '', quantity: 1, notes: '' }],
        }));
    };

    const removeItemRow = (index) => {
        setForm(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index),
        }));
    };

    const updateItemRow = (index, field, value) => {
        setForm(prev => {
            const newItems = [...prev.items];
            newItems[index] = { ...newItems[index], [field]: value };
            return { ...prev, items: newItems };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        const validItems = form.items.filter(i => i.item_id && i.quantity > 0);
        if (validItems.length === 0) {
            setError('Please add at least one item with a valid quantity');
            setLoading(false);
            return;
        }

        try {
            const payload = {
                location_id: parseInt(form.location_id),
                department: form.department,
                urgency: form.urgency,
                requested_by: form.requested_by,
                notes: form.notes,
                items: validItems.map(i => ({
                    item_id: parseInt(i.item_id),
                    quantity_requested: parseInt(i.quantity),
                    packaging_unit: i.packaging_unit || undefined,
                    notes: i.notes || undefined,
                })),
            };

            const res = await requisition.create(payload);
            if (res.data.success) {
                setSuccess(res.data.message || 'Requisition submitted to store administrator');
                setForm(prev => ({
                    ...prev,
                    notes: '',
                    items: [{ item_id: '', quantity: 1, packaging_unit: '', notes: '' }],
                }));
            }
        } catch (err) {
            setError(err.response?.data?.detail || 'Submission failed');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async (id) => {
        try {
            await requisition.cancel(id, { cancelled_by: form.requested_by });
            loadHistory();
        } catch (err) {
            console.error('Cancel failed', err);
        }
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto space-y-6">

                {/* ── Top Header / User Context Bar ──────────────────────── */}
                <div className="bg-white border border-slate-200 p-5 rounded-none shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold uppercase tracking-wider">
                                Staff Pharmacist Portal
                            </span>
                            <span className="text-xs text-slate-400">·</span>
                            <div className="flex items-center gap-1 text-xs font-semibold text-slate-700">
                                <Building2 size={13} className="text-blue-600" />
                                <span>{user?.organization_name || 'Assigned Pharmacy Network'}</span>
                            </div>
                        </div>
                        <h1 className="text-xl font-bold text-slate-900 mt-1">Medicine Requisition &amp; Stock Intake</h1>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Logged in as <strong className="text-slate-800">{user?.full_name || user?.username}</strong>
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <Link
                            to="/staff/chat"
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300 rounded-none transition cursor-pointer"
                        >
                            <MessageSquare size={13} className="text-blue-600" />
                            <span>AI Assistant</span>
                        </Link>

                        <button
                            onClick={logout}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-red-50 hover:text-red-700 text-slate-600 text-xs font-semibold border border-slate-300 rounded-none transition cursor-pointer"
                        >
                            <LogOut size={13} />
                            <span>Sign Out</span>
                        </button>
                    </div>
                </div>

                {/* ── Unassigned Warning (If no org) ────────────────────── */}
                {!user?.org_id && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-none flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                            <h4 className="text-xs font-bold text-amber-900">Unallocated Staff Account</h4>
                            <p className="text-[11px] text-amber-700 mt-0.5">
                                Your account is not yet allocated to an active Chemist Store Admin. Please ask your Pharmacy Store Owner / Admin to allocate your username (<strong>{user?.username}</strong>) in their User Management panel.
                            </p>
                        </div>
                    </div>
                )}

                {/* Tabs */}
                <div className="flex bg-white border border-slate-200 rounded-none p-1 shadow-2xs">
                    <button
                        onClick={() => setActiveTab('form')}
                        className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
                            activeTab === 'form'
                                ? 'bg-blue-600 text-white shadow-2xs'
                                : 'text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                        <Send size={13} className="inline mr-1.5" /> New Requisition
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
                            activeTab === 'history'
                                ? 'bg-blue-600 text-white shadow-2xs'
                                : 'text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                        <Clock size={13} className="inline mr-1.5" /> My Request History
                    </button>
                </div>

                {/* ─── NEW REQUEST FORM ─── */}
                {activeTab === 'form' && (
                    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 bg-slate-50/50 space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Your Name</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="e.g. Dr. Sharma"
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={form.requested_by}
                                        onChange={(e) => setForm({ ...form, requested_by: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Department</label>
                                    <select
                                        required
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={form.department}
                                        onChange={(e) => setForm({ ...form, department: e.target.value })}
                                    >
                                        <option value="">Select Department</option>
                                        {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Location</label>
                                    <select
                                        required
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={form.location_id}
                                        onChange={(e) => setForm({ ...form, location_id: e.target.value })}
                                    >
                                        <option value="">Select Location</option>
                                        {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Urgency</label>
                                    <div className="flex gap-2">
                                        {URGENCY_OPTIONS.map(u => (
                                            <button
                                                key={u}
                                                type="button"
                                                onClick={() => setForm({ ...form, urgency: u })}
                                                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition border ${form.urgency === u ? URGENCY_STYLES[u] + ' border-current' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'}`}
                                            >
                                                {u}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes (optional)</label>
                                <textarea
                                    rows={2}
                                    placeholder="Additional notes for the store manager..."
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                    value={form.notes}
                                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Items */}
                        <div className="p-6">
                            {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg border border-red-100 text-sm">{error}</div>}
                            {success && <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg border border-green-100 text-sm flex items-center gap-2"><CheckCircle2 size={18} />{success}</div>}

                            <div className="grid grid-cols-12 gap-3 text-xs font-medium text-slate-500 px-1 mb-2">
                                <div className="col-span-5">Item</div>
                                <div className="col-span-2 text-center">Qty</div>
                                <div className="col-span-2">Unit (Optional)</div>
                                <div className="col-span-2">Notes</div>
                                <div className="col-span-1"></div>
                            </div>

                            {form.items.map((row, index) => (
                                <div key={index} className="grid grid-cols-12 gap-3 items-center mb-2 p-2 hover:bg-slate-50 rounded-lg transition">
                                    <div className="col-span-5">
                                        <select
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                            value={row.item_id}
                                            onChange={(e) => updateItemRow(index, 'item_id', e.target.value)}
                                        >
                                            <option value="">Select Item</option>
                                            {items.map(item => (
                                                <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-span-2">
                                        <input
                                            type="number"
                                            min="1"
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-center text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={row.quantity}
                                            onChange={(e) => updateItemRow(index, 'quantity', parseInt(e.target.value) || 1)}
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <input
                                            type="text"
                                            placeholder="strip, box..."
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={row.packaging_unit || ''}
                                            onChange={(e) => updateItemRow(index, 'packaging_unit', e.target.value)}
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <input
                                            type="text"
                                            placeholder="Optional"
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={row.notes}
                                            onChange={(e) => updateItemRow(index, 'notes', e.target.value)}
                                        />
                                    </div>
                                    <div className="col-span-1 flex justify-center">
                                        <button type="button" onClick={() => removeItemRow(index)} disabled={form.items.length === 1} className="text-slate-300 hover:text-red-500 transition disabled:opacity-30">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}

                            <button type="button" onClick={addItemRow} className="flex items-center gap-2 text-blue-600 font-medium text-sm hover:bg-blue-50 py-2 px-3 rounded-lg mt-3 transition">
                                <Plus size={16} /> Add Item
                            </button>
                        </div>

                        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                            <button type="submit" disabled={loading} className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition shadow-lg shadow-blue-200 disabled:opacity-70">
                                {loading ? 'Submitting...' : <><Send size={18} /> Submit Requisition</>}
                            </button>
                        </div>
                    </form>
                )}

                {/* ─── MY REQUESTS HISTORY ─── */}
                {activeTab === 'history' && (
                    <div className="space-y-3">
                        {!form.requested_by && (
                            <div className="p-8 bg-white rounded-xl text-center text-slate-400">
                                Enter your name in the form first to see your requests.
                            </div>
                        )}

                        {form.requested_by && myRequests.length === 0 && (
                            <div className="p-8 bg-white rounded-xl text-center text-slate-400">
                                <ClipboardList size={40} className="mx-auto mb-3 text-slate-300" />
                                No requisitions found.
                            </div>
                        )}

                        {myRequests.map(req => (
                            <div key={req.id} className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <span className="font-semibold text-slate-800">{req.requisition_number}</span>
                                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[req.status]}`}>{req.status}</span>
                                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${URGENCY_STYLES[req.urgency]}`}>{req.urgency}</span>
                                    </div>
                                    <span className="text-xs text-slate-400">{new Date(req.created_at).toLocaleDateString()}</span>
                                </div>
                                <div className="text-sm text-slate-500 mb-2">
                                    {req.department} • {req.location_name} • {req.items.length} item(s)
                                </div>
                                {req.rejection_reason && (
                                    <div className="text-sm text-red-600 bg-red-50 rounded-lg p-2 mt-2 flex items-start gap-2">
                                        <XCircle size={16} className="mt-0.5 shrink-0" /> {req.rejection_reason}
                                    </div>
                                )}
                                {req.status === 'PENDING' && (
                                    <button onClick={() => handleCancel(req.id)} className="mt-2 text-xs text-slate-400 hover:text-red-500 transition">
                                        Cancel Request
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StaffRequisition;
