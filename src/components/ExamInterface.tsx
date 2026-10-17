import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import {
  TestDefinition,
  QuestionDefinition,
  UserProfile,
  AttemptRecord,
  TestCategory,
  CategoryScore,
} from '../types';
import { JapaneseTextRenderer } from './JapaneseTextRenderer';
import {
  Clock,
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Send,
  Pause,
  Play,
  Flag,
  FileText,
  LogOut,
} from 'lucide-react';

interface ExamInterfaceProps {
  test: TestDefinition;
  user: UserProfile;
  onExamFinished: (attempt: AttemptRecord) => void;
  onExit: () => void;
}

export const DEFAULT_TEST_CATEGORIES: TestCategory[] = [
  { id: 'script_vocab', name: '১. বর্ণ ও শব্দভাণ্ডার (Grammar & Vocabulary)', nameJp: '文字と語彙', order: 1 },
  { id: 'conversation', name: '২. কথোপকথন ও প্রকাশভঙ্গি (Conversation)', nameJp: '会話と表現', order: 2 },
  { id: 'listening', name: '৩. শ্রবণ বা লিসেনিং (Listening)', nameJp: '聴解', order: 3 },
  { id: 'reading', name: '৪. পঠন বা রিডিং (Reading)', nameJp: '読解', order: 4 },
];

// Bengali numbers helper
export const toBengaliNumber = (num: number | string): string => {
  const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/\d/g, (d) => bnDigits[parseInt(d, 10)]);
};

export const ExamInterface: React.FC<ExamInterfaceProps> = ({
  test,
  user,
  onExamFinished,
  onExit,
}) => {
  const [questions, setQuestions] = useState<QuestionDefinition[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [flaggedQuestionIds, setFlaggedQuestionIds] = useState<Set<string>>(new Set());
  const [timeLeft, setTimeLeft] = useState(test.durationMinutes * 60);
  const [loading, setLoading] = useState(true);

  // Dynamic categories from test definition or defaults
  const testCategories: TestCategory[] =
    test.categories && test.categories.length > 0
      ? [...test.categories].sort((a, b) => a.order - b.order)
      : DEFAULT_TEST_CATEGORIES;

  // Modals
  const [confirmModal, setConfirmModal] = useState(false);
  const [exitModal, setExitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Audio state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playCount, setPlayCount] = useState<Record<string, number>>({});
  const [audioVolume, setAudioVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Student Preferences: Theme & Furigana
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('jft_exam_theme') as 'light' | 'dark') || 'light';
  });
  const [showFurigana, setShowFurigana] = useState<boolean>(() => {
    return localStorage.getItem('jft_exam_furigana') !== 'false';
  });

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('jft_exam_theme', next);
  };

  const toggleFurigana = () => {
    const next = !showFurigana;
    setShowFurigana(next);
    localStorage.setItem('jft_exam_furigana', String(next));
  };

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const qSnap = await getDocs(collection(db, 'tests', test.id, 'questions'));
        const qList: QuestionDefinition[] = [];
        qSnap.forEach((d) => {
          qList.push(d.data() as QuestionDefinition);
        });

        // Dynamic category ordering
        const categoryOrderMap: Record<string, number> = {};
        testCategories.forEach((cat, idx) => {
          categoryOrderMap[cat.id] = idx;
        });

        qList.sort((a, b) => {
          const ordA = categoryOrderMap[a.section] !== undefined ? categoryOrderMap[a.section] : 999;
          const ordB = categoryOrderMap[b.section] !== undefined ? categoryOrderMap[b.section] : 999;
          if (ordA !== ordB) return ordA - ordB;
          return (a.order || 0) - (b.order || 0);
        });

        setQuestions(qList);
      } catch (err) {
        console.error('Error fetching questions for exam:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchQuestions();
  }, [test.id]);

  // Audio volume sync
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : audioVolume;
    }
  }, [audioVolume, isMuted]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft <= 0) {
      handleSubmitExam();
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  // Keyboard navigation (1-4 for options, ArrowLeft/ArrowRight for questions)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (confirmModal || exitModal) return;

      if (e.key === 'ArrowLeft') {
        goToPrevQuestion();
      } else if (e.key === 'ArrowRight') {
        goToNextQuestion();
      } else if (['1', '2', '3', '4'].includes(e.key)) {
        const optIdx = parseInt(e.key, 10) - 1;
        const currentQ = questions[currentQuestionIndex];
        if (currentQ && optIdx < currentQ.options.length) {
          handleSelectAnswer(currentQ.id, optIdx);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentQuestionIndex, questions, confirmModal, exitModal]);

  const activeQuestion = questions[currentQuestionIndex];

  const stopAudio = () => {
    if (audioRef.current && isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const goToQuestion = (index: number) => {
    stopAudio();
    setCurrentQuestionIndex(index);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToPrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      goToQuestion(currentQuestionIndex - 1);
    }
  };

  const goToNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      goToQuestion(currentQuestionIndex + 1);
    }
  };

  const handleSelectAnswer = (questionId: string, optionIndex: number) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }));
  };

  const toggleFlagCurrentQuestion = () => {
    if (!activeQuestion) return;
    setFlaggedQuestionIds((prev) => {
      const next = new Set(prev);
      if (next.has(activeQuestion.id)) {
        next.delete(activeQuestion.id);
      } else {
        next.add(activeQuestion.id);
      }
      return next;
    });
  };

  const handlePlayAudio = (qId: string) => {
    if (!audioRef.current) return;
    const currentCount = playCount[qId] || 0;
    if (currentCount >= 2 && !isPlaying) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
      setPlayCount((prev) => ({ ...prev, [qId]: currentCount + 1 }));
    }
  };

  const handleSubmitExam = async () => {
    if (submitting) return;
    setSubmitting(true);
    stopAudio();

    try {
      let score = 0;
      let totalMarks = 0;
      let rawCorrectCount = 0;

      // Dynamic Category Breakdown Calculation
      const categoryBreakdown: CategoryScore[] = testCategories.map((cat) => {
        const catQuestions = questions.filter((q) => q.section === cat.id);
        let catCorrect = 0;
        let catMarks = 0;
        let catTotalMarks = 0;

        catQuestions.forEach((q) => {
          catTotalMarks += q.marks;
          if (answers[q.id] === q.correctAnswer) {
            catCorrect += 1;
            catMarks += q.marks;
          }
        });

        const pct = catTotalMarks > 0 ? Math.round((catMarks / catTotalMarks) * 100) : 0;

        return {
          categoryId: cat.id,
          categoryName: cat.name,
          correctCount: catCorrect,
          totalQuestions: catQuestions.length,
          marksObtained: catMarks,
          totalMarks: catTotalMarks,
          percentage: pct,
        };
      });

      const activeCategoryBreakdown = categoryBreakdown.filter((c) => c.totalQuestions > 0);

      // Section scores map
      const sectionScores: Record<string, { correct: number; total: number; marks: number }> = {};

      questions.forEach((q) => {
        totalMarks += q.marks;
        if (!sectionScores[q.section]) {
          sectionScores[q.section] = { correct: 0, total: 0, marks: 0 };
        }
        sectionScores[q.section].total += q.marks;

        const studentAns = answers[q.id];
        if (studentAns === q.correctAnswer) {
          score += q.marks;
          rawCorrectCount += 1;
          sectionScores[q.section].correct += q.marks;
        }
      });

      const passed = score >= test.passingScore;
      const attemptId = 'att_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

      const attemptRecord: AttemptRecord = {
        id: attemptId,
        testId: test.id,
        testTitle: test.title,
        userId: user.uid,
        userName: user.displayName || user.email.split('@')[0],
        userEmail: user.email,
        startedAt: new Date(Date.now() - (test.durationMinutes * 60 - timeLeft) * 1000).toISOString(),
        submittedAt: new Date().toISOString(),
        score,
        totalMarks,
        rawCorrectCount,
        totalQuestions: questions.length,
        passed,
        sectionScores,
        categoryBreakdown: activeCategoryBreakdown,
        answers,
        status: 'submitted',
      };

      await setDoc(doc(db, 'attempts', attemptId), attemptRecord);
      onExamFinished(attemptRecord);
    } catch (err) {
      console.error('Error submitting exam:', err);
      setSubmitting(false);
    }
  };

  // Timer format in Bengali
  const formatTimerBengali = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const formattedSecs = secs < 10 ? `০${toBengaliNumber(secs)}` : toBengaliNumber(secs);
    return `${toBengaliNumber(mins)} মিনিট ${formattedSecs} সেকেন্ড`;
  };

  const answeredCount = Object.keys(answers).length;
  const unansweredCount = questions.length - answeredCount;
  const isTimeCritical = timeLeft < 300;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div className="text-slate-700 font-bold text-sm">পরীক্ষার প্রশ্নপত্র প্রস্তুত হচ্ছে...</div>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center space-y-4 max-w-md">
          <AlertCircle size={36} className="text-amber-500 mx-auto" />
          <h3 className="text-lg font-bold text-slate-800">কোনো প্রশ্ন পাওয়া যায়নি</h3>
          <p className="text-xs text-slate-500">এই মক টেস্টে এখনো কোনো প্রশ্ন যোগ করা হয়নি।</p>
          <button
            type="button"
            onClick={onExit}
            className="px-6 py-2.5 bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer"
          >
            ফিরে যান
          </button>
        </div>
      </div>
    );
  }

  // Active question category info
  const activeCategory = testCategories.find((c) => c.id === activeQuestion?.section) || {
    id: activeQuestion?.section || 'default',
    name: activeQuestion?.categoryName || activeQuestion?.section || 'প্রশ্ন বিভাগ',
    nameJp: '',
    order: 1,
  };

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors duration-200 ${
        theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'
      }`}
    >
      {/* 1. Header with Bengali Controls */}
      <header
        className={`sticky top-0 z-40 border-b shadow-sm ${
          theme === 'dark'
            ? 'bg-slate-900 border-slate-800 text-white'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-2">
          {/* Left: Exit & Test Name */}
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
            <button
              type="button"
              onClick={() => setExitModal(true)}
              className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer shrink-0"
              title="পরীক্ষা ত্যাগ করুন"
            >
              <LogOut size={18} />
            </button>
            <div className="min-w-0">
              <span className="text-[10px] sm:text-xs font-bold text-indigo-600 dark:text-indigo-400 block uppercase tracking-wider">
                JFT-Basic মক টেস্ট
              </span>
              <h2 className="text-xs sm:text-sm font-bold truncate max-w-[140px] sm:max-w-xs md:max-w-md">
                {test.title}
              </h2>
            </div>
          </div>

          {/* Right: Controls & Bengali Timer */}
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            {/* Furigana Toggle */}
            <button
              type="button"
              onClick={toggleFurigana}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                showFurigana
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
              title="কাঞ্জি ফুরিগানা চালু বা বন্ধ করুন"
            >
              <span className="hidden sm:inline">ফুরিগানা:</span>
              <span>{showFurigana ? 'চালু' : 'বন্ধ'}</span>
            </button>

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              title="থিম পরিবর্তন (লাইট / ডার্ক)"
            >
              <span>{theme === 'dark' ? '🌙' : '☀️'}</span>
              <span className="hidden sm:inline">{theme === 'dark' ? 'ডার্ক' : 'লাইট'}</span>
            </button>

            {/* Countdown Timer in Bengali */}
            <div
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition ${
                isTimeCritical
                  ? 'bg-red-500 text-white border-red-600 animate-pulse'
                  : theme === 'dark'
                  ? 'bg-slate-800 border-slate-700 text-amber-300'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              <Clock size={15} className={isTimeCritical ? 'text-white' : 'text-amber-500'} />
              <div className="text-right">
                <span className="text-[10px] hidden md:inline opacity-80 mr-1">সময় বাকি:</span>
                <span className="font-bold">{formatTimerBengali(timeLeft)}</span>
              </div>
            </div>

            {/* Finish & Submit Button */}
            <button
              type="button"
              onClick={() => setConfirmModal(true)}
              className="px-3.5 sm:px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Send size={13} />
              <span className="hidden sm:inline">পরীক্ষা সমাপ্ত করুন</span>
              <span className="sm:hidden">সাবমিট</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. Top Section & Question Counter Bar */}
      <div
        className={`border-b py-2.5 px-4 shadow-2xs ${
          theme === 'dark' ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          {/* Active Category Info */}
          <div className="flex items-center flex-wrap gap-2">
            <span className="font-bold px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              {activeCategory.name}
            </span>
            <span className="text-slate-400">|</span>
            <span className="font-bold">
              প্রশ্ন নং {toBengaliNumber(currentQuestionIndex + 1)} / মোট{' '}
              {toBengaliNumber(questions.length)}টি
            </span>
          </div>

          {/* Quick Review Flag Toggle */}
          <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-end">
            <div className="text-slate-500 text-[11px] font-medium">
              উত্তর সম্পন্ন: <strong className="text-emerald-600 font-bold">{toBengaliNumber(answeredCount)}</strong> / {toBengaliNumber(questions.length)}টি
            </div>

            <button
              type="button"
              onClick={toggleFlagCurrentQuestion}
              className={`px-3 py-1 rounded-lg border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                flaggedQuestionIds.has(activeQuestion.id)
                  ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700'
              }`}
            >
              <Flag size={13} className={flaggedQuestionIds.has(activeQuestion.id) ? 'fill-white' : ''} />
              <span>{flaggedQuestionIds.has(activeQuestion.id) ? 'রিভিউ মার্ক করা' : 'রিভিউ মার্ক'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Main Examination Body */}
      <main className="max-w-5xl mx-auto px-4 py-6 flex-1 w-full space-y-6">
        {/* Active Question Card */}
        <div
          className={`rounded-2xl p-6 md:p-8 space-y-6 border shadow-xs transition-colors ${
            theme === 'dark'
              ? 'bg-slate-900 border-slate-800'
              : 'bg-white border-slate-200'
          }`}
        >
          {/* Bengali Instructions (Only shown if defined for this question) */}
          {activeQuestion.bengaliInstruction && (
            <div className="p-3.5 bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl text-amber-950 dark:text-amber-200 text-xs flex items-start gap-2.5">
              <AlertCircle size={17} className="text-amber-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed font-semibold">
                <span className="text-[11px] text-amber-700 dark:text-amber-400 block uppercase font-bold tracking-wider">
                  【প্রয়োজনীয় নির্দেশনা】
                </span>
                {activeQuestion.bengaliInstruction}
              </div>
            </div>
          )}

          {/* Reading Context Passage / Notice (in Japanese) */}
          {activeQuestion.contextPassage && (
            <div
              className={`border rounded-2xl p-5 md:p-6 space-y-3 ${
                theme === 'dark'
                  ? 'bg-slate-950/70 border-slate-800'
                  : 'bg-slate-50 border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-2">
                <FileText size={16} className="text-indigo-600" />
                <span>【পঠন অনুচ্ছেদ / Reading Passage】</span>
              </div>
              <div className="text-sm md:text-base leading-loose font-japanese whitespace-pre-line">
                <JapaneseTextRenderer
                  text={activeQuestion.contextPassage}
                  showFurigana={showFurigana}
                />
              </div>
            </div>
          )}

          {/* Listening Audio Player (Max 2 Plays) */}
          {activeQuestion.audioUrl && (
            <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 border border-slate-800 shadow-xs">
              <audio
                ref={audioRef}
                src={activeQuestion.audioUrl}
                onEnded={() => setIsPlaying(false)}
              />
              <div className="flex items-center space-x-3 w-full sm:w-auto">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-md">
                  <Volume2 size={20} className="text-white" />
                </div>
                <div>
                  <div className="font-bold text-xs sm:text-sm">লিসেনিং অডিও শুনুন (Listening Audio)</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    প্লে হয়েছে:{' '}
                    <strong className="text-amber-300 font-bold">
                      {toBengaliNumber(playCount[activeQuestion.id] || 0)} / ২
                    </strong>{' '}
                    বার (সর্বোচ্চ ২ বার প্লে করা যাবে)
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                <div className="flex items-center space-x-1.5 bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700 text-xs">
                  <button
                    type="button"
                    onClick={() => setIsMuted((prev) => !prev)}
                    className="text-slate-300 hover:text-white cursor-pointer"
                  >
                    {isMuted || audioVolume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : audioVolume}
                    onChange={(e) => {
                      setIsMuted(false);
                      setAudioVolume(parseFloat(e.target.value));
                    }}
                    className="w-16 accent-indigo-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
                    title="ভলিউম নিয়ন্ত্রণ"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handlePlayAudio(activeQuestion.id)}
                  disabled={(playCount[activeQuestion.id] || 0) >= 2 && !isPlaying}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                  <span>{isPlaying ? 'পজ করুন (Pause)' : 'অডিও প্লে করুন (Play)'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Optional Question Image */}
          {activeQuestion.imageUrl && (
            <div className="max-w-md mx-auto rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2">
              <img
                src={activeQuestion.imageUrl}
                alt="Question Diagram"
                className="w-full h-auto object-contain max-h-60 mx-auto rounded-lg"
              />
            </div>
          )}

          {/* Japanese Question Prompt (Strictly in Japanese) */}
          <div
            className={`p-6 rounded-2xl border text-lg md:text-xl leading-loose font-japanese ${
              theme === 'dark'
                ? 'bg-slate-950 border-slate-800 text-slate-100'
                : 'bg-slate-50 border-slate-200 text-slate-900'
            }`}
          >
            <JapaneseTextRenderer
              text={activeQuestion.japaneseText}
              underlinedText={activeQuestion.underlinedText}
              showFurigana={showFurigana}
            />
          </div>

          {/* Japanese Answer Options (Strictly 4 Japanese Options) */}
          <div className="space-y-3 pt-1">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>সঠিক উত্তরটি নির্বাচন করুন:</span>
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                (কীবোর্ড ১, ২, ৩, ৪ দিয়েও উত্তর দেওয়া সম্ভব)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {activeQuestion.options.map((opt, idx) => {
                const isSelected = answers[activeQuestion.id] === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectAnswer(activeQuestion.id, idx)}
                    className={`p-4 rounded-xl border text-left transition flex items-center space-x-3.5 cursor-pointer ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/90 dark:bg-indigo-950/70 text-indigo-950 dark:text-indigo-100 font-bold shadow-xs ring-2 ring-indigo-600/30'
                        : theme === 'dark'
                        ? 'border-slate-800 bg-slate-800/60 hover:bg-slate-800 text-slate-200'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : theme === 'dark'
                          ? 'bg-slate-700 text-slate-300'
                          : 'bg-slate-100 text-slate-600 border border-slate-300'
                      }`}
                    >
                      {toBengaliNumber(idx + 1)}
                    </span>
                    <span className="text-base font-japanese tracking-wide leading-normal">
                      <JapaneseTextRenderer text={opt} showFurigana={showFurigana} />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Navigation Controls: Previous / Next buttons */}
        <div
          className={`rounded-2xl p-4 border shadow-xs flex items-center justify-between gap-4 ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <button
            type="button"
            disabled={currentQuestionIndex === 0}
            onClick={goToPrevQuestion}
            className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
          >
            <ChevronLeft size={16} />
            <span>পূর্ববর্তী প্রশ্ন</span>
          </button>

          <span className="text-xs font-bold text-slate-600 dark:text-slate-400 text-center">
            প্রশ্ন {toBengaliNumber(currentQuestionIndex + 1)} / {toBengaliNumber(questions.length)}
          </span>

          {currentQuestionIndex < questions.length - 1 ? (
            <button
              type="button"
              onClick={goToNextQuestion}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>পরবর্তী প্রশ্ন</span>
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmModal(true)}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Send size={14} />
              <span>পরীক্ষা শেষ ও সাবমিট করুন</span>
            </button>
          )}
        </div>

        {/* 4. Categorized Question Navigation Directly Below Exam */}
        {/* Dynamic categories: Admin can customize categories, names, and question counts */}
        <div
          className={`rounded-2xl p-5 md:p-6 border shadow-xs space-y-5 ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>📋</span>
                <span>ক্যাটাগরি অনুযায়ী প্রশ্ন নম্বর ও নেভিগেশন</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                যেকোনো প্রশ্ন নম্বরে ক্লিক করে সরাসরি সেই প্রশ্নে যেতে পারবেন
              </p>
            </div>

            {/* Status Legend in Bengali */}
            <div className="flex items-center flex-wrap gap-3 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-md bg-emerald-600 inline-block"></span>
                <span>উত্তর সম্পন্ন ({toBengaliNumber(answeredCount)})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 inline-block"></span>
                <span>বাকি আছে ({toBengaliNumber(unansweredCount)})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-md bg-amber-500 inline-block"></span>
                <span>রিভিউ মার্ক ({toBengaliNumber(flaggedQuestionIds.size)})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-md border-2 border-indigo-600 bg-indigo-50 dark:bg-indigo-950 inline-block"></span>
                <span>বর্তমান প্রশ্ন</span>
              </div>
            </div>
          </div>

          {/* Dynamic Categorized Question Blocks */}
          <div className="space-y-4">
            {testCategories.map((secMeta, catIdx) => {
              // Find all questions in this category with their global sequential indices
              const categoryQuestionsWithIdx = questions
                .map((q, idx) => ({ q, globalIdx: idx }))
                .filter(({ q }) => q.section === secMeta.id);

              if (categoryQuestionsWithIdx.length === 0) return null;

              const firstNum = categoryQuestionsWithIdx[0].globalIdx + 1;
              const lastNum = categoryQuestionsWithIdx[categoryQuestionsWithIdx.length - 1].globalIdx + 1;
              const rangeLabel =
                firstNum === lastNum
                  ? `প্রশ্ন ${toBengaliNumber(firstNum)}`
                  : `প্রশ্ন ${toBengaliNumber(firstNum)}–${toBengaliNumber(lastNum)}`;

              const categoryAnsweredCount = categoryQuestionsWithIdx.filter(
                ({ q }) => answers[q.id] !== undefined
              ).length;

              return (
                <div
                  key={secMeta.id}
                  className={`p-4 rounded-xl border transition-all ${
                    activeQuestion?.section === secMeta.id
                      ? 'border-indigo-300 dark:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-950/20'
                      : 'border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-600 text-white">
                        ক্যাটাগরি {toBengaliNumber(catIdx + 1)}
                      </span>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                        {secMeta.name}
                      </h4>
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {rangeLabel}
                      </span>
                    </div>

                    <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      উত্তর সম্পন্ন: <strong className="text-emerald-600 font-bold">{toBengaliNumber(categoryAnsweredCount)}</strong> / {toBengaliNumber(categoryQuestionsWithIdx.length)}টি
                    </div>
                  </div>

                  {/* Buttons Grid for this category */}
                  <div className="flex items-center flex-wrap gap-2">
                    {categoryQuestionsWithIdx.map(({ q, globalIdx }) => {
                      const isCurrent = currentQuestionIndex === globalIdx;
                      const isAnswered = answers[q.id] !== undefined;
                      const isFlagged = flaggedQuestionIds.has(q.id);

                      let btnStyle = theme === 'dark'
                        ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100';

                      if (isAnswered) {
                        btnStyle = 'bg-emerald-600 border-emerald-600 text-white font-bold shadow-2xs';
                      }
                      if (isFlagged) {
                        btnStyle = 'bg-amber-500 border-amber-600 text-white font-bold shadow-2xs';
                      }
                      if (isCurrent) {
                        btnStyle += ' ring-2 ring-indigo-600 ring-offset-2 border-indigo-600 font-extrabold scale-105';
                      }

                      return (
                        <button
                          key={q.id}
                          type="button"
                          onClick={() => goToQuestion(globalIdx)}
                          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl border text-xs sm:text-sm font-bold transition flex flex-col items-center justify-center relative cursor-pointer ${btnStyle}`}
                          title={`প্রশ্ন ${toBengaliNumber(globalIdx + 1)} তে যান`}
                        >
                          <span>{toBengaliNumber(globalIdx + 1)}</span>
                          {isFlagged && (
                            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-white"></span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* 5. Submit Confirmation Modal in Bengali */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 rounded-full flex items-center justify-center mx-auto">
                <Send size={26} />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
                পরীক্ষা সমাপ্তি নিশ্চিতকরণ
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                আপনি কি নিশ্চিতভাবে আপনার উত্তরপত্র সাবমিট করতে চান?
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-2xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">মোট প্রশ্ন:</span>
                <strong className="text-slate-900 dark:text-slate-100 font-bold">
                  {toBengaliNumber(questions.length)}টি
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">উত্তর দেওয়া হয়েছে:</span>
                <strong className="text-emerald-600 font-bold">
                  {toBengaliNumber(answeredCount)}টি
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">উত্তর বাকি রয়েছে:</span>
                <strong className={`${unansweredCount > 0 ? 'text-amber-600' : 'text-slate-500'} font-bold`}>
                  {toBengaliNumber(unansweredCount)}টি
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">অবশিষ্ট সময়:</span>
                <strong className="text-indigo-600 font-bold">
                  {formatTimerBengali(timeLeft)}
                </strong>
              </div>
            </div>

            {unansweredCount > 0 && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2">
                <AlertCircle size={16} className="text-amber-600 shrink-0" />
                <span>আপনার এখনো {toBengaliNumber(unansweredCount)}টি প্রশ্নের উত্তর দেওয়া বাকি আছে।</span>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmModal(false)}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                না, পরীক্ষা চালিয়ে যাই
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmitExam}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
              >
                {submitting ? 'সাবমিট হচ্ছে...' : 'হ্যাঁ, এখনই সাবমিট করুন'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Exit Confirmation Modal in Bengali */}
      {exitModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
                <LogOut size={22} />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                পরীক্ষা স্থগিত করে বের হবেন?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                এখন বের হলে আপনার বর্তমান উত্তরগুলো সংরক্ষিত হবে না এবং পরীক্ষা বাতিল বলে গণ্য হবে।
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setExitModal(false)}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                না, পরীক্ষা দেব
              </button>
              <button
                type="button"
                onClick={() => {
                  stopAudio();
                  onExit();
                }}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
              >
                হ্যাঁ, বের হন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
