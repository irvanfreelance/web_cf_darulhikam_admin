/**
 * Compress an image File to under targetSizeKB using canvas + quality stepping.
 * Preserves original dimensions. Returns the original file if already small enough.
 * Only runs in browser (uses HTMLCanvasElement).
 */
export async function compressImage(
  file: File,
  targetSizeKB = 900,
): Promise<File> {
  // Already under target — no compression needed
  if (file.size <= targetSizeKB * 1024) return file;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas context unavailable'));
      ctx.drawImage(img, 0, 0);

      // Step down quality from 0.92 until file fits under target
      const tryCompress = (quality: number) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error('Canvas toBlob failed'));

            if (blob.size <= targetSizeKB * 1024 || quality <= 0.1) {
              // Use .jpg extension for compressed output
              const ext = file.name.replace(/\.[^.]+$/, '') + '.jpg';
              resolve(new File([blob], ext, { type: 'image/jpeg' }));
            } else {
              tryCompress(Math.max(quality - 0.08, 0.1));
            }
          },
          'image/jpeg',
          quality,
        );
      };

      tryCompress(0.92);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image for compression'));
    };

    img.src = objectUrl;
  });
}
