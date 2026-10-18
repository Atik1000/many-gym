// Option lists from the "Gym Profile" spec. Amenities are reused by Membership Plans (Step 4).
export const GYM_TYPES = [
  { value: "general", label: "General Fitness Gym", info: "A mix of weights, machines, and cardio equipment" },
  { value: "strength", label: "Strength & Bodybuilding Gym", info: "Muscle building and strength training" },
  { value: "functional", label: "Functional Fitness Gym", info: "Functional workouts, circuit training, and conditioning" },
  { value: "pt", label: "Personal Training Studio", info: "Primarily individual or small-group coaching" },
  { value: "boutique", label: "Boutique Fitness Studio", info: "Specialized instructor-led fitness classes" },
  { value: "martial", label: "Boxing & Martial Arts Gym", info: "Boxing, kickboxing, MMA, and other martial arts" },
  { value: "yoga", label: "Yoga & Pilates Studio", info: "Yoga, Pilates, and related movement classes" },
  { value: "cycling", label: "Indoor Cycling Studio", info: "Spin and indoor cycling classes" },
  { value: "performance", label: "Sports Performance Centre", info: "Athletic training, speed, agility, and conditioning" },
  { value: "other", label: "Other", info: "A type outside the available options" },
] as const;

export const GENDER_REQUIRED = [
  { value: "everyone", label: "Everyone" },
  { value: "women", label: "Women only" },
  { value: "men", label: "Men only" },
] as const;

export const GALLERY_CATEGORIES = [
  "General", "Equipment", "Workout Areas", "Studios & Class Spaces", "Changing Rooms & Showers",
  "Wellness Facilities — sauna, steam room, pool", "Reception & Lounge", "Interior & Decor", "Exterior & Entrance", "Other",
];

export const AMENITY_GROUPS: { group: string; items: string[] }[] = [
  { group: "Changing & Storage", items: ["Changing rooms", "Showers", "Day-use lockers", "Personal lockers", "Towel service"] },
  { group: "Wellness & Recovery", items: ["Sauna", "Steam room", "Swimming pool", "Hot tub", "Massage room"] },
  { group: "Comfort & Convenience", items: ["Air conditioning", "Wi-Fi", "Drinking water station", "Seating area"] },
  { group: "Food & Drink", items: ["Cafe", "Smoothie / protein bar", "Vending machines"] },
  { group: "Parking & Transport", items: ["Parking", "Bicycle parking"] },
  { group: "Accessibility", items: ["Step-free entrance", "Lift access", "Accessible toilet", "Accessible changing room"] },
  { group: "Family Facilities", items: ["Childcare", "Children's waiting area"] },
];

export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

// ---- the gym's profile as stored by the API (a single record, not a list) ----
export type DayHours = { open: boolean; start: string; end: string };
export type GalleryItem = { id: string; url: string; kind: "image" | "video"; category: string; caption: string };
export type GymProfile = {
  id: "gym";
  tagline: string;
  website: string;
  overview: { name: string; description: string; primaryType: string; secondaryType: string; gender: string; minAge: string; profileUrl: string; coverUrl: string };
  location: { address: string; city: string; postcode: string; country: string; pin: { x: number; y: number } };
  hours: Record<string, DayHours>;
  amenities: { free: string[]; paid: string[] };
  gallery: GalleryItem[];
};

/** Is the gym open now, and until/from when? Used by the Studio "Open today" line. */
export function openStatus(hours: GymProfile["hours"], now = new Date()): { open: boolean; text: string } {
  const day = DAYS[(now.getDay() + 6) % 7];
  const h = hours[day];
  const fmt = (t: string) => { const [hh, mm] = t.split(":").map(Number); return `${hh % 12 || 12}${mm ? ":" + String(mm).padStart(2, "0") : ":00"} ${hh < 12 ? "AM" : "PM"}`; };
  if (!h?.open) return { open: false, text: "Closed today" };
  return { open: true, text: `${fmt(h.start)}–${fmt(h.end)}` };
}
export const fmtTime = (t: string) => { const [hh, mm] = t.split(":").map(Number); return `${hh % 12 || 12}:${String(mm).padStart(2, "0")} ${hh < 12 ? "AM" : "PM"}`; };
