// Where parcels ship from, as a Shippo address.
// TODO(owner): confirm the ship-from address. The owner said 3535 O'Meara Dr,
// Houston, TX; we still need the ZIP, any suite, and the phone for labels.
// Until then this is the carwash, which only matters with the test key.
export const SHIP_FROM = {
  name: "The Launch Pad",
  company: "The Launch Pad",
  street1: "10410 S Main St",
  city: "Houston",
  state: "TX",
  zip: "77025",
  country: "US",
  phone: "8322198320",
} as const;
