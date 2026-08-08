/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Sparkles, Search, Download, Plus, ChevronDown, ArrowUpRight, ArrowDownRight, MapPin, Box, Layers, Check, ArrowLeft, ArrowRight, Phone, TrendingUp, Play, HelpCircle, Star, Activity, Zap, Network, LineChart, Lock, Globe, PanelLeftClose, Ship, Truck, CreditCard, Calendar, Clock, LayoutDashboard, BarChart3, Users, Menu, X, AlertTriangle } from 'lucide-react';
import { ShineBorder } from '../components/ui/shine-border';
import { DotPattern } from '../components/ui/dot-pattern';

const LogoIcon = () => (
  <img src="/logo.png" alt="InvIQ Logo" className="w-8 h-8 object-contain" />
);

export default function Landing() {
  const [openFaq, setOpenFaq] = React.useState(0);
  const [currentTestimonial, setCurrentTestimonial] = React.useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 30);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const testimonials = [
    {
      quote: "Our business experienced a significant transformation thanks to this team's digital marketing expertise. They delivered tangible improvements in our online visibility.",
      name: "Amanda Holly",
      role: "Nursing Assistant",
      image: "https://i.pravatar.cc/150?img=47"
    },
    {
      quote: "The inventory management features are unparalleled. We've reduced our stockouts by 80% and improved our overall efficiency across all warehouses.",
      name: "Marcus Chen",
      role: "Operations Director",
      image: "https://i.pravatar.cc/150?img=11"
    },
    {
      quote: "Switching to this platform was the best decision we made this year. The automated restocking alone has saved us countless hours of manual work.",
      name: "Sarah Jenkins",
      role: "E-commerce Manager",
      image: "https://i.pravatar.cc/150?img=32"
    }
  ];

  const nextTestimonial = () => {
    setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const faqs = [
    {
      question: "What is Inviq, and how does it work?",
      answer: "Inviq is an AI-powered inventory management system designed to simplify stock tracking. It uses artificial intelligence to handle tasks like demand forecasting, low stock alerts, and automated reordering. Simply connect your sales channels, and Inviq takes care of the rest."
    },
    {
      question: "Can I use Inviq without prior inventory management experience?",
      answer: "Yes, our platform is designed with an intuitive interface that makes it easy for anyone to start managing inventory like a pro."
    },
    {
      question: "What file formats does Inviq support?",
      answer: "We support CSV, Excel, and direct API integrations with major e-commerce platforms and accounting software."
    },
    {
      question: "How does the AI generation feature work?",
      answer: "Our AI analyzes historical sales data and seasonal trends to generate accurate demand forecasts and automated purchase orders."
    },
    {
      question: "Can I collaborate with my team on Inviq?",
      answer: "Absolutely! You can invite team members, assign specific roles, and control access levels for different parts of your inventory."
    },
    {
      question: "What are the cloud storage limits?",
      answer: "Storage limits vary by plan. Our Starter plan includes 10GB, while Professional and Enterprise plans offer unlimited storage."
    }
  ];

  return (
    <div className="min-h-screen bg-[#FAFAFA] relative overflow-hidden font-sans text-slate-900">
      {/* Background Gradients & Grid */}
      <div className="absolute inset-0 z-0 pointer-events-none flex justify-center">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-indigo-100/40 rounded-full blur-[100px]" />
        <div className="absolute top-[20%] right-[-10%] w-[60vw] h-[60vw] bg-blue-50/40 rounded-full blur-[120px]" />
        
        {/* Grid lines */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:100px_100px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      {/* Sticky Expanding Navbar — Flawless Mobile & Desktop */}
      <header className="fixed top-2 sm:top-3 inset-x-0 z-50 px-3 sm:px-6 pointer-events-none flex justify-center transition-all duration-300">
        <nav className={`pointer-events-auto flex items-center justify-between transition-all duration-300 ease-in-out ${
          isScrolled
            ? 'w-full max-w-6xl px-4 sm:px-8 py-2.5 sm:py-3 bg-white/95 backdrop-blur-xl shadow-xl shadow-slate-900/5 border border-slate-200 rounded-2xl sm:rounded-full'
            : 'w-full max-w-4xl px-4 sm:px-6 py-2 sm:py-2.5 bg-white/85 backdrop-blur-md shadow-sm border border-slate-200/70 rounded-full'
        }`}>
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <LogoIcon />
            <span className="font-bold text-lg sm:text-xl tracking-tight text-slate-900">InvIQ</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            {['features', 'process', 'pricing', 'faq', 'customers'].map((id) => (
              <button 
                key={id}
                onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })} 
                className="hover:text-slate-900 transition-colors capitalize"
              >
                {id === 'faq' ? 'FAQ' : id}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button 
              onClick={() => window.location.href = '/signin'} 
              className="text-slate-600 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              Log In
            </button>
            <button 
              onClick={() => window.location.href = '/signup'} 
              className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold transition-colors shadow-sm shadow-blue-600/20"
            >
              Sign up
            </button>
            <button
              className="md:hidden p-1.5 rounded-full hover:bg-slate-100 text-slate-700 transition-colors pointer-events-auto"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-x-3 top-16 z-50 bg-white/98 backdrop-blur-2xl rounded-3xl border border-slate-200 shadow-2xl p-5 flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <LogoIcon />
              <span className="font-bold text-lg text-slate-900">InvIQ Menu</span>
            </div>
            <button onClick={() => setMobileMenuOpen(false)} className="p-1 rounded-full text-slate-400 hover:bg-slate-100">
              <X className="w-5 h-5" />
            </button>
          </div>
          {['features', 'process', 'pricing', 'faq', 'customers'].map((id) => (
            <button
              key={id}
              onClick={() => { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); setMobileMenuOpen(false); }}
              className="text-left py-2 px-3 rounded-xl text-slate-700 font-medium capitalize hover:bg-slate-50 transition-colors"
            >
              {id === 'faq' ? 'FAQ' : id.charAt(0).toUpperCase() + id.slice(1)}
            </button>
          ))}
          <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
            <button
              onClick={() => window.location.href = '/signin'}
              className="w-full border border-slate-200 text-slate-700 py-2.5 rounded-full text-sm font-semibold hover:bg-slate-50 transition-colors"
            >
              Log In
            </button>
            <button
              onClick={() => window.location.href = '/signup'}
              className="w-full bg-blue-600 text-white py-2.5 rounded-full text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
            >
              Sign up
            </button>
          </div>
        </div>
      )}

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-28 pb-20">

        {/* Hero Section */}
        <div className="text-center max-w-4xl mx-auto mb-10 sm:mb-16 md:mb-20 px-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs sm:text-sm font-medium mb-5 sm:mb-8">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Trusted by 5,000+ teams</span>
          </div>
          <h1 className="text-3xl sm:text-5xl md:text-7xl font-bold tracking-tight text-slate-900 mb-4 md:mb-6 leading-[1.15]">
            Smarter Inventory,<br />Greater Precision
          </h1>
          <p className="text-sm sm:text-base md:text-xl text-slate-500 mb-6 sm:mb-10 max-w-2xl mx-auto leading-relaxed">
            Optimize stock levels, prevent shortages, cut excess inventory, and simplify your inventory management effortlessly.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-xs sm:max-w-none mx-auto">
            <button 
              onClick={() => window.location.href = '/signup'}
              className="w-full sm:w-auto bg-blue-600 text-white px-7 py-3 rounded-full text-sm sm:text-base font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
            >
              Get started
            </button>
            <button 
              onClick={() => window.location.href = '/preview'}
              className="w-full sm:w-auto bg-white text-slate-700 border border-slate-200 px-7 py-3 rounded-full text-sm sm:text-base font-semibold hover:bg-slate-50 transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-slate-600 text-slate-600" />
              Preview Demo
            </button>
          </div>
        </div>

        {/* Dashboard Mockup - Perfectly Fitted SaaS Preview with ShineBorder */}
        <div className="relative mx-auto max-w-6xl mt-4 mb-20">
          {/* Subtle Ambient Glow */}
          <div className="absolute -inset-1.5 bg-gradient-to-r from-blue-500/20 via-indigo-500/20 to-purple-500/20 rounded-3xl blur-2xl opacity-70 -z-10" />
          
          <ShineBorder
            borderRadius={24}
            borderWidth={1.5}
            duration={12}
            color={["#60A5FA", "#38BDF8", "#818CF8", "#A78BFA"]}
            className="w-full p-0 overflow-hidden shadow-2xl shadow-slate-900/10 rounded-2xl md:rounded-3xl border border-slate-200/80"
          >
            <div className="w-full bg-white overflow-hidden">
              {/* macOS / Browser Top Chrome Bar */}
              <div className="h-11 px-4 md:px-6 bg-slate-50/90 border-b border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400/90" />
                <div className="w-3 h-3 rounded-full bg-amber-400/90" />
                <div className="w-3 h-3 rounded-full bg-emerald-400/90" />
              </div>
              <div className="flex items-center gap-2 px-4 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-500 font-mono shadow-xs">
                <Lock className="w-3 h-3 text-emerald-500" />
                <span>inviq.io/admin/dashboard</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Live Demo</span>
              </div>
            </div>

            {/* Dashboard Interface Header */}
            <div className="p-4 md:p-6 lg:p-8 bg-[#FAFAFA] space-y-5">
              {/* Header Info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/70 shadow-xs">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <span>Central Pharmacy & Warehouse Overview</span>
                    <span className="text-xs px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-semibold border border-blue-100">v2.0</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Real-time stock levels, batch expiries, and cold-chain compliance</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-600">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>August 2026</span>
                  </div>
                  <button 
                    onClick={() => window.location.href = '/dashboard'}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-medium transition-colors shadow-xs"
                  >
                    <Play className="w-3 h-3 fill-white" />
                    <span>Launch App</span>
                  </button>
                </div>
              </div>

              {/* 4 KPI Metrics Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                {/* Metric 1 */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-slate-500">Total Inventory</span>
                    <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                      <Box className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <div className="text-xl md:text-2xl font-bold text-slate-900">12,840</div>
                    <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 mt-1">
                      <ArrowUpRight className="w-3 h-3" />
                      <span>+4.2% this month</span>
                    </div>
                  </div>
                </div>

                {/* Metric 2 */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-slate-500">Cold-Chain Vaccines</span>
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                      <Activity className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <div className="text-xl md:text-2xl font-bold text-slate-900">1,840 <span className="text-xs font-normal text-slate-400">vials</span></div>
                    <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 mt-1">
                      <Check className="w-3 h-3" />
                      <span>3.4°C (Safe 2°–8°C)</span>
                    </div>
                  </div>
                </div>

                {/* Metric 3 */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-slate-500">Critical Shortages</span>
                    <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <div className="text-xl md:text-2xl font-bold text-slate-900">12 <span className="text-xs font-normal text-slate-400">items</span></div>
                    <div className="flex items-center gap-1 text-[11px] font-medium text-red-600 mt-1">
                      <span>Restock suggested</span>
                    </div>
                  </div>
                </div>

                {/* Metric 4 */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-slate-500">Requisitions</span>
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                      <Truck className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <div className="text-xl md:text-2xl font-bold text-slate-900">28 Active</div>
                    <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 mt-1">
                      <span>96% on-time fulfillment</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Middle Section: Chart & Category Distribution */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4">
                {/* Stock Movement Trends (2 cols) */}
                <div className="lg:col-span-2 bg-white p-4 md:p-5 rounded-2xl border border-slate-200/70 shadow-xs">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Stock Consumption & Fulfillment</h4>
                      <p className="text-[11px] text-slate-400">Weekly inbound vs outbound pharmaceutical units</p>
                    </div>
                    <div className="flex items-center gap-3 text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm bg-blue-600" />
                        <span className="text-slate-600 font-medium">Inbound</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm bg-indigo-200" />
                        <span className="text-slate-600 font-medium">Outbound</span>
                      </div>
                    </div>
                  </div>

                  {/* Clean SVG Trend Visualization */}
                  <div className="h-36 w-full relative pt-2">
                    <svg className="w-full h-full" viewBox="0 0 400 120" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      {/* Grid Lines */}
                      <line x1="0" y1="30" x2="400" y2="30" stroke="#F1F5F9" strokeDasharray="3 3" />
                      <line x1="0" y1="60" x2="400" y2="60" stroke="#F1F5F9" strokeDasharray="3 3" />
                      <line x1="0" y1="90" x2="400" y2="90" stroke="#F1F5F9" strokeDasharray="3 3" />
                      
                      {/* Area Fill */}
                      <path d="M 0 90 Q 60 40, 120 65 T 240 35 T 340 50 L 400 30 L 400 120 L 0 120 Z" fill="url(#blueGradient)" />
                      {/* Trend Curve */}
                      <path d="M 0 90 Q 60 40, 120 65 T 240 35 T 340 50 L 400 30" fill="none" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" />
                      {/* Outbound Dashed Curve */}
                      <path d="M 0 105 Q 60 75, 120 90 T 240 60 T 340 75 L 400 55" fill="none" stroke="#94A3B8" strokeWidth="2" strokeDasharray="4 4" strokeLinecap="round" />
                      
                      {/* Highlight Data Points */}
                      <circle cx="240" cy="35" r="4" fill="#3B82F6" stroke="#FFFFFF" strokeWidth="2" />
                      <circle cx="400" cy="30" r="4" fill="#3B82F6" stroke="#FFFFFF" strokeWidth="2" />
                    </svg>
                    {/* X-Axis Labels */}
                    <div className="flex justify-between text-[10px] text-slate-400 mt-1 px-1">
                      <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
                    </div>
                  </div>
                </div>

                {/* Categories & Storage Breakdown (1 col) */}
                <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200/70 shadow-xs flex flex-col justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 mb-1">Category Breakdown</h4>
                    <p className="text-[11px] text-slate-400 mb-3">Live allocation across storage types</p>
                    
                    <div className="space-y-2.5 text-xs">
                      <div>
                        <div className="flex justify-between text-slate-600 mb-1">
                          <span className="font-medium">Antibiotics & Oral</span>
                          <span className="text-slate-400 font-mono">42%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: '42%' }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-slate-600 mb-1">
                          <span className="font-medium">Vaccines (Cold-Chain)</span>
                          <span className="text-slate-400 font-mono">24%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: '24%' }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-slate-600 mb-1">
                          <span className="font-medium">Cardiovascular & IV</span>
                          <span className="text-slate-400 font-mono">20%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: '20%' }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-slate-600 mb-1">
                          <span className="font-medium">Analgesics & Pain Relief</span>
                          <span className="text-slate-400 font-mono">14%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500 rounded-full" style={{ width: '14%' }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 mt-2 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Active Locations: <strong>4 Sites</strong></span>
                    <span className="text-blue-600 font-medium cursor-pointer hover:underline">View Map →</span>
                  </div>
                </div>
              </div>

              {/* Bottom Row: Live Stock Table */}
              <div className="bg-white rounded-2xl border border-slate-200/70 shadow-xs overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <span className="text-xs font-bold text-slate-900">Recent Inventory Batches</span>
                  <span className="text-[11px] text-slate-500 font-medium">Showing 4 of 960 records</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-medium text-[11px]">
                        <th className="py-2.5 px-4">Medicine / Item</th>
                        <th className="py-2.5 px-4">Batch No.</th>
                        <th className="py-2.5 px-4">Location</th>
                        <th className="py-2.5 px-4">Stock</th>
                        <th className="py-2.5 px-4">Expiry</th>
                        <th className="py-2.5 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      <tr>
                        <td className="py-2.5 px-4 font-medium text-slate-900">Amoxicillin 500mg</td>
                        <td className="py-2.5 px-4 font-mono text-slate-500 text-[11px]">AMX-2026-08</td>
                        <td className="py-2.5 px-4">Pharmacy Wing A</td>
                        <td className="py-2.5 px-4 font-semibold text-red-600">15 strips</td>
                        <td className="py-2.5 px-4 text-slate-500">Apr 2027</td>
                        <td className="py-2.5 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-700 border border-red-100">
                            Critical
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-4 font-medium text-slate-900">Hepatitis B Vaccine</td>
                        <td className="py-2.5 px-4 font-mono text-slate-500 text-[11px]">HEPB-2026-09</td>
                        <td className="py-2.5 px-4">Cold-Storage Hub</td>
                        <td className="py-2.5 px-4 font-semibold text-slate-900">45 vials</td>
                        <td className="py-2.5 px-4 text-slate-500">Oct 2026</td>
                        <td className="py-2.5 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                            Cold-Chain Safe
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-4 font-medium text-slate-900">Paracetamol IV 100ml</td>
                        <td className="py-2.5 px-4 font-mono text-slate-500 text-[11px]">PCM-2026-02</td>
                        <td className="py-2.5 px-4">Central Warehouse</td>
                        <td className="py-2.5 px-4 font-semibold text-amber-600">22 bottles</td>
                        <td className="py-2.5 px-4 text-slate-500">Jan 2027</td>
                        <td className="py-2.5 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-100">
                            Low Stock
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-4 font-medium text-slate-900">Atorvastatin 20mg</td>
                        <td className="py-2.5 px-4 font-mono text-slate-500 text-[11px]">ATV-2026-05</td>
                        <td className="py-2.5 px-4">Central Warehouse</td>
                        <td className="py-2.5 px-4 font-semibold text-emerald-600">310 strips</td>
                        <td className="py-2.5 px-4 text-slate-500">Nov 2027</td>
                        <td className="py-2.5 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                            Healthy
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        </ShineBorder>
      </div>
        
      {/* Footer Text */}
        <div className="mt-12 text-center text-sm font-medium text-slate-500">
          Companies that trust Inviq to build what's next:
        </div>

        {/* Features Section (Combined Design) */}
        <div id="features" className="py-32 mt-16 border-t border-slate-200/60 relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] opacity-30" />
          
          <div className="text-center max-w-3xl mx-auto mb-20 relative z-10">
            <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-white border border-indigo-100 shadow-[0_2px_10px_rgba(99,102,241,0.08)] text-slate-700 text-sm font-medium mb-6">
              <Star className="w-4 h-4 mr-2 text-[#5B65FF]" />
              Features
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight">
              Smarter Inventory Intelligence
            </h2>
            <p className="text-lg text-slate-500 leading-relaxed max-w-2xl mx-auto">
              Track inventory in real time, predict demand, and automate restocking with AI-driven precision.
            </p>
          </div>

          <div className="max-w-6xl mx-auto relative px-4 sm:px-6 lg:px-8 z-10">
            {/* Connecting Lines (Desktop) */}
            <div className="hidden lg:block absolute top-[25%] bottom-[25%] left-12 w-12 border-l-2 border-t-2 border-b-2 border-indigo-100 rounded-l-3xl z-0" />
            <div className="hidden lg:block absolute top-1/2 left-0 w-12 h-[2px] bg-indigo-100 -translate-y-1/2 z-0" />

            <div className="hidden lg:block absolute top-[25%] bottom-[25%] right-12 w-12 border-r-2 border-t-2 border-b-2 border-indigo-100 rounded-r-3xl z-0" />
            <div className="hidden lg:block absolute top-1/2 right-0 w-12 h-[2px] bg-indigo-100 -translate-y-1/2 z-0" />
            
            {/* Left Icon Node */}
            <div className="hidden lg:flex absolute top-1/2 left-0 w-12 h-12 bg-[#5B65FF] rounded-full items-center justify-center text-white shadow-lg shadow-indigo-200 -translate-y-1/2 -translate-x-1/2 z-20 ring-4 ring-white">
              <Lock className="w-5 h-5" />
            </div>
            
            {/* Right Icon Node */}
            <div className="hidden lg:flex absolute top-1/2 right-0 w-12 h-12 bg-[#5B65FF] rounded-full items-center justify-center text-white shadow-lg shadow-indigo-200 -translate-y-1/2 translate-x-1/2 z-20 ring-4 ring-white">
              <Globe className="w-5 h-5" />
            </div>

            {/* 2x2 Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-10 relative z-10 lg:px-24">
              
              {/* Card 1 */}
              <div className="bg-white/90 backdrop-blur-xl rounded-[2rem] p-8 md:p-10 border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_40px_rgba(99,102,241,0.08)] transition-all group">
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 text-[#5B65FF] group-hover:scale-110 transition-transform">
                  <Activity className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Live Inventory Monitoring</h3>
                <p className="text-slate-500 leading-relaxed">
                  Monitor inventory live across every channel and location instantly.
                </p>
              </div>

              {/* Card 2 */}
              <div className="bg-white/90 backdrop-blur-xl rounded-[2rem] p-8 md:p-10 border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_40px_rgba(99,102,241,0.08)] transition-all group">
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 text-[#5B65FF] group-hover:scale-110 transition-transform">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Smart Auto-Restocking</h3>
                <p className="text-slate-500 leading-relaxed">
                  Automatically detect low stock and trigger instant restocking powered by AI.
                </p>
              </div>

              {/* Card 3 */}
              <div className="bg-white/90 backdrop-blur-xl rounded-[2rem] p-8 md:p-10 border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_40px_rgba(99,102,241,0.08)] transition-all group">
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 text-[#5B65FF] group-hover:scale-110 transition-transform">
                  <Network className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Unified Channel Sync</h3>
                <p className="text-slate-500 leading-relaxed">
                  Connect and sync inventory across online stores, POS systems, and warehouses effortlessly.
                </p>
              </div>

              {/* Card 4 */}
              <div className="bg-white/90 backdrop-blur-xl rounded-[2rem] p-8 md:p-10 border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_40px_rgba(99,102,241,0.08)] transition-all group">
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 text-[#5B65FF] group-hover:scale-110 transition-transform">
                  <LineChart className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Predictive Forecasting</h3>
                <p className="text-slate-500 leading-relaxed">
                  Anticipate demand with AI powered forecasting and advanced analytics.
                </p>
              </div>

            </div>
          </div>
        </div>

        {/* Process Section */}
        <div id="process" className="py-32 border-t border-slate-200/60 relative">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-white border border-indigo-100 shadow-[0_2px_10px_rgba(99,102,241,0.08)] text-slate-700 text-sm font-medium mb-6">
              <TrendingUp className="w-4 h-4 mr-2 text-[#5B65FF]" />
              Process
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight">
              Get Started in 3 Simple Steps
            </h2>
            <p className="text-lg text-slate-500 leading-relaxed max-w-2xl mx-auto">
              Sign up in minutes and start automating your entire inventory workflow fast.
            </p>
          </div>

          <div className="max-w-5xl mx-auto relative px-4">
            {/* Connecting Line */}
            <div className="hidden md:block absolute top-6 left-[16.66%] right-[16.66%] h-px bg-indigo-200 z-0" />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
              {/* Step 1 */}
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-[#5B65FF] text-white rounded-xl flex items-center justify-center text-xl font-bold mb-8 shadow-md">
                  1
                </div>
                <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.04)] w-full h-full">
                  <h3 className="text-lg font-bold text-slate-900 mb-3">Create Account</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    Create your account and instantly access your smart inventory dashboard.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-[#5B65FF] text-white rounded-xl flex items-center justify-center text-xl font-bold mb-8 shadow-md">
                  2
                </div>
                <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.04)] w-full h-full">
                  <h3 className="text-lg font-bold text-slate-900 mb-3">Sync Your Inventory</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    Add items, sync stock, and connect your existing systems in one place.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-[#5B65FF] text-white rounded-xl flex items-center justify-center text-xl font-bold mb-8 shadow-md">
                  3
                </div>
                <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.04)] w-full h-full">
                  <h3 className="text-lg font-bold text-slate-900 mb-3">Launch Your Operations</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    Track orders, manage shipments, and streamline deliveries effortlessly.
                  </p>
                </div>
              </div>
            </div>

            {/* Blank YouTube Video Section */}
            <div className="mt-24 max-w-4xl mx-auto">
              <div className="aspect-video bg-slate-100 rounded-[2rem] border border-slate-200 shadow-inner flex items-center justify-center relative overflow-hidden group cursor-pointer">
                <div className="absolute inset-0 bg-slate-900/5 group-hover:bg-slate-900/10 transition-colors" />
                <div className="w-20 h-20 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Play className="w-8 h-8 text-[#5B65FF] ml-1" fill="currentColor" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing Section */}
        <div id="pricing" className="py-32 border-t border-slate-200/60 relative overflow-hidden">
          <DotPattern
            width={12}
            height={12}
            cx={1}
            cy={1}
            cr={1.2}
            className="[mask-image:radial-gradient(800px_circle_at_center,white,transparent)] fill-slate-400/55"
          />
          <div className="relative z-10 text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-cyan-50 text-cyan-500 text-xs font-semibold mb-6 relative">
              {/* Decorative lines */}
              <div className="absolute top-1/2 -left-4 w-4 h-px bg-cyan-100" />
              <div className="absolute top-1/2 -right-4 w-4 h-px bg-cyan-100" />
              Pricing Plans
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight">
              Flexible plans for every stage<br />of growth
            </h2>
            <p className="text-lg text-slate-500 leading-relaxed max-w-2xl mx-auto">
              Our flexible plans fit every growth stage. Scale up or down anytime, paying only for the features and support you need to succeed.
            </p>
          </div>

          <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Starter Plan */}
            <div className="flex flex-col">
              <div className="bg-gradient-to-b from-slate-50 to-slate-50/50 rounded-[2rem] p-8 mb-8 relative overflow-hidden border border-slate-100/50">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold text-slate-900">Starter</h3>
                  <span className="text-xs font-medium text-slate-500 bg-white px-3 py-1 rounded-full shadow-sm border border-slate-100">Small Teams</span>
                </div>
                <div className="mb-4">
                  <div className="text-sm text-slate-500 mb-1">Start at</div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-bold text-slate-900">₹999</span>
                    <span className="text-slate-500 font-medium">/month</span>
                  </div>
                </div>
                <p className="text-sm text-slate-600 mb-8 leading-relaxed min-h-[40px]">
                  Small teams and startups just getting started with bookings and management.
                </p>
                <button className="w-full py-3.5 px-4 bg-[#1D4ED8] hover:bg-blue-700 text-white rounded-xl font-medium transition-colors shadow-sm">
                  Try for Free
                </button>
              </div>
              <div className="px-2">
                <ul className="space-y-4">
                  {[
                    'Manage up to 10 bookings per month',
                    'Add up to 5 team members',
                    'Basic customer management tools',
                    'Email & chat support',
                    'Access to dashboard analytics (limited)',
                    'File uploads & basic document storage',
                    'Mobile & desktop app access',
                    'Integration with Google Calendar'
                  ].map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-slate-600">
                      <Check className="w-4 h-4 text-slate-800 shrink-0 mt-0.5" strokeWidth={1.5} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Professional Plan */}
            <div className="flex flex-col">
              <div className="bg-gradient-to-b from-[#F0F9FF] to-[#F0F9FF]/50 rounded-[2rem] p-8 mb-8 relative overflow-hidden border border-blue-100/50">
                {/* Dot pattern background */}
                <div className="absolute inset-0 opacity-[0.15]" style={{ backgroundImage: 'radial-gradient(#3B82F6 1px, transparent 1px)', backgroundSize: '12px 12px' }} />
                
                <div className="relative z-10">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-bold text-slate-900">Professional</h3>
                    <span className="text-xs font-medium text-slate-500 bg-white px-3 py-1 rounded-full shadow-sm border border-slate-100">Growing Businesses</span>
                  </div>
                  <div className="mb-4">
                    <div className="text-sm text-slate-500 mb-1">Start at</div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-5xl font-bold text-slate-900">₹2999</span>
                      <span className="text-slate-500 font-medium">/month</span>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 mb-8 leading-relaxed min-h-[40px]">
                    Large organizations managing multiple departments, locations, or service lines.
                  </p>
                  <button className="w-full py-3.5 px-4 bg-[#1D4ED8] hover:bg-blue-700 text-white rounded-xl font-medium transition-colors shadow-sm">
                    Contact Sales
                  </button>
                </div>
              </div>
              <div className="px-2">
                <ul className="space-y-4">
                  {[
                    'Unlimited bookings and customers',
                    'Add up to 25 team members',
                    'Automated reminders (Email & WhatsApp)',
                    'Reports & analytics dashboard',
                    'Multi-branch management',
                    'Advanced inventory tracking & low-stock alerts',
                    'Role-based access control',
                    'Priority email & chat support'
                  ].map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-slate-600">
                      <Check className="w-4 h-4 text-slate-800 shrink-0 mt-0.5" strokeWidth={1.5} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Enterprise Plan */}
            <div className="flex flex-col">
              <div className="bg-gradient-to-b from-slate-50 to-slate-50/50 rounded-[2rem] p-8 mb-8 relative overflow-hidden border border-slate-100/50">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold text-slate-900">Enterprise</h3>
                  <span className="text-xs font-medium text-slate-500 bg-white px-3 py-1 rounded-full shadow-sm border border-slate-100">Large organizations</span>
                </div>
                <div className="mb-4">
                  <div className="text-sm text-slate-500 mb-1">Start at</div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-bold text-slate-900">₹5999</span>
                    <span className="text-slate-500 font-medium">/month</span>
                  </div>
                </div>
                <p className="text-sm text-slate-600 mb-8 leading-relaxed min-h-[40px]">
                  Small teams and startups just getting started with bookings and management.
                </p>
                <button className="w-full py-3.5 px-4 bg-[#1D4ED8] hover:bg-blue-700 text-white rounded-xl font-medium transition-colors shadow-sm">
                  Try for Free
                </button>
              </div>
              <div className="px-2">
                <ul className="space-y-4">
                  {[
                    'Custom user limits & branch setup',
                    'Dedicated account manager',
                    'White-label portal & custom branding',
                    'Custom integrations (ERP, CRM, or HR systems)',
                    'API access & developer tools',
                    'Advanced automation workflows',
                    '24/7 dedicated support',
                    'Onboarding & staff training'
                  ].map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-slate-600">
                      <Check className="w-4 h-4 text-slate-800 shrink-0 mt-0.5" strokeWidth={1.5} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Customers Section */}
        <div id="customers" className="py-32 border-t border-slate-200/60 relative bg-white overflow-hidden">
          <DotPattern
            width={12}
            height={12}
            cx={1}
            cy={1}
            cr={1.2}
            className="[mask-image:radial-gradient(800px_circle_at_center,white,transparent)] fill-indigo-400/45"
          />
          {/* Vertical lines matching the design */}
          <div className="hidden md:block absolute top-0 bottom-0 left-[10%] w-px bg-indigo-100/50 pointer-events-none" />
          <div className="hidden md:block absolute top-0 bottom-0 right-[10%] w-px bg-indigo-100/50 pointer-events-none" />

          <div className="text-center max-w-3xl mx-auto mb-12 relative z-10">
            <h2 className="text-4xl md:text-5xl font-medium text-slate-900 mb-4 tracking-tight">
              Hear From <span className="text-[#3B82F6]">Our Customers</span>
            </h2>
            <p className="text-[15px] text-slate-400 leading-relaxed max-w-xl mx-auto">
              Smarter inventory. Real impact. See how Inviq boosts<br className="hidden md:block" />efficiency and eliminates stock issues.
            </p>
          </div>

          <div className="max-w-2xl mx-auto relative z-10 px-4">
            <div className="bg-[#F8F9FF] rounded-2xl p-10 md:p-12 border border-indigo-100/60 mb-10 transition-all duration-300">
              <p className="text-slate-600 text-[15px] text-center leading-relaxed mb-8">
                "{testimonials[currentTestimonial].quote}"
              </p>
              <div className="flex items-center justify-center gap-4">
                <img src={testimonials[currentTestimonial].image} alt={testimonials[currentTestimonial].name} className="w-12 h-12 rounded-full object-cover shadow-sm" />
                <div className="text-left">
                  <div className="font-semibold text-slate-900 text-sm">{testimonials[currentTestimonial].name}</div>
                  <div className="text-sm text-slate-500">{testimonials[currentTestimonial].role}</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-4">
              <button 
                onClick={prevTestimonial}
                className="w-10 h-10 flex items-center justify-center rounded-xl border border-indigo-100 bg-white text-[#3B82F6] hover:bg-indigo-50 transition-all shadow-[0_2px_10px_rgba(99,102,241,0.05)]"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button 
                onClick={nextTestimonial}
                className="w-10 h-10 flex items-center justify-center rounded-xl border border-indigo-100 bg-white text-[#3B82F6] hover:bg-indigo-50 transition-all shadow-[0_2px_10px_rgba(99,102,241,0.05)]"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div id="faq" className="py-24 relative bg-white border-t border-slate-200/60 overflow-hidden z-10">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] opacity-30" />
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-white to-transparent z-10" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent z-10" />
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-96 h-96 bg-blue-50 rounded-full blur-3xl opacity-50 z-0" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20">
          <div className="flex flex-col lg:flex-row gap-16 lg:gap-24">
            {/* Left Column */}
            <div className="lg:w-1/3 flex flex-col items-start">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 shadow-sm text-slate-700 text-sm font-medium mb-6">
                <HelpCircle className="w-4 h-4 text-[#5B65FF]" />
                FAQs
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight leading-tight">
                Frequently asked<br />question
              </h2>
              <p className="text-slate-500 mb-8 leading-relaxed">
                Some answers to common question we get asked. Feel free to reach out if you have any inquiries:
              </p>
              <button className="px-6 py-3 bg-[#5B65FF] text-white font-medium rounded-xl hover:bg-blue-600 transition-colors shadow-sm">
                Get started
              </button>
            </div>

            {/* Right Column */}
            <div className="lg:w-2/3 flex flex-col gap-4">
              {faqs.map((faq, index) => (
                <div 
                  key={index}
                  className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden transition-all duration-300"
                >
                  <button 
                    onClick={() => setOpenFaq(openFaq === index ? -1 : index)}
                    className="w-full px-6 py-5 flex items-center justify-between text-left"
                  >
                    <span className="font-semibold text-slate-900 pr-8">{faq.question}</span>
                    {openFaq === index ? (
                      <ArrowDownRight className="w-5 h-5 text-[#5B65FF] flex-shrink-0" />
                    ) : (
                      <ArrowUpRight className="w-5 h-5 text-[#5B65FF] flex-shrink-0" />
                    )}
                  </button>
                  
                  <div 
                    className={`px-6 overflow-hidden transition-all duration-300 ease-in-out ${
                      openFaq === index ? 'max-h-48 pb-6 opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <div className="w-full h-px bg-slate-100 mb-4" />
                    <p className="text-slate-500 text-sm leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* CTA & Footer Section */}
      <div className="relative z-10 w-full">
        {/* Blue CTA Banner */}
        <div className="bg-[#5B65FF] text-white relative overflow-hidden">
          {/* Decorative shapes */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-white/10 rounded-full blur-2xl translate-y-1/3" />
          <div className="absolute top-1/2 left-0 w-80 h-80 bg-white/10 rounded-full blur-3xl -translate-x-1/2" />
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-24 relative z-10">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-10">
              <div className="max-w-xl">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-slate-900 text-sm font-medium mb-6 shadow-sm">
                  <Phone className="w-4 h-4 text-blue-600" />
                  Contact
                </div>
                <h2 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
                  Expand Your Reach with<br />Brand's Smart Platform
                </h2>
                <p className="text-blue-100 text-lg">
                  Manage inventory, streamline operations, and scale your business anywhere in the world.
                </p>
              </div>
              
              <div className="w-full lg:w-auto flex flex-col sm:flex-row gap-3">
                <input 
                  type="email" 
                  placeholder="Enter your email" 
                  className="px-6 py-4 rounded-xl text-slate-900 w-full sm:w-80 focus:outline-none focus:ring-2 focus:ring-white/50 shadow-sm"
                />
                <button className="px-8 py-4 bg-white text-[#5B65FF] font-semibold rounded-xl hover:bg-blue-50 transition-colors shadow-sm whitespace-nowrap">
                  Contact Us
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Links */}
        <footer className="bg-white pt-20 pb-10 border-t border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-16">
              <div className="col-span-2">
                <div className="flex items-center gap-2 mb-4">
                  <LogoIcon />
                  <span className="font-bold text-xl tracking-tight text-slate-900">InvIQ</span>
                </div>
                <p className="text-slate-500 text-sm max-w-sm mb-6 leading-relaxed">
                  Next-generation smart inventory management with real-time tracking, AI-powered forecasting, and cold-chain compliance.
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold text-slate-900 mb-6">Menu</h4>
                <ul className="space-y-4">
                  <li><a href="#" className="text-slate-500 hover:text-slate-900 transition-colors">Home</a></li>
                  <li><a href="#" className="text-slate-500 hover:text-slate-900 transition-colors">Features</a></li>
                  <li><a href="#" className="text-slate-500 hover:text-slate-900 transition-colors">Process</a></li>
                  <li><a href="#" className="text-slate-500 hover:text-slate-900 transition-colors">Pricing</a></li>
                  <li><a href="#" className="text-slate-500 hover:text-slate-900 transition-colors">Changelog</a></li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-slate-900 mb-6">Company</h4>
                <ul className="space-y-4">
                  <li><a href="#" className="text-slate-500 hover:text-slate-900 transition-colors">About Us</a></li>
                  <li><a href="#" className="text-slate-500 hover:text-slate-900 transition-colors">Contact Us</a></li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-slate-900 mb-6">Other Pages</h4>
                <ul className="space-y-4">
                  <li><a href="#" className="text-slate-500 hover:text-slate-900 transition-colors">Customers</a></li>
                </ul>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-slate-200 gap-4">
              <p className="text-slate-500 text-sm">
                © 2026 Inviq. All rights reserved.
              </p>
              <div className="flex items-center gap-6 text-sm">
                <a href="#" className="text-slate-500 hover:text-slate-900 transition-colors">Privacy Policy</a>
                <a href="#" className="text-slate-500 hover:text-slate-900 transition-colors">Term of Use</a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

