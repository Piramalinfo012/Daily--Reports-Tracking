/**
 * File upload utility — uploads a file directly to Cloudinary.
 * Bypasses the local API proxy completely.
 */

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "dhbtn1ecx";
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "dailyreport";

export async function uploadFile(
  base64Data: string,
  fileName: string,
  mimeType: string,
  _folderId: string // No longer used for Cloudinary
): Promise<string> {
  // Cloudinary accepts base64 files in Data URI format
  const dataUri = `data:${mimeType || "application/octet-stream"};base64,${base64Data}`;

  const formData = new FormData();
  formData.append("file", dataUri);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("public_id", fileName.split(".")[0]); // Optional: keeps original filename without extension

  const res = await fetch(CLOUDINARY_URL, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    let errMsg = "Upload failed";
    try {
      const errorData = await res.json();
      errMsg = errorData.error?.message || errMsg;
    } catch {
      // Ignore JSON parse error
    }
    throw new Error(`Cloudinary Error: ${errMsg}`);
  }

  const json = await res.json();
  if (!json.secure_url) {
    throw new Error("Upload succeeded but no file URL was returned from Cloudinary");
  }

  return json.secure_url;
}

