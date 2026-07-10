// components/loading.tsx
"use client";

import { motion } from "framer-motion";
import Image from "next/image";

export default function LoadingDots() {
  return (
    <div className="fixed inset-0 z-100 flex flex-col items-center justify-center gap-8 bg-white">
      {/* Rocket hovers on a continuous loop so the screen never goes blank,
          however long the load takes. No window/DOM access, so it is fully
          deterministic between server and client (hydration-safe). */}
      <motion.div
        className="relative"
        animate={{ y: [0, -18, 0] }}
        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
      >
        <motion.div
          animate={{ rotate: [0, -3, 3, 0] }}
          transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
        >
          <Image
            src="/thelaunchpad.png"
            alt="The LaunchPad Carwash Logo"
            width={200}
            height={200}
            className="object-contain"
            priority
            unoptimized
          />
        </motion.div>

        {/* Pulsing exhaust plume */}
        <motion.div
          className="absolute -bottom-2 left-1/2 h-10 w-14 -translate-x-1/2"
          animate={{
            opacity: [0.35, 0.9, 0.35],
            scaleY: [0.8, 1.4, 0.8],
            scaleX: [0.9, 1.1, 0.9],
          }}
          transition={{ repeat: Infinity, duration: 1.1, ease: "easeInOut" }}
        >
          <div className="h-full w-full rounded-full bg-linear-to-t from-yellow-400 via-orange-500 to-transparent blur-md" />
        </motion.div>
      </motion.div>

      {/* Persistent dots — an unmistakable "still working" signal that stays put
          no matter how long the load runs. */}
      <div className="flex items-center gap-2" role="status" aria-label="Loading">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="block h-2.5 w-2.5 rounded-full bg-blue-900"
            animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
            transition={{
              repeat: Infinity,
              duration: 0.9,
              ease: "easeInOut",
              delay: i * 0.15,
            }}
          />
        ))}
        <span className="sr-only">Loading…</span>
      </div>
    </div>
  );
}
