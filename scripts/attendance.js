(function () {
  "use strict";

  var SUPABASE_URL = "https://atglgaritxzowshenaqr.supabase.co";
  var SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0Z2xnYXJpdHh6b3dzaGVuYXFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NzcxNDQsImV4cCI6MjA5MjM1MzE0NH0.ObDvvWMkddZL8wABKyI-TBi4KgVoYArJQjoOnAmVVe8";

  var ACCESS_CODE_KEY = "gorgoneAccessCode";
  var UPSERT_AVAILABILITY_ENDPOINT = SUPABASE_URL + "/functions/v1/upsert-availability";
  var SET_DAY_STATUS_RPC = SUPABASE_URL + "/rest/v1/rpc/set_attendance_day_status";
  var UPSERT_EVENT_RPC = SUPABASE_URL + "/rest/v1/rpc/upsert_attendance_event";
  var DELETE_EVENT_RPC = SUPABASE_URL + "/rest/v1/rpc/delete_attendance_event";

  var WEEKDAY_SHORT_IT = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
  var FALLBACK_TOKEN_IMAGE =
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' fill='%23162229'/><circle cx='32' cy='24' r='12' fill='%234db8a6'/><rect x='14' y='40' width='36' height='16' fill='%233b5865'/></svg>";

  var state = {
    viewMode: "month",
    cursor: getTodayUTC(),
    periodStart: null,
    periodEnd: null,
    dayRows: [],
    dayRowsByDate: new Map(),
    availabilityRows: [],
    availabilityRowsByDate: new Map(),
    quests: [],
    questMetaById: new Map(),
    questMetaBySlug: new Map(),
    questMetaByTitle: new Map(),
    activeQuestRefs: {
      ids: new Set(),
      slugs: new Set(),
      titles: new Set(),
      isLoaded: false,
    },
    playerCode: "",
    player: null,
    playerCharacters: [],
    isLoading: false,
    isSaving: false,
    isEventDialogOpen: false,
    activeMenu: null,
  };

  var dom = {};
  var viewportModeTimer = null;

  document.addEventListener("DOMContentLoaded", initAttendancePage);

  function initAttendancePage() {
    dom.calendarSection = document.querySelector(".attendance-calendar");
    dom.playerStatus = document.querySelector("[data-attendance-player-status]");

    dom.viewButtons = document.querySelectorAll("[data-attendance-view]");
    dom.prevButton = document.querySelector("[data-attendance-prev]");
    dom.nextButton = document.querySelector("[data-attendance-next]");
    dom.todayButton = document.querySelector("[data-attendance-today]");
    dom.rangeLabel = document.querySelector("[data-attendance-range]");
    dom.surface = document.querySelector("[data-attendance-surface]");
    dom.feedback = document.querySelector("[data-attendance-feedback]");

    if (!dom.surface) {
      return;
    }

    bindEvents();
    syncProfileFromLayout();
    enforceMobileMonthView();
    loadCalendarRange();
  }

  function bindEvents() {
    document.addEventListener("enclave:player-resolved", function onPlayerResolved(event) {
      var detail = event && event.detail ? event.detail : null;
      applyResolvedPlayer(detail);
      renderCalendar();
    });

    document.addEventListener("enclave:player-cleared", function onPlayerCleared() {
      clearPlayerState();
      renderCalendar();
    });

    window.addEventListener("storage", function onStorage(event) {
      if (event.key !== ACCESS_CODE_KEY) {
        return;
      }

      syncProfileFromLayout();
      renderCalendar();
    });

    window.addEventListener("resize", function onAttendanceResize() {
      if (viewportModeTimer) {
        window.clearTimeout(viewportModeTimer);
      }

      viewportModeTimer = window.setTimeout(function syncMobileViewMode() {
        viewportModeTimer = null;
        if (enforceMobileMonthView()) {
          loadCalendarRange();
        }
      }, 120);
    });

    for (var i = 0; i < dom.viewButtons.length; i += 1) {
      dom.viewButtons[i].addEventListener("click", function onViewClick() {
        var nextView = this.getAttribute("data-attendance-view");
        if (!nextView || nextView === state.viewMode) {
          return;
        }

        state.viewMode = nextView === "week" && !isMobileCalendarViewport() ? "week" : "month";
        loadCalendarRange();
      });
    }

    if (dom.prevButton) {
      dom.prevButton.addEventListener("click", function onPrevClick() {
        shiftPeriod(-1);
      });
    }

    if (dom.nextButton) {
      dom.nextButton.addEventListener("click", function onNextClick() {
        shiftPeriod(1);
      });
    }

    if (dom.prevButton) {
      dom.prevButton.setAttribute("aria-label", "Periodo precedente");
      dom.prevButton.setAttribute("title", "Periodo precedente");
    }

    if (dom.nextButton) {
      dom.nextButton.setAttribute("aria-label", "Periodo successivo");
      dom.nextButton.setAttribute("title", "Periodo successivo");
    }

    if (dom.todayButton) {
      dom.todayButton.setAttribute("aria-label", "Torna a oggi");
      dom.todayButton.setAttribute("title", "Oggi");
      dom.todayButton.addEventListener("click", function onTodayClick() {
        state.cursor = getTodayUTC();
        loadCalendarRange();
      });
    }

    dom.surface.addEventListener("click", function onDayClick(event) {
      event.preventDefault();
      closeDayActionMenu();

      var target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      var dayButton = target.closest("[data-attendance-day]");
      if (!dayButton || dayButton.disabled) {
        return;
      }

      var isoDate = readDayButtonIso(dayButton);
      if (!isoDate) {
        return;
      }

      toggleAvailability(isoDate);
    });

    dom.surface.addEventListener("contextmenu", function onDayContextMenu(event) {
      var target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      var dayButton = target.closest("[data-attendance-day]");
      if (!dayButton || !canInteractWithCalendar()) {
        return;
      }

      var isoDate = readDayButtonIso(dayButton);
      if (!isoDate) {
        return;
      }

      event.preventDefault();
      openDayActionMenu(isoDate, getDayRecord(isoDate), dayButton, event);
    });

    document.addEventListener("click", function onDocumentClick(event) {
      if (!state.activeMenu) {
        return;
      }

      var target = event.target;
      if (target instanceof Element && target.closest("[data-attendance-action-menu]")) {
        return;
      }

      closeDayActionMenu();
    });

    document.addEventListener("keydown", function onDocumentKeydown(event) {
      if (event.key === "Escape") {
        closeDayActionMenu();
        closeEventDialog();
      }
    });
  }

  function syncProfileFromLayout() {
    var profileState =
      window.EnclaveLayout && typeof window.EnclaveLayout.getProfileState === "function"
        ? window.EnclaveLayout.getProfileState()
        : null;

    if (profileState && profileState.player) {
      applyResolvedPlayer(profileState);
      return;
    }

    clearPlayerState();
  }

  function applyResolvedPlayer(detail) {
    if (!detail || !detail.player) {
      clearPlayerState();
      return;
    }

    state.player = detail.player;
    state.playerCharacters = Array.isArray(detail.characters) ? detail.characters : [];
    state.playerCode = readString(detail.code, "") || readAccessCode();

    var label = readString(state.player.display_name, "Giocatore");

    if (canManageSessions()) {
      setPlayerStatus(
        "Profilo DM attivo: " + label + ". Click sinistro per segnare disponibilità. Click destro per aprire il menu gestione.",
        "valid"
      );
    } else {
      setPlayerStatus("Profilo attivo: " + label + ". Clicca un giorno aperto per aggiornare.", "valid");
    }

    setFeedback("", "");
  }

  function clearPlayerState() {
    state.playerCode = "";
    state.player = null;
    state.playerCharacters = [];
    setPlayerStatus("Accedi dal profilo per segnare le disponibilità.", "");
  }

  async function loadCalendarRange(options) {
    enforceMobileMonthView();

    var settings = options || {};
    var silent = settings.silent === true;
    var range = computeCalendarRange(state.cursor, state.viewMode);
    state.periodStart = range.start;
    state.periodEnd = range.end;

    updateViewButtons();
    updateRangeLabel();

    state.isLoading = true;

    if (!silent) {
      renderLoadingState();
    }

    try {
      var startIso = toISODate(range.start);
      var endIso = toISODate(range.end);
      var results = await Promise.all([
        fetchCalendarDaysRange(startIso, endIso),
        fetchAvailabilityRange(startIso, endIso),
        fetchActiveQuestRefs(),
      ]);

      state.dayRows = results[0];
      state.dayRowsByDate = groupRowsByDay(results[0]);
      state.availabilityRows = results[1];
      state.availabilityRowsByDate = groupRowsByDay(results[1]);
      state.activeQuestRefs = results[2];
      renderCalendar();

      if (!silent) {
        setFeedback("", "");
      }
    } catch (error) {
      console.error("Errore caricamento disponibilità:", error);

      if (!silent) {
        state.dayRows = [];
        state.dayRowsByDate = new Map();
        state.availabilityRows = [];
        state.availabilityRowsByDate = new Map();
        state.activeQuestRefs = createEmptyQuestRefs(false);
        renderCalendarError("Impossibile caricare il calendario disponibilità.");
      } else {
        throw error;
      }
    } finally {
      state.isLoading = false;
    }
  }

  async function fetchCalendarDaysRange(startIso, endIso) {
    var params = [
      "select=" +
        encodeURIComponent(
          [
            "available_on",
            "is_open",
            "dm_player_id",
            "dm_display_name",
            "day_note",
            "available_player_count",
            "quest_progress",
            "events",
          ].join(",")
        ),
      "available_on=gte." + encodeURIComponent(startIso),
      "available_on=lte." + encodeURIComponent(endIso),
      "order=available_on.asc",
    ];

    var url = SUPABASE_URL + "/rest/v1/v_attendance_calendar_days?" + params.join("&");
    var payload = await getJson(url);

    return Array.isArray(payload) ? normalizeDayRows(payload) : [];
  }

  async function fetchAvailabilityRange(startIso, endIso) {
    var params = [
      "select=" + encodeURIComponent(["available_on", "player_id", "display_name", "player_code"].join(",")),
      "available_on=gte." + encodeURIComponent(startIso),
      "available_on=lte." + encodeURIComponent(endIso),
      "order=available_on.asc",
    ];

    var url = SUPABASE_URL + "/rest/v1/v_player_availability_calendar?" + params.join("&");
    var payload = await getJson(url);

    return Array.isArray(payload) ? payload : [];
  }

  async function fetchQuests() {
    var params = [
      "select=" + encodeURIComponent(["id", "title", "slug", "status", "archived_at", "image_url"].join(",")),
      "archived_at=is.null",
      "order=title.asc",
    ];

    var url = SUPABASE_URL + "/rest/v1/quests?" + params.join("&");
    var payload = await getJson(url);
    state.quests = Array.isArray(payload) ? payload.filter(isActiveQuestRecord) : [];
    syncQuestMeta(state.quests);
    return state.quests;
  }

  async function fetchActiveQuestRefs() {
    var params = [
      "select=" + encodeURIComponent(["id", "title", "slug", "status", "archived_at", "image_url"].join(",")),
      "archived_at=is.null",
      "order=title.asc",
    ];

    var url = SUPABASE_URL + "/rest/v1/quests?" + params.join("&");
    var payload = await getJson(url);
    var quests = Array.isArray(payload) ? payload.filter(isActiveQuestRecord) : [];

    state.quests = quests;
    syncQuestMeta(quests);
    return buildActiveQuestRefs(quests);
  }

  function syncQuestMeta(quests) {
    state.questMetaById = new Map();
    state.questMetaBySlug = new Map();
    state.questMetaByTitle = new Map();

    var rows = Array.isArray(quests) ? quests : [];
    for (var i = 0; i < rows.length; i += 1) {
      var quest = rows[i] || {};
      var id = toStringOrEmpty(quest.id);
      var slug = readString(quest.slug, "").toLowerCase();
      var title = normalizeQuestTitle(quest.title);

      if (id) {
        state.questMetaById.set(id, quest);
      }

      if (slug) {
        state.questMetaBySlug.set(slug, quest);
      }

      if (title) {
        state.questMetaByTitle.set(title, quest);
      }
    }
  }

  function buildActiveQuestRefs(quests) {
    var refs = createEmptyQuestRefs(true);

    for (var i = 0; i < quests.length; i += 1) {
      var quest = quests[i] || {};
      var id = toStringOrEmpty(quest.id);
      var slug = readString(quest.slug, "").toLowerCase();
      var title = normalizeQuestTitle(quest.title);

      if (id) {
        refs.ids.add(id);
      }

      if (slug) {
        refs.slugs.add(slug);
      }

      if (title) {
        refs.titles.add(title);
      }
    }

    return refs;
  }

  function createEmptyQuestRefs(isLoaded) {
    return {
      ids: new Set(),
      slugs: new Set(),
      titles: new Set(),
      isLoaded: isLoaded === true,
    };
  }

  function isActiveQuestRecord(quest) {
    if (!quest) {
      return false;
    }

    if (quest.archived_at) {
      return false;
    }

    var status = normalizeQuestStatus(quest.status);
    return status !== "conclusa" && !isCompletedQuestStatus(status);
  }

  async function toggleAvailability(isoDate) {
    if (!canInteractWithCalendar() || state.isSaving) {
      return;
    }

    var dayRecord = getDayRecord(isoDate);
    if (!dayRecord.is_open) {
      setFeedback("Dungeon Master assente.", "error");
      return;
    }

    var playerCode = state.playerCode || readAccessCode();
    if (!playerCode) {
      setPlayerStatus("Accedi dal profilo per segnare le disponibilità.", "error");
      return;
    }

    var wasAvailable = hasPlayerAvailabilityOn(isoDate);
    var nextType = wasAvailable ? "unavailable" : "available";

    state.isSaving = true;
    setFeedback("Aggiornamento disponibilità in corso...", "");

    try {
      var result = await saveAvailabilityState(playerCode, isoDate, nextType);
      await loadCalendarRange({ silent: true });

      if (wasAvailable && result && result.action === "deleted") {
        setFeedback("Disponibilità rimossa.", "success");
      } else if (!wasAvailable && result && result.action === "upserted") {
        setFeedback("Disponibilità aggiornata.", "success");
      } else if (wasAvailable && !hasPlayerAvailabilityOn(isoDate)) {
        setFeedback("Disponibilità rimossa.", "success");
      } else if (!wasAvailable && hasPlayerAvailabilityOn(isoDate)) {
        setFeedback("Disponibilità aggiornata.", "success");
      } else {
        setFeedback("Aggiornamento completato.", "success");
      }
    } catch (error) {
      console.error("Errore aggiornamento disponibilità:", error);
      setFeedback("Impossibile aggiornare la disponibilità.", "error");
    } finally {
      state.isSaving = false;
    }
  }

  async function toggleDayOpenState(isoDate) {
    if (!canManageSessions() || state.isSaving) {
      return;
    }

    var playerCode = state.playerCode || readAccessCode();
    var dayRecord = getDayRecord(isoDate);
    var nextOpenState = !dayRecord.is_open;

    state.isSaving = true;
    setFeedback(nextOpenState ? "Apertura giornata in corso..." : "Blocco giornata in corso...", "");

    try {
      await postJson(SET_DAY_STATUS_RPC, {
        p_player_code: playerCode,
        p_available_on: isoDate,
        p_is_open: nextOpenState,
        p_note: "",
      });

      await loadCalendarRange({ silent: true });
      setFeedback(nextOpenState ? "Giornata aperta ai giocatori." : "Giornata bloccata.", "success");
    } catch (error) {
      console.error("Errore aggiornamento stato giornata:", error);
      setFeedback("Impossibile aggiornare lo stato della giornata.", "error");
    } finally {
      state.isSaving = false;
    }
  }

  async function saveAvailabilityState(playerCode, isoDate, availabilityType) {
    var payload = await postJson(UPSERT_AVAILABILITY_ENDPOINT, {
      player_code: playerCode,
      available_on: isoDate,
      availability_type: availabilityType,
      note: "",
    });

    if (!payload || payload.success !== true) {
      throw new Error("Aggiornamento disponibilità non riuscito.");
    }

    return payload;
  }

  async function createSessionEvent(isoDate, questId, sessionTime) {
    if (!canManageSessions() || state.isSaving) {
      return;
    }

    var playerCode = state.playerCode || readAccessCode();

    state.isSaving = true;
    setFeedback("Creazione sessione in corso...", "");

    try {
      await postJson(UPSERT_EVENT_RPC, {
        p_player_code: playerCode,
        p_available_on: isoDate,
        p_event_type: "session",
        p_quest_id: Number(questId),
        p_title: readString(sessionTime, ""),
        p_note: readString(sessionTime, "") ? JSON.stringify({ session_time: sessionTime }) : "",
        p_event_id: null,
      });

      await loadCalendarRange({ silent: true });
      setFeedback("Sessione aggiunta al calendario.", "success");
    } catch (error) {
      console.error("Errore creazione sessione:", error);
      setFeedback("Impossibile creare la sessione.", "error");
    } finally {
      state.isSaving = false;
    }
  }

  async function deleteSessionEvent(eventId) {
    if (!canManageSessions() || state.isSaving) {
      return;
    }

    var playerCode = state.playerCode || readAccessCode();

    state.isSaving = true;
    setFeedback("Rimozione sessione in corso...", "");

    try {
      await postJson(DELETE_EVENT_RPC, {
        p_player_code: playerCode,
        p_event_id: Number(eventId),
      });

      await loadCalendarRange({ silent: true });
      setFeedback("Sessione rimossa dal calendario.", "success");
    } catch (error) {
      console.error("Errore rimozione sessione:", error);
      setFeedback("Impossibile rimuovere la sessione.", "error");
    } finally {
      state.isSaving = false;
    }
  }

  function renderLoadingState() {
    if (!dom.surface) {
      return;
    }

    syncViewModeClasses();
    dom.surface.classList.add("is-loading");
    dom.surface.textContent = "";

    var loading = document.createElement("p");
    loading.className = "quest-loading";
    loading.textContent = "Caricamento disponibilità...";
    dom.surface.appendChild(loading);
  }

  function renderCalendarError(message) {
    if (!dom.surface) {
      return;
    }

    syncViewModeClasses();
    dom.surface.classList.remove("is-loading");
    dom.surface.textContent = "";

    var error = document.createElement("p");
    error.className = "quest-empty";
    error.textContent = message;
    dom.surface.appendChild(error);
  }

  function renderCalendar() {
    enforceMobileMonthView();

    if (!dom.surface || !state.periodStart || !state.periodEnd) {
      return;
    }

    syncViewModeClasses();
    dom.surface.classList.remove("is-loading");
    dom.surface.textContent = "";

    if (state.viewMode === "week") {
      renderWeekAgenda();
      return;
    }

    renderMonthGrid();
  }

  function renderMonthGrid() {
    var weekdays = document.createElement("div");
    weekdays.className = "attendance-weekdays";

    for (var i = 0; i < WEEKDAY_SHORT_IT.length; i += 1) {
      var dayLabel = document.createElement("p");
      dayLabel.className = "attendance-weekday";
      dayLabel.textContent = WEEKDAY_SHORT_IT[i];
      weekdays.appendChild(dayLabel);
    }

    var grid = document.createElement("div");
    grid.className = "attendance-grid";

    var days = buildDisplayedDays(state.cursor, "month");
    var todayIso = toISODate(getTodayUTC());

    for (var d = 0; d < days.length; d += 1) {
      var day = days[d];
      var isoDate = toISODate(day.date);
      var dayRecord = getDayRecord(isoDate);
      var playerAvailable = hasPlayerAvailabilityOn(isoDate);
      var isViable = Number(dayRecord.available_player_count || 0) >= 3;
      var sessionEvent = getPrimarySessionEvent(dayRecord);

      var button = document.createElement("button");
      button.type = "button";
      button.className = "attendance-day";
      button.setAttribute("data-attendance-day", formatCalendarCellWeekdayLabel(day.date));
      button.setAttribute("data-attendance-date", formatCalendarCellNumericDate(day.date));
      button.setAttribute("data-attendance-iso", isoDate);
      button.setAttribute("aria-disabled", canInteractWithCalendar() ? "false" : "true");

      if (!day.inCurrentPeriod) {
        button.classList.add("attendance-day--other");
      }

      if (!dayRecord.is_open) {
        button.classList.add("attendance-day--closed");
      } else {
        button.classList.add("attendance-day--open");
      }

      if (isoDate === todayIso) {
        button.classList.add("attendance-day--today");
      }

      if (isViable) {
        button.classList.add("attendance-day--viable");
      }

      if (playerAvailable) {
        button.classList.add("attendance-day--mine");
      }

      if (sessionEvent) {
        button.classList.add("attendance-day--session");
        applySessionBackground(button, sessionEvent);
      }

      if (canInteractWithCalendar()) {
        button.classList.add("attendance-day--interactive");
      } else {
        button.disabled = true;
      }

      button.title = buildDayTitle(day.date, sessionEvent);

      button.appendChild(renderDayHead(day.date, dayRecord, false, sessionEvent));
      appendDayContent(button, dayRecord, false);
      grid.appendChild(button);
    }

    dom.surface.appendChild(weekdays);
    dom.surface.appendChild(grid);
  }

  function renderWeekAgenda() {
    var list = document.createElement("div");
    list.className = "attendance-week-list";

    var days = buildDisplayedDays(state.cursor, "week");
    var todayIso = toISODate(getTodayUTC());

    for (var d = 0; d < days.length; d += 1) {
      var day = days[d];
      var isoDate = toISODate(day.date);
      var dayRecord = getDayRecord(isoDate);
      var playerAvailable = hasPlayerAvailabilityOn(isoDate);
      var isViable = Number(dayRecord.available_player_count || 0) >= 3;
      var sessionEvent = getPrimarySessionEvent(dayRecord);

      var button = document.createElement("button");
      button.type = "button";
      button.className = "attendance-day attendance-day--week";
      button.setAttribute("data-attendance-day", formatCalendarCellWeekdayLabel(day.date));
      button.setAttribute("data-attendance-date", formatCalendarCellNumericDate(day.date));
      button.setAttribute("data-attendance-iso", isoDate);
      button.setAttribute("aria-disabled", canInteractWithCalendar() ? "false" : "true");

      if (!dayRecord.is_open) {
        button.classList.add("attendance-day--closed");
      } else {
        button.classList.add("attendance-day--open");
      }

      if (isoDate === todayIso) {
        button.classList.add("attendance-day--today");
      }

      if (isViable) {
        button.classList.add("attendance-day--viable");
      }

      if (playerAvailable) {
        button.classList.add("attendance-day--mine");
      }

      if (sessionEvent) {
        button.classList.add("attendance-day--session");
        applySessionBackground(button, sessionEvent);
      }

      if (canInteractWithCalendar()) {
        button.classList.add("attendance-day--interactive");
      } else {
        button.disabled = true;
      }

      button.title = buildDayTitle(day.date, sessionEvent);

      var dateCol = document.createElement("div");
      dateCol.className = "attendance-day__date";

      var weekday = document.createElement("span");
      weekday.className = "attendance-day__weekday";
      weekday.textContent = formatWeekdayLabel(day.date);

      var calendarDate = document.createElement("span");
      calendarDate.className = "attendance-day__calendar-date";
      calendarDate.textContent = formatDayMonth(day.date);

      dateCol.appendChild(weekday);
      dateCol.appendChild(calendarDate);
      button.appendChild(dateCol);

      var bodyCol = document.createElement("div");
      bodyCol.className = "attendance-day__body";
      bodyCol.appendChild(renderDayHead(day.date, dayRecord, true, sessionEvent));
      appendDayContent(bodyCol, dayRecord, true);

      button.appendChild(bodyCol);
      list.appendChild(button);
    }

    dom.surface.appendChild(list);
  }

  function renderDayHead(date, dayRecord, isWeekView, sessionEvent) {
    var head = document.createElement("div");
    head.className = "attendance-day__head";

    if (!isWeekView) {
      var dayNumber = document.createElement("span");
      dayNumber.className = "attendance-day__number";
      dayNumber.textContent = String(date.getUTCDate());
      head.appendChild(dayNumber);
    }

    if (sessionEvent) {
      return head;
    }

    var count = document.createElement("span");
    count.className = "attendance-day__count";

    if (dayRecord.is_open) {
      var availableCount = Number(dayRecord.available_player_count || 0);
      count.textContent = availableCount > 0 ? availableCount + " giocatori" : "";
      count.setAttribute("aria-hidden", availableCount > 0 ? "false" : "true");
    } else {
      count.textContent = "";
      count.setAttribute("aria-hidden", "true");
    }

    if (count.textContent) {
      head.appendChild(count);
    }
    return head;
  }

  function appendDayContent(container, dayRecord, isWeekView) {
    var sessionEvent = getPrimarySessionEvent(dayRecord);
    if (sessionEvent) {
      appendSessionSummary(container, sessionEvent, isWeekView);
      return;
    }

    appendEventList(container, dayRecord.events || [], isWeekView);
    appendQuestProgressList(container, dayRecord.quest_progress || [], isWeekView);
  }

  function appendSessionSummary(container, sessionEvent, isWeekView) {
    var summary = document.createElement("span");
    summary.className = isWeekView ? "attendance-session-summary attendance-session-summary--week" : "attendance-session-summary";

    var time = document.createElement("span");
    time.className = "attendance-session-summary__time";
    time.textContent = getSessionTimeLabel(sessionEvent) || "Sessione";
    summary.appendChild(time);

    var questTitle = getSessionQuestTitle(sessionEvent);
    if (questTitle) {
      summary.setAttribute("aria-label", time.textContent + " — " + questTitle);
      summary.title = questTitle;
    }

    container.appendChild(summary);
  }

  function appendEventList(container, events, isWeekView) {
    if (!Array.isArray(events) || events.length === 0) {
      return;
    }

    var list = document.createElement("div");
    list.className = isWeekView ? "attendance-events attendance-events--week" : "attendance-events";

    for (var i = 0; i < events.length; i += 1) {
      var event = events[i] || {};
      var item = document.createElement("span");
      item.className = "attendance-event attendance-event--" + readString(event.event_type, "special");
      item.textContent = readString(event.title, "Evento");
      list.appendChild(item);
    }

    container.appendChild(list);
  }

  function appendQuestProgressList(container, questProgress, isWeekView) {
    if (!Array.isArray(questProgress) || questProgress.length === 0) {
      return;
    }

    var list = document.createElement("div");
    list.className = isWeekView
      ? "attendance-quest-progress-list attendance-quest-progress-list--week"
      : "attendance-quest-progress-list";

    for (var i = 0; i < questProgress.length; i += 1) {
      var progress = questProgress[i] || {};
      if (!isActiveQuestProgress(progress)) {
        continue;
      }

      var totalPlayers = Number(progress.total_players || 0);
      var availablePlayers = Number(progress.available_players || 0);

      var item = document.createElement("div");
      item.className = "attendance-quest-progress";

      var title = document.createElement("span");
      title.className = "attendance-quest-progress__title";
      title.textContent = readString(progress.quest_title, "Quest");

      var meta = document.createElement("span");
      meta.className = "attendance-quest-progress__meta";
      meta.textContent = availablePlayers + "/" + totalPlayers;

      var bar = document.createElement("progress");
      bar.className = "attendance-quest-progress__bar";
      bar.max = totalPlayers > 0 ? totalPlayers : 1;
      bar.value = availablePlayers;
      bar.setAttribute("aria-label", title.textContent + ": " + availablePlayers + " su " + totalPlayers + " disponibili");

      item.appendChild(title);
      item.appendChild(meta);
      item.appendChild(bar);
      list.appendChild(item);
    }

    if (list.children.length > 0) {
      container.appendChild(list);
    }
  }

  function isActiveQuestProgress(progress) {
    if (!progress) {
      return false;
    }

    var progressStatus =
      progress.quest_status ||
      progress.status ||
      progress.quest_state ||
      progress.state ||
      progress.mission_status;

    if (isCompletedQuestStatus(progressStatus)) {
      return false;
    }

    var refs = state.activeQuestRefs || createEmptyQuestRefs(false);
    if (!refs.isLoaded) {
      return true;
    }

    var questId = toStringOrEmpty(
      progress.quest_id ||
        progress.questId ||
        progress.mission_id ||
        progress.missionId
    );
    var questSlug = readString(progress.quest_slug || progress.slug || progress.mission_slug, "").toLowerCase();
    var questTitle = normalizeQuestTitle(
      progress.quest_title ||
        progress.title ||
        progress.quest_name ||
        progress.name ||
        progress.mission_title ||
        progress.mission_name
    );

    if (questId && refs.ids.has(questId)) {
      return true;
    }

    if (questSlug && refs.slugs.has(questSlug)) {
      return true;
    }

    if (questTitle && refs.titles.has(questTitle)) {
      return true;
    }

    return false;
  }

  function isCompletedQuestStatus(status) {
    var rawStatus = normalizeQuestStatus(status);

    if (!rawStatus) {
      return false;
    }

    return [
      "completata",
      "completato",
      "completate",
      "completed",
      "complete",
      "conclusa",
      "concluso",
      "concluse",
      "conclusi",
      "finished",
      "done",
      "archiviata",
      "archiviato",
      "archived",
      "chiusa",
      "chiuso",
      "closed",
    ].indexOf(rawStatus) !== -1;
  }

  function normalizeQuestStatus(value) {
    return readString(value, "")
      .toLowerCase()
      .replace(/ +/g, "-")
      .replace(/_/g, "-")
      .trim();
  }

  function normalizeQuestTitle(value) {
    return readString(value, "").toLowerCase().replace(/\s+/g, " ").trim();
  }

  function openDayActionMenu(isoDate, dayRecord, anchor, event) {
    closeDayActionMenu();

    if (!canInteractWithCalendar()) {
      return;
    }

    if (event && typeof event.stopPropagation === "function") {
      event.stopPropagation();
    }

    var menu = document.createElement("div");
    menu.className = "attendance-action-menu";
    menu.setAttribute("data-attendance-action-menu", "true");
    menu.setAttribute("role", "menu");
    menu.setAttribute("aria-label", "Azioni giornata " + formatIsoDateLabel(isoDate));

    var title = document.createElement("p");
    title.className = "attendance-action-menu__title";
    title.textContent = formatIsoDateLabel(isoDate);
    menu.appendChild(title);

    menu.appendChild(createActionMenuButton("Mostra presenti", "fa-users", false, function onShowPresentPlayers() {
      closeDayActionMenu();
      openPresentPlayersDialog(isoDate);
    }));

    if (canManageSessions()) {
      var separator = document.createElement("div");
      separator.className = "attendance-action-menu__separator";
      separator.setAttribute("aria-hidden", "true");
      menu.appendChild(separator);

      menu.appendChild(createActionMenuButton("Aggiungi sessione", "fa-calendar-plus", false, function onAddSession() {
        closeDayActionMenu();
        openSessionEventDialog(isoDate);
      }));

      var sessions = getSessionEvents(dayRecord);
      menu.appendChild(createActionMenuButton("Rimuovi sessione", "fa-calendar-xmark", sessions.length === 0, function onRemoveSession() {
        closeDayActionMenu();
        openRemoveSessionDialog(isoDate, sessions);
      }));

      menu.appendChild(createActionMenuButton(dayRecord.is_open ? "Blocca giorno" : "Sblocca giorno", dayRecord.is_open ? "fa-lock" : "fa-lock-open", false, function onToggleDay() {
        closeDayActionMenu();
        toggleDayOpenState(isoDate);
      }));
    }

    document.body.appendChild(menu);
    state.activeMenu = menu;
    positionActionMenu(menu, anchor, event);

    var firstButton = menu.querySelector("button:not(:disabled)");
    if (firstButton) {
      firstButton.focus();
    }
  }

  function createActionMenuButton(label, iconClass, disabled, handler) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "attendance-action-menu__button";
    button.setAttribute("role", "menuitem");
    button.disabled = disabled === true;

    var icon = document.createElement("i");
    icon.className = "fa-solid " + iconClass;
    icon.setAttribute("aria-hidden", "true");

    var text = document.createElement("span");
    text.textContent = label;

    button.appendChild(icon);
    button.appendChild(text);

    button.addEventListener("click", function onActionClick(event) {
      event.preventDefault();
      event.stopPropagation();

      if (!button.disabled) {
        handler();
      }
    });

    return button;
  }

  function positionActionMenu(menu, anchor, event) {
    var padding = 12;
    var rect = anchor && typeof anchor.getBoundingClientRect === "function" ? anchor.getBoundingClientRect() : null;
    var x = event && typeof event.clientX === "number" ? event.clientX : rect ? rect.left : padding;
    var y = event && typeof event.clientY === "number" ? event.clientY : rect ? rect.bottom : padding;

    menu.style.left = "0px";
    menu.style.top = "0px";

    var menuRect = menu.getBoundingClientRect();
    var nextX = Math.min(Math.max(padding, x), window.innerWidth - menuRect.width - padding);
    var nextY = Math.min(Math.max(padding, y), window.innerHeight - menuRect.height - padding);

    menu.style.left = nextX + "px";
    menu.style.top = nextY + "px";
  }

  function closeDayActionMenu() {
    if (!state.activeMenu) {
      return;
    }

    if (state.activeMenu.parentNode) {
      state.activeMenu.parentNode.removeChild(state.activeMenu);
    }

    state.activeMenu = null;
  }

  function getSessionEvents(dayRecord) {
    var events = dayRecord && Array.isArray(dayRecord.events) ? dayRecord.events : [];
    var sessions = [];

    for (var i = 0; i < events.length; i += 1) {
      var event = events[i] || {};
      if (readString(event.event_type, "") === "session") {
        sessions.push(event);
      }
    }

    return sessions;
  }

  function getPrimarySessionEvent(dayRecord) {
    var sessions = getSessionEvents(dayRecord);
    return sessions.length > 0 ? sessions[0] : null;
  }

  function buildDayTitle(date, sessionEvent) {
    var title = formatFullDate(date);
    if (!sessionEvent) {
      return title;
    }

    var time = getSessionTimeLabel(sessionEvent);
    var questTitle = getSessionQuestTitle(sessionEvent);
    var parts = [title, "Sessione"];

    if (time) {
      parts.push(time);
    }

    if (questTitle) {
      parts.push(questTitle);
    }

    return parts.join(" — ");
  }

  function applySessionBackground(element, sessionEvent) {
    var imageUrl = getSessionQuestImage(sessionEvent);
    if (!imageUrl) {
      return;
    }

    element.style.setProperty("--attendance-session-image", toCssBackgroundImage(imageUrl));
  }

  function getSessionQuestMeta(sessionEvent) {
    var questId = toStringOrEmpty(
      sessionEvent &&
        (sessionEvent.quest_id || sessionEvent.questId || sessionEvent.mission_id || sessionEvent.missionId)
    );
    var questSlug = readString(
      sessionEvent && (sessionEvent.quest_slug || sessionEvent.slug || sessionEvent.mission_slug),
      ""
    ).toLowerCase();
    var questTitle = normalizeQuestTitle(
      sessionEvent &&
        (sessionEvent.quest_title || sessionEvent.quest_name || sessionEvent.mission_title || sessionEvent.mission_name)
    );

    if (questId && state.questMetaById.has(questId)) {
      return state.questMetaById.get(questId);
    }

    if (questSlug && state.questMetaBySlug.has(questSlug)) {
      return state.questMetaBySlug.get(questSlug);
    }

    if (questTitle && state.questMetaByTitle.has(questTitle)) {
      return state.questMetaByTitle.get(questTitle);
    }

    return null;
  }

  function getSessionQuestTitle(sessionEvent) {
    var quest = getSessionQuestMeta(sessionEvent);
    return (
      readString(quest && quest.title, "") ||
      readString(sessionEvent && sessionEvent.quest_title, "") ||
      readString(sessionEvent && sessionEvent.quest_name, "") ||
      readString(sessionEvent && sessionEvent.mission_title, "") ||
      readString(sessionEvent && sessionEvent.mission_name, "") ||
      ""
    );
  }

  function getSessionQuestImage(sessionEvent) {
    var quest = getSessionQuestMeta(sessionEvent);
    return (
      readString(quest && quest.image_url, "") ||
      readString(sessionEvent && sessionEvent.quest_image_url, "") ||
      readString(sessionEvent && sessionEvent.image_url, "") ||
      readString(sessionEvent && sessionEvent.background_image_url, "") ||
      ""
    );
  }

  function getSessionTimeLabel(sessionEvent) {
    var raw =
      readString(sessionEvent && sessionEvent.session_time, "") ||
      readString(sessionEvent && sessionEvent.time, "") ||
      readString(sessionEvent && sessionEvent.starts_at, "") ||
      readString(sessionEvent && sessionEvent.start_time, "") ||
      readSessionTimeFromNote(sessionEvent && sessionEvent.note) ||
      readSessionTimeFromNote(sessionEvent && sessionEvent.event_note) ||
      readString(sessionEvent && sessionEvent.title, "");

    var match = String(raw || "").match(/([0-9]{1,2})[:.]([0-9]{2})/);
    if (!match) {
      return "";
    }

    var hour = Math.max(0, Math.min(23, Number(match[1])));
    return String(hour).padStart(2, "0") + ":" + match[2];
  }

  function readSessionTimeFromNote(value) {
    var raw = readString(value, "");
    if (!raw) {
      return "";
    }

    try {
      var parsed = JSON.parse(raw);
      return readString(parsed && (parsed.session_time || parsed.time || parsed.start_time), "");
    } catch (_error) {
      return raw;
    }
  }

  function toCssBackgroundImage(path) {
    var src = readString(path, "");
    if (!src) {
      return "none";
    }

    return 'url("' + src.split('"').join("%22").split(")").join("%29") + '")';
  }

  function openPresentPlayersDialog(isoDate) {
    closeEventDialog();
    state.isEventDialogOpen = true;

    var players = getPresentPlayers(isoDate);

    var backdrop = document.createElement("div");
    backdrop.className = "attendance-dialog-backdrop";
    backdrop.setAttribute("data-attendance-dialog", "true");

    var dialog = document.createElement("section");
    dialog.className = "attendance-dialog attendance-dialog--present-players";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "attendance-dialog-title");

    var title = document.createElement("h2");
    title.id = "attendance-dialog-title";
    title.className = "attendance-dialog__title";
    title.textContent = "Presenti confermati";

    var subtitle = document.createElement("p");
    subtitle.className = "attendance-dialog__subtitle";
    subtitle.textContent = formatIsoDateLabel(isoDate);

    var body = document.createElement("div");
    body.className = "attendance-dialog__body";

    renderPresentPlayersBody(body, players);

    var actions = document.createElement("div");
    actions.className = "attendance-dialog__actions";

    var closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "attendance-dialog__button attendance-dialog__button--primary";
    closeButton.textContent = "Chiudi";

    actions.appendChild(closeButton);

    dialog.appendChild(title);
    dialog.appendChild(subtitle);
    dialog.appendChild(body);
    dialog.appendChild(actions);
    backdrop.appendChild(dialog);
    document.body.appendChild(backdrop);

    closeButton.addEventListener("click", closeEventDialog);
    backdrop.addEventListener("click", function onBackdropClick(event) {
      if (event.target === backdrop) {
        closeEventDialog();
      }
    });

    hydratePresentPlayers(players).then(function onPresentPlayersHydrated(hydratedPlayers) {
      renderPresentPlayersBody(body, hydratedPlayers);
    }).catch(function onPresentPlayersHydrateError(error) {
      console.warn("Impossibile caricare i token dei presenti:", error);
    });

    closeButton.focus();
  }

  function renderPresentPlayersBody(body, players) {
    body.textContent = "";

    if (!Array.isArray(players) || players.length === 0) {
      var empty = document.createElement("p");
      empty.className = "attendance-dialog__empty";
      empty.textContent = "Nessun giocatore ha confermato la presenza per questa giornata.";
      body.appendChild(empty);
      return;
    }

    var list = document.createElement("ul");
    list.className = "attendance-present-list";

    for (var i = 0; i < players.length; i += 1) {
      list.appendChild(renderPresentPlayerItem(players[i] || {}));
    }

    body.appendChild(list);
  }

  function renderPresentPlayerItem(player) {
    var item = document.createElement("li");
    item.className = "attendance-present-list__item";

    var copy = document.createElement("span");
    copy.className = "attendance-present-list__copy";

    var name = document.createElement("strong");
    name.textContent = readString(player.display_name, "Giocatore");
    copy.appendChild(name);

    var characters = Array.isArray(player.characters) ? player.characters : [];
    var count = document.createElement("small");
    count.textContent = characters.length === 1 ? "1 personaggio" : characters.length + " personaggi";
    copy.appendChild(count);

    var tokens = document.createElement("span");
    tokens.className = "attendance-present-list__tokens";

    if (characters.length === 0) {
      tokens.appendChild(renderPresentCharacterToken(null));
    } else {
      for (var i = 0; i < characters.length; i += 1) {
        tokens.appendChild(renderPresentCharacterToken(characters[i] || null));
      }
    }

    item.appendChild(copy);
    item.appendChild(tokens);
    return item;
  }

  function renderPresentCharacterToken(character) {
    var token = document.createElement("span");
    token.className = "attendance-present-list__token";

    var characterName = readString(character && character.name, "Personaggio");
    token.title = characterName;
    token.setAttribute("aria-label", characterName);

    var sources = buildCharacterImageFallbackSources(character);
    var image = document.createElement("img");
    image.alt = characterName;
    image.dataset.sourceIndex = "0";
    image.src = sources[0];

    image.addEventListener("error", function onTokenError() {
      var currentIndex = Number(image.dataset.sourceIndex || 0);
      var nextIndex = currentIndex + 1;

      if (nextIndex >= sources.length) {
        return;
      }

      image.dataset.sourceIndex = String(nextIndex);
      image.src = sources[nextIndex];
    });

    token.appendChild(image);
    return token;
  }

  function buildCharacterImageFallbackSources(character) {
    var sources = [];
    var portraitUrl = normalizeAssetUrl(readString(character && character.portrait_url, ""));
    var tokenUrl = normalizeAssetUrl(readString(character && character.token_url, ""));

    if (portraitUrl) {
      sources.push(portraitUrl);
    }

    if (tokenUrl && tokenUrl !== portraitUrl) {
      sources.push(tokenUrl);
    }

    sources.push(FALLBACK_TOKEN_IMAGE);
    return sources;
  }

  function normalizeAssetUrl(value) {
    var src = readString(value, "");
    if (!src) {
      return "";
    }

    if (/^(data:|blob:|https?:\/\/|\/)/i.test(src)) {
      return src;
    }

    return src;
  }

  async function hydratePresentPlayers(players) {
    if (!Array.isArray(players) || players.length === 0) {
      return [];
    }

    var playerIds = [];
    var seen = new Set();

    for (var i = 0; i < players.length; i += 1) {
      var playerId = toStringOrEmpty(players[i] && players[i].player_id);
      if (playerId && !seen.has(playerId)) {
        seen.add(playerId);
        playerIds.push(playerId);
      }
    }

    if (playerIds.length === 0) {
      return players;
    }

    var charactersByPlayerId = await fetchCharactersByPlayerIds(playerIds);

    return players.map(function mapPresentPlayer(player) {
      var playerId = toStringOrEmpty(player && player.player_id);
      var characters = charactersByPlayerId.get(playerId) || [];

      return Object.assign({}, player, {
        characters: characters,
      });
    });
  }

  async function fetchCharactersByPlayerIds(playerIds) {
    if (!Array.isArray(playerIds) || playerIds.length === 0) {
      return new Map();
    }

    var params = [
      "select=" + encodeURIComponent(["id", "slug", "name", "portrait_url", "token_url", "player_id"].join(",")),
      "player_id=in.(" + encodeURIComponent(playerIds.join(",")) + ")",
      "order=name.asc",
    ];

    var url = SUPABASE_URL + "/rest/v1/characters?" + params.join("&");
    var payload = await getJson(url);
    var rows = Array.isArray(payload) ? payload : [];
    var map = new Map();

    for (var i = 0; i < rows.length; i += 1) {
      var row = rows[i] || {};
      var playerId = toStringOrEmpty(row.player_id);
      if (!playerId) {
        continue;
      }

      if (!map.has(playerId)) {
        map.set(playerId, []);
      }

      map.get(playerId).push(row);
    }

    return map;
  }

  function getPresentPlayers(isoDate) {
    var rows = state.availabilityRowsByDate.get(isoDate) || [];
    var seen = new Set();
    var players = [];

    for (var i = 0; i < rows.length; i += 1) {
      var row = rows[i] || {};
      var key = toStringOrEmpty(row.player_id) || readString(row.player_code, "") || readString(row.display_name, "");
      if (!key || seen.has(key)) {
        continue;
      }

      seen.add(key);
      players.push({
        player_id: toStringOrEmpty(row.player_id),
        display_name: readString(row.display_name, "Giocatore"),
      });
    }

    players.sort(function sortPlayers(a, b) {
      return readString(a.display_name, "").localeCompare(readString(b.display_name, ""), "it", {
        sensitivity: "base",
      });
    });

    return players;
  }

  async function openSessionEventDialog(isoDate) {
    if (state.isEventDialogOpen) {
      return;
    }

    state.isEventDialogOpen = true;

    try {
      var quests = await fetchQuests();
      renderSessionEventDialog(isoDate, quests);
    } catch (error) {
      console.error("Errore caricamento quest:", error);
      state.isEventDialogOpen = false;
      setFeedback("Impossibile caricare la lista quest.", "error");
    }
  }

  function openRemoveSessionDialog(isoDate, sessions) {
    if (!Array.isArray(sessions) || sessions.length === 0) {
      setFeedback("Nessuna sessione da rimuovere in questa giornata.", "error");
      return;
    }

    closeEventDialog();
    state.isEventDialogOpen = true;

    var backdrop = document.createElement("div");
    backdrop.className = "attendance-dialog-backdrop";
    backdrop.setAttribute("data-attendance-dialog", "true");

    var dialog = document.createElement("section");
    dialog.className = "attendance-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "attendance-dialog-title");

    var title = document.createElement("h2");
    title.id = "attendance-dialog-title";
    title.className = "attendance-dialog__title";
    title.textContent = "Rimuovi sessione";

    var subtitle = document.createElement("p");
    subtitle.className = "attendance-dialog__subtitle";
    subtitle.textContent = formatIsoDateLabel(isoDate);

    var form = document.createElement("form");
    form.className = "attendance-dialog__form";

    var label = document.createElement("label");
    label.className = "attendance-dialog__label";
    label.setAttribute("for", "attendance-dialog-session");
    label.textContent = "Sessione";

    var select = document.createElement("select");
    select.id = "attendance-dialog-session";
    select.className = "attendance-dialog__select";
    select.required = true;

    for (var i = 0; i < sessions.length; i += 1) {
      var session = sessions[i] || {};
      var eventId = getEventId(session);
      var option = document.createElement("option");
      option.value = eventId;
      option.disabled = !eventId;
      option.textContent = buildRemoveSessionOptionLabel(session) + (eventId ? "" : " — ID mancante");
      select.appendChild(option);
    }

    var actions = document.createElement("div");
    actions.className = "attendance-dialog__actions";

    var cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.className = "attendance-dialog__button attendance-dialog__button--ghost";
    cancelButton.textContent = "Annulla";

    var submitButton = document.createElement("button");
    submitButton.type = "submit";
    submitButton.className = "attendance-dialog__button attendance-dialog__button--primary";
    submitButton.textContent = "Rimuovi sessione";

    actions.appendChild(cancelButton);
    actions.appendChild(submitButton);

    form.appendChild(label);
    form.appendChild(select);
    form.appendChild(actions);

    dialog.appendChild(title);
    dialog.appendChild(subtitle);
    dialog.appendChild(form);
    backdrop.appendChild(dialog);
    document.body.appendChild(backdrop);

    cancelButton.addEventListener("click", closeEventDialog);
    backdrop.addEventListener("click", function onBackdropClick(event) {
      if (event.target === backdrop) {
        closeEventDialog();
      }
    });

    form.addEventListener("submit", function onDialogSubmit(event) {
      event.preventDefault();

      var eventId = readString(select.value, "");
      if (!eventId) {
        setFeedback("Sessione non rimovibile: ID mancante.", "error");
        return;
      }

      closeEventDialog();
      deleteSessionEvent(eventId);
    });

    select.focus();
  }

  function buildRemoveSessionOptionLabel(session) {
    var time = getSessionTimeLabel(session);
    var title = getSessionQuestTitle(session) || readString(session && session.title, "Sessione");

    if (time && title) {
      return time + " — " + title;
    }

    return title || time || "Sessione";
  }

  function getEventId(event) {
    if (!event) {
      return "";
    }

    return toStringOrEmpty(event.id || event.event_id || event.attendance_event_id);
  }

  function renderSessionEventDialog(isoDate, quests) {
    closeEventDialog();
    state.isEventDialogOpen = true;

    var backdrop = document.createElement("div");
    backdrop.className = "attendance-dialog-backdrop";
    backdrop.setAttribute("data-attendance-dialog", "true");

    var dialog = document.createElement("section");
    dialog.className = "attendance-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "attendance-dialog-title");

    var title = document.createElement("h2");
    title.id = "attendance-dialog-title";
    title.className = "attendance-dialog__title";
    title.textContent = "Crea sessione";

    var subtitle = document.createElement("p");
    subtitle.className = "attendance-dialog__subtitle";
    subtitle.textContent = formatIsoDateLabel(isoDate);

    var form = document.createElement("form");
    form.className = "attendance-dialog__form";

    var label = document.createElement("label");
    label.className = "attendance-dialog__label";
    label.setAttribute("for", "attendance-dialog-quest");
    label.textContent = "Quest";

    var select = document.createElement("select");
    select.id = "attendance-dialog-quest";
    select.className = "attendance-dialog__select";
    select.required = true;

    var placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Seleziona una quest";
    select.appendChild(placeholder);

    for (var i = 0; i < quests.length; i += 1) {
      var quest = quests[i] || {};
      var option = document.createElement("option");
      option.value = toStringOrEmpty(quest.id);
      option.textContent = readString(quest.title, "Quest senza titolo");
      select.appendChild(option);
    }

    var timeLabel = document.createElement("label");
    timeLabel.className = "attendance-dialog__label";
    timeLabel.setAttribute("for", "attendance-dialog-time");
    timeLabel.textContent = "Orario";

    var timeInput = document.createElement("input");
    timeInput.id = "attendance-dialog-time";
    timeInput.className = "attendance-dialog__input";
    timeInput.type = "time";
    timeInput.required = true;
    timeInput.value = "21:30";
    timeLabel.appendChild(timeInput);

    var actions = document.createElement("div");
    actions.className = "attendance-dialog__actions";

    var cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.className = "attendance-dialog__button attendance-dialog__button--ghost";
    cancelButton.textContent = "Annulla";

    var submitButton = document.createElement("button");
    submitButton.type = "submit";
    submitButton.className = "attendance-dialog__button attendance-dialog__button--primary";
    submitButton.textContent = "Crea sessione";

    actions.appendChild(cancelButton);
    actions.appendChild(submitButton);

    form.appendChild(label);
    form.appendChild(select);
    form.appendChild(timeLabel);
    form.appendChild(actions);

    dialog.appendChild(title);
    dialog.appendChild(subtitle);
    dialog.appendChild(form);
    backdrop.appendChild(dialog);
    document.body.appendChild(backdrop);

    cancelButton.addEventListener("click", closeEventDialog);
    backdrop.addEventListener("click", function onBackdropClick(event) {
      if (event.target === backdrop) {
        closeEventDialog();
      }
    });

    form.addEventListener("submit", function onDialogSubmit(event) {
      event.preventDefault();

      var questId = readString(select.value, "");
      if (!questId) {
        setFeedback("Seleziona una quest.", "error");
        return;
      }

      var sessionTime = readString(timeInput.value, "");
      if (!sessionTime) {
        setFeedback("Specifica un orario.", "error");
        return;
      }

      closeEventDialog();
      createSessionEvent(isoDate, questId, sessionTime);
    });

    select.focus();
  }

  function closeEventDialog() {
    closeDayActionMenu();

    var existing = document.querySelector("[data-attendance-dialog]");
    if (existing && existing.parentNode) {
      existing.parentNode.removeChild(existing);
    }

    state.isEventDialogOpen = false;
  }

  function syncViewModeClasses() {
    if (dom.calendarSection) {
      dom.calendarSection.classList.toggle("attendance-calendar--week", state.viewMode === "week");
      dom.calendarSection.classList.toggle("attendance-calendar--dm", canManageSessions());
    }

    if (dom.surface) {
      dom.surface.classList.toggle("attendance-calendar__surface--week", state.viewMode === "week");
    }
  }

  function normalizeDayRows(rows) {
    var normalized = [];

    for (var i = 0; i < rows.length; i += 1) {
      var row = rows[i] || {};
      normalized.push({
        available_on: readString(row.available_on, ""),
        is_open: row.is_open === true,
        dm_player_id: row.dm_player_id,
        dm_display_name: row.dm_display_name,
        day_note: row.day_note,
        available_player_count: Number(row.available_player_count || 0),
        quest_progress: normalizeJsonArray(row.quest_progress),
        events: normalizeJsonArray(row.events),
      });
    }

    return normalized;
  }

  function normalizeJsonArray(value) {
    if (Array.isArray(value)) {
      return value;
    }

    if (typeof value === "string") {
      try {
        var parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch (_error) {
        return [];
      }
    }

    return [];
  }

  function getDayRecord(isoDate) {
    var rows = state.dayRowsByDate.get(isoDate) || [];

    if (rows.length > 0) {
      return rows[0];
    }

    return {
      available_on: isoDate,
      is_open: false,
      dm_player_id: null,
      dm_display_name: null,
      day_note: null,
      available_player_count: 0,
      quest_progress: [],
      events: [],
    };
  }

  function hasPlayerAvailabilityOn(isoDate) {
    if (!state.player) {
      return false;
    }

    var dayRows = state.availabilityRowsByDate.get(isoDate) || [];
    var playerId = toStringOrEmpty(state.player.id);

    for (var i = 0; i < dayRows.length; i += 1) {
      if (toStringOrEmpty(dayRows[i] && dayRows[i].player_id) === playerId) {
        return true;
      }
    }

    return false;
  }

  function canInteractWithCalendar() {
    return Boolean(state.player);
  }

  function canManageSessions() {
    if (!state.player) {
      return false;
    }

    var role = readString(state.player.role, "").toLowerCase();
    var canManageSessions = state.player.can_manage_sessions;

    return (
      canManageSessions === true ||
      canManageSessions === "true" ||
      role === "admin" ||
      role === "dm"
    );
  }

  function updateViewButtons() {
    for (var i = 0; i < dom.viewButtons.length; i += 1) {
      var button = dom.viewButtons[i];
      var view = button.getAttribute("data-attendance-view");
      var isActive = view === state.viewMode;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    }
  }

  function updateRangeLabel() {
    if (!dom.rangeLabel || !state.periodStart || !state.periodEnd) {
      return;
    }

    if (state.viewMode === "month") {
      dom.rangeLabel.textContent = formatMonthRange(startOfMonthUTC(state.cursor));
      return;
    }

    dom.rangeLabel.textContent =
      "Settimana: " + formatShortDate(state.periodStart) + " - " + formatShortDate(state.periodEnd);
  }

  function shiftPeriod(step) {
    if (state.viewMode === "month") {
      state.cursor = new Date(Date.UTC(state.cursor.getUTCFullYear(), state.cursor.getUTCMonth() + step, 1));
    } else {
      state.cursor = addDaysUTC(state.cursor, step * 7);
    }

    loadCalendarRange();
  }

  function setPlayerStatus(message, kind) {
    if (!dom.playerStatus) {
      return;
    }

    dom.playerStatus.textContent = message;
    dom.playerStatus.classList.remove("is-valid", "is-error");

    if (kind === "valid") {
      dom.playerStatus.classList.add("is-valid");
    } else if (kind === "error") {
      dom.playerStatus.classList.add("is-error");
    }
  }

  function setFeedback(message, kind) {
    if (!dom.feedback) {
      return;
    }

    dom.feedback.textContent = message;
    dom.feedback.classList.remove("is-success", "is-error");

    if (kind === "success") {
      dom.feedback.classList.add("is-success");
    } else if (kind === "error") {
      dom.feedback.classList.add("is-error");
    }
  }

  function groupRowsByDay(rows) {
    var grouped = new Map();

    for (var i = 0; i < rows.length; i += 1) {
      var row = rows[i] || {};
      var day = readString(row.available_on, "");
      if (!day) {
        continue;
      }

      if (!grouped.has(day)) {
        grouped.set(day, []);
      }

      grouped.get(day).push(row);
    }

    return grouped;
  }

  function buildDisplayedDays(cursor, viewMode) {
    var days = [];

    if (viewMode === "week") {
      var weekStart = startOfWeekUTC(cursor);

      for (var i = 0; i < 7; i += 1) {
        days.push({
          date: addDaysUTC(weekStart, i),
          inCurrentPeriod: true,
        });
      }

      return days;
    }

    var monthStart = startOfMonthUTC(cursor);
    var monthEnd = endOfMonthUTC(cursor);
    var gridStart = isMobileCalendarViewport() ? monthStart : startOfWeekUTC(monthStart);
    var gridEnd = isMobileCalendarViewport() ? monthEnd : endOfWeekUTC(monthEnd);
    var total = diffDaysUTC(gridStart, gridEnd) + 1;

    for (var d = 0; d < total; d += 1) {
      var date = addDaysUTC(gridStart, d);
      days.push({
        date: date,
        inCurrentPeriod: date.getUTCMonth() === monthStart.getUTCMonth(),
      });
    }

    return days;
  }

  function computeCalendarRange(cursor, viewMode) {
    if (viewMode === "week") {
      var weekStart = startOfWeekUTC(cursor);
      return {
        start: weekStart,
        end: addDaysUTC(weekStart, 6),
      };
    }

    var monthStart = startOfMonthUTC(cursor);
    var monthEnd = endOfMonthUTC(cursor);

    if (isMobileCalendarViewport()) {
      return {
        start: monthStart,
        end: monthEnd,
      };
    }

    return {
      start: startOfWeekUTC(monthStart),
      end: endOfWeekUTC(monthEnd),
    };
  }

  function getTodayUTC() {
    var now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  }

  function startOfWeekUTC(date) {
    var current = cloneUTCDate(date);
    var weekday = current.getUTCDay();
    var offset = weekday === 0 ? -6 : 1 - weekday;
    return addDaysUTC(current, offset);
  }

  function endOfWeekUTC(date) {
    return addDaysUTC(startOfWeekUTC(date), 6);
  }

  function startOfMonthUTC(date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  }

  function endOfMonthUTC(date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
  }

  function addDaysUTC(date, amount) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + amount));
  }

  function cloneUTCDate(date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  }

  function diffDaysUTC(start, end) {
    var startMs = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
    var endMs = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
    return Math.round((endMs - startMs) / 86400000);
  }

  function toISODate(date) {
    var y = String(date.getUTCFullYear());
    var m = String(date.getUTCMonth() + 1).padStart(2, "0");
    var d = String(date.getUTCDate()).padStart(2, "0");
    return y + "-" + m + "-" + d;
  }

  function formatMonthRange(date) {
    return new Intl.DateTimeFormat("it-IT", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(date);
  }

  function formatShortDate(date) {
    return new Intl.DateTimeFormat("it-IT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(date);
  }

  function formatFullDate(date) {
    return new Intl.DateTimeFormat("it-IT", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(date);
  }

  function formatWeekdayLabel(date) {
    var value = new Intl.DateTimeFormat("it-IT", {
      weekday: "long",
      timeZone: "UTC",
    }).format(date);

    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function formatDayMonth(date) {
    return new Intl.DateTimeFormat("it-IT", {
      day: "2-digit",
      month: "long",
      timeZone: "UTC",
    }).format(date);
  }

  function formatCalendarCellWeekdayLabel(date) {
    return new Intl.DateTimeFormat("it-IT", {
      weekday: "long",
      timeZone: "UTC",
    }).format(date);
  }

  function formatCalendarCellNumericDate(date) {
    return new Intl.DateTimeFormat("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "UTC",
    }).format(date);
  }

  function readDayButtonIso(dayButton) {
    if (!dayButton) {
      return "";
    }

    return readString(dayButton.getAttribute("data-attendance-iso"), "") || readString(dayButton.getAttribute("data-attendance-day"), "");
  }

  function isMobileCalendarViewport() {
    return typeof window.matchMedia === "function" && window.matchMedia("(max-width: 720px)").matches;
  }

  function enforceMobileMonthView() {
    if (!isMobileCalendarViewport() || state.viewMode === "month") {
      return false;
    }

    state.viewMode = "month";
    return true;
  }

  function formatIsoDateLabel(isoDate) {
    var parts = isoDate.split("-");
    if (parts.length !== 3) {
      return isoDate;
    }

    var date = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
    return formatFullDate(date);
  }

  async function getJson(url) {
    var response = await fetch(url, {
      method: "GET",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: "Bearer " + SUPABASE_ANON_KEY,
      },
    });

    var parsed = await parseJsonResponse(response);

    if (!response.ok) {
      throw new Error(readSupabaseError(parsed, response.status));
    }

    return parsed;
  }

  async function postJson(url, payload) {
    var response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: "Bearer " + SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(payload),
    });

    var parsed = await parseJsonResponse(response);

    if (!response.ok) {
      throw new Error(readSupabaseError(parsed, response.status));
    }

    return parsed;
  }

  async function parseJsonResponse(response) {
    var raw = await response.text();

    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw);
    } catch (_error) {
      return null;
    }
  }

  function readSupabaseError(payload, statusCode) {
    var errorText =
      (payload && (payload.message || payload.error || payload.details)) ||
      "Richiesta non completata (" + statusCode + ").";

    return String(errorText);
  }

  function readAccessCode() {
    try {
      return readString(localStorage.getItem(ACCESS_CODE_KEY), "");
    } catch (_error) {
      return "";
    }
  }

  function readString(value, fallback) {
    return typeof value === "string" && value.trim() !== "" ? value.trim() : fallback;
  }

  function toStringOrEmpty(value) {
    return value === null || value === undefined ? "" : String(value);
  }
})();
