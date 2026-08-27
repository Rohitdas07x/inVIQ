import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, Package, MessageSquare, LogOut, ClipboardList,
    Users, ShieldCheck, Upload, Building2, FileText, Eye, HelpCircle, X,
    PanelLeftClose, Truck, ScanBarcode
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useGuest } from '../../context/GuestContext';

import AdminProfileModal from '../ui/AdminProfileModal';

const ROLE_LABELS = {
    super_admin: { label: 'Super Admin', color: 'bg-purple-900 text-purple-300' },
    admin:       { label: 'Admin',       color: 'bg-red-900 text-red-300' },
    staff:       { label: 'Staff',       color: 'bg-blue-900 text-blue-300' },
    vendor:      { label: 'Vendor',      color: 'bg-green-900 text-green-300' },
};

/**
 * Role-based navigation items.
 * "guest" role is a virtual role — maps to the public-accessible /admin/* routes.
 */
const ALL_NAV_ITEMS = [
    // ── Admin Portal ──────────────────────────────────────────────────────
    { path: '/admin/dashboard',         label: 'Dashboard',           icon: LayoutDashboard, roles: ['super_admin', 'admin', 'guest'] },
    { path: '/admin/billing',           label: 'Billing Counter',     icon: ScanBarcode,     roles: ['super_admin', 'admin', 'staff', 'guest'] },
    { path: '/admin/inventory',         label: 'Inventory',           icon: Package,          roles: ['super_admin', 'admin', 'guest'] },
    { path: '/admin/stock-acquisition', label: 'Stock Acquisition',   icon: Upload,           roles: ['super_admin', 'admin', 'vendor', 'guest'] },
    { path: '/admin/requisitions',      label: 'Requisitions',        icon: ClipboardList,    roles: ['super_admin', 'admin', 'guest'] },
    { path: '/admin/chat',              label: 'AI Assistant',        icon: MessageSquare,    roles: ['super_admin', 'admin'] },
    { path: '/admin/suppliers',         label: 'Suppliers & Vendors', icon: Truck,            roles: ['super_admin', 'admin'] },
    { path: '/admin/users',             label: 'Users & Staff',       icon: Users,            roles: ['super_admin', 'admin'] },
    { path: '/admin/organization',      label: 'Store & Branches',    icon: Building2,        roles: ['super_admin', 'admin'] },
    { path: '/admin/reports',           label: 'Reports',             icon: FileText,         roles: ['super_admin', 'admin'] },

    // ── Staff Portal shortcut ──────────────────────────────────────────────
    { path: '/staff',                   label: 'Staff Portal',        icon: Users,            roles: ['super_admin', 'admin', 'staff'], divider: true },
];

const Sidebar = () => {
    const { user, logout } = useAuth();
    const { isGuest, showAuthModal } = useGuest();
    const [collapsed, setCollapsed] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const navigate = useNavigate();

    const roleInfo = user?.role ? ROLE_LABELS[user.role] : null;

    const handleLogout = async () => {
        await logout();
        navigate('/signin');
    };

    const displayName = user?.full_name || user?.username || 'Admin';

    return (
        <aside
            className={`h-screen sticky top-0 flex flex-col bg-white border-r border-slate-200 text-slate-800 transition-all duration-300 z-40 ${
                collapsed ? 'w-18 p-3' : 'w-64 p-4'
            }`}
        >
            {/* ── Brand / Header ────────────────────────────────────────── */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                {!collapsed && (
                    <div className="flex items-center space-x-2.5 min-w-0">
                        <div className="w-8 h-8 bg-slate-900 flex items-center justify-center font-bold text-white shrink-0">
                            IQ
                        </div>
                        <div className="min-w-0">
                            <span className="font-black text-slate-900 tracking-tight text-base block leading-none">
                                InvIQ
                            </span>
                            <span className="text-[10px] text-slate-600 block mt-0.5 tracking-wider font-semibold">
                                SMART INVENTORY
                            </span>
                        </div>
                    </div>
                )}

                {collapsed && (
                    <div className="w-8 h-8 bg-slate-900 flex items-center justify-center font-bold text-white mx-auto">
                        IQ
                    </div>
                )}

                {/* Collapse button */}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className={`text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 transition-colors ${collapsed ? 'mx-auto mt-2' : ''}`}
                    title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                    aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    <PanelLeftClose
                        size={16}
                        className={`transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`}
                    />
                </button>
            </div>

            {/* ── Navigation Items ──────────────────────────────────────── */}
            <nav className="mt-4 flex-1 space-y-1 overflow-y-auto">
                {ALL_NAV_ITEMS.map((item, idx) => (
                    <React.Fragment key={item.path}>
                        {item.divider && !collapsed && (
                            <div className="pt-3 pb-1">
                                <p className="px-3 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                                    Operations
                                </p>
                            </div>
                        )}
                        <NavLink
                            to={item.path}
                            title={collapsed ? item.label : undefined}
                            className={({ isActive }) =>
                                `flex items-center ${collapsed ? 'justify-center px-2' : 'space-x-3 px-3'} py-2.5 transition-colors text-sm font-medium ${
                                    isActive
                                        ? 'bg-slate-100 text-slate-900 border-l-2 border-slate-900 font-semibold'
                                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                }`
                            }
                        >
                            <item.icon size={20} className="shrink-0" />
                            {!collapsed && <span className="font-medium truncate">{item.label}</span>}
                        </NavLink>
                    </React.Fragment>
                ))}
            </nav>

            {/* Help & Support Button */}
            <div className="pt-2 border-t border-slate-100">
                <button
                    onClick={() => setShowHelp(true)}
                    title={collapsed ? "Help & Support" : undefined}
                    className={`w-full flex items-center ${collapsed ? 'justify-center px-2' : 'gap-3 px-3'} py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors`}
                >
                    <HelpCircle size={18} className="shrink-0" />
                    {!collapsed && <span>Help & Support</span>}
                </button>
            </div>

            {/* Bottom section */}
            <div className="mt-auto pt-3 border-t border-slate-100 space-y-2">
                {/* Authenticated user info — Clickable to edit profile */}
                {user && (
                    <div 
                        onClick={() => setShowProfileModal(true)}
                        title={collapsed ? `${displayName} (Click to edit profile)` : "Click to edit your profile"}
                        className={`p-2.5 bg-slate-50 border border-slate-200 flex items-center cursor-pointer hover:bg-slate-100 hover:border-slate-300 transition-all group ${collapsed ? 'justify-center' : 'gap-3'}`}
                    >
                        <div className="w-8 h-8 bg-slate-900 text-white flex items-center justify-center text-xs font-bold uppercase shrink-0" title={collapsed ? displayName : undefined}>
                            {displayName[0] || 'A'}
                        </div>
                        {!collapsed && (
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-bold text-slate-900 truncate">
                                        {displayName}
                                    </p>
                                    <span className="text-[10px] text-slate-400 group-hover:text-slate-700 font-medium ml-1">Edit</span>
                                </div>
                                {roleInfo && (
                                    <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 font-bold ${roleInfo.color}`}>
                                        {roleInfo.label}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Guest sign-in CTA */}
                {isGuest && (
                    <button
                        id="sidebar-signin-cta"
                        onClick={() => navigate('/signin')}
                        title={collapsed ? "Sign In" : undefined}
                        className={`w-full flex items-center justify-center gap-2 py-2.5 bg-slate-900 text-white hover:bg-black transition-colors text-sm font-semibold ${collapsed ? 'px-2' : 'px-3'}`}
                    >
                        <Eye size={16} className="shrink-0" />
                        {!collapsed && <span>Sign In</span>}
                    </button>
                )}

                {/* Logout button — only for authenticated users */}
                {!isGuest && (
                    <button
                        id="sidebar-logout"
                        onClick={handleLogout}
                        title={collapsed ? "Sign Out" : undefined}
                        className={`w-full flex items-center ${collapsed ? 'justify-center px-2' : 'space-x-3 px-3'} py-2 text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors text-left text-sm font-medium`}
                    >
                        <LogOut size={18} className="shrink-0" />
                        {!collapsed && <span>Sign Out</span>}
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

            {/* Admin Profile Modal */}
            <AdminProfileModal
                isOpen={showProfileModal}
                onClose={() => setShowProfileModal(false)}
            />
        </aside>
    );
};

export default Sidebar;
