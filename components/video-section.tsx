"use client";

import { Play } from "lucide-react";
import { useState } from "react";

export function VideoSection() {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <section className="py-20 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-balance text-blue-900">
            See Our Process in Action
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto text-pretty leading-relaxed">
            Watch how our expert team transforms your vehicle from dirty to
            dazzling in minutes.
          </p>
        </div>

        <div className="relative aspect-video rounded-2xl overflow-hidden shadow-2xl max-w-4xl mx-auto">
          {!isPlaying ? (
            <div className="relative w-full h-full bg-gradient-to-br from-blue-800 to-blue-950">
              <video
                autoPlay
                loop
                muted
                playsInline
                className="rounded-2xl shadow-lg w-full"
              >
                <source src="/how-it-work.mp4" type="video/mp4" />
              </video>
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <button
                  onClick={() => setIsPlaying(true)}
                  className="bg-white text-blue-900 w-20 h-20 rounded-full flex items-center justify-center hover:scale-110 transition-transform duration-300 shadow-xl"
                  aria-label="Play video"
                >
                  <Play className="w-10 h-10 ml-1" fill="currentColor" />
                </button>
              </div>
            </div>
          ) : (
            <video
              className="w-full h-full"
              controls
              autoPlay
              src="/how-it-work.mp4"
            >
              <source src="/how-it-work.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          )}
        </div>

        <div className="mt-12 grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="text-center">
            <div className="text-4xl font-bold mb-2">15min</div>
            <div className="text-blue-800">Average Service Time</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold mb-2">100%</div>
            <div className="text-blue-800">Eco-Friendly Products</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold mb-2">10k+</div>
            <div className="text-blue-800">Happy Customers</div>
          </div>
        </div>
      </div>
    </section>
  );
}
