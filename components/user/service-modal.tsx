"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

interface Service {
  id: number;
  title: string;
  description: string;
  image: string;
  images?: string[];
  alt: string;
  features: string[];
  fullDescription: string;
  details: string[];
}

interface ServiceModalProps {
  service: Service;
  onClose: () => void;
}

export default function ServiceModal({ service, onClose }: ServiceModalProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const images = service.images || [service.image];

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-card rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto pointer-events-auto animate-in fade-in zoom-in-95 duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with Close Button */}
          <div className="bg-card border-b border-border p-6 flex items-center justify-between">
            <h2 className="text-3xl font-bold text-foreground">
              {service.title}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
              aria-label="Close modal"
            >
              <X className="w-6 h-6 text-muted-foreground" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Service Image */}
            <div className="relative w-full rounded-xl overflow-hidden bg-secondary/50">
              {/* Image Container */}
              <div className="relative w-full h-64">
                <Image
                  src={images[currentImageIndex] || ""}
                  alt={`${service.alt} - Image ${currentImageIndex + 1}`}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="object-cover transition-opacity duration-300"
                />
              </div>

              {/* Navigation Buttons */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={handlePrevImage}
                    className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleNextImage}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                    aria-label="Next image"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>

                  {/* Dot Indicators */}
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
                    {images.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`w-2 h-2 rounded-full transition-all ${
                          index === currentImageIndex
                            ? "bg-white w-6"
                            : "bg-white/50 hover:bg-white/75"
                        }`}
                        aria-label={`Go to image ${index + 1}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Description */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Overview
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {service.fullDescription}
              </p>
            </div>

            {/* Features Grid */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Key Features
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {service?.features?.map((feature, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 p-3 bg-secondary/50 rounded-lg"
                  >
                    <div className="w-2 h-2 bg-primary rounded-full" />
                    <span className="text-sm text-foreground">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Detailed List */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4">
                What's Included
              </h3>
              <ul className="space-y-3">
                {service?.details?.map((detail, i) => (
                  <li key={i} className="flex gap-3 text-muted-foreground">
                    <span className="text-primary font-bold flex-shrink-0">
                      ✓
                    </span>
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA Buttons */}
            <div className="flex gap-3 pt-4 border-t border-border">
              <Button
                onClick={onClose}
                variant="outline"
                className="flex-1 bg-transparent"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
