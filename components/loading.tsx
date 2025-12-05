// components/loading.tsx
"use client";
import { motion } from "framer-motion";
import Image from "next/image";

export default function LoadingDots() {
  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-white">
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
        <motion.div
          className="relative"
          initial={{ y: 0, opacity: 1 }}
          animate={{
            y: [0, -300, -600],
            opacity: [1, 1, 0],
            scale: [1, 1.1, 1.2],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: [0.4, 0, 0.2, 1],
            repeatDelay: 0.5,
          }}
        >
          <Image
            src="/thelaunchpad.png"
            alt="The LaunchPad Carwash Logo"
            width={250}
            height={250}
            className="object-contain"
            priority
          />
        </motion.div>
      </div>
    </div>
  );
}
