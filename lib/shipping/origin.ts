// Where parcels ship from, as a Shippo address.
// The owner confirmed 3535 O'Meara Dr, Houston, TX 77025 (2026-11-27); USPS
// validates it as "3535 Omeara Dr", a business address. Armando drops parcels
// off at USPS, so no carrier pickup is scheduled.
export const SHIP_FROM = {
  name: "The Launch Pad",
  company: "The Launch Pad",
  street1: "3535 Omeara Dr",
  city: "Houston",
  state: "TX",
  zip: "77025",
  country: "US",
  phone: "8322198320",
} as const;
