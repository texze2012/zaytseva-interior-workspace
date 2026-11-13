"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { API_URL } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Attachment } from "@/lib/types";
import { Icon } from "@/components/Icon";
import { PRODUCT_PHOTOS_CHANGED, ProductPhotoTarget, isProductPhoto, photoTargetKey, productAttachments } from "@/lib/productPhotos";

export function useProductAttachments(target?: ProductPhotoTarget, enabled = true) {
  const { token } = useAuth();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const projectId = target?.projectId, itemId = target?.itemId, variantId = target?.variantId;
  const generation = useRef(0);
  const reload = useCallback(async (fresh = false) => {
    if (!token || !projectId || !itemId || !enabled) return;
    const request = ++generation.current;
    setLoading(true); setError("");
    try {
      const result = await productAttachments(token, { projectId, itemId, variantId }, fresh);
      if (generation.current === request) setAttachments(result);
    } catch (e) {
      if (generation.current === request) setError(e instanceof Error ? e.message : "Не удалось загрузить фото");
    } finally { if (generation.current === request) setLoading(false); }
  }, [token, projectId, itemId, variantId, enabled]);
  useEffect(() => {
    setAttachments([]); setError(""); setLoading(false); void reload();
    return () => { generation.current++; };
  }, [reload]);
  useEffect(() => {
    if (!projectId || !itemId || !enabled) return;
    const key = photoTargetKey({ projectId, itemId, variantId });
    const changed = (event: Event) => { if ((event as CustomEvent<string>).detail === key) void reload(true); };
    const focused = () => { void reload(true); };
    window.addEventListener(PRODUCT_PHOTOS_CHANGED, changed); window.addEventListener("focus", focused);
    return () => { window.removeEventListener(PRODUCT_PHOTOS_CHANGED, changed); window.removeEventListener("focus", focused); };
  }, [projectId, itemId, variantId, enabled, reload]);
  return { attachments, loading, error, reload };
}

export function ProductPhoto({ attachment, target, fallbackTarget, alt, className = "" }: {
  attachment?: Attachment | null; target?: ProductPhotoTarget; fallbackTarget?: ProductPhotoTarget; alt: string; className?: string;
}) {
  const { token } = useAuth();
  const container = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  const [source, setSource] = useState("");
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!container.current || typeof IntersectionObserver === "undefined") { setVisible(true); return; }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setVisible(true); observer.disconnect(); }
    }, { rootMargin: "240px" });
    observer.observe(container.current); return () => observer.disconnect();
  }, []);
  const primary = useProductAttachments(attachment === undefined ? target : undefined, visible);
  const primaryPhoto = attachment === undefined ? primary.attachments.find(isProductPhoto) : attachment;
  const fallback = useProductAttachments(attachment === undefined && !primary.loading && !primaryPhoto ? fallbackTarget : undefined, visible);
  const selected = primaryPhoto || fallback.attachments.find(isProductPhoto);
  const id = selected?.id;
  useEffect(() => {
    setSource(""); setFailed(false);
    if (!id || !token || !visible) return;
    const controller = new AbortController(); let objectUrl = "";
    fetch(API_URL + "/attachments/" + id + "/file", { headers: { Authorization: "Bearer " + token }, signal: controller.signal, cache: "no-store" })
      .then(async response => { if (!response.ok) throw new Error("Photo unavailable"); return response.blob(); })
      .then(blob => { if (!controller.signal.aborted) { objectUrl = URL.createObjectURL(blob); setSource(objectUrl); } })
      .catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [id, token, visible]);
  const loading = primary.loading || fallback.loading || Boolean(id && !source && !failed);
  return <span ref={container} className={"product-photo " + className}>
    {source && !failed ? <img src={source} alt={alt} loading="lazy" decoding="async" onError={() => setFailed(true)} /> : <span className="product-photo__empty"><Icon name="projects" size={28}/><span>{failed || primary.error || fallback.error ? "Фото не загрузилось" : loading ? "Загружаем фото…" : "Фото пока нет"}</span></span>}
  </span>;
}
