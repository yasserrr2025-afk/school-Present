import React, { useState, useEffect, useMemo } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import {
    BarChart2, BookOpen, Users, LogOut, Loader2, Calendar, FileText, CheckCircle, TrendingUp, AlertTriangle, ArrowRight, Printer, Flag, Activity
} from 'lucide-react';
import {
    getStudentsSync, getStudents, getDailyAcademicLogs
} from '../../services/storage';
import { DailyAcademicLog, StaffUser, Student } from '../../types';
import { GRADES, CLASSES } from '../../constants';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, Cell, PieChart, Pie } from 'recharts';

const { useNavigate } = ReactRouterDOM as any;

const TeacherDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState<StaffUser | null>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [allLogs, setAllLogs] = useState<DailyAcademicLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const SCHOOL_LOGO = localStorage.getItem('school_logo') || "https://www.raed.net/img?id=1471924";
    const SCHOOL_NAME = localStorage.getItem('school_name') || "مدرسة المبدعين الأهلية";

    // Filtering
    const [selectedGrade, setSelectedGrade] = useState('');
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');

    useEffect(() => {
        const session = localStorage.getItem('ozr_staff_session');
        if (!session) {
            navigate('/staff/login');
            return;
        }
        const userData = JSON.parse(session);
        setUser(userData);

        const initData = async () => {
            const [allSts, myLogs] = await Promise.all([
                getStudents(),
                getDailyAcademicLogs(undefined, undefined, userData.id)
            ]);
            setStudents(allSts);
            setAllLogs(myLogs);
            setIsLoading(false);
        };
        initData();
    }, [navigate]);

    const availableGrades = useMemo(() => Array.from(new Set(allLogs.map(l => l.grade))), [allLogs]);
    const availableClasses = useMemo(() => {
        if (!selectedGrade) return [];
        return Array.from(new Set(allLogs.filter(l => l.grade === selectedGrade).map(l => l.className)));
    }, [allLogs, selectedGrade]);

    const availableSubjects = useMemo(() => {
        let filtered = allLogs;
        if (selectedGrade) filtered = filtered.filter(l => l.grade === selectedGrade);
        if (selectedClass) filtered = filtered.filter(l => l.className === selectedClass);
        return Array.from(new Set(filtered.map(l => l.subject)));
    }, [allLogs, selectedGrade, selectedClass]);

    const filteredLogs = useMemo(() => {
        return allLogs.filter(l => {
            let matches = true;
            if (selectedGrade && l.grade !== selectedGrade) matches = false;
            if (selectedClass && l.className !== selectedClass) matches = false;
            if (selectedSubject && l.subject !== selectedSubject) matches = false;
            return matches;
        });
    }, [allLogs, selectedGrade, selectedClass, selectedSubject]);

    // Analytics computation
    const analytics = useMemo(() => {
        if (filteredLogs.length === 0) return null;

        let excellentPart = 0;
        let goodPart = 0;
        let weakPart = 0;

        let hwDone = 0;
        let hwNotDone = 0;

        const studentsSet = new Set(filteredLogs.map(l => l.studentId));

        filteredLogs.forEach(log => {
            if (log.participation === 'ممتاز' || log.participation === 'جيد جداً') excellentPart++;
            else if (log.participation === 'ضعيف') weakPart++;
            else goodPart++;

            if (log.homework === 'مكتمل ✅' || log.homework === 'مكتمل') hwDone++;
            else if (log.homework === 'لم ينجز ❌' || log.homework === 'لم ينجز') hwNotDone++;
        });

        // Best classes comparison (if no specific class is selected)
        const classPerformance: Record<string, { goodCount: number, total: number }> = {};
        allLogs.forEach(log => {
            if (selectedSubject && log.subject !== selectedSubject) return;
            const key = `${log.grade} - ${log.className}`;
            if (!classPerformance[key]) classPerformance[key] = { goodCount: 0, total: 0 };
            classPerformance[key].total++;
            if (log.participation === 'ممتاز' || log.participation === 'جيد جداً') classPerformance[key].goodCount++;
        });

        const classComparisonData = Object.keys(classPerformance).map(k => ({
            name: k,
            performance: Math.round((classPerformance[k].goodCount / classPerformance[k].total) * 100) || 0
        })).sort((a, b) => b.performance - a.performance);

        return {
            totalLogs: filteredLogs.length,
            uniqueStudents: studentsSet.size,
            partData: [
                { name: 'ممتاز/جيد جداً', value: excellentPart, color: '#10B981' },
                { name: 'جيد/مقبول', value: goodPart, color: '#F59E0B' },
                { name: 'ضعيف', value: weakPart, color: '#EF4444' },
            ],
            hwData: [
                { name: 'مكتمل', value: hwDone, color: '#3B82F6' },
                { name: 'غير مكتمل', value: hwNotDone, color: '#F43F5E' },
            ],
            weakStudents: filteredLogs.filter(l => l.participation === 'ضعيف' || l.homework === 'لم ينجز').slice(0, 10),
            classComparisonData
        }
    }, [filteredLogs, allLogs, selectedSubject]);

    if (!user) return null;

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-20 print:bg-white print:pb-0 print:text-black">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-slate-200 print:hidden">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/staff')} className="text-slate-400 hover:text-blue-600 transition-colors p-2 rounded-lg hover:bg-slate-100 flex items-center gap-2">
                            <ArrowRight size={20} /> <span className="font-bold hidden sm:inline">الرئيسية</span>
                        </button>
                        <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>
                        <h1 className="font-extrabold text-lg text-slate-800 flex items-center gap-2">
                            <BarChart2 className="text-blue-600" />
                            تقارير أداء فصولي
                        </h1>
                    </div>
                </div>
            </header>

            {/* Print Header (Visible only when printing) */}
            <div className="hidden print:block text-center border-b-2 border-slate-800 pb-4 mt-8 mb-8" dir="rtl">
                <div className="flex justify-between items-center px-8">
                    <div className="text-right">
                        <h2 className="font-bold text-lg mb-1">المملكة العربية السعودية</h2>
                        <h2 className="font-bold mb-1">وزارة التعليم</h2>
                        <h2 className="font-bold">{SCHOOL_NAME}</h2>
                    </div>
                    <img src={SCHOOL_LOGO} alt="School Logo" className="w-24 h-24 object-contain" />
                    <div className="text-center">
                        <h1 className="text-2xl font-black mb-2 border-b-2 border-slate-800 inline-block pb-1">تقرير الأداء للمعلم</h1>
                        <p className="font-bold">المعلم: أ. {user.name}</p>
                        <p className="font-bold mt-1">تاريخ الطباعة: {new Date().toLocaleDateString('ar-SA')}</p>
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 py-8 space-y-8 print:py-0 print:space-y-6" dir="rtl">

                {/* Filters */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 print:hidden">
                    <div className="flex flex-col md:flex-row gap-6 items-end justify-between">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full md:w-3/4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">تصفية حسب الصف</label>
                                <select
                                    value={selectedGrade}
                                    onChange={e => { setSelectedGrade(e.target.value); setSelectedClass(''); setSelectedSubject(''); }}
                                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 font-bold"
                                >
                                    <option value="">جميع الصفوف المتوفرة</option>
                                    {availableGrades.map(g => <option key={g} value={g}>{g}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">تصفية حسب الفصل</label>
                                <select
                                    value={selectedClass}
                                    onChange={e => { setSelectedClass(e.target.value); setSelectedSubject(''); }}
                                    disabled={!selectedGrade}
                                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 font-bold disabled:opacity-50"
                                >
                                    <option value="">جميع الفصول</option>
                                    {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">المادة الدراسية</label>
                                <select
                                    value={selectedSubject}
                                    onChange={e => setSelectedSubject(e.target.value)}
                                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 font-bold"
                                >
                                    <option value="">جميع المواد</option>
                                    {availableSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>
                        <button onClick={handlePrint} className="bg-slate-800 text-white px-6 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-700 transition-colors shadow-lg shadow-slate-800/20 w-full md:w-auto">
                            <Printer size={18} /> طباعة التقرير
                        </button>
                    </div>
                </div>

                {/* Print Filter Status */}
                <div className="hidden print:block bg-slate-50 p-4 rounded-xl border border-slate-200 mb-8">
                    <p className="font-bold text-slate-700">
                        معايير التقرير:
                        {selectedGrade ? ` الصف ${selectedGrade}` : ' جميع الصفوف المتوفرة'} |
                        {selectedClass ? ` الفصل ${selectedClass}` : ' جميع الفصول'} |
                        {selectedSubject ? ` مادة ${selectedSubject}` : ' جميع المواد'}
                    </p>
                </div>

                {isLoading ? (
                    <div className="py-24 text-center">
                        <Loader2 size={48} className="animate-spin mx-auto text-blue-500 mb-4" />
                        <p className="font-bold text-slate-500">جاري تجميع وإعداد التقارير...</p>
                    </div>
                ) : filteredLogs.length === 0 ? (
                    <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-slate-300 print:hidden">
                        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <FileText size={48} className="text-slate-300" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-700">لا توجد بيانات مسجلة</h3>
                        <p className="text-slate-500 max-w-sm mx-auto mt-2">قم باختيار فصول أخرى أو تأكد من قيامك برصد المتابعة اليومية للطلاب في الشاشة المخصصة.</p>
                        <button onClick={() => navigate('/staff/teacher')} className="mt-6 text-blue-600 font-bold hover:underline">الذهاب لشاشة المتابعة اليومية</button>
                    </div>
                ) : analytics ? (
                    <div className="space-y-8 animate-fade-in-up">
                        {/* Highlights Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 print:grid-cols-4">
                            <div className="bg-gradient-to-br from-indigo-500 to-blue-600 print:bg-white print:border-2 print:border-slate-800 p-6 rounded-3xl text-white print:text-slate-900 shadow-lg shadow-blue-500/20 print:shadow-none relative overflow-hidden group">
                                <TrendingUp size={64} className="absolute -bottom-4 -left-4 text-white/10 print:text-slate-200 group-hover:scale-110 transition-transform" />
                                <p className="text-blue-100 print:text-slate-600 font-bold text-sm mb-1 uppercase tracking-wider relative z-10">إجمالي عمليات الرصد</p>
                                <h3 className="text-4xl font-extrabold relative z-10">{analytics.totalLogs} <span className="text-lg font-medium opacity-80 print:opacity-100">سجل</span></h3>
                            </div>
                            <div className="bg-white p-6 rounded-3xl border border-slate-100 print:border-slate-300 shadow-sm print:shadow-none">
                                <p className="text-slate-400 print:text-slate-600 font-bold text-sm mb-1 uppercase tracking-wider">الطلاب المشمولين</p>
                                <h3 className="text-3xl font-extrabold text-slate-800">{analytics.uniqueStudents} <span className="text-sm font-bold text-slate-500 print:text-slate-800">طالب</span></h3>
                            </div>
                            <div className="bg-white p-6 rounded-3xl border border-slate-100 print:border-slate-300 shadow-sm print:shadow-none">
                                <p className="text-slate-400 print:text-slate-600 font-bold text-sm mb-1 uppercase tracking-wider">الطلاب المتفوقين (المشاركة)</p>
                                <h3 className="text-3xl font-extrabold text-emerald-600 print:text-slate-800">
                                    {Math.round((analytics.partData[0].value / analytics.totalLogs) * 100) || 0}%
                                </h3>
                            </div>
                            <div className="bg-white p-6 rounded-3xl border border-slate-100 print:border-slate-300 shadow-sm print:shadow-none">
                                <p className="text-slate-400 print:text-slate-600 font-bold text-sm mb-1 uppercase tracking-wider">إنجاز الواجبات</p>
                                <h3 className="text-3xl font-extrabold text-blue-600 print:text-slate-800">
                                    {Math.round((analytics.hwData[0].value / analytics.totalLogs) * 100) || 0}%
                                </h3>
                            </div>
                        </div>

                        {/* Charts Area */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 print:grid-cols-2 print:break-inside-avoid print:mt-12">
                            {/* Participation Chart */}
                            <div className="bg-white p-6 rounded-3xl border border-slate-100 print:border-slate-300 shadow-sm flex flex-col">
                                <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                                    <Activity size={20} className="text-purple-500 print:text-slate-800" /> تحليل تفاعل الطلاب والمشاركة الصفية
                                </h3>
                                <div className="flex-1 min-h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={analytics.partData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={80}
                                                outerRadius={120}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {analytics.partData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(value: number) => [`${value} سجل`, 'العدد']} />
                                            <Legend verticalAlign="bottom" height={36} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Class Comparison Chart */}
                            <div className="bg-white p-6 rounded-3xl border border-slate-100 print:border-slate-300 shadow-sm flex flex-col">
                                <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                                    <Flag size={20} className="text-indigo-500 print:text-slate-800" /> مقارنة نسب إتقان الفصول
                                </h3>
                                <div className="flex-1 min-h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={analytics.classComparisonData.slice(0, 5)} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                                            <XAxis type="number" hide />
                                            <YAxis dataKey="name" type="category" width={100} tick={{ fill: '#475569', fontWeight: 'bold', fontSize: 12 }} axisLine={false} tickLine={false} />
                                            <Tooltip cursor={{ fill: '#F8FAFC' }} formatter={(value: number) => [`${value}%`, 'نسبة التفوق']} />
                                            <Bar dataKey="performance" radius={[0, 4, 4, 0]} barSize={24}>
                                                {
                                                    analytics.classComparisonData.slice(0, 5).map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={index === 0 ? '#10B981' : '#3B82F6'} />
                                                    ))
                                                }
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                                <p className="text-xs text-slate-400 text-center mt-2 italic">أفضل 5 فصول (بناءً على التميز والجيد جداً)</p>
                            </div>
                        </div>

                        {/* Attention Needed List */}
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 print:border-slate-300 shadow-sm print:break-inside-avoid print:mt-12">
                            <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                                <AlertTriangle size={20} className="text-rose-500 print:text-slate-800" /> طلاب بحاجة لتدخل ومتابعة
                            </h3>
                            {analytics.weakStudents.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-right print:text-black">
                                        <thead className="text-xs text-slate-500 print:text-black uppercase font-bold bg-slate-50 print:bg-slate-100 border-b border-slate-100 print:border-slate-400">
                                            <tr>
                                                <th className="py-3 px-4 rounded-tr-xl print:rounded-none">تاريخ الرصد</th>
                                                <th className="py-3 px-4">الطالب</th>
                                                <th className="py-3 px-4">الصف والفصل</th>
                                                <th className="py-3 px-4">المشاركة</th>
                                                <th className="py-3 px-4">الواجبات</th>
                                                <th className="py-3 px-4 rounded-tl-xl print:rounded-none">ملاحظة مسجلة</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 print:divide-slate-300 font-medium">
                                            {analytics.weakStudents.map((l, i) => (
                                                <tr key={l.id || i} className="hover:bg-rose-50/30 transition-colors">
                                                    <td className="py-3 px-4 text-slate-500 text-xs print:text-black">{l.date}</td>
                                                    <td className="py-3 px-4 text-slate-900 font-bold">{l.studentName}</td>
                                                    <td className="py-3 px-4 text-slate-600 print:text-black">{l.grade} - شعبه {l.className}</td>
                                                    <td className={`py-3 px-4 ${l.participation === 'ضعيف' ? 'text-rose-600 font-extrabold print:text-black print:font-bold' : ''}`}>{l.participation}</td>
                                                    <td className={`py-3 px-4 ${l.homework?.includes('لم ينجز') ? 'text-rose-600 font-extrabold print:text-black print:font-bold' : ''}`}>{l.homework}</td>
                                                    <td className="py-3 px-4 text-slate-500 text-xs truncate max-w-[200px] print:text-black print:whitespace-normal" title={l.notes || ''}>{l.notes || '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-slate-400 print:text-black bg-slate-50 print:bg-white rounded-2xl border border-slate-200 print:border-slate-400 border-dashed print:border-solid">
                                    <CheckCircle size={32} className="mx-auto text-emerald-400 print:text-slate-800 mb-2" />
                                    <p className="font-bold border-b border-slate-300 inline-block pb-1">لا توجد حالات مسجلة تستدعي المتابعة في هذا التقرير.</p>
                                </div>
                            )}
                        </div>

                    </div>
                ) : null}
            </main>

            {/* Print Footer */}
            <div className="hidden print:block fixed bottom-0 left-0 right-0 p-8 text-center border-t-2 border-slate-800 bg-white" dir="rtl">
                <div className="flex justify-between font-bold text-lg">
                    <p>توقيع المعلم: ...............................</p>
                    <p>موافقة واعتماد مدير المدرسة: ...............................</p>
                </div>
            </div>
        </div>
    );
};

export default TeacherDashboard;
