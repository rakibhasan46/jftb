import React from 'react';
import { UserProfile } from '../types';
import { Shield, BookOpen, LogOut, Award, User, CreditCard, Sparkles } from 'lucide-react';

interface NavbarProps {
  user: UserProfile | null;
  onLogout: () => void;
  onOpenAuth: () => void;
  currentView: 'student' | 'admin' | 'exam';
  onSwitchView: (view: 'student' | 'admin') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onLogout,
  onOpenAuth,
  currentView,
  onSwitchView,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-indigo-600 text-white p-2 rounded-xl shadow-sm flex items-center justify-center font-bold text-lg">
            🇯🇵
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              JFT-Basic Pro
              <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                মক টেস্ট প্ল্যাটফর্ম
              </span>
            </h1>
            <p className="text-xs text-slate-500 hidden sm:block">
              Japan Foundation Test for Basic Japanese Preparation
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {user ? (
            <div className="flex items-center space-x-3">
              <div className="hidden md:flex flex-col text-right">
                <span className="text-sm font-semibold text-slate-800">
                  {user.displayName || user.email}
                </span>
                <span className="text-xs flex items-center justify-end gap-1">
                  {user.role === 'admin' ? (
                    <span className="text-purple-600 font-medium flex items-center gap-0.5">
                      <Shield size={12} /> অ্যাডমিন
                    </span>
                  ) : (
                    <span
                      className={`font-medium flex items-center gap-0.5 ${
                        user.subscriptionStatus === 'active'
                          ? 'text-emerald-600'
                          : 'text-amber-600'
                      }`}
                    >
                      <Sparkles size={12} />
                      {user.subscriptionStatus === 'active'
                        ? 'প্রিমিয়াম সাবস্ক্রিপশন সক্রিয়'
                        : 'ফ্রি / সাবস্ক্রিপশন নেই'}
                    </span>
                  )}
                </span>
              </div>

              {user.role === 'admin' && currentView !== 'exam' && (
                <button
                  onClick={() => onSwitchView(currentView === 'admin' ? 'student' : 'admin')}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                >
                  {currentView === 'admin' ? 'স্টুডেন্ট প্যানেল' : 'অ্যাডমিন প্যানেল'}
                </button>
              )}

              <button
                onClick={onLogout}
                title="লগ আউট"
                className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm transition flex items-center gap-2"
            >
              <User size={16} /> লগ ইন / রেজিস্টার
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
