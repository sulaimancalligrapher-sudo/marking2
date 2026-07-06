import React, { useState } from 'react';
import { gasApi } from '../api';
import { Settings, Link, CheckCircle, AlertTriangle, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';

interface ConnectionConfigProps {
  onConnected: () => void;
}

export default function ConnectionConfig({ onConnected }: ConnectionConfigProps) {
  const [url, setUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleTestAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setError('يرجى إدخال الرابط أولاً.');
      return;
    }

    setTesting(true);
    setError(null);

    // Temp save to let api use it for test
    gasApi.setConfig(url);

    try {
      const isValid = await gasApi.testConnection(url);
      if (isValid) {
        setSuccess(true);
        setTimeout(() => {
          onConnected();
        }, 1500);
      } else {
        gasApi.clearConfig();
        setError('تعذر الاتصال بالرابط المدخل. تأكد من نشر نص Apps Script كـ Web App مع منح صلاحية الوصول لـ "Anyone".');
      }
    } catch (err: any) {
      gasApi.clearConfig();
      setError('حدث خطأ أثناء محاولة الاتصال: ' + (err.message || 'رابط غير صالح'));
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans" dir="rtl">
      <div className="max-w-2xl mx-auto w-full">
        <div className="text-center mb-8">
          <div className="mx-auto h-16 w-16 bg-emerald-100 flex items-center justify-center rounded-2xl shadow-sm mb-4">
            <Settings className="h-8 w-8 text-emerald-600 animate-spin-slow" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 font-sans">تهيئة الاتصال بقاعدة البيانات</h2>
          <p className="mt-2 text-sm text-slate-600">
            يرجى ربط واجهة الويب بـ Google Sheets عبر رابط Google Apps Script Web App الخاص بك
          </p>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-slate-100 sm:px-10"
        >
          <form className="space-y-6" onSubmit={handleTestAndSave}>
            <div>
              <label htmlFor="url" className="block text-sm font-medium text-slate-700 mb-2">
                رابط تطبيق الويب (Google Apps Script Web App URL)
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Link className="h-5 w-5 text-slate-400" aria-hidden="true" />
                </div>
                <input
                  type="url"
                  name="url"
                  id="url"
                  required
                  dir="ltr"
                  placeholder="https://script.google.com/macros/s/.../exec"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="block w-full pr-10 pl-3 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm font-mono placeholder:text-slate-300 text-slate-800 bg-slate-50/50"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-rose-50 p-4 border border-rose-100">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertTriangle className="h-5 w-5 text-rose-600" aria-hidden="true" />
                  </div>
                  <div className="mr-3">
                    <h3 className="text-sm font-medium text-rose-800">فشل الاتصال</h3>
                    <div className="mt-2 text-xs text-rose-700 leading-relaxed">{error}</div>
                  </div>
                </div>
              </div>
            )}

            {success && (
              <div className="rounded-lg bg-emerald-50 p-4 border border-emerald-100">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <CheckCircle className="h-5 w-5 text-emerald-600" aria-hidden="true" />
                  </div>
                  <div className="mr-3">
                    <h3 className="text-sm font-medium text-emerald-800">تم الاتصال بنجاح!</h3>
                    <div className="mt-1 text-xs text-emerald-700">جاري توجيهك إلى صفحة تسجيل الدخول...</div>
                  </div>
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={testing || success}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all duration-150"
              >
                {testing ? 'جاري التحقق من الاتصال...' : 'حفظ واختبار الاتصال'}
              </button>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">خطوات الحصول على الرابط:</h3>
            <ol className="list-decimal list-inside text-xs text-slate-600 space-y-2 leading-relaxed">
              <li>افتح ملف الـ <strong className="text-emerald-700">Google Sheet</strong> الخاص بك.</li>
              <li>اضغط على <strong className="text-slate-800">Extensions (الإضافات)</strong> ثم اختر <strong className="text-slate-800">Apps Script</strong>.</li>
              <li>انسخ كود الـ Backend البرمجي المكتوب بالأسفل بالكامل وضعه في محرر Apps Script.</li>
              <li>اضغط على <strong className="text-emerald-600 font-bold">Deploy (نشر)</strong> ثم <strong className="text-slate-800">New deployment (نشر جديد)</strong>.</li>
              <li>اختر نوع النشر <strong className="text-slate-800">Web app</strong>.</li>
              <li>اضبط الإعدادات:
                <ul className="list-disc list-inside mr-4 mt-1 space-y-1 text-slate-500">
                  <li>Execute as: <strong className="text-slate-700">Me (بريدي الإلكتروني)</strong></li>
                  <li>Who has access: <strong className="text-slate-700">Anyone (أي شخص)</strong></li>
                </ul>
              </li>
              <li>اضغط <strong className="text-emerald-600 font-bold">Deploy</strong>، وامنح الصلاحيات المطلوبة، ثم انسخ <strong className="text-emerald-700 font-bold">Web app URL</strong> وضعه في الحقل أعلاه.</li>
            </ol>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
