export type UserRole = 'admin' | 'student';
export type SubscriptionStatus = 'active' | 'pending' | 'expired' | 'none';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  subscriptionStatus: SubscriptionStatus;
  subscriptionExpiresAt?: string | null;
  lastRedeemedPromo?: string | null;
  isSuspended?: boolean;
  emailVerified?: boolean;
  createdAt: string;
}

export type ExamSectionType = 'script_vocab' | 'conversation' | 'listening' | 'reading' | string;

export interface TestCategory {
  id: string;
  name: string;
  nameJp?: string;
  order: number;
}

export type QuestionType =
  | 'kanji_reading'          // 漢字の読み方
  | 'kanji_writing'          // 漢字の表記
  | 'vocabulary'             // 語彙・言葉の使い方
  | 'grammar'                // 文法・文の組み立て
  | 'conversation'           // 会話と表現
  | 'listening_task'         // 聴解・課題理解・アナウンス
  | 'listening_dialogue'     // 聴解・日常会話
  | 'reading_comprehension';    // 読解・短文・情報検索

export interface TestDefinition {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  passingScore: number;
  isPublished: boolean;
  categories?: TestCategory[];
  createdAt: string;
}

export interface QuestionDefinition {
  id: string;
  testId: string;
  section: ExamSectionType;
  categoryName?: string;
  questionType?: QuestionType;
  japaneseText: string;
  contextPassage?: string; // Long passage, dialogue, or notice board
  furigana?: string;
  underlinedText?: string;
  bengaliInstruction: string;
  bengaliExplanation?: string;
  options: string[];
  correctAnswer: number; // index 0-3
  audioUrl?: string;
  imageUrl?: string;
  marks: number;
  order?: number;
}

export interface SubscriptionPlan {
  id: string;
  title: string;
  price: number;
  durationDays: number;
  description: string;
  isActive: boolean;
  createdAt?: string;
}

export interface PromoCode {
  id: string; // uppercase code
  code: string;
  benefitType: 'free_access' | 'discount';
  freeDurationDays?: number; // e.g. 7 or 30 days
  discountType?: 'percentage' | 'fixed'; // percentage (e.g. 20%) or fixed (e.g. 100 BDT)
  discountValue?: number;
  planId?: string; // 'all' or specific planId
  maxRedemptions: number;
  usedCount: number;
  startDate: string; // ISO
  expiryDate: string; // ISO
  isActive: boolean;
  createdAt: string;
}

export interface PromoRedemption {
  id: string;
  code: string;
  promoId: string;
  userId: string;
  userEmail: string;
  redeemedAt: string;
  benefitApplied: string;
}

export interface PaymentConfig {
  bkashNumber: string;
  bkashType: 'personal' | 'merchant';
  nagadNumber: string;
  nagadType: 'personal' | 'merchant';
  instructionsBengali: string;
}

export interface PaymentRecord {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  planId: string;
  amount: number;
  paymentMethod: 'bkash' | 'nagad';
  transactionId: string;
  senderPhone?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  createdAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface SubscriptionRecord {
  id: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  planId: string;
  planTitle?: string;
  status: 'active' | 'expired' | 'cancelled';
  startDate: string;
  expiryDate: string;
  paymentId?: string;
  promoCode?: string;
  grantedBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CategoryScore {
  categoryId: string;
  categoryName: string;
  correctCount: number;
  totalQuestions: number;
  marksObtained: number;
  totalMarks: number;
  percentage: number;
}

export interface AttemptRecord {
  id: string;
  testId: string;
  testTitle?: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  startedAt: string;
  submittedAt?: string;
  score: number;
  totalMarks: number;
  scaledScore?: number; // Official JFT-Basic scaled score out of 250
  rawCorrectCount?: number; // Number of correct questions
  totalQuestions?: number; // Total questions in test
  passed: boolean;
  sectionScores: Record<string, { correct: number; total: number; marks: number }>;
  categoryBreakdown?: CategoryScore[];
  answers: Record<string, number>; // questionId -> selectedOptionIndex
  status: 'in_progress' | 'submitted';
}

export interface NoticeItem {
  id: string;
  title: string;
  message: string;
  isPublished: boolean;
  publishedAt: string;
  expiresAt?: string | null;
  priority?: 'normal' | 'important' | 'urgent';
  createdAt: string;
  createdBy?: string;
}
