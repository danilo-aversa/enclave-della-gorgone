(function () {
  "use strict";

  var SUPABASE_URL = "https://atglgaritxzowshenaqr.supabase.co";
  var SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0Z2xnYXJpdHh6b3dzaGVuYXFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NzcxNDQsImV4cCI6MjA5MjM1MzE0NH0.ObDvvWMkddZL8wABKyI-TBi4KgVoYArJQjoOnAmVVe8";
  var UPSERT_QUEST_ENDPOINT =
    "https://atglgaritxzowshenaqr.supabase.co/functions/v1/upsert-quest";
  var IMPORT_SECRET = "Gorgone-Import-9f4kLm2Qx7pR8vT1zA";
  var QUEST_MODAL_CREATE = "create";
  var QUEST_MODAL_EDIT = "edit";

  var FALLBACK_TOKEN_IMAGE =
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' fill='%23162229'/><circle cx='32' cy='24' r='12' fill='%234db8a6'/><rect x='14' y='40' width='36' height='16' fill='%233b5865'/></svg>";

  var initialized = false;

  document.addEventListener("DOMContentLoaded", tryInitQuestImportModal);
  document.addEventListener("enclave:sidebar-ready", tryInitQuestImportModal);

  function tryInitQuestImportModal() {
    if (initialized) {
      return;
    }
    var elements = {
      openButtons: document.querySelectorAll("[data-quest-import-action]"),
      modal: document.querySelector("[data-quest-modal]"),
      closeBackdrop: document.querySelector("[data-quest-modal-close]"),
      cancelButton: document.querySelector("[data-quest-cancel]"),
      form: document.querySelector("[data-quest-form]"),
      titleInput: document.querySelector("[data-quest-title]"),
      slugInput: document.querySelector("[data-quest-slug-input]"),
      typeInput: document.querySelector("[data-quest-type]"),
      statusInput: document.querySelector("[data-quest-status-input]"),
      imageInput: document.querySelector("[data-quest-image]"),
      locationInput: document.querySelector("[data-quest-location]"),
      summaryInput: document.querySelector("[data-quest-summary]"),
      briefingInput: document.querySelector("[data-quest-briefing]"),
      reportInput: document.querySelector("[data-quest-report]"),
      objectivePrimaryInput: document.querySelector("[data-quest-objective-primary]"),
      objectiveSecondaryInput: document.querySelector("[data-quest-objective-secondary]"),
      notesInput: document.querySelector("[data-quest-notes]"),
      lastSessionInput: document.querySelector("[data-quest-last-session]"),
      nextSessionInput: document.querySelector("[data-quest-next-session]"),
      teamSearchInput: document.querySelector("[data-quest-team-search]"),
      teamList: document.querySelector("[data-quest-team-list]"),
      submitButton: document.querySelector("[data-quest-submit]"),
      status: document.querySelector("[data-quest-status]"),
      modalTitle: document.querySelector("#quest-modal-title"),
    };

    if (!elements.modal || !elements.form) {
      return;
    }

    if (!elements.openButtons || !elements.openButtons.length) {
      return;
    }

    initialized = true;

    var state = {
      characters: [],
      selectedCharacterIds: new Set(),
      slugLocked: false,
      loadingCharacters: false,
      mode: QUEST_MODAL_CREATE,
      originalSlug: "",
    };

    bindOpenButtons(elements, state);
    bindExternalOpenEditor(elements, state);
    bindCloseHandlers(elements, state);
    bindSlugBehavior(elements, state);
    bindTeamSearch(elements, state);

    elements.form.addEventListener("submit", function onSubmit(event) {
      event.preventDefault();
      submitQuest(elements, state);
    });
  }

  function bindOpenButtons(elements, state) {
    for (var i = 0; i < elements.openButtons.length; i += 1) {
      elements.openButtons[i].addEventListener("click", function onOpenClick(event) {
        event.preventDefault();

        if (event.currentTarget.disabled) {
          return;
        }

        openModal(elements, state, { mode: QUEST_MODAL_CREATE });
      });
    }
  }

  function bindExternalOpenEditor(elements, state) {
    document.addEventListener("enclave:open-quest-editor", function onOpenEditor(event) {
      var detail = event && event.detail ? event.detail : null;
      if (!detail || typeof detail !== "object") {
        return;
      }

      var quest = detail.quest && typeof detail.quest === "object" ? detail.quest : detail;
      if (!quest || typeof quest !== "object") {
        return;
      }

      openModal(elements, state, {
        mode: QUEST_MODAL_EDIT,
        quest: quest,
        characterIds: readCharacterIdsFromDetail(detail, quest),
      });
    });
  }

  function bindCloseHandlers(elements, state) {
    if (elements.closeBackdrop) {
      elements.closeBackdrop.addEventListener("click", function onBackdropClick() {
        closeModal(elements, state);
      });
    }

    if (elements.cancelButton) {
      elements.cancelButton.addEventListener("click", function onCancelClick() {
        closeModal(elements, state);
      });
    }

    document.addEventListener("keydown", function onEscape(event) {
      if (event.key !== "Escape" || elements.modal.hidden) {
        return;
      }

      closeModal(elements, state);
    });
  }

  function bindSlugBehavior(elements, state) {
    if (!elements.titleInput || !elements.slugInput) {
      return;
    }

    elements.titleInput.addEventListener("input", function onTitleInput() {
      if (!state.slugLocked) {
        elements.slugInput.value = slugify(elements.titleInput.value);
      }
    });

    elements.slugInput.addEventListener("input", function onSlugInput() {
      var current = slugify(elements.slugInput.value);
      elements.slugInput.value = current;

      var fromTitle = slugify(elements.titleInput.value);
      state.slugLocked = current !== "" && current !== fromTitle;
    });
  }

  function bindTeamSearch(elements, state) {
    if (!elements.teamSearchInput) {
      return;
    }

    elements.teamSearchInput.addEventListener("input", function onSearch() {
      renderTeamOptions(elements, state);
    });
  }

  async function openModal(elements, state, options) {
    var mode = options && options.mode === QUEST_MODAL_EDIT ? QUEST_MODAL_EDIT : QUEST_MODAL_CREATE;
    var quest = options && options.quest ? options.quest : null;
    var characterIds = options && Array.isArray(options.characterIds) ? options.characterIds : [];

    elements.modal.hidden = false;
    setStatus(elements, "", "");
    setModalMode(elements, state, mode);

    if (elements.form) {
      elements.form.reset();
    }

    state.selectedCharacterIds = new Set();
    state.originalSlug = "";
    state.slugLocked = false;

    if (mode === QUEST_MODAL_EDIT && quest) {
      applyQuestDataToForm(elements, state, quest, characterIds);
    }

    await loadCharacters(elements, state);

    if (elements.titleInput) {
      elements.titleInput.focus();
    }
  }

  function closeModal(elements, state) {
    elements.modal.hidden = true;

    if (elements.form) {
      elements.form.reset();
    }

    setModalMode(elements, state, QUEST_MODAL_CREATE);
    state.slugLocked = false;
    state.selectedCharacterIds = new Set();
    state.originalSlug = "";
    setStatus(elements, "", "");
  }

  async function loadCharacters(elements, state) {
    if (!elements.teamList) {
      return;
    }

    if (state.characters.length) {
      renderTeamOptions(elements, state);
      return;
    }

    if (state.loadingCharacters) {
      return;
    }

    state.loadingCharacters = true;
    elements.teamList.innerHTML = "<p class=\"quest-loading\">Caricamento personaggi...</p>";

    try {
      state.characters = await fetchCharacters();
      renderTeamOptions(elements, state);
    } catch (error) {
      console.warn("Errore caricamento personaggi per missione:", error);
      elements.teamList.innerHTML =
        "<p class=\"quest-empty\">Impossibile caricare i personaggi.</p>";
    } finally {
      state.loadingCharacters = false;
    }
  }

  async function fetchCharacters() {
    var url =
      SUPABASE_URL +
      "/rest/v1/characters?select=" +
      encodeURIComponent("id,slug,name,portrait_url,token_url,class_name,subclass_name,level") +
      "&order=name.asc";

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

    if (!Array.isArray(payload)) {
      throw new Error("Risposta personaggi non valida.");
    }

    return payload;
  }

  function renderTeamOptions(elements, state) {
    if (!elements.teamList) {
      return;
    }

    var query = elements.teamSearchInput ? elements.teamSearchInput.value.trim().toLowerCase() : "";

    var filtered = state.characters.filter(function (character) {
      var name = readString(character && character.name, "").toLowerCase();
      return !query || name.indexOf(query) !== -1;
    });

    if (!filtered.length) {
      elements.teamList.innerHTML = "<p class=\"quest-empty\">Nessun personaggio trovato.</p>";
      return;
    }

    var fragment = document.createDocumentFragment();

    for (var i = 0; i < filtered.length; i += 1) {
      var character = filtered[i];
      var id = character && character.id;
      if (id === null || id === undefined) {
        continue;
      }

      var key = String(id);

      var option = document.createElement("label");
      option.className = "quest-team-option";

      var checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = key;
      checkbox.className = "quest-team-option__check";
      checkbox.checked = state.selectedCharacterIds.has(key);

      checkbox.addEventListener("change", function onToggle(event) {
        if (event.currentTarget.checked) {
          state.selectedCharacterIds.add(event.currentTarget.value);
          return;
        }

        state.selectedCharacterIds.delete(event.currentTarget.value);
      });

      var avatar = document.createElement("img");
      avatar.className = "quest-team-option__avatar";
      avatar.src =
        readString(character.portrait_url, "") ||
        readString(character.token_url, "") ||
        FALLBACK_TOKEN_IMAGE;
      avatar.alt = "";
      attachImageFallback(avatar, FALLBACK_TOKEN_IMAGE);

      var info = document.createElement("span");
      info.className = "quest-team-option__info";

      var name = document.createElement("strong");
      name.textContent = readString(character.name, "Personaggio");

      var meta = document.createElement("small");
      meta.textContent = buildCharacterMeta(character);

      info.appendChild(name);
      info.appendChild(meta);

      option.appendChild(checkbox);
      option.appendChild(avatar);
      option.appendChild(info);

      fragment.appendChild(option);
    }

    elements.teamList.innerHTML = "";
    elements.teamList.appendChild(fragment);
  }

  function buildCharacterMeta(character) {
    var className = readString(character.class_name, "");
    var subclassName = readString(character.subclass_name, "");
    var level = character.level != null && character.level !== "" ? "Livello " + character.level : "";

    var role = "";
    if (className && subclassName) {
      role = className + " - " + subclassName;
    } else {
      role = className;
    }

    if (role && level) {
      return role + " - " + level;
    }

    return role || level || "Profilo base";
  }

  async function submitQuest(elements, state) {
    var payload = buildPayload(elements, state);

    if (!payload.title) {
      setStatus(elements, "Inserisci un titolo valido.", "is-error");
      return;
    }

    if (!payload.slug) {
      setStatus(elements, "Inserisci uno slug valido.", "is-error");
      return;
    }

    setSubmitting(elements, true);
    setStatus(
      elements,
      state.mode === QUEST_MODAL_EDIT ? "Aggiornamento missione in corso..." : "Salvataggio missione in corso...",
      "is-pending"
    );

    try {
      var response = await fetch(UPSERT_QUEST_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: "Bearer " + SUPABASE_ANON_KEY,
          "x-import-secret": IMPORT_SECRET,
        },
        body: JSON.stringify(payload),
      });

      var result = await parseResponseBody(response);

      if (!response.ok || !result || result.success !== true) {
        throw new Error(readRequestError(result, response.status));
      }

      var slug = readString(result.quest && result.quest.slug, payload.slug);
      setStatus(
        elements,
        state.mode === QUEST_MODAL_EDIT ? "Missione aggiornata con successo." : "Missione salvata con successo.",
        "is-success"
      );

      document.dispatchEvent(
        new CustomEvent("enclave:quest-updated", {
          detail: {
            slug: slug,
            previousSlug: state.originalSlug,
            mode: state.mode,
          },
        })
      );

      window.setTimeout(function () {
        closeModal(elements, state);
      }, 650);
    } catch (error) {
      setStatus(
        elements,
        "Errore salvataggio missione: " + readString(error && error.message, "errore inatteso."),
        "is-error"
      );
    } finally {
      setSubmitting(elements, false);
    }
  }

  function buildPayload(elements, state) {
    var title = readString(elements.titleInput && elements.titleInput.value, "");
    var slugValue = readString(elements.slugInput && elements.slugInput.value, "");

    return {
      title: title,
      slug: slugify(slugValue || title),
      original_slug: state.mode === QUEST_MODAL_EDIT ? toNullableString(state.originalSlug) : null,
      type: readString(elements.typeInput && elements.typeInput.value, "side"),
      status: readString(elements.statusInput && elements.statusInput.value, "in-corso"),
      image_url: toNullableString(elements.imageInput && elements.imageInput.value),
      location: toNullableString(elements.locationInput && elements.locationInput.value),
      summary: toNullableString(elements.summaryInput && elements.summaryInput.value),
      briefing: toNullableString(elements.briefingInput && elements.briefingInput.value),
      report: toNullableString(elements.reportInput && elements.reportInput.value),
      objective_primary: toNullableString(elements.objectivePrimaryInput && elements.objectivePrimaryInput.value),
      objective_secondary: toNullableString(elements.objectiveSecondaryInput && elements.objectiveSecondaryInput.value),
      notes: toNullableString(elements.notesInput && elements.notesInput.value),
      last_session_at: toNullableString(elements.lastSessionInput && elements.lastSessionInput.value),
      next_session_at: toNullableString(elements.nextSessionInput && elements.nextSessionInput.value),
      character_ids: Array.from(state.selectedCharacterIds),
    };
  }

  function setStatus(elements, message, stateClass) {
    if (!elements.status) {
      return;
    }

    elements.status.textContent = message;
    elements.status.classList.remove("is-success", "is-error", "is-pending");

    if (stateClass) {
      elements.status.classList.add(stateClass);
    }
  }

  function setModalMode(elements, state, mode) {
    state.mode = mode;

    if (elements.modalTitle) {
      elements.modalTitle.textContent = mode === QUEST_MODAL_EDIT ? "Modifica missione" : "Aggiungi missione";
    }

    if (elements.submitButton) {
      elements.submitButton.textContent = mode === QUEST_MODAL_EDIT ? "Aggiorna missione" : "Salva missione";
    }
  }

  function applyQuestDataToForm(elements, state, quest, characterIds) {
    var title = readString(quest.title, "");
    var slug = slugify(readString(quest.slug, ""));

    if (elements.titleInput) {
      elements.titleInput.value = title;
    }

    if (elements.slugInput) {
      elements.slugInput.value = slug;
    }

    if (elements.typeInput) {
      elements.typeInput.value = readString(quest.type, "side");
    }

    if (elements.statusInput) {
      elements.statusInput.value = readString(quest.status, "in-corso");
    }

    if (elements.imageInput) {
      elements.imageInput.value = readString(quest.image_url, "");
    }

    if (elements.locationInput) {
      elements.locationInput.value = readString(quest.location, "");
    }

    if (elements.summaryInput) {
      elements.summaryInput.value = readString(quest.summary, "");
    }

    if (elements.briefingInput) {
      elements.briefingInput.value = readString(quest.briefing, "");
    }

    if (elements.reportInput) {
      elements.reportInput.value = readString(quest.report, "");
    }

    if (elements.objectivePrimaryInput) {
      elements.objectivePrimaryInput.value = readString(quest.objective_primary, "");
    }

    if (elements.objectiveSecondaryInput) {
      elements.objectiveSecondaryInput.value = readString(quest.objective_secondary, "");
    }

    if (elements.notesInput) {
      elements.notesInput.value = readString(quest.notes, "");
    }

    if (elements.lastSessionInput) {
      elements.lastSessionInput.value = toDateInputValue(readString(quest.last_session_at, ""));
    }

    if (elements.nextSessionInput) {
      elements.nextSessionInput.value = toDateInputValue(readString(quest.next_session_at, ""));
    }

    state.originalSlug = slug;
    state.slugLocked = true;
    state.selectedCharacterIds = new Set(characterIds);
  }

  function readCharacterIdsFromDetail(detail, quest) {
    var raw = [];

    if (Array.isArray(detail.characterIds)) {
      raw = detail.characterIds;
    } else if (Array.isArray(quest.characterIds)) {
      raw = quest.characterIds;
    } else if (Array.isArray(quest.character_ids)) {
      raw = quest.character_ids;
    }

    var unique = new Set();

    for (var i = 0; i < raw.length; i += 1) {
      if (raw[i] === null || raw[i] === undefined || raw[i] === "") {
        continue;
      }

      unique.add(String(raw[i]));
    }

    return Array.from(unique);
  }

  function toDateInputValue(value) {
    if (!value) {
      return "";
    }

    var text = String(value).trim();
    if (!text) {
      return "";
    }

    var directMatch = text.match(/^(\d{4}-\d{2}-\d{2})/);
    if (directMatch) {
      return directMatch[1];
    }

    var parsed = new Date(text);
    if (Number.isNaN(parsed.getTime())) {
      return "";
    }

    var year = parsed.getFullYear();
    var month = String(parsed.getMonth() + 1).padStart(2, "0");
    var day = String(parsed.getDate()).padStart(2, "0");
    return year + "-" + month + "-" + day;
  }

  function setSubmitting(elements, isSubmitting) {
    if (elements.submitButton) {
      elements.submitButton.disabled = isSubmitting;
    }

    if (elements.cancelButton) {
      elements.cancelButton.disabled = isSubmitting;
    }

    if (!elements.form) {
      return;
    }

    var controls = elements.form.querySelectorAll("input, select, textarea, button");

    for (var i = 0; i < controls.length; i += 1) {
      if (controls[i] === elements.cancelButton || controls[i] === elements.submitButton) {
        continue;
      }

      controls[i].disabled = isSubmitting;
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

  function readRequestError(payload, statusCode) {
    var details = payload && payload.error ? payload.error : payload && payload.message;
    if (details) {
      return String(details);
    }

    return "Richiesta fallita (" + statusCode + ").";
  }

  function slugify(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function toNullableString(value) {
    var result = readString(value, "");
    return result === "" ? null : result;
  }

  function readString(value, fallback) {
    return typeof value === "string" && value.trim() !== "" ? value.trim() : fallback;
  }
})();

