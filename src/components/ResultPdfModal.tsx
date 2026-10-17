import React from 'react';
import { AttemptRecord, UserProfile, TestDefinition } from '../types';
import { toBengaliNumber } from './ExamInterface';
import { Printer, Download, X, CheckCircle2, XCircle, Award, Calendar, Mail, User, BookOpen } from 'lucide-react';

interface ResultPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  attempt: AttemptRecord;
  student?: UserProfile;
  test?: TestDefinition;
}

export const ResultPdfModal: React.FC<ResultPdfModalProps> = ({
  isOpen,
  onClose,
  attempt,
  student,
  test,
}) => {
  if (!isOpen) return null;

  const studentName = attempt.userName || student?.displayName || student?.email?.split('@')[0] || 'শিক্ষার্থী';
  const studentEmail = attempt.userEmail || student?.email || 'N/A';
  const testTitle = attempt.testTitle || test?.title || 'JFT-Basic Mock Test';
  const examDate = attempt.submittedAt || attempt.startedAt;
  const formattedDate = new Date(examDate).toLocaleString('bn-BD', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const percentage = attempt.totalMarks > 0 ? Math.round((attempt.score / attempt.totalMarks) * 100) : 0;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadHtml = () => {
    const printableElement = document.getElementById('printable-result-sheet');
    if (!printableElement) return;

    const htmlContent = `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <title>JFT-Basic Result - ${studentName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #fff; color: #111; margin: 0; padding: 24px; }
    .sheet { max-width: 800px; margin: 0 auto; border: 2px solid #2563eb; padding: 32px; border-radius: 16px; }
    .header { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 24px; }
    .title { font-size: 24px; font-weight: bold; color: #1e3a8a; margin: 4px 0; }
    .subtitle { font-size: 14px; color: #475569; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; background: #f8fafc; padding: 16px; border-radius: 12px; }
    .info-item { font-size: 14px; }
    .label { font-size: 11px; color: #64748b; font-weight: bold; text-transform: uppercase; }
    .value { font-weight: bold; color: #0f172a; margin-top: 2px; }
    .score-banner { display: flex; justify-content: space-between; align-items: center; background: ${attempt.passed ? '#ecfdf5' : '#fff1f2'}; border: 1px solid ${attempt.passed ? '#a7f3d0' : '#fecdd3'}; padding: 16px 24px; border-radius: 12px; margin-bottom: 24px; }
    .score-num { font-size: 28px; font-weight: 900; color: ${attempt.passed ? '#047857' : '#be123c'}; }
    .status-badge { font-weight: 800; font-size: 16px; color: ${attempt.passed ? '#047857' : '#be123c'}; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
    th { background: #1e293b; color: white; text-align: left; padding: 10px 14px; }
    td { padding: 12px 14px; border-bottom: 1px solid #e2e8f0; }
    tr:nth-child(even) { background: #f8fafc; }
    .footer { margin-top: 36px; padding-top: 20px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: flex-end; font-size: 12px; color: #64748b; }
    .stamp { border: 2px solid #2563eb; color: #2563eb; padding: 6px 12px; font-weight: bold; border-radius: 8px; font-size: 11px; display: inline-block; }
    @media print { body { padding: 0; } .sheet { border: none; padding: 0; } }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <div style="font-size: 12px; font-weight: bold; color: #2563eb; text-transform: uppercase; letter-spacing: 1px;">JFT-Basic 形式 模擬試験 結果通知書</div>
      <div class="title">JFT-Basic Pro মক টেস্ট ফলাফল পত্র</div>
      <div class="subtitle">Official Examination Performance & Category Score Sheet</div>
    </div>

    <div class="info-grid">
      <div class="info-item">
        <div class="label">শিক্ষার্থীর নাম (Student Name)</div>
        <div class="value">${studentName}</div>
      </div>
      <div class="info-item">
        <div class="label">ইমেইল ঠিকানা (Email)</div>
        <div class="value">${studentEmail}</div>
      </div>
      <div class="info-item">
        <div class="label">পরীক্ষার নাম (Exam Title)</div>
        <div class="value">${testTitle}</div>
      </div>
      <div class="info-item">
        <div class="label">পরীক্ষার তারিখ ও সময় (Exam Date)</div>
        <div class="value">${formattedDate}</div>
      </div>
    </div>

    <div class="score-banner">
      <div>
        <div style="font-size: 12px; color: #475569; font-weight: bold;">মোট অর্জিত নম্বর / মোট নম্বর:</div>
        <div class="score-num">${attempt.score} / ${attempt.totalMarks} (${percentage}%)</div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 12px; color: #475569; font-weight: bold;">ফলাফল স্ট্যাটাস:</div>
        <div class="status-badge">${attempt.passed ? 'উত্তীর্ণ (PASSED)' : 'অকৃতকার্য (FAILED)'}</div>
      </div>
    </div>

    <div style="font-size: 15px; font-weight: bold; margin-bottom: 8px; color: #0f172a;">
      ক্যাটাগরিভিত্তিক বিস্তারিত ফলাফল (Category-wise Performance)
    </div>

    <table>
      <thead>
        <tr>
          <th>ক্যাটাগরি / পরীক্ষার বিভাগ</th>
          <th>মোট প্রশ্ন</th>
          <th>সঠিক উত্তর</th>
          <th>প্রাপ্ত নম্বর</th>
          <th>শতাংশ (%)</th>
        </tr>
      </thead>
      <tbody>
        ${(attempt.categoryBreakdown || []).map((cat) => `
          <tr>
            <td><strong>${cat.categoryName}</strong></td>
            <td>${cat.totalQuestions} টি</td>
            <td><strong>${cat.correctCount} টি</strong></td>
            <td><strong>${cat.marksObtained} / ${cat.totalMarks}</strong></td>
            <td><strong>${cat.percentage}%</strong></td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="footer">
      <div>
        <div>ইস্যুকারী: JFT-Basic Pro Administration</div>
        <div>যাচাইকৃত অফিসিয়াল সিস্টেম রিপোর্ট</div>
      </div>
      <div style="text-align: right;">
        <div class="stamp">OFFICIALLY VERIFIED</div>
      </div>
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `JFT_Result_${studentName.replace(/\s+/g, '_')}_${Date.now()}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-6 animate-in fade-in zoom-in-95">
        {/* Top Action Bar (hidden when printing) */}
        <div className="no-print bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Award className="text-amber-400" size={20} />
            <h3 className="text-sm sm:text-base font-bold">শিক্ষার্থীর পরীক্ষার ফলাফল ও PDF রিপোর্ট</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              title="প্রিন্ট বা PDF হিসেবে সেভ করুন"
            >
              <Printer size={15} />
              <span>প্রিন্ট / PDF সেভ</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadHtml}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              title="এইচটিএমএল / PDF ডকুমেন্ট ডাউনলোড করুন"
            >
              <Download size={15} />
              <span>ডাউনলোড</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Result Sheet */}
        <div className="p-6 sm:p-8 max-h-[80vh] overflow-y-auto">
          <div id="printable-result-sheet" className="bg-white text-slate-900 space-y-6">
            {/* Header */}
            <div className="text-center border-b-2 border-slate-200 pb-5 space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-1">
                JFT-Basic 形式 模擬試験 結果通知書
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                JFT-Basic Pro মক টেস্ট ফলাফল পত্র
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Official Examination Score Report & Category Performance Certificate
              </p>
            </div>

            {/* Student & Exam Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
              <div className="space-y-1">
                <span className="text-slate-500 font-semibold text-[11px] block uppercase">শিক্ষার্থীর নাম (Student Name)</span>
                <strong className="text-slate-900 text-sm font-bold block">{studentName}</strong>
              </div>
              <div className="space-y-1">
                <span className="text-slate-500 font-semibold text-[11px] block uppercase">ইমেইল ঠিকানা (Email)</span>
                <span className="text-slate-800 font-medium font-mono block">{studentEmail}</span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-500 font-semibold text-[11px] block uppercase">পরীক্ষার নাম (Exam Title)</span>
                <strong className="text-indigo-700 text-sm font-bold block">{testTitle}</strong>
              </div>
              <div className="space-y-1">
                <span className="text-slate-500 font-semibold text-[11px] block uppercase">পরীক্ষার তারিখ ও সময় (Date & Time)</span>
                <span className="text-slate-700 font-medium block">{formattedDate}</span>
              </div>
            </div>

            {/* Score Overview Banner */}
            <div
              className={`p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                attempt.passed
                  ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
                  : 'bg-rose-50/90 border-rose-200 text-rose-950'
              }`}
            >
              <div>
                <span className="text-xs font-bold uppercase tracking-wider block opacity-80">
                  মোট প্রাপ্ত নম্বর / সর্বোচ্চ নম্বর
                </span>
                <div className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-0.5">
                  {toBengaliNumber(attempt.score)} / {toBengaliNumber(attempt.totalMarks)}
                  <span className="text-lg font-bold ml-2 opacity-90">({toBengaliNumber(percentage)}%)</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white shadow-xs">
                  {attempt.passed ? (
                    <CheckCircle2 size={24} className="text-emerald-600" />
                  ) : (
                    <XCircle size={24} className="text-rose-600" />
                  )}
                </div>
                <div>
                  <span className="text-[11px] font-bold block opacity-80">ফলাফল মূল্যায়ন</span>
                  <strong className="text-base sm:text-lg font-extrabold block">
                    {attempt.passed ? 'উত্তীর্ণ (PASSED)' : 'অকৃতকার্য (FAILED)'}
                  </strong>
                </div>
              </div>
            </div>

            {/* Category Breakdown Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <span>📊</span>
                  <span>ক্যাটাগরিভিত্তিক বিস্তারিত ফলাফল (Category-wise Performance)</span>
                </h4>
              </div>

              <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-white font-bold">
                      <th className="p-3.5">ক্যাটাগরি / বিভাগ</th>
                      <th className="p-3.5 text-center">মোট প্রশ্ন</th>
                      <th className="p-3.5 text-center">সঠিক উত্তর</th>
                      <th className="p-3.5 text-center">প্রাপ্ত নম্বর</th>
                      <th className="p-3.5 text-center">শতকরা হার (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {attempt.categoryBreakdown && attempt.categoryBreakdown.length > 0 ? (
                      attempt.categoryBreakdown.map((cat, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                          <td className="p-3.5 font-bold text-slate-900">
                            {cat.categoryName}
                          </td>
                          <td className="p-3.5 text-center text-slate-600 font-semibold">
                            {toBengaliNumber(cat.totalQuestions)}টি
                          </td>
                          <td className="p-3.5 text-center font-bold text-emerald-700">
                            {toBengaliNumber(cat.correctCount)}টি
                          </td>
                          <td className="p-3.5 text-center font-extrabold text-slate-900">
                            {toBengaliNumber(cat.marksObtained)} / {toBengaliNumber(cat.totalMarks)}
                          </td>
                          <td className="p-3.5 text-center font-extrabold text-indigo-700">
                            {toBengaliNumber(cat.percentage)}%
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-slate-500">
                          ক্যাটাগরি ভিত্তিক বিস্তারিত তথ্য উপলব্ধ নেই।
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Official Report Footer */}
            <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
              <div className="space-y-0.5 text-center sm:text-left">
                <div className="font-bold text-slate-700">JFT-Basic Pro মক টেস্ট ম্যানেজমেন্ট সিস্টেম</div>
                <div>স্বয়ংক্রিয়ভাবে সংরক্ষিত ও সত্যায়িত পরীক্ষার ফলাফল রেকর্ড</div>
              </div>
              <div className="border-2 border-indigo-600 text-indigo-600 px-3.5 py-1.5 rounded-xl font-mono font-extrabold text-[11px] uppercase tracking-wider text-center">
                OFFICIALLY VERIFIED
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
