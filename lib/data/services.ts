export interface ServicePackage {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number; // in minutes
  features: string[];
  category: 'self-service' | 'basic' | 'deluxe' | 'express';
}

export interface AddOn {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number; // in minutes
  category: 'interior' | 'exterior' | 'protection' | 'premium';
  compatibleWith: string[]; // service package IDs this add-on works with
}
