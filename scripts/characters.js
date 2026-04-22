(function () {
  "use strict";

  var SUPABASE_URL = "https://atglgaritxzowshenaqr.supabase.co";
  var SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0Z2xnYXJpdHh6b3dzaGVuYXFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NzcxNDQsImV4cCI6MjA5MjM1MzE0NH0.ObDvvWMkddZL8wABKyI-TBi4KgVoYArJQjoOnAmVVe8";

  var state = {
    all: [],
    filtered: [],
    selectedSlug: "",
  };

  document.addEventListener("DOMContentLoaded", initCharactersPage);

  async function initCharactersPage() {
    var elements = {
      search: document.querySelector("[data-characters-search]"),
      searchToggle: document.querySelector("[data-characters-search-toggle]"),
      searchPanel: document.querySelector("[data-characters-search-panel]"),
      roster: document.querySelector("[data-characters-roster]"),
      detail: document.querySelector("[data-character-detail]"),
    };

    if (!elements.roster || !elements.detail) {
      return;
    }

    bindSearch(elements);

    try {
      var rows = await fetchCharactersFromSupabase();
      state.all = normalizeCharacters(rows);
      state.filtered = state.all.slice();

      if (!state.filtered.length) {
        renderEmptyState(elements, "Nessun personaggio disponibile al momento.");
        return;
      }

      var slugFromUrl = readCharacterSlugFromUrl();
      var initial = findBySlug(state.filtered, slugFromUrl) || state.filtered[0];
      state.selectedSlug = initial.slug;
      updateUrlCharacter(state.selectedSlug, true);

      renderRoster(elements, false);
      renderCharacterDetail(elements, initial);
    } catch (error) {
      console.warn("Errore caricamento personaggi:", error);
      renderErrorState(elements, readString(error && error.message, "Errore di caricamento."));
    }

    window.addEventListener("popstate", function onPopState() {
      if (!state.filtered.length) {
        return;
      }

      var fromUrl = readCharacterSlugFromUrl();
      var current = findBySlug(state.filtered, fromUrl) || state.filtered[0];
      state.selectedSlug = current.slug;
      renderRoster(elements, true);
      renderCharacterDetail(elements, current);
    });
  }

  function bindSearch(elements) {
    if (elements.search) {
      elements.search.addEventListener("input", function onSearchInput() {
        var query = elements.search.value.trim().toLowerCase();

        state.filtered = state.all.filter(function (character) {
          return character.name.toLowerCase().includes(query);
        });

        if (!state.filtered.length) {
          state.selectedSlug = "";
          elements.roster.innerHTML = "<p class=\"characters-state\">Nessun risultato per la ricerca.</p>";
          elements.detail.innerHTML = "<p class=\"characters-state\">Nessun personaggio da mostrare.</p>";
          return;
        }

        if (!findBySlug(state.filtered, state.selectedSlug)) {
          state.selectedSlug = state.filtered[0].slug;
          updateUrlCharacter(state.selectedSlug, true);
        }

        renderRoster(elements, true);
        renderCharacterDetail(elements, findBySlug(state.filtered, state.selectedSlug) || state.filtered[0]);
      });
    }

    if (!elements.searchToggle || !elements.searchPanel || !elements.search) {
      return;
    }

    function openSearchPanel() {
      elements.searchPanel.hidden = false;
      elements.searchToggle.setAttribute("aria-expanded", "true");
      window.requestAnimationFrame(function () {
        elements.search.focus();
      });
    }

    function closeSearchPanel() {
      elements.searchPanel.hidden = true;
      elements.searchToggle.setAttribute("aria-expanded", "false");
    }

    elements.searchToggle.addEventListener("click", function onToggleSearch() {
      if (elements.searchPanel.hidden) {
        openSearchPanel();
        return;
      }

      closeSearchPanel();
    });

    document.addEventListener("keydown", function onSearchEscape(event) {
      if (event.key === "Escape" && !elements.searchPanel.hidden) {
        closeSearchPanel();
        elements.searchToggle.focus();
      }
    });

    document.addEventListener("click", function onOutsideSearchClick(event) {
      if (elements.searchPanel.hidden) {
        return;
      }

      var insidePanel = elements.searchPanel.contains(event.target);
      var onToggle = elements.searchToggle.contains(event.target);

      if (!insidePanel && !onToggle) {
        closeSearchPanel();
      }
    });
  }

  async function fetchCharactersFromSupabase() {
    var key = SUPABASE_ANON_KEY || readString(localStorage.getItem("gorgoneSupabaseAnonKey"), "");

    if (!SUPABASE_URL || !key) {
      throw new Error("Configura la chiave Supabase anon nel file scripts/characters.js o in localStorage (gorgoneSupabaseAnonKey).");
    }

    var selectFields = [
      "id",
      "foundry_id",
      "slug",
      "name",
      "portrait_url",
      "token_url",
      "class_name",
      "subclass_name",
      "level",
      "background",
      "bio",
      "appearance",
      "trait",
      "status",
      "created_at",
      "updated_at",
    ].join(",");

    var url = SUPABASE_URL + "/rest/v1/characters?select=" + encodeURIComponent(selectFields) + "&order=name.asc";

    var response = await fetch(url, {
      method: "GET",
      headers: {
        apikey: key,
        Authorization: "Bearer " + key,
      },
    });

    var payload = await parseResponseBody(response);

    if (!response.ok) {
      throw new Error(readSupabaseError(payload, response.status));
    }

    if (!Array.isArray(payload)) {
      throw new Error("Risposta personaggi non valida.");
    }

    return payload;
  }

  function normalizeCharacters(rows) {
    return rows
      .map(function (row) {
        var name = readString(row.name, "Personaggio senza nome");
        var foundryId = readString(row.foundry_id, "");
        var fallbackSlug = slugify(name || foundryId || String(row.id || "personaggio"));

        return {
          id: row.id,
          foundry_id: foundryId,
          slug: readString(row.slug, fallbackSlug) || fallbackSlug,
          name: name,
          portrait_url: readString(row.portrait_url, ""),
          token_url: readString(row.token_url, ""),
          class_name: readString(row.class_name, ""),
          subclass_name: readString(row.subclass_name, ""),
          level: row.level,
          background: readString(row.background, ""),
          bio: readString(row.bio, ""),
          appearance: readString(row.appearance, ""),
          trait: readString(row.trait, ""),
          status: readString(row.status, ""),
        };
      })
      .filter(function (row) {
        return !!row.slug;
      });
  }

  function renderRoster(elements, preserveScroll) {
    var roster = elements.roster;
    var previousScroll = roster.scrollLeft;

    roster.innerHTML = "";

    var fragment = document.createDocumentFragment();

    state.filtered.forEach(function (character) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "roster-item" + (character.slug === state.selectedSlug ? " is-selected" : "");
      button.setAttribute("aria-pressed", String(character.slug === state.selectedSlug));
      button.dataset.slug = character.slug;

      var image = document.createElement("img");
      image.className = "roster-item__image";
      image.src = character.portrait_url || character.token_url || fallbackPortraitSvg(character.name);
      image.alt = "Ritratto di " + character.name;
      image.addEventListener("error", function onImgError() {
        image.src = fallbackPortraitSvg(character.name);
      });

      var label = document.createElement("span");
      label.className = "roster-item__name";
      label.textContent = character.name;

      button.appendChild(image);
      button.appendChild(label);

      button.addEventListener("click", function onSelectCharacter() {
        state.selectedSlug = character.slug;
        renderRoster(elements, true);
        renderCharacterDetail(elements, character);
        updateUrlCharacter(character.slug, false);
      });

      fragment.appendChild(button);
    });

    roster.appendChild(fragment);

    if (preserveScroll) {
      roster.scrollLeft = previousScroll;
    }
  }

function renderCharacterDetail(elements, character) {
  var detail = elements.detail;
  detail.innerHTML = "";

  if (!character) {
    detail.innerHTML = "<p class=\"characters-state\">Nessun personaggio selezionato.</p>";
    return;
  }

  var sheet = document.createElement("article");
  sheet.className = "character-sheet";

  var portraitBox = document.createElement("section");
  portraitBox.className = "character-portrait-box";

  var portrait = document.createElement("img");
  portrait.src = character.portrait_url || character.token_url || fallbackPortraitSvg(character.name);
  portrait.alt = "Ritratto completo di " + character.name;
  portrait.addEventListener("error", function onImgError() {
    portrait.src = fallbackPortraitSvg(character.name);
  });
  portraitBox.appendChild(portrait);

  var statStrip = document.createElement("div");
  statStrip.className = "character-stat-strip";

  appendStatIcon(statStrip, {
    value: character.class_name,
    iconClass: "fa-book-open",
    slot: "class",
    imageSrc: classIconPath(character.class_name),
    tooltip: character.class_name,
  });

  appendStatIcon(statStrip, {
    value: character.subclass_name,
    iconClass: "fa-star",
    slot: "subclass",
    tooltip: character.subclass_name,
  });

  appendStatIcon(statStrip, {
    value: character.level != null ? String(character.level) : "",
    iconClass: "fa-layer-group",
    slot: "level",
    tooltip: character.level != null ? "Livello " + character.level : "",
  });

  appendStatIcon(statStrip, {
    value: character.background,
    iconClass: "fa-scroll",
    slot: "background",
    tooltip: character.background,
  });

  if (statStrip.childNodes.length) {
    portraitBox.appendChild(statStrip);
  }

  var flow = document.createElement("section");
  flow.className = "character-flow";

  var name = document.createElement("h3");
  name.textContent = character.name;
  flow.appendChild(name);

  appendTextSection(flow, "Aspetto", character.appearance, "fa-eye");
  appendTextSection(flow, "Tratti", character.trait, "fa-star");

  if (character.bio) {
    flow.appendChild(buildBiographySection(character.bio));
  }

  sheet.appendChild(portraitBox);
  sheet.appendChild(flow);

  detail.appendChild(sheet);
}

  function appendStatIcon(container, options) {
    if (!options || !options.value) {
      return;
    }

    var tooltip = readString(options.tooltip || options.value, "");
    if (!tooltip) {
      return;
    }

    var item = document.createElement("div");
    item.className = "character-stat-icon";
    item.dataset.tooltip = tooltip;
    item.setAttribute("role", "img");
    item.setAttribute("aria-label", tooltip);
    item.tabIndex = 0;

    var media = document.createElement("span");
    media.className = "character-stat-icon__media";
    media.dataset.iconSlot = options.slot || "generic";

    renderStatIconMedia(media, options.imageSrc, options.iconClass);

    item.appendChild(media);
    container.appendChild(item);
  }

  function renderStatIconMedia(media, imageSrc, fallbackIconClass) {
    media.innerHTML = "";

    var safeImageSrc = readString(imageSrc, "");
    if (safeImageSrc) {
      var image = document.createElement("img");
      image.src = safeImageSrc;
      image.alt = "";
      image.decoding = "async";
      image.loading = "lazy";

      image.addEventListener("error", function onImageError() {
        media.innerHTML = "";
        media.appendChild(buildFallbackIcon(fallbackIconClass));
      });

      media.appendChild(image);
      return;
    }

    media.appendChild(buildFallbackIcon(fallbackIconClass));
  }

  function buildFallbackIcon(iconClass) {
    var icon = document.createElement("i");
    icon.className = "fa-solid " + (iconClass || "fa-circle");
    icon.setAttribute("aria-hidden", "true");
    return icon;
  }

  function classIconPath(className) {
    var slug = assetSlug(className);
    return slug ? "assets/icons/classes/" + slug + ".webp" : "";
  }

  function assetSlug(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function buildBiographySection(bioText) {
  var wrap = document.createElement("section");
  wrap.className = "biography-wrap";

  wrap.appendChild(createSectionHeading("Biografia", "fa-scroll"));

  var paragraph = document.createElement("p");
  paragraph.className = "biography-text";
  paragraph.textContent = bioText;
  wrap.appendChild(paragraph);

  var BIO_TOGGLE_THRESHOLD = 2000;

  if (bioText.length > BIO_TOGGLE_THRESHOLD) {
    paragraph.classList.add("is-collapsed");

    var toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "biography-toggle";
    toggle.textContent = "Espandi";

    toggle.addEventListener("click", function onToggle() {
      var collapsed = paragraph.classList.toggle("is-collapsed");
      toggle.textContent = collapsed ? "Espandi" : "Riduci";
    });

    wrap.appendChild(toggle);
  }

  return wrap;
}

  function appendTextSection(container, titleText, value, iconClass) {
    if (!value) {
      return;
    }

    var block = document.createElement("section");
    block.className = "content-block";

    block.appendChild(createSectionHeading(titleText, iconClass));

    var content = document.createElement("p");
    content.textContent = value;

    block.appendChild(content);
    container.appendChild(block);
  }

  function createSectionHeading(text, iconClass) {
    var title = document.createElement("h4");
    title.className = "character-section-head";

    var icon = document.createElement("i");
    icon.className = "fa-solid " + (iconClass || "fa-circle");
    icon.setAttribute("aria-hidden", "true");

    var label = document.createElement("span");
    label.textContent = text;

    title.appendChild(icon);
    title.appendChild(label);

    return title;
  }

  function readCharacterSlugFromUrl() {
    var params = new URLSearchParams(window.location.search);
    return readString(params.get("character"), "");
  }

  function updateUrlCharacter(slug, replace) {
    var params = new URLSearchParams(window.location.search);
    params.set("character", slug);

    var nextUrl = window.location.pathname + "?" + params.toString();

    if (replace) {
      window.history.replaceState({}, "", nextUrl);
      return;
    }

    window.history.pushState({}, "", nextUrl);
  }

  function renderEmptyState(elements, message) {
    elements.roster.innerHTML = "<p class=\"characters-state\">" + escapeHtml(message) + "</p>";
    elements.detail.innerHTML = "<p class=\"characters-state\">Nessuna scheda disponibile.</p>";
  }

  function renderErrorState(elements, message) {
    elements.roster.innerHTML =
      "<p class=\"characters-state\">Impossibile caricare l'archivio personaggi.</p>";
    elements.detail.innerHTML =
      "<p class=\"characters-state\">" +
      escapeHtml(message) +
      "</p>";
  }

  function findBySlug(list, slug) {
    if (!slug) {
      return null;
    }

    for (var i = 0; i < list.length; i += 1) {
      if (list[i].slug === slug) {
        return list[i];
      }
    }

    return null;
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

  function fallbackPortraitSvg(name) {
    var safeName = encodeURIComponent((name || "Personaggio").slice(0, 24));
    return (
      "data:image/svg+xml;utf8," +
      "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 400'>" +
      "<rect width='300' height='400' fill='%23162229'/>" +
      "<rect x='20' y='20' width='260' height='360' fill='none' stroke='%233b5865' stroke-width='2'/>" +
      "<text x='50%25' y='50%25' fill='%2371ddca' font-family='Arial' font-size='20' text-anchor='middle' dominant-baseline='middle'>" +
      safeName +
      "</text></svg>"
    );
  }

  function slugify(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function readString(value, fallback) {
    return typeof value === "string" && value.trim() !== "" ? value : fallback;
  }
})();