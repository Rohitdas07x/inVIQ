import React, { useState, useRef, useEffect } from 'react';
import {
    ScanBarcode,
    ShoppingCart,
    CheckCircle2,
    AlertCircle,
    Trash2,
    XCircle,
    Receipt,
    Tag,
    Loader2,
    RotateCcw,
    MapPin,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function BillingCounter() {
    const { user } = useAuth();

    // Session state
    const [sessionId, setSessionId] = useState(null);
    const [status, setStatus] = useState('idle'); // idle | open | closed | cancelled
    const [items, setItems] = useState([]);
    const [billingPreview, setBillingPreview] = useState(null);
    const [closedSession, setClosedSession] = useState(null);

    // Location
    const [locations, setLocations] = useState([]);
    const [locationId, setLocationId] = useState('');

    // Scan
    const [barcode, setBarcode] = useState('');
    const [qty, setQty] = useState(1);
    const [scanning, setScanning] = useState(false);
    const barcodeRef = useRef(null);

    // Loading / errors
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    // Auto-focus barcode field when session is open
    useEffect(() => {
        if (status === 'open' && barcodeRef.current) {
            barcodeRef.current.focus();
        }
    }, [status]);

    // Fetch locations on mount
    useEffect(() => {
        fetch('/api/inventory/locations', { credentials: 'include' })
            .then(r => r.json())
            .then(j => {
                if (j.success) setLocations(j.data || []);
            })
            .catch(() => {});
    }, []);

    const clearMessages = () => { setError(null); setSuccess(null); };

    // ── Open Session ─────────────────────────────────────────────────────────
    const handleOpen = async () => {
        if (!locationId) { setError('Select a counter / location first.'); return; }
        clearMessages();
        setLoading(true);
        try {
            const res = await fetch('/api/billing/sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ location_id: parseInt(locationId) }),
            });
            const json = await res.json();
            if (res.ok && json.success) {
                setSessionId(json.data.session_id);
                setItems([]);
                setBillingPreview(null);
                setClosedSession(null);
                setStatus('open');
                setTimeout(() => barcodeRef.current?.focus(), 100);
            } else {
                setError(json.detail || json.message || 'Failed to open session');
            }
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    // ── Scan ─────────────────────────────────────────────────────────────────
    const handleScan = async (e) => {
        if (e) e.preventDefault();
        if (!barcode.trim()) return;
        clearMessages();
        setScanning(true);
        try {
            const res = await fetch(`/api/billing/sessions/${sessionId}/scan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    barcode: barcode.trim(),
                    quantity: qty,
                    location_id: parseInt(locationId),
                    unit: scanUnit.trim() || undefined,
                }),
            });
            const json = await res.json();
            if (res.ok && json.success) {
                setItems(json.data.items || []);
                setBillingPreview(json.data.billing_preview);
                setBarcode('');
                setQty(1);
                setScanUnit('');
                if (barcodeRef.current) barcodeRef.current.focus();
            } else {
                setError(json.detail || json.message || 'Scan failed');
            }
        } catch (e) {
            setError(e.message);
        } finally {
            setScanning(false);
        }
    };

    // ── Checkout ─────────────────────────────────────────────────────────────
    const handleCheckout = async () => {
        if (!items.length) { setError('No items in cart. Scan at least one medicine.'); return; }
        clearMessages();
        setLoading(true);
        try {
            const res = await fetch(`/api/billing/sessions/${sessionId}/checkout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
            });
            const json = await res.json();
            if (res.ok && json.success) {
                setClosedSession(json.data);
                setStatus('closed');
            } else {
                setError(json.detail || json.message || 'Checkout failed');
            }
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    // ── Cancel ────────────────────────────────────────────────────────────────
    const handleCancel = async () => {
        if (!window.confirm('Cancel this bill? All scanned stock will be restored.')) return;
        clearMessages();
        setLoading(true);
        try {
            const res = await fetch(`/api/billing/sessions/${sessionId}`, {
                method: 'DELETE',
                credentials: 'include',
            });
            const json = await res.json();
            if (res.ok && json.success) {
                setStatus('cancelled');
                setError(null);
                setSuccess('Bill cancelled. Stock has been restored.');
            } else {
                setError(json.detail || json.message || 'Cancel failed');
            }
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    // ── New Bill ──────────────────────────────────────────────────────────────
    const handleNewBill = () => {
        setSessionId(null);
        setStatus('idle');
        setItems([]);
        setBillingPreview(null);
        setClosedSession(null);
        clearMessages();
    };

    // ── Helpers ───────────────────────────────────────────────────────────────
    const fmtCur = (n) => `₹${parseFloat(n || 0).toFixed(2)}`;

    return (
        <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-violet-100 rounded-xl">
                    <ScanBarcode size={22} className="text-violet-700" />
                </div>
                <div>
                    <h1 className="text-xl font-extrabold text-slate-900">Billing Counter</h1>
                    <p className="text-xs text-slate-500">Scan medicines, auto-apply discount, generate bill</p>
                </div>
                {sessionId && (
                    <span className="ml-auto px-3 py-1 rounded-full text-xs font-bold bg-violet-100 text-violet-700 border border-violet-200">
                        Bill #{sessionId}
                    </span>
                )}
            </div>

            {/* Toast messages */}
            {error && (
                <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs animate-in fade-in">
                    <AlertCircle size={13} className="shrink-0 text-rose-500" />
                    <span>{error}</span>
                    <button onClick={clearMessages} className="ml-auto font-semibold">✕</button>
                </div>
            )}
            {success && (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs animate-in fade-in">
                    <CheckCircle2 size={13} className="shrink-0 text-emerald-500" />
                    <span>{success}</span>
                    <button onClick={clearMessages} className="ml-auto font-semibold">✕</button>
                </div>
            )}

            {/* ── IDLE: Setup ─────────────────────────────────────────────── */}
            {status === 'idle' && (
                <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs p-8 space-y-6">
                    <div className="text-center space-y-2">
                        <div className="mx-auto w-16 h-16 bg-violet-50 rounded-2xl flex items-center justify-center">
                            <ShoppingCart size={30} className="text-violet-500" />
                        </div>
                        <h2 className="text-lg font-bold text-slate-900">Start a New Bill</h2>
                        <p className="text-xs text-slate-500">Select a counter, then open the bill to start scanning medicines.</p>
                    </div>

                    <div className="max-w-sm mx-auto space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                <MapPin size={12} className="inline mr-1 text-violet-500" />
                                Counter / Location
                            </label>
                            <select
                                value={locationId}
                                onChange={e => setLocationId(e.target.value)}
                                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-slate-900"
                            >
                                <option value="">— Select location —</option>
                                {locations.map(loc => (
                                    <option key={loc.id} value={loc.id}>{loc.name} ({loc.type})</option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={handleOpen}
                            disabled={loading || !locationId}
                            className="w-full py-3 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-300 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-violet-500/20 flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <ScanBarcode size={16} />}
                            Open Bill
                        </button>
                    </div>
                </div>
            )}

            {/* ── OPEN: Scan + Cart ────────────────────────────────────────── */}
            {status === 'open' && (
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                    {/* Scan panel */}
                    <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl shadow-xs p-6 space-y-5">
                        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <ScanBarcode size={16} className="text-violet-600" /> Scan Medicine
                        </h2>
                        <form onSubmit={handleScan} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Barcode / Item ID</label>
                                <input
                                    ref={barcodeRef}
                                    type="text"
                                    value={barcode}
                                    onChange={e => setBarcode(e.target.value)}
                                    placeholder="Scan strip, box, or item barcode..."
                                    className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-slate-900 font-mono"
                                    autoComplete="off"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Quantity</label>
                                    <input
                                        type="number" min="1" max="9999"
                                        value={qty}
                                        onChange={e => setQty(parseInt(e.target.value) || 1)}
                                        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-slate-900"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Unit (Optional)</label>
                                    <input
                                        type="text"
                                        value={scanUnit}
                                        onChange={e => setScanUnit(e.target.value)}
                                        placeholder="strip, box..."
                                        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-slate-900"
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={scanning || !barcode.trim()}
                                className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-300 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2"
                            >
                                {scanning
                                    ? <Loader2 size={14} className="animate-spin" />
                                    : <ScanBarcode size={14} />
                                }
                                {scanning ? 'Adding...' : 'Add to Bill'}
                            </button>
                        </form>

                        {/* Cancel bill */}
                        <button
                            onClick={handleCancel}
                            disabled={loading}
                            className="w-full py-2 border border-rose-200 text-rose-500 hover:bg-rose-50 font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2"
                        >
                            <XCircle size={13} /> Cancel Bill
                        </button>
                    </div>

                    {/* Cart panel */}
                    <div className="lg:col-span-3 bg-white border border-slate-200/80 rounded-2xl shadow-xs p-6 space-y-4">
                        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <ShoppingCart size={16} className="text-violet-600" />
                            Cart
                            {items.length > 0 && (
                                <span className="ml-auto text-xs text-slate-500">{items.length} item{items.length > 1 ? 's' : ''}</span>
                            )}
                        </h2>

                        {items.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-2">
                                <ShoppingCart size={36} className="opacity-30" />
                                <p className="text-xs">No items yet — scan a medicine</p>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                {items.map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold text-slate-900 truncate">{item.item_name}</p>
                                            <p className="text-[11px] text-slate-500">
                                                {item.qty} {item.packaging_unit || 'unit'}{item.qty > 1 && !item.packaging_unit?.endsWith('s') ? 's' : ''} × {fmtCur(item.mrp)} = <span className="font-bold text-slate-800">{fmtCur(item.line_total)}</span>
                                                {item.multiplier > 1 && (
                                                    <span className="text-[10px] text-slate-400 ml-1.5 font-normal">
                                                        ({item.base_qty_deducted} {item.base_unit || 'tabs'})
                                                    </span>
                                                )}
                                            </p>
                                            {item.batch_number && (
                                                <p className="text-[10px] text-slate-400 font-mono">Batch: {item.batch_number}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Billing preview */}
                        {billingPreview && (
                            <div className="border-t border-slate-100 pt-4 space-y-2">
                                <div className="flex justify-between text-xs text-slate-600">
                                    <span>Gross Total</span>
                                    <span className="font-semibold">{fmtCur(billingPreview.gross_total)}</span>
                                </div>
                                {billingPreview.discount_amount > 0 && (
                                    <div className="flex justify-between text-xs text-emerald-700">
                                        <span className="flex items-center gap-1">
                                            <Tag size={10} /> Discount ({billingPreview.discount_model}, {billingPreview.discount_pct}%)
                                        </span>
                                        <span className="font-semibold">−{fmtCur(billingPreview.discount_amount)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-1 border-t border-slate-100">
                                    <span>Net Payable</span>
                                    <span className="text-violet-700">{fmtCur(billingPreview.net_total)}</span>
                                </div>
                            </div>
                        )}

                        {items.length > 0 && (
                            <button
                                onClick={handleCheckout}
                                disabled={loading}
                                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 size={16} className="animate-spin" /> : <Receipt size={16} />}
                                Checkout & Print Bill
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* ── CLOSED: Receipt ──────────────────────────────────────────── */}
            {status === 'closed' && closedSession && (
                <div className="bg-white border border-emerald-200 rounded-2xl shadow-xs p-8 space-y-6 animate-in fade-in">
                    <div className="text-center space-y-2">
                        <div className="mx-auto w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center">
                            <CheckCircle2 size={28} className="text-emerald-600" />
                        </div>
                        <h2 className="text-lg font-extrabold text-slate-900">Bill Closed Successfully</h2>
                        <p className="text-xs text-slate-500">Bill #{closedSession.session_id} • {closedSession.closed_at?.split('T')[0]}</p>
                    </div>

                    {/* Receipt summary */}
                    <div className="max-w-sm mx-auto bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3 font-mono text-xs">
                        <p className="text-center font-bold text-slate-800 text-sm">RECEIPT</p>
                        <hr className="border-slate-200 border-dashed" />
                        {(closedSession.items || []).map((item, idx) => (
                            <div key={idx} className="flex justify-between text-slate-700">
                                <span className="truncate max-w-[65%]">
                                    {item.item_name} ({item.qty} {item.packaging_unit || 'unit'})
                                </span>
                                <span>{fmtCur(item.line_total)}</span>
                            </div>
                        ))}
                        <hr className="border-slate-200 border-dashed" />
                        <div className="flex justify-between text-slate-600">
                            <span>Gross</span>
                            <span>{fmtCur(closedSession.billing?.gross_total)}</span>
                        </div>
                        {closedSession.billing?.discount_amount > 0 && (
                            <div className="flex justify-between text-emerald-700">
                                <span>Discount ({closedSession.billing?.discount_pct}%)</span>
                                <span>−{fmtCur(closedSession.billing?.discount_amount)}</span>
                            </div>
                        )}
                        <div className="flex justify-between font-extrabold text-slate-900 text-sm pt-1 border-t border-slate-200 border-dashed">
                            <span>NET PAYABLE</span>
                            <span className="text-violet-700">{fmtCur(closedSession.billing?.net_total)}</span>
                        </div>
                    </div>

                    <div className="flex justify-center">
                        <button
                            onClick={handleNewBill}
                            className="py-2.5 px-8 bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-violet-500/20 flex items-center gap-2"
                        >
                            <RotateCcw size={15} /> New Bill
                        </button>
                    </div>
                </div>
            )}

            {/* ── CANCELLED ────────────────────────────────────────────────── */}
            {status === 'cancelled' && (
                <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-10 text-center space-y-4">
                    <XCircle size={40} className="mx-auto text-rose-400" />
                    <p className="text-sm font-bold text-slate-700">Bill #{sessionId} Cancelled</p>
                    <p className="text-xs text-slate-400">All stock has been restored to inventory.</p>
                    <button
                        onClick={handleNewBill}
                        className="py-2.5 px-8 bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm rounded-xl transition-all flex items-center gap-2 mx-auto"
                    >
                        <RotateCcw size={15} /> Start New Bill
                    </button>
                </div>
            )}
        </div>
    );
}
