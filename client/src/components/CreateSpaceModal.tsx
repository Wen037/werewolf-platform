import { motion, AnimatePresence } from "framer-motion";
import { X, UploadCloud } from "lucide-react";
import { useState } from "react";

interface CreateSpaceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateSpaceModal = ({ isOpen, onClose }: CreateSpaceModalProps) => {
  const [fileName, setFileName] = useState<string>("");

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
            <div className="bg-neutral-900/90 border border-white/10 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden pointer-events-auto flex flex-col max-h-[90vh]">
              
              {/* Header */}
              <div className="flex justify-between items-center p-5 border-b border-white/5">
                <h2 className="text-xl font-bold text-white">List Your Space</h2>
                <button onClick={onClose} className="text-neutral-400 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>

              {/* Form Content */}
              <div className="p-6 overflow-y-auto space-y-5">
                <div>
                  <label className="text-sm font-bold text-neutral-300">Venue Name</label>
                  <input className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white mt-2 focus:outline-none focus:border-blue-500" placeholder="Enter venue name..." />
                </div>
                <div>
                  <label className="text-sm font-bold text-neutral-300">Full Address</label>
                  <input className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white mt-2 focus:outline-none focus:border-blue-500" placeholder="e.g. 60A Prinsep Street" />
                </div>
                
                {/* Upload Image Section */}
                <div>
                  <label className="text-sm font-bold text-neutral-300 mb-2 block">Venue Image</label>
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/20 hover:border-blue-500 hover:bg-white/5 transition-all rounded-xl cursor-pointer bg-black/30">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <UploadCloud className="text-neutral-400 mb-2" size={28} />
                      <p className="text-sm text-neutral-400">
                        <span className="font-semibold text-blue-400">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-neutral-500 mt-1">{fileName || "PNG, JPG up to 5MB"}</p>
                    </div>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*"
                      onChange={(e) => e.target.files && setFileName(e.target.files[0].name)}
                    />
                  </label>
                </div>

                <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all mt-4">
                  Submit for Verification
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};