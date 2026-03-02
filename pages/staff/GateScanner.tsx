
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    QrCode, CheckCircle, AlertCircle, Loader2, User, Clock, RefreshCw, XCircle,
    Printer, List, ShieldCheck, FileText, LayoutGrid, Sparkles, BrainCircuit,
    Calendar, ArrowRight, Bell, LogOut, Home, X, Camera, History, LogOut as ExitIcon,
    Grid, UserCheck, Search, Filter, ScanLine, Users, BookOpen, ChevronDown, ChevronUp
} from 'lucide-react';
import {
    checkInVisitor, getDailyAppointments, generateSmartContent, getExitPermissions,
    completeExitPermission, getExitPermissionById, updateExitPermissionStatus
} from '../../services/storage';
import { Appointment, ExitPermission } from '../../types';

declare var Html5Qrcode: any;

const GateScanner: React.FC = () => {
    // --- View State ---
    const [activeTab, setActiveTab] = useState<'scanner' | 'exits_today' | 'visitors_log' | 'exits_log'>('scanner');
    const [showSmartReport, setShowSmartReport] = useState(false);
    const [printMode, setPrintMode] = useState<'none' | 'exits' | 'visitors'>('none');

    // --- Data State ---
    const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
    const [todaysVisits, setTodaysVisits] = useState<Appointment[]>([]);
    const [todaysExits, setTodaysExits] = useState<ExitPermission[]>([]);
    const [loadingData, setLoadingData] = useState(false);

    // --- Scanner State ---
    const [scanResult, setScanResult] = useState<string | null>(null);
    const [scannedAppointment, setScannedAppointment] = useState<Appointment | null>(null);
    const [scannedExit, setScannedExit] = useState<ExitPermission | null>(null);
    const [scanLoading, setScanLoading] = useState(false);
    const [scanError, setScanError] = useState<string | null>(null);
    const [scanSuccessType, setScanSuccessType] = useState<'checkin' | 'exit' | null>(null);
    const [isAlreadyProcessed, setIsAlreadyProcessed] = useState(false);

    // --- AI State ---
    const [aiReport, setAiReport] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // --- Filter State ---
    const [searchTerm, setSearchTerm] = useState('');
    const [exitStatusFilter, setExitStatusFilter] = useState<'all' | 'pending_pickup' | 'completed' | 'rejected'>('all');

    const scannerRef = useRef<any>(null);
    const isScannerRunning = useRef<boolean>(false);
    const isProcessingScan = useRef<boolean>(false);
    const scannerLock = useRef<boolean>(false);

    const SCHOOL_NAME = localStorage.getItem('school_name') || 'المدرسة';
    const SCHOOL_LOGO = localStorage.getItem('school_logo') || 'https://www.raed.net/img?id=1471924';

    // --- Statistics ---
    const stats = useMemo(() => {
        const exitsTotal = todaysExits.length;
        const exitsPending = todaysExits.filter(e => e.status === 'pending_pickup').length;
        const exitsCompleted = todaysExits.filter(e => e.status === 'completed').length;
        const exitsRejected = todaysExits.filter(e => e.status === 'rejected').length;

        const visitsTotal = todaysVisits.length;
        const visitsPending = todaysVisits.filter(v => v.status !== 'completed' && v.status !== 'cancelled').length;
        const visitsCompleted = todaysVisits.filter(v => v.status === 'completed').length;

        return { exitsTotal, exitsPending, exitsCompleted, exitsRejected, visitsTotal, visitsPending, visitsCompleted };
    }, [todaysExits, todaysVisits]);

    // --- Fetch Data ---
    const fetchDailyData = async () => {
        setLoadingData(true);
        try {
            const [visits, exits] = await Promise.all([
                getDailyAppointments(reportDate),
                getExitPermissions(reportDate)
            ]);
            setTodaysVisits(visits);
            setTodaysExits(exits);
        } catch (e) {
            console.error('Failed to fetch gate data', e);
        } finally {
            setLoadingData(false);
        }
    };

    useEffect(() => {
        fetchDailyData();
        const interval = setInterval(fetchDailyData, 30000);
        return () => clearInterval(interval);
    }, [reportDate]);

    // --- Scanner Logic ---
    const stopScanner = async () => {
        if (scannerLock.current) return;
        scannerLock.current = true;
        try {
            if (scannerRef.current) {
                if (isScannerRunning.current) {
                    try { await scannerRef.current.stop(); } catch (e) { }
                }
                try { await scannerRef.current.clear(); } catch (e) { }
            }
        } finally {
            isScannerRunning.current = false;
            scannerRef.current = null;
            scannerLock.current = false;
        }
    };

    const startScanner = async () => {
        if (activeTab !== 'scanner') return;
        if (scannerLock.current || isScannerRunning.current) return;
        scannerLock.current = true;
        setScanError(null);
        try {
            if (scannerRef.current) {
                try { await scannerRef.current.stop(); } catch (e) { }
                try { await scannerRef.current.clear(); } catch (e) { }
                scannerRef.current = null;
            }
            await new Promise(r => setTimeout(r, 100));
            if (!document.getElementById('reader')) { scannerLock.current = false; return; }

            const html5QrCode = new Html5Qrcode('reader');
            scannerRef.current = html5QrCode;
            await html5QrCode.start(
                { facingMode: 'environment' },
                { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
                (decodedText: string) => { if (!isProcessingScan.current) handleScan(decodedText); },
                (_: string) => { }
            );
            isScannerRunning.current = true;
        } catch (err: any) {
            let msg = 'تعذر تشغيل الكاميرا.';
            const errStr = err?.toString() || '';
            if (err?.name === 'NotAllowedError' || errStr.includes('Permission denied')) msg = 'تم رفض إذن الكاميرا. اضغط على 🔒 في شريط العنوان وامنح الإذن.';
            else if (err?.name === 'NotFoundError') msg = 'لم يتم العثور على كاميرا.';
            else if (err?.name === 'NotReadableError') msg = 'الكاميرا قيد الاستخدام.';
            else if (errStr.includes('Is already running')) { isScannerRunning.current = true; msg = ''; }
            if (msg) { setScanError(msg); isScannerRunning.current = false; }
        } finally {
            scannerLock.current = false;
        }
    };

    useEffect(() => {
        let ignore = false;
        const init = async () => {
            if (activeTab === 'scanner') {
                await new Promise(r => setTimeout(r, 200));
                if (!ignore) await startScanner();
            } else {
                await stopScanner();
            }
        };
        init();
        return () => { ignore = true; stopScanner(); };
    }, [activeTab]);

    const handleScan = async (decodedText: string) => {
        isProcessingScan.current = true;
        setScanLoading(true);
        setScanResult(decodedText);
        setScanError(null);
        setScannedAppointment(null);
        setScannedExit(null);
        setScanSuccessType(null);
        setIsAlreadyProcessed(false);

        try {
            let exitId = decodedText.startsWith('EXIT:') ? decodedText.split(':')[1] : decodedText;
            let foundExit = todaysExits.find(e => e.id === exitId);
            if (!foundExit) {
                const freshExit = await getExitPermissionById(exitId);
                if (freshExit) {
                    const isToday = freshExit.createdAt.startsWith(new Date().toISOString().split('T')[0]);
                    if (isToday || freshExit.status === 'pending_pickup') foundExit = freshExit;
                }
            }
            if (foundExit) {
                setScannedExit(foundExit);
                if (foundExit.status === 'completed') setIsAlreadyProcessed(true);
                setScanLoading(false);
                return;
            }

            let foundVisit = todaysVisits.find(v => v.id === decodedText);
            if (!foundVisit) {
                const visits = await getDailyAppointments(reportDate);
                setTodaysVisits(visits);
                foundVisit = visits.find(v => v.id === decodedText);
            }
            if (foundVisit) {
                setScannedAppointment(foundVisit);
                if (foundVisit.status === 'completed') setIsAlreadyProcessed(true);
                setScanLoading(false);
                return;
            }
            setScanError('الرمز غير موجود في سجل هذا اليوم.');
        } catch (e) {
            setScanError('حدث خطأ أثناء معالجة الرمز.');
        } finally {
            setScanLoading(false);
        }
    };

    const confirmAction = async () => {
        setScanLoading(true);
        try {
            if (scannedExit) {
                await completeExitPermission(scannedExit.id);
                setScanSuccessType('exit');
                setTodaysExits(prev => prev.map(e => e.id === scannedExit.id ? { ...e, status: 'completed', completedAt: new Date().toISOString() } : e));
            } else if (scannedAppointment) {
                await checkInVisitor(scannedAppointment.id);
                setScanSuccessType('checkin');
                setTodaysVisits(prev => prev.map(v => v.id === scannedAppointment.id ? { ...v, status: 'completed', arrivedAt: new Date().toISOString() } : v));
            }
        } catch (e) {
            setScanError('فشل تنفيذ العملية. حاول مرة أخرى.');
        } finally {
            setScanLoading(false);
        }
    };

    const resetScanner = async () => {
        setScanResult(null);
        setScannedExit(null);
        setScannedAppointment(null);
        setScanError(null);
        setScanSuccessType(null);
        setIsAlreadyProcessed(false);
        isProcessingScan.current = false;
        if (!isScannerRunning.current) await startScanner();
    };

    const handleManualExit = async (id: string) => {
        if (!window.confirm('تأكيد خروج الطالب؟')) return;
        await completeExitPermission(id);
        fetchDailyData();
    };

    const handleManualCheckIn = async (id: string) => {
        if (!window.confirm('تأكيد دخول الزائر؟')) return;
        await checkInVisitor(id);
        fetchDailyData();
    };

    const generateReport = async () => {
        setIsAnalyzing(true);
        setShowSmartReport(true);
        try {
            const prompt = `حلل حركة البوابة اليوم ${reportDate}. خروج: ${stats.exitsCompleted}/${stats.exitsTotal}. زوار: ${stats.visitsCompleted}/${stats.visitsTotal}. اكتب ملخصاً مفيداً.`;
            const res = await generateSmartContent(prompt);
            setAiReport(res);
        } catch (e) { setAiReport('تعذر التوليد.'); } finally { setIsAnalyzing(false); }
    };

    const handlePrint = (mode: 'exits' | 'visitors') => {
        setPrintMode(mode);
        setTimeout(() => { window.print(); setTimeout(() => setPrintMode('none'), 1000); }, 300);
    };

    const getVisitorStatus = (v: Appointment) => {
        if (v.status === 'completed') return { label: 'حضر', color: 'bg-emerald-100 text-emerald-700' };
        if (v.status === 'cancelled') return { label: 'ملغي', color: 'bg-red-100 text-red-700' };
        const isPast = new Date(reportDate) < new Date(new Date().setHours(0, 0, 0, 0));
        if (isPast || new Date().getHours() >= 13) return { label: 'لم يحضر', color: 'bg-slate-100 text-slate-600' };
        return { label: 'انتظار', color: 'bg-amber-100 text-amber-700' };
    };

    const getExitStatusBadge = (status: string) => {
        switch (status) {
            case 'pending_pickup': return { label: 'انتظار الاستلام', color: 'bg-orange-100 text-orange-700' };
            case 'pending_approval': return { label: 'انتظار الاعتماد', color: 'bg-amber-100 text-amber-700' };
            case 'completed': return { label: 'غادر', color: 'bg-emerald-100 text-emerald-700' };
            case 'rejected': return { label: 'مرفوض', color: 'bg-red-100 text-red-700' };
            default: return { label: status, color: 'bg-slate-100 text-slate-600' };
        }
    };

    const filteredExits = todaysExits.filter(e => {
        const matchSearch = e.studentName.includes(searchTerm) || e.grade.includes(searchTerm) || (e.parentName || '').includes(searchTerm);
        const matchStatus = exitStatusFilter === 'all' || e.status === exitStatusFilter;
        return matchSearch && matchStatus;
    });
    const filteredVisits = todaysVisits.filter(v => v.parentName.includes(searchTerm) || v.studentName.includes(searchTerm));

    return (
        <>
            <style>{`
                @media print {
                    body * { visibility: hidden; }
                    #gate-report, #gate-report * { visibility: visible; }
                    #gate-report { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; background: white; z-index: 9999; }
                    .no-print { display: none !important; }
                }
                @keyframes scan-move {
                    0% { top: 0; opacity: 0; } 20% { opacity: 1; } 80% { opacity: 1; } 100% { top: 100%; opacity: 0; }
                }
                .animate-scan { animation: scan-move 2s linear infinite; }
            `}</style>

            {/* ===== PRINT TEMPLATE ===== */}
            <div id="gate-report" className="hidden" dir="rtl">
                <div className="flex items-center justify-between border-b-4 border-slate-800 pb-4 mb-6">
                    <div className="text-right font-bold text-sm space-y-1">
                        <p>المملكة العربية السعودية</p>
                        <p>وزارة التعليم</p>
                        <p className="text-base">{SCHOOL_NAME}</p>
                    </div>
                    <div className="text-center">
                        <img src={SCHOOL_LOGO} alt="Logo" className="h-20 w-auto object-contain mx-auto" />
                        <p className="font-extrabold text-lg mt-2">
                            {printMode === 'exits' ? 'سجل الاستئذانات اليومي' : 'سجل الزوار اليومي'}
                        </p>
                    </div>
                    <div className="text-left font-bold text-sm space-y-1">
                        <p>التاريخ: {reportDate}</p>
                        <p>الإجمالي: {printMode === 'exits' ? stats.exitsTotal : stats.visitsTotal}</p>
                        {printMode === 'exits' && <p>المغادرون: {stats.exitsCompleted}</p>}
                        {printMode === 'visitors' && <p>الحضور: {stats.visitsCompleted}</p>}
                    </div>
                </div>

                {printMode === 'exits' && (
                    <table className="w-full text-right border-collapse border border-black text-sm">
                        <thead>
                            <tr className="bg-gray-200">
                                <th className="border border-black p-2">#</th>
                                <th className="border border-black p-2">الطالب</th>
                                <th className="border border-black p-2">الصف</th>
                                <th className="border border-black p-2">المستلم (ولي الأمر)</th>
                                <th className="border border-black p-2">السبب</th>
                                <th className="border border-black p-2">المعتمد</th>
                                <th className="border border-black p-2">وقت الخروج</th>
                                <th className="border border-black p-2">الحالة</th>
                            </tr>
                        </thead>
                        <tbody>
                            {todaysExits.length > 0 ? todaysExits.map((e, i) => (
                                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                    <td className="border border-black p-2 text-center">{i + 1}</td>
                                    <td className="border border-black p-2 font-bold">{e.studentName}</td>
                                    <td className="border border-black p-2">{e.grade} - {e.className}</td>
                                    <td className="border border-black p-2">{e.parentName}</td>
                                    <td className="border border-black p-2">{e.reason}</td>
                                    <td className="border border-black p-2">{e.createdByName}</td>
                                    <td className="border border-black p-2 font-mono">
                                        {e.completedAt ? new Date(e.completedAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : '-'}
                                    </td>
                                    <td className="border border-black p-2 text-center">
                                        {e.status === 'completed' ? 'غادر ✓' : e.status === 'rejected' ? 'مرفوض ✗' : 'معلق'}
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan={8} className="p-6 text-center text-gray-500">لا يوجد استئذانات لهذا اليوم</td></tr>
                            )}
                        </tbody>
                        <tfoot>
                            <tr className="bg-gray-100 font-bold">
                                <td colSpan={6} className="border border-black p-2 text-right">الإجمالي</td>
                                <td colSpan={2} className="border border-black p-2 text-center">
                                    مغادر: {stats.exitsCompleted} | انتظار: {stats.exitsPending} | مرفوض: {stats.exitsRejected}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                )}

                {printMode === 'visitors' && (
                    <table className="w-full text-right border-collapse border border-black text-sm">
                        <thead>
                            <tr className="bg-gray-200">
                                <th className="border border-black p-2">#</th>
                                <th className="border border-black p-2">اسم الزائر</th>
                                <th className="border border-black p-2">ولي أمر الطالب</th>
                                <th className="border border-black p-2">وقت الموعد</th>
                                <th className="border border-black p-2">سبب الزيارة</th>
                                <th className="border border-black p-2">وقت الحضور</th>
                                <th className="border border-black p-2">الحالة</th>
                            </tr>
                        </thead>
                        <tbody>
                            {todaysVisits.length > 0 ? todaysVisits.map((v, i) => (
                                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                    <td className="border border-black p-2 text-center">{i + 1}</td>
                                    <td className="border border-black p-2 font-bold">{v.parentName}</td>
                                    <td className="border border-black p-2">{v.studentName}</td>
                                    <td className="border border-black p-2 font-mono">{v.slot?.startTime}</td>
                                    <td className="border border-black p-2">{v.visitReason}</td>
                                    <td className="border border-black p-2 font-mono">
                                        {v.arrivedAt ? new Date(v.arrivedAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : '-'}
                                    </td>
                                    <td className="border border-black p-2 text-center">
                                        {getVisitorStatus(v).label}
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan={7} className="p-6 text-center text-gray-500">لا يوجد زوار لهذا اليوم</td></tr>
                            )}
                        </tbody>
                        <tfoot>
                            <tr className="bg-gray-100 font-bold">
                                <td colSpan={5} className="border border-black p-2 text-right">الإجمالي</td>
                                <td colSpan={2} className="border border-black p-2 text-center">
                                    حضر: {stats.visitsCompleted} | انتظار: {stats.visitsPending}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                )}

                <div className="mt-8 flex justify-between text-xs text-gray-500 border-t pt-4">
                    <span>طُبع في: {new Date().toLocaleString('ar-SA')}</span>
                    <span>النظام الذكي لإدارة البوابة - {SCHOOL_NAME}</span>
                </div>
            </div>

            {/* ===== MAIN UI ===== */}
            <div className="max-w-7xl mx-auto space-y-5 pb-24 no-print animate-fade-in" dir="rtl">

                {/* HEADER STATS */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-1.5 aspect-square">
                        <div className="bg-orange-50 p-3 rounded-full text-orange-500"><Clock size={22} /></div>
                        <h3 className="text-3xl font-black text-slate-800">{stats.exitsPending}</h3>
                        <p className="text-[11px] text-slate-400 font-bold uppercase">انتظار خروج</p>
                    </div>
                    <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-1.5 aspect-square">
                        <div className="bg-emerald-50 p-3 rounded-full text-emerald-500"><LogOut size={22} /></div>
                        <h3 className="text-3xl font-black text-slate-800">{stats.exitsCompleted}</h3>
                        <p className="text-[11px] text-slate-400 font-bold uppercase">غادروا</p>
                    </div>
                    <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-1.5 aspect-square">
                        <div className="bg-blue-50 p-3 rounded-full text-blue-500"><UserCheck size={22} /></div>
                        <h3 className="text-3xl font-black text-slate-800">{stats.visitsCompleted}</h3>
                        <p className="text-[11px] text-slate-400 font-bold uppercase">زوار حضروا</p>
                    </div>
                    <div onClick={generateReport} className="bg-purple-50 p-4 rounded-3xl shadow-sm border border-purple-100 flex flex-col items-center justify-center gap-1.5 aspect-square cursor-pointer hover:bg-purple-100 transition-colors">
                        <div className="bg-white p-3 rounded-full text-purple-500"><Sparkles size={22} /></div>
                        <h3 className="text-base font-black text-purple-900">تقرير ذكي</h3>
                        <p className="text-[10px] text-purple-400 font-bold">AI</p>
                    </div>
                </div>

                {showSmartReport && (
                    <div className="bg-purple-50 border border-purple-200 rounded-2xl p-6 relative animate-fade-in">
                        <button onClick={() => setShowSmartReport(false)} className="absolute top-4 left-4 text-purple-400"><X size={20} /></button>
                        <h3 className="font-bold text-purple-900 mb-3 flex items-center gap-2"><BrainCircuit size={18} /> تحليل حركة البوابة</h3>
                        {isAnalyzing ? <Loader2 className="animate-spin text-purple-600" /> : <p className="text-sm text-purple-800 leading-relaxed whitespace-pre-line">{aiReport}</p>}
                    </div>
                )}

                {/* TABS */}
                <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100 flex overflow-x-auto gap-1">
                    {[
                        { id: 'scanner', label: 'الماسح', icon: <ScanLine size={16} />, color: 'bg-slate-800 text-white' },
                        { id: 'exits_today', label: `خروج اليوم (${stats.exitsTotal})`, icon: <LogOut size={16} />, color: 'bg-orange-500 text-white' },
                        { id: 'visitors_log', label: `زوار (${stats.visitsTotal})`, icon: <Users size={16} />, color: 'bg-blue-600 text-white' },
                        { id: 'exits_log', label: 'سجل الاستئذانات', icon: <BookOpen size={16} />, color: 'bg-emerald-600 text-white' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex-1 min-w-[110px] py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${activeTab === tab.id ? tab.color + ' shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>

                {/* ============= SCANNER TAB ============= */}
                {activeTab === 'scanner' && (
                    <div className="flex flex-col items-center gap-6">
                        <div className="w-full max-w-md aspect-square bg-black rounded-3xl overflow-hidden relative shadow-2xl border-4 border-slate-900">
                            <div id="reader" className="w-full h-full" />
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                                <div className="w-64 h-64 border-2 border-white/30 rounded-3xl relative">
                                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-2xl" />
                                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-2xl" />
                                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-2xl" />
                                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-2xl" />
                                    {!scanResult && <div className="absolute left-0 right-0 h-1 bg-emerald-400/80 shadow-[0_0_20px_rgba(52,211,153,0.8)] animate-scan" />}
                                </div>
                            </div>
                            <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 z-20">
                                <div className={`w-2 h-2 rounded-full ${scanError ? 'bg-red-500' : 'bg-emerald-500 animate-pulse'}`} />
                                {scanError ? 'خطأ' : 'جاري المسح'}
                            </div>
                            {scanError && (
                                <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center text-white z-30 p-6 text-center">
                                    <AlertCircle size={48} className="text-red-500 mb-4" />
                                    <p className="font-bold mb-4 text-sm">{scanError}</p>
                                    <button onClick={() => { setScanError(null); startScanner(); }} className="bg-white text-black px-6 py-2 rounded-xl font-bold flex items-center gap-2">
                                        <RefreshCw size={16} /> إعادة المحاولة
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* SCAN RESULT MODAL */}
                        {(scanResult || isAlreadyProcessed || scanSuccessType) && (
                            <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
                                <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden relative">
                                    {!scanLoading && (
                                        <button onClick={resetScanner} className="absolute top-4 left-4 bg-slate-100 hover:bg-slate-200 p-2 rounded-full z-10">
                                            <X size={24} className="text-slate-600" />
                                        </button>
                                    )}
                                    <div className="p-8 text-center">
                                        {scanSuccessType ? (
                                            <div className="animate-fade-in-up">
                                                <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                                    <CheckCircle size={48} />
                                                </div>
                                                <h2 className="text-3xl font-extrabold text-slate-900 mb-2">
                                                    {scanSuccessType === 'exit' ? 'تم تسجيل الخروج ✓' : 'تم تسجيل الدخول ✓'}
                                                </h2>
                                                <p className="text-slate-500 font-bold mb-8">العملية مسجلة في النظام</p>
                                                <button onClick={resetScanner} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-lg hover:bg-slate-800">
                                                    مسح التالي
                                                </button>
                                            </div>
                                        ) : isAlreadyProcessed ? (
                                            <div className="animate-fade-in-up">
                                                <div className="w-24 h-24 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                                    <History size={48} />
                                                </div>
                                                <h2 className="text-2xl font-extrabold text-slate-900 mb-2">تمت العملية مسبقاً</h2>
                                                <p className="text-slate-500 mb-6">{scannedExit ? scannedExit.studentName : scannedAppointment?.parentName}</p>
                                                <button onClick={resetScanner} className="w-full py-4 bg-slate-200 text-slate-700 rounded-2xl font-bold">عودة</button>
                                            </div>
                                        ) : scannedExit ? (
                                            <div className="animate-fade-in-up">
                                                <div className="bg-orange-50 border-2 border-orange-100 rounded-2xl p-6 mb-6">
                                                    <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold mb-3 inline-block">إذن خروج طالب</span>
                                                    <h2 className="text-3xl font-extrabold text-slate-900 mb-1">{scannedExit.studentName}</h2>
                                                    <p className="text-slate-500">{scannedExit.grade} - {scannedExit.className}</p>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3 text-right mb-6">
                                                    <div className="bg-slate-50 p-3 rounded-xl">
                                                        <p className="text-xs text-slate-400 mb-1">المستلم</p>
                                                        <p className="font-bold text-slate-800">{scannedExit.parentName}</p>
                                                    </div>
                                                    <div className="bg-slate-50 p-3 rounded-xl">
                                                        <p className="text-xs text-slate-400 mb-1">المعتمد</p>
                                                        <p className="font-bold text-slate-800">{scannedExit.createdByName}</p>
                                                    </div>
                                                </div>
                                                <button onClick={confirmAction} disabled={scanLoading} className="w-full py-5 bg-orange-600 text-white rounded-2xl font-bold text-xl hover:bg-orange-700 shadow-xl shadow-orange-200 flex items-center justify-center gap-3">
                                                    {scanLoading ? <Loader2 className="animate-spin" /> : <LogOut size={24} />} تأكيد المغادرة
                                                </button>
                                            </div>
                                        ) : scannedAppointment ? (
                                            <div className="animate-fade-in-up">
                                                <div className="bg-blue-50 border-2 border-blue-100 rounded-2xl p-6 mb-6">
                                                    <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold mb-3 inline-block">موعد زيارة</span>
                                                    <h2 className="text-3xl font-extrabold text-slate-900 mb-1">{scannedAppointment.parentName}</h2>
                                                    <p className="text-slate-500">ولي أمر: {scannedAppointment.studentName}</p>
                                                </div>
                                                <div className="bg-slate-50 p-4 rounded-2xl mb-6 text-right">
                                                    <div className="flex justify-between items-center border-b border-slate-200 pb-3 mb-3">
                                                        <span className="text-slate-400 text-sm font-bold">وقت الموعد</span>
                                                        <span className="font-mono text-xl font-bold">{scannedAppointment.slot?.startTime}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-400 text-sm block mb-1">سبب الزيارة</span>
                                                        <span className="font-bold">{scannedAppointment.visitReason}</span>
                                                    </div>
                                                </div>
                                                <button onClick={confirmAction} disabled={scanLoading} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-bold text-xl hover:bg-blue-700 shadow-xl shadow-blue-200 flex items-center justify-center gap-3">
                                                    {scanLoading ? <Loader2 className="animate-spin" /> : <CheckCircle size={24} />} تسجيل الدخول
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="py-10">
                                                <XCircle size={64} className="text-red-500 mx-auto mb-4" />
                                                <h3 className="text-xl font-bold mb-2">الرمز غير صالح</h3>
                                                <p className="text-slate-500">{scanError || 'لم يتم العثور على بيانات.'}</p>
                                                <button onClick={resetScanner} className="mt-8 px-8 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold">مسح مرة أخرى</button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ============= EXITS TODAY TAB ============= */}
                {activeTab === 'exits_today' && (
                    <div className="space-y-4 animate-fade-in">
                        {/* Controls */}
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row gap-3 items-center">
                            <div className="relative flex-1 w-full">
                                <Search className="absolute right-3 top-2.5 text-slate-400" size={18} />
                                <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="بحث باسم الطالب أو الصف..." className="w-full pr-10 pl-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-bold" />
                            </div>
                            <div className="flex gap-2 flex-wrap">
                                {[
                                    { id: 'all', label: 'الكل' },
                                    { id: 'pending_pickup', label: 'انتظار' },
                                    { id: 'completed', label: 'غادروا' },
                                    { id: 'rejected', label: 'مرفوض' },
                                ].map(f => (
                                    <button key={f.id} onClick={() => setExitStatusFilter(f.id as any)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${exitStatusFilter === f.id ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <input type="date" value={reportDate} onChange={e => setReportDate(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none" />
                                <button onClick={() => handlePrint('exits')} className="bg-slate-800 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold hover:bg-slate-700">
                                    <Printer size={16} /> طباعة
                                </button>
                            </div>
                        </div>

                        {/* Summary Row */}
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { label: 'إجمالي الطلبات', value: stats.exitsTotal, color: 'text-slate-700', bg: 'bg-slate-50 border-slate-200' },
                                { label: 'غادروا', value: stats.exitsCompleted, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
                                { label: 'انتظار الاستلام', value: stats.exitsPending, color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
                            ].map(s => (
                                <div key={s.label} className={`${s.bg} border rounded-2xl p-4 text-center`}>
                                    <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
                                    <p className="text-xs text-slate-500 font-bold mt-1">{s.label}</p>
                                </div>
                            ))}
                        </div>

                        {/* Names List */}
                        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                            <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                                <h3 className="font-extrabold text-slate-800">قائمة الاستئذانات - {reportDate}</h3>
                                <span className="text-xs text-slate-400 font-bold">{filteredExits.length} طالب</span>
                            </div>
                            {loadingData ? (
                                <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto text-slate-400" size={32} /></div>
                            ) : filteredExits.length === 0 ? (
                                <div className="p-10 text-center">
                                    <LogOut size={40} className="mx-auto text-slate-300 mb-3" />
                                    <p className="text-slate-400 font-bold">لا توجد استئذانات</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {filteredExits.map((e, i) => {
                                        const badge = getExitStatusBadge(e.status);
                                        return (
                                            <div key={e.id} className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                                                <div className="w-9 h-9 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center font-black text-sm shrink-0">{i + 1}</div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-extrabold text-slate-900">{e.studentName}</h4>
                                                    <p className="text-xs text-slate-400">{e.grade} - {e.className} | المستلم: <strong>{e.parentName}</strong></p>
                                                    <p className="text-xs text-slate-400 mt-0.5 truncate">السبب: {e.reason}</p>
                                                </div>
                                                <div className="text-left shrink-0 flex flex-col items-end gap-1">
                                                    <span className={`${badge.color} text-[11px] font-bold px-2.5 py-1 rounded-full`}>{badge.label}</span>
                                                    {e.completedAt && (
                                                        <span className="text-[10px] text-slate-400 font-mono">
                                                            {new Date(e.completedAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    )}
                                                    {e.status === 'pending_pickup' && (
                                                        <button onClick={() => handleManualExit(e.id)} className="text-[11px] bg-orange-600 text-white px-3 py-1 rounded-lg font-bold hover:bg-orange-700 flex items-center gap-1">
                                                            <LogOut size={11} /> تأكيد خروج
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ============= VISITORS LOG TAB ============= */}
                {activeTab === 'visitors_log' && (
                    <div className="space-y-4 animate-fade-in">
                        {/* Controls */}
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row gap-3 items-center">
                            <div className="relative flex-1 w-full">
                                <Search className="absolute right-3 top-2.5 text-slate-400" size={18} />
                                <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="بحث باسم الزائر أو الطالب..." className="w-full pr-10 pl-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-bold" />
                            </div>
                            <div className="flex gap-2">
                                <input type="date" value={reportDate} onChange={e => setReportDate(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none" />
                                <button onClick={() => handlePrint('visitors')} className="bg-blue-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold hover:bg-blue-700">
                                    <Printer size={16} /> طباعة
                                </button>
                            </div>
                        </div>

                        {/* Summary */}
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { label: 'إجمالي المواعيد', value: stats.visitsTotal, color: 'text-slate-700', bg: 'bg-slate-50 border-slate-200' },
                                { label: 'حضروا', value: stats.visitsCompleted, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
                                { label: 'في الانتظار', value: stats.visitsPending, color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
                            ].map(s => (
                                <div key={s.label} className={`${s.bg} border rounded-2xl p-4 text-center`}>
                                    <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
                                    <p className="text-xs text-slate-500 font-bold mt-1">{s.label}</p>
                                </div>
                            ))}
                        </div>

                        {/* Visitors Table */}
                        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                            <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                                <h3 className="font-extrabold text-slate-800">سجل الزوار - {reportDate}</h3>
                                <span className="text-xs text-slate-400 font-bold">{filteredVisits.length} زائر</span>
                            </div>
                            {loadingData ? (
                                <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto text-slate-400" size={32} /></div>
                            ) : filteredVisits.length === 0 ? (
                                <div className="p-10 text-center">
                                    <Users size={40} className="mx-auto text-slate-300 mb-3" />
                                    <p className="text-slate-400 font-bold">لا يوجد زوار لهذا اليوم</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {filteredVisits.map((v, i) => {
                                        const vs = getVisitorStatus(v);
                                        return (
                                            <div key={v.id} className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                                                <div className="w-9 h-9 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center font-black text-sm shrink-0">{i + 1}</div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-extrabold text-slate-900">{v.parentName}</h4>
                                                    <p className="text-xs text-slate-400">ولي أمر: <strong>{v.studentName}</strong></p>
                                                    <p className="text-xs text-slate-400 mt-0.5 truncate">السبب: {v.visitReason}</p>
                                                </div>
                                                <div className="text-left shrink-0 flex flex-col items-end gap-1.5">
                                                    <span className={`${vs.color} text-[11px] font-bold px-2.5 py-1 rounded-full`}>{vs.label}</span>
                                                    <span className="text-[11px] text-slate-400 font-mono">موعد: {v.slot?.startTime}</span>
                                                    {v.arrivedAt && (
                                                        <span className="text-[11px] text-emerald-600 font-mono">
                                                            حضر: {new Date(v.arrivedAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    )}
                                                    {v.status !== 'completed' && v.status !== 'cancelled' && (
                                                        <button onClick={() => handleManualCheckIn(v.id)} className="text-[11px] bg-blue-600 text-white px-3 py-1 rounded-lg font-bold hover:bg-blue-700 flex items-center gap-1">
                                                            <UserCheck size={11} /> دخول يدوي
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ============= ALL EXITS LOG TAB ============= */}
                {activeTab === 'exits_log' && (
                    <div className="space-y-4 animate-fade-in">
                        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 flex justify-between items-center">
                            <div>
                                <h3 className="font-extrabold text-emerald-900 text-lg">سجل الاستئذانات الشامل</h3>
                                <p className="text-emerald-600 text-sm font-bold mt-0.5">طلبات الاستئذان المعتمدة من الوكيل لهذا اليوم</p>
                            </div>
                            <div className="bg-white rounded-2xl p-3 shadow-sm text-emerald-600">
                                <BookOpen size={28} />
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row gap-3 items-center">
                            <div className="relative flex-1 w-full">
                                <Search className="absolute right-3 top-2.5 text-slate-400" size={18} />
                                <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="بحث..." className="w-full pr-10 pl-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-bold" />
                            </div>
                            <div className="flex gap-2">
                                <input type="date" value={reportDate} onChange={e => setReportDate(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none" />
                                <button onClick={fetchDailyData} className="bg-slate-100 text-slate-600 px-3 py-2 rounded-xl hover:bg-slate-200 flex items-center gap-1 text-sm font-bold">
                                    <RefreshCw size={15} /> تحديث
                                </button>
                                <button onClick={() => handlePrint('exits')} className="bg-emerald-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold hover:bg-emerald-700">
                                    <Printer size={16} /> طباعة الكل
                                </button>
                            </div>
                        </div>

                        {/* Full table */}
                        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-right text-sm">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200">
                                            <th className="p-3 font-extrabold text-slate-700">#</th>
                                            <th className="p-3 font-extrabold text-slate-700">الطالب</th>
                                            <th className="p-3 font-extrabold text-slate-700">الصف</th>
                                            <th className="p-3 font-extrabold text-slate-700">المستلم</th>
                                            <th className="p-3 font-extrabold text-slate-700">السبب</th>
                                            <th className="p-3 font-extrabold text-slate-700">المعتمد</th>
                                            <th className="p-3 font-extrabold text-slate-700">وقت الخروج</th>
                                            <th className="p-3 font-extrabold text-slate-700">الحالة</th>
                                            <th className="p-3 font-extrabold text-slate-700">إجراء</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loadingData ? (
                                            <tr><td colSpan={9} className="p-10 text-center"><Loader2 className="animate-spin mx-auto text-slate-400" size={28} /></td></tr>
                                        ) : filteredExits.length === 0 ? (
                                            <tr><td colSpan={9} className="p-10 text-center text-slate-400 font-bold">لا يوجد بيانات</td></tr>
                                        ) : filteredExits.map((e, i) => {
                                            const badge = getExitStatusBadge(e.status);
                                            return (
                                                <tr key={e.id} className={`border-b border-slate-100 hover:bg-slate-50 ${i % 2 === 0 ? '' : 'bg-slate-50/50'}`}>
                                                    <td className="p-3 text-slate-400 font-bold text-center">{i + 1}</td>
                                                    <td className="p-3 font-extrabold text-slate-900">{e.studentName}</td>
                                                    <td className="p-3 text-slate-500">{e.grade}</td>
                                                    <td className="p-3 text-slate-700 font-bold">{e.parentName}</td>
                                                    <td className="p-3 text-slate-500 max-w-[140px] truncate">{e.reason}</td>
                                                    <td className="p-3 text-slate-500">{e.createdByName || '-'}</td>
                                                    <td className="p-3 font-mono text-slate-700">
                                                        {e.completedAt ? new Date(e.completedAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : '-'}
                                                    </td>
                                                    <td className="p-3">
                                                        <span className={`${badge.color} text-[11px] font-bold px-2 py-1 rounded-full whitespace-nowrap`}>{badge.label}</span>
                                                    </td>
                                                    <td className="p-3">
                                                        {e.status === 'pending_pickup' && (
                                                            <button onClick={() => handleManualExit(e.id)} className="text-[11px] bg-orange-600 text-white px-2.5 py-1 rounded-lg font-bold hover:bg-orange-700 whitespace-nowrap">
                                                                تأكيد خروج
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </>
    );
};

export default GateScanner;
