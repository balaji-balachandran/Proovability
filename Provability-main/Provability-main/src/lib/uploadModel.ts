import { supabase } from "@/integrations/supabase/client";

function sanitizeFilename(name: string) {
  return name.replace(/[^\w.\-]+/g, "_");
}

export default async function uploadToPublicModelsBucket(params: {
  challengeId: string; // uuid string
  submitter: string;  // wallet string
  file: File;
}) {
  const { challengeId, submitter, file } = params;

  const safe = sanitizeFilename(file.name);
  const nonce =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : String(Date.now());

  // Storage object path
  const path = `${challengeId}/${nonce}-${safe}`;

  // 1) Upload file to Storage bucket "models"
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from("models")
    .upload(path, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) throw uploadError;
  if (!uploadData?.path) throw new Error("Upload succeeded but no path returned.");

  // 2) Insert row into public.models
  // Requires you to add: ALTER TABLE public.models ADD COLUMN model_path text;

  const payload = {
    submission_time: new Date().toISOString(), // only if you DON'T have DEFAULT now()
    challenge_id: challengeId,
    submitter: submitter,
    model_path: uploadData.path,
  };

  const { error: insertError } = await supabase.from("models").insert(payload);

  if (insertError) {
    // cleanup uploaded file if DB insert fails
    await supabase.storage.from("models").remove([uploadData.path]);
    throw insertError;
  }

  return uploadData.path;
}