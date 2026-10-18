// Upload rules from the "Create Posts" spec; reused by the gym gallery.
const MB = 1024 * 1024;
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const VIDEO_TYPES = ["video/mp4", "video/quicktime"];
export const ACCEPT = ".jpg,.jpeg,.png,.webp,.mp4,.mov," + [...IMAGE_TYPES, ...VIDEO_TYPES].join(",");

export type MediaItem = { id: string; file: File; url: string; kind: "image" | "video" };

export function validateFiles(list: File[]): { ok: MediaItem[]; errors: string[] } {
  const ok: MediaItem[] = [];
  const errors: string[] = [];
  for (const file of list) {
    const isImg = IMAGE_TYPES.includes(file.type);
    const isVid = VIDEO_TYPES.includes(file.type);
    if (!isImg && !isVid) errors.push(`${file.name}: unsupported format`);
    else if (isImg && file.size > 10 * MB) errors.push(`${file.name}: photo exceeds 10 MB`);
    else if (isVid && file.size > 200 * MB) errors.push(`${file.name}: video exceeds 200 MB`);
    else ok.push({ id: crypto.randomUUID(), file, url: URL.createObjectURL(file), kind: isImg ? "image" : "video" });
  }
  return { ok, errors };
}

// Real gym photos (Unsplash) for the dummy data. Fixed ids so the seed is stable; `gymPhoto` crops to any size.
const GYM_PHOTOS = [
  "1534438327276-14e5300c3a48", "1571019613454-1cb2f99b2d8b", "1540497077202-7c8a3999166f", "1517836357463-d25dfeac3438",
  "1581009146145-b5ef050c2e1e", "1593079831268-3381b0db4a77", "1571902943202-507ec2618e8f", "1576678927484-cc907957088c",
  "1574680096145-d05b474e2155", "1558611848-73f7eb4001a1", "1605296867304-46d5465a13f1", "1598289431512-b97b0917affc",
  "1549060279-7e168fcee0c2", "1583454110551-21f2fa2afe61", "1599058917212-d750089bc07e", "1544367567-0f2fcb009e0b",
  "1518611012118-696072aa579a", "1522898467493-49726bf28798", "1526506118085-60ce8714f8c5", "1470468969717-61d5d54fd036",
];
export const gymPhoto = (index: number, w = 800, h = 500) =>
  `https://images.unsplash.com/photo-${GYM_PHOTOS[((index % GYM_PHOTOS.length) + GYM_PHOTOS.length) % GYM_PHOTOS.length]}?auto=format&fit=crop&w=${w}&h=${h}&q=70`;

/** A stock portrait for a person, stable for the same name. */
export const avatarUrl = (name: string, size = 96) => `https://i.pravatar.cc/${size * 2}?u=${encodeURIComponent(name)}`;
/** A portrait that matches the member's sex (randomuser.me), stable for the same index. */
export const portrait = (sex: string, n: number) => `https://randomuser.me/api/portraits/${sex === "Male" ? "men" : sex === "Female" ? "women" : n % 2 ? "men" : "women"}/${n % 90}.jpg`;
