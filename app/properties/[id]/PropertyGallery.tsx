"use client";

import { useEffect, useMemo, useState } from "react";
import { Image as ImageIcon, Trash2, Star } from "lucide-react";

type PropertyImage = {
  id: string;
  imageUrl: string;
  fileName?: string | null;
  isPrimary: boolean;
  sortOrder: number;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function PropertyGallery({
  propertyId,
  images = [],
}: {
  propertyId: string;
  images: PropertyImage[];
}) {
  const [selected, setSelected] = useState<PropertyImage | null>(
    images.find((img) => img.isPrimary) || images[0] || null
  );
  const [uploading, setUploading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [deleteImageId, setDeleteImageId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const sortedImages = useMemo(
    () =>
      [...images].sort(
        (a, b) =>
          Number(b.isPrimary) - Number(a.isPrimary) || a.sortOrder - b.sortOrder
      ),
    [images]
  );

  useEffect(() => {
    if (!selected && sortedImages.length > 0) {
      setSelected(sortedImages[0]);
      return;
    }

    if (
      selected &&
      sortedImages.length > 0 &&
      !sortedImages.find((img) => img.id === selected.id)
    ) {
      setSelected(sortedImages[0]);
    }
  }, [sortedImages, selected]);

  const getImageSrc = (imageUrl: string) => {
    if (!imageUrl) return "";
    if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
      return imageUrl;
    }
    return `${API_BASE}${imageUrl}`;
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    try {
      setUploading(true);

      const token = localStorage.getItem("token");
      const formData = new FormData();

      Array.from(files).forEach((file) => formData.append("images", file));

      const res = await fetch(
        `${API_BASE}/api/property-images/property/${propertyId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token || ""}`,
          },
          body: formData,
        }
      );

      if (res.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/";
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Upload failed");
      }

      window.location.reload();
    } catch (error: any) {
      alert(error.message || "Failed to upload images");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleSetPrimary = async (imageId: string) => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(
        `${API_BASE}/api/property-images/${imageId}/primary`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token || ""}`,
          },
        }
      );

      if (res.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/";
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to set primary image");
      }

      window.location.reload();
    } catch (error: any) {
      alert(error.message || "Failed to set primary image");
    }
  };

  const handleDelete = async () => {
    if (!deleteImageId) return;

    try {
      setDeleting(true);

      const token = localStorage.getItem("token");

      const res = await fetch(
        `${API_BASE}/api/property-images/${deleteImageId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token || ""}`,
          },
        }
      );

      if (res.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/";
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to delete image");
      }

      setDeleteImageId(null);
      window.location.reload();
    } catch (error: any) {
      alert(error.message || "Failed to delete image");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Photo Gallery</h2>
          <p className="mt-1 text-sm text-slate-500">
            Main property image and gallery photos.
          </p>
        </div>

        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          <ImageIcon size={16} />
          {uploading ? "Uploading..." : "Upload Photos"}
          <input
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleUpload}
            disabled={uploading}
          />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[2fr_1fr]">
        <div>
          <div className="flex min-h-[460px] items-center justify-center overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
            {selected ? (
              <button
                type="button"
                className="h-full min-h-[460px] w-full"
                onClick={() => setPreviewOpen(true)}
              >
                <img
                  src={getImageSrc(selected.imageUrl)}
                  alt={selected.fileName || "Property image"}
                  className="h-full w-full cursor-zoom-in object-cover"
                />
              </button>
            ) : (
              <div className="text-center text-slate-400">
                <ImageIcon className="mx-auto mb-3" size={32} />
                <p>No images uploaded yet</p>
              </div>
            )}
          </div>
        </div>

        <div>
          {sortedImages.length ? (
            <div className="grid max-h-[460px] grid-cols-2 gap-3 overflow-y-auto pr-1">
              {sortedImages.map((image) => (
                <div
                  key={image.id}
                  className={`overflow-hidden rounded-2xl border bg-white transition ${
                    selected?.id === image.id
                      ? "border-blue-500 ring-2 ring-blue-200"
                      : "border-slate-200"
                  }`}
                >
                  <button
                    type="button"
                    className="block h-36 w-full"
                    onClick={() => setSelected(image)}
                  >
                    <img
                      src={getImageSrc(image.imageUrl)}
                      alt={image.fileName || "Thumbnail"}
                      className="h-full w-full object-cover"
                    />
                  </button>

                  <div className="px-2 pb-2 pt-2">
                    <p className="mb-2 line-clamp-2 text-xs font-medium text-slate-600">
                      {image.fileName || "Property image"}
                    </p>

                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleSetPrimary(image.id)}
                        className={`rounded-lg p-2 transition ${
                          image.isPrimary
                            ? "bg-amber-100 text-amber-700"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                        title="Set as main image"
                      >
                        <Star size={14} />
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeleteImageId(image.id)}
                        className="rounded-lg bg-red-50 p-2 text-red-600 transition hover:bg-red-100"
                        title="Delete image"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500">
              Upload photos to build the gallery.
            </div>
          )}
        </div>
      </div>

      {previewOpen && selected && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPreviewOpen(false)}
        >
          <div
            className="relative max-h-[90vh] max-w-[95vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewOpen(false)}
              className="absolute right-3 top-3 z-10 rounded-full bg-black/60 px-3 py-2 text-sm font-medium text-white hover:bg-black/80"
            >
              Close
            </button>

            <img
              src={getImageSrc(selected.imageUrl)}
              alt={selected.fileName || "Property image"}
              className="max-h-[90vh] max-w-[95vw] rounded-2xl object-contain shadow-2xl"
            />
          </div>
        </div>
      )}

      {deleteImageId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900">Delete Image</h3>

            <p className="mt-2 text-sm text-slate-500">
              Are you sure you want to delete this image? This action cannot be
              undone.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteImageId(null)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                disabled={deleting}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDelete}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}