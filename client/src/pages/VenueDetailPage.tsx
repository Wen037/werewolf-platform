import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { GameService } from "../services/game.service";
import type { GameVenue } from "../types";
import { AppLayout } from "../components/layout/AppLayout";
import { ReportModal } from "../components/ReportModal";
import { CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  IconArrowLeft, 
  IconMapPin, 
  IconStar, 
  IconShare, 
  IconHeart, 
  IconCircleCheck, 
  IconNavigation,
  IconAlertTriangle,
  IconPlus
} from "@tabler/icons-react";

export default function VenueDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [venue, setVenue] = useState<GameVenue | null>(null);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (id) {
      GameService.getVenueById(id).then(data => setVenue(data || null));
    }
  }, [id]);

  const triggerToast = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
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

  return (
    <AppLayout>
      <div className="h-full w-full overflow-y-auto p-6 md:p-10 custom-scrollbar relative">
        
        {/* Toast Notification - Updated to Middle Top Left */}
        <AnimatePresence>
          {showToast && (
            <motion.div 
              initial={{ opacity: 0, x: -20, y: 0 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, x: -10, y: 0 }}
              className="fixed top-24 left-10 z-[200] flex items-center gap-2 px-6 py-3 bg-neutral-900 border border-green-500/30 rounded-full shadow-2xl backdrop-blur-md"
            >
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-white font-bold text-sm tracking-wide">Submitted</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Report Modal */}
        <ReportModal 
          isOpen={isReportOpen} 
          onClose={() => setIsReportOpen(false)} 
          onSuccess={triggerToast}
          targetType="Space"
          targetName={venue.name}
        />

        {/* Navigation & Header Actions */}
        <div className="flex items-center justify-between mb-6">
          <button 
            onClick={() => navigate(-1)} 
            className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors group"
          >
            <IconArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" /> 
            <span className="font-medium">Back to Directory</span>
          </button>

          <button 
            onClick={() => setIsReportOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all text-sm font-bold"
          >
            <IconAlertTriangle size={16} />
            <span>Report Space</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20">
          
          {/* Left Column: Image & Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="w-full h-64 md:h-96 rounded-3xl overflow-hidden relative shadow-2xl border border-white/5">
              <img src={venue.imageUrl} alt={venue.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
              
              <div className="absolute bottom-6 left-6 md:left-10">
                <h1 className="text-3xl md:text-5xl font-bold text-white mb-2">{venue.name}</h1>
                <p className="text-neutral-300 flex items-center gap-2 text-lg">
                  <IconMapPin size={20} className="text-red-500" /> {venue.address}
                </p>
              </div>
            </div>

            <div className="bg-neutral-900/40 border border-white/10 rounded-2xl p-6 md:p-8 backdrop-blur-sm">
              <h2 className="text-xl font-bold text-white mb-4">About this Place</h2>
              <p className="text-neutral-400 leading-relaxed mb-8">
                {venue.description || "A mysterious gathering place for werewolves and villagers alike."}
              </p>
              
              <h3 className="text-lg font-bold text-white mb-4">Amenities</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {venue.amenities.map(am => (
                  <div key={am} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 text-neutral-300">
                    <IconCircleCheck size={18} className="text-green-500 flex-shrink-0" /> 
                    <span className="text-sm">{am}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Action Card */}
          <div className="lg:col-span-1">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md sticky top-6 shadow-xl">
              <div className="flex justify-between items-center mb-8">
                 <div className="flex items-center gap-2">
                    <IconStar size={28} className="text-yellow-400 fill-yellow-400"/>
                    <div className="flex flex-col">
                      <span className="text-3xl font-bold text-white leading-none">{venue.averageRating}</span>
                    </div>
                 </div>
                 <div className="text-right">
                    <div className="text-xl font-bold text-white">{venue.totalLikes || 0}</div>
                    <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Likes</div>
                 </div>
              </div>

              <div className="space-y-3 mb-8">
                <button className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                  <IconPlus size={20} /> Book Now
                </button>
                <button className="w-full py-4 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-2xl border border-white/10 flex items-center justify-center gap-2 transition-all">
                  <IconNavigation size={20} /> Directions
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}