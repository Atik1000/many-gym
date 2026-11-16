import FindGyms from "@/components/gyms/FindGyms";

export const metadata = { title: "Find Gyms · manygym" };

// Discovery is a personal feature, like Messages: any signed-in person can use it, so there is no permission guard.
export default function Page() {
  return <FindGyms />;
}
