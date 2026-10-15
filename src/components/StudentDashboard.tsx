import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, getDoc, updateDoc, setDoc, query, where, increment } from 'firebase/firestore';
import { UserProfile, TestDefinition, AttemptRecord, SubscriptionPlan, PromoCode, PromoRedemption, SubscriptionRecord } from '../types';
import { DEFAULT_PLANS } from '../utils/seedData';
import { PaymentModal } from './PaymentModal';
import { Sparkles, BookOpen, Clock, Award, CheckCircle, AlertCircle, Play, ChevronRight, Tag, Gift, CreditCard, ShieldAlert } from 'lucide-react';

interface StudentDashboardProps {
  user: UserProfile;
  onStartExam: (test: TestDefinition) => void;
  onViewResult: (attempt: AttemptRecord, test: TestDefinition) => void;
  onRefreshUser: (updatedProfile?: UserProfile) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  user,
  onStartExam,
  onViewResult,
  onRefreshUser,
}) => {
  const [tests, setTests] = useState<TestDefinition[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>(DEFAULT_PLANS);
  const [attempts, setAttempts] = useState<AttemptRecord[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [loading, setLoading] = useState(true);

  // Promo code state
  const [promoInput, setPromoInput] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoMessage, setPromoMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string; type: 'percentage' | 'fixed'; value: number } | null>(null);

  // Pending payments check
  const [hasPendingPayment, setHasPendingPayment] = useState(false);

  const fetchData = async () => {
    try {
      // 1. Fetch published tests
      const testsSnap = await getDocs(collection(db, 'tests'));
      const testList: TestDefinition[] = [];
      testsSnap.forEach((d) => {
        testList.push(d.data() as TestDefinition);
      });
      setTests(testList.filter((t) => t.isPublished));

      // 2. Fetch active subscription plans from Firestore
      const plansSnap = await getDocs(collection(db, 'subscription_plans'));
      if (!plansSnap.empty) {
        const planList: SubscriptionPlan[] = [];
        plansSnap.forEach((d) => {
          const p = d.data() as SubscriptionPlan;
          if (p.isActive !== false) planList.push(p);
        });
        if (planList.length > 0) setPlans(planList);
      }

      // 3. Fetch student's exam attempts
      const attemptsQuery = query(
        collection(db, 'attempts'),
        where('userId', '==', user.uid)
      );
      const attemptsSnap = await getDocs(attemptsQuery);
      const attemptList: AttemptRecord[] = [];
      attemptsSnap.forEach((d) => {
        attemptList.push(d.data() as AttemptRecord);
      });
      setAttempts(attemptList);

      // 4. Check for pending payment requests
      const payQuery = query(
        collection(db, 'payments'),
        where('userId', '==', user.uid),
        where('status', '==', 'pending')
      );
      const paySnap = await getDocs(payQuery);
      setHasPendingPayment(!paySnap.empty);
    } catch (err) {
      console.error('Error fetching student data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user.uid]);

  // Check subscription expiry
  const isSubscribed = user.subscriptionStatus === 'active';
  const isExpired = user.subscriptionExpiresAt ? new Date(user.subscriptionExpiresAt) < new Date() : false;
  const hasActiveAccess = isSubscribed && !isExpired;

  // Handle promo code redemption
  const handleRedeemPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = promoInput.trim().toUpperCase();
    if (!code) return;

    setPromoLoading(true);
    setPromoMessage(null);

    try {
      const promoRef = doc(db, 'promo_codes', code);
      const promoSnap = await getDoc(promoRef);

      if (!promoSnap.exists()) {
        throw new Error('প্রোমো কোডটি সঠিক নয়। অনুগ্রহ করে যাচাই করুন।');
      }

      const promoData = promoSnap.data() as PromoCode;

      if (!promoData.isActive) {
        throw new Error('এই প্রোমো কোডটি বর্তমানে নিষ্ক্রিয় (Deactivated)।');
      }

      const now = new Date();
      if (new Date(promoData.startDate) > now) {
        throw new Error('এই প্রোমো কোডের মেয়াদ এখনো শুরু হয়নি।');
      }
      if (new Date(promoData.expiryDate) < now) {
        throw new Error('এই প্রোমো কোডের মেয়াদ উত্তীর্ণ হয়ে গেছে (Expired)।');
      }
      if (promoData.usedCount >= promoData.maxRedemptions) {
        throw new Error('এই প্রোমো কোডের ব্যবহারের সর্বোচ্চ সীমা শেষ হয়ে গেছে।');
      }

      // Check if this student already redeemed this promo
      const redId = `${code}_${user.uid}`;
      const redRef = doc(db, 'promo_redemptions', redId);
      const redSnap = await getDoc(redRef);
      if (redSnap.exists()) {
        throw new Error('আপনি ইতিপূর্বে এই প্রোমো কোডটি ব্যবহার করেছেন। প্রতি শিক্ষার্থী একবারই ব্যবহার করতে পারেন।');
      }

      // BENEFIT 1: Free subscription access
      if (promoData.benefitType === 'free_access') {
        const days = promoData.freeDurationDays || 7;
        const newExpiry = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

        // 1. Record redemption document first
        const redRecord: PromoRedemption = {
          id: redId,
          code,
          promoId: code,
          userId: user.uid,
          userEmail: user.email,
          redeemedAt: new Date().toISOString(),
          benefitApplied: `${days} Days Free Access`,
        };
        await setDoc(redRef, redRecord);

        // 2. Increment promo code count
        await updateDoc(promoRef, { usedCount: increment(1) });

        // 3. Record subscription document
        const subId = 'sub_promo_' + Date.now();
        const subRecord: SubscriptionRecord = {
          id: subId,
          userId: user.uid,
          userEmail: user.email,
          planId: 'promo_' + code,
          status: 'active',
          startDate: new Date().toISOString(),
          expiryDate: newExpiry.toISOString(),
          promoCode: code,
          createdAt: new Date().toISOString(),
        };
        await setDoc(doc(db, 'subscriptions', subId), subRecord);

        // 4. Update user subscription in Firestore
        await updateDoc(doc(db, 'users', user.uid), {
          subscriptionStatus: 'active',
          subscriptionExpiresAt: newExpiry.toISOString(),
          lastRedeemedPromo: code,
        });

        // 5. Construct immediately active user profile
        const activeProfile: UserProfile = {
          ...user,
          subscriptionStatus: 'active',
          subscriptionExpiresAt: newExpiry.toISOString(),
          lastRedeemedPromo: code,
        };

        setPromoMessage({
          type: 'success',
          text: `অভিনন্দন! "${code}" কোডটি সফল হয়েছে। আপনার অ্যাকাউন্টে ${days} দিনের ফ্রি প্রিমিয়াম অ্যাক্সেস সঙ্গে সঙ্গে সক্রিয় করা হয়েছে!`,
        });
        setPromoInput('');

        // Immediate application state update without page reload
        onRefreshUser(activeProfile);
        fetchData();
      } else if (promoData.benefitType === 'discount') {
        // BENEFIT 2: Discount on purchase
        setAppliedDiscount({
          code,
          type: promoData.discountType || 'percentage',
          value: promoData.discountValue || 10,
        });
        setPromoMessage({
          type: 'success',
          text: `কুপন "${code}" সফলভাবে যুক্ত হয়েছে! নিচের যেকোনো প্ল্যান কেনার সময় ছাড় প্রযোজ্য হবে।`,
        });
      }
    } catch (err: any) {
      setPromoMessage({
        type: 'error',
        text: err.message || 'প্রোমো কোড প্রয়োগে সমস্যা হয়েছে।',
      });
    } finally {
      setPromoLoading(false);
    }
  };

  const handleStartExamClick = (test: TestDefinition) => {
    if (!hasActiveAccess) {
      alert('পরীক্ষায় অংশগ্রহণ করার জন্য আপনার একটি সক্রিয় সাবস্ক্রিপশন প্রয়োজন। অনুগ্রহ করে নিচের প্ল্যানগুলো থেকে বিকাশ/নগদে সাবস্ক্রিপশন নিন অথবা প্রোমো কোড ব্যবহার করুন।');
      return;
    }
    onStartExam(test);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      {/* Subscription Banner */}
      <div className={`rounded-2xl p-6 md:p-8 text-white shadow-xl bg-gradient-to-r ${
        hasActiveAccess
          ? 'from-emerald-700 via-teal-800 to-slate-900'
          : 'from-slate-900 via-indigo-950 to-slate-900'
      }`}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold backdrop-blur-xs border border-white/15">
              <Sparkles size={14} className="text-amber-400" />
              <span>JFT-Basic স্টুডেন্ট ড্যাশবোর্ড</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              স্বাগতম, {user.displayName || user.email}!
            </h2>
            
            <div className="text-sm text-slate-200">
              {hasActiveAccess ? (
                <div className="flex items-center gap-2 text-emerald-300 font-semibold mt-1">
                  <CheckCircle size={16} />
                  <span>
                    আপনার প্রিমিয়াম সাবস্ক্রিপশন সক্রিয় রয়েছে (মেয়াদ: {user.subscriptionExpiresAt ? new Date(user.subscriptionExpiresAt).toLocaleDateString('bn-BD') : 'আনলিমিটেড'})
                  </span>
                </div>
              ) : hasPendingPayment ? (
                <div className="flex items-center gap-2 text-amber-300 font-semibold mt-1 bg-amber-500/20 p-2 rounded-lg border border-amber-400/30">
                  <Clock size={16} />
                  <span>
                    আপনার একটি পেমেন্ট রিকোয়েস্ট অ্যাডমিন ভেরিফিকেশনে রয়েছে। যাচাই শেষ হলে স্বয়ংক্রিয়ভাবে অ্যাক্সেস পেয়ে যাবেন।
                  </span>
                </div>
              ) : (
                <p className="text-slate-300 max-w-xl text-xs sm:text-sm">
                  অফিসিয়াল ফরম্যাটের মক টেস্ট ও অডিও লিসেনিং আনলক করতে নিচের সাবস্ক্রিপশন প্যাকেজ গ্রহণ করুন অথবা ফ্রি প্রোমো কোড দিন।
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full md:w-auto">
            {hasActiveAccess ? (
              <span className="px-4 py-2 bg-emerald-500/20 text-emerald-300 text-xs font-bold rounded-xl border border-emerald-400/30 flex items-center gap-2">
                <CheckCircle size={15} /> আনলিমিটেড টেস্ট অ্যাক্সেস সক্রিয়
              </span>
            ) : (
              <a
                href="#plans-section"
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2"
              >
                <CreditCard size={15} /> সাবস্ক্রিপশন কিনুন
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Promo Code Box */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift className="text-indigo-600" size={20} />
            <h3 className="text-base font-bold text-slate-900">প্রোমো কোড (Promo Code)</h3>
          </div>
          <span className="text-xs text-slate-500">স্পেশাল ডিসকাউন্ট বা ফ্রি সাবস্ক্রিপশন পান</span>
        </div>

        <form onSubmit={handleRedeemPromo} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
              <Tag size={16} />
            </span>
            <input
              type="text"
              value={promoInput}
              onChange={(e) => setPromoInput(e.target.value)}
              placeholder="যেমন: JFTFREE7"
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            type="submit"
            disabled={promoLoading || !promoInput.trim()}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition"
          >
            {promoLoading ? 'যাচাই হচ্ছে...' : 'কোড প্রয়োগ করুন'}
          </button>
        </form>

        {promoMessage && (
          <div
            className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
              promoMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {promoMessage.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            <span>{promoMessage.text}</span>
          </div>
        )}
      </div>

      {/* Available Tests Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="text-indigo-600" /> উপলব্ধ JFT-Basic মক টেস্টসমূহ
          </h3>
          <span className="text-xs text-slate-500 font-medium">
            মোট টেস্ট: {tests.length} টি
          </span>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400">লোড হচ্ছে...</div>
        ) : tests.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
            <p className="text-slate-500 text-sm">বর্তমানে কোনো প্রকাশিত টেস্ট নেই। অ্যাডমিন শীঘ্রই নতুন টেস্ট প্রকাশ করবেন।</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tests.map((test) => {
              const testAttempts = attempts.filter((a) => a.testId === test.id && a.status === 'submitted');
              const bestScore = testAttempts.length > 0 ? Math.max(...testAttempts.map((a) => a.score)) : null;

              return (
                <div
                  key={test.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-lg transition flex flex-col justify-between overflow-hidden"
                >
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold px-2.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-md">
                        JFT-Basic 形式
                      </span>
                      <span className="text-xs font-medium text-slate-500 flex items-center gap-1 font-mono">
                        <Clock size={13} /> {test.durationMinutes} 分 (মিনিট)
                      </span>
                    </div>

                    <h4 className="text-lg font-bold text-slate-900 leading-snug">{test.title}</h4>
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{test.description}</p>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <span>পাস মার্কস: {test.passingScore}</span>
                      {bestScore !== null && (
                        <span className="text-emerald-600 font-semibold flex items-center gap-1">
                          <CheckCircle size={14} /> সেরা স্কোর: {bestScore}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => handleStartExamClick(test)}
                      className={`w-full py-2.5 px-4 font-bold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-2 ${
                        hasActiveAccess
                          ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                          : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                      }`}
                    >
                      {hasActiveAccess ? (
                        <>
                          <Play size={14} />
                          <span>পরীক্ষা শুরু করুন (Start Test)</span>
                        </>
                      ) : (
                        <>
                          <ShieldAlert size={14} className="text-amber-600" />
                          <span>সাবস্ক্রিপশন প্রয়োজন (Locked)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Subscription Plans Section */}
      <div id="plans-section" className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="text-pink-600" /> সাবস্ক্রিপশন প্যাকেজসমূহ (Subscription Plans)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">বিকাশ অথবা নগদে সহজে পেমেন্ট করে তাৎক্ষণিক আনলক করুন</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between shadow-xs hover:border-pink-300 transition space-y-4"
            >
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-pink-700 bg-pink-50 px-2.5 py-1 rounded-md">
                  {plan.durationDays} দিনের আনলিমিটেড অ্যাক্সেস
                </span>
                <h4 className="text-lg font-bold text-slate-900">{plan.title}</h4>
                <p className="text-xs text-slate-600">{plan.description}</p>
                <div className="text-2xl font-black text-slate-900 pt-2">
                  ৳ {plan.price} <span className="text-xs font-normal text-slate-500">BDT</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPlan(plan)}
                className="w-full py-3 bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2"
              >
                <span>বিকাশ/নগদে পেমেন্ট করুন</span>
                <ChevronRight size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Past Attempts */}
      <div className="space-y-4 pt-4">
        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Award className="text-indigo-600" /> পরীক্ষার ফলাফল ও ইতিহাস (Past Results)
        </h3>

        {attempts.filter((a) => a.status === 'submitted').length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
            <p className="text-slate-500 text-sm">আপনি এখনো কোনো পরীক্ষা সম্পন্ন করেননি।</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
                    <th className="p-4">তারিখ</th>
                    <th className="p-4">স্কোর</th>
                    <th className="p-4">স্ট্যাটাস</th>
                    <th className="p-4 text-right">বিস্তারিত</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {attempts
                    .filter((a) => a.status === 'submitted')
                    .map((attempt) => (
                      <tr key={attempt.id} className="hover:bg-slate-50/50 transition">
                        <td className="p-4 text-slate-600 text-xs">
                          {new Date(attempt.submittedAt || attempt.startedAt).toLocaleString('bn-BD')}
                        </td>
                        <td className="p-4 font-bold text-slate-900">
                          {attempt.score} / {attempt.totalMarks}
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1 ${
                              attempt.passed
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {attempt.passed ? 'উত্তীর্ণ (Passed)' : 'অকৃতকার্য (Failed)'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => {
                              const t = tests.find((x) => x.id === attempt.testId);
                              if (t) onViewResult(attempt, t);
                            }}
                            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition"
                          >
                            রিপোর্ট দেখুন <ChevronRight size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {selectedPlan && (
        <PaymentModal
          isOpen={!!selectedPlan}
          onClose={() => setSelectedPlan(null)}
          plan={selectedPlan}
          user={user}
          appliedDiscount={appliedDiscount}
          onPaymentSubmitted={() => {
            fetchData();
          }}
        />
      )}
    </div>
  );
};
