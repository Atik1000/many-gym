import SearchResults from "@/components/search/SearchResults";

export const metadata = { title: "Search · manygym" };

// Central search is a personal feature like Find Gyms: any signed-in person can use it, gym or no gym.
export default function Page() {
  return <SearchResults />;
}
