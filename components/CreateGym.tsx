"use client";

/**
 * `/create-gym`: `POST /gyms/` (multipart) creates a gym workspace.
 *
 * A logo is required (sent as `profile_picture`; the server converts it to WebP). The location comes from the
 * picker — Google address search, the device's live location, or a dragged pin — and goes up as `address`,
 * `city`, `postal_code`, `country`, `latitude` and `longitude`.
 *
 * Optional — a person can use manygym without one (personal mode: feed, finding and joining gyms, following,
 * messaging). After creating, the session swaps its personal-context token for a gym-context one so the
 * gym-management screens open.
 */
import { useEffect, useRef, useState } from "react";
import { LuArrowRight, LuBuilding2, LuImagePlus, LuX } from "react-icons/lu";
import LocationPicker, { EMPTY_PLACE, type PlaceValue } from "@/components/location/LocationPicker";
import { MotionButton } from "@/components/ui/Motion";
import { Select } from "@/components/ui/parts";
import { useToast } from "@/components/ui/Toast";
import { ApiError, request } from "@/lib/api/http";
import { enterGym } from "@/lib/auth";
import { GYM_TYPES } from "@/lib/gym-data";
import { btnPrimary, card, errorText, hint, input, label } from "@/lib/ui";

/** The UI's short type codes map onto the API's `primary_type` enum. */
const API_TYPE: Record<string, string> = {
  general: "general_fitness_gym", strength: "strength_bodybuilding_gym", functional: "functional_fitness_gym",
  pt: "personal_training_studio", boutique: "boutique_fitness_studio", martial: "boxing_martial_arts_gym",
  yoga: "yoga_pilates_studio", cycling: "indoor_cycling_studio", performance: "sports_performance_centre", other: "other",
};

const LOGO_MAX_MB = 10;
const LOGO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp", "image/tiff", "image/heic", "image/heif", "image/avif"];
/** What the API accepts; a phone's HEIC can arrive with an empty `type`, so the extension is checked too. */
const LOGO_EXT = /\.(jpe?g|jfif|png|webp|gif|bmp|tiff?|heic|heif|avif)$/i;

function logoProblem(f: File): string {
  if (!LOGO_TYPES.includes(f.type) && !LOGO_EXT.test(f.name)) return "Choose an image — JPG, PNG, WebP, HEIC or GIF.";
  if (f.size > LOGO_MAX_MB * 1024 * 1024) return `That image is ${(f.size / 1048576).toFixed(1)} MB. The limit is ${LOGO_MAX_MB} MB.`;
  return "";
}

export default function CreateGym({ onCreated }: { onCreated: () => void }) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [type, setType] = useState<string>("general");
  const [place, setPlace] = useState<PlaceValue>(EMPTY_PLACE);
  const [logo, setLogo] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // The preview URL belongs to this file; release it when the file changes or the form goes away.
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const chooseLogo = (f: File | undefined) => {
    if (fileRef.current) fileRef.current.value = ""; // so choosing the same file again still fires
    if (!f) return;
    const problem = logoProblem(f);
    if (problem) return setErrors((e) => ({ ...e, logo: problem }));
    setErrors((e) => ({ ...e, logo: "" }));
    setLogo(f);
    setPreview(URL.createObjectURL(f));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const out: Record<string, string> = {};
    if (!name.trim()) out.name = "Give your gym a name";
    if (!logo) out.logo = "Add your gym's logo";
    setErrors(out);
    if (Object.keys(out).length) {
      // The logo sits above the fold; bring the first problem into view rather than failing silently below it.
      requestAnimationFrame(() => document.querySelector<HTMLElement>("#create-gym [role=alert]")?.scrollIntoView({ behavior: "smooth", block: "center" }));
      return;
    }
    setBusy(true);
    try {
      const form = new FormData();
      const put = (k: string, v: string | number | null | undefined) => { if (v !== null && v !== undefined && String(v).trim() !== "") form.append(k, String(v).trim()); };
      put("name", name);
      put("primary_type", API_TYPE[type]);
      put("gender_required", "everyone");
      put("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone);
      put("address", place.address);
      put("city", place.city);
      put("postal_code", place.postalCode);
      put("country", place.country);
      put("latitude", place.lat);
      put("longitude", place.lng);
      form.append("profile_picture", logo as File);
      const gym = await request<{ id?: string; gym_id?: string }>("POST", "/api/v1/gyms/", { form });
      const id = String(gym?.id ?? gym?.gym_id ?? "");
      if (!id) throw new Error("The server didn't return the new gym's id.");
      const problem = await enterGym(id); // swap to a gym-context token
      if (problem) throw new Error(problem);
      toast(`${name.trim()} is ready`);
      onCreated();
    } catch (e2) {
      if (e2 instanceof ApiError) {
        const f = e2.fieldErrors();
        const loc = f.address || f.city || f.country || f.postal_code || f.latitude || f.longitude;
        setErrors({ name: f.name ?? "", logo: f.profile_picture ?? "", location: loc ?? "", form: loc || f.name || f.profile_picture ? "" : e2.message });
      } else setErrors({ form: e2 instanceof Error ? e2.message : "Couldn't create that gym." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid place-items-center py-6">
      <form id="create-gym" onSubmit={submit} noValidate className={`${card} w-full max-w-[520px] p-7`}>
        <span className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-primary-50 text-primary"><LuBuilding2 size={24} /></span>
        <h1 className="text-xl font-bold">Create a gym</h1>
        <p className="mb-5 mt-1 text-muted">Run a gym? Set up its page to manage members, plans and staff. This is optional — you can keep using manygym as yourself, and join other gyms as a member.</p>

        <span className={label}>Logo <span className="text-bad">*</span></span>
        <div className="mb-4 flex items-center gap-4">
          <button type="button" onClick={() => fileRef.current?.click()} aria-label={logo ? "Change logo" : "Add logo"}
            className={`relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl border-2 border-dashed ${errors.logo ? "border-bad" : "border-line"} bg-background text-muted hover:border-primary hover:text-primary`}>
            {preview
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={preview} alt="Logo preview" className="h-full w-full object-cover" />
              : <LuImagePlus size={26} />}
          </button>
          <div className="min-w-0 text-[13px]">
            <button type="button" onClick={() => fileRef.current?.click()} className="font-semibold text-primary hover:underline">{logo ? "Change logo" : "Upload logo"}</button>
            {logo && <button type="button" onClick={() => { setLogo(null); setPreview(""); }} className="ml-3 inline-flex items-center gap-1 text-muted hover:text-bad"><LuX size={13} />Remove</button>}
            <p className="text-muted">{logo ? logo.name : `Square works best. JPG, PNG, WebP or HEIC, up to ${LOGO_MAX_MB} MB.`}</p>
            {errors.logo && <p role="alert" className={errorText}>{errors.logo}</p>}
          </div>
          <input ref={fileRef} type="file" hidden accept="image/*,.heic,.heif" onChange={(e) => chooseLogo(e.target.files?.[0])} />
        </div>

        <label htmlFor="gname" className={label}>Gym name <span className="text-bad">*</span></label>
        <input id="gname" autoFocus className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Northside Strength" aria-invalid={!!errors.name} />
        {errors.name && <p role="alert" className={`${errorText} text-[13px]`}>{errors.name}</p>}

        <label htmlFor="gtype" className={`${label} mt-4`}>What kind of gym is it?</label>
        <Select id="gtype" value={type} onChange={(e) => setType(e.target.value)}>
          {GYM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </Select>

        <h2 className="mb-1 mt-6 font-bold">Location</h2>
        <p className="mb-3 text-[13px] text-muted">So people nearby can find you. Search the address or use where you are now.</p>
        <LocationPicker value={place} onChange={setPlace} error={errors.location} idPrefix="gloc" />

        {errors.form && <p role="alert" className={`${errorText} mt-3 text-[13px]`}>{errors.form}</p>}
        <MotionButton type="submit" disabled={busy} className={`${btnPrimary} mt-5 w-full`}>
          {busy ? "Creating…" : "Create gym"}<LuArrowRight size={17} />
        </MotionButton>
        <p className={hint}>You can change all of this later in Gym Profile.</p>
      </form>
    </div>
  );
}
