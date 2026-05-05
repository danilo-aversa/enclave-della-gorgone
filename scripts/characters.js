(function () {
  "use strict";

  var SUPABASE_URL = "https://atglgaritxzowshenaqr.supabase.co";
  var SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJIUzI1NiIsInR5cCI6IkpXVCJ9";

  SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJIUzI1NiIsInR5cCI6IkpXVCJ9".replace(
    "eyJpc3MiOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
    "eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0Z2xnYXJpdHh6b3dzaGVuYXFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NzcxNDQsImV4cCI6MjA5MjM1MzE0NH0.ObDvvWMkddZL8wABKyI-TBi4KgVoYArJQjoOnAmVVe8"
  );

  var IMPORT_SECRET = "Gorgone-Import-9f4kLm2Qx7pR8vT1zA";

  var ACTIVE_QUEST_STATUSES = new Set(["in-corso", "preparazione", "prioritaria"]);
  var COMPLETED_QUEST_STATUSES = new Set([
    "completata",
    "completato",
    "conclusa",
    "concluso",
    "archiviata",
    "archiviato",
    "completed",
    "complete",
    "done",
  ]);

  var state = {
    all: [],
    filtered: [],
    selectedSlug: "",
    classFilters: new Set(),
    availability: "all",
    isUpdatingCharacter: false,
    rosterDragSuppressClickUntil: 0,
  };

  document.addEventListener("DOMContentLoaded", initCharactersPage);

  async function initCharactersPage() {
    var elements = {
      filters: document.querySelector(".characters-filters"),
      search: document.querySelector("[data-characters-search]"),
      searchToggle: document.querySelector("[data-characters-search-toggle]"),
      searchPanel: document.querySelector("[data-characters-search-panel]"),
      classFilters: document.querySelector("[data-characters-class-filters]"),
      availabilityButtons: document.querySelectorAll("[data-characters-availability]"),
      roster: document.querySelector("[data-characters-roster]"),
      rosterPrev: document.querySelector("[data-characters-roster-prev]"),
      rosterNext: document.querySelector("[data-characters-roster-next]"),
      detail: document.querySelector("[data-character-detail]"),
    };

    if (!elements.roster || !elements.detail) {
      return;
    }

    setupFiltersDrawer(elements);
    bindSearch(elements);
    setupAvailabilityFilterButtons(elements);
    bindAvailabilityFilters(elements);
    bindRosterControls(elements);
    bindRosterDrag(elements);

    try {
      var payload = await fetchCharactersPageData();
      state.all = normalizeCharacters(
        payload.characters,
        payload.activeQuestByCharacter,
        payload.completedQuestsByCharacter
      );

      renderClassFilters(elements);

      if (!state.all.length) {
        renderEmptyState(elements, "Nessun personaggio disponibile al momento.");
        return;
      }

      applyFilters(elements, false);

      var slugFromUrl = readCharacterSlugFromUrl();
      var initial = findBySlug(state.filtered, slugFromUrl) || state.filtered[0];

      if (!initial) {
        renderEmptyState(elements, "Nessun personaggio disponibile al momento.");
        return;
      }

      state.selectedSlug = initial.slug;
      updateUrlCharacter(state.selectedSlug, true);
      renderRoster(elements, false);
      renderCharacterDetail(elements, initial);
      updateRosterNavState(elements);
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
      updateRosterNavState(elements);
    });
  }

  function setupFiltersDrawer(elements) {
    var filters = elements.filters;

    if (!filters || filters.dataset.filterDrawerReady === "true") {
      return;
    }

    var panelId = "characters-filter-panel";
    var toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "characters-filter-toggle";
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-controls", panelId);
    toggle.innerHTML = '<i class="fa-solid fa-chevron-right" aria-hidden="true"></i><span>Filtri e ricerca</span>';

    var panel = document.createElement("div");
    panel.id = panelId;
    panel.className = "characters-filter-panel";
    panel.hidden = true;

    var inner = document.createElement("div");
    inner.className = "characters-filters";

    while (filters.firstChild) {
      inner.appendChild(filters.firstChild);
    }

    panel.appendChild(inner);

    filters.classList.remove("characters-filters");
    filters.classList.add("characters-filter-drawer");
    filters.dataset.filterDrawerReady = "true";
    filters.appendChild(toggle);
    filters.appendChild(panel);
    placeFiltersDrawerAfterRoster(elements, filters);

    elements.filterToggle = toggle;
    elements.filterPanel = panel;

    toggle.addEventListener("click", function onFilterToggleClick() {
      var nextExpanded = panel.hidden;
      panel.hidden = !nextExpanded;
      toggle.setAttribute("aria-expanded", String(nextExpanded));
    });
  }

  function placeFiltersDrawerAfterRoster(elements, filters) {
    if (!filters || !elements || !elements.roster) {
      return;
    }

    var rosterShell = elements.roster.closest(".characters-roster-shell");

    if (!rosterShell) {
      return;
    }

    var header = ensureRosterHeader(rosterShell);
    var actions = header.querySelector(".characters-roster-head__actions");

    if (!actions || filters.parentNode === actions) {
      return;
    }

    filters.classList.add(
      "characters-filter-drawer--bubble",
      "characters-filter-drawer--in-roster",
      "characters-filter-drawer--in-header"
    );
    rosterShell.classList.add("characters-roster-shell--has-filter-drawer");
    actions.appendChild(filters);
  }

  function ensureRosterHeader(rosterShell) {
    var existing = rosterShell.querySelector(":scope > .characters-roster-head");

    if (existing) {
      return existing;
    }

    var header = document.createElement("header");
    header.className = "characters-roster-head";

    var titleWrap = document.createElement("div");
    titleWrap.className = "characters-roster-head__title-wrap";

    var eyebrow = document.createElement("span");
    eyebrow.className = "characters-roster-head__eyebrow";
    eyebrow.textContent = "Archivio Enclave";

    var title = document.createElement("h2");
    title.className = "characters-roster-head__title";
    title.textContent = "Agenti Operativi";

    var actions = document.createElement("div");
    actions.className = "characters-roster-head__actions";

    titleWrap.appendChild(title);
    header.appendChild(titleWrap);
    header.appendChild(actions);
    rosterShell.insertBefore(header, rosterShell.firstChild);

    return header;
  }

  function bindSearch(elements) {
    if (elements.search) {
      elements.search.addEventListener("input", function onSearchInput() {
        applyFilters(elements, true);
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

  function setupAvailabilityFilterButtons(elements) {
    if (!elements.availabilityButtons || !elements.availabilityButtons.length) {
      return;
    }

    for (var i = 0; i < elements.availabilityButtons.length; i += 1) {
      var button = elements.availabilityButtons[i];
      var value = button.getAttribute("data-characters-availability") || "all";
      var label = getAvailabilityFilterLabel(value);
      var iconClass = getAvailabilityFilterIconClass(value);

      button.classList.add("characters-availability-filter");
      button.setAttribute("aria-label", label);
      button.title = label;
      button.innerHTML =
        '<span class="characters-availability-filter__icon"><i class="fa-solid ' +
        iconClass +
        '" aria-hidden="true"></i></span>' +
        '<span class="characters-availability-filter__label">' +
        label +
        '</span>';
    }

    syncAvailabilityButtons(elements);
  }

  function getAvailabilityFilterLabel(value) {
    switch (value) {
      case "free":
        return "Disponibili";
      case "engaged":
        return "Impegnati";
      default:
        return "Tutti";
    }
  }

  function getAvailabilityFilterIconClass(value) {
    switch (value) {
      case "free":
        return "fa-feather";
      case "engaged":
        return "fa-crosshairs";
      default:
        return "fa-users";
    }
  }

  function bindAvailabilityFilters(elements) {
    if (!elements.availabilityButtons || !elements.availabilityButtons.length) {
      return;
    }

    for (var i = 0; i < elements.availabilityButtons.length; i += 1) {
      elements.availabilityButtons[i].addEventListener("click", function onAvailabilityClick(event) {
        var next = event.currentTarget.getAttribute("data-characters-availability") || "all";
        state.availability = next;
        syncAvailabilityButtons(elements);
        applyFilters(elements, true);
      });
    }
  }

  function bindRosterControls(elements) {
    if (elements.rosterPrev) {
      elements.rosterPrev.addEventListener("click", function onPrevClick() {
        scrollRosterBy(elements.roster, -1);
      });
    }

    if (elements.rosterNext) {
      elements.rosterNext.addEventListener("click", function onNextClick() {
        scrollRosterBy(elements.roster, 1);
      });
    }

    if (elements.roster) {
      elements.roster.addEventListener("scroll", function onRosterScroll() {
        updateRosterNavState(elements);
      });
    }

    window.addEventListener("resize", function onResize() {
      updateRosterNavState(elements);
      scheduleCharacterHeaderWidthSync(elements.detail);
    });
  }

  function bindRosterDrag(elements) {
    var roster = elements.roster;

    if (!roster || roster.dataset.rosterDragReady === "true") {
      return;
    }

    roster.dataset.rosterDragReady = "true";
    roster.classList.add("is-grabbable");

    var drag = {
      pointerId: null,
      startX: 0,
      startScrollLeft: 0,
      moved: false,
    };

    roster.addEventListener("pointerdown", function onRosterPointerDown(event) {
      if (event.button !== undefined && event.button !== 0) {
        return;
      }

      if (event.target && event.target.closest("input, textarea, select, a")) {
        return;
      }

      drag.pointerId = event.pointerId;
      drag.startX = event.clientX;
      drag.startScrollLeft = roster.scrollLeft;
      drag.moved = false;
      roster.classList.add("is-pointer-down");
    });

    roster.addEventListener("pointermove", function onRosterPointerMove(event) {
      if (drag.pointerId !== event.pointerId) {
        return;
      }

      var deltaX = event.clientX - drag.startX;

      if (!drag.moved && Math.abs(deltaX) < 5) {
        return;
      }

      drag.moved = true;
      roster.classList.add("is-dragging");

      try {
        roster.setPointerCapture(event.pointerId);
      } catch (_error) {
        // Pointer capture can fail on some synthetic events. Drag still works without it.
      }
      roster.scrollLeft = drag.startScrollLeft - deltaX;
      event.preventDefault();
      updateRosterNavState(elements);
    });

    function endRosterDrag(event) {
      if (drag.pointerId !== event.pointerId) {
        return;
      }

      if (drag.moved) {
        state.rosterDragSuppressClickUntil = Date.now() + 260;
      }

      roster.classList.remove("is-pointer-down", "is-dragging");

      try {
        roster.releasePointerCapture(event.pointerId);
      } catch (_error) {
        // Safe to ignore when capture was not active.
      }

      drag.pointerId = null;
      drag.startX = 0;
      drag.startScrollLeft = 0;
      drag.moved = false;
      updateRosterNavState(elements);
    }

    roster.addEventListener("pointerup", endRosterDrag);
    roster.addEventListener("pointercancel", endRosterDrag);
    roster.addEventListener(
      "click",
      function onRosterClickAfterDrag(event) {
        if (Date.now() <= state.rosterDragSuppressClickUntil) {
          event.preventDefault();
          event.stopPropagation();
        }
      },
      true
    );
  }

  async function fetchCharactersPageData() {
    var key = SUPABASE_ANON_KEY || readString(localStorage.getItem("gorgoneSupabaseAnonKey"), "");

    if (!SUPABASE_URL || !key) {
      throw new Error("Configura la chiave Supabase anon nel file scripts/characters.js o in localStorage (gorgoneSupabaseAnonKey).");
    }

    var responses = await Promise.all([
      fetchFromSupabase("characters", "*", "order=name.asc", key),
      fetchFromSupabase("quests", "*", "", key),
      fetchFromSupabase("quest_characters", "quest_id,character_id", "", key),
    ]);

    var questMaps = buildQuestMaps(responses[1], responses[2]);

    return {
      characters: responses[0],
      activeQuestByCharacter: questMaps.activeQuestByCharacter,
      completedQuestsByCharacter: questMaps.completedQuestsByCharacter,
    };
  }

  async function fetchFromSupabase(tableName, selectFields, extraQuery, key) {
    var query = "?select=" + encodeURIComponent(selectFields);

    if (extraQuery) {
      query += "&" + extraQuery;
    }

    var url = SUPABASE_URL + "/rest/v1/" + tableName + query;

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
      throw new Error("Risposta Supabase non valida per " + tableName + ".");
    }

    return payload;
  }

  function buildQuestMaps(quests, questCharacters) {
    var activeQuests = new Map();
    var completedQuests = new Map();
    var activeQuestByCharacter = new Map();
    var completedQuestsByCharacter = new Map();

    for (var i = 0; i < quests.length; i += 1) {
      var quest = quests[i];
      var questId = quest && quest.id !== null && quest.id !== undefined ? String(quest.id) : "";
      var status = normalizeStatus(quest && quest.status);

      if (!questId) {
        continue;
      }

      if (ACTIVE_QUEST_STATUSES.has(status)) {
        activeQuests.set(questId, normalizeQuestSummary(quest));
      }

      if (COMPLETED_QUEST_STATUSES.has(status)) {
        completedQuests.set(questId, normalizeQuestSummary(quest));
      }
    }

    for (var j = 0; j < questCharacters.length; j += 1) {
      var row = questCharacters[j];
      var questIdKey = row && row.quest_id !== null && row.quest_id !== undefined ? String(row.quest_id) : "";
      var characterIdKey = row && row.character_id !== null && row.character_id !== undefined ? String(row.character_id) : "";

      if (!questIdKey || !characterIdKey) {
        continue;
      }

      if (activeQuests.has(questIdKey)) {
        var candidate = activeQuests.get(questIdKey);
        var current = activeQuestByCharacter.get(characterIdKey);

        if (!current || compareActiveQuestPriority(candidate, current) > 0) {
          activeQuestByCharacter.set(characterIdKey, candidate);
        }
      }

      if (completedQuests.has(questIdKey)) {
        var completedList = completedQuestsByCharacter.get(characterIdKey) || [];
        completedList.push(completedQuests.get(questIdKey));
        completedQuestsByCharacter.set(characterIdKey, completedList);
      }
    }

    completedQuestsByCharacter.forEach(function sortCompletedQuests(list) {
      list.sort(compareCompletedQuests);
    });

    return {
      activeQuestByCharacter: activeQuestByCharacter,
      completedQuestsByCharacter: completedQuestsByCharacter,
    };
  }

  function normalizeQuestSummary(quest) {
    return {
      id: quest.id,
      slug: readString(quest.slug, ""),
      title: readString(quest.title, "Missione"),
      status: normalizeStatus(quest.status),
      location: readString(quest.location, ""),
      next_session_at: readString(quest.next_session_at, ""),
      last_session_at: readString(quest.last_session_at, ""),
      completed_at:
        readString(quest.completed_at, "") ||
        readString(quest.finished_at, "") ||
        readString(quest.ended_at, "") ||
        readString(quest.operation_end_at, "") ||
        readString(quest.end_date, "") ||
        readString(quest.last_session_at, ""),
      started_at:
        readString(quest.started_at, "") ||
        readString(quest.operation_start_at, "") ||
        readString(quest.start_date, "") ||
        readString(quest.created_at, ""),
    };
  }

  function compareActiveQuestPriority(left, right) {
    var leftPriority = getQuestStatusPriority(left && left.status);
    var rightPriority = getQuestStatusPriority(right && right.status);

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    var leftTime = toSortableDate(left && left.next_session_at);
    var rightTime = toSortableDate(right && right.next_session_at);

    if (leftTime !== rightTime) {
      if (leftTime === Infinity) {
        return -1;
      }

      if (rightTime === Infinity) {
        return 1;
      }

      return rightTime - leftTime < 0 ? 1 : -1;
    }

    return 0;
  }

  function getQuestStatusPriority(status) {
    switch (normalizeStatus(status)) {
      case "prioritaria":
        return 3;
      case "in-corso":
        return 2;
      case "preparazione":
        return 1;
      default:
        return 0;
    }
  }

  function compareCompletedQuests(left, right) {
    var leftTime = toSortableDate(left && left.completed_at);
    var rightTime = toSortableDate(right && right.completed_at);

    if (leftTime !== rightTime) {
      if (leftTime === Infinity) {
        return 1;
      }

      if (rightTime === Infinity) {
        return -1;
      }

      return rightTime - leftTime;
    }

    return readString(left && left.title, "").localeCompare(readString(right && right.title, ""), "it");
  }

  function normalizeStatus(value) {
    return readString(value, "").toLowerCase();
  }

  function toSortableDate(value) {
    var text = readString(value, "");
    if (!text) {
      return Infinity;
    }

    var parsed = new Date(text);
    if (Number.isNaN(parsed.getTime())) {
      return Infinity;
    }

    return parsed.getTime();
  }

  function normalizeCharacters(rows, activeQuestByCharacter, completedQuestsByCharacter) {
    return rows
      .map(function (row) {
        var name = readString(row.name, "Personaggio senza nome");
        var foundryId = readString(row.foundry_id, "");
        var fallbackSlug = slugify(name || foundryId || String(row.id || "personaggio"));
        var characterId = row && row.id !== null && row.id !== undefined ? String(row.id) : "";
        var activeQuest = activeQuestByCharacter.get(characterId) || null;
        var completedQuests = completedQuestsByCharacter.get(characterId) || [];

        return {
          id: row.id,
          foundry_id: foundryId,
          slug: readString(row.slug, fallbackSlug) || fallbackSlug,
          name: name,
          portrait_url: readString(row.portrait_url, ""),
          token_url: readString(row.token_url, ""),
          class_name: readString(row.class_name, ""),
          subclass_name: readString(row.subclass_name, ""),
          species:
            readString(row.species, "") ||
            readString(row.race, "") ||
            readString(row.ancestry, "") ||
            readString(row.lineage, "") ||
            readString(row.kind, ""),
          level: row.level,
          background: readString(row.background, ""),
          motto:
            readString(row.motto, "") ||
            readString(row.quote, "") ||
            readString(row.tagline, "") ||
            readString(row.catchphrase, ""),
          operative_rule: normalizeOperativeRule(row.operative_rule),
          bio: readString(row.bio, ""),
          appearance: readString(row.appearance, ""),
          trait: readString(row.trait, ""),
          status: readString(row.status, ""),
          isExternalCollaborator: readBoolean(row.is_external_collaborator),
          medals: normalizeMedals(
            row.medals !== undefined
              ? row.medals
              : row.badges !== undefined
              ? row.badges
              : row.achievements !== undefined
              ? row.achievements
              : row.medaglie
          ),
          engagement: activeQuest ? "engaged" : "free",
          activeQuest: activeQuest,
          completedQuests: completedQuests,
        };
      })
      .filter(function (row) {
        return !!row.slug;
      });
  }

  function normalizeMedals(value) {
    if (Array.isArray(value)) {
      return value
        .map(function (item) {
          if (typeof item === "string") {
            var title = item.trim();
            return title
              ? {
                  title: title,
                  description: "",
                  iconClass: "fa-award",
                  imageSrc: "",
                }
              : null;
          }

          if (!item || typeof item !== "object") {
            return null;
          }

          var titleText = readString(item.title, "") || readString(item.name, "") || readString(item.label, "");

          if (!titleText) {
            return null;
          }

          return {
            title: titleText,
            description: readString(item.description, "") || readString(item.text, "") || readString(item.details, ""),
            iconClass: readString(item.iconClass, "") || readString(item.icon, "") || "fa-award",
            imageSrc: readString(item.image, "") || readString(item.image_url, "") || readString(item.icon_url, ""),
          };
        })
        .filter(Boolean);
    }

    if (typeof value === "string") {
      var trimmed = value.trim();

      if (!trimmed) {
        return [];
      }

      if (trimmed.charAt(0) === "[" || trimmed.charAt(0) === "{") {
        try {
          return normalizeMedals(JSON.parse(trimmed));
        } catch (_error) {
          return trimmed
            .split(/[\n,;]+/)
            .map(function (entry) {
              var title = entry.trim();
              return title
                ? {
                    title: title,
                    description: "",
                    iconClass: "fa-award",
                    imageSrc: "",
                  }
                : null;
            })
            .filter(Boolean);
        }
      }

      return trimmed
        .split(/[\n,;]+/)
        .map(function (entry) {
          var title = entry.trim();
          return title
            ? {
                title: title,
                description: "",
                iconClass: "fa-award",
                imageSrc: "",
              }
            : null;
        })
        .filter(Boolean);
    }

    return [];
  }

  function renderClassFilters(elements) {
    if (!elements.classFilters) {
      return;
    }

    var classes = [];
    var seen = new Set();

    for (var i = 0; i < state.all.length; i += 1) {
      var className = readString(state.all[i].class_name, "");
      if (!className || seen.has(className)) {
        continue;
      }

      seen.add(className);
      classes.push(className);
    }

    classes.sort(function (left, right) {
      return left.localeCompare(right, "it");
    });

    elements.classFilters.innerHTML = "";

    if (!classes.length) {
      elements.classFilters.innerHTML = "<p class=\"characters-state\">Nessuna classe disponibile.</p>";
      return;
    }

    var fragment = document.createDocumentFragment();

    for (var j = 0; j < classes.length; j += 1) {
      fragment.appendChild(buildClassFilterButton(classes[j], elements));
    }

    elements.classFilters.appendChild(fragment);
  }

  function buildClassFilterButton(className, elements) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "characters-class-filter";
    button.setAttribute("aria-pressed", "false");
    button.setAttribute("aria-label", "Filtra classe " + className);
    button.dataset.classFilter = className;
    button.title = className;

    var iconPath = classIconPath(className);

    if (iconPath) {
      var image = document.createElement("img");
      image.src = iconPath;
      image.alt = "";
      image.decoding = "async";
      image.loading = "lazy";

      image.addEventListener("error", function onImageError() {
        button.innerHTML = "";
        button.appendChild(buildFallbackIcon("fa-book-open"));
      });

      button.appendChild(image);
    } else {
      button.appendChild(buildFallbackIcon("fa-book-open"));
    }

    button.addEventListener("click", function onClassFilterClick() {
      if (state.classFilters.has(className)) {
        state.classFilters.delete(className);
      } else {
        state.classFilters.add(className);
      }

      syncClassFilterButtons(elements);
      applyFilters(elements, true);
    });

    return button;
  }

  function syncClassFilterButtons(elements) {
    if (!elements.classFilters) {
      return;
    }

    var buttons = elements.classFilters.querySelectorAll("[data-class-filter]");

    for (var i = 0; i < buttons.length; i += 1) {
      var className = buttons[i].getAttribute("data-class-filter") || "";
      var isActive = state.classFilters.has(className);
      buttons[i].classList.toggle("is-active", isActive);
      buttons[i].setAttribute("aria-pressed", String(isActive));
    }
  }

  function syncAvailabilityButtons(elements) {
    if (!elements.availabilityButtons || !elements.availabilityButtons.length) {
      return;
    }

    for (var i = 0; i < elements.availabilityButtons.length; i += 1) {
      var value = elements.availabilityButtons[i].getAttribute("data-characters-availability") || "all";
      var isActive = value === state.availability;
      elements.availabilityButtons[i].classList.toggle("is-active", isActive);
      elements.availabilityButtons[i].setAttribute("aria-pressed", String(isActive));
    }
  }

  function applyFilters(elements, preserveScroll) {
    var query = elements.search ? elements.search.value.trim().toLowerCase() : "";

    state.filtered = state.all.filter(function (character) {
      if (query && character.name.toLowerCase().indexOf(query) === -1) {
        return false;
      }

      if (state.availability === "free" && character.engagement !== "free") {
        return false;
      }

      if (state.availability === "engaged" && character.engagement !== "engaged") {
        return false;
      }

      if (state.classFilters.size && !state.classFilters.has(readString(character.class_name, ""))) {
        return false;
      }

      return true;
    });

    if (!state.filtered.length) {
      state.selectedSlug = "";
      elements.roster.innerHTML = "<p class=\"characters-state\">Nessun personaggio corrisponde ai filtri attivi.</p>";
      elements.detail.innerHTML = "<p class=\"characters-state\">Nessun personaggio da mostrare.</p>";
      updateRosterNavState(elements);
      return;
    }

    var selectedCharacter = findBySlug(state.all, state.selectedSlug) || findBySlug(state.filtered, state.selectedSlug) || state.filtered[0];

    if (!state.selectedSlug && selectedCharacter) {
      state.selectedSlug = selectedCharacter.slug;
      updateUrlCharacter(state.selectedSlug, true);
    }

    renderRoster(elements, preserveScroll);
    renderCharacterDetail(elements, selectedCharacter);
    updateRosterNavState(elements);
  }

  function renderRoster(elements, preserveScroll) {
    var roster = elements.roster;
    var previousScroll = roster.scrollLeft;

    roster.innerHTML = "";

    var fragment = document.createDocumentFragment();
    var officialCharacters = [];
    var externalCharacters = [];

    for (var i = 0; i < state.filtered.length; i += 1) {
      if (state.filtered[i].isExternalCollaborator) {
        externalCharacters.push(state.filtered[i]);
      } else {
        officialCharacters.push(state.filtered[i]);
      }
    }

    appendRosterGroup(fragment, officialCharacters, elements);

    if (officialCharacters.length && externalCharacters.length) {
      fragment.appendChild(buildRosterDivider("Collaboratori esterni"));
    }

    if (!officialCharacters.length && externalCharacters.length) {
      fragment.appendChild(buildRosterDivider("Collaboratori esterni"));
    }

    appendRosterGroup(fragment, externalCharacters, elements);

    roster.appendChild(fragment);

    if (preserveScroll) {
      roster.scrollLeft = previousScroll;
    }
  }

  function appendRosterGroup(fragment, characters, elements) {
    for (var i = 0; i < characters.length; i += 1) {
      fragment.appendChild(buildRosterItem(characters[i], elements));
    }
  }

  function buildRosterDivider(labelText) {
    var divider = document.createElement("div");
    divider.className = "roster-divider";
    divider.setAttribute("role", "separator");

    var line = document.createElement("span");
    line.className = "roster-divider__line";
    line.setAttribute("aria-hidden", "true");

    var label = document.createElement("span");
    label.className = "roster-divider__label";
    label.textContent = labelText;

    divider.appendChild(line);
    divider.appendChild(label);

    return divider;
  }

  function buildRosterItem(character, elements) {
    var button = document.createElement("button");
    button.type = "button";
    button.className =
      "roster-item" +
      (character.slug === state.selectedSlug ? " is-selected" : "") +
      (character.isExternalCollaborator ? " is-external-collaborator" : "");
    button.setAttribute("aria-pressed", String(character.slug === state.selectedSlug));
    button.dataset.slug = character.slug;

    var status = document.createElement("span");
    status.className = "roster-item__status " + (character.engagement === "engaged" ? "is-engaged" : "is-free");
    status.setAttribute("aria-hidden", "true");
    status.innerHTML =
      character.engagement === "engaged"
        ? "<i class=\"fa-solid fa-crosshairs\" aria-hidden=\"true\"></i>"
        : "<i class=\"fa-solid fa-feather\" aria-hidden=\"true\"></i>";

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

    button.appendChild(status);
    button.appendChild(image);
    button.appendChild(label);

    if (character.isExternalCollaborator) {
      var badge = document.createElement("span");
      badge.className = "roster-item__external-badge";
      badge.title = "Collaboratore esterno";
      badge.setAttribute("aria-label", "Collaboratore esterno");
      badge.innerHTML = '<i class="fa-solid fa-handshake-angle" aria-hidden="true"></i>';
      button.appendChild(badge);
    }

    button.addEventListener("click", function onSelectCharacter() {
      state.selectedSlug = character.slug;
      renderRoster(elements, true);
      renderCharacterDetail(elements, character);
      updateUrlCharacter(character.slug, false);
      updateRosterNavState(elements);
    });

    return button;
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

    if (canManageCharacters()) {
      sheet.appendChild(buildCharacterUpdateButton(elements, character));
    }

    sheet.appendChild(buildCharacterHero(character));
    sheet.appendChild(buildCharacterLayout(character));

    detail.appendChild(sheet);
    scheduleCharacterHeaderWidthSync(detail);
  }

  function buildCharacterUpdateButton(elements, character) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "character-update-button";
    button.title = "Aggiorna personaggio";
    button.setAttribute("aria-label", "Aggiorna personaggio");
    button.innerHTML = '<i class="fa-solid fa-rotate" aria-hidden="true"></i>';

    button.addEventListener("click", function onCharacterUpdateClick() {
      openCharacterUpdateDialog(elements, character);
    });

    return button;
  }

  function canManageCharacters() {
    var importTrigger = document.querySelector(
      "[data-character-import-open], [data-character-import-trigger], [data-character-import-button], [data-character-import-modal-open]"
    );
    var importForm = document.querySelector("[data-character-import-form]");
    var importModal = document.querySelector("[data-character-import-modal], .character-import-modal, .import-modal");
    var body = document.body;
    var html = document.documentElement;

    if (hasAdminMarker(body) || hasAdminMarker(html) || hasStoredAdminRole() || hasGlobalAdminProfile()) {
      return true;
    }

    if (hasStoredAccessCode()) {
      return true;
    }

    if (importTrigger || importForm || importModal) {
      return true;
    }

    return false;
  }

  function hasAdminMarker(element) {
    if (!element) {
      return false;
    }

    return (
      element.classList.contains("is-admin") ||
      element.classList.contains("admin") ||
      element.getAttribute("data-role") === "admin" ||
      element.getAttribute("data-user-role") === "admin" ||
      element.getAttribute("data-profile-role") === "admin" ||
      element.getAttribute("data-can-import-characters") === "true" ||
      element.getAttribute("data-can-manage-characters") === "true"
    );
  }

  function hasStoredAdminRole() {
    var roleKeys = [
      "gorgoneRole",
      "gorgoneUserRole",
      "gorgoneProfileRole",
      "gorgoneAccessRole",
      "gorgonePermissionRole",
    ];

    for (var i = 0; i < roleKeys.length; i += 1) {
      var role = readString(localStorage.getItem(roleKeys[i]), "").toLowerCase();
      if (role === "admin" || role === "administrator" || role === "master") {
        return true;
      }
    }

    return false;
  }

  function hasStoredAccessCode() {
    return !!readString(localStorage.getItem("gorgoneAccessCode"), "");
  }

  function hasGlobalAdminProfile() {
    var candidates = [
      window.gorgoneProfile,
      window.GorgoneProfile,
      window.gorgoneCurrentProfile,
      window.GorgoneCurrentProfile,
      window.currentProfile,
    ];

    for (var i = 0; i < candidates.length; i += 1) {
      if (isAdminProfile(candidates[i])) {
        return true;
      }
    }

    return false;
  }

  function isAdminProfile(profile) {
    if (!profile || typeof profile !== "object") {
      return false;
    }

    var role = readString(profile.role || profile.permission || profile.access_role || profile.accessRole, "").toLowerCase();

    return (
      role === "admin" ||
      role === "administrator" ||
      role === "master" ||
      profile.is_admin === true ||
      profile.isAdmin === true ||
      profile.can_import_characters === true ||
      profile.canImportCharacters === true ||
      profile.can_manage_characters === true ||
      profile.canManageCharacters === true
    );
  }

  function isUsableAdminControl(element) {
    if (!element) {
      return false;
    }

    if (element.hidden || element.disabled || element.getAttribute("aria-disabled") === "true") {
      return false;
    }

    if (element.closest("[hidden], [aria-hidden='true']")) {
      return false;
    }

    var style = window.getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden";
  }

  function openCharacterUpdateDialog(elements, character) {
    var dialog = ensureCharacterUpdateDialog();
    var form = dialog.querySelector("[data-character-update-form]");
    var fileInput = dialog.querySelector("[data-character-update-json]");
    var externalInput = dialog.querySelector("[data-character-update-external]");
    var mottoInput = dialog.querySelector("[data-character-update-motto]");
    var operativeRuleInput = dialog.querySelector("[data-character-update-operative-rule]");
    var status = dialog.querySelector("[data-character-update-status]");
    var title = dialog.querySelector("[data-character-update-title]");

    if (!form || !fileInput || !externalInput || !mottoInput || !operativeRuleInput || !status || !title) {
      return;
    }

    form.reset();
    form.dataset.characterSlug = character.slug;
    externalInput.checked = !!character.isExternalCollaborator;
    mottoInput.value = character.motto || "";
    operativeRuleInput.value = character.operative_rule || "";
    status.textContent = "";
    title.textContent = "Aggiorna " + character.name;

    dialog.hidden = false;
    dialog.classList.add("is-open");

    window.requestAnimationFrame(function focusUpdateInput() {
      fileInput.focus();
    });

    form.onsubmit = function onCharacterUpdateSubmit(event) {
      event.preventDefault();
      submitCharacterUpdate(elements, character, dialog);
    };
  }

  function ensureCharacterUpdateDialog() {
    var existing = document.querySelector("[data-character-update-dialog]");

    if (existing) {
      return existing;
    }

    var overlay = document.createElement("div");
    overlay.className = "character-update-dialog";
    overlay.hidden = true;
    overlay.setAttribute("data-character-update-dialog", "");

    var panel = document.createElement("section");
    panel.className = "character-update-dialog__panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-labelledby", "character-update-dialog-title");

    panel.innerHTML =
      '<form class="character-update-dialog__form" data-character-update-form>' +
      '<header class="character-update-dialog__head">' +
      '<div>' +
      '<p class="character-update-dialog__eyebrow">Dossier personaggio</p>' +
      '<h3 id="character-update-dialog-title" data-character-update-title>Aggiorna personaggio</h3>' +
      '</div>' +
      '<button type="button" class="character-update-dialog__close" data-character-update-close aria-label="Chiudi">' +
      '<i class="fa-solid fa-xmark" aria-hidden="true"></i>' +
      '</button>' +
      '</header>' +
      '<label class="character-update-dialog__field">' +
      '<span>JSON Foundry aggiornato <small>(opzionale)</small></span>' +
      '<input type="file" accept="application/json,.json" data-character-update-json />' +
      '</label>' +
      '<label class="character-update-dialog__field">' +
      '<span>Motto</span>' +
      '<input type="text" maxlength="180" placeholder="Membro operativo dell’Enclave" data-character-update-motto />' +
      '</label>' +
      '<label class="character-update-dialog__field">' +
      '<span>Ruolo narrativo</span>' +
      '<select data-character-update-operative-rule>' +
      '<option value="">Nessun ruolo</option>' +
      '<option value="custode">Custode</option>' +
      '<option value="cercatore">Cercatore</option>' +
      '<option value="sigillatore">Sigillatore</option>' +
      '<option value="sentinella">Sentinella</option>' +
      '</select>' +
      '</label>' +
      '<label class="character-update-dialog__check">' +
      '<input type="checkbox" data-character-update-external />' +
      '<span>Collaboratore esterno</span>' +
      '</label>' +
      '<p class="character-update-dialog__status" data-character-update-status aria-live="polite"></p>' +
      '<footer class="character-update-dialog__actions">' +
      '<button type="button" class="character-update-dialog__secondary" data-character-update-cancel>Annulla</button>' +
      '<button type="submit" class="character-update-dialog__primary">' +
      '<i class="fa-solid fa-upload" aria-hidden="true"></i><span>Aggiorna</span>' +
      '</button>' +
      '</footer>' +
      '</form>';

    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    overlay.addEventListener("click", function onUpdateOverlayClick(event) {
      if (event.target === overlay) {
        closeCharacterUpdateDialog(overlay);
      }
    });

    var closeButtons = overlay.querySelectorAll("[data-character-update-close], [data-character-update-cancel]");
    for (var i = 0; i < closeButtons.length; i += 1) {
      closeButtons[i].addEventListener("click", function onCloseUpdateDialog() {
        closeCharacterUpdateDialog(overlay);
      });
    }

    document.addEventListener("keydown", function onUpdateDialogEscape(event) {
      if (event.key === "Escape" && !overlay.hidden) {
        closeCharacterUpdateDialog(overlay);
      }
    });

    return overlay;
  }

  function closeCharacterUpdateDialog(dialog) {
    if (!dialog) {
      return;
    }

    dialog.hidden = true;
    dialog.classList.remove("is-open");
  }

  async function submitCharacterUpdate(elements, character, dialog) {
    if (state.isUpdatingCharacter) {
      return;
    }

    var form = dialog.querySelector("[data-character-update-form]");
    var fileInput = dialog.querySelector("[data-character-update-json]");
    var externalInput = dialog.querySelector("[data-character-update-external]");
    var mottoInput = dialog.querySelector("[data-character-update-motto]");
    var operativeRuleInput = dialog.querySelector("[data-character-update-operative-rule]");
    var status = dialog.querySelector("[data-character-update-status]");
    var submit = dialog.querySelector("button[type='submit']");
    var file = fileInput && fileInput.files && fileInput.files[0];

    state.isUpdatingCharacter = true;
    setCharacterUpdateDialogBusy(dialog, true);

    if (status) {
      status.textContent = "Aggiornamento in corso…";
    }

    try {
      var formData = new FormData();

      if (file) {
        var payload = await readJsonFile(file);
        var updateFile = new File([JSON.stringify(payload)], file.name || "character.json", {
          type: "application/json",
        });

        formData.append("character_json", updateFile);
      }

      formData.append("is_external_collaborator", externalInput && externalInput.checked ? "true" : "false");
      formData.append("motto", mottoInput ? mottoInput.value.trim() : "");
      formData.append("operative_rule", operativeRuleInput ? normalizeOperativeRule(operativeRuleInput.value) : "");
      formData.append("current_character_id", character.id !== undefined && character.id !== null ? String(character.id) : "");
      formData.append("current_character_slug", character.slug || "");
      formData.append("current_foundry_id", character.foundry_id || "");
      formData.append("metadata_only", file ? "false" : "true");
      appendCharacterImportSecret(formData);

      var result = await postCharacterImport(formData);

      if (status) {
        status.textContent = "Personaggio aggiornato.";
      }

      await reloadCharactersAfterUpdate(elements, character, result);
      closeCharacterUpdateDialog(dialog);
    } catch (error) {
      console.warn("Errore aggiornamento personaggio:", error);

      if (status) {
        status.textContent = readString(error && error.message, "Impossibile aggiornare il personaggio.");
      }
    } finally {
      state.isUpdatingCharacter = false;
      setCharacterUpdateDialogBusy(dialog, false);

      if (submit) {
        submit.blur();
      }
    }
  }

  function setCharacterUpdateDialogBusy(dialog, isBusy) {
    var controls = dialog.querySelectorAll("input, button");

    for (var i = 0; i < controls.length; i += 1) {
      controls[i].disabled = isBusy;
    }
  }

  async function readJsonFile(file) {
    var text = await file.text();

    try {
      return JSON.parse(text);
    } catch (_error) {
      throw new Error("Il file JSON non è valido.");
    }
  }

  async function postCharacterImport(formData) {
    var key = SUPABASE_ANON_KEY || readString(localStorage.getItem("gorgoneSupabaseAnonKey"), "");
    var accessCode = readCharacterImportSecret();
    var headers = {
      apikey: key,
      Authorization: "Bearer " + key,
    };

    if (accessCode) {
      headers["x-import-secret"] = accessCode;
      headers["x-gorgone-access-code"] = accessCode;
      headers["x-access-code"] = accessCode;
    }

    var response = await fetch(SUPABASE_URL + "/functions/v1/import-character", {
      method: "POST",
      headers: headers,
      body: formData,
    });

    var payload = await parseResponseBody(response);

    if (!response.ok) {
      throw new Error(readSupabaseError(payload, response.status));
    }

    return payload || {};
  }

  function readCharacterImportSecret() {
    return IMPORT_SECRET;
  }

  function appendCharacterImportSecret(formData) {
    var accessCode = readCharacterImportSecret();

    if (!accessCode || !formData || typeof formData.append !== "function") {
      return;
    }

    formData.append("import_secret", accessCode);
    formData.append("access_code", accessCode);
    formData.append("gorgone_access_code", accessCode);
  }

  async function reloadCharactersAfterUpdate(elements, previousCharacter, importResult) {
    var payload = await fetchCharactersPageData();
    state.all = normalizeCharacters(
      payload.characters,
      payload.activeQuestByCharacter,
      payload.completedQuestsByCharacter
    );

    renderClassFilters(elements);

    var updated = findUpdatedCharacter(state.all, previousCharacter, importResult) || previousCharacter;
    state.selectedSlug = updated.slug || previousCharacter.slug;
    applyFilters(elements, true);
    updateRosterNavState(elements);
  }

  function findUpdatedCharacter(list, previousCharacter, importResult) {
    var record = readImportedCharacterRecord(importResult);
    var id = record && record.id !== undefined && record.id !== null ? String(record.id) : String(previousCharacter.id || "");
    var foundryId = readString((record && record.foundry_id) || previousCharacter.foundry_id, "");
    var slug = readString((record && record.slug) || previousCharacter.slug, "");

    for (var i = 0; i < list.length; i += 1) {
      if (id && String(list[i].id) === id) {
        return list[i];
      }
    }

    for (var j = 0; j < list.length; j += 1) {
      if (foundryId && list[j].foundry_id === foundryId) {
        return list[j];
      }
    }

    for (var k = 0; k < list.length; k += 1) {
      if (slug && list[k].slug === slug) {
        return list[k];
      }
    }

    return null;
  }

  function readImportedCharacterRecord(importResult) {
    if (!importResult || typeof importResult !== "object") {
      return null;
    }

    return importResult.character || importResult.record || importResult.data || null;
  }

  function buildCharacterHero(character) {
    var hero = document.createElement("section");
    hero.className = "character-hero";

    var portraitPanel = document.createElement("section");
    portraitPanel.className = "character-hero__portrait";

    var portraitFrame = document.createElement("button");
    portraitFrame.type = "button";
    portraitFrame.className = "character-hero__portrait-frame character-hero__portrait-toggle";
    portraitFrame.setAttribute("aria-expanded", "false");
    portraitFrame.setAttribute("aria-label", "Espandi ritratto di " + character.name);
    portraitFrame.title = "Espandi ritratto";

    var portrait = document.createElement("img");
    portrait.src = character.portrait_url || character.token_url || fallbackPortraitSvg(character.name);
    portrait.alt = "Ritratto completo di " + character.name;
    portrait.addEventListener("error", function onImgError() {
      portrait.src = fallbackPortraitSvg(character.name);
    });

    portraitFrame.appendChild(portrait);

    var operativeRuleBadge = buildOperativeRuleBadge(character.operative_rule);
    if (operativeRuleBadge) {
      portraitFrame.appendChild(operativeRuleBadge);
    }

    portraitFrame.addEventListener("click", function onPortraitToggleClick() {
      var expanded = portraitPanel.classList.toggle("is-expanded");
      portraitFrame.setAttribute("aria-expanded", String(expanded));
      portraitFrame.setAttribute(
        "aria-label",
        (expanded ? "Riduci ritratto di " : "Espandi ritratto di ") + character.name
      );
      portraitFrame.title = expanded ? "Riduci ritratto" : "Espandi ritratto";
    });

    portraitPanel.appendChild(portraitFrame);

    hero.appendChild(portraitPanel);

    var main = document.createElement("section");
    main.className = "character-hero__main";

    var eyebrow = document.createElement("p");
    eyebrow.className = "character-hero__eyebrow";
    eyebrow.textContent = "Dossier operativo";

    var title = document.createElement("h3");
    title.className = "character-hero__name";
    title.textContent = character.name;

    var motto = document.createElement("p");
    motto.className = "character-hero__motto";
    motto.textContent = buildCharacterMotto(character);

    var service = document.createElement("div");
    service.className = "character-hero__service";

    var serviceState = document.createElement("span");
    serviceState.className =
      "character-hero__service-state " +
      (character.engagement === "engaged" ? "is-engaged" : "is-free");
    serviceState.textContent =
      character.engagement === "engaged"
        ? "Attualmente impegnato in missione"
        : "Attualmente disponibile";

    service.appendChild(serviceState);

    if (character.activeQuest && character.activeQuest.slug) {
      var missionLink = document.createElement("a");
      missionLink.className = "character-hero__mission-link";
      missionLink.href = "quest.html?quest=" + encodeURIComponent(character.activeQuest.slug);
      missionLink.textContent = character.activeQuest.title;
      service.appendChild(missionLink);
    } else {
      var missionText = document.createElement("span");
      missionText.className = "character-hero__mission-muted";
      missionText.textContent = "Nessuna missione attiva assegnata";
      service.appendChild(missionText);
    }

    var statPills = document.createElement("div");
    statPills.className = "character-stat-pill-grid";

    appendStatPill(statPills, {
      value: character.class_name,
      iconClass: "fa-book-open",
      imageSrc: classIconPath(character.class_name),
      tooltip: character.class_name,
    });

    appendStatPill(statPills, {
      value: character.subclass_name,
      iconClass: "fa-star",
      imageSrc: subclassIconPath(character.subclass_name),
      tooltip: character.subclass_name,
    });

    appendStatPill(statPills, {
      value: character.species,
      iconClass: "fa-dna",
      imageSrc: speciesIconPath(character.species),
      tooltip: character.species,
    });

    appendStatPill(statPills, {
      value: character.background,
      iconClass: "fa-scroll",
      imageSrc: backgroundIconPath(character.background),
      tooltip: character.background,
    });

    main.appendChild(eyebrow);
    main.appendChild(title);
    main.appendChild(motto);
    main.appendChild(service);

    if (statPills.childNodes.length) {
      main.appendChild(statPills);
    }

    hero.appendChild(main);

    return hero;
  }

  function appendStatPill(container, options) {
    if (!options || !options.value) {
      return;
    }

    var tooltip = readString(options.tooltip || options.value, "");
    if (!tooltip) {
      return;
    }

    var pill = document.createElement("div");
    pill.className = "character-stat-pill";
    pill.setAttribute("role", "img");
    pill.setAttribute("aria-label", tooltip);
    pill.title = tooltip;

    var media = document.createElement("span");
    media.className = "character-stat-pill__media";

    renderStatPillMedia(media, options.imageSrc, options.iconClass);

    var body = document.createElement("div");
    body.className = "character-stat-pill__body";

    var text = document.createElement("span");
    text.className = "character-stat-pill__text";
    text.textContent = tooltip;

    body.appendChild(text);

    pill.appendChild(media);
    pill.appendChild(body);
    container.appendChild(pill);
  }

  function renderStatPillMedia(media, imageSrc, fallbackIconClass) {
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

  function buildCharacterLayout(character) {
    var layout = document.createElement("div");
    layout.className = "character-layout";

    var main = document.createElement("div");
    main.className = "character-layout__main";

    appendTextSection(main, "Aspetto", character.appearance, "fa-eye");
    appendTextSection(main, "Tratti", character.trait, "fa-star");

    if (character.bio) {
      main.appendChild(buildBiographySection(character.bio));
    }

    if (character.completedQuests && character.completedQuests.length) {
      main.appendChild(buildMissionHistorySection(character.completedQuests));
    }

    var side = document.createElement("aside");
    side.className = "character-layout__side";

    side.appendChild(buildServicePanel(character));
    side.appendChild(buildProfilePanel(character));
    side.appendChild(buildMedalsPanel(character.medals));

    layout.appendChild(side);
    layout.appendChild(main);

    return layout;
  }

  function buildServicePanel(character) {
    var panel = document.createElement("section");
    panel.className = "character-panel character-panel--service";

    panel.appendChild(buildPanelHeading("Servizio attivo", "fa-crosshairs"));

    var list = document.createElement("div");
    list.className = "character-fact-list";

    list.appendChild(buildFactItem("Stato", character.engagement === "engaged" ? "Impegnato" : "Libero"));

    if (character.activeQuest) {
      var questValue = character.activeQuest.title;

      if (character.activeQuest.location) {
        questValue += " · " + character.activeQuest.location;
      }

      list.appendChild(buildFactItem("Missione", questValue));

      if (character.activeQuest.next_session_at) {
        list.appendChild(buildFactItem("Prossima sessione", formatDate(character.activeQuest.next_session_at)));
      }

      list.appendChild(buildFactItem("Priorità", mapQuestStatusLabel(character.activeQuest.status)));
    } else {
      list.appendChild(buildFactItem("Missione", "Nessuna missione attiva"));
    }

    panel.appendChild(list);
    return panel;
  }

  function buildProfilePanel(character) {
    var panel = document.createElement("section");
    panel.className = "character-panel";

    panel.appendChild(buildPanelHeading("Profilo rapido", "fa-id-card"));

    var list = document.createElement("div");
    list.className = "character-fact-list";

    list.appendChild(buildFactItem("Specie", character.species || "Non registrata"));
    list.appendChild(buildFactItem("Classe", character.class_name || "Non registrata"));
    list.appendChild(buildFactItem("Ruolo narrativo", getOperativeRuleLabel(character.operative_rule) || "Non registrato"));

    if (character.subclass_name) {
      list.appendChild(buildFactItem("Sottoclasse", character.subclass_name));
    }

    if (character.background) {
      list.appendChild(buildFactItem("Background", character.background));
    }

    list.appendChild(buildFactItem("Missioni concluse", String((character.completedQuests && character.completedQuests.length) || 0)));
    list.appendChild(buildFactItem("Medaglie", String((character.medals && character.medals.length) || 0)));

    panel.appendChild(list);
    return panel;
  }

  function buildMedalsPanel(medals) {
    var panel = document.createElement("section");
    panel.className = "character-panel";

    panel.appendChild(buildPanelHeading("Medaglie", "fa-award"));

    if (!medals || !medals.length) {
      var empty = document.createElement("p");
      empty.className = "character-medals-empty";
      empty.textContent = "Nessuna onorificenza registrata.";
      panel.appendChild(empty);
      return panel;
    }

    var list = document.createElement("div");
    list.className = "character-medals-list";

    for (var i = 0; i < medals.length; i += 1) {
      list.appendChild(buildMedalCard(medals[i]));
    }

    panel.appendChild(list);
    return panel;
  }

  function buildPanelHeading(text, iconClass) {
    var heading = document.createElement("h4");
    heading.className = "character-panel__head";

    var icon = document.createElement("i");
    icon.className = "fa-solid " + iconClass;
    icon.setAttribute("aria-hidden", "true");

    var label = document.createElement("span");
    label.textContent = text;

    heading.appendChild(icon);
    heading.appendChild(label);

    return heading;
  }

  function buildFactItem(labelText, valueText) {
    var item = document.createElement("div");
    item.className = "character-fact";

    var label = document.createElement("span");
    label.className = "character-fact__label";
    label.textContent = labelText;

    var value = document.createElement("span");
    value.className = "character-fact__value";
    value.textContent = valueText;

    item.appendChild(label);
    item.appendChild(value);

    return item;
  }

  function buildCharacterMotto(character) {
    var motto = readString(character.motto, "");
    if (motto) {
      return "“" + motto + "”";
    }

    return "Membro operativo dell’Enclave";
  }

  function normalizeOperativeRule(value) {
    var normalized = assetSlug(value);

    switch (normalized) {
      case "custode":
      case "cercatore":
      case "sigillatore":
      case "sentinella":
        return normalized;
      default:
        return "";
    }
  }

  function getOperativeRuleLabel(value) {
    switch (normalizeOperativeRule(value)) {
      case "custode":
        return "Custode";
      case "cercatore":
        return "Cercatore";
      case "sigillatore":
        return "Sigillatore";
      case "sentinella":
        return "Sentinella";
      default:
        return "";
    }
  }

  function getOperativeRuleFallbackIconClass(value) {
    switch (normalizeOperativeRule(value)) {
      case "custode":
        return "fa-shield-halved";
      case "cercatore":
        return "fa-compass";
      case "sigillatore":
        return "fa-lock";
      case "sentinella":
        return "fa-tower-observation";
      default:
        return "fa-circle";
    }
  }

  function operativeRuleIconPath(value) {
    var role = normalizeOperativeRule(value);
    return role ? "assets/icons/roles/" + role + ".webp" : "";
  }

  function buildOperativeRuleBadge(value) {
    var role = normalizeOperativeRule(value);
    var label = getOperativeRuleLabel(role);
    var iconPath = operativeRuleIconPath(role);

    if (!role || !label || !iconPath) {
      return null;
    }

    var badge = document.createElement("span");
    badge.className = "character-hero__operative-rule character-hero__operative-rule--" + role;
    badge.title = label;
    badge.setAttribute("aria-label", "Ruolo narrativo: " + label);

    var image = document.createElement("img");
    image.src = iconPath;
    image.alt = "";
    image.decoding = "async";
    image.loading = "lazy";

    image.addEventListener("error", function onOperativeRuleIconError() {
      badge.innerHTML = "";
      badge.appendChild(buildFallbackIcon(getOperativeRuleFallbackIconClass(role)));
    });

    badge.appendChild(image);

    return badge;
  }

  function looksLikeHtml(value) {
  return /<\s*(p|br|ul|ol|li|strong|em|span|div|h[1-6]|blockquote)\b/i.test(String(value || ""));
}

function sanitizeFoundryBiographyHtml(html) {
  var parser = new DOMParser();
  var parsed = parser.parseFromString("<div>" + String(html || "") + "</div>", "text/html");
  var sourceRoot = parsed.body.firstElementChild;
  var cleanRoot = document.createElement("div");

  if (!sourceRoot) {
    return "";
  }

  var child = sourceRoot.firstChild;
  while (child) {
    var next = child.nextSibling;
    appendSanitizedBiographyNode(cleanRoot, child);
    child = next;
  }

  return cleanRoot.innerHTML.trim();
}

function appendSanitizedBiographyNode(target, node) {
  if (!node) {
    return;
  }

  if (node.nodeType === Node.TEXT_NODE) {
    var text = String(node.textContent || "").replace(/\u00a0/g, " ");
    if (text) {
      target.appendChild(document.createTextNode(text));
    }
    return;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return;
  }

  var tag = node.tagName.toUpperCase();

  if (tag === "BR") {
    target.appendChild(document.createElement("br"));
    return;
  }

  if (
    tag === "P" ||
    tag === "UL" ||
    tag === "OL" ||
    tag === "LI" ||
    tag === "STRONG" ||
    tag === "EM" ||
    tag === "B" ||
    tag === "I" ||
    tag === "BLOCKQUOTE"
  ) {
    var element = document.createElement(tag.toLowerCase());
    var child = node.firstChild;

    while (child) {
      var next = child.nextSibling;
      appendSanitizedBiographyNode(element, child);
      child = next;
    }

    if (hasMeaningfulBiographyContent(element, tag)) {
      target.appendChild(element);
    }

    return;
  }

  var unwrapChild = node.firstChild;
  while (unwrapChild) {
    var unwrapNext = unwrapChild.nextSibling;
    appendSanitizedBiographyNode(target, unwrapChild);
    unwrapChild = unwrapNext;
  }
}

function hasMeaningfulBiographyContent(element, tag) {
  if (tag === "UL" || tag === "OL") {
    return element.children.length > 0;
  }

  var text = String(element.textContent || "").replace(/\u00a0/g, " ").trim();
  return text !== "" || element.querySelector("br");
}

function appendPlainRichText(container, value) {
  var normalized = String(value || "")
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .trim();

  if (!normalized) {
    return;
  }

  var blocks = normalized.split(/\n{2,}/).filter(Boolean);

  for (var i = 0; i < blocks.length; i += 1) {
    var paragraph = document.createElement("p");
    paragraph.textContent = blocks[i];
    container.appendChild(paragraph);
  }
}

  function buildMedalCard(medal) {
    var item = document.createElement("article");
    item.className = "character-medal";

    var icon = document.createElement("span");
    icon.className = "character-medal__icon";

    if (readString(medal.imageSrc, "")) {
      var img = document.createElement("img");
      img.src = medal.imageSrc;
      img.alt = "";
      img.decoding = "async";
      img.loading = "lazy";
      img.addEventListener("error", function onImageError() {
        icon.innerHTML = "";
        icon.appendChild(buildFallbackIcon(readString(medal.iconClass, "fa-award")));
      });
      icon.appendChild(img);
    } else {
      icon.appendChild(buildFallbackIcon(readString(medal.iconClass, "fa-award")));
    }

    var body = document.createElement("div");
    body.className = "character-medal__body";

    var title = document.createElement("span");
    title.className = "character-medal__title";
    title.textContent = readString(medal.title, "Medaglia");

    body.appendChild(title);

    if (readString(medal.description, "")) {
      var description = document.createElement("span");
      description.className = "character-medal__description";
      description.textContent = medal.description;
      body.appendChild(description);
    }

    item.appendChild(icon);
    item.appendChild(body);

    return item;
  }

  function buildFallbackIcon(iconClass) {
    var icon = document.createElement("i");
    icon.className = "fa-solid " + (iconClass || "fa-circle");
    icon.setAttribute("aria-hidden", "true");
    return icon;
  }

  function resolveIconPath(folderName, value) {
    var slug = assetSlug(value);
    return slug ? "assets/icons/" + folderName + "/" + slug + ".webp" : "";
  }

  function classIconPath(className) {
    return resolveIconPath("classes", className);
  }

  function subclassIconPath(subclassName) {
    return resolveIconPath("subclasses", subclassName);
  }

  function speciesIconPath(speciesName) {
    return resolveIconPath("species", speciesName);
  }

  function backgroundIconPath(backgroundName) {
    return resolveIconPath("backgrounds", backgroundName);
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
    var content = document.createElement("div");
    content.className = "biography-text character-rich-text";

    if (looksLikeHtml(bioText)) {
      content.innerHTML = sanitizeFoundryBiographyHtml(bioText);
    } else {
      appendPlainRichText(content, bioText);
    }

    return buildCollapsibleSection({
      title: "Biografia",
      iconClass: "fa-scroll",
      body: content,
      expanded: true,
      extraClass: "biography-wrap",
    });
  }

  function appendTextSection(container, titleText, value, iconClass) {
    if (!value) {
      return;
    }

    container.appendChild(
      buildCollapsibleSection({
        title: titleText,
        iconClass: iconClass,
        body: buildRichTextContainer(value),
        expanded: true,
        extraClass: "content-block",
      })
    );
  }

  function buildMissionHistorySection(completedQuests) {
    var list = document.createElement("div");
    list.className = "character-mission-history";

    for (var i = 0; i < completedQuests.length; i += 1) {
      list.appendChild(buildMissionHistoryItem(completedQuests[i]));
    }

    return buildCollapsibleSection({
      title: "Storico missioni",
      iconClass: "fa-flag-checkered",
      body: list,
      expanded: false,
      extraClass: "content-block character-collapsible--mission-history",
    });
  }

  function buildMissionHistoryItem(quest) {
    var item = document.createElement("article");
    item.className = "character-mission-history__item";

    var marker = document.createElement("span");
    marker.className = "character-mission-history__marker";
    marker.innerHTML = '<i class="fa-solid fa-flag-checkered" aria-hidden="true"></i>';

    var body = document.createElement("div");
    body.className = "character-mission-history__body";

    var head = document.createElement("div");
    head.className = "character-mission-history__head";

    var title;

    if (quest.slug) {
      title = document.createElement("a");
      title.href = "quest.html?quest=" + encodeURIComponent(quest.slug);
    } else {
      title = document.createElement("span");
    }

    title.className = "character-mission-history__title";
    title.textContent = quest.title;

    var status = document.createElement("span");
    status.className = "character-mission-history__status";
    status.textContent = "Conclusa";

    head.appendChild(title);
    head.appendChild(status);

    var meta = document.createElement("div");
    meta.className = "character-mission-history__meta";

    if (quest.location) {
      meta.appendChild(buildMissionHistoryMetaPill({
        iconClass: "fa-location-dot",
        content: buildMissionHistoryLocationNode(quest.location),
      }));
    }

    meta.appendChild(buildMissionHistoryMetaPill({
      iconClass: "fa-calendar-check",
      text: quest.completed_at ? formatDate(quest.completed_at) : "Data non registrata",
    }));

    body.appendChild(head);
    body.appendChild(meta);

    item.appendChild(marker);
    item.appendChild(body);

    return item;
  }

  function buildMissionHistoryMetaPill(options) {
    var pill = document.createElement("span");
    pill.className = "character-mission-history__pill";

    var icon = document.createElement("i");
    icon.className = "fa-solid " + options.iconClass;
    icon.setAttribute("aria-hidden", "true");

    var label = document.createElement("span");
    label.className = "character-mission-history__pill-text";

    if (options.content) {
      label.appendChild(options.content);
    } else {
      label.textContent = options.text || "";
    }

    pill.appendChild(icon);
    pill.appendChild(label);

    return pill;
  }

  function buildMissionHistoryLocationNode(value) {
    var parsed = parseMarkdownStyleLink(value);

    if (parsed && parsed.url) {
      var link = document.createElement("a");
      link.href = parsed.url;
      link.textContent = parsed.label || parsed.url;
      link.className = "character-mission-history__location-link";
      return link;
    }

    var text = document.createElement("span");
    text.textContent = value;
    return text;
  }

  function parseMarkdownStyleLink(value) {
    var text = readString(value, "");
    var labelStart = text.indexOf("[");
    var labelEnd = text.indexOf("]", labelStart + 1);
    var urlStart = text.indexOf("{", labelEnd + 1);
    var urlEnd = text.indexOf("}", urlStart + 1);

    if (labelStart !== 0 || labelEnd <= labelStart || urlStart !== labelEnd + 1 || urlEnd <= urlStart) {
      return null;
    }

    return {
      label: text.slice(labelStart + 1, labelEnd).trim(),
      url: text.slice(urlStart + 1, urlEnd).trim(),
    };
  }

  function buildCollapsibleSection(options) {
    var sectionId = "character-section-" + Math.random().toString(36).slice(2);
    var expanded = options.expanded !== false;

    var section = document.createElement("section");
    section.className = "character-collapsible" + (options.extraClass ? " " + options.extraClass : "");

    var toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "character-collapsible__toggle character-section-head";
    toggle.setAttribute("aria-expanded", String(expanded));
    toggle.setAttribute("aria-controls", sectionId);

    var main = document.createElement("span");
    main.className = "character-collapsible__toggle-main";

    var icon = document.createElement("i");
    icon.className = "fa-solid " + (options.iconClass || "fa-circle");
    icon.setAttribute("aria-hidden", "true");

    var label = document.createElement("span");
    label.textContent = options.title;

    var chevron = document.createElement("i");
    chevron.className = "fa-solid fa-chevron-down character-collapsible__chevron";
    chevron.setAttribute("aria-hidden", "true");

    main.appendChild(icon);
    main.appendChild(label);
    toggle.appendChild(main);
    toggle.appendChild(chevron);

    var body = document.createElement("div");
    body.id = sectionId;
    body.className = "character-collapsible__body";
    body.hidden = !expanded;
    body.appendChild(options.body);

    toggle.addEventListener("click", function onSectionToggle() {
      var nextExpanded = body.hidden;
      body.hidden = !nextExpanded;
      toggle.setAttribute("aria-expanded", String(nextExpanded));
      scheduleCharacterHeaderWidthSync(section.closest("[data-character-detail]") || document);
    });

    section.appendChild(toggle);
    section.appendChild(body);

    return section;
  }

  function buildRichTextContainer(value) {
    var container = document.createElement("div");
    container.className = "character-rich-text";
    appendRichTextContent(container, value);
    return container;
  }

  function appendPlainRichText(container, value) {
    var normalized = normalizeRichText(value);

    if (!normalized) {
      return;
    }

    var blocks = splitRichTextBlocks(normalized);

    for (var i = 0; i < blocks.length; i += 1) {
      var paragraph = document.createElement("p");
      paragraph.textContent = blocks[i];
      container.appendChild(paragraph);
    }
  }

  function appendRichTextContent(container, value) {
    var normalized = normalizeRichText(value);

    if (!normalized) {
      return;
    }

    if (isUnorderedListText(normalized)) {
      container.appendChild(buildUnorderedList(normalized));
      return;
    }

    if (isOrderedListText(normalized)) {
      container.appendChild(buildOrderedList(normalized));
      return;
    }

    var blocks = splitRichTextBlocks(normalized);

    for (var i = 0; i < blocks.length; i += 1) {
      var paragraph = document.createElement("p");
      paragraph.textContent = blocks[i];
      container.appendChild(paragraph);
    }
  }

  function normalizeRichText(value) {
    var LF = String.fromCharCode(10);
    var CR = String.fromCharCode(13);
    var TAB = String.fromCharCode(9);

    return replaceSpecialSpaces(String(value || ""))
      .split(CR + LF)
      .join(LF)
      .split(CR)
      .join(LF)
      .split(TAB)
      .join("    ")
      .trim();
  }

  function splitRichTextBlocks(value) {
    var LF = String.fromCharCode(10);
    var lines = String(value || "").split(LF);
    var blocks = [];
    var current = [];

    for (var i = 0; i < lines.length; i += 1) {
      var line = lines[i].trimEnd();

      if (!line.trim()) {
        if (current.length) {
          blocks.push(current.join(LF).trim());
          current = [];
        }
        continue;
      }

      current.push(line);
    }

    if (current.length) {
      blocks.push(current.join(LF).trim());
    }

    return blocks.filter(Boolean);
  }

  function isUnorderedListText(value) {
    var lines = getNonEmptyLines(value);

    if (!lines.length) {
      return false;
    }

    for (var i = 0; i < lines.length; i += 1) {
      if (!isUnorderedListLine(lines[i])) {
        return false;
      }
    }

    return true;
  }

  function isOrderedListText(value) {
    var lines = getNonEmptyLines(value);

    if (!lines.length) {
      return false;
    }

    for (var i = 0; i < lines.length; i += 1) {
      if (!isOrderedListLine(lines[i])) {
        return false;
      }
    }

    return true;
  }

  function buildUnorderedList(value) {
    var list = document.createElement("ul");
    var lines = getNonEmptyLines(value);

    for (var i = 0; i < lines.length; i += 1) {
      var item = document.createElement("li");
      item.textContent = stripUnorderedListMarker(lines[i]);
      list.appendChild(item);
    }

    return list;
  }

  function buildOrderedList(value) {
    var list = document.createElement("ol");
    var lines = getNonEmptyLines(value);

    for (var i = 0; i < lines.length; i += 1) {
      var item = document.createElement("li");
      item.textContent = stripOrderedListMarker(lines[i]);
      list.appendChild(item);
    }

    return list;
  }

  function getNonEmptyLines(value) {
    var LF = String.fromCharCode(10);

    return String(value || "")
      .split(LF)
      .map(function (line) {
        return line.trim();
      })
      .filter(Boolean);
  }

  function isUnorderedListLine(line) {
    var marker = line.charAt(0);
    return (marker === "-" || marker === "*" || marker === "•") && line.charAt(1) === " ";
  }

  function stripUnorderedListMarker(line) {
    return isUnorderedListLine(line) ? line.slice(2).trim() : line.trim();
  }

  function isOrderedListLine(line) {
    var index = 0;

    while (index < line.length && isDigit(line.charAt(index))) {
      index += 1;
    }

    if (index === 0 || index >= line.length - 1) {
      return false;
    }

    var marker = line.charAt(index);
    return (marker === "." || marker === ")") && line.charAt(index + 1) === " ";
  }

  function stripOrderedListMarker(line) {
    if (!isOrderedListLine(line)) {
      return line.trim();
    }

    var index = 0;

    while (index < line.length && isDigit(line.charAt(index))) {
      index += 1;
    }

    return line.slice(index + 2).trim();
  }

  function isDigit(character) {
    return character >= "0" && character <= "9";
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

  function replaceSpecialSpaces(value) {
    return String(value || "").split(String.fromCharCode(160)).join(" ");
  }

  var characterHeaderSyncFrame = 0;

  function scheduleCharacterHeaderWidthSync(root) {
    if (characterHeaderSyncFrame) {
      window.cancelAnimationFrame(characterHeaderSyncFrame);
    }

    characterHeaderSyncFrame = window.requestAnimationFrame(function onHeaderSyncFrame() {
      characterHeaderSyncFrame = 0;
      syncCharacterHeaderWidths(root || document);
    });
  }

  function syncCharacterHeaderWidths(root) {
    var scope = root && root.querySelectorAll ? root : document;
    var layouts = scope.querySelectorAll(".character-layout");

    for (var i = 0; i < layouts.length; i += 1) {
      syncCharacterLayoutHeaderWidths(layouts[i]);
    }
  }

  function syncCharacterLayoutHeaderWidths(layout) {
    var side = layout.querySelector(".character-layout__side");
    var toggles = layout.querySelectorAll(".character-collapsible__toggle");

    if (!side || !toggles.length) {
      return;
    }

    for (var i = 0; i < toggles.length; i += 1) {
      toggles[i].style.width = "";
    }

    var sideStyle = window.getComputedStyle(side);
    var sideRect = side.getBoundingClientRect();
    var layoutRect = layout.getBoundingClientRect();
    var sideFloat = sideStyle.float || sideStyle.cssFloat;

    if (sideFloat === "none" || sideRect.width <= 0) {
      setHeaderWidths(toggles, Math.floor(layoutRect.width));
      return;
    }

    var sideMarginLeft = parseFloat(sideStyle.marginLeft) || 0;
    var sideMarginTop = parseFloat(sideStyle.marginTop) || 0;
    var sideMarginBottom = parseFloat(sideStyle.marginBottom) || 0;
    var sideTop = sideRect.top - sideMarginTop;
    var sideBottom = sideRect.bottom + sideMarginBottom;
    var fullWidth = Math.floor(layoutRect.width);
    var leftWidth = Math.floor(sideRect.left - layoutRect.left - sideMarginLeft);

    if (leftWidth < 220) {
      setHeaderWidths(toggles, fullWidth);
      return;
    }

    for (var j = 0; j < toggles.length; j += 1) {
      var toggleRect = toggles[j].getBoundingClientRect();
      var overlapsSide = toggleRect.top < sideBottom && toggleRect.bottom > sideTop;
      toggles[j].style.width = Math.max(160, overlapsSide ? leftWidth : fullWidth) + "px";
    }
  }

  function setHeaderWidths(toggles, width) {
    var safeWidth = Math.max(160, width);

    for (var i = 0; i < toggles.length; i += 1) {
      toggles[i].style.width = safeWidth + "px";
    }
  }

  function scrollRosterBy(roster, direction) {
    if (!roster) {
      return;
    }

    var amount = Math.max(220, Math.floor(roster.clientWidth * 0.72));
    roster.scrollBy({
      left: amount * direction,
      behavior: "smooth",
    });
  }

  function updateRosterNavState(elements) {
    if (!elements.roster || !elements.rosterPrev || !elements.rosterNext) {
      return;
    }

    var roster = elements.roster;
    var maxScroll = Math.max(0, roster.scrollWidth - roster.clientWidth);
    var current = roster.scrollLeft;

    elements.rosterPrev.disabled = current <= 4;
    elements.rosterNext.disabled = current >= maxScroll - 4 || maxScroll <= 4;
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

  function mapQuestStatusLabel(status) {
    switch (normalizeStatus(status)) {
      case "prioritaria":
        return "Prioritaria";
      case "in-corso":
        return "In corso";
      case "preparazione":
        return "Preparazione";
      default:
        return "Attiva";
    }
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
    updateRosterNavState(elements);
  }

  function renderErrorState(elements, message) {
    elements.roster.innerHTML = "<p class=\"characters-state\">Impossibile caricare l'archivio personaggi.</p>";
    elements.detail.innerHTML = "<p class=\"characters-state\">" + escapeHtml(message) + "</p>";
    updateRosterNavState(elements);
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
    var debug = payload && payload.auth_debug ? payload.auth_debug : null;

    if (details && debug) {
      return String(details) + " — " + JSON.stringify(debug);
    }

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
    return typeof value === "string" && value.trim() !== "" ? value.trim() : fallback;
  }

  function readBoolean(value) {
    if (typeof value === "boolean") {
      return value;
    }

    if (typeof value === "number") {
      return value === 1;
    }

    if (typeof value === "string") {
      var normalized = value.trim().toLowerCase();
      return normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on";
    }

    return false;
  }
})();