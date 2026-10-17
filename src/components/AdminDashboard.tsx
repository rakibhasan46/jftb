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
  where,
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
  NoticeItem,
  TestCategory,
  AttemptRecord,
  CategoryScore,
} from '../types';
import { seedDefaultTestData, DEFAULT_PLANS, DEFAULT_PAYMENT_CONFIG } from '../utils/seedData';
import { JapaneseTextRenderer } from './JapaneseTextRenderer';
import { toBengaliNumber, DEFAULT_TEST_CATEGORIES } from './ExamInterface';
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
  Bell,
  Copy,
  Award,
  Printer,
  Download,
  ChevronUp,
  ChevronDown,
  ListFilter,
  Calendar,
  Coins,
  Ticket,
  RotateCcw,
  History,
  Clock,
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
  const [activeTab, setActiveTab] = useState<'overview' | 'tests' | 'questions' | 'results' | 'subscriptions' | 'plans' | 'payments' | 'promos' | 'students' | 'notices'>('overview');
  
  // Data lists
  const [tests, setTests] = useState<TestDefinition[]>([]);
  const [questions, setQuestions] = useState<QuestionDefinition[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [attempts, setAttempts] = useState<AttemptRecord[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [redemptions, setRedemptions] = useState<PromoRedemption[]>([]);
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([]);
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig>(DEFAULT_PAYMENT_CONFIG);
  const [selectedTestId, setSelectedTestId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Search in students
  const [studentSearch, setStudentSearch] = useState('');

  // Subscriptions Tab State
  const [subFilter, setSubFilter] = useState<'all' | 'active' | 'expired' | 'cancelled'>('all');
  const [subSearch, setSubSearch] = useState('');
  const [subGrantStudentId, setSubGrantStudentId] = useState('');
  const [subGrantPlanId, setSubGrantPlanId] = useState('plan_1_month');
  const [subGrantDays, setSubGrantDays] = useState(30);

  // Result Panel State
  const [resultSearch, setResultSearch] = useState('');
  const [resultFilter, setResultFilter] = useState<'all' | 'passed' | 'failed'>('all');
  const [expandedAttemptId, setExpandedAttemptId] = useState<string | null>(null);

  // Dynamic Category Management State
  const [newCatName, setNewCatName] = useState('');
  const [newCatNameJp, setNewCatNameJp] = useState('');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState('');
  const [showCatManager, setShowCatManager] = useState(false);

  // New Notice state
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeMessage, setNoticeMessage] = useState('');
  const [noticePriority, setNoticePriority] = useState<'normal' | 'important' | 'urgent'>('normal');
  const [noticeDaysValid, setNoticeDaysValid] = useState(14);

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
      await seedDefaultTestData(true);

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
      userSnap.forEach((d) => {
        const u = d.data() as UserProfile;
        userList.push(u);
      });
      setStudents(userList);

      // 4. Fetch Plans
      const plansSnap = await getDocs(collection(db, 'subscription_plans'));
      const planList: SubscriptionPlan[] = [];
      plansSnap.forEach((d) => planList.push(d.data() as SubscriptionPlan));
      setPlans(planList.length > 0 ? planList : DEFAULT_PLANS);

      // 5. Fetch Subscriptions
      const subSnap = await getDocs(collection(db, 'subscriptions'));
      const subList: SubscriptionRecord[] = [];
      subSnap.forEach((d) => subList.push(d.data() as SubscriptionRecord));
      subList.sort((a, b) => new Date(b.createdAt || b.startDate).getTime() - new Date(a.createdAt || a.startDate).getTime());
      setSubscriptions(subList);

      // 6. Fetch Promos & Redemptions
      const promoSnap = await getDocs(collection(db, 'promo_codes'));
      const promoList: PromoCode[] = [];
      promoSnap.forEach((d) => promoList.push(d.data() as PromoCode));
      setPromos(promoList);

      const redSnap = await getDocs(collection(db, 'promo_redemptions'));
      const redList: PromoRedemption[] = [];
      redSnap.forEach((d) => redList.push(d.data() as PromoRedemption));
      setRedemptions(redList);

      // 9. Fetch Payment Config
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

      // 10. Fetch Notices
      const noticeSnap = await getDocs(collection(db, 'notices'));
      const noticeList: NoticeItem[] = [];
      noticeSnap.forEach((d) => noticeList.push(d.data() as NoticeItem));
      noticeList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setNotices(noticeList);

      // 11. Fetch Exam Attempts
      const attemptsSnap = await getDocs(collection(db, 'attempts'));
      const attemptList: AttemptRecord[] = [];
      attemptsSnap.forEach((d) => attemptList.push(d.data() as AttemptRecord));
      attemptList.sort((a, b) => new Date(b.submittedAt || b.startedAt).getTime() - new Date(a.submittedAt || a.startedAt).getTime());
      setAttempts(attemptList);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Notice Actions
  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeTitle.trim() || !noticeMessage.trim()) {
      alert('নোটিশের শিরোনাম ও বার্তা পূরণ করুন।');
      return;
    }
    try {
      const nId = 'notice_' + Date.now();
      const now = new Date();
      const expires = Number(noticeDaysValid) > 0 ? new Date(Date.now() + Number(noticeDaysValid) * 24 * 60 * 60 * 1000).toISOString() : null;
      const notice: NoticeItem = {
        id: nId,
        title: noticeTitle.trim(),
        message: noticeMessage.trim(),
        isPublished: true,
        priority: noticePriority,
        publishedAt: now.toISOString(),
        expiresAt: expires,
        createdAt: now.toISOString(),
        createdBy: currentUser.email,
      };
      await setDoc(doc(db, 'notices', nId), notice);
      setNoticeTitle('');
      setNoticeMessage('');
      fetchAllData();
      alert('নতুন নোটিশ সফলভাবে প্রকাশ করা হয়েছে!');
    } catch (err: any) {
      console.error('Error creating notice:', err);
      alert('নোটিশ তৈরিতে সমস্যা হয়েছে: ' + (err.message || String(err)));
    }
  };

  const handleToggleNotice = async (notice: NoticeItem) => {
    try {
      await updateDoc(doc(db, 'notices', notice.id), { isPublished: !notice.isPublished });
      fetchAllData();
    } catch (err) {
      console.error('Error toggling notice:', err);
    }
  };

  const handleDeleteNotice = async (noticeId: string) => {
    if (!confirm('আপনি কি এই নোটিশটি মুছে ফেলতে চান?')) return;
    try {
      await deleteDoc(doc(db, 'notices', noticeId));
      fetchAllData();
    } catch (err) {
      console.error('Error deleting notice:', err);
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
        categories: DEFAULT_TEST_CATEGORIES,
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

  // Category Actions (Dynamic categories for tests)
  const handleAddCategory = async (testId: string) => {
    if (!newCatName.trim()) {
      alert('দয়া করে ক্যাটাগরির নাম লিখুন।');
      return;
    }
    const currentTest = tests.find((t) => t.id === testId);
    if (!currentTest) return;
    const cats = currentTest.categories && currentTest.categories.length > 0
      ? [...currentTest.categories]
      : [...DEFAULT_TEST_CATEGORIES];

    const newCatId = 'cat_' + Date.now();
    const newCategory: TestCategory = {
      id: newCatId,
      name: newCatName.trim(),
      nameJp: newCatNameJp.trim() || undefined,
      order: cats.length + 1,
    };
    cats.push(newCategory);

    try {
      await updateDoc(doc(db, 'tests', testId), { categories: cats });
      setTests((prev) =>
        prev.map((t) => (t.id === testId ? { ...t, categories: cats } : t))
      );
      setNewCatName('');
      setNewCatNameJp('');
      alert('নতুন ক্যাটাগরি সফলভাবে যুক্ত হয়েছে!');
    } catch (err: any) {
      console.error('Error adding category:', err);
      alert('ক্যাটাগরি যুক্ত করতে ব্যর্থ হয়েছে: ' + (err.message || String(err)));
    }
  };

  const handleUpdateCategory = async (testId: string, catId: string) => {
    if (!editingCatName.trim()) return;
    const currentTest = tests.find((t) => t.id === testId);
    if (!currentTest) return;
    const cats = (currentTest.categories || DEFAULT_TEST_CATEGORIES).map((c) =>
      c.id === catId ? { ...c, name: editingCatName.trim() } : c
    );

    try {
      await updateDoc(doc(db, 'tests', testId), { categories: cats });
      setTests((prev) =>
        prev.map((t) => (t.id === testId ? { ...t, categories: cats } : t))
      );
      setEditingCatId(null);
      setEditingCatName('');
      alert('ক্যাটাগরির নাম সফলভাবে পরিবর্তন করা হয়েছে!');
    } catch (err: any) {
      console.error('Error updating category:', err);
      alert('ক্যাটাগরি আপডেট করতে ব্যর্থ হয়েছে: ' + (err.message || String(err)));
    }
  };

  const handleDeleteCategory = async (testId: string, catId: string) => {
    const questionsInCat = questions.filter((q) => q.section === catId);
    if (questionsInCat.length > 0) {
      if (!confirm(`এই ক্যাটাগরিতে ${questionsInCat.length}টি প্রশ্ন রয়েছে। আপনি কি নিশ্চিত যে ক্যাটাগরিটি মুছে ফেলবেন?`)) {
        return;
      }
    } else {
      if (!confirm('আপনি কি এই ক্যাটাগরিটি মুছে ফেলতে চান?')) return;
    }

    const currentTest = tests.find((t) => t.id === testId);
    if (!currentTest) return;
    const cats = (currentTest.categories || DEFAULT_TEST_CATEGORIES).filter((c) => c.id !== catId);
    // Re-assign orders
    cats.forEach((c, i) => {
      c.order = i + 1;
    });

    try {
      await updateDoc(doc(db, 'tests', testId), { categories: cats });
      setTests((prev) =>
        prev.map((t) => (t.id === testId ? { ...t, categories: cats } : t))
      );
      alert('ক্যাটাগরি সফলভাবে মুছে ফেলা হয়েছে!');
    } catch (err: any) {
      console.error('Error deleting category:', err);
      alert('ক্যাটাগরি মুছতে ব্যর্থ হয়েছে: ' + (err.message || String(err)));
    }
  };

  const handleReorderCategory = async (testId: string, catId: string, direction: 'up' | 'down') => {
    const currentTest = tests.find((t) => t.id === testId);
    if (!currentTest) return;
    const cats = [...(currentTest.categories || DEFAULT_TEST_CATEGORIES)].sort((a, b) => a.order - b.order);
    const idx = cats.findIndex((c) => c.id === catId);
    if (idx === -1) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === cats.length - 1) return;

    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    const temp = cats[idx];
    cats[idx] = cats[targetIdx];
    cats[targetIdx] = temp;

    cats.forEach((c, i) => {
      c.order = i + 1;
    });

    try {
      await updateDoc(doc(db, 'tests', testId), { categories: cats });
      setTests((prev) =>
        prev.map((t) => (t.id === testId ? { ...t, categories: cats } : t))
      );
    } catch (err: any) {
      console.error('Error reordering category:', err);
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
      const activeTest = tests.find((t) => t.id === selectedTestId);
      const testCats = activeTest?.categories || DEFAULT_TEST_CATEGORIES;
      const catObj = testCats.find((c) => c.id === qSection);

      const qId = editingQuestionId || 'q_' + Date.now();
      const question: QuestionDefinition = {
        id: qId,
        testId: selectedTestId,
        section: qSection,
        categoryName: catObj?.name,
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

  const handleDuplicateQuestion = async (q: QuestionDefinition) => {
    if (!selectedTestId) return;
    try {
      const newQId = 'q_' + Date.now();
      const duplicate: QuestionDefinition = {
        ...q,
        id: newQId,
        testId: selectedTestId,
        japaneseText: q.japaneseText,
      };
      await setDoc(doc(db, 'tests', selectedTestId, 'questions', newQId), duplicate);
      setQuestions((prev) => [...prev, duplicate]);
      alert('প্রশ্নটি সফলভাবে কপি / ডুপ্লিকেট করা হয়েছে!');
    } catch (err: any) {
      console.error('Error duplicating question:', err);
      alert('প্রশ্ন ডুপ্লিকেট করতে ব্যর্থ হয়েছে: ' + (err.message || String(err)));
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
      const days = Number(promoDaysValid) || 30;
      const expiry = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

      const promoData: Record<string, any> = {
        id: cleanCode,
        code: cleanCode,
        benefitType: promoBenefitType,
        maxRedemptions: Number(promoMaxUses) || 100,
        usedCount: 0,
        startDate: now.toISOString(),
        expiryDate: expiry.toISOString(),
        isActive: true,
        createdAt: now.toISOString(),
      };

      if (promoBenefitType === 'free_access') {
        promoData.freeDurationDays = Number(promoFreeDays) || 7;
      } else {
        promoData.discountType = promoDiscountType || 'percentage';
        promoData.discountValue = Number(promoDiscountVal) || 10;
      }

      await setDoc(doc(db, 'promo_codes', cleanCode), promoData);
      setPromoCodeInput('');
      fetchAllData();
      alert(`প্রোমো কোড "${cleanCode}" সফলভাবে তৈরি হয়েছে!`);
    } catch (err: any) {
      console.error('Error creating promo:', err);
      alert('প্রোমো কোড তৈরিতে সমস্যা হয়েছে: ' + (err.message || String(err)));
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

  // Subscription Actions
  const handleCancelSubscription = async (sub: SubscriptionRecord) => {
    if (!confirm(`আপনি কি এই শিক্ষার্থীর সাবস্ক্রিপশন বাতিল করতে চান?`)) return;
    try {
      await updateDoc(doc(db, 'subscriptions', sub.id), {
        status: 'cancelled',
        updatedAt: new Date().toISOString(),
      });

      await updateDoc(doc(db, 'users', sub.userId), {
        subscriptionStatus: 'none',
      });

      fetchAllData();
      alert('সাবস্ক্রিপশন সফলভাবে বাতিল করা হয়েছে।');
    } catch (err: any) {
      console.error('Error cancelling subscription:', err);
      alert('সাবস্ক্রিপশন বাতিলের সময় সমস্যা হয়েছে: ' + (err.message || String(err)));
    }
  };

  const handleExtendSubscription = async (sub: SubscriptionRecord) => {
    const daysStr = prompt('কত দিন বৃদ্ধি করতে চান?', '30');
    if (!daysStr) return;
    const days = parseInt(daysStr, 10);
    if (isNaN(days) || days <= 0) return;

    try {
      const baseDate = sub.expiryDate && new Date(sub.expiryDate) > new Date() ? new Date(sub.expiryDate) : new Date();
      const newExpiry = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);

      await updateDoc(doc(db, 'subscriptions', sub.id), {
        status: 'active',
        expiryDate: newExpiry.toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await updateDoc(doc(db, 'users', sub.userId), {
        subscriptionStatus: 'active',
        subscriptionExpiresAt: newExpiry.toISOString(),
      });

      fetchAllData();
      alert(`সাবস্ক্রিপশন সফলভাবে ${days} দিন বৃদ্ধি করা হয়েছে!`);
    } catch (err: any) {
      console.error('Error extending subscription:', err);
      alert('সাবস্ক্রিপশন বৃদ্ধির সময় সমস্যা হয়েছে: ' + (err.message || String(err)));
    }
  };

  const handleReactivateSubscription = async (sub: SubscriptionRecord) => {
    const daysStr = prompt('কত দিনের জন্য পুনরায় সক্রিয় করতে চান?', '30');
    if (!daysStr) return;
    const days = parseInt(daysStr, 10);
    if (isNaN(days) || days <= 0) return;

    try {
      const newExpiry = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

      await updateDoc(doc(db, 'subscriptions', sub.id), {
        status: 'active',
        startDate: new Date().toISOString(),
        expiryDate: newExpiry.toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await updateDoc(doc(db, 'users', sub.userId), {
        subscriptionStatus: 'active',
        subscriptionExpiresAt: newExpiry.toISOString(),
      });

      fetchAllData();
      alert(`সাবস্ক্রিপশন পুনরায় সক্রিয় করা হয়েছে!`);
    } catch (err: any) {
      console.error('Error reactivating sub:', err);
      alert('সক্রিয় করতে ব্যর্থ: ' + (err.message || String(err)));
    }
  };

  const handleCreateManualSubscriptionFromTab = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subGrantStudentId) {
      alert('অনুগ্রহ করে একজন শিক্ষার্থী নির্বাচন করুন।');
      return;
    }
    const student = students.find((s) => s.uid === subGrantStudentId);
    if (!student) return;

    const days = Number(subGrantDays) || 30;
    const planObj = plans.find((p) => p.id === subGrantPlanId);

    try {
      const expiry = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      const subId = 'sub_admin_' + Date.now();

      const subRecord: SubscriptionRecord = {
        id: subId,
        userId: student.uid,
        userEmail: student.email,
        userName: student.displayName,
        planId: subGrantPlanId,
        planTitle: planObj?.title || `${days} Days Pro Pack`,
        status: 'active',
        startDate: new Date().toISOString(),
        expiryDate: expiry.toISOString(),
        grantedBy: currentUser.email,
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'subscriptions', subId), subRecord);

      await updateDoc(doc(db, 'users', student.uid), {
        subscriptionStatus: 'active',
        subscriptionExpiresAt: expiry.toISOString(),
      });

      fetchAllData();
      alert(`শিক্ষার্থী ${student.displayName || student.email}-কে ${days} দিনের সাবস্ক্রিপশন সফলভাবে দেওয়া হয়েছে!`);
      setSubGrantStudentId('');
    } catch (err: any) {
      console.error('Error creating sub:', err);
      alert('সাবস্ক্রিপশন তৈরিতে সমস্যা হয়েছে: ' + (err.message || String(err)));
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

  const handleSeedDefaults = async () => {
    if (!confirm('ডিফল্ট জেএফটি-বেসিক প্রশ্ন, প্ল্যান এবং প্রোমো কোড ডেটাবেজে লোড করতে চান?')) return;
    try {
      await seedDefaultTestData(true);
      await fetchAllData();
      alert('ডিফল্ট ডেটা সফলভাবে প্রস্তুত করা হয়েছে!');
    } catch (err: any) {
      alert('সিড করতে সমস্যা হয়েছে: ' + (err.message || String(err)));
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

        <div className="flex items-center gap-3">
          <button
            onClick={handleSeedDefaults}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 font-bold text-xs rounded-xl transition border border-indigo-500/30 shadow-md flex items-center gap-1.5"
            title="পরীক্ষার ডিফল্ট প্রশ্ন, প্ল্যান এবং প্রোমো কোড লোড বা রিস্টোর করুন"
          >
            <Sparkles size={14} /> ডিফল্ট প্রশ্ন ও ডাটা সিড
          </button>
          <button
            onClick={fetchAllData}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition shadow-md"
          >
            {loading ? 'লোড হচ্ছে...' : 'ডাটা রিফ্রেশ করুন'}
          </button>
        </div>
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
          onClick={() => setActiveTab('subscriptions')}
          className={`pb-3 transition border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'subscriptions' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Calendar size={15} />
          <span>সাবস্ক্রিপশন তালিকা ({subscriptions.length})</span>
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
        <button
          onClick={() => setActiveTab('results')}
          className={`pb-3 transition border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'results' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Award size={15} className="text-amber-500" />
          <span>পরীক্ষার ফলাফল ({attempts.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('notices')}
          className={`pb-3 transition border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'notices' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Bell size={14} />
          <span>নোটিশ ও ঘোষণা ({notices.length})</span>
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
            <div className="space-y-4">
              {tests.map((test) => {
                const testCats = test.categories && test.categories.length > 0 ? test.categories : DEFAULT_TEST_CATEGORIES;
                return (
                  <div key={test.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 text-base">{test.title}</h4>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${test.isPublished ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                            {test.isPublished ? 'প্রকাশিত (Published)' : 'ড্রাফট (Unpublished)'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{test.description} ({test.durationMinutes} মিনিট | পাস মার্ক: {test.passingScore})</p>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => handleTogglePublish(test)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
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
                          className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition"
                        >
                          প্রশ্ন ম্যানেজ ({questions.filter(q => q.testId === test.id).length})
                        </button>
                        <button
                          onClick={() => handleDeleteTest(test.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-xl hover:bg-red-50 transition"
                          title="টেস্ট মুছুন"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {/* DYNAMIC CATEGORY MANAGER FOR THIS TEST */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <span>📂</span>
                          <span>এই টেস্টের ক্যাটাগরি তালিকা ({testCats.length}টি) - ইচ্ছামতো যোগ বা পরিবর্তন করুন</span>
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                        {testCats.map((cat, cIdx) => (
                          <div key={cat.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-[10px] font-bold text-indigo-600">ক্যাটাগরি {toBengaliNumber(cIdx + 1)}</div>
                              {editingCatId === cat.id ? (
                                <div className="flex items-center gap-1 mt-1">
                                  <input
                                    type="text"
                                    value={editingCatName}
                                    onChange={(e) => setEditingCatName(e.target.value)}
                                    className="px-2 py-1 bg-white border border-slate-300 rounded text-xs w-full"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateCategory(test.id, cat.id)}
                                    className="px-2 py-1 bg-emerald-600 text-white rounded text-[10px] font-bold"
                                  >
                                    সেভ
                                  </button>
                                </div>
                              ) : (
                                <div className="text-xs font-bold text-slate-800 truncate" title={cat.name}>
                                  {cat.name}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {editingCatId !== cat.id && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingCatId(cat.id);
                                    setEditingCatName(cat.name);
                                  }}
                                  className="p-1 text-slate-500 hover:text-indigo-600"
                                  title="নাম পরিবর্তন"
                                >
                                  <Edit size={13} />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleReorderCategory(test.id, cat.id, 'up')}
                                className="p-1 text-slate-400 hover:text-slate-700"
                                title="উপরে নিন"
                              >
                                <ChevronUp size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReorderCategory(test.id, cat.id, 'down')}
                                className="p-1 text-slate-400 hover:text-slate-700"
                                title="নিচে নিন"
                              >
                                <ChevronDown size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCategory(test.id, cat.id)}
                                className="p-1 text-slate-400 hover:text-red-600"
                                title="ক্যাটাগরি মুছুন"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Add Category Form */}
                      <div className="pt-2 flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={selectedTestId === test.id ? newCatName : ''}
                          onChange={(e) => {
                            setSelectedTestId(test.id);
                            setNewCatName(e.target.value);
                          }}
                          placeholder="নতুন ক্যাটাগরির নাম লিখুন (যেমন: ৫. অতিরিক্ত শব্দভাণ্ডার)"
                          className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddCategory(test.id)}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1 shrink-0"
                        >
                          <Plus size={14} />
                          <span>ক্যাটাগরি যোগ করুন</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ক্যাটাগরি নির্বাচন করুন</label>
                  <select
                    value={qSection}
                    onChange={(e) => setQSection(e.target.value as ExamSectionType)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    {(() => {
                      const activeT = tests.find((t) => t.id === selectedTestId);
                      const tCats = activeT?.categories && activeT.categories.length > 0 ? activeT.categories : DEFAULT_TEST_CATEGORIES;
                      return tCats.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ));
                    })()}
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
                  {qAudioUrl && (
                    <div className="mt-1.5 p-1.5 bg-slate-900 rounded-lg">
                      <div className="text-[10px] text-slate-300 font-bold mb-1">অডিও প্রিভিউ:</div>
                      <audio controls src={qAudioUrl} className="w-full h-7" />
                    </div>
                  )}
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
                  {qImageUrl && (
                    <div className="mt-1.5 p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-center">
                      <img
                        src={qImageUrl}
                        alt="Image Preview"
                        className="max-h-24 mx-auto rounded object-contain border"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
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
                        onClick={() => handleDuplicateQuestion(q)}
                        className="p-1.5 text-slate-500 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 transition"
                        title="প্রশ্ন ডুপ্লিকেট / কপি করুন (Duplicate)"
                      >
                        <Copy size={16} />
                      </button>
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

      {/* TAB: SUBSCRIPTIONS MANAGEMENT */}
      {activeTab === 'subscriptions' && (
        <div className="space-y-6">
          {/* Subscriptions Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <div className="text-slate-500 text-xs font-bold uppercase">মোট সাবস্ক্রিপশন</div>
                <div className="text-2xl font-black text-slate-900 mt-1">{subscriptions.length}</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                <Calendar size={20} />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <div className="text-slate-500 text-xs font-bold uppercase">সক্রিয় সাবস্ক্রিপশন</div>
                <div className="text-2xl font-black text-emerald-600 mt-1">
                  {subscriptions.filter((s) => s.status === 'active' && new Date(s.expiryDate) > new Date()).length}
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 size={20} />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <div className="text-slate-500 text-xs font-bold uppercase">মেয়াদোত্তীর্ণ</div>
                <div className="text-2xl font-black text-amber-600 mt-1">
                  {subscriptions.filter((s) => s.status === 'expired' || (s.status === 'active' && new Date(s.expiryDate) <= new Date())).length}
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock size={20} />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <div className="text-slate-500 text-xs font-bold uppercase">বাতিলকৃত</div>
                <div className="text-2xl font-black text-red-600 mt-1">
                  {subscriptions.filter((s) => s.status === 'cancelled').length}
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                <Ban size={20} />
              </div>
            </div>
          </div>

          {/* Create / Grant Subscription Manually */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Plus size={18} className="text-indigo-600" /> নতুন সাবস্ক্রিপশন তৈরি ও অনুমোদন করুন
            </h3>
            <form onSubmit={handleCreateManualSubscriptionFromTab} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">শিক্ষার্থী নির্বাচন *</label>
                <select
                  required
                  value={subGrantStudentId}
                  onChange={(e) => setSubGrantStudentId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                >
                  <option value="">-- শিক্ষার্থী বেছে নিন --</option>
                  {students.map((s) => (
                    <option key={s.uid} value={s.uid}>
                      {s.displayName || 'No Name'} ({s.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">প্ল্যান / প্যাকেজ</label>
                <select
                  value={subGrantPlanId}
                  onChange={(e) => {
                    setSubGrantPlanId(e.target.value);
                    const selected = plans.find((p) => p.id === e.target.value);
                    if (selected) setSubGrantDays(selected.durationDays);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({p.durationDays} দিন)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">মেয়াদ (দিন) *</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={subGrantDays}
                  onChange={(e) => setSubGrantDays(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 size={14} /> সাবস্ক্রিপশন সক্রিয় করুন
                </button>
              </div>
            </form>
          </div>

          {/* Subscriptions List */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-slate-900">সকল সাবস্ক্রিপশন ({subscriptions.length})</h3>
                <div className="flex gap-1 bg-slate-100 p-1 rounded-xl text-xs">
                  {(['all', 'active', 'expired', 'cancelled'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setSubFilter(st)}
                      className={`px-3 py-1 rounded-lg font-bold transition ${
                        subFilter === st ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {st === 'all' ? 'সকল' : st === 'active' ? 'সক্রিয়' : st === 'expired' ? 'মেয়াদোত্তীর্ণ' : 'বাতিল'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={subSearch}
                  onChange={(e) => setSubSearch(e.target.value)}
                  placeholder="ইমেইল বা নাম দিয়ে খুঁজুন..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
            </div>

            {subscriptions.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">কোনো সাবস্ক্রিপশন পাওয়া যায়নি।</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 uppercase">
                      <th className="p-3">শিক্ষার্থী</th>
                      <th className="p-3">প্ল্যান / প্যাকেজ</th>
                      <th className="p-3">শুরু তারিখ</th>
                      <th className="p-3">মেয়াদ শেষ</th>
                      <th className="p-3">অবস্থা</th>
                      <th className="p-3">অনুমোদনকারী</th>
                      <th className="p-3 text-right">পদক্ষেপ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {subscriptions
                      .filter((s) => {
                        const isExpiredNow = new Date(s.expiryDate) <= new Date();
                        const matchesFilter =
                          subFilter === 'all' ||
                          (subFilter === 'active' && s.status === 'active' && !isExpiredNow) ||
                          (subFilter === 'expired' && (s.status === 'expired' || (s.status === 'active' && isExpiredNow))) ||
                          (subFilter === 'cancelled' && s.status === 'cancelled');
                        const matchesSearch =
                          (s.userEmail && s.userEmail.toLowerCase().includes(subSearch.toLowerCase())) ||
                          (s.userName && s.userName.toLowerCase().includes(subSearch.toLowerCase()));
                        return matchesFilter && matchesSearch;
                      })
                      .map((sub) => {
                        const isExpiredNow = new Date(sub.expiryDate) <= new Date();
                        const isCurrentlyActive = sub.status === 'active' && !isExpiredNow;

                        return (
                          <tr key={sub.id} className="hover:bg-slate-50/50">
                            <td className="p-3">
                              <div className="font-bold text-slate-900">{sub.userName || 'Student'}</div>
                              <div className="text-[11px] font-mono text-slate-500">{sub.userEmail}</div>
                            </td>
                            <td className="p-3 font-semibold text-slate-800">
                              {sub.planTitle || plans.find((p) => p.id === sub.planId)?.title || sub.planId}
                            </td>
                            <td className="p-3 text-slate-500 whitespace-nowrap">
                              {new Date(sub.startDate).toLocaleDateString('bn-BD')}
                            </td>
                            <td className="p-3 font-medium text-slate-700 whitespace-nowrap">
                              {new Date(sub.expiryDate).toLocaleDateString('bn-BD')}
                            </td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  sub.status === 'cancelled'
                                    ? 'bg-red-100 text-red-800'
                                    : isCurrentlyActive
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {sub.status === 'cancelled'
                                  ? 'বাতিলকৃত'
                                  : isCurrentlyActive
                                  ? 'সক্রিয়'
                                  : 'মেয়াদোত্তীর্ণ'}
                              </span>
                            </td>
                            <td className="p-3 text-[11px] text-slate-500">
                              {sub.grantedBy || sub.paymentId || 'Online Payment'}
                            </td>
                            <td className="p-3 text-right space-x-2 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => handleExtendSubscription(sub)}
                                className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg transition"
                                title="মেয়াদ বাড়ান"
                              >
                                + মেয়াদ বৃদ্ধি
                              </button>
                              {sub.status === 'active' ? (
                                <button
                                  type="button"
                                  onClick={() => handleCancelSubscription(sub)}
                                  className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-lg transition"
                                >
                                  বাতিল করুন
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleReactivateSubscription(sub)}
                                  className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg transition"
                                >
                                  পুনরায় সক্রিয়
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
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

      {/* TAB: RESULTS & PDF DOWNLOAD */}
      {activeTab === 'results' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Award className="text-amber-500" /> শিক্ষার্থীদের পরীক্ষার ফলাফল ও ক্যাটাগরিভিত্তিক স্কোর ({attempts.length})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  শিক্ষার্থীদের পরীক্ষার ফলাফল, নাম, পরীক্ষার নাম, মোট প্রাপ্ত নম্বর এবং ক্যাটাগরিভিত্তিক নম্বর ও শতাংশ। প্রয়োজন অনুযায়ী স্ক্রিনশট নিতে পারবেন।
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative w-full sm:w-64">
                  <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={resultSearch}
                    onChange={(e) => setResultSearch(e.target.value)}
                    placeholder="শিক্ষার্থীর নাম বা ইমেইল দিয়ে খুঁজুন..."
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <select
                  value={resultFilter}
                  onChange={(e) => setResultFilter(e.target.value as any)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                >
                  <option value="all">সকল ফলাফল</option>
                  <option value="passed">উত্তীর্ণ (Passed)</option>
                  <option value="failed">অকৃতকার্য (Failed)</option>
                </select>
              </div>
            </div>

            {attempts.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                এখনো কোনো শিক্ষার্থী পরীক্ষা সম্পন্ন করেনি।
              </div>
            ) : (
              <div className="space-y-4">
                {attempts
                  .filter((att) => {
                    const matchSearch =
                      (att.userName && att.userName.toLowerCase().includes(resultSearch.toLowerCase())) ||
                      (att.userEmail && att.userEmail.toLowerCase().includes(resultSearch.toLowerCase())) ||
                      (att.testTitle && att.testTitle.toLowerCase().includes(resultSearch.toLowerCase()));
                    const matchFilter =
                      resultFilter === 'all' ||
                      (resultFilter === 'passed' && att.passed) ||
                      (resultFilter === 'failed' && !att.passed);
                    return matchSearch && matchFilter;
                  })
                  .map((att) => {
                    const studentObj = students.find((s) => s.uid === att.userId);
                    const testObj = tests.find((t) => t.id === att.testId);
                    const isExpanded = expandedAttemptId === att.id;
                    const pct = att.totalMarks > 0 ? Math.round((att.score / att.totalMarks) * 100) : 0;

                    return (
                      <div
                        key={att.id}
                        className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 transition hover:border-slate-300"
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  att.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {att.passed ? 'উত্তীর্ণ (Passed)' : 'অকৃতকার্য (Failed)'}
                              </span>
                              <span className="text-xs text-slate-500">
                                {new Date(att.submittedAt || att.startedAt).toLocaleString('bn-BD')}
                              </span>
                            </div>
                            <h4 className="text-base font-bold text-slate-900">
                              {att.userName || studentObj?.displayName || att.userEmail}
                            </h4>
                            <div className="text-xs text-slate-500">
                              ইমেইল: <span className="font-mono text-slate-700">{att.userEmail}</span> | টেস্ট: <strong className="text-slate-800">{att.testTitle || testObj?.title || 'JFT-Basic Test'}</strong>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="text-[11px] text-slate-500 font-semibold">প্রাপ্ত নম্বর / মোট:</div>
                              <div className="text-lg font-black text-indigo-600">
                                {att.score} / {att.totalMarks} <span className="text-xs text-slate-600">({pct}%)</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setExpandedAttemptId(isExpanded ? null : att.id)}
                                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-xs"
                              >
                                {isExpanded ? 'ক্যাটাগরি লুকান' : 'ক্যাটাগরি বিস্তারিত'}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Expanded Category Breakdown */}
                        {isExpanded && (
                          <div className="pt-3 border-t border-slate-200 space-y-3 animate-in fade-in">
                            <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                              <span>📊</span>
                              <span>ক্যাটাগরিভিত্তিক সঠিক উত্তর ও প্রাপ্ত নম্বর (Category Breakdown):</span>
                            </h5>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                              {(att.categoryBreakdown || []).map((cat) => (
                                <div key={cat.categoryId} className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                                  <div className="text-xs font-bold text-slate-800 truncate" title={cat.categoryName}>
                                    {cat.categoryName}
                                  </div>
                                  <div className="flex justify-between text-xs">
                                    <span className="text-slate-500">সঠিক উত্তর:</span>
                                    <strong className="text-emerald-700">{cat.correctCount} / {cat.totalQuestions} টি</strong>
                                  </div>
                                  <div className="flex justify-between text-xs">
                                    <span className="text-slate-500">নম্বর:</span>
                                    <strong className="text-slate-900">{cat.marksObtained} / {cat.totalMarks}</strong>
                                  </div>
                                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${cat.percentage >= 60 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                      style={{ width: `${Math.min(100, Math.max(0, cat.percentage))}%` }}
                                    ></div>
                                  </div>
                                  <div className="text-right text-[10px] font-bold text-slate-500">
                                    {cat.percentage}%
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
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

      {/* TAB 8: NOTICES & ANNOUNCEMENTS */}
      {activeTab === 'notices' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Bell className="text-indigo-600" size={18} /> নতুন নোটিশ ও ঘোষণা প্রকাশ করুন
            </h3>
            <form onSubmit={handleCreateNotice} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">নোটিশের শিরোনাম *</label>
                  <input
                    type="text"
                    required
                    value={noticeTitle}
                    onChange={(e) => setNoticeTitle(e.target.value)}
                    placeholder="যেমন: আগামী শুক্রবারের বিশেষ মক টেস্টের সময়সূচি"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">গুরুত্ব (Priority)</label>
                  <select
                    value={noticePriority}
                    onChange={(e) => setNoticePriority(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    <option value="normal">সাধারণ (Normal)</option>
                    <option value="important">গুরুত্বপূর্ণ (Important)</option>
                    <option value="urgent">জরুরি (Urgent)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">নোটিশের বিস্তারিত বার্তা *</label>
                <textarea
                  required
                  rows={3}
                  value={noticeMessage}
                  onChange={(e) => setNoticeMessage(e.target.value)}
                  placeholder="শিক্ষার্থীদের জন্য বিস্তারিত নির্দেশনা বা নোটিশ বার্তা লিখুন..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs leading-relaxed"
                ></textarea>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">মেয়াদ (দিন) - ০ দিলে কোনো মেয়াদ শেষ হবে না</label>
                  <input
                    type="number"
                    value={noticeDaysValid}
                    onChange={(e) => setNoticeDaysValid(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
              >
                নোটিশ প্রকাশ করুন
              </button>
            </form>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
            <h3 className="text-base font-bold text-slate-900">প্রকাশিত ও খসড়া নোটিশ তালিকা ({notices.length})</h3>
            {notices.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">কোনো নোটিশ এখনো যুক্ত করা হয়নি।</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 uppercase">
                      <th className="p-3">তারিখ</th>
                      <th className="p-3">শিরোনাম ও বার্তা</th>
                      <th className="p-3">গুরুত্ব</th>
                      <th className="p-3">মেয়াদ শেষ</th>
                      <th className="p-3">স্ট্যাটাস</th>
                      <th className="p-3 text-right">পদক্ষেপ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {notices.map((n) => (
                      <tr key={n.id} className="hover:bg-slate-50/50">
                        <td className="p-3 text-slate-500 whitespace-nowrap">
                          {new Date(n.publishedAt || n.createdAt).toLocaleDateString('bn-BD')}
                        </td>
                        <td className="p-3 max-w-md">
                          <div className="font-bold text-slate-900">{n.title}</div>
                          <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5">{n.message}</p>
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              n.priority === 'urgent'
                                ? 'bg-red-100 text-red-800'
                                : n.priority === 'important'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {n.priority}
                          </span>
                        </td>
                        <td className="p-3 text-slate-500 whitespace-nowrap">
                          {n.expiresAt ? new Date(n.expiresAt).toLocaleDateString('bn-BD') : 'মেয়াদহীন'}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              n.isPublished ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {n.isPublished ? 'প্রকাশিত' : 'অপ্রকাশিত'}
                          </span>
                        </td>
                        <td className="p-3 text-right space-x-2 whitespace-nowrap">
                          <button
                            onClick={() => handleToggleNotice(n)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold"
                          >
                            {n.isPublished ? 'আনপাবলিশ' : 'পাবলিশ'}
                          </button>
                          <button
                            onClick={() => handleDeleteNotice(n.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50"
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
            )}
          </div>
        </div>
      )}
    </div>
  );
};
