import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Sidebar from './Sidebar';

const AdminLayout = () => {
    const { user, isAuthenticated } = useAuth();

    // Isolated Staff Portal: Staff cannot access admin management console
    if (isAuthenticated && user?.role === 'staff') {
        return <Navigate to="/staff" replace />;
    }

    return (
        <div
            className="flex bg-[#F8FAFC] min-h-screen font-sans text-slate-900 overflow-hidden"
            data-layout="admin"
        >
            <Sidebar />
            <main className="flex-1 overflow-y-auto h-screen flex flex-col">
                <Outlet />
            </main>
        </div>
    );
};

export default AdminLayout;
