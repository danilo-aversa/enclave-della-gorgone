/* v1.46 2026-05-03T19:22:00+02:00 */

(function () {
  "use strict";

  var SUPABASE_URL = "https://atglgaritxzowshenaqr.supabase.co";
  var SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0Z2xnYXJpdHh6b3dzaGVuYXFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NzcxNDQsImV4cCI6MjA5MjM1MzE0NH0.ObDvvWMkddZL8wABKyI-TBi4KgVoYArJQjoOnAmVVe8";

  var TIMELINE_TABLE_URL = SUPABASE_URL + "/rest/v1/timeline_events";
  var TIMELINE_EVENT_CHARACTERS_TABLE_URL = SUPABASE_URL + "/rest/v1/timeline_event_characters";
  var CHARACTER_TABLE_URL = SUPABASE_URL + "/rest/v1/characters";
  var UPSERT_TIMELINE_EVENT_URL = SUPABASE_URL + "/functions/v1/upsert-timeline-event";
  var DELETE_TIMELINE_EVENT_URL = SUPABASE_URL + "/functions/v1/delete-timeline-event";

  var PLAYER_CODE_STORAGE_KEY = "gorgoneAccessCode";
  var CURRENT_CAMPAIGN_YEAR_DR = 1492;
  var SUMMARY_MAX_LENGTH = 80;

  var FALLBACK_TOKEN_IMAGE =
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' fill='%23162229'/><circle cx='32' cy='24' r='12' fill='%234db8a6'/><rect x='14' y='40' width='36' height='16' fill='%233b5865'/></svg>";

  var HARPTOS_MONTHS = [
    { id: "Hammer", common: "Deepwinter", offset: 0 },
    { id: "Alturiak", common: "The Claw of Winter", offset: 31 },
    { id: "Ches", common: "The Claw of Sunsets", offset: 61 },
    { id: "Tarsakh", common: "The Claw of Storms", offset: 91 },
    { id: "Mirtul", common: "The Melting", offset: 122 },
    { id: "Kythorn", common: "The Time of Flowers", offset: 152 },
    { id: "Flamerule", common: "Summertide", offset: 182 },
    { id: "Eleasis", common: "Highsun", offset: 214 },
    { id: "Eleint", common: "The Fading", offset: 244 },
    { id: "Marpenoth", common: "Leaffall", offset: 275 },
    { id: "Uktar", common: "The Rotting", offset: 305 },
    { id: "Nightal", common: "The Drawing Down", offset: 336 }
  ];

  var HARPTOS_FESTIVALS = [
    { id: "Midwinter", label: "Midwinter", offset: 30 },
    { id: "Greengrass", label: "Greengrass", offset: 121 },
    { id: "Midsummer", label: "Midsummer", offset: 212 },
    { id: "Shieldmeet", label: "Shieldmeet", offset: 213 },
    { id: "Highharvestide", label: "Highharvestide", offset: 274 },
    { id: "Feast of the Moon", label: "The Feast of the Moon", offset: 335 }
  ];

  var HARPTOS_YEAR_NAMES = {
    1492: "Year of Three Ships Sailing"
  };

  var TYPE_META = {
    campaign: { label: "Campagna", icon: "fa-solid fa-dragon" },
    lore: { label: "Lore", icon: "fa-solid fa-book-open" },
    mission: { label: "Missione", icon: "fa-solid fa-scroll" },
    character: { label: "Personaggio", icon: "fa-solid fa-user-shield" },
    faction: { label: "Fazione", icon: "fa-solid fa-flag" },
    fracture: { label: "Frattura", icon: "fa-solid fa-burst" },
    alternate: { label: "Realtà alternativa", icon: "fa-solid fa-code-branch" }
  };

  var STATE_META = {
    past: { label: "Avvenuto", icon: "fa-solid fa-clock-rotate-left" },
    current: { label: "In corso", icon: "fa-solid fa-hourglass-half" },
    future: { label: "Possibile", icon: "fa-solid fa-eye" },
    altered: { label: "Alterato", icon: "fa-solid fa-wand-magic-sparkles" },
    variant: { label: "Variante", icon: "fa-solid fa-code-fork" },
    cancelled: { label: "Cancellato", icon: "fa-solid fa-ban" }
  };

  var MOCK_TIMELINE_EVENTS = [
    {
      id: "mock-isola-gorgone",
      title: "Fondazione operativa dell'Enclave della Gorgone",
      short_title: "",
      summary: "L'Enclave stabilisce la propria base sull'Isola della Gorgone, trasformandola in un centro operativo per il contenimento delle Fratture.",
      description: "L'isola viene organizzata come hub strategico, archivistico e rituale. Le sue strutture antiche vengono adattate per ospitare missioni, briefing, bastioni personali e attività di ricerca.",
      dm_notes: "Evento placeholder. Sostituire con cronologia canonica definitiva della campagna.",
      location: "Isola della Gorgone",
      date_label: "1 Hammer, 1492 DR — Year of Three Ships Sailing",
      sort_key: 1492001,
      type: "campaign",
      visibility: "players",
      knowledge: "known",
      truth: "confirmed",
      state: "past",
      importance: 4,
      tags: ["Enclave", "Isola della Gorgone"],
      links: [],
      background_image_url: ""
    },
    {
      id: "mock-prima-frattura",
      title: "Individuazione delle prime Fratture della Realtà",
      short_title: "",
      summary: "Gli studiosi dell'Enclave confermano che alcune anomalie locali sono manifestazioni di realtà parallele instabili.",
      description: "Le Fratture non sono semplici portali: sono punti in cui la Trama è stata piegata, sovrapposta o lacerata. La loro espansione può alterare la realtà locale.",
      dm_notes: "Usare questo evento per collegare la cosmologia della Trama agli Specchi della Gorgone.",
      location: "",
      date_label: "15 Hammer, 1492 DR — Year of Three Ships Sailing",
      sort_key: 1492015,
      type: "fracture",
      visibility: "players",
      knowledge: "known",
      truth: "confirmed",
      state: "past",
      importance: 5,
      tags: ["Fratture", "Trama", "Specchi"],
      links: [],
      background_image_url: ""
    }
  ];

  var timelineEvents = MOCK_TIMELINE_EVENTS.slice();
  var selectedEventId = null;
  var expandedEventId = null;
  var timelineFocusRaf = 0;
  var timelineScale = null;
  var timelineDragState = null;
  var timelineInertiaFrame = 0;
  var currentTimelineBackgroundUrl = "";
  var timelineBackgroundActiveLayer = "a";
  var timelineBackgroundRequestId = 0;
  var timelineBackgroundImageCache = {}; 
  var activeTypeFilters = Object.keys(TYPE_META);
  var activeCharacterFilters = [];
  var timelineCharacters = [];
  var timelineCharacterMap = new Map();
  var timelineEventCharacterMap = new Map();
  var selectedModalCharacterIds = new Set();
  var timelineTextUndoState = new WeakMap();
  var currentMode = "players";
  var canManageTimeline = false;
  var isSaving = false;
  var els = {};

  document.addEventListener("DOMContentLoaded", initTimelinePage);

  function initTimelinePage() {
    cacheElements();
    removeTimelineEmptyPlaceholder();
    moveTimelineShellActionsIntoMain();
    prepareModalUi();
    createTimelineBackgroundLayers();
    createTimelineBackgroundImageField();
    createTimelineLocationField();
    createTimelineCharacterPicker();
    createTimelineToolbarControls();
    createTimelineFilterToggles();
    createTimelineCharacterFilter();
    createHarptosDatePicker();
    createVisibilitySwitch();
    decorateTimelineSelectOptions();
    decorateModalFooterButtons();
    createDescriptionMarkdownToolbar();
    createTagsPillInput();
    canManageTimeline = resolveCanManageTimeline();
    syncManagerUi();
    bindEvents();
    bindTimelineFocusEvents();
    bindTimelineDragEvents();
    bindLayoutEvents();
    loadTimelineEventsFromSupabase();
  }

  function cacheElements() {
    els.toolbar = qs(".timeline-toolbar, [data-timeline-toolbar]");
    els.toolbarControls = null;
    els.content = qs(".timeline-content, [data-timeline-content]");
    els.list = qs("#timelineList, [data-timeline-list]");
    els.empty = qs("#timelineEmpty, [data-timeline-empty]");
    els.search = qs("#timelineSearch, [data-timeline-search]");
    els.type = qs("#timelineTypeFilter, [data-timeline-type-filter]");
    els.visibility = qs("#timelineVisibilityFilter, [data-timeline-visibility-filter]");
    els.knowledge = qs("#timelineKnowledgeFilter, [data-timeline-knowledge-filter]");
    els.state = qs("#timelineStateFilter, [data-timeline-state-filter]");
    els.modeToggle = qs("#timelineModeToggle, [data-timeline-mode-toggle]");
    els.playerModeButton = qs("[data-timeline-mode='players']");
    els.dmModeButton = qs("[data-timeline-mode='dm']");
    els.newButton = qs("#timelineNewButton, [data-timeline-new]");
    els.editButton = qs("#timelineEditButton, [data-timeline-edit]");
    els.deleteButton = qs("#timelineDeleteButton, [data-timeline-delete]");
    els.modal = qs("#timelineEventModal, [data-timeline-modal]");
    els.modalTitle = qs("#timelineModalTitle, [data-timeline-modal-title]");
    els.modalBackdrop = qs("#timelineModalBackdrop, [data-timeline-modal-backdrop]");
    els.modalClose = qs("#timelineModalClose, [data-timeline-modal-close]");
    els.modalCancel = qs("#timelineModalCancel, [data-timeline-modal-cancel]");
    els.modalSave = qs("#timelineModalSave, [data-timeline-modal-save]");
    els.form = qs("#timelineEventForm, [data-timeline-form]");
    els.status = qs("#timelineStatus, [data-timeline-status]");

    els.fields = {
      id: qs("#timelineEventId, [name='id']"),
      title: qs("#timelineEventTitle, [name='title']"),
      short_title: qs("#timelineEventShortTitle, [name='short_title']"),
      summary: qs("#timelineEventSummary, [name='summary']"),
      description: qs("#timelineEventDescription, [name='description']"),
      dm_notes: qs("#timelineEventDmNotes, [name='dm_notes']"),
      location: qs("#timelineEventLocation, [name='location']"),
      date_label: qs("#timelineEventDateLabel, [name='date_label']"),
      sort_key: qs("#timelineEventSortKey, [name='sort_key']"),
      type: qs("#timelineEventType, [name='type']"),
      visibility: qs("#timelineEventVisibility, [name='visibility']"),
      knowledge: qs("#timelineEventKnowledge, [name='knowledge']"),
      truth: qs("#timelineEventTruth, [name='truth']"),
      state: qs("#timelineEventState, [name='state']"),
      importance: qs("#timelineEventImportance, [name='importance']"),
      tags: qs("#timelineEventTags, [name='tags']"),
      links: qs("#timelineEventLinks, [name='links']"),
      background_image_url: qs("#timelineEventBackgroundImageUrl, [name='background_image_url']")
    };

    els.harptos = {
      root: null,
      display: null,
      toggle: null,
      panel: null,
      kind: null,
      startYear: null,
      startYearName: null,
      startMonth: null,
      startMode: null,
      startCalendar: null,
      startFestivalGrid: null,
      startDay: 1,
      startFestival: "Midwinter",
      endYear: null,
      endYearName: null,
      endMonth: null,
      endMode: null,
      endCalendar: null,
      endFestivalGrid: null,
      endDay: 1,
      endFestival: "Midwinter",
      endGroup: null,
      unknownNote: null,
      preview: null
    };

    els.visibilitySwitch = null;
    els.characterPicker = null;
    els.characterPickerSearch = null;
    els.characterPickerList = null;
  }

  function moveTimelineShellActionsIntoMain() {
    var actions = qs(".timeline-shell-actions, [data-timeline-shell-actions]");
    var main = qs(".timeline-main, [data-timeline-main]");
    if (!actions || !main) return;
    removeGlobalTimelineEditDeleteActions(actions);
    if (actions.dataset.timelineMoved === "true") return;
    actions.classList.add("timeline-main-actions");
    actions.dataset.timelineMoved = "true";
    main.appendChild(actions);
  }

  function removeGlobalTimelineEditDeleteActions(actions) {
    if (!actions) return;
    actions.querySelectorAll("#timelineEditButton, #timelineDeleteButton, [data-timeline-edit], [data-timeline-delete]").forEach(function (button) {
      button.remove();
    });
  }

  function removeTimelineEmptyPlaceholder() {
    if (!els.empty) return;
    els.empty.remove();
    els.empty = null;
  }

  function createTimelineBackgroundLayers() {
    if (!els.content || els.content.querySelector("[data-timeline-background-stage]")) return;
    var stage = document.createElement("div");
    stage.className = "timeline-background-stage";
    stage.dataset.timelineBackgroundStage = "true";
    stage.setAttribute("aria-hidden", "true");
    stage.innerHTML = '<div class="timeline-background-layer is-active" data-timeline-background-layer="a"></div><div class="timeline-background-layer" data-timeline-background-layer="b"></div>';
    els.content.prepend(stage);
  }

  function createTimelineBackgroundImageField() {
    if (!els.form || els.fields.background_image_url) return;
    var anchor = els.fields.links ? (els.fields.links.closest(".timeline-field") || els.fields.links.parentElement) : null;
    var field = document.createElement("label");
    field.className = "timeline-field is-full";
    field.innerHTML = '<span class="timeline-label">Immagine sfondo timeline</span><input class="timeline-input" id="timelineEventBackgroundImageUrl" name="background_image_url" type="url" placeholder="https://..." autocomplete="off" />';
    if (anchor && anchor.parentElement) anchor.parentElement.insertBefore(field, anchor);
    else els.form.appendChild(field);
    els.fields.background_image_url = field.querySelector("[name='background_image_url']");
  }

  function createTimelineLocationField() {
    if (!els.form || els.fields.location) return;
    var anchor = els.fields.state ? (els.fields.state.closest(".timeline-field") || els.fields.state.parentElement) : null;
    var field = document.createElement("label");
    field.className = "timeline-field timeline-location-field";
    field.innerHTML = '<span class="timeline-label">Luogo</span><input class="timeline-input" id="timelineEventLocation" name="location" type="text" placeholder="Testo normale oppure [Nome luogo]{URL}" autocomplete="off" />';
    if (anchor && anchor.parentElement) anchor.parentElement.insertBefore(field, anchor.nextSibling);
    else els.form.appendChild(field);
    els.fields.location = field.querySelector("[name='location']");
  }

  function createTimelineSummaryCounter() {
    if (!els.fields.summary) return;
    var wrapper = els.fields.summary.closest(".timeline-field") || els.fields.summary.parentElement;
    if (!wrapper || wrapper.querySelector("[data-summary-counter]")) return;
    var counter = document.createElement("span");
    counter.className = "timeline-summary-counter";
    counter.dataset.summaryCounter = "true";
    counter.setAttribute("aria-live", "polite");
    wrapper.appendChild(counter);
    updateTimelineSummaryCounter();
  }

  function updateTimelineSummaryCounter() {
    if (!els.fields || !els.fields.summary) return;
    var wrapper = els.fields.summary.closest(".timeline-field") || els.fields.summary.parentElement;
    var counter = wrapper ? wrapper.querySelector("[data-summary-counter]") : null;
    if (!counter) return;
    var length = String(els.fields.summary.value || "").length;
    counter.textContent = length + " / " + SUMMARY_MAX_LENGTH;
    counter.dataset.summaryCountTone = length >= SUMMARY_MAX_LENGTH ? "limit" : length >= Math.floor(SUMMARY_MAX_LENGTH * 0.85) ? "warning" : "default";
  }

  function prepareModalUi() {
    hideFieldWrapper(els.fields.short_title);
    hideFieldWrapper(els.fields.knowledge);
    hideFieldWrapper(els.fields.truth);
    hideFieldWrapper(els.visibility);
    hideFieldWrapper(els.knowledge);
    hideFieldWrapper(els.playerModeButton);
    hideFieldWrapper(els.dmModeButton);
    hideFieldWrapper(els.modeToggle);
    if (els.fields.short_title) els.fields.short_title.required = false;
    if (els.fields.knowledge) els.fields.knowledge.required = false;
    if (els.fields.truth) els.fields.truth.required = false;
    if (els.fields.summary) {
      els.fields.summary.maxLength = SUMMARY_MAX_LENGTH;
      els.fields.summary.setAttribute("maxlength", String(SUMMARY_MAX_LENGTH));
      els.fields.summary.setAttribute("data-summary-max-length", String(SUMMARY_MAX_LENGTH));
      createTimelineSummaryCounter();
    }
    enhanceSortKeyHelp();
  }

  function hideFieldWrapper(field) {
    if (!field) return;
    var wrapper = field.closest(".timeline-field") || field.closest("label") || field.parentElement;
    if (wrapper) wrapper.hidden = true;
  }

  function createTimelineToolbarControls() {
    if (!els.toolbar || els.toolbarControls) return els.toolbarControls;

    var existing = els.toolbar.querySelector("[data-timeline-toolbar-controls]");
    if (existing) {
      els.toolbarControls = existing;
      return existing;
    }

    var controls = document.createElement("div");
    controls.className = "timeline-toolbar-controls";
    controls.dataset.timelineToolbarControls = "true";
    controls.setAttribute("aria-label", "Controlli timeline");

    var actions = els.toolbar.querySelector(".timeline-toolbar-actions");
    if (actions) els.toolbar.insertBefore(controls, actions);
    else els.toolbar.appendChild(controls);

    els.toolbarControls = controls;
    return controls;
  }

  function createTimelineFilterToggles() {
    if (!els.list || document.querySelector("[data-timeline-icon-filters]")) return;

    hideFieldWrapper(els.type);
    hideFieldWrapper(els.visibility);
    hideFieldWrapper(els.knowledge);
    hideFieldWrapper(els.state);

    var host = createTimelineToolbarControls();
    if (!host) return;

    var root = document.createElement("div");
    root.className = "timeline-icon-filters";
    root.dataset.timelineIconFilters = "true";
    root.innerHTML =
      '<div class="timeline-icon-filter-set">' +
      '<span class="timeline-icon-filter-title">Tipo</span>' +
      '<div class="timeline-icon-filter-group" role="group" aria-label="Filtra per tipo">' +
      renderTimelineFilterButtons("type", TYPE_META, activeTypeFilters) +
      '</div>' +
      '</div>'; 

    host.appendChild(root);
    root.addEventListener("click", handleTimelineIconFilterClick);
  }

  function createTimelineCharacterFilter() {
    var host = createTimelineToolbarControls();
    if (!host) return;

    var root = document.querySelector("[data-timeline-character-filters]");
    if (!root) {
      root = document.createElement("div");
      root.className = "timeline-character-filters";
      root.dataset.timelineCharacterFilters = "true";
      root.innerHTML =
        '<div class="timeline-icon-filter-set timeline-icon-filter-set--characters">' +
        '<span class="timeline-icon-filter-title">Personaggi</span>' +
        '<div class="timeline-character-filter-group" role="group" aria-label="Filtra per personaggio" data-timeline-character-filter-group></div>' +
        '</div>';
      host.appendChild(root);
      root.addEventListener("click", handleTimelineCharacterFilterClick);
    }

    renderTimelineCharacterFilters(root);
  }

  function renderTimelineCharacterFilters(root) {
    var group = root && root.querySelector("[data-timeline-character-filter-group]");
    if (!group) return;

    if (!timelineCharacters.length) {
      group.innerHTML = '<span class="timeline-character-filter-empty">Nessun personaggio</span>';
      return;
    }

    var allActive = activeCharacterFilters.length === 0;
    var html = '<button type="button" class="timeline-character-filter timeline-character-filter--all' + (allActive ? " is-active" : "") + '" data-character-filter-value="" aria-pressed="' + (allActive ? "true" : "false") + '" title="Tutti i personaggi" aria-label="Tutti i personaggi"><i class="fa-solid fa-users" aria-hidden="true"></i></button>';

    html += timelineCharacters.map(function (character) {
      var id = toIdString(character && character.id);
      var active = activeCharacterFilters.indexOf(id) >= 0;
      var name = readString(character && character.name, "Personaggio");
      var image = getCharacterImageUrl(character);
      return '<button type="button" class="timeline-character-filter' + (active ? " is-active" : "") + '" data-character-filter-value="' + escapeAttribute(id) + '" aria-pressed="' + (active ? "true" : "false") + '" title="' + escapeAttribute(name) + '" aria-label="' + escapeAttribute(name) + '"><img src="' + escapeAttribute(image) + '" alt="" loading="lazy" /></button>';
    }).join("");

    group.innerHTML = html;
  }

  function handleTimelineCharacterFilterClick(event) {
    var button = event.target.closest("[data-character-filter-value]");
    if (!button) return;

    var value = toIdString(button.dataset.characterFilterValue);
    if (!value) {
      activeCharacterFilters = [];
    } else {
      var index = activeCharacterFilters.indexOf(value);
      if (index >= 0) activeCharacterFilters.splice(index, 1);
      else activeCharacterFilters.push(value);
    }

    syncTimelineCharacterFilters();
    expandedEventId = null;
    renderTimeline();
  }

  function syncTimelineCharacterFilters() {
    var root = document.querySelector("[data-timeline-character-filters]");
    if (!root) return;
    renderTimelineCharacterFilters(root);
  }

  function createTimelineCharacterPicker() {
    if (!els.form || els.characterPicker) return;

    var anchor = els.fields.tags ? (els.fields.tags.closest(".timeline-field") || els.fields.tags.parentElement) : null;
    var field = document.createElement("div");
    field.className = "timeline-field timeline-character-picker-field is-full";
    field.dataset.timelineCharacterPicker = "true";
    field.innerHTML =
      '<span class="timeline-label">Personaggi collegati</span>' +
      '<input class="timeline-input timeline-character-picker__search" type="search" placeholder="Cerca personaggio..." data-timeline-character-picker-search autocomplete="off" />' +
      '<div class="timeline-character-picker__list" data-timeline-character-picker-list></div>';

    if (anchor && anchor.parentElement) anchor.parentElement.insertBefore(field, anchor);
    else els.form.appendChild(field);

    els.characterPicker = field;
    els.characterPickerSearch = field.querySelector("[data-timeline-character-picker-search]");
    els.characterPickerList = field.querySelector("[data-timeline-character-picker-list]");

    if (els.characterPickerSearch) {
      els.characterPickerSearch.addEventListener("input", renderTimelineCharacterPickerOptions);
    }
  }

  function renderTimelineCharacterPickerOptions() {
    if (!els.characterPickerList) return;

    var query = normalizeSearchText(getFieldValue(els.characterPickerSearch));
    var characters = timelineCharacters.filter(function (character) {
      var haystack = normalizeSearchText([
        character && character.name,
        character && character.class_name,
        character && character.subclass_name,
        character && character.slug
      ].join(" "));
      return !query || haystack.indexOf(query) >= 0;
    });

    if (!characters.length) {
      els.characterPickerList.innerHTML = '<p class="timeline-character-picker__empty">Nessun personaggio trovato.</p>';
      return;
    }

    els.characterPickerList.innerHTML = characters.map(function (character) {
      var id = toIdString(character && character.id);
      var checked = selectedModalCharacterIds.has(id);
      var name = readString(character && character.name, "Personaggio");
      return '<label class="timeline-character-option">' +
        '<input type="checkbox" value="' + escapeAttribute(id) + '" class="timeline-character-option__check"' + (checked ? " checked" : "") + ' />' +
        '<img class="timeline-character-option__avatar" src="' + escapeAttribute(getCharacterImageUrl(character)) + '" alt="" loading="lazy" />' +
        '<span class="timeline-character-option__info"><strong>' + escapeHtml(name) + '</strong><small>' + escapeHtml(buildCharacterMeta(character)) + '</small></span>' +
        '</label>';
    }).join("");

    els.characterPickerList.querySelectorAll(".timeline-character-option__check").forEach(function (checkbox) {
      checkbox.addEventListener("change", function (event) {
        var id = toIdString(event.currentTarget.value);
        if (!id) return;
        if (event.currentTarget.checked) selectedModalCharacterIds.add(id);
        else selectedModalCharacterIds.delete(id);
      });
    });
  }

  function setTimelineCharacterPickerFromEvent(event) {
    selectedModalCharacterIds = new Set(normalizeCharacterIds(event && event.character_ids));
    if (els.characterPickerSearch) els.characterPickerSearch.value = "";
    renderTimelineCharacterPickerOptions();
  }

  function getTimelineToolbarHost() {
    return createTimelineToolbarControls() || els.toolbar || (els.search ? els.search.closest(".timeline-field") || els.search.parentElement : null) || els.list.parentElement;
  }

  function renderTimelineFilterButtons(kind, meta, activeValues) {
    return Object.keys(meta).map(function (value) {
      var item = meta[value];
      var active = activeValues.indexOf(value) >= 0;
      return '<button type="button" class="timeline-icon-filter' + (active ? " is-active" : "") + '" data-filter-kind="' + escapeAttribute(kind) + '" data-filter-value="' + escapeAttribute(value) + '" aria-pressed="' + (active ? "true" : "false") + '" aria-label="' + escapeAttribute(item.label) + '" title="' + escapeAttribute(item.label) + '"><i class="' + escapeAttribute(item.icon) + '" aria-hidden="true"></i></button>';
    }).join("");
  }

  function handleTimelineIconFilterClick(event) {
    var button = event.target.closest("[data-filter-kind][data-filter-value]");
    if (!button) return;
    var kind = button.dataset.filterKind;
    var value = button.dataset.filterValue;
    if (kind === "type") activeTypeFilters = toggleFilterValue(activeTypeFilters, value, Object.keys(TYPE_META));
    else return;
    syncTimelineIconFilters();
    expandedEventId = null;
    renderTimeline();
  }

  function toggleFilterValue(activeValues, value, allValues) {
    var next = activeValues.slice();
    var index = next.indexOf(value);
    if (index >= 0) next.splice(index, 1);
    else next.push(value);
    if (next.length === 0) return allValues.slice();
    return next;
  }

  function syncTimelineIconFilters() {
    document.querySelectorAll("[data-filter-kind][data-filter-value]").forEach(function (button) {
      var activeValues = activeTypeFilters;
      var active = activeValues.indexOf(button.dataset.filterValue) >= 0;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function enhanceSortKeyHelp() {
    if (!els.fields || !els.fields.sort_key) return;
    var wrapper = els.fields.sort_key.closest(".timeline-field") || els.fields.sort_key.parentElement;
    if (!wrapper || wrapper.querySelector("[data-sort-key-help]")) return;
    var label = wrapper.querySelector(".timeline-label") || wrapper.firstElementChild;
    if (!label) return;
    var help = document.createElement("span");
    help.className = "timeline-sort-help";
    help.dataset.sortKeyHelp = "true";
    help.dataset.tooltip = "La Sort Key controlla l'ordine cronologico. Con una data Harptos viene generata automaticamente: anno DR × 1000 + giorno dell'anno. Per una data sconosciuta, inseriscila manualmente.";
    help.tabIndex = 0;
    help.textContent = "?";
    help.setAttribute("aria-label", "Aiuto Sort Key");
    label.appendChild(help);
  }

  function createHarptosDatePicker() {
    if (!els.fields.date_label || !els.fields.sort_key) return;
    var host = els.fields.date_label.closest(".timeline-field") || els.fields.date_label.parentElement;
    if (!host || host.querySelector("[data-harptos-picker]")) return;
    host.classList.add("timeline-date-field", "is-harptos-generated-field");
    els.fields.date_label.required = false;
    els.fields.date_label.readOnly = true;
    els.fields.date_label.tabIndex = -1;

    var root = document.createElement("div");
    root.className = "timeline-date-picker";
    root.dataset.harptosPicker = "true";
    root.innerHTML =
      '<div class="timeline-date-control">' +
      '<input class="timeline-input timeline-date-display" type="text" readonly data-harptos-display aria-label="Data Harptos" />' +
      '<button class="timeline-icon-button timeline-date-toggle" type="button" data-harptos-toggle aria-label="Apri calendario Harptos" aria-expanded="false"><i class="fa-solid fa-calendar-days" aria-hidden="true"></i></button>' +
      '</div>' +
      '<div class="timeline-date-panel" data-harptos-panel hidden>' +
      '<label class="timeline-field timeline-harptos-field is-full"><span class="timeline-label">Tipo data</span><select class="timeline-select" data-harptos-kind><option value="single">Evento di un giorno</option><option value="range">Evento da un giorno a un altro</option><option value="ongoing">Evento iniziato e ancora in corso</option><option value="unknown">Data sconosciuta</option></select></label>' +
      '<div class="timeline-harptos-calendar-group" data-harptos-start-group><h4 class="timeline-harptos-group-title">Data iniziale</h4>' + buildHarptosCalendarMarkup("start") + '</div>' +
      '<div class="timeline-harptos-calendar-group" data-harptos-end-group hidden><h4 class="timeline-harptos-group-title">Data finale</h4>' + buildHarptosCalendarMarkup("end") + '</div>' +
      '<p class="timeline-harptos-unknown" data-harptos-unknown-note hidden>Data sconosciuta: compila manualmente la Sort Key per posizionare l’evento nella timeline.</p>' +
      '<p class="timeline-harptos-preview" data-harptos-preview></p>' +
      '</div>';

    host.appendChild(root);
    els.harptos.root = root;
    els.harptos.display = root.querySelector("[data-harptos-display]");
    els.harptos.toggle = root.querySelector("[data-harptos-toggle]");
    els.harptos.panel = root.querySelector("[data-harptos-panel]");
    els.harptos.kind = root.querySelector("[data-harptos-kind]");
    els.harptos.endGroup = root.querySelector("[data-harptos-end-group]");
    els.harptos.unknownNote = root.querySelector("[data-harptos-unknown-note]");
    els.harptos.preview = root.querySelector("[data-harptos-preview]");
    assignHarptosCalendarRefs("start");
    assignHarptosCalendarRefs("end");
    populateHarptosPickerOptions();
    setHarptosPickerFromEvent(null);
  }

  function buildHarptosCalendarMarkup(prefix) {
    return (
      '<div class="timeline-harptos-grid">' +
      '<label class="timeline-field timeline-harptos-field"><span class="timeline-label">Anno DR</span><input class="timeline-input" type="number" min="-10000" max="10000" step="1" value="' + CURRENT_CAMPAIGN_YEAR_DR + '" data-harptos-' + prefix + '-year /></label>' +
      '<label class="timeline-field timeline-harptos-field"><span class="timeline-label">Nome dell’anno</span><input class="timeline-input" type="text" readonly data-harptos-' + prefix + '-year-name /></label>' +
      '<label class="timeline-field timeline-harptos-field"><span class="timeline-label">Mese</span><select class="timeline-select" data-harptos-' + prefix + '-month></select></label>' +
      '<label class="timeline-field timeline-harptos-field"><span class="timeline-label">Formato</span><select class="timeline-select" data-harptos-' + prefix + '-mode><option value="day">Giorno del mese</option><option value="festival">Festival</option></select></label>' +
      '</div>' +
      '<div class="timeline-harptos-day-grid" data-harptos-' + prefix + '-calendar></div>' +
      '<div class="timeline-harptos-festival-grid" data-harptos-' + prefix + '-festival-grid hidden></div>'
    );
  }

  function assignHarptosCalendarRefs(prefix) {
    els.harptos[prefix + "Year"] = els.harptos.root.querySelector("[data-harptos-" + prefix + "-year]");
    els.harptos[prefix + "YearName"] = els.harptos.root.querySelector("[data-harptos-" + prefix + "-year-name]");
    els.harptos[prefix + "Month"] = els.harptos.root.querySelector("[data-harptos-" + prefix + "-month]");
    els.harptos[prefix + "Mode"] = els.harptos.root.querySelector("[data-harptos-" + prefix + "-mode]");
    els.harptos[prefix + "Calendar"] = els.harptos.root.querySelector("[data-harptos-" + prefix + "-calendar]");
    els.harptos[prefix + "FestivalGrid"] = els.harptos.root.querySelector("[data-harptos-" + prefix + "-festival-grid]");
  }

  function populateHarptosPickerOptions() {
    ["start", "end"].forEach(function (prefix) {
      var monthEl = els.harptos[prefix + "Month"];
      if (!monthEl) return;
      monthEl.innerHTML = HARPTOS_MONTHS.map(function (month) {
        return '<option value="' + escapeAttribute(month.id) + '">' + escapeHtml(month.id + " — " + month.common) + "</option>";
      }).join("");
      renderHarptosCalendar(prefix);
      renderHarptosFestivals(prefix);
    });
  }

  function renderHarptosCalendar(prefix) {
    var grid = els.harptos[prefix + "Calendar"];
    if (!grid) return;
    var selectedDay = Number(els.harptos[prefix + "Day"] || 1);
    var html = '<div class="timeline-harptos-weekdays"><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>7</span><span>8</span><span>9</span><span>10</span></div>';
    html += '<div class="timeline-harptos-days">';
    for (var day = 1; day <= 30; day += 1) {
      html += '<button type="button" class="timeline-harptos-day' + (day === selectedDay ? " is-selected" : "") + '" data-harptos-day="' + day + '">' + day + "</button>";
    }
    html += "</div>";
    grid.innerHTML = html;
  }

  function renderHarptosFestivals(prefix) {
    var grid = els.harptos[prefix + "FestivalGrid"];
    if (!grid) return;
    var selectedFestival = els.harptos[prefix + "Festival"] || "Midwinter";
    grid.innerHTML = HARPTOS_FESTIVALS.map(function (festival) {
      return '<button type="button" class="timeline-harptos-festival' + (festival.id === selectedFestival ? " is-selected" : "") + '" data-harptos-festival="' + escapeAttribute(festival.id) + '">' + escapeHtml(festival.label) + "</button>";
    }).join("");
  }

  function createVisibilitySwitch() {
    if (!els.fields.visibility) return;
    var wrapper = els.fields.visibility.closest(".timeline-field") || els.fields.visibility.parentElement;
    if (!wrapper || wrapper.querySelector("[data-visibility-switch]")) return;
    els.fields.visibility.hidden = true;
    var switchEl = document.createElement("div");
    switchEl.className = "timeline-visibility-switch";
    switchEl.dataset.visibilitySwitch = "true";
    switchEl.innerHTML =
      '<button type="button" data-visibility-value="players"><i class="fa-solid fa-user" aria-hidden="true"></i><span>Giocatori</span></button>' +
      '<button type="button" data-visibility-value="dm"><i class="fa-solid fa-crown" aria-hidden="true"></i><span>DM</span></button>';
    wrapper.appendChild(switchEl);
    els.visibilitySwitch = switchEl;
    syncVisibilitySwitch();
  }

  function decorateTimelineSelectOptions() {
    enhanceSelectWithFaIcons(els.fields.type, TYPE_META, "Tipo");
    enhanceSelectWithFaIcons(els.fields.state, STATE_META, "Stato");
  }

  function enhanceSelectWithFaIcons(select, meta, label) {
    if (!select || select.dataset.faEnhanced === "true") return;

    select.dataset.faEnhanced = "true";
    select.classList.add("timeline-select--fa-hidden");

    var wrapper = document.createElement("div");
    wrapper.className = "timeline-fa-select";
    wrapper.dataset.faSelect = "true";

    var trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "timeline-fa-select__trigger";
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");
    trigger.setAttribute("aria-label", label || "Seleziona");

    var menu = document.createElement("div");
    menu.className = "timeline-fa-select__menu";
    menu.setAttribute("role", "listbox");
    menu.hidden = true;

    wrapper.appendChild(trigger);
    wrapper.appendChild(menu);
    select.insertAdjacentElement("afterend", wrapper);

    renderFaSelect(select, wrapper, meta);

    trigger.addEventListener("click", function (event) {
      event.stopPropagation();
      closeAllFaSelects(wrapper);
      var isOpen = !menu.hidden;
      menu.hidden = isOpen;
      trigger.setAttribute("aria-expanded", isOpen ? "false" : "true");
    });

    menu.addEventListener("click", function (event) {
      var optionButton = event.target.closest("[data-fa-select-value]");
      if (!optionButton) return;
      select.value = optionButton.dataset.faSelectValue;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      renderFaSelect(select, wrapper, meta);
      menu.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
    });

    select.addEventListener("change", function () {
      renderFaSelect(select, wrapper, meta);
    });
  }

  function renderFaSelect(select, wrapper, meta) {
    var trigger = wrapper.querySelector(".timeline-fa-select__trigger");
    var menu = wrapper.querySelector(".timeline-fa-select__menu");
    if (!trigger || !menu) return;

    var selectedOption = select.options[select.selectedIndex] || select.options[0];
    trigger.innerHTML = renderFaSelectOptionContent(selectedOption, meta) + '<i class="fa-solid fa-chevron-down" aria-hidden="true"></i>';

    menu.innerHTML = Array.from(select.options).map(function (option) {
      var selected = option.value === select.value;
      return '<button type="button" class="timeline-fa-select__option' + (selected ? " is-selected" : "") + '" role="option" aria-selected="' + (selected ? "true" : "false") + '" data-fa-select-value="' + escapeAttribute(option.value) + '">' + renderFaSelectOptionContent(option, meta) + '</button>';
    }).join("");
  }

  function renderFaSelectOptionContent(option, meta) {
    if (!option) return "";

    if (option.value === "all") {
      return '<span class="timeline-fa-select__icon"><i class="fa-solid fa-layer-group" aria-hidden="true"></i></span><span>' + escapeHtml(option.textContent || "Tutti") + '</span>';
    }

    var item = meta[option.value];
    var icon = item ? item.icon : "fa-solid fa-circle";
    var label = item ? item.label : option.textContent;
    return '<span class="timeline-fa-select__icon"><i class="' + escapeAttribute(icon) + '" aria-hidden="true"></i></span><span>' + escapeHtml(label) + '</span>';
  }

  function closeAllFaSelects(exceptWrapper) {
    document.querySelectorAll(".timeline-fa-select").forEach(function (wrapper) {
      if (exceptWrapper && wrapper === exceptWrapper) return;
      var menu = wrapper.querySelector(".timeline-fa-select__menu");
      var trigger = wrapper.querySelector(".timeline-fa-select__trigger");
      if (menu) menu.hidden = true;
      if (trigger) trigger.setAttribute("aria-expanded", "false");
    });
  }

  function createTagsPillInput() {
    if (!els.fields.tags) return;

    var wrapper = els.fields.tags.closest(".timeline-field") || els.fields.tags.parentElement;
    if (!wrapper || wrapper.querySelector("[data-tags-pill-input]")) return;

    els.fields.tags.type = "hidden";

    var pillInput = document.createElement("div");
    pillInput.className = "timeline-tags-pill-input";
    pillInput.dataset.tagsPillInput = "true";
    pillInput.innerHTML =
      '<div class="timeline-tags-pill-list" data-tags-pill-list></div>' +
      '<input class="timeline-tags-pill-editor" type="text" data-tags-pill-editor placeholder="Aggiungi tag..." />';

    wrapper.appendChild(pillInput);
    syncTagsPillInputFromHidden();
  }

  function syncTagsPillInputFromHidden() {
    if (!els.fields.tags) return;
    var wrapper = els.fields.tags.closest(".timeline-field") || els.fields.tags.parentElement;
    var list = wrapper ? wrapper.querySelector("[data-tags-pill-list]") : null;
    if (!list) return;

    var tags = inputToArray(getFieldValue(els.fields.tags));
    list.innerHTML = tags.map(function (tag) {
      return '<button type="button" class="timeline-tag-pill" data-tag-value="' + escapeAttribute(tag) + '" aria-label="Rimuovi tag ' + escapeAttribute(tag) + '"><span>' + escapeHtml(tag) + '</span><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>';
    }).join("");
  }

  function addTagPill(rawValue) {
    if (!els.fields.tags) return;
    var tag = readString(rawValue, "");
    if (!tag) return;

    var tags = inputToArray(getFieldValue(els.fields.tags));
    var exists = tags.some(function (item) {
      return item.toLowerCase() === tag.toLowerCase();
    });
    if (!exists) tags.push(tag);
    setFieldValue(els.fields.tags, tags.join(", "));
    syncTagsPillInputFromHidden();
  }

  function removeTagPill(tag) {
    if (!els.fields.tags) return;
    var value = readString(tag, "").toLowerCase();
    var tags = inputToArray(getFieldValue(els.fields.tags)).filter(function (item) {
      return item.toLowerCase() !== value;
    });
    setFieldValue(els.fields.tags, tags.join(", "));
    syncTagsPillInputFromHidden();
  }

  function createDescriptionMarkdownToolbar() {
    if (!els.fields.description) return;

    var wrapper = els.fields.description.closest(".timeline-field") || els.fields.description.parentElement;
    if (!wrapper || wrapper.querySelector("[data-markdown-toolbar]")) return;

    var toolbar = document.createElement("div");
    toolbar.className = "timeline-markdown-toolbar";
    toolbar.dataset.markdownToolbar = "true";
    toolbar.setAttribute("aria-label", "Toolbar Markdown descrizione");
    toolbar.innerHTML =
      '<button type="button" tabindex="-1" data-md-action="heading" aria-label="Heading" title="Heading"><i class="fa-solid fa-heading" aria-hidden="true"></i></button>' +
      '<button type="button" tabindex="-1" data-md-action="bold" aria-label="Bold" title="Bold"><i class="fa-solid fa-bold" aria-hidden="true"></i></button>' +
      '<button type="button" tabindex="-1" data-md-action="italic" aria-label="Italic" title="Italic"><i class="fa-solid fa-italic" aria-hidden="true"></i></button>' +
      '<button type="button" tabindex="-1" data-md-action="bullet" aria-label="Lista puntata" title="Lista puntata"><i class="fa-solid fa-list-ul" aria-hidden="true"></i></button>' +
      '<button type="button" tabindex="-1" data-md-action="number" aria-label="Lista numerata" title="Lista numerata"><i class="fa-solid fa-list-ol" aria-hidden="true"></i></button>';

    wrapper.insertBefore(toolbar, els.fields.description);
  }

  function decorateModalFooterButtons() {
    setIconOnlyButton(els.modalClose, "fa-solid fa-xmark", "Chiudi", "button");
    setIconOnlyButton(els.modalCancel, "fa-solid fa-xmark", "Annulla", "button");
    setIconOnlyButton(els.modalSave, "fa-solid fa-floppy-disk", "Salva evento", "submit");
  }

  function setIconOnlyButton(button, iconClass, label, type) {
    if (!button) return;
    button.type = type || "button";
    button.classList.add("timeline-button--icon-only");
    button.setAttribute("aria-label", label);
    button.title = label;
    button.innerHTML = '<i class="' + escapeAttribute(iconClass) + '" aria-hidden="true"></i>';
  }

  function prependButtonIcon(button, iconClass) {
    if (!button || button.querySelector("i")) return;
    var icon = document.createElement("i");
    icon.className = iconClass;
    icon.setAttribute("aria-hidden", "true");
    button.prepend(icon);
  }

  function bindEvents() {
    getHarptosControls().forEach(function (el) {
      if (!el) return;
      el.addEventListener("input", updateHarptosDateFields);
      el.addEventListener("change", updateHarptosDateFields);
    });

    if (els.harptos.toggle) {
      els.harptos.toggle.addEventListener("click", function (event) {
        event.stopPropagation();
        toggleHarptosPanel();
      });
    }

    if (els.harptos.display) {
      els.harptos.display.addEventListener("click", function (event) {
        event.stopPropagation();
        openHarptosPanel();
      });
    }

    if (els.harptos.root) {
      els.harptos.root.addEventListener("click", handleHarptosClick);
    }

    if (els.visibilitySwitch) {
      els.visibilitySwitch.addEventListener("click", handleVisibilitySwitchClick);
    }

    var markdownToolbar = document.querySelector("[data-markdown-toolbar]");
    if (markdownToolbar) {
      markdownToolbar.addEventListener("mousedown", function (event) {
        if (event.target.closest("[data-md-action]")) event.preventDefault();
      });
      markdownToolbar.addEventListener("click", handleMarkdownToolbarClick);
    }

    var tagsPillInput = document.querySelector("[data-tags-pill-input]");
    if (tagsPillInput) {
      tagsPillInput.addEventListener("click", handleTagsPillInputClick);
      tagsPillInput.addEventListener("keydown", handleTagsPillInputKeydown);
      tagsPillInput.addEventListener("input", handleTagsPillInputChange);
      tagsPillInput.addEventListener("blur", handleTagsPillInputBlur, true);
    }

    document.addEventListener("click", function (event) {
      closeAllFaSelects(null);
      handleTimelineOutsideClick(event);

      if (!els.harptos.root || !els.harptos.panel || els.harptos.panel.hidden) return;
      if (els.harptos.root.contains(event.target)) return;
      closeHarptosPanel();
    });

    [els.search].forEach(function (el) {
      if (!el) return;
      el.addEventListener("input", renderTimeline);
      el.addEventListener("change", renderTimeline);
    });

    if (els.fields.visibility) {
      els.fields.visibility.addEventListener("change", syncVisibilitySwitch);
    }

    if (els.playerModeButton) els.playerModeButton.addEventListener("click", function () { setTimelineMode("players"); });
    if (els.dmModeButton) els.dmModeButton.addEventListener("click", function () { setTimelineMode("dm"); });
    if (els.newButton) els.newButton.addEventListener("click", function () { openEventModal(null); });
    if (els.editButton) {
      els.editButton.hidden = true;
      els.editButton.addEventListener("click", function () { var event = getSelectedEvent(); if (event) openEventModal(event); });
    }
    if (els.deleteButton) {
      els.deleteButton.hidden = true;
      els.deleteButton.addEventListener("click", deleteSelectedEvent);
    }
    if (els.modalBackdrop) els.modalBackdrop.addEventListener("click", closeEventModal);
    if (els.modalClose) els.modalClose.addEventListener("click", closeEventModal);
    if (els.modalCancel) els.modalCancel.addEventListener("click", closeEventModal);
    if (els.modal) els.modal.addEventListener("click", handleTimelineModalClick);
    if (els.form) els.form.addEventListener("submit", function (event) { event.preventDefault(); saveTimelineEvent(); });

    if (els.fields.summary) {
      els.fields.summary.addEventListener("input", updateTimelineSummaryCounter);
      els.fields.summary.addEventListener("change", updateTimelineSummaryCounter);
    }

    bindTimelineTextUndoFields();

    document.addEventListener("keydown", function (event) {
      if (event.key !== "Escape") return;
      if (els.harptos.panel && !els.harptos.panel.hidden) {
        closeHarptosPanel();
        return;
      }
      if (els.modal && !els.modal.hidden) closeEventModal();
    });
  }

  function bindTimelineTextUndoFields() {
    [els.fields.summary, els.fields.description, els.fields.dm_notes].forEach(function (field) {
      if (!field || field.dataset.timelineUndoBound === "true") return;
      field.dataset.timelineUndoBound = "true";
      initializeTextUndoState(field);
      field.addEventListener("focus", function () { initializeTextUndoState(field); });
      field.addEventListener("input", function () { recordTextUndoSnapshot(field); });
      field.addEventListener("keydown", handleTimelineTextUndoKeydown);
    });
  }

  function initializeTextUndoState(field) {
    if (!field) return;
    if (timelineTextUndoState.has(field)) return;
    timelineTextUndoState.set(field, {
      undo: [getTextUndoSnapshot(field)],
      redo: [],
      applying: false
    });
  }

  function getTextUndoSnapshot(field) {
    return {
      value: String(field.value || ""),
      start: field.selectionStart || 0,
      end: field.selectionEnd || 0
    };
  }

  function recordTextUndoSnapshot(field) {
    if (!field) return;
    initializeTextUndoState(field);
    var state = timelineTextUndoState.get(field);
    if (!state || state.applying) return;
    var next = getTextUndoSnapshot(field);
    var previous = state.undo[state.undo.length - 1];
    if (previous && previous.value === next.value && previous.start === next.start && previous.end === next.end) return;
    state.undo.push(next);
    if (state.undo.length > 120) state.undo.shift();
    state.redo = [];
  }

  function handleTimelineTextUndoKeydown(event) {
    var field = event.currentTarget;
    if (!field || !(event.ctrlKey || event.metaKey)) return;
    var key = String(event.key || "").toLowerCase();
    if (key !== "z" && key !== "y") return;

    if (key === "z" && event.shiftKey) {
      event.preventDefault();
      applyTextRedo(field);
      return;
    }

    if (key === "y") {
      event.preventDefault();
      applyTextRedo(field);
      return;
    }

    event.preventDefault();
    applyTextUndo(field);
  }

  function applyTextUndo(field) {
    initializeTextUndoState(field);
    var state = timelineTextUndoState.get(field);
    if (!state || state.undo.length <= 1) return;
    state.redo.push(state.undo.pop());
    applyTextUndoSnapshot(field, state.undo[state.undo.length - 1], state);
  }

  function applyTextRedo(field) {
    initializeTextUndoState(field);
    var state = timelineTextUndoState.get(field);
    if (!state || !state.redo.length) return;
    var snapshot = state.redo.pop();
    state.undo.push(snapshot);
    applyTextUndoSnapshot(field, snapshot, state);
  }

  function applyTextUndoSnapshot(field, snapshot, state) {
    if (!field || !snapshot) return;
    state.applying = true;
    field.value = snapshot.value;
    field.focus({ preventScroll: true });
    if (typeof field.setSelectionRange === "function") field.setSelectionRange(snapshot.start, snapshot.end);
    if (field === els.fields.summary) updateTimelineSummaryCounter();
    state.applying = false;
  }

  function handleTimelineModalClick(event) {
    var closeButton = event.target.closest("#timelineModalClose, [data-timeline-modal-close], [data-modal-close], .timeline-modal-close, .timeline-modal__close");
    if (!closeButton) return;
    event.preventDefault();
    event.stopPropagation();
    closeEventModal();
  }

  function handleTimelineOutsideClick(event) {
    if (!expandedEventId) return;
    if (!event || !event.target) return;
    if (event.target.closest(".timeline-event")) return;
    if (event.target.closest(".timeline-toolbar, [data-timeline-toolbar], .timeline-modal, [data-timeline-modal], .timeline-date-picker, [data-harptos-picker], .timeline-fa-select, [data-tags-pill-input]")) return;
    expandedEventId = null;
    renderTimeline();
  }

  function syncTimelineExpandedState() {
    var hasExpanded = Boolean(expandedEventId);
    if (els.list) els.list.classList.toggle("has-expanded-event", hasExpanded);
    if (els.content) els.content.classList.toggle("has-expanded-timeline-event", hasExpanded);
  }

  function handleTagsPillInputClick(event) {
    var removeButton = event.target.closest("[data-tag-value]");
    if (removeButton) {
      removeTagPill(removeButton.dataset.tagValue);
      return;
    }

    var editor = event.currentTarget.querySelector("[data-tags-pill-editor]");
    if (editor) editor.focus();
  }

  function handleTagsPillInputKeydown(event) {
    var editor = event.target.closest("[data-tags-pill-editor]");
    if (!editor) return;

    if (event.key === "," || event.key === "Enter") {
      event.preventDefault();
      addTagPill(editor.value);
      editor.value = "";
    } else if (event.key === "Backspace" && !editor.value) {
      var tags = inputToArray(getFieldValue(els.fields.tags));
      tags.pop();
      setFieldValue(els.fields.tags, tags.join(", "));
      syncTagsPillInputFromHidden();
    }
  }

  function handleTagsPillInputChange(event) {
    var editor = event.target.closest("[data-tags-pill-editor]");
    if (!editor || editor.value.indexOf(",") < 0) return;

    var parts = editor.value.split(",");
    parts.slice(0, -1).forEach(addTagPill);
    editor.value = parts[parts.length - 1].trimStart();
  }

  function handleTagsPillInputBlur(event) {
    var editor = event.target.closest("[data-tags-pill-editor]");
    if (!editor || !editor.value.trim()) return;

    addTagPill(editor.value);
    editor.value = "";
  }

  function handleMarkdownToolbarClick(event) {
    var button = event.target.closest("[data-md-action]");
    if (!button || !els.fields.description) return;

    applyMarkdownAction(els.fields.description, button.dataset.mdAction);
  }

  function applyMarkdownAction(textarea, action) {
    var start = textarea.selectionStart || 0;
    var end = textarea.selectionEnd || 0;
    var value = textarea.value || "";
    var selected = value.slice(start, end);
    var replacement = selected;
    var cursorStart = start;
    var cursorEnd = end;

    if (action === "heading") {
      var headingText = selected || "Heading";
      replacement = prefixLines(headingText, "## ");
      cursorStart = start + 3;
      cursorEnd = start + replacement.length;
    } else if (action === "bold") {
      replacement = "**" + (selected || "bold") + "**";
      cursorStart = selected ? start : start + 2;
      cursorEnd = selected ? start + replacement.length : start + replacement.length - 2;
    } else if (action === "italic") {
      replacement = "*" + (selected || "italic") + "*";
      cursorStart = selected ? start : start + 1;
      cursorEnd = selected ? start + replacement.length : start + replacement.length - 1;
    } else if (action === "bullet") {
      replacement = prefixLines(selected || "Elemento", "- ");
      cursorStart = selected ? start : start + 2;
      cursorEnd = start + replacement.length;
    } else if (action === "number") {
      replacement = numberLines(selected || "Elemento");
      cursorStart = selected ? start : start + 3;
      cursorEnd = start + replacement.length;
    } else {
      return;
    }

    recordTextUndoSnapshot(textarea);
    textarea.value = value.slice(0, start) + replacement + value.slice(end);
    textarea.focus({ preventScroll: true });
    textarea.setSelectionRange(cursorStart, cursorEnd);
    recordTextUndoSnapshot(textarea);
  }

  function prefixLines(text, prefix) {
    return String(text || "")
      .split(String.fromCharCode(10))
      .map(function (line) {
        return prefix + line;
      })
      .join(String.fromCharCode(10));
  }

  function numberLines(text) {
    return String(text || "")
      .split(String.fromCharCode(10))
      .map(function (line, index) {
        return index + 1 + ". " + line;
      })
      .join(String.fromCharCode(10));
  }

  function handleHarptosClick(event) {
    var dayButton = event.target.closest("[data-harptos-day]");
    if (dayButton) {
      setHarptosDay(dayButton);
      return;
    }
    var festivalButton = event.target.closest("[data-harptos-festival]");
    if (festivalButton) {
      setHarptosFestival(festivalButton);
    }
  }

  function setHarptosDay(button) {
    var prefix = getHarptosPrefixFromElement(button);
    if (!prefix) return;
    els.harptos[prefix + "Day"] = clampInteger(button.dataset.harptosDay, 1, 30, 1);
    renderHarptosCalendar(prefix);
    updateHarptosDateFields();
  }

  function setHarptosFestival(button) {
    var prefix = getHarptosPrefixFromElement(button);
    if (!prefix) return;
    els.harptos[prefix + "Festival"] = button.dataset.harptosFestival || "Midwinter";
    renderHarptosFestivals(prefix);
    updateHarptosDateFields();
  }

  function getHarptosPrefixFromElement(element) {
    if (!element) return "";
    if (element.closest("[data-harptos-end-group]")) return "end";
    return "start";
  }

  function handleVisibilitySwitchClick(event) {
    var button = event.target.closest("[data-visibility-value]");
    if (!button || !els.fields.visibility) return;
    setFieldValue(els.fields.visibility, button.dataset.visibilityValue || "players");
    syncVisibilitySwitch();
  }

  function syncVisibilitySwitch() {
    if (!els.visibilitySwitch || !els.fields.visibility) return;
    var value = getFieldValue(els.fields.visibility) || "players";
    els.visibilitySwitch.querySelectorAll("[data-visibility-value]").forEach(function (button) {
      var active = button.dataset.visibilityValue === value;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function getHarptosControls() {
    if (!els.harptos || !els.harptos.root) return [];
    return [
      els.harptos.kind,
      els.harptos.startYear,
      els.harptos.startMode,
      els.harptos.startMonth,
      els.harptos.endYear,
      els.harptos.endMode,
      els.harptos.endMonth,
      els.fields.sort_key
    ].filter(Boolean);
  }

  function toggleHarptosPanel() {
    if (!els.harptos.panel) return;
    if (els.harptos.panel.hidden) openHarptosPanel();
    else closeHarptosPanel();
  }

  function openHarptosPanel() {
    if (!els.harptos.panel) return;
    els.harptos.panel.hidden = false;
    if (els.harptos.toggle) els.harptos.toggle.setAttribute("aria-expanded", "true");
  }

  function closeHarptosPanel() {
    if (!els.harptos.panel) return;
    els.harptos.panel.hidden = true;
    if (els.harptos.toggle) els.harptos.toggle.setAttribute("aria-expanded", "false");
  }

  function bindLayoutEvents() {
    document.addEventListener("enclave:layout-ready", refreshManagePermissions);
    document.addEventListener("enclave:manage-access-changed", refreshManagePermissions);
    document.addEventListener("enclave:access-code-updated", refreshManagePermissions);
    document.addEventListener("enclave:player-resolved", refreshManagePermissions);
    document.addEventListener("enclave:player-cleared", refreshManagePermissions);
  }

  function refreshManagePermissions() {
    var previous = canManageTimeline;
    canManageTimeline = resolveCanManageTimeline();
    syncManagerUi();
    if (previous !== canManageTimeline || currentMode === "dm") renderTimeline();
  }

  async function loadTimelineEventsFromSupabase() {
    try {
      var results = await Promise.all([
        fetchSupabaseRows(TIMELINE_TABLE_URL + "?select=*&order=sort_key.asc&order=created_at.asc"),
        fetchSupabaseRows(CHARACTER_TABLE_URL + "?select=" + encodeURIComponent("id,slug,name,portrait_url,token_url,class_name,subclass_name,level") + "&order=name.asc"),
        fetchSupabaseRows(TIMELINE_EVENT_CHARACTERS_TABLE_URL + "?select=" + encodeURIComponent("event_id,character_id"))
      ]);

      timelineCharacters = results[1].map(normalizeTimelineCharacter).filter(Boolean);
      timelineCharacterMap = buildCharacterMap(timelineCharacters);
      timelineEventCharacterMap = buildTimelineEventCharacterMap(results[2]);
      timelineEvents = results[0].map(normalizeTimelineEvent).filter(Boolean);

      if (!selectedEventId && timelineEvents.length > 0) selectedEventId = timelineEvents[0].id;
      createTimelineCharacterFilter();
      renderTimelineCharacterPickerOptions();
      renderTimeline();
    } catch (error) {
      console.warn("[timeline] Supabase read failed, using mock data.", error);
      renderTimeline();
    }
  }

  async function fetchSupabaseRows(url) {
    var response = await fetch(url, {
      method: "GET",
      headers: getSupabaseHeaders()
    });

    if (!response.ok) {
      throw new Error("Lettura Supabase fallita (" + response.status + ").");
    }

    var rows = await response.json();
    if (!Array.isArray(rows)) {
      throw new Error("Risposta Supabase non valida.");
    }

    return rows;
  }

  function renderTimeline() {
    if (!els.list) return;
    var events = getFilteredEvents();
    els.list.classList.add("timeline-list--interactive");
    els.list.classList.remove("timeline-list--multilane");
    els.list.dataset.timelineAxis = getTimelineAxis();
    els.list.dataset.timelineView = "single";
    syncTimelineExpandedState();
    els.list.innerHTML = "";
    if (selectedEventId && !events.some(function (event) { return event.id === selectedEventId; })) {
      selectedEventId = events.length > 0 ? events[0].id : null;
      expandedEventId = null;
    }
    if (!selectedEventId && events.length > 0) selectedEventId = events[0].id;
    timelineScale = buildTimelineScale(events);
    renderTimelineAxis(events, timelineScale);
    renderTimelineSingle(events, timelineScale);
    syncDrawerActions(getSelectedEvent());
    syncTimelineContentBackground(getSelectedEvent());
    requestTimelineAxisSync();
    requestTimelineFocusUpdate();
  }

  function renderTimelineSingle(events, scale) {
    events.forEach(function (event, index) {
      if (index > 0) els.list.appendChild(createTimelineEventGap(events[index - 1], event, scale));
      els.list.appendChild(createTimelineEventButton(event, index, scale));
    });
  }

  function renderTimelineAxis(events, scale) {
    if (!els.list || !Array.isArray(events) || events.length === 0) return;

    var resolvedScale = scale || buildTimelineScale(events);
    var axis = document.createElement("div");
    axis.className = "timeline-axis-background";
    axis.dataset.timelineAxisBackground = "true";
    axis.setAttribute("aria-hidden", "true");
    axis.style.setProperty("--timeline-tick-count", String(resolvedScale.layoutTickCount));
    axis.style.setProperty("--timeline-scale-span", String(resolvedScale.span));

    var ticks = buildTimelineAxisTicks(events, resolvedScale).concat(buildTimelineYearMarkers(resolvedScale));
    ticks.sort(function (a, b) {
      if (a.position !== b.position) return a.position - b.position;
      return a.kind === "year" ? -1 : 1;
    });
    axis.innerHTML = ticks.map(renderTimelineAxisTick).join("");

    els.list.appendChild(axis);
  }

  function renderTimelineAxisTick(tick) {
    var kind = tick.kind || "event";
    var className = "timeline-axis-tick" + (kind === "year" ? " timeline-axis-year-marker" : "");
    var eventIdAttr = tick.eventId ? ' data-axis-event-id="' + escapeAttribute(tick.eventId) + '"' : "";
    var typeAttr = tick.type ? ' data-axis-event-type="' + escapeAttribute(tick.type) + '"' : "";
    var importance = kind === "event" ? clampInteger(tick.importance, 1, 5, 3) : 0;
    var importanceAttr = kind === "event" ? ' data-axis-event-importance="' + importance + '"' : "";
    if (kind === "event") className += " timeline-axis-tick--importance-" + importance;
    var markContent = kind === "event" && tick.icon ? '<i class="' + escapeAttribute(tick.icon) + '" aria-hidden="true"></i>' : escapeHtml(tick.label || "");
    return '<span class="' + className + '" data-axis-kind="' + escapeAttribute(kind) + '" data-axis-sort-key="' + escapeAttribute(tick.sortKey) + '"' + eventIdAttr + typeAttr + importanceAttr + ' style="left: ' + tick.position.toFixed(4) + '%; --timeline-tick-position: ' + tick.position.toFixed(4) + '%; --timeline-tick-index: ' + tick.index + '; --timeline-tick-count: ' + tick.count + ';">' +
      '<span class="timeline-axis-tick__mark">' + markContent + '</span>' +
      '<span class="timeline-axis-tick__label">' + escapeHtml(tick.label) + '</span>' +
      '</span>';
  }

  function buildTimelineScale(events) {
    var source = (Array.isArray(events) ? events : [])
      .filter(function (event) { return event && Number.isFinite(Number(event.sort_key)); })
      .sort(function (a, b) { return Number(a.sort_key || 0) - Number(b.sort_key || 0); });

    if (!source.length) {
      return { min: 0, max: 0, span: 1, medianGap: 1, layoutUnits: 1, layoutTickCount: 1, events: [] };
    }

    var min = Number(source[0].sort_key || 0);
    var max = Number(source[source.length - 1].sort_key || min);
    var minYear = Math.floor(min / 1000);
    var maxYear = Math.floor(max / 1000);
    var visualMin = Math.min(min, minYear * 1000 + 1);
    var visualMax = Math.max(max, maxYear * 1000 + 365);
    var gaps = [];
    var layoutUnits = 1;

    for (var i = 1; i < source.length; i += 1) {
      var gap = Math.max(1, Number(source[i].sort_key || 0) - Number(source[i - 1].sort_key || 0));
      gaps.push(gap);
    }

    var medianGap = getMedianNumber(gaps) || 1;
    gaps.forEach(function (gap) {
      layoutUnits += getTimelineGapUnits(gap, medianGap);
    });

    var positionsById = {};
    var positionsBySortKey = {};
    var cursor = 0;
    cursor = getTimelineGapUnits(Math.max(1, min - visualMin), medianGap);
    layoutUnits += cursor;

    var finalTailUnits = getTimelineGapUnits(Math.max(1, visualMax - max), medianGap);
    layoutUnits += finalTailUnits;

    source.forEach(function (event, index) {
      if (index > 0) {
        var previous = source[index - 1];
        var visualGap = Math.max(1, Number(event.sort_key || 0) - Number(previous.sort_key || 0));
        cursor += getTimelineGapUnits(visualGap, medianGap);
      }
      var visualPosition = layoutUnits <= 1 ? 50 : (cursor / Math.max(1, layoutUnits - 1)) * 100;
      visualPosition = Math.max(0, Math.min(100, visualPosition));
      if (event.id) positionsById[event.id] = visualPosition;
      positionsBySortKey[String(event.sort_key || "")] = visualPosition;
    });

    return {
      min: min,
      max: max,
      visualMin: visualMin,
      visualMax: visualMax,
      span: Math.max(1, visualMax - visualMin),
      medianGap: medianGap,
      layoutUnits: Math.max(1, layoutUnits),
      layoutTickCount: Math.max(1, Math.ceil(layoutUnits) + 1),
      positionsById: positionsById,
      positionsBySortKey: positionsBySortKey,
      events: source
    };
  }

  function getMedianNumber(values) {
    if (!Array.isArray(values) || !values.length) return 0;
    var sorted = values.slice().sort(function (a, b) { return a - b; });
    var middle = Math.floor(sorted.length / 2);
    if (sorted.length % 2) return sorted[middle];
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  function getTimelineGapUnits(rawGap, medianGap) {
    var ratio = Math.max(0.08, Number(rawGap || 1) / Math.max(1, Number(medianGap || 1)));
    return Math.max(0.35, Math.min(5.5, Math.sqrt(ratio)));
  }

  function createTimelineEventGap(previousEvent, nextEvent, scale) {
    var previousSort = Number(previousEvent && previousEvent.sort_key);
    var nextSort = Number(nextEvent && nextEvent.sort_key);
    var rawGap = Number.isFinite(previousSort) && Number.isFinite(nextSort) ? Math.max(1, nextSort - previousSort) : 1;
    var units = getTimelineGapUnits(rawGap, scale && scale.medianGap);
    var gap = document.createElement("span");
    gap.className = "timeline-event-gap";
    gap.setAttribute("aria-hidden", "true");
    gap.style.flex = "0 0 calc(var(--timeline-card-gap, 2.2rem) * " + units.toFixed(3) + ")";
    gap.style.setProperty("--timeline-gap-units", units.toFixed(3));
    gap.dataset.timelineGap = String(rawGap);
    return gap;
  }

  function getTimelineEventPosition(event, scale) {
    var resolvedScale = scale || timelineScale;
    if (!event || !resolvedScale) return 0;
    if (event.id && resolvedScale.positionsById && Number.isFinite(Number(resolvedScale.positionsById[event.id]))) {
      return Number(resolvedScale.positionsById[event.id]);
    }
    var key = String(event.sort_key || "");
    if (resolvedScale.positionsBySortKey && Number.isFinite(Number(resolvedScale.positionsBySortKey[key]))) {
      return Number(resolvedScale.positionsBySortKey[key]);
    }
    return getTimelineSortKeyVisualPosition(Number(event.sort_key || 0), resolvedScale);
  }

  function getTimelineSortKeyVisualPosition(sortKey, scale) {
    var resolvedScale = scale || timelineScale;
    if (!resolvedScale || !Array.isArray(resolvedScale.events) || !resolvedScale.events.length) return 0;
    var value = Number(sortKey);
    if (!Number.isFinite(value)) return 0;

    var events = resolvedScale.events;
    if (value <= Number(events[0].sort_key || 0)) {
      var firstEventPosition = getTimelineEventPosition(events[0], resolvedScale);
      var firstSort = Number(events[0].sort_key || 0);
      var headSpan = Math.max(1, firstSort - Number(resolvedScale.visualMin || resolvedScale.min || firstSort));
      var headRatio = Math.max(0, Math.min(1, (value - Number(resolvedScale.visualMin || resolvedScale.min || value)) / headSpan));
      return firstEventPosition * headRatio;
    }
    if (value >= Number(events[events.length - 1].sort_key || 0)) {
      var lastEventPosition = getTimelineEventPosition(events[events.length - 1], resolvedScale);
      var lastSort = Number(events[events.length - 1].sort_key || 0);
      var tailSpan = Math.max(1, Number(resolvedScale.visualMax || resolvedScale.max || lastSort) - lastSort);
      var tailRatio = Math.max(0, Math.min(1, (value - lastSort) / tailSpan));
      return lastEventPosition + ((100 - lastEventPosition) * tailRatio);
    }

    for (var i = 1; i < events.length; i += 1) {
      var previous = events[i - 1];
      var next = events[i];
      var previousSort = Number(previous.sort_key || 0);
      var nextSort = Number(next.sort_key || previousSort);
      if (value < previousSort || value > nextSort) continue;
      var previousPosition = getTimelineEventPosition(previous, resolvedScale);
      var nextPosition = getTimelineEventPosition(next, resolvedScale);
      var ratio = nextSort === previousSort ? 0 : (value - previousSort) / (nextSort - previousSort);
      return previousPosition + ((nextPosition - previousPosition) * Math.max(0, Math.min(1, ratio)));
    }

    return 0;
  }

  function buildTimelineAxisTicks(events, scale) {
    var source = (Array.isArray(events) ? events : [])
      .filter(function (event) { return event && Number.isFinite(Number(event.sort_key)); })
      .sort(function (a, b) { return Number(a.sort_key || 0) - Number(b.sort_key || 0); });

    if (!source.length) return [];

    var unique = [];
    var seen = {};
    source.forEach(function (event) {
      var key = String(event.sort_key || "");
      if (!key || seen[key]) return;
      seen[key] = true;
      unique.push(event);
    });

    var resolvedScale = scale || buildTimelineScale(unique);
    var count = unique.length;

    return unique.map(function (event, index) {
      var typeMeta = getTypeMeta(event.type);
      return {
        kind: "event",
        index: index,
        count: count,
        sortKey: String(event.sort_key || ""),
        eventId: event.id || "",
        type: event.type || "campaign",
        importance: getTimelineEventImportance(event),
        icon: typeMeta.icon,
        label: getTimelineAxisTickLabel(event),
        position: getTimelineEventPosition(event, resolvedScale)
      };
    });
  }

  function buildTimelineYearMarkers(scale) {
    if (!scale || !Number.isFinite(scale.min) || !Number.isFinite(scale.max)) return [];
    var minYear = Math.floor(scale.visualMin / 1000);
    var maxYear = Math.floor(scale.visualMax / 1000);
    var markers = [];

    for (var year = minYear; year <= maxYear; year += 1) {
      var sortKey = year * 1000 + 1;
      markers.push({
        kind: "year",
        index: markers.length,
        count: Math.max(1, maxYear - minYear + 1),
        sortKey: String(sortKey),
        label: formatTimelineYearLabel(year),
        position: getTimelineSortKeyVisualPosition(sortKey, scale)
      });
    }

    return markers;
  }

  function getTimelineAxisTickLabel(event) {
    var parsed = parseHarptosDate(event);
    if (parsed && parsed.start) {
      if (parsed.start.mode === "festival") return parsed.start.festival;
      return parsed.start.day + " " + parsed.start.month;
    }
    return stripYearFromTimelineDateLabel(readString(event && event.date_label, "Senza data"));
  }

  function stripYearFromTimelineDateLabel(label) {
    var value = readString(label, "");
    if (!value) return "Senza data";
    return value
      .replace(/, *-?[0-9]+ *DR *(?:—.*)?$/i, "")
      .replace(/ +-?[0-9]+ *DR *(?:—.*)?$/i, "")
      .trim() || value;
  }

  function requestTimelineAxisSync() {
    if (!els.list || getTimelineAxis() !== "horizontal") return;
    window.requestAnimationFrame(syncTimelineAxisMarkersToCards);
  }

  function syncTimelineAxisMarkersToCards() {
    if (!els.list || getTimelineAxis() !== "horizontal") return;
    var axis = els.list.querySelector("[data-timeline-axis-background]");
    if (!axis) return;

    var axisLeft = axis.offsetLeft;
    var eventPositions = [];

    Array.from(els.list.querySelectorAll(".timeline-event[data-event-id]")).forEach(function (card) {
      var eventId = card.dataset.eventId || "";
      var sortKey = Number(card.dataset.sortKey || 0);
      var center = card.offsetLeft + card.offsetWidth / 2;
      eventPositions.push({ eventId: eventId, sortKey: sortKey, center: center });
      var marker = axis.querySelector('[data-axis-kind="event"][data-axis-event-id="' + cssEscape(eventId) + '"]');
      if (!marker) return;
      var importance = clampInteger(card.dataset.eventImportance, 1, 5, 3);
      marker.dataset.axisEventImportance = String(importance);
      marker.classList.remove("timeline-axis-tick--importance-1", "timeline-axis-tick--importance-2", "timeline-axis-tick--importance-3", "timeline-axis-tick--importance-4", "timeline-axis-tick--importance-5");
      marker.classList.add("timeline-axis-tick--importance-" + importance);
      setTimelineAxisMarkerLeft(marker, center - axisLeft);
    });

    eventPositions.sort(function (a, b) { return a.sortKey - b.sortKey; });
    Array.from(axis.querySelectorAll('[data-axis-kind="year"]')).forEach(function (marker) {
      var sortKey = Number(marker.dataset.axisSortKey || 0);
      setTimelineAxisMarkerLeft(marker, getInterpolatedTimelineMarkerCenter(sortKey, eventPositions) - axisLeft);
    });
  }

  function getInterpolatedTimelineMarkerCenter(sortKey, positions) {
    if (!positions.length) return 0;
    if (sortKey <= positions[0].sortKey) {
      var first = positions[0];
      var visualMin = timelineScale && Number.isFinite(Number(timelineScale.visualMin)) ? Number(timelineScale.visualMin) : first.sortKey;
      var firstSpan = Math.max(1, first.sortKey - visualMin);
      var firstRatio = Math.max(0, Math.min(1, (sortKey - visualMin) / firstSpan));
      return first.center * firstRatio;
    }
    if (sortKey >= positions[positions.length - 1].sortKey) {
      var last = positions[positions.length - 1];
      var visualMax = timelineScale && Number.isFinite(Number(timelineScale.visualMax)) ? Number(timelineScale.visualMax) : last.sortKey;
      var listWidth = els.list ? els.list.scrollWidth : last.center;
      var lastSpan = Math.max(1, visualMax - last.sortKey);
      var lastRatio = Math.max(0, Math.min(1, (sortKey - last.sortKey) / lastSpan));
      return last.center + ((listWidth - last.center) * lastRatio);
    }

    for (var i = 1; i < positions.length; i += 1) {
      var previous = positions[i - 1];
      var next = positions[i];
      if (sortKey < previous.sortKey || sortKey > next.sortKey) continue;
      var span = Math.max(1, next.sortKey - previous.sortKey);
      var ratio = Math.max(0, Math.min(1, (sortKey - previous.sortKey) / span));
      return previous.center + ((next.center - previous.center) * ratio);
    }

    return positions[0].center;
  }

  function setTimelineAxisMarkerLeft(marker, left) {
    var value = Math.max(0, Number(left || 0));
    marker.style.left = value.toFixed(2) + "px";
    marker.style.setProperty("--timeline-tick-position", value.toFixed(2) + "px");
  }

  function createTimelineEventButton(event, index, scale) {
    var typeMeta = getTypeMeta(event.type);
    var stateMeta = getStateMeta(event.state);
    var isExpanded = event.id === expandedEventId;
    var button = document.createElement(isExpanded ? "article" : "button");
    if (!isExpanded) button.type = "button";
    button.className = "timeline-event";
    button.dataset.eventId = event.id;
    button.dataset.sortKey = String(event.sort_key || "");
    button.dataset.eventType = event.type || "campaign";
    button.dataset.eventState = event.state || "past";
    button.dataset.eventImportance = String(getTimelineEventImportance(event));
    button.dataset.timelinePosition = index % 2 === 0 ? "top" : "bottom";
    button.style.setProperty("--timeline-event-position", getTimelineEventPosition(event, scale).toFixed(4) + "%");
    button.setAttribute("aria-expanded", isExpanded ? "true" : "false");
    if (isExpanded) {
      button.setAttribute("tabindex", "0");
      button.setAttribute("role", "article");
    }
    button.classList.add("timeline-event--importance-" + getTimelineEventImportance(event));
    if (event.id === selectedEventId) button.classList.add("is-selected", "is-focus-candidate");
    if (isExpanded) button.classList.add("is-expanded");
    button.title = event.date_label || event.title || "Evento timeline";
    button.innerHTML =
      '<div class="timeline-event-body">' +
      (isExpanded ? renderTimelineEventCardActions(event) : "") +
      '<h2 class="timeline-event-title"><span>' + escapeHtml(event.title || "Evento senza titolo") + "</span></h2>" +
      (isExpanded ? renderTimelineEventDateLine(event) : '<p class="timeline-event-summary">' + escapeHtml(event.summary || "") + "</p>") +
      '<div class="timeline-event-meta">' +
      renderTimelineLocationChip(event.location) +
      renderIconBadge(stateMeta.icon, stateMeta.label, getStateTone(event.state)) +
      renderVisibilityBadge(event.visibility) +
      renderTimelineEventCharacters(event) +
      "</div>" +
      renderInlineEventDetails(event) +
      "</div>";
    button.addEventListener("click", function (clickEvent) {
      var actionButton = clickEvent.target.closest("[data-timeline-card-action]");
      if (actionButton) {
        clickEvent.preventDefault();
        clickEvent.stopPropagation();
        selectedEventId = event.id;
        if (actionButton.dataset.timelineCardAction === "edit") openEventModal(event);
        else if (actionButton.dataset.timelineCardAction === "delete") deleteTimelineEvent(event);
        return;
      }

      clickEvent.stopPropagation();
      selectedEventId = event.id;
      if (expandedEventId === event.id) return;
      expandedEventId = event.id;
      renderTimeline();
      scrollTimelineEventIntoFocus(event.id);
    });
    return button;
  }

  function renderTimelineEventDateLine(event) {
    var label = readString(event && event.date_label, "");
    if (!label) return "";
    return '<p class="timeline-event-date-line"><i class="fa-solid fa-calendar-days" aria-hidden="true"></i><span>' + escapeHtml(label) + "</span></p>";
  }

  function renderTimelineEventCharacters(event) {
    var characters = getTimelineEventCharacters(event);
    if (!characters.length) return "";

    return '<ul class="timeline-event-characters" aria-label="Personaggi collegati">' + characters.map(function (character) {
      var name = readString(character && character.name, "Personaggio");
      var slug = readString(character && character.slug, "");
      var image = getCharacterImageUrl(character);
      var content = '<img src="' + escapeAttribute(image) + '" alt="' + escapeAttribute(name) + '" loading="lazy" />';
      if (slug) {
        return '<li><a class="timeline-event-character" href="characters.html?character=' + encodeURIComponent(slug) + '" title="' + escapeAttribute(name) + '" aria-label="Apri scheda di ' + escapeAttribute(name) + '">' + content + '</a></li>';
      }
      return '<li><span class="timeline-event-character" title="' + escapeAttribute(name) + '">' + content + '</span></li>';
    }).join("") + '</ul>';
  }

  function getTimelineEventCharacters(event) {
    var ids = normalizeCharacterIds(event && event.character_ids);
    var characters = [];

    for (var i = 0; i < ids.length; i += 1) {
      var character = timelineCharacterMap.get(ids[i]);
      if (character) characters.push(character);
    }

    return characters;
  }

  function getTimelineEventImportance(event) {
    return clampInteger(event && event.importance, 1, 5, 3);
  }

  function renderTimelineEventCardActions(event) {
    if (!canManageTimeline || !event) return "";
    return '<div class="timeline-event-card-actions" aria-label="Azioni evento">' +
      '<span class="timeline-event-card-action" role="button" tabindex="0" data-timeline-card-action="edit" aria-label="Modifica evento" title="Modifica evento"><i class="fa-solid fa-pen" aria-hidden="true"></i></span>' +
      '<span class="timeline-event-card-action" role="button" tabindex="0" data-timeline-card-action="delete" aria-label="Cancella evento" title="Cancella evento"><i class="fa-solid fa-trash" aria-hidden="true"></i></span>' +
      '</div>';
  }

  function renderInlineEventSection(title, text) {
    if (!text) return "";
    return '<section class="timeline-event-details__section"><h3 class="timeline-event-details__title">' + escapeHtml(title) + '</h3><div class="timeline-event-details__text timeline-markdown-content">' + renderLimitedMarkdown(text) + "</div></section>";
  }

  function renderInlineEventDetails(event) {
    if (!event || event.id !== expandedEventId) return "";
    return '<div class="timeline-event-details">' + renderInlineEventSection("Descrizione", event.description) + renderLocationSection(event.location) + renderTagsSection(event.tags) + renderLinksSection(event.links) + renderMetaSection(event) + renderDmNotesSection(event) + "</div>";
  }

  function renderLocationSection(location) {
    var value = readString(location, "");
    if (!value) return "";
    return '<section class="timeline-event-details__section"><h3 class="timeline-event-details__title">Luogo</h3><div class="timeline-event-meta">' + renderTimelineLocationChip(value) + "</div></section>";
  }

  function renderTimelineLocationChip(location) {
    var value = readString(location, "");
    if (!value) return "";
    var parsed = parseBracketCurlyLink(value);
    if (parsed && parsed.url) {
      return '<a class="timeline-chip timeline-location-chip" href="' + escapeAttribute(parsed.url) + '" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-location-dot" aria-hidden="true"></i><span>' + escapeHtml(parsed.label) + "</span></a>";
    }
    return '<span class="timeline-chip timeline-location-chip"><i class="fa-solid fa-location-dot" aria-hidden="true"></i><span>' + escapeHtml(value) + "</span></span>";
  }

  function parseBracketCurlyLink(value) {
    var text = readString(value, "");
    if (text.charAt(0) !== "[") return null;
    var labelEnd = text.indexOf("]{");
    if (labelEnd <= 1 || text.charAt(text.length - 1) !== "}") return null;
    var label = readString(text.slice(1, labelEnd), "");
    var url = readString(text.slice(labelEnd + 2, -1), "");
    if (!label || !isSafeLinkUrl(url)) return null;
    return { label: label, url: url };
  }

  function isSafeLinkUrl(url) {
    var value = readString(url, "");
    return value.indexOf("http://") === 0 || value.indexOf("https://") === 0 || value.indexOf("/") === 0 || value.indexOf("#") === 0 || value.indexOf("./") === 0 || value.indexOf("../") === 0;
  }

  function renderTagsSection(tags) {
    if (!Array.isArray(tags) || tags.length === 0) return "";
    return '<section class="timeline-event-details__section"><h3 class="timeline-event-details__title">Tag</h3><div class="timeline-event-meta">' + tags.map(function (tag) {
      var label = readString(tag, "");
      if (!label) return "";
      return '<span class="timeline-chip timeline-tag-chip" title="Tag: ' + escapeAttribute(label) + '" data-tooltip="Tag: ' + escapeAttribute(label) + '">' + escapeHtml(label) + "</span>";
    }).join("") + "</div></section>";
  }

  function renderLinksSection(links) {
    if (!Array.isArray(links) || links.length === 0) return "";
    return '<section class="timeline-event-details__section"><h3 class="timeline-event-details__title">Collegamenti</h3><div class="timeline-event-meta">' + links.map(renderLinkChip).join("") + "</div></section>";
  }

  function renderLinkChip(link) {
    if (typeof link === "string") return '<span class="timeline-chip">' + escapeHtml(link) + "</span>";
    if (!link || typeof link !== "object") return "";
    var label = link.label || link.title || link.url || "Link";
    var url = link.url || "";
    if (!url) return '<span class="timeline-chip">' + escapeHtml(label) + "</span>";
    return '<a class="timeline-chip" href="' + escapeAttribute(url) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(label) + "</a>";
  }

  function renderMetaSection(event) {
    var typeMeta = getTypeMeta(event.type);
    var stateMeta = getStateMeta(event.state);
    return '<section class="timeline-event-details__section"><h3 class="timeline-event-details__title">Dettagli</h3><div class="timeline-event-meta">' + renderIconBadge(typeMeta.icon, "Tipo: " + typeMeta.label, "accent") + renderIconBadge("fa-solid fa-eye", "Visibilità: " + visibilityLabel(event.visibility), event.visibility === "dm" ? "danger" : "success") + renderIconBadge(stateMeta.icon, "Stato: " + stateMeta.label, getStateTone(event.state)) + renderBadge("Importanza: " + event.importance, "accent") + "</div></section>";
  }

  function renderDmNotesSection(event) {
    if (currentMode !== "dm" || !canManageTimeline || !event.dm_notes) return "";
    return '<section class="timeline-event-details__section"><h3 class="timeline-event-details__title">Note DM</h3><p class="timeline-event-details__text">' + nl2br(escapeHtml(event.dm_notes)) + "</p></section>";
  }

  function syncManagerUi() {
    currentMode = canManageTimeline ? "dm" : "players";
    removeGlobalTimelineEditDeleteActions(qs(".timeline-main-actions, .timeline-shell-actions, [data-timeline-shell-actions]"));
    if (els.newButton) els.newButton.hidden = !canManageTimeline;
    if (els.dmModeButton) {
      els.dmModeButton.disabled = !canManageTimeline;
      els.dmModeButton.title = canManageTimeline ? "" : "Modalità disponibile solo ai profili autorizzati.";
    }
    if (els.modeToggle) els.modeToggle.hidden = true;
    if (els.playerModeButton) els.playerModeButton.hidden = true;
    if (els.dmModeButton) els.dmModeButton.hidden = true;
    syncModeUi();
    syncDrawerActions(getSelectedEvent());
  }

  function syncModeUi() {
    if (els.playerModeButton) {
      els.playerModeButton.classList.toggle("is-active", currentMode === "players");
      els.playerModeButton.setAttribute("aria-pressed", currentMode === "players" ? "true" : "false");
    }
    if (els.dmModeButton) {
      els.dmModeButton.classList.toggle("is-active", currentMode === "dm");
      els.dmModeButton.setAttribute("aria-pressed", currentMode === "dm" ? "true" : "false");
    }
  }

  function bindTimelineDragEvents() {
    if (!els.list) return;
    els.list.addEventListener("pointerdown", handleTimelinePointerDown);
    els.list.addEventListener("pointermove", handleTimelinePointerMove);
    els.list.addEventListener("pointerup", handleTimelinePointerUp);
    els.list.addEventListener("pointercancel", handleTimelinePointerCancel);
    els.list.addEventListener("lostpointercapture", handleTimelinePointerCancel);
  }

  function handleTimelinePointerDown(event) {
    if (!els.list || getTimelineAxis() !== "horizontal") return;
    if (event.button !== 0) return;
    if (shouldIgnoreTimelineDrag(event.target)) return;

    stopTimelineInertia();
    timelineDragState = {
      pointerId: event.pointerId,
      target: getTimelineScrollTarget(event.target) || els.list,
      startX: event.clientX,
      lastX: event.clientX,
      lastTime: performance.now(),
      velocity: 0,
      moved: false
    };

    els.list.classList.add("is-dragging-timeline");
    timelineDragState.target.classList.add("is-dragging-timeline-target");
    try { els.list.setPointerCapture(event.pointerId); } catch (error) { return; }
  }

  function handleTimelinePointerMove(event) {
    if (!timelineDragState || timelineDragState.pointerId !== event.pointerId) return;
    var target = timelineDragState.target;
    if (!target) return;

    var now = performance.now();
    var dx = event.clientX - timelineDragState.lastX;
    var elapsed = Math.max(8, now - timelineDragState.lastTime);

    if (Math.abs(event.clientX - timelineDragState.startX) > 4) timelineDragState.moved = true;
    target.scrollLeft = clampScrollLeft(target, target.scrollLeft - dx);
    timelineDragState.velocity = (-dx / elapsed) * 16.67;
    timelineDragState.lastX = event.clientX;
    timelineDragState.lastTime = now;

    if (timelineDragState.moved) {
      event.preventDefault();
      event.stopPropagation();
    }
    requestTimelineAxisSync();
    requestTimelineFocusUpdate();
  }

  function handleTimelinePointerUp(event) {
    if (!timelineDragState || timelineDragState.pointerId !== event.pointerId) return;
    var state = timelineDragState;
    clearTimelineDragState();
    if (state.moved && Math.abs(state.velocity) > 0.35) startTimelineInertia(state.target, state.velocity);
  }

  function handleTimelinePointerCancel(event) {
    if (!timelineDragState) return;
    if (event && event.pointerId && timelineDragState.pointerId !== event.pointerId) return;
    clearTimelineDragState();
  }

  function clearTimelineDragState() {
    if (!timelineDragState) return;
    if (els.list) els.list.classList.remove("is-dragging-timeline");
    if (timelineDragState.target) timelineDragState.target.classList.remove("is-dragging-timeline-target");
    timelineDragState = null;
  }

  function shouldIgnoreTimelineDrag(target) {
    if (!target || typeof target.closest !== "function") return false;
    if (target.closest(".timeline-event.is-expanded")) return true;
    if (target.closest("button, a, input, select, textarea, label, .timeline-toolbar, [data-timeline-toolbar], .timeline-main-actions, .timeline-modal, [data-timeline-modal], .timeline-date-picker, [data-harptos-picker], .timeline-fa-select, [data-tags-pill-input]")) return true;
    return false;
  }

  function startTimelineInertia(target, velocity) {
    stopTimelineInertia();
    if (!target) return;

    var currentVelocity = Math.max(-42, Math.min(42, velocity));
    var lastTime = performance.now();

    function step(now) {
      var elapsed = Math.min(32, Math.max(8, now - lastTime));
      lastTime = now;

      var previousLeft = target.scrollLeft;
      target.scrollLeft = clampScrollLeft(target, target.scrollLeft + currentVelocity * (elapsed / 16.67));
      currentVelocity *= Math.pow(0.92, elapsed / 16.67);

      requestTimelineAxisSync();
      requestTimelineFocusUpdate();

      var blocked = target.scrollLeft === previousLeft && Math.abs(currentVelocity) > 0.2;
      if (Math.abs(currentVelocity) < 0.18 || blocked) {
        stopTimelineInertia();
        return;
      }
      timelineInertiaFrame = window.requestAnimationFrame(step);
    }

    timelineInertiaFrame = window.requestAnimationFrame(step);
  }

  function stopTimelineInertia() {
    if (!timelineInertiaFrame) return;
    window.cancelAnimationFrame(timelineInertiaFrame);
    timelineInertiaFrame = 0;
  }

  function bindTimelineFocusEvents() {
    if (els.list) {
      els.list.addEventListener("scroll", requestTimelineFocusUpdate, { passive: true });
      els.list.addEventListener("wheel", handleTimelineWheel, { passive: false });
    }
    if (els.content && els.content !== els.list) {
      els.content.addEventListener("wheel", handleTimelineWheel, { passive: false });
    }
    window.addEventListener("resize", function () {
      if (els.list) els.list.dataset.timelineAxis = getTimelineAxis();
      requestTimelineAxisSync();
      requestTimelineFocusUpdate();
    });
  }

  function handleTimelineWheel(event) {
    if (!els.list || getTimelineAxis() !== "horizontal") return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    var detailsScrollTarget = getExpandedCardScrollTarget(event.target);
    if (detailsScrollTarget) {
      var detailsDelta = getNormalizedWheelDelta(event);
      if (!detailsDelta) return;
      var beforeTop = detailsScrollTarget.scrollTop;
      detailsScrollTarget.scrollTop = Math.max(0, Math.min(detailsScrollTarget.scrollHeight - detailsScrollTarget.clientHeight, detailsScrollTarget.scrollTop + detailsDelta));
      if (detailsScrollTarget.scrollTop !== beforeTop) {
        event.preventDefault();
        event.stopPropagation();
      }
      return;
    }

    var scrollTarget = getTimelineScrollTarget(event.target);
    if (!scrollTarget) return;

    var delta = getNormalizedWheelDelta(event);
    if (!delta) return;

    stopTimelineInertia();
    event.preventDefault();
    event.stopPropagation();
    scrollTarget.scrollLeft = clampScrollLeft(scrollTarget, scrollTarget.scrollLeft + delta);
    requestTimelineFocusUpdate();
  }

  function getExpandedCardScrollTarget(target) {
    if (!target || typeof target.closest !== "function") return null;
    var details = target.closest(".timeline-event.is-expanded .timeline-event-details");
    if (!details) return null;
    if (details.scrollHeight <= details.clientHeight) return null;
    return details;
  }

  function getNormalizedWheelDelta(event) {
    var rawDelta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    if (!rawDelta) return 0;

    var multiplier = 1;
    if (event.deltaMode === 1) multiplier = 18;
    else if (event.deltaMode === 2) multiplier = 240;

    var delta = rawDelta * multiplier;
    var maxStep = 90;
    if (Math.abs(delta) > maxStep) delta = Math.sign(delta) * maxStep;
    return delta;
  }

  function clampScrollLeft(scrollTarget, value) {
    var max = Math.max(0, scrollTarget.scrollWidth - scrollTarget.clientWidth);
    return Math.max(0, Math.min(max, value));
  }

  function getTimelineScrollTarget(target) {
    if (target && typeof target.closest === "function") {
      var list = target.closest("#timelineList, [data-timeline-list], .timeline-list");
      if (list) return list;
      var content = target.closest(".timeline-content, [data-timeline-content]");
      if (content && els.list) return els.list;
    }
    return els.list;
  }

  function requestTimelineFocusUpdate() {
    if (timelineFocusRaf) return;
    timelineFocusRaf = window.requestAnimationFrame(function () {
      timelineFocusRaf = 0;
      updateTimelineFocusState();
    });
  }

  function updateTimelineFocusState() {
    if (!els.list) return;
    var cards = Array.from(els.list.querySelectorAll(".timeline-event"));
    if (!cards.length) return;

    var axis = getTimelineAxis();
    els.list.dataset.timelineAxis = axis;

    var viewport = getTimelineFocusViewport().getBoundingClientRect();
    var viewportCenter = axis === "vertical"
      ? viewport.top + viewport.height / 2
      : viewport.left + viewport.width / 2;
    var maxDistance = Math.max(1, axis === "vertical" ? viewport.height / 2 : viewport.width / 2);
    var focusedCard = null;
    var focusedDistance = Infinity;

    cards.forEach(function (card) {
      var rect = card.getBoundingClientRect();
      var cardCenter = axis === "vertical" ? rect.top + rect.height / 2 : rect.left + rect.width / 2;
      var normalizedDistance = Math.min(1, Math.abs(cardCenter - viewportCenter) / maxDistance);
      var focusStrength = 1 - normalizedDistance;
      card.style.setProperty("--timeline-focus", focusStrength.toFixed(3));
      card.style.setProperty("--timeline-compression", normalizedDistance.toFixed(3));
      card.classList.toggle("is-near-focus", focusStrength >= 0.62);
      card.classList.toggle("is-far-from-focus", focusStrength < 0.28);
      if (normalizedDistance < focusedDistance) {
        focusedDistance = normalizedDistance;
        focusedCard = card;
      }
    });

    cards.forEach(function (card) {
      var isFocused = card === focusedCard;
      card.classList.toggle("is-timeline-focus", isFocused);
      card.classList.toggle("is-selected", card.dataset.eventId === selectedEventId);
    });

    syncTimelineContentCurrentYear(focusedCard);
    syncTimelineContentBackground(focusedCard);

    if (focusedCard && focusedCard.dataset.eventId && selectedEventId !== focusedCard.dataset.eventId && !expandedEventId) {
      selectedEventId = focusedCard.dataset.eventId;
      syncDrawerActions(getSelectedEvent());
    }
  }

  function syncTimelineContentCurrentYear(focusedCard) {
    if (!els.content) return;
    var event = focusedCard && focusedCard.dataset.eventId
      ? timelineEvents.find(function (item) { return item.id === focusedCard.dataset.eventId; })
      : getSelectedEvent();
    var year = getTimelineEventYear(event);
    if (!year) {
      els.content.removeAttribute("data-current-timeline-year");
      return;
    }
    els.content.dataset.currentTimelineYear = formatTimelineYearLabel(year);
  }

  function syncTimelineContentBackground(source) {
    if (!els.content) return;
    var event = null;
    if (source && source.dataset && source.dataset.eventId) {
      event = timelineEvents.find(function (item) { return item.id === source.dataset.eventId; }) || null;
    } else if (source && typeof source === "object" && source.id) {
      event = source;
    } else {
      event = getSelectedEvent();
    }
    var url = getTimelineEventBackgroundUrl(event);
    if (!url) return;
    if (url === currentTimelineBackgroundUrl) return;
    setTimelineBackgroundImage(url);
  }

  function getTimelineEventBackgroundUrl(event) {
    if (!event) return "";
    return readString(
      event.background_image_url ||
      event.backgroundImageUrl ||
      event.background_url ||
      event.backgroundUrl ||
      event.image_url ||
      event.imageUrl,
      ""
    );
  }

  function setTimelineBackgroundImage(url) {
    if (!els.content || !url) return;
    if (url === currentTimelineBackgroundUrl) return;

    var requestId = timelineBackgroundRequestId + 1;
    timelineBackgroundRequestId = requestId;

    preloadTimelineBackgroundImage(url).then(function () {
      if (requestId !== timelineBackgroundRequestId) return;
      applyTimelineBackgroundImage(url);
    }).catch(function () {
      if (requestId !== timelineBackgroundRequestId) return;
      applyTimelineBackgroundImage(url);
    });
  }

  function preloadTimelineBackgroundImage(url) {
    if (!url) return Promise.resolve();
    if (timelineBackgroundImageCache[url] === "loaded") return Promise.resolve();
    if (timelineBackgroundImageCache[url] && typeof timelineBackgroundImageCache[url].then === "function") {
      return timelineBackgroundImageCache[url];
    }

    var promise = new Promise(function (resolve, reject) {
      var image = new Image();
      image.onload = function () {
        timelineBackgroundImageCache[url] = "loaded";
        resolve();
      };
      image.onerror = function () {
        delete timelineBackgroundImageCache[url];
        reject(new Error("Timeline background image failed to load."));
      };
      image.src = url;
      if (image.decode) {
        image.decode().then(function () {
          timelineBackgroundImageCache[url] = "loaded";
          resolve();
        }).catch(function () {
          return;
        });
      }
    });

    timelineBackgroundImageCache[url] = promise;
    return promise;
  }

  function applyTimelineBackgroundImage(url) {
    if (!els.content || !url) return;
    createTimelineBackgroundLayers();
    var nextLayerName = timelineBackgroundActiveLayer === "a" ? "b" : "a";
    var currentLayer = els.content.querySelector('[data-timeline-background-layer="' + timelineBackgroundActiveLayer + '"]');
    var nextLayer = els.content.querySelector('[data-timeline-background-layer="' + nextLayerName + '"]');
    if (!nextLayer) return;

    var safeUrl = escapeCssUrl(url);
    nextLayer.style.backgroundImage = 'url("' + safeUrl + '")';
    nextLayer.dataset.timelineBackgroundImageUrl = url;
    nextLayer.classList.add("is-active");
    if (currentLayer) {
      currentLayer.classList.remove("is-active");
      currentLayer.removeAttribute("data-timeline-background-image-url");
    }
    timelineBackgroundActiveLayer = nextLayerName;
    currentTimelineBackgroundUrl = url;
    els.content.dataset.timelineBackground = "active";
    els.content.dataset.timelineBackgroundImageUrl = url;
    els.content.style.setProperty("--timeline-current-background-image", 'url("' + safeUrl + '")');
  }

  function getTimelineEventYear(event) {
    if (!event) return "";
    var parsed = parseHarptosDate(event);
    if (parsed && parsed.start && parsed.start.year) return parsed.start.year;
    var sortKey = Number(event.sort_key || 0);
    if (Number.isFinite(sortKey) && sortKey) return Math.floor(sortKey / 1000);
    return "";
  }

  function formatTimelineYearLabel(year) {
    var value = Number(year);
    if (!Number.isFinite(value)) return "";
    return String(Math.trunc(value)) + " DR";
  }

  function resetTimelineTextUndoFields() {
    [els.fields.summary, els.fields.description, els.fields.dm_notes].forEach(function (field) {
      if (!field) return;
      timelineTextUndoState.delete(field);
      initializeTextUndoState(field);
    });
  }

  function scrollTimelineEventIntoFocus(eventId) {
    if (!els.list || !eventId) return;
    var card = els.list.querySelector('[data-event-id="' + cssEscape(eventId) + '"]');
    if (!card) return;
    var axis = getTimelineAxis();
    var scrollTarget = els.list;
    if (axis === "horizontal" && scrollTarget) {
      stopTimelineInertia();
      scrollTarget.scrollTo({
        left: getCardScrollLeft(card, scrollTarget),
        behavior: "smooth"
      });
      requestTimelineAxisSync();
      requestTimelineFocusUpdate();
      return;
    }
    try {
      card.scrollIntoView({
        behavior: "smooth",
        block: axis === "vertical" ? "center" : "nearest",
        inline: axis === "vertical" ? "nearest" : "center"
      });
    } catch (error) {
      card.scrollIntoView();
    }
  }

  function getCardScrollLeft(card, scrollTarget) {
    var cardRect = card.getBoundingClientRect();
    var targetRect = scrollTarget.getBoundingClientRect();
    var cardCenterInsideTarget = cardRect.left - targetRect.left + scrollTarget.scrollLeft + cardRect.width / 2;
    return cardCenterInsideTarget - scrollTarget.clientWidth / 2;
  }

  function getTimelineFocusViewport() {
    return els.list;
  }

  function getTimelineAxis() {
    return window.matchMedia && window.matchMedia("(max-width: 780px)").matches ? "vertical" : "horizontal";
  }

  function cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === "function") return window.CSS.escape(String(value));
    return String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
  }

  function syncDrawerActions(event) {
    if (els.editButton) els.editButton.hidden = true;
    if (els.deleteButton) els.deleteButton.hidden = true;
  }

  function setTimelineMode(mode) {
    if (mode === "dm" && !canManageTimeline) {
      showStatus("Modalità DM disponibile solo ai profili autorizzati.", "error");
      return;
    }
    currentMode = mode === "dm" ? "dm" : "players";
    expandedEventId = null;
    syncModeUi();
    renderTimeline();
  }

  function getFilteredEvents() {
    var query = normalizeSearchText(getFieldValue(els.search));
    var type = "all";
    var visibility = "all";
    var state = "all";
    return timelineEvents.filter(function (event) {
      if (!canSeeEvent(event)) return false;
      if (activeTypeFilters.indexOf(event.type) < 0) return false;
      if (activeCharacterFilters.length && !eventMatchesCharacterFilters(event)) return false;
      if (query) {
        var characterNames = getTimelineEventCharacters(event).map(function (character) { return character.name || ""; }).join(" ");
        var haystack = normalizeSearchText([event.title, event.summary, event.description, event.location, event.date_label, event.type, event.visibility, event.state, Array.isArray(event.tags) ? event.tags.join(" ") : "", characterNames].join(" ")); 
        if (haystack.indexOf(query) < 0) return false;
      }
      return true;
    }).sort(function (a, b) {
      return Number(a.sort_key || 0) - Number(b.sort_key || 0);
    });
  }

  function eventMatchesCharacterFilters(event) {
    var ids = normalizeCharacterIds(event && event.character_ids);
    if (!ids.length) return false;

    return activeCharacterFilters.every(function (characterId) {
      return ids.indexOf(characterId) >= 0;
    });
  }

  function canSeeEvent(event) {
    if (!event) return false;
    if (currentMode === "dm" && canManageTimeline) return true;
    return event.visibility !== "dm";
  }

  function openEventModal(event) {
    if (!canManageTimeline) {
      showStatus("Permessi insufficienti.", "error");
      return;
    }
    var isEdit = Boolean(event);
    if (els.modalTitle) els.modalTitle.textContent = isEdit ? "Modifica evento" : "Nuovo evento";
    setFieldValue(els.fields.id, isEdit ? event.id : "");
    setFieldValue(els.fields.title, isEdit ? event.title : "");
    setFieldValue(els.fields.short_title, "");
    setFieldValue(els.fields.summary, limitSummaryText(isEdit ? event.summary : ""));
    updateTimelineSummaryCounter();
    setFieldValue(els.fields.description, isEdit ? event.description : "");
    setFieldValue(els.fields.dm_notes, isEdit ? event.dm_notes : "");
    setFieldValue(els.fields.location, isEdit ? event.location : "");
    setFieldValue(els.fields.date_label, isEdit ? event.date_label : "");
    setFieldValue(els.fields.sort_key, isEdit ? event.sort_key : "");
    setHarptosPickerFromEvent(isEdit ? event : null);
    setFieldValue(els.fields.type, isEdit ? event.type : "campaign");
    setFieldValue(els.fields.visibility, isEdit ? event.visibility : "players");
    syncVisibilitySwitch();
    setFieldValue(els.fields.knowledge, "known");
    setFieldValue(els.fields.truth, "confirmed");
    setFieldValue(els.fields.state, isEdit ? event.state : "past");
    setFieldValue(els.fields.importance, isEdit ? event.importance : 3);
    setFieldValue(els.fields.tags, isEdit ? arrayToInput(event.tags) : "");
    syncTagsPillInputFromHidden();
    setFieldValue(els.fields.links, isEdit ? linksToInput(event.links) : "");
    setFieldValue(els.fields.background_image_url, isEdit ? getTimelineEventBackgroundUrl(event) : "");
    setTimelineCharacterPickerFromEvent(isEdit ? event : null);
    resetTimelineTextUndoFields();
    if (els.modal) els.modal.hidden = false;
    setTimeout(function () {
      if (els.fields.title) els.fields.title.focus();
    }, 0);
  }

  function closeEventModal() {
    if (isSaving) return;
    closeHarptosPanel();
    if (els.modal) els.modal.hidden = true;
  }

  async function saveTimelineEvent() {
    if (!canManageTimeline || isSaving) return;
    var playerCode = getPlayerCode();
    if (!playerCode) {
      showStatus("Codice giocatore mancante. Effettua l'accesso prima di salvare.", "error");
      return;
    }
    var payload = readEventPayloadFromForm();
    if (!payload.title || !payload.date_label || payload.sort_key === null) {
      showStatus("Titolo, data e sort key sono obbligatori.", "error");
      return;
    }
    setSavingState(true);
    try {
      var response = await fetch(UPSERT_TIMELINE_EVENT_URL, {
        method: "POST",
        headers: getFunctionHeaders(),
        body: JSON.stringify({ player_code: playerCode, event: payload })
      });
      var result = await safeReadJson(response);
      if (!response.ok || !result || result.success === false) throw new Error((result && result.error) || "Salvataggio non riuscito.");
      var savedEvent = normalizeTimelineEvent(Object.assign({}, payload, result.event || {}));
      upsertLocalEvent(savedEvent);
      selectedEventId = savedEvent.id;
      expandedEventId = savedEvent.id;
      closeEventModal();
      renderTimeline();
      scrollTimelineEventIntoFocus(savedEvent.id);
      showStatus("Evento salvato.", "success");
    } catch (error) {
      showStatus(error instanceof Error ? error.message : "Errore durante il salvataggio.", "error");
    } finally {
      setSavingState(false);
    }
  }

  async function deleteSelectedEvent() {
    return deleteTimelineEvent(getSelectedEvent());
  }

  async function deleteTimelineEvent(event) {
    if (!canManageTimeline || isSaving) return;
    if (!event) {
      showStatus("Nessun evento selezionato.", "error");
      return;
    }
    if (!window.confirm("Eliminare definitivamente questo evento dalla timeline?" + String.fromCharCode(10) + String.fromCharCode(10) + event.title)) return;
    var playerCode = getPlayerCode();
    if (!playerCode) {
      showStatus("Codice giocatore mancante. Effettua l'accesso prima di eliminare.", "error");
      return;
    }
    setSavingState(true);
    try {
      var response = await fetch(DELETE_TIMELINE_EVENT_URL, {
        method: "POST",
        headers: getFunctionHeaders(),
        body: JSON.stringify({ player_code: playerCode, event_id: event.id })
      });
      var result = await safeReadJson(response);
      if (!response.ok || !result || result.success === false) throw new Error((result && result.error) || "Eliminazione non riuscita.");
      timelineEvents = timelineEvents.filter(function (item) { return item.id !== event.id; });
      selectedEventId = timelineEvents.length > 0 ? timelineEvents[0].id : null;
      expandedEventId = null;
      renderTimeline();
      showStatus("Evento eliminato.", "success");
    } catch (error) {
      showStatus(error instanceof Error ? error.message : "Errore durante l'eliminazione.", "error");
    } finally {
      setSavingState(false);
    }
  }


  function readEventPayloadFromForm() {
    var id = getFieldValue(els.fields.id);
    var payload = {
      title: getFieldValue(els.fields.title),
      short_title: "",
      summary: limitSummaryText(getFieldValue(els.fields.summary)),
      description: getFieldValue(els.fields.description),
      dm_notes: getFieldValue(els.fields.dm_notes),
      location: getFieldValue(els.fields.location),
      date_label: getHarptosDateLabel() || getFieldValue(els.fields.date_label),
      sort_key: getHarptosSortKey(),
      type: getFieldValue(els.fields.type) || "campaign",
      visibility: getFieldValue(els.fields.visibility) || "players",
      knowledge: "known",
      truth: "confirmed",
      state: getFieldValue(els.fields.state) || "past",
      importance: clampInteger(getFieldValue(els.fields.importance), 1, 5, 3),
      tags: inputToArray(getFieldValue(els.fields.tags)),
      links: inputToLinks(getFieldValue(els.fields.links)),
      background_image_url: getFieldValue(els.fields.background_image_url),
      character_ids: Array.from(selectedModalCharacterIds)
    };
    if (id && isUuid(id)) payload.id = id;
    return payload;
  }

  function setHarptosPickerFromEvent(event) {
    if (!els.harptos || !els.harptos.root) return;
    var parsed = event ? parseHarptosDate(event) : null;
    setFieldValue(els.harptos.kind, parsed ? parsed.kind : "single");
    applyHarptosDateToCalendar("start", parsed ? parsed.start : null);
    applyHarptosDateToCalendar("end", parsed ? parsed.end : null);
    if (parsed && parsed.kind === "unknown") setFieldValue(els.fields.sort_key, event.sort_key || "");
    updateHarptosDateFields();
    closeHarptosPanel();
  }

  function applyHarptosDateToCalendar(prefix, value) {
    var date = value || { mode: "day", year: CURRENT_CAMPAIGN_YEAR_DR, month: "Hammer", day: 1, festival: "Midwinter" };
    setFieldValue(els.harptos[prefix + "Year"], date.year || CURRENT_CAMPAIGN_YEAR_DR);
    setFieldValue(els.harptos[prefix + "Mode"], date.mode || "day");
    setFieldValue(els.harptos[prefix + "Month"], date.month || "Hammer");
    els.harptos[prefix + "Day"] = clampInteger(date.day, 1, 30, 1);
    els.harptos[prefix + "Festival"] = date.festival || "Midwinter";
    renderHarptosCalendar(prefix);
    renderHarptosFestivals(prefix);
  }

  function parseHarptosDate(event) {
    var label = readString(event && event.date_label, "");
    var sortKey = Number(event && event.sort_key);
    var fallbackYear = Number.isFinite(sortKey) ? Math.trunc(sortKey / 1000) : CURRENT_CAMPAIGN_YEAR_DR;
    var lowerLabel = label.toLowerCase();
    if (lowerLabel.indexOf("data sconosciuta") >= 0 || lowerLabel.indexOf("unknown") >= 0) return { kind: "unknown", start: null, end: null };
    var kind = "single";
    if (lowerLabel.indexOf("in corso") >= 0 || lowerLabel.indexOf("ongoing") >= 0) kind = "ongoing";
    else if (label.indexOf("→") >= 0 || label.indexOf(" - ") >= 0) kind = "range";
    var parts = label.indexOf("→") >= 0 ? label.split("→") : label.split(" - ");
    return {
      kind: kind,
      start: parseHarptosDatePart(parts[0] || label, fallbackYear),
      end: kind === "range" ? parseHarptosDatePart(parts[1] || "", fallbackYear) : null
    };
  }

  function parseHarptosDatePart(label, fallbackYear) {
    var text = readString(label, "");
    var lowerLabel = text.toLowerCase();
    var year = fallbackYear || CURRENT_CAMPAIGN_YEAR_DR;
    var drIndex = lowerLabel.indexOf("dr");
    if (drIndex > 0) {
      var beforeDr = text.slice(0, drIndex).trim().split(" ").pop();
      var parsedYear = Number(beforeDr);
      if (Number.isFinite(parsedYear)) year = parsedYear;
    }
    var festival = HARPTOS_FESTIVALS.find(function (item) {
      return lowerLabel.indexOf(item.id.toLowerCase()) >= 0 || lowerLabel.indexOf(item.label.toLowerCase()) >= 0;
    });
    if (festival) return { mode: "festival", year: year, festival: festival.id, month: "Hammer", day: 1 };
    var month = HARPTOS_MONTHS.find(function (item) { return lowerLabel.indexOf(item.id.toLowerCase()) >= 0; });
    var firstChunk = text.trim().split(" ")[0];
    var parsedDay = Number(firstChunk.replaceAll(".", "").replaceAll(",", ""));
    return { mode: "day", year: year, month: month ? month.id : "Hammer", day: Number.isFinite(parsedDay) ? clampInteger(parsedDay, 1, 30, 1) : 1, festival: "Midwinter" };
  }

  function updateHarptosDateFields() {
    if (!els.harptos || !els.harptos.root) return;
    syncHarptosPickerVisibility();
    syncHarptosYearNames();
    var kind = getHarptosKind();
    var label = getHarptosDateLabel();
    var sortKey = getHarptosSortKey();
    setFieldValue(els.fields.date_label, label);
    if (kind !== "unknown") setFieldValue(els.fields.sort_key, sortKey === null ? "" : sortKey);
    if (els.harptos.display) els.harptos.display.value = label || "Seleziona una data Harptos";
    if (els.harptos.preview) els.harptos.preview.textContent = label ? "Data Harptos: " + label : "";
  }

  function syncHarptosPickerVisibility() {
    if (!els.harptos || !els.harptos.root || !els.harptos.kind) return;
    var kind = getHarptosKind();
    var isRange = kind === "range";
    var isUnknown = kind === "unknown";
    var startGroup = els.harptos.root.querySelector("[data-harptos-start-group]");
    if (startGroup) startGroup.hidden = isUnknown;
    if (els.harptos.endGroup) els.harptos.endGroup.hidden = !isRange;
    if (els.harptos.unknownNote) els.harptos.unknownNote.hidden = !isUnknown;
    syncCalendarModeVisibility("start");
    syncCalendarModeVisibility("end");
    if (els.fields.sort_key) {
      els.fields.sort_key.readOnly = !isUnknown;
      var wrapper = els.fields.sort_key.closest(".timeline-field");
      if (wrapper) wrapper.classList.toggle("is-sort-key-manual", isUnknown);
    }
  }

  function syncCalendarModeVisibility(prefix) {
    var mode = getFieldValue(els.harptos[prefix + "Mode"]) || "day";
    var showFestival = mode === "festival";
    if (els.harptos[prefix + "Calendar"]) els.harptos[prefix + "Calendar"].hidden = showFestival;
    if (els.harptos[prefix + "FestivalGrid"]) els.harptos[prefix + "FestivalGrid"].hidden = !showFestival;
  }

  function syncHarptosYearNames() {
    syncHarptosYearName("start");
    syncHarptosYearName("end");
  }

  function syncHarptosYearName(prefix) {
    var target = els.harptos[prefix + "YearName"];
    if (!target) return;
    var year = getHarptosYear(prefix);
    var name = HARPTOS_YEAR_NAMES[year] || "Nome dell’anno non impostato";
    setFieldValue(target, year + " DR — " + name);
  }

  function getHarptosDateLabel() {
    if (!els.harptos || !els.harptos.root) return "";
    var kind = getHarptosKind();
    if (kind === "unknown") return "Data sconosciuta";
    var startLabel = getHarptosCalendarLabel("start");
    if (kind === "ongoing") return startLabel + " → in corso";
    if (kind === "range") return startLabel + " → " + getHarptosCalendarLabel("end");
    return startLabel;
  }

  function getHarptosCalendarLabel(prefix) {
    var year = getHarptosYear(prefix);
    var yearName = HARPTOS_YEAR_NAMES[year] || "Year Unnamed";
    var mode = getFieldValue(els.harptos[prefix + "Mode"]) || "day";
    if (mode === "festival") {
      var festival = getSelectedHarptosFestival(prefix);
      return festival.label + ", " + year + " DR — " + yearName;
    }
    var month = getSelectedHarptosMonth(prefix);
    var day = clampInteger(els.harptos[prefix + "Day"], 1, 30, 1);
    return day + " " + month.id + ", " + year + " DR — " + yearName;
  }

  function getHarptosSortKey() {
    if (!els.harptos || !els.harptos.root) return null;
    if (getHarptosKind() === "unknown") return toNumberOrNull(getFieldValue(els.fields.sort_key));
    return getHarptosCalendarSortKey("start");
  }

  function getHarptosCalendarSortKey(prefix) {
    var year = getHarptosYear(prefix);
    var mode = getFieldValue(els.harptos[prefix + "Mode"]) || "day";
    var dayOfYear = 0;
    if (mode === "festival") dayOfYear = getSelectedHarptosFestival(prefix).offset;
    else dayOfYear = getSelectedHarptosMonth(prefix).offset + clampInteger(els.harptos[prefix + "Day"], 1, 30, 1);
    return year * 1000 + dayOfYear;
  }

  function getHarptosKind() {
    return getFieldValue(els.harptos && els.harptos.kind) || "single";
  }

  function getHarptosYear(prefix) {
    return clampInteger(getFieldValue(els.harptos && els.harptos[prefix + "Year"]), -10000, 10000, CURRENT_CAMPAIGN_YEAR_DR);
  }

  function getSelectedHarptosMonth(prefix) {
    var id = getFieldValue(els.harptos && els.harptos[prefix + "Month"]) || "Hammer";
    return HARPTOS_MONTHS.find(function (month) { return month.id === id; }) || HARPTOS_MONTHS[0];
  }

  function getSelectedHarptosFestival(prefix) {
    var id = els.harptos[prefix + "Festival"] || "Midwinter";
    return HARPTOS_FESTIVALS.find(function (festival) { return festival.id === id; }) || HARPTOS_FESTIVALS[0];
  }

  function upsertLocalEvent(event) {
    var index = timelineEvents.findIndex(function (item) { return item.id === event.id; });
    if (index >= 0) timelineEvents[index] = event;
    else timelineEvents.push(event);
  }

  function getSelectedEvent() {
    if (!selectedEventId) return null;
    return timelineEvents.find(function (event) { return event.id === selectedEventId; }) || null;
  }

  function normalizeTimelineEvent(row) {
    if (!row || typeof row !== "object") return null;
    return {
      id: String(row.id || ""),
      title: readString(row.title, "Evento senza titolo"),
      short_title: "",
      summary: limitSummaryText(readString(row.summary, "")),
      description: readString(row.description, ""),
      dm_notes: readString(row.dm_notes, ""),
      location: readString(row.location, ""),
      date_label: readString(row.date_label, "Senza data"),
      sort_key: Number(row.sort_key || 0),
      type: readString(row.type, "campaign"),
      visibility: readString(row.visibility, "players"),
      knowledge: "known",
      truth: "confirmed",
      state: readString(row.state, "past"),
      importance: clampInteger(row.importance, 1, 5, 3),
      tags: normalizeArray(row.tags),
      links: normalizeArray(row.links),
      character_ids: normalizeCharacterIds(row.character_ids || timelineEventCharacterMap.get(String(row.id || "")) || []),
      background_image_url: readString(row.background_image_url || row.backgroundImageUrl || row.background_url || row.backgroundUrl || row.image_url || row.imageUrl, ""),
      created_at: row.created_at || null,
      updated_at: row.updated_at || null
    };
  }

  function normalizeTimelineCharacter(row) {
    if (!row || typeof row !== "object") return null;
    var id = toIdString(row.id);
    if (!id) return null;

    return {
      id: id,
      slug: readString(row.slug, ""),
      name: readString(row.name, "Personaggio"),
      portrait_url: readString(row.portrait_url, ""),
      token_url: readString(row.token_url, ""),
      class_name: readString(row.class_name, ""),
      subclass_name: readString(row.subclass_name, ""),
      level: row.level == null ? "" : String(row.level)
    };
  }

  function buildCharacterMap(characters) {
    var map = new Map();
    (Array.isArray(characters) ? characters : []).forEach(function (character) {
      var id = toIdString(character && character.id);
      if (id) map.set(id, character);
    });
    return map;
  }

  function buildTimelineEventCharacterMap(rows) {
    var map = new Map();
    (Array.isArray(rows) ? rows : []).forEach(function (row) {
      var eventId = toIdString(row && row.event_id);
      var characterId = toIdString(row && row.character_id);
      if (!eventId || !characterId) return;
      if (!map.has(eventId)) map.set(eventId, []);
      map.get(eventId).push(characterId);
    });
    return map;
  }

  function normalizeCharacterIds(value) {
    if (!Array.isArray(value)) return [];
    var seen = new Set();
    var ids = [];

    for (var i = 0; i < value.length; i += 1) {
      var id = toIdString(value[i]);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      ids.push(id);
    }

    return ids;
  }

  function getCharacterImageUrl(character) {
    return readString(character && character.portrait_url, "") || readString(character && character.token_url, "") || FALLBACK_TOKEN_IMAGE;
  }

  function buildCharacterMeta(character) {
    var className = readString(character && character.class_name, "");
    var subclassName = readString(character && character.subclass_name, "");
    var level = character && character.level != null && character.level !== "" ? "Livello " + character.level : "";
    var role = className && subclassName ? className + " - " + subclassName : className;
    if (role && level) return role + " - " + level;
    return role || level || "Profilo base";
  }

  function toIdString(value) {
    if (value === null || typeof value === "undefined") return "";
    return String(value).trim();
  }

  function resolveCanManageTimeline() {
    var storedCode = getPlayerCode();
    if (storedCode && storedCode.toLowerCase() === "enclave") return true;
    return getProfileCandidates().some(function (candidate) {
      if (!candidate || typeof candidate !== "object") return false;
      if (hasTimelineManagePermission(candidate)) return true;
      var candidateCode = readString(candidate.player_code || candidate.playerCode || candidate.access_code || candidate.accessCode || candidate.code, "");
      return candidateCode && candidateCode.toLowerCase() === "enclave";
    });
  }

  function getProfileCandidates() {
    var candidates = [];
    pushProfileCandidate(candidates, getProfileState());
    try {
      ["gorgoneProfileState", "gorgonePlayerProfile", "gorgonePlayer", "enclaveProfileState", "enclavePlayerProfile", "enclavePlayer"].forEach(function (key) {
        var raw = localStorage.getItem(key);
        if (!raw) return;
        try { pushProfileCandidate(candidates, JSON.parse(raw)); } catch (error) { return; }
      });
    } catch (error) {
      return candidates;
    }
    return candidates;
  }

  function pushProfileCandidate(candidates, value) {
    if (!value || typeof value !== "object") return;
    candidates.push(value);
    [value.player, value.profile, value.currentPlayer, value.selectedPlayer, value.activePlayer, value.user].forEach(function (nested) {
      if (nested && typeof nested === "object") candidates.push(nested);
    });
  }

  function getProfileState() {
    try {
      if (window.EnclaveLayout && typeof window.EnclaveLayout.getProfileState === "function") return window.EnclaveLayout.getProfileState();
    } catch (error) {
      return null;
    }
    return null;
  }

  function hasTimelineManagePermission(profile) {
    if (!profile || typeof profile !== "object") return false;
    if (isTruthyPermission(profile.can_manage_timeline) || isTruthyPermission(profile.canManageTimeline) || isTruthyPermission(profile.can_manage_admin) || isTruthyPermission(profile.canManageAdmin) || isTruthyPermission(profile.can_manage) || isTruthyPermission(profile.canManage) || isTruthyPermission(profile.is_admin) || isTruthyPermission(profile.isAdmin)) return true;
    var role = readString(profile.role, "").toLowerCase();
    return role === "admin" || role === "gm";
  }

  function getPlayerCode() {
    try {
      return (localStorage.getItem(PLAYER_CODE_STORAGE_KEY) || localStorage.getItem("player_code") || localStorage.getItem("playerCode") || localStorage.getItem("enclavePlayerCode") || localStorage.getItem("gorgonePlayerCode") || "").trim();
    } catch (error) {
      return "";
    }
  }

  function getSupabaseHeaders() {
    return { apikey: SUPABASE_ANON_KEY, Authorization: "Bearer " + SUPABASE_ANON_KEY, "Content-Type": "application/json" };
  }

  function getFunctionHeaders() {
    return { apikey: SUPABASE_ANON_KEY, Authorization: "Bearer " + SUPABASE_ANON_KEY, "Content-Type": "application/json" };
  }

  function setSavingState(value) {
    isSaving = Boolean(value);
    if (els.modalSave) {
      els.modalSave.disabled = isSaving;
      els.modalSave.title = isSaving ? "Salvataggio..." : "Salva evento";
      els.modalSave.setAttribute("aria-label", els.modalSave.title);
      els.modalSave.innerHTML = '<i class="fa-solid fa-floppy-disk" aria-hidden="true"></i>';
    }
    if (els.deleteButton) els.deleteButton.disabled = isSaving;
  }

  function showStatus(message, tone) {
    if (!els.status) {
      if (tone === "error") console.error(message);
      return;
    }
    els.status.textContent = message;
    els.status.dataset.tone = tone || "default";
    els.status.hidden = false;
    clearTimeout(showStatus._timeout);
    showStatus._timeout = setTimeout(function () { els.status.hidden = true; }, 4200);
  }

  async function safeReadJson(response) {
    try { return await response.json(); } catch (error) { return null; }
  }

  function qs(selector) { return document.querySelector(selector); }
  function getFieldValue(el) { return el ? String(el.value || "").trim() : ""; }
  function setFieldValue(el, value) { if (el) el.value = value == null ? "" : String(value); }
  function readString(value, fallback) { if (typeof value === "string") return value.trim(); if (value === null || typeof value === "undefined") return fallback || ""; return String(value).trim(); }

  function limitSummaryText(value) {
    return readString(value, "").slice(0, SUMMARY_MAX_LENGTH);
  }

  function normalizeArray(value) {
    if (Array.isArray(value)) return value.filter(function (item) { return item !== null && typeof item !== "undefined" && String(item).trim() !== ""; });
    if (typeof value === "string") {
      try { var parsed = JSON.parse(value); if (Array.isArray(parsed)) return parsed; } catch (error) { return inputToArray(value); }
    }
    return [];
  }

  function inputToArray(value) {
    return readString(value, "").split(",").map(function (item) { return item.trim(); }).filter(Boolean);
  }

  function arrayToInput(value) {
    if (!Array.isArray(value)) return "";
    return value.map(function (item) {
      if (typeof item === "string") return item;
      if (item && typeof item === "object") return item.label || item.title || item.url || "";
      return "";
    }).filter(Boolean).join(", ");
  }

  function inputToLinks(value) {
    var text = readString(value, "");
    if (!text) return [];
    return text.split(String.fromCharCode(10)).map(function (line) { return line.trim(); }).filter(Boolean).map(function (line) {
      var separator = line.indexOf(" | ");
      if (separator > 0) return { label: line.slice(0, separator).trim(), url: line.slice(separator + 3).trim() };
      if (line.indexOf("http://") === 0 || line.indexOf("https://") === 0) return { label: line, url: line };
      return line;
    });
  }

  function linksToInput(value) {
    if (!Array.isArray(value)) return "";
    return value.map(function (link) {
      if (typeof link === "string") return link;
      if (link && typeof link === "object") {
        var label = link.label || link.title || "";
        var url = link.url || "";
        if (label && url) return label + " | " + url;
        return label || url;
      }
      return "";
    }).filter(Boolean).join(String.fromCharCode(10));
  }

  function isUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(readString(value, ""));
  }

  function toNumberOrNull(value) { var number = Number(value); return Number.isFinite(number) ? number : null; }
  function clampInteger(value, min, max, fallback) { var number = Number(value); if (!Number.isFinite(number)) return fallback; return Math.max(min, Math.min(max, Math.round(number))); }
  function normalizeSearchText(value) { return readString(value, "").toLowerCase().normalize("NFD").replaceAll("à", "a").replaceAll("è", "e").replaceAll("é", "e").replaceAll("ì", "i").replaceAll("ò", "o").replaceAll("ù", "u"); }
  function isTruthyPermission(value) { if (value === true || value === 1) return true; if (typeof value !== "string") return false; return ["true", "1", "yes", "y", "t", "si", "sì", "on", "enabled"].includes(value.trim().toLowerCase()); }

  function renderBadge(label, tone) {
    return '<span class="timeline-badge" data-tone="' + escapeAttribute(tone || "default") + '">' + escapeHtml(label || "") + "</span>";
  }

  function renderIconBadge(icon, label, tone) {
    return '<span class="timeline-badge" data-tone="' + escapeAttribute(tone || "default") + '"><i class="' + escapeAttribute(icon || "fa-solid fa-circle") + '" aria-hidden="true"></i><span>' + escapeHtml(label || "") + "</span></span>";
  }

  function renderVisibilityBadge(visibility) {
    return visibility === "dm" ? renderIconBadge("fa-solid fa-crown", "DM", "danger") : renderIconBadge("fa-solid fa-user", "Giocatori", "success");
  }

  function getTypeMeta(value) { return TYPE_META[value] || TYPE_META.campaign; }
  function getStateMeta(value) { return STATE_META[value] || STATE_META.past; }
  function visibilityLabel(value) { return value === "dm" ? "DM" : "Giocatori"; }

  function getStateTone(state) {
    switch (state) {
      case "current": return "success";
      case "future":
      case "altered":
      case "variant": return "warning";
      case "cancelled": return "danger";
      default: return "accent";
    }
  }

  function renderLimitedMarkdown(value) {
    var normalized = String(value || "").replace(new RegExp(String.fromCharCode(13) + String.fromCharCode(10), "g"), String.fromCharCode(10)).replace(new RegExp(String.fromCharCode(13), "g"), String.fromCharCode(10));
    var lines = normalized.split(String.fromCharCode(10));
    var html = [];
    var paragraph = [];
    var list = null;

    function flushParagraph() {
      if (!paragraph.length) return;
      html.push("<p>" + paragraph.map(renderInlineMarkdown).join("<br>") + "</p>");
      paragraph = [];
    }

    function closeList() {
      if (!list) return;
      html.push("</" + list + ">");
      list = null;
    }

    function openList(type) {
      if (list === type) return;
      closeList();
      list = type;
      html.push("<" + type + ">");
    }

    lines.forEach(function (rawLine) {
      var line = String(rawLine || "");
      var trimmed = line.trim();
      if (!trimmed) {
        flushParagraph();
        closeList();
        return;
      }

      if (trimmed.indexOf("### ") === 0 || trimmed.indexOf("## ") === 0 || trimmed.indexOf("# ") === 0) {
        flushParagraph();
        closeList();
        var depth = trimmed.indexOf("### ") === 0 ? 3 : trimmed.indexOf("## ") === 0 ? 2 : 1;
        var headingText = trimmed.slice(depth + 1);
        var level = depth + 3;
        html.push("<h" + level + ">" + renderInlineMarkdown(headingText) + "</h" + level + ">");
        return;
      }

      if (trimmed.indexOf("- ") === 0 || trimmed.indexOf("* ") === 0) {
        flushParagraph();
        openList("ul");
        html.push("<li>" + renderInlineMarkdown(trimmed.slice(2)) + "</li>");
        return;
      }

      var dotIndex = trimmed.indexOf(". ");
      var parenIndex = trimmed.indexOf(") ");
      var numberIndex = dotIndex > 0 ? dotIndex : parenIndex > 0 ? parenIndex : -1;
      if (numberIndex > 0 && isPositiveIntegerString(trimmed.slice(0, numberIndex))) {
        flushParagraph();
        openList("ol");
        html.push("<li>" + renderInlineMarkdown(trimmed.slice(numberIndex + 2)) + "</li>");
        return;
      }

      closeList();
      paragraph.push(line);
    });

    flushParagraph();
    closeList();
    return html.join("");
  }

  function renderInlineMarkdown(value) {
    var text = escapeHtml(value);
    text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    text = text.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
    return text;
  }

  function isPositiveIntegerString(value) {
    if (!value) return false;
    for (var i = 0; i < value.length; i += 1) {
      var code = value.charCodeAt(i);
      if (code < 48 || code > 57) return false;
    }
    return true;
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }

  function escapeAttribute(value) { return escapeHtml(value).replaceAll("`", "&#096;"); }
  function escapeCssUrl(value) {
    return String(value == null ? "" : value)
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/[\n\r\f]/g, "");
  }

  function nl2br(value) { return String(value || "").split(String.fromCharCode(10)).join("<br>"); }
})();