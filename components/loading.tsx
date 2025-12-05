// components/loading.tsx
"use client";
import { motion } from "framer-motion";

export default function LoadingDots() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white">
      {[0, 1, 2, 3].map((i) => (
        <motion.span
          key={i}
          className="w-3 h-3 bg-primary rounded-full mx-1"
          animate={{ y: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.2 }}
        />
      ))}
    </div>
  );
}
