import React, { useState, useEffect } from 'react';
import {
    Sparkles,
    CheckCircle2,
    ArrowRight,
    ArrowLeft,
    Building2,
    Bot,
    Boxes,
    FileText,
    TrendingUp,
    Shield,
    Users,
    UploadCloud,
    Check,
    X,
    ThermometerSnowflake,
    Truck,
    Clock
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function OnboardingWizard({ isOpen: externalIsOpen, onClose: externalOnClose }) {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [isOpen, setIsOpen] = useState(false);

    // Form states for step 1
    const [pharmacyName, setPharmacyName] = useState(user?.organization_name || 'Apollo Chemist & Pharmacy');
    const [primaryCounter, setPrimaryCounter] = useState('Main Market Counter');
    const [planType, setPlanType] = useState('single_pharmacy');
    const [fefoAlertsEnabled, setFefoAlertsEnabled] = useState(true);

    useEffect(() => {
        if (externalIsOpen !== undefined) {
            setIsOpen(externalIsOpen);
            return;
        }

        // Automatic trigger for new users who have not completed onboarding
        if (user) {
            if (user.organization_name) {
                setPharmacyName(user.organization_name);
            }
            const hasCompleted = localStorage.getItem(`inviq_onboarding_completed_${user.id || user.username}`);
            if (!hasCompleted) {
                setIsOpen(true);
            }
        }
    }, [user, externalIsOpen]);

    if (!isOpen || !user) {
        return null;
    }

    const handleClose = () => {
        setIsOpen(false);
        localStorage.setItem(`inviq_onboarding_completed_${user.id || user.username}`, 'true');
        if (externalOnClose) externalOnClose();
    };

    const handleNext = async () => {
        if (step === 1 && (user.role === 'admin' || user.role === 'super_admin')) {
            try {
                await fetch('/api/admin/organization', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        name: pharmacyName,
                        settings: {
                            fefo_alerts_enabled: fefoAlertsEnabled,
                            primary_counter_name: primaryCounter,
                            plan_type: planType,
                        },
                    }),
                });
            } catch (e) {
                console.warn('Failed to save profile during onboarding step 1:', e);
            }
        }

        if (step < 4) {
            setStep(step + 1);
        } else {
            handleComplete();
        }
    };


    const handleBack = () => {
        if (step > 1) {
            setStep(step - 1);
        }
    };

    const handleComplete = (targetRoute) => {
        handleClose();
        if (targetRoute) {
            navigate(targetRoute);
        }
    };

    const userRole = user.role || 'staff';
    const roleTitle = userRole.charAt(0).toUpperCase() + userRole.slice(1);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
                {/* ── Modal Header ────────────────────────────────────────── */}
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold">
                            <Sparkles size={20} />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-900">
                                InvIQ Chemist Onboarding Guide
                            </h2>
                            <p className="text-xs text-slate-500">
                                Step {step} of 4 • Setting up your {roleTitle} workspace
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Step progress pills */}
                        <div className="flex items-center gap-1.5 mr-2">
                            {[1, 2, 3, 4].map((i) => (
                                <div
                                    key={i}
                                    className={`h-1.5 rounded-full transition-all duration-300 ${
                                        i === step
                                            ? 'w-6 bg-blue-600'
                                            : i < step
                                            ? 'w-2 bg-blue-300'
                                            : 'w-2 bg-slate-200'
                                    }`}
                                />
                            ))}
                        </div>

                        <button
                            onClick={handleClose}
                            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                            aria-label="Close onboarding modal"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* ── Modal Body ──────────────────────────────────────────── */}
                <div className="p-6 md:p-8 overflow-y-auto flex-1 space-y-6">
                    {/* STEP 1: Welcome & Pharmacy Store Setup */}
                    {step === 1 && (
                        <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div>
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100 mb-2">
                                    👋 Welcome Chemist Owner
                                </span>
                                <h3 className="text-xl font-bold text-slate-900">
                                    Welcome to InvIQ, {user.full_name || user.username}!
                                </h3>
                                <p className="text-sm text-slate-600 mt-1">
                                    Configure your pharmacy store profile and primary counter for zero expiry loss and real-time inventory tracking.
                                </p>
                            </div>

                            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                                        Medical Store / Pharmacy Name
                                    </label>
                                    <div className="relative">
                                        <Building2 className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                        <input
                                            type="text"
                                            value={pharmacyName}
                                            onChange={(e) => setPharmacyName(e.target.value)}
                                            placeholder="e.g. Sharma Medicos & Chemist"
                                            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                                        Primary Counter / Shop Branch
                                    </label>
                                    <div className="relative">
                                        <Boxes className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                        <input
                                            type="text"
                                            value={primaryCounter}
                                            onChange={(e) => setPrimaryCounter(e.target.value)}
                                            placeholder="e.g. Main Shop Counter (500m geofence)"
                                            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                                        Operating Tier
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setPlanType('single_pharmacy')}
                                            className={`p-3 rounded-xl border text-left transition-all ${
                                                planType === 'single_pharmacy'
                                                    ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/10'
                                                    : 'border-slate-200 bg-white hover:border-slate-300'
                                            }`}
                                        >
                                            <div className="text-xs font-bold text-slate-900">Single Pharmacy</div>
                                            <div className="text-[11px] text-slate-500 mt-0.5">1 Shop counter (₹999/mo)</div>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setPlanType('multi_pharmacy')}
                                            className={`p-3 rounded-xl border text-left transition-all ${
                                                planType === 'multi_pharmacy'
                                                    ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/10'
                                                    : 'border-slate-200 bg-white hover:border-slate-300'
                                            }`}
                                        >
                                            <div className="text-xs font-bold text-slate-900">Multiple Pharmacy Chain</div>
                                            <div className="text-[11px] text-slate-500 mt-0.5">2+ Branches central sync (₹2,499/mo)</div>
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                                    <div>
                                        <p className="text-xs font-semibold text-slate-800">FEFO Expiry & Low-Stock Alerts</p>
                                        <p className="text-xs text-slate-500">Receive instant alerts for 30/60-day expiring batches and shortage warnings</p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={fefoAlertsEnabled}
                                        onChange={(e) => setFefoAlertsEnabled(e.target.checked)}
                                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: Intelligent Features Tour */}
                    {step === 2 && (
                        <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div>
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 mb-2">
                                    ⚡ Core Capabilities
                                </span>
                                <h3 className="text-xl font-bold text-slate-900">
                                    Explore InvIQ's Chemist OS Engine
                                </h3>
                                <p className="text-sm text-slate-600 mt-1">
                                    Built specifically for retail medical stores, local pharmacy chains, and medicine distributors.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors">
                                    <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-600 mb-2.5">
                                        <Clock size={18} />
                                    </div>
                                    <h4 className="text-sm font-bold text-slate-900">Zero Expiry Loss (FEFO)</h4>
                                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                        Automatic 30/60/90-day expiry queue to return near-expiry medicines to distributors for credit before loss.
                                    </p>
                                </div>

                                <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors">
                                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 mb-2.5">
                                        <ThermometerSnowflake size={18} />
                                    </div>
                                    <h4 className="text-sm font-bold text-slate-900">Cold-Chain Fridge Compliance</h4>
                                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                        Live 2°C–8°C temperature tracking for Insulins, Vaccines, and biological injections with breach alerts.
                                    </p>
                                </div>

                                <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 mb-2.5">
                                        <Bot size={18} />
                                    </div>
                                    <h4 className="text-sm font-bold text-slate-900">AI Assistant & Voice RAG</h4>
                                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                        Ask queries in plain English or speak naturally in Hindi/English to look up stock, batches, and MRP in seconds.
                                    </p>
                                </div>

                                <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 mb-2.5">
                                        <Truck size={18} />
                                    </div>
                                    <h4 className="text-sm font-bold text-slate-900">Distributor Portal & POs</h4>
                                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                        Connect pharmaceutical distributors and ingest delivery manifests automatically into your inventory.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: Role-Specific Fast Actions */}
                    {step === 3 && (
                        <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div>
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-100 mb-2">
                                    🚀 Tailored for {roleTitle}
                                </span>
                                <h3 className="text-xl font-bold text-slate-900">
                                    Recommended First Actions
                                </h3>
                                <p className="text-sm text-slate-600 mt-1">
                                    Choose an action below to kickstart your daily chemist workflow:
                                </p>
                            </div>

                            <div className="space-y-2.5">
                                {(userRole === 'admin' || userRole === 'super_admin') && (
                                    <>
                                        <div
                                            onClick={() => handleComplete('/admin/stock-acquisition')}
                                            className="p-3.5 rounded-xl border border-blue-200 hover:border-blue-500 bg-blue-50/40 hover:bg-blue-50/80 cursor-pointer flex items-center justify-between transition-all"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
                                                    <UploadCloud size={16} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                                        <span>Guided First Medicine Catalog Import</span>
                                                        <span className="px-1.5 py-0.2 bg-blue-100 text-blue-700 text-[10px] rounded-md font-bold">Recommended</span>
                                                    </p>
                                                    <p className="text-xs text-slate-600">Import your existing stock CSV/Excel with auto-mapping & instant validation preview.</p>
                                                </div>
                                            </div>
                                            <ArrowRight size={16} className="text-blue-600 shrink-0" />
                                        </div>

                                        <div
                                            onClick={() => handleComplete('/admin/organization')}
                                            className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-400 bg-white hover:bg-blue-50/30 cursor-pointer flex items-center justify-between transition-all"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-indigo-100/60 text-indigo-700 flex items-center justify-center">
                                                    <Building2 size={16} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-900">Configure Pharmacy Branches & Licenses</p>
                                                    <p className="text-xs text-slate-500">Set Drug License numbers (DL), GSTIN, and retail counter geofences.</p>
                                                </div>
                                            </div>
                                            <ArrowRight size={16} className="text-slate-400" />
                                        </div>

                                        <div
                                            onClick={() => handleComplete('/admin/inventory')}
                                            className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-400 bg-white hover:bg-blue-50/30 cursor-pointer flex items-center justify-between transition-all"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-emerald-100/60 text-emerald-700 flex items-center justify-center">
                                                    <Boxes size={16} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-900">Inspect Medicine Catalog & Stocks</p>
                                                    <p className="text-xs text-slate-500">Review 25+ real medicines, batch numbers, MRPs, and FEFO expiry queues.</p>
                                                </div>
                                            </div>
                                            <ArrowRight size={16} className="text-slate-400" />
                                        </div>

                                        <div
                                            onClick={() => handleComplete('/admin/users')}
                                            className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-400 bg-white hover:bg-blue-50/30 cursor-pointer flex items-center justify-between transition-all"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-purple-100/60 text-purple-700 flex items-center justify-center">
                                                    <Users size={16} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-900">Invite Counter Pharmacists & Staff</p>
                                                    <p className="text-xs text-slate-500">Assign staff accounts scoped to specific pharmacy branches with radius checks.</p>
                                                </div>
                                            </div>
                                            <ArrowRight size={16} className="text-slate-400" />
                                        </div>
                                    </>
                                )}

                                {userRole === 'staff' && (
                                    <>
                                        <div
                                            onClick={() => handleComplete('/staff')}
                                            className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-400 bg-white hover:bg-blue-50/30 cursor-pointer flex items-center justify-between transition-all"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-blue-100/60 text-blue-700 flex items-center justify-center">
                                                    <FileText size={16} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-900">Create a New Medicine Requisition</p>
                                                    <p className="text-xs text-slate-500">Submit requests for fast-moving tablets, syrups, or cold-chain vials.</p>
                                                </div>
                                            </div>
                                            <ArrowRight size={16} className="text-slate-400" />
                                        </div>

                                        <div
                                            onClick={() => handleComplete('/staff/chat')}
                                            className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-400 bg-white hover:bg-blue-50/30 cursor-pointer flex items-center justify-between transition-all"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-indigo-100/60 text-indigo-700 flex items-center justify-center">
                                                    <Bot size={16} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-900">Ask the Pharmacy AI Assistant</p>
                                                    <p className="text-xs text-slate-500">Check medicine locations, batches, and expiry dates in seconds.</p>
                                                </div>
                                            </div>
                                            <ArrowRight size={16} className="text-slate-400" />
                                        </div>
                                    </>
                                )}

                                {userRole === 'vendor' && (
                                    <div
                                        onClick={() => handleComplete('/vendor')}
                                        className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-400 bg-white hover:bg-blue-50/30 cursor-pointer flex items-center justify-between transition-all"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-emerald-100/60 text-emerald-700 flex items-center justify-center">
                                                <UploadCloud size={16} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-slate-900">Upload Delivery Manifest (Excel)</p>
                                                <p className="text-xs text-slate-500">Upload your batch delivery spreadsheet to auto-generate invoices.</p>
                                            </div>
                                        </div>
                                        <ArrowRight size={16} className="text-slate-400" />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* STEP 4: Ready to Launch */}
                    {step === 4 && (
                        <div className="space-y-5 text-center animate-in fade-in slide-in-from-right-4 duration-300 py-4">
                            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200 shadow-xs">
                                <CheckCircle2 size={32} />
                            </div>

                            <div>
                                <h3 className="text-2xl font-bold text-slate-900">
                                    Your Chemist OS is Ready!
                                </h3>
                                <p className="text-sm text-slate-600 max-w-md mx-auto mt-2">
                                    Your pharmacy profile is configured. You now have full access to InvIQ's intelligent medicine inventory engine.
                                </p>
                            </div>

                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 max-w-md mx-auto text-left text-xs text-slate-600 space-y-2">
                                <div className="flex items-center gap-2">
                                    <Check size={14} className="text-emerald-600 shrink-0" />
                                    <span>Pharmacy Name: <strong>{pharmacyName}</strong></span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Check size={14} className="text-emerald-600 shrink-0" />
                                    <span>Primary Counter: <strong>{primaryCounter}</strong></span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Check size={14} className="text-emerald-600 shrink-0" />
                                    <span>Plan: <strong>{planType === 'single_pharmacy' ? 'Single Pharmacy (1 Shop)' : 'Multiple Pharmacy Chain (2+ Shops)'}</strong></span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Check size={14} className="text-emerald-600 shrink-0" />
                                    <span>Role Permissions: <strong>{roleTitle} Access Level</strong></span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Modal Footer ────────────────────────────────────────── */}
                <div className="p-4 md:p-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <div>
                        {step > 1 ? (
                            <button
                                onClick={handleBack}
                                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                            >
                                <ArrowLeft size={14} />
                                <span>Back</span>
                            </button>
                        ) : (
                            <button
                                onClick={handleClose}
                                className="text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
                            >
                                Skip Tour
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {step < 4 ? (
                            <button
                                onClick={handleNext}
                                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all shadow-xs"
                            >
                                <span>Continue</span>
                                <ArrowRight size={14} />
                            </button>
                        ) : (
                            <button
                                onClick={() => handleComplete('/dashboard')}
                                className="inline-flex items-center gap-1.5 px-6 py-2.5 text-xs font-bold text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-all shadow-md"
                            >
                                <span>Open Chemist Dashboard</span>
                                <ArrowRight size={14} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
