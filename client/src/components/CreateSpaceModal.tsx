import { motion, AnimatePresence } from "framer-motion";
import { X, UploadCloud, ImageOff, AlertCircle, Loader2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useLang } from "../context/LanguageContext";
import { api } from "../services/api";
import { uploadImages } from "../services/upload.service";

interface CreateSpaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called after the venue is successfully created, so the parent can refresh its list. */
  onCreated?: () => void;
}

interface PendingImage {
  file: File;
  url: string;
}

const VENUE_TYPES = ['house', 'work', 'school', 'boardgame_store', 'other'] as const;

export const CreateSpaceModal = ({ isOpen, onClose, onCreated }: CreateSpaceModalProps) => {
  const { t } = useLang();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [type, setType] = useState<typeof VENUE_TYPES[number]>("boardgame_store");
  const [images, setImages] = useState<PendingImage[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSubmitForVerification, setIsSubmitForVerification] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitStage, setSubmitStage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Revoke object URLs on unmount / when images change to avoid memory leaks
  useEffect(() => {
    return () => { images.forEach(img => URL.revokeObjectURL(img.url)); };
  }, [images]);

  const addFiles = (fileList: FileList | File[]) => {
    const incoming = Array.from(fileList).filter(f => f.type.startsWith("image/"));
    if (incoming.length === 0) return;
    setImages(prev => [
      ...prev,
      ...incoming.map(file => ({ file, url: URL.createObjectURL(file) })),
    ]);
  };

  const removeImage = (index: number) => {
    setImages(prev => {
      const target = prev[index];
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((_, i) => i !== index);
    });
  };

  // Reset form state shortly after the modal closes
  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        setName(""); setAddress(""); setType("boardgame_store");
        setImages([]); setIsSubmitForVerification(true);
        setSubmitting(false); setSubmitStage(null); setError(null);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    setError(null);
    if (name.trim().length < 3) { setError(t("Venue name must be at least 3 characters.")); return; }
    if (address.trim().length < 5) { setError(t("Please enter a full address.")); return; }

    setSubmitting(true);
    try {
      // 1. Geocode the address to get coordinates (required by the venue schema)
      setSubmitStage(t("Locating address…"));
      const geo = await api.get<{ lat: number; lng: number; displayName: string }>(
        `/map/geocode?address=${encodeURIComponent(address.trim())}`
      );

      // 2. Upload any selected images to Cloudinary
      let imageUrls: string[] = [];
      if (images.length > 0) {
        setSubmitStage(t("Uploading images…"));
        imageUrls = await uploadImages(images.map(img => img.file), "venues");
      }

      // 3. Create the venue
      setSubmitStage(t("Creating venue…"));
      await api.post("/venues", {
        name: name.trim(),
        address: address.trim(),
        type,
        privacy: "public",
        lat: geo.lat,
        lng: geo.lng,
        is_chargeable: false,
        ...(imageUrls.length > 0 ? { imageUrl: imageUrls[0], images: imageUrls } : {}),
      });

      onCreated?.();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("Failed to create venue. Please try again."));
    } finally {
      setSubmitting(false);
      setSubmitStage(null);
    }
  };

  // Reference to the scrollable container
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll when the verification box is checked
  useEffect(() => {
    if (isSubmitForVerification && scrollRef.current) {
      // Slight delay allows the Framer Motion animation to expand the container first
      setTimeout(() => {
        scrollRef.current?.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: "smooth"
        });
      }, 150);
    }
  }, [isSubmitForVerification]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal Box */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="bg-neutral-900 border border-white/10 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden pointer-events-auto flex flex-col max-h-[90vh]">
              
              {/* Header */}
              <div className="flex justify-between items-center p-6 border-b border-white/5 bg-neutral-900/50 flex-shrink-0">
                <div>
                  <h2 className="text-2xl font-bold text-white">{t('Create Your Space')}</h2>
                  <p className="text-sm text-neutral-400 mt-1">{t('Add a new venue for Werewolf games')}</p>
                </div>
                <button onClick={onClose} className="text-neutral-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-2 rounded-full">
                  <X size={20} />
                </button>
              </div>

              {/* Form Content - Removed golden-scrollbar, added scrollRef */}
              <div ref={scrollRef} className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                <div>
                  <label className="text-sm font-semibold text-neutral-300 mb-2 block">{t('Venue Name')}</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl p-3.5 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-neutral-600"
                    placeholder={t('Enter venue name...')}
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-neutral-300 mb-2 block">{t('Full Address')}</label>
                  <input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl p-3.5 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-neutral-600"
                    placeholder="e.g. 60A Prinsep Street"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-neutral-300 mb-2 block">{t('Venue Type')}</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as typeof VENUE_TYPES[number])}
                    className="w-full bg-black/50 border border-white/10 rounded-xl p-3.5 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                  >
                    {VENUE_TYPES.map(vt => (
                      <option key={vt} value={vt} className="bg-neutral-900">{t(vt)}</option>
                    ))}
                  </select>
                </div>

                {/* Upload Image Section */}
                <div>
                  <label className="text-sm font-semibold text-neutral-300 mb-2 block">{t('Venue Image')}</label>
                  <label
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }}
                    onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDragOver(false);
                      if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
                    }}
                    className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed transition-all rounded-xl cursor-pointer bg-black/30 ${
                      isDragOver ? "border-blue-500/70 bg-blue-500/10" : "border-white/20 hover:border-blue-500/50 hover:bg-white/5"
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <UploadCloud className="text-neutral-400 mb-2" size={28} />
                      <p className="text-sm text-neutral-400">
                        <span className="font-semibold text-blue-400">{t('Click to upload')}</span> {t('or drag and drop')}
                      </p>
                      <p className="text-xs text-neutral-500 mt-1">
                        {images.length > 0
                          ? `${images.length} ${images.length === 1 ? t('image selected') : t('images selected')}`
                          : t('PNG, JPG up to 5MB')}
                      </p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      multiple
                      onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }}
                    />
                  </label>

                  {/* Thumbnail previews */}
                  {images.length > 0 && (
                    <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {images.map((img, idx) => (
                        <div key={img.url} className="relative group aspect-square rounded-lg overflow-hidden border border-white/10 bg-black/40">
                          <img src={img.url} alt={img.file.name} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeImage(idx)}
                            className="absolute top-1 right-1 p-1 rounded-full bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600/80"
                            aria-label={t('Remove image')}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {images.length === 0 && (
                    <p className="text-xs text-neutral-600 mt-2 flex items-center gap-1.5">
                      <ImageOff size={12} /> {t('No images selected yet')}
                    </p>
                  )}
                </div>

              </div>

              {/* Footer Controls - moved outside the scrolling area to ensure it's always visible */}
              <div className="p-6 border-t border-white/5 bg-neutral-900/50 flex-shrink-0 space-y-3">
                {error && (
                  <p className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    <AlertCircle size={16} className="shrink-0" /> {error}
                  </p>
                )}
                {submitting && submitStage && (
                  <p className="flex items-center gap-2 text-sm text-blue-300">
                    <Loader2 size={16} className="animate-spin shrink-0" /> {submitStage}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="relative flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          type="checkbox"
                          id="verification-checkbox"
                          checked={isSubmitForVerification}
                          onChange={(e) => setIsSubmitForVerification(e.target.checked)}
                          className="w-5 h-5 rounded border-white/20 bg-black/50 text-blue-500 focus:ring-blue-500/50 focus:ring-offset-neutral-900 cursor-pointer transition-colors"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="verification-checkbox" className="font-medium text-neutral-300 cursor-pointer select-none">
                          {t('Submit for verification')}
                        </label>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={onClose} disabled={submitting} className="px-6 py-2.5 rounded-xl font-medium text-white hover:bg-white/5 transition-colors hidden sm:block disabled:opacity-50">
                      {t('Cancel')}
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-2.5 px-8 rounded-xl shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:shadow-[0_0_20px_rgba(37,99,235,0.5)] transition-all"
                    >
                      {submitting && <Loader2 size={16} className="animate-spin" />}
                      {submitting ? t('Submitting…') : t('Submit')}
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};