import React, { useState, useEffect } from 'react';
import { gasApi } from '../api';
import { User } from '../types';
import { ShieldCheck, User as UserIcon, Lock, ArrowLeftRight, HelpCircle, MapPin, Eye, EyeOff } from 'lucide-react';
import { motion } from 'motion/react';

interface LoginProps {
  onLoginSuccess: (username: string) => void;
  onResetConnection: () => void;
}

export default function Login({ onLoginSuccess, onResetConnection }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [fetchingUsers, setFetchingUsers] = useState(true);

  useEffect(() => {
    fetchUsersList();
  }, []);

  const fetchUsersList = async () => {
    try {
      setFetchingUsers(true);
      setError(null);
      const data = await gasApi.getUsers();
      setUsers(data);
    } catch (err: any) {
      setError('تعذر تحميل قائمة المستخدمين من السيرفر. تحقق من إعدادات الاتصال.');
    } finally {
      setFetchingUsers(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('يرجى إدخال اسم المستخدم وكلمة المرور.');
      return;
    }

    setLoading(true);
    setError(null);

    // Look for local matching user
    const user = users.find(
      u => u.username.toLowerCase() === username.trim().toLowerCase() && u.password === password.trim()
    );

    if (!user) {
      setError('اسم المستخدم أو كلمة المرور غير صحيح.');
      setLoading(false);
      return;
    }

    if (user.status === 'لا') {
      setError('تم منع الدخول لهذا المستخدم من قبل الإدارة.');
      setLoading(false);
      return;
    }

    // Generate or retrieve persistent device UUID
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem('deviceId', deviceId);
    }

    const completeLogin = async (lat: number | null, lng: number | null) => {
      try {
        const result = await gasApi.loginUser(username.trim(), deviceId!, lat, lng);
        if (result.success) {
          localStorage.setItem('loggedInUser', username.trim());
          onLoginSuccess(username.trim());
        } else {
          setError(result.message || 'حدث خطأ غير متوقع أثناء تسجيل الدخول.');
        }
      } catch (err: any) {
        // Fallback login if reverse geocoding is slow or fails
        localStorage.setItem('loggedInUser', username.trim());
        onLoginSuccess(username.trim());
      } finally {
        setLoading(false);
      }
    };

    // Attempt to get Geolocation
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          completeLogin(position.coords.latitude, position.coords.longitude);
        },
        () => {
          // Denied or unavailable
          completeLogin(null, null);
        },
        { timeout: 5000 }
      );
    } else {
      completeLogin(null, null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans" dir="rtl">
      <div className="max-w-md mx-auto w-full">
        <div className="text-center mb-8">
          <div className="mx-auto h-16 w-16 bg-emerald-100 flex items-center justify-center rounded-2xl shadow-sm mb-4">
            <ShieldCheck className="h-9 w-9 text-emerald-600 animate-pulse" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">تسجيل الدخول للمصحح</h2>
          <p className="mt-2 text-sm text-slate-600">منصة تصحيح الواجبات والدروس التفاعلية</p>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-slate-100 sm:px-10 relative overflow-hidden"
        >
          {fetchingUsers ? (
            <div className="py-12 text-center space-y-4">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-emerald-600" />
              <p className="text-sm text-slate-500">جاري الاتصال بقاعدة البيانات وحصر المصححين...</p>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleLogin}>
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-slate-700 mb-2">
                  اسم المستخدم
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <UserIcon className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    name="username"
                    id="username"
                    required
                    placeholder="أدخل اسم المستخدم"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full pr-10 pl-3 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm placeholder:text-slate-400 text-slate-800 bg-slate-50/50"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                  كلمة المرور
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    id="password"
                    required
                    placeholder="أدخل كلمة المرور الخاصة بك"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pr-10 pl-10 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm placeholder:text-slate-400 text-slate-800 bg-slate-50/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-lg bg-rose-50 p-4 border border-rose-100 text-rose-800 text-xs leading-relaxed">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" /> سيتم حفظ إحداثيات الدخول وجهازك تلقائياً
                </span>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? 'جاري التحقق وتسجيل الدخول...' : 'دخول'}
                </button>
              </div>
            </form>
          )}

          <div className="mt-8 pt-6 border-t border-slate-100 flex justify-between items-center text-xs">
            <button
              onClick={onResetConnection}
              className="text-slate-500 hover:text-rose-600 font-medium flex items-center gap-1.5 transition-colors focus:outline-none"
            >
              <ArrowLeftRight className="h-4 w-4" /> تغيير رابط قاعدة البيانات
            </button>
            <span className="text-slate-300">|</span>
            <button
              onClick={fetchUsersList}
              className="text-emerald-600 hover:text-emerald-700 font-semibold focus:outline-none"
            >
              إعادة تحميل الصفحة
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
