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
    Clock,
    User,
    AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../services/api';

export default function OnboardingWizard({ isOpen: externalIsOpen, onClose: externalOnClose }) {
    const { user, updateUser } = useAuth();
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [isOpen, setIsOpen] = useState(false);

    // Form states for step 1
    const [fullName, setFullName] = useState('');
    const [pharmacyName, setPharmacyName] = useState('');
    const [primaryCounter, setPrimaryCounter] = useState('Main Market Counter');
    const [planType, setPlanType] = useState('single_pharmacy');
    const [fefoAlertsEnabled, setFefoAlertsEnabled] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (externalIsOpen !== undefined) {
            setIsOpen(externalIsOpen);
            return;
        }

        // Automatic trigger for new users who have not completed onboarding
        if (user) {
            setFullName(user.full_name || '');
            setPharmacyName(user.organization_name || `${user.full_name || user.username}'s Pharmacy & Medical Store`);
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
        setError('');
        if (step === 1) {
            if (!fullName.trim()) {
                setError('Your Full Name is required to personalize your workspace and AI assistant.');
                return;
            }
            if (!pharmacyName.trim()) {
                setError('Pharmacy / Store Name is required.');
                return;
            }

            // Save user full name & organization profile
            try {
                await auth.updateProfile({ full_name: fullName.trim() });
                updateUser({ full_name: fullName.trim() });
            } catch (e) {
                console.warn('Failed to update full name during onboarding:', e);
            }

            if (user.role === 'admin' || user.role === 'super_admin') {
                try {
                    await fetch('/api/admin/organization', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({
                            name: pharmacyName.trim(),
                            settings: {
                                fefo_alerts_enabled: fefoAlertsEnabled,
                                primary_counter_name: primaryCounter.trim() || 'Main Counter',
                                plan_type: planType,
                            },
                        }),
                    });
                } catch (e) {
                    console.warn('Failed to save profile during onboarding step 1:', e);
                }
            }
        }

        if (step < 4) {
            setStep(step + 1);
        } else {
            handleComplete();
        }
    };

    const handleBack = () => {
        setError('');
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

    const userRole = user.role || 'admin';
    const roleTitle = userRole.charAt(0).toUpperCase() + userRole.slice(1);
    const greetingName = fullName.trim() || user.full_name || user.username;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white border border-slate-300 rounded-none shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* ── Modal Header (Sharp Corners) ───────────────────────── */}
                <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-none bg-slate-900 border border-slate-900 flex items-center justify-center text-white font-bold">
                            <Sparkles size={18} />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                                InvIQ Chemist Setup &amp; Onboarding Guide
                            </h2>
                            <p className="text-xs text-slate-500">
                                Step {step} of 4 • Setting up your {roleTitle} workspace
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Step progress indicators */}
                        <div className="flex items-center gap-1.5 mr-2">
                            {[1, 2, 3, 4].map((i) => (
                                <div
                                    key={i}
                                    className={`h-1.5 rounded-none transition-all duration-200 ${
                                        i === step
                                            ? 'w-6 bg-slate-900'
                                            : i < step
                                            ? 'w-2 bg-slate-400'
                                            : 'w-2 bg-slate-200'
                                    }`}
                                />
                            ))}
                        </div>

                        <button
                            onClick={handleClose}
                            className="text-slate-400 hover:text-slate-700 p-1 rounded-none hover:bg-slate-100 transition-colors"
                            aria-label="Close onboarding modal"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* ── Modal Body (Sharp Corners) ─────────────────────────── */}
                <div className="p-6 md:p-8 overflow-y-auto flex-1 space-y-5">
                    
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 rounded-none">
                            <AlertCircle size={15} className="shrink-0 text-red-600" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* STEP 1: Admin Profile & Pharmacy Store Setup */}
                    {step === 1 && (
                        <div className="space-y-5 animate-in fade-in duration-200">
                            <div>
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-none text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-300 mb-2">
                                    👋 Chemist Administrator Profile
                                </span>
                                <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                                    Welcome to InvIQ, {greetingName}!
                                </h3>
                                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                                    Please verify your full name and store details. This personalizes your dashboard and your InvIQ AI Assistant.
                                </p>
                            </div>

                            <div className="bg-slate-50 border border-slate-200 rounded-none p-5 space-y-4">
                                
                                {/* Mandatory Full Name Input */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                                        Your Full Name <span className="text-red-500">* (Mandatory)</span>
                                    </label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                        <input
                                            type="text"
                                            required
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            placeholder="e.g. Rahul Saha"
                                            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-none focus:outline-none focus:border-slate-900 transition-all text-slate-900 font-medium"
                                        />
                                    </div>
                                    <p className="text-[11px] text-slate-400 mt-1">Your personal name displayed in reports, audits, and chat.</p>
                                </div>

                                {/* Pharmacy Name */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                                        Medical Store / Pharmacy Name <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <Building2 className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                        <input
                                            type="text"
                                            required
                                            value={pharmacyName}
                                            onChange={(e) => setPharmacyName(e.target.value)}
                                            placeholder="e.g. Sharma Medicos & Chemist"
                                            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-none focus:outline-none focus:border-slate-900 transition-all text-slate-900"
                                        />
                                    </div>
                                </div>

                                {/* Primary Counter */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                                        Primary Counter / Shop Branch
                                    </label>
                                    <div className="relative">
                                        <Boxes className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                        <input
                                            type="text"
                                            value={primaryCounter}
                                            onChange={(e) => setPrimaryCounter(e.target.value)}
                                            placeholder="e.g. Main Shop Counter"
                                            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-none focus:outline-none focus:border-slate-900 transition-all text-slate-900"
                                        />
                                    </div>
                                </div>

                                {/* Operating Tier */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                                        Operating Tier
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setPlanType('single_pharmacy')}
                                            className={`p-3 rounded-none border text-left transition-all ${
                                                planType === 'single_pharmacy'
                                                    ? 'border-slate-900 bg-white border-l-4 border-l-slate-900 font-semibold'
                                                    : 'border-slate-200 bg-white hover:border-slate-300'
                                            }`}
                                        >
                                            <div className="text-xs font-bold text-slate-900">Single Pharmacy</div>
                                            <div className="text-[11px] text-slate-500 mt-0.5">1 Shop counter (₹999/mo)</div>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setPlanType('multi_pharmacy')}
                                            className={`p-3 rounded-none border text-left transition-all ${
                                                planType === 'multi_pharmacy'
                                                    ? 'border-slate-900 bg-white border-l-4 border-l-slate-900 font-semibold'
                                                    : 'border-slate-200 bg-white hover:border-slate-300'
                                            }`}
                                        >
                                            <div className="text-xs font-bold text-slate-900">Multiple Pharmacy Chain</div>
                                            <div className="text-[11px] text-slate-500 mt-0.5">2+ Branches central sync (₹2,499/mo)</div>
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                                    <div>
                                        <p className="text-xs font-semibold text-slate-800">FEFO Expiry &amp; Low-Stock Alerts</p>
                                        <p className="text-xs text-slate-500">Receive alerts for 30/60-day expiring batches and shortage warnings</p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={fefoAlertsEnabled}
                                        onChange={(e) => setFefoAlertsEnabled(e.target.checked)}
                                        className="h-4 w-4 rounded-none border-slate-300 text-slate-900 focus:ring-0"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: Core Capabilities Tour */}
                    {step === 2 && (
                        <div className="space-y-5 animate-in fade-in duration-200">
                            <div>
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-none text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-300 mb-2">
                                    ⚡ Core Capabilities
                                </span>
                                <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                                    Explore InvIQ's Chemist OS Engine
                                </h3>
                                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                                    Built specifically for retail medical stores, local pharmacy chains, and medicine distributors.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="p-4 rounded-none border border-slate-200 bg-white hover:border-slate-400 transition-colors">
                                    <div className="w-8 h-8 rounded-none bg-slate-100 flex items-center justify-center text-slate-900 mb-2.5 border border-slate-200">
                                        <Clock size={16} />
                                    </div>
                                    <h4 className="text-sm font-bold text-slate-900">Zero Expiry Loss (FEFO)</h4>
                                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                        Automatic 30/60/90-day expiry queue to return near-expiry medicines to distributors for credit before loss.
                                    </p>
                                </div>

                                <div className="p-4 rounded-none border border-slate-200 bg-white hover:border-slate-400 transition-colors">
                                    <div className="w-8 h-8 rounded-none bg-slate-100 flex items-center justify-center text-slate-900 mb-2.5 border border-slate-200">
                                        <ThermometerSnowflake size={16} />
                                    </div>
                                    <h4 className="text-sm font-bold text-slate-900">Cold-Chain Fridge Compliance</h4>
                                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                        Live 2°C–8°C temperature tracking for Insulins, Vaccines, and biological injections with breach alerts.
                                    </p>
                                </div>

                                <div className="p-4 rounded-none border border-slate-200 bg-white hover:border-slate-400 transition-colors">
                                    <div className="w-8 h-8 rounded-none bg-slate-100 flex items-center justify-center text-slate-900 mb-2.5 border border-slate-200">
                                        <Bot size={16} />
                                    </div>
                                    <h4 className="text-sm font-bold text-slate-900">Personalized AI Copilot</h4>
                                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                        Ask queries in plain English to look up stock, batches, and reorder levels in real time.
                                    </p>
                                </div>

                                <div className="p-4 rounded-none border border-slate-200 bg-white hover:border-slate-400 transition-colors">
                                    <div className="w-8 h-8 rounded-none bg-slate-100 flex items-center justify-center text-slate-900 mb-2.5 border border-slate-200">
                                        <Truck size={16} />
                                    </div>
                                    <h4 className="text-sm font-bold text-slate-900">Distributor Portal &amp; POs</h4>
                                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                        Connect pharmaceutical distributors and ingest delivery manifests automatically into your inventory.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: Recommended First Actions */}
                    {step === 3 && (
                        <div className="space-y-5 animate-in fade-in duration-200">
                            <div>
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-none text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-300 mb-2">
                                    🚀 Tailored for {roleTitle}
                                </span>
                                <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                                    Recommended First Actions
                                </h3>
                                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                                    Choose an action below to kickstart your daily chemist workflow:
                                </p>
                            </div>

                            <div className="space-y-2.5">
                                <div
                                    onClick={() => handleComplete('/admin/stock-acquisition')}
                                    className="p-3.5 rounded-none border border-slate-300 hover:border-slate-900 bg-slate-50 hover:bg-slate-100 cursor-pointer flex items-center justify-between transition-all"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-none bg-slate-900 text-white flex items-center justify-center">
                                            <UploadCloud size={16} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                                <span>Guided First Medicine Catalog Import</span>
                                                <span className="px-1.5 py-0.2 bg-slate-200 text-slate-800 text-[10px] rounded-none font-bold">Recommended</span>
                                            </p>
                                            <p className="text-xs text-slate-500">Import your existing stock CSV/Excel with auto-mapping &amp; validation preview.</p>
                                        </div>
                                    </div>
                                    <ArrowRight size={16} className="text-slate-900 shrink-0" />
                                </div>

                                <div
                                    onClick={() => handleComplete('/admin/organization')}
                                    className="p-3.5 rounded-none border border-slate-200 hover:border-slate-400 bg-white hover:bg-slate-50 cursor-pointer flex items-center justify-between transition-all"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-none bg-slate-100 text-slate-800 border border-slate-200 flex items-center justify-center">
                                            <Building2 size={16} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-900">Configure Pharmacy Branches &amp; Licenses</p>
                                            <p className="text-xs text-slate-500">Set Drug License numbers (DL), GSTIN, and retail counter locations.</p>
                                        </div>
                                    </div>
                                    <ArrowRight size={16} className="text-slate-400" />
                                </div>

                                <div
                                    onClick={() => handleComplete('/admin/inventory')}
                                    className="p-3.5 rounded-none border border-slate-200 hover:border-slate-400 bg-white hover:bg-slate-50 cursor-pointer flex items-center justify-between transition-all"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-none bg-slate-100 text-slate-800 border border-slate-200 flex items-center justify-center">
                                            <Boxes size={16} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-900">Inspect Medicine Catalog &amp; Stocks</p>
                                            <p className="text-xs text-slate-500">Review medicines, batch numbers, MRPs, and FEFO expiry queues.</p>
                                        </div>
                                    </div>
                                    <ArrowRight size={16} className="text-slate-400" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 4: Ready to Launch */}
                    {step === 4 && (
                        <div className="space-y-5 text-center animate-in fade-in duration-200 py-4">
                            <div className="w-14 h-14 bg-slate-900 text-white rounded-none flex items-center justify-center mx-auto border border-slate-900 shadow-xs">
                                <CheckCircle2 size={28} />
                            </div>

                            <div>
                                <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                                    Your Chemist OS is Ready!
                                </h3>
                                <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mt-2">
                                    Welcome, <strong>{greetingName}</strong>. Your pharmacy profile is configured for <strong>{pharmacyName}</strong>.
                                </p>
                            </div>

                            <div className="bg-slate-50 border border-slate-200 rounded-none p-4 max-w-md mx-auto text-left text-xs text-slate-700 space-y-2">
                                <div className="flex items-center gap-2">
                                    <Check size={14} className="text-slate-900 shrink-0 font-bold" />
                                    <span>Administrator: <strong>{greetingName}</strong></span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Check size={14} className="text-slate-900 shrink-0 font-bold" />
                                    <span>Pharmacy Name: <strong>{pharmacyName}</strong></span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Check size={14} className="text-slate-900 shrink-0 font-bold" />
                                    <span>Primary Counter: <strong>{primaryCounter}</strong></span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Check size={14} className="text-slate-900 shrink-0 font-bold" />
                                    <span>Plan: <strong>{planType === 'single_pharmacy' ? 'Single Pharmacy' : 'Multiple Pharmacy Chain'}</strong></span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Modal Footer (Sharp Corners) ───────────────────────── */}
                <div className="p-4 md:p-5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                    <div>
                        {step > 1 ? (
                            <button
                                onClick={handleBack}
                                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-none hover:bg-slate-100 transition-colors"
                            >
                                <ArrowLeft size={14} />
                                <span>Back</span>
                            </button>
                        ) : (
                            <button
                                onClick={handleClose}
                                className="text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
                            >
                                Skip Tour
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {step < 4 ? (
                            <button
                                onClick={handleNext}
                                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-slate-900 rounded-none hover:bg-black transition-all shadow-xs"
                            >
                                <span>Continue</span>
                                <ArrowRight size={14} />
                            </button>
                        ) : (
                            <button
                                onClick={() => handleComplete('/admin/dashboard')}
                                className="inline-flex items-center gap-1.5 px-6 py-2.5 text-xs font-bold text-white bg-slate-900 rounded-none hover:bg-black transition-all shadow-md"
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
