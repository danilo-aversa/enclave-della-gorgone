(function () {
  "use strict";

  var SUPABASE_URL = "https://atglgaritxzowshenaqr.supabase.co";
  var SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0Z2xnYXJpdHh6b3dzaGVuYXFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NzcxNDQsImV4cCI6MjA5MjM1MzE0NH0.ObDvvWMkddZL8wABKyI-TBi4KgVoYArJQjoOnAmVVe8";
  var INSERT_QUEST_REPORT_URL = SUPABASE_URL + "/functions/v1/insert-quest-report";
  var UPDATE_QUEST_REPORT_URL = SUPABASE_URL + "/functions/v1/update-quest-report";
  var DELETE_QUEST_REPORT_URL = SUPABASE_URL + "/functions/v1/delete-quest-report";
  var RESOLVE_PLAYER_URL = SUPABASE_URL + "/functions/v1/resolve-player";

  var reportModalElements = null;

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

    document.addEventListener("enclave:player-resolved", function onPlayerResolved() {
      var editButton = document.querySelector(".quest-edit-action");
      if (editButton) {
        syncQuestEditButtonAccess(editButton);
      }
    });

    document.addEventListener("enclave:player-cleared", function onPlayerCleared() {
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
      var reports = [];
      var reportsLoadFailed = false;
      try {
        reports = await fetchQuestReports(quest.id);
      } catch (reportsError) {
        console.warn("Errore caricamento rapporti missione:", reportsError);
        reports = [];
        reportsLoadFailed = true;
      }

      var relations = await fetchQuestCharacters(quest.id);
      var characterIds = extractCharacterIds(relations);
      var characters = await fetchCharactersByIds(characterIds);
      var playerCode = readString(window.localStorage.getItem("gorgoneAccessCode"), "");
      var currentAuthorCharacter = await resolveQuestReportAuthor(characters, playerCode);
      var currentAuthorCharacterId = toIdString(currentAuthorCharacter && currentAuthorCharacter.id);

      renderQuestDetail(
        elements.container,
        quest,
        characters,
        characterIds,
        reports,
        reportsLoadFailed,
        currentAuthorCharacterId
      );

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

  async function fetchQuestReports(questId) {
    var url =
      SUPABASE_URL +
      "/rest/v1/quest_reports?select=" +
      encodeURIComponent(
        [
          "id",
          "quest_id",
          "author_character_id",
          "author_name",
          "report_type",
          "title",
          "body",
          "visibility",
          "created_at",
          "updated_at",
        ].join(",")
      ) +
      "&quest_id=eq." +
      encodeURIComponent(String(questId)) +
      "&visibility=eq.public" +
      "&order=created_at.asc";

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
      encodeURIComponent("id,slug,name,portrait_url,token_url,class_name,subclass_name,level,player_id") +
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

  function renderQuestDetail(container, quest, characters, characterIds, reports, reportsLoadFailed, currentAuthorCharacterId) {
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
      main.appendChild(buildTextSection("Ultimo rapporto legacy", reportText));
    }

    main.appendChild(
      buildQuestReportsSection(reports, reportsLoadFailed, quest, characters, currentAuthorCharacterId)
    );

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

  function buildQuestReportsSection(reports, hasLoadError, quest, characters, currentAuthorCharacterId) {
    var section = document.createElement("section");
    section.className = "quest-detail-section quest-reports-section";

    var head = document.createElement("div");
    head.className = "quest-detail-head-top";

    var title = document.createElement("h3");
    title.textContent = "Rapporti della missione";
    head.appendChild(title);

    var actionButton = document.createElement("button");
    actionButton.type = "button";
    actionButton.className = "quest-edit-action quest-report-action";
    actionButton.textContent = "Aggiungi rapporto";
    actionButton.addEventListener("click", function onOpenReportModal() {
      openQuestReportModal(quest, characters);
    });
    head.appendChild(actionButton);

    section.appendChild(head);

    if (hasLoadError) {
      var error = document.createElement("p");
      error.textContent = "Impossibile caricare i rapporti della missione.";
      section.appendChild(error);
    } else if (!Array.isArray(reports) || !reports.length) {
      var empty = document.createElement("p");
      empty.textContent = "Nessun rapporto registrato.";
      section.appendChild(empty);
    } else {
      for (var i = 0; i < reports.length; i += 1) {
        section.appendChild(buildQuestReportCard(reports[i], quest, characters, currentAuthorCharacterId));
      }
    }

    return section;
  }

  function buildQuestReportCard(report, quest, characters, currentAuthorCharacterId) {
    var card = document.createElement("article");
    card.className = "quest-objective-block";

    var meta = document.createElement("span");
    meta.className = "field-label";

    var reportType = mapQuestReportType(readString(report && report.report_type, ""));
    var authorName = readString(report && report.author_name, "") || "Autore sconosciuto";
    var createdAt = formatDate(readString(report && report.created_at, ""));

    meta.textContent = reportType + " - " + authorName + " - " + createdAt;
    card.appendChild(meta);

    var titleText = readString(report && report.title, "");
    if (titleText) {
      var reportTitle = document.createElement("h4");
      reportTitle.className = "quest-detail__title";
      reportTitle.textContent = titleText;
      card.appendChild(reportTitle);
    }
    appendReportMarkdown(card, readString(report && report.body, ""));

    var reportAuthorId = toIdString(report && report.author_character_id);
    var canManageReport =
      !!reportAuthorId &&
      !!toIdString(currentAuthorCharacterId) &&
      reportAuthorId === toIdString(currentAuthorCharacterId);

    if (canManageReport) {
      var actions = document.createElement("div");
      actions.className = "quest-report-card__actions";

      var editButton = document.createElement("button");
      editButton.type = "button";
      editButton.className = "quest-edit-action quest-report-action quest-report-action--small";
      editButton.textContent = "Modifica";
      editButton.addEventListener("click", function onEditReportClick() {
        openQuestReportModal(quest, characters, report);
      });
      actions.appendChild(editButton);

      var deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className =
        "quest-edit-action quest-report-action quest-report-action--small is-danger";
      deleteButton.textContent = "Elimina";
      deleteButton.addEventListener("click", function onDeleteReportClick() {
        deleteQuestReport(report, currentAuthorCharacterId);
      });
      actions.appendChild(deleteButton);

      card.appendChild(actions);
    }

    return card;
  }

  async function openQuestReportModal(quest, characters, reportToEdit) {
    console.info("[quest-report] openQuestReportModal:start", {
      questId: quest && quest.id,
      questSlug: quest && quest.slug,
      assignedCharactersCount: Array.isArray(characters) ? characters.length : 0,
      editMode: !!reportToEdit,
      reportId: reportToEdit && reportToEdit.id,
    });

    var elements = ensureQuestReportModal();
    if (!elements) {
      console.info("[quest-report] openQuestReportModal:abort:no-elements");
      return;
    }

    resetQuestReportModalStatus(elements);
    elements.blockReason = "";

    var assignedCharacters = Array.isArray(characters) ? characters : [];
    var playerCode = readString(window.localStorage.getItem("gorgoneAccessCode"), "");
    console.info("[quest-report] openQuestReportModal:resolve-author", {
      playerCode: playerCode,
      assignedCharacterIds: assignedCharacters.map(function (character) {
        return toIdString(character && character.id);
      }),
    });
    var authorCharacter = await resolveQuestReportAuthor(assignedCharacters, playerCode);
    console.info("[quest-report] openQuestReportModal:resolve-author:done", {
      authorCharacterId: authorCharacter && authorCharacter.id,
      authorCharacterName: authorCharacter && authorCharacter.name,
    });
    elements.authorCharacterId = authorCharacter ? toIdString(authorCharacter.id) : "";
    elements.authorInfo.textContent = authorCharacter
      ? "Autore: " + readString(authorCharacter.name, "Personaggio")
      : "Nessun tuo personaggio assegnato a questa missione.";
    elements.mode = reportToEdit ? "edit" : "create";
    elements.reportId = toIdString(reportToEdit && reportToEdit.id);

    elements.typeSelect.value = readString(reportToEdit && reportToEdit.report_type, "field_report") || "field_report";
    elements.titleInput.value = readString(reportToEdit && reportToEdit.title, "");
    elements.bodyInput.value = readString(reportToEdit && reportToEdit.body, "");
    elements.submitButton.textContent = elements.mode === "edit" ? "Aggiorna rapporto" : "Salva rapporto";
    elements.heading.textContent = elements.mode === "edit" ? "Modifica rapporto missione" : "Aggiungi rapporto missione";

    syncQuestReportModalAvailability(elements);

    elements.form.dataset.questId = toIdString(quest && quest.id);
    console.info("[quest-report] openQuestReportModal:ready", {
      questId: elements.form.dataset.questId,
      authorCharacterId: elements.authorCharacterId,
      mode: elements.mode,
      reportId: elements.reportId,
      submitDisabled: elements.submitButton.disabled,
      blockReason: elements.blockReason,
    });
    elements.root.hidden = false;
    document.body.classList.add("modal-open");

    window.setTimeout(function focusModalTextarea() {
      if (!elements.bodyInput.disabled) {
        elements.bodyInput.focus();
      } else {
        elements.cancelButton.focus();
      }
    }, 0);
  }

  function ensureQuestReportModal() {
    if (reportModalElements) {
      console.info("[quest-report] ensureQuestReportModal:reuse");
      return reportModalElements;
    }

    console.info("[quest-report] ensureQuestReportModal:create");

    var root = document.createElement("div");
    root.className = "import-modal quest-report-modal";
    root.hidden = true;

    var backdrop = document.createElement("div");
    backdrop.className = "import-modal__backdrop";
    root.appendChild(backdrop);

    var panel = document.createElement("div");
    panel.className = "import-modal__panel quest-report-modal__panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-labelledby", "quest-report-modal-title");

    var heading = document.createElement("h3");
    heading.id = "quest-report-modal-title";
    heading.textContent = "Aggiungi rapporto missione";
    panel.appendChild(heading);

    var form = document.createElement("form");
    form.className = "import-modal__form";
    form.noValidate = true;

    var typeLabel = document.createElement("label");
    typeLabel.className = "import-modal__label";
    typeLabel.textContent = "Tipo rapporto";
    var typeSelect = document.createElement("select");
    typeSelect.className = "import-modal__input";
    typeSelect.name = "report_type";
    var reportTypes = ["field_report", "archivist_report", "player_note", "final_report"];
    for (var i = 0; i < reportTypes.length; i += 1) {
      var typeOption = document.createElement("option");
      typeOption.value = reportTypes[i];
      typeOption.textContent = mapQuestReportType(reportTypes[i]);
      typeSelect.appendChild(typeOption);
    }
    typeLabel.appendChild(typeSelect);
    form.appendChild(typeLabel);

    var authorInfo = document.createElement("p");
    authorInfo.className = "import-modal__status";
    form.appendChild(authorInfo);

    var titleLabel = document.createElement("label");
    titleLabel.className = "import-modal__label";
    titleLabel.textContent = "Titolo";
    var titleInput = document.createElement("input");
    titleInput.className = "import-modal__input";
    titleInput.type = "text";
    titleInput.name = "title";
    titleInput.required = true;
    titleInput.autocomplete = "off";
    titleLabel.appendChild(titleInput);
    form.appendChild(titleLabel);

    var bodyLabel = document.createElement("label");
    bodyLabel.className = "import-modal__label";
    bodyLabel.textContent = "Rapporto";

    var markdownTools = document.createElement("div");
    markdownTools.className = "quest-report-markdown-tools";

    var headingButton = document.createElement("button");
    headingButton.type = "button";
    headingButton.className = "import-modal__btn quest-report-markdown-tool";
    headingButton.innerHTML = '<i class="fa-solid fa-heading" aria-hidden="true"></i>';
    headingButton.title = "Titolo";
    headingButton.setAttribute("aria-label", "Inserisci titolo");
    markdownTools.appendChild(headingButton);

    var boldButton = document.createElement("button");
    boldButton.type = "button";
    boldButton.className = "import-modal__btn quest-report-markdown-tool";
    boldButton.innerHTML = '<i class="fa-solid fa-bold" aria-hidden="true"></i>';
    boldButton.title = "Grassetto";
    boldButton.setAttribute("aria-label", "Inserisci grassetto");
    markdownTools.appendChild(boldButton);

    var italicButton = document.createElement("button");
    italicButton.type = "button";
    italicButton.className = "import-modal__btn quest-report-markdown-tool";
    italicButton.innerHTML = '<i class="fa-solid fa-italic" aria-hidden="true"></i>';
    italicButton.title = "Corsivo";
    italicButton.setAttribute("aria-label", "Inserisci corsivo");
    markdownTools.appendChild(italicButton);

    var bulletListButton = document.createElement("button");
    bulletListButton.type = "button";
    bulletListButton.className = "import-modal__btn quest-report-markdown-tool";
    bulletListButton.innerHTML = '<i class="fa-solid fa-list-ul" aria-hidden="true"></i>';
    bulletListButton.title = "Lista puntata";
    bulletListButton.setAttribute("aria-label", "Inserisci lista puntata");
    markdownTools.appendChild(bulletListButton);

    var numberedListButton = document.createElement("button");
    numberedListButton.type = "button";
    numberedListButton.className = "import-modal__btn quest-report-markdown-tool";
    numberedListButton.innerHTML = '<i class="fa-solid fa-list-ol" aria-hidden="true"></i>';
    numberedListButton.title = "Lista numerata";
    numberedListButton.setAttribute("aria-label", "Inserisci lista numerata");
    markdownTools.appendChild(numberedListButton);

    form.appendChild(markdownTools);

    var bodyInput = document.createElement("textarea");
    bodyInput.className = "import-modal__input";
    bodyInput.name = "body";
    bodyInput.rows = 6;
    bodyInput.required = true;
    bodyInput.addEventListener("keydown", onQuestReportMarkdownKeydown);
    bodyLabel.appendChild(bodyInput);
    form.appendChild(bodyLabel);

    headingButton.addEventListener("click", function onHeadingClick() {
      prefixTextareaCurrentLine(bodyInput, "### ");
    });

    boldButton.addEventListener("click", function onBoldClick() {
      wrapTextareaSelection(bodyInput, "**", "**", "testo in grassetto");
    });

    italicButton.addEventListener("click", function onItalicClick() {
      wrapTextareaSelection(bodyInput, "*", "*", "testo in corsivo");
    });

    bulletListButton.addEventListener("click", function onBulletListClick() {
      prefixTextareaSelectedLines(bodyInput, "- ");
    });

    numberedListButton.addEventListener("click", function onNumberedListClick() {
      prefixTextareaSelectedLines(bodyInput, "1. ", true);
    });

    var status = document.createElement("p");
    status.className = "import-modal__status";
    status.setAttribute("aria-live", "polite");
    form.appendChild(status);

    var actions = document.createElement("div");
    actions.className = "import-modal__actions";

    var submitButton = document.createElement("button");
    submitButton.type = "submit";
    submitButton.className = "import-modal__btn import-modal__btn--primary";
    submitButton.textContent = "Salva rapporto";
    actions.appendChild(submitButton);

    var cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.className = "import-modal__btn";
    cancelButton.textContent = "Annulla";
    actions.appendChild(cancelButton);

    form.appendChild(actions);
    panel.appendChild(form);
    root.appendChild(panel);
    document.body.appendChild(root);

    reportModalElements = {
      root: root,
      heading: heading,
      backdrop: backdrop,
      panel: panel,
      form: form,
      typeSelect: typeSelect,
      authorInfo: authorInfo,
      titleInput: titleInput,
      bodyInput: bodyInput,
      submitButton: submitButton,
      cancelButton: cancelButton,
      status: status,
      authorCharacterId: "",
      headingButton: headingButton,
      boldButton: boldButton,
      italicButton: italicButton,
      bulletListButton: bulletListButton,
      numberedListButton: numberedListButton,
      mode: "create",
      reportId: "",
    };

    backdrop.addEventListener("click", closeQuestReportModal);
    cancelButton.addEventListener("click", closeQuestReportModal);

    document.addEventListener("keydown", function onQuestReportModalKeydown(event) {
      if (!reportModalElements || reportModalElements.root.hidden) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        closeQuestReportModal();
      }
    });

    form.addEventListener("submit", onQuestReportSubmit);
    document.addEventListener("enclave:access-code-updated", onQuestReportAccessChange);
    document.addEventListener("enclave:player-resolved", onQuestReportAccessChange);
    document.addEventListener("enclave:player-cleared", onQuestReportAccessChange);

    return reportModalElements;
  }

  function onQuestReportAccessChange() {
    if (!reportModalElements || reportModalElements.root.hidden) {
      return;
    }

    console.info("[quest-report] onQuestReportAccessChange");
    syncQuestReportModalAvailability(reportModalElements);
  }

  function syncQuestReportModalAvailability(elements) {
    var playerCode = readString(window.localStorage.getItem("gorgoneAccessCode"), "");
    var hasAuthor = !!toIdString(elements.authorCharacterId);
    elements.blockReason = "";

    console.info("[quest-report] syncQuestReportModalAvailability", {
      hasPlayerCode: !!playerCode,
      playerCode: playerCode,
      hasAuthor: hasAuthor,
      authorCharacterId: elements.authorCharacterId,
    });

    if (!playerCode) {
      setQuestReportModalDisabled(elements, true);
      elements.blockReason = "Inserisci il tuo codice giocatore dal profilo per aggiungere un rapporto.";
      setQuestReportModalStatus(
        elements,
        "Inserisci il tuo codice giocatore dal profilo per aggiungere un rapporto.",
        "is-error"
      );
      console.info("[quest-report] syncQuestReportModalAvailability:blocked:no-player-code");
      return;
    }

    if (!hasAuthor) {
      setQuestReportModalDisabled(elements, true);
      elements.blockReason = "Nessun tuo personaggio assegnato a questa missione.";
      setQuestReportModalStatus(elements, elements.blockReason, "is-error");
      console.info("[quest-report] syncQuestReportModalAvailability:blocked:no-author");
      return;
    }

    setQuestReportModalDisabled(elements, false);
    resetQuestReportModalStatus(elements);
    console.info("[quest-report] syncQuestReportModalAvailability:enabled");
  }

  function setQuestReportModalDisabled(elements, disabled) {
    elements.typeSelect.disabled = disabled;
    elements.titleInput.disabled = disabled;
    elements.bodyInput.disabled = disabled;
    elements.submitButton.disabled = disabled;

    if (elements.headingButton) {
      elements.headingButton.disabled = false;
    }

    if (elements.boldButton) {
      elements.boldButton.disabled = false;
    }

    if (elements.italicButton) {
      elements.italicButton.disabled = false;
    }

    if (elements.bulletListButton) {
      elements.bulletListButton.disabled = false;
    }

    if (elements.numberedListButton) {
      elements.numberedListButton.disabled = false;
    }
  }

  function setQuestReportModalStatus(elements, message, statusClass) {
    elements.status.textContent = readString(message, "");
    elements.status.classList.remove("is-pending", "is-success", "is-error");
    if (statusClass) {
      elements.status.classList.add(statusClass);
    }

    if (elements.status.textContent) {
      console.info("[quest-report] modal-status", {
        message: elements.status.textContent,
        statusClass: statusClass || "",
      });
    }
  }

  function resetQuestReportModalStatus(elements) {
    setQuestReportModalStatus(elements, "", "");
  }

  async function onQuestReportSubmit(event) {
    event.preventDefault();
    console.info("[quest-report] onQuestReportSubmit:start");

    var elements = reportModalElements;
    if (!elements) {
      console.info("[quest-report] onQuestReportSubmit:abort:no-elements");
      return;
    }

    syncQuestReportModalAvailability(elements);
    console.info("[quest-report] onQuestReportSubmit:post-sync", {
      submitDisabled: elements.submitButton.disabled,
      blockReason: elements.blockReason,
      questId: elements.form.dataset.questId,
      authorCharacterId: elements.authorCharacterId,
    });

    if (elements.submitButton.disabled) {
      setQuestReportModalStatus(elements, elements.blockReason || "Compila i campi richiesti per salvare il rapporto.", "is-error");
      console.info("[quest-report] onQuestReportSubmit:abort:submit-disabled");
      return;
    }

    var titleValue = readString(elements.titleInput.value, "");
    if (!titleValue) {
      setQuestReportModalStatus(elements, "Il titolo del rapporto e obbligatorio.", "is-error");
      elements.titleInput.focus();
      console.info("[quest-report] onQuestReportSubmit:abort:missing-title");
      return;
    }

    var bodyValue = readString(elements.bodyInput.value, "");
    if (!bodyValue) {
      setQuestReportModalStatus(elements, "Il contenuto del rapporto e obbligatorio.", "is-error");
      elements.bodyInput.focus();
      console.info("[quest-report] onQuestReportSubmit:abort:missing-body");
      return;
    }

    var questIdRaw = toIdString(elements.form.dataset.questId || "");
    var authorCharacterId = toIdString(elements.authorCharacterId);
    var playerCode = readString(window.localStorage.getItem("gorgoneAccessCode"), "");

    if (!questIdRaw || !authorCharacterId || !playerCode) {
      setQuestReportModalStatus(elements, "Dati non validi per il salvataggio del rapporto.", "is-error");
      console.info("[quest-report] onQuestReportSubmit:abort:invalid-data", {
        questIdRaw: questIdRaw,
        authorCharacterId: authorCharacterId,
        hasPlayerCode: !!playerCode,
      });
      return;
    }

    if (elements.mode === "edit" && !toIdString(elements.reportId)) {
      setQuestReportModalStatus(elements, "Report non valido per la modifica.", "is-error");
      console.info("[quest-report] onQuestReportSubmit:abort:missing-report-id");
      return;
    }

    var payload = {
      quest_id: parseMaybeNumericId(questIdRaw),
      author_character_id: parseMaybeNumericId(authorCharacterId),
      player_code: playerCode,
      report_type: readString(elements.typeSelect.value, "field_report"),
      title: titleValue,
      body: bodyValue,
      visibility: "public",
    };

    if (elements.mode === "edit") {
      payload.report_id = parseMaybeNumericId(toIdString(elements.reportId));
    }

    var endpoint = elements.mode === "edit" ? UPDATE_QUEST_REPORT_URL : INSERT_QUEST_REPORT_URL;

    console.info("[quest-report] onQuestReportSubmit:payload", payload);

    setQuestReportModalDisabled(elements, true);
    setQuestReportModalStatus(elements, "Salvataggio in corso...", "is-pending");

    try {
      console.info("[quest-report] onQuestReportSubmit:request", endpoint);
      var response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(payload),
      });

      var result = await parseResponseBody(response);
      console.info("[quest-report] onQuestReportSubmit:response", {
        status: response.status,
        ok: response.ok,
        result: result,
      });

      if (!response.ok || !result || result.success !== true) {
        var errorMessage = readSupabaseError(result, response.status);
        if (elements.mode === "edit") {
          try {
            console.info("[quest-report] onQuestReportSubmit:fallback-rest-update:start");
            await updateQuestReportViaRest(payload);
            console.info("[quest-report] onQuestReportSubmit:fallback-rest-update:success");
            setQuestReportModalStatus(elements, "Rapporto aggiornato.", "is-success");
            closeQuestReportModal();
            await refreshQuestPageAfterReportMutation();
            return;
          } catch (fallbackError) {
            console.info("[quest-report] onQuestReportSubmit:fallback-rest-update:failed", {
              message: fallbackError && fallbackError.message,
            });
          }
        }
        setQuestReportModalStatus(elements, errorMessage || "Impossibile salvare il rapporto.", "is-error");
        syncQuestReportModalAvailability(elements);
        console.info("[quest-report] onQuestReportSubmit:failed", {
          errorMessage: errorMessage,
        });
        return;
      }

      setQuestReportModalStatus(elements, "Rapporto salvato.", "is-success");
      console.info("[quest-report] onQuestReportSubmit:success");
      closeQuestReportModal();
      window.location.reload();
    } catch (error) {
      console.info("[quest-report] onQuestReportSubmit:exception", {
        message: error && error.message,
        stack: error && error.stack,
      });
      if (elements.mode === "edit") {
        try {
          console.info("[quest-report] onQuestReportSubmit:fallback-rest-update:start:exception-path");
          await updateQuestReportViaRest(payload);
          console.info("[quest-report] onQuestReportSubmit:fallback-rest-update:success:exception-path");
          setQuestReportModalStatus(elements, "Rapporto aggiornato.", "is-success");
          closeQuestReportModal();
          await refreshQuestPageAfterReportMutation();
          return;
        } catch (fallbackError) {
          console.info("[quest-report] onQuestReportSubmit:fallback-rest-update:failed:exception-path", {
            message: fallbackError && fallbackError.message,
          });
        }
      }
      setQuestReportModalStatus(
        elements,
        readString(error && error.message, "Impossibile salvare il rapporto."),
        "is-error"
      );
      syncQuestReportModalAvailability(elements);
    }
  }

  function closeQuestReportModal() {
    if (!reportModalElements) {
      return;
    }

    console.info("[quest-report] closeQuestReportModal");
    reportModalElements.root.hidden = true;
    document.body.classList.remove("modal-open");
    reportModalElements.form.reset();
    reportModalElements.form.dataset.questId = "";
    reportModalElements.authorCharacterId = "";
    reportModalElements.authorInfo.textContent = "";
    reportModalElements.mode = "create";
    reportModalElements.reportId = "";
    reportModalElements.submitButton.textContent = "Salva rapporto";
    reportModalElements.heading.textContent = "Aggiungi rapporto missione";
    resetQuestReportModalStatus(reportModalElements);
  }

  async function deleteQuestReport(report, currentAuthorCharacterId) {
    var reportId = toIdString(report && report.id);
    var reportAuthorId = toIdString(report && report.author_character_id);
    var localAuthorId = toIdString(currentAuthorCharacterId);
    var playerCode = readString(window.localStorage.getItem("gorgoneAccessCode"), "");

    console.info("[quest-report] deleteQuestReport:start", {
      reportId: reportId,
      reportAuthorId: reportAuthorId,
      currentAuthorCharacterId: localAuthorId,
      hasPlayerCode: !!playerCode,
    });

    if (!reportId || !playerCode || !localAuthorId || reportAuthorId !== localAuthorId) {
      console.info("[quest-report] deleteQuestReport:abort:not-author-or-invalid");
      return;
    }

    var confirmed = window.confirm("Vuoi eliminare questo rapporto?");
    if (!confirmed) {
      return;
    }

    try {
      var response = await fetch(DELETE_QUEST_REPORT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          report_id: parseMaybeNumericId(reportId),
          player_code: playerCode,
        }),
      });

      var result = await parseResponseBody(response);
      console.info("[quest-report] deleteQuestReport:response", {
        status: response.status,
        ok: response.ok,
        result: result,
      });

      if (!response.ok || !result || result.success !== true) {
        try {
          console.info("[quest-report] deleteQuestReport:fallback-rest-delete:start");
          await deleteQuestReportViaRest({
            report_id: reportId,
            author_character_id: localAuthorId,
          });
          console.info("[quest-report] deleteQuestReport:fallback-rest-delete:success");
          await refreshQuestPageAfterReportMutation();
          return;
        } catch (fallbackError) {
          console.info("[quest-report] deleteQuestReport:fallback-rest-delete:failed", {
            message: fallbackError && fallbackError.message,
          });
        }
        window.alert(readSupabaseError(result, response.status) || "Impossibile eliminare il rapporto.");
        return;
      }

      window.location.reload();
    } catch (error) {
      console.info("[quest-report] deleteQuestReport:exception", {
        message: error && error.message,
      });
      try {
        console.info("[quest-report] deleteQuestReport:fallback-rest-delete:start:exception-path");
        await deleteQuestReportViaRest({
          report_id: reportId,
          author_character_id: localAuthorId,
        });
        console.info("[quest-report] deleteQuestReport:fallback-rest-delete:success:exception-path");
        await refreshQuestPageAfterReportMutation();
        return;
      } catch (fallbackError) {
        console.info("[quest-report] deleteQuestReport:fallback-rest-delete:failed:exception-path", {
          message: fallbackError && fallbackError.message,
        });
      }
      window.alert(readString(error && error.message, "Impossibile eliminare il rapporto."));
    }
  }

  async function updateQuestReportViaRest(payload) {
    var reportId = parseMaybeNumericId(payload && payload.report_id);
    var authorCharacterId = parseMaybeNumericId(payload && payload.author_character_id);
    if (!reportId || !authorCharacterId) {
      throw new Error("Dati report non validi per update REST.");
    }

    var url =
      SUPABASE_URL +
      "/rest/v1/quest_reports?id=eq." +
      encodeURIComponent(String(reportId)) +
      "&author_character_id=eq." +
      encodeURIComponent(String(authorCharacterId)) +
      "&select=id,title,body,updated_at";

    var response = await fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: "Bearer " + SUPABASE_ANON_KEY,
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        report_type: readString(payload && payload.report_type, "field_report"),
        title: readString(payload && payload.title, ""),
        body: readString(payload && payload.body, ""),
        visibility: readString(payload && payload.visibility, "public"),
      }),
    });

    var result = await parseResponseBody(response);

    if (!response.ok) {
      throw new Error(readSupabaseError(result, response.status));
    }

    if (!Array.isArray(result) || !result.length) {
      throw new Error("Aggiornamento non applicato: nessun rapporto modificato.");
    }
  }

  async function deleteQuestReportViaRest(payload) {
    var reportId = parseMaybeNumericId(payload && payload.report_id);
    var authorCharacterId = parseMaybeNumericId(payload && payload.author_character_id);
    if (!reportId || !authorCharacterId) {
      throw new Error("Dati report non validi per delete REST.");
    }

    var url =
      SUPABASE_URL +
      "/rest/v1/quest_reports?id=eq." +
      encodeURIComponent(String(reportId)) +
      "&author_character_id=eq." +
      encodeURIComponent(String(authorCharacterId));

    var response = await fetch(url, {
      method: "DELETE",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: "Bearer " + SUPABASE_ANON_KEY,
        Prefer: "return=representation",
      },
    });

    var result = await parseResponseBody(response);

    if (!response.ok) {
      throw new Error(readSupabaseError(result, response.status));
    }

    if (!Array.isArray(result) || !result.length) {
      throw new Error("Eliminazione non applicata: nessun rapporto eliminato.");
    }
  }

  async function refreshQuestPageAfterReportMutation() {
    var elements = {
      container: document.querySelector("[data-quest-page]"),
      slugLabel: document.querySelector("[data-quest-slug]"),
      pageTitle: document.querySelector("#quest-page-title"),
      pageSupport: document.querySelector(".quest-page-header .hero-support"),
    };

    if (!elements.container) {
      window.location.reload();
      return;
    }

    await loadQuestPage(elements);
  }

  function resolveQuestReportAuthor(characters, playerCode) {
    var assignedCharacters = Array.isArray(characters) ? characters : [];
    console.info("[quest-report] resolveQuestReportAuthor:start", {
      assignedCharactersCount: assignedCharacters.length,
      playerCode: readString(playerCode, ""),
    });

    if (!assignedCharacters.length) {
      console.info("[quest-report] resolveQuestReportAuthor:abort:no-assigned-characters");
      return Promise.resolve(null);
    }

    var profileState = null;
    if (window.EnclaveLayout && typeof window.EnclaveLayout.getProfileState === "function") {
      profileState = window.EnclaveLayout.getProfileState();
    }

    var localCharacters = Array.isArray(profileState && profileState.characters)
      ? profileState.characters
      : [];

    var localCharacterIds = new Set();
    for (var i = 0; i < localCharacters.length; i += 1) {
      var localId = toIdString(localCharacters[i] && localCharacters[i].id);
      if (localId) {
        localCharacterIds.add(localId);
      }
    }

    console.info("[quest-report] resolveQuestReportAuthor:local-profile", {
      localCharacterIds: Array.from(localCharacterIds),
    });

    for (var j = 0; j < assignedCharacters.length; j += 1) {
      var localCandidate = assignedCharacters[j];
      var localCandidateId = toIdString(localCandidate && localCandidate.id);
      if (localCandidateId && localCharacterIds.has(localCandidateId)) {
        console.info("[quest-report] resolveQuestReportAuthor:matched-local", {
          characterId: localCandidateId,
          name: localCandidate && localCandidate.name,
        });
        return Promise.resolve(localCandidate);
      }
    }

    console.info("[quest-report] resolveQuestReportAuthor:fallback-remote");
    return fetchResolvedPlayerProfile(playerCode).then(function (remoteProfile) {
      var remoteCharacters = Array.isArray(remoteProfile && remoteProfile.characters)
        ? remoteProfile.characters
        : [];

      var remoteCharacterIds = new Set();
      for (var k = 0; k < remoteCharacters.length; k += 1) {
        var remoteId = toIdString(remoteCharacters[k] && remoteCharacters[k].id);
        if (remoteId) {
          remoteCharacterIds.add(remoteId);
        }
      }

      console.info("[quest-report] resolveQuestReportAuthor:remote-profile", {
        remoteCharacterIds: Array.from(remoteCharacterIds),
      });

      for (var n = 0; n < assignedCharacters.length; n += 1) {
        var remoteCandidate = assignedCharacters[n];
        var remoteCandidateId = toIdString(remoteCandidate && remoteCandidate.id);
        if (remoteCandidateId && remoteCharacterIds.has(remoteCandidateId)) {
          console.info("[quest-report] resolveQuestReportAuthor:matched-remote", {
            characterId: remoteCandidateId,
            name: remoteCandidate && remoteCandidate.name,
          });
          return remoteCandidate;
        }
      }

      console.info("[quest-report] resolveQuestReportAuthor:no-match");
      return null;
    });
  }

  function onQuestReportMarkdownKeydown(event) {
    if (!event.ctrlKey || event.altKey) {
      return;
    }

    if (event.key === "b" || event.key === "B") {
      event.preventDefault();
      wrapTextareaSelection(event.currentTarget, "**", "**", "testo in grassetto");
      return;
    }

    if (event.key === "i" || event.key === "I") {
      event.preventDefault();
      wrapTextareaSelection(event.currentTarget, "*", "*", "testo in corsivo");
      return;
    }

    if (event.key === "1") {
      event.preventDefault();
      prefixTextareaCurrentLine(event.currentTarget, "### ");
      return;
    }

    if (event.key === "8") {
      event.preventDefault();
      prefixTextareaSelectedLines(event.currentTarget, "- ");
      return;
    }

    if (event.key === "9") {
      event.preventDefault();
      prefixTextareaSelectedLines(event.currentTarget, "1. ", true);
    }
  }

  function wrapTextareaSelection(textarea, prefix, suffix, placeholder) {
    var start = textarea.selectionStart || 0;
    var end = textarea.selectionEnd || 0;
    var value = textarea.value || "";
    var selected = value.slice(start, end);
    var content = selected || placeholder;
    var inserted = prefix + content + suffix;

    textarea.value = value.slice(0, start) + inserted + value.slice(end);

    var nextStart = start + prefix.length;
    var nextEnd = nextStart + content.length;
    textarea.focus();
    textarea.setSelectionRange(nextStart, nextEnd);
  }

  function prefixTextareaCurrentLine(textarea, prefix) {
    var value = textarea.value || "";
    var cursor = textarea.selectionStart || 0;
    var lineStart = value.lastIndexOf("\n", cursor - 1) + 1;
    var lineEndIndex = value.indexOf("\n", cursor);
    var lineEnd = lineEndIndex === -1 ? value.length : lineEndIndex;
    var line = value.slice(lineStart, lineEnd);

    if (line.indexOf(prefix) === 0) {
      return;
    }

    textarea.value = value.slice(0, lineStart) + prefix + value.slice(lineStart);
    var nextCursor = cursor + prefix.length;
    textarea.focus();
    textarea.setSelectionRange(nextCursor, nextCursor);
  }

  function isMarkdownBulletLine(line) {
    var trimmed = String(line || "").trim();
    return trimmed.indexOf("- ") === 0 || trimmed.indexOf("* ") === 0;
  }

  function isMarkdownNumberedLine(line) {
    var trimmed = String(line || "").trim();
    var dotIndex = trimmed.indexOf(". ");

    if (dotIndex <= 0) {
      return false;
    }

    var numberPart = trimmed.slice(0, dotIndex);
    return !!numberPart && !Number.isNaN(Number(numberPart));
  }

  function stripMarkdownListMarker(line) {
    var trimmed = String(line || "").trim();

    if (trimmed.indexOf("- ") === 0 || trimmed.indexOf("* ") === 0) {
      return trimmed.slice(2);
    }

    var dotIndex = trimmed.indexOf(". ");
    if (dotIndex > 0 && !Number.isNaN(Number(trimmed.slice(0, dotIndex)))) {
      return trimmed.slice(dotIndex + 2);
    }

    return trimmed;
  }

  function buildReportMarkdownList(tagName, lines) {
    var list = document.createElement(tagName);
    list.className = "quest-report-list";

    for (var i = 0; i < lines.length; i += 1) {
      var item = document.createElement("li");
      item.innerHTML = renderInlineMiniMarkdown(stripMarkdownListMarker(lines[i]));
      list.appendChild(item);
    }

    return list;
  }

  function prefixTextareaSelectedLines(textarea, prefix, numbered) {
    var value = textarea.value || "";
    var start = textarea.selectionStart || 0;
    var end = textarea.selectionEnd || 0;
    var blockStart = value.lastIndexOf("", start - 1) + 1;
    var blockEndIndex = value.indexOf("", end);
    var blockEnd = blockEndIndex === -1 ? value.length : blockEndIndex;
    var selectedBlock = value.slice(blockStart, blockEnd);
    var lines = selectedBlock.split("");
    var nextNumber = 1;

    var prefixedLines = lines.map(function prefixLine(line) {
      var trimmed = String(line || "").trim();

      if (!trimmed) {
        return line;
      }

      if (isMarkdownBulletLine(line) || isMarkdownNumberedLine(line)) {
        return line;
      }

      if (numbered) {
        return String(nextNumber++) + ". " + line;
      }

      return prefix + line;
    });

    var inserted = prefixedLines.join("");
    textarea.value = value.slice(0, blockStart) + inserted + value.slice(blockEnd);
    textarea.focus();
    textarea.setSelectionRange(blockStart, blockStart + inserted.length);
  }

  function appendReportMarkdown(container, text) {
    var raw = readString(text, "");
    if (!raw) {
      var empty = document.createElement("p");
      empty.textContent = "Nessun contenuto disponibile.";
      container.appendChild(empty);
      return;
    }

    var blocks = raw
      .split(/\n\s*\n/g)
      .map(function (block) {
        return block.trim();
      })
      .filter(Boolean);

    for (var i = 0; i < blocks.length; i += 1) {
      var block = blocks[i];
      var lines = block.split("");

      if (block.indexOf("### ") === 0) {
        var heading = document.createElement("h3");
        heading.innerHTML = renderInlineMiniMarkdown(block.slice(4));
        container.appendChild(heading);
        continue;
      }

      if (lines.length && lines.every(isMarkdownBulletLine)) {
        container.appendChild(buildReportMarkdownList("ul", lines));
        continue;
      }

      if (lines.length && lines.every(isMarkdownNumberedLine)) {
        container.appendChild(buildReportMarkdownList("ol", lines));
        continue;
      }

      var paragraph = document.createElement("p");
      for (var j = 0; j < lines.length; j += 1) {
        if (j > 0) {
          paragraph.appendChild(document.createElement("br"));
        }

        var span = document.createElement("span");
        span.innerHTML = renderInlineMiniMarkdown(lines[j]);
        paragraph.appendChild(span);
      }

      container.appendChild(paragraph);
    }
  }

  function renderInlineMiniMarkdown(text) {
    var escaped = escapeHtml(String(text || ""));
    var bolded = escaped.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    return bolded.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function mapQuestReportType(type) {
    switch (type) {
      case "field_report":
        return "Rapporto operativo";
      case "archivist_report":
        return "Rapporto dell'Archivista";
      case "player_note":
        return "Nota personale";
      case "final_report":
        return "Rapporto finale";
      default:
        return "Rapporto";
    }
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
      var storedCode = window.localStorage.getItem("gorgoneAccessCode");
      if (storedCode === "Enclave") {
        isEnabled = true;
      } else if (window.EnclaveLayout && typeof window.EnclaveLayout.getProfileState === "function") {
        var profileState = window.EnclaveLayout.getProfileState();
        var player = profileState && profileState.player ? profileState.player : null;
        var lastResolvedCode = readString(profileState && profileState.code, "");

        if (storedCode && storedCode === lastResolvedCode && hasQuestManagePermission(player)) {
          isEnabled = true;
        }
      }
    } catch (_error) {
      isEnabled = false;
    }

    button.disabled = !isEnabled;
    button.setAttribute("aria-disabled", String(!isEnabled));

    if (!isEnabled) {
      button.title = "Permessi insufficienti per modificare la missione";
      return;
    }

    button.removeAttribute("title");
  }

  function hasQuestManagePermission(player) {
    if (!player || typeof player !== "object") {
      return false;
    }

    if (
      isTruthyPermission(player.can_manage_quests) ||
      isTruthyPermission(player.canManageQuests) ||
      isTruthyPermission(player.can_manage_admin) ||
      isTruthyPermission(player.canManageAdmin) ||
      isTruthyPermission(player.can_manage) ||
      isTruthyPermission(player.canManage) ||
      isTruthyPermission(player.is_admin) ||
      isTruthyPermission(player.isAdmin)
    ) {
      return true;
    }

    var role = readString(player.role, "").trim().toLowerCase();
    return role === "admin" || role === "gm";
  }

  function isTruthyPermission(value) {
    if (value === true || value === 1) {
      return true;
    }

    if (typeof value === "string") {
      var normalized = value.trim().toLowerCase();
      return (
        normalized === "true" ||
        normalized === "1" ||
        normalized === "yes" ||
        normalized === "y" ||
        normalized === "t" ||
        normalized === "si" ||
        normalized === "on" ||
        normalized === "enabled"
      );
    }

    return false;
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

  async function fetchResolvedPlayerProfile(playerCode) {
    var code = readString(playerCode, "");
    if (!code) {
      console.info("[quest-report] fetchResolvedPlayerProfile:skip-empty-code");
      return null;
    }

    try {
      console.info("[quest-report] fetchResolvedPlayerProfile:request", {
        endpoint: RESOLVE_PLAYER_URL,
        playerCode: code,
      });

      var response = await fetch(RESOLVE_PLAYER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ player_code: code }),
      });

      var payload = await parseResponseBody(response);
      console.info("[quest-report] fetchResolvedPlayerProfile:response", {
        status: response.status,
        ok: response.ok,
        payload: payload,
      });

      if (!response.ok || !payload || payload.success !== true) {
        return null;
      }

      return payload;
    } catch (error) {
      console.info("[quest-report] fetchResolvedPlayerProfile:exception", {
        message: error && error.message,
      });
      return null;
    }
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

  function toIdString(value) {
    if (value === null || value === undefined) {
      return "";
    }

    return String(value).trim();
  }

  function parseMaybeNumericId(value) {
    var id = toIdString(value);
    if (!id) {
      return id;
    }

    return /^\d+$/.test(id) ? Number(id) : id;
  }

  function readString(value, fallback) {
    return typeof value === "string" && value.trim() !== "" ? value.trim() : fallback;
  }
})();
