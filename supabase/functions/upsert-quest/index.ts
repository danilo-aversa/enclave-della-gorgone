import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

type UpsertQuestPayload = {
  title?: unknown;
  slug?: unknown;
  type?: unknown;
  status?: unknown;
  image_url?: unknown;
  location?: unknown;
  report?: unknown;
  last_session_at?: unknown;
  next_session_at?: unknown;
  character_ids?: unknown;
};

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type,x-import-secret",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};

const IMPORT_SECRET = Deno.env.get("IMPORT_SECRET") ?? "Gorgone-Import-9f4kLm2Qx7pR8vT1zA";
const ALLOWED_TYPES = new Set(["main", "side"]);
const ALLOWED_STATUSES = new Set(["in-corso", "preparazione", "prioritaria", "sospesa", "conclusa"]);

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
    const payload = (await req.json()) as UpsertQuestPayload;
    const normalized = normalizePayload(payload);

    const quest = await upsertQuest(supabase, normalized);
    const assignedCharacterIds = await syncQuestCharacters(supabase, quest.id, normalized.characterIds);

    return jsonResponse({
      success: true,
      quest,
      assigned_character_ids: assignedCharacterIds,
    });
  } catch (error) {
    return jsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : "Errore interno durante il salvataggio quest.",
      },
      400,
    );
  }
});

function normalizePayload(payload: UpsertQuestPayload) {
  const title = readString(payload.title);
  if (!title) {
    throw new Error("Titolo quest obbligatorio.");
  }

  const slug = slugify(readString(payload.slug) || title);
  if (!slug) {
    throw new Error("Slug quest non valido.");
  }

  const type = readString(payload.type);
  const normalizedType = ALLOWED_TYPES.has(type) ? type : "side";

  const status = readString(payload.status);
  const normalizedStatus = ALLOWED_STATUSES.has(status) ? status : "in-corso";

  const characterIds = normalizeCharacterIds(payload.character_ids);

  return {
    title,
    slug,
    type: normalizedType,
    status: normalizedStatus,
    image_url: readNullableString(payload.image_url),
    location: readNullableString(payload.location),
    report: readNullableString(payload.report),
    last_session_at: readNullableString(payload.last_session_at),
    next_session_at: readNullableString(payload.next_session_at),
    characterIds,
  };
}

async function upsertQuest(
  supabase: ReturnType<typeof createClient>,
  payload: {
    title: string;
    slug: string;
    type: string;
    status: string;
    image_url: string | null;
    location: string | null;
    report: string | null;
    last_session_at: string | null;
    next_session_at: string | null;
  },
) {
  const { data, error } = await supabase
    .from("quests")
    .upsert(
      {
        title: payload.title,
        slug: payload.slug,
        type: payload.type,
        status: payload.status,
        image_url: payload.image_url,
        location: payload.location,
        report: payload.report,
        last_session_at: payload.last_session_at,
        next_session_at: payload.next_session_at,
      },
      { onConflict: "slug", ignoreDuplicates: false },
    )
    .select("id,slug,title,type,status,image_url,location,report,last_session_at,next_session_at")
    .single();

  if (error || !data) {
    throw new Error(`Salvataggio quest fallito: ${error?.message ?? "risposta vuota"}`);
  }

  return data;
}

async function syncQuestCharacters(
  supabase: ReturnType<typeof createClient>,
  questId: string | number,
  characterIds: Array<string>,
): Promise<Array<string>> {
  const { error: deleteError } = await supabase.from("quest_characters").delete().eq("quest_id", questId);

  if (deleteError) {
    throw new Error(`Reset squadra fallito: ${deleteError.message}`);
  }

  if (!characterIds.length) {
    return [];
  }

  const rows = characterIds.map((characterId) => ({
    quest_id: questId,
    character_id: characterId,
  }));

  const { error: insertError } = await supabase.from("quest_characters").insert(rows);

  if (insertError) {
    throw new Error(`Assegnazione squadra fallita: ${insertError.message}`);
  }

  return characterIds;
}

function normalizeCharacterIds(value: unknown): Array<string> {
  if (!Array.isArray(value)) {
    return [];
  }

  const unique = new Set<string>();

  for (const item of value) {
    const id = readString(item);
    if (id) {
      unique.add(id);
    }
  }

  return Array.from(unique);
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

function readNullableString(value: unknown): string | null {
  const parsed = readString(value);
  return parsed === "" ? null : parsed;
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