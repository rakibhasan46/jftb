import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, doc, setDoc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { SubscriptionPlan, UserProfile, PaymentRecord, PaymentConfig } from '../types';
import { DEFAULT_PAYMENT_CONFIG } from '../utils/seedData';
import { X, CheckCircle2, Smartphone, Send, Tag, AlertCircle } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: SubscriptionPlan;
  user: UserProfile;
  appliedDiscount?: { code: string; type: 'percentage' | 'fixed'; value: number } | null;
  onPaymentSubmitted: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  plan,
  user,
  appliedDiscount,
  onPaymentSubmitted,
}) => {
  const [method, setMethod] = useState<'bkash' | 'nagad'>('bkash');
  const [transactionId, setTransactionId] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig>(DEFAULT_PAYMENT_CONFIG);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'payment_config'));
        if (snap.exists()) {
          setPaymentConfig(snap.data() as PaymentConfig);
        }
      } catch (err) {
        console.error('Error fetching payment config:', err);
      }
    };
    if (isOpen) {
      fetchConfig();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Calculate final price with discount
  let finalPrice = plan.price;
  if (appliedDiscount) {
    if (appliedDiscount.type === 'percentage') {
      finalPrice = Math.max(0, Math.round(plan.price * (1 - appliedDiscount.value / 100)));
    } else {
      finalPrice = Math.max(0, plan.price - appliedDiscount.value);
    }
  }

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanTxId = transactionId.trim().toUpperCase();
    if (!cleanTxId) {
      setError('দয়া করে সঠিক ট্রানজেকশন আইডি (TrxID) দিন।');
      return;
    }
    if (!senderPhone.trim()) {
      setError('যে নম্বর থেকে টাকা পাঠিয়েছেন তা লিখুন।');
      return;
    }

    setSubmitting(true);

    try {
      // Check for duplicate transaction ID via dedicated used_transactions collection
      const txRef = doc(db, 'used_transactions', cleanTxId);
      const txSnap = await getDoc(txRef);
      if (txSnap.exists()) {
        throw new Error('এই ট্রানজেকশন আইডি (TrxID) ইতিমধ্যে একবার জমা দেওয়া হয়েছে। অনুগ্রহ করে সঠিক ও নতুন TrxID দিন।');
      }

      const paymentId = 'pay_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      const paymentRecord: PaymentRecord = {
        id: paymentId,
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName || 'Student',
        planId: plan.id,
        amount: finalPrice,
        paymentMethod: method,
        transactionId: cleanTxId,
        senderPhone: senderPhone.trim(),
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      // Record transaction to prevent duplicate submissions
      await setDoc(txRef, {
        transactionId: cleanTxId,
        userId: user.uid,
        createdAt: new Date().toISOString(),
      });

      // Submit payment request
      await setDoc(doc(db, 'payments', paymentId), paymentRecord);

      setSuccess(true);
      setTimeout(() => {
        onPaymentSubmitted();
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'পেমেন্ট সাবমিট করতে সমস্যা হয়েছে।');
    } finally {
      setLoadingFalse();
    }
  };

  const setLoadingFalse = () => setSubmitting(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-600 to-rose-600 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-full transition"
          >
            <X size={18} />
          </button>
          <div className="text-xs uppercase tracking-wider font-bold opacity-90">বিকাশ / নগদ ম্যানুয়াল পেমেন্ট</div>
          <h2 className="text-xl font-bold mt-1">{plan.title}</h2>
          
          <div className="flex items-baseline gap-3 mt-2">
            <span className="text-2xl font-black">৳ {finalPrice} BDT</span>
            {appliedDiscount && (
              <span className="text-sm line-through opacity-70">
                ৳ {plan.price}
              </span>
            )}
            {appliedDiscount && (
              <span className="bg-white text-pink-700 text-xs px-2 py-0.5 rounded-full font-bold">
                কুপন ({appliedDiscount.code}) প্রযুক্ত
              </span>
            )}
          </div>
        </div>

        {success ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 size={36} />
            </div>
            <h3 className="text-lg font-bold text-slate-800">পেমেন্ট রিকোয়েস্ট জমা হয়েছে!</h3>
            <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
              অ্যাডমিন আপনার ট্রানজেকশন আইডি যাচাই করে দ্রুত আপনার সাবস্ক্রিপশন চালু করে দেবেন। আপনি স্টুডেন্ট ড্যাশবোর্ডে স্ট্যাটাস দেখতে পারবেন।
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmitPayment} className="p-6 space-y-4">
            {error && (
              <div className="bg-red-50 text-red-700 text-xs p-3.5 rounded-xl border border-red-200 flex items-start gap-2">
                <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
                <div>{error}</div>
              </div>
            )}

            {/* Configured Instructions Box */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <Smartphone size={16} className="text-pink-600" /> পেমেন্ট নির্দেশিকা:
              </div>
              <p className="text-slate-600">{paymentConfig.instructionsBengali}</p>
              
              <div className="pt-2 border-t border-slate-200 grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white p-2 rounded border border-slate-200">
                  <span className="text-[10px] text-pink-600 font-bold block">বিকাশ ({paymentConfig.bkashType}):</span>
                  <span className="font-mono font-bold text-slate-900">{paymentConfig.bkashNumber}</span>
                </div>
                <div className="bg-white p-2 rounded border border-slate-200">
                  <span className="text-[10px] text-orange-600 font-bold block">নগদ ({paymentConfig.nagadType}):</span>
                  <span className="font-mono font-bold text-slate-900">{paymentConfig.nagadNumber}</span>
                </div>
              </div>
            </div>

            {/* Method Toggle */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">পেমেন্ট মাধ্যম</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMethod('bkash')}
                  className={`py-2.5 px-4 rounded-xl font-bold text-xs border flex items-center justify-center gap-2 transition ${
                    method === 'bkash'
                      ? 'bg-pink-50 border-pink-500 text-pink-700 ring-2 ring-pink-500/20'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-pink-600"></span> বিকাশ (bKash)
                </button>
                <button
                  type="button"
                  onClick={() => setMethod('nagad')}
                  className={`py-2.5 px-4 rounded-xl font-bold text-xs border flex items-center justify-center gap-2 transition ${
                    method === 'nagad'
                      ? 'bg-orange-50 border-orange-500 text-orange-700 ring-2 ring-orange-500/20'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-600"></span> নগদ (Nagad)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  প্রেরক নম্বর (Sender Mobile Number) *
                </label>
                <input
                  type="text"
                  required
                  value={senderPhone}
                  onChange={(e) => setSenderPhone(e.target.value)}
                  placeholder="017XXXXXXXX"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ট্রানজেকশন আইডি (TrxID) *
                </label>
                <input
                  type="text"
                  required
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder="যেমন: 9J84H72K1"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-pink-600 hover:bg-pink-700 text-white font-bold text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Send size={16} />
              {submitting ? 'যাচাই করা হচ্ছে...' : `৳ ${finalPrice} BDT পেমেন্ট সাবমিট করুন`}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
