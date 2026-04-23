(function () {
  "use strict";

  var SUPABASE_URL = "https://atglgaritxzowshenaqr.supabase.co";
  var SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJIUzI1NiIsInR5cCI6IkpXVCJ9";

  SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJIUzI1NiIsInR5cCI6IkpXVCJ9".replace(
    "eyJpc3MiOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
    "eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0Z2xnYXJpdHh6b3dzaGVuYXFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NzcxNDQsImV4cCI6MjA5MjM1MzE0NH0.ObDvvWMkddZL8wABKyI-TBi4KgVoYArJQjoOnAmVVe8"
  );

  var ACTIVE_QUEST_STATUSES = new Set(["in-corso", "preparazione", "prioritaria"]);

  var state = {
    all: [],
    filtered: [],
    selectedSlug: "",
    classFilters: new Set(),
    availability: "all",
  };

  document.addEventListener("DOMContentLoaded", initCharactersPage);

  async function initCharactersPage() {
    var elements = {
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

    bindSearch(elements);
    bindAvailabilityFilters(elements);
    bindRosterControls(elements);

    try {
      var payload = await fetchCharactersPageData();
      state.all = normalizeCharacters(payload.characters, payload.activeQuestByCharacter);

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
    });
  }

  async function fetchCharactersPageData() {
    var key = SUPABASE_ANON_KEY || readString(localStorage.getItem("gorgoneSupabaseAnonKey"), "");

    if (!SUPABASE_URL || !key) {
      throw new Error("Configura la chiave Supabase anon nel file scripts/characters.js o in localStorage (gorgoneSupabaseAnonKey).");
    }

    var responses = await Promise.all([
      fetchFromSupabase("characters", "*", "order=name.asc", key),
      fetchFromSupabase("quests", "id,slug,title,status,location,next_session_at", "", key),
      fetchFromSupabase("quest_characters", "quest_id,character_id", "", key),
    ]);

    return {
      characters: responses[0],
      activeQuestByCharacter: buildActiveQuestByCharacter(responses[1], responses[2]),
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

  function buildActiveQuestByCharacter(quests, questCharacters) {
    var activeQuests = new Map();
    var activeQuestByCharacter = new Map();

    for (var i = 0; i < quests.length; i += 1) {
      var quest = quests[i];
      var questId = quest && quest.id !== null && quest.id !== undefined ? String(quest.id) : "";
      var status = readString(quest && quest.status, "");

      if (!questId || !ACTIVE_QUEST_STATUSES.has(status)) {
        continue;
      }

      activeQuests.set(questId, {
        id: quest.id,
        slug: readString(quest.slug, ""),
        title: readString(quest.title, "Missione"),
        status: status,
        location: readString(quest.location, ""),
        next_session_at: readString(quest.next_session_at, ""),
      });
    }

    for (var j = 0; j < questCharacters.length; j += 1) {
      var row = questCharacters[j];
      var questIdKey = row && row.quest_id !== null && row.quest_id !== undefined ? String(row.quest_id) : "";
      var characterIdKey = row && row.character_id !== null && row.character_id !== undefined ? String(row.character_id) : "";

      if (!questIdKey || !characterIdKey || !activeQuests.has(questIdKey)) {
        continue;
      }

      var candidate = activeQuests.get(questIdKey);
      var current = activeQuestByCharacter.get(characterIdKey);

      if (!current || compareActiveQuestPriority(candidate, current) > 0) {
        activeQuestByCharacter.set(characterIdKey, candidate);
      }
    }

    return activeQuestByCharacter;
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
    switch (readString(status, "")) {
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

  function normalizeCharacters(rows, activeQuestByCharacter) {
    return rows
      .map(function (row) {
        var name = readString(row.name, "Personaggio senza nome");
        var foundryId = readString(row.foundry_id, "");
        var fallbackSlug = slugify(name || foundryId || String(row.id || "personaggio"));
        var characterId = row && row.id !== null && row.id !== undefined ? String(row.id) : "";
        var activeQuest = activeQuestByCharacter.get(characterId) || null;

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
          bio: readString(row.bio, ""),
          appearance: readString(row.appearance, ""),
          trait: readString(row.trait, ""),
          status: readString(row.status, ""),
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
      elements.availabilityButtons[i].classList.toggle("is-active", value === state.availability);
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

    if (!findBySlug(state.filtered, state.selectedSlug)) {
      state.selectedSlug = state.filtered[0].slug;
      updateUrlCharacter(state.selectedSlug, true);
    }

    renderRoster(elements, preserveScroll);
    renderCharacterDetail(elements, findBySlug(state.filtered, state.selectedSlug) || state.filtered[0]);
    updateRosterNavState(elements);
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

      button.addEventListener("click", function onSelectCharacter() {
        state.selectedSlug = character.slug;
        renderRoster(elements, true);
        renderCharacterDetail(elements, character);
        updateUrlCharacter(character.slug, false);
        updateRosterNavState(elements);
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

    sheet.appendChild(buildCharacterHero(character));
    sheet.appendChild(buildCharacterLayout(character));

    detail.appendChild(sheet);
  }

  function buildCharacterHero(character) {
    var hero = document.createElement("section");
    hero.className = "character-hero";

    var portraitPanel = document.createElement("section");
    portraitPanel.className = "character-hero__portrait";

    var portraitFrame = document.createElement("div");
    portraitFrame.className = "character-hero__portrait-frame";

    var portrait = document.createElement("img");
    portrait.src = character.portrait_url || character.token_url || fallbackPortraitSvg(character.name);
    portrait.alt = "Ritratto completo di " + character.name;
    portrait.addEventListener("error", function onImgError() {
      portrait.src = fallbackPortraitSvg(character.name);
    });

    portraitFrame.appendChild(portrait);

    var availabilityPill = document.createElement("span");
    availabilityPill.className =
      "character-hero__availability " +
      (character.engagement === "engaged" ? "is-engaged" : "is-free");
    availabilityPill.innerHTML =
      character.engagement === "engaged"
        ? "<i class=\"fa-solid fa-crosshairs\" aria-hidden=\"true\"></i><span>Impegnato</span>"
        : "<i class=\"fa-solid fa-feather\" aria-hidden=\"true\"></i><span>Libero</span>";

    portraitFrame.appendChild(availabilityPill);
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

    if (character.subclass_name) {
      list.appendChild(buildFactItem("Sottoclasse", character.subclass_name));
    }

    if (character.background) {
      list.appendChild(buildFactItem("Background", character.background));
    }

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
  var wrap = document.createElement("section");
  wrap.className = "biography-wrap";

  wrap.appendChild(createSectionHeading("Biografia", "fa-scroll"));

  var content = document.createElement("div");
  content.className = "biography-text character-rich-text";

  if (looksLikeHtml(bioText)) {
    content.innerHTML = sanitizeFoundryBiographyHtml(bioText);
  } else {
    appendPlainRichText(content, bioText);
  }

  wrap.appendChild(content);

  var BIO_TOGGLE_THRESHOLD = 2000;

  if (bioText.length > BIO_TOGGLE_THRESHOLD) {
    content.classList.add("is-collapsed");

    var toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "biography-toggle";
    toggle.textContent = "Espandi";

    toggle.addEventListener("click", function onToggle() {
      var collapsed = content.classList.toggle("is-collapsed");
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
  block.appendChild(buildRichTextContainer(value));

  container.appendChild(block);
}

function buildRichTextContainer(value) {
  var container = document.createElement("div");
  container.className = "character-rich-text";
  appendRichTextContent(container, value);
  return container;
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
  return String(value || "")
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/\t/g, "    ")
    .trim();
}

function splitRichTextBlocks(value) {
  return value
    .split(/\n{2,}/)
    .map(function (block) {
      return block.replace(/[ \t]+\n/g, "\n").trim();
    })
    .filter(Boolean);
}

function isUnorderedListText(value) {
  var lines = value
    .split("\n")
    .map(function (line) {
      return line.trim();
    })
    .filter(Boolean);

  if (!lines.length) {
    return false;
  }

  for (var i = 0; i < lines.length; i += 1) {
    if (!/^[-*•]\s+/.test(lines[i])) {
      return false;
    }
  }

  return true;
}

function isOrderedListText(value) {
  var lines = value
    .split("\n")
    .map(function (line) {
      return line.trim();
    })
    .filter(Boolean);

  if (!lines.length) {
    return false;
  }

  for (var i = 0; i < lines.length; i += 1) {
    if (!/^\d+[.)]\s+/.test(lines[i])) {
      return false;
    }
  }

  return true;
}

function buildUnorderedList(value) {
  var list = document.createElement("ul");
  var lines = value
    .split("\n")
    .map(function (line) {
      return line.trim();
    })
    .filter(Boolean);

  for (var i = 0; i < lines.length; i += 1) {
    var item = document.createElement("li");
    item.textContent = lines[i].replace(/^[-*•]\s+/, "").trim();
    list.appendChild(item);
  }

  return list;
}

function buildOrderedList(value) {
  var list = document.createElement("ol");
  var lines = value
    .split("\n")
    .map(function (line) {
      return line.trim();
    })
    .filter(Boolean);

  for (var i = 0; i < lines.length; i += 1) {
    var item = document.createElement("li");
    item.textContent = lines[i].replace(/^\d+[.)]\s+/, "").trim();
    list.appendChild(item);
  }

  return list;
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
    switch (readString(status, "")) {
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
})();