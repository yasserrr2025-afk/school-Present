/**
 * PrintReport - مكوّن مشترك للتقارير القابلة للطباعة
 * يُستخدم في جميع صفحات النظام لضمان تصميم موحد للتقارير
 */
import React from 'react';

interface PrintColumn {
    key: string;
    label: string;
    render?: (row: any, idx: number) => React.ReactNode;
    width?: string;
}

interface PrintStat {
    label: string;
    value: string | number;
}

interface PrintReportProps {
    id?: string;
    title: string;
    subTitle?: string;
    date?: string;
    stats?: PrintStat[];
    columns: PrintColumn[];
    data: any[];
    emptyMessage?: string;
    footerNote?: string;
    /** department name shown in header left side */
    department?: string;
}

const SCHOOL_NAME = () => localStorage.getItem('school_name') || 'المدرسة';
const SCHOOL_LOGO = () => localStorage.getItem('school_logo') || 'https://www.raed.net/img?id=1471924';

export const PrintReport: React.FC<PrintReportProps> = ({
    id = 'print-report',
    title,
    subTitle,
    date,
    stats = [],
    columns,
    data,
    emptyMessage = 'لا توجد بيانات',
    footerNote,
    department = 'وكالة شؤون الطلاب'
}) => {
    const reportDate = date || new Date().toLocaleDateString('ar-SA');
    const schoolName = SCHOOL_NAME();
    const schoolLogo = SCHOOL_LOGO();

    return (
        <div id={id} className="hidden" dir="rtl" style={{ fontFamily: 'Arial, sans-serif' }}>
            <style>{`
                @media print {
                    body * { visibility: hidden; }
                    #${id}, #${id} * { visibility: visible; }
                    #${id} { position: fixed; left: 0; top: 0; width: 100%; padding: 16px; background: white; z-index: 99999; display: block !important; }
                    .no-print { display: none !important; }
                }
                #${id} table { border-collapse: collapse; width: 100%; }
                #${id} th, #${id} td { border: 1px solid #333; padding: 6px 8px; text-align: right; }
                #${id} thead tr { background-color: #e5e7eb; font-weight: bold; }
                #${id} tbody tr:nth-child(even) { background-color: #f9fafb; }
                #${id} tfoot tr { background-color: #dbeafe; font-weight: bold; }
            `}</style>

            {/* ====== HEADER ====== */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderBottom: '4px solid #1e293b', paddingBottom: '12px', marginBottom: '16px'
            }}>
                {/* Right: School Info */}
                <div style={{ textAlign: 'right', fontSize: '13px', fontWeight: 'bold', lineHeight: '1.8' }}>
                    <div>المملكة العربية السعودية</div>
                    <div>وزارة التعليم</div>
                    <div style={{ fontSize: '15px' }}>{schoolName}</div>
                    <div style={{ fontSize: '12px', color: '#475569' }}>{department}</div>
                </div>

                {/* Center: Logo + Title */}
                <div style={{ textAlign: 'center' }}>
                    <img src={schoolLogo} alt="Logo" style={{ height: '80px', width: 'auto', objectFit: 'contain', display: 'block', margin: '0 auto' }} />
                    <div style={{ fontWeight: '900', fontSize: '17px', marginTop: '8px' }}>{title}</div>
                    {subTitle && <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>{subTitle}</div>}
                </div>

                {/* Left: Date + Stats */}
                <div style={{ textAlign: 'left', fontSize: '12px', fontWeight: 'bold', lineHeight: '1.8' }}>
                    <div>التاريخ: {reportDate}</div>
                    <div>الإجمالي: {data.length}</div>
                    {stats.map((s, i) => (
                        <div key={i}>{s.label}: {s.value}</div>
                    ))}
                </div>
            </div>

            {/* ====== TABLE ====== */}
            {data.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: '14px' }}>
                    {emptyMessage}
                </div>
            ) : (
                <table>
                    <thead>
                        <tr>
                            <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                            {columns.map(col => (
                                <th key={col.key} style={{ width: col.width }}>{col.label}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, idx) => (
                            <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f9fafb' }}>
                                <td style={{ textAlign: 'center', color: '#94a3b8', fontWeight: 'bold' }}>{idx + 1}</td>
                                {columns.map(col => (
                                    <td key={col.key}>
                                        {col.render ? col.render(row, idx) : (row[col.key] ?? '-')}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                    {stats.length > 0 && (
                        <tfoot>
                            <tr>
                                <td colSpan={Math.ceil(columns.length / 2) + 1} style={{ textAlign: 'right' }}>
                                    الإجمالي: {data.length} سجل
                                </td>
                                <td colSpan={Math.floor(columns.length / 2)} style={{ textAlign: 'center' }}>
                                    {stats.map(s => `${s.label}: ${s.value}`).join(' | ')}
                                </td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            )}

            {/* ====== FOOTER ====== */}
            <div style={{
                marginTop: '24px', paddingTop: '12px',
                borderTop: '1px solid #e2e8f0',
                display: 'flex', justifyContent: 'space-between',
                fontSize: '11px', color: '#94a3b8'
            }}>
                <span>طُبع في: {new Date().toLocaleString('ar-SA')}</span>
                {footerNote && <span>{footerNote}</span>}
                <span>النظام الذكي لإدارة المدرسة - {schoolName}</span>
            </div>
        </div>
    );
};

/** Utility: trigger print for a given report div id */
export const triggerPrint = (reportId: string, onDone?: () => void) => {
    const el = document.getElementById(reportId);
    if (!el) return;
    // Temporarily show the element
    el.classList.remove('hidden');
    el.style.display = 'block';
    setTimeout(() => {
        window.print();
        setTimeout(() => {
            el.classList.add('hidden');
            el.style.display = '';
            onDone?.();
        }, 800);
    }, 300);
};

export default PrintReport;
