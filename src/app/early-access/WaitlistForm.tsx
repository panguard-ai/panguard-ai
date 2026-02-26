"use client";

import { useState } from "react";
import { Check, ArrowRight, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import FadeInUp from "@/components/FadeInUp";

export default function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error("Submit failed");
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <FadeInUp>
      <div className="max-w-xl mx-auto text-center">
        <AnimatePresence mode="wait">
          {!submitted ? (
            <motion.div
              key="form"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError("");
                  }}
                  placeholder="you@company.com"
                  className="flex-1 bg-surface-1 border border-border rounded-full px-5 py-3.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-sage transition-colors text-sm"
                  autoFocus
                />
                <button
                  type="submit"
                  className="bg-brand-sage text-surface-0 font-semibold rounded-full px-8 py-3.5 hover:bg-brand-sage-light transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 text-sm shrink-0"
                >
                  {loading ? "Joining..." : "Join Waitlist"}
                  {!loading && <ArrowRight className="w-4 h-4" />}
                </button>
              </form>

              {error && (
                <p className="text-sm text-status-alert mt-3">{error}</p>
              )}

              {/* Checkmarks */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 mt-6">
                {[
                  "Priority access",
                  "Direct feedback channel",
                  "Founding member pricing",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-2 text-sm text-text-secondary"
                  >
                    <Check className="w-4 h-4 text-brand-sage shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="py-4"
            >
              <div className="w-12 h-12 rounded-full bg-status-safe/10 border border-status-safe/20 flex items-center justify-center mx-auto mb-4">
                <Check className="w-6 h-6 text-status-safe" />
              </div>
              <h3 className="text-xl font-bold text-text-primary">
                You are on the list.
              </h3>
              <p className="text-text-secondary mt-2 leading-relaxed">
                We sent a confirmation to{" "}
                <span className="text-text-primary font-medium">{email}</span>.
                We will reach out when your access is ready.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Note */}
        <div className="mt-10 flex items-center justify-center gap-2 text-sm text-text-tertiary">
          <Users className="w-4 h-4" />
          <span>Private beta launching Q2 2026</span>
        </div>
      </div>
    </FadeInUp>
  );
}
