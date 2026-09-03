"use client";
import { ChangeEvent, useRef } from "react";
import { Icon } from "@/components/Icon";

export function FilePicker({ files, onFiles, multiple = true, label = "Добавить файлы" }: { files: File[]; onFiles: (files: File[]) => void; multiple?: boolean; label?: string }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files || []);
    onFiles(multiple ? [...files, ...selected] : selected.slice(0, 1));
    event.target.value = "";
  }
  return <div className="file-picker">
    <input ref={inputRef} hidden type="file" multiple={multiple} accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.xls,.xlsx" onChange={handleChange}/>
    <button type="button" className="button button--secondary button--small" onClick={() => inputRef.current?.click()}><Icon name="upload" size={16}/>{label}</button>
    {files.length ? <div className="file-picker__queue">{files.map((file, index) => <span key={`${file.name}-${index}`}>{file.name}<button type="button" onClick={() => onFiles(files.filter((_, i) => i !== index))}>Удалить</button></span>)}</div> : null}
  </div>;
}
