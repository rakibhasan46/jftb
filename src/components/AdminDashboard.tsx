import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import {
  UserProfile,
  TestDefinition,
  QuestionDefinition,
  PaymentRecord,
  ExamSectionType,
  SubscriptionPlan,
  PromoCode,
  PromoRedemption,
  PaymentConfig,
  SubscriptionRecord,
} from '../types';
import { seedDefaultTestData, DEFAULT_PLANS, DEFAULT_PAYMENT_CONFIG } from '../utils/seedData';
import { JapaneseTextRenderer } from './JapaneseTextRenderer';
import {
  Shield,
  Users,
  BookOpen,
  CreditCard,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  Edit,
  Save,
  Sparkles,
  Check,
  X,
  FileText,
  Volume2,
  HelpCircle,
  Eye,
  Tag,
  Settings,
  Gift,
  Ban,
  UserCheck,
  Search,
} from 'lucide-react';

interface AdminDashboardProps {
  currentUser: UserProfile;
}

const AUDIO_PRESETS = [
  { label: 'কাস্টম অডিও URL', url: '' },
  { label: 'ট্রেন স্টেশন অ্যানাউন্সমেন্ট (Train Station)', url: 'https://actions.google.com/sounds/v1/transit/train_station.ogg' },
  { label: 'অফিস মিটিং ও ফোন কল (Office Ambient)', url: 'https://actions.google.com/sounds/v1/ambiences/office_ambient.ogg' },
  { label: 'জরুরি অ্যালার্ম ও বেল (Chime Bell)', url: 'https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg' },
];

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'tests' | 'questions' | 'plans' | 'payments' | 'promos' | 'students'>('overview');
  
  // Data lists
  const [tests, setTests] = useState<TestDefinition[]>([]);
  const [questions, setQuestions] = useState<QuestionDefinition[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [redemptions, setRedemptions] = useState<PromoRedemption[]>([]);
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig>(DEFAULT_PAYMENT_CONFIG);
  const [selectedTestId, setSelectedTestId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Search in students
  const [studentSearch, setStudentSearch] = useState('');

  // New Test form state
  const [newTestTitle, setNewTestTitle] = useState('');
  const [newTestDesc, setNewTestDesc] = useState('');
  const [newTestDuration, setNewTestDuration] = useState(60);
  const [newTestPassing, setNewTestPassing] = useState(200);

  // Question form & editing state
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [qSection, setQSection] = useState<ExamSectionType>('script_vocab');
  const [qQuestionType, setQQuestionType] = useState<string>('kanji_reading');
  const [qJapaneseText, setQJapaneseText] = useState('');
  const [qContextPassage, setQContextPassage] = useState('');
  const [qFurigana, setQFurigana] = useState('');
  const [qUnderlined, setQUnderlined] = useState('');
  const [qBengaliInst, setQBengaliInst] = useState('');
  const [qBengaliExp, setQBengaliExp] = useState('');
  const [qOptions, setQOptions] = useState(['', '', '', '']);
  const [qCorrect, setQCorrect] = useState(0);
  const [qAudioUrl, setQAudioUrl] = useState('');
  const [qImageUrl, setQImageUrl] = useState('');
  const [qMarks, setQMarks] = useState(5);
  const [qFilterSection, setQFilterSection] = useState<string>('all');

  // New Plan form state
  const [newPlanTitle, setNewPlanTitle] = useState('');
  const [newPlanPrice, setNewPlanPrice] = useState(499);
  const [newPlanDuration, setNewPlanDuration] = useState(30);
  const [newPlanDesc, setNewPlanDesc] = useState('');

  // New Promo Code form state
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [promoBenefitType, setPromoBenefitType] = useState<'free_access' | 'discount'>('free_access');
  const [promoFreeDays, setPromoFreeDays] = useState(7);
  const [promoDiscountType, setPromoDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [promoDiscountVal, setPromoDiscountVal] = useState(20);
  const [promoMaxUses, setPromoMaxUses] = useState(100);
  const [promoDaysValid, setPromoDaysValid] = useState(30);

  // Payment Config edit state
  const [configBkash, setConfigBkash] = useState('');
  const [configBkashType, setConfigBkashType] = useState<'personal' | 'merchant'>('personal');
  const [configNagad, setConfigNagad] = useState('');
  const [configNagadType, setConfigNagadType] = useState<'personal' | 'merchant'>('personal');
  const [configInstructions, setConfigInstructions] = useState('');

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await seedDefaultTestData();

      // 1. Fetch Tests
      const testsSnap = await getDocs(collection(db, 'tests'));
      const testList: TestDefinition[] = [];
      testsSnap.forEach((d) => testList.push(d.data() as TestDefinition));
      setTests(testList);
      if (testList.length > 0 && !selectedTestId) {
        setSelectedTestId(testList[0].id);
      }

      // 2. Fetch Payments
      const paySnap = await getDocs(collection(db, 'payments'));
      const payList: PaymentRecord[] = [];
      paySnap.forEach((d) => payList.push(d.data() as PaymentRecord));
      setPayments(payList);

      // 3. Fetch Students
      const userSnap = await getDocs(collection(db, 'users'));
      const userList: UserProfile[] = [];
      userSnap.forEach((d) => userList.push(d.data() as UserProfile));
      setStudents(userList);

      // 4. Fetch Plans
      const plansSnap = await getDocs(collection(db, 'subscription_plans'));
      const planList: SubscriptionPlan[] = [];
      plansSnap.forEach((d) => planList.push(d.data() as SubscriptionPlan));
      setPlans(planList.length > 0 ? planList : DEFAULT_PLANS);

      // 5. Fetch Promos & Redemptions
      const promoSnap = await getDocs(collection(db, 'promo_codes'));
      const promoList: PromoCode[] = [];
      promoSnap.forEach((d) => promoList.push(d.data() as PromoCode));
      setPromos(promoList);

      const redSnap = await getDocs(collection(db, 'promo_redemptions'));
      const redList: PromoRedemption[] = [];
      redSnap.forEach((d) => redList.push(d.data() as PromoRedemption));
      setRedemptions(redList);

      // 6. Fetch Payment Config
      const payConfigSnap = await getDoc(doc(db, 'settings', 'payment_config'));
      if (payConfigSnap.exists()) {
        const conf = payConfigSnap.data() as PaymentConfig;
        setPaymentConfig(conf);
        setConfigBkash(conf.bkashNumber);
        setConfigBkashType(conf.bkashType);
        setConfigNagad(conf.nagadNumber);
        setConfigNagadType(conf.nagadType);
        setConfigInstructions(conf.instructionsBengali);
      } else {
        setConfigBkash(DEFAULT_PAYMENT_CONFIG.bkashNumber);
        setConfigBkashType(DEFAULT_PAYMENT_CONFIG.bkashType);
        setConfigNagad(DEFAULT_PAYMENT_CONFIG.nagadNumber);
        setConfigNagadType(DEFAULT_PAYMENT_CONFIG.nagadType);
        setConfigInstructions(DEFAULT_PAYMENT_CONFIG.instructionsBengali);
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    if (selectedTestId) {
      const fetchQuestions = async () => {
        const qSnap = await getDocs(collection(db, 'tests', selectedTestId, 'questions'));
        const qList: QuestionDefinition[] = [];
        qSnap.forEach((d) => qList.push(d.data() as QuestionDefinition));
        setQuestions(qList);
      };
      fetchQuestions();
    }
  }, [selectedTestId]);

  // Test Actions
  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTestTitle.trim()) return;
    try {
      const id = 'test_' + Date.now();
      const test: TestDefinition = {
        id,
        title: newTestTitle,
        description: newTestDesc,
        durationMinutes: Number(newTestDuration),
        passingScore: Number(newTestPassing),
        isPublished: true,
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'tests', id), test);
      setNewTestTitle('');
      setNewTestDesc('');
      fetchAllData();
      alert('মক টেস্ট সফলভাবে তৈরি হয়েছে!');
    } catch (err) {
      console.error('Error creating test:', err);
    }
  };

  const handleTogglePublish = async (test: TestDefinition) => {
    try {
      await updateDoc(doc(db, 'tests', test.id), { isPublished: !test.isPublished });
      fetchAllData();
    } catch (err) {
      console.error('Error toggling publish:', err);
    }
  };

  const handleDeleteTest = async (testId: string) => {
    if (!confirm('আপনি কি নিশ্চিত যে এই টেস্টটি সম্পূর্ণ মুছে ফেলতে চান?')) return;
    try {
      await deleteDoc(doc(db, 'tests', testId));
      fetchAllData();
    } catch (err) {
      console.error('Error deleting test:', err);
    }
  };

  // Question Actions
  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTestId || !qJapaneseText.trim()) {
      alert('দয়া করে টেস্ট নির্বাচন করুন এবং জাপানি প্রশ্ন লিখুন।');
      return;
    }

    try {
      const qId = editingQuestionId || 'q_' + Date.now();
      const question: QuestionDefinition = {
        id: qId,
        testId: selectedTestId,
        section: qSection,
        questionType: qQuestionType as any,
        japaneseText: qJapaneseText,
        contextPassage: qContextPassage.trim() || undefined,
        furigana: qFurigana.trim() || undefined,
        underlinedText: qUnderlined.trim() || undefined,
        bengaliInstruction: qBengaliInst.trim(),
        bengaliExplanation: qBengaliExp.trim() || undefined,
        options: qOptions,
        correctAnswer: qCorrect,
        audioUrl: qAudioUrl.trim() || undefined,
        imageUrl: qImageUrl.trim() || undefined,
        marks: Number(qMarks),
      };

      await setDoc(doc(db, 'tests', selectedTestId, 'questions', qId), question);
      
      // Reset form
      setEditingQuestionId(null);
      setQJapaneseText('');
      setQContextPassage('');
      setQFurigana('');
      setQUnderlined('');
      setQBengaliInst('');
      setQBengaliExp('');
      setQOptions(['', '', '', '']);
      setQAudioUrl('');
      setQImageUrl('');

      // Refresh questions
      const qSnap = await getDocs(collection(db, 'tests', selectedTestId, 'questions'));
      const qList: QuestionDefinition[] = [];
      qSnap.forEach((d) => qList.push(d.data() as QuestionDefinition));
      setQuestions(qList);
      alert(editingQuestionId ? 'প্রশ্ন সফলভাবে আপডেট করা হয়েছে!' : 'প্রশ্ন সফলভাবে যুক্ত করা হয়েছে!');
    } catch (err) {
      console.error('Error saving question:', err);
    }
  };

  const handleStartEditQuestion = (q: QuestionDefinition) => {
    setEditingQuestionId(q.id);
    setQSection(q.section);
    setQQuestionType(q.questionType || 'kanji_reading');
    setQJapaneseText(q.japaneseText);
    setQContextPassage(q.contextPassage || '');
    setQFurigana(q.furigana || '');
    setQUnderlined(q.underlinedText || '');
    setQBengaliInst(q.bengaliInstruction);
    setQBengaliExp(q.bengaliExplanation || '');
    setQOptions([...q.options]);
    setQCorrect(q.correctAnswer);
    setQAudioUrl(q.audioUrl || '');
    setQImageUrl(q.imageUrl || '');
    setQMarks(q.marks);

    // Scroll smoothly to form
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  const handleCancelEditQuestion = () => {
    setEditingQuestionId(null);
    setQJapaneseText('');
    setQContextPassage('');
    setQFurigana('');
    setQUnderlined('');
    setQBengaliInst('');
    setQBengaliExp('');
    setQOptions(['', '', '', '']);
    setQAudioUrl('');
    setQImageUrl('');
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('আপনি কি নিশ্চিত যে এই প্রশ্নটি মুছে ফেলতে চান?')) return;
    try {
      await deleteDoc(doc(db, 'tests', selectedTestId, 'questions', questionId));
      setQuestions((prev) => prev.filter((q) => q.id !== questionId));
      if (editingQuestionId === questionId) {
        handleCancelEditQuestion();
      }
    } catch (err) {
      console.error('Error deleting question:', err);
    }
  };

  // Plan Actions
  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlanTitle.trim()) return;
    try {
      const pId = 'plan_' + Date.now();
      const plan: SubscriptionPlan = {
        id: pId,
        title: newPlanTitle,
        price: Number(newPlanPrice),
        durationDays: Number(newPlanDuration),
        description: newPlanDesc,
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'subscription_plans', pId), plan);
      setNewPlanTitle('');
      setNewPlanDesc('');
      fetchAllData();
      alert('নতুন সাবস্ক্রিপশন প্ল্যান তৈরি হয়েছে!');
    } catch (err) {
      console.error('Error creating plan:', err);
    }
  };

  const handleTogglePlan = async (plan: SubscriptionPlan) => {
    try {
      await updateDoc(doc(db, 'subscription_plans', plan.id), {
        isActive: plan.isActive === false ? true : false,
      });
      fetchAllData();
    } catch (err) {
      console.error('Error toggling plan:', err);
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!confirm('আপনি কি এই প্ল্যানটি মুছে ফেলতে চান?')) return;
    try {
      await deleteDoc(doc(db, 'subscription_plans', planId));
      fetchAllData();
    } catch (err) {
      console.error('Error deleting plan:', err);
    }
  };

  // Promo Code Actions
  const handleGenerateRandomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'JFT';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPromoCodeInput(code);
  };

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = promoCodeInput.trim().toUpperCase();
    if (!cleanCode) return;

    try {
      const now = new Date();
      const expiry = new Date(Date.now() + promoDaysValid * 24 * 60 * 60 * 1000);

      const promo: PromoCode = {
        id: cleanCode,
        code: cleanCode,
        benefitType: promoBenefitType,
        freeDurationDays: promoBenefitType === 'free_access' ? Number(promoFreeDays) : undefined,
        discountType: promoBenefitType === 'discount' ? promoDiscountType : undefined,
        discountValue: promoBenefitType === 'discount' ? Number(promoDiscountVal) : undefined,
        maxRedemptions: Number(promoMaxUses),
        usedCount: 0,
        startDate: now.toISOString(),
        expiryDate: expiry.toISOString(),
        isActive: true,
        createdAt: now.toISOString(),
      };

      await setDoc(doc(db, 'promo_codes', cleanCode), promo);
      setPromoCodeInput('');
      fetchAllData();
      alert(`প্রোমো কোড "${cleanCode}" সফলভাবে তৈরি হয়েছে!`);
    } catch (err) {
      console.error('Error creating promo:', err);
    }
  };

  const handleTogglePromo = async (promo: PromoCode) => {
    try {
      await updateDoc(doc(db, 'promo_codes', promo.id), { isActive: !promo.isActive });
      fetchAllData();
    } catch (err) {
      console.error('Error toggling promo:', err);
    }
  };

  const handleDeletePromo = async (codeId: string) => {
    if (!confirm('আপনি কি এই প্রোমো কোডটি মুছে ফেলতে চান?')) return;
    try {
      await deleteDoc(doc(db, 'promo_codes', codeId));
      fetchAllData();
    } catch (err) {
      console.error('Error deleting promo:', err);
    }
  };

  // Payment Verification Actions
  const handleApprovePayment = async (payment: PaymentRecord) => {
    try {
      // Find matching plan to get duration
      const plan = plans.find((p) => p.id === payment.planId) || DEFAULT_PLANS[0];
      const days = plan.durationDays || 30;
      const expiry = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

      // 1. Update Payment status
      await updateDoc(doc(db, 'payments', payment.id), {
        status: 'approved',
        reviewedBy: currentUser.email,
        reviewedAt: new Date().toISOString(),
      });

      // 2. Activate User subscription
      await updateDoc(doc(db, 'users', payment.userId), {
        subscriptionStatus: 'active',
        subscriptionExpiresAt: expiry.toISOString(),
      });

      // 3. Record in subscriptions collection
      const subId = 'sub_' + Date.now();
      const subRecord: SubscriptionRecord = {
        id: subId,
        userId: payment.userId,
        userEmail: payment.userEmail,
        planId: payment.planId,
        status: 'active',
        startDate: new Date().toISOString(),
        expiryDate: expiry.toISOString(),
        paymentId: payment.id,
        grantedBy: currentUser.email,
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'subscriptions', subId), subRecord);

      fetchAllData();
      alert('পেমেন্ট অনুমোদিত হয়েছে এবং শিক্ষার্থীর সাবস্ক্রিপশন সক্রিয় করা হয়েছে!');
    } catch (err) {
      console.error('Error approving payment:', err);
    }
  };

  const handleRejectPayment = async (paymentId: string) => {
    const reason = prompt('পেমেন্ট বাতিলের কারণ লিখুন (ঐচ্ছিক):') || 'ভুল TrxID অথবা পেমেন্ট পাওয়া যায়নি';
    try {
      await updateDoc(doc(db, 'payments', paymentId), {
        status: 'rejected',
        rejectionReason: reason,
        reviewedBy: currentUser.email,
        reviewedAt: new Date().toISOString(),
      });
      fetchAllData();
    } catch (err) {
      console.error('Error rejecting payment:', err);
    }
  };

  // Payment Config Save
  const handleSavePaymentConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updatedConfig: PaymentConfig = {
        bkashNumber: configBkash.trim(),
        bkashType: configBkashType,
        nagadNumber: configNagad.trim(),
        nagadType: configNagadType,
        instructionsBengali: configInstructions.trim(),
      };
      await setDoc(doc(db, 'settings', 'payment_config'), updatedConfig);
      setPaymentConfig(updatedConfig);
      alert('বিকাশ ও নগদ পেমেন্ট সেটিংস সফলভাবে সংরক্ষিত হয়েছে!');
    } catch (err) {
      console.error('Error saving payment config:', err);
    }
  };

  // Student Actions
  const handleToggleStudentSuspension = async (student: UserProfile) => {
    const willSuspend = !student.isSuspended;
    if (!confirm(`আপনি কি ${student.displayName || student.email} কে ${willSuspend ? 'স্থগিত (Suspend)' : 'পুনরায় সক্রিয় (Reactivate)'} করতে চান?`)) return;

    try {
      await updateDoc(doc(db, 'users', student.uid), {
        isSuspended: willSuspend,
      });
      fetchAllData();
    } catch (err) {
      console.error('Error toggling student suspension:', err);
    }
  };

  const handleGrantAccessToStudent = async (student: UserProfile) => {
    const daysStr = prompt('কত দিনের জন্য সাবস্ক্রিপশন দিতে চান?', '30');
    if (!daysStr) return;
    const days = parseInt(daysStr, 10);
    if (isNaN(days) || days <= 0) return;

    try {
      const expiry = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      await updateDoc(doc(db, 'users', student.uid), {
        subscriptionStatus: 'active',
        subscriptionExpiresAt: expiry.toISOString(),
      });

      const subId = 'sub_manual_' + Date.now();
      await setDoc(doc(db, 'subscriptions', subId), {
        id: subId,
        userId: student.uid,
        userEmail: student.email,
        planId: 'admin_manual',
        status: 'active',
        startDate: new Date().toISOString(),
        expiryDate: expiry.toISOString(),
        grantedBy: currentUser.email,
        createdAt: new Date().toISOString(),
      });

      fetchAllData();
      alert(`শিক্ষার্থীকে ${days} দিনের সাবস্ক্রিপশন প্রদান করা হয়েছে!`);
    } catch (err) {
      console.error('Error granting student sub:', err);
    }
  };

  const pendingPayments = payments.filter((p) => p.status === 'pending');
  const filteredStudents = students.filter(
    (s) =>
      s.email.toLowerCase().includes(studentSearch.toLowerCase()) ||
      (s.displayName && s.displayName.toLowerCase().includes(studentSearch.toLowerCase()))
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      {/* Admin Header */}
      <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-slate-800">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-400/30">
            <Shield size={14} /> JFT-Basic সম্পূর্ণ অ্যাডমিন কন্ট্রোল প্যানেল
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mt-1.5">
            সুপার অ্যাডমিন ড্যাশবোর্ড
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            মক টেস্ট, ফুরিগানা প্রশ্ন, বিকাশ/নগদ পেমেন্ট অনুমোদন, প্রোমো কোড ও সাবস্ক্রিপশন প্যাকেজ পরিচালনা করুন।
          </p>
        </div>

        <button
          onClick={fetchAllData}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition shadow-md"
        >
          {loading ? 'লোড হচ্ছে...' : 'ডাটা রিফ্রেশ করুন'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-6 overflow-x-auto text-xs sm:text-sm font-bold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 transition border-b-2 whitespace-nowrap ${
            activeTab === 'overview' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          ওভারভিউ
        </button>
        <button
          onClick={() => setActiveTab('tests')}
          className={`pb-3 transition border-b-2 whitespace-nowrap ${
            activeTab === 'tests' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          টেস্ট ম্যানেজমেন্ট ({tests.length})
        </button>
        <button
          onClick={() => setActiveTab('questions')}
          className={`pb-3 transition border-b-2 whitespace-nowrap ${
            activeTab === 'questions' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          প্রশ্ন ও ফুরিগানা এডিটর
        </button>
        <button
          onClick={() => setActiveTab('plans')}
          className={`pb-3 transition border-b-2 whitespace-nowrap ${
            activeTab === 'plans' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          সাবস্ক্রিপশন প্ল্যান ({plans.length})
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`pb-3 transition border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'payments' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          পেমেন্ট ভেরিফিকেশন
          {pendingPayments.length > 0 && (
            <span className="bg-pink-600 text-white text-[10px] px-2 py-0.2 rounded-full font-bold">
              {pendingPayments.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('promos')}
          className={`pb-3 transition border-b-2 whitespace-nowrap ${
            activeTab === 'promos' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          প্রোমো কোড ({promos.length})
        </button>
        <button
          onClick={() => setActiveTab('students')}
          className={`pb-3 transition border-b-2 whitespace-nowrap ${
            activeTab === 'students' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          শিক্ষার্থী তালিকা ({students.length})
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <div className="text-slate-500 text-xs font-bold uppercase">মোট শিক্ষার্থী</div>
              <div className="text-3xl font-black text-slate-900">{students.length}</div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <div className="text-slate-500 text-xs font-bold uppercase">প্রকাশিত মক টেস্ট</div>
              <div className="text-3xl font-black text-indigo-600">{tests.filter((t) => t.isPublished).length}</div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <div className="text-slate-500 text-xs font-bold uppercase">অপেক্ষমান পেমেন্ট</div>
              <div className="text-3xl font-black text-pink-600">{pendingPayments.length}</div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <div className="text-slate-500 text-xs font-bold uppercase">সক্রিয় সাবস্ক্রিপশন</div>
              <div className="text-3xl font-black text-emerald-600">
                {students.filter((s) => s.subscriptionStatus === 'active').length}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TEST MANAGEMENT */}
      {activeTab === 'tests' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Plus size={18} className="text-indigo-600" /> নতুন মক টেস্ট তৈরি করুন
            </h3>
            <form onSubmit={handleCreateTest} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">টেস্টের নাম (Title)</label>
                <input
                  type="text"
                  required
                  value={newTestTitle}
                  onChange={(e) => setNewTestTitle(e.target.value)}
                  placeholder="যেমন: JFT-Basic Official Mock Test 02"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">পরীক্ষার সময়সীমা (মিনিট)</label>
                <input
                  type="number"
                  required
                  value={newTestDuration}
                  onChange={(e) => setNewTestDuration(Number(e.target.value))}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">বিবরণ (Description)</label>
                <textarea
                  value={newTestDesc}
                  onChange={(e) => setNewTestDesc(e.target.value)}
                  placeholder="টেস্টের বিস্তারিত বিবরণ..."
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm h-16"
                ></textarea>
              </div>
              <button
                type="submit"
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition shadow-sm w-fit"
              >
                টেস্ট সংরক্ষণ করুন
              </button>
            </form>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
            <h3 className="text-base font-bold text-slate-900">বিদ্যমান মক টেস্টসমূহ ({tests.length})</h3>
            <div className="space-y-3">
              {tests.map((test) => (
                <div key={test.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900">{test.title}</h4>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${test.isPublished ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                        {test.isPublished ? 'প্রকাশিত (Published)' : 'ড্রাফট (Unpublished)'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{test.description} ({test.durationMinutes} মিনিট)</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTogglePublish(test)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                        test.isPublished ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                      }`}
                    >
                      {test.isPublished ? 'আনপাবলিশ' : 'পাবলিশ করুন'}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedTestId(test.id);
                        setActiveTab('questions');
                      }}
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition"
                    >
                      প্রশ্ন ম্যানেজ
                    </button>
                    <button
                      onClick={() => handleDeleteTest(test.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
                      title="টেস্ট মুছুন"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: QUESTION & FURIGANA EDITOR */}
      {activeTab === 'questions' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <h3 className="text-base font-bold text-slate-900">
                  {editingQuestionId ? 'প্রশ্ন সম্পাদনা (Edit Question)' : 'প্রশ্ন ও কাঞ্জি ফুরিগানা এডিটর'}
                </h3>
                {editingQuestionId && (
                  <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 text-xs font-bold rounded-full">
                    সম্পাদনা মোড সক্রিয়
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-700">টেস্ট নির্বাচন:</label>
                <select
                  value={selectedTestId}
                  onChange={(e) => {
                    setSelectedTestId(e.target.value);
                    if (editingQuestionId) handleCancelEditQuestion();
                  }}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                >
                  {tests.map((t) => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
              </div>
            </div>

            <form onSubmit={handleSaveQuestion} className="space-y-4 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">অফিসিয়াল সেকশন</label>
                  <select
                    value={qSection}
                    onChange={(e) => setQSection(e.target.value as ExamSectionType)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    <option value="script_vocab">সেকশন 1: 文字と語彙 (Script & Vocabulary)</option>
                    <option value="conversation">সেকশন 2: 会話と表現 (Conversation & Expression)</option>
                    <option value="listening">সেকশন 3: 聴解 (Listening Comprehension)</option>
                    <option value="reading">সেকশন 4: 読解 (Reading Comprehension)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">প্রশ্নের ধরন (Question Pattern)</label>
                  <select
                    value={qQuestionType}
                    onChange={(e) => setQQuestionType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    <option value="kanji_reading">漢字の読み方 (Kanji Reading)</option>
                    <option value="kanji_writing">漢字の表記 (Kanji Writing)</option>
                    <option value="vocabulary">語彙・言葉の使い方 (Vocabulary)</option>
                    <option value="grammar">文法・文の組み立て (Sentence Completion)</option>
                    <option value="conversation">会話と表現 (Conversation)</option>
                    <option value="listening_task">聴解・課題理解・アナウンス (Listening Task)</option>
                    <option value="listening_dialogue">聴解・日常会話 (Listening Dialogue)</option>
                    <option value="reading_comprehension">読解・案内文・メモ (Reading Comprehension)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">নম্বর (Marks)</label>
                  <input
                    type="number"
                    value={qMarks}
                    onChange={(e) => setQMarks(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">সঠিক উত্তর</label>
                  <select
                    value={qCorrect}
                    onChange={(e) => setQCorrect(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    <option value={0}>অপশন ১</option>
                    <option value={1}>অপশন ২</option>
                    <option value={2}>অপশন ৩</option>
                    <option value={3}>অপশন ৪</option>
                  </select>
                </div>
              </div>

              {/* Context Passage / Memo / Notice text (For Reading Comprehension) */}
              {(qSection === 'reading' || qSection === 'conversation' || qContextPassage) && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">
                      পড়ার অনুচ্ছেদ, অফিস মেমো বা নোটিশ (Passage / Memo / Notice)
                    </label>
                    <span className="text-[11px] text-slate-400">ঐচ্ছিক (Optional for reading tasks)</span>
                  </div>
                  <textarea
                    rows={3}
                    value={qContextPassage}
                    onChange={(e) => setQContextPassage(e.target.value)}
                    placeholder="【案内】\n本は 1人 5冊まで 借りることができます。\n月曜日は 休館日です。"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-japanese"
                  />
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    জাপানি প্রশ্ন টেক্সট (ফুরিগানা সহ যেমন: 会社(かいしゃ) অথবা আন্ডারলাইন <u>会社</u>)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setQJapaneseText((prev) => prev + ' 漢字(かんじ)')}
                      className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition"
                    >
                      + ফুরিগানা ফরম্যাট
                    </button>
                    <button
                      type="button"
                      onClick={() => setQJapaneseText((prev) => prev + ' <u></u>')}
                      className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-bold transition"
                    >
                      + আন্ডারলাইন ট্যাগ
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  required
                  value={qJapaneseText}
                  onChange={(e) => setQJapaneseText(e.target.value)}
                  placeholder="きょうは 会社(かいしゃ)を 休(やす)みます。"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base font-japanese"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    আন্ডারলাইন করার কাঞ্জি বা শব্দ (Underlined Word)
                  </label>
                  <input
                    type="text"
                    value={qUnderlined}
                    onChange={(e) => setQUnderlined(e.target.value)}
                    placeholder="যেমন: 会社"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-japanese"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">লিসেনিং অডিও ফাইল</label>
                    <select
                      onChange={(e) => {
                        if (e.target.value) setQAudioUrl(e.target.value);
                      }}
                      className="text-xs text-indigo-600 bg-transparent border-0 font-bold focus:ring-0"
                    >
                      {AUDIO_PRESETS.map((p, idx) => (
                        <option key={idx} value={p.url}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                  <input
                    type="text"
                    value={qAudioUrl}
                    onChange={(e) => setQAudioUrl(e.target.value)}
                    placeholder="https://... অডিও ফাইল লিঙ্ক"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ছবির URL (ঐচ্ছিক চিত্র)</label>
                  <input
                    type="text"
                    value={qImageUrl}
                    onChange={(e) => setQImageUrl(e.target.value)}
                    placeholder="https://... ডায়াগ্রাম বা সাইনবোর্ড"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              {/* LIVE PREVIEW OF QUESTION */}
              {qJapaneseText && (
                <div className="p-4 bg-slate-100 rounded-xl border border-slate-300 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                    <Eye size={14} /> লাইভ প্রিভিউ (পরীক্ষার্থীদের যেমন দেখাবে):
                  </div>
                  <div className="text-lg font-japanese bg-white p-4 rounded-lg border border-slate-200 text-center">
                    <JapaneseTextRenderer text={qJapaneseText} underlinedText={qUnderlined} />
                  </div>
                </div>
              )}

              {/* Bengali Instruction Quick Presets */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700">বাংলা নির্দেশিকা (Bengali Instruction)</label>
                  <span className="text-[11px] text-slate-500">ক্লিক করে দ্রুত বসান:</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {[
                    'আন্ডারলাইন করা কাঞ্জি শব্দের সঠিক হিরাগানা উচ্চারণ নির্বাচন করুন।',
                    'আন্ডারলাইন করা শব্দের সঠিক কাঞ্জি রূপ নির্বাচন করুন।',
                    'শূন্যস্থানে উপযুক্ত শব্দ বা রূপ নির্বাচন করুন।',
                    'অনুরোধমূলক বাক্যে ক্রিয়াপদের সঠিক রূপ নির্বাচন করুন।',
                    'কথোপকথনটি পড়ে সঠিক অভিব্যক্তি নির্বাচন করুন।',
                    'অডিও শুনে প্রশ্নের সঠিক উত্তর নির্বাচন করুন।',
                    'অনুচ্ছেদ বা নোটিশটি পড়ে সঠিক তথ্য নির্বাচন করুন।',
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setQBengaliInst(preset)}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-[10px] font-medium rounded border border-slate-200 transition"
                    >
                      + {preset.length > 28 ? preset.substring(0, 28) + '...' : preset}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  required
                  value={qBengaliInst}
                  onChange={(e) => setQBengaliInst(e.target.value)}
                  placeholder="যেমন: আন্ডারলাইন করা কাঞ্জি শব্দের সঠিক হিরাগানা উচ্চারণ নির্বাচন করুন।"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">বাংলা ব্যাখ্যা (Explanation)</label>
                <input
                  type="text"
                  value={qBengaliExp}
                  onChange={(e) => setQBengaliExp(e.target.value)}
                  placeholder="পরীক্ষা শেষে ফলাফল প্রদর্শনের সময় ছাত্ররা এই ব্যাখ্যাটি দেখতে পাবে।"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  উত্তর বিকল্পসমূহ (4 Options in Japanese - Never in Bengali)
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {qOptions.map((opt, idx) => (
                    <input
                      key={idx}
                      type="text"
                      required
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...qOptions];
                        newOpts[idx] = e.target.value;
                        setQOptions(newOpts);
                      }}
                      placeholder={`অপশন ${idx + 1} (জাপানি ভাষায়)`}
                      className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-japanese"
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition"
                >
                  {editingQuestionId ? 'প্রশ্ন আপডেট করুন (Update Question)' : 'প্রশ্ন যুক্ত করুন (Add Question)'}
                </button>
                {editingQuestionId && (
                  <button
                    type="button"
                    onClick={handleCancelEditQuestion}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                  >
                    সম্পাদনা বাতিল (Cancel)
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* QUESTIONS LIST WITH SECTION FILTERS */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                এই টেস্টের প্রশ্নসমূহ ({questions.length})
              </h3>

              {/* Section Filters */}
              <div className="flex flex-wrap gap-1.5 text-xs">
                {[
                  { id: 'all', label: 'সকল' },
                  { id: 'script_vocab', label: '文字と語彙' },
                  { id: 'conversation', label: '会話と表現' },
                  { id: 'listening', label: '聴解' },
                  { id: 'reading', label: '読解' },
                ].map((sec) => (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => setQFilterSection(sec.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      qFilterSection === sec.id
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {sec.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {questions
                .filter((q) => qFilterSection === 'all' || q.section === qFilterSection)
                .map((q, idx) => (
                  <div
                    key={q.id}
                    className={`p-4 rounded-xl border flex items-center justify-between gap-4 transition ${
                      editingQuestionId === q.id
                        ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-400/40'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                          {q.section}
                        </span>
                        {q.questionType && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                            {q.questionType}
                          </span>
                        )}
                        <span className="text-xs text-slate-500 font-medium">নম্বর: {q.marks}</span>
                      </div>
                      <div className="font-japanese font-medium text-slate-900 text-base">
                        {idx + 1}. <JapaneseTextRenderer text={q.japaneseText} underlinedText={q.underlinedText} />
                      </div>
                      <p className="text-xs text-slate-500">{q.bengaliInstruction}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full font-bold">
                        সঠিক: {q.correctAnswer + 1}
                      </span>
                      <button
                        onClick={() => handleStartEditQuestion(q)}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition"
                        title="প্রশ্ন সম্পাদনা করুন (Edit)"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
                        title="প্রশ্ন মুছুন (Delete)"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}

              {questions.filter((q) => qFilterSection === 'all' || q.section === qFilterSection).length === 0 && (
                <div className="text-center py-8 text-xs text-slate-400 font-medium">
                  এই সেকশনে কোনো প্রশ্ন পাওয়া যায়নি।
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SUBSCRIPTION PLANS */}
      {activeTab === 'plans' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Plus size={18} className="text-pink-600" /> নতুন সাবস্ক্রিপশন প্যাকেজ যোগ করুন
            </h3>
            <form onSubmit={handleCreatePlan} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">প্যাকেজের নাম (Title)</label>
                <input
                  type="text"
                  required
                  value={newPlanTitle}
                  onChange={(e) => setNewPlanTitle(e.target.value)}
                  placeholder="যেমন: ১৫ দিনের ফাস্ট-ট্র্যাক প্যাক"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">মূল্য (BDT)</label>
                <input
                  type="number"
                  required
                  value={newPlanPrice}
                  onChange={(e) => setNewPlanPrice(Number(e.target.value))}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">মেয়াদ (দিন)</label>
                <input
                  type="number"
                  required
                  value={newPlanDuration}
                  onChange={(e) => setNewPlanDuration(Number(e.target.value))}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1">বিবরণ</label>
                <input
                  type="text"
                  value={newPlanDesc}
                  onChange={(e) => setNewPlanDesc(e.target.value)}
                  placeholder="যেমন: সব টেস্ট আনলক, মডেল প্রশ্নপত্র সমাধান..."
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-2.5 bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs rounded-xl shadow-xs transition w-fit"
              >
                প্ল্যান তৈরি করুন
              </button>
            </form>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
            <h3 className="text-base font-bold text-slate-900">বিদ্যমান প্ল্যানসমূহ ({plans.length})</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {plans.map((p) => (
                <div key={p.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-pink-700">{p.durationDays} দিন</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${p.isActive !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                        {p.isActive !== false ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                      </span>
                    </div>
                    <h4 className="text-base font-bold text-slate-900 mt-1">{p.title}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{p.description}</p>
                    <div className="text-xl font-black text-slate-900 mt-2">৳ {p.price}</div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                    <button
                      onClick={() => handleTogglePlan(p)}
                      className="px-3 py-1 bg-white hover:bg-slate-100 border text-slate-700 text-xs font-bold rounded-lg transition"
                    >
                      {p.isActive !== false ? 'নিষ্ক্রিয় করুন' : 'সক্রিয় করুন'}
                    </button>
                    <button
                      onClick={() => handleDeletePlan(p.id)}
                      className="p-1 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 ml-auto"
                      title="মুছুন"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: PAYMENT VERIFICATION & CONFIG */}
      {activeTab === 'payments' && (
        <div className="space-y-6">
          {/* Payment Config Box */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Settings size={18} className="text-pink-600" /> বিকাশ ও নগদ নম্বর এবং নির্দেশিকা কনফিগারেশন
            </h3>
            <form onSubmit={handleSavePaymentConfig} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">বিকাশ নম্বর</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={configBkash}
                    onChange={(e) => setConfigBkash(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                  <select
                    value={configBkashType}
                    onChange={(e) => setConfigBkashType(e.target.value as any)}
                    className="px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    <option value="personal">Personal</option>
                    <option value="merchant">Merchant</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">নগদ নম্বর</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={configNagad}
                    onChange={(e) => setConfigNagad(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                  <select
                    value={configNagadType}
                    onChange={(e) => setConfigNagadType(e.target.value as any)}
                    className="px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    <option value="personal">Personal</option>
                    <option value="merchant">Merchant</option>
                  </select>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">পেমেন্ট করার নিয়মাবলী (নির্দেশিকা)</label>
                <textarea
                  value={configInstructions}
                  onChange={(e) => setConfigInstructions(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs h-16"
                ></textarea>
              </div>

              <button
                type="submit"
                className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition w-fit"
              >
                সেটিংস সেভ করুন
              </button>
            </form>
          </div>

          {/* Payment Requests Table */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="text-pink-600" /> জমা পড়া পেমেন্ট রিকোয়েস্ট ({payments.length})
            </h3>

            {payments.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">কোনো পেমেন্ট রিকোয়েস্ট নেই।</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase">
                      <th className="p-3">তারিখ</th>
                      <th className="p-3">শিক্ষার্থী</th>
                      <th className="p-3">মাধ্যম</th>
                      <th className="p-3">প্রেরক নম্বর</th>
                      <th className="p-3">TrxID</th>
                      <th className="p-3">টাকার পরিমাণ</th>
                      <th className="p-3">স্ট্যাটাস</th>
                      <th className="p-3 text-right">পদক্ষেপ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {payments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition">
                        <td className="p-3 text-slate-500">{new Date(p.createdAt).toLocaleString('bn-BD')}</td>
                        <td className="p-3 font-bold text-slate-900">{p.userName} <br/><span className="text-[11px] font-normal text-slate-500">{p.userEmail}</span></td>
                        <td className="p-3 uppercase font-bold text-[10px]">
                          <span className={`px-2 py-0.5 rounded ${p.paymentMethod === 'bkash' ? 'bg-pink-100 text-pink-700' : 'bg-orange-100 text-orange-700'}`}>
                            {p.paymentMethod}
                          </span>
                        </td>
                        <td className="p-3 font-mono">{p.senderPhone || 'N/A'}</td>
                        <td className="p-3 font-mono font-bold text-indigo-600">{p.transactionId}</td>
                        <td className="p-3 font-black text-slate-900">৳ {p.amount}</td>
                        <td className="p-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            p.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : p.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="p-3 text-right space-x-2">
                          {p.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApprovePayment(p)}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold"
                              >
                                অনুমোদন
                              </button>
                              <button
                                onClick={() => handleRejectPayment(p.id)}
                                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold"
                              >
                                বাতিল
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 6: PROMO CODE MANAGEMENT */}
      {activeTab === 'promos' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Gift size={18} className="text-indigo-600" /> নতুন প্রোমো কোড তৈরি করুন
            </h3>
            <form onSubmit={handleCreatePromo} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">প্রোমো কোড</label>
                    <button
                      type="button"
                      onClick={handleGenerateRandomCode}
                      className="text-[10px] text-indigo-600 font-bold hover:underline"
                    >
                      র‍্যান্ডম জেনারেট
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={promoCodeInput}
                    onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                    placeholder="যেমন: JFTPRO30"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">সুবিধার ধরন (Benefit)</label>
                  <select
                    value={promoBenefitType}
                    onChange={(e) => setPromoBenefitType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    <option value="free_access">ফ্রি সাবস্ক্রিপশন (Free Access)</option>
                    <option value="discount">প্ল্যানে ছাড় (Discount on Plan)</option>
                  </select>
                </div>

                {promoBenefitType === 'free_access' ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">ফ্রি অ্যাক্সেস মেয়াদ (দিন)</label>
                    <input
                      type="number"
                      required
                      value={promoFreeDays}
                      onChange={(e) => setPromoFreeDays(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">ছাড়ের পরিমাণ (% বা BDT)</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        required
                        value={promoDiscountVal}
                        onChange={(e) => setPromoDiscountVal(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                      />
                      <select
                        value={promoDiscountType}
                        onChange={(e) => setPromoDiscountType(e.target.value as any)}
                        className="px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                      >
                        <option value="percentage">% শতাংশ</option>
                        <option value="fixed">৳ নির্দিষ্ট টাকা</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">সর্বোচ্চ ব্যবহার সীমা (Max Uses)</label>
                  <input
                    type="number"
                    required
                    value={promoMaxUses}
                    onChange={(e) => setPromoMaxUses(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">কার্যকর থাকার মেয়াদ (দিন)</label>
                  <input
                    type="number"
                    required
                    value={promoDaysValid}
                    onChange={(e) => setPromoDaysValid(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
              >
                প্রোমো কোড তৈরি করুন
              </button>
            </form>
          </div>

          {/* Promo Codes Table */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
            <h3 className="text-base font-bold text-slate-900">বিদ্যমান প্রোমো কোডসমূহ ({promos.length})</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
                    <th className="p-3">কোড</th>
                    <th className="p-3">সুবিধা</th>
                    <th className="p-3">ব্যবহার</th>
                    <th className="p-3">মেয়াদ শেষ</th>
                    <th className="p-3">স্ট্যাটাস</th>
                    <th className="p-3 text-right">পদক্ষেপ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {promos.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-mono font-bold text-indigo-600 text-sm">{p.code}</td>
                      <td className="p-3 font-medium">
                        {p.benefitType === 'free_access'
                          ? `${p.freeDurationDays} দিনের ফ্রি অ্যাক্সেস`
                          : `${p.discountValue}${p.discountType === 'percentage' ? '%' : '৳'} ছাড়`}
                      </td>
                      <td className="p-3 font-mono">{p.usedCount} / {p.maxRedemptions}</td>
                      <td className="p-3 text-slate-500">{new Date(p.expiryDate).toLocaleDateString('bn-BD')}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded font-bold ${p.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                          {p.isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-2">
                        <button
                          onClick={() => handleTogglePromo(p)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-bold text-xs"
                        >
                          {p.isActive ? 'নিষ্ক্রিয়' : 'সক্রিয়'}
                        </button>
                        <button
                          onClick={() => handleDeletePromo(p.id)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded"
                          title="মুছুন"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Redemption History */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
            <h3 className="text-base font-bold text-slate-900">কোড রিডেম্পশন ইতিহাস (Redemption History - {redemptions.length})</h3>
            {redemptions.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">কোনো রিডেম্পশন ইতিহাস নেই।</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
                      <th className="p-3">তারিখ</th>
                      <th className="p-3">শিক্ষার্থী ইমেইল</th>
                      <th className="p-3">কোড</th>
                      <th className="p-3">প্রযুক্ত সুবিধা</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {redemptions.map((r) => (
                      <tr key={r.id}>
                        <td className="p-3 text-slate-500">{new Date(r.redeemedAt).toLocaleString('bn-BD')}</td>
                        <td className="p-3 font-semibold text-slate-800">{r.userEmail}</td>
                        <td className="p-3 font-mono font-bold text-indigo-600">{r.code}</td>
                        <td className="p-3 text-emerald-700 font-medium">{r.benefitApplied}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 7: STUDENTS MANAGEMENT */}
      {activeTab === 'students' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Users className="text-indigo-600" /> নিবন্ধিত শিক্ষার্থী তালিকা ({students.length})
            </h3>
            <div className="relative w-full sm:w-64">
              <Search size={14} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="ইমেইল বা নাম দিয়ে খুঁজুন..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 uppercase">
                  <th className="p-3">নাম</th>
                  <th className="p-3">ইমেইল</th>
                  <th className="p-3">রোল</th>
                  <th className="p-3">সাবস্ক্রিপশন</th>
                  <th className="p-3">স্ট্যাটাস</th>
                  <th className="p-3 text-right">পদক্ষেপ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((s) => (
                  <tr key={s.uid} className="hover:bg-slate-50/50">
                    <td className="p-3 font-bold text-slate-900">{s.displayName || 'N/A'}</td>
                    <td className="p-3 text-slate-600">{s.email}</td>
                    <td className="p-3 font-bold uppercase text-[10px]">
                      <span className={`px-2 py-0.5 rounded ${s.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-700'}`}>
                        {s.role}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        s.subscriptionStatus === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {s.subscriptionStatus}
                      </span>
                      {s.subscriptionExpiresAt && (
                        <span className="block text-[10px] text-slate-400 mt-0.5">
                          মেয়াদ: {new Date(s.subscriptionExpiresAt).toLocaleDateString('bn-BD')}
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      {s.isSuspended ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">স্থগিত</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">স্বাভাবিক</span>
                      )}
                    </td>
                    <td className="p-3 text-right space-x-2">
                      {s.role !== 'admin' && (
                        <>
                          <button
                            onClick={() => handleGrantAccessToStudent(s)}
                            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg transition"
                          >
                            + সাবস্ক্রিপশন দিন
                          </button>
                          <button
                            onClick={() => handleToggleStudentSuspension(s)}
                            className={`px-2.5 py-1 rounded-lg font-bold transition ${
                              s.isSuspended
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                : 'bg-red-50 text-red-700 hover:bg-red-100'
                            }`}
                          >
                            {s.isSuspended ? 'পুনরায় সক্রিয়' : 'সাসপেন্ড'}
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
