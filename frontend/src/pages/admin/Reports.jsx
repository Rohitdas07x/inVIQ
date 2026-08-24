import React, { useState, useEffect } from 'react';
import { admin, inventory } from '../../services/api';
import {
    Download,
    FileText,
    MapPin,
    Calendar,
    TrendingUp,
    Receipt,
    Tag,
    DollarSign,
    Percent,
    ArrowUpRight,
    Loader2
} from 'lucide-react';
import AlertsDropdown from '../../components/layout/AlertsDropdown';

const LOCATION_TYPE_LABELS = {
    central_warehouse: '🏭 Warehouse',
    retail_pharmacy:   '💊 Retail Pharmacy',
    hospital_client:   '🏥 Hospital',
};

const Reports = () => {
    const [loading, setLoading]       = useState(false);
    const [reportType, setReportType] = useState('inventory');
    const [locationId, setLocationId] = useState('');
    const [dateFrom, setDateFrom]     = useState('');
    const [dateTo, setDateTo]         = useState('');
    const [locations, setLocations]   = useState([]);
    const [locLoading, setLocLoading] = useState(true);

    // Monthly Sales preview state
    const currentMonthKey = new Date().toISOString().slice(0, 7); // "YYYY-MM"
    const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);
    const [monthlyData, setMonthlyData] = useState(null);
    const [monthlyLoading, setMonthlyLoading] = useState(false);

    // ── Fetch real locations from the database ────────────────────────────────
    useEffect(() => {
        const fetchLocations = async () => {
            try {
                const res = await inventory.getLocations();
                const data = res.data?.data ?? res.data ?? [];
                setLocations(Array.isArray(data) ? data : (data.items ?? []));
            } catch (err) {
                console.error('Failed to load locations', err);
            } finally {
                setLocLoading(false);
            }
        };
        fetchLocations();
    }, []);

    // ── Fetch live monthly sales summary when monthly_sales is selected or month changes ──
    useEffect(() => {
        if (reportType !== 'monthly_sales' || !selectedMonth) return;

        const fetchMonthly = async () => {
            setMonthlyLoading(true);
            try {
                const [year, month] = selectedMonth.split('-');
                const res = await admin.getMonthlySalesReport(parseInt(year, 10), parseInt(month, 10));
                if (res.data?.success && res.data?.data) {
                    setMonthlyData(res.data.data);
                }
            } catch (err) {
                console.error('Failed to load monthly sales preview', err);
            } finally {
                setMonthlyLoading(false);
            }
        };
        fetchMonthly();
    }, [reportType, selectedMonth]);

    const handleDownload = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (reportType === 'monthly_sales') {
                if (selectedMonth) {
                    params.append('date_from', `${selectedMonth}-01`);
                }
            } else {
                if (locationId) params.append('location_id', locationId);
                if (dateFrom)   params.append('date_from', dateFrom);
                if (dateTo)     params.append('date_to', dateTo);
            }

            // Backend streams the PDF directly as a blob — don't parse as JSON
            const response = await admin.generateReport(reportType, params.toString());

            // Create a temporary object URL and trigger browser download
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url  = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href     = url;
            link.download = `inviq_${reportType}_report_${new Date().toISOString().slice(0,10)}.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Report generation failed', err);
            alert('Failed to generate report. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const reportTypes = [
        { value: 'inventory',     label: 'Inventory Report',          desc: 'Current stock levels across all locations' },
        { value: 'monthly_sales', label: 'Monthly Sales & Profit',    desc: 'Gross revenue, discounts given, COGS & profit margin' },
        { value: 'transactions',  label: 'Transaction Report',        desc: 'All stock movements and transactions' },
        { value: 'requisitions',  label: 'Requisition Report',        desc: 'All requisitions and approvals' },
        { value: 'low_stock',     label: 'Low Stock Report',          desc: 'Items below minimum threshold' },
    ];

    // Group locations by type for the optgroup dropdown
    const grouped = locations.reduce((acc, loc) => {
        const key = loc.location_type || loc.type || 'other';
        if (!acc[key]) acc[key] = [];
        acc[key].push(loc);
        return acc;
    }, {});

    const fmtCurrency = (n) => `₹${parseFloat(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return (
        <div className="flex flex-col min-h-full">
            {/* Full-Width Top Navbar */}
            <div className="sticky top-0 z-30 bg-white border-b border-slate-200 px-6 py-3.5 shadow-2xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Reports & Analytics</h2>
                    </div>

                    <div className="flex items-center gap-2.5 flex-wrap">
                        <div className="pl-1 border-l border-slate-200">
                            <AlertsDropdown />
                        </div>
                    </div>
                </div>
            </div>

            {/* Page Content Container */}
            <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6 flex-1">
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-6">
                    <div>
                        <h3 className="text-base font-bold text-slate-900">Generate Report</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Select a report type and time period to analyze metrics or export PDF</p>
                    </div>

                    <div className="space-y-5">
                        {/* Report Type Grid */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">Report Type</label>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {reportTypes.map(type => (
                                    <button
                                        key={type.value}
                                        onClick={() => setReportType(type.value)}
                                        className={`p-4 rounded-xl border text-left transition-all ${
                                            reportType === type.value
                                                ? 'border-violet-500 bg-violet-50/70 text-violet-950 shadow-sm shadow-violet-100 ring-1 ring-violet-400/30'
                                                : 'border-slate-200 hover:border-slate-300 bg-white'
                                        }`}
                                    >
                                        <div className="font-bold text-sm text-slate-900 flex items-center justify-between">
                                            {type.label}
                                            {reportType === type.value && <ArrowUpRight size={15} className="text-violet-600" />}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1">{type.desc}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Filters Section */}
                        {reportType === 'monthly_sales' ? (
                            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-4">
                                <div className="max-w-xs">
                                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5">
                                        <Calendar size={13} className="text-violet-600" /> Select Calendar Month
                                    </label>
                                    <input
                                        type="month"
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 text-sm bg-white text-slate-900 font-medium"
                                        value={selectedMonth}
                                        onChange={(e) => setSelectedMonth(e.target.value)}
                                    />
                                </div>

                                {/* Live Summary Cards for Monthly Sales */}
                                {monthlyLoading ? (
                                    <div className="flex items-center gap-2 py-6 text-slate-400 text-xs justify-center">
                                        <Loader2 size={16} className="animate-spin text-violet-600" /> Loading monthly financial aggregate...
                                    </div>
                                ) : monthlyData ? (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                                        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80">
                                            <p className="text-[11px] font-semibold text-slate-500">Gross Sales (MRP)</p>
                                            <p className="text-lg font-black text-slate-900 mt-0.5">{fmtCurrency(monthlyData.gross_total)}</p>
                                            <p className="text-[10px] text-slate-400 mt-0.5">{monthlyData.session_count} bill(s) closed</p>
                                        </div>
                                        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80">
                                            <p className="text-[11px] font-semibold text-emerald-700">Discounts Given</p>
                                            <p className="text-lg font-black text-emerald-600 mt-0.5">−{fmtCurrency(monthlyData.discount_amount)}</p>
                                            <p className="text-[10px] text-slate-400 mt-0.5">Auto-applied policy</p>
                                        </div>
                                        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80">
                                            <p className="text-[11px] font-semibold text-violet-700">Net Revenue</p>
                                            <p className="text-lg font-black text-violet-700 mt-0.5">{fmtCurrency(monthlyData.net_total)}</p>
                                            <p className="text-[10px] text-slate-400 mt-0.5">Customer payments</p>
                                        </div>
                                        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80">
                                            <p className="text-[11px] font-semibold text-slate-500">Gross Profit (Margin)</p>
                                            <p className="text-lg font-black text-slate-900 mt-0.5">{fmtCurrency(monthlyData.gross_profit)}</p>
                                            <p className="text-[10px] font-bold text-emerald-600 mt-0.5">{monthlyData.margin_pct}% margin</p>
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 border border-slate-200/80 rounded-xl">
                                {/* Location dropdown */}
                                <div>
                                    <label className="flex items-center gap-1 text-xs font-semibold text-slate-700 mb-1.5">
                                        <MapPin size={13} className="text-violet-600" /> Location (optional)
                                    </label>
                                    <select
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 text-sm bg-white text-slate-900"
                                        value={locationId}
                                        onChange={(e) => setLocationId(e.target.value)}
                                        disabled={locLoading}
                                    >
                                        <option value="">
                                            {locLoading ? 'Loading locations…' : 'All Locations'}
                                        </option>

                                        {Object.entries(grouped).map(([type, locs]) => (
                                            <optgroup
                                                key={type}
                                                label={LOCATION_TYPE_LABELS[type] ?? type}
                                            >
                                                {locs.map(loc => (
                                                    <option key={loc.id} value={loc.id}>
                                                        {loc.name}
                                                    </option>
                                                ))}
                                            </optgroup>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="flex items-center gap-1 text-xs font-semibold text-slate-700 mb-1.5">
                                        <Calendar size={13} className="text-violet-600" /> From Date
                                    </label>
                                    <input
                                        type="date"
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 text-sm bg-white text-slate-900"
                                        value={dateFrom}
                                        onChange={(e) => setDateFrom(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="flex items-center gap-1 text-xs font-semibold text-slate-700 mb-1.5">
                                        <Calendar size={13} className="text-violet-600" /> To Date
                                    </label>
                                    <input
                                        type="date"
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 text-sm bg-white text-slate-900"
                                        value={dateTo}
                                        onChange={(e) => setDateTo(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}

                        <button
                            onClick={handleDownload}
                            disabled={loading}
                            className="flex items-center gap-2 px-6 py-3 bg-violet-600 text-white font-bold text-sm rounded-xl hover:bg-violet-700 transition shadow-md shadow-violet-500/20 disabled:opacity-50"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    <span>Generating PDF…</span>
                                </>
                            ) : (
                                <>
                                    <Download size={16} />
                                    <span>Generate &amp; Download PDF Report</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-6">
                    <h3 className="text-base font-bold text-slate-900 mb-2">Report Delivery &amp; Archiving</h3>
                    <p className="text-slate-500 text-xs leading-relaxed">
                        All compiled PDF audit reports are cryptographically timestamped and archived to Azure Blob Storage for compliance.
                        Monthly reports aggregate closed billing sessions in real time via the Redis high-speed cache.
                    </p>
                </div>
            </div>
        </div>
    );
};
export default Reports;