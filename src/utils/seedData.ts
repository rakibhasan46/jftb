import { db } from '../firebase';
import { collection, doc, setDoc, getDocs, getDoc } from 'firebase/firestore';
import { TestDefinition, QuestionDefinition, SubscriptionPlan, PaymentConfig, PromoCode } from '../types';

export const DEFAULT_PLANS: SubscriptionPlan[] = [
  {
    id: 'plan_1_month',
    title: '১ মাস প্রিমিয়াম প্যাক (1 Month Pro)',
    price: 499,
    durationDays: 30,
    description: 'সব অফিশিয়াল মক টেস্ট, অডিও লিসেনিং ও কাঞ্জি অনুশীলন আনলক করুন।',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'plan_3_months',
    title: '৩ মাস মেগা প্যাক (3 Months Mega)',
    price: 1199,
    durationDays: 90,
    description: 'সবচেয়ে জনপ্রিয়! ৩ মাসের জন্য আনলিমিটেড মক টেস্ট ও ব্যাখ্যামূলক সমাধান।',
    isActive: true,
    createdAt: new Date().toISOString(),
  }
];

export const DEFAULT_PAYMENT_CONFIG: PaymentConfig = {
  bkashNumber: '01700-123456',
  bkashType: 'personal',
  nagadNumber: '01800-654321',
  nagadType: 'personal',
  instructionsBengali: 'বিকাশ বা নগদ অ্যাপ থেকে "Send Money" করুন। এরপর আপনার TrxID এবং প্রেরক নম্বর নিচে দিয়ে সাবমিট করুন। অ্যাডমিন ভেরিফাই করে সাবস্ক্রিপশন চালু করবেন।',
};

export async function seedDefaultTestData(isAdminUser?: boolean) {
  if (!isAdminUser) {
    return;
  }
  try {
    // 1. Seed Payment Config if not present
    const paymentDocRef = doc(db, 'settings', 'payment_config');
    const paymentSnap = await getDoc(paymentDocRef);
    if (!paymentSnap.exists()) {
      await setDoc(paymentDocRef, DEFAULT_PAYMENT_CONFIG);
    }

    // 2. Seed Subscription Plans if empty
    const plansRef = collection(db, 'subscription_plans');
    const plansSnap = await getDocs(plansRef);
    if (plansSnap.empty) {
      for (const plan of DEFAULT_PLANS) {
        await setDoc(doc(db, 'subscription_plans', plan.id), plan);
      }
    }

    // 3. Seed Promo Codes if empty
    const promoRef = collection(db, 'promo_codes');
    const promoSnap = await getDocs(promoRef);
    if (promoSnap.empty) {
      const defaultPromo: PromoCode = {
        id: 'JFTFREE7',
        code: 'JFTFREE7',
        benefitType: 'free_access',
        freeDurationDays: 7,
        maxRedemptions: 100,
        usedCount: 0,
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'promo_codes', defaultPromo.id), defaultPromo);

      const discountPromo: PromoCode = {
        id: 'DISCOUNT20',
        code: 'DISCOUNT20',
        benefitType: 'discount',
        discountType: 'percentage',
        discountValue: 20,
        maxRedemptions: 50,
        usedCount: 0,
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'promo_codes', discountPromo.id), discountPromo);
    }

    // 4. Seed Tests & Authentic Japanese Questions if empty
    const testId = 'test_jft_basic_1';
    const testDocRef = doc(db, 'tests', testId);
    const testDocSnap = await getDoc(testDocRef);

    const testData: TestDefinition = {
      id: testId,
      title: 'JFT-Basic 形式 模擬試験 第1回 (Official Mock Test 01)',
      description: '国際交流基金 JFT-Basic (Japan Foundation Test for Basic Japanese) の出題形式に完全準拠した公式模擬試験です。文字と語彙、会話と表現、聴解、読解の全4セクションを含みます。',
      durationMinutes: 60,
      passingScore: 60,
      isPublished: true,
      createdAt: new Date().toISOString(),
    };

    if (!testDocSnap.exists()) {
      await setDoc(testDocRef, testData);
    }

    // Check questions subcollection count
    const qSnap = await getDocs(collection(db, 'tests', testId, 'questions'));
    if (qSnap.size < 12) {
      const questions: QuestionDefinition[] = [
        // ==========================================
        // Section 1: Script & Vocabulary (文字と語彙)
        // ==========================================
        {
          id: 'q1',
          testId: testId,
          section: 'script_vocab',
          questionType: 'kanji_reading',
          japaneseText: 'きょうは <u>会社</u>を 休(やす)みます。',
          underlinedText: '会社',
          bengaliInstruction: 'আন্ডারলাইন করা কাঞ্জি শব্দের সঠিক হিরাগানা উচ্চারণ নির্বাচন করুন।',
          bengaliExplanation: '会社 (かいしゃ / kaisha) অর্থ অফিস বা কোম্পানি।',
          options: ['かいしゃ', 'がっこう', 'びょういん', 'ぎんこう'],
          correctAnswer: 0,
          marks: 5,
        },
        {
          id: 'q2',
          testId: testId,
          section: 'script_vocab',
          questionType: 'kanji_reading',
          japaneseText: '駅の 近くに <u>新しい</u> スーパーが できました。',
          underlinedText: '新しい',
          bengaliInstruction: 'আন্ডারলাইন করা কাঞ্জির সঠিক হিরাগানা রূপ নির্বাচন করুন।',
          bengaliExplanation: '「新しい」এর উচ্চারণ হলো 「あたらしい」(atarashii / নতুন)।',
          options: ['あたらしい', 'ふるい', 'ちいさい', 'おおきい'],
          correctAnswer: 0,
          marks: 5,
        },
        {
          id: 'q3',
          testId: testId,
          section: 'script_vocab',
          questionType: 'kanji_writing',
          japaneseText: 'わたしは 毎朝(まいあさ) ７時に <u>おきます</u>。',
          underlinedText: 'おきます',
          bengaliInstruction: 'আন্ডারলাইন করা হিরাগানা শব্দের সঠিক কাঞ্জি রূপ নির্বাচন করুন।',
          bengaliExplanation: 'ঘুম থেকে ওঠার কাঞ্জি হলো 「起きます」(okimasu)।',
          options: ['起きます', '行きます', '来ます', '見ます'],
          correctAnswer: 0,
          marks: 5,
        },
        {
          id: 'q4',
          testId: testId,
          section: 'script_vocab',
          questionType: 'vocabulary',
          japaneseText: 'のどが かわきましたから、冷たい 水を <u>　　　</u>。',
          underlinedText: '　　　',
          bengaliInstruction: 'শূন্যস্থানে উপযুক্ত ক্রিয়াপদ নির্বাচন করুন।',
          bengaliExplanation: 'পানি পান করার ক্ষেত্রে 「飲みました」(nomimashita) ব্যবহৃত হয়।',
          options: ['飲みました', '食べました', '買いました', '洗いました'],
          correctAnswer: 0,
          marks: 5,
        },
        {
          id: 'q5',
          testId: testId,
          section: 'script_vocab',
          questionType: 'grammar',
          japaneseText: 'あしたは 午前９時に 事務所へ <u>　　　</u> ください。',
          underlinedText: '　　　',
          bengaliInstruction: 'অনুরোধমূলক বাক্যে (〜てください) ক্রিয়াপদের সঠিক て-ফর্ম নির্বাচন করুন।',
          bengaliExplanation: '来る (kuru) ক্রিয়াপদের て-ফর্ম হলো 「来て」(kite)।',
          options: ['来て', '来ます', '行きて', '来ないで'],
          correctAnswer: 0,
          marks: 5,
        },

        // ==========================================
        // Section 2: Conversation & Expression (会話と表現)
        // ==========================================
        {
          id: 'q6',
          testId: testId,
          section: 'conversation',
          questionType: 'conversation',
          japaneseText: 'A: すみません、この ペンは いくらですか。\nB: はい、１２０円です。',
          bengaliInstruction: 'কথোপকথনটি পড়ে সঠিক দাম নির্বাচন করুন।',
          bengaliExplanation: 'পেনের দাম ১২০ ইয়েন (120円) বলা হয়েছে।',
          options: ['120円', '200円', '12円', '1000円'],
          correctAnswer: 0,
          marks: 5,
        },
        {
          id: 'q7',
          testId: testId,
          section: 'conversation',
          questionType: 'conversation',
          japaneseText: 'A: お仕事、お疲れ様でした。\nB: <u>　　　</u>。',
          underlinedText: '　　　',
          bengaliInstruction: 'কাজের শেষে বিদায়ী অভিবাদনের স্বাভাবিক প্রতিউত্তর নির্বাচন করুন।',
          bengaliExplanation: 'সহকর্মীর 「お疲れ様でした」এর জবাবে অপরজনও 「お疲れ様でした」বলেন।',
          options: ['お疲れ様でした', 'どういたしまして', 'いってきます', 'ごちそうさまでした'],
          correctAnswer: 0,
          marks: 5,
        },
        {
          id: 'q8',
          testId: testId,
          section: 'conversation',
          questionType: 'conversation',
          japaneseText: 'A: あした いっしょに 映画を 見に行きませんか。\nB: <u>　　　</u>。',
          underlinedText: '　　　',
          bengaliInstruction: 'প্রস্তাবের জবাবে সম্মতি জানাতে উপযুক্ত অভিব্যক্তি নির্বাচন করুন।',
          bengaliExplanation: 'প্রস্তাবে রাজি হওয়ার প্রাকৃতিক অভিব্যক্তি হলো 「いいね、行きましょう」。',
          options: ['いいね、行きましょう', 'いいえ、わかりません', 'いいえ、きらいです', 'だめです'],
          correctAnswer: 0,
          marks: 5,
        },
        {
          id: 'q9',
          testId: testId,
          section: 'conversation',
          questionType: 'conversation',
          japaneseText: 'A: ご注文は お決まりですか。\nB: コーヒーを <u>　　　</u>。',
          underlinedText: '　　　',
          bengaliInstruction: 'রেস্তোরাঁয় অর্ডার করার সময় সঠিক বিনম্র অভিব্যক্তি নির্বাচন করুন।',
          bengaliExplanation: 'রেস্তোরাঁয় অর্ডার করার সময় 「〜をお願いします」(o-negai shimasu) বলা হয়।',
          options: ['お願いします', 'あげます', 'もらいます', 'しません'],
          correctAnswer: 0,
          marks: 5,
        },

        // ==========================================
        // Section 3: Listening Comprehension (聴解)
        // ==========================================
        {
          id: 'q10',
          testId: testId,
          section: 'listening',
          questionType: 'listening_task',
          japaneseText: '【音声問題】男の人と女の人が 話しています。男の人は あした 何時に 会いますか。',
          bengaliInstruction: 'অডিও ক্লিপ শুনে পুরুষ ব্যক্তিটি আগামীকাল কয়টায় দেখা করবেন তা নির্বাচন করুন।',
          bengaliExplanation: 'কথোপকথন অনুযায়ী আগামীকাল দুপুর ২টায় (午後2時) দেখা করার কথা চূড়ান্ত হয়েছে।',
          options: ['午後 2 時', '午前 10 時', '午後 5 時', '午後 8 時'],
          correctAnswer: 0,
          audioUrl: 'https://actions.google.com/sounds/v1/ambiences/office_ambient.ogg',
          marks: 5,
        },
        {
          id: 'q11',
          testId: testId,
          section: 'listening',
          questionType: 'listening_task',
          japaneseText: '【音声問題】駅の アナウンスを聞いてください。電車は何番線から 発車しますか。',
          bengaliInstruction: 'স্টেশনের ঘোষণা শুনে ট্রেনটি কত নম্বর প্ল্যাটফর্ম থেকে ছাড়বে তা নির্বাচন করুন।',
          bengaliExplanation: 'ঘোষণায় বলা হয়েছে ২ নম্বর প্ল্যাটফর্ম (2番線) থেকে ছাড়বে।',
          options: ['2 番線', '1 番線', '3 番線', '4 番線'],
          correctAnswer: 0,
          audioUrl: 'https://actions.google.com/sounds/v1/transit/train_station.ogg',
          marks: 5,
        },
        {
          id: 'q12',
          testId: testId,
          section: 'listening',
          questionType: 'listening_dialogue',
          japaneseText: '【音声問題】コンビニの 店員と 客が 話しています。客は レジ袋(ぶくろ)を どうしますか。',
          bengaliInstruction: 'কথোপকথন শুনে ক্রেতা শপিং ব্যাগ নেবেন কি না তা নির্বাচন করুন।',
          bengaliExplanation: 'ক্রেতা জানিয়েছেন তার নিজস্ব ব্যাগ আছে, তাই অতিরিক্ত ব্যাগ লাগবে না (ふくろは いりません)।',
          options: ['ふくろは いりません', '大きい ふくろを もらいます', '小さい ふくろを もらいます', 'あとで 買います'],
          correctAnswer: 0,
          audioUrl: 'https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg',
          marks: 5,
        },

        // ==========================================
        // Section 4: Reading Comprehension (読解)
        // ==========================================
        {
          id: 'q13',
          testId: testId,
          section: 'reading',
          questionType: 'reading_comprehension',
          contextPassage: '【社内メモ】\nサントスさんへ\nあしたの 会議は 午前１０時から ３階の 第１会議室で 行います。資料を 印刷して 持ってきてください。\n（山田より）',
          japaneseText: '質問: 会議は どこで 行われますか。',
          bengaliInstruction: 'অফিস মেমোটি পড়ে মিটিং কোথায় অনুষ্ঠিত হবে তা নির্বাচন করুন।',
          bengaliExplanation: 'মেমোতে স্পষ্ট লেখা রয়েছে ৩ তলার ১ম কনফারেন্স রুমে (３階の 第１会議室)।',
          options: [
            '３階の 第１会議室',
            '１階の 事務所',
            '２階の 食堂',
            '４階の 応接室'
          ],
          correctAnswer: 0,
          marks: 5,
        },
        {
          id: 'q14',
          testId: testId,
          section: 'reading',
          questionType: 'reading_comprehension',
          contextPassage: '【図書館の 利用案内】\n・本は 1人 5冊まで 借りることができます。\n・貸出期間は 2週間です。\n・月曜日は 休館日（休み）です。',
          japaneseText: '質問: 1人が 一度に 借りられる 本は 何冊までですか。',
          bengaliInstruction: 'লাইব্রেরির নোটিশ পড়ে একজন ব্যক্তি একবারে সর্বোচ্চ কয়টি বই ধার নিতে পারবেন তা নির্বাচন করুন।',
          bengaliExplanation: 'নোটিশের ১ম লাইনে উল্লেখ রয়েছে: 「本は 1人 5冊まで 借りることができます」(সর্বোচ্চ ৫টি)।',
          options: ['5 冊まで', '2 冊まで', '1 冊まで', '10 冊まで'],
          correctAnswer: 0,
          marks: 5,
        },
        {
          id: 'q15',
          testId: testId,
          section: 'reading',
          questionType: 'reading_comprehension',
          contextPassage: '【アパートの ゴミ捨ての ルール】\n・もえるゴミ：火曜日と 金曜日の 朝8時までに出してください。\n・カン・ビン：水曜日の 朝8時までに出してください。\n・夜に ゴミを出してはいけません。',
          japaneseText: '質問: カンや ビンは 何曜日の 何時までに出しますか。',
          bengaliInstruction: 'নোটিশটি পড়ে ক্যান ও কাঁচের বোতলের আবর্জনা কোন দিন কয়টার মধ্যে ফেলতে হবে তা নির্বাচন করুন।',
          bengaliExplanation: 'নোটিশে স্পষ্ট বলা আছে: ক্যান এবং বোতল বুধবার সকাল ৮টার মধ্যে ফেলতে হবে (水曜日の 朝8時まで)。',
          options: ['水曜日の 朝8時まで', '火曜日の 夜', '金曜日の 朝8時まで', 'いつでもよい'],
          correctAnswer: 0,
          marks: 5,
        }
      ];

      for (const q of questions) {
        await setDoc(doc(db, 'tests', testId, 'questions', q.id), q);
      }
    }
  } catch (error) {
    console.error("Error seeding default test data:", error);
  }
}
