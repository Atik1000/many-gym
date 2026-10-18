"use client";

import { MotionButton } from "@/components/ui/Motion";
import Link from "next/link";
import { useMemo, useState } from "react";
import { LuEllipsis as MoreHorizontal, LuPlus as Plus, LuSearch as Search, LuX as X } from "react-icons/lu";
import { useToast } from "@/components/ui/Toast";
import { Avatar, ConfirmModal, Pagination, Pill, Select, usePaged } from "@/components/ui/parts";
import { MEMBERS_KEY, type Member } from "@/lib/members";
import { DEFAULT_ROLES, PEOPLE_KEY, ROLES_KEY, displayName, isValidEmail, type Person, type Role } from "@/lib/people";
import { uid } from "@/lib/id";
import { useResource } from "@/lib/api";
import { btnGhost, btnPrimary, card, errorText, hint, input, label } from "@/lib/ui";
import RolesTab from "./RolesTab";
import { useAuth } from "@/components/AuthProvider";

export default function PeoplePage() {
  const toast = useToast();
  const { can } = useAuth();
  const [people, setPeople, ready] = useResource<Person>(PEOPLE_KEY);
  const [roles, setRoles] = useResource<Role>(ROLES_KEY);
  const [members] = useResource<Member>(MEMBERS_KEY);
  const [tab, setTab] = useState<"people" | "roles">("people");
  const [q, setQ] = useState(""); const [roleF, setRoleF] = useState("all"); const [statusF, setStatusF] = useState("all");
  const [inviting, setInviting] = useState(false);
  const [email, setEmail] = useState(""); const [roleId, setRoleId] = useState("trainer"); const [err, setErr] = useState("");
  const [menu, setMenu] = useState<string | null>(null);
  const [removing, setRemoving] = useState<Person | null>(null);
  const [changing, setChanging] = useState<Person | null>(null);
  const [link, setLink] = useState<{ email: string; url: string } | null>(null);

  const roleName = (id: string) => roles.find((r) => r.id === id)?.name ?? "Unknown role";
  const assigned = useMemo(() => { const m = new Map<string, number>(); members.forEach((x) => x.trainerId && m.set(x.trainerId, (m.get(x.trainerId) ?? 0) + 1)); return m; }, [members]);
  const shown = people.filter((p) => (roleF === "all" || p.roleId === roleF) && (statusF === "all" || p.status === statusF) && `${p.name} ${p.email}`.toLowerCase().includes(q.trim().toLowerCase()));
  const pg = usePaged(shown, 8, `${roleF}|${statusF}|${q}`);
  const custom = roles.filter((r) => !r.builtIn);

  // No email service: the inviter gets a one-time link to send. (In this front-end demo the link's code is the person's id.)
  const makeLink = (p: Pick<Person, "id" | "email">) => setLink({ email: p.email, url: `${window.location.origin}/accept?code=${p.id}` });
  const invite = () => {
    if (!isValidEmail(email)) return setErr("Enter a valid email address");
    if (people.some((p) => p.email.toLowerCase() === email.trim().toLowerCase())) return setErr("This person is already on your team");
    const person: Person = { id: uid(), name: "", email: email.trim(), roleId, status: "invited" };
    setPeople((l) => [...l, person]);
    makeLink(person);
    toast(`${email.trim()} invited`); setEmail(""); setErr(""); setInviting(false);
  };
  const lastAdmin = (p: Person) => p.roleId === "administrator" && people.filter((x) => x.roleId === "administrator" && x.status === "active").length <= 1;

  return (
    <>
      {link && (
        <div className="mb-4 rounded-xl border border-line bg-primary-50 p-4">
          <p className="mb-1.5 font-semibold">Invitation link for {link.email}</p>
          <div className="flex gap-2">
            <input readOnly aria-label="Invitation link" className={`${input} font-mono text-[13px]`} value={link.url} onFocus={(e) => e.currentTarget.select()} />
            <MotionButton className={btnGhost} onClick={() => { void navigator.clipboard?.writeText(link.url).then(() => toast("Link copied"), () => toast("Press ⌘C to copy")); }}>Copy</MotionButton>
            <MotionButton className={btnGhost} aria-label="Dismiss" onClick={() => setLink(null)}><X size={16} /></MotionButton>
          </div>
          <p className={hint}>Single use. Send it to them yourself — there&apos;s no email service connected yet.</p>
        </div>
      )}
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-[28px] font-bold tracking-tight">People &amp; Roles</h2>
        {tab === "people" && can("Invite/add people") && <MotionButton className={btnPrimary} onClick={() => setInviting(true)}><Plus size={18} />Invite Person</MotionButton>}
      </div>
      <div className={card}>
        <div className="flex gap-1 border-b border-line px-3">
          {(["people", "roles"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`border-b-2 px-5 py-3.5 font-semibold capitalize ${tab === t ? "border-primary text-primary" : "border-transparent text-muted"}`}>{t}</button>
          ))}
        </div>

        {tab === "roles" ? (!ready ? <p className="p-10 text-center text-muted">Loading…</p> : <RolesTab roles={roles} setRoles={setRoles} people={people} />) : (
          <div className="grid items-start gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div>
              <div className="mb-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_190px_170px]">
                <label className="relative"><Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                  <input className={`${input} pl-10`} placeholder="Search name or email…" value={q} onChange={(e) => setQ(e.target.value)} /></label>
                <Select aria-label="Role" value={roleF} onChange={(e) => setRoleF(e.target.value)}><option value="all">All Roles</option>{roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</Select>
                <Select aria-label="Status" value={statusF} onChange={(e) => setStatusF(e.target.value)}><option value="all">All Statuses</option><option value="active">Active</option><option value="invited">Invited</option></Select>
              </div>
              <div className="overflow-x-auto rounded-xl border border-line">
                <table className="w-full min-w-[640px] text-left">
                  <thead className="bg-background text-muted"><tr>{["Person", "Role", "Status", "Assigned Members", "Actions"].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
                  <tbody>
                    {!ready && <tr><td colSpan={5} className="p-8 text-center text-muted">Loading…</td></tr>}
                    {ready && shown.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted">No people match your filters.</td></tr>}
                    {pg.view.map((p) => (
                      <tr key={p.id} className="border-t border-line">
                        <td className="px-4 py-3"><div className="flex items-center gap-3"><Avatar name={p.name || p.email} /><div><b className="block">{displayName(p)}</b><span className="text-muted">{p.email}</span></div></div></td>
                        <td className="px-4"><Pill tone={p.roleId === "trainer" ? "purple" : "gray"}>{roleName(p.roleId)}</Pill></td>
                        <td className="px-4"><Pill tone={p.status === "active" ? "green" : "amber"}>{p.status === "active" ? "Active" : "Invited"}</Pill></td>
                        <td className="px-4">{p.roleId === "trainer" && assigned.get(p.id) ? <Link href={`/members?trainer=${p.id}`} className="font-semibold text-primary">{assigned.get(p.id)} members</Link> : "—"}</td>
                        <td className="px-4">
                          {p.status === "invited" && can("Invite/add people") && <MotionButton className={`${btnGhost} mr-2 !px-3 !py-1.5 !text-primary`} onClick={() => makeLink(p)}>Invite link</MotionButton>}
                          {(can("Edit people") || can("Remove people")) && <span className="relative inline-block">
                            <button aria-label={`Actions for ${displayName(p)}`} onClick={() => setMenu(menu === p.id ? null : p.id)} className="rounded-lg p-1.5 text-muted hover:bg-background"><MoreHorizontal size={18} /></button>
                            {menu === p.id && (<>
                              <div className="fixed inset-0 z-10" onClick={() => setMenu(null)} />
                              <div className="absolute right-0 top-9 z-20 min-w-[170px] rounded-[10px] border border-line bg-surface p-1.5 shadow-xl">
                                {can("Edit people") && <button className="block w-full rounded-lg px-3 py-2 text-left hover:bg-background" onClick={() => { setChanging(p); setMenu(null); }}>Change role</button>}
                                {can("Remove people") && <button className="block w-full rounded-lg px-3 py-2 text-left text-bad hover:bg-background" onClick={() => { setRemoving(p); setMenu(null); }}>Remove</button>}
                              </div>
                            </>)}
                          </span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="border-t border-line"><Pagination {...pg} noun="people" /></div>
              </div>
            </div>

            <div className="grid gap-5">
              {inviting && (
                <section className="rounded-xl border border-line p-5">
                  <div className="mb-4 flex items-center justify-between"><h3 className="text-xl font-bold">Invite Person</h3><button aria-label="Close" onClick={() => setInviting(false)} className="text-muted"><X size={20} /></button></div>
                  <label htmlFor="iemail" className={label}>Email <span className="text-bad">*</span></label>
                  <input id="iemail" type="email" className={input} value={email} onChange={(e) => { setEmail(e.target.value); setErr(""); }} placeholder="jordan@example.com" />
                  {err && <p className={errorText}>{err}</p>}
                  <label htmlFor="irole" className={`${label} mt-4`}>Role <span className="text-bad">*</span></label>
                  <Select id="irole" value={roleId} onChange={(e) => setRoleId(e.target.value)}>
                    <optgroup label="Default Roles">{DEFAULT_ROLES.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</optgroup>
                    {custom.length > 0 && <optgroup label="Custom Roles">{custom.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</optgroup>}
                  </Select>
                  <p className={hint}>You&apos;ll get a one-time link to send them. Status remains Invited until they set a password.</p>
                  <div className="mt-4 grid grid-cols-2 gap-3"><MotionButton className={btnGhost} onClick={() => setInviting(false)}>Cancel</MotionButton><MotionButton className={btnPrimary} onClick={invite}>Send Invitation</MotionButton></div>
                </section>
              )}
              <section className="flex items-center justify-between rounded-xl border border-line p-5">
                <div><h3 className="text-lg font-bold">Manage Roles</h3><p className="text-muted">{DEFAULT_ROLES.length} default roles · {custom.length} custom role{custom.length === 1 ? "" : "s"}</p></div>
                <MotionButton className={btnGhost} onClick={() => setTab("roles")}>View Roles</MotionButton>
              </section>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal open={!!removing} title="Remove person?" confirmLabel="Remove" onClose={() => setRemoving(null)}
        body={removing && lastAdmin(removing)
          ? <>{displayName(removing)} is the only active Administrator. Assign another Administrator before removing them.</>
          : <>{removing && displayName(removing)} will lose access to this gym.{removing && (assigned.get(removing.id) ?? 0) > 0 ? ` Their ${assigned.get(removing.id)} assigned members will become unassigned.` : ""}</>}
        onConfirm={() => { if (removing && !lastAdmin(removing)) { setPeople((l) => l.filter((x) => x.id !== removing.id)); toast("Person removed"); } setRemoving(null); }} />

      {changing && (
        <ConfirmModal open title={`Change role for ${displayName(changing)}`} confirmLabel="Save" danger={false} onClose={() => setChanging(null)}
          body={<Select aria-label="New role" defaultValue={changing.roleId} id="newrole">{roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</Select>}
          onConfirm={() => {
            const v = (document.getElementById("newrole") as HTMLSelectElement).value;
            if (lastAdmin(changing) && v !== "administrator") { toast("Keep at least one active Administrator"); return; }
            setPeople((l) => l.map((x) => (x.id === changing.id ? { ...x, roleId: v } : x))); setChanging(null); toast("Role updated");
          }} />
      )}
    </>
  );
}
