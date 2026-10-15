import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { TestDefinition, QuestionDefinition, UserProfile, ExamSectionType, AttemptRecord } from '../types';
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
  RotateCcw,
  Flag,
  LayoutGrid,
  FileText,
  LogOut,
  CheckCircle,
} from 'lucide-react';

interface ExamInterfaceProps {
  test: TestDefinition;
  user: UserProfile;
  onExamFinished: (attempt: AttemptRecord) => void;
  onExit: () => void;
}

const SECTIONS_CONFIG: Record<ExamSectionType, { nameJp: string; code: string }> = {
  script_vocab: { nameJp: '第1セクション: 文字と語彙', code: 'セクション 1' },
  conversation: { nameJp: '第2セクション: 会話と表現', code: 'セクション 2' },
  listening: { nameJp: '第3セクション: 聴解', code: 'セクション 3' },
  reading: { nameJp: '第4セクション: 読解', code: 'セクション 4' },
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

  // Modals
  const [confirmModal, setConfirmModal] = useState(false);
  const [reviewModal, setReviewModal] = useState(false);
  const [exitModal, setExitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Audio state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playCount, setPlayCount] = useState<Record<string, number>>({});
  const [audioVolume, setAudioVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const qSnap = await getDocs(collection(db, 'tests', test.id, 'questions'));
        const qList: QuestionDefinition[] = [];
        qSnap.forEach((d) => {
          qList.push(d.data() as QuestionDefinition);
        });

        // Sort questions by official section order: script_vocab -> conversation -> listening -> reading
        const sectionOrder: Record<ExamSectionType, number> = {
          script_vocab: 1,
          conversation: 2,
          listening: 3,
          reading: 4,
        };
        qList.sort((a, b) => (sectionOrder[a.section] || 99) - (sectionOrder[b.section] || 99));

        setQuestions(qList);
      } catch (err) {
        console.error('Error fetching questions:', err);
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

  // Keyboard navigation & option shortcuts (1, 2, 3, 4, ArrowLeft, ArrowRight)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if a modal is open
      if (confirmModal || reviewModal || exitModal) return;

      if (e.key === 'ArrowLeft') {
        setCurrentQuestionIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowRight') {
        setCurrentQuestionIndex((prev) => Math.min(questions.length - 1, prev + 1));
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
  }, [currentQuestionIndex, questions, confirmModal, reviewModal, exitModal]);

  // Countdown timer
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

  const activeQuestion = questions[currentQuestionIndex];

  const formatTimerJapanese = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}分 ${secs.toString().padStart(2, '0')}秒`;
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
    if (currentCount >= 2 && !isPlaying) return; // Max 2 plays as in official rules

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

    try {
      let score = 0;
      let totalMarks = 0;
      const sectionScores: Record<ExamSectionType, { correct: number; total: number; marks: number }> = {
        script_vocab: { correct: 0, total: 0, marks: 0 },
        conversation: { correct: 0, total: 0, marks: 0 },
        listening: { correct: 0, total: 0, marks: 0 },
        reading: { correct: 0, total: 0, marks: 0 },
      };

      questions.forEach((q) => {
        totalMarks += q.marks;
        if (!sectionScores[q.section]) {
          sectionScores[q.section] = { correct: 0, total: 0, marks: 0 };
        }
        sectionScores[q.section].total += q.marks;

        const studentAns = answers[q.id];
        if (studentAns === q.correctAnswer) {
          score += q.marks;
          sectionScores[q.section].correct += q.marks;
        }
      });

      const passed = score >= test.passingScore;
      const attemptId = 'att_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

      const attemptRecord: AttemptRecord = {
        id: attemptId,
        testId: test.id,
        userId: user.uid,
        startedAt: new Date(Date.now() - (test.durationMinutes * 60 - timeLeft) * 1000).toISOString(),
        submittedAt: new Date().toISOString(),
        score,
        totalMarks,
        passed,
        sectionScores,
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

  const answeredCount = Object.keys(answers).length;
  const unansweredCount = questions.length - answeredCount;
  const flaggedCount = flaggedQuestionIds.size;
  const overallProgressPercent = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;

  // Section-specific counts
  const currentSectionQuestions = activeQuestion
    ? questions.filter((q) => q.section === activeQuestion.section)
    : [];
  const currentSectionAnswered = currentSectionQuestions.filter((q) => answers[q.id] !== undefined).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center font-japanese">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-700 font-bold text-sm">問題データを読み込んでいます...</p>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-japanese">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center space-y-4 max-w-md">
          <AlertCircle size={36} className="text-amber-500 mx-auto" />
          <h3 className="text-lg font-bold text-slate-800">問題がありません</h3>
          <p className="text-xs text-slate-500">このテストにはまだ問題が登録されていません。</p>
          <button
            onClick={onExit}
            className="px-6 py-2.5 bg-slate-800 text-white text-xs font-bold rounded-xl"
          >
            戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-japanese select-none">
      {/* 1. Official Exam Header */}
      <header className="bg-slate-900 text-white sticky top-0 z-40 border-b border-slate-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setExitModal(true)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
              title="試験を中断する (Exit)"
            >
              <LogOut size={16} />
            </button>
            <span className="text-xs bg-indigo-600 px-2.5 py-1 rounded font-bold uppercase tracking-wider">
              JFT-Basic 模擬試験
            </span>
            <span className="text-xs md:text-sm font-bold text-slate-200 truncate max-w-xs md:max-w-md hidden sm:inline">
              {test.title}
            </span>
          </div>

          <div className="flex items-center space-x-2.5 sm:space-x-4">
            {/* Countdown Timer */}
            <div className="flex items-center space-x-2 bg-slate-800 px-3.5 py-1.5 rounded-lg border border-slate-700 text-xs">
              <Clock size={15} className="text-amber-400 shrink-0" />
              <span className="text-slate-300 hidden md:inline">残り時間:</span>
              <span className="font-mono font-bold text-amber-300 text-sm md:text-base">
                {formatTimerJapanese(timeLeft)}
              </span>
            </div>

            {/* Review Button */}
            <button
              onClick={() => setReviewModal(true)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 transition flex items-center gap-1.5"
            >
              <LayoutGrid size={14} />
              <span className="hidden sm:inline">解答を見直す</span>
              <span className="bg-indigo-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                {answeredCount}/{questions.length}
              </span>
            </button>

            {/* Finish Test Button */}
            <button
              onClick={() => setConfirmModal(true)}
              className="px-3.5 sm:px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center gap-1.5"
            >
              <Send size={14} />
              <span>試験を終了する</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. Top Progress & Section Bar */}
      <div className="bg-white border-b border-slate-200 px-4 py-2.5 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center flex-wrap gap-2">
            <span className="font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded">
              {SECTIONS_CONFIG[activeQuestion.section]?.nameJp || activeQuestion.section}
            </span>
            <span className="text-slate-400">|</span>
            <span className="font-bold text-slate-800">
              第 {currentQuestionIndex + 1} 問 / 全 {questions.length} 問
            </span>
            <span className="text-slate-400">|</span>
            <span className="text-slate-500 font-medium text-[11px]">
              セクション進捗: {currentSectionAnswered} / {currentSectionQuestions.length} 問
            </span>
          </div>

          <div className="flex items-center space-x-4 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
              <span>全体の進捗:</span>
              <div className="w-24 sm:w-32 bg-slate-200 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${overallProgressPercent}%` }}
                ></div>
              </div>
              <span className="font-mono font-bold text-slate-700">{overallProgressPercent}%</span>
            </div>

            {/* Flag for Review Button */}
            <button
              type="button"
              onClick={toggleFlagCurrentQuestion}
              className={`px-3 py-1 rounded-lg border text-xs font-bold transition flex items-center gap-1.5 ${
                flaggedQuestionIds.has(activeQuestion.id)
                  ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                  : 'bg-slate-50 text-slate-600 border-slate-300 hover:bg-slate-100'
              }`}
            >
              <Flag size={13} className={flaggedQuestionIds.has(activeQuestion.id) ? 'fill-white' : ''} />
              <span>見直しフラグ</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Main Examination View */}
      <div className="max-w-7xl mx-auto px-4 py-6 flex-1 w-full grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column (3/4): Active Question Card */}
        <div className="lg:col-span-3 space-y-5 flex flex-col justify-between">
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-6 md:p-8 space-y-6">
            {/* Bengali Instructions Card (Presented separately from Japanese content) */}
            {activeQuestion.bengaliInstruction && (
              <div className="p-3.5 bg-amber-50/90 border border-amber-200 rounded-xl text-amber-950 text-xs font-sans flex items-start gap-2.5 shadow-xs">
                <AlertCircle size={17} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed font-semibold">
                  <span className="text-[11px] text-amber-700 block uppercase font-bold tracking-wider">
                    【指示 / Instruction】
                  </span>
                  {activeQuestion.bengaliInstruction}
                </div>
              </div>
            )}

            {/* Reading Comprehension Context / Notice Board / Dialogue Card */}
            {activeQuestion.contextPassage && (
              <div className="bg-slate-50/90 border-2 border-slate-300 rounded-2xl p-5 md:p-6 shadow-xs space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 border-b border-slate-200 pb-2">
                  <FileText size={16} className="text-indigo-600" />
                  <span>【本文・案内文・メモ / Reading Passage】</span>
                </div>
                <div className="text-slate-800 text-sm md:text-base leading-loose font-japanese whitespace-pre-line">
                  <JapaneseTextRenderer text={activeQuestion.contextPassage} />
                </div>
              </div>
            )}

            {/* Listening Comprehension Audio Player with Full Controls & Volume Adjustment */}
            {activeQuestion.audioUrl && (
              <div className="bg-slate-900 text-white p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm border border-slate-800">
                <audio
                  ref={audioRef}
                  src={activeQuestion.audioUrl}
                  onEnded={() => setIsPlaying(false)}
                />
                <div className="flex items-center space-x-3.5 w-full md:w-auto">
                  <div className="w-11 h-11 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 shadow-md">
                    <Volume2 size={22} className="text-white" />
                  </div>
                  <div>
                    <div className="font-bold text-sm tracking-wide">音声を聞いてください (Listening Audio)</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      再生回数: <strong className="text-amber-300 font-mono text-sm">{playCount[activeQuestion.id] || 0} / 2</strong> 回 (最大2回)
                    </div>
                  </div>
                </div>

                {/* Audio Controls & Volume Slider */}
                <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                  <div className="flex items-center space-x-2 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 text-xs">
                    <button
                      type="button"
                      onClick={() => setIsMuted((prev) => !prev)}
                      className="text-slate-300 hover:text-white"
                      title={isMuted ? 'ミュート解除' : 'ミュート'}
                    >
                      {isMuted || audioVolume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
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
                      className="w-16 sm:w-20 accent-indigo-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
                      title="音量調整"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handlePlayAudio(activeQuestion.id)}
                    disabled={(playCount[activeQuestion.id] || 0) >= 2 && !isPlaying}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-xs"
                  >
                    {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                    <span>{isPlaying ? '一時停止 (Pause)' : '音声を再生する (Play)'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Optional Image Attachment */}
            {activeQuestion.imageUrl && (
              <div className="max-w-md mx-auto rounded-xl overflow-hidden border border-slate-200 bg-slate-50 p-2">
                <img
                  src={activeQuestion.imageUrl}
                  alt="Question Diagram"
                  className="w-full h-auto object-contain max-h-64 mx-auto rounded-lg"
                />
              </div>
            )}

            {/* Japanese Question Prompt */}
            <div className="p-6 bg-slate-50/80 rounded-2xl border border-slate-200 text-slate-900 text-lg md:text-xl leading-loose">
              <JapaneseTextRenderer
                text={activeQuestion.japaneseText}
                underlinedText={activeQuestion.underlinedText}
              />
            </div>

            {/* Japanese Answer Options */}
            <div className="space-y-3 pt-2">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>回答を選択してください (Choose one answer):</span>
                <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">キーボード 1, 2, 3, 4 でも選択可能</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {activeQuestion.options.map((opt, idx) => {
                  const isSelected = answers[activeQuestion.id] === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectAnswer(activeQuestion.id, idx)}
                      className={`p-4 rounded-xl border text-left transition flex items-center space-x-3.5 ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/90 text-indigo-950 font-bold shadow-xs ring-2 ring-indigo-600/30'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <span
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 border border-slate-300'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <span className="text-base font-japanese tracking-wide leading-normal">
                        {opt}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Navigation Controls: 「前へ」「次へ」 */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
            <button
              type="button"
              disabled={currentQuestionIndex === 0}
              onClick={() => {
                if (isPlaying && audioRef.current) {
                  audioRef.current.pause();
                  setIsPlaying(false);
                }
                setCurrentQuestionIndex((prev) => Math.max(0, prev - 1));
              }}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-30 text-slate-800 font-bold text-xs rounded-xl transition flex items-center gap-1.5"
            >
              <ChevronLeft size={16} />
              <span>前へ</span>
            </button>

            <span className="text-xs font-bold text-slate-600">
              第 {currentQuestionIndex + 1} 問 / 全 {questions.length} 問
            </span>

            {currentQuestionIndex < questions.length - 1 ? (
              <button
                type="button"
                onClick={() => {
                  if (isPlaying && audioRef.current) {
                    audioRef.current.pause();
                    setIsPlaying(false);
                  }
                  setCurrentQuestionIndex((prev) => Math.min(questions.length - 1, prev + 1));
                }}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
              >
                <span>次へ</span>
                <ChevronRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setReviewModal(true)}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
              >
                <LayoutGrid size={15} />
                <span>見直し画面へ</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Column (1/4): Question Navigation Panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4 sticky top-24">
            <div className="flex items-center justify-between border-b pb-2.5">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <LayoutGrid size={15} className="text-indigo-600" />
                <span>問題ナビゲーション</span>
              </h4>
              <span className="text-[11px] font-bold text-slate-500">
                {answeredCount}/{questions.length}
              </span>
            </div>

            {/* Visual State Legend */}
            <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-600 border-b pb-3">
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-emerald-600"></span>
                <span>回答済み ({answeredCount})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-slate-100 border border-slate-300"></span>
                <span>未回答 ({unansweredCount})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-amber-500"></span>
                <span>見直しフラグ ({flaggedCount})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded border-2 border-indigo-600 bg-indigo-50"></span>
                <span>現在選択中</span>
              </div>
            </div>

            {/* Question Buttons Grid */}
            <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-4 gap-2 max-h-[50vh] overflow-y-auto pr-1">
              {questions.map((q, idx) => {
                const isCurrent = currentQuestionIndex === idx;
                const isAnswered = answers[q.id] !== undefined;
                const isFlagged = flaggedQuestionIds.has(q.id);

                let btnStyles = 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100';
                if (isAnswered) {
                  btnStyles = 'bg-emerald-600 border-emerald-600 text-white font-bold';
                }
                if (isFlagged) {
                  btnStyles = 'bg-amber-500 border-amber-600 text-white font-bold';
                }
                if (isCurrent) {
                  btnStyles += ' ring-2 ring-indigo-600 ring-offset-1 scale-105 shadow-xs';
                }

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => {
                      if (isPlaying && audioRef.current) {
                        audioRef.current.pause();
                        setIsPlaying(false);
                      }
                      setCurrentQuestionIndex(idx);
                    }}
                    className={`h-10 rounded-xl border text-xs font-mono font-bold transition flex flex-col items-center justify-center relative ${btnStyles}`}
                  >
                    <span>{idx + 1}</span>
                    {isFlagged && (
                      <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-white"></span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Quick Submit Test Button */}
            <button
              type="button"
              onClick={() => setConfirmModal(true)}
              className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
            >
              <Send size={13} />
              <span>試験を終了する</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. Review Modal (「解答を見直す」) */}
      {reviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 md:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">解答を見直す (Question Review)</h3>
                <p className="text-xs text-slate-500 mt-0.5">全問題の回答状況一覧です。番号をクリックするとその問題に移動します。</p>
              </div>
              <button
                onClick={() => setReviewModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Summary Statistics */}
            <div className="grid grid-cols-3 gap-3 text-center text-xs font-bold">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800">
                <div className="text-xl font-mono font-black">{answeredCount}</div>
                <div>回答済み (Answered)</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700">
                <div className="text-xl font-mono font-black">{unansweredCount}</div>
                <div>未回答 (Unanswered)</div>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800">
                <div className="text-xl font-mono font-black">{flaggedCount}</div>
                <div>見直しフラグ (Flagged)</div>
              </div>
            </div>

            {/* Question Breakdown by Section */}
            <div className="space-y-4">
              {Object.entries(SECTIONS_CONFIG).map(([secKey, secCfg]) => {
                const secQuestions = questions.filter((q) => q.section === secKey);
                if (secQuestions.length === 0) return null;

                return (
                  <div key={secKey} className="space-y-2">
                    <div className="text-xs font-bold text-slate-700 bg-slate-100 p-2 rounded-lg">
                      {secCfg.nameJp}
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      {secQuestions.map((q) => {
                        const globalIdx = questions.findIndex((x) => x.id === q.id);
                        const isAnswered = answers[q.id] !== undefined;
                        const isFlagged = flaggedQuestionIds.has(q.id);

                        return (
                          <button
                            key={q.id}
                            type="button"
                            onClick={() => {
                              setCurrentQuestionIndex(globalIdx);
                              setReviewModal(false);
                            }}
                            className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center ${
                              isAnswered
                                ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            <span className="text-xs font-bold">第 {globalIdx + 1} 問</span>
                            <span className="text-[10px] mt-0.5">
                              {isFlagged ? '🚩 フラグ' : isAnswered ? '✓ 回答済' : '未回答'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-4 border-t flex justify-between items-center">
              <button
                type="button"
                onClick={() => setReviewModal(false)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl"
              >
                戻る
              </button>

              <button
                type="button"
                onClick={() => {
                  setReviewModal(false);
                  setConfirmModal(true);
                }}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs"
              >
                試験を終了する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Final Submission Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 md:p-8 space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle size={32} />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-slate-900">
                試験を終了しますか？
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed font-sans">
                আপনি কি নিশ্চিত যে পরীক্ষা সম্পন্ন করে জমা দিতে চান?
              </p>

              <div className="p-3 bg-slate-50 rounded-xl border text-xs space-y-1 font-mono">
                <div className="flex justify-between text-slate-600">
                  <span>回答済み問題数 (Answered):</span>
                  <strong className="text-emerald-700">{answeredCount} 問</strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>未回答問題数 (Unanswered):</span>
                  <strong className={unansweredCount > 0 ? 'text-red-600 font-bold' : 'text-slate-700'}>
                    {unansweredCount} 問
                  </strong>
                </div>
              </div>

              {unansweredCount > 0 && (
                <div className="p-2.5 bg-red-50 text-red-700 rounded-lg text-xs font-medium border border-red-200">
                  ⚠️ 未回答の問題が残っています。よろしいですか？
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(false)}
                className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition"
              >
                戻る
              </button>
              <button
                type="button"
                onClick={handleSubmitExam}
                disabled={submitting}
                className="py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition"
              >
                {submitting ? '採点中...' : '終了して提出する'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Exit Confirmation Modal */}
      {exitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 md:p-8 space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <LogOut size={28} />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-slate-900">
                試験を中断しますか？
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed font-sans">
                আপনি কি পরীক্ষাটি বাতিল করে ড্যাশবোর্ডে ফিরে যেতে চান? পরীক্ষা অসমাপ্ত অবস্থায় বের হলে বর্তমান উত্তরসমূহ সংরক্ষণ হবে না।
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setExitModal(false)}
                className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition"
              >
                試験を続ける
              </button>
              <button
                type="button"
                onClick={onExit}
                className="py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md transition"
              >
                中断して戻る
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
