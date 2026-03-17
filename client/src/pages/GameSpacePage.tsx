import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { GameService } from "../services/game.service";
import type { GameVenue } from "../types";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Star, Heart, Search, Plus, CheckCircle } from "lucide-react";
import { IconAlertTriangle } from "@tabler/icons-react";
import { AppLayout } from "../components/layout/AppLayout";
import { CreateSpaceModal } from "../components/CreateSpaceModal";
import { ReportModal } from "../components/ReportModal";

export default function GameSpacePage() {
  const [venues, setVenues] = useState<GameVenue[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [reportData, setReportData] = useState<{ isOpen: boolean; name: string } | null>(null);
  const [showToast, setShowToast] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    GameService.getAllVenues().then(setVenues);
  }, []);

  const triggerToast = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  return (
    <AppLayout>
      <div className="h-full w-full overflow-y-auto p-6 md:p-10 relative custom-scrollbar">
        
        {/* Toast Notification */}
        <AnimatePresence>
          {showToast && (
            <motion.div 
              initial={{ opacity: 0, y: 50, x: "-50%" }}
              animate={{ opacity: 1, y: 0, x: "-50%" }}
              exit={{ opacity: 0, y: 20, x: "-50%" }}
              className="fixed bottom-10 left-1/2 z-[200] flex items-center gap-2 px-6 py-3 bg-neutral-900 border border-green-500/30 rounded-full shadow-2xl backdrop-blur-md"
            >
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-white font-bold text-sm tracking-wide">Submitted</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Report Modal */}
        {reportData && (
          <ReportModal 
            isOpen={reportData.isOpen} 
            onClose={() => setReportData(null)} 
            onSuccess={triggerToast}
            targetType="Space"
            targetName={reportData.name}
          />
        )}

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Game Venues</h1>
            <p className="text-neutral-400">Discover the best places to hunt in Singapore.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3">
            {/* Search Bar */}
            <div className="relative group w-full md:w-64">
               <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={16} className="text-neutral-500 group-focus-within:text-white transition-colors"/>
               </div>
               <input 
                 type="text" 
                 placeholder="Search places..." 
                 className="w-full bg-neutral-900/50 border border-neutral-700 text-white rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:border-neutral-500 focus:bg-neutral-800 transition-all"
               />
            </div>
            
            {/* Create Space Button */}
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg active:scale-95 whitespace-nowrap"
            >
              <Plus size={18} /> Add Venue
            </button>
          </div>
        </div>

        {/* Venues Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
          {venues.map((venue, index) => (
            <motion.div
              key={venue.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -5 }}
              className="bg-neutral-900/40 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden cursor-pointer group hover:border-white/30 transition-all shadow-lg hover:shadow-xl relative"
            >
              {/* Image */}
              <div className="h-48 overflow-hidden relative" onClick={() => navigate(`/gamespace/${venue.id}`)}>
                <img 
                  src={venue.imageUrl} 
                  alt={venue.name} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1">
                  <Star size={12} className="text-yellow-400 fill-yellow-400"/>
                  <span className="text-xs font-bold text-white">{venue.averageRating}</span>
                </div>
              </div>

              {/* Content */}
              <div className="p-5">
                <div className="flex justify-between items-start mb-2">
                  <h3 
                    onClick={() => navigate(`/gamespace/${venue.id}`)}
                    className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors"
                  >
                    {venue.name}
                  </h3>
                  
                  {/* Report Venue Icon Button */}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setReportData({ isOpen: true, name: venue.name });
                    }}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 text-neutral-500 hover:text-red-500 transition-all"
                    title="Report Space"
                  >
                    <IconAlertTriangle size={14} />
                  </button>
                </div>
                
                <p className="text-neutral-500 text-sm mb-4 flex items-center gap-1 truncate">
                  <MapPin size={14} /> {venue.address}
                </p>

                <div className="flex gap-2 mb-4">
                  {venue.amenities.slice(0, 3).map(am => (
                    <span key={am} className="text-[10px] bg-white/5 border border-white/10 text-neutral-300 px-2 py-1 rounded">
                      {am}
                    </span>
                  ))}
                  {venue.amenities.length > 3 && <span className="text-[10px] text-neutral-500 py-1">+{venue.amenities.length - 3}</span>}
                </div>

                {/* Footer: Likes */}
                <div className="border-t border-white/5 pt-4 mt-2">
                   <div className="flex items-center gap-1.5 text-xs text-neutral-400 group-hover:text-neutral-200 transition-colors">
                      <Heart size={14} className="text-red-500/50 group-hover:text-red-500 group-hover:fill-red-500 transition-all"/>
                      {venue.totalLikes || 0} Likes
                   </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Create Space Modal */}
        <CreateSpaceModal 
          isOpen={isCreateModalOpen} 
          onClose={() => setIsCreateModalOpen(false)} 
        />
      </div>
    </AppLayout>
  );
}