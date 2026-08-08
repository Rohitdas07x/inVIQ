import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, Package, MessageSquare, LogOut, ClipboardList,
    Users, ShieldCheck, Upload, Building2, FileText, Eye, HelpCircle, X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useGuest } from '../../context/GuestContext';

const ROLE_LABELS = {
    super_admin: { label: 'Super Admin', color: 'bg-purple-900 text-purple-300' },
    admin:       { label: 'Admin',       color: 'bg-red-900 text-red-300' },
    manager:     { label: 'Manager',     color: 'bg-yellow-900 text-yellow-300' },
    staff:       { label: 'Staff',       color: 'bg-blue-900 text-blue-300' },
    vendor:      { label: 'Vendor',      color: 'bg-green-900 text-green-300' },
};

/**
 * Role-based navigation items.
 * "guest" role is a virtual role — maps to the public-accessible /admin/* routes.
 */
const ALL_NAV_ITEMS = [
    // ── Admin Portal ──────────────────────────────────────────────────────
    { path: '/admin/dashboard',    label: 'Dashboard',       icon: LayoutDashboard, roles: ['super_admin', 'admin', 'manager', 'guest'] },
    { path: '/admin/inventory',    label: 'Inventory',       icon: Package,          roles: ['super_admin', 'admin', 'manager', 'guest'] },
    { path: '/admin/requisitions', label: 'Requisitions',    icon: ClipboardList,    roles: ['super_admin', 'admin', 'manager', 'guest'] },
    { path: '/admin/chat',         label: 'AI Assistant',    icon: MessageSquare,    roles: ['super_admin', 'admin', 'manager', 'staff', 'guest'] },
    { path: '/admin/users',        label: 'User Management', icon: Users,            roles: ['super_admin', 'admin'] },
    { path: '/admin/audit-logs',   label: 'Audit Logs',      icon: FileText,         roles: ['super_admin', 'admin'] },
    { path: '/admin/reports',      label: 'Reports',         icon: Building2,        roles: ['super_admin', 'admin'] },

    // ── Staff / Vendor shortcuts ───────────────────────────────────────────
    { path: '/staff',  label: 'Staff Portal',  icon: Users,   roles: ['super_admin', 'admin', 'manager', 'staff'], divider: true },
    { path: '/vendor', label: 'Vendor Portal', icon: Upload,  roles: ['super_admin', 'admin', 'vendor'] },
];

const Sidebar = () => {
    const { user, logout } = useAuth();
    const { isGuest, showAuthModal } = useGuest();
    const navigate = useNavigate();
    const [showHelp, setShowHelp] = useState(false);

    // Use a virtual "guest" role for guests so the nav item filter works cleanly
    const role = user?.role || 'guest';

    // Filter nav items by current user role
    const navItems = ALL_NAV_ITEMS.filter(item => item.roles.includes(role));

    const handleLogout = async () => {
        await logout();
        navigate('/signin', { replace: true });
    };

    const roleInfo = ROLE_LABELS[role];

    // Portal label based on role (guests see "Demo Preview")
    const portalLabel = {
        super_admin: 'Super Admin Portal',
        admin:       'Admin Portal',
        manager:     'Manager Portal',
        staff:       'Staff Portal',
        vendor:      'Vendor Portal',
        guest:       'Demo Preview',
    }[role] || 'Portal';

    return (
        <div className="h-screen w-64 bg-white border-r border-slate-100 flex flex-col p-4 shrink-0">
            {/* Brand */}
            <div className="mb-8 px-4 py-2 flex flex-col">
                <div className="flex items-center gap-2.5">
                    <img src="/logo.png" alt="InvIQ Logo" className="w-8 h-8 object-contain" />
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">InvIQ</h1>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-1 uppercase tracking-wider">{portalLabel}</p>
            </div>

            {/* Nav links */}
            <nav className="flex-1 space-y-1">
                {navItems.map((item, idx) => (
                    <React.Fragment key={item.path}>
                        {item.divider && idx > 0 && (
                            <div className="border-t border-slate-100 my-2" />
                        )}
                        <NavLink
                            to={item.path}
                            className={({ isActive }) =>
                                `flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium ${isActive
                                    ? 'bg-primaryLight text-primary shadow-sm'
                                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                                }`
                            }
                        >
                            <item.icon size={20} />
                            <span className="font-medium">{item.label}</span>
                        </NavLink>
                    </React.Fragment>
                ))}
            </nav>

            {/* Help & Support Button */}
            <div className="pt-2">
                <button
                    onClick={() => setShowHelp(true)}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                >
                    <HelpCircle size={18} />
                    <span>Help & Support</span>
                </button>
            </div>

            {/* Bottom section */}
            <div className="mt-auto pt-3 border-t border-slate-100 space-y-2">
                {/* Authenticated user info */}
                {user && (
                    <div className="px-3 py-2.5 bg-slate-50 border border-slate-200 flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-900 text-white flex items-center justify-center text-xs font-bold uppercase">
                            {user.username?.[0] || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">{user.username}</p>
                            {roleInfo && (
                                <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 font-bold ${roleInfo.color}`}>
                                    {roleInfo.label}
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {/* Guest sign-in CTA */}
                {isGuest && (
                    <button
                        id="sidebar-signin-cta"
                        onClick={() => navigate('/signin')}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-900 text-white hover:bg-black transition-colors text-sm font-semibold"
                    >
                        <Eye size={16} />
                        <span>Sign In</span>
                    </button>
                )}

                {/* Logout button — only for authenticated users */}
                {!isGuest && (
                    <button
                        id="sidebar-logout"
                        onClick={handleLogout}
                        className="w-full flex items-center space-x-3 px-3 py-2 text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors text-left text-sm font-medium"
                    >
                        <LogOut size={18} />
                        <span>Sign Out</span>
                    </button>
                )}
            </div>

            {/* Help & Support Modal */}
            {showHelp && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="bg-white border border-slate-300 w-full max-w-md p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-slate-900 text-white flex items-center justify-center">
                                    <HelpCircle size={18} />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-slate-900">Help & Support</h3>
                                    <p className="text-xs text-slate-500">InvIQ Pharmacy & Supply Chain Desk</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowHelp(false)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-3 text-xs sm:text-sm">
                            <div className="p-3 bg-slate-50 border border-slate-200 space-y-1">
                                <p className="font-semibold text-slate-900">Enterprise Hotline</p>
                                <p className="text-slate-600">Call 24/7 Supply Chain Support: <span className="font-mono text-slate-900">+1 (800) 555-INVIQ</span></p>
                            </div>

                            <div className="p-3 bg-slate-50 border border-slate-200 space-y-1">
                                <p className="font-semibold text-slate-900">Direct Email Desk</p>
                                <p className="text-slate-600">Technical & Batch Queries: <span className="font-mono text-slate-900">support@inviq.ai</span></p>
                            </div>

                            <div className="p-3 bg-slate-50 border border-slate-200 space-y-1">
                                <p className="font-semibold text-slate-900">Documentation & Guides</p>
                                <p className="text-slate-600">Access cold-chain SOPs, FEFO guides, and automated requisition walkthroughs.</p>
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                onClick={() => {
                                    alert("Support ticket initiated. Our logistics engineering team will reach out within 15 minutes.");
                                    setShowHelp(false);
                                }}
                                className="w-full py-2.5 bg-slate-900 text-white font-semibold text-sm hover:bg-black transition-colors"
                            >
                                Contact Support Engineer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Sidebar;
