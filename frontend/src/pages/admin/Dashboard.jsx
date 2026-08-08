import React, { useEffect, useState } from 'react';
import { analytics } from '../../services/api';
import {
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';
import { Activity, AlertTriangle, CheckCircle, Package } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
const STATUS_COLORS = {
    HEALTHY: '#22c55e',
    WARNING: '#f59e0b',
    CRITICAL: '#ef4444'
};

const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${color}`}>
            <Icon size={20} />
        </div>
        <div className="text-sm font-medium text-slate-500 mb-1">{title}</div>
        <div className="text-2xl font-bold text-slate-900">{value}</div>
    </div>
);

const Dashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await analytics.getStats();
                if (response.data.success) {
                    setStats(response.data.data);
                } else {
                    setError(response.data.error || "Failed to load stats");
                }
            } catch (err) {
                setError("Network error. Is the backend running?");
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) return <div className="flex h-full items-center justify-center text-slate-400">Loading analytics...</div>;
    if (error) return <div className="p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>;
    if (!stats) return null;

    const { category_distribution, low_stock_items, location_stock, status_distribution } = stats;

    // Calculate totals for cards
    const totalItems = category_distribution.reduce((acc, curr) => acc + curr.value, 0);
    const criticalItems = status_distribution.find(i => i.name === 'CRITICAL')?.value || 0;
    const warningItems = status_distribution.find(i => i.name === 'WARNING')?.value || 0;

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard Overview</h2>

            {/* 4 KPI Matrix with Sharp Connected Edge Points */}
            <div className="bg-white border border-slate-200 rounded-none grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 shadow-none">
                <div className="p-6 flex flex-col justify-between">
                    <div>
                        <p className="text-xs font-semibold text-slate-500 tracking-wider">Active users</p>
                        <h3 className="text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">847</h3>
                    </div>
                    <div className="mt-4 flex items-center text-xs font-medium text-emerald-600">
                        <ArrowUpRight size={14} className="mr-0.5" /> 3.1% <span className="text-slate-400 ml-1">vs last week</span>
                    </div>
                </div>

                <div className="p-6 flex flex-col justify-between">
                    <div>
                        <p className="text-xs font-semibold text-slate-500 tracking-wider">Revenue</p>
                        <h3 className="text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">$18,290</h3>
                    </div>
                    <div className="mt-4 flex items-center text-xs font-medium text-emerald-600">
                        <ArrowUpRight size={14} className="mr-0.5" /> 12.4% <span className="text-slate-400 ml-1">vs last week</span>
                    </div>
                </div>

                <div className="p-6 flex flex-col justify-between">
                    <div>
                        <p className="text-xs font-semibold text-slate-500 tracking-wider">Conversion Rate</p>
                        <h3 className="text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">3.28%</h3>
                    </div>
                    <div className="mt-4 flex items-center text-xs font-medium text-red-500">
                        <ArrowDownRight size={14} className="mr-0.5" /> 0.4% <span className="text-slate-400 ml-1">vs last week</span>
                    </div>
                </div>

                <div className="p-6 flex flex-col justify-between">
                    <div>
                        <p className="text-xs font-semibold text-slate-500 tracking-wider">New signups</p>
                        <h3 className="text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">142</h3>
                    </div>
                    <div className="mt-4 flex items-center text-xs font-medium text-emerald-600">
                        <ArrowUpRight size={14} className="mr-0.5" /> 8.7% <span className="text-slate-400 ml-1">vs last week</span>
                    </div>
                </div>
            </div>

            {/* Connected Charts Grid Matrix */}
            <div className="bg-white border border-slate-200 rounded-none grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 shadow-none">
                {/* Status Distribution */}
                <div className="p-6">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-bold text-slate-900">Net revenue</h3>
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 border border-emerald-200 rounded-none flex items-center gap-0.5">
                            <ArrowUpRight size={12} /> 66.9%
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 mb-6">Daily net sales, last 7 days.</p>
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
                                    {status_distribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Category Distribution */}
                <div className="p-6">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-bold text-slate-900">Channel sales</h3>
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 border border-emerald-200 rounded-none flex items-center gap-0.5">
                            <ArrowUpRight size={12} /> 58.3%
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 mb-6">Daily sales count by channel, last 7 days.</p>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={category_distribution}
                                layout="vertical"
                                margin={{ top: 0, right: 16, left: 5, bottom: 0 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                                <XAxis type="number" tick={{ fontSize: 12 }} />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    width={145}
                                    interval={0}
                                    tick={{ fontSize: 12 }}
                                />
                                <Tooltip />
                                <Bar dataKey="value" fill="#0f172a" radius={[0, 0, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Location Stock Levels & Top Critical Items */}
            <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 bg-white border border-slate-200 rounded-none shadow-none">
                {/* Location Stock Levels */}
                <div className="p-6">
                    <h3 className="text-base font-bold text-slate-900 mb-1">Stock Volume by Location</h3>
                    <p className="text-xs text-slate-500 mb-6">Warehouse and facility distribution.</p>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={location_stock}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip />
                                <Bar dataKey="value" fill="#334155" radius={[0, 0, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Critical Items */}
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
                    <div className="divide-y divide-slate-200">
                        {low_stock_items.length === 0 ? (
                            <p className="text-slate-400 text-sm text-center py-8">No critical shortages found.</p>
                        ) : (
                            low_stock_items.slice(0, 4).map((item, index) => (
                                <div key={index} className="py-3 flex items-center justify-between">
                                    <div>
                                        <p className="font-semibold text-slate-900 text-sm">{item.name}</p>
                                        <p className="text-xs text-slate-400">{item.location} • {item.category}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-red-600">
                                            {item.days_remaining != null ? `${item.days_remaining}d left` : `${item.stock || item.current_stock} left`}
                                        </p>
                                        <p className="text-[11px] text-slate-400">Min: {item.min_stock}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
