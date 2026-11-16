// Client-side helper: uploads files to a gallery a few at a time.

const CONCURRENCY = 3;

export interface UploadResult {
  // Same order as the input files; null where that file failed
  ids: (string | null)[];
  failed: { name: string; error: string }[];
}

export async function uploadGalleryFiles(
  slug: string,
  files: File[],
  startOrder: number,
  onProgress: (done: number, total: number) => void,
): Promise<UploadResult> {
  const ids: (string | null)[] = new Array(files.length).fill(null);
  const failed: UploadResult["failed"] = [];
  let next = 0;
  let done = 0;
  onProgress(0, files.length);

  async function worker() {
    while (next < files.length) {
      const i = next++;
      const file = files[i];
      const formData = new FormData();
      formData.append("file", file);
      formData.append("slug", slug);
      formData.append("order", String(startOrder + i));

      try {
        const res = await fetch("/api/galleries/upload", {
          method: "POST",
          body: formData,
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body?.error ?? res.statusText);
        ids[i] = body.id as string;
      } catch (err) {
        failed.push({
          name: file.name,
          error: err instanceof Error ? err.message : "Error desconocido",
        });
      }
      onProgress(++done, files.length);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, files.length) }, worker),
  );
  return { ids, failed };
}
