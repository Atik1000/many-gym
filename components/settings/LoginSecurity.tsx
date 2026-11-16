"use client";

/**
 * Login & Security — `GET /users/settings/security/` and the routes under it (contact info, change password,
 * two-factor, signed-in devices), plus the account lifecycle at `POST /users/settings/access-control/`.
 *
 * Each block saves on its own: they are separate endpoints, and a failed phone number shouldn't hold a
 * password change hostage.
 */
import { useCallback, useEffect, useState } from "react";
import { LuKeyRound, LuLaptop, LuMail, LuMonitorSmartphone, LuSave, LuShieldCheck, LuSmartphone, LuTrash2, LuTriangleAlert, LuX } from "react-icons/lu";
import { useAuth } from "@/components/AuthProvider";
import Modal from "@/components/ui/Modal";
import { MotionButton } from "@/components/ui/Motion";
import PasswordInput from "@/components/ui/PasswordInput";
import { ConfirmModal, Pill } from "@/components/ui/parts";
import { useToast } from "@/components/ui/Toast";
import { ApiError } from "@/lib/api/http";
import * as security from "@/lib/api/security";
import { MIN_PASSWORD, deviceName } from "@/lib/auth";
import { btnGhost, btnPrimary, card, errorText, hint, input, label } from "@/lib/ui";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const message = (e: unknown, fallback: string) => (e instanceof ApiError ? e.message : fallback);
const when = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
};

function Switch({ checked, disabled, onChange, labelledBy }: { checked: boolean; disabled?: boolean; onChange: (v: boolean) => void; labelledBy: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-labelledby={labelledBy} disabled={disabled} onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${checked ? "bg-primary" : "bg-line"}`}>
      <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : ""}`} />
    </button>
  );
}

export default function LoginSecurity() {
  const toast = useToast();
  const { logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [contact, setContact] = useState<security.ContactInfo | null>(null);
  const [status, setStatus] = useState<Partial<security.AccountStatus>>({});
  const [twoFactor, setTwoFactor] = useState(false);
  const [maxDevices, setMaxDevices] = useState(security.MAX_DEVICES);
  const [devices, setDevices] = useState<security.UserDevice[] | null>(null);

  // contact form
  const [secondary, setSecondary] = useState("");
  const [phone, setPhone] = useState("");
  const [contactErr, setContactErr] = useState<Record<string, string>>({});
  const [savingContact, setSavingContact] = useState(false);

  // password form
  const [current, setCurrent] = useState(""); const [next, setNext] = useState(""); const [again, setAgain] = useState("");
  const [pwErr, setPwErr] = useState<Record<string, string>>({});
  const [savingPw, setSavingPw] = useState(false);

  const [togglingTwoFactor, setTogglingTwoFactor] = useState(false);
  const [removing, setRemoving] = useState<security.UserDevice | null>(null);

  // lifecycle
  const [deactivating, setDeactivating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [lifePassword, setLifePassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [lifeErr, setLifeErr] = useState("");
  const [lifeBusy, setLifeBusy] = useState(false);

  const loadDevices = useCallback(
    () => security.devices().then((rows) => setDevices(Array.isArray(rows) ? rows : [])).catch(() => setDevices([])),
    [],
  );

  useEffect(() => {
    let live = true;
    security.overview()
      .then((o) => {
        if (!live) return;
        const c = o.contact_info ?? { primary_email: "", secondary_email: null, phone: null };
        setContact(c); setSecondary(c.secondary_email ?? ""); setPhone(c.phone ?? "");
        setTwoFactor(!!o.two_factor_enabled);
        setStatus(o.account_status ?? {});
        if (typeof o.max_devices === "number" && o.max_devices > 0) setMaxDevices(o.max_devices);
      })
      .catch(() => live && setFailed(true))
      .finally(() => live && setLoading(false));
    void loadDevices();
    return () => { live = false; };
  }, [loadDevices]);

  // ---------------------------------------------------------------- contact info

  const contactDirty = !!contact && (secondary.trim() !== (contact.secondary_email ?? "") || phone.trim() !== (contact.phone ?? ""));
  const saveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contact) return;
    const s = secondary.trim(); const p = phone.trim();
    const errs: Record<string, string> = {};
    if (s && !EMAIL.test(s)) errs.secondary_email = "Enter a valid email address";
    else if (s && s.toLowerCase() === contact.primary_email.toLowerCase()) errs.secondary_email = "Use a different address from your primary email";
    if (p.length > 50) errs.phone = "Use 50 characters or fewer";
    setContactErr(errs);
    if (Object.keys(errs).length) return;
    setSavingContact(true);
    try {
      // Only what changed is sent, and never `primary_email` — the API answers 400 if it is present at all.
      const patch: { secondary_email?: string | null; phone?: string | null } = {};
      if (s !== (contact.secondary_email ?? "")) patch.secondary_email = s || null;
      if (p !== (contact.phone ?? "")) patch.phone = p || null;
      const saved = await security.updateContactInfo(patch);
      const merged = { ...contact, ...saved };
      setContact(merged); setSecondary(merged.secondary_email ?? ""); setPhone(merged.phone ?? "");
      toast("Contact info updated");
    } catch (err) {
      const fields = err instanceof ApiError ? err.fieldErrors() : {};
      setContactErr(fields.secondary_email || fields.phone ? fields : { form: fields.primary_email ?? message(err, "Couldn't save your contact info.") });
    } finally {
      setSavingContact(false);
    }
  };

  // ---------------------------------------------------------------- password

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (next.length < MIN_PASSWORD) errs.new_password = `Use at least ${MIN_PASSWORD} characters`;
    if (next !== again) errs.confirm_password = "The new passwords don't match";
    setPwErr(errs);
    if (Object.keys(errs).length) return;
    setSavingPw(true);
    try {
      await security.changePassword(current, next, again);
      setCurrent(""); setNext(""); setAgain("");
      toast("Password changed");
    } catch (err) {
      const fields = err instanceof ApiError ? err.fieldErrors() : {};
      const known = fields.current_password || fields.new_password || fields.confirm_password;
      setPwErr(known ? fields : { form: fields.non_field_errors ?? message(err, "Couldn't change your password.") });
    } finally {
      setSavingPw(false);
    }
  };

  // ---------------------------------------------------------------- two-factor

  const toggleTwoFactor = async (on: boolean) => {
    setTogglingTwoFactor(true);
    setTwoFactor(on); // optimistic
    try {
      const res = await security.setTwoFactor(on);
      setTwoFactor(!!res?.two_factor_enabled);
      toast(res?.two_factor_enabled ? "Two-factor authentication is on" : "Two-factor authentication is off");
    } catch (err) {
      setTwoFactor(!on);
      toast(message(err, "Couldn't change two-factor authentication"));
    } finally {
      setTogglingTwoFactor(false);
    }
  };

  // ---------------------------------------------------------------- devices

  const removeDevice = async () => {
    const d = removing;
    if (!d) return;
    setRemoving(null);
    try {
      await security.removeDevice(d.device_id || d.id);
    } catch (err) {
      toast(message(err, "Couldn't remove that device"));
      if (err instanceof ApiError && err.status === 404) void loadDevices(); // already gone — show the real list
      return;
    }
    if (d.is_current_device) {
      // This browser's own session was just revoked server-side; finish the job locally.
      toast("This device was signed out");
      logout();
      return;
    }
    toast("Device removed");
    setDevices((list) => (list ?? []).filter((x) => x.id !== d.id));
  };

  // ---------------------------------------------------------------- lifecycle

  const closeLifecycle = () => { setDeactivating(false); setDeleting(false); setRestoring(false); setLifePassword(""); setConfirmation(""); setLifeErr(""); };

  /** Runs a lifecycle action; returns the problem, or null on success. It is also kept for the open dialog. */
  const act = async (action: security.LifecycleAction, extra?: { password?: string; confirmation?: string }) => {
    setLifeBusy(true); setLifeErr("");
    try {
      const res = await security.lifecycle(action, extra);
      setStatus((s) => ({
        ...s,
        is_deactivated: !!res?.is_deactivated, deactivated_at: res?.deactivated_at ?? null,
        is_deleted: !!res?.is_deleted, deleted_at: res?.deleted_at ?? null, delete_pending: !!res?.is_deleted,
      }));
      return null;
    } catch (err) {
      const fields = err instanceof ApiError ? err.fieldErrors() : {};
      const problem = fields.password ?? fields.confirmation ?? fields.non_field_errors ?? message(err, "That didn't work. Try again.");
      setLifeErr(problem);
      return problem;
    } finally {
      setLifeBusy(false);
    }
  };

  const deactivate = async () => {
    const problem = await act("deactivate");
    if (problem) { closeLifecycle(); toast(problem); return; }
    closeLifecycle(); toast("Account deactivated"); logout();
  };
  const requestDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await act("delete", { password: lifePassword, confirmation: "delete" })) return;
    closeLifecycle(); toast("Account scheduled for deletion"); logout();
  };
  const restore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await act("restore", { password: lifePassword })) return;
    closeLifecycle(); toast("Deletion cancelled — your account is staying");
  };
  const reactivate = async () => {
    toast((await act("reactivate")) ?? "Account reactivated");
  };

  if (loading) return <section className={`${card} h-[300px] animate-pulse`} />;
  if (failed || !contact) {
    return (
      <section className={`${card} p-6`}>
        <h2 className="text-lg font-bold">Login &amp; security</h2>
        <p className="mt-1 text-muted">Couldn&apos;t load your security settings. Reload the page to try again.</p>
      </section>
    );
  }

  const deletePending = !!(status.delete_pending || status.is_deleted);
  const hasFallback = !!(contact.secondary_email || contact.phone);
  const deviceCount = devices?.length ?? 0;

  return (
    <div className="grid gap-5">
      {(deletePending || status.is_deactivated) && (
        <section role="status" className="rounded-xl border border-warn/40 bg-warn-bg p-5 text-warn">
          <h2 className="flex items-center gap-2 text-lg font-bold"><LuTriangleAlert size={18} />{deletePending ? "This account is scheduled for deletion" : "This account is deactivated"}</h2>
          <p className="mt-1">
            {deletePending
              ? <>Deletion was requested{status.deleted_at ? <> on {when(status.deleted_at)}</> : null}. It becomes permanent 24 hours after the request unless it is cancelled.</>
              : <>It was deactivated{status.deactivated_at ? <> on {when(status.deactivated_at)}</> : null}.</>}
          </p>
          {deletePending
            ? <MotionButton className={`${btnGhost} mt-3`} onClick={() => { closeLifecycle(); setRestoring(true); }}>Cancel deletion</MotionButton>
            : <MotionButton className={`${btnGhost} mt-3`} disabled={lifeBusy} onClick={() => void reactivate()}>Reactivate account</MotionButton>}
        </section>
      )}

      <section className={`${card} p-6`}>
        <h2 className="flex items-center gap-2 text-lg font-bold"><LuMail size={18} />Contact info</h2>
        <p className={hint}>Where sign-in codes and account recovery messages can reach you.</p>
        <form onSubmit={saveContact} className="mt-4" noValidate>
          <label htmlFor="ls-primary" className={label}>Primary email</label>
          <input id="ls-primary" className={input} value={contact.primary_email} disabled readOnly aria-describedby="ls-primary-hint" />
          <p id="ls-primary-hint" className={hint}>This is the email you sign in with. It can&apos;t be changed or removed.</p>

          <label htmlFor="ls-secondary" className={`${label} mt-4`}>Secondary email <span className="font-normal text-muted">(optional)</span></label>
          <input id="ls-secondary" type="email" autoComplete="email" className={input} value={secondary} placeholder="backup@example.com"
            aria-invalid={!!contactErr.secondary_email} onChange={(e) => { setSecondary(e.target.value); setContactErr({}); }} />
          {contactErr.secondary_email ? <p role="alert" className={errorText}>{contactErr.secondary_email}</p> : <p className={hint}>A backup address. Leave empty to remove it.</p>}

          <label htmlFor="ls-phone" className={`${label} mt-4`}>Phone <span className="font-normal text-muted">(optional)</span></label>
          <input id="ls-phone" type="tel" autoComplete="tel" maxLength={50} className={input} value={phone} placeholder="+14155552671"
            aria-invalid={!!contactErr.phone} onChange={(e) => { setPhone(e.target.value); setContactErr({}); }} />
          {contactErr.phone ? <p role="alert" className={errorText}>{contactErr.phone}</p> : <p className={hint}>Used for text-message codes. Leave empty to remove it.</p>}

          {contactErr.form && <p role="alert" className={`${errorText} mt-3`}>{contactErr.form}</p>}
          <MotionButton type="submit" className={`${btnPrimary} mt-4`} disabled={!contactDirty || savingContact}><LuSave size={17} />{savingContact ? "Saving…" : "Save contact info"}</MotionButton>
        </form>
      </section>

      <section className={`${card} p-6`}>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold"><LuKeyRound size={18} />Change password</h2>
        <form onSubmit={savePassword} noValidate>
          <label htmlFor="ls-cp" className={label}>Current password</label>
          <PasswordInput id="ls-cp" value={current} onChange={(v) => { setCurrent(v); setPwErr({}); }} />
          {pwErr.current_password && <p role="alert" className={errorText}>{pwErr.current_password}</p>}
          <label htmlFor="ls-np" className={`${label} mt-4`}>New password</label>
          <PasswordInput id="ls-np" autoComplete="new-password" value={next} onChange={(v) => { setNext(v); setPwErr({}); }} />
          {pwErr.new_password ? <p role="alert" className={errorText}>{pwErr.new_password}</p> : <p className={hint}>At least {MIN_PASSWORD} characters.</p>}
          <label htmlFor="ls-rp" className={`${label} mt-4`}>Repeat new password</label>
          <PasswordInput id="ls-rp" autoComplete="new-password" value={again} onChange={(v) => { setAgain(v); setPwErr({}); }} />
          {pwErr.confirm_password && <p role="alert" className={errorText}>{pwErr.confirm_password}</p>}
          {pwErr.form && <p role="alert" className={`${errorText} mt-3`}>{pwErr.form}</p>}
          <MotionButton type="submit" className={`${btnPrimary} mt-4`} disabled={savingPw || !current || !next || !again}><LuKeyRound size={17} />{savingPw ? "Changing…" : "Change password"}</MotionButton>
        </form>
      </section>

      <section className={`${card} p-6`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="ls-2fa" className="flex items-center gap-2 text-lg font-bold"><LuShieldCheck size={18} />Two-factor authentication</h2>
            <p className="mt-1 text-muted">Ask for a 6-digit code as well as your password every time you sign in.</p>
          </div>
          <span className="flex items-center gap-2.5 pt-1">
            <Pill tone={twoFactor ? "green" : "gray"}>{twoFactor ? "On" : "Off"}</Pill>
            <Switch checked={twoFactor} disabled={togglingTwoFactor} onChange={(v) => void toggleTwoFactor(v)} labelledBy="ls-2fa" />
          </span>
        </div>
        <p className="mt-4 font-semibold">Where the code is sent</p>
        <ol className="mt-1.5 grid list-decimal gap-1 pl-5 text-muted">
          <li>Your primary email, <span className="text-foreground">{contact.primary_email}</span>.</li>
          <li>If that can&apos;t be delivered, your secondary email{contact.secondary_email ? <>, <span className="text-foreground">{contact.secondary_email}</span></> : " (not set)"}.</li>
          <li>If that fails too, a text message to your phone{contact.phone ? <>, <span className="text-foreground">{contact.phone}</span></> : " (not set)"}.</li>
        </ol>
        {!hasFallback && (
          <p className="mt-3 rounded-xl bg-warn-bg px-4 py-3 text-warn">
            You have no backup. If a code can&apos;t reach your primary email you won&apos;t be able to sign in — add a secondary email or phone under Contact info.
          </p>
        )}
      </section>

      <section className={`${card} p-6`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-lg font-bold"><LuMonitorSmartphone size={18} />Logged-in devices</h2>
          {devices && <Pill tone={deviceCount >= maxDevices ? "amber" : "gray"}>{deviceCount} of {maxDevices}</Pill>}
        </div>
        <p className={hint}>Up to {maxDevices} devices can be signed in at once. Signing in on another one signs out the device that has been signed in longest.</p>
        {devices === null ? <div className="mt-4 h-20 animate-pulse rounded-xl bg-background" /> : devices.length === 0 ? (
          <p className="py-6 text-center text-muted">No devices are listed for this account.</p>
        ) : (
          <ul className="mt-4 grid gap-2">
            {devices.map((d) => {
              const summary = deviceName(d.user_agent);
              const Icon = /iOS|Android/.test(summary) ? LuSmartphone : LuLaptop;
              const title = d.device_name || summary;
              return (
                <li key={d.id} className="flex items-center gap-3 rounded-xl bg-background px-3 py-2.5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface text-muted"><Icon size={19} /></span>
                  <span className="min-w-0 flex-1">
                    <b className="flex flex-wrap items-center gap-2"><span className="truncate">{title}</span>{d.is_current_device && <Pill tone="green">This device</Pill>}</b>
                    <span className="block truncate text-[13px] text-muted" title={d.user_agent}>
                      {[summary !== title && summary !== "Web browser" ? summary : "", d.ip_address ?? "", `Last sign-in ${when(d.last_login)}`].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <button aria-label={`Remove ${title}`} title="Remove device" onClick={() => setRemoving(d)} className="rounded-lg p-2 text-bad hover:bg-surface"><LuTrash2 size={17} /></button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className={`${card} p-6`}>
        <h2 className="flex items-center gap-2 text-lg font-bold"><LuTriangleAlert size={18} />Account</h2>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="min-w-[220px] flex-1"><b className="block">Deactivate account</b><span className="text-muted">Take a break. Signing in again reactivates your account straight away.</span></span>
          <MotionButton className={btnGhost} disabled={!!status.is_deactivated} onClick={() => { closeLifecycle(); setDeactivating(true); }}>Deactivate</MotionButton>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-4">
          <span className="min-w-[220px] flex-1"><b className="block">Delete account</b><span className="text-muted">Permanent after 24 hours. Signing in again within that time cancels the deletion.</span></span>
          <button className="rounded-[10px] border border-bad/40 px-4 py-2 font-semibold text-bad hover:bg-bad-bg disabled:opacity-50" disabled={deletePending} onClick={() => { closeLifecycle(); setDeleting(true); }}>Delete account</button>
        </div>
      </section>

      <ConfirmModal open={!!removing} title={removing?.is_current_device ? "Sign out of this device?" : "Remove device?"} confirmLabel={removing?.is_current_device ? "Sign out" : "Remove"} onClose={() => setRemoving(null)}
        body={removing?.is_current_device
          ? <>This is the device you&apos;re using now. You&apos;ll be signed out here, and this device&apos;s encryption key will be cleared — encrypted messages sent to it can no longer be read on it.</>
          : <><b>{removing?.device_name || "This device"}</b> will be signed out, and its encryption key will be cleared — encrypted messages sent to it can no longer be read on it.</>}
        onConfirm={() => void removeDevice()} />

      <ConfirmModal open={deactivating} title="Deactivate your account?" confirmLabel={lifeBusy ? "Deactivating…" : "Deactivate"} onClose={closeLifecycle}
        body={<>You&apos;ll be signed out now. Nothing is deleted — sign in again whenever you like and your account is reactivated automatically.</>}
        onConfirm={() => { if (!lifeBusy) void deactivate(); }} />

      <Modal open={deleting} title="Delete your account?" onClose={closeLifecycle}>
        <form onSubmit={requestDelete} className="flex flex-col gap-3.5">
          <p>
            You&apos;ll be signed out now and your account is deleted for good <b>24 hours</b> from now. If you sign in again within those 24 hours, the deletion is cancelled and everything stays as it is. After that, it can&apos;t be undone.
          </p>
          <div>
            <label htmlFor="ls-del-pw" className={label}>Your password</label>
            <PasswordInput id="ls-del-pw" autoFocus value={lifePassword} onChange={(v) => { setLifePassword(v); setLifeErr(""); }} />
          </div>
          <div>
            <label htmlFor="ls-del-confirm" className={label}>Type <b>delete</b> to confirm</label>
            <input id="ls-del-confirm" className={input} autoComplete="off" autoCapitalize="none" spellCheck={false} value={confirmation} onChange={(e) => { setConfirmation(e.target.value); setLifeErr(""); }} />
          </div>
          {lifeErr && <p role="alert" className={errorText}>{lifeErr}</p>}
          <div className="flex justify-end gap-2.5 border-t border-line pt-3.5">
            <MotionButton type="button" className={btnGhost} onClick={closeLifecycle}><LuX size={17} />Cancel</MotionButton>
            <button type="submit" disabled={lifeBusy || !lifePassword || confirmation.trim() !== "delete"} className="rounded-[10px] bg-bad px-4 py-2 font-semibold text-white disabled:opacity-50">{lifeBusy ? "Deleting…" : "Delete account"}</button>
          </div>
        </form>
      </Modal>

      <Modal open={restoring} title="Cancel account deletion" onClose={closeLifecycle}>
        <form onSubmit={restore} className="flex flex-col gap-3.5">
          <p>Enter your password to keep your account.</p>
          <div>
            <label htmlFor="ls-res-pw" className={label}>Your password</label>
            <PasswordInput id="ls-res-pw" autoFocus value={lifePassword} onChange={(v) => { setLifePassword(v); setLifeErr(""); }} />
          </div>
          {lifeErr && <p role="alert" className={errorText}>{lifeErr}</p>}
          <div className="flex justify-end gap-2.5 border-t border-line pt-3.5">
            <MotionButton type="button" className={btnGhost} onClick={closeLifecycle}><LuX size={17} />Close</MotionButton>
            <MotionButton type="submit" className={btnPrimary} disabled={lifeBusy || !lifePassword}>{lifeBusy ? "Restoring…" : "Keep my account"}</MotionButton>
          </div>
        </form>
      </Modal>
    </div>
  );
}
