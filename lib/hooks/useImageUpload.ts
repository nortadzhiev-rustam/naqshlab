import { useCallback, useState } from "react";

export function useImageUpload(onComplete: (urls: string[]) => void) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const uploadFiles = useCallback(
    async (files: File[]) => {
      const images = files.filter((f) => f.type.startsWith("image/"));
      if (!images.length) return;

      setIsUploading(true);
      setUploadError(null);

      try {
        const urls = await Promise.all(
          images.map(async (file) => {
            const form = new FormData();
            form.append("image", file);

            const res = await fetch("/api/products/upload-image", {
              method: "POST",
              body: form,
            });

            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              throw new Error(data.error ?? `Upload failed (${res.status})`);
            }

            const data: { url: string } = await res.json();
            return data.url;
          })
        );

        onComplete(urls);
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setIsUploading(false);
      }
    },
    [onComplete]
  );

  return { uploadFiles, isUploading, uploadError };
}
