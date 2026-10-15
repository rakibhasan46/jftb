import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { AttemptRecord, TestDefinition, QuestionDefinition, ExamSectionType } from '../types';
import { JapaneseTextRenderer } from './JapaneseTextRenderer';
import { Award, CheckCircle2, XCircle, ArrowLeft, BookOpen, Clock, Check, X } from 'lucide-react';

interface ExamResultViewProps {
  attempt: AttemptRecord;
  test: TestDefinition;
  onBack: () => void;
}

export const ExamResultView: React.FC<ExamResultViewProps> = ({ attempt, test, onBack }) => {
  const [questions, setQuestions] = useState<QuestionDefinition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (attempt.passed) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    }

    const fetchQuestions = async () => {
      try {
        const qSnap = await getDocs(collection(db, 'tests', test.id, 'questions'));
        const qList: QuestionDefinition[] = [];
        qSnap.forEach((doc) => {
          qList.push(doc.data() as QuestionDefinition);
        });
        setQuestions(qList);
      } catch (err) {
        console.error('Error fetching questions for result:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchQuestions();
  }, [attempt, test.id]);

  const [reviewFilter, setReviewFilter] = useState<'all' | 'correct' | 'incorrect' | 'unanswered'>('all');

  const filteredQuestions = questions.filter((q) => {
    const studentAns = attempt.answers[q.id];
    const isAnswered = studentAns !== undefined;
    const isCorrect = studentAns === q.correctAnswer;
    if (reviewFilter === 'correct') return isCorrect;
    if (reviewFilter === 'incorrect') return isAnswered && !isCorrect;
    if (reviewFilter === 'unanswered') return !isAnswered;
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      <button
        onClick={onBack}
        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl transition flex items-center gap-2"
      >
        <ArrowLeft size={16} /> ড্যাশবোর্ডে ফিরে যান
      </button>

      {/* Result Card */}
      <div className={`rounded-3xl p-8 text-white shadow-xl text-center space-y-4 bg-gradient-to-r ${
        attempt.passed ? 'from-emerald-600 to-teal-700' : 'from-red-600 to-rose-700'
      }`}>
        <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto backdrop-blur-xs">
          {attempt.passed ? <CheckCircle2 size={42} /> : <XCircle size={42} />}
        </div>
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold opacity-90">
            {attempt.passed ? 'অভিনন্দন! আপনি পরীক্ষায় উত্তীর্ণ হয়েছেন (PASSED)' : 'দুঃখিত, আপনি পাস করতে পারেননি (FAILED)'}
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold mt-1">{test.title}</h2>
        </div>

        <div className="flex justify-center items-center gap-8 pt-2">
          <div>
            <div className="text-xs opacity-80">আপনার প্রাপ্ত স্কোর</div>
            <div className="text-3xl font-black">{attempt.score} / {attempt.totalMarks}</div>
          </div>
          <div className="w-px h-12 bg-white/20"></div>
          <div>
            <div className="text-xs opacity-80">পাস মার্কস</div>
            <div className="text-3xl font-black">{test.passingScore}</div>
          </div>
        </div>
      </div>

      {/* Section Breakdown */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Award className="text-indigo-600" /> সেকশন অনুযায়ী পারফরম্যান্স
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(attempt.sectionScores || {}).map(([secKey, secData]: [string, any]) => {
            const sectionMap: Record<string, string> = {
              script_vocab: 'セクション 1: 文字と語彙 (Script & Vocabulary)',
              conversation: 'セクション 2: 会話と表現 (Conversation & Expression)',
              listening: 'セクション 3: 聴解 (Listening Comprehension)',
              reading: 'セクション 4: 読解 (Reading Comprehension)',
            };
            return (
              <div key={secKey} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="font-bold text-slate-800 text-xs">
                  {sectionMap[secKey] || secKey}
                </div>
                <div className="flex justify-between text-xs font-semibold text-slate-600">
                  <span>নম্বর: {secData.correct} / {secData.total}</span>
                  <span>{Math.round((secData.correct / (secData.total || 1)) * 100)}%</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full rounded-full"
                    style={{ width: `${Math.round((secData.correct / (secData.total || 1)) * 100)}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed Answer Review */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="text-indigo-600" /> বিস্তারিত উত্তর ও ব্যাখ্যা (Detailed Review)
          </h3>

          {/* Filter Tabs */}
          <div className="flex flex-wrap gap-1.5 text-xs font-bold">
            {[
              { id: 'all', label: 'সকল প্রশ্ন' },
              { id: 'correct', label: 'সঠিক উত্তর' },
              { id: 'incorrect', label: 'ভুল উত্তর' },
              { id: 'unanswered', label: 'উত্তরহীন' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setReviewFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-xl border transition ${
                  reviewFilter === f.id
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-slate-400">লোড হচ্ছে...</div>
        ) : (
          <div className="space-y-4">
            {filteredQuestions.map((q, idx) => {
              const studentAns = attempt.answers[q.id];
              const isAnswered = studentAns !== undefined;
              const isCorrect = studentAns === q.correctAnswer;

              return (
                <div
                  key={q.id}
                  className={`bg-white rounded-2xl border p-6 space-y-4 shadow-xs ${
                    isCorrect
                      ? 'border-emerald-200 bg-emerald-50/20'
                      : !isAnswered
                      ? 'border-slate-200 bg-slate-50/30'
                      : 'border-red-200 bg-red-50/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">প্রশ্ন {idx + 1} ({q.section})</span>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${
                        isCorrect
                          ? 'bg-emerald-100 text-emerald-700'
                          : !isAnswered
                          ? 'bg-slate-100 text-slate-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {isCorrect ? <Check size={14} /> : !isAnswered ? null : <X size={14} />}
                      {isCorrect ? 'সঠিক (Correct)' : !isAnswered ? 'উত্তর দেওয়া হয়নি' : 'ভুল (Incorrect)'}
                    </span>
                  </div>

                  {/* Bengali Instruction */}
                  {q.bengaliInstruction && (
                    <div className="text-xs font-semibold text-slate-600 bg-amber-50/60 p-2.5 rounded-lg border border-amber-200">
                      【নির্দেশনা】: {q.bengaliInstruction}
                    </div>
                  )}

                  {/* Reading Passage if present */}
                  {q.contextPassage && (
                    <div className="bg-slate-50 border border-slate-300 rounded-xl p-4 text-xs md:text-sm font-japanese whitespace-pre-line leading-relaxed text-slate-800">
                      <JapaneseTextRenderer text={q.contextPassage} />
                    </div>
                  )}

                  {/* Audio player if audio present */}
                  {q.audioUrl && (
                    <div className="p-3 bg-slate-900 rounded-xl flex items-center justify-between text-white text-xs">
                      <span>🎧 এই প্রশ্নের অডিও শুনুন:</span>
                      <audio controls src={q.audioUrl} className="h-8 max-w-[200px] sm:max-w-xs" />
                    </div>
                  )}

                  <div className="font-japanese text-lg font-medium text-slate-900">
                    <JapaneseTextRenderer text={q.japaneseText} underlinedText={q.underlinedText} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                    {q.options.map((opt, oIdx) => {
                      const isStudentChoice = studentAns === oIdx;
                      const isRightChoice = q.correctAnswer === oIdx;

                      let badgeClass = 'bg-white border-slate-200 text-slate-700';
                      if (isRightChoice) {
                        badgeClass = 'bg-emerald-100 border-emerald-500 text-emerald-900 font-bold';
                      } else if (isStudentChoice && !isCorrect) {
                        badgeClass = 'bg-red-100 border-red-500 text-red-900 font-bold';
                      }

                      return (
                        <div key={oIdx} className={`p-3 rounded-xl border text-sm font-japanese flex items-center gap-3 ${badgeClass}`}>
                          <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center shrink-0">
                            {oIdx + 1}
                          </span>
                          <span>{opt}</span>
                          {isRightChoice && <span className="ml-auto text-xs text-emerald-700 font-semibold">সঠিক উত্তর</span>}
                          {isStudentChoice && !isCorrect && <span className="ml-auto text-xs text-red-700 font-semibold">আপনার উত্তর</span>}
                        </div>
                      );
                    })}
                  </div>

                  {q.bengaliExplanation && (
                    <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl text-xs text-indigo-900 space-y-1">
                      <div className="font-bold">বাংলা ব্যাখ্যা (Explanation):</div>
                      <div>{q.bengaliExplanation}</div>
                    </div>
                  )}
                </div>
              );
            })}

            {filteredQuestions.length === 0 && (
              <div className="text-center py-8 text-xs text-slate-400 font-medium">
                কোনো প্রশ্ন পাওয়া যায়নি।
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
