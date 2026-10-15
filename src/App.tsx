import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, getDocFromServer } from 'firebase/firestore';
import { UserProfile, TestDefinition, AttemptRecord } from './types';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { StudentDashboard } from './components/StudentDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { ExamInterface } from './components/ExamInterface';
import { ExamResultView } from './components/ExamResultView';
import { seedDefaultTestData } from './utils/seedData';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'student' | 'admin' | 'exam' | 'result'>('student');
  const [activeTest, setActiveTest] = useState<TestDefinition | null>(null);
  const [activeAttempt, setActiveAttempt] = useState<AttemptRecord | null>(null);

  const refreshUser = async (optimisticProfile?: UserProfile) => {
    if (optimisticProfile) {
      setUser(optimisticProfile);
    }
    if (!auth.currentUser) return;
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const snap = await getDocFromServer(userRef);
      if (snap.exists()) {
        const u = snap.data() as UserProfile;
        setUser(u);
      }
    } catch (err) {
      console.error('Error refreshing user from server:', err);
    }
  };

  useEffect(() => {
    seedDefaultTestData();
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const userRef = doc(db, 'users', fbUser.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const profile = userSnap.data() as UserProfile;
            setUser(profile);
            if (profile.role === 'admin') {
              setCurrentView('admin');
            }
          } else {
            const defaultProfile: UserProfile = {
              uid: fbUser.uid,
              email: fbUser.email || '',
              displayName: fbUser.displayName || 'Student',
              role: fbUser.email === 'great420yt@gmail.com' ? 'admin' : 'student',
              subscriptionStatus: fbUser.email === 'great420yt@gmail.com' ? 'active' : 'none',
              createdAt: new Date().toISOString(),
            };
            setUser(defaultProfile);
            if (defaultProfile.role === 'admin') {
              setCurrentView('admin');
            }
          }
        } catch (err) {
          console.error('Error fetching user profile:', err);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    setCurrentView('student');
    setActiveTest(null);
    setActiveAttempt(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div className="text-slate-600 font-semibold text-sm">লোড হচ্ছে... (Loading JFT-Basic Pro)</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      <Navbar
        user={user}
        onLogout={handleLogout}
        onOpenAuth={() => setAuthModalOpen(true)}
        currentView={currentView === 'result' ? 'student' : currentView}
        onSwitchView={(v) => setCurrentView(v)}
      />

      <main className="flex-1 pb-16">
        {!user ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center space-y-8 animate-in fade-in duration-500">
            <div className="max-w-2xl mx-auto space-y-4">
              <span className="px-4 py-1.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold inline-block">
                JFT-Basic 形式 模擬試験 プラットフォーム
              </span>
              <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
                JFT-Basic Pro মক টেস্ট প্ল্যাটফর্ম
              </h1>
              <p className="text-slate-600 text-base md:text-lg">
                জাপান ফাউন্ডেশন টেস্ট ফর বেসিক জাপানিজ (JFT-Basic) পরীক্ষার জন্য বাংলা নির্দেশিকা ও জাপানি প্রশ্নের সম্পূর্ণ প্রস্তুতি প্ল্যাটফর্ম। কাঞ্জি ফুরিগানা, আন্ডারলাইন প্রশ্ন, লিসেনিং অডিও এবং পূর্ণাঙ্গ সমাধান।
              </p>
              <div className="pt-4 flex flex-col sm:flex-row justify-center gap-4">
                <button
                  onClick={() => setAuthModalOpen(true)}
                  className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg transition text-base flex items-center justify-center gap-2"
                >
                  লগইন বা নিবন্ধন করুন (Email & Password)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12 text-left">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                <div className="text-2xl">✍️</div>
                <h3 className="font-bold text-slate-900">৪টি অফিসিয়াল সেকশন</h3>
                <p className="text-xs text-slate-600">文字と語彙, 会話と表現, 聴解, এবং 読解 এর অফিসিয়াল প্রশ্ন বিন্যাস।</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                <div className="text-2xl">🔊</div>
                <h3 className="font-bold text-slate-900">লিসেনিং ও কাঞ্জি ফুরিগানা</h3>
                <p className="text-xs text-slate-600">বাস্তবমুখী অডিও লিসেনিং প্লেয়ার এবং সঠিক রুবি ফুরিগানা ও আন্ডারলাইন।</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                <div className="text-2xl">🎟️</div>
                <h3 className="font-bold text-slate-900">বিকাশ/নগদ ও প্রোমো কোড</h3>
                <p className="text-xs text-slate-600">সহজ ম্যানুয়াল পেমেন্ট ভেরিফিকেশন এবং ডিসকাউন্ট বা ফ্রি প্রোমো কোড।</p>
              </div>
            </div>
          </div>
        ) : currentView === 'admin' && user.role === 'admin' ? (
          <AdminDashboard currentUser={user} />
        ) : currentView === 'exam' && activeTest ? (
          <ExamInterface
            test={activeTest}
            user={user}
            onExamFinished={(attempt) => {
              setActiveAttempt(attempt);
              setCurrentView('result');
            }}
            onExit={() => {
              setCurrentView('student');
              setActiveTest(null);
            }}
          />
        ) : currentView === 'result' && activeAttempt && activeTest ? (
          <ExamResultView
            attempt={activeAttempt}
            test={activeTest}
            onBack={() => {
              setCurrentView('student');
              setActiveAttempt(null);
              setActiveTest(null);
            }}
          />
        ) : (
          <StudentDashboard
            user={user}
            onStartExam={(test) => {
              setActiveTest(test);
              setCurrentView('exam');
            }}
            onViewResult={(attempt, test) => {
              setActiveAttempt(attempt);
              setActiveTest(test);
              setCurrentView('result');
            }}
            onRefreshUser={refreshUser}
          />
        )}
      </main>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onLoginSuccess={(profile) => {
          setUser(profile);
          if (profile.role === 'admin') {
            setCurrentView('admin');
          } else {
            setCurrentView('student');
          }
        }}
      />
    </div>
  );
}
