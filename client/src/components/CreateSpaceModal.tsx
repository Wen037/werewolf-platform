import { motion, AnimatePresence } from "framer-motion";
import { X, UploadCloud } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface CreateSpaceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateSpaceModal = ({ isOpen, onClose }: CreateSpaceModalProps) => {
  const [fileName, setFileName] = useState<string>("");
  const [isSubmitForVerification, setIsSubmitForVerification] = useState<boolean>(false);
  
  // Mocking user profile data for the default contact info
  const [contactInfo, setContactInfo] = useState<string>("Becky.fuwen@gmail.com");

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
                  <h2 className="text-2xl font-bold text-white">List Your Space</h2>
                  <p className="text-sm text-neutral-400 mt-1">Add a new venue for Werewolf games</p>
                </div>
                <button onClick={onClose} className="text-neutral-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-2 rounded-full">
                  <X size={20} />
                </button>
              </div>

              {/* Form Content - Removed golden-scrollbar, added scrollRef */}
              <div ref={scrollRef} className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                <div>
                  <label className="text-sm font-semibold text-neutral-300 mb-2 block">Venue Name</label>
                  <input className="w-full bg-black/50 border border-white/10 rounded-xl p-3.5 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-neutral-600" placeholder="Enter venue name..." />
                </div>
                <div>
                  <label className="text-sm font-semibold text-neutral-300 mb-2 block">Full Address</label>
                  <input className="w-full bg-black/50 border border-white/10 rounded-xl p-3.5 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-neutral-600" placeholder="e.g. 60A Prinsep Street" />
                </div>
                
                {/* Upload Image Section */}
                <div>
                  <label className="text-sm font-semibold text-neutral-300 mb-2 block">Venue Image</label>
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/20 hover:border-blue-500/50 hover:bg-white/5 transition-all rounded-xl cursor-pointer bg-black/30">
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

                {/* Contact for Verification Field */}
                <AnimatePresence>
                  {isSubmitForVerification && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-2 pb-2">
                        <label className="text-sm font-semibold text-neutral-300 mb-2 block">Contact for Verification</label>
                        <input 
                          type="text"
                          value={contactInfo}
                          onChange={(e) => setContactInfo(e.target.value)}
                          className="w-full bg-black/50 border border-white/10 rounded-xl p-3.5 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-neutral-600" 
                          placeholder="Phone number or email" 
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer Controls - moved outside the scrolling area to ensure it's always visible */}
              <div className="p-6 border-t border-white/5 bg-neutral-900/50 flex-shrink-0">
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
                          Submit for verification
                        </label>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={onClose} className="px-6 py-2.5 rounded-xl font-medium text-white hover:bg-white/5 transition-colors hidden sm:block">
                      Cancel
                    </button>
                    <button className="bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 px-8 rounded-xl shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:shadow-[0_0_20px_rgba(37,99,235,0.5)] transition-all">
                      Submit
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