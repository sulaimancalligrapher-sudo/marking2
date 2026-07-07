import React, { useState, useEffect } from 'react';
import { gasApi } from '../api';
import { StudentSubmission, InitialData } from '../types';
import {
  Search,
  Filter,
  CheckCircle,
  Clock,
  LogOut,
  RefreshCw,
  Image as ImageIcon,
  Volume2,
  Lock,
  Compass,
  Layers,
  Facebook,
  Instagram,
  Youtube,
  MessageSquare
} from 'lucide-react';
import { motion } from 'motion/react';

interface DashboardProps {
  username: string;
  onSelectSubmission: (submission: StudentSubmission) => void;
  onLogout: () => void;
}

export default function Dashboard({ username, onSelectSubmission, onLogout }: DashboardProps) {
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'new' | 'completed' | 'all'>('new');
  const [typeFilter, setTypeFilter] = useState<'all' | 'image' | 'audio'>('all');
  const [initialData, setInitialData] = useState<InitialData | null>(null);

  useEffect(() => {
    fetchInitialInfo();
    fetchData();
  }, []);

  const fetchInitialInfo = async () => {
    try {
      const data = await gasApi.getInitialData();
      setInitialData(data);
    } catch (e) {
      console.error('Failed to load profile/contact info', e);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await gasApi.getTableData();
      setSubmissions(data);
    } catch (err: any) {
      setError(err.message || 'فشل جلب بيانات الواجبات من السيرفر.');
    } finally {
      setLoading(false);
    }
  };

  const filteredSubmissions = submissions.filter((sub) => {
    const term = search.toLowerCase();
    const matchesSearch =
      sub.studentId.toString().toLowerCase().includes(term) ||
      sub.studentName.toLowerCase().includes(term) ||
      sub.lessonNumber.toString().toLowerCase().includes(term);

    const matchesType =
      typeFilter === 'all' ||
      (typeFilter === 'image' && !!sub.imageFileId) ||
      (typeFilter === 'audio' && !sub.imageFileId);

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'new' && !sub.isSaved) ||
      (statusFilter === 'completed' && sub.isSaved);

    return matchesSearch && matchesType && matchesStatus;
  });

  const pendingCount = submissions.filter((s) => !s.isSaved).length;
  const completedCount = submissions.filter((s) => s.isSaved).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800" dir="rtl">
      {/* Header Panel */}
      <header className="bg-slate-900 text-white shadow-xl relative overflow-hidden">
        {/* Abstract Background Accents */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500" />
        <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-slate-800/20 blur-2xl" />
        <div className="absolute -left-12 -bottom-12 h-44 w-44 rounded-full bg-emerald-500/10 blur-2xl" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 relative z-10">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-4 text-center sm:text-right">
              {initialData?.profile.logoUrl ? (
                <img
                  src={initialData.profile.logoUrl}
                  alt="شعار"
                  className="h-16 w-16 rounded-2xl bg-white/10 p-1 object-contain border border-white/20 shadow-lg"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="h-16 w-16 rounded-2xl bg-emerald-600 flex items-center justify-center font-bold text-2xl text-white shadow-lg">
                  ك
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  {initialData?.profile.title || 'تصحيح الدروس والواجبات'}
                </h1>
                <p className="text-slate-400 text-sm mt-1">
                  {initialData?.profile.subtitle || 'منصة المعلم الذكية للمتابعة والتصحيح'}
                </p>
              </div>
            </div>

            {/* Authenticated User Status */}
            <div className="flex items-center gap-4 bg-slate-800/80 backdrop-blur px-5 py-3 rounded-2xl border border-slate-700/50 shadow-md">
              <div className="text-right">
                <span className="text-xs text-slate-400 block font-medium">مرحباً بك، المصحح</span>
                <span className="text-sm font-semibold text-emerald-400 block">{username}</span>
              </div>
              <div className="h-8 w-px bg-slate-700" />
              <button
                onClick={onLogout}
                title="تسجيل الخروج"
                className="p-2 text-slate-300 hover:text-rose-400 hover:bg-slate-700/50 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-rose-500"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* KPI / Dashboard Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
          <motion.div
            whileHover={{ y: -3 }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-150 flex items-center gap-5"
          >
            <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-inner">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">بانتظار التصحيح</span>
              <span className="text-3xl font-extrabold text-slate-800 block mt-1">{loading ? '...' : pendingCount}</span>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ y: -3 }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-150 flex items-center gap-5"
          >
            <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner">
              <CheckCircle className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">تم تصحيحها</span>
              <span className="text-3xl font-extrabold text-slate-800 block mt-1">{loading ? '...' : completedCount}</span>
            </div>
          </motion.div>
        </div>

        {/* Filters and List */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-150 overflow-hidden">
          {/* Action Row */}
          <div className="p-6 border-b border-slate-100 flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-4">
            <div className="relative w-full xl:max-w-xs shadow-inner rounded-xl bg-slate-50/50">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="ابحث برقم الطالب، الاسم، أو رقم الدرس..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="block w-full pr-10 pl-3 py-3 bg-transparent border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl text-sm focus:outline-none placeholder:text-slate-400"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 justify-start xl:justify-end">
              {/* تصفية نوع الدرس بزر دوار أحادي لتوفير المساحة */}
              <button
                onClick={() => {
                  if (typeFilter === 'all') {
                    setTypeFilter('audio');
                  } else if (typeFilter === 'audio') {
                    setTypeFilter('image');
                  } else {
                    setTypeFilter('all');
                  }
                }}
                className="flex items-center justify-center gap-1.5 px-4 py-3 bg-white hover:bg-slate-100 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 transition-all shadow-sm select-none"
                title="تغيير نوع تصفية الواجبات"
              >
                {typeFilter === 'all' && (
                  <>
                    <Layers className="h-4 w-4 text-emerald-600 animate-pulse" />
                    <span>كل</span>
                  </>
                )}
                {typeFilter === 'audio' && (
                  <>
                    <Volume2 className="h-4 w-4 text-blue-500" />
                    <span>صوت</span>
                  </>
                )}
                {typeFilter === 'image' && (
                  <>
                    <ImageIcon className="h-4 w-4 text-purple-500" />
                    <span>صورة</span>
                  </>
                )}
              </button>

              {/* تصفية حالة التصحيح بزر دوار أحادي (جديد، تم، كل) */}
              <button
                onClick={() => {
                  if (statusFilter === 'new') {
                    setStatusFilter('completed');
                  } else if (statusFilter === 'completed') {
                    setStatusFilter('all');
                  } else {
                    setStatusFilter('new');
                  }
                }}
                className="flex items-center justify-center gap-1.5 px-4 py-3 bg-white hover:bg-slate-100 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 transition-all shadow-sm select-none"
                title="تصفية حالة الواجبات"
              >
                {statusFilter === 'new' && (
                  <>
                    <Filter className="h-4 w-4 text-amber-500 animate-pulse" />
                    <span className="text-amber-700 font-extrabold">جديد</span>
                  </>
                )}
                {statusFilter === 'completed' && (
                  <>
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                    <span className="text-emerald-700">تم</span>
                  </>
                )}
                {statusFilter === 'all' && (
                  <>
                    <Layers className="h-4 w-4 text-slate-500" />
                    <span className="text-slate-700">كل</span>
                  </>
                )}
              </button>

              <button
                onClick={fetchData}
                disabled={loading}
                title="إعادة تحميل"
                className="p-3 border border-slate-200 hover:border-slate-300 rounded-xl hover:bg-slate-50 text-slate-600 transition-all focus:outline-none self-stretch sm:self-auto flex items-center justify-center bg-white shadow-sm"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Submissions Data Presentation */}
          {loading ? (
            <div className="py-24 text-center">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-slate-200 border-t-emerald-600 mb-4" />
              <p className="text-sm font-medium text-slate-500">جاري سحب بيانات الطلاب والدروس المرسلة...</p>
            </div>
          ) : error ? (
            <div className="py-20 px-6 text-center max-w-md mx-auto">
              <div className="h-14 w-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Lock className="h-7 w-7" />
              </div>
              <h3 className="text-base font-bold text-slate-800">تعذر سحب البيانات</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">{error}</p>
              <button
                onClick={fetchData}
                className="mt-5 inline-flex items-center gap-2 py-2.5 px-5 bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white rounded-xl shadow transition-all focus:outline-none"
              >
                <RefreshCw className="h-3.5 w-3.5" /> إعادة المحاولة
              </button>
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="py-24 text-center max-w-sm mx-auto">
              <div className="h-16 w-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
                <CheckCircle className="h-8 w-8 text-emerald-500" />
              </div>
              <h3 className="text-base font-bold text-slate-800">لا يوجد دروس معلقة</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                رائع! تم الانتهاء من جميع الواجبات الواردة أو لم يتم العثور على نتائج مطابقة لبحثك.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
                      <th className="py-4 px-6">رقم الطالب</th>
                      <th className="py-4 px-6">اسم الطالب</th>
                      <th className="py-4 px-6">رقم الدرس</th>
                      <th className="py-4 px-6">عدد الإرسالات</th>
                      <th className="py-4 px-6">نوع الملف</th>
                      <th className="py-4 px-6">حالة الحفظ</th>
                      <th className="py-4 px-6 text-left">التصحيح</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredSubmissions.map((sub, idx) => {
                      const isImage = !!sub.imageFileId;
                      return (
                        <tr
                          key={sub.row + '-' + idx}
                          className={`hover:bg-slate-50/50 transition-colors ${
                            sub.isSaved ? 'bg-emerald-50/20' : ''
                          }`}
                        >
                          <td className="py-4 px-6 font-mono font-bold text-slate-700">{sub.studentId}</td>
                          <td className="py-4 px-6 font-bold text-slate-950">{sub.studentName}</td>
                          <td className="py-4 px-6 font-semibold text-slate-600">درس {sub.lessonNumber}</td>
                          <td className="py-4 px-6">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                              {isImage ? sub.imageSubmissionCount : sub.audioSubmissionCount} مرات إرسال
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            {isImage ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                <ImageIcon className="h-3.5 w-3.5" /> صورة
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-100">
                                <Volume2 className="h-3.5 w-3.5" /> ملف صوتي
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-6">
                            {sub.isSaved ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800">
                                <CheckCircle className="h-3.5 w-3.5" /> مصحح ومحفوظ
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-800">
                                <Clock className="h-3.5 w-3.5" /> بانتظار المراجعة
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-6 text-left">
                            <button
                              onClick={() => onSelectSubmission(sub)}
                              className={`inline-flex items-center justify-center font-bold px-5 py-2.5 rounded-xl shadow-sm text-xs transition-all focus:outline-none ${
                                sub.isSaved
                                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/10'
                              }`}
                            >
                              {sub.isSaved ? 'تعديل التصحيح' : 'تصحيح الدرس'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile View / Responsive Cards */}
              <div className="lg:hidden p-4 space-y-4">
                {filteredSubmissions.map((sub, idx) => {
                  const isImage = !!sub.imageFileId;
                  return (
                    <div
                      key={'mob-' + sub.row + '-' + idx}
                      className={`bg-white rounded-2xl p-5 border border-slate-150 shadow-sm relative overflow-hidden transition-all ${
                        sub.isSaved ? 'bg-emerald-50/10' : ''
                      }`}
                    >
                      {/* Ribbon / Status border */}
                      <div
                        className={`absolute top-0 right-0 left-0 h-1 ${
                          sub.isSaved ? 'bg-emerald-500' : 'bg-amber-400'
                        }`}
                      />

                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <span className="text-xs font-mono font-bold text-slate-400">طالب #{sub.studentId}</span>
                          <h4 className="text-base font-bold text-slate-900 mt-1">{sub.studentName}</h4>
                        </div>
                        {isImage ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700">
                            <ImageIcon className="h-3 w-3" /> صورة
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold bg-sky-50 text-sky-700">
                            <Volume2 className="h-3 w-3" /> صوت
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 justify-between text-xs text-slate-500 mt-4 pt-3 border-t border-slate-50">
                        <div>
                          <span className="block text-slate-400 text-[10px]">الواجب المرسل</span>
                          <span className="font-bold text-slate-700 block">درس {sub.lessonNumber}</span>
                        </div>
                        <div>
                          <span className="block text-slate-400 text-[10px]">عدد المحاولات</span>
                          <span className="font-bold text-slate-700 block">
                            {isImage ? sub.imageSubmissionCount : sub.audioSubmissionCount} مرات
                          </span>
                        </div>
                        <div>
                          <span className="block text-slate-400 text-[10px]">الحالة</span>
                          {sub.isSaved ? (
                            <span className="text-emerald-600 font-bold block mt-0.5">مصحح ✅</span>
                          ) : (
                            <span className="text-amber-600 font-bold block mt-0.5">معلق ⏳</span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => onSelectSubmission(sub)}
                        className={`w-full mt-5 py-3 px-4 rounded-xl font-bold text-xs shadow-sm transition-all text-center focus:outline-none ${
                          sub.isSaved
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        }`}
                      >
                        {sub.isSaved ? 'تعديل التصحيح' : 'ابدأ التصحيح'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </main>

      {/* Footer & Social Media Panels */}
      <footer className="bg-slate-900 border-t border-slate-800 text-white py-12 mt-auto" dir="rtl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-right">
              <h3 className="text-base font-bold text-white">منصة تصحيح الواجبات التعليمية</h3>
              <p className="text-slate-400 text-xs mt-1">
                جميع الحقوق محفوظة © {new Date().getFullYear()} – تم التطوير بكل حب لدعم المعلمين والطلاب.
              </p>
            </div>

            {/* Social icons */}
            {initialData?.social && (
              <div className="flex items-center gap-3">
                {initialData.social.facebook && (
                  <a
                    href={initialData.social.facebook}
                    target="_blank"
                    rel="noreferrer"
                    className="p-3 bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white rounded-full shadow-md hover:scale-105 transition-all"
                  >
                    <Facebook className="h-5 w-5" />
                  </a>
                )}
                {initialData.social.instagram && (
                  <a
                    href={initialData.social.instagram}
                    target="_blank"
                    rel="noreferrer"
                    className="p-3 bg-slate-800 hover:bg-pink-600 text-slate-300 hover:text-white rounded-full shadow-md hover:scale-105 transition-all"
                  >
                    <Instagram className="h-5 w-5" />
                  </a>
                )}
                {initialData.social.youtube && (
                  <a
                    href={initialData.social.youtube}
                    target="_blank"
                    rel="noreferrer"
                    className="p-3 bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white rounded-full shadow-md hover:scale-105 transition-all"
                  >
                    <Youtube className="h-5 w-5" />
                  </a>
                )}
                {initialData.social.line && (
                  <a
                    href={initialData.social.line}
                    target="_blank"
                    rel="noreferrer"
                    className="p-3 bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white rounded-full shadow-md hover:scale-105 transition-all"
                  >
                    <MessageSquare className="h-5 w-5" />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
