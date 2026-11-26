import { redirect } from "next/navigation";

// Finding people moved into the central search; finding someone to message is "New message" in the inbox.
// Kept as a redirect so old links and bookmarks still land somewhere useful.
export default function Page() {
  redirect("/search?tab=people");
}
