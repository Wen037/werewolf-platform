import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useLang } from "../context/LanguageContext";
import { GameService } from "../services/game.service";
import { AuthService } from "../services/auth.service";
import { uploadImages } from "../services/upload.service";
import type { GameVenueDTO, GameSessionDTO, VenueSpaceType, VenuePrivacy } from "../types";
import { VENUE_TYPE_LABELS, DEFAULT_PRIVACY, getVenuePermissions, getDisplayAddress } from "../types";
import { AppLayout } from "../components/layout/AppLayout";
import { ReportModal } from "../components/ReportModal";
import { CheckCircle, BadgeCheck, Bell, BellOff, X as XIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconArrowLeft,
  IconMapPin,
  IconStar,
  IconHeart,
  IconCircleCheck,
  IconNavigation,
  IconAlertTriangle,
  IconPlus,
  IconCalendarEvent,
  IconHistory,
  IconUsers,
  IconClock,
  IconTrophy,
  IconX,
  IconCurrencyDollar,
  IconEdit,
  IconPhoto,
  IconCash,
  IconBuildingStore,
  IconCheck,
  IconLoader2,
} from "@tabler/icons-react";

// ── Venue Image Carousel ───────────────────────────────────────────────────

function VenueCarousel({ images, alt }: { images: string[]; alt: string }) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    const timer = setInterval(() => setIdx(i => (i + 1) % images.length), 4000);
    return () => clearInterval(timer);
  }, [images.length]);

  const prev = () => setIdx(i => (i - 1 + images.length) % images.length);
  const next = () => setIdx(i => (i + 1) % images.length);

  return (
    <div className="relative w-full h-full">
      <AnimatePresence mode="wait">
        <motion.img
          key={idx}
          src={images[idx]}
          alt={alt}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0 w-full h-full object-cover"
        />
      </AnimatePresence>

      {images.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
          >
            <ChevronRight size={20} />
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className={`w-2 h-2 rounded-full transition-all ${i === idx ? "bg-white scale-125" : "bg-white/40 hover:bg-white/60"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatEventDate(iso: string) {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" }) +
    " · " +
    d.toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit" })
  );
}

const PROFICIENCY_STYLES: Record<string, string> = {
  "All Welcome":  "bg-green-500/15 text-green-400 border-green-500/25",
  "Newbie":       "bg-sky-500/15 text-sky-400 border-sky-500/25",
  "Intermediate": "bg-amber-500/15 text-amber-400 border-amber-500/25",
  "Advanced":     "bg-orange-500/15 text-orange-400 border-orange-500/25",
  "Expert":       "bg-red-500/15 text-red-400 border-red-500/25",
};

function ProficiencyBadge({ value }: { value?: string }) {
  if (!value) return null;
  const cls = PROFICIENCY_STYLES[value] ?? "bg-neutral-700/60 text-neutral-400 border-white/10";
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cls}`}>
      {value.toUpperCase()}
    </span>
  );
}

// ── Upcoming Event Card ────────────────────────────────────────────────────

function UpcomingCard({ event, index }: { event: GameSessionDTO; index: number }) {
  const isFull = event.currentPlayers >= event.maxPlayers;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="p-4 rounded-2xl bg-white/5 border border-white/8 hover:bg-white/8 transition-colors space-y-3"
    >
      {/* Top row: status + proficiency + date */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
          isFull ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" : "bg-green-500/10 text-green-400 border-green-500/20"
        }`}>
          {isFull ? "FULL" : "OPEN"}
        </span>
        <ProficiencyBadge value={event.proficiency} />
        <span className="text-xs text-neutral-500 flex items-center gap-1 ml-auto">
          <IconClock size={11} /> {formatEventDate(event.date)}
        </span>
      </div>

      {/* Title */}
      <p className="text-white font-bold text-sm leading-snug">{event.title}</p>

      {/* Host */}
      <p className="text-neutral-500 text-xs">
        Host: <span className="text-neutral-300">{event.hostName ?? "Unknown"}</span>
      </p>

      {/* Description */}
      {event.description && (
        <p className="text-neutral-400 text-xs leading-relaxed border-t border-white/5 pt-2">
          {event.description}
        </p>
      )}

      {/* Footer: players + join */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-1.5 text-neutral-400 text-xs">
          <IconUsers size={14} />
          <span className={isFull ? "text-yellow-400 font-bold" : ""}>
            {event.currentPlayers}/{event.maxPlayers} players
          </span>
        </div>
        <button
          disabled={isFull}
          className={`px-5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
            isFull
              ? "bg-neutral-800 text-neutral-600 cursor-not-allowed"
              : "bg-red-600 hover:bg-red-500 text-white"
          }`}
        >
          {isFull ? "Full" : "Join"}
        </button>
      </div>
    </motion.div>
  );
}

// ── Past Event Card ────────────────────────────────────────────────────────

function PastCard({ event, index }: { event: GameSessionDTO; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="p-4 rounded-2xl bg-white/[0.03] border border-white/8 hover:bg-white/5 transition-colors space-y-3"
    >
      {/* Top row: FINISHED + proficiency + date */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-700/60 text-neutral-500 border border-white/8">
          FINISHED
        </span>
        <ProficiencyBadge value={event.proficiency} />
        <span className="text-xs text-neutral-600 flex items-center gap-1 ml-auto">
          <IconClock size={11} /> {formatEventDate(event.date)}
        </span>
      </div>

      {/* Title */}
      <p className="text-neutral-200 font-bold text-sm leading-snug">{event.title}</p>

      {/* Venue address + price */}
      {(event.venueAddress || event.pricePerHour !== undefined) && (
        <div className="flex items-center gap-3 text-xs text-neutral-500 flex-wrap">
          {event.venueAddress && (
            <span className="flex items-center gap-1">
              <IconMapPin size={12} className="text-red-500/70 flex-shrink-0" />
              {event.venueAddress}
            </span>
          )}
          {event.pricePerHour !== undefined && (
            <span className="flex items-center gap-1 flex-shrink-0 ml-auto">
              <IconCurrencyDollar size={12} className="text-neutral-500" />
              ${event.pricePerHour}/hr
            </span>
          )}
        </div>
      )}

      {/* Host */}
      <p className="text-neutral-600 text-xs">
        Host: <span className="text-neutral-500">{event.hostName ?? "Unknown"}</span>
      </p>

      {/* Description */}
      {event.description && (
        <p className="text-neutral-500 text-xs leading-relaxed border-t border-white/5 pt-2">
          {event.description}
        </p>
      )}

      {/* Footer: attendance + likes */}
      <div className="flex items-center justify-between pt-1 text-neutral-500 text-xs border-t border-white/5">
        <div className="flex items-center gap-1">
          <IconUsers size={13} />
          <span>{event.currentPlayers}/{event.maxPlayers} attended</span>
        </div>
        <div className="flex items-center gap-1">
          <IconTrophy size={13} className="text-yellow-600/70" />
          <span>{event.totalLikes} likes</span>
        </div>
      </div>
    </motion.div>
  );
}

// ── Slide-over Drawer ──────────────────────────────────────────────────────

interface DrawerProps {
  kind: "upcoming" | "past";
  events: GameSessionDTO[];
  onClose: () => void;
}

function EventsDrawer({ kind, events, onClose }: DrawerProps) {
  const isUpcoming = kind === "upcoming";
  const { t } = useLang();

  return (
    <>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        className="fixed inset-0 bg-black/60 z-[100]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        key="panel"
        className="fixed right-0 top-0 h-full w-full max-w-md bg-neutral-950 border-l border-white/10 z-[101] flex flex-col"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 260 }}
      >
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between px-6 py-5 border-b border-white/8 bg-neutral-950/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            {isUpcoming
              ? <IconCalendarEvent size={20} className="text-red-400" />
              : <IconHistory size={20} className="text-neutral-400" />
            }
            <h2 className="text-lg font-bold text-white">
              {isUpcoming ? t("Coming Events") : t("Event History")}
            </h2>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/5 text-neutral-400 border border-white/10">
              {events.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
          >
            <IconX size={18} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4 space-y-3">
          {events.length === 0 ? (
            <p className="text-neutral-500 text-sm text-center mt-12">
              {isUpcoming ? t("No upcoming events scheduled here yet.") : t("No past events recorded here.")}
            </p>
          ) : isUpcoming ? (
            events.map((ev, i) => <UpcomingCard key={ev.id} event={ev} index={i} />)
          ) : (
            events.map((ev, i) => <PastCard key={ev.id} event={ev} index={i} />)
          )}
        </div>
      </motion.div>
    </>
  );
}

// ── Edit Space Modal (owner only) ─────────────────────────────────────────

interface EditSpaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  venue: GameVenueDTO;
  onSave: (updated: Partial<GameVenueDTO>) => void;
}

const SPACE_TYPES: VenueSpaceType[] = ['boardgame_store', 'house', 'work', 'school', 'other'];
const PRIVACY_OPTIONS: { value: VenuePrivacy; label: string; hint: string }[] = [
  { value: 'public',      label: 'Public',      hint: 'Full address shown to everyone' },
  { value: 'approximate', label: 'Approximate',  hint: 'District shown; full address on request' },
  { value: 'private',     label: 'Private',      hint: 'Area only; shared after player joins' },
];

const MAX_IMAGES = 5;
const ACCEPTED_TYPES = "image/jpeg,image/png,image/webp";
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

type ImageEntry = { url: string; isDisplay: boolean; file?: File };

/** Builds the editable image list from the venue's existing gallery (`images`)
 * falling back to the single `imageUrl`, so the owner can pick any
 * already-uploaded photo as the cover instead of having to re-upload one. */
const buildInitialImages = (v: GameVenueDTO): ImageEntry[] => {
  const urls = v.images && v.images.length > 0 ? v.images : (v.imageUrl ? [v.imageUrl] : []);
  if (urls.length === 0) return [];
  const coverIdx = Math.max(0, urls.indexOf(v.imageUrl));
  return urls.map((url, i) => ({ url, isDisplay: i === coverIdx }));
};

function EditSpaceModal({ isOpen, onClose, venue, onSave }: EditSpaceModalProps) {
  const { t } = useLang();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name:         venue.name,
    address:      venue.address,
    area:         venue.area ?? "",
    privacy:      (venue.privacy ?? "public") as VenuePrivacy,
    description:  venue.description,
    pricePerHour: venue.pricePerHour,
    priceType:    (venue.priceType ?? "per_session") as "per_person" | "per_session",
    type:         (venue.type ?? "boardgame_store") as VenueSpaceType,
    openingHours: venue.openingHours ?? "",
    maxPax:       venue.maxPax ?? "",
    rules:        venue.rules ?? "",
    amenities:    venue.amenities.join(", "),
  });
  const [images, setImages] = useState<ImageEntry[]>(() => buildInitialImages(venue));
  const [isDragOver, setIsDragOver] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imgError, setImgError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setForm({
        name:         venue.name,
        address:      venue.address,
        area:         venue.area ?? "",
        privacy:      (venue.privacy ?? "public") as VenuePrivacy,
        description:  venue.description,
        pricePerHour: venue.pricePerHour,
        priceType:    (venue.priceType ?? "per_session") as "per_person" | "per_session",
        type:         (venue.type ?? "boardgame_store") as VenueSpaceType,
        openingHours: venue.openingHours ?? "",
        maxPax:       venue.maxPax ?? "",
        rules:        venue.rules ?? "",
        amenities:    venue.amenities.join(", "),
      });
      setImages(buildInitialImages(venue));
      setIsDragOver(false);
      setSaved(false);
      setSaving(false);
      setImgError("");
    }
  }, [isOpen, venue]);

  // Revoke any pending blob URLs on unmount to avoid memory leaks
  useEffect(() => {
    return () => { images.forEach(img => { if (img.file) URL.revokeObjectURL(img.url); }); };
  }, [images]);

  const addFiles = (fileList: FileList | File[]) => {
    setImgError("");
    const files = Array.from(fileList).filter(f => f.type.startsWith("image/"));
    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) { setImgError(`You can upload up to ${MAX_IMAGES} photos.`); return; }
    const toAdd: ImageEntry[] = [];
    for (const file of files.slice(0, remaining)) {
      if (file.size > MAX_FILE_BYTES) { setImgError(`"${file.name}" exceeds 5 MB`); continue; }
      toAdd.push({ url: URL.createObjectURL(file), isDisplay: images.length === 0 && toAdd.length === 0, file });
    }
    setImages(prev => [...prev, ...toAdd]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files);
    e.target.value = "";
  };

  const setDisplay = (idx: number) =>
    setImages(prev => prev.map((img, i) => ({ ...img, isDisplay: i === idx })));

  const removeImage = (idx: number) =>
    setImages(prev => {
      const target = prev[idx];
      if (target.file) URL.revokeObjectURL(target.url);
      const next = prev.filter((_, i) => i !== idx);
      if (target.isDisplay && next.length > 0) next[0].isDisplay = true;
      return next;
    });

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));

  // When space type changes, auto-suggest the most appropriate privacy level
  const handleTypeChange = (spaceType: VenueSpaceType) => {
    setForm(f => ({ ...f, type: spaceType, privacy: DEFAULT_PRIVACY[spaceType] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setImgError("");
    setSaving(true);
    try {
      // Newly added photos are local blob URLs (pending.file set) — upload them
      // to Cloudinary now so the saved venue stores permanent secure URLs.
      let finalImages = images;
      const pending = images.filter(img => img.file);
      if (pending.length > 0) {
        const uploadedUrls = await uploadImages(pending.map(img => img.file!), "venues");
        let u = 0;
        finalImages = images.map(img => {
          if (!img.file) return img;
          URL.revokeObjectURL(img.url);
          return { url: uploadedUrls[u++], isDisplay: img.isDisplay };
        });
        setImages(finalImages);
      }

      const displayImg = finalImages.find(i => i.isDisplay) ?? finalImages[0];
      onSave({
        name:         form.name,
        address:      form.address,
        area:         form.area || undefined,
        privacy:      form.privacy,
        description:  form.description,
        imageUrl:     displayImg?.url ?? venue.imageUrl,
        images:       finalImages.map(i => i.url),
        pricePerHour: Number(form.pricePerHour),
        priceType:    form.priceType,
        type:         form.type,
        openingHours: form.openingHours || undefined,
        maxPax:       form.maxPax !== "" ? Number(form.maxPax) : undefined,
        amenities:    form.amenities.split(",").map(a => a.trim()).filter(Boolean),
        rules:        form.rules || undefined,
      });
      setSaved(true);
      setTimeout(onClose, 1200);
    } catch (err) {
      setImgError(err instanceof Error ? err.message : "Failed to upload photos. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all placeholder:text-neutral-600 [color-scheme:dark]";
  const labelCls = "text-xs font-semibold text-neutral-400 mb-1.5 block uppercase tracking-wider";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100]" />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-neutral-900 border border-amber-500/20 w-full max-w-4xl rounded-2xl shadow-2xl pointer-events-auto flex flex-col max-h-[90vh]">

              {/* Header */}
              <div className="flex justify-between items-center p-5 border-b border-white/5">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <IconEdit size={20} className="text-amber-400" /> {t('Edit Space')}
                  </h2>
                  <p className="text-xs text-neutral-400 mt-0.5">{t('Only you (the owner) can edit this listing')}</p>
                </div>
                <button onClick={onClose} className="text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-full transition-colors">
                  <IconX size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="overflow-y-auto custom-scrollbar">
                <div className="p-5 space-y-5">

                  {/* ── Space type ── */}
                  <div>
                    <label className={labelCls}><IconBuildingStore size={11} className="inline mr-1" />{t('Space Type')}</label>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                      {SPACE_TYPES.map(spaceType => (
                        <button key={spaceType} type="button" onClick={() => handleTypeChange(spaceType)}
                          className={`py-2 px-1 rounded-xl text-[11px] font-semibold border transition-all text-center ${
                            form.type === spaceType
                              ? "bg-amber-500/20 border-amber-500/50 text-amber-300"
                              : "bg-white/5 border-white/10 text-neutral-400 hover:bg-white/10"
                          }`}>
                          {t(VENUE_TYPE_LABELS[spaceType])}
                        </button>
                      ))}
                    </div>
                    {/* Space-type hints */}
                    {form.type === 'house' && (
                      <p className="mt-2 text-[11px] text-amber-400/80">{t('Home venues default to private — only the district is shown publicly.')}</p>
                    )}
                    {(form.type === 'work' || form.type === 'school') && (
                      <p className="mt-2 text-[11px] text-sky-400/80">{t('Office / school venues default to approximate — full address shared on request.')}</p>
                    )}
                  </div>

                  {/* ── Privacy ── */}
                  <div>
                    <label className={labelCls}>{t('Address Privacy')}</label>
                    <div className="flex gap-2">
                      {PRIVACY_OPTIONS.map(opt => (
                        <button key={opt.value} type="button"
                          onClick={() => setForm(f => ({ ...f, privacy: opt.value }))}
                          className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                            form.privacy === opt.value
                              ? "bg-amber-500/20 border-amber-500/50 text-amber-300"
                              : "bg-white/5 border-white/10 text-neutral-400 hover:bg-white/10"
                          }`}>
                          {t(opt.label)}
                        </button>
                      ))}
                    </div>
                    <p className="mt-1.5 text-[11px] text-neutral-500">
                      {t(PRIVACY_OPTIONS.find(o => o.value === form.privacy)?.hint ?? '')}
                    </p>
                  </div>

                  {/* ── Name ── */}
                  <div>
                    <label className={labelCls}>{t('Space Name')}</label>
                    <input value={form.name} onChange={set("name")} required className={inputCls} placeholder="e.g. Wolf's Den" />
                  </div>

                  {/* ── Address ── */}
                  <div>
                    <label className={labelCls}><IconMapPin size={11} className="inline mr-1" />
                      {t(form.privacy === 'public' ? 'Full Address (shown publicly)' : 'Full Address (kept private)')}
                    </label>
                    <input value={form.address} onChange={set("address")} required className={inputCls}
                      placeholder="e.g. 60A Prinsep Street, Singapore" />
                    {form.privacy !== 'public' && (
                      <p className="mt-1 text-[11px] text-amber-400/80">{t('This exact address is hidden from the public listing.')}</p>
                    )}
                  </div>

                  {/* ── Area label ── */}
                  {form.privacy !== 'public' && (
                    <div>
                      <label className={labelCls}>{t('Public Area Label')}</label>
                      <input value={form.area} onChange={set("area")} className={inputCls}
                        placeholder="e.g. Yishun, Jurong East" />
                      <p className="mt-1 text-[11px] text-neutral-500">{t('Shown on the listing as "Yishun area" so players know the general location.')}</p>
                    </div>
                  )}

                  {/* ── Price + max pax ── */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}><IconCash size={11} className="inline mr-1" />{t('Price / hr (0 = Free)')}</label>
                      <input type="number" min={0} step={0.5} value={form.pricePerHour} onChange={set("pricePerHour")} required className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}><IconUsers size={11} className="inline mr-1" />{t('Max Capacity')}</label>
                      <input type="number" min={1} max={500} value={form.maxPax} onChange={set("maxPax")}
                        className={inputCls} placeholder="e.g. 20" />
                    </div>
                  </div>

                  {/* Pricing Model */}
                  {Number(form.pricePerHour) > 0 && (
                    <div>
                      <label className={labelCls}>{t('Pricing Model')}</label>
                      <div className="flex gap-3">
                        {(["per_session", "per_person"] as const).map(opt => (
                          <button key={opt} type="button"
                            onClick={() => setForm(f => ({ ...f, priceType: opt }))}
                            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                              form.priceType === opt
                                ? "bg-amber-500/20 border-amber-500/50 text-amber-300"
                                : "bg-white/5 border-white/10 text-neutral-400 hover:bg-white/10"
                            }`}>
                            {t(opt === "per_session" ? "$/hr (whole space)" : "$/person/hr")}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── Opening hours ── */}
                  <div>
                    <label className={labelCls}><IconClock size={11} className="inline mr-1" />{t('Opening / Available Hours')}</label>
                    <input value={form.openingHours} onChange={set("openingHours")} className={inputCls}
                      placeholder="e.g. Mon–Fri 2pm–11pm, Sat–Sun 12pm–2am" />
                  </div>

                  {/* ── Photos (multi-upload, max 5) ── */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className={labelCls + " mb-0"}>
                        <IconPhoto size={11} className="inline mr-1" />{t('Photos')}
                        <span className="normal-case font-normal text-neutral-500 ml-1">{t('JPG / PNG / WebP · max 5 MB each')}</span>
                      </label>
                      <span className="text-[11px] text-neutral-500">{images.length} / {MAX_IMAGES}</span>
                    </div>
                    {imgError && <p className="text-[11px] text-red-400 mb-2">{imgError}</p>}
                    <div
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }}
                      onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDragOver(false);
                        if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
                      }}
                      className={`grid grid-cols-3 gap-2 rounded-xl transition-colors ${
                        isDragOver ? "ring-2 ring-amber-500/60 bg-amber-500/5" : ""
                      }`}
                    >
                      {images.map((img, idx) => (
                        <div key={idx} className="relative group rounded-xl overflow-hidden border border-white/10 aspect-video bg-black/40">
                          <img src={img.url} alt="" className="w-full h-full object-cover" />
                          {/* Cover badge */}
                          {img.isDisplay && (
                            <div className="absolute bottom-1 left-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500 text-black">
                              {t('Cover')}
                            </div>
                          )}
                          {/* Hover controls */}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5">
                            {!img.isDisplay && (
                              <button type="button" onClick={() => setDisplay(idx)}
                                className="text-[9px] font-bold px-2 py-1 rounded-lg bg-amber-500/90 text-black hover:bg-amber-400">
                                {t('Set as Cover')}
                              </button>
                            )}
                            <button type="button" onClick={() => removeImage(idx)}
                              className="text-[9px] font-bold px-2 py-1 rounded-lg bg-red-500/80 text-white hover:bg-red-500">
                              ✕ Remove
                            </button>
                          </div>
                        </div>
                      ))}
                      {/* Add button */}
                      {images.length < MAX_IMAGES && (
                        <button type="button" onClick={() => fileInputRef.current?.click()}
                          className="aspect-video rounded-xl border-2 border-dashed border-white/15 hover:border-amber-500/40 flex flex-col items-center justify-center gap-1 text-neutral-500 hover:text-amber-400 transition-colors bg-white/3 text-center px-1">
                          <IconPhoto size={18} />
                          <span className="text-[10px] font-semibold">{t('Add Photo')}</span>
                          <span className="text-[9px] text-neutral-600">{t('or drag and drop')}</span>
                        </button>
                      )}
                    </div>
                    <input ref={fileInputRef} type="file" accept={ACCEPTED_TYPES} multiple
                      onChange={handleFileSelect} className="hidden" />
                  </div>

                  {/* ── Description ── */}
                  <div>
                    <label className={labelCls}>{t('Description')}</label>
                    <textarea value={form.description} onChange={set("description")} rows={3}
                      className={`${inputCls} resize-none`} placeholder={t('Describe the space...')} />
                  </div>

                  {/* ── Amenities ── */}
                  <div>
                    <label className={labelCls}>{t('Amenities')} <span className="normal-case font-normal text-neutral-500">(comma-separated)</span></label>
                    <input value={form.amenities} onChange={set("amenities")} className={inputCls}
                      placeholder="WiFi, Snacks, Private Room" />
                  </div>

                  {/* ── Rules ── */}
                  <div>
                    <label className={labelCls}>{t('House Rules')} <span className="normal-case font-normal text-neutral-500">(optional)</span></label>
                    <textarea value={form.rules} onChange={set("rules")} rows={2}
                      className={`${inputCls} resize-none`} placeholder="e.g. No smoking, remove shoes at entrance..." />
                  </div>
                </div>

                {/* Footer */}
                <div className="px-5 pb-5 flex gap-3">
                  <button type="button" onClick={onClose} disabled={saving}
                    className="flex-1 py-3 rounded-xl font-semibold text-white hover:bg-white/5 transition-colors text-sm border border-white/10 disabled:opacity-50">
                    {t('Cancel')}
                  </button>
                  <button type="submit" disabled={saving}
                    className={`flex-1 py-3 font-bold rounded-xl transition-all text-sm flex items-center justify-center gap-2 disabled:cursor-not-allowed ${
                      saved ? "bg-green-600 text-white" : "bg-amber-500 hover:bg-amber-400 disabled:opacity-70 text-black"
                    }`}>
                    {saved
                      ? <><IconCheck size={16} /> {t('Saved!')}</>
                      : saving
                        ? <><IconLoader2 size={16} className="animate-spin" /> {t('Uploading photos…')}</>
                        : t('Save Changes')}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Booking Modal ──────────────────────────────────────────────────────────

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  venueName: string;
  pricePerHour?: number;
  priceType?: "per_person" | "per_session";
}

function BookingModal({ isOpen, onClose, venueName, pricePerHour, priceType }: BookingModalProps) {
  const { t } = useLang();
  const [form, setForm] = useState({
    date: "", time: "", duration: "2", pax: 8, name: "", contact: "", notes: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleClose = () => { onClose(); setTimeout(() => setSubmitted(false), 300); };
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); setSubmitted(true); };

  const isFree = pricePerHour === 0;
  const dur = parseFloat(form.duration);
  const rawCost = pricePerHour !== undefined && !isFree
    ? priceType === "per_person"
      ? pricePerHour * form.pax * dur
      : pricePerHour * dur
    : null;
  const estCost = pricePerHour !== undefined
    ? isFree ? "Free" : `$${rawCost!.toFixed(0)}`
    : null;
  const costBreakdown = rawCost !== null && pricePerHour !== undefined
    ? priceType === "per_person"
      ? `${form.pax} pax × $${pricePerHour}/person × ${dur}hr`
      : `$${pricePerHour}/hr × ${dur}hr`
    : null;

  const inputCls = "w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all placeholder:text-neutral-600 [color-scheme:dark]";
  const labelCls = "text-xs font-semibold text-neutral-400 mb-1.5 block uppercase tracking-wider";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={handleClose} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100]" />

          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="bg-neutral-900 border border-white/10 w-full max-w-lg rounded-2xl shadow-2xl pointer-events-auto flex flex-col max-h-[90vh]">

              {/* Header */}
              <div className="flex justify-between items-center p-5 border-b border-white/5">
                <div>
                  <h2 className="text-xl font-bold text-white">{t('Book a Session')}</h2>
                  <p className="text-xs text-neutral-400 mt-0.5">{venueName}</p>
                </div>
                <button onClick={handleClose} className="text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-full transition-colors">
                  <IconX size={18} />
                </button>
              </div>

              {submitted ? (
                <div className="flex flex-col items-center justify-center py-16 px-8 text-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-green-500/15 border border-green-500/25 flex items-center justify-center">
                    <IconCircleCheck size={36} className="text-green-400" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-lg">Enquiry Sent!</p>
                    <p className="text-neutral-400 text-sm mt-1">The venue will reach out to confirm your booking via the contact you provided.</p>
                  </div>
                  <button onClick={handleClose} className="mt-2 px-8 py-2.5 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl transition-colors">
                    {t('Done')}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="overflow-y-auto custom-scrollbar">
                  <div className="p-5 space-y-4">

                    {/* Date + Time */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>{t('Date')}</label>
                        <input type="date" required value={form.date} onChange={set("date")} className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>{t('Start Time')}</label>
                        <input type="time" required value={form.time} onChange={set("time")} className={inputCls} />
                      </div>
                    </div>

                    {/* Duration + Pax */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>{t('Duration')}</label>
                        <select value={form.duration} onChange={set("duration")} className={inputCls}>
                          {["1", "1.5", "2", "2.5", "3", "4"].map(h => (
                            <option key={h} value={h} className="bg-neutral-900">{h} {parseFloat(h) > 1 ? t('hrs') : t('hr')}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>{t('No. of Pax')}</label>
                        <input type="number" min={2} max={50} required value={form.pax}
                          onChange={e => setForm(f => ({ ...f, pax: parseInt(e.target.value) || 2 }))}
                          className={inputCls} />
                      </div>
                    </div>

                    {/* Cost estimate */}
                    {estCost && (
                      <div className="bg-white/5 rounded-xl px-4 py-2.5 flex justify-between items-center border border-white/5">
                        <span className="text-neutral-400 text-xs">{t('Estimated cost')}</span>
                        <span className="text-white font-bold">
                          {isFree
                            ? <span className="text-green-400">{t('Free')}</span>
                            : <>{estCost} <span className="text-neutral-500 font-normal text-xs">({costBreakdown})</span></>}
                        </span>
                      </div>
                    )}

                    {/* Name + Contact */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>{t('Your Name')}</label>
                        <input type="text" required placeholder={t('e.g. Alex Tan')} value={form.name} onChange={set("name")} className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>{t('Contact')}</label>
                        <input type="text" required placeholder={t('Phone or email')} value={form.contact} onChange={set("contact")} className={inputCls} />
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <label className={labelCls}>{t('Notes')} <span className="text-neutral-600 normal-case font-normal">{t('(optional)')}</span></label>
                      <textarea placeholder={t('Special requests, setup needs...')} value={form.notes} onChange={set("notes")}
                        className={`${inputCls} min-h-[80px] resize-none`} />
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="px-5 pb-5 flex gap-3">
                    <button type="button" onClick={handleClose}
                      className="flex-1 py-3 rounded-xl font-semibold text-white hover:bg-white/5 transition-colors text-sm border border-white/10">
                      {t('Cancel')}
                    </button>
                    <button type="submit"
                      className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl shadow-lg transition-all text-sm">
                      {t('Send Enquiry')}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function VenueDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hash } = useLocation();
  const { t } = useLang();
  const [venue, setVenue]         = useState<GameVenueDTO | null>(null);
  const [sessions, setSessions]   = useState<GameSessionDTO[]>([]);
  const [isReportOpen, setIsReportOpen]   = useState(false);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isEditOpen, setIsEditOpen]       = useState(false);
  const [showToast, setShowToast]         = useState(false);
  const [drawer, setDrawer]               = useState<"upcoming" | "past" | null>(null);
  const [hoverRating, setHoverRating]     = useState(0);

  const currentUser = AuthService.getCurrentUser();
  const permissions = venue ? getVenuePermissions(venue, currentUser) : { canEdit: false, canVerify: false, canDelete: false };

  const handleSaveEdit = async (updated: Partial<GameVenueDTO>) => {
    if (!venue) return;
    setVenue(v => v ? { ...v, ...updated } : v);
    try {
      await GameService.updateVenue(venue.id, updated);
    } catch {
      // revert optimistic update on error
      setVenue(venue);
    }
  };

  const openDirections = () => {
    if (!venue) return;
    const url = venue.coordinates
      ? `https://www.google.com/maps/dir/?api=1&destination=${venue.coordinates.lat},${venue.coordinates.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.address)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  useEffect(() => {
    if (!id) return;
    GameService.getVenueById(id).then(data => {
      if (data) setVenue(data);
    });
    GameService.getSessionsByVenue(id).then(setSessions);
  }, [id]);

  useEffect(() => {
    if (!hash) return;
    const el = document.querySelector(hash);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [hash, id]);

  const now = Date.now();
  const comingEvents  = useMemo(() => sessions.filter(s => s.status !== "finished" || new Date(s.date).getTime() > now), [sessions, now]);
  const historyEvents = useMemo(() => sessions.filter(s => s.status === "finished"), [sessions]);
  const pendingApprovals = useMemo(
    () => permissions.canEdit ? sessions.filter(s => s.status !== "finished" && s.venueApprovalStatus === "pending") : [],
    [sessions, permissions.canEdit]
  );

  const handleApprove = (sessionId: string) => {
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, venueApprovalStatus: 'confirmed' as const } : s));
  };
  const handleReject = (sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId));
  };

  const triggerToast = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleSubscribe = async () => {
    if (!venue || !id) return;
    const prev = venue.myInteraction?.isSubscribed ?? false;
    setVenue(v => v ? {
      ...v,
      myInteraction: {
        userId: v.myInteraction?.userId ?? "",
        venueId: id,
        isLiked: v.myInteraction?.isLiked ?? false,
        isSubscribed: !prev,
        myRating: v.myInteraction?.myRating,
      },
    } : v);
    try {
      await GameService.subscribeVenue(id);
    } catch {
      setVenue(v => v ? {
        ...v,
        myInteraction: {
          userId: v.myInteraction?.userId ?? "",
          venueId: id,
          isLiked: v.myInteraction?.isLiked ?? false,
          isSubscribed: prev,
          myRating: v.myInteraction?.myRating,
        },
      } : v);
    }
  };

  const handleLike = async () => {
    if (!venue || !id) return;
    const prev = venue.myInteraction?.isLiked ?? false;
    setVenue(v => v ? {
      ...v,
      totalLikes: prev ? v.totalLikes - 1 : v.totalLikes + 1,
      myInteraction: {
        userId: v.myInteraction?.userId ?? "",
        venueId: id,
        isLiked: !prev,
        isSubscribed: v.myInteraction?.isSubscribed ?? false,
        myRating: v.myInteraction?.myRating,
      },
    } : v);
    try {
      await GameService.likeVenue(id);
    } catch {
      // revert on error
      setVenue(v => v ? {
        ...v,
        totalLikes: prev ? v.totalLikes + 1 : v.totalLikes - 1,
        myInteraction: {
          userId: v.myInteraction?.userId ?? "",
          venueId: id,
          isLiked: prev,
          isSubscribed: v.myInteraction?.isSubscribed ?? false,
          myRating: v.myInteraction?.myRating,
        },
      } : v);
    }
  };

  const handleRate = async (rating: number) => {
    if (!venue || !id) return;
    const prevRating = venue.myInteraction?.myRating;
    const prevAvg = venue.averageRating;
    setVenue(v => v ? {
      ...v,
      myInteraction: {
        userId: v.myInteraction?.userId ?? "",
        venueId: id,
        isLiked: v.myInteraction?.isLiked ?? false,
        isSubscribed: v.myInteraction?.isSubscribed ?? false,
        myRating: rating,
      },
    } : v);
    try {
      await GameService.rateVenue(id, rating);
    } catch {
      setVenue(v => v ? {
        ...v,
        averageRating: prevAvg,
        myInteraction: {
          userId: v.myInteraction?.userId ?? "",
          venueId: id,
          isLiked: v.myInteraction?.isLiked ?? false,
          isSubscribed: v.myInteraction?.isSubscribed ?? false,
          myRating: prevRating,
        },
      } : v);
    }
  };

  if (!venue) {
    return (
      <AppLayout>
        <div className="p-10 text-white flex items-center justify-center h-full">
          <p className="text-neutral-400">Loading details...</p>
        </div>
      </AppLayout>
    );
  }

  const isLiked = venue.myInteraction?.isLiked ?? false;
  const isSubscribed = venue.myInteraction?.isSubscribed ?? false;
  const myRating = venue.myInteraction?.myRating ?? 0;

  return (
    <AppLayout>
      <div className="h-full w-full overflow-y-auto p-6 md:p-10 custom-scrollbar relative">

        {/* Toast */}
        <AnimatePresence>
          {showToast && (
            <motion.div
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
              className="fixed top-24 left-10 z-[200] flex items-center gap-2 px-6 py-3 bg-neutral-900 border border-green-500/30 rounded-full shadow-2xl backdrop-blur-md"
            >
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-white font-bold text-sm tracking-wide">Submitted</span>
            </motion.div>
          )}
        </AnimatePresence>

        <ReportModal
          isOpen={isReportOpen} onClose={() => setIsReportOpen(false)}
          onSuccess={triggerToast} targetType="Space" targetName={venue.name}
        />

        <BookingModal
          isOpen={isBookingOpen} onClose={() => setIsBookingOpen(false)}
          venueName={venue.name} pricePerHour={venue.pricePerHour} priceType={venue.priceType}
        />

        <EditSpaceModal
          isOpen={isEditOpen} onClose={() => setIsEditOpen(false)}
          venue={venue} onSave={handleSaveEdit}
        />

        {/* Slide-over Drawer */}
        <AnimatePresence>
          {drawer && (
            <EventsDrawer
              kind={drawer}
              events={drawer === "upcoming" ? comingEvents : historyEvents}
              onClose={() => setDrawer(null)}
            />
          )}
        </AnimatePresence>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors group">
            <IconArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">{t('Back to Directory')}</span>
          </button>
          <div className="flex items-center gap-2">
            {permissions.canEdit && (
              <button onClick={() => setIsEditOpen(true)} className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 transition-all text-sm font-bold">
                <IconEdit size={16} /><span>{t('Edit Space')}</span>
              </button>
            )}
            <button onClick={() => setIsReportOpen(true)} className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all text-sm font-bold">
              <IconAlertTriangle size={16} /><span>{t('Report Space')}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20">

          {/* ── Left column ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Hero image / carousel */}
            <div className="w-full h-64 md:h-96 rounded-3xl overflow-hidden relative shadow-2xl border border-white/5">
              <VenueCarousel
                images={venue.images && venue.images.length > 0 ? venue.images : [venue.imageUrl]}
                alt={venue.name}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
              <div className="absolute bottom-6 left-6 md:left-10">
                <h1 className="text-3xl md:text-5xl font-bold text-white mb-2 flex items-center gap-3">
                  {venue.name}
                  {venue.isVerified && (
                    <span className="flex items-center gap-1 text-sm font-semibold text-green-400 bg-green-500/15 border border-green-500/30 px-2.5 py-1 rounded-full shrink-0">
                      <BadgeCheck size={16} /> Verified
                    </span>
                  )}
                </h1>
                <p className="text-neutral-300 flex items-center gap-2 text-lg">
                  <IconMapPin size={20} className="text-red-500" />
                  {getDisplayAddress(venue)}
                  {venue.privacy && venue.privacy !== 'public' && (
                    <span className="text-xs text-neutral-400 bg-white/10 px-2 py-0.5 rounded-full">
                      {venue.privacy === 'private' ? 'Address shared after joining' : 'Approximate area'}
                    </span>
                  )}
                </p>
                {venue.pricePerHour !== undefined && (
                  <div className="mt-2 inline-flex items-center gap-1.5">
                    <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                      venue.pricePerHour === 0
                        ? "bg-green-500/25 text-green-400 border border-green-500/30"
                        : "bg-black/40 text-green-400 border border-green-500/20"
                    }`}>
                      {venue.pricePerHour === 0
                        ? "Free entry"
                        : venue.priceType === "per_person"
                          ? `$${venue.pricePerHour} / person / hr`
                          : `$${venue.pricePerHour} / hr`}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* ── Pending Approvals (owner only) — shown first if present ── */}
            {pendingApprovals.length > 0 && (
              <div id="pending-approvals" className="bg-amber-950/20 border border-amber-500/25 rounded-2xl p-6 md:p-8 backdrop-blur-sm scroll-mt-8">
                <h2 className="text-xl font-bold text-white mb-5 flex items-center gap-2">
                  <IconCalendarEvent size={22} className="text-amber-400" />
                  {t('Pending Approvals')}
                  <span className="ml-1 text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    {pendingApprovals.length}
                  </span>
                </h2>
                <div className="space-y-3">
                  {pendingApprovals.map((event, i) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center justify-between gap-4 p-4 rounded-xl bg-amber-500/5 border border-amber-500/15 hover:bg-amber-500/10 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <ProficiencyBadge value={event.proficiency} />
                          <span className="text-xs text-neutral-500 flex items-center gap-1">
                            <IconClock size={11} /> {formatEventDate(event.date)}
                          </span>
                        </div>
                        <p className="text-white font-semibold text-sm truncate">{event.title}</p>
                        <p className="text-neutral-500 text-xs mt-0.5">
                          Host: <span className="text-amber-300 font-medium">{event.hostName ?? "Unknown"}</span>
                          {" · "}{event.currentPlayers}/{event.maxPlayers} players
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleReject(event.id)}
                          className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all"
                          title="Reject"
                        >
                          <XIcon size={16} />
                        </button>
                        <button
                          onClick={() => handleApprove(event.id)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-500/15 border border-green-500/25 text-green-400 hover:bg-green-500/25 transition-all text-xs font-bold"
                        >
                          <IconCheck size={14} /> Approve
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* About */}
            <div className="bg-neutral-900/40 border border-white/10 rounded-2xl p-6 md:p-8 backdrop-blur-sm">
              <h2 className="text-xl font-bold text-white mb-4">{t('About this Place')}</h2>
              <p className="text-neutral-400 leading-relaxed mb-6">
                {venue.description || "A mysterious gathering place for werewolves and villagers alike."}
              </p>

              {/* Meta info row */}
              <div className="flex flex-wrap gap-3 mb-6">
                {venue.openingHours && (
                  <div className="flex items-center gap-2 text-sm text-neutral-300 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                    <IconClock size={14} className="text-amber-400" />
                    {venue.openingHours}
                  </div>
                )}
                {venue.type && (
                  <div className="flex items-center gap-2 text-sm text-neutral-300 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                    <IconBuildingStore size={14} className="text-sky-400" />
                    {VENUE_TYPE_LABELS[venue.type]}
                  </div>
                )}
                {venue.maxPax && (
                  <div className="flex items-center gap-2 text-sm text-neutral-300 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                    <IconUsers size={14} className="text-green-400" />
                    Up to {venue.maxPax} pax
                  </div>
                )}
              </div>

              {venue.rules && (
                <div className="mb-6 p-4 rounded-xl bg-amber-500/5 border border-amber-500/15">
                  <p className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">{t('House Rules')}</p>
                  <p className="text-sm text-neutral-300">{venue.rules}</p>
                </div>
              )}

              <h3 className="text-lg font-bold text-white mb-4">{t('Amenities')}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {venue.amenities.map(am => (
                  <div key={am} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 text-neutral-300">
                    <IconCircleCheck size={18} className="text-green-500 flex-shrink-0" />
                    <span className="text-sm">{am}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Coming Events ── */}
            <div className="bg-neutral-900/40 border border-white/10 rounded-2xl p-6 md:p-8 backdrop-blur-sm">
              <h2 className="text-xl font-bold text-white mb-5 flex items-center gap-2">
                <IconCalendarEvent size={22} className="text-red-400" />
                {t('Coming Events')}
                {comingEvents.length > 0 && (
                  <span className="ml-2 text-xs font-bold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/20">
                    {comingEvents.length}
                  </span>
                )}
              </h2>

              {comingEvents.length === 0 ? (
                <p className="text-neutral-500 text-sm">{t('No upcoming events scheduled here yet.')}</p>
              ) : (
                <div className="space-y-3">
                  {comingEvents.map((event, i) => {
                    const isFull = event.currentPlayers >= event.maxPlayers;
                    return (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center justify-between gap-4 p-4 rounded-xl bg-white/5 border border-white/8 hover:bg-white/8 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${isFull ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" : "bg-green-500/10 text-green-400 border-green-500/20"}`}>
                              {isFull ? t("FULL") : t("OPEN")}
                            </span>
                            <ProficiencyBadge value={event.proficiency} />
                            <span className="text-xs text-neutral-500 flex items-center gap-1">
                              <IconClock size={11} /> {formatEventDate(event.date)}
                            </span>
                          </div>
                          <p className="text-white font-semibold text-sm truncate">{event.title}</p>
                          <p className="text-neutral-500 text-xs mt-0.5">
                            Host: <span className="text-neutral-300">{event.hostName ?? "Unknown"}</span>
                          </p>
                        </div>

                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="flex items-center gap-1 text-neutral-400 text-xs">
                            <IconUsers size={13} />
                            <span className={isFull ? "text-yellow-400 font-bold" : ""}>
                              {event.currentPlayers}/{event.maxPlayers}
                            </span>
                          </div>
                          <button
                            disabled={isFull}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              isFull
                                ? "bg-neutral-700 text-neutral-500 cursor-not-allowed"
                                : "bg-red-600 hover:bg-red-500 text-white active:scale-95"
                            }`}
                          >
                            {isFull ? t("FULL") : t("Join")}
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Event History ── */}
            <div className="bg-neutral-900/40 border border-white/10 rounded-2xl p-6 md:p-8 backdrop-blur-sm">
              <h2 className="text-xl font-bold text-white mb-5 flex items-center gap-2">
                <IconHistory size={22} className="text-neutral-400" />
                {t('Event History')}
                {historyEvents.length > 0 && (
                  <span className="ml-2 text-xs font-bold px-2 py-0.5 rounded-full bg-white/5 text-neutral-400 border border-white/10">
                    {historyEvents.length}
                  </span>
                )}
              </h2>

              {historyEvents.length === 0 ? (
                <p className="text-neutral-500 text-sm">No events have been held here yet.</p>
              ) : (
                <div className="space-y-3">
                  {historyEvents.map((event, i) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center justify-between gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-700/60 text-neutral-400 border border-white/5">
                            FINISHED
                          </span>
                          <ProficiencyBadge value={event.proficiency} />
                          <span className="text-xs text-neutral-600 flex items-center gap-1">
                            <IconClock size={11} /> {formatEventDate(event.date)}
                          </span>
                        </div>
                        <p className="text-neutral-300 font-semibold text-sm truncate">{event.title}</p>
                        <p className="text-neutral-600 text-xs mt-0.5">
                          Host: <span className="text-neutral-500">{event.hostName ?? "Unknown"}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0 text-neutral-500 text-xs">
                        <div className="flex items-center gap-1">
                          <IconUsers size={13} />
                          <span>{event.currentPlayers}/{event.maxPlayers}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <IconTrophy size={13} className="text-yellow-600/70" />
                          <span>{event.totalLikes}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* ── Right column: Action card ── */}
          <div className="lg:col-span-1">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md sticky top-6 shadow-xl">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <IconStar size={28} className="text-yellow-400 fill-yellow-400" />
                  <span className="text-3xl font-bold text-white leading-none">{venue.averageRating}</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleLike}
                    className={`p-2 rounded-full transition-all active:scale-90 ${isLiked ? "bg-red-500/10 border border-red-500/20" : "bg-white/5 hover:bg-white/10 border border-white/10"}`}
                  >
                    <IconHeart size={24} className={`transition-colors ${isLiked ? "text-red-500 fill-red-500" : "text-neutral-400 hover:text-red-400"}`} />
                  </button>
                  <div className="text-right">
                    <div className="text-xl font-bold text-white">{venue.totalLikes}</div>
                    <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Likes</div>
                  </div>
                </div>
              </div>

              {/* Star rating input */}
              <div className="mb-6 pb-5 border-b border-white/5">
                <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-2">
                  {myRating ? t("Your Rating") : t("Rate this Space")}
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(star => {
                    const active = (hoverRating || myRating) >= star;
                    return (
                      <button
                        key={star}
                        onClick={() => handleRate(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-0.5 transition-transform hover:scale-110 active:scale-95"
                      >
                        <IconStar
                          size={24}
                          className={`transition-colors ${active ? "text-yellow-400 fill-yellow-400" : "text-neutral-600"}`}
                        />
                      </button>
                    );
                  })}
                  {myRating > 0 && (
                    <span className="text-xs text-neutral-500 ml-1.5">{myRating}/5</span>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => setIsBookingOpen(true)}
                  className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                  <IconPlus size={20} /> {t('Book Now')}
                </button>
                <button
                  onClick={openDirections}
                  className="w-full py-4 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-2xl border border-white/10 flex items-center justify-center gap-2 transition-all">
                  <IconNavigation size={20} /> {t('Google Maps')}
                </button>
                <button
                  onClick={handleSubscribe}
                  className={`w-full py-4 font-bold rounded-2xl border flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                    isSubscribed
                      ? "bg-sky-500/15 border-sky-500/30 text-sky-400 hover:bg-sky-500/20"
                      : "bg-neutral-800 hover:bg-neutral-700 text-white border-white/10"
                  }`}>
                  {isSubscribed ? <BellOff size={20} /> : <Bell size={20} />}
                  {isSubscribed ? t("Subscribed") : t("Subscribe")}
                </button>
              </div>

              {/* Quick stats — clickable to open drawer */}
              {(comingEvents.length > 0 || historyEvents.length > 0) && (
                <div className="mt-6 pt-6 border-t border-white/5 grid grid-cols-2 gap-3 text-center">
                  <button
                    onClick={() => setDrawer("upcoming")}
                    className="bg-white/5 hover:bg-white/10 rounded-xl p-3 cursor-pointer transition-colors group"
                  >
                    <div className="text-xl font-bold text-red-400 group-hover:text-red-300 transition-colors">
                      {comingEvents.length}
                    </div>
                    <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mt-0.5">Upcoming</div>
                  </button>
                  <button
                    onClick={() => setDrawer("past")}
                    className="bg-white/5 hover:bg-white/10 rounded-xl p-3 cursor-pointer transition-colors group"
                  >
                    <div className="text-xl font-bold text-neutral-300 group-hover:text-white transition-colors">
                      {historyEvents.length}
                    </div>
                    <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mt-0.5">Past Events</div>
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </AppLayout>
  );
}
