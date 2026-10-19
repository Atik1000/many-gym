"use client";

import { EmptyState } from "@/components/ui/parts";
import { LuDumbbell } from "react-icons/lu";

import { MotionLink, Reveal } from "@/components/ui/Motion";
import Link from "next/link";
import { LuMail as Mail, LuUserPlus, LuUsers } from "react-icons/lu";
import { Avatar, Pagination, Pill, usePaged } from "@/components/ui/parts";
import { MEMBERS_KEY, fullName, memberStatus, type Member } from "@/lib/members";
import { PEOPLE_KEY, type Person } from "@/lib/people";
import { useResource } from "@/lib/api";
import { btnGhost, card } from "@/lib/ui";

export default function TrainersPage() {
  const [people, , ready] = useResource<Person>(PEOPLE_KEY);
  const [members] = useResource<Member>(MEMBERS_KEY);
  const trainers = people.filter((p) => p.roleId === "trainer");
  const pg = usePaged(trainers, 6);

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-[28px] font-bold tracking-tight">Trainers</h2><p className="text-muted">Trainers only see the members assigned to them.</p></div>
        <MotionLink href="/people" className={btnGhost}><LuUserPlus size={17} />Invite or manage people</MotionLink>
      </div>
      {!ready ? <div className={`${card} h-[240px] animate-pulse`} /> : trainers.length === 0 ? (
        <div className={`${card} p-10 text-center text-muted`}><EmptyState icon={LuDumbbell} title="No trainers yet" hint="Invite someone with the Trainer role from People & Roles." /></div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {pg.view.map((t, i) => {
            const mine = members.filter((m) => m.trainerId === t.id);
            const active = mine.filter((m) => memberStatus(m) === "active").length;
            return (
              <Reveal key={t.id} index={i}><section className={`${card} h-full p-5 transition-shadow hover:shadow-[0_14px_30px_-14px_rgba(20,20,43,.25)]`}>
                <div className="flex items-center gap-3">
                  <Avatar name={t.name || t.email} size={52} />
                  <div className="min-w-0"><b className="block truncate text-lg">{t.name || "Invitation pending"}</b><span className="flex items-center gap-1.5 truncate text-muted"><Mail size={14} />{t.email}</span></div>
                  <span className="ml-auto"><Pill tone={t.status === "active" ? "green" : "amber"}>{t.status === "active" ? "Active" : "Invited"}</Pill></span>
                </div>
                <div className="my-4 grid grid-cols-2 gap-3 text-center">
                  <div className="rounded-xl bg-background py-3"><b className="block text-2xl">{mine.length}</b><span className="text-muted">Assigned</span></div>
                  <div className="rounded-xl bg-background py-3"><b className="block text-2xl">{active}</b><span className="text-muted">Active</span></div>
                </div>
                {mine.length > 0 ? (
                  <ul className="mb-3 grid gap-1.5 text-[13px]">
                    {mine.slice(0, 4).map((m) => <li key={m.id}><Link href={`/members/${m.id}`} className="font-medium text-primary">{fullName(m)}</Link></li>)}
                    {mine.length > 4 && <li className="text-muted">+{mine.length - 4} more</li>}
                  </ul>
                ) : <p className="mb-3 text-muted">No members assigned yet.</p>}
                <MotionLink href={`/members?trainer=${t.id}`} className={`${btnGhost} w-full`}><LuUsers size={17} />View members</MotionLink>
              </section></Reveal>
            );
          })}
        </div>
      )}
      {trainers.length > 6 && <div className={`${card} mt-5`}><Pagination {...pg} noun="trainers" /></div>}
    </>
  );
}
