import React, { useState } from "react";
import { IconX, IconAlertTriangle } from "@tabler/icons-react";
import { useLang } from "../context/LanguageContext";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void; // Added onSuccess callback
  targetType: "User" | "Event" | "Space";
  targetName: string;
}

export function ReportModal({ isOpen, onClose, onSuccess, targetType, targetName }: ReportModalProps) {
  const { t } = useLang();
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Mocking an API call
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      // Notify parent to show toast
      if (onSuccess) onSuccess();
      
      setReason("");
      setDetails("");
      onClose();
    } catch (error) {
      console.error("Failed to submit report:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const reportReasons = [
    "Inappropriate behavior",
    "Spam or misleading",
    "Harassment",
    "Illegal content",
    "Other"
  ];

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
      <div className="relative w-full max-w-md p-8 rounded-2xl bg-neutral-900 border border-red-500/20 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-white transition-colors"
        >
          <IconX className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-500/10 rounded-lg">
            <IconAlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-white">{t(`Report ${targetType}`)}</h2>
        </div>

        <p className="text-sm text-neutral-400 mb-6">
          {t("You are reporting")} <span className="text-white font-semibold">{targetName}</span>.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">{t("Reason")}</label>
            <select
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-2 bg-black border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="" disabled>{t("Select a reason")}</option>
              {reportReasons.map((r) => (
                <option key={r} value={r}>{t(r)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">{t("Additional Details")}</label>
            <textarea
              required
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder={t("Describe the issue...")}
              rows={3}
              className="w-full px-4 py-2 bg-black border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !reason}
            className="w-full py-3 mt-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
          >
            {isSubmitting ? t("Submitting...") : t("Submit Report")}
          </button>
        </form>
      </div>
    </div>
  );
}