import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp } from "lucide-react";

export default function ScrollTopButton({ show }) {
  return (
    <AnimatePresence>
      {show && (
        <div className="fixed w-full bottom-8 left-0 z-50 flex justify-center pointer-events-none">
          <motion.button
            key="scroll-top"
            initial={{ y: 80, opacity: 0, scale: 0.85 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 80, opacity: 0, scale: 0.85 }}
            transition={{ type: "spring", stiffness: 270, damping: 22 }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="bg-neutral-900/95 hover:bg-neutral-800 text-white shadow-xl rounded-full w-12 h-12 flex items-center justify-center border border-transparent active:scale-95 transition-all pointer-events-auto"
            aria-label="Back to top"
            title="Back to top"
          >
            <ArrowUp size={28} />
          </motion.button>
        </div>
      )}
    </AnimatePresence>
  );
}
