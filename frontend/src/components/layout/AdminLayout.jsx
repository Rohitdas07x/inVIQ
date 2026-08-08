import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import AlertsDropdown from './AlertsDropdown';
import { useGuest } from '../../context/GuestContext';
import { LogIn, UserPlus } from 'lucide-react';

const AdminLayout = () => {
    const { isGuest } = useGuest();
    const navigate = useNavigate();

    return (
        <div
            className="flex bg-background min-h-screen font-sans text-slate-900 overflow-hidden"
            data-layout="admin"
        >
            <Sidebar />
            <main className="flex-1 p-6 md:p-8 overflow-y-auto h-screen">
                <div className="max-w-7xl mx-auto space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {isGuest && (
                                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                                    ● Live Demo Mode
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            <AlertsDropdown />
                            {isGuest && (
                                <>
                                    <button
                                        onClick={() => navigate('/signin')}
                                        className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-xs"
                                    >
                                        <LogIn size={14} />
                                        <span>Sign In</span>
                                    </button>
                                    <button
                                        onClick={() => navigate('/signup')}
                                        className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-xs"
                                    >
                                        <UserPlus size={14} />
                                        <span>Sign Up</span>
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;
