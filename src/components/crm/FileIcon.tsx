import { File, FileText, FileSpreadsheet, Image as ImageIcon, Archive } from "lucide-react";

interface FileIconProps {
  mimeType: string;
  className?: string;
}

/**
 * Icone adaptee au type MIME du fichier.
 */
export function FileIcon({ mimeType, className = "size-5" }: FileIconProps) {
  if (mimeType.startsWith("image/")) {
    return <ImageIcon className={className} />;
  }
  if (mimeType === "application/pdf") {
    return <FileText className={className} />;
  }
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel") || mimeType === "text/csv") {
    return <FileSpreadsheet className={className} />;
  }
  if (mimeType.includes("word") || mimeType.startsWith("text/")) {
    return <FileText className={className} />;
  }
  if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("archive")) {
    return <Archive className={className} />;
  }
  return <File className={className} />;
}
