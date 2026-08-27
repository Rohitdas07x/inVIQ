import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { auth } from '../../services/api';
import {
    User,
    Mail,
    Lock,
    KeyRound,
    X,
    Check,
    AlertCircle,
    Loader2,
    Shield,
} from 'lucide-react';

export default function AdminProfileModal({ isOpen, onClose }) {
    const { user, updateUser } = useAuth();

    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');

    // Password change fields
    const [showPasswordSection, setShowPasswordSection] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [loading, setLoading] = useState(false);
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');

    useEffect(() => {
        if (isOpen) {
            // Preload from context
            if (user) {
                setFullName(user.full_name || user.username || '');
                setEmail(user.email || '');
            }
            // Also fetch latest fresh data from backend
            auth.me()
                .then((res) => {
                    if (res?.data?.data) {
                        const u = res.data.data;
                        setFullName(u.full_name || u.username || '');
                        setEmail(u.email || '');
                        updateUser({
                            full_name: u.full_name,
                            email: u.email,
                            username: u.username,
                            organization_name: u.organization_name,
                        });
                    }
                })
                .catch(() => {});

            setError('');
            setSuccessMessage('');
            setPasswordSuccess('');
        }
    }, [isOpen]);

    if (!isOpen || !user) return null;

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        if (!fullName.trim()) {
            setError('Full Name is mandatory.');
            return;
        }

        setLoading(true);
        try {
            const res = await auth.updateProfile({
                full_name: fullName.trim(),
                email: email.trim().toLowerCase(),
            });

            if (res.data?.success) {
                const updated = res.data.data;
                updateUser({
                    full_name: updated.full_name,
                    email: updated.email,
                    username: updated.username,
                });
                setSuccessMessage('Profile details saved successfully!');
                setTimeout(() => {
                    setSuccessMessage('');
                }, 3000);
            }
        } catch (err) {
            const msg =
                err?.response?.data?.detail ||
                err?.response?.data?.error?.message ||
                err?.response?.data?.message ||
                'Failed to update profile. Please try again.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setError('');
        setPasswordSuccess('');

        if (!currentPassword) {
            setError('Please enter your current password.');
            return;
        }
        if (newPassword.length < 8) {
            setError('New password must be at least 8 characters long.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('New passwords do not match.');
            return;
        }

        setPasswordLoading(true);
        try {
            const res = await auth.changePassword({
                old_password: currentPassword,
                new_password: newPassword,
            });

            if (res.data?.success) {
                setPasswordSuccess('Password changed successfully!');
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                setShowPasswordSection(false);
                setTimeout(() => setPasswordSuccess(''), 3000);
            }
        } catch (err) {
            const msg =
                err?.response?.data?.detail ||
                err?.response?.data?.error?.message ||
                err?.response?.data?.message ||
                'Failed to change password. Please verify your current password.';
            setError(msg);
        } finally {
            setPasswordLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white border border-slate-300 w-full max-w-lg shadow-2xl rounded-none flex flex-col max-h-[90vh] overflow-hidden">
                
                {/* ── Modal Header ────────────────────────────────────────── */}
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-slate-900 text-white flex items-center justify-center font-bold text-xs rounded-none">
                            <User size={16} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-900">Administrator Profile</h3>
                            <p className="text-xs text-slate-500">Update your name and security credentials</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 text-slate-400 hover:text-slate-800 transition"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* ── Modal Body ──────────────────────────────────────────── */}
                <div className="p-6 overflow-y-auto space-y-5">
                    
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 rounded-none">
                            <AlertCircle size={15} className="shrink-0 text-red-600" />
                            <span>{error}</span>
                        </div>
                    )}

                    {successMessage && (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 rounded-none">
                            <Check size={15} className="shrink-0 text-emerald-600" />
                            <span>{successMessage}</span>
                        </div>
                    )}

                    {passwordSuccess && (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 rounded-none">
                            <Check size={15} className="shrink-0 text-emerald-600" />
                            <span>{passwordSuccess}</span>
                        </div>
                    )}

                    {/* Profile Information Form */}
                    <form onSubmit={handleSaveProfile} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                                Full Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="Enter your full name"
                                className="w-full px-3 py-2 border border-slate-300 rounded-none text-sm text-slate-900 focus:outline-none focus:border-slate-800"
                            />
                            <p className="text-[11px] text-slate-400 mt-0.5">This name is used across the dashboard and the InvIQ AI assistant.</p>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                                Email Address <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="admin@pharmacy.com"
                                className="w-full px-3 py-2 border border-slate-300 rounded-none text-sm text-slate-900 focus:outline-none focus:border-slate-800"
                            />
                            <p className="text-[11px] text-slate-400 mt-0.5">Used for authentication and important pharmacy alerts.</p>
                        </div>

                        <div className="pt-2 flex items-center justify-between">
                            <button
                                type="button"
                                onClick={() => setShowPasswordSection(!showPasswordSection)}
                                className="text-xs text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-1.5"
                            >
                                <KeyRound size={13} />
                                <span>{showPasswordSection ? 'Hide Password Change' : 'Change Password'}</span>
                            </button>

                            <button
                                type="submit"
                                disabled={loading}
                                className="px-5 py-2 bg-slate-900 text-white text-xs font-bold rounded-none hover:bg-black transition disabled:opacity-50 flex items-center gap-2"
                            >
                                {loading && <Loader2 size={13} className="animate-spin" />}
                                <span>Save Profile Changes</span>
                            </button>
                        </div>
                    </form>

                    {/* Change Password Section */}
                    {showPasswordSection && (
                        <div className="pt-4 border-t border-slate-200 bg-slate-50 p-4 space-y-3 rounded-none">
                            <div className="flex items-center gap-2">
                                <Shield size={14} className="text-slate-700" />
                                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Update Account Password</h4>
                            </div>

                            <form onSubmit={handleChangePassword} className="space-y-3">
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                        Current Password
                                    </label>
                                    <input
                                        type="password"
                                        required
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full px-3 py-1.5 border border-slate-300 rounded-none text-xs bg-white text-slate-900 focus:outline-none focus:border-slate-800"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                            New Password
                                        </label>
                                        <input
                                            type="password"
                                            required
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="Min 8 characters"
                                            className="w-full px-3 py-1.5 border border-slate-300 rounded-none text-xs bg-white text-slate-900 focus:outline-none focus:border-slate-800"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                            Confirm New Password
                                        </label>
                                        <input
                                            type="password"
                                            required
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Repeat new password"
                                            className="w-full px-3 py-1.5 border border-slate-300 rounded-none text-xs bg-white text-slate-900 focus:outline-none focus:border-slate-800"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end pt-1">
                                    <button
                                        type="submit"
                                        disabled={passwordLoading}
                                        className="px-4 py-1.5 bg-slate-800 text-white text-xs font-semibold rounded-none hover:bg-slate-900 transition disabled:opacity-50 flex items-center gap-1.5"
                                    >
                                        {passwordLoading && <Loader2 size={12} className="animate-spin" />}
                                        <span>Update Password</span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>

                {/* ── Modal Footer ────────────────────────────────────────── */}
                <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition rounded-none"
                    >
                        Close
                    </button>
                </div>

            </div>
        </div>
    );
}
