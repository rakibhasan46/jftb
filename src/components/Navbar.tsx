import React, { useState } from 'react';
import { UserProfile } from '../types';
import {
  Shield,
  LogOut,
  User,
  Sparkles,
  Menu,
  X,
  BookOpen,
  CreditCard,
  HelpCircle,
  Layers,
  ChevronRight,
} from 'lucide-react';

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-50 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <a
          href="#"
          className="flex items-center space-x-3 group transition cursor-pointer shrink-0"
        >
          {/* Custom Stylized Japanese Emblem Logo */}
          <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-indigo-700 via-indigo-600 to-rose-500 p-0.5 shadow-md shadow-indigo-600/20 group-hover:scale-105 transition-transform duration-200 flex items-center justify-center">
            <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center overflow-hidden relative">
              {/* Subtle Hinomaru / Sunrise Circle */}
              <div className="w-5 h-5 rounded-full bg-rose-500/90 shadow-sm shadow-rose-500/50 flex items-center justify-center text-white text-[10px] font-bold">
                日
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight leading-none">
                JFT-Basic <span className="text-indigo-600">Pro</span>
              </span>
              <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200/80 hidden sm:inline-block">
                A2 形式
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium tracking-tight mt-0.5">
              জাপানি ভাষা মক টেস্ট প্ল্যাটফর্ম
            </p>
          </div>
        </a>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center space-x-1 font-semibold text-xs text-slate-600">
          <a
            href="#"
            className="px-3 py-2 rounded-xl hover:text-indigo-600 hover:bg-indigo-50/60 transition"
          >
            হোম
          </a>
          <a
            href="#tests-section"
            className="px-3 py-2 rounded-xl hover:text-indigo-600 hover:bg-indigo-50/60 transition"
          >
            মক টেস্টসমূহ
          </a>
          <a
            href="#sections-overview"
            className="px-3 py-2 rounded-xl hover:text-indigo-600 hover:bg-indigo-50/60 transition"
          >
            ৪টি সেকশন
          </a>
          <a
            href="#pricing-section"
            className="px-3 py-2 rounded-xl hover:text-indigo-600 hover:bg-indigo-50/60 transition"
          >
            সাবস্ক্রিপশন প্যাকেজ
          </a>
          <a
            href="#faq-section"
            className="px-3 py-2 rounded-xl hover:text-indigo-600 hover:bg-indigo-50/60 transition"
          >
            সাধারণ জিজ্ঞাসা
          </a>
        </nav>

        {/* Auth & User Actions */}
        <div className="hidden sm:flex items-center space-x-3">
          {user ? (
            <div className="flex items-center space-x-3">
              {/* Profile Details */}
              <div className="text-right">
                <div className="text-xs sm:text-sm font-bold text-slate-800 truncate max-w-[150px]">
                  {user.displayName || user.email}
                </div>
                <div className="text-[11px] flex items-center justify-end gap-1 mt-0.5">
                  {user.role === 'admin' ? (
                    <span className="text-purple-600 font-bold flex items-center gap-0.5">
                      <Shield size={12} /> অ্যাডমিন
                    </span>
                  ) : (
                    <span
                      className={`font-semibold flex items-center gap-0.5 ${
                        user.subscriptionStatus === 'active'
                          ? 'text-emerald-600'
                          : 'text-amber-600'
                      }`}
                    >
                      <Sparkles size={12} />
                      {user.subscriptionStatus === 'active' ? 'প্রিমিয়াম সক্রিয়' : 'ফ্রি মেম্বার'}
                    </span>
                  )}
                </div>
              </div>

              {/* Admin Panel Switcher */}
              {user.role === 'admin' && currentView !== 'exam' && (
                <button
                  type="button"
                  onClick={() => onSwitchView(currentView === 'admin' ? 'student' : 'admin')}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 transition cursor-pointer"
                >
                  {currentView === 'admin' ? 'স্টুডেন্ট প্যানেল' : 'অ্যাডমিন প্যানেল'}
                </button>
              )}

              {/* Logout Button */}
              <button
                type="button"
                onClick={onLogout}
                title="লগ আউট করুন"
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-indigo-600/20 hover:shadow-indigo-600/30 transition flex items-center gap-2 cursor-pointer"
            >
              <User size={15} />
              <span>লগ ইন / রেজিস্টার</span>
            </button>
          )}
        </div>

        {/* Mobile Hamburger Toggle Button */}
        <div className="flex sm:hidden items-center space-x-2">
          {!user && (
            <button
              type="button"
              onClick={onOpenAuth}
              className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg shadow-xs"
            >
              লগইন
            </button>
          )}

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            aria-label="মোবাইল মেনু"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer / Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-slate-200 bg-white/98 backdrop-blur-md px-4 py-5 space-y-4 shadow-xl animate-in slide-in-from-top-2 duration-200">
          {/* User profile row on mobile if logged in */}
          {user && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 truncate">
                  {user.displayName || user.email}
                </div>
                <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                  {user.role === 'admin' ? (
                    <span className="text-purple-600 font-bold flex items-center gap-0.5">
                      <Shield size={11} /> অ্যাডমিন অ্যাকাউন্ট
                    </span>
                  ) : (
                    <span className={user.subscriptionStatus === 'active' ? 'text-emerald-600 font-bold' : 'text-amber-600'}>
                      {user.subscriptionStatus === 'active' ? 'প্রিমিয়াম সক্রিয়' : 'ফ্রি একাউন্ট'}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {user.role === 'admin' && (
                  <button
                    type="button"
                    onClick={() => {
                      onSwitchView(currentView === 'admin' ? 'student' : 'admin');
                      closeMobileMenu();
                    }}
                    className="px-2.5 py-1 text-[11px] font-bold bg-indigo-50 text-indigo-700 rounded-lg"
                  >
                    {currentView === 'admin' ? 'স্টুডেন্ট' : 'অ্যাডমিন'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    onLogout();
                    closeMobileMenu();
                  }}
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <LogOut size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Navigation Links on Mobile */}
          <div className="space-y-1 text-xs font-bold text-slate-700">
            <a
              href="#"
              onClick={closeMobileMenu}
              className="flex items-center justify-between p-2.5 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition"
            >
              <span className="flex items-center gap-2.5">
                <BookOpen size={16} className="text-indigo-600" />
                <span>হোম পেজ</span>
              </span>
              <ChevronRight size={14} className="text-slate-400" />
            </a>
            <a
              href="#tests-section"
              onClick={closeMobileMenu}
              className="flex items-center justify-between p-2.5 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition"
            >
              <span className="flex items-center gap-2.5">
                <Layers size={16} className="text-indigo-600" />
                <span>মক টেস্টসমূহ</span>
              </span>
              <ChevronRight size={14} className="text-slate-400" />
            </a>
            <a
              href="#sections-overview"
              onClick={closeMobileMenu}
              className="flex items-center justify-between p-2.5 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition"
            >
              <span className="flex items-center gap-2.5">
                <BookOpen size={16} className="text-indigo-600" />
                <span>অফিসিয়াল ৪টি সেকশন</span>
              </span>
              <ChevronRight size={14} className="text-slate-400" />
            </a>
            <a
              href="#pricing-section"
              onClick={closeMobileMenu}
              className="flex items-center justify-between p-2.5 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition"
            >
              <span className="flex items-center gap-2.5">
                <CreditCard size={16} className="text-indigo-600" />
                <span>সাবস্ক্রিপশন প্যাকেজ</span>
              </span>
              <ChevronRight size={14} className="text-slate-400" />
            </a>
            <a
              href="#faq-section"
              onClick={closeMobileMenu}
              className="flex items-center justify-between p-2.5 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition"
            >
              <span className="flex items-center gap-2.5">
                <HelpCircle size={16} className="text-indigo-600" />
                <span>সাধারণ জিজ্ঞাসা (FAQ)</span>
              </span>
              <ChevronRight size={14} className="text-slate-400" />
            </a>
          </div>

          {!user && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  onOpenAuth();
                  closeMobileMenu();
                }}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2"
              >
                <User size={15} />
                <span>লগইন বা নিবন্ধন করুন</span>
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
