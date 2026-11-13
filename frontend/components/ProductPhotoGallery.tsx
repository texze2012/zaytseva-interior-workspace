"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Attachment } from "@/lib/types";
import { Icon } from "@/components/Icon";
import { Modal } from "@/components/Modal";
import { ProductPhoto, useProductAttachments } from "@/components/ProductPhoto";
import { PRODUCT_PHOTO_ACCEPT, ProductPhotoTarget, invalidateProductPhotos, isProductPhoto, uploadProductPhoto } from "@/lib/productPhotos";

export function ProductPhotoGallery({ target, title, compact = false, readOnly = false, onChanged }: {
  target: ProductPhotoTarget; title: string; compact?: boolean; readOnly?: boolean; onChanged?: () => void;
}) {
  const { token, user } = useAuth();
  const { attachments, loading, error: loadError, reload } = useProductAttachments(target);
  const photos = attachments.filter(isProductPhoto);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [preview, setPreview] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const selected = photos.find(photo => photo.id === selectedId) || photos[0];
  useEffect(() => { setSelectedId(null); setError(""); setConfirmDelete(null); setPreview(false); }, [target.projectId, target.itemId, target.variantId]);
  async function upload(file?: File) {
    if (!token || !file) return;
    setBusy(true); setError("");
    try { const result = await uploadProductPhoto(token, target, file); setSelectedId(result.id); await reload(true); onChanged?.(); }
    catch (e) { setError(e instanceof Error ? e.message : "Не удалось загрузить фото"); }
    finally { setBusy(false); }
  }
  async function remove(photo: Attachment) {
    if (!token) return;
    setBusy(true); setError("");
    try { await api.deleteAttachment(token, photo.id); invalidateProductPhotos(target); setConfirmDelete(null); await reload(true); onChanged?.(); }
    catch (e) { setError(e instanceof Error ? e.message : "Не удалось удалить фото"); }
    finally { setBusy(false); }
  }
  return <section className={"product-gallery" + (compact ? " product-gallery--compact" : "")} aria-label={"Фото: " + title}>
    <button type="button" className="product-gallery__preview" onClick={() => setPreview(true)} disabled={!selected || busy} aria-label={selected ? "Открыть фото «" + title + "»" : "Фото пока не добавлено"}>
      <ProductPhoto attachment={selected || null} alt={title}/>{selected ? <span className="product-gallery__zoom"><Icon name="external" size={15}/> Открыть фото</span> : null}
    </button>
    {photos.length > 1 ? <div className="product-gallery__thumbnails" aria-label="Выбор фотографии">{photos.map((photo, index) => <button type="button" key={photo.id} onClick={() => { setSelectedId(photo.id); setConfirmDelete(null); }} aria-pressed={selected?.id === photo.id} aria-label={"Фото " + (index + 1) + (index === 0 ? ", обложка" : "")}><ProductPhoto attachment={photo} alt={"Фото " + (index + 1) + ": " + title}/></button>)}</div> : null}
    <div className="product-gallery__tools"><span className="muted">{loading ? "Загружаем…" : photos.length ? photos.length + " фото · первое на обложке" : "Добавьте фото товара или образца"}</span>
      {!readOnly ? <><input ref={input} hidden type="file" accept={PRODUCT_PHOTO_ACCEPT} onChange={e => { void upload(e.target.files?.[0]); e.target.value = ""; }}/><button type="button" className="button button--secondary button--small" disabled={busy} onClick={() => input.current?.click()}><Icon name="upload" size={15}/>{busy ? "Загружаем…" : "Добавить фото"}</button></> : null}
      {!readOnly && selected && (user?.role === "owner" || user?.id === selected.uploaded_by_id) ? <button type="button" className="button button--ghost button--small" disabled={busy} onClick={() => setConfirmDelete(selected.id)}>Удалить фото</button> : null}
    </div>
    {error || loadError ? <div className="form-error" role="alert">{error || loadError}{loadError ? <button type="button" className="text-link" onClick={() => void reload(true)}>Повторить загрузку</button> : null}</div> : null}
    {selected && confirmDelete === selected.id ? <div className="photo-delete-confirm" role="alert"><p>Удалить это фото? Остальные файлы сохранятся.</p><div className="button-row"><button type="button" className="button button--secondary button--small" disabled={busy} onClick={() => void remove(selected)}>Удалить фото</button><button type="button" className="button button--ghost button--small" disabled={busy} onClick={() => setConfirmDelete(null)}>Отмена</button></div></div> : null}
    {preview && selected ? <Modal title={title} subtitle={selected.original_name} onClose={() => setPreview(false)} wide><ProductPhoto attachment={selected} alt={title} className="product-photo--full"/></Modal> : null}
  </section>;
}
