"use client";

/**
 * "Share on my profile" — reposts a post onto the actor's own page (`POST /posts/{id}/repost/`,
 * `target: "profile"`). While the token is in gym context that page is the gym's; otherwise it is the
 * signed-in person's. Sharing to a story is the other target and lives in StoryComposer.
 */
import { useState } from "react";
import { LuRepeat2, LuX } from "react-icons/lu";
import Modal from "@/components/ui/Modal";
import { MotionButton } from "@/components/ui/Motion";
import { useToast } from "@/components/ui/Toast";
import { refreshResource } from "@/lib/api";
import { repostToProfile } from "@/lib/api/feed";
import { ApiError, currentGymId } from "@/lib/api/http";
import { PRIVACY_HINT, PRIVACY_LABEL, privacyChoices, type Post, type PostPrivacy } from "@/lib/posts";
import { btnGhost, btnPrimary, errorText, hint, label } from "@/lib/ui";

export default function ShareModal({ post, onClose, onShared }: { post: Post; onClose: () => void; onShared?: (repost: Post) => void }) {
  const toast = useToast();
  const asGym = !!currentGymId();
  const [text, setText] = useState("");
  const [privacy, setPrivacy] = useState<PostPrivacy>("public");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Sharing a share points at the original, so the preview shows what people will actually see.
  const shown = post.isRepost && post.source ? post.source : post;
  const owner = shown.ownerType === "user" ? shown.author?.name : shown.gym?.name || shown.author?.name;

  const share = async () => {
    setBusy(true);
    setErrors({});
    try {
      const repost = await repostToProfile(post.id, { privacy, text });
      // The repost lands on this gym's own wall, so bring that list up to date.
      if (asGym) void refreshResource("posts");
      toast(asGym ? "Shared on your gym's page" : "Shared on your profile");
      onShared?.(repost);
      onClose();
    } catch (e) {
      const fields = e instanceof ApiError ? e.fieldErrors() : {};
      setErrors(Object.keys(fields).length ? fields : { form: e instanceof ApiError ? e.message : "Couldn't share that post." });
      setBusy(false);
    }
  };

  return (
    <Modal open title={asGym ? "Share on your gym's page" : "Share on your profile"} onClose={onClose}
      footer={<><MotionButton className={btnGhost} onClick={onClose} disabled={busy}><LuX size={17} />Cancel</MotionButton>
        <MotionButton className={btnPrimary} onClick={share} disabled={busy}><LuRepeat2 size={17} />{busy ? "Sharing…" : "Share now"}</MotionButton></>}>
      <label htmlFor="share-text" className="sr-only">Say something about this</label>
      <textarea id="share-text" autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="Say something about this (optional)…"
        className="min-h-[84px] w-full resize-y rounded-[10px] border border-line px-3.5 py-3 outline-none focus:border-primary focus:ring-3 focus:ring-primary-50" />
      {errors.content_text && <p className={errorText}>{errors.content_text}</p>}

      <div className="rounded-xl border border-line bg-background p-3">
        <b className="block text-[13px]">{owner || "Post"}</b>
        {shown.text && <p className="mt-0.5 line-clamp-3 whitespace-pre-wrap text-[14px] text-muted">{shown.text}</p>}
        {shown.media.length > 0 && <p className="mt-1 text-xs text-muted">{shown.media.length} photo{shown.media.length === 1 ? "" : "s"} / video{shown.media.length === 1 ? "" : "s"} attached</p>}
      </div>

      <div>
        <label htmlFor="share-privacy" className={label}>Who can see this share?</label>
        <select id="share-privacy" value={privacy} onChange={(e) => setPrivacy(e.target.value as PostPrivacy)} className="w-full rounded-[10px] border border-line bg-surface px-3 py-2">
          {privacyChoices(asGym).map((p) => <option key={p} value={p}>{PRIVACY_LABEL[p]}</option>)}
        </select>
        <p className={errors.privacy ? errorText : hint}>{errors.privacy ?? `${PRIVACY_HINT[privacy]}. The original keeps its own audience — people who can't see it will see your share without it.`}</p>
      </div>
      {errors.form && <p role="alert" className={errorText}>{errors.form}</p>}
    </Modal>
  );
}
