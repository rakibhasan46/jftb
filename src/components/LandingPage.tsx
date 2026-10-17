import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { TestDefinition, SubscriptionPlan } from '../types';
import { DEFAULT_PLANS } from '../utils/seedData';
import {
  BookOpen,
  Clock,
  Award,
  CheckCircle2,
  Sparkles,
  Headphones,
  FileText,
  ChevronRight,
  Shield,
  CreditCard,
  Smartphone,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Zap,
  Target,
  ArrowRight,
  Star,
  Users,
  Check,
} from 'lucide-react';

interface LandingPageProps {
  onOpenAuth: () => void;
}

export const toBengaliNumber = (num: number | string): string => {
  const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/\d/g, (d) => bnDigits[parseInt(d, 10)]);
};

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenAuth }) => {
  const [tests, setTests] = useState<TestDefinition[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>(DEFAULT_PLANS);
  const [loading, setLoading] = useState(true);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  useEffect(() => {
    const loadPublicData = async () => {
      try {
        const testSnap = await getDocs(collection(db, 'tests'));
        const tList: TestDefinition[] = [];
        testSnap.forEach((d) => {
          const t = d.data() as TestDefinition;
          if (t.isPublished) tList.push(t);
        });
        setTests(tList);

        const planSnap = await getDocs(collection(db, 'subscription_plans'));
        if (!planSnap.empty) {
          const pList: SubscriptionPlan[] = [];
          planSnap.forEach((d) => {
            const p = d.data() as SubscriptionPlan;
            if (p.isActive !== false) pList.push(p);
          });
          if (pList.length > 0) setPlans(pList);
        }
      } catch (err) {
        console.warn('Using default public data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadPublicData();
  }, []);

  const faqs = [
    {
      q: 'JFT-Basic পরীক্ষা কী এবং কেন এই মক টেস্ট প্রয়োজন?',
      a: 'JFT-Basic (Japan Foundation Test for Basic Japanese) হলো জাপান সরকারের একটি অফিসিয়াল ভাষা দক্ষতা পরীক্ষা (A2 লেভেল)। এটি জাপানে নির্দিষ্ট দক্ষ কর্মী (SSW Visa) ভিসায় যাওয়ার অন্যতম প্রধান শর্ত। এই মক টেস্ট প্ল্যাটফর্মে প্রস্তুতি নিলে শিক্ষার্থীরা পরীক্ষার ভয় কাটিয়ে প্রথমবারেই উত্তীর্ণ হওয়ার আত্মবিশ্বাস পায়।',
    },
    {
      q: 'পরীক্ষার প্রশ্ন ও ইন্টারফেস কি অফিসিয়াল পরীক্ষার মতো?',
      a: 'হ্যাঁ, হুবহু অফিসিয়াল পরীক্ষার ৪টি সেকশন (বর্ণ ও শব্দভাণ্ডার, কথোপকথন, লিসেনিং এবং রিডিং) অনুযায়ী সাজানো। পরীক্ষার নিচে ক্যাটাগরি অনুযায়ী প্রশ্ন নম্বর (যেমন ১–৫ Grammar & Vocab, ৬–১০ Conversation, Listening, Reading) ভাগ করা থাকে যাতে সহজেই যেকোনো প্রশ্নে যাওয়া যায়।',
    },
    {
      q: 'মোবাইল ফোন দিয়ে কি পরীক্ষা দেওয়া যাবে?',
      a: 'অবশ্যই! আমাদের পুরো প্ল্যাটফর্মটি মোবাইল স্ক্রিন, ট্যাবলেট এবং কম্পিউটার সব ধরণের ডিভাইসের জন্য অপ্টিমাইজড। অ্যান্ড্রয়েড বা আইফোন দিয়ে স্বাচ্ছন্দ্যে প্রশ্ন পড়তে, অডিও শুনতে এবং উত্তর বাছাই করতে পারবেন।',
    },
    {
      q: 'সাবস্ক্রিপশন ফি কীভাবে পরিশোধ করব?',
      a: 'বিকাশ (bKash) ও নগদ (Nagad) এর মাধ্যমে সহজেই সাবস্ক্রিপশন ফি প্রদান করতে পারবেন। পেমেন্ট করার পর ট্রানজেকশন আইডি (TrxID) সাবমিট করলেই অ্যাডমিন যাচাই করে আপনার অ্যাকাউন্টে তাৎক্ষণিক আনলিমিটেড মক টেস্ট অ্যাক্সেস সক্রিয় করে দেবে।',
    },
    {
      q: 'প্রোমো কোড কীভাবে কাজ করে?',
      a: 'আপনার কাছে কোনো স্পেশাল প্রোমো কোড থাকলে, লগইন করে স্টুডেন্ট ড্যাশবোর্ড থেকে কোডটি এন্টার করলেই তাৎক্ষণিকভাবে ফ্রি প্রিমিয়াম অ্যাক্সেস বা সাবস্ক্রিপশন প্যাকেজে ছাড় উপভোগ করতে পারবেন।',
    },
  ];

  return (
    <div className="space-y-16 sm:space-y-24 pb-12">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden pt-8 sm:pt-14 pb-12 bg-gradient-to-b from-indigo-50/70 via-white to-slate-50 border-b border-slate-200/60">
        {/* Subtle decorative background circles */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-indigo-200/30 via-rose-200/20 to-transparent blur-3xl pointer-events-none -z-10 rounded-full"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-6 max-w-3xl mx-auto">
            {/* Top Pill Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-indigo-200 shadow-2xs text-xs font-bold text-indigo-700">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
              <span>JFT-Basic A2 অফিসিয়াল পরীক্ষার পূর্ণাঙ্গ প্রস্তুতি</span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.2] sm:leading-[1.15]">
              জাপানে SSW ভিসার স্বপ্ন পূরণে{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-indigo-700 to-rose-600">
                JFT-Basic Pro মক টেস্ট
              </span>
            </h1>

            {/* Subheading */}
            <p className="text-slate-600 text-sm sm:text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
              বাস্তব পরীক্ষার আদলে তৈরি ৪টি অফিসিয়াল সেকশন, ৬০ মিনিটের আসল কাউন্টডাউন টাইমার, লিসেনিং অডিও এবং কাঞ্জি ফুরিগানা অন/অফ সুবিধার সাথে ঘরে বসেই শতভাগ প্রস্তুতি নিন।
            </p>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <button
                type="button"
                onClick={onOpenAuth}
                className="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm sm:text-base rounded-2xl shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/40 transition duration-200 flex items-center justify-center gap-2.5 cursor-pointer group"
              >
                <span>মক টেস্ট শুরু করুন (ফ্রি রেজিস্টার)</span>
                <ArrowRight size={18} className="group-hover:translate-x-1 transition" />
              </button>
              <a
                href="#tests-section"
                className="w-full sm:w-auto px-6 py-4 bg-white hover:bg-slate-100 text-slate-800 font-bold text-sm sm:text-base rounded-2xl border border-slate-200 shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <BookOpen size={17} className="text-indigo-600" />
                <span>মক টেস্টের তালিকা দেখুন</span>
              </a>
            </div>

            {/* Key Metrics / Quick Stats */}
            <div className="pt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
              <div className="bg-white/90 p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
                <div className="text-indigo-600 font-extrabold text-xl sm:text-2xl">৪টি বিভাগ</div>
                <div className="text-xs font-bold text-slate-700">হুবহু অফিসিয়াল সেকশন</div>
                <div className="text-[11px] text-slate-400">文字, 会話, 聴解, 読解</div>
              </div>

              <div className="bg-white/90 p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
                <div className="text-emerald-600 font-extrabold text-xl sm:text-2xl">৬০ মিনিট</div>
                <div className="text-xs font-bold text-slate-700">আসল পরীক্ষার টাইমার</div>
                <div className="text-[11px] text-slate-400">রিয়েল কাউন্টডাউন</div>
              </div>

              <div className="bg-white/90 p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
                <div className="text-rose-600 font-extrabold text-xl sm:text-2xl">২৫০ নম্বর</div>
                <div className="text-xs font-bold text-slate-700">অফিসিয়াল স্কোরিং</div>
                <div className="text-[11px] text-slate-400">তাৎক্ষণিক ফলাফল ও অ্যানালাইসিস</div>
              </div>

              <div className="bg-white/90 p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
                <div className="text-amber-600 font-extrabold text-xl sm:text-2xl">১০০% সহজ</div>
                <div className="text-xs font-bold text-slate-700">মোবাইল অপ্টিমাইজড</div>
                <div className="text-[11px] text-slate-400">বিকাশ ও নগদ পেমেন্ট</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. BEAUTIFUL MOCK TEST CARDS SECTION */}
      <section id="tests-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-8 sm:mb-10">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-2">
              <Zap size={14} /> JFT-Basic মক টেস্টসমূহ
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
              বাস্তবমুখী JFT-Basic প্র্যাকটিস টেস্ট
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              প্রতিটি টেস্টে ৪টি সেকশনের প্রশ্ন, অডিও লিসেনিং ও তাৎক্ষণিক রেজাল্ট অন্তর্ভুক্ত রয়েছে।
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenAuth}
            className="text-xs sm:text-sm font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 group cursor-pointer shrink-0"
          >
            <span>লগইন করে সব টেস্টে প্রবেশ করুন</span>
            <ChevronRight size={16} className="group-hover:translate-x-1 transition" />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-400 space-y-2">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <div className="text-xs font-bold">মক টেস্ট লোড হচ্ছে...</div>
          </div>
        ) : tests.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-2xs space-y-3">
            <BookOpen size={40} className="text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">বর্তমানে কোনো প্রকাশিত টেস্ট নেই</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              খুব শীঘ্রই নতুন অফিসিয়াল মক টেস্ট আপলোড করা হবে। এখনই রেজিস্ট্রেশন করে প্রস্তুত থাকুন।
            </p>
            <button
              type="button"
              onClick={onOpenAuth}
              className="px-6 py-2.5 bg-indigo-600 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
            >
              একাউন্ট তৈরি করুন
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tests.map((test, idx) => (
              <div
                key={test.id}
                className="group bg-white rounded-3xl border border-slate-200/90 hover:border-indigo-500/50 shadow-xs hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 p-6 sm:p-7 flex flex-col justify-between space-y-6 relative overflow-hidden"
              >
                {/* Top Corner Japanese Test Badge */}
                <div className="absolute top-0 right-0 bg-gradient-to-l from-indigo-600 to-indigo-700 text-white text-[10px] font-extrabold px-3 py-1 rounded-bl-xl shadow-2xs tracking-wider">
                  TEST #{idx + 1}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg">
                      JFT-Basic A2
                    </span>
                    <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                      <Clock size={12} className="text-indigo-600" /> {toBengaliNumber(test.durationMinutes)} মিনিট
                    </span>
                  </div>

                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors leading-snug">
                    {test.title}
                  </h3>

                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                    {test.description || 'JFT-Basic অফিসিয়াল পরীক্ষার প্রশ্ন বিন্যাস অনুযায়ী ৪টি সেকশনের সম্পূর্ণ প্রস্তুতিমূলক পরীক্ষা।'}
                  </p>

                  {/* Test Feature Highlights */}
                  <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-slate-400 block text-[10px] font-semibold">পাস মার্ক</span>
                      <strong className="text-emerald-700 font-bold text-xs sm:text-sm">
                        {toBengaliNumber(test.passingScore)} নম্বর
                      </strong>
                    </div>
                    <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-slate-400 block text-[10px] font-semibold">সেকশন বিন্যাস</span>
                      <strong className="text-indigo-700 font-bold text-xs sm:text-sm">
                        ৪টি বিভাগ
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Card CTA */}
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="w-full py-3 bg-slate-900 group-hover:bg-indigo-600 text-white font-bold text-xs rounded-xl shadow-xs transition duration-200 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <BookOpen size={14} />
                  <span>পরীক্ষা শুরু করুন (লগইন প্রয়োজন)</span>
                  <ChevronRight size={14} className="group-hover:translate-x-0.5 transition" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 3. OFFICIAL 4 SECTIONS OVERVIEW */}
      <section id="sections-overview" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto space-y-2 mb-10">
          <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider bg-indigo-50 px-3 py-1 rounded-full">
            JFT-Basic 構成 (Test Structure)
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900">
            অফিসিয়াল পরীক্ষার ৪টি সেকশন
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            পরীক্ষার নিচে প্রতিটি সেকশন ক্যাটাগরি অনুযায়ী আলাদাভাবে সাজানো থাকে, যা দিয়ে যেকোনো প্রশ্নে সরাসরি যাওয়া যায়।
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Section 1 */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs hover:border-indigo-400 hover:shadow-lg transition space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-sm shadow-2xs">
              সেকশন ১
            </div>
            <div>
              <span className="text-xs font-bold text-indigo-600 block">セクション 1</span>
              <h3 className="font-extrabold text-slate-900 text-base mt-0.5">
                বর্ণ ও শব্দভাণ্ডার
              </h3>
              <div className="text-xs font-japanese font-semibold text-slate-500">
                文字と語彙 (Grammar & Vocabulary)
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              কাঞ্জির সঠিক উচ্চারণ (読み方), কাঞ্জির লিখন পদ্ধতি (表記), এবং সঠিক শব্দ ও ব্যাকরণ নির্বাচন করে বাক্য গঠন।
            </p>
            <div className="text-[11px] font-bold text-indigo-700 bg-indigo-50/70 p-2.5 rounded-xl border border-indigo-100 flex items-center gap-1.5">
              <span>📌</span>
              <span>পরীক্ষায় প্রশ্ন ১–৫ (বা প্রথম সেকশন)</span>
            </div>
          </div>

          {/* Section 2 */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs hover:border-indigo-400 hover:shadow-lg transition space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-sm shadow-2xs">
              সেকশন ২
            </div>
            <div>
              <span className="text-xs font-bold text-emerald-600 block">セクション 2</span>
              <h3 className="font-extrabold text-slate-900 text-base mt-0.5">
                কথোপকথন ও প্রকাশভঙ্গি
              </h3>
              <div className="text-xs font-japanese font-semibold text-slate-500">
                会話と表現 (Conversation)
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              দৈনন্দিন জীবনের বিভিন্ন পরিস্থিতিতে জাপানি সংলাপে উপযুক্ত প্রতিক্রিয়া ও ব্যাকরণগত বাক্য নির্বাচন।
            </p>
            <div className="text-[11px] font-bold text-emerald-700 bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-100 flex items-center gap-1.5">
              <span>📌</span>
              <span>পরীক্ষায় প্রশ্ন ৬–১০ (সংলাপ প্রশ্ন)</span>
            </div>
          </div>

          {/* Section 3 */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs hover:border-indigo-400 hover:shadow-lg transition space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-sm shadow-2xs">
              সেকশন ৩
            </div>
            <div>
              <span className="text-xs font-bold text-amber-600 block">セクション 3</span>
              <h3 className="font-extrabold text-slate-900 text-base mt-0.5">
                শ্রবণ বা লিসেনিং
              </h3>
              <div className="text-xs font-japanese font-semibold text-slate-500">
                聴解 (Listening Comprehension)
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              দোকান, অফিস, স্টেশন বা ঘোষণার অডিও শুনে সঠিক উত্তর নির্বাচন। আসল পরীক্ষার নিয়মে সর্বোচ্চ ২ বার প্লে করা যাবে।
            </p>
            <div className="text-[11px] font-bold text-amber-700 bg-amber-50/70 p-2.5 rounded-xl border border-amber-100 flex items-center gap-1.5">
              <span>📌</span>
              <span>লিসেনিং অডিও ও ইমেজ প্রশ্ন</span>
            </div>
          </div>

          {/* Section 4 */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs hover:border-indigo-400 hover:shadow-lg transition space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-sm shadow-2xs">
              সেকশন ৪
            </div>
            <div>
              <span className="text-xs font-bold text-purple-600 block">セクション 4</span>
              <h3 className="font-extrabold text-slate-900 text-base mt-0.5">
                পঠন বা রিডিং
              </h3>
              <div className="text-xs font-japanese font-semibold text-slate-500">
                読解 (Reading Comprehension)
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              নোটিশ, নির্দেশিকা, সংক্ষিপ্ত বার্তা ও অনুচ্ছেদ মনোযোগ দিয়ে পড়ে প্রয়োজনীয় তথ্য বিশ্লেষণ করে সঠিক উত্তর প্রদান।
            </p>
            <div className="text-[11px] font-bold text-purple-700 bg-purple-50/70 p-2.5 rounded-xl border border-purple-100 flex items-center gap-1.5">
              <span>📌</span>
              <span>প্যাসেজ ও নোটিশ ভিত্তিক প্রশ্ন</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. EXAM INTERFACE HIGHLIGHT (CATEGORIZED QUESTIONS PREVIEW) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-8 sm:p-12 text-white shadow-xl relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-400/30">
                <Sparkles size={14} className="text-amber-400" />
                <span>সহজ ও সাদামাটা পরীক্ষার ইন্টারফেস</span>
              </div>

              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
                পরীক্ষার নিচে ক্যাটাগরি অনুযায়ী প্রশ্ন নম্বর ও সহজ নিয়ন্ত্রণ
              </h2>

              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                শিক্ষার্থীদের জন্য ইন্টারফেসটি একদম সহজ ও ব্যবহারবান্ধব রাখা হয়েছে। পরীক্ষার নিচে ক্যাটাগরি অনুযায়ী যেমন ১–৫ Grammar & Vocabulary, ৬–১০ Conversation, এরপর Listening ও Reading প্রশ্ন নম্বর ভাগ করে দেখানো থাকে। প্রতিটি প্রশ্ন নম্বরে ক্লিক করে সরাসরি সেই প্রশ্নে যাওয়া যায় এবং কোনটির উত্তর দেওয়া হয়েছে বা বাকি আছে তা তৎক্ষণাৎ বোঝা যায়।
              </p>

              <div className="space-y-2.5 pt-2 text-xs sm:text-sm text-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <Check size={13} />
                  </div>
                  <span>কাউন্টডাউন টাইমার, প্রশ্ন নম্বর, Next ও Previous বাটন বাংলায়</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <Check size={13} />
                  </div>
                  <span>জাপানি প্রশ্ন ও চারটি উত্তর অপশন জাপানিতেই থাকবে</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <Check size={13} />
                  </div>
                  <span>কাঞ্জি ফুরিগানা অন/অফ ও ডার্ক/লাইট মোড সাপোর্ট</span>
                </div>
              </div>
            </div>

            {/* Interactive Preview Representation */}
            <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 sm:p-6 space-y-4 text-xs font-sans shadow-lg">
              <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                <span className="font-bold text-indigo-300">সেকশন ১: বর্ণ ও শব্দভাণ্ডার (文字と語彙)</span>
                <span className="text-amber-300 font-bold font-mono">সময় বাকি: ৪৫ মিনিট ২০ সেকেন্ড</span>
              </div>

              <div className="p-4 bg-slate-900 rounded-xl border border-slate-700/60 font-japanese text-sm leading-loose">
                毎朝、公園を＿＿＿します。
              </div>

              <div className="grid grid-cols-2 gap-2 text-slate-200 font-japanese">
                <div className="p-2.5 rounded-lg border border-indigo-500 bg-indigo-950/80 font-bold flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">১</span>
                  <span>さんぽ</span>
                </div>
                <div className="p-2.5 rounded-lg border border-slate-700 bg-slate-900/60 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-700 text-slate-300 flex items-center justify-center text-[10px]">২</span>
                  <span>べんきょう</span>
                </div>
              </div>

              {/* Bottom Categories Showcase */}
              <div className="pt-3 border-t border-slate-700/70 space-y-2.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                  <span>ক্যাটাগরি নেভিগেশন (প্রশ্ন ১–৫):</span>
                  <span className="text-emerald-400">সবুজ = উত্তর সম্পন্ন</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">১</span>
                  <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">২</span>
                  <span className="w-7 h-7 rounded-lg ring-2 ring-indigo-400 bg-slate-700 text-white font-bold flex items-center justify-center text-xs">৩</span>
                  <span className="w-7 h-7 rounded-lg bg-slate-700 text-slate-300 flex items-center justify-center text-xs">৪</span>
                  <span className="w-7 h-7 rounded-lg bg-slate-700 text-slate-300 flex items-center justify-center text-xs">৫</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. SUBSCRIPTION PACKAGES SECTION */}
      <section id="pricing-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto space-y-2 mb-10">
          <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider bg-indigo-50 px-3 py-1 rounded-full">
            料金プラン (Subscription Pricing)
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900">
            সাশ্রয়ী মূল্যে আনলিমিটেড মক টেস্ট প্যাকেজ
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            বিকাশ ও নগদ এর মাধ্যমে সহজে পেমেন্ট করে তাৎক্ষণিক প্রিমিয়াম অ্যাক্সেস সক্রিয় করুন।
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan, idx) => {
            const isPopular = idx === 1 || plan.durationDays === 30;
            return (
              <div
                key={plan.id}
                className={`rounded-3xl p-7 sm:p-8 flex flex-col justify-between transition-all duration-300 relative ${
                  isPopular
                    ? 'bg-slate-900 text-white shadow-xl ring-2 ring-indigo-500'
                    : 'bg-white text-slate-900 border border-slate-200 shadow-xs'
                }`}
              >
                {isPopular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-600 to-rose-600 text-white text-[10px] uppercase font-extrabold tracking-wider px-3.5 py-0.5 rounded-full shadow-md">
                    সবচেয়ে জনপ্রিয় প্যাকেজ
                  </span>
                )}

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-lg sm:text-xl">{plan.title}</h3>
                    <span
                      className={`text-xs px-3 py-1 rounded-full font-bold ${
                        isPopular ? 'bg-indigo-500/30 text-indigo-300' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {toBengaliNumber(plan.durationDays)} দিন মেয়াদ
                    </span>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-extrabold">৳ {toBengaliNumber(plan.price)}</span>
                    <span className={`text-xs ${isPopular ? 'text-slate-400' : 'text-slate-500'}`}>
                      / {toBengaliNumber(plan.durationDays)} দিন
                    </span>
                  </div>

                  <p className={`text-xs leading-relaxed ${isPopular ? 'text-slate-300' : 'text-slate-600'}`}>
                    {plan.description || 'JFT-Basic পরীক্ষার সকল মক টেস্ট আনলিমিটেড দেওয়ার সুযোগ ও বিস্তারিত ফলাফল।'}
                  </p>

                  <div className="pt-4 border-t border-slate-200/20 space-y-2.5 text-xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                      <span>সকল JFT-Basic মক টেস্ট আনলিমিটেড অ্যাক্সেস</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                      <span>রিয়েল লিসেনিং অডিও প্লেয়ার সুবিধা</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                      <span>কাঞ্জি ফুরিগানা ও ডার্ক মোড নিয়ন্ত্রণ</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                      <span>বিকাশ ও নগদ ম্যানুয়াল পেমেন্ট ভেরিফিকেশন</span>
                    </div>
                  </div>
                </div>

                <div className="pt-6">
                  <button
                    type="button"
                    onClick={onOpenAuth}
                    className={`w-full py-3.5 rounded-xl font-bold text-xs sm:text-sm transition shadow-xs flex items-center justify-center gap-2 cursor-pointer ${
                      isPopular
                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                        : 'bg-slate-900 hover:bg-slate-800 text-white'
                    }`}
                  >
                    <span>প্যাকেজটি গ্রহণ করুন</span>
                    <ChevronRight size={14} />
                  </button>

                  <div className="mt-3 flex items-center justify-center gap-2 text-[11px] text-slate-400">
                    <span>পেমেন্ট মেথড:</span>
                    <span className="font-extrabold text-pink-600">bKash</span>
                    <span>•</span>
                    <span className="font-extrabold text-orange-600">Nagad</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 6. FAQ ACCORDION SECTION */}
      <section id="faq-section" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-2 mb-8">
          <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider bg-indigo-50 px-3 py-1 rounded-full">
            よくある質問 (FAQ)
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            সাধারণ জিজ্ঞাসাসমূহ
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => {
            const isOpen = expandedFaq === i;
            return (
              <div
                key={i}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs transition"
              >
                <button
                  type="button"
                  onClick={() => setExpandedFaq(isOpen ? null : i)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-sm sm:text-base text-slate-900 cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <HelpCircle size={18} className="text-indigo-600 shrink-0" />
                    <span>{faq.q}</span>
                  </span>
                  {isOpen ? (
                    <ChevronUp size={18} className="text-slate-400 shrink-0" />
                  ) : (
                    <ChevronDown size={18} className="text-slate-400 shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 7. MODERN FOOTER */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div className="space-y-2">
            <div className="flex items-center justify-center md:justify-start gap-2.5 text-white font-extrabold text-base">
              <div className="w-6 h-6 rounded-lg bg-rose-500 flex items-center justify-center text-[10px] text-white font-bold">
                日
              </div>
              <span>JFT-Basic Pro মক টেস্ট</span>
            </div>
            <p className="max-w-sm text-slate-400 text-xs leading-relaxed">
              জাপান ফাউন্ডেশন টেস্ট ফর বেসিক জাপানিজ (A2) পরীক্ষার জন্য বাংলা নির্দেশিকা ও জাপানি প্রশ্নের নির্ভরযোগ্য প্রস্তুতি প্ল্যাটফর্ম।
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 text-xs font-semibold">
            <button
              type="button"
              onClick={onOpenAuth}
              className="text-indigo-400 hover:text-indigo-300 transition cursor-pointer"
            >
              লগইন / রেজিস্টার
            </button>
            <span>•</span>
            <a href="#tests-section" className="hover:text-white transition">
              মক টেস্টসমূহ
            </a>
            <span>•</span>
            <a href="#sections-overview" className="hover:text-white transition">
              ৪টি সেকশন
            </a>
            <span>•</span>
            <a href="#pricing-section" className="hover:text-white transition">
              সাবস্ক্রিপশন প্যাকেজ
            </a>
          </div>

          <div className="text-[11px] text-slate-500">
            © {new Date().getFullYear()} JFT-Basic Pro. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};
