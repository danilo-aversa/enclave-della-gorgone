(function () {
  "use strict";

  var SUPABASE_URL = "https://atglgaritxzowshenaqr.supabase.co";
  var SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0Z2xnYXJpdHh6b3dzaGVuYXFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NzcxNDQsImV4cCI6MjA5MjM1MzE0NH0.ObDvvWMkddZL8wABKyI-TBi4KgVoYArJQjoOnAmVVe8";

  var FALLBACK_QUEST_IMAGE =
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 480'><rect width='800' height='480' fill='%23162229'/><rect x='24' y='24' width='752' height='432' fill='none' stroke='%233b5865' stroke-width='2'/><text x='50%25' y='50%25' fill='%2371ddca' font-family='Arial' font-size='28' text-anchor='middle' dominant-baseline='middle'>Immagine missione non disponibile</text></svg>";

  var FALLBACK_TOKEN_IMAGE =
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' fill='%23162229'/><circle cx='32' cy='24' r='12' fill='%234db8a6'/><rect x='14' y='40' width='36' height='16' fill='%233b5865'/></svg>";

  var QUEST_SUMMARY_MAX_LENGTH = 180;

  document.addEventListener("DOMContentLoaded", function onReady() {
    initQuestSection();

    document.addEventListener("enclave:quest-updated", function onQuestUpdated() {
      initQuestSection();
    });
  });
  async function initQuestSection() {
    var questList = document.querySelector("[data-quest-list]");

    if (!questList) {
      return;
    }

    try {
      var data = await loadQuestDataFromSupabase();
      var characterMap = buildCharacterMap(data.characters);
      var questCharacterMap = buildQuestCharacterMap(data.questCharacters);
      renderQuests(questList, data.quests, characterMap, questCharacterMap);
    } catch (error) {
      console.error("Errore nel caricamento delle missioni:", error);
      renderMessage(questList, "Impossibile caricare le missioni in questo momento.");
    }
  }

  async function loadQuestDataFromSupabase() {
    var responses = await Promise.all([
      fetchFromSupabase(
        "quests",
        [
          "id",
          "slug",
          "title",
          "type",
          "status",
          "image_url",
          "location",
          "summary",
          "report",
          "last_session_at",
          "next_session_at",
        ],
        "order=title.asc"
      ),
      fetchFromSupabase("quest_characters", ["quest_id", "character_id"]),
      fetchFromSupabase(
        "characters",
        ["id", "slug", "name", "portrait_url", "token_url", "class_name", "subclass_name", "level"],
        "order=name.asc"
      ),
    ]);

    return {
      quests: responses[0],
      questCharacters: responses[1],
      characters: responses[2],
    };
  }

  async function fetchFromSupabase(tableName, fields, extraQuery) {
    var query = "?select=" + encodeURIComponent(fields.join(","));

    if (extraQuery) {
      query += "&" + extraQuery;
    }

    var url = SUPABASE_URL + "/rest/v1/" + tableName + query;

    var response = await fetch(url, {
      method: "GET",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: "Bearer " + SUPABASE_ANON_KEY,
      },
    });

    var payload = await parseResponseBody(response);

    if (!response.ok) {
      throw new Error(readSupabaseError(payload, response.status, tableName));
    }

    if (!Array.isArray(payload)) {
      throw new Error("Risposta Supabase non valida per " + tableName + ".");
    }

    return payload;
  }

  function buildCharacterMap(characters) {
    var map = new Map();

    for (var i = 0; i < characters.length; i += 1) {
      var character = characters[i];
      var key = toKey(character && character.id);

      if (!key) {
        console.warn("Personaggio ignorato: id mancante.", character);
        continue;
      }

      map.set(key, character);
    }

    return map;
  }

  function buildQuestCharacterMap(rows) {
    var grouped = new Map();

    for (var i = 0; i < rows.length; i += 1) {
      var row = rows[i];
      var questKey = toKey(row && row.quest_id);
      var characterKey = toKey(row && row.character_id);

      if (!questKey || !characterKey) {
        continue;
      }

      if (!grouped.has(questKey)) {
        grouped.set(questKey, []);
      }

      grouped.get(questKey).push(characterKey);
    }

    return grouped;
  }

  function renderQuests(container, quests, characterMap, questCharacterMap) {
    container.innerHTML = "";

    if (!Array.isArray(quests) || quests.length === 0) {
      renderMessage(container, "Nessuna missione attiva disponibile.");
      return;
    }

    var fragment = document.createDocumentFragment();

    for (var i = 0; i < quests.length; i += 1) {
      var questCard = renderQuestCard(quests[i], characterMap, questCharacterMap);
      if (questCard) {
        fragment.appendChild(questCard);
      }
    }

    if (!fragment.childNodes.length) {
      renderMessage(container, "Nessuna missione valida da mostrare.");
      return;
    }

    container.appendChild(fragment);
  }

  function renderQuestCard(quest, characterMap, questCharacterMap) {
    if (!quest || typeof quest !== "object") {
      console.warn("Missione ignorata: formato non valido.", quest);
      return null;
    }

    var title = readString(quest.title, "Missione senza titolo");
    var questId = toKey(quest.id);
    var questSlug = readString(quest.slug, slugify(title || questId || "quest"));
    var summaryText = buildQuestCardSummary(quest);
    var imagePath = readString(quest.image_url, FALLBACK_QUEST_IMAGE);

    var sessionInfo = buildSessionInfo(quest);
    var statusInfo = mapQuestStatus(quest.status);
    var typeLabel = mapQuestType(quest.type);

    var article = createElement("article", "quest-item");
    article.setAttribute("aria-label", "Missione " + title);
    article.style.setProperty("--quest-bg-image", toCssBackgroundImage(imagePath));

    var questTop = createElement("div", "quest-top");
    var heading = createElement("h3", "", title);
    questTop.appendChild(heading);

    var badges = createElement("div", "quest-badges");
    badges.appendChild(createElement("span", "quest-type", typeLabel));

    var status = createElement("span", "status " + statusInfo.className, statusInfo.label);
    badges.appendChild(status);

    questTop.appendChild(badges);
    article.appendChild(questTop);

    var layout = createElement("div", "quest-layout");

    var media = createElement("figure", "quest-media");
    var image = document.createElement("img");
    image.src = imagePath;
    image.alt = "Veduta missione " + title;
    attachImageFallback(image, FALLBACK_QUEST_IMAGE);
    media.appendChild(image);

    var body = createElement("div", "quest-body");
    body.appendChild(renderTokenRow(questId, characterMap, questCharacterMap));

    var locationValue = readString(quest.location, "Luogo non disponibile");
    var metaGrid = createElement("div", "quest-meta-grid");
    metaGrid.appendChild(renderField("Luogo", locationValue));
    metaGrid.appendChild(renderField(sessionInfo.label, sessionInfo.value));

    var summaryField = renderField("Sintesi", summaryText);
    summaryField.classList.add("quest-field--report");
    metaGrid.appendChild(summaryField);

    body.appendChild(metaGrid);

    layout.appendChild(media);
    layout.appendChild(body);

    article.appendChild(layout);

    var cta = createElement("a", "quest-cta", "Apri missione");
    cta.href = "quest.html?quest=" + encodeURIComponent(questSlug);
    article.appendChild(cta);

    return article;
  }

  function buildQuestCardSummary(quest) {
    var summary = readString(quest.summary, "");
    var fallbackReport = readString(quest.report, "");
    var source = summary || fallbackReport || "Nessuna sintesi disponibile.";
    return truncateText(source, QUEST_SUMMARY_MAX_LENGTH);
  }

  function renderTokenRow(questId, characterMap, questCharacterMap) {
    var wrapper = createElement("div", "quest-team");
    wrapper.setAttribute("aria-label", "Gruppo assegnato");
    wrapper.appendChild(createElement("span", "field-label", "Gruppo"));

    var list = createElement("ul", "token-list");
    var characterIds = questCharacterMap.get(questId) || [];

    for (var i = 0; i < characterIds.length; i += 1) {
      var character = characterMap.get(characterIds[i]);

      if (!character) {
        console.warn("Missione con personaggio non trovato:", characterIds[i]);
        continue;
      }

      var characterSlug = readString(character.slug, "");
      if (!characterSlug) {
        continue;
      }

      var tokenPath =
        readString(character.portrait_url, "") ||
        readString(character.token_url, "") ||
        FALLBACK_TOKEN_IMAGE;

      var tooltipText = buildCharacterTooltip(character);

      var listItem = document.createElement("li");
      var link = document.createElement("a");
      link.className = "token-link";
      link.href = "characters.html?character=" + encodeURIComponent(characterSlug);
      link.setAttribute("aria-label", "Apri scheda di " + readString(character.name, "personaggio"));
      link.dataset.tooltip = tooltipText;

      var img = document.createElement("img");
      img.src = tokenPath;
      img.alt = readString(character.name, "Personaggio");
      attachImageFallback(img, FALLBACK_TOKEN_IMAGE);

      link.appendChild(img);
      listItem.appendChild(link);
      list.appendChild(listItem);
    }

    if (!list.childNodes.length) {
      wrapper.appendChild(createElement("p", "quest-empty", "Nessun personaggio assegnato."));
      return wrapper;
    }

    wrapper.appendChild(list);
    return wrapper;
  }

  function buildCharacterTooltip(character) {
    var lines = [];
    var name = readString(character.name, "Personaggio");
    lines.push(name);

    var className = readString(character.class_name, "");
    var subclassName = readString(character.subclass_name, "");

    if (className && subclassName) {
      lines.push(className + " - " + subclassName);
    } else if (className) {
      lines.push(className);
    }

    if (character.level != null && character.level !== "") {
      lines.push("Livello " + character.level);
    }

    return lines.join("\n");
  }

  function renderField(label, value) {
    var field = createElement("div", "quest-field");
    field.appendChild(createElement("span", "field-label", label));
    field.appendChild(createElement("p", "", value));
    return field;
  }

  function buildSessionInfo(quest) {
    var nextSession = readString(quest.next_session_at, "");
    var lastSession = readString(quest.last_session_at, "");

    if (nextSession) {
      return {
        label: "Prossima sessione",
        value: formatDate(nextSession),
      };
    }

    if (lastSession) {
      return {
        label: "Ultima sessione",
        value: formatDate(lastSession),
      };
    }

    return {
      label: "Sessione",
      value: "Da pianificare",
    };
  }

  function formatDate(dateString) {
    if (!dateString) {
      return "Data non disponibile";
    }

    var parsed = new Date(dateString);
    if (Number.isNaN(parsed.getTime())) {
      return dateString;
    }

    return new Intl.DateTimeFormat("it-IT", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(parsed);
  }

  function toCssBackgroundImage(path) {
    var src = readString(path, FALLBACK_QUEST_IMAGE);
    var sanitized = src.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\)/g, "\\)");
    return 'url("' + sanitized + '")';
  }

  function mapQuestType(type) {
    if (type === "main") {
      return "Missione principale";
    }

    if (type === "side") {
      return "Missione secondaria";
    }

    return "Missione secondaria";
  }

  function mapQuestStatus(status) {
    switch (readString(status, "")) {
      case "in-corso":
        return { label: "In corso", className: "status-ongoing" };
      case "prioritaria":
        return { label: "Prioritaria", className: "status-alert" };
      case "preparazione":
        return { label: "Preparazione", className: "status-setup" };
      case "conclusa":
        return { label: "Conclusa", className: "status-complete" };
      case "sospesa":
        return { label: "Sospesa", className: "status-suspended" };
      default:
        return { label: "In corso", className: "status-ongoing" };
    }
  }

  function truncateText(value, maxLength) {
    var text = readString(value, "");
    if (!text) {
      return "";
    }

    var normalized = text.replace(/\s+/g, " ").trim();
    if (normalized.length <= maxLength) {
      return normalized;
    }

    return normalized.slice(0, maxLength - 1).trimEnd() + "…";
  }

  function renderMessage(container, text) {
    container.innerHTML = "";
    container.appendChild(createElement("p", "quest-empty", text));
  }

  function attachImageFallback(image, fallbackSrc) {
    image.addEventListener("error", function onImageError() {
      if (image.dataset.fallbackApplied === "true") {
        return;
      }

      image.dataset.fallbackApplied = "true";
      image.src = fallbackSrc;
    });
  }

  async function parseResponseBody(response) {
    var text = await response.text();

    if (!text) {
      return null;
    }

    try {
      return JSON.parse(text);
    } catch (_error) {
      return null;
    }
  }

  function readSupabaseError(payload, statusCode, tableName) {
    var details = payload && payload.message ? payload.message : payload && payload.error;
    if (details) {
      return String(details);
    }

    return "Richiesta fallita (" + tableName + ", " + statusCode + ").";
  }

  function toKey(value) {
    return value === null || value === undefined ? "" : String(value);
  }

  function slugify(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function readString(value, fallback) {
    return typeof value === "string" && value.trim() !== "" ? value.trim() : fallback;
  }

  function createElement(tag, className, text) {
    var element = document.createElement(tag);

    if (className) {
      element.className = className;
    }

    if (typeof text === "string") {
      element.textContent = text;
    }

    return element;
  }
})();

