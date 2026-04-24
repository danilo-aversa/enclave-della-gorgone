(function () {
  "use strict";

  var SUPABASE_URL = "https://atglgaritxzowshenaqr.supabase.co";
  var SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0Z2xnYXJpdHh6b3dzaGVuYXFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NzcxNDQsImV4cCI6MjA5MjM1MzE0NH0.ObDvvWMkddZL8wABKyI-TBi4KgVoYArJQjoOnAmVVe8";

  var FALLBACK_QUEST_IMAGE =
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 480'><rect width='800' height='480' fill='%23162229'/><rect x='24' y='24' width='752' height='432' fill='none' stroke='%233b5865' stroke-width='2'/><text x='50%25' y='50%25' fill='%2371ddca' font-family='Arial' font-size='28' text-anchor='middle' dominant-baseline='middle'>Immagine missione non disponibile</text></svg>";

  var FALLBACK_TOKEN_IMAGE =
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' fill='%23162229'/><circle cx='32' cy='24' r='12' fill='%234db8a6'/><rect x='14' y='40' width='36' height='16' fill='%233b5865'/></svg>";

  document.addEventListener("DOMContentLoaded", initQuestPage);

  function initQuestPage() {
    var elements = {
      container: document.querySelector("[data-quest-page]"),
      slugLabel: document.querySelector("[data-quest-slug]"),
      pageTitle: document.querySelector("#quest-page-title"),
      pageSupport: document.querySelector(".quest-page-header .hero-support"),
    };

    if (!elements.container) {
      return;
    }

    loadQuestPage(elements);

    document.addEventListener("enclave:access-code-updated", function onAccessCodeUpdated() {
      var editButton = document.querySelector(".quest-edit-action");
      if (editButton) {
        syncQuestEditButtonAccess(editButton);
      }
    });

    document.addEventListener("enclave:quest-updated", function onQuestUpdated(event) {
      var updatedSlug = readString(event && event.detail && event.detail.slug, "");
      var previousSlug = readString(event && event.detail && event.detail.previousSlug, "");
      var currentSlug = readQuestSlugFromUrl();

      if (!currentSlug || (!updatedSlug && !previousSlug)) {
        return;
      }

      if (currentSlug !== updatedSlug && currentSlug !== previousSlug) {
        return;
      }

      if (updatedSlug && updatedSlug !== currentSlug) {
        updateQuestSlugInUrl(updatedSlug);
      }

      loadQuestPage(elements);
    });
  }

  async function loadQuestPage(elements) {
    var slug = readQuestSlugFromUrl();

    setQuestHeaderState(elements, {
      title: "Scheda missione",
      support: "Dossier operativo della missione selezionata, con stato, squadra e aggiornamenti.",
      slug: slug,
    });

    if (!slug) {
      renderState(elements.container, "Missione non trovata.");
      document.title = "Missioni | Enclave della Gorgone";
      return;
    }

    elements.container.innerHTML = "<p class=\"quest-loading\">Caricamento missione...</p>";

    try {
      var quest = await fetchQuestBySlug(slug);

      if (!quest) {
        renderState(elements.container, "Missione non trovata.");
        document.title = "Missioni | Enclave della Gorgone";
        return;
      }

      var relations = await fetchQuestCharacters(quest.id);
      var characterIds = extractCharacterIds(relations);
      var characters = await fetchCharactersByIds(characterIds);

      renderQuestDetail(elements.container, quest, characters, characterIds);

      setQuestHeaderState(elements, {
        title: readString(quest.title, "Scheda missione"),
        support:
          readString(quest.summary, "") ||
          readString(quest.briefing, "") ||
          "Dossier operativo della missione selezionata.",
        slug: readString(quest.slug, slug),
      });

      document.title = readString(quest.title, "Missione") + " | Enclave della Gorgone";
    } catch (error) {
      console.error("Errore caricamento missione:", error);
      renderState(elements.container, "Impossibile caricare la missione.");
      document.title = "Missioni | Enclave della Gorgone";
    }
  }

  function setQuestHeaderState(elements, options) {
    var titleText = readString(options && options.title, "Scheda missione");
    var supportText = readString(
      options && options.support,
      "Dossier operativo della missione selezionata."
    );
    var slugText = readString(options && options.slug, "");

    if (elements.pageTitle) {
      elements.pageTitle.textContent = titleText;
    }

    if (elements.pageSupport) {
      elements.pageSupport.textContent = supportText;
    }

    if (elements.slugLabel) {
      elements.slugLabel.textContent = slugText ? "Slug: " + slugText : "";
    }
  }

  async function fetchQuestBySlug(slug) {
    var url =
      SUPABASE_URL +
      "/rest/v1/quests?select=" +
      encodeURIComponent(
        [
          "id",
          "slug",
          "title",
          "type",
          "status",
          "image_url",
          "location",
          "summary",
          "briefing",
          "report",
          "objective_primary",
          "objective_secondary",
          "notes",
          "last_session_at",
          "next_session_at",
        ].join(",")
      ) +
      "&slug=eq." +
      encodeURIComponent(slug) +
      "&limit=1";

    var response = await fetch(url, {
      method: "GET",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: "Bearer " + SUPABASE_ANON_KEY,
      },
    });

    var payload = await parseResponseBody(response);

    if (!response.ok) {
      throw new Error(readSupabaseError(payload, response.status));
    }

    if (!Array.isArray(payload) || !payload.length) {
      return null;
    }

    return payload[0];
  }

  async function fetchQuestCharacters(questId) {
    var url =
      SUPABASE_URL +
      "/rest/v1/quest_characters?select=" +
      encodeURIComponent("quest_id,character_id") +
      "&quest_id=eq." +
      encodeURIComponent(String(questId));

    var response = await fetch(url, {
      method: "GET",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: "Bearer " + SUPABASE_ANON_KEY,
      },
    });

    var payload = await parseResponseBody(response);

    if (!response.ok) {
      throw new Error(readSupabaseError(payload, response.status));
    }

    return Array.isArray(payload) ? payload : [];
  }

  async function fetchCharactersByIds(characterIds) {
    if (!characterIds.length) {
      return [];
    }

    var url =
      SUPABASE_URL +
      "/rest/v1/characters?select=" +
      encodeURIComponent("id,slug,name,portrait_url,token_url,class_name,subclass_name,level") +
      "&id=in.(" +
      characterIds.join(",") +
      ")";

    var response = await fetch(url, {
      method: "GET",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: "Bearer " + SUPABASE_ANON_KEY,
      },
    });

    var payload = await parseResponseBody(response);

    if (!response.ok) {
      throw new Error(readSupabaseError(payload, response.status));
    }

    return Array.isArray(payload) ? payload : [];
  }

  function renderQuestDetail(container, quest, characters, characterIds) {
    container.innerHTML = "";

    var article = document.createElement("article");
    article.className = "quest-detail";

    var header = document.createElement("div");
    header.className = "quest-detail-head";

    var headerTop = document.createElement("div");
    headerTop.className = "quest-detail-head-top";

    var meta = document.createElement("div");
    meta.className = "quest-detail-meta";

    meta.appendChild(createBadge("quest-type", mapQuestType(quest.type)));

    var statusInfo = mapQuestStatus(quest.status);
    meta.appendChild(createBadge("status " + statusInfo.className, statusInfo.label));

    var location = readString(quest.location, "");
    if (location) {
      meta.appendChild(createBadge("quest-location", location));
    }

    var editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "quest-edit-action";
    editButton.textContent = "Modifica missione";
    syncQuestEditButtonAccess(editButton);

    editButton.addEventListener("click", function onEditClick() {
      if (editButton.disabled) {
        return;
      }

      document.dispatchEvent(
        new CustomEvent("enclave:open-quest-editor", {
          detail: {
            quest: {
              id: quest.id,
              slug: readString(quest.slug, ""),
              title: readString(quest.title, ""),
              type: readString(quest.type, "side"),
              status: readString(quest.status, "in-corso"),
              image_url: readString(quest.image_url, ""),
              location: readString(quest.location, ""),
              summary: readString(quest.summary, ""),
              briefing: readString(quest.briefing, ""),
              report: readString(quest.report, ""),
              objective_primary: readString(quest.objective_primary, ""),
              objective_secondary: readString(quest.objective_secondary, ""),
              notes: readString(quest.notes, ""),
              last_session_at: readString(quest.last_session_at, ""),
              next_session_at: readString(quest.next_session_at, ""),
            },
            characterIds: characterIds.slice(),
          },
        })
      );
    });

    headerTop.appendChild(meta);
    headerTop.appendChild(editButton);
    header.appendChild(headerTop);
    article.appendChild(header);

    var media = document.createElement("figure");
    media.className = "quest-detail-media";

    var image = document.createElement("img");
    image.src = readString(quest.image_url, FALLBACK_QUEST_IMAGE);
    image.alt = "Immagine della missione " + readString(quest.title, "selezionata");
    attachImageFallback(image, FALLBACK_QUEST_IMAGE);

    media.appendChild(image);
    article.appendChild(media);

    var layout = document.createElement("div");
    layout.className = "quest-detail-layout";

    var main = document.createElement("div");
    main.className = "quest-detail-main";

    var summaryText = readString(quest.summary, "");
    if (summaryText) {
      main.appendChild(buildTextSection("Sintesi", summaryText));
    }

    var briefingText =
      readString(quest.briefing, "") ||
      readString(quest.summary, "") ||
      readString(quest.report, "");

    main.appendChild(
      buildTextSection("Briefing", briefingText || "Briefing non disponibile.")
    );

    var reportText = readString(quest.report, "");
    if (reportText) {
      main.appendChild(buildTextSection("Ultimo rapporto", reportText));
    }

    var objectivesSection = buildObjectivesSection(
      readString(quest.objective_primary, ""),
      readString(quest.objective_secondary, "")
    );
    if (objectivesSection) {
      main.appendChild(objectivesSection);
    }

    var notesText = readString(quest.notes, "");
    if (notesText) {
      main.appendChild(buildTextSection("Note operative", notesText));
    }

    layout.appendChild(main);

    var side = document.createElement("aside");
    side.className = "quest-detail-side";

    side.appendChild(buildMissionDataCard(quest));
    side.appendChild(buildTeamCard(characters, characterIds));

    layout.appendChild(side);

    article.appendChild(layout);
    container.appendChild(article);
  }

  function buildTextSection(titleText, bodyText) {
    var section = document.createElement("section");
    section.className = "quest-detail-section";

    var title = document.createElement("h3");
    title.textContent = titleText;
    section.appendChild(title);

    appendRichText(section, bodyText);

    return section;
  }

  function buildObjectivesSection(primaryText, secondaryText) {
    if (!primaryText && !secondaryText) {
      return null;
    }

    var section = document.createElement("section");
    section.className = "quest-detail-section";

    var title = document.createElement("h3");
    title.textContent = "Obiettivi";
    section.appendChild(title);

    var wrap = document.createElement("div");
    wrap.className = "quest-objectives";

    if (primaryText) {
      wrap.appendChild(buildObjectiveBlock("Obiettivo principale", primaryText));
    }

    if (secondaryText) {
      wrap.appendChild(buildObjectiveBlock("Obiettivi secondari", secondaryText));
    }

    section.appendChild(wrap);
    return section;
  }

  function buildObjectiveBlock(labelText, bodyText) {
    var block = document.createElement("div");
    block.className = "quest-objective-block";

    var label = document.createElement("span");
    label.className = "field-label";
    label.textContent = labelText;
    block.appendChild(label);

    appendRichText(block, bodyText);

    return block;
  }

  function buildMissionDataCard(quest) {
    var section = document.createElement("section");
    section.className = "quest-detail-section quest-detail-card";

    var title = document.createElement("h3");
    title.textContent = "Dati missione";
    section.appendChild(title);

    var grid = document.createElement("div");
    grid.className = "quest-session-grid";

    grid.appendChild(buildSessionItem("Ultima sessione", formatDate(readString(quest.last_session_at, ""))));
    grid.appendChild(buildSessionItem("Prossima sessione", formatDate(readString(quest.next_session_at, ""))));

    if (readString(quest.location, "")) {
      grid.appendChild(buildSessionItem("Luogo", readString(quest.location, "")));
    }

    section.appendChild(grid);
    return section;
  }

  function buildTeamCard(characters, characterIds) {
    var section = document.createElement("section");
    section.className = "quest-detail-section quest-detail-card";

    var title = document.createElement("h3");
    title.textContent = "Squadra assegnata";
    section.appendChild(title);

    if (!characterIds.length) {
      var empty = document.createElement("p");
      empty.textContent = "Nessun personaggio assegnato.";
      section.appendChild(empty);
      return section;
    }

    var characterMap = new Map();

    for (var i = 0; i < characters.length; i += 1) {
      if (!characters[i] || characters[i].id === null || characters[i].id === undefined) {
        continue;
      }

      characterMap.set(String(characters[i].id), characters[i]);
    }

    var list = document.createElement("ul");
    list.className = "token-list quest-team-list";

    for (var j = 0; j < characterIds.length; j += 1) {
      var character = characterMap.get(characterIds[j]);
      if (!character) {
        continue;
      }

      var slug = readString(character.slug, "");
      if (!slug) {
        continue;
      }

      var li = document.createElement("li");

      var link = document.createElement("a");
      link.className = "token-link";
      link.href = "characters.html?character=" + encodeURIComponent(slug);
      link.dataset.tooltip = buildCharacterTooltip(character);
      link.setAttribute("aria-label", "Apri scheda di " + readString(character.name, "personaggio"));

      var img = document.createElement("img");
      img.src =
        readString(character.portrait_url, "") ||
        readString(character.token_url, "") ||
        FALLBACK_TOKEN_IMAGE;
      img.alt = readString(character.name, "Personaggio");
      attachImageFallback(img, FALLBACK_TOKEN_IMAGE);

      link.appendChild(img);
      li.appendChild(link);
      list.appendChild(li);
    }

    if (!list.childNodes.length) {
      var none = document.createElement("p");
      none.textContent = "Nessun personaggio assegnato.";
      section.appendChild(none);
      return section;
    }

    section.appendChild(list);
    return section;
  }

  function buildSessionItem(labelText, valueText) {
    var item = document.createElement("div");
    item.className = "quest-session-item";

    var label = document.createElement("span");
    label.className = "field-label";
    label.textContent = labelText;

    var value = document.createElement("p");
    value.textContent = valueText || "Da pianificare";

    item.appendChild(label);
    item.appendChild(value);

    return item;
  }

  function appendRichText(container, text) {
    var normalized = normalizeTextBlocks(text);

    if (!normalized.length) {
      var empty = document.createElement("p");
      empty.textContent = "Nessun contenuto disponibile.";
      container.appendChild(empty);
      return;
    }

    for (var i = 0; i < normalized.length; i += 1) {
      var paragraph = document.createElement("p");
      appendTextWithLineBreaks(paragraph, normalized[i]);
      container.appendChild(paragraph);
    }
  }

  function normalizeTextBlocks(text) {
    var raw = readString(text, "");
    if (!raw) {
      return [];
    }

    return raw
      .split(/\n\s*\n/g)
      .map(function (block) {
        return block.trim();
      })
      .filter(Boolean);
  }

  function appendTextWithLineBreaks(container, text) {
    var lines = String(text || "").split("\n");

    for (var i = 0; i < lines.length; i += 1) {
      if (i > 0) {
        container.appendChild(document.createElement("br"));
      }

      container.appendChild(document.createTextNode(lines[i]));
    }
  }

  function extractCharacterIds(relations) {
    var ids = [];
    var seen = new Set();

    for (var i = 0; i < relations.length; i += 1) {
      var id = relations[i] && relations[i].character_id;
      if (id === null || id === undefined) {
        continue;
      }

      var key = String(id);
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      ids.push(key);
    }

    return ids;
  }

  function buildCharacterTooltip(character) {
    var lines = [];
    lines.push(readString(character.name, "Personaggio"));

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

  function createBadge(className, text) {
    var el = document.createElement("span");
    el.className = className;
    el.textContent = text;
    return el;
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

  function renderState(container, message) {
    container.innerHTML = "";
    var p = document.createElement("p");
    p.className = "quest-empty";
    p.textContent = message;
    container.appendChild(p);
  }

  function formatDate(dateString) {
    if (!dateString) {
      return "Da pianificare";
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

  function readQuestSlugFromUrl() {
    var params = new URLSearchParams(window.location.search);
    return readString(params.get("quest"), "");
  }

  function syncQuestEditButtonAccess(button) {
    var isEnabled = false;

    try {
      isEnabled = window.localStorage.getItem("gorgoneAccessCode") === "Enclave";
    } catch (_error) {
      isEnabled = false;
    }

    button.disabled = !isEnabled;
    button.setAttribute("aria-disabled", String(!isEnabled));

    if (!isEnabled) {
      button.title = "Inserisci il codice Enclave per modificare la missione";
      return;
    }

    button.removeAttribute("title");
  }

  function updateQuestSlugInUrl(slug) {
    try {
      var url = new URL(window.location.href);
      url.searchParams.set("quest", slug);
      window.history.replaceState({}, "", url.toString());
    } catch (_error) {
      window.history.replaceState({}, "", "quest.html?quest=" + encodeURIComponent(slug));
    }
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

  function readSupabaseError(payload, statusCode) {
    var details = payload && payload.message ? payload.message : payload && payload.error;
    if (details) {
      return String(details);
    }

    return "Richiesta fallita (" + statusCode + ").";
  }

  function readString(value, fallback) {
    return typeof value === "string" && value.trim() !== "" ? value.trim() : fallback;
  }
})();

