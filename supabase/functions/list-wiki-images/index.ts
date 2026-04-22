import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type,x-import-secret,apikey,authorization",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
};

const IMPORT_SECRET = Deno.env.get("IMPORT_SECRET") ?? "Gorgone-Import-9f4kLm2Qx7pR8vT1zA";
const STORAGE_BUCKET = "wiki-images";
const LIST_LIMIT = 100;

type StorageFileRow = {
  name: string;
  path: string;
  public_url: string;
  created_at: string | null;
  updated_at: string | null;
};

type StorageListItem = {
  id?: string | null;
  name?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  metadata?: Record<string, unknown> | null;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "GET") {
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
    const files = await listAllImages(supabase, "");

    files.sort((left, right) => {
      const leftDate = Date.parse(left.updated_at ?? left.created_at ?? "");
      const rightDate = Date.parse(right.updated_at ?? right.created_at ?? "");

      const leftValid = Number.isFinite(leftDate);
      const rightValid = Number.isFinite(rightDate);

      if (leftValid && rightValid && rightDate !== leftDate) {
        return rightDate - leftDate;
      }

      if (leftValid && !rightValid) {
        return -1;
      }

      if (!leftValid && rightValid) {
        return 1;
      }

      return left.path.localeCompare(right.path, "it", { sensitivity: "base" });
    });

    return jsonResponse({ success: true, images: files });
  } catch (error) {
    return jsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : "Errore caricamento libreria immagini.",
      },
      400,
    );
  }
});

async function listAllImages(
  supabase: ReturnType<typeof createClient>,
  folderPath: string,
): Promise<StorageFileRow[]> {
  const files: StorageFileRow[] = [];
  const childFolders: string[] = [];

  let offset = 0;

  while (true) {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .list(folderPath, {
        limit: LIST_LIMIT,
        offset,
        sortBy: { column: "name", order: "asc" },
      });

    if (error) {
      throw new Error(`List bucket fallita (${folderPath || "/"}): ${error.message}`);
    }

    const rows = Array.isArray(data) ? (data as StorageListItem[]) : [];
    if (!rows.length) {
      break;
    }

    for (const row of rows) {
      const name = readString(row.name);
      if (!name) {
        continue;
      }

      const nextPath = folderPath ? `${folderPath}/${name}` : name;

      if (isFolderRow(row)) {
        childFolders.push(nextPath);
        continue;
      }

      if (!isAllowedImageName(name)) {
        continue;
      }

      const { data: publicData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(nextPath);
      const publicUrl = readString(publicData?.publicUrl);

      files.push({
        name,
        path: nextPath,
        public_url: publicUrl,
        created_at: readNullableString(row.created_at),
        updated_at: readNullableString(row.updated_at),
      });
    }

    if (rows.length < LIST_LIMIT) {
      break;
    }

    offset += rows.length;
  }

  for (const childFolder of childFolders) {
    const nestedFiles = await listAllImages(supabase, childFolder);
    for (const nested of nestedFiles) {
      files.push(nested);
    }
  }

  return files;
}

function isFolderRow(row: StorageListItem): boolean {
  if (row.id === null) {
    return true;
  }

  if (row.metadata === null) {
    return true;
  }

  const metadata = row.metadata;
  if (!metadata || typeof metadata !== "object") {
    return true;
  }

  return false;
}

function isAllowedImageName(name: string): boolean {
  const extension = getFileExtension(name);
  return ["jpg", "jpeg", "png", "webp", "gif"].includes(extension);
}

function getFileExtension(fileName: string): string {
  const clean = readString(fileName).toLowerCase();
  const lastDot = clean.lastIndexOf(".");

  if (lastDot <= -1 || lastDot === clean.length - 1) {
    return "";
  }

  return clean.slice(lastDot + 1);
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readNullableString(value: unknown): string | null {
  const cleaned = readString(value);
  return cleaned || null;
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
