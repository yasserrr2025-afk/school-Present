import React, { useState, useEffect, useMemo } from 'react';
import { getActivities, addActivity, getActivityApprovals, getStudents } from '../../services/storage';
import { Student, ActivityPermission, ActivityApproval } from '../../types';
import { Ticket, Search, CheckCircle, XCircle, Printer, Loader2, Plus, Calendar, MapPin, Users, Info, Award, Lightbulb, Clock, AlertCircle, Send, ArrowRight } from 'lucide-react';

const ActivityCoordinator: React.FC = () => {
    const [activities, setActivities] = useState<ActivityPermission[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);

    const [activeTab, setActiveTab] = useState<'trip' | 'competition' | 'awareness'>('trip');
    const [showModal, setShowModal] = useState(false);
    const [selectedActivity, setSelectedActivity] = useState<ActivityPermission | null>(null);
    const [approvals, setApprovals] = useState<ActivityApproval[]>([]);
    const [loadingApprovals, setLoadingApprovals] = useState(false);

    const [form, setForm] = useState({
        title: '',
        description: '',
        date: '',
        type: 'trip' as 'trip' | 'competition' | 'awareness',
        targetGrades: [] as string[],
        targetClasses: [] as string[],
        cost: 0
    });

    const [availableGrades, setAvailableGrades] = useState<string[]>([]);
    const [availableClasses, setAvailableClasses] = useState<string[]>([]);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const acts = await getActivities();
            setActivities(acts);
            const stds = await getStudents();
            setStudents(stds);

            const grades = Array.from(new Set(stds.map(s => s.grade)));
            const classes = Array.from(new Set(stds.map(s => s.className)));
            setAvailableGrades(grades);
            setAvailableClasses(classes);

            setLoading(false);
        };
        load();
    }, []);

    const filteredActivities = useMemo(() => {
        return activities.filter(a => a.type === activeTab);
    }, [activities, activeTab]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const act: ActivityPermission = {
            id: crypto.randomUUID(),
            title: form.title,
            description: form.description,
            date: form.date,
            type: form.type,
            targetGrades: form.targetGrades,
            targetClasses: form.targetClasses,
            cost: form.cost,
            status: 'active',
            approvalStatus: 'pending_admin',
            sentToParents: false,
            createdBy: 'رائد النشاط',
            createdAt: new Date().toISOString()
        };

        try {
            await addActivity(act);
            setActivities([act, ...activities]);
            setShowModal(false);
            setForm({ title: '', description: '', date: '', type: 'trip', targetGrades: [], targetClasses: [], cost: 0 });
            alert('تم إرسال النشاط للمدير للاعتماد. سيصلك إشعار فور الاعتماد.');
        } catch (error) {
            console.error(error);
            alert("حدث خطأ.");
        }
    };

    const handleViewActivity = async (act: ActivityPermission) => {
        setSelectedActivity(act);
        if (act.approvalStatus === 'approved') {
            setLoadingApprovals(true);
            const apps = await getActivityApprovals(act.id);
            setApprovals(apps);
            setLoadingApprovals(false);
        } else {
            setApprovals([]);
        }
    };

    const handlePrintRecord = () => {
        if (!selectedActivity) return;
        const printWindow = window.open('', '', 'width=800,height=800');
        if (!printWindow) return alert('يرجى السماح بالنوافذ المنبثقة');

        const approvedList = approvals.filter(a => a.status === 'approved');

        const html = `
      <html dir="rtl">
        <head>
          <title>سجل الموافقات - ${selectedActivity.title}</title>
          <style>
            body { font-family: 'Arial', sans-serif; padding: 40px; color: #333; }
            .header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
            h1 { color: #1e3a8a; margin: 0; font-size: 24px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ccc; padding: 10px; text-align: right; }
            th { background-color: #f8fafc; font-weight: bold; }
            .footer { margin-top: 50px; display: flex; justify-content: space-between; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>سجل الموافقات للفعالية / البرنامج</h1>
            <p>اسم الفعالية: ${selectedActivity.title}</p>
            <p>تاريخ الانعقاد: ${selectedActivity.date}</p>
            <p>عدد الطلاب الموافق عليهم: ${approvedList.length}</p>
          </div>
          
          <table>
            <thead>
                <tr>
                    <th>م</th>
                    <th>اسم الطالب</th>
                    <th>الصف والفصل</th>
                    <th>حالة الموافقة</th>
                    <th>تاريخ الموافقة</th>
                </tr>
            </thead>
            <tbody>
                ${approvedList.map((a, i) => `
                    <tr>
                        <td>${i + 1}</td>
                        <td>${a.studentName}</td>
                        <td>${a.grade} - ${a.className}</td>
                        <td style="color: green; font-weight: bold;">موافق</td>
                        <td>${new Date(a.updatedAt).toLocaleDateString('ar-SA')}</td>
                    </tr>
                `).join('')}
            </tbody>
          </table>

          <div class="footer">
            <div>رائد النشاط:<br>....................</div>
            <div>اعتماد الإدارة:<br>....................</div>
          </div>

          <script>
            window.onload = () => { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `;
        printWindow.document.write(html);
        printWindow.document.close();
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending_admin': return <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1"><Clock size={10} /> في انتظار المدير</span>;
            case 'approved': return <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1"><CheckCircle size={10} /> معتمد</span>;
            case 'returned': return <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1"><AlertCircle size={10} /> ملاحظات المدير</span>;
            default: return null;
        }
    };

    return (
        <div className="space-y-6 pb-12 animate-fade-in">
            {/* Header */}
            <div className="bg-gradient-to-l from-indigo-900 to-indigo-700 rounded-3xl p-8 border border-indigo-500 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden text-white">
                <div className="absolute left-[-10%] top-[-50%] w-64 h-64 bg-indigo-500 rounded-full blur-3xl opacity-50 z-0"></div>
                <div className="relative z-10 flex-1">
                    <h1 className="text-2xl font-extrabold flex items-center gap-2 mb-2">
                        <Award className="text-amber-400" size={28} />
                        النشاط الطلابي والبرامج - رائد النشاط
                    </h1>
                    <p className="text-indigo-200 text-sm">سجل المسابقات والبرامج التوعوية، وتابع اعتمادها من المدير ونشرها لأولياء الأمور.</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="relative z-10 bg-amber-500 hover:bg-amber-600 text-indigo-900 px-6 py-3 rounded-2xl font-bold shadow-lg flex items-center gap-2 transition-all w-full md:w-auto justify-center"
                >
                    <Plus size={20} /> تسجيل برنامج جديد
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {[
                    { id: 'trip', label: 'الرحلات والزيارات', icon: MapPin },
                    { id: 'competition', label: 'المسابقات الطلابية', icon: Award },
                    { id: 'awareness', label: 'البرامج التوعوية', icon: Lightbulb },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all whitespace-nowrap border-2 ${activeTab === tab.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200' : 'bg-white text-slate-500 border-transparent hover:bg-slate-50'}`}
                    >
                        <tab.icon size={18} />
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Activities List */}
                <div className="lg:col-span-1 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col h-[600px]">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50 rounded-t-3xl">
                        <h2 className="font-extrabold text-slate-800 text-sm flex items-center gap-2"><Calendar size={18} className="text-indigo-500" /> قائمة البرامج</h2>
                    </div>
                    <div className="p-4 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                        {loading ? (
                            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-indigo-500" /></div>
                        ) : filteredActivities.length === 0 ? (
                            <div className="text-center py-10 space-y-2 opacity-40">
                                <Ticket size={48} className="mx-auto" />
                                <p className="font-bold">لا توجد سجلات في هذا القسم</p>
                            </div>
                        ) : filteredActivities.map(act => (
                            <div
                                key={act.id}
                                onClick={() => handleViewActivity(act)}
                                className={`p-4 rounded-2xl border cursor-pointer transition-all ${selectedActivity?.id === act.id ? 'border-indigo-500 bg-indigo-50/50 shadow-md' : 'border-slate-100 bg-white hover:border-indigo-300'}`}
                            >
                                <div className="flex justify-between items-start mb-2 gap-2">
                                    <h3 className="font-bold text-slate-800 text-sm flex-1">{act.title}</h3>
                                    <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-lg shrink-0">{act.date}</span>
                                </div>
                                <div className="flex justify-between items-center mt-2">
                                    {getStatusBadge(act.approvalStatus)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Details Area */}
                <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col h-[600px] overflow-hidden">
                    {selectedActivity ? (
                        <>
                            <div className="p-6 border-b border-slate-100 bg-slate-50/80">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h2 className="font-extrabold text-slate-900 text-lg">{selectedActivity.title}</h2>
                                            {getStatusBadge(selectedActivity.approvalStatus)}
                                        </div>
                                        <div className="flex items-center gap-3 text-sm text-slate-500 font-bold">
                                            <span className="flex items-center gap-1"><Calendar size={14} /> {selectedActivity.date}</span>
                                            <span className="flex items-center gap-1"><Info size={14} /> التكلفة: {selectedActivity.cost ? `${selectedActivity.cost} ريال` : 'مجانًا'}</span>
                                        </div>
                                    </div>
                                    {selectedActivity.approvalStatus === 'approved' && (
                                        <button
                                            onClick={handlePrintRecord}
                                            className="bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-300 p-2.5 rounded-xl shadow-sm transition-all"
                                            title="طباعة سجل الموافقات"
                                        >
                                            <Printer size={20} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30 custom-scrollbar">
                                {/* Returned Notes */}
                                {selectedActivity.approvalStatus === 'returned' && (
                                    <div className="mb-6 bg-rose-50 border border-rose-100 rounded-2xl p-4 flex items-start gap-3 animate-pulse-subtle">
                                        <AlertCircle className="text-rose-500 shrink-0 mt-0.5" size={20} />
                                        <div>
                                            <h4 className="font-bold text-rose-800 text-sm">ملاحظات المدير:</h4>
                                            <p className="text-rose-700 text-sm mt-1">{selectedActivity.adminNotes || 'يرجى مراجعة التفاصيل وإعادة الإرسال.'}</p>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">وصف البرنامج</h3>
                                        <p className="bg-white p-4 rounded-2xl border border-slate-100 text-slate-700 text-sm leading-relaxed">{selectedActivity.description}</p>
                                    </div>

                                    <div>
                                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">الفئة المستهدفة</h3>
                                        <div className="flex flex-wrap gap-2 text-xs font-bold text-indigo-700">
                                            {selectedActivity.targetGrades.map(g => (
                                                <span key={g} className="bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">{g}</span>
                                            ))}
                                            {selectedActivity.targetGrades.length === 0 && <span className="text-slate-400 italic">كل المدرسة</span>}
                                        </div>
                                    </div>

                                    {selectedActivity.approvalStatus === 'approved' && (
                                        <div>
                                            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><Users size={18} className="text-indigo-500" /> ردود أولياء الأمور</h3>
                                            {loadingApprovals ? (
                                                <div className="flex justify-center p-8"><Loader2 className="animate-spin text-indigo-500" /></div>
                                            ) : approvals.length === 0 ? (
                                                <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-slate-200">
                                                    <p className="text-slate-500 font-bold">في انتظار استلام الردود من أولياء الأمور.</p>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    {approvals.map(app => (
                                                        <div key={app.id} className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center group">
                                                            <div>
                                                                <h4 className="font-bold text-sm text-slate-800">{app.studentName}</h4>
                                                                <p className="text-[10px] text-slate-400 font-mono mt-0.5">{app.className} - {app.grade}</p>
                                                            </div>
                                                            <div>
                                                                {app.status === 'approved' && <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold"><CheckCircle size={12} /> موافق</span>}
                                                                {app.status === 'rejected' && <span className="bg-red-50 text-red-700 border border-red-100 flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold"><XCircle size={12} /> معتذر</span>}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                            <Ticket size={64} className="mb-4 text-slate-300" />
                            <p className="font-bold text-lg">اختر برنامجاً من القائمة لعرض التفاصيل</p>
                        </div>
                    )}
                </div>

            </div>

            {/* Add Activity Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-xl overflow-hidden animate-fade-in-up border border-slate-200">
                        <div className="p-6 border-b border-slate-100 bg-indigo-50 flex justify-between items-center">
                            <h3 className="font-extrabold text-indigo-900 text-lg flex items-center gap-2"><Plus /> تسجيل برنامج / مسابقة جديدة</h3>
                            <button onClick={() => setShowModal(false)} className="bg-white text-indigo-600 p-2 rounded-full shadow-sm hover:bg-indigo-100 transition-colors"><XCircle size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-2xl">
                                {[
                                    { id: 'trip', label: 'رحلة', icon: MapPin },
                                    { id: 'competition', label: 'مسابقة', icon: Award },
                                    { id: 'awareness', label: 'توعية', icon: Lightbulb },
                                ].map(t => (
                                    <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => setForm({ ...form, type: t.id as any })}
                                        className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${form.type === t.id ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        <t.icon size={14} />
                                        {t.label}
                                    </button>
                                ))}
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 block mb-2">عنوان البرنامج أو المسابقة</label>
                                <input required type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 font-bold text-sm" placeholder="مثال: مسابقة حفظ القرآن الكريم" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 block mb-2">تفاصيل البرنامج والأهداف</label>
                                <textarea required value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 font-bold text-sm h-24 resize-none" placeholder="اكتب تفاصيل وقت التنفيذ والهدف من البرنامج..." />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 block mb-2">تاريخ التنفيذ</label>
                                    <input required type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-sm text-center" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 block mb-2">التكلفة (إن وجدت)</label>
                                    <input type="number" min="0" value={form.cost} onChange={e => setForm({ ...form, cost: Number(e.target.value) })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-sm text-center" placeholder="مجاني إذا ترك 0" />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 block mb-2">الصفوف المستهدفة</label>
                                <div className="flex flex-wrap gap-2">
                                    {availableGrades.map(grade => (
                                        <label key={grade} className={`px-3 py-1.5 rounded-lg border cursor-pointer text-sm font-bold transition-all ${form.targetGrades.includes(grade) ? 'bg-indigo-100 border-indigo-500 text-indigo-700' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                                            <input
                                                type="checkbox"
                                                className="hidden"
                                                checked={form.targetGrades.includes(grade)}
                                                onChange={(e) => {
                                                    if (e.target.checked) setForm({ ...form, targetGrades: [...form.targetGrades, grade] });
                                                    else setForm({ ...form, targetGrades: form.targetGrades.filter(g => g !== grade) });
                                                }}
                                            />
                                            {grade}
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3.5 rounded-2xl shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"><Send size={18} /> إرسال للمدير للاعتماد</button>
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3.5 rounded-2xl transition-all">إلغاء</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ActivityCoordinator;
