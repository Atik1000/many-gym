/**
 * Flags fields the API returns that nothing in the client reads.
 *
 * This exists because the schema is not a reliable guide: `GymDetail.location` is declared a string but is
 * actually an object, so a generated client silently cannot see it (docs/api/known-issues.md #22c). Fields
 * dropped this way produce no error — the data just never reaches the screen, and you only notice by reading
 * a response by hand. That is how `timezone`, the post author and the resolved media URLs were found.
 *
 * The shapes below are the *observed* top-level keys of real responses, not the schema's view of them.
 * Refresh them against a live gym when the API changes.
 *
 * Usage: node scripts/check-field-coverage.mjs [--strict]
 *   default  report only; exits 0
 *   --strict exit 1 if anything is unmapped (use once the list is intentionally empty)
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Observed response keys, captured from a live gym-owner session. */
const SHAPES = {
  MemberList: ["full_name", "first_name", "last_name", "email", "phone", "profile_photo_url", "joining_status", "current_plan_name", "membership_status", "payment_status", "expiry_date", "assigned_trainer"],
  MemberDetail: ["user_id", "first_name", "last_name", "email", "phone", "profile_photo_url", "address", "city", "country", "date_of_birth", "sex", "nationality", "emergency_contact_name", "emergency_contact_phone", "emergency_contact_relationship", "joining_status", "invitation_sent_at", "internal_notes", "assigned_trainer", "active_subscription", "subscriptions"],
  PlanDetail: ["name", "description", "plan_status", "plan_type", "price", "duration_value", "duration_unit", "duration_display", "joining_fee", "payment_schedule", "installment_schedule_config", "included_amenities", "included_amenity_ids", "cancellation_policy", "refund_policy"],
  LeadDetail: ["first_name", "last_name", "phone", "email", "stage", "source", "expected_start_date", "trial_booked_at", "not_joining_reason_standard", "not_joining_custom_reason", "interested_plan", "assigned_staff", "converted_member", "fitness_goals", "pending_next_moves_count", "next_moves", "notes"],
  TemplateDetail: ["template_name", "routine_format", "level", "goals", "notes", "days_count", "total_exercises_count", "created_by_staff_id", "created_by_staff_name", "days"],
  TemplateDay: ["day_of_week", "session_number", "is_rest_day", "workout_title", "workday_note", "sort_order", "exercises"],
  PostList: ["author_user_id", "author_name", "author_avatar_url", "content_text", "privacy", "published_at", "media_count", "media_attachments"],
  GalleryItem: ["media_url", "original_url", "optimized_url", "thumbnail_url", "resolved_media_url", "resolved_thumbnail_url", "media_type", "category", "caption", "order_index", "processing_status", "width", "height", "size_bytes", "optimized_size_bytes"],
  StaffAssignment: ["user", "role", "status", "invited_at", "joined_at"],
  Role: ["name", "slug", "is_custom", "description", "permissions"],
  AmenityItem: ["amenity_id", "name", "group_name", "group_display", "is_paid", "default_price"],
  GymDetail: ["name", "owner_email", "profile_picture_url", "cover_photo_url", "short_description", "primary_type", "secondary_type", "gender_required", "min_age", "timezone", "location", "opening_hours_count", "gallery_count"],
};

/** Fields deliberately not read, with the reason. */
const IGNORED = {
  duration_display: "the client formats duration itself, from duration_value + duration_unit",
  included_amenities_count: "the full included_amenities array is read instead",
  media_count: "media_attachments is read directly",
  days_count: "days is read directly",
  pending_next_moves_count: "next_moves is read directly",
  opening_hours_count: "the opening-hours endpoint is read directly",
  gallery_count: "the gallery endpoint is read directly",
  created_by_staff_id: "created_by_staff_name is shown instead",
  width: "intrinsic size is not displayed",
  height: "intrinsic size is not displayed",
  size_bytes: "file size is not displayed",
  optimized_size_bytes: "file size is not displayed",
  order_index: "gallery order follows the array the API returns",
  original_url: "only a fallback behind resolved_media_url and optimized_url",
};

// everything the client reads
const sources = [];
const crawl = (d) => {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    if (e.name.startsWith(".") || e.name === "node_modules") continue;
    const p = join(d, e.name);
    if (e.isDirectory()) crawl(p);
    else if (/\.(ts|tsx)$/.test(e.name) && !p.endsWith("lib/api/types.ts")) sources.push(p);
  }
};
for (const d of ["lib", "components", "app"]) crawl(join(ROOT, d));
const code = sources.map((f) => readFileSync(f, "utf8")).join("\n");

let unmapped = 0;
for (const [shape, fields] of Object.entries(SHAPES)) {
  const missing = fields.filter((f) => !IGNORED[f] && !new RegExp(`\\b${f}\\b`).test(code));
  if (!missing.length) continue;
  unmapped += missing.length;
  console.log(`  ${shape}: ${missing.join(", ")}`);
}

if (unmapped === 0) console.log("Every field the API returns is read somewhere in the client.");
else console.log(`\n${unmapped} field(s) returned by the API are never read. Map them, or add a reason to IGNORED.`);

process.exit(unmapped && process.argv.includes("--strict") ? 1 : 0);
