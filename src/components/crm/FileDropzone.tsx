"use client";

import { useCallback, useRef, type DragEvent, type ChangeEvent } from "react";
import { Upload, Loader2 } from "lucide-react";

interface FileDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  isUploading?: boolean;
  accept?: string;
}

/**
 * Zone de depot drag & drop + clic pour selectionner des fichiers.
 */
export function FileDropzone({ onFilesSelected, isUploading, accept }: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (isUploading) return;
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) onFilesSelected(files);
    },
    [isUploading, onFilesSelected],
  );

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length > 0) onFilesSelected(files);
      // Reset pour permettre de re-selectionner le meme fichier
      e.target.value = "";
    },
    [onFilesSelected],
  );

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => !isUploading && inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
      }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 p-6 text-center transition-colors hover:border-muted-foreground/50"
    >
      {isUploading ? (
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      ) : (
        <Upload className="size-8 text-muted-foreground" />
      )}
      <p className="text-sm text-muted-foreground">
        {isUploading ? "Upload en cours..." : "Deposez vos fichiers ici ou cliquez pour parcourir"}
      </p>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        onChange={handleChange}
        className="hidden"
        aria-label="Selectionner des fichiers"
      />
    </div>
  );
}
