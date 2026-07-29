"use client";

import { useCallback, useRef } from "react";
import { Upload, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

interface ImportCsvUploadProps {
  onFileSelected: (file: File, preview: string) => void;
}

export function ImportCsvUpload({ onFileSelected }: ImportCsvUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.name.endsWith(".csv")) {
        alert("Seuls les fichiers .csv sont acceptés");
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        alert("Fichier trop volumineux (max 5 Mo)");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        onFileSelected(file, reader.result as string);
      };
      reader.readAsText(file);
    },
    [onFileSelected],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className="flex flex-col items-center gap-4 rounded-lg border-2 border-dashed border-gray-300 p-8 text-center transition-colors hover:border-gray-400"
    >
      <div className="rounded-full bg-gray-100 p-3">
        <FileText className="size-8 text-gray-400" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-700">Glissez-déposez votre fichier CSV ici</p>
        <p className="mt-1 text-xs text-gray-500">ou cliquez pour sélectionner (max 5 Mo)</p>
      </div>
      <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
        <Upload className="mr-1.5 size-4" />
        Choisir un fichier
      </Button>
      <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={handleChange} />
    </div>
  );
}
