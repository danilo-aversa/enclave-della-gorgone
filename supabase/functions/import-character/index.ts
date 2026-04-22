import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

type CharacterPayload = {
  foundry_id: string;
  slug: string;
  name: string;
  portrait_url: string | null;
  token_url: string | null;
  class_name: string | null;
  subclass_name: string | null;
  level: number | null;
  background: string | null;
  bio: string | null;
  appearance: string | null;
  trait: string | null;
  status: string;
  raw_json: unknown;
};

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type,x-import-secret",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};

const IMPORT_SECRET = Deno.env.get("IMPORT_SECRET") ?? "Gorgone-Import-9f4kLm2Qx7pR8vT1zA";
const STORAGE_BUCKET = "character-portraits";

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
    return jsonResponse(
      { success: false, error: "Configurazione Supabase mancante sul server." },
      500,
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const parsed = await parseIncomingRequest(req);
    const actor = parsed.actor;

    const basePayload = buildCharacterPayload(actor);

    if (parsed.portraitFile) {
      const portraitUrl = await uploadPortrait(supabase, parsed.portraitFile, basePayload.slug);
      basePayload.portrait_url = portraitUrl;
    }

    await upsertCharacter(supabase, basePayload);

    return jsonResponse({
      success: true,
      name: basePayload.name,
      slug: basePayload.slug,
      portrait_url: basePayload.portrait_url,
    });
  } catch (error) {
    return jsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : "Errore interno durante l'import.",
      },
      400,
    );
  }
});

async function parseIncomingRequest(req: Request): Promise<{ actor: any; portraitFile: File | null }> {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();

    const jsonPart = formData.get("character_json");
    if (!jsonPart) {
      throw new Error("File JSON mancante.");
    }

    const jsonText =
      jsonPart instanceof File
        ? await jsonPart.text()
        : typeof jsonPart === "string"
        ? jsonPart
        : "";

    if (!jsonText) {
      throw new Error("Contenuto JSON vuoto.");
    }

    let actor: any;
    try {
      actor = JSON.parse(jsonText);
    } catch (_error) {
      throw new Error("Il JSON personaggio non è valido.");
    }

    const portraitCandidate = formData.get("portrait_image");
    const portraitFile = portraitCandidate instanceof File && portraitCandidate.size > 0
      ? portraitCandidate
      : null;

    return { actor, portraitFile };
  }

  const actor = await req.json();
  return { actor, portraitFile: null };
}

function buildCharacterPayload(actor: any): CharacterPayload {
  if (!actor || typeof actor !== "object") {
    throw new Error("Dati personaggio non validi.");
  }

  const foundryId = readString(actor._id) || readString(actor.id) || crypto.randomUUID();
  const name = readString(actor.name) || "Personaggio senza nome";
  const slug = slugify(name) || slugify(foundryId) || crypto.randomUUID();

  const className =
    readString(actor?.system?.details?.class?.name) ||
    readString(actor?.system?.class?.name) ||
    readString(actor?.system?.classes?.primary?.name) ||
    null;

  const subclassName =
    readString(actor?.system?.details?.subclass?.name) ||
    readString(actor?.system?.subclass?.name) ||
    null;

  const level =
    readNumber(actor?.system?.details?.level) ??
    readNumber(actor?.system?.attributes?.level) ??
    readNumber(actor?.system?.classes?.primary?.levels) ??
    null;

  const backgroundItem = Array.isArray(actor?.items)
    ? actor.items.find((item: any) => item?.type === "background")
    : null;
  const background = readString(backgroundItem?.name) || null;

  const bio =
    readString(actor?.system?.details?.biography?.value) ||
    readString(actor?.system?.details?.biography?.public) ||
    readString(actor?.system?.details?.biography) ||
    null;

  const appearance =
    readString(actor?.system?.details?.appearance) ||
    readString(actor?.system?.appearance) ||
    null;

  const trait =
    readString(actor?.system?.details?.trait) ||
    readString(actor?.system?.traits?.personality) ||
    null;

  const portraitFromActor = readString(actor?.img) || null;

  const tokenUrl =
    readString(actor?.prototypeToken?.texture?.src) ||
    readString(actor?.prototypeToken?.img) ||
    readString(actor?.token?.img) ||
    null;

  const status = normalizeStatus(readString(actor?.status) || "active");

  return {
    foundry_id: foundryId,
    slug,
    name,
    portrait_url: portraitFromActor,
    token_url: tokenUrl,
    class_name: className,
    subclass_name: subclassName,
    level,
    background,
    bio,
    appearance,
    trait,
    status,
    raw_json: actor,
  };
}

async function uploadPortrait(
  supabase: ReturnType<typeof createClient>,
  file: File,
  slug: string,
): Promise<string> {
  const extension = getFileExtension(file.name, file.type);
  const path = `characters/${slug}.${extension}`;

  const arrayBuffer = await file.arrayBuffer();
  const contentType = file.type || "application/octet-stream";

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, arrayBuffer, {
      contentType,
      upsert: true,
      cacheControl: "3600",
    });

  if (error) {
    throw new Error(`Upload portrait fallito: ${error.message}`);
  }

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);

  if (!data?.publicUrl) {
    throw new Error("Impossibile ottenere l'URL pubblico del portrait.");
  }

  return data.publicUrl;
}

async function upsertCharacter(
  supabase: ReturnType<typeof createClient>,
  payload: CharacterPayload,
): Promise<void> {
  const conflictKey = payload.foundry_id ? "foundry_id" : "slug";

  const { error } = await supabase
    .from("characters")
    .upsert(payload, { onConflict: conflictKey, ignoreDuplicates: false });

  if (error) {
    throw new Error(`Salvataggio personaggio fallito: ${error.message}`);
  }
}

function getFileExtension(fileName: string, mimeType: string): string {
  const fromName = fileName.includes(".") ? fileName.split(".").pop()?.toLowerCase() : "";

  if (fromName && ["jpg", "jpeg", "png", "webp"].includes(fromName)) {
    return fromName;
  }

  if (mimeType === "image/png") {
    return "png";
  }

  if (mimeType === "image/webp") {
    return "webp";
  }

  return "jpg";
}

function normalizeStatus(input: string): string {
  const normalized = input.toLowerCase();
  const allowed = ["active", "inactive", "missing", "dead"];
  return allowed.includes(normalized) ? normalized : "active";
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) {
    return Number(value);
  }

  return null;
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