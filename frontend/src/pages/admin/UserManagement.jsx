import React, { useState, useEffect } from 'react';
import { auth as authApi, inventory } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Users, Search, Plus, Edit2, Trash2, Shield, Building2, ChevronDown, X, RefreshCw, MapPin } from 'lucide-react';
import AlertsDropdown from '../../components/layout/AlertsDropdown';

const UserManagement = () => {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        full_name: '',
        role: 'staff',
        password: '',
        location_ids: []
    });
    const [saving, setSaving] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            const [usersRes, locsRes] = await Promise.all([
                authApi.list(),
                inventory.getLocations().catch(() => ({ data: { data: [] } })),
            ]);
            if (usersRes.data.success) {
                setUsers(usersRes.data.data);
            }
            if (locsRes.data.success) {
                setLocations(locsRes.data.data);
            }
        } catch (err) {
            console.error("Failed to load users or locations", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const filteredUsers = users.filter(u =>
        u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.organization_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editingUser) {
                await authApi.update(editingUser.id, formData);
            } else {
                await authApi.register(formData);
            }
            setShowModal(false);
            setEditingUser(null);
            setFormData({ username: '', email: '', full_name: '', role: 'staff', password: '', location_ids: [] });
            loadData();
        } catch (err) {
            const msg =
                err.response?.data?.error?.message ||
                err.response?.data?.detail ||
                'Operation failed. Please check your input and try again.';
            alert(msg);
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (user) => {
        setEditingUser(user);
        setFormData({
            username: user.username,
            email: user.email || '',
            full_name: user.full_name || '',
            role: user.role,
            password: '',
            location_ids: user.location_ids || []
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to remove this staff member?')) return;
        try {
            await authApi.delete(id);
            loadData();
        } catch (err) {
            alert('Delete failed');
        }
    };

    const getRoleBadge = (role) => {
        const colors = {
            super_admin: 'bg-purple-50 text-purple-700 border-purple-200',
            admin:       'bg-red-50 text-red-700 border-red-200',
            manager:     'bg-amber-50 text-amber-700 border-amber-200',
            staff:       'bg-blue-50 text-blue-700 border-blue-200',
            vendor:      'bg-emerald-50 text-emerald-700 border-emerald-200',
        };
        return <span className={`px-2 py-0.5 border rounded-none text-[11px] font-bold uppercase tracking-wider ${colors[role] || 'bg-slate-50 text-slate-700 border-slate-200'}`}>{role}</span>;
    };

    const getLocationNames = (locIds) => {
        if (!locIds || locIds.length === 0) return 'All Branches';
        const matched = locations.filter(l => locIds.includes(l.id));
        if (matched.length === 0) return `${locIds.length} Branch(es)`;
        return matched.map(l => l.name).join(', ');
    };

    return (
        <div className="flex flex-col min-h-full bg-[#F8FAFC]">
            {/* ── Sticky Top Navbar ────────────────────────────────────────── */}
            <div className="sticky top-0 z-30 bg-white border-b border-slate-200 px-6 py-3.5 shadow-2xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Staff &amp; User Management</h2>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                            Allocate staff members to your pharmacy organization and assign branch counters
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5 flex-wrap">
                        <button
                            onClick={loadData}
                            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-none transition-colors border border-slate-300 cursor-pointer"
                            title="Refresh Data"
                        >
                            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                        </button>

                        <button
                            onClick={() => {
                                setEditingUser(null);
                                setFormData({
                                    username: '',
                                    email: '',
                                    full_name: '',
                                    role: 'staff',
                                    password: '',
                                    location_ids: locations.length > 0 ? [locations[0].id] : []
                                });
                                setShowModal(true);
                            }}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-none transition-colors shadow-2xs cursor-pointer"
                        >
                            <Plus size={14} />
                            <span>Allocate New Staff</span>
                        </button>

                        <div className="pl-1 border-l border-slate-200">
                            <AlertsDropdown />
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Main Content Container ───────────────────────────────────── */}
            <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6 flex-1">

                {/* Info strip */}
                <div className="bg-blue-50/70 border border-blue-200 p-4 rounded-none flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Building2 className="w-5 h-5 text-blue-600 shrink-0" />
                        <div>
                            <p className="text-xs font-bold text-slate-800">
                                Organization: <span className="text-blue-700">{currentUser?.organization_name || 'Your Pharmacy Network'}</span>
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                                Staff members created here are strictly isolated to your store and cannot access other chemist accounts.
                            </p>
                        </div>
                    </div>
                    <span className="text-xs font-bold text-blue-800 bg-white border border-blue-200 px-2.5 py-1">
                        {users.length} User(s)
                    </span>
                </div>

                <div className="bg-white rounded-none shadow-2xs border border-slate-200">
                    <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                        <div className="relative max-w-md w-full">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={14} />
                            <input
                                type="text"
                                placeholder="Search by name, email, or role..."
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-none focus:outline-none focus:ring-1 focus:ring-blue-600 text-xs"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 text-slate-600 font-bold text-[11px] uppercase tracking-wider border-b border-slate-200">
                                <tr>
                                    <th className="px-5 py-3">Staff / User</th>
                                    <th className="px-5 py-3">Email</th>
                                    <th className="px-5 py-3">Role</th>
                                    <th className="px-5 py-3">Assigned Branch / Counter</th>
                                    <th className="px-5 py-3">Status</th>
                                    <th className="px-5 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs">
                                {loading ? (
                                    <tr><td colSpan="6" className="text-center py-12 text-slate-400">Loading user roster...</td></tr>
                                ) : filteredUsers.length === 0 ? (
                                    <tr><td colSpan="6" className="text-center py-12 text-slate-400">No staff members found</td></tr>
                                ) : (
                                    filteredUsers.map(u => (
                                        <tr key={u.id} className="hover:bg-slate-50 transition">
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-none bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center text-xs font-bold">
                                                        {u.username?.[0]?.toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-slate-900">{u.username}</p>
                                                        <p className="text-[11px] text-slate-500">{u.full_name || 'No full name provided'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5 text-slate-600">{u.email || '—'}</td>
                                            <td className="px-5 py-3.5">{getRoleBadge(u.role)}</td>
                                            <td className="px-5 py-3.5 text-slate-700">
                                                <div className="flex items-center gap-1.5">
                                                    <MapPin size={13} className="text-slate-400 shrink-0" />
                                                    <span className="truncate max-w-xs">{getLocationNames(u.location_ids)}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <span className={`px-2 py-0.5 border rounded-none text-[10px] font-bold uppercase tracking-wider ${u.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                                    {u.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={() => handleEdit(u)} className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 rounded-none transition cursor-pointer" title="Edit Staff">
                                                        <Edit2 size={13} />
                                                    </button>
                                                    <button onClick={() => handleDelete(u.id)} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 border border-slate-200 rounded-none transition cursor-pointer" title="Remove Staff">
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="bg-white border border-slate-200 rounded-none shadow-xl w-full max-w-md p-6 space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">{editingUser ? 'Edit Staff Allocation' : 'Allocate New Staff Member'}</h3>
                                <p className="text-[11px] text-slate-500">Assign user credentials and branch location</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-3.5">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Username *</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-none focus:outline-none focus:ring-1 focus:ring-blue-600"
                                    value={formData.username}
                                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Email *</label>
                                <input
                                    type="email"
                                    required
                                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-none focus:outline-none focus:ring-1 focus:ring-blue-600"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Full Name</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-none focus:outline-none focus:ring-1 focus:ring-blue-600"
                                    value={formData.full_name}
                                    onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Role *</label>
                                    <select
                                        required
                                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-none focus:outline-none focus:ring-1 focus:ring-blue-600"
                                        value={formData.role}
                                        onChange={e => setFormData({ ...formData, role: e.target.value })}
                                    >
                                        <option value="staff">Staff (Pharmacist)</option>
                                        <option value="vendor">Vendor (Distributor)</option>
                                        <option value="manager">Branch Manager</option>
                                        <option value="admin">Store Admin</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Branch Counter</label>
                                    <select
                                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-none focus:outline-none focus:ring-1 focus:ring-blue-600"
                                        value={formData.location_ids?.[0] || ''}
                                        onChange={e => setFormData({ ...formData, location_ids: e.target.value ? [parseInt(e.target.value)] : [] })}
                                    >
                                        <option value="">All Branches</option>
                                        {locations.map(loc => (
                                            <option key={loc.id} value={loc.id}>{loc.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                                    {editingUser ? 'New Password (leave blank to keep)' : 'Initial Password *'}
                                </label>
                                <input
                                    type="password"
                                    required={!editingUser}
                                    minLength={8}
                                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-none focus:outline-none focus:ring-1 focus:ring-blue-600"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                />
                                <p className="text-[10px] text-slate-400 mt-0.5">Minimum 8 characters</p>
                            </div>
                            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-none transition cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-4 py-2 text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 rounded-none transition disabled:opacity-50 cursor-pointer shadow-2xs"
                                >
                                    {saving ? 'Allocating...' : (editingUser ? 'Update Staff' : 'Allocate Staff')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;