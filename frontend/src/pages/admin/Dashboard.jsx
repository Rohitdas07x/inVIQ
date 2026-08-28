import React, { useEffect, useState } from 'react';
import { analytics, inventory } from '../../services/api';
import AlertsDropdown from '../../components/layout/AlertsDropdown';
import {
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';
import {
    Activity, AlertTriangle, CheckCircle, Package,
    ArrowUpRight, ArrowDownRight, Filter, RotateCcw, Building2, Tag
} from 'lucide-react';


const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
const STATUS_COLORS = {
    HEALTHY: '#22c55e',
    WARNING: '#f59e0b',
    CRITICAL: '#ef4444'
};
const LOCATION_COLORS = [
    '#3B82F6', // Blue
    '#6366F1', // Indigo
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#F97316', // Orange
    '#10B981', // Emerald
    '#06B6D4', // Cyan
    '#14B8A6', // Teal
    '#F59E0B', // Amber
];

import { Skeleton } from '../../components/ui/skeleton';

export const DashboardSkeleton = () => {
    return (
        <div className="flex flex-col min-h-full">
            {/* Top Bar Skeleton */}
            <div className="sticky top-0 z-30 bg-white border-b border-slate-200 px-6 py-3.5 shadow-2xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <Skeleton className="h-7 w-48 rounded-none" />
                    <div className="flex items-center gap-2.5 flex-wrap">
                        <Skeleton className="h-8 w-40 rounded-none" />
                        <Skeleton className="h-8 w-36 rounded-none" />
                        <div className="pl-1 border-l border-slate-200">
                            <Skeleton className="h-8 w-8 rounded-none" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Page Content Skeleton Container */}
            <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6 flex-1">
                {/* 4 KPI Matrix Skeleton */}
                <div className="bg-white border border-slate-200 rounded-none grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 shadow-none">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="p-6 flex flex-col justify-between space-y-4">
                            <div className="space-y-2">
                                <Skeleton className="h-3 w-36 rounded-none" />
                                <Skeleton className="h-8 w-24 rounded-none mt-2" />
                            </div>
                            <Skeleton className="h-3.5 w-28 rounded-none mt-2" />
                        </div>
                    ))}
                </div>

                {/* Connected Charts Grid Matrix Skeleton */}
                <div className="bg-white border border-slate-200 rounded-none grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 shadow-none">
                    {/* Left Chart Skeleton (Donut / Pie Chart) */}
                    <div className="p-6 space-y-4">
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                                <Skeleton className="h-5 w-48 rounded-none" />
                                <Skeleton className="h-4 w-20 rounded-none" />
                            </div>
                            <Skeleton className="h-3 w-72 rounded-none" />
                        </div>
                        <div className="h-64 flex flex-col items-center justify-center space-y-4 pt-2">
                            <div className="relative flex items-center justify-center">
                                <Skeleton className="w-40 h-40 rounded-full" />
                                <div className="absolute w-24 h-24 bg-white rounded-full" />
                            </div>
                            <div className="flex items-center gap-4 pt-2">
                                <Skeleton className="h-3 w-16 rounded-none" />
                                <Skeleton className="h-3 w-16 rounded-none" />
                                <Skeleton className="h-3 w-16 rounded-none" />
                            </div>
                        </div>
                    </div>

                    {/* Right Chart Skeleton (Horizontal Bar Chart) */}
                    <div className="p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                    <Skeleton className="h-5 w-52 rounded-none" />
                                    <Skeleton className="h-4 w-24 rounded-none" />
                                </div>
                                <Skeleton className="h-3 w-64 rounded-none" />
                            </div>
                            <Skeleton className="h-4 w-16 rounded-none" />
                        </div>
                        <div className="h-64 flex flex-col justify-around pt-3 pr-2">
                            {[90, 75, 60, 45, 30].map((widthPct, idx) => (
                                <div key={idx} className="flex items-center gap-3">
                                    <Skeleton className="h-3 w-28 rounded-none shrink-0" />
                                    <Skeleton 
                                        className="h-5 rounded-none" 
                                        style={{ width: `${widthPct}%` }} 
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Top Critical Shortages Skeleton */}
                <div className="bg-white border border-slate-200 rounded-none shadow-none p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1.5">
                            <Skeleton className="h-5 w-44 rounded-none" />
                            <Skeleton className="h-3 w-56 rounded-none" />
                        </div>
                        <Skeleton className="h-5 w-20 rounded-none" />
                    </div>
                    <div className="divide-y divide-slate-100">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="py-3.5 flex items-center justify-between">
                                <div className="space-y-1.5">
                                    <Skeleton className="h-4 w-48 rounded-none" />
                                    <Skeleton className="h-3 w-36 rounded-none" />
                                </div>
                                <div className="space-y-1.5 flex flex-col items-end">
                                    <Skeleton className="h-4 w-16 rounded-none" />
                                    <Skeleton className="h-2.5 w-12 rounded-none" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const Dashboard = () => {
    const [stats, setStats] = useState(null);
    const [locations, setLocations] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedLocation, setSelectedLocation] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch available locations & category options on mount
    useEffect(() => {
        const fetchFilters = async () => {
            try {
                const [locRes, itemRes] = await Promise.all([
                    inventory.getLocations(),
                    inventory.getItems(),
                ]);
                if (locRes.data && locRes.data.data) {
                    setLocations(locRes.data.data);
                }
                if (itemRes.data && itemRes.data.data) {
                    const uniqueCats = Array.from(
                        new Set(itemRes.data.data.map((i) => i.category).filter(Boolean))
                    ).sort();
                    setCategories(uniqueCats);
                }
            } catch (err) {
                console.error("Failed to load filter options", err);
            }
        };
        fetchFilters();
    }, []);

    // Fetch dashboard stats whenever active filter changes
    useEffect(() => {
        const fetchStats = async () => {
            try {
                setLoading(true);
                const params = {};
                if (selectedLocation) params.location_id = selectedLocation;
                if (selectedCategory) params.category = selectedCategory;

                const response = await analytics.getStats(params);
                if (response.data && (response.data.success || response.data.data)) {
                    setStats(response.data.data || response.data);
                } else {
                    setError(response.data?.error?.message || response.data?.error || "Failed to load stats");
                }
            } catch (err) {
                setError("Network error. Is the backend running?");
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [selectedLocation, selectedCategory]);

    const handleResetFilters = () => {
        setSelectedLocation('');
        setSelectedCategory('');
    };

    const hasActiveFilters = Boolean(selectedLocation || selectedCategory);

    if (loading && !stats) {
        return <DashboardSkeleton />;
    }
    if (error && !stats) {
        return (
            <div className="p-8 max-w-7xl mx-auto w-full">
                <div className="p-6 bg-red-50 border border-red-200 text-red-700 rounded-none space-y-3">
                    <p className="font-semibold text-sm">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors rounded-none"
                    >
                        Retry Loading
                    </button>
                </div>
            </div>
        );
    }
    if (!stats) return <DashboardSkeleton />;

    const category_distribution = stats.category_distribution || [];
    const low_stock_items = stats.low_stock_items || [];
    const location_stock = stats.location_stock || [];
    const status_distribution = stats.status_distribution || [];

    // Calculate totals for cards
    const totalItems = category_distribution.reduce((acc, curr) => acc + (curr.value || 0), 0);
    const criticalItems = status_distribution.find(i => i.name === 'CRITICAL')?.value || 0;
    const warningItems = status_distribution.find(i => i.name === 'WARNING')?.value || 0;

    return (
        <div className="flex flex-col min-h-full">
            {/* Full-Width Top Navbar — Seamlessly Joined to Left Sidebar & Top Edge */}
            <div className="sticky top-0 z-30 bg-white border-b border-slate-200 px-6 py-3.5 shadow-2xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Dashboard Overview</h2>
                    </div>

                    <div className="flex items-center gap-2.5 flex-wrap">
                        {/* Facility / Store Filter */}
                        <div className="relative flex items-center">
                            <Building2 size={14} className="absolute left-3 text-slate-400 pointer-events-none" />
                            <select
                                value={selectedLocation}
                                onChange={(e) => setSelectedLocation(e.target.value)}
                                className="text-xs font-medium bg-slate-50 border border-slate-300 text-slate-800 rounded-none pl-8 pr-7 py-2 hover:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 cursor-pointer"
                            >
                                <option value="">All Facilities ({locations.length || 'Global'})</option>
                                {locations.map((loc) => (
                                    <option key={loc.id} value={loc.id}>
                                        {loc.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Category Filter */}
                        <div className="relative flex items-center">
                            <Tag size={14} className="absolute left-3 text-slate-400 pointer-events-none" />
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="text-xs font-medium bg-slate-50 border border-slate-300 text-slate-800 rounded-none pl-8 pr-7 py-2 hover:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 cursor-pointer"
                            >
                                <option value="">All Categories ({categories.length || 'All'})</option>
                                {categories.map((cat) => (
                                    <option key={cat} value={cat}>
                                        {cat}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Reset Button */}
                        {hasActiveFilters && (
                            <button
                                onClick={handleResetFilters}
                                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-none transition-colors"
                                title="Reset all filters"
                            >
                                <RotateCcw size={12} />
                                <span>Reset</span>
                            </button>
                        )}

                        {/* Notification Alerts Bell Dropdown */}
                        <div className="pl-1 border-l border-slate-200">
                            <AlertsDropdown />
                        </div>
                    </div>
                </div>
            </div>

            {/* Page Content Container with Standard Spacious Layout */}
            <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6 flex-1">
                {/* 4 KPI Matrix with Sharp Connected Edge Points */}
                <div className="bg-white border border-slate-200 rounded-none grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 shadow-none">

                <div className="p-6 flex flex-col justify-between">
                    <div>
                        <p className="text-xs font-semibold text-slate-500 tracking-wider">Active Pharmaceutical SKUs</p>
                        <h3 className="text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">{totalItems}</h3>
                    </div>
                    <div className="mt-4 flex items-center text-xs font-medium text-slate-400">
                        <span>No data yet</span>
                    </div>
                </div>

                <div className="p-6 flex flex-col justify-between">
                    <div>
                        <p className="text-xs font-semibold text-slate-500 tracking-wider">Total Inventory Valuation</p>
                        <h3 className="text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">₹0</h3>
                    </div>
                    <div className="mt-4 flex items-center text-xs font-medium text-slate-400">
                        <span>No inventory added</span>
                    </div>
                </div>

                <div className="p-6 flex flex-col justify-between">
                    <div>
                        <p className="text-xs font-semibold text-slate-500 tracking-wider">Stock Fulfillment Rate</p>
                        <h3 className="text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">
                            {totalItems > 0 ? (((totalItems - criticalItems) / totalItems) * 100).toFixed(1) + '%' : '—'}
                        </h3>
                    </div>
                    <div className="mt-4 flex items-center text-slate-400 text-xs font-medium">
                        <span>Add stock to track</span>
                    </div>
                </div>

                <div className="p-6 flex flex-col justify-between">
                    <div>
                        <p className="text-xs font-semibold text-slate-500 tracking-wider">Critical Stock Alerts</p>
                        <h3 className="text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">{criticalItems} Critical</h3>
                    </div>
                    <div className="mt-4 flex items-center text-xs font-medium text-amber-600">
                        <span>⚠️ {warningItems} Near Minimum</span>
                    </div>
                </div>
            </div>

            {/* Connected Charts Grid Matrix */}
            <div className="bg-white border border-slate-200 rounded-none grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 shadow-none">
                {/* Status Distribution */}
                <div className="p-6">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-bold text-slate-900">Inventory Health Breakdown</h3>
                        {totalItems > 0 && (
                            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 border border-emerald-200 rounded-none flex items-center gap-0.5">
                                <ArrowUpRight size={12} /> {totalItems > 0 ? (((totalItems - criticalItems) / totalItems) * 100).toFixed(1) : 0}% Healthy
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-slate-500 mb-6">Real-time batch stock status across warehouse locations.</p>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={status_distribution}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={3}
                                    dataKey="value"
                                >
                                    {status_distribution.map((entry, index) => {
                                        const colorMap = {
                                            HEALTHY: '#22c55e',
                                            WARNING: '#f59e0b',
                                            CRITICAL: '#ef4444',
                                        };
                                        return (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={entry.color || colorMap[entry.name] || '#22c55e'}
                                            />
                                        );
                                    })}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Category Distribution with Adaptive Scroll */}
                <div className="p-6">
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-slate-900">Therapeutic Category Volume</h3>
                            <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 border border-blue-200 rounded-none flex items-center gap-0.5">
                                {category_distribution.length} Categories
                            </span>
                        </div>
                        <span className="text-xs font-bold text-slate-900">
                            {totalItems} Units
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 mb-4">Current units in stock by therapeutic medicine category.</p>
                    <div className="max-h-[300px] overflow-y-auto pr-2">
                        <div style={{ height: Math.max(260, category_distribution.length * 34) }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={category_distribution}
                                    layout="vertical"
                                    margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                                    <XAxis type="number" tick={{ fontSize: 11 }} />
                                    <YAxis
                                        dataKey="name"
                                        type="category"
                                        width={140}
                                        interval={0}
                                        tick={{ fontSize: 11 }}
                                    />
                                    <Tooltip />
                                    <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>

            {/* Top Critical Shortages — Full Width */}
            <div className="bg-white border border-slate-200 rounded-none shadow-none">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-base font-bold text-slate-900">Top Critical Shortages</h3>
                            <p className="text-xs text-slate-500">Items requiring immediate reorder.</p>
                        </div>
                        <span className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-none">
                            {low_stock_items.length} Critical
                        </span>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {low_stock_items.length === 0 ? (
                            <p className="text-slate-400 text-sm text-center py-10">No critical shortages found.</p>
                        ) : (
                            low_stock_items.slice(0, 8).map((item, index) => (
                                <div key={index} className="py-3 flex items-center justify-between">
                                    <div>
                                        <p className="font-semibold text-slate-900 text-sm">{item.name}</p>
                                        <p className="text-xs text-slate-400">
                                            {item.location || 'Central Warehouse'}{item.category ? ` • ${item.category}` : ''}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-red-600">
                                            {item.days_remaining != null ? `${item.days_remaining}d left` : `${item.stock || item.current_stock || 0} left`}
                                        </p>
                                        <p className="text-[11px] text-slate-400">Min: {item.min_stock ?? '—'}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
        </div>
    );
};

export default Dashboard;


