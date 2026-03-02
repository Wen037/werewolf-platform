import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateEventModal = ({ isOpen, onClose }: CreateEventModalProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="bg-neutral-900/90 border border-white/10 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden pointer-events-auto flex flex-col max-h-[90vh]">
              
              <div className="flex justify-between items-center p-5 border-b border-white/5">
                <h2 className="text-xl font-bold text-white">Host an Event</h2>
                <button onClick={onClose} className="text-neutral-400 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-5">
                <div>
                  <label className="text-sm font-bold text-neutral-300">Event Title</label>
                  <input className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white mt-2 focus:outline-none focus:border-red-500" placeholder="e.g. Friday Night Bloodbath" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                   <div>
                      <label className="text-sm font-bold text-neutral-300">Date & Time</label>
                      {/* [color-scheme:dark] forces the calendar popup to be dark themed */}
                      <input 
                        type="datetime-local" 
                        className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white mt-2 focus:outline-none focus:border-red-500 [color-scheme:dark]" 
                      />
                   </div>
                   <div>
                      <label className="text-sm font-bold text-neutral-300">Max Players</label>
                      <input type="number" min="5" max="20" className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white mt-2 focus:outline-none focus:border-red-500" placeholder="12" />
                   </div>
                </div>
                
                <div>
                  <label className="text-sm font-bold text-neutral-300">Select Venue</label>
                  <select className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white mt-2 focus:outline-none focus:border-red-500 appearance-none">
                      <option value="" className="bg-neutral-900">Choose a venue...</option>
                      <option value="v1" className="bg-neutral-900">The Mind Café (Orchard)</option>
                      <option value="v5" className="bg-neutral-900">King and the Pawn (City Hall)</option>
                  </select>
                </div>

                <button className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all mt-4">
                  Create Event
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};