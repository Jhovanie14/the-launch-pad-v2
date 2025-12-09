// components/loading.tsx
"use client";

import { motion } from "framer-motion";
import Image from "next/image";

export default function LoadingDots() {
  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-white">
      {/* ============================================
          ORIGINAL LOADING ANIMATION (COMMENTED OUT)
          ============================================ */}
      {/* <motion.div
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
      </motion.div> */}
      {/* ============================================ */}

      {/* Rocket flying up after loading ends - starts at center */}

      <motion.div
        className="relative"
        initial={{
          y: 0,
          opacity: 1,
          scale: 1,
        }}
        animate={{
          y: typeof window !== "undefined" ? -window.innerHeight - 300 : -1000,
          opacity: [1, 1, 0],
          scale: [1, 1.1, 0.8],
        }}
        transition={{
          delay: 1.5, // Wait 1 second at center before launching
          duration: 5,
          ease: "easeOut",
        }}
      >
        {/* Rocket logo */}
        <motion.div
          animate={{
            rotate: [0, -5, 5, 0],
          }}
          transition={{
            delay: 1, // Start rotation when rocket launches
            duration: 2,
            ease: "easeInOut",
          }}
        >
          <Image
            src="/xmas-launchpad-logo.png"
            alt="The LaunchPad Carwash Logo"
            width={200}
            height={200}
            className="object-contain"
            priority
            unoptimized
          />
        </motion.div>

        {/* Rocket trail effect - grows as rocket flies up */}
        <motion.div
          className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-20 h-12"
          initial={{ opacity: 0 }}
          animate={{
            opacity: [0, 0.5, 1, 0.8, 0],
            scaleY: [0.5, 1, 2.5, 3, 2],
            scaleX: [0.8, 1, 1.3, 1.5, 1.2],
          }}
          transition={{
            delay: 1.5, // Start trail when rocket launches
            duration: 5,
            ease: "easeOut",
          }}
        >
          <div className="w-full h-full bg-linear-to-t from-yellow-400 via-orange-500 to-red-500 rounded-full blur-md" />
        </motion.div>
      </motion.div>
    </div>
  );
}
