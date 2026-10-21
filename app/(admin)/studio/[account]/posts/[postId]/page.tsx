import { Guard } from "@/components/AuthProvider";
import { PostView } from "@/components/studio/PostPages";

export const metadata = { title: "Post · manygym" };

// /studio/<account>/posts/<postId> — one post's own link
export default async function Page({ params }: PageProps<"/studio/[account]/posts/[postId]">) {
  const { account, postId } = await params;
  return <Guard perm="View studio information"><PostView account={account} postId={postId} /></Guard>;
}
