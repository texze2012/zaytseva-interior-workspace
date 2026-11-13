import { api, apiFetch } from "@/lib/api";
import { Attachment } from "@/lib/types";

export interface ProductPhotoTarget { projectId: number; itemId: number; variantId?: number; }
export const PRODUCT_PHOTOS_CHANGED = "zi:product-photos";
export const PRODUCT_PHOTO_ACCEPT = "image/jpeg,image/png,image/webp";
export const isProductPhoto = (attachment: Attachment) => ["image/jpeg", "image/png", "image/webp"].includes(attachment.content_type.toLowerCase());
export const photoTargetKey = (target: ProductPhotoTarget) => [target.projectId, target.itemId, target.variantId || "item"].join(":");

function attachmentPath(target: ProductPhotoTarget) {
  return "/projects/" + target.projectId + "/procurement-items/" + target.itemId + (target.variantId ? "/variants/" + target.variantId : "") + "/attachments";
}

// Deduplicate metadata requests; private data stays in memory, scoped to the session.
const requests = new Map<string, { expires: number; value: Promise<Attachment[]> }>();
export function productAttachments(token: string, target: ProductPhotoTarget, refresh = false) {
  const key = token + ":" + photoTargetKey(target);
  const cached = requests.get(key);
  if (!refresh && cached && cached.expires > Date.now()) return cached.value;
  if (requests.size > 150) requests.clear();
  const value = apiFetch<Attachment[]>(attachmentPath(target), {}, token).catch(error => { requests.delete(key); throw error; });
  requests.set(key, { expires: Date.now() + 15000, value });
  return value;
}

export function invalidateProductPhotos(target: ProductPhotoTarget) {
  requests.clear();
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(PRODUCT_PHOTOS_CHANGED, { detail: photoTargetKey(target) }));
}

export async function uploadProductPhoto(token: string, target: ProductPhotoTarget, file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type.toLowerCase())) throw new Error("Выберите фото JPG, PNG или WebP.");
  let attachment: Attachment;
  if (target.variantId) {
    const form = new FormData(); form.append("file", file);
    attachment = await apiFetch<Attachment>(attachmentPath(target), { method: "POST", body: form }, token);
  } else attachment = await api.uploadProcurementAttachment(token, target.projectId, target.itemId, file);
  invalidateProductPhotos(target);
  return attachment;
}
