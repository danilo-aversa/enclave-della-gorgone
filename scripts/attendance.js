(function () {
  "use strict";

  var SUPABASE_URL = "https://atglgaritxzowshenaqr.supabase.co";
  var SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0Z2xnYXJpdHh6b3dzaGVuYXFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NzcxNDQsImV4cCI6MjA5MjM1MzE0NH0.ObDvvWMkddZL8wABKyI-TBi4KgVoYArJQjoOnAmVVe8";

  var ACCESS_CODE_KEY = "gorgoneAccessCode";
  var UPSERT_AVAILABILITY_ENDPOINT = SUPABASE_URL + "/functions/v1/upsert-availability";

  var FALLBACK_PORTRAIT =
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' fill='%23162229'/><circle cx='32' cy='24' r='12' fill='%234db8a6'/><rect x='14' y='40' width='36' height='16' fill='%233b5865'/></svg>";

  var WEEKDAY_SHORT_IT = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

  var state = {
    viewMode: "month",
    cursor: getTodayUTC(),
    periodStart: null,
    periodEnd: null,
    rows: [],
    rowsByDate: new Map(),
    playerCode: "",
    player: null,
    playerCharacters: [],
    isLoading: false,
    isSaving: false,
  };

  var dom = {};

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

    if (!dom.surface || !dom.playerStatus) {
      return;
    }

    bindEvents();
    syncProfileFromLayout();
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

    for (var i = 0; i < dom.viewButtons.length; i += 1) {
      dom.viewButtons[i].addEventListener("click", function onViewClick() {
        var nextView = this.getAttribute("data-attendance-view");
        if (!nextView || nextView === state.viewMode) {
          return;
        }

        state.viewMode = nextView === "week" ? "week" : "month";
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

    if (dom.todayButton) {
      dom.todayButton.addEventListener("click", function onTodayClick() {
        state.cursor = getTodayUTC();
        loadCalendarRange();
      });
    }

    dom.surface.addEventListener("click", function onDayClick(event) {
      var target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      var dayButton = target.closest("[data-attendance-day]");
      if (!dayButton || dayButton.disabled) {
        return;
      }

      var isoDate = readString(dayButton.getAttribute("data-attendance-day"), "");
      if (!isoDate) {
        return;
      }

      toggleAvailability(isoDate);
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
    setPlayerStatus("Profilo attivo: " + label + ". Clicca un giorno per aggiornare.", "valid");
    setFeedback("", "");
  }

  function clearPlayerState() {
    state.playerCode = "";
    state.player = null;
    state.playerCharacters = [];
    setPlayerStatus("Accedi dal profilo per segnare le disponibilita.", "");
  }

  async function loadCalendarRange() {
    var range = computeCalendarRange(state.cursor, state.viewMode);
    state.periodStart = range.start;
    state.periodEnd = range.end;

    updateViewButtons();
    updateRangeLabel();

    state.isLoading = true;
    renderLoadingState();

    try {
      var rows = await fetchAvailabilityRange(toISODate(range.start), toISODate(range.end));
      state.rows = rows;
      state.rowsByDate = groupRowsByDay(rows);
      renderCalendar();
      setFeedback("", "");
    } catch (error) {
      console.error("Errore caricamento disponibilita:", error);
      state.rows = [];
      state.rowsByDate = new Map();
      renderCalendarError("Impossibile caricare il calendario disponibilita.");
    } finally {
      state.isLoading = false;
    }
  }

  async function fetchAvailabilityRange(startIso, endIso) {
    var params = [
      "select=" +
        encodeURIComponent(
          [
            "available_on",
            "player_id",
            "display_name",
            "player_code",
            "character_id",
            "character_slug",
            "character_name",
            "portrait_url",
          ].join(",")
        ),
      "available_on=gte." + encodeURIComponent(startIso),
      "available_on=lte." + encodeURIComponent(endIso),
      "order=available_on.asc",
    ];

    var url = SUPABASE_URL + "/rest/v1/v_player_availability_calendar?" + params.join("&");

    var response = await fetch(url, {
      method: "GET",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: "Bearer " + SUPABASE_ANON_KEY,
      },
    });

    var payload = await parseJsonResponse(response);

    if (!response.ok) {
      throw new Error(readSupabaseError(payload, response.status));
    }

    if (!Array.isArray(payload)) {
      return [];
    }

    return payload;
  }

  async function toggleAvailability(isoDate) {
    if (!canInteractWithCalendar() || state.isSaving) {
      return;
    }

    var playerCode = state.playerCode || readAccessCode();
    if (!playerCode) {
      setPlayerStatus("Accedi dal profilo per segnare le disponibilita.", "error");
      return;
    }

    var wasAvailable = hasPlayerAvailabilityOn(isoDate);

    state.isSaving = true;
    setFeedback("Aggiornamento disponibilita in corso...", "");

    try {
      if (!wasAvailable) {
        await saveAvailabilityState(playerCode, isoDate, "available");
        await loadCalendarRange();
        setFeedback("Disponibilita aggiornata.", "success");
      } else {
        var removed = await removeAvailabilityState(playerCode, isoDate);
        await loadCalendarRange();

        if (removed || !hasPlayerAvailabilityOn(isoDate)) {
          setFeedback("Disponibilita rimossa.", "success");
        } else {
          setFeedback("Impossibile rimuovere la disponibilita per questa data.", "error");
        }
      }
    } catch (error) {
      console.error("Errore aggiornamento disponibilita:", error);
      setFeedback("Impossibile aggiornare la disponibilita.", "error");
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
      throw new Error("Aggiornamento disponibilita non riuscito.");
    }
  }

  async function removeAvailabilityState(playerCode, isoDate) {
    await saveAvailabilityState(playerCode, isoDate, "unavailable");
    await loadCalendarRange();

    if (!hasPlayerAvailabilityOn(isoDate)) {
      return true;
    }

    if (!state.player || !state.player.id) {
      return false;
    }

    var didDelete = await deleteAvailabilityViaRest(state.player.id, isoDate);

    if (!didDelete) {
      return false;
    }

    await loadCalendarRange();
    return !hasPlayerAvailabilityOn(isoDate);
  }

  async function deleteAvailabilityViaRest(playerId, isoDate) {
    var queryParts = [
      "player_id=eq." + encodeURIComponent(String(playerId)),
      "available_on=eq." + encodeURIComponent(isoDate),
    ];

    var url = SUPABASE_URL + "/rest/v1/player_availability?" + queryParts.join("&");

    var response = await fetch(url, {
      method: "DELETE",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: "Bearer " + SUPABASE_ANON_KEY,
        Prefer: "return=minimal",
      },
    });

    if (response.ok) {
      return true;
    }

    var payload = await parseJsonResponse(response);
    console.warn("Delete player_availability fallita:", readSupabaseError(payload, response.status));
    return false;
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
    loading.textContent = "Caricamento disponibilita...";
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
      var dayRows = state.rowsByDate.get(isoDate) || [];
      var characterEntries = collectUniqueCharacterEntries(dayRows);
      var playerAvailable = hasPlayerAvailabilityOn(isoDate);
      var isViable = characterEntries.length >= 3;

      var button = document.createElement("button");
      button.type = "button";
      button.className = "attendance-day";
      button.setAttribute("data-attendance-day", isoDate);

      if (!day.inCurrentPeriod) {
        button.classList.add("attendance-day--other");
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

      if (canInteractWithCalendar()) {
        button.classList.add("attendance-day--interactive");
      } else {
        button.disabled = true;
      }

      button.title = formatFullDate(day.date);

      var head = document.createElement("div");
      head.className = "attendance-day__head";

      var dayNumber = document.createElement("span");
      dayNumber.className = "attendance-day__number";
      dayNumber.textContent = String(day.date.getUTCDate());

      var count = document.createElement("span");
      count.className = "attendance-day__count";
      count.textContent = characterEntries.length ? characterEntries.length + " disp." : "";

      head.appendChild(dayNumber);
      head.appendChild(count);
      button.appendChild(head);

      if (characterEntries.length) {
        var tokens = document.createElement("div");
        tokens.className = "attendance-day__tokens";

        for (var t = 0; t < characterEntries.length; t += 1) {
          var tokenWrap = document.createElement("span");
          tokenWrap.className = "attendance-day__token";

          var img = document.createElement("img");
          img.src = readString(characterEntries[t].portrait_url, FALLBACK_PORTRAIT);
          img.alt = readString(characterEntries[t].character_name, "Personaggio disponibile");
          img.title = img.alt;
          attachImageFallback(img, FALLBACK_PORTRAIT);

          tokenWrap.appendChild(img);
          tokens.appendChild(tokenWrap);
        }

        button.appendChild(tokens);
      }

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
      var dayRows = state.rowsByDate.get(isoDate) || [];
      var characterEntries = collectUniqueCharacterEntries(dayRows);
      var playerAvailable = hasPlayerAvailabilityOn(isoDate);
      var isViable = characterEntries.length >= 3;

      var button = document.createElement("button");
      button.type = "button";
      button.className = "attendance-day attendance-day--week";
      button.setAttribute("data-attendance-day", isoDate);

      if (isoDate === todayIso) {
        button.classList.add("attendance-day--today");
      }

      if (isViable) {
        button.classList.add("attendance-day--viable");
      }

      if (playerAvailable) {
        button.classList.add("attendance-day--mine");
      }

      if (canInteractWithCalendar()) {
        button.classList.add("attendance-day--interactive");
      } else {
        button.disabled = true;
      }

      button.title = formatFullDate(day.date);

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

      var head = document.createElement("div");
      head.className = "attendance-day__head";

      var count = document.createElement("span");
      count.className = "attendance-day__count";
      count.textContent = characterEntries.length ? characterEntries.length + " disponibili" : "";
      head.appendChild(count);
      bodyCol.appendChild(head);

      if (characterEntries.length) {
        var tokens = document.createElement("div");
        tokens.className = "attendance-day__tokens attendance-day__tokens--week";

        for (var t = 0; t < characterEntries.length; t += 1) {
          var tokenWrap = document.createElement("span");
          tokenWrap.className = "attendance-day__token attendance-day__token--week";

          var img = document.createElement("img");
          img.src = readString(characterEntries[t].portrait_url, FALLBACK_PORTRAIT);
          img.alt = readString(characterEntries[t].character_name, "Personaggio disponibile");
          img.title = img.alt;
          attachImageFallback(img, FALLBACK_PORTRAIT);

          tokenWrap.appendChild(img);
          tokens.appendChild(tokenWrap);
        }

        bodyCol.appendChild(tokens);
      }

      button.appendChild(bodyCol);
      list.appendChild(button);
    }

    dom.surface.appendChild(list);
  }

  function syncViewModeClasses() {
    if (dom.calendarSection) {
      dom.calendarSection.classList.toggle("attendance-calendar--week", state.viewMode === "week");
    }

    if (dom.surface) {
      dom.surface.classList.toggle("attendance-calendar__surface--week", state.viewMode === "week");
    }
  }

  function collectUniqueCharacterEntries(rows) {
    var unique = new Map();

    for (var i = 0; i < rows.length; i += 1) {
      var row = rows[i] || {};
      var key =
        readString(toStringOrEmpty(row.character_id), "") ||
        readString(row.character_slug, "") ||
        readString(toStringOrEmpty(row.player_id), "") ||
        "entry-" + i;

      if (!unique.has(key)) {
        unique.set(key, row);
      }
    }

    return Array.from(unique.values());
  }

  function hasPlayerAvailabilityOn(isoDate) {
    if (!state.player) {
      return false;
    }

    var dayRows = state.rowsByDate.get(isoDate) || [];
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
    var gridStart = startOfWeekUTC(monthStart);
    var gridEnd = endOfWeekUTC(monthEnd);
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

  function attachImageFallback(image, fallbackSrc) {
    image.addEventListener("error", function onImageError() {
      if (image.dataset.fallbackApplied === "true") {
        return;
      }

      image.dataset.fallbackApplied = "true";
      image.src = fallbackSrc;
    });
  }

  function readString(value, fallback) {
    return typeof value === "string" && value.trim() !== "" ? value.trim() : fallback;
  }

  function toStringOrEmpty(value) {
    return value === null || value === undefined ? "" : String(value);
  }
})();
