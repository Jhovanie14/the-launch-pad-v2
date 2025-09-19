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
  
  export const servicePackages: ServicePackage[] = [
    {
      id: 'self-service',
      name: 'Self-Service',
      description: 'Do-it-yourself car wash with our premium equipment',
      price: 15,
      duration: 30,
      features: [
        'High-pressure wash bays',
        'Foam brush stations',
        'Vacuum stations',
        'Tire shine application',
        'Window cleaning supplies'
      ],
      category: 'self-service'
    },
    {
      id: 'basic-wash',
      name: 'Basic Car Wash',
      description: 'Professional exterior wash with basic interior cleaning',
      price: 30,
      duration: 45,
      features: [
        'Exterior wash and rinse',
        'Tire and wheel cleaning',
        'Basic interior vacuum',
        'Window cleaning',
        'Tire dressing'
      ],
      category: 'basic'
    },
    {
      id: 'deluxe-wash',
      name: 'Deluxe Wash',
      description: 'Premium exterior and interior detailing service',
      price: 55,
      duration: 90,
      features: [
        'Complete exterior wash',
        'Wax application',
        'Full interior detailing',
        'Leather conditioning',
        'Dashboard protection',
        'Tire shine and wheel cleaning'
      ],
      category: 'deluxe'
    },
    {
      id: 'express-interior',
      name: 'Express Interior',
      description: 'Quick interior cleaning and protection service',
      price: 40,
      duration: 30,
      features: [
        'Interior vacuum and cleaning',
        'Dashboard and console wipe',
        'Window cleaning',
        'Seat conditioning',
        'Air freshener application'
      ],
      category: 'express'
    },
    {
      id: 'express-exterior',
      name: 'Express Exterior',
      description: 'Quick exterior wash and protection service',
      price: 40,
      duration: 25,
      features: [
        'Exterior wash and rinse',
        'Tire and wheel cleaning',
        'Quick wax application',
        'Window cleaning',
        'Tire shine'
      ],
      category: 'express'
    }
  ];
  
  export const addOns: AddOn[] = [
    {
      id: 'ceramic-coating',
      name: 'Ceramic Coating',
      description: 'Premium paint protection that lasts 6+ months',
      price: 25,
      duration: 15,
      category: 'protection',
      compatibleWith: ['basic-wash', 'deluxe-wash', 'express-exterior']
    },
    {
      id: 'leather-treatment',
      name: 'Leather Treatment',
      description: 'Deep conditioning and protection for leather seats',
      price: 15,
      duration: 10,
      category: 'interior',
      compatibleWith: ['basic-wash', 'deluxe-wash', 'express-interior']
    },
    {
      id: 'engine-cleaning',
      name: 'Engine Bay Cleaning',
      description: 'Safe cleaning and protection of engine compartment',
      price: 20,
      duration: 20,
      category: 'exterior',
      compatibleWith: ['deluxe-wash']
    },
    {
      id: 'headlight-restoration',
      name: 'Headlight Restoration',
      description: 'Restore cloudy headlights to like-new condition',
      price: 30,
      duration: 25,
      category: 'exterior',
      compatibleWith: ['deluxe-wash']
    },
    {
      id: 'interior-protection',
      name: 'Interior Protection',
      description: 'Fabric and carpet protection treatment',
      price: 18,
      duration: 12,
      category: 'protection',
      compatibleWith: ['basic-wash', 'deluxe-wash', 'express-interior']
    },
    {
      id: 'premium-wax',
      name: 'Premium Wax',
      description: 'High-grade carnauba wax for superior shine',
      price: 12,
      duration: 8,
      category: 'exterior',
      compatibleWith: ['basic-wash', 'deluxe-wash', 'express-exterior']
    }
  ];
  