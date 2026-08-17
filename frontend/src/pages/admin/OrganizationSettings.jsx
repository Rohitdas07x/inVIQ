import React, { useState, useEffect } from 'react';
import {
    Building2,
    Store,
    Plus,
    Edit3,
    Trash2,
    CheckCircle2,
    AlertCircle,
    Save,
    RefreshCw,
    Shield,
    MapPin,
    Phone,
    Mail,
    FileBadge,
    FileCheck2,
    Power
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useGuest } from '../../context/GuestContext';

export default function OrganizationSettings() {
    const { user } = useAuth();
    const { isGuest, showAuthModal } = useGuest();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);

    // Organization details state
    const [orgData, setOrgData] = useState({
        name: '',
        slug: '',
        plan: 'single_pharmacy',
        address: '',
        phone: '',
        email: '',
        gstin: '',
        dl_number: '',
        settings: {},
        branches: [],
        total_branches: 0,
        active_branches: 0,
    });

    // Branch modal state
    const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
    const [editingBranch, setEditingBranch] = useState(null);
    const [branchForm, setBranchForm] = useState({
        name: '',
        type: 'retail_counter',
        region: 'North',
        address: '',
        phone: '',
        pincode: '',
        radius_meters: 500,
    });
    const [branchSaving, setBranchSaving] = useState(false);

    // Delete confirmation state
    const [deleteCandidate, setDeleteCandidate] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const fetchOrgData = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/admin/organization', {
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
            });
            if (res.ok) {
                const json = await res.json();
                if (json.success && json.data) {
                    setOrgData({
                        name: json.data.name || '',
                        slug: json.data.slug || '',
                        plan: json.data.plan || 'single_pharmacy',
                        address: json.data.address || '',
                        phone: json.data.phone || '',
                        email: json.data.email || '',
                        gstin: json.data.gstin || '',
                        dl_number: json.data.dl_number || '',
                        settings: json.data.settings || {},
                        branches: json.data.branches || [],
                        total_branches: json.data.total_branches || 0,
                        active_branches: json.data.active_branches || 0,
                    });
                }
            } else if (res.status === 401 || res.status === 403) {
                if (isGuest) {
                    // Provide fallback demo view for guests
                    setOrgData({
                        name: 'Apollo Chemist & Healthcare Store',
                        slug: 'apollo-chemist-demo',
                        plan: 'single_pharmacy',
                        address: 'Shop 12, Main Market, Connaught Place, New Delhi',
                        phone: '+91 98765 43210',
                        email: 'contact@apollopharmacy.example.com',
                        gstin: '07AAAAA0000A1Z5',
                        dl_number: 'DL-20B-12345/21B-67890',
                        settings: { auto_reorder: true, fefo_warning_days: 60 },
                        branches: [
                            {
                                id: 1,
                                name: 'Main Retail Counter',
                                type: 'retail_counter',
                                region: 'Delhi NCR',
                                address: 'Shop 12, Main Market',
                                phone: '+91 98765 43210',
                                pincode: '110001',
                                radius_meters: 500,
                                is_active: true,
                            },
                            {
                                id: 2,
                                name: 'Cold-Chain Biological Storage',
                                type: 'cold_storage',
                                region: 'Delhi NCR',
                                address: 'Backroom Fridge 2-8°C',
                                phone: '+91 98765 43211',
                                pincode: '110001',
                                radius_meters: 100,
                                is_active: true,
                            },
                        ],
                        total_branches: 2,
                        active_branches: 2,
                    });
                } else {
                    setError('Unable to fetch organization profile. Please ensure you are logged in as an administrator.');
                }
            }
        } catch (err) {
            setError(err.message || 'Error fetching store profile');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrgData();
    }, []);

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        if (isGuest) {
            showAuthModal('Sign in to update your medical store profile');
            return;
        }

        setSaving(true);
        setMessage(null);
        setError(null);
        try {
            const res = await fetch('/api/admin/organization', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    name: orgData.name,
                    address: orgData.address,
                    phone: orgData.phone,
                    email: orgData.email,
                    gstin: orgData.gstin,
                    dl_number: orgData.dl_number,
                    settings: orgData.settings,
                }),
            });
            const json = await res.json();
            if (res.ok && json.success) {
                setMessage('Store profile updated successfully.');
                fetchOrgData();
            } else {
                setError(json.detail || json.message || 'Failed to update store profile');
            }
        } catch (err) {
            setError(err.message || 'Error saving profile');
        } finally {
            setSaving(false);
        }
    };

    const handleOpenAddBranch = () => {
        if (isGuest) {
            showAuthModal('Sign in to add store branches');
            return;
        }
        setEditingBranch(null);
        setBranchForm({
            name: '',
            type: 'retail_counter',
            region: 'North',
            address: '',
            phone: '',
            pincode: '',
            radius_meters: 500,
        });
        setIsBranchModalOpen(true);
    };

    const handleOpenEditBranch = (branch) => {
        if (isGuest) {
            showAuthModal('Sign in to edit store branches');
            return;
        }
        setEditingBranch(branch);
        setBranchForm({
            name: branch.name,
            type: branch.type,
            region: branch.region,
            address: branch.address || '',
            phone: branch.phone || '',
            pincode: branch.pincode || '',
            radius_meters: branch.radius_meters || 500,
        });
        setIsBranchModalOpen(true);
    };

    const handleSaveBranch = async (e) => {
        e.preventDefault();
        setBranchSaving(true);
        setError(null);
        try {
            const url = editingBranch
                ? `/api/inventory/locations/${editingBranch.id}`
                : '/api/inventory/locations';
            const method = editingBranch ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(branchForm),
            });
            const json = await res.json();
            if (res.ok && json.success) {
                setMessage(editingBranch ? 'Branch updated successfully' : 'New branch created successfully');
                setIsBranchModalOpen(false);
                fetchOrgData();
            } else {
                setError(json.detail || json.message || 'Failed to save branch');
            }
        } catch (err) {
            setError(err.message || 'Error saving branch');
        } finally {
            setBranchSaving(false);
        }
    };

    const handleToggleBranchActive = async (branch) => {
        if (isGuest) {
            showAuthModal('Sign in to toggle branch active status');
            return;
        }
        try {
            const res = await fetch(`/api/inventory/locations/${branch.id}/toggle-active`, {
                method: 'PATCH',
                credentials: 'include',
            });
            const json = await res.json();
            if (res.ok && json.success) {
                setMessage(json.message);
                fetchOrgData();
            } else {
                setError(json.detail || json.message || 'Failed to change branch status');
            }
        } catch (err) {
            setError(err.message || 'Error updating branch status');
        }
    };

    const handleConfirmDelete = async () => {
        if (!deleteCandidate) return;
        setDeleting(true);
        setError(null);
        try {
            const res = await fetch(`/api/inventory/locations/${deleteCandidate.id}`, {
                method: 'DELETE',
                credentials: 'include',
            });
            const json = await res.json();
            if (res.ok && json.success) {
                setMessage(json.message);
                setDeleteCandidate(null);
                fetchOrgData();
            } else {
                setError(json.detail || json.message || 'Failed to delete/archive branch');
            }
        } catch (err) {
            setError(err.message || 'Error deleting branch');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
                <div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">
                        <Store size={14} />
                        <span>Pharmacy Business & Branches</span>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                        Store Profile & Counter Setup
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Manage your chemist legal profile, drug licenses, GSTIN, and branch locations.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchOrgData}
                        disabled={loading}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-xs"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        <span>Refresh</span>
                    </button>
                    <button
                        onClick={handleOpenAddBranch}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all shadow-sm shadow-blue-500/20"
                    >
                        <Plus size={16} />
                        <span>Add Branch Counter</span>
                    </button>
                </div>
            </div>

            {/* Notification messages */}
            {message && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between animate-in fade-in">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                        <span>{message}</span>
                    </div>
                    <button onClick={() => setMessage(null)} className="text-xs font-semibold text-emerald-700 hover:underline">
                        Dismiss
                    </button>
                </div>
            )}

            {error && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between animate-in fade-in">
                    <div className="flex items-center gap-2">
                        <AlertCircle size={18} className="text-rose-600 shrink-0" />
                        <span>{error}</span>
                    </div>
                    <button onClick={() => setError(null)} className="text-xs font-semibold text-rose-700 hover:underline">
                        Dismiss
                    </button>
                </div>
            )}

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* ── Left Column: Pharmacy Business Profile ────────────────────── */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs p-6 space-y-5">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2">
                                <Building2 size={18} className="text-blue-600" />
                                <h2 className="text-base font-bold text-slate-900">Store Profile</h2>
                            </div>
                            <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                                {orgData.plan.replace('_', ' ')}
                            </span>
                        </div>

                        <form onSubmit={handleSaveProfile} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Pharmacy / Store Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={orgData.name}
                                    onChange={(e) => setOrgData({ ...orgData, name: e.target.value })}
                                    placeholder="e.g. Sharma Medicos & Chemist"
                                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Drug License No. (DL No.)
                                </label>
                                <div className="relative">
                                    <FileBadge className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                    <input
                                        type="text"
                                        value={orgData.dl_number}
                                        onChange={(e) => setOrgData({ ...orgData, dl_number: e.target.value })}
                                        placeholder="e.g. DL-20B-12345 / 21B-67890"
                                        className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    GSTIN / Tax ID
                                </label>
                                <div className="relative">
                                    <FileCheck2 className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                    <input
                                        type="text"
                                        value={orgData.gstin}
                                        onChange={(e) => setOrgData({ ...orgData, gstin: e.target.value })}
                                        placeholder="e.g. 07AAAAA0000A1Z5"
                                        className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 uppercase"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Contact Phone
                                    </label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-2.5 text-slate-400" size={15} />
                                        <input
                                            type="text"
                                            value={orgData.phone}
                                            onChange={(e) => setOrgData({ ...orgData, phone: e.target.value })}
                                            placeholder="+91 98765..."
                                            className="w-full pl-8 pr-2 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Store Email
                                    </label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-2.5 text-slate-400" size={15} />
                                        <input
                                            type="email"
                                            value={orgData.email}
                                            onChange={(e) => setOrgData({ ...orgData, email: e.target.value })}
                                            placeholder="store@domain..."
                                            className="w-full pl-8 pr-2 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Headquarters / Main Store Address
                                </label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                    <textarea
                                        rows={3}
                                        value={orgData.address}
                                        onChange={(e) => setOrgData({ ...orgData, address: e.target.value })}
                                        placeholder="Full street address, market name, city, state"
                                        className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-2"
                            >
                                <Save size={15} />
                                <span>{saving ? 'Saving Profile...' : 'Save Store Profile'}</span>
                            </button>
                        </form>
                    </div>

                    {/* Summary metrics card */}
                    <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-5 space-y-3">
                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Branch Summary</h3>
                        <div className="grid grid-cols-2 gap-3 text-center">
                            <div className="p-3 bg-white border border-slate-200 rounded-xl">
                                <p className="text-2xl font-black text-slate-900">{orgData.total_branches}</p>
                                <p className="text-[11px] text-slate-500 font-medium">Total Branches</p>
                            </div>
                            <div className="p-3 bg-white border border-slate-200 rounded-xl">
                                <p className="text-2xl font-black text-emerald-600">{orgData.active_branches}</p>
                                <p className="text-[11px] text-slate-500 font-medium">Active Counters</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Right Column: Branch & Counter Management ───────────────── */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs p-6 space-y-5">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                            <div>
                                <h2 className="text-base font-bold text-slate-900">Branch & Counter Locations</h2>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Counter staff and medicine stocks are strictly partitioned across these locations.
                                </p>
                            </div>
                            <button
                                onClick={handleOpenAddBranch}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-100 rounded-lg hover:bg-blue-100 transition-colors"
                            >
                                <Plus size={14} />
                                <span>Add Branch</span>
                            </button>
                        </div>

                        {loading ? (
                            <div className="p-8 text-center text-slate-400 text-xs">
                                Loading branches...
                            </div>
                        ) : orgData.branches.length === 0 ? (
                            <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl space-y-3">
                                <Store className="w-10 h-10 text-slate-300 mx-auto" />
                                <div>
                                    <p className="text-sm font-semibold text-slate-700">No branch counters configured</p>
                                    <p className="text-xs text-slate-400 mt-1">Add your main pharmacy counter to begin dispensing medicines.</p>
                                </div>
                                <button
                                    onClick={handleOpenAddBranch}
                                    className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700"
                                >
                                    Create Primary Counter
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {orgData.branches.map((b) => (
                                    <div
                                        key={b.id}
                                        className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                                            b.is_active
                                                ? 'bg-white border-slate-200 hover:border-blue-400 hover:shadow-xs'
                                                : 'bg-slate-50/80 border-slate-200/70 opacity-70'
                                        }`}
                                    >
                                        <div className="space-y-2">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                        ID: #{b.id} • {b.region}
                                                    </span>
                                                    <h3 className="text-sm font-bold text-slate-900 leading-tight">
                                                        {b.name}
                                                    </h3>
                                                </div>
                                                <span
                                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                        b.is_active
                                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                            : 'bg-slate-200 text-slate-600'
                                                    }`}
                                                >
                                                    {b.is_active ? 'Active' : 'Archived'}
                                                </span>
                                            </div>

                                            <div className="text-xs text-slate-500 space-y-1 pt-1">
                                                <p className="flex items-center gap-1.5">
                                                    <span className="font-semibold text-slate-700">Type:</span>
                                                    <span className="capitalize">{b.type.replace('_', ' ')}</span>
                                                </p>
                                                {b.address && (
                                                    <p className="truncate" title={b.address}>
                                                        <span className="font-semibold text-slate-700">Address:</span> {b.address}
                                                    </p>
                                                )}
                                                {b.phone && (
                                                    <p>
                                                        <span className="font-semibold text-slate-700">Phone:</span> {b.phone}
                                                    </p>
                                                )}
                                                <p>
                                                    <span className="font-semibold text-slate-700">Radius:</span> {b.radius_meters || 500}m counter boundary
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-4 mt-3 border-t border-slate-100">
                                            <button
                                                onClick={() => handleToggleBranchActive(b)}
                                                className={`text-[11px] font-semibold flex items-center gap-1 hover:underline ${
                                                    b.is_active ? 'text-amber-600' : 'text-emerald-600'
                                                }`}
                                            >
                                                <Power size={13} />
                                                <span>{b.is_active ? 'Deactivate' : 'Activate'}</span>
                                            </button>

                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => handleOpenEditBranch(b)}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                                    title="Edit branch"
                                                >
                                                    <Edit3 size={15} />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteCandidate(b)}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                                    title="Delete or archive branch"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Modal: Add / Edit Branch ──────────────────────────────────────── */}
            {isBranchModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <h3 className="text-base font-bold text-slate-900">
                                {editingBranch ? `Edit Branch: ${editingBranch.name}` : 'Add New Pharmacy Branch'}
                            </h3>
                            <button
                                onClick={() => setIsBranchModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 text-sm"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSaveBranch} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Branch / Counter Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={branchForm.name}
                                    onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                                    placeholder="e.g. South Extension Counter"
                                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Type
                                    </label>
                                    <select
                                        value={branchForm.type}
                                        onChange={(e) => setBranchForm({ ...branchForm, type: e.target.value })}
                                        className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900"
                                    >
                                        <option value="retail_counter">Retail Counter</option>
                                        <option value="cold_storage">Cold Storage (2-8°C)</option>
                                        <option value="branch">Branch Store</option>
                                        <option value="central_warehouse">Warehouse</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Region / City *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={branchForm.region}
                                        onChange={(e) => setBranchForm({ ...branchForm, region: e.target.value })}
                                        placeholder="e.g. North Delhi"
                                        className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Counter Phone
                                    </label>
                                    <input
                                        type="text"
                                        value={branchForm.phone}
                                        onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })}
                                        placeholder="+91..."
                                        className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        PIN Code
                                    </label>
                                    <input
                                        type="text"
                                        value={branchForm.pincode}
                                        onChange={(e) => setBranchForm({ ...branchForm, pincode: e.target.value })}
                                        placeholder="110001"
                                        className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Address
                                </label>
                                <input
                                    type="text"
                                    value={branchForm.address}
                                    onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
                                    placeholder="Shop number, street, landmark"
                                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Geofence Radius (meters)
                                </label>
                                <input
                                    type="number"
                                    min="50"
                                    max="50000"
                                    value={branchForm.radius_meters}
                                    onChange={(e) => setBranchForm({ ...branchForm, radius_meters: parseInt(e.target.value) || 500 })}
                                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsBranchModalOpen(false)}
                                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={branchSaving}
                                    className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-xs"
                                >
                                    {branchSaving ? 'Saving...' : editingBranch ? 'Update Branch' : 'Add Branch'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Modal: Safe Delete/Archive Confirmation ──────────────────────── */}
            {deleteCandidate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
                        <div className="flex items-center gap-3 text-amber-600">
                            <AlertCircle size={24} />
                            <h3 className="text-base font-bold text-slate-900">Remove Branch Counter?</h3>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                            Are you sure you want to remove <strong>{deleteCandidate.name}</strong>?
                            <br /><br />
                            <strong>Business rule:</strong> If historical stock or dispense transactions exist for this branch, it will be <strong>safely archived</strong> (deactivated) to preserve audit trails. If no transaction history exists, it will be permanently deleted.
                        </p>
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                            <button
                                type="button"
                                disabled={deleting}
                                onClick={() => setDeleteCandidate(null)}
                                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={deleting}
                                onClick={handleConfirmDelete}
                                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all shadow-xs"
                            >
                                {deleting ? 'Processing...' : 'Confirm Removal'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
