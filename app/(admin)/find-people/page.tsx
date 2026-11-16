import FindPeople from "@/components/users/FindPeople";

export const metadata = { title: "Find People · manygym" };

// Like Find Gyms and Messages, this is a personal feature: any signed-in person can use it, gym or no gym.
export default function Page() {
  return <FindPeople />;
}
