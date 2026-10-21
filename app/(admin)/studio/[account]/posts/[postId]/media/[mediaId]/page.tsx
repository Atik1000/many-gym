import { Guard } from "@/components/AuthProvider";
import { MediaView } from "@/components/studio/PostPages";

export const metadata = { title: "Media · manygym" };

// /studio/<account>/posts/<postId>/media/<mediaId> — one file's own link
export default async function Page({ params }: PageProps<"/studio/[account]/posts/[postId]/media/[mediaId]">) {
  const { account, postId, mediaId } = await params;
  return <Guard perm="View studio information"><MediaView account={account} postId={postId} mediaId={mediaId} /></Guard>;
}
