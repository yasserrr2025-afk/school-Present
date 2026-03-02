import React, { useState, useEffect, useMemo } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import {
    BookOpen, Users, LogOut, Loader2, Save, Activity, FileText, Check, Plus, AlertCircle
} from 'lucide-react';
import {
    getStudentsSync, getStudents, addDailyAcademicLog, getDailyAcademicLogs, createNotification
} from '../../services/storage';
import { DailyAcademicLog, StaffUser, Student } from '../../types';


const { useNavigate } = ReactRouterDOM as any;

const Teacher: React.FC = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState<StaffUser | null>(null);
    const [students, setStudents] = useState<Student[]>([]);

    // Form state
    const [selectedGrade, setSelectedGrade] = useState('');
    const [selectedClass, setSelectedClass] = useState('');
    const [subject, setSubject] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    // Logs state
    const [logs, setLogs] = useState<Record<string, Partial<DailyAcademicLog>>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const SCHOOL_LOGO = localStorage.getItem('school_logo') || "https://www.raed.net/img?id=1471924";

    useEffect(() => {
        const session = localStorage.getItem('ozr_staff_session');
        if (!session) {
            navigate('/staff/login');
            return;
        }
        setUser(JSON.parse(session));

        const initData = async () => {
            const allSts = await getStudents();
            setStudents(allSts);
            setIsLoading(false);
        };
        initData();
    }, [navigate]);

    const availableGrades = useMemo(() => {
        const grades = new Set<string>();
        students.forEach(s => {
            if (s.grade) {
                grades.add(s.grade);
            }
        });
        return Array.from(grades).sort();
    }, [students]);

    const availableClasses = useMemo(() => {
        if (!selectedGrade) return [];
        const classes = new Set(students.filter(s => s.grade === selectedGrade && s.className).map(s => s.className));
        return Array.from(classes).sort();
    }, [students, selectedGrade]);

    // Automatically select options if there's only one
    useEffect(() => {
        if (availableGrades.length === 1 && !selectedGrade) setSelectedGrade(availableGrades[0]);
    }, [availableGrades, selectedGrade]);

    useEffect(() => {
        if (availableClasses.length === 1 && !selectedClass) setSelectedClass(availableClasses[0]);
    }, [availableClasses, selectedClass]);

    const classStudents = useMemo(() => {
        if (!selectedGrade || !selectedClass) return [];
        return students.filter(s => s.grade === selectedGrade && s.className === selectedClass).sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    }, [students, selectedGrade, selectedClass]);

    // Pre-load existing logs if any
    useEffect(() => {
        if (!user || !selectedGrade || !selectedClass || !selectedDate || !subject) return;

        const loadExistingLogs = async () => {
            setIsLoading(true);
            try {
                const existing = await getDailyAcademicLogs(undefined, selectedDate, user.id);
                const classLogs = existing.filter(l => l.grade === selectedGrade && l.className === selectedClass && l.subject === subject);

                const initialLogs: Record<string, Partial<DailyAcademicLog>> = {};
                for (const student of classStudents) {
                    const existingLog = classLogs.find(l => l.studentId === student.studentId);
                    initialLogs[student.studentId] = existingLog || {
                        participation: 'ممتاز',
                        homework: 'مكتمل',
                        projectStatus: 'قيد الإنجاز',
                        researchStatus: 'غير مكلف'
                    };
                }
                setLogs(initialLogs);
            } catch (err) {
                console.error("Failed to load logs:", err);
            } finally {
                setIsLoading(false);
            }
        };

        loadExistingLogs();
    }, [user, selectedGrade, selectedClass, selectedDate, subject, classStudents]);

    const handleUpdateField = (studentId: string, field: keyof DailyAcademicLog, value: string) => {
        setLogs(prev => ({
            ...prev,
            [studentId]: {
                ...prev[studentId],
                [field]: value
            }
        }));
    };

    const handleSave = async () => {
        if (!subject.trim()) {
            alert("يرجى كتابة المادة قبل الحفظ");
            return;
        }

        setIsSaving(true);
        try {
            for (const student of classStudents) {
                const logData = logs[student.studentId];
                if (!logData) continue;

                await addDailyAcademicLog({
                    studentId: student.studentId,
                    studentName: student.name,
                    grade: selectedGrade,
                    className: selectedClass,
                    subject: subject,
                    date: selectedDate,
                    participation: logData.participation,
                    homework: logData.homework,
                    projectStatus: logData.projectStatus,
                    researchStatus: logData.researchStatus,
                    notes: logData.notes || '',
                    teacherId: user?.id,
                    teacherName: user?.name
                });
            }

            alert("تم حفظ سجل المتابعة بنجاح! وسينعكس لدى ولي الأمر.");
        } catch (e) {
            console.error("Save error:", e);
            alert("حدث خطأ أثناء الحفظ. يرجى المحاولة مرة أخرى.");
        } finally {
            setIsSaving(false);
        }
    };

    if (!user) return null;

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-20">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-slate-200">
                <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src={SCHOOL_LOGO} alt="School" className="w-10 h-10 object-contain drop-shadow" />
                        <h1 className="font-extrabold text-lg text-slate-800 hidden sm:block">سجل المعلم - المتابعة اليومية</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-left hidden sm:block">
                            <p className="text-sm font-bold text-slate-800">{user.name}</p>
                            <p className="text-[10px] text-emerald-600 bg-emerald-50 px-2 rounded font-bold inline-block">معلم</p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">

                {/* Switch to Reports Mode */}
                <div className="flex justify-end">
                    <button
                        onClick={() => navigate('/staff/teacher-dash')}
                        className="bg-purple-50 text-purple-700 hover:bg-purple-100 hover:text-purple-800 border border-purple-200 px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-sm"
                    >
                        <Activity size={18} /> العرض والتقارير الاحترافية المجمعة
                    </button>
                </div>

                {/* Greeting */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 rounded-[2rem] text-white flex items-center gap-6 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -z-0"></div>
                    <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-[1.5rem] flex items-center justify-center border border-white/30 rotate-3 z-10">
                        <BookOpen size={40} className="text-white drop-shadow-md" />
                    </div>
                    <div className="z-10 relative">
                        <h2 className="text-3xl font-extrabold mb-2 tracking-tight">مرحباً أستاذ / {user.name}</h2>
                        <p className="text-blue-100 font-medium">اختر الفصل الذي تدرسه واكتب اسم المادة وسجل متابعتك اليومية بكل سهولة. سيتم عكس كل شيء مباشرة لأولياء الأمور!</p>
                    </div>
                </div>

                {/* Filters & Setup */}
                <div className="bg-white p-6 rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <Activity size={20} className="text-blue-600" /> إعداد الجلسة
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-2">المرحلة / الصف</label>
                            <select
                                value={selectedGrade}
                                onChange={e => { setSelectedGrade(e.target.value); setSelectedClass(''); }}
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 font-bold"
                            >
                                <option value="">اختر الصف...</option>
                                {availableGrades.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-2">الفصل</label>
                            <select
                                value={selectedClass}
                                onChange={e => setSelectedClass(e.target.value)}
                                disabled={!selectedGrade}
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 font-bold disabled:opacity-50"
                            >
                                <option value="">اختر الفصل...</option>
                                {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-2">اسم المادة</label>
                            <input
                                type="text"
                                placeholder="مثال: لغتي الخالدة"
                                value={subject}
                                onChange={e => setSubject(e.target.value)}
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 font-bold"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-2">تاريخ اليوم</label>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={e => setSelectedDate(e.target.value)}
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 font-bold"
                            />
                        </div>
                    </div>
                </div>

                {/* Students List for Logging */}
                {selectedGrade && selectedClass && subject ? (
                    <div className="bg-white p-6 rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 animate-fade-in-up">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <Users size={24} className="text-indigo-600" />
                                كشف تقييم الطلاب ({classStudents.length} طالب)
                            </h3>
                            <button
                                onClick={handleSave}
                                disabled={isSaving || isLoading}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2 transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                حفظ الكشف
                            </button>
                        </div>

                        {isLoading ? (
                            <div className="py-12 text-center text-slate-400">
                                <Loader2 size={40} className="animate-spin mx-auto text-blue-500 mb-4" />
                                <p className="font-bold">جاري تحميل بيانات السجل...</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-right">
                                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 font-bold border-b border-slate-200">
                                        <tr>
                                            <th className="py-4 px-4 rounded-tr-xl">اسم الطالب</th>
                                            <th className="py-4 px-4 w-32 text-center">المشاركة</th>
                                            <th className="py-4 px-4 w-32 text-center">الواجبات</th>
                                            <th className="py-4 px-4 w-32 text-center">المشاريع</th>
                                            <th className="py-4 px-4 w-32 text-center">البحوث</th>
                                            <th className="py-4 px-4 rounded-tl-xl w-48">ملاحظات للمنزل</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                                        {classStudents.map((student, idx) => {
                                            const log = logs[student.studentId] || {};
                                            return (
                                                <tr key={student.studentId} className="hover:bg-blue-50/30 transition-colors">
                                                    <td className="py-4 px-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">{idx + 1}</div>
                                                            <span className="font-bold">{student.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-2">
                                                        <select
                                                            value={log.participation || 'ممتاز'}
                                                            onChange={e => handleUpdateField(student.studentId, 'participation', e.target.value)}
                                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold outline-none focus:border-blue-500"
                                                        >
                                                            <option value="ممتاز">ممتاز ⭐</option>
                                                            <option value="جيد جداً">جيد جداً</option>
                                                            <option value="جيد">جيد</option>
                                                            <option value="مقبول">مقبول</option>
                                                            <option value="ضعيف">ضعيف ⚠️</option>
                                                        </select>
                                                    </td>
                                                    <td className="py-3 px-2">
                                                        <select
                                                            value={log.homework || 'مكتمل'}
                                                            onChange={e => handleUpdateField(student.studentId, 'homework', e.target.value)}
                                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold outline-none focus:border-blue-500"
                                                        >
                                                            <option value="مكتمل">مكتمل ✅</option>
                                                            <option value="غير مكتمل">غير مكتمل</option>
                                                            <option value="لم ينجز">لم ينجز ❌</option>
                                                        </select>
                                                    </td>
                                                    <td className="py-3 px-2">
                                                        <select
                                                            value={log.projectStatus || 'قيد الإنجاز'}
                                                            onChange={e => handleUpdateField(student.studentId, 'projectStatus', e.target.value)}
                                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold outline-none focus:border-blue-500"
                                                        >
                                                            <option value="مكتمل ومسلم">مكتمل ومسلم</option>
                                                            <option value="قيد الإنجاز">قيد الإنجاز</option>
                                                            <option value="لم يبدأ">لم يبدأ</option>
                                                            <option value="غير مكلف">غير مكلف</option>
                                                        </select>
                                                    </td>
                                                    <td className="py-3 px-2">
                                                        <select
                                                            value={log.researchStatus || 'غير مكلف'}
                                                            onChange={e => handleUpdateField(student.studentId, 'researchStatus', e.target.value)}
                                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold outline-none focus:border-blue-500"
                                                        >
                                                            <option value="مكتمل ومسلم">مكتمل ومسلم</option>
                                                            <option value="قيد الإنجاز">قيد الإنجاز</option>
                                                            <option value="لم يبدأ">لم يبدأ</option>
                                                            <option value="غير مكلف">غير مكلف</option>
                                                        </select>
                                                    </td>
                                                    <td className="py-3 px-2">
                                                        <input
                                                            type="text"
                                                            placeholder="رسالة لولي الأمر..."
                                                            value={log.notes || ''}
                                                            onChange={e => handleUpdateField(student.studentId, 'notes', e.target.value)}
                                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs outline-none focus:border-blue-500"
                                                        />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="bg-slate-100 border-2 border-dashed border-slate-300 rounded-[2rem] p-12 text-center text-slate-500 animate-pulse-slow">
                        <AlertCircle size={48} className="mx-auto mb-4 opacity-50" />
                        <h3 className="text-xl font-bold mb-2">يرجى استكمال البيانات بالأعلى</h3>
                        <p>اختر الصف، الفصل، واكتب اسم المادة لعرض كشف الطلاب والبدء في الرصد.</p>
                    </div>
                )}
            </main>
        </div>
    );
};

export default Teacher;
