import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { HfInference } from "https://esm.sh/@huggingface/inference@2.3.2";
import { createClient } from "../_shared/client.ts";
import { need } from "../_shared/env.ts";

const hfAccessToken = need("HUGGINGFACE_ACCESS_TOKEN");
const hf = new HfInference(hfAccessToken);
const supabase = createClient("service");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface StorageObjectRecord {
  id: string | null;
  bucket_id: string | null;
  name: string | null;
  path_tokens: string[] | null;
}

type WebhookPayload = {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: StorageObjectRecord | null;
  schema: "public";
  old_record: StorageObjectRecord | null;
};

function errorResponse(message: string, status = 400): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

async function fetchSignedObject(url: string): Promise<Blob> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download object: ${response.status}`);
  }
  return await response.blob();
}

async function generateCaption(blob: Blob): Promise<string> {
  const result = await hf.imageToText({
    data: blob,
    model: "nlpconnect/vit-gpt2-image-captioning",
  });
  const caption = result.generated_text?.trim();
  if (!caption) {
    throw new Error("No caption generated");
  }
  return caption;
}

async function storeCaption(
  id: string,
  caption: string,
): Promise<void> {
  const { error } = await supabase
    .from("image_caption")
    .upsert({ id, caption }, { onConflict: "id" });
  if (error) {
    throw new Error(`Failed to save caption: ${error.message}`);
  }
}

export async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  let payload: WebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return errorResponse("Invalid JSON body");
  }

  if (!payload.record) {
    return errorResponse("Missing record");
  }

  if (payload.type === "DELETE") {
    return new Response(JSON.stringify({ skipped: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const { record } = payload;
  const bucketId = record.bucket_id?.trim();
  const objectId = record.id ?? record.name;
  const pathTokens = record.path_tokens ?? (record.name ? [record.name] : null);

  if (!bucketId || !pathTokens?.length) {
    return errorResponse("Missing storage object path information");
  }
  if (!objectId) {
    return errorResponse("Missing storage object identifier");
  }

  const objectPath = pathTokens.join("/");
  const { data: signedData, error: signedError } = await supabase.storage
    .from(bucketId)
    .createSignedUrl(objectPath, 60);

  if (signedError || !signedData?.signedUrl) {
    console.error("Failed to sign storage object", signedError);
    return errorResponse("Failed to create signed URL", 502);
  }

  try {
    const objectBlob = await fetchSignedObject(signedData.signedUrl);
    const caption = await generateCaption(objectBlob);
    await storeCaption(String(objectId), caption);

    return new Response(JSON.stringify({ caption }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("huggingface-image-captioning error", error);
    return errorResponse(message, 500);
  }
}

if (import.meta.main) {
  serve(handler);
}

export default handler;
