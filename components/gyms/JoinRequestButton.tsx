"use client";

/**
 * "Request to join" on a gym's public page — the applicant's side of member joining requests.
 *
 * `GET /gyms/{id}/join-request/` says where the signed-in person stands (already a member, already asked,
 * free to ask, or the gym isn't taking requests); `POST` on the same path sends a request, optionally naming
 * a plan and a message; `POST /members/requests/{id}/cancel/` withdraws a pending one.
 *
 * The status route reports no "rejected" state: once a gym declines, the person is simply free to ask again.
 */
import { useCallback, useEffect, useState } from "react";
import { LuBadgeCheck, LuClock, LuSend, LuUserPlus, LuX } from "react-icons/lu";
import Modal from "@/components/ui/Modal";
import { MotionButton } from "@/components/ui/Motion";
import { ConfirmModal, Pill, Select } from "@/components/ui/parts";
import { useToast } from "@/components/ui/Toast";
import type { PublicPlan } from "@/lib/api/discover";
import { ApiError } from "@/lib/api/http";
import { cancelJoinRequest, joinStatus, submitJoinRequest, type JoinStatus } from "@/lib/api/member-requests";
import { btnGhost, btnPrimary, errorText, hint, label } from "@/lib/ui";

const NOTES_MAX = 1000;

export default function JoinRequestButton({ gymId, gymName, plans }: { gymId: string; gymName: string; plans: PublicPlan[] }) {
  const toast = useToast();
  const [status, setStatus] = useState<JoinStatus | null>(null);
  const [asking, setAsking] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [busy, setBusy] = useState(false);
  const [planId, setPlanId] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const load = useCallback(() => joinStatus(gymId).then(setStatus).catch(() => setStatus(null)), [gymId]);
  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const submit = async () => {
    setBusy(true);
    setErrors({});
    try {
      const res = await submitJoinRequest(gymId, { planId: planId || undefined, notes });
      // Show the pending state at once; the status refetch then confirms it and fills in anything missing.
      setStatus((s) => s && { ...s, hasPending: true, canSend: false, pendingRequestId: res.requestId || s.pendingRequestId });
      toast(res.message || `Request sent to ${gymName}`);
      setAsking(false);
      setNotes("");
      setPlanId("");
      void load();
    } catch (e) {
      const fields = e instanceof ApiError ? e.fieldErrors() : {};
      setErrors({
        plan: fields.interested_plan_id ?? "",
        notes: fields.notes ?? "",
        form: fields.interested_plan_id || fields.notes ? "" : e instanceof ApiError ? e.message : "Couldn't send that request.",
      });
      // A refusal usually means the state changed underneath us (requests switched off, already a member).
      if (e instanceof ApiError && (e.status === 403 || e.status === 409)) void load();
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    const id = status?.pendingRequestId;
    setCancelling(false);
    if (!id) return;
    setBusy(true);
    try {
      await cancelJoinRequest(id);
      toast("Request withdrawn");
    } catch (e) {
      toast(e instanceof ApiError
        ? e.status === 409 || e.status === 404 ? "That request has already been answered." : e.message
        : "Couldn't withdraw that request.");
    } finally {
      setBusy(false);
      void load();
    }
  };

  // Signed out, blocked, or the status couldn't be read: offer nothing rather than a button that must fail.
  if (!status || status.isBlocked) return null;

  if (status.isMember) return <Pill tone="green"><LuBadgeCheck size={14} className="mr-1 inline" />You&apos;re a member</Pill>;

  if (status.hasPending) {
    return (
      <>
        <span className="inline-flex flex-wrap items-center gap-2">
          <Pill tone="amber"><LuClock size={14} className="mr-1 inline" />Request pending</Pill>
          {status.pendingRequestId && <button className="text-[13px] font-semibold text-primary disabled:opacity-50" disabled={busy} onClick={() => setCancelling(true)}>Cancel request</button>}
        </span>
        <ConfirmModal open={cancelling} title="Withdraw your request?" confirmLabel="Withdraw" onClose={() => setCancelling(false)}
          body={<>{gymName} will no longer see your request to join. You can ask again later.</>} onConfirm={() => void cancel()} />
      </>
    );
  }

  if (!status.canSend) {
    return <span className="text-[13px] text-muted">{status.whoCanSend === "no_one" ? "This gym isn't taking joining requests." : "You can't request to join this gym."}</span>;
  }

  return (
    <>
      <MotionButton className={btnGhost} onClick={() => { setErrors({}); setAsking(true); }}><LuUserPlus size={17} />Request to join</MotionButton>
      {asking && (
        <Modal open title={`Request to join ${gymName}`} onClose={() => setAsking(false)}
          footer={<><MotionButton className={btnGhost} onClick={() => setAsking(false)} disabled={busy}><LuX size={17} />Cancel</MotionButton>
            <MotionButton className={btnPrimary} onClick={submit} disabled={busy}><LuSend size={17} />{busy ? "Sending…" : "Send request"}</MotionButton></>}>
          <p className="text-muted">The gym&apos;s team reviews your request and sets up your membership if they accept. Your name and contact details are shared with them.</p>
          {plans.length > 0 && (
            <div>
              <label htmlFor="jr-plan" className={label}>Plan you&apos;re interested in <span className="font-normal text-muted">(optional)</span></label>
              <Select id="jr-plan" value={planId} onChange={(e) => setPlanId(e.target.value)}>
                <option value="">Not sure yet</option>
                {plans.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.price}</option>)}
              </Select>
              {errors.plan && <p className={errorText}>{errors.plan}</p>}
            </div>
          )}
          <div>
            <label htmlFor="jr-notes" className={label}>Message <span className="font-normal text-muted">(optional)</span></label>
            <textarea id="jr-notes" value={notes} maxLength={NOTES_MAX} onChange={(e) => setNotes(e.target.value)} placeholder="Anything the gym should know — goals, preferred times…"
              className="min-h-[96px] w-full resize-y rounded-[10px] border border-line px-3.5 py-3 outline-none focus:border-primary focus:ring-3 focus:ring-primary-50" />
            {errors.notes ? <p className={errorText}>{errors.notes}</p> : notes.length > NOTES_MAX - 100 && <p className={hint}>{NOTES_MAX - notes.length} characters left</p>}
          </div>
          {errors.form && <p role="alert" className={errorText}>{errors.form}</p>}
        </Modal>
      )}
    </>
  );
}
