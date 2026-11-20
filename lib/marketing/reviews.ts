// Real Google reviews, quoted word for word from the screenshots in
// public/reviews/ (image10 to image18; image19 repeats image13). Testimonials
// must never be invented (PRODUCT.md): add one only from a real, checkable
// review. Names are first name plus last initial.

export interface GoogleReview {
  text: string;
  author: string;
  source: "Google";
}

/** Where customers read and leave Google reviews (also used by the booking emails). */
export const GOOGLE_REVIEW_URL = "https://g.page/r/CZw2a77VbVUUEBM/review";

export const GOOGLE_REVIEWS: GoogleReview[] = [
  {
    author: "Arsalan K.",
    text: "Amazing car wash experience! I literally pulled up and they got My Tahoe cleaned inside out in about 40 minutes for a great price! Very attentive to detail and I love how they have a Free Air for your tires! I love that there's a food truck there every evening who serves up some amazing authentic Indian food. Very well lit up in the evenings.",
    source: "Google",
  },
  {
    author: "Vilma C.",
    text: "Easily the best car wash I've went to! Armando was so friendly and explained everything in detail. His great service alone is a key factor in this becoming the ONLY car wash I'll be coming to in Houston!",
    source: "Google",
  },
  {
    author: "El guero T.",
    text: "It's a great place, always clean and nice and I like how it's kept and I go every week.",
    source: "Google",
  },
  {
    author: "Emi S.",
    text: "Self serve car wash. Clean, & well lit- felt safe while I was washing my car in the evening with my nieces. We had lots of fun especially with pink bubble gum foaming shampoo. There is even a food truck place right next door. Grabbed something to drink while washing car. Didn't use their free air- they need to put a label on how to use the free air though.",
    source: "Google",
  },
  {
    author: "Harley Q.",
    text: "This is a self-service car wash with a lot of options, and it seems to be frequently used. So I am comfortable going up there early in the morning knowing that there's just regular folks hanging out there cleaning up their cars and not someone sleeping.",
    source: "Google",
  },
  {
    author: "Uzair K.",
    text: "Great Car wash, great service and easy to use everything. Highly recommend if you're in the area and need a quick clean or detail. Also free air for your tires!!",
    source: "Google",
  },
  {
    author: "Edward A.",
    text: "Wow! I am thoroughly impressed with this car wash! Armando is awesome, he explained everything to me and my sister with great care and detail. Easiest five stars I've given, especially considering I've never had a 5 star experience at a car wash until today. I loved it here!",
    source: "Google",
  },
  {
    author: "Qassam J.",
    text: "This a great car wash! There are also foods trucks on site! What a great addition to the area! The new management is doing a good job!",
    source: "Google",
  },
  {
    author: "Kanzah N.",
    text: "excellent service! armando and veronica did a great job! my car was the cleanest it's ever been and the interior of my car smelled amazing. i highly recommend their work",
    source: "Google",
  },
];
