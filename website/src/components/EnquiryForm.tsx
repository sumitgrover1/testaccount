'use client';

import { useState, type FormEvent } from 'react';
import { submitEnquiry } from '@/lib/api';

const MOBILE_PATTERN = /^\+?[0-9]{7,15}$/;

export function EnquiryForm() {
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!fullName.trim() || !MOBILE_PATTERN.test(mobileNumber.trim())) {
      setStatus('error');
      setFeedback('Please enter your name and a valid mobile number.');
      return;
    }

    setStatus('submitting');
    setFeedback(null);

    const result = await submitEnquiry({
      fullName: fullName.trim(),
      mobileNumber: mobileNumber.trim(),
      email: email.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    setStatus(result.ok ? 'success' : 'error');
    setFeedback(result.message);
    if (result.ok) {
      setFullName('');
      setMobileNumber('');
      setEmail('');
      setNotes('');
    }
  }

  if (status === 'success') {
    return (
      <div className="rounded-2xl bg-blush-50 p-8 text-center">
        <p className="font-serif text-xl text-blush-700">Thank you!</p>
        <p className="mt-2 text-sm text-charcoal-700">{feedback}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="fullName" className="text-sm font-medium text-charcoal-800">
          Full Name
        </label>
        <input
          id="fullName"
          type="text"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="mt-1 w-full rounded-lg border border-blush-200 bg-cream-50 px-4 py-2.5 text-sm focus:border-blush-400 focus:outline-none focus:ring-2 focus:ring-blush-200"
          placeholder="Your name"
        />
      </div>
      <div>
        <label htmlFor="mobileNumber" className="text-sm font-medium text-charcoal-800">
          Mobile Number
        </label>
        <input
          id="mobileNumber"
          type="tel"
          required
          value={mobileNumber}
          onChange={(e) => setMobileNumber(e.target.value)}
          className="mt-1 w-full rounded-lg border border-blush-200 bg-cream-50 px-4 py-2.5 text-sm focus:border-blush-400 focus:outline-none focus:ring-2 focus:ring-blush-200"
          placeholder="+91 98765 43210"
        />
      </div>
      <div>
        <label htmlFor="email" className="text-sm font-medium text-charcoal-800">
          Email <span className="text-charcoal-700">(optional)</span>
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-lg border border-blush-200 bg-cream-50 px-4 py-2.5 text-sm focus:border-blush-400 focus:outline-none focus:ring-2 focus:ring-blush-200"
          placeholder="you@example.com"
        />
      </div>
      <div>
        <label htmlFor="notes" className="text-sm font-medium text-charcoal-800">
          What are you interested in? <span className="text-charcoal-700">(optional)</span>
        </label>
        <textarea
          id="notes"
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mt-1 w-full rounded-lg border border-blush-200 bg-cream-50 px-4 py-2.5 text-sm focus:border-blush-400 focus:outline-none focus:ring-2 focus:ring-blush-200"
          placeholder="e.g. Skin consultation, hair treatment..."
        />
      </div>

      {status === 'error' && feedback && <p className="text-sm text-red-700">{feedback}</p>}

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="w-full rounded-full bg-blush-600 px-7 py-3 text-sm font-medium text-white transition hover:bg-blush-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === 'submitting' ? 'Sending…' : 'Request a Callback'}
      </button>
    </form>
  );
}
