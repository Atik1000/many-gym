"use client";

import { MotionButton } from "@/components/ui/Motion";
import { useState } from "react";
import { LuChartColumn as ChartColumn, LuCreditCard as CreditCard, LuFileText as FileText, LuHouse as Home, LuPlus as Plus, LuShieldCheck as ShieldCheck, LuStore as Store, LuUserPlus as UserPlus, LuUsers as Users, LuChevronRight as ChevronRight, LuTrash2 as Trash2 } from "react-icons/lu";
import { useToast } from "@/components/ui/Toast";
import { ConfirmModal, MultiSelect, Pill } from "@/components/ui/parts";
import { PERMISSION_GROUPS, permCount, type Person, type Role } from "@/lib/people";
import { uid } from "@/lib/id";
import { btnGhost, btnPrimary, errorText, input, label } from "@/lib/ui";
import { useAuth } from "@/components/AuthProvider";

const ICON: Record<string, typeof Home> = { Studio: Home, Reports: ChartColumn, "Gym Profile": Store, "Membership Plans": CreditCard, Members: Users, Leads: UserPlus, "Routine Templates": FileText, "People & Roles": ShieldCheck };

export default function RolesTab({ roles, setRoles, people }: { roles: Role[]; setRoles: (f: (l: Role[]) => Role[]) => void; people: Person[] }) {
  const toast = useToast();
  const { can } = useAuth();
  const [sel, setSel] = useState<string | null>(roles.find((r) => !r.builtIn)?.id ?? roles[0]?.id ?? null);
  const [draft, setDraft] = useState<Role | null>(() => structuredClone(roles.find((r) => !r.builtIn) ?? roles[0] ?? null));
  const [err, setErr] = useState("");
  const [deleting, setDeleting] = useState(false);

  const open = (r: Role) => { setSel(r.id); setDraft(structuredClone(r)); setErr(""); };
  const create = () => { const r: Role = { id: "", name: "", builtIn: false, permissions: {} }; setSel("new"); setDraft(r); setErr(""); };
  const isNew = sel === "new";
  const inUse = draft ? people.filter((p) => p.roleId === draft.id).length : 0;
  // default roles are fixed; custom roles need Edit/Create roles
  const readOnly = !!draft?.builtIn || !can(isNew ? "Create roles" : "Edit roles");

  const save = () => {
    if (!draft) return;
    const name = draft.name.trim();
    if (!name) return setErr("Role name is required");
    if (roles.some((r) => r.id !== draft.id && r.name.toLowerCase() === name.toLowerCase())) return setErr("A role with this name already exists");
    const clean = Object.fromEntries(Object.entries(draft.permissions).filter(([, a]) => a.length));
    const saved = { ...draft, name, id: draft.id || uid(), permissions: clean };
    setRoles((l) => (l.some((r) => r.id === saved.id) ? l.map((r) => (r.id === saved.id ? saved : r)) : [...l, saved]));
    setSel(saved.id); setDraft(saved); setErr(""); toast(isNew ? "Role created" : "Role saved");
  };

  const defaults = roles.filter((r) => r.builtIn), customs = roles.filter((r) => !r.builtIn);
  return (
    <div className="p-5">
      <div className="mb-4 flex justify-end">{can("Create roles") && <MotionButton className={btnPrimary} onClick={create}><Plus size={18} />Create Role</MotionButton>}</div>
      <div className="grid items-start gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="rounded-xl border border-line p-4">
          <h3 className="mb-3 text-xl font-bold">Roles</h3>
          <p className="mb-1 text-muted">Default Roles</p>
          {defaults.map((r) => (
            <button key={r.id} onClick={() => open(r)} className={`flex w-full items-center justify-between rounded-lg px-3 py-3 text-left ${sel === r.id ? "bg-primary-50" : "hover:bg-background"}`}>
              <span><b className="block">{r.name}</b>{r.description && <span className="text-[13px] text-muted">{r.description}</span>}</span><Pill>Default</Pill>
            </button>
          ))}
          <p className="mb-1 mt-4 text-muted">Custom Roles</p>
          {customs.length === 0 && sel !== "new" && <p className="px-3 py-2 text-muted">No custom roles yet.</p>}
          {customs.map((r) => (
            <button key={r.id} onClick={() => open(r)} className={`flex w-full items-center justify-between rounded-lg px-3 py-3 text-left font-semibold ${sel === r.id ? "bg-primary-50 text-primary" : "hover:bg-background"}`}>
              {r.name}<ChevronRight size={17} />
            </button>
          ))}
          {sel === "new" && <div className="rounded-lg bg-primary-50 px-3 py-3 font-semibold text-primary">New role…</div>}
        </aside>

        {draft && (
          <section className="rounded-xl border border-line p-5">
            <h3 className="mb-3 text-xl font-bold">{draft.builtIn ? `${draft.name} (default role)` : isNew ? "Create Custom Role" : "Edit Custom Role"}</h3>
            {readOnly && <p className="mb-4 rounded-xl bg-background px-4 py-3 text-muted">{draft.builtIn ? "Default roles can't be changed. Create a custom role to set your own permissions." : "View only — your role can't edit roles."}</p>}
            <label htmlFor="rname" className={label}>Role Name <span className="text-bad">*</span></label>
            <input id="rname" className={input} value={draft.name} disabled={readOnly} onChange={(e) => { setDraft({ ...draft, name: e.target.value }); setErr(""); }} placeholder="e.g. Membership Manager" />
            {err && <p className={errorText}>{err}</p>}
            <h4 className="mb-3 mt-6 text-lg font-bold">Access Permissions <span className="ml-2 text-sm font-normal text-muted">{permCount(draft)} selected</span></h4>
            <div className="grid gap-3">
              {PERMISSION_GROUPS.map(({ group, actions }) => {
                const Icon = ICON[group] ?? Home;
                return (
                  <div key={group} className="grid items-start gap-2 md:grid-cols-[200px_minmax(0,1fr)]">
                    <span className="flex items-center gap-2.5 pt-2.5 font-semibold"><Icon size={20} className="text-primary" />{group}</span>
                    {readOnly
                      ? <div className="flex flex-wrap gap-1.5 pt-1.5">{(draft.permissions[group] ?? []).map((a) => <Pill key={a} tone="purple">{a}</Pill>)}{!(draft.permissions[group] ?? []).length && <span className="pt-1 text-muted">No access</span>}</div>
                      : <MultiSelect value={draft.permissions[group] ?? []} options={actions} placeholder="Select permissions" onChange={(v) => setDraft({ ...draft, permissions: { ...draft.permissions, [group]: v } })} />}
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-[13px] text-muted">Select specific actions for each permission group.</p>
            {!readOnly && (
              <div className="mt-6 flex items-center justify-between border-t border-line pt-4">
                {!isNew && can("Delete roles") ? <button className="inline-flex items-center gap-1.5 font-semibold text-bad" onClick={() => setDeleting(true)}><Trash2 size={16} />Delete role</button> : <span />}
                <div className="flex gap-3"><MotionButton className={btnGhost} onClick={() => { const r = roles.find((x) => x.id === sel); if (r) open(r); else { setSel(null); setDraft(null); } }}>Cancel</MotionButton><MotionButton className={btnPrimary} onClick={save}>Save Role</MotionButton></div>
              </div>
            )}
          </section>
        )}
      </div>

      <ConfirmModal open={deleting} title="Delete role?" confirmLabel="Delete" onClose={() => setDeleting(false)}
        body={inUse > 0 ? <>{inUse} {inUse === 1 ? "person has" : "people have"} this role. Move them to another role before deleting it.</> : <>“{draft?.name}” will be removed.</>}
        onConfirm={() => { if (inUse === 0 && draft) { setRoles((l) => l.filter((r) => r.id !== draft.id)); setSel(null); setDraft(null); toast("Role deleted"); } setDeleting(false); }} />
    </div>
  );
}
