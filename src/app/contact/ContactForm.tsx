"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const inquiryTypes = ["Sales", "Support", "Partnership", "Other"];

const inputStyles =
  "w-full bg-surface-1 border border-border rounded-full px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-sage transition-colors";

export default function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    type: "",
    message: "",
  });

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Submit failed");
      setSubmitted(true);
    } catch {
      setError("Failed to send message. Please try again or email us directly.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence mode="wait">
      {!submitted ? (
        <motion.form
          key="form"
          onSubmit={handleSubmit}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-text-tertiary mb-1.5">
                Name *
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="Jane Chen"
                className={inputStyles}
              />
            </div>
            <div>
              <label className="block text-xs text-text-tertiary mb-1.5">
                Email *
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="jane@company.com"
                className={inputStyles}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-text-tertiary mb-1.5">
                Company
              </label>
              <input
                type="text"
                value={form.company}
                onChange={(e) => update("company", e.target.value)}
                placeholder="Acme Corp"
                className={inputStyles}
              />
            </div>
            <div>
              <label className="block text-xs text-text-tertiary mb-1.5">
                Inquiry Type *
              </label>
              <select
                required
                value={form.type}
                onChange={(e) => update("type", e.target.value)}
                className={`${inputStyles} appearance-none`}
              >
                <option value="">Select type</option>
                {inquiryTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-text-tertiary mb-1.5">
              Message *
            </label>
            <textarea
              required
              value={form.message}
              onChange={(e) => update("message", e.target.value)}
              placeholder="How can we help?"
              rows={5}
              className={`${inputStyles} resize-none`}
            />
          </div>

          {error && (
            <p className="text-sm text-status-alert">{error}</p>
          )}

          <button
            type="submit"
            className="bg-brand-sage text-surface-0 font-semibold rounded-full px-8 py-3 hover:bg-brand-sage-light transition-all duration-200 active:scale-[0.98] text-sm"
          >
            {loading ? "Sending..." : "Send Message"}
          </button>
        </motion.form>
      ) : (
        <motion.div
          key="success"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="py-12 text-center"
        >
          <div className="w-12 h-12 rounded-full bg-status-safe/10 border border-status-safe/20 flex items-center justify-center mx-auto mb-4">
            <Check className="w-6 h-6 text-status-safe" />
          </div>
          <h3 className="text-xl font-bold text-text-primary">
            Message sent.
          </h3>
          <p className="text-text-secondary mt-2 leading-relaxed text-sm max-w-sm mx-auto">
            Thanks for reaching out. We will get back to you within one business
            day.
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
