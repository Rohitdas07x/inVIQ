import React, { useState, useEffect } from 'react';
import { inventory } from '../../services/api';
import { Search, Filter, AlertCircle, CheckCircle, AlertTriangle, Building2 } from 'lucide-react';
import AlertsDropdown from '../../components/layout/AlertsDropdown';

const Inventory = () => {
    const [locations, setLocations] = useState([]);
    const [selectedLocation, setSelectedLocation] = useState('');
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchLocations = async () => {
            try {
                const response = await inventory.getLocations();
                if (response.data.success) {
                    setLocations(response.data.data);
                    if (response.data.data.length > 0) {
                        setSelectedLocation(response.data.data[0].id);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch locations", err);
            }
        };
        fetchLocations();
    }, []);

    useEffect(() => {
        if (!selectedLocation) return;

        const fetchItems = async () => {
            setLoading(true);
            try {
                const response = await inventory.getLocationItems(selectedLocation);
                if (response.data.success) {
                    setItems(response.data.data);
                }
            } catch (err) {
                console.error("Failed to fetch items", err);
            } finally {
                setLoading(false);
            }
        };

        fetchItems();
    }, [selectedLocation]);

    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusBadge = (status) => {
        switch (status) {
            case 'HEALTHY':
                return (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-none text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle size={12} className="mr-1" /> Healthy
                    </span>
                );
            case 'WARNING':
                return (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-none text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        <AlertTriangle size={12} className="mr-1" /> Low Stock
                    </span>
                );
            case 'CRITICAL':
                return (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-none text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                        <AlertCircle size={12} className="mr-1" /> Critical
                    </span>
                );
            default:
                return null;
        }
    };

    return (
        <div className="flex flex-col min-h-full">
            {/* Full-Width Top Navbar — Seamlessly Joined to Left Sidebar & Top Edge */}
            <div className="sticky top-0 z-30 bg-white border-b border-slate-200 px-6 py-3.5 shadow-2xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Inventory Management</h2>
                    </div>

                    <div className="flex items-center gap-2.5 flex-wrap">
                        {/* Facility / Location Selector */}
                        <div className="relative flex items-center">
                            <Building2 size={14} className="absolute left-3 text-slate-400 pointer-events-none" />
                            <select
                                className="text-xs font-medium bg-slate-50 border border-slate-300 text-slate-800 rounded-none pl-8 pr-7 py-2 hover:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 cursor-pointer"
                                value={selectedLocation}
                                onChange={(e) => setSelectedLocation(e.target.value)}
                            >
                                {locations.map(loc => (
                                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Notification Alerts Bell Dropdown */}
                        <div className="pl-1 border-l border-slate-200">
                            <AlertsDropdown />
                        </div>
                    </div>
                </div>
            </div>

            {/* Page Content Container */}
            <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6 flex-1">
                <div className="bg-white border border-slate-200 rounded-none overflow-hidden shadow-none">

                <div className="p-4 border-b border-slate-100 flex items-center space-x-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search items..."
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-200">
                        <Filter size={20} />
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-600 font-medium text-sm">
                            <tr>
                                <th className="px-6 py-4">Item Name</th>
                                <th className="px-6 py-4">Category</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-right">Current Stock</th>
                                <th className="px-6 py-4 text-right">Min Required</th>
                                <th className="px-6 py-4">Unit</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan="6" className="text-center py-8 text-slate-400">Loading inventory...</td></tr>
                            ) : filteredItems.length === 0 ? (
                                <tr><td colSpan="6" className="text-center py-8 text-slate-400">No items found matching your filter.</td></tr>
                            ) : (
                                filteredItems.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-slate-800">{item.name}</td>
                                        <td className="px-6 py-4 text-slate-500">{item.category}</td>
                                        <td className="px-6 py-4 text-center">{getStatusBadge(item.status)}</td>
                                        <td className="px-6 py-4 text-right font-medium text-slate-700">{item.current_stock}</td>
                                        <td className="px-6 py-4 text-right text-slate-500">{item.min_stock}</td>
                                        <td className="px-6 py-4 text-slate-400 text-sm">{item.unit}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            </div>
        </div>
    );
};

export default Inventory;

