import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AIAssistantInterface from '../../components/ui/ai-assistant-interface';
import {
    LayoutDashboard, Package, ClipboardList, MessageSquare,
    PanelLeftClose, PanelLeft, Bell, Search, LogIn, UserPlus,
    Activity, AlertTriangle, CheckCircle, ArrowUpRight, ArrowDownRight,
    MapPin, Calendar, Check, X, Bot, Send, Mic, Sparkles, Filter, RefreshCw, HelpCircle,
    Menu
} from 'lucide-react';
import {
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';
import {
    MOCK_STATS,
    MOCK_LOCATIONS,
    MOCK_ITEMS,
    MOCK_REQUISITIONS,
    MOCK_CHATBOT_REPLIES
} from '../../services/mockData';

const STATUS_COLORS = {
    HEALTHY: '#22c55e',
    WARNING: '#f59e0b',
    CRITICAL: '#ef4444'
};

const PIE_COLORS = ['#ef4444', '#22c55e', '#f59e0b'];

export default function PreviewDashboard() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [collapsed, setCollapsed] = useState(false);
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [requisitions, setRequisitions] = useState(MOCK_REQUISITIONS);
    const [showHelp, setShowHelp] = useState(false);


    // Chatbot Demo State
    const [chatMessages, setChatMessages] = useState([
        { role: 'assistant', content: '👋 **Welcome to the InvIQ Smart Inventory Assistant!**\n\nI am your AI agent connected to central warehouses and pharmacy dispensaries. Ask me anything in natural language, for example:\n- *"Which items have critical shortages?"*\n- *"Check cold-chain vaccine temperatures"*\n- *"List medicines expiring within 90 days"*' }
    ]);
    const [chatInput, setChatInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);

    const handleSendChat = (e) => {
        e?.preventDefault();
        if (!chatInput.trim()) return;
        const userMsg = chatInput.trim();
        setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setChatInput('');
        setChatLoading(true);

        setTimeout(() => {
            const matched = MOCK_CHATBOT_REPLIES.find(r => r.pattern.test(userMsg));
            const reply = matched ? matched.reply : `📊 **InvIQ AI Analysis:**\n\nI analyzed our 4 inventory locations for **"${userMsg}"**.\n- Total items matched: 8 products\n- Stock status: 6 Healthy, 2 Action Required\n- Storage requirement: Ambient & Cold-Chain monitored.\n\n*Sign in to run real-time automated purchase orders or adjust reorder thresholds.*`;
            setChatMessages(prev => [...prev, { role: 'assistant', content: reply }]);
            setChatLoading(false);
        }, 600);
    };

    const handleApproveReq = (id) => {
        setRequisitions(prev => prev.map(r => r.id === id ? { ...r, status: 'APPROVED' } : r));
    };

    const handleRejectReq = (id) => {
        setRequisitions(prev => prev.map(r => r.id === id ? { ...r, status: 'REJECTED' } : r));
    };

    const filteredItems = MOCK_ITEMS.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.batch_number.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
    });

    const totalStockCount = MOCK_STATS.category_distribution.reduce((acc, curr) => acc + curr.value, 0);

    return (
        <div className="flex h-screen w-screen bg-[#F8FAFC] font-sans text-slate-900 overflow-hidden">
            {/* Mobile Backdrop */}
            {mobileSidebarOpen && (
                <div
                    onClick={() => setMobileSidebarOpen(false)}
                    className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 md:hidden transition-opacity"
                />
            )}

            {/* ── 1. Left Collapsible / Mobile Responsive Sidebar ─────────── */}
            <aside className={`fixed inset-y-0 left-0 md:static h-screen bg-white border-r border-slate-200/80 flex flex-col transition-all duration-300 ease-in-out shrink-0 z-50 md:z-30 ${
                mobileSidebarOpen ? 'translate-x-0 w-64 shadow-2xl' : '-translate-x-full md:translate-x-0'
            } ${collapsed ? 'md:w-20' : 'md:w-64'}`}>
                {/* Brand Header */}
                <div className="h-16 px-4 flex items-center justify-between border-b border-slate-100">
                    {!collapsed ? (
                        <>
                            <div className="flex items-center gap-3">
                                <img src="/logo.png" alt="InvIQ Logo" className="w-8 h-8 object-contain shrink-0" />
                                <div className="flex flex-col justify-center">
                                    <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-none">InvIQ</h1>
                                    <span className="inline-block mt-1 text-[10px] uppercase font-bold tracking-wider text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded-none border border-slate-200 w-fit">
                                        Demo Preview
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setCollapsed(true)}
                                    className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                                    title="Collapse Sidebar"
                                >
                                    <PanelLeftClose size={18} />
                                </button>
                                <button
                                    onClick={() => setMobileSidebarOpen(false)}
                                    className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                                    title="Close Sidebar"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="w-full flex justify-center items-center">
                            <button
                                onClick={() => setCollapsed(false)}
                                className="group p-2 rounded-xl hover:bg-slate-100 transition-all cursor-pointer flex items-center justify-center"
                                title="Click Logo to Expand Sidebar"
                                aria-label="Expand Sidebar"
                            >
                                <img
                                    src="/logo.png"
                                    alt="InvIQ Logo"
                                    className="w-8 h-8 object-contain group-hover:scale-110 transition-transform"
                                />
                            </button>
                        </div>
                    )}
                </div>



                {/* Navigation Items */}
                <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
                    {[
                        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                        { id: 'inventory', label: 'Inventory', icon: Package },
                        { id: 'requisitions', label: 'Requisitions', icon: ClipboardList, badge: requisitions.filter(r => r.status === 'PENDING').length },
                        { id: 'chat', label: 'AI Assistant', icon: MessageSquare, badge: 'AI' },
                    ].map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    setActiveTab(tab.id);
                                    setMobileSidebarOpen(false);
                                }}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                                    isActive
                                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                } ${collapsed ? 'md:justify-center md:px-2' : ''}`}
                            >
                                <Icon size={18} className="shrink-0" />
                                {(!collapsed || mobileSidebarOpen) && (
                                    <span className="flex-1 text-left truncate">{tab.label}</span>
                                )}
                                {tab.badge && (!collapsed || mobileSidebarOpen) && (
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                        isActive ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-600'
                                    }`}>
                                        {tab.badge}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </nav>

                {/* Help & Support Button in Lower Left Corner */}
                <div className="p-3 border-t border-slate-100">
                    <button
                        onClick={() => setShowHelp(true)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-none text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors ${
                            collapsed ? 'justify-center' : ''
                        }`}
                        title="Help & Support"
                    >
                        <HelpCircle size={18} className="shrink-0 text-slate-700" />
                        {!collapsed && <span>Help & Support</span>}
                    </button>
                </div>

                {/* Sidebar Bottom Status */}
                <div className="p-3 border-t border-slate-100 bg-slate-50/50">
                    {!collapsed ? (
                        <div className="p-3 bg-white border border-slate-200 shadow-none">
                            <div className="flex items-center gap-2 mb-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-xs font-semibold text-slate-800">Demo Mode Active</span>
                            </div>
                            <p className="text-[11px] text-slate-500 leading-snug">
                                Exploring live simulated pharmacy data.
                            </p>
                        </div>
                    ) : (
                        <div className="flex justify-center py-1" title="Demo Mode Active">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        </div>
                    )}
                </div>
            </aside>

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
                                onClick={() => setShowHelp(false)}
                                className="w-full py-2.5 bg-slate-900 text-white font-semibold text-sm hover:bg-black transition-colors rounded-none cursor-pointer"
                            >
                                OK, Got It
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── 2. Main Viewport & Fixed Top Bar ──────────────────────────── */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
                {/* Top Header Bar */}
                <header className="h-16 px-4 sm:px-6 bg-white border-b border-slate-200/80 flex items-center justify-between shrink-0 z-20">
                    {/* Left: Hamburger (mobile) + Title */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setMobileSidebarOpen(true)}
                            className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                            aria-label="Open Navigation Menu"
                        >
                            <Menu size={20} />
                        </button>
                        <div>
                            <h2 className="text-base sm:text-lg font-bold text-slate-900 capitalize leading-tight truncate max-w-[200px] sm:max-w-none">
                                {activeTab === 'dashboard' && 'Dashboard Overview'}
                                {activeTab === 'inventory' && 'Central Inventory & Batch Tracker'}
                                {activeTab === 'requisitions' && 'Stock Requisitions & Approvals'}
                                {activeTab === 'chat' && 'AI Inventory Assistant'}
                            </h2>
                            <span className="hidden sm:block text-xs text-slate-400">InvIQ Smart Wholesale & Pharmacy Suite</span>
                        </div>
                    </div>



                    {/* Right: Prominent Sign In + Sign Up Buttons (Always Visible) */}
                    <div className="flex items-center gap-3">
                        <div className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full cursor-pointer transition-colors">
                            <Bell size={18} />
                            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                        </div>

                        <div className="h-6 w-px bg-slate-200" />

                        <button
                            onClick={() => navigate('/signin')}
                            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-xs"
                        >
                            <LogIn size={16} />
                            <span>Sign In</span>
                        </button>

                        <button
                            onClick={() => navigate('/signup')}
                            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-sm shadow-blue-600/20"
                        >
                            <UserPlus size={16} />
                            <span>Sign Up</span>
                        </button>
                    </div>
                </header>

                {/* ── 3. Tab Content (Fitted & Responsive) ───────────────────── */}
                <main className={`flex-1 overflow-y-auto ${activeTab === 'chat' ? 'p-0 h-[calc(100vh-4rem)] flex flex-col' : 'p-5 md:p-6 lg:p-8'}`}>
                    {/* TAB 1: DASHBOARD OVERVIEW */}
                    {activeTab === 'dashboard' && (
                        <div className="space-y-6 max-w-7xl mx-auto">
                            {/* 4 KPI Matrix with Sharp Connected Edge Points */}
                            <div className="bg-white border border-slate-200 rounded-none grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 shadow-none">
                                <div className="p-6 flex flex-col justify-between">
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 tracking-wider">Active Pharmaceutical SKUs</p>
                                        <h3 className="text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">1,300</h3>
                                    </div>
                                    <div className="mt-4 flex items-center text-xs font-medium text-emerald-600">
                                        <ArrowUpRight size={14} className="mr-0.5" /> 4.2% <span className="text-slate-400 ml-1">vs last month</span>
                                    </div>
                                </div>

                                <div className="p-6 flex flex-col justify-between">
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 tracking-wider">Total Inventory Valuation</p>
                                        <h3 className="text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">$184,290</h3>
                                    </div>
                                    <div className="mt-4 flex items-center text-xs font-medium text-emerald-600">
                                        <ArrowUpRight size={14} className="mr-0.5" /> 12.4% <span className="text-slate-400 ml-1">asset value</span>
                                    </div>
                                </div>

                                <div className="p-6 flex flex-col justify-between">
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 tracking-wider">Stock Fulfillment Rate</p>
                                        <h3 className="text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">98.2%</h3>
                                    </div>
                                    <div className="mt-4 flex items-center text-emerald-600 text-xs font-medium">
                                        <ArrowUpRight size={14} className="mr-0.5" /> 0.4% <span className="text-slate-400 ml-1">fulfillment</span>
                                    </div>
                                </div>

                                <div className="p-6 flex flex-col justify-between">
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 tracking-wider">Critical Stock Alerts</p>
                                        <h3 className="text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">4 Critical</h3>
                                    </div>
                                    <div className="mt-4 flex items-center text-xs font-medium text-amber-600">
                                        <span>⚠️ 8 Near Minimum</span>
                                    </div>
                                </div>
                            </div>

                            {/* Connected Charts Grid Matrix */}
                            <div className="bg-white border border-slate-200 rounded-none grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 shadow-none">
                                {/* Stock Health Distribution */}
                                <div className="p-6">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="text-base font-bold text-slate-900">Inventory Health Breakdown</h4>
                                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 border border-emerald-200 rounded-none flex items-center gap-0.5">
                                            <ArrowUpRight size={12} /> 94.4% Healthy
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 mb-6">Real-time batch stock status across warehouse locations.</p>
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={MOCK_STATS.status_distribution}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={85}
                                                    paddingAngle={3}
                                                    dataKey="value"
                                                >
                                                    {MOCK_STATS.status_distribution.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || '#22c55e'} />
                                                    ))}
                                                </Pie>
                                                <Tooltip />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Therapeutic Category Distribution */}
                                <div className="p-6">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="text-base font-bold text-slate-900">Therapeutic Category Volume</h4>
                                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 border border-emerald-200 rounded-none flex items-center gap-0.5">
                                            <ArrowUpRight size={12} /> 1,300 Units
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 mb-6">Current units in stock by therapeutic medicine category.</p>
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart
                                                data={MOCK_STATS.category_distribution}
                                                layout="vertical"
                                                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                                                <XAxis type="number" tick={{ fontSize: 11 }} />
                                                <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 11 }} />
                                                <Tooltip />
                                                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>


                            {/* Critical Shortages Connected Grid */}
                            <div className="bg-white border border-slate-200 rounded-none shadow-none overflow-hidden">
                                <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-900">Immediate Action Required</h4>
                                        <p className="text-xs text-slate-500">Items below mandatory minimum threshold</p>
                                    </div>
                                    <span className="text-xs font-semibold text-red-700 bg-red-50 px-2.5 py-1 rounded-none border border-red-200">
                                        {MOCK_STATS.low_stock_items.length} Critical
                                    </span>
                                </div>
                                <div className="divide-y divide-slate-200">
                                    {MOCK_STATS.low_stock_items.map((item) => (
                                        <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-red-50 text-red-600 border border-red-200 flex items-center justify-center font-bold text-sm rounded-none">
                                                    !
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 text-sm">{item.name}</p>
                                                    <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                                                        <MapPin size={12} className="text-slate-400" />
                                                        <span>{item.location}</span>
                                                        <span>•</span>
                                                        <span className="text-slate-700 font-medium">{item.category}</span>
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <span className="text-sm font-bold text-red-600">{item.current_stock} in stock</span>
                                                    <p className="text-[11px] text-slate-400">Min: {item.min_stock}</p>
                                                </div>
                                                <button
                                                    onClick={() => navigate('/signin')}
                                                    className="px-3 py-1.5 text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-none transition-colors"
                                                >
                                                    Auto-Restock →
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: INVENTORY & BATCH TRACKER */}
                    {activeTab === 'inventory' && (
                        <div className="space-y-5 max-w-7xl mx-auto">
                            {/* Search & Location Filter Bar */}
                            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                                <div className="relative w-full sm:w-80">
                                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search by drug, category, or batch..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    />
                                </div>
                                <div className="flex items-center gap-3 w-full sm:w-auto">
                                    <select
                                        value={selectedLocation}
                                        onChange={(e) => setSelectedLocation(e.target.value)}
                                        className="w-full sm:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none"
                                    >
                                        <option value="all">All Locations (4 Sites)</option>
                                        {MOCK_LOCATIONS.map(loc => (
                                            <option key={loc.id} value={loc.name}>{loc.name}</option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={() => navigate('/signin')}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors shrink-0 shadow-xs"
                                    >
                                        + Add Item
                                    </button>
                                </div>
                            </div>

                            {/* Inventory Table */}
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                                            <tr>
                                                <th className="py-3.5 px-5">Medicine / Item</th>
                                                <th className="py-3.5 px-5">Batch No.</th>
                                                <th className="py-3.5 px-5">Category</th>
                                                <th className="py-3.5 px-5">Storage Temp</th>
                                                <th className="py-3.5 px-5">Stock Level</th>
                                                <th className="py-3.5 px-5">Expiry Date</th>
                                                <th className="py-3.5 px-5">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-slate-700">
                                            {filteredItems.map(item => (
                                                <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                                                    <td className="py-3.5 px-5 font-bold text-slate-900">{item.name}</td>
                                                    <td className="py-3.5 px-5 font-mono text-xs text-slate-500">{item.batch_number}</td>
                                                    <td className="py-3.5 px-5">{item.category}</td>
                                                    <td className="py-3.5 px-5">
                                                        {item.storage_temp === 'cold_chain' ? (
                                                            <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                                                                ❄️ 2°–8°C Cold Chain
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs text-slate-500">Ambient</span>
                                                        )}
                                                    </td>
                                                    <td className="py-3.5 px-5">
                                                        <span className="font-semibold">{item.current_stock}</span>
                                                        <span className="text-xs text-slate-400 ml-1">{item.unit}</span>
                                                    </td>
                                                    <td className="py-3.5 px-5 text-slate-500">{item.expiry_date}</td>
                                                    <td className="py-3.5 px-5">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                                            item.status === 'HEALTHY'
                                                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                                                : item.status === 'CRITICAL'
                                                                ? 'bg-red-50 text-red-700 border border-red-100'
                                                                : 'bg-amber-50 text-amber-700 border border-amber-100'
                                                        }`}>
                                                            {item.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 3: REQUISITIONS */}
                    {activeTab === 'requisitions' && (
                        <div className="space-y-5 max-w-7xl mx-auto">
                            <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                                <div>
                                    <h3 className="font-bold text-slate-900 text-base">Requisition Approval Workflow</h3>
                                    <p className="text-xs text-slate-500">Staff requests awaiting management authorization</p>
                                </div>
                                <button
                                    onClick={() => navigate('/signin')}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 shadow-xs"
                                >
                                    + New Requisition
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {requisitions.map(req => (
                                    <div key={req.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                                    {req.id}
                                                </span>
                                                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                                                    req.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                                    req.status === 'REJECTED' ? 'bg-red-50 text-red-700 border border-red-100' :
                                                    'bg-amber-50 text-amber-700 border border-amber-100'
                                                }`}>
                                                    {req.status}
                                                </span>
                                            </div>
                                            <h4 className="text-base font-bold text-slate-900">{req.destination}</h4>
                                            <p className="text-xs text-slate-500 mt-1">Requested by: <strong>{req.requested_by}</strong> ({req.role})</p>
                                            <p className="text-xs text-slate-400 mt-0.5">{req.created_at}</p>
                                        </div>

                                        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                            <span className="text-sm font-bold text-slate-900">₹{req.total_cost.toLocaleString()} ({req.items_count} items)</span>
                                            {req.status === 'PENDING' ? (
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleRejectReq(req.id)}
                                                        className="px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                                                    >
                                                        Reject
                                                    </button>
                                                    <button
                                                        onClick={() => handleApproveReq(req.id)}
                                                        className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs"
                                                    >
                                                        Approve
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-slate-400">Processed</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* TAB 4: SMART INVENTORY & SUPPLY CHAIN AI INTELLIGENCE */}
                    {activeTab === 'chat' && (
                        <div className="flex-1 w-full h-full bg-white overflow-hidden">
                            <AIAssistantInterface isPreview={true} />
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
