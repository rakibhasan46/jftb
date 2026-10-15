import React, { useState } from 'react';
import { auth, db } from '../firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { UserProfile } from '../types';
import { X, Mail, Lock, User, ArrowRight, KeyRound, AlertCircle, CheckCircle2, Shield } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserProfile) => void;
}

type AuthMode = 'login' | 'register' | 'forgot_password';

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const resetForm = () => {
    setError(null);
    setSuccessMessage(null);
  };

  const switchMode = (newMode: AuthMode) => {
    resetForm();
    setMode(newMode);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    resetForm();

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setError('ইমেইল এবং পাসওয়ার্ড দুটিই পূরণ করুন।');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
      const fbUser = userCredential.user;

      const userRef = doc(db, 'users', fbUser.uid);
      const userSnap = await getDoc(userRef);

      let profile: UserProfile;
      const isAdminEmail = cleanEmail === 'great420yt@gmail.com';

      if (!userSnap.exists()) {
        profile = {
          uid: fbUser.uid,
          email: fbUser.email || cleanEmail,
          displayName: fbUser.displayName || cleanEmail.split('@')[0],
          role: isAdminEmail ? 'admin' : 'student',
          subscriptionStatus: isAdminEmail ? 'active' : 'none',
          createdAt: new Date().toISOString(),
        };
        await setDoc(userRef, profile);
      } else {
        profile = userSnap.data() as UserProfile;
        if (isAdminEmail && profile.role !== 'admin') {
          profile.role = 'admin';
          profile.subscriptionStatus = 'active';
          await setDoc(userRef, profile, { merge: true });
        }
      }

      if (profile.isSuspended) {
        throw new Error('আপনার অ্যাকাউন্ট সাময়িকভাবে স্থগিত (Suspended) রয়েছে। অ্যাডমিনের সাথে যোগাযোগ করুন।');
      }

      onLoginSuccess(profile);
      onClose();
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.code === 'auth/operation-not-allowed') {
        setError('ফায়ারবেস কনসোলে Email/Password প্রোভাইডার বন্ধ রয়েছে। দয়া করে ফায়ারবেস কনসোল (Authentication > Sign-in method) থেকে Email/Password অপশনটি Enable করুন।');
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError('ভুল ইমেইল অথবা পাসওয়ার্ড দিয়েছেন। অনুগ্রহ করে যাচাই করে পুনরায় চেষ্টা করুন।');
      } else if (err.code === 'auth/invalid-email') {
        setError('ইমেইল ঠিকানাটি সঠিক নয়।');
      } else {
        setError(err.message || 'লগইন করতে ব্যর্থ হয়েছে।');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    resetForm();

    const cleanEmail = email.trim().toLowerCase();
    if (!displayName.trim()) {
      setError('অনুগ্রহ করে আপনার পুরো নাম লিখুন।');
      return;
    }
    if (!cleanEmail) {
      setError('অনুগ্রহ করে একটি সঠিক ইমেইল ঠিকানা দিন।');
      return;
    }
    if (password.length < 6) {
      setError('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
      return;
    }
    if (password !== confirmPassword) {
      setError('পাসওয়ার্ড এবং কনফার্ম পাসওয়ার্ড মেলেনি।');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      const fbUser = userCredential.user;
      await updateProfile(fbUser, { displayName: displayName.trim() });

      const isAdminEmail = cleanEmail === 'great420yt@gmail.com';
      const newProfile: UserProfile = {
        uid: fbUser.uid,
        email: cleanEmail,
        displayName: displayName.trim(),
        role: isAdminEmail ? 'admin' : 'student',
        subscriptionStatus: isAdminEmail ? 'active' : 'none', // Account registration is NOT subscription activation
        isSuspended: false,
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'users', fbUser.uid), newProfile);
      onLoginSuccess(newProfile);
      onClose();
    } catch (err: any) {
      console.error('Register error:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('এই ইমেইল দিয়ে ইতিমধ্যে অ্যাকাউন্ট রয়েছে। অনুগ্রহ করে লগইন করুন।');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('ফায়ারবেস কনসোলে Email/Password প্রোভাইডার বন্ধ রয়েছে। ফায়ারবেস কনসোল (Authentication > Sign-in method) থেকে Email/Password চালু করতে হবে।');
      } else if (err.code === 'auth/weak-password') {
        setError('পাসওয়ার্ড খুবই দুর্বল। কমপক্ষে ৬ অক্ষরের শক্ত পাসওয়ার্ড দিন।');
      } else {
        setError(err.message || 'রেজিস্ট্রেশন সম্পন্ন করা যায়নি।');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    resetForm();

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('অনুগ্রহ করে আপনার নিবন্ধিত ইমেইল ঠিকানা দিন।');
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      setSuccessMessage('আপনার ইমেইলে পাসওয়ার্ড রিসেট করার লিঙ্ক পাঠানো হয়েছে। ইনবক্স অথবা স্প্যাম ফোল্ডার চেক করুন।');
    } catch (err: any) {
      console.error('Password reset error:', err);
      if (err.code === 'auth/user-not-found') {
        setError('এই ইমেইলে কোনো অ্যাকাউন্ট পাওয়া যায়নি।');
      } else if (err.code === 'auth/invalid-email') {
        setError('ইমেইল ঠিকানাটি সঠিক নয়।');
      } else {
        setError(err.message || 'পাসওয়ার্ড রিসেট লিঙ্ক পাঠানো সম্ভব হয়নি।');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-full transition"
          >
            <X size={18} />
          </button>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🇯🇵</span>
            <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 bg-indigo-500/30 rounded-md border border-indigo-400/30">
              JFT-Basic Mock Test
            </span>
          </div>
          <h2 className="text-xl font-bold">
            {mode === 'login' && 'স্টুডেন্ট / অ্যাডমিন লগইন'}
            {mode === 'register' && 'নতুন শিক্ষার্থী নিবন্ধন (Register)'}
            {mode === 'forgot_password' && 'পাসওয়ার্ড রিসেট'}
          </h2>
          <p className="text-indigo-200 text-xs mt-1">
            {mode === 'login' && 'আপনার ইমেইল ও পাসওয়ার্ড দিয়ে সাইন-ইন করুন।'}
            {mode === 'register' && 'অ্যাকাউন্ট তৈরি করে আপনার প্রস্তুতি শুরু করুন।'}
            {mode === 'forgot_password' && 'ইমেইল দিন, আমরা পাসওয়ার্ড পরিবর্তনের লিঙ্ক পাঠাব।'}
          </p>
        </div>

        {/* Auth Mode Tabs */}
        <div className="grid grid-cols-2 bg-slate-100 border-b border-slate-200">
          <button
            type="button"
            onClick={() => switchMode('login')}
            className={`py-3 text-xs font-bold transition text-center ${
              mode === 'login' || mode === 'forgot_password'
                ? 'bg-white text-indigo-700 border-b-2 border-indigo-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            লগইন (Sign In)
          </button>
          <button
            type="button"
            onClick={() => switchMode('register')}
            className={`py-3 text-xs font-bold transition text-center ${
              mode === 'register'
                ? 'bg-white text-indigo-700 border-b-2 border-indigo-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            নতুন অ্যাকাউন্ট (Register)
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-800 text-xs p-3.5 rounded-xl border border-red-200 flex items-start gap-2">
              <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{error}</div>
            </div>
          )}

          {successMessage && (
            <div className="bg-emerald-50 text-emerald-800 text-xs p-3.5 rounded-xl border border-emerald-200 flex items-start gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{successMessage}</div>
            </div>
          )}

          {/* LOGIN FORM */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ইমেইল ঠিকানা</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <Mail size={16} />
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@example.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">পাসওয়ার্ড</label>
                  <button
                    type="button"
                    onClick={() => switchMode('forgot_password')}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    পাসওয়ার্ড ভুলে গেছেন?
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <Lock size={16} />
                  </span>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2"
              >
                {loading ? 'লগইন হচ্ছে...' : 'লগইন করুন'}
                <ArrowRight size={16} />
              </button>
            </form>
          )}

          {/* REGISTER FORM */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">পুরো নাম (Full Name)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <User size={16} />
                  </span>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="যেমন: তানভীর আহমেদ"
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ইমেইল ঠিকানা</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <Mail size={16} />
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@example.com"
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <Lock size={16} />
                  </span>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">কনফার্ম পাসওয়ার্ড</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <Lock size={16} />
                  </span>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500">
                নিবন্ধনের পর আপনি আপনার ড্যাশবোর্ডে প্রবেশ করতে পারবেন। পরীক্ষা দেওয়ার জন্য বিকাশ/নগদে সাবস্ক্রিপশন প্ল্যান গ্রহণ করতে হবে অথবা প্রোমো কোড ব্যবহার করতে হবে।
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2"
              >
                {loading ? 'অ্যাকাউন্ট তৈরি হচ্ছে...' : 'নিবন্ধন সম্পন্ন করুন'}
                <ArrowRight size={16} />
              </button>
            </form>
          )}

          {/* FORGOT PASSWORD FORM */}
          {mode === 'forgot_password' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">আপনার নিবন্ধিত ইমেইল</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <Mail size={16} />
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@example.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2"
              >
                <KeyRound size={16} />
                {loading ? 'পাঠানো হচ্ছে...' : 'পাসওয়ার্ড রিসেট লিঙ্ক পাঠান'}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="text-xs text-slate-600 hover:text-slate-900 font-semibold"
                >
                  ← লগইনে ফিরে যান
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
