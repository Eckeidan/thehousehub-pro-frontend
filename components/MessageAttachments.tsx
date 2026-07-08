"use client";

import { Download, FileText, ImageIcon } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export type MessageAttachment = {
  url: string;
  fileName?: string | null;
  mimeType?: string | null;
  size?: number | null;
  kind?: string | null;
};

function attachmentUrl(value?: string | null) {
  if (!value) return "";
  if (value.startsWith("http")) return value;
  return `${API_BASE}${value}`;
}

function formatFileSize(size?: number | null) {
  if (!size || size <= 0) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function isImage(attachment: MessageAttachment) {
  return (
    attachment.kind === "image" ||
    String(attachment.mimeType || "").startsWith("image/")
  );
}

export default function MessageAttachments({
  attachments,
  align = "left",
}: {
  attachments?: MessageAttachment[] | null;
  align?: "left" | "right";
}) {
  if (!Array.isArray(attachments) || attachments.length === 0) return null;

  const onDark = align === "right";

  return (
    <div className="mt-3 grid gap-2">
      {attachments.map((attachment, index) => {
        const url = attachmentUrl(attachment.url);
        const fileName = attachment.fileName || "Attachment";

        if (!url) return null;

        if (isImage(attachment)) {
          return (
            <a
              key={`${url}-${index}`}
              href={url}
              target="_blank"
              rel="noreferrer"
              className={`group block overflow-hidden rounded-2xl border ${
                onDark
                  ? "border-white/20 bg-white/10"
                  : "border-slate-200 bg-white"
              }`}
            >
              <img
                src={url}
                alt={fileName}
                className="max-h-56 w-full object-cover transition group-hover:scale-[1.02]"
              />
              <div
                className={`flex items-center gap-2 px-3 py-2 text-xs ${
                  onDark ? "text-blue-50" : "text-slate-600"
                }`}
              >
                <ImageIcon className="h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{fileName}</span>
                <Download className="h-4 w-4 shrink-0" />
              </div>
            </a>
          );
        }

        return (
          <a
            key={`${url}-${index}`}
            href={url}
            target="_blank"
            rel="noreferrer"
            className={`flex items-center gap-3 rounded-2xl border px-3 py-3 text-sm transition ${
              onDark
                ? "border-white/20 bg-white/10 text-white hover:bg-white/15"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <FileText className="h-5 w-5 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{fileName}</span>
              {formatFileSize(attachment.size) && (
                <span
                  className={`block text-xs ${
                    onDark ? "text-blue-100" : "text-slate-400"
                  }`}
                >
                  {formatFileSize(attachment.size)}
                </span>
              )}
            </span>
            <Download className="h-4 w-4 shrink-0" />
          </a>
        );
      })}
    </div>
  );
}
