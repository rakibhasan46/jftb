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
import { LandingPage } from './components/LandingPage';
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
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const userRef = doc(db, 'users', fbUser.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const profile = userSnap.data() as UserProfile;
            profile.emailVerified = fbUser.emailVerified;
            if (profile.isSuspended) {
              await signOut(auth);
              alert('আপনার অ্যাকাউন্ট সাময়িকভাবে স্থগিত (Suspended) রয়েছে। অ্যাডমিনের সাথে যোগাযোগ করুন।');
              setUser(null);
              setLoading(false);
              return;
            }
            setUser(profile);
            if (profile.role === 'admin') {
              seedDefaultTestData(true);
              setCurrentView('admin');
            }
          } else {
            const defaultProfile: UserProfile = {
              uid: fbUser.uid,
              email: fbUser.email || '',
              displayName: fbUser.displayName || 'Student',
              role: fbUser.email === 'great420yt@gmail.com' ? 'admin' : 'student',
              subscriptionStatus: fbUser.email === 'great420yt@gmail.com' ? 'active' : 'none',
              emailVerified: fbUser.emailVerified,
              createdAt: new Date().toISOString(),
            };
            setUser(defaultProfile);
            if (defaultProfile.role === 'admin') {
              seedDefaultTestData(true);
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
      {currentView !== 'exam' && (
        <Navbar
          user={user}
          onLogout={handleLogout}
          onOpenAuth={() => setAuthModalOpen(true)}
          currentView={currentView === 'result' ? 'student' : currentView}
          onSwitchView={(v) => setCurrentView(v)}
        />
      )}

      <main className={currentView === 'exam' ? 'flex-1' : 'flex-1 pb-16'}>
        {!user ? (
          <LandingPage onOpenAuth={() => setAuthModalOpen(true)} />
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
