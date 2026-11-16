import PersonalFeed from "@/components/feed/PersonalFeed";

export const metadata = { title: "Feed · manygym" };

// A person's home: no gym needed, so there is no permission guard.
export default function Page() {
  return <PersonalFeed />;
}
