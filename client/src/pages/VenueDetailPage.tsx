import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { GameService } from "../services/game.service";
import type { GameVenue } from "../types";
import { AppLayout } from "../components/layout/AppLayout";
import { ArrowLeft, MapPin, Star, Share2, Heart, CheckCircle2, Navigation } from "lucide-react";

export default function VenueDetailPage() {
  const { id } = useParams(); // 获取 URL 参数
  const navigate = useNavigate();
  const [venue, setVenue] = useState<GameVenue | null>(null);

  useEffect(() => {
    if (id) {
      GameService.getVenueById(id).then(data => setVenue(data || null));
    }
  }, [id]);

  if (!venue) return <AppLayout><div className="p-10 text-white">Loading...</div></AppLayout>;

  return (
    <AppLayout>
      <div className="h-full w-full overflow-y-auto p-6 md:p-10">
        
        {/* Back Button */}
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-2 text-neutral-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft size={20} /> Back to Directory
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20">
          
          {/* Left Column: Image & Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="w-full h-64 md:h-96 rounded-3xl overflow-hidden relative shadow-2xl">
              <img src={venue.imageUrl} alt={venue.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
              
              <div className="absolute bottom-6 left-6 md:left-10">
                <h1 className="text-3xl md:text-5xl font-bold text-white mb-2">{venue.name}</h1>
                <p className="text-neutral-300 flex items-center gap-2 text-lg">
                  <MapPin size={20} className="text-red-500" /> {venue.address}
                </p>
              </div>
            </div>

            <div className="bg-neutral-900/40 border border-white/10 rounded-2xl p-6 md:p-8 backdrop-blur-sm">
              <h2 className="text-xl font-bold text-white mb-4">About this Place</h2>
              <p className="text-neutral-400 leading-relaxed mb-6">
                {venue.description || "A mysterious gathering place for werewolves and villagers alike. Excellent atmosphere and private rooms available for high-stakes games."}
              </p>
              
              <h3 className="text-lg font-bold text-white mb-3">Amenities</h3>
              <div className="grid grid-cols-2 gap-4">
                {venue.amenities.map(am => (
                  <div key={am} className="flex items-center gap-2 text-neutral-300">
                    <CheckCircle2 size={16} className="text-green-500" /> {am}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Action Card */}
          <div className="lg:col-span-1">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md sticky top-6">
              <div className="flex justify-between items-center mb-6">
                 <div className="flex items-center gap-2">
                    <Star size={24} className="text-yellow-400 fill-yellow-400"/>
                    {/* --- FIX 1: rating -> averageRating --- */}
                    <span className="text-3xl font-bold text-white">{venue.averageRating}</span>
                    <span className="text-sm text-neutral-500">/ 5.0</span>
                 </div>
                 {/* --- FIX 2: likes -> totalLikes --- */}
                 <div className="text-sm text-neutral-400">{venue.totalLikes || 0} Likes</div>
              </div>

              <div className="space-y-3 mb-6">
                <button className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95">
                  Book Now
                </button>
                <button className="w-full py-3 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl border border-white/10 flex items-center justify-center gap-2 transition-all">
                  <Navigation size={18} /> Get Directions
                </button>
              </div>

              <div className="flex gap-2">
                <button className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 text-sm flex items-center justify-center gap-1 transition-colors">
                  <Heart size={16} /> Save
                </button>
                <button className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 text-sm flex items-center justify-center gap-1 transition-colors">
                  <Share2 size={16} /> Share
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </AppLayout>
  );
}