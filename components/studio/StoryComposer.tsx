"use client";

/**
 * Create a story — `POST /stories/`, or `POST /posts/{id}/repost/` (`target: "story"`) when sharing a post.
 *
 * A story carries exactly one picture or video. Whose story it is comes from the token: under a gym-context
 * token it is the gym's, under a personal one it is the user's — which also decides the audiences on offer
 * ("Gym members only" exists for gym stories only).
 *
 * Mounted only while open: the caller renders it conditionally, so state starts fresh each time.
 */
import { useEffect, useRef, useState } from "react";
import { LuImage, LuLoaderCircle, LuSend, LuX } from "react-icons/lu";
import Modal from "@/components/ui/Modal";
import { MotionButton } from "@/components/ui/Motion";
import { Select } from "@/components/ui/parts";
import { useToast } from "@/components/ui/Toast";
import { ApiError, currentGymId } from "@/lib/api/http";
import { DEFAULT_LIFETIME, LIFETIMES, PRIVACY_LABEL, createStory, privacyChoices, sharePostToStory, type StoryLifetime, type StoryPrivacy } from "@/lib/api/stories";
import { ACCEPT, validateFiles } from "@/lib/media";
import { btnGhost, btnPrimary, errorText, hint, input, label } from "@/lib/ui";

type SourcePost = { id: string; text: string; previewUrl?: string; kind?: "image" | "video" };
type Picked = { file: File; url: string; kind: "image" | "video" };

const CAPTION_MAX = 500;

/** The API names the upload field several ways; any of them means "the media". */
const FILE_KEYS = ["file", "files", "media", "media_file", "media_url", "source_post_id"];

export default function StoryComposer({ sourcePost = null, onClose, onCreated }: {
  sourcePost?: SourcePost | null;
  onClose: () => void;
  onCreated?: () => void;
}) {
  const toast = useToast();
  const owner = currentGymId() ? "gym" : "user";
  const [picked, setPicked] = useState<Picked | null>(null);
  const [duration, setDuration] = useState<number | undefined>(undefined);
  const [lifetime, setLifetime] = useState<StoryLifetime>(DEFAULT_LIFETIME);
  const [privacy, setPrivacy] = useState<StoryPrivacy>("public");
  const [caption, setCaption] = useState("");
  const [useColor, setUseColor] = useState(false);
  const [color, setColor] = useState("#111827");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  // Set when the server says the shared post has nothing to inherit, whatever the caller told us.
  const [serverWantsFile, setServerWantsFile] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const urlRef = useRef<string | null>(null);

  // Release the preview's object URL when the composer goes away.
  useEffect(() => () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current); }, []);

  const inherits = !!sourcePost?.previewUrl && !serverWantsFile; // the post's own media will be used
  const needsFile = !inherits;
  const canSubmit = !busy && (inherits || !!picked) && caption.length <= CAPTION_MAX;

  const clearFile = () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    setPicked(null); setDuration(undefined);
  };

  const pick = (files: File[]) => {
    if (!files.length) return;
    if (files.length > 1) return setErrors((e) => ({ ...e, file: "A moment takes one photo or video — choose a single file." }));
    const r = validateFiles(files);
    if (!r.ok.length) return setErrors((e) => ({ ...e, file: r.errors[0] ?? "That file can't be used." }));
    clearFile();
    const { file, url, kind } = r.ok[0];
    urlRef.current = url;
    setPicked({ file, url, kind });
    setErrors((e) => ({ ...e, file: "", form: "" }));
  };

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true); setErrors({});
    const draft = {
      file: picked?.file,
      durationSeconds: picked?.kind === "video" ? duration : undefined,
      lifetimeHours: lifetime,
      privacy,
      caption,
      backgroundColor: useColor ? color : undefined,
    };
    try {
      if (sourcePost) await sharePostToStory(sourcePost.id, draft);
      else await createStory(draft);
      toast(sourcePost ? "Shared to your moments" : "Moment published");
      onCreated?.();
      onClose();
    } catch (e) {
      const api = e instanceof ApiError ? e : null;
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(api?.fieldErrors() ?? {})) {
        if (FILE_KEYS.includes(k)) out.file = v;
        else if (k === "lifetime" || k === "lifetime_hours") out.lifetime = v;
        else if (k === "background_color") out.color = v;
        else if (k === "privacy" || k === "caption") out[k] = v;
        else out.form = v;
      }
      if (!Object.keys(out).length) out.form = api?.message ?? "Couldn't publish that moment.";
      // Sharing a text-only post: the server has nothing to inherit (400 with no field details).
      if (sourcePost && !picked && api?.status === 400 && !out.privacy && !out.caption && !out.lifetime && !out.color) {
        setServerWantsFile(true);
        out.file = out.file || out.form;
        out.form = "";
      }
      setErrors(out);
      setBusy(false);
    }
  };

  const close = () => { if (!busy) onClose(); };

  return (
    <Modal open title={sourcePost ? "Share to moment" : "Add moment"} onClose={close}
      footer={<>
        <MotionButton className={btnGhost} onClick={close} disabled={busy}><LuX size={17} />Cancel</MotionButton>
        <MotionButton className={btnPrimary} disabled={!canSubmit} onClick={submit}>
          {busy ? <><LuLoaderCircle size={16} className="animate-spin" />{picked ? "Uploading…" : "Sharing…"}</> : <><LuSend size={16} />Share moment</>}
        </MotionButton>
      </>}>
      {sourcePost && (
        <div className="rounded-xl border border-line bg-background px-3.5 py-3">
          <span className="text-xs font-semibold text-muted">From a post</span>
          <p className="line-clamp-3 whitespace-pre-wrap">{sourcePost.text || <span className="text-muted">No text</span>}</p>
        </div>
      )}

      {inherits && sourcePost?.previewUrl && (
        <div className="mx-auto aspect-[9/16] w-[180px] overflow-hidden rounded-xl" style={{ background: useColor ? color : "#111827" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {sourcePost.kind === "video" ? <video src={sourcePost.previewUrl} muted playsInline preload="metadata" className="h-full w-full object-contain" /> : <img src={sourcePost.previewUrl} alt="" className="h-full w-full object-contain" />}
        </div>
      )}

      {needsFile && (
        <div>
          {sourcePost && <p className="mb-2 rounded-xl bg-warn-bg px-3.5 py-2.5 text-warn">A moment needs a photo or video, and this post doesn&apos;t have one. Add one to share it.</p>}
          {picked ? (
            <div className="relative mx-auto aspect-[9/16] w-[180px] overflow-hidden rounded-xl" style={{ background: useColor ? color : "#111827" }}>
              {picked.kind === "video"
                ? <video src={picked.url} muted playsInline controls preload="metadata" className="h-full w-full object-contain" onLoadedMetadata={(e) => { const d = e.currentTarget.duration; setDuration(Number.isFinite(d) ? d : undefined); }} />
                // eslint-disable-next-line @next/next/no-img-element
                : <img src={picked.url} alt="" className="h-full w-full object-contain" />}
              <button type="button" aria-label="Remove file" disabled={busy} onClick={clearFile} className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-black/65 text-white"><LuX size={14} /></button>
            </div>
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); pick([...e.dataTransfer.files]); }}
              className="w-full cursor-pointer rounded-xl border-[1.5px] border-dashed border-[#c6c9dc] bg-background p-[18px] text-center text-muted">
              <LuImage className="mx-auto mb-1" />
              <b className="text-primary">Choose a photo or video</b> or drag &amp; drop
              <small className="mt-1 block">One file · JPG, PNG, WebP up to 10 MB · MP4, MOV up to 200 MB</small>
            </button>
          )}
          <input ref={fileRef} type="file" hidden accept={ACCEPT} onChange={(e) => { pick([...(e.target.files ?? [])]); e.target.value = ""; }} />
          {picked && !busy && <button type="button" className="mx-auto mt-2 block text-[13px] font-semibold text-primary" onClick={() => fileRef.current?.click()}>Choose a different file</button>}
          {errors.file && <p role="alert" className={errorText}>{errors.file}</p>}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <div>
          <label htmlFor="story-life" className={label}>Lifetime</label>
          <Select id="story-life" value={lifetime} disabled={busy} onChange={(e) => setLifetime(Number(e.target.value) as StoryLifetime)}>
            {LIFETIMES.map((h) => <option key={h} value={h}>{h} hours{h === DEFAULT_LIFETIME ? " (default)" : ""}</option>)}
          </Select>
          {errors.lifetime ? <p className={errorText}>{errors.lifetime}</p> : <p className={hint}>The moment disappears after this long.</p>}
        </div>
        <div>
          <label htmlFor="story-privacy" className={label}>Who can see this?</label>
          <Select id="story-privacy" value={privacy} disabled={busy} onChange={(e) => setPrivacy(e.target.value as StoryPrivacy)}>
            {privacyChoices(owner).map((p) => <option key={p} value={p}>{PRIVACY_LABEL[p]}</option>)}
          </Select>
          {errors.privacy && <p className={errorText}>{errors.privacy}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="story-caption" className={label}>Caption <span className="font-normal text-muted">(optional)</span></label>
        <textarea id="story-caption" rows={2} className={`${input} resize-y`} value={caption} disabled={busy} onChange={(e) => setCaption(e.target.value)} placeholder="Say something about it…" />
        <p className={caption.length > CAPTION_MAX || errors.caption ? errorText : hint}>{errors.caption || `${caption.length}/${CAPTION_MAX}`}</p>
      </div>

      <div>
        <label className="flex items-center gap-2.5">
          <input type="checkbox" checked={useColor} disabled={busy} onChange={(e) => setUseColor(e.target.checked)} />
          <span className="font-semibold">Background colour</span>
          {useColor && <input type="color" aria-label="Background colour" value={color} disabled={busy} onChange={(e) => setColor(e.target.value)} className="h-8 w-12 cursor-pointer rounded border border-line bg-surface p-0.5" />}
        </label>
        {errors.color ? <p className={errorText}>{errors.color}</p> : <p className={hint}>Shown behind media that doesn&apos;t fill the frame.</p>}
      </div>

      {errors.form && <p role="alert" className={errorText}>{errors.form}</p>}
    </Modal>
  );
}
