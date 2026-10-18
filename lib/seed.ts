// Deterministic dummy data for the mock API. Same seed → same people, so resets are predictable.
// Dates are relative to "today" so statuses (active / expiring / expired …) are always realistic.
import { addDays, addMonths as addMonthsISO, daysBetween, today } from "./dates";
import { uid } from "./id";
import { SEED_LEADS } from "./leads";
import { DEFAULT_ROLES, SEED_PEOPLE, SEED_ROLES, type Person } from "./people";
import { SEED_PLANS, type Plan } from "./plans";
import { SEED_ROUTINES, WEEKDAYS, copyRoutine, newExercise, type Routine } from "./routines";
import { blankMember, buildMembership, charges, endDate, memberNo, type Member, type Membership } from "./members";
import type { Lead } from "./leads";
import type { GymProfile } from "./gym-data";
import type { Post } from "./posts";
import { gymPhoto, portrait } from "./media";

function rng(seed: number) { // mulberry32
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const FIRST = ["Olivia","James","Amara","Daniel","Sofia","Ethan","Grace","Noah","Maya","Liam","Chloe","Mason","Zoe","Lucas","Isla","Henry","Nina","Oscar","Freya","Leo","Aisha","Jack","Ruby","Samir","Elena","Theo","Priyanka","Callum","Imogen","Hugo","Mei","Arjun","Layla","Finn","Tessa","Kofi","Anya","Ravi","Poppy","Jonas"];
const LAST = ["Bennett","Wilson","Okafor","Clarke","Ahmed","Brooks","Thompson","Williams","Patel","Murphy","Nguyen","Carter","Hughes","Khan","Morris","Reid","Santos","Fraser","Ali","Walker","Singh","Evans","Cole","Hassan","Rossi","Gray","Mehta","Dunn","Pearce","Lund","Chen","Kapoor","Haddad","Doyle","Ford","Mensah","Novak","Rao","Bell","Weber"];
const NATIONS = ["British","Irish","Nigerian","Indian","Polish","Pakistani","Spanish","Italian","Chinese","Ghanaian","German","Portuguese"];
const STREETS = ["Canal Street","Oldham Road","Deansgate","Chapel Lane","Station Road","Park Avenue","Market Street","Victoria Road","Mill Lane","King Street"];
const REL = ["Sister","Brother","Partner","Mother","Father","Friend","Spouse"];

const pick = <T,>(r: () => number, a: T[]) => a[Math.floor(r() * a.length)];
const chance = (r: () => number, p: number) => r() < p;
const between = (r: () => number, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
// each picture gets the next photo in turn so neighbouring posts/gallery tiles don't repeat
let photoCursor = 0;
const FIXED_PHOTO: Record<string, number> = { "ironworks-cover": 5, "ironworks-logo": 3 };
const placeholder = (seed: string, label = "", size = "") => {
  void label; // photos carry no caption; the argument is kept so seed calls read the same as before
  const q = new URLSearchParams(size);
  return gymPhoto(seed in FIXED_PHOTO ? FIXED_PHOTO[seed] : photoCursor++, Number(q.get("w")) || 800, Number(q.get("h")) || 500);
};

// ---- plans & templates: the hand-written ones plus a few more ----
function plans(): Plan[] {
  const more: Plan[] = [
    { ...SEED_PLANS[0], id: "student-monthly", name: "Student Monthly", description: "A discounted monthly pass for students with a valid student ID. Full gym access during all opening hours.", status: "active", price: "24.99", duration: "1", per: "month", joiningFee: "0", freeAmenities: ["Showers", "Wi-Fi"], paidAmenities: [], cancellationPolicy: "Cancel any time before renewal.", refundPolicy: "No refunds after the start date." },
    { ...SEED_PLANS[0], id: "offpeak-quarterly", name: "Off-Peak Quarterly", description: "Three months of access on weekdays before 4pm, at a lower price for flexible schedules.", status: "active", price: "54.99", duration: "3", per: "month", joiningFee: "5.00", freeAmenities: ["Changing rooms", "Showers", "Parking"], paidAmenities: ["Sauna"], cancellationPolicy: "Cancel before the next renewal.", refundPolicy: "Reviewed case by case in the first 14 days." },
    { ...SEED_PLANS[1], id: "boxing-8-sessions", name: "Boxing 8 Sessions", description: "Eight instructor-led boxing classes to use any time within three months of the start date.", status: "active", type: "session", price: "96.00", duration: "8", per: "session", joiningFee: "0", freeAmenities: ["Changing rooms", "Showers"], paidAmenities: [], cancellationPolicy: "Unused sessions can't be cancelled after the first class.", refundPolicy: "No refunds once a session is used." },
  ];
  return [...SEED_PLANS.map((p) => structuredClone(p)), ...more];
}

function ex(name: string, sets: string, reps: string, rest: string, notes = "") { return newExercise({ name, sets, reps, rest, notes }); }
function routines(): Routine[] {
  const day = (rest: boolean, title: string, exs: ReturnType<typeof ex>[]) => ({ rest, title, note: "", exercises: rest ? [] : exs });
  const week = (plan: Record<number, [string, ReturnType<typeof ex>[]]>) => WEEKDAYS.map((d, i) => ({ day: d, ...(plan[i] ? day(false, plan[i][0], plan[i][1]) : day(true, "", [])) }));
  const extra: Routine[] = [
    { id: "fat-loss-circuit", name: "Fat Loss Circuit", format: "weekly", goals: ["Weight Loss"], level: "Intermediate", notes: "Keep rest short. Walk for 5 minutes after each session.", sessions: [],
      days: week({ 0: ["Circuit A", [ex("Kettlebell Swing", "4", "15 reps", "30 sec"), ex("Burpee", "4", "10 reps", "30 sec"), ex("Rowing Machine", "", "5 min", "")]], 2: ["Circuit B", [ex("Box Step-up", "4", "12 reps / leg", "30 sec"), ex("Battle Rope", "4", "30 sec", "30 sec")]], 4: ["Cardio + Core", [ex("Treadmill Intervals", "", "20 min", ""), ex("Plank", "3", "40 sec", "30 sec")]] }) },
    { id: "advanced-powerlifting", name: "Advanced Powerlifting", format: "weekly", goals: ["Strength", "Muscle Gain"], level: "Advanced", notes: "Log every top set. Deload every fourth week.", sessions: [],
      days: week({ 0: ["Squat Day", [ex("Back Squat", "5", "5 reps", "180 sec"), ex("Pause Squat", "3", "3 reps", "120 sec")]], 2: ["Bench Day", [ex("Bench Press", "5", "5 reps", "150 sec"), ex("Weighted Dip", "3", "8 reps", "90 sec")]], 4: ["Deadlift Day", [ex("Deadlift", "4", "4 reps", "180 sec"), ex("Barbell Row", "4", "6 reps", "90 sec")]] }) },
    { id: "mobility-core", name: "Mobility & Core", format: "session", goals: ["General Fitness"], level: "Beginner", notes: "Move slowly and breathe.", days: [],
      sessions: [
        { id: "mc1", title: "Hips & Spine", note: "", exercises: [ex("90/90 Hip Switch", "", "10 reps", ""), ex("Thread the Needle", "2", "8 reps / side", "20 sec")] },
        { id: "mc2", title: "Core Basics", note: "", exercises: [ex("Dead Bug", "3", "10 reps", "30 sec"), ex("Side Plank", "2", "30 sec / side", "30 sec")] },
      ] },
  ];
  return [...SEED_ROUTINES(), ...extra];
}

function people(): Person[] {
  return [
    ...SEED_PEOPLE().filter((p) => p.id !== "p-emma"),
    { id: "p-marcus", name: "Marcus Lee", email: "marcus.lee@example.com", roleId: "staff", status: "active" },
    { id: "p-diego", name: "Diego Alvarez", email: "diego.alvarez@example.com", roleId: "trainer", status: "active" },
    { id: "p-hannah", name: "Hannah Wright", email: "hannah.wright@example.com", roleId: "trainer", status: "active" },
    { id: "p-ines", name: "Ines Duarte", email: "ines.duarte@example.com", roleId: "membership-manager", status: "active" },
    { id: "p-emma", name: "", email: "emma@example.com", roleId: "trainer", status: "invited" },
  ];
}

// ---- members ----
function members(r: () => number, planList: Plan[], team: Person[], templates: Routine[]): Member[] {
  const t = today();
  const sellable = planList.filter((p) => p.status === "active");
  const trainers = team.filter((p) => p.roleId === "trainer" && p.status === "active");
  const lenOf = (p: Plan) => daysBetween(t, p.type === "time" ? endDate(p, t) : addDays(t, 89)) + 1;
  const firsts = [...FIRST], lasts = [...LAST];
  const out: Member[] = [];

  for (let i = 0; i < 40; i++) {
    const first = firsts[i], last = lasts[(i * 7 + 3) % lasts.length];
    const plan = pick(r, sellable);
    const len = lenOf(plan);
    const roll = r();
    const scenario = roll < 0.5 ? "active" : roll < 0.62 ? "expiring" : roll < 0.78 ? "expired" : roll < 0.84 ? "scheduled" : roll < 0.89 ? "paused" : roll < 0.93 ? "cancelled" : "new";
    let end: string;
    if (len > 200) end = addDays(addDays(t, -between(r, 5, 150)), len - 1); // annual plans: started in the last ~5 months, so history stays continuous
    else if (scenario === "expiring") end = addDays(t, between(r, 1, 12));
    else if (scenario === "expired") end = addDays(t, -between(r, 2, 120));
    else if (scenario === "scheduled") end = addDays(t, between(r, 1, 14) + len - 1);
    else if (scenario === "new") end = addDays(t, len - between(r, 1, 6));
    else end = addDays(t, between(r, 16, Math.max(17, len - 1)));
    const start = addDays(end, -(len - 1));
    const extras = plan.paidAmenities.length === 0 && chance(r, 0.2) ? [{ name: "Personal lockers", price: 5 }] : [];
    const current: Membership = { ...buildMembership(plan, start, end, extras), sessionsUsed: plan.type === "session" ? Math.min(between(r, 0, 8), parseInt(plan.duration, 10)) : 0 };

    // payments: mostly paid in full; some partial; recent starts may be unpaid. A payment can never be dated in the future.
    const total = charges(current);
    const recent = daysBetween(start, t) < 35;
    const pay = r();
    const method = () => pick(r, ["Card", "Card", "Cash", "Direct debit", "Bank transfer"]);
    const when = (d: string) => (d > t ? t : d);
    if (plan.schedule === "instalments" && plan.instalments.length && (pay < 0.68 || !recent)) {
      // follow the plan's schedule: each instalment that has fallen due is paid, the joining fee rides with the first one
      plan.instalments.forEach((inst, n) => {
        const due = inst.dueUnit === "months" ? addMonthsISO(start, Number(inst.dueAfter)) : addDays(start, Number(inst.dueAfter) * (inst.dueUnit === "weeks" ? 7 : 1));
        if (due <= t) current.payments.push({ id: uid(), amount: Math.round((Number(inst.amount) + (n === 0 ? current.joiningFee : 0) + (n === 0 ? extras.reduce((a, e) => a + e.price, 0) : 0)) * 100) / 100, method: method(), date: due });
      });
    } else if (pay < 0.68 || !recent) current.payments.push({ id: uid(), amount: total, method: method(), date: when(addDays(start, between(r, 0, 2))) });
    else if (pay < 0.86) current.payments.push({ id: uid(), amount: Math.round(total * 0.5 * 100) / 100, method: "Card", date: when(start) });

    // history: earlier fully-paid memberships spread revenue over ~6 months
    const memberships = [current];
    let cursor = start;
    for (let h = 0; h < between(r, 0, 2) && daysBetween(addDays(t, -180), cursor) > 40; h++) {
      const hp = pick(r, sellable.filter((p) => p.type === "time" && lenOf(p) <= 200)); // history stays within ~6 months
      const hEnd = addDays(cursor, -1), hLen = daysBetween(t, endDate(hp, t)) + 1, hStart = addDays(hEnd, -(hLen - 1));
      const hm = buildMembership(hp, hStart, hEnd, []);
      hm.payments.push({ id: uid(), amount: charges(hm), method: pick(r, ["Card", "Cash", "Direct debit"]), date: hStart });
      memberships.push(hm); cursor = hStart;
    }

    const earliestStart = memberships.reduce((m, x) => (x.start < m ? x.start : m), start);
    const joined = earliestStart > t ? t : earliestStart; // signing up for a future start date still happened today
    const trainer = chance(r, 0.78) && trainers.length ? pick(r, trainers).id : "";
    const hold: Member["hold"] = scenario === "paused" ? "paused" : scenario === "cancelled" ? "cancelled" : "";
    out.push({
      ...blankMember(), id: `m-${200 + i}`, memberNo: memberNo(200 + i), firstName: first, lastName: last,
      email: `${first}.${last}@example.com`.toLowerCase(), phone: `+44 7700 9${String(10000 + i * 37).slice(-5)}`,
      address: `${between(r, 2, 98)} ${pick(r, STREETS)}`, city: "Manchester", country: "United Kingdom", nationality: pick(r, NATIONS),
      dob: `${between(r, 1962, 2005)}-${String(between(r, 1, 12)).padStart(2, "0")}-${String(between(r, 1, 28)).padStart(2, "0")}`, sex: pick(r, ["Female", "Male", "Female", "Male", "Other"]),
      emergency: chance(r, 0.8) ? { name: `${pick(r, FIRST)} ${last}`, phone: `+44 7700 8${String(10000 + i * 53).slice(-5)}`, relationship: pick(r, REL) } : { name: "", phone: "", relationship: "" },
      memberships, trainerId: trainer, hold, joinedAt: joined,
      joiningStatus: scenario === "new" && chance(r, 0.6) ? "sent_invitation" : "joined",
      notes: chance(r, 0.25) ? pick(r, ["Prefers evening workouts.", "Recovering from a knee injury — avoid heavy squats.", "Contact by email only.", "Interested in personal training.", "Referred by another member."]) : "",
      routine: trainer && chance(r, 0.5) ? copyRoutine(pick(r, templates)) : null,
    });
  }
  return out;
}

// ---- leads ----
function leads(r: () => number, planList: Plan[], team: Person[]): Lead[] {
  const t = today();
  const staff = team.filter((p) => p.roleId !== "trainer" && p.status === "active");
  const base = SEED_LEADS();
  const stages: Lead["stage"][] = ["new", "new", "new", "new", "contacted", "contacted", "contacted", "contacted", "trial", "trial", "trial", "joined", "joined", "not_joining", "not_joining", "not_joining"];
  const reasons = ["Price", "Location", "Timing", "Chose Another Gym", "Other"];
  const customs = ["Moving abroad", "Injury"];
  const moves = ["Call to discuss membership", "Confirm gym tour", "Follow up after trial", "Send price list", "Check start date", "Offer joining-fee discount"];
  const extra: Lead[] = Array.from({ length: 21 }, (_, i) => {
    const stage = stages[i % stages.length];
    const first = FIRST[(i * 3 + 11) % FIRST.length], last = LAST[(i * 5 + 1) % LAST.length];
    const reason = stage === "not_joining" ? pick(r, reasons) : "";
    const hasPhone = chance(r, 0.8), hasEmail = chance(r, 0.7) || !hasPhone; // spec: at least one contact method
    return {
      id: uid(), firstName: first, lastName: chance(r, 0.85) ? last : "", phone: hasPhone ? `+44 7700 7${String(10000 + i * 41).slice(-5)}` : "", email: hasEmail ? `${first}.${last}@example.com`.toLowerCase() : "",
      planId: chance(r, 0.8) ? pick(r, planList.filter((p) => p.status === "active")).id : "", stage, reason, customReason: reason === "Other" ? pick(r, customs) : "",
      goals: [pick(r, ["General Fitness", "Strength", "Muscle Gain", "Weight Loss"])], expectedStart: chance(r, 0.5) ? addDays(t, between(r, 1, 30)) : "",
      source: pick(r, ["Walk-in", "Phone", "Social Media", "Referral", "Website"]), assignedTo: chance(r, 0.7) ? pick(r, staff).id : "",
      nextMoves: stage === "joined" || stage === "not_joining" ? [] : [{ id: uid(), date: addDays(t, between(r, -3, 12)), description: pick(r, moves) }],
      trialBooked: stage === "trial" ? `${addDays(t, between(r, 0, 9))}T${pick(r, ["09:30", "12:00", "17:30", "18:30"])}` : "",
      notes: chance(r, 0.35) ? [pick(r, ["Wants evening access.", "Asked about the sauna.", "Prefers a female trainer.", "Comparing with a nearby gym."])] : [],
    };
  });
  return [...base, ...extra];
}

// ---- Studio posts ----
function posts(): Post[] {
  const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();
  const m = (seed: string, label: string, kind: "image" | "video" = "image") => ({ id: uid(), url: placeholder(seed, label), kind });
  const c = (author: string, text: string, h: number) => ({ id: uid(), author, text, createdAt: hoursAgo(h) });
  const p = (text: string, h: number, o: Partial<Post> = {}): Post => ({ id: uid(), text, media: [], members: false, pinned: false, createdAt: hoursAgo(h), likes: 10, likedBy: [], comments: [], ...o });
  return [
    p("New equipment, stronger workouts. Our upgraded strength area is ready for you.", 2, { pinned: true, likes: 24, media: [m("strength-area", "Strength Community Progress")], comments: [c("Amara Okafor", "Loving the new racks!", 1), c("Noah Williams", "Can't wait to try them.", 1)] }),
    p("Great sessions this week from our members! Consistency builds stronger people. 💪", 26, { likes: 18, media: [m("members-week-1", "Great week"), m("members-week-2", "Consistency")], comments: [c("Grace Thompson", "Proud of everyone!", 20)] }),
    p("Holiday opening hours: we're open 8am–4pm on bank holiday Monday. Normal hours resume Tuesday.", 50, { likes: 9 }),
    p("Members only: book your free body composition scan at reception this month.", 74, { members: true, likes: 14, media: [m("body-scan", "Body scan")], comments: [] }),
    p("Meet Diego, our new strength coach! Book an intro session at the desk or online.", 120, { likes: 31, media: [m("coach-diego", "Meet Diego")], comments: [c("Ethan Brooks", "Great coach already.", 96), c("Isla Murphy", "Booked mine!", 90)] }),
    p("Yoga for Beginners starts next Thursday at 6:30pm. Mats provided — just bring yourself.", 200, { likes: 22, media: [m("yoga-class", "Yoga for beginners")] }),
    p("Our spring challenge is live: 20 workouts in 30 days. Track yours at reception.", 340, { likes: 40, media: [m("challenge-1", "20 in 30"), m("challenge-2", "Track it"), m("challenge-3", "Win prizes")] }),
    p("Thank you for 250 members — here's to the next chapter!", 600, { likes: 58, comments: [c("Sofia Ahmed", "Congratulations!", 560)] }),
  ];
}

// ---- gym profile ----
function gym(): GymProfile {
  return {
    id: "gym", tagline: "Strength. Community. Progress.", website: "www.ironworksgym.co.uk",
    overview: {
      name: "Ironworks Gym",
      description: "Ironworks is Manchester's home for serious strength training. Our upgraded strength area, friendly coaches and welcoming community help every member get stronger, whatever their level.",
      primaryType: "strength", secondaryType: "functional", gender: "everyone", minAge: "16",
      profileUrl: placeholder("ironworks-logo", "IRONWORKS", "w=400&h=400"), coverUrl: placeholder("ironworks-cover", "Stronger People · Brighter Tomorrows", "w=1600&h=400"),
    },
    location: { address: "14 Canal Street", city: "Manchester", postcode: "M1 3HE", country: "United Kingdom", pin: { x: 52, y: 46 } },
    hours: Object.fromEntries(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((d) => [d, d === "Saturday" ? { open: true, start: "08:00", end: "20:00" } : d === "Sunday" ? { open: true, start: "08:00", end: "18:00" } : { open: true, start: "06:00", end: "22:00" }])),
    amenities: { free: ["Changing rooms", "Showers", "Day-use lockers", "Wi-Fi", "Air conditioning", "Parking"], paid: ["Personal lockers", "Sauna"] },
    gallery: [
      ["Equipment", "Dumbbell rack", "g-dumbbells"], ["Workout Areas", "Strength floor", "g-floor"], ["Studios & Class Spaces", "Studio one", "g-studio"], ["Reception & Lounge", "Reception", "g-reception"],
      ["Changing Rooms & Showers", "Changing rooms", "g-changing"], ["Exterior & Entrance", "Front entrance", "g-front"], ["Wellness Facilities — sauna, steam room, pool", "Sauna", "g-sauna"], ["General", "Saturday crowd", "g-crowd"],
    ].map(([category, caption, seed]) => ({ id: uid(), url: placeholder(seed, caption), kind: "image" as const, category, caption })),
  };
}

export type Dataset = {
  plans: Plan[]; members: Member[]; leads: Lead[]; people: Person[]; roles: typeof DEFAULT_ROLES; routines: Routine[];
  leadReasons: { id: string; label: string }[]; posts: Post[]; gym: GymProfile;
};

export function buildDataset(): Dataset {
  photoCursor = 0;
  const r = rng(20261018);
  const planList = plans(), team = people(), tpl = routines();
  return {
    plans: planList, people: team, roles: SEED_ROLES(), routines: tpl,
    members: members(r, planList, team, tpl).map((m, i) => ({ ...m, photo: i % 11 === 10 ? "" : portrait(m.sex, i + 3) })),
    leads: leads(r, planList, team),
    leadReasons: [{ id: "lr-1", label: "Moving abroad" }, { id: "lr-2", label: "Injury" }],
    posts: posts(), gym: gym(),
  };
}
