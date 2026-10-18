import PlansProvider from "@/components/plans/PlansProvider";

export default function PlansLayout({ children }: { children: React.ReactNode }) {
  return <PlansProvider>{children}</PlansProvider>;
}
