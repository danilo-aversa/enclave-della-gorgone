import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type,x-import-secret,apikey,authorization",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};

const IMPORT_SECRET = Deno.env.get("IMPORT_SECRET") ?? "Gorgone-Import-9f4kLm2Qx7pR8vT1zA";
const STORAGE_BUCKET = "wiki-images";

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif"]);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Metodo non supportato." }, 405);
  }

  const providedSecret = req.headers.get("x-import-secret") ?? "";
  if (providedSecret !== IMPORT_SECRET) {
    return jsonResponse({ success: false, error: "Secret import non valido." }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ success: false, error: "Configurazione Supabase mancante sul server." }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const formData = await req.formData();

    const imageEntry = formData.get("image");
    if (!(imageEntry instanceof File) || imageEntry.size <= 0) {
      throw new Error("File immagine mancante.");
    }

    validateImageFile(imageEntry);

    const slug = normalizeDocSlug(readString(formData.get("slug")));
    const section = cleanSegment(readString(formData.get("section")));

    const folderPath = resolveFolderPath(slug, section);
    const safeFileName = sanitizeFileName(imageEntry.name, imageEntry.type);
    const timestamp = Date.now();
    const storagePath = `${folderPath}/${timestamp}-${safeFileName}`;

    const fileBuffer = await imageEntry.arrayBuffer();
    const contentType = imageEntry.type || "application/octet-stream";

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType,
        upsert: true,
        cacheControl: "3600",
      });

    if (uploadError) {
      throw new Error(`Upload immagine fallito: ${uploadError.message}`);
    }

    const { data: publicData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);

    if (!publicData?.publicUrl) {
      throw new Error("Impossibile ottenere l'URL pubblico dell'immagine.");
    }

    return jsonResponse({
      success: true,
      public_url: publicData.publicUrl,
      path: storagePath,
    });
  } catch (error) {
    return jsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : "Errore interno durante l'upload immagine.",
      },
      400,
    );
  }
});

function validateImageFile(file: File): void {
  const mimeType = readString(file.type).toLowerCase();
  const extension = getExtension(file.name);

  if (ALLOWED_MIME_TYPES.has(mimeType) || ALLOWED_EXTENSIONS.has(extension)) {
    return;
  }

  throw new Error("Formato file non supportato. Usa JPG, PNG, WEBP o GIF.");
}

function resolveFolderPath(slug: string, section: string): string {
  if (slug) {
    return `wiki/${slug}`;
  }

  if (section) {
    return "wiki/temp";
  }

  return "wiki/temp";
}

function sanitizeFileName(fileName: string, mimeType: string): string {
  const extension = resolveExtension(fileName, mimeType);
  const baseName = fileName.includes(".") ? fileName.slice(0, fileName.lastIndexOf(".")) : fileName;
  const safeName = cleanSegment(baseName) || "immagine";

  return `${safeName}.${extension}`;
}

function resolveExtension(fileName: string, mimeType: string): string {
  const extension = getExtension(fileName);
  if (ALLOWED_EXTENSIONS.has(extension)) {
    return extension;
  }

  if (mimeType === "image/png") {
    return "png";
  }

  if (mimeType === "image/webp") {
    return "webp";
  }

  if (mimeType === "image/gif") {
    return "gif";
  }

  return "jpg";
}

function getExtension(fileName: string): string {
  if (!fileName || fileName.indexOf(".") === -1) {
    return "";
  }

  return fileName.slice(fileName.lastIndexOf(".") + 1).toLowerCase();
}

function normalizeDocSlug(value: string): string {
  const segments = value
    .split("/")
    .map((segment) => cleanSegment(segment))
    .filter((segment) => !!segment);

  return segments.join("/");
}

function cleanSegment(value: string): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function readString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
    },
  });
}

