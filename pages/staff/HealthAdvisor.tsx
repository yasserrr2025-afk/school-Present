import React, { useState, useEffect, useRef } from 'react';
import { getStudents, getClinicVisits, addClinicVisit } from '../../services/storage';
import { Student, ClinicVisit } from '../../types';
import { Activity, Search, ShieldAlert, HeartPulse, Stethoscope, Loader2, Hospital, Printer, CheckCircle } from 'lucide-react';
import { PrintReport, triggerPrint } from '../../components/PrintReport';

const HealthAdvisor: React.FC = () => {
    const [students, setStudents] = useState<Student[]>([]);
    const [visits, setVisits] = useState<ClinicVisit[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    const [showModal, setShowModal] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

    const [form, setForm] = useState({
        symptoms: '',
        actionTaken: '',
        sentHome: false,
        notes: ''
    });

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const data = await getStudents();
            setStudents(data);
            const vData = await getClinicVisits();
            setVisits(vData);
            setLoading(false);
        };
        load();
    }, []);

    const handleOpenModal = (student: Student) => {
        setSelectedStudent(student);
        setForm({
            symptoms: '',
            actionTaken: '',
            sentHome: false,
            notes: ''
        });
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStudent || !form.symptoms || !form.actionTaken) return;

        const visit: ClinicVisit = {
            id: crypto.randomUUID(),
            studentId: selectedStudent.studentId,
            studentName: selectedStudent.name,
            grade: selectedStudent.grade,
            className: selectedStudent.className,
            date: new Date().toISOString().split('T')[0],
            symptoms: form.symptoms,
            actionTaken: form.actionTaken,
            sentHome: form.sentHome,
            notes: form.notes,
            createdAt: new Date().toISOString()
        };

        setVisits([visit, ...visits]);
        setShowModal(false);

        try {
            await addClinicVisit(visit);
            alert(form.sentHome ? "تم تسجيل الزيارة وتوجيه عذر طبي وتصريح خروج تلقائياً!" : "تم تسجيل زيارة العيادة بنجاح.");
        } catch (error) {
            console.error(error);
            alert("حدث خطأ أثناء التسجيل.");
        }
    };

    // Each visit has its own print div ID
    const [printVisit, setPrintVisit] = useState<ClinicVisit | null>(null);

    const handlePrint = (visit: ClinicVisit) => {
        setPrintVisit(visit);
        setTimeout(() => triggerPrint('health-single-visit', () => setPrintVisit(null)), 100);
    };

    const handlePrintDailyReport = () => {
        const today = new Date().toISOString().split('T')[0];
        triggerPrint('health-daily-report');
    };

    const filteredStudents = students.filter(s =>
        s.name.includes(searchTerm) || s.studentId.includes(searchTerm)
    );

    return (
        <div className="space-y-6 pb-12 animate-fade-in" dir="rtl">

            {/* ====== PRINT: Single Visit Report ====== */}
            {printVisit && (
                <PrintReport
                    id="health-single-visit"
                    title="تقرير زيارة العيادة المدرسية"
                    subTitle={`طالب: ${printVisit.studentName} | ${printVisit.grade} - ${printVisit.className}`}
                    date={printVisit.date}
                    columns={[
                        { key: 'studentName', label: 'اسم الطالب' },
                        { key: 'grade', label: 'الصف', width: '80px' },
                        { key: 'symptoms', label: 'الأعراض' },
                        { key: 'actionTaken', label: 'الإجراء المتخذ' },
                        { key: 'notes', label: 'الملاحظات' },
                        { key: 'sentHome', label: 'تحويل للمنزل', width: '100px', render: (row) => row.sentHome ? 'نعم ⚠️' : 'لا' },
                    ]}
                    data={[printVisit]}
                    department="العيادة المدرسية - الموجه الصحي"
                    footerNote="توقيع الموجه الصحي: ...................."
                />
            )}

            {/* ====== PRINT: Daily Clinic Report ====== */}
            <PrintReport
                id="health-daily-report"
                title="تقرير العيادة المدرسية اليومي"
                date={new Date().toLocaleDateString('ar-SA')}
                stats={[
                    { label: 'محوّلون للمنزل', value: visits.filter(v => v.date === new Date().toISOString().split('T')[0] && v.sentHome).length },
                    { label: 'مراجعات اليوم', value: visits.filter(v => v.date === new Date().toISOString().split('T')[0]).length },
                ]}
                columns={[
                    { key: 'studentName', label: 'اسم الطالب' },
                    { key: 'grade', label: 'الصف', width: '70px' },
                    { key: 'className', label: 'الفصل', width: '70px' },
                    { key: 'symptoms', label: 'الأعراض' },
                    { key: 'actionTaken', label: 'الإجراء' },
                    { key: 'sentHome', label: 'تحويل', width: '70px', render: (row) => row.sentHome ? '✓ نعم' : 'لا' },
                ]}
                data={visits.filter(v => v.date === new Date().toISOString().split('T')[0])}
                department="العيادة المدرسية"
            />

            {/* Header */}
            <div className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
                <div className="absolute left-0 top-0 w-32 h-32 bg-emerald-50 rounded-full blur-3xl -z-10 -translate-x-1/2 -translate-y-1/2"></div>
                <div>
                    <h1 className="text-2xl font-extrabold text-emerald-900 flex items-center gap-2">
                        <Hospital className="text-emerald-500" size={26} />
                        العيادة المدرسية
                    </h1>
                    <p className="text-slate-500 mt-1 text-sm">إدارة الحالات الصحية للطلاب، وتسجيل الزيارات، والتوجيه للراحة.</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative flex-1">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="بحث عن طالب برقم الهوية أو الاسم..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pr-10 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 outline-none text-sm font-bold text-slate-700 transition-all font-mono"
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Students Search Results */}
                <div className="lg:col-span-1 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col h-[600px]">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50 rounded-t-3xl">
                        <h2 className="font-extrabold text-slate-800 text-sm flex items-center gap-2"><Search size={16} /> نتائج البحث السريع</h2>
                    </div>
                    <div className="p-4 flex-1 overflow-y-auto space-y-2 custom-scrollbar">
                        {loading ? (
                            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-emerald-500" size={24} /></div>
                        ) : filteredStudents.slice(0, 10).map(student => (
                            <div key={student.id} className="p-3 rounded-2xl border border-slate-100 hover:border-emerald-300 hover:shadow-md transition-all bg-white group cursor-pointer flex justify-between items-center" onClick={() => handleOpenModal(student)}>
                                <div>
                                    <h3 className="font-bold text-sm text-slate-800 group-hover:text-emerald-700">{student.name}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[10px] text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded-lg">{student.studentId}</span>
                                        <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg font-bold">{student.grade}</span>
                                    </div>
                                </div>
                                <Activity className="text-slate-300 group-hover:text-emerald-500 transition-colors" size={18} />
                            </div>
                        ))}
                        {filteredStudents.length === 0 && <p className="text-center text-slate-400 text-sm py-10 font-bold">لا يوجد نتائج</p>}
                    </div>
                </div>

                {/* Recent Clinic Visits */}
                <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col h-[600px]">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50 rounded-t-3xl flex justify-between items-center">
                        <h2 className="font-extrabold text-slate-800 text-sm flex items-center gap-2"><Stethoscope size={16} className="text-emerald-500" /> سجل زيارات العيادة الأحدث</h2>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full">{visits.length} زيارة</span>
                            <button onClick={handlePrintDailyReport} className="bg-emerald-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-700">
                                <Printer size={13} /> تقرير اليوم
                            </button>
                        </div>
                    </div>
                    <div className="p-4 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                        {visits.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full opacity-50 text-slate-400">
                                <HeartPulse size={48} className="mb-2" />
                                <p className="font-bold">السجل فارغ. ابحث عن طالب لتسجيل حالة.</p>
                            </div>
                        ) : (
                            visits.map((visit, idx) => (
                                <div key={visit.id || idx} className="bg-white border text-right border-slate-100 hover:border-slate-300 transition-colors p-4 rounded-2xl shadow-sm group relative">
                                    {visit.sentHome && <div className="absolute top-0 right-0 w-2 h-full bg-red-400 rounded-r-2xl"></div>}

                                    <div className="flex justify-between items-start mb-3 pl-2">
                                        <div>
                                            <h3 className="font-exrabold text-slate-800 text-sm">{visit.studentName}</h3>
                                            <span className="text-[10px] text-slate-400 font-mono mt-0.5 inline-block">{visit.studentId} • {visit.date}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {visit.sentHome && (
                                                <span className="bg-red-50 text-red-600 text-[10px] font-extrabold px-2 py-1 rounded-lg border border-red-100 flex items-center gap-1">
                                                    <ShieldAlert size={10} /> تحويل للمنزل
                                                </span>
                                            )}
                                            <button onClick={() => handlePrint(visit)} className="text-slate-400 hover:text-blue-600 bg-slate-50 p-1.5 rounded-lg border border-slate-200 hover:border-blue-200 transition-colors" title="طباعة التقرير">
                                                <Printer size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 bg-slate-50/50 p-3 rounded-xl border border-slate-50">
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 mb-1">الأعراض</p>
                                            <p className="text-xs text-slate-700 font-medium break-words leading-relaxed">{visit.symptoms}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 mb-1">الإجراء</p>
                                            <p className="text-xs text-emerald-800 font-bold bg-emerald-50 px-2 py-1 rounded border border-emerald-100 line-clamp-2" title={visit.actionTaken}>{visit.actionTaken}</p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Clinic Entry Modal */}
            {showModal && selectedStudent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up border border-slate-200">
                        <div className="p-6 border-b border-slate-100 bg-emerald-50 flex justify-between items-center">
                            <div>
                                <h3 className="font-extrabold text-emerald-900 text-lg flex items-center gap-2">تسجيل مراجعة عيادة</h3>
                                <p className="text-xs text-emerald-700 font-bold bg-emerald-100 w-fit px-2 py-0.5 rounded mt-1">{selectedStudent.name}</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="bg-white text-emerald-600 p-2 rounded-full shadow-sm hover:bg-emerald-100 transition-colors"><Hospital size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            <div>
                                <label className="text-xs font-bold text-slate-500 block mb-2">الأعراض والشكوى</label>
                                <textarea required value={form.symptoms} onChange={e => setForm({ ...form, symptoms: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all text-sm resize-none h-24" placeholder="مثال: صداع نصفي، ارتفاع في درجة الحرارة..." />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 block mb-2">الإجراء المتخذ (العلاج)</label>
                                <input required type="text" value={form.actionTaken} onChange={e => setForm({ ...form, actionTaken: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all text-sm font-bold" placeholder="مثال: إعطاء مسكن وقياس الحرارة" />
                            </div>
                            <div className="flex items-center gap-3 p-4 border border-rose-100 bg-rose-50/50 rounded-2xl cursor-pointer hover:bg-rose-50 transition-colors" onClick={() => setForm({ ...form, sentHome: !form.sentHome })}>
                                <div className={`w-6 h-6 rounded flex items-center justify-center border-2 transition-colors ${form.sentHome ? 'bg-rose-500 border-rose-500 text-white' : 'border-slate-300 bg-white'}`}>
                                    {form.sentHome && <CheckCircle size={14} />}
                                </div>
                                <div className="flex-1">
                                    <p className="font-extrabold text-sm text-rose-900">تحويل الطالب للمنزل (إرسال للراحة)</p>
                                    <p className="text-[10px] text-rose-700 mt-0.5 font-bold">تفعيل هذا الخيار سيقوم بإصدار عذر طارئ وتصريح خروج آلياً للبوابة.</p>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 block mb-2">ملاحظات إضافية</label>
                                <input type="text" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all text-sm" placeholder="اختياري..." />
                            </div>
                            <div className="pt-2 flex gap-3">
                                <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3.5 rounded-2xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95">حفظ وتوثيق الحالة</button>
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3.5 rounded-2xl transition-all">إلغاء</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HealthAdvisor;
