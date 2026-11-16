"use client";

import { useRouter } from "next/navigation";
import CreateGym from "@/components/CreateGym";
import { useAuth } from "@/components/AuthProvider";
import { HOME } from "@/lib/nav";

// Optional: a person can use manygym without a gym. Creating one switches the session into that gym.
export default function CreateGymPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  return <CreateGym onCreated={() => { refresh(); router.replace(HOME); }} />;
}
