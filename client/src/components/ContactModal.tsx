import React, { useState } from "react";
import { IconX } from "@tabler/icons-react";
import { useLang } from "../context/LanguageContext";
import { api } from "../services/api";

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ContactModal({ isOpen, onClose }: ContactModalProps) {
  const { t } = useLang();
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await api.post('/contact', { email, message });
      alert(t("Message sent successfully to the web admin!"));
      setMessage("");
      setEmail("");
      onClose();
    } catch (error) {
      alert(t("Failed to send message. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md p-8 rounded-2xl bg-neutral-900 border border-white/10 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-white"
        >
          <IconX className="w-5 h-5" />
        </button>

        <h2 className="text-2xl font-bold text-white mb-2">{t("Contact Us")}</h2>
        <p className="text-sm text-neutral-400 mb-6">
          {t("Have an issue or a suggestion? Send a message to our web admin.")}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">
              {t("Your Email")}
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="hunter@werewolf.sg"
              className="w-full px-4 py-2 bg-black border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">
              {t("Message")}
            </label>
            <textarea
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t("Write your message here...")}
              rows={4}
              className="w-full px-4 py-2 bg-black border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 mt-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
          >
            {isSubmitting ? t("Sending…") : t("Send Message")}
          </button>
        </form>
      </div>
    </div>
  );
}