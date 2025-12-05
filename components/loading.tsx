// components/loading.tsx
"use client";

import { motion } from "framer-motion";
import Image from "next/image";

export default function LoadingDots() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white">
      <motion.div
        className="relative"
        animate={{
          y: [0, -30, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          repeat: Infinity,
          duration: 1.5,
          ease: "easeInOut",
        }}
      >
        <motion.div
          animate={{
            rotate: [0, 5, -5, 0],
          }}
          transition={{
            repeat: Infinity,
            duration: 2,
            ease: "easeInOut",
          }}
        >
          <Image
            src="/thelaunchpad.png"
            alt="The LaunchPad Carwash Logo"
            width={200}
            height={200}
            className="object-contain"
            priority
          />
        </motion.div>
        {/* Rocket trail effect */}
        <motion.div
          className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-16 h-8"
          animate={{
            opacity: [0.3, 0.7, 0.3],
            scaleY: [0.8, 1.2, 0.8],
          }}
          transition={{
            repeat: Infinity,
            duration: 1.5,
            ease: "easeInOut",
          }}
        >
          <div className="w-full h-full bg-linear-to-t from-yellow-400 via-orange-500 to-transparent rounded-full blur-sm" />
        </motion.div>
      </motion.div>
    </div>
  );
}
