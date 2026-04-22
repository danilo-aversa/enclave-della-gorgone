import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

type ReorderItem = {
  slug: string;
  sortOrder: number;
};

type ReorderPayload = {
  section: string;
  parentSlug: string | null;
  items: ReorderItem[];
};

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type,x-import-secret,apikey,authorization",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};

const IMPORT_SECRET = Deno.env.get("IMPORT_SECRET") ?? "Gorgone-Import-9f4kLm2Qx7pR8vT1zA";

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
    const rawPayload = await req.json();
    const payload = normalizePayload(rawPayload);

    const updatedSlugs = await applyReorder(supabase, payload);

    return jsonResponse({
      success: true,
      updated_count: updatedSlugs.length,
      updated_slugs: updatedSlugs,
      section: payload.section,
      parent_slug: payload.parentSlug,
    });
  } catch (error) {
    return jsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : "Errore interno durante il riordino wiki.",
      },
      400,
    );
  }
});

function normalizePayload(raw: unknown): ReorderPayload {
  if (!raw || typeof raw !== "object") {
    throw new Error("Payload riordino non valido.");
  }

  const source = raw as Record<string, unknown>;

  const section = cleanSegment(readString(source.section));
  if (!section) {
    throw new Error("Sezione riordino non valida.");
  }

  const parentSlug = normalizeParentSlug(source.parent_slug);

  if (!Array.isArray(source.items) || source.items.length < 2) {
    throw new Error("Servono almeno due pagine sibling da riordinare.");
  }

  const seen = new Set<string>();
  const items: ReorderItem[] = [];

  for (const rawItem of source.items) {
    if (!rawItem || typeof rawItem !== "object") {
      throw new Error("Elemento riordino non valido.");
    }

    const item = rawItem as Record<string, unknown>;
    const slug = normalizeDocPath(readString(item.slug));

    if (!slug) {
      throw new Error("Slug pagina non valido nel riordino.");
    }

    if (seen.has(slug)) {
      throw new Error(`Slug duplicato nel riordino: ${slug}`);
    }

    const sortOrder = readInteger(item.sort_order);
    if (!Number.isFinite(sortOrder) || sortOrder <= 0) {
      throw new Error(`sort_order non valido per ${slug}.`);
    }

    seen.add(slug);
    items.push({ slug, sortOrder });
  }

  return {
    section,
    parentSlug,
    items,
  };
}

async function applyReorder(
  supabase: ReturnType<typeof createClient>,
  payload: ReorderPayload,
): Promise<string[]> {
  const updatedSlugs: string[] = [];

  for (const item of payload.items) {
    let query = supabase
      .from("wiki_pages")
      .update({ sort_order: item.sortOrder })
      .eq("section", payload.section)
      .eq("slug", item.slug);

    if (payload.parentSlug) {
      query = query.eq("parent_slug", payload.parentSlug);
    } else {
      query = query.is("parent_slug", null);
    }

    const { data, error } = await query.select("slug");

    if (error) {
      throw new Error(`Aggiornamento sort_order fallito per ${item.slug}: ${error.message}`);
    }

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error(
        `Nessuna pagina aggiornata per ${item.slug}. Verifica section/parent_slug del gruppo sibling.`,
      );
    }

    updatedSlugs.push(item.slug);
  }

  return updatedSlugs;
}

function normalizeParentSlug(value: unknown): string | null {
  const normalized = normalizeDocPath(readString(value));
  return normalized || null;
}

function normalizeDocPath(value: string): string {
  const parts = String(value || "")
    .split("/")
    .map((segment) => cleanSegment(segment))
    .filter((segment) => !!segment);

  return parts.join("/");
}

function cleanSegment(value: string): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readInteger(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.floor(parsed) : Number.NaN;
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
