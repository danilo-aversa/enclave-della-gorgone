(function () {
  "use strict";

  var SUPABASE_URL = "https://atglgaritxzowshenaqr.supabase.co";
  var SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0Z2xnYXJpdHh6b3dzaGVuYXFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NzcxNDQsImV4cCI6MjA5MjM1MzE0NH0.ObDvvWMkddZL8wABKyI-TBi4KgVoYArJQjoOnAmVVe8";
  var APP_TITLE = "Enclave della Gorgone";
  var ACCESS_CODE_KEY = "gorgoneAccessCode";
  var VALID_ACCESS_CODE = "Enclave";
  var WIKI_UPSERT_ENDPOINT = SUPABASE_URL + "/functions/v1/upsert-wiki-page";
  var WIKI_IMAGE_UPLOAD_ENDPOINT = SUPABASE_URL + "/functions/v1/upload-wiki-image";
  var WIKI_IMAGE_LIST_ENDPOINT = SUPABASE_URL + "/functions/v1/list-wiki-images";
  var WIKI_MANAGE_LIST_ENDPOINT = SUPABASE_URL + "/functions/v1/list-wiki-pages";
  var WIKI_REORDER_ENDPOINT = SUPABASE_URL + "/functions/v1/reorder-wiki-pages";
  var IMPORT_SECRET = "Gorgone-Import-9f4kLm2Qx7pR8vT1zA";
  var DOCS_SEARCH_MIN_CHARS = 2;
  var DOCS_SEARCH_LIMIT = 10;
  var INTERNAL_LINK_RESULT_LIMIT = 12;
  var MEDIA_LIBRARY_RESULT_LIMIT = 60;
  var REORDER_SORT_STEP = 10;

  var state = {
    index: null,
    publishedIndex: null,
    manageIndex: null,
    currentDocIndex: null,
    currentEntry: null,
    elements: null,
    tocObserver: null,
    tocRafId: 0,
    tocScrollHandler: null,
    tocResizeHandler: null,
    activeTocId: "",
    isManageUnlocked: false,
    isEditorOpen: false,
    editorSaving: false,
    imageUploading: false,
    publishToggleBusy: false,
    editorMode: "edit",
    editorSlugManual: false,
    searchQuery: "",
    internalLinkQuery: "",
    internalLinkSelection: null,
    colorSelection: null,
    reorderSaving: false,
    reorderDrag: null,
    reorderMode: false,
    reorderStatusTimer: 0,
    mediaLibraryItems: null,
    mediaLibraryQuery: "",
    mediaLibrarySelection: null,
    mediaLibraryLoading: false,
    mediaLibraryStatusTone: "",
    mediaLibraryNeedsRefresh: false,
    editorHistoryUndo: [],
    editorHistoryRedo: [],
    editorHistoryPendingSnapshot: null,
    editorHistoryRestoring: false,
    editorHistoryLimit: 120,
  };

  document.addEventListener("DOMContentLoaded", initDocsPage);

  async function initDocsPage() {
    var elements = {
      tree: document.querySelector("[data-docs-tree]"),
      content: document.querySelector("[data-docs-content]"),
      toc: document.querySelector("[data-docs-toc]"),
      prevNext: document.querySelector("[data-docs-prev-next]"),
      treeToggle: document.querySelector("[data-docs-tree-toggle]"),
      reorderToggle: document.querySelector("[data-docs-reorder-toggle]"),
      treeControls: document.querySelector(".docs-tree__controls"),
      treePanel: document.querySelector(".docs-tree"),
      groupLinks: document.querySelectorAll("[data-doc-group-link]"),
      metaSection: document.querySelector("[data-docs-meta-section]"),
      metaTitle: document.querySelector("[data-docs-meta-title]"),
      metaCrumb: document.querySelector("[data-docs-meta-crumb]"),
      createOpen: document.querySelector("[data-docs-create-open]"),
      editOpen: document.querySelector("[data-docs-edit-open]"),
      togglePublish: document.querySelector("[data-docs-toggle-publish]"),
      editorModal: document.querySelector("[data-docs-editor-modal]"),
      editorForm: document.querySelector("[data-docs-editor-form]"),
      editorTitle: document.querySelector("[data-docs-editor-title]"),
      editorStatus: document.querySelector("[data-docs-editor-status]"),
      editorSubmit: document.querySelector("[data-docs-editor-submit]"),
      editorClose: document.querySelectorAll("[data-docs-editor-close]"),
      editorImageFile: document.querySelector("[data-docs-image-file]"),
      editorImageAlt: document.querySelector("[data-docs-image-alt]"),
      editorImageUpload: document.querySelector("[data-docs-image-upload]"),
      editorImageStatus: document.querySelector("[data-docs-image-status]"),
      editorMediaOpen: document.querySelector("[data-docs-media-open]"),
      editorMediaPanel: document.querySelector("[data-docs-media-library-panel]"),
      editorMediaSearch: document.querySelector("[data-docs-media-search]"),
      editorMediaResults: document.querySelector("[data-docs-media-results]"),
      editorMediaStatus: document.querySelector("[data-docs-media-status]"),
      editorParentSelect: document.querySelector("[data-docs-parent-select]"),
      editorMarkdownToolbar: document.querySelector("[data-docs-md-toolbar]"),
      editorContentMd: document.querySelector("[data-docs-content-md]"),
      editorInternalLinkPanel: document.querySelector("[data-docs-internal-link-panel]"),
      editorInternalLinkInput: document.querySelector("[data-docs-internal-link-input]"),
      editorInternalLinkResults: document.querySelector("[data-docs-internal-link-results]"),
      editorColorPicker: document.querySelector("[data-docs-color-picker]"),
      accessToggle: document.querySelector("[data-docs-access-toggle]"),
      accessPanel: document.querySelector("[data-docs-access-panel]"),
      accessInput: document.querySelector("[data-docs-access-input]"),
      accessStatus: document.querySelector("[data-docs-access-status]"),
      searchInput: document.querySelector("[data-docs-search-input]"),
      searchResults: document.querySelector("[data-docs-search-results]"),
      searchClear: document.querySelector("[data-docs-search-clear]"),
      treeReorderStatus: document.querySelector("[data-docs-reorder-status]"),
    };

    if (
      !elements.tree ||
      !elements.content ||
      !elements.toc ||
      !elements.prevNext ||
      !elements.metaSection ||
      !elements.metaTitle ||
      !elements.metaCrumb
    ) {
      return;
    }

    state.elements = elements;

    bindUIEvents();
    syncDocsTreeToggleState();
    syncManageAccessState();
    syncEditActionVisibility();
    syncTreeControlsVisibility();
    syncReorderToggleUi();

    try {
      var wikiPages = await fetchWikiPages();
      rebuildWikiIndexes(wikiPages);
      renderDocsTree();
      await loadCurrentDocFromUrl({ replaceOnFallback: true });
    } catch (error) {
      console.error("Errore inizializzazione documentazione:", error);
      renderCriticalError("Impossibile caricare la documentazione.");
    }
  }
  function bindUIEvents() {
    state.elements.tree.addEventListener("click", function onTreeClick(event) {
      var link = event.target.closest("a[data-doc-link]");
      if (!link) {
        return;
      }

      event.preventDefault();
      openDocByKey(link.getAttribute("data-doc-link"), { historyMode: "push" });

      if (isMobileViewport()) {
        setDocsTreeExpanded(false);
      }
    });

    state.elements.tree.addEventListener("dragstart", function onTreeDragStart(event) {
      handleDocsTreeDragStart(event);
    });

    state.elements.tree.addEventListener("dragover", function onTreeDragOver(event) {
      handleDocsTreeDragOver(event);
    });

    state.elements.tree.addEventListener("drop", function onTreeDrop(event) {
      handleDocsTreeDrop(event);
    });

    state.elements.tree.addEventListener("dragend", function onTreeDragEnd() {
      clearDocsTreeDragState();
    });

    state.elements.prevNext.addEventListener("click", function onPrevNextClick(event) {
      var link = event.target.closest("a[data-doc-link]");
      if (!link) {
        return;
      }

      event.preventDefault();
      openDocByKey(link.getAttribute("data-doc-link"), { historyMode: "push" });
    });

    if (state.elements.searchInput) {
      state.elements.searchInput.addEventListener("input", function onSearchInput(event) {
        state.searchQuery = readString(event.target.value, "");
        renderDocsSearchResults();
      });

      state.elements.searchInput.addEventListener("keydown", function onSearchInputKeydown(event) {
        if (event.key === "Escape") {
          event.preventDefault();
          clearDocsSearch();
          return;
        }

        if (event.key !== "Enter") {
          return;
        }

        var firstResult = state.elements.searchResults
          ? state.elements.searchResults.querySelector("a[data-doc-search-link]")
          : null;

        if (!firstResult) {
          return;
        }

        event.preventDefault();
        openDocByKey(firstResult.getAttribute("data-doc-search-link"), { historyMode: "push" });
        clearDocsSearch();
      });
    }

    if (state.elements.searchClear) {
      state.elements.searchClear.addEventListener("click", function onSearchClearClick() {
        clearDocsSearch();
      });
    }

    if (state.elements.searchResults) {
      state.elements.searchResults.addEventListener("click", function onSearchResultClick(event) {
        var link = event.target.closest("a[data-doc-search-link]");
        if (!link) {
          return;
        }

        event.preventDefault();
        openDocByKey(link.getAttribute("data-doc-search-link"), { historyMode: "push" });
        clearDocsSearch();
      });
    }

    if (state.elements.treeToggle) {
      state.elements.treeToggle.addEventListener("click", function onToggleClick() {
        if (!isMobileViewport()) {
          return;
        }

        setDocsTreeExpanded(!isDocsTreeExpanded());
      });
    }

    if (state.elements.reorderToggle) {
      state.elements.reorderToggle.addEventListener("click", function onReorderToggleClick() {
        if (!state.isManageUnlocked || state.reorderSaving) {
          return;
        }

        setReorderMode(!state.reorderMode);
      });
    }
    if (state.elements.createOpen) {
      state.elements.createOpen.addEventListener("click", function onCreateOpenClick() {
        openEditorForCreate();
      });
    }

    if (state.elements.editOpen) {
      state.elements.editOpen.addEventListener("click", function onEditOpenClick() {
        openEditorForCurrentEntry();
      });
    }

    if (state.elements.togglePublish) {
      state.elements.togglePublish.addEventListener("click", function onTogglePublishClick() {
        toggleCurrentEntryPublishState();
      });
    }

    if (state.elements.accessToggle) {
      state.elements.accessToggle.addEventListener("click", function onAccessToggleClick(event) {
        event.stopPropagation();
        setAccessPanelOpen(!isAccessPanelOpen());
      });
    }

    if (state.elements.accessInput) {
      state.elements.accessInput.addEventListener("input", function onAccessInput() {
        saveAccessCodeLocal(state.elements.accessInput.value || "");
        refreshManageUi();
      });
    }

    if (state.elements.accessPanel) {
      state.elements.accessPanel.addEventListener("click", function onAccessPanelClick(event) {
        event.stopPropagation();
      });
    }


    if (state.elements.editorClose && state.elements.editorClose.length) {
      for (var i = 0; i < state.elements.editorClose.length; i += 1) {
        state.elements.editorClose[i].addEventListener("click", function onEditorCloseClick() {
          closeEditorModal();
        });
      }
    }

    if (state.elements.editorForm) {
      bindEditorFieldAutomation(state.elements.editorForm);
      state.elements.editorForm.addEventListener("submit", function onEditorSubmit(event) {
        event.preventDefault();
        submitEditorForm();
      });
    }

    if (state.elements.editorMarkdownToolbar) {
      state.elements.editorMarkdownToolbar.addEventListener("mousedown", function onMarkdownToolbarMouseDown(event) {
        var button = event.target.closest("button[data-md-action]");
        if (!button || button.disabled) {
          return;
        }

        event.preventDefault();
      });

      state.elements.editorMarkdownToolbar.addEventListener("click", function onMarkdownToolbarClick(event) {
        var button = event.target.closest("button[data-md-action]");
        if (!button || button.disabled) {
          return;
        }

        event.preventDefault();
        applyMarkdownToolbarAction(button.getAttribute("data-md-action"));
      });
    }

    if (state.elements.editorContentMd) {
      state.elements.editorContentMd.addEventListener("beforeinput", function onEditorMarkdownBeforeInput(event) {
        rememberEditorHistoryBeforeNativeInput(event);
      });

      state.elements.editorContentMd.addEventListener("input", function onEditorMarkdownInput(event) {
        commitEditorHistoryAfterNativeInput(event);
      });

      state.elements.editorContentMd.addEventListener("keydown", function onEditorMarkdownKeydown(event) {
        handleEditorMarkdownShortcut(event);
      });
    }

    if (state.elements.editorColorPicker) {
      state.elements.editorColorPicker.addEventListener("click", function onColorChoiceClick(event) {
        var button = event.target.closest("button[data-docs-color-choice]");
        if (!button || button.disabled) {
          return;
        }

        event.preventDefault();
        insertColoredText(button.getAttribute("data-docs-color-choice"));
      });
    }
    if (state.elements.editorImageUpload) {
      state.elements.editorImageUpload.addEventListener("click", function onImageUploadClick() {
        uploadImageFromEditor();
      });
    }

    if (state.elements.editorMediaOpen) {
      state.elements.editorMediaOpen.addEventListener("click", function onMediaLibraryOpenClick() {
        toggleMediaLibraryPanel();
      });
    }

    if (state.elements.editorMediaSearch) {
      state.elements.editorMediaSearch.addEventListener("input", function onMediaSearchInput(event) {
        state.mediaLibraryQuery = readString(event.target.value, "");
        renderMediaLibraryResults();
      });

      state.elements.editorMediaSearch.addEventListener("keydown", function onMediaSearchKeydown(event) {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          closeMediaLibraryPanel({ restoreTextareaFocus: true });
          return;
        }

        if (event.key !== "Enter") {
          return;
        }

        var firstInsert = state.elements.editorMediaResults
          ? state.elements.editorMediaResults.querySelector("button[data-docs-media-insert]")
          : null;

        if (!firstInsert || firstInsert.disabled) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        insertImageFromLibraryByPath(firstInsert.getAttribute("data-docs-media-insert"));
      });
    }

    if (state.elements.editorMediaResults) {
      state.elements.editorMediaResults.addEventListener("click", function onMediaLibraryResultClick(event) {
        var button = event.target.closest("button[data-docs-media-insert]");
        if (!button || button.disabled) {
          return;
        }

        event.preventDefault();
        insertImageFromLibraryByPath(button.getAttribute("data-docs-media-insert"));
      });
    }

    if (state.elements.editorInternalLinkInput) {
      state.elements.editorInternalLinkInput.addEventListener("input", function onInternalLinkInput(event) {
        state.internalLinkQuery = readString(event.target.value, "");
        renderInternalLinkResults();
      });

      state.elements.editorInternalLinkInput.addEventListener("keydown", function onInternalLinkInputKeydown(event) {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          closeInternalLinkPicker({ restoreTextareaFocus: true });
          return;
        }

        if (event.key !== "Enter") {
          return;
        }

        var firstResult = state.elements.editorInternalLinkResults
          ? state.elements.editorInternalLinkResults.querySelector("button[data-docs-internal-link-target]")
          : null;

        if (!firstResult || firstResult.disabled) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        insertInternalDocLinkByKey(firstResult.getAttribute("data-docs-internal-link-target"));
      });
    }

    if (state.elements.editorInternalLinkResults) {
      state.elements.editorInternalLinkResults.addEventListener("click", function onInternalLinkResultClick(event) {
        var button = event.target.closest("button[data-docs-internal-link-target]");
        if (!button || button.disabled) {
          return;
        }

        event.preventDefault();
        insertInternalDocLinkByKey(button.getAttribute("data-docs-internal-link-target"));
      });
    }

    document.addEventListener("keydown", function onKeyDown(event) {
      if (event.key !== "Escape") {
        return;
      }

      if (isInternalLinkPickerOpen()) {
        closeInternalLinkPicker({ restoreTextareaFocus: true });
        return;
      }

      if (isColorPickerOpen()) {
        closeColorPicker({ restoreTextareaFocus: true });
        return;
      }

      if (isMediaLibraryPanelOpen()) {
        closeMediaLibraryPanel({ restoreTextareaFocus: true });
        return;
      }

      if (isEditorOpen()) {
        return;
      }

      if (isAccessPanelOpen()) {
        setAccessPanelOpen(false);
        return;
      }

      if (isMobileViewport() && isDocsTreeExpanded()) {
        setDocsTreeExpanded(false);
      }
    });

    window.addEventListener("resize", function onResize() {
      syncDocsTreeToggleState();
    });

    document.addEventListener("enclave:sidebar-ready", function onSidebarReady() {
      state.elements.groupLinks = document.querySelectorAll("[data-doc-group-link]");
      if (state.currentEntry) {
        updatePortalGroupState(state.currentEntry.sectionSlug);
      }
    });

    window.addEventListener("popstate", function onPopState() {
      loadCurrentDocFromUrl({ replaceOnFallback: false });
    });

    document.addEventListener("enclave:access-code-updated", function onAccessCodeUpdated() {
      refreshManageUi();
    });
    document.addEventListener("enclave:manage-access-changed", function onManageAccessChanged(event) {
      var detail = event && event.detail ? event.detail : null;
      var enabled = detail && typeof detail.enabled === "boolean" ? detail.enabled : null;
      refreshManageUi(enabled);
    });

    document.addEventListener("enclave:layout-ready", function onLayoutReady() {
      var enabled = readManageAccessFromLayout();
      if (typeof enabled === "boolean") {
        refreshManageUi(enabled);
      }
    });

    window.addEventListener("storage", function onStorage(event) {
      if (event.key !== ACCESS_CODE_KEY) {
        return;
      }

      refreshManageUi();
    });

    window.addEventListener("focus", function onFocus() {
      refreshManageUi();
    });

    document.addEventListener("visibilitychange", function onVisibilityChange() {
      if (document.visibilityState !== "visible") {
        return;
      }

      refreshManageUi();
    });

    document.addEventListener("click", function onDocumentClick(event) {
      if (!isAccessPanelOpen()) {
        return;
      }

      if (
        state.elements.accessPanel &&
        state.elements.accessPanel.contains(event.target)
      ) {
        return;
      }

      if (
        state.elements.accessToggle &&
        state.elements.accessToggle.contains(event.target)
      ) {
        return;
      }

      setAccessPanelOpen(false);
    });

    document.addEventListener("click", function onInternalLinkPanelOutsideClick(event) {
      if (!isInternalLinkPickerOpen()) {
        return;
      }

      if (isEventInsideInternalLinkPicker(event.target)) {
        return;
      }

      closeInternalLinkPicker();
    });

    document.addEventListener("click", function onColorPickerOutsideClick(event) {
      if (!isColorPickerOpen()) {
        return;
      }

      if (isEventInsideColorPicker(event.target)) {
        return;
      }

      closeColorPicker();
    });
    document.addEventListener("click", function onMediaLibraryOutsideClick(event) {
      if (!isMediaLibraryPanelOpen()) {
        return;
      }

      if (isEventInsideMediaLibraryPanel(event.target)) {
        return;
      }

      closeMediaLibraryPanel();
    });
  }

  function isMediaLibraryPanelOpen() {
    return !!(
      state.elements &&
      state.elements.editorMediaPanel &&
      !state.elements.editorMediaPanel.hasAttribute("hidden")
    );
  }

  function isEventInsideMediaLibraryPanel(target) {
    if (!state.elements) {
      return false;
    }

    if (state.elements.editorMediaPanel && state.elements.editorMediaPanel.contains(target)) {
      return true;
    }

    if (
      state.elements.editorMediaOpen &&
      target &&
      target.closest &&
      target.closest("[data-docs-media-open]") &&
      state.elements.editorMediaOpen.contains(target)
    ) {
      return true;
    }

    return false;
  }

  function toggleMediaLibraryPanel() {
    if (isMediaLibraryPanelOpen()) {
      closeMediaLibraryPanel({ restoreTextareaFocus: true });
      return;
    }

    openMediaLibraryPanel();
  }

  async function openMediaLibraryPanel() {
    if (!state.elements || !state.elements.editorMediaPanel) {
      return;
    }

    closeInternalLinkPicker();

    state.elements.editorMediaPanel.hidden = false;

    if (state.elements.editorMediaSearch) {
      state.elements.editorMediaSearch.value = "";
    }

    state.mediaLibraryQuery = "";
    setMediaLibraryStatus("", "");
    renderMediaLibraryResults();

    await ensureMediaLibraryLoaded(state.mediaLibraryNeedsRefresh);

    if (state.elements.editorMediaSearch) {
      state.elements.editorMediaSearch.focus();
    }
  }

  function closeMediaLibraryPanel(options) {
    if (!state.elements || !state.elements.editorMediaPanel) {
      return;
    }

    var opts = options || {};

    state.elements.editorMediaPanel.hidden = true;
    state.mediaLibraryQuery = "";

    if (state.elements.editorMediaSearch) {
      state.elements.editorMediaSearch.value = "";
    }

    if (state.elements.editorMediaResults) {
      state.elements.editorMediaResults.innerHTML = "";
    }

    setMediaLibraryStatus("", "");

    if (opts.restoreTextareaFocus) {
      var textarea = getEditorMarkdownTextarea();
      if (textarea) {
        textarea.focus();
      }
    }
  }

  async function ensureMediaLibraryLoaded(forceReload) {
    if (state.mediaLibraryLoading) {
      return;
    }

    if (!forceReload && Array.isArray(state.mediaLibraryItems)) {
      renderMediaLibraryResults();
      return;
    }

    setMediaLibraryLoading(true);
    setMediaLibraryStatus("Caricamento libreria immagini...", "");

    try {
      var items = await fetchWikiImageLibrary();
      state.mediaLibraryItems = items;
      state.mediaLibraryNeedsRefresh = false;
      renderMediaLibraryResults();

      if (!items.length) {
        setMediaLibraryStatus("Nessuna immagine disponibile nel bucket wiki-images.", "");
      } else {
        setMediaLibraryStatus("", "");
      }
    } catch (error) {
      console.error("Errore caricamento libreria immagini:", error);
      state.mediaLibraryItems = [];
      renderMediaLibraryResults();
      setMediaLibraryStatus(readString(error && error.message, "Impossibile caricare la libreria immagini."), "error");
    } finally {
      setMediaLibraryLoading(false);
    }
  }

  async function fetchWikiImageLibrary() {
    var response = await fetch(WIKI_IMAGE_LIST_ENDPOINT, {
      method: "GET",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: "Bearer " + SUPABASE_ANON_KEY,
        "x-import-secret": IMPORT_SECRET,
      },
    });

    var responseBody = await parseResponseBody(response);

    if (!response.ok) {
      throw new Error(readSupabaseError(responseBody, response.status));
    }

    if (responseBody && responseBody.success === false) {
      throw new Error(readString(responseBody.error || responseBody.message, "Caricamento libreria immagini non riuscito."));
    }

    var rawItems = [];

    if (responseBody && Array.isArray(responseBody.images)) {
      rawItems = responseBody.images;
    } else if (Array.isArray(responseBody)) {
      rawItems = responseBody;
    }

    var items = [];

    for (var i = 0; i < rawItems.length; i += 1) {
      var normalized = normalizeWikiImageLibraryItem(rawItems[i]);
      if (!normalized) {
        continue;
      }

      items.push(normalized);
    }

    items.sort(compareWikiImageLibraryItems);
    return items;
  }

  function normalizeWikiImageLibraryItem(raw) {
    if (!raw || typeof raw !== "object") {
      return null;
    }

    var path = readString(raw.path, "");
    var publicUrl = readString(raw.public_url || raw.publicUrl, "");
    if (!path || !publicUrl) {
      return null;
    }

    var name = readString(raw.name, "") || readString(path.split("/").pop(), "");
    if (!name) {
      name = "immagine";
    }

    return {
      name: name,
      path: path,
      publicUrl: publicUrl,
      createdAt: readString(raw.created_at || raw.createdAt, ""),
      updatedAt: readString(raw.updated_at || raw.updatedAt, ""),
      searchName: normalizeSearchText(name),
      searchPath: normalizeSearchText(path),
    };
  }

  function compareWikiImageLibraryItems(left, right) {
    var leftDate = Date.parse(readString(left.updatedAt, left.createdAt));
    var rightDate = Date.parse(readString(right.updatedAt, right.createdAt));

    var leftValidDate = Number.isFinite(leftDate);
    var rightValidDate = Number.isFinite(rightDate);

    if (leftValidDate && rightValidDate && rightDate !== leftDate) {
      return rightDate - leftDate;
    }

    if (leftValidDate && !rightValidDate) {
      return -1;
    }

    if (!leftValidDate && rightValidDate) {
      return 1;
    }

    return readString(left.path, "").localeCompare(readString(right.path, ""), "it", {
      sensitivity: "base",
    });
  }

  function setMediaLibraryLoading(isLoading) {
    state.mediaLibraryLoading = !!isLoading;

    if (!state.elements) {
      return;
    }

    if (state.elements.editorMediaOpen) {
      state.elements.editorMediaOpen.disabled = !!isLoading || state.editorSaving || state.imageUploading;
    }

    if (state.elements.editorMediaSearch) {
      state.elements.editorMediaSearch.disabled = !!isLoading || state.editorSaving || state.imageUploading;
    }
  }

  function setMediaLibraryStatus(message, tone) {
    if (!state.elements || !state.elements.editorMediaStatus) {
      return;
    }

    var status = state.elements.editorMediaStatus;
    status.textContent = readString(message, "");
    status.classList.remove("is-error", "is-success");

    state.mediaLibraryStatusTone = "";

    if (tone === "error") {
      status.classList.add("is-error");
      state.mediaLibraryStatusTone = "error";
      return;
    }

    if (tone === "success") {
      status.classList.add("is-success");
      state.mediaLibraryStatusTone = "success";
    }
  }

  function renderMediaLibraryResults() {
    if (!state.elements || !state.elements.editorMediaResults) {
      return;
    }

    var container = state.elements.editorMediaResults;
    container.innerHTML = "";

    if (state.mediaLibraryLoading) {
      var loading = document.createElement("p");
      loading.className = "docs-media-library__empty";
      loading.textContent = "Caricamento immagini...";
      container.appendChild(loading);
      return;
    }

    if (!Array.isArray(state.mediaLibraryItems) || !state.mediaLibraryItems.length) {
      var empty = document.createElement("p");
      empty.className = "docs-media-library__empty";
      empty.textContent = "Nessuna immagine disponibile.";
      container.appendChild(empty);
      return;
    }

    var results = getFilteredMediaLibraryItems(normalizeSearchText(state.mediaLibraryQuery));

    if (!results.length) {
      var emptySearch = document.createElement("p");
      emptySearch.className = "docs-media-library__empty";
      emptySearch.textContent = "Nessuna immagine trovata per questa ricerca.";
      container.appendChild(emptySearch);
      return;
    }

    var list = document.createElement("ul");
    list.className = "docs-media-library__list";

    for (var i = 0; i < results.length; i += 1) {
      var itemData = results[i].item;
      var item = document.createElement("li");
      item.className = "docs-media-library__item";

      var thumb = document.createElement("img");
      thumb.className = "docs-media-library__thumb";
      thumb.src = itemData.publicUrl;
      thumb.alt = "Anteprima immagine";
      thumb.loading = "lazy";

      thumb.addEventListener("error", function onThumbError(event) {
        var image = event && event.target;
        if (!image || !image.parentNode) {
          return;
        }

        var fallback = document.createElement("span");
        fallback.className = "docs-media-library__fallback";
        fallback.setAttribute("aria-hidden", "true");

        var fallbackIcon = document.createElement("i");
        fallbackIcon.className = "fa-solid fa-image";
        fallbackIcon.setAttribute("aria-hidden", "true");
        fallback.appendChild(fallbackIcon);

        image.parentNode.replaceChild(fallback, image);
      });

      var meta = document.createElement("div");
      meta.className = "docs-media-library__meta";

      var name = document.createElement("span");
      name.className = "docs-media-library__name";
      name.textContent = itemData.name;
      meta.appendChild(name);

      var path = document.createElement("span");
      path.className = "docs-media-library__path";
      path.textContent = itemData.path;
      meta.appendChild(path);

      var insertButton = document.createElement("button");
      insertButton.type = "button";
      insertButton.className = "docs-media-library__insert";
      insertButton.setAttribute("data-docs-media-insert", itemData.path);
      insertButton.textContent = "Inserisci";
      insertButton.setAttribute("aria-label", "Inserisci " + itemData.name);

      item.appendChild(thumb);
      item.appendChild(meta);
      item.appendChild(insertButton);

      list.appendChild(item);
    }

    container.appendChild(list);
  }

  function getFilteredMediaLibraryItems(normalizedQuery) {
    if (!Array.isArray(state.mediaLibraryItems) || !state.mediaLibraryItems.length) {
      return [];
    }

    if (!normalizedQuery) {
      return state.mediaLibraryItems.slice(0, MEDIA_LIBRARY_RESULT_LIMIT).map(function (item) {
        return {
          item: item,
          score: 1,
        };
      });
    }

    var terms = normalizedQuery
      .split(/\s+/)
      .map(function (term) {
        return normalizeSearchText(term);
      })
      .filter(function (term) {
        return !!term;
      });

    if (!terms.length) {
      return [];
    }

    var scored = [];

    for (var i = 0; i < state.mediaLibraryItems.length; i += 1) {
      var item = state.mediaLibraryItems[i];
      var score = scoreMediaLibraryItem(item, normalizedQuery, terms);
      if (score <= 0) {
        continue;
      }

      scored.push({
        item: item,
        score: score,
      });
    }

    scored.sort(function (left, right) {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return compareWikiImageLibraryItems(left.item, right.item);
    });

    return scored.slice(0, MEDIA_LIBRARY_RESULT_LIMIT);
  }

  function scoreMediaLibraryItem(item, normalizedQuery, terms) {
    if (!item) {
      return 0;
    }

    var name = item.searchName || "";
    var path = item.searchPath || "";
    var score = 0;

    if (name === normalizedQuery || path === normalizedQuery) {
      score += 120;
    }

    if (name.indexOf(normalizedQuery) !== -1) {
      score += name.indexOf(normalizedQuery) === 0 ? 64 : 42;
    }

    if (path.indexOf(normalizedQuery) !== -1) {
      score += path.indexOf(normalizedQuery) === 0 ? 40 : 24;
    }

    for (var i = 0; i < terms.length; i += 1) {
      var term = terms[i];
      if (!term) {
        continue;
      }

      var inName = name.indexOf(term) !== -1;
      var inPath = path.indexOf(term) !== -1;

      if (!inName && !inPath) {
        return 0;
      }

      score += inName ? 12 : 7;
    }

    return score;
  }

  function resolveMediaLibraryItemByPath(path) {
    var normalizedPath = readString(path, "");
    if (!normalizedPath || !Array.isArray(state.mediaLibraryItems)) {
      return null;
    }

    for (var i = 0; i < state.mediaLibraryItems.length; i += 1) {
      if (readString(state.mediaLibraryItems[i].path, "") === normalizedPath) {
        return state.mediaLibraryItems[i];
      }
    }

    return null;
  }

  function insertImageFromLibraryByPath(path) {
    var item = resolveMediaLibraryItemByPath(path);
    if (!item) {
      setMediaLibraryStatus("Immagine non disponibile.", "error");
      return;
    }

    var altText = readString(state.elements && state.elements.editorImageAlt && state.elements.editorImageAlt.value, "Immagine");
    var markdownImage = "![" + escapeMarkdownAltText(altText) + "](" + escapeMarkdownUrl(item.publicUrl) + ")";

    insertMarkdownInEditor(markdownImage);
    setMediaLibraryStatus("Immagine inserita nel contenuto.", "success");
    closeMediaLibraryPanel();

    var textarea = getEditorMarkdownTextarea();
    if (textarea) {
      textarea.focus();
    }
  }

  function escapeMarkdownUrl(url) {
    return String(url || "")
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)")
      .replace(/\s/g, "%20");
  }

  function markMediaLibraryStale() {
    state.mediaLibraryNeedsRefresh = true;

    if (isMediaLibraryPanelOpen()) {
      void ensureMediaLibraryLoaded(true);
    }
  }
  function isDocsTreeReorderEnabled() {
    return state.isManageUnlocked && state.reorderMode && !state.reorderSaving;
  }

  function setReorderMode(isEnabled) {
    var nextValue = !!isEnabled;

    if (!state.isManageUnlocked) {
      nextValue = false;
    }

    if (state.reorderMode === nextValue) {
      syncReorderToggleUi();
      return;
    }

    state.reorderMode = nextValue;
    syncReorderToggleUi();
    clearDocsTreeDragState();
    renderDocsTree();

    if (!nextValue) {
      setDocsReorderStatus("", "");
    }
  }

  function syncReorderToggleUi() {
    if (!state.elements || !state.elements.reorderToggle) {
      return;
    }

    var button = state.elements.reorderToggle;
    var canUse = state.isManageUnlocked;

    button.hidden = !canUse;
    button.disabled = !canUse || state.reorderSaving;
    button.classList.toggle("is-active", !!(canUse && state.reorderMode));
    button.setAttribute("aria-pressed", canUse && state.reorderMode ? "true" : "false");

    setIconButtonLabel(button, canUse && state.reorderMode ? "Disattiva riordino" : "Attiva riordino");
  }

  function syncTreeControlsVisibility() {
    if (!state.elements || !state.elements.treeControls) {
      return;
    }

    state.elements.treeControls.hidden = !state.isManageUnlocked;
  }

  function normalizeReorderParentSlug(value) {
    return normalizeDocPath(readString(value, ""));
  }

  function normalizeReorderNavGroup(value) {
    return readString(value, "");
  }

  function toNavGroupKey(value) {
    var normalized = cleanSegment(readString(value, ""));
    return normalized || "__none__";
  }

  function readReorderKindFromRow(row) {
    return readString(row && row.getAttribute("data-reorder-kind"), "doc");
  }

  function readReorderGroupMetaFromRow(row) {
    if (!row) {
      return null;
    }

    var section = cleanSegment(readString(row.getAttribute("data-section"), ""));
    var navGroup = normalizeReorderNavGroup(row.getAttribute("data-nav-group"));
    var navGroupKey = toNavGroupKey(navGroup);

    if (!section || !navGroupKey) {
      return null;
    }

    return {
      section: section,
      navGroup: navGroup,
      navGroupKey: navGroupKey,
    };
  }

  function getTreeDragRow(target) {
    if (!target || !target.closest) {
      return null;
    }

    return target.closest("[data-docs-draggable='true']");
  }

  function readReorderGroupFromRow(row) {
    if (!row) {
      return null;
    }

    var section = cleanSegment(readString(row.getAttribute("data-section"), ""));
    var parentSlug = normalizeReorderParentSlug(row.getAttribute("data-parent-slug"));
    var navGroup = normalizeReorderNavGroup(row.getAttribute("data-nav-group"));

    if (!section) {
      return null;
    }

    return {
      section: section,
      parentSlug: parentSlug,
      navGroup: navGroup,
      navGroupKey: toNavGroupKey(navGroup),
    };
  }

  function isSameReorderGroup(left, right) {
    if (!left || !right) {
      return false;
    }

    return (
      left.section === right.section &&
      left.parentSlug === right.parentSlug &&
      left.navGroupKey === right.navGroupKey
    );
  }

  function clearDocsTreeDropIndicators() {
    if (!state.elements || !state.elements.tree) {
      return;
    }

    var marked = state.elements.tree.querySelectorAll(".is-drop-before, .is-drop-after");
    for (var i = 0; i < marked.length; i += 1) {
      marked[i].classList.remove("is-drop-before", "is-drop-after");
    }
  }

  function clearDocsTreeDragState() {
    if (!state.elements || !state.elements.tree) {
      state.reorderDrag = null;
      return;
    }

    clearDocsTreeDropIndicators();

    var draggingRows = state.elements.tree.querySelectorAll(".is-dragging");
    for (var i = 0; i < draggingRows.length; i += 1) {
      draggingRows[i].classList.remove("is-dragging");
    }

    state.reorderDrag = null;
  }

  function setDocsTreeDropIndicator(row, position) {
    clearDocsTreeDropIndicators();

    if (!row) {
      return;
    }

    row.classList.add(position === "before" ? "is-drop-before" : "is-drop-after");
  }

  function resolveDropPosition(row, clientY) {
    if (!row || typeof row.getBoundingClientRect !== "function") {
      return "after";
    }

    var bounds = row.getBoundingClientRect();
    var midpoint = bounds.top + bounds.height / 2;
    return clientY < midpoint ? "before" : "after";
  }

  function handleDocsTreeDragStart(event) {
    if (!isDocsTreeReorderEnabled()) {
      if (event && typeof event.preventDefault === "function") {
        event.preventDefault();
      }
      return;
    }

    var row = getTreeDragRow(event.target);
    if (!row) {
      return;
    }

    var reorderKind = readReorderKindFromRow(row);

    if (reorderKind === "group") {
      var sourceGroup = readReorderGroupMetaFromRow(row);
      if (!sourceGroup) {
        event.preventDefault();
        return;
      }

      state.reorderDrag = {
        kind: "group",
        sourceGroup: sourceGroup,
        targetGroupKey: "",
        targetPosition: "after",
      };

      row.classList.add("is-dragging");

      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.dropEffect = "move";
        try {
          event.dataTransfer.setData("text/plain", "group:" + sourceGroup.navGroupKey);
        } catch (_groupError) {
          // Ignore dataTransfer set errors.
        }
      }

      return;
    }

    var docKey = normalizeDocPath(readString(row.getAttribute("data-doc-key"), ""));
    var group = readReorderGroupFromRow(row);

    if (!docKey || !group) {
      event.preventDefault();
      return;
    }

    state.reorderDrag = {
      kind: "doc",
      sourceDocKey: docKey,
      sourceGroup: group,
      targetDocKey: "",
      targetPosition: "after",
    };

    row.classList.add("is-dragging");

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.dropEffect = "move";
      try {
        event.dataTransfer.setData("text/plain", docKey);
      } catch (_error) {
        // Ignore dataTransfer set errors.
      }
    }
  }

  function handleDocsTreeDragOver(event) {
    if (!state.reorderDrag || state.reorderSaving) {
      return;
    }

    var targetRow = getTreeDragRow(event.target);
    if (!targetRow) {
      clearDocsTreeDropIndicators();
      return;
    }

    var position = resolveDropPosition(targetRow, event.clientY);

    if (state.reorderDrag.kind === "group") {
      if (readReorderKindFromRow(targetRow) !== "group") {
        clearDocsTreeDropIndicators();
        return;
      }

      var targetGroup = readReorderGroupMetaFromRow(targetRow);
      if (!targetGroup) {
        clearDocsTreeDropIndicators();
        return;
      }

      if (
        !state.reorderDrag.sourceGroup ||
        state.reorderDrag.sourceGroup.section !== targetGroup.section ||
        state.reorderDrag.sourceGroup.navGroupKey === targetGroup.navGroupKey
      ) {
        clearDocsTreeDropIndicators();
        return;
      }

      event.preventDefault();
      state.reorderDrag.targetGroupKey = targetGroup.navGroupKey;
      state.reorderDrag.targetPosition = position;

      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "move";
      }

      setDocsTreeDropIndicator(targetRow, position);
      return;
    }

    if (readReorderKindFromRow(targetRow) !== "doc") {
      clearDocsTreeDropIndicators();
      return;
    }

    var targetDocKey = normalizeDocPath(readString(targetRow.getAttribute("data-doc-key"), ""));
    if (!targetDocKey || targetDocKey === state.reorderDrag.sourceDocKey) {
      clearDocsTreeDropIndicators();
      return;
    }

    var targetDocGroup = readReorderGroupFromRow(targetRow);
    if (!isSameReorderGroup(state.reorderDrag.sourceGroup, targetDocGroup)) {
      clearDocsTreeDropIndicators();
      return;
    }

    event.preventDefault();
    state.reorderDrag.targetDocKey = targetDocKey;
    state.reorderDrag.targetPosition = position;

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }

    setDocsTreeDropIndicator(targetRow, position);
  }

  function handleDocsTreeDrop(event) {
    if (!state.reorderDrag || state.reorderSaving) {
      return;
    }

    event.preventDefault();

    if (state.reorderDrag.kind === "group") {
      var sourceGroup = state.reorderDrag.sourceGroup;
      var targetGroupKey = readString(state.reorderDrag.targetGroupKey, "");
      var groupTargetPosition = state.reorderDrag.targetPosition;

      clearDocsTreeDragState();

      if (!sourceGroup || !targetGroupKey) {
        return;
      }

      void persistNavGroupReorder(sourceGroup.section, sourceGroup.navGroupKey, targetGroupKey, groupTargetPosition);
      return;
    }

    var sourceDocKey = state.reorderDrag.sourceDocKey;
    var targetDocKey = state.reorderDrag.targetDocKey;
    var targetPosition = state.reorderDrag.targetPosition;
    var group = state.reorderDrag.sourceGroup;

    clearDocsTreeDragState();

    if (!sourceDocKey || !targetDocKey || !group) {
      return;
    }

    void persistDocsTreeReorder(group, sourceDocKey, targetDocKey, targetPosition);
  }

  async function persistNavGroupReorder(section, sourceGroupKey, targetGroupKey, targetPosition) {
    if (!section || !sourceGroupKey || !targetGroupKey || state.reorderSaving) {
      return;
    }

    var groups = getSiblingNavGroupsForReorder(section);
    if (groups.length < 2) {
      return;
    }

    var orderedGroupKeys = [];
    for (var i = 0; i < groups.length; i += 1) {
      orderedGroupKeys.push(groups[i].navGroupKey);
    }

    var sourceIndex = orderedGroupKeys.indexOf(sourceGroupKey);
    var targetIndex = orderedGroupKeys.indexOf(targetGroupKey);

    if (sourceIndex === -1 || targetIndex === -1) {
      return;
    }

    orderedGroupKeys.splice(sourceIndex, 1);
    var insertIndex = targetPosition === "before" ? targetIndex : targetIndex + 1;
    if (sourceIndex < targetIndex) {
      insertIndex -= 1;
    }

    insertIndex = Math.max(0, Math.min(insertIndex, orderedGroupKeys.length));
    orderedGroupKeys.splice(insertIndex, 0, sourceGroupKey);

    var unchanged = true;
    for (var j = 0; j < orderedGroupKeys.length; j += 1) {
      if (orderedGroupKeys[j] !== groups[j].navGroupKey) {
        unchanged = false;
        break;
      }
    }

    if (unchanged) {
      return;
    }

    var groupMap = new Map();
    for (var k = 0; k < groups.length; k += 1) {
      groupMap.set(groups[k].navGroupKey, groups[k]);
    }

    var items = [];
    for (var g = 0; g < orderedGroupKeys.length; g += 1) {
      var groupData = groupMap.get(orderedGroupKeys[g]);
      if (!groupData) {
        continue;
      }

      items.push({
        nav_group: toNullableString(groupData.navGroup),
        nav_group_order: (g + 1) * REORDER_SORT_STEP,
      });
    }

    if (!items.length) {
      return;
    }

    state.reorderSaving = true;
    renderDocsTree();
    setDocsReorderStatus("Riordino gruppi in corso...", "");

    try {
      await submitWikiReorder({
        mode: "groups",
        section: section,
        items: items,
      });

      await refreshDocsData(state.currentEntry ? state.currentEntry.docKey : "");
      setDocsReorderStatus("Ordine gruppi aggiornato.", "success");
    } catch (error) {
      console.error("Errore riordino gruppi wiki:", error);
      setDocsReorderStatus(readString(error && error.message, "Riordino gruppi non riuscito."), "error");
    } finally {
      state.reorderSaving = false;
      renderDocsTree();
    }
  }

  function getSiblingNavGroupsForReorder(section) {
    var sectionSlug = cleanSegment(readString(section, ""));
    if (!sectionSlug || !state.index || !Array.isArray(state.index.sections)) {
      return [];
    }

    var sectionData = null;
    for (var i = 0; i < state.index.sections.length; i += 1) {
      if (state.index.sections[i] && state.index.sections[i].slug === sectionSlug) {
        sectionData = state.index.sections[i];
        break;
      }
    }

    if (!sectionData || !Array.isArray(sectionData.nodes)) {
      return [];
    }

    var groups = [];
    for (var j = 0; j < sectionData.nodes.length; j += 1) {
      var node = sectionData.nodes[j];
      if (!node || node.kind !== "group") {
        continue;
      }

      groups.push({
        navGroup: normalizeReorderNavGroup(node.navGroup),
        navGroupKey: toNavGroupKey(node.navGroup),
      });
    }

    return groups;
  }
  async function persistDocsTreeReorder(group, sourceDocKey, targetDocKey, targetPosition) {
    if (!group || !sourceDocKey || !targetDocKey || state.reorderSaving) {
      return;
    }

    var siblings = getSiblingPagesForReorder(group.section, group.parentSlug, group.navGroupKey);
    if (siblings.length < 2) {
      return;
    }

    var orderedDocKeys = [];
    for (var i = 0; i < siblings.length; i += 1) {
      orderedDocKeys.push(siblings[i].docKey);
    }

    var sourceIndex = orderedDocKeys.indexOf(sourceDocKey);
    var targetIndex = orderedDocKeys.indexOf(targetDocKey);

    if (sourceIndex === -1 || targetIndex === -1) {
      return;
    }

    orderedDocKeys.splice(sourceIndex, 1);
    var insertIndex = targetPosition === "before" ? targetIndex : targetIndex + 1;
    if (sourceIndex < targetIndex) {
      insertIndex -= 1;
    }

    insertIndex = Math.max(0, Math.min(insertIndex, orderedDocKeys.length));
    orderedDocKeys.splice(insertIndex, 0, sourceDocKey);

    var unchanged = true;
    for (var j = 0; j < orderedDocKeys.length; j += 1) {
      if (orderedDocKeys[j] !== siblings[j].docKey) {
        unchanged = false;
        break;
      }
    }

    if (unchanged) {
      return;
    }

    var pageMap = state.manageIndex && state.manageIndex.pageMap ? state.manageIndex.pageMap : state.index && state.index.pageMap ? state.index.pageMap : null;

    if (!pageMap) {
      return;
    }

    var items = [];
    for (var k = 0; k < orderedDocKeys.length; k += 1) {
      var docKey = orderedDocKeys[k];
      var entry = pageMap.get(docKey);
      if (!entry) {
        continue;
      }

      items.push({
        slug: normalizeDocPath(readString(entry.rawSlug, entry.docKey)),
        sort_order: (k + 1) * REORDER_SORT_STEP,
      });
    }

    if (!items.length) {
      return;
    }

    state.reorderSaving = true;
    renderDocsTree();
    setDocsReorderStatus("Riordino in corso...", "");

    try {
      await submitWikiReorder({
        section: group.section,
        parent_slug: group.parentSlug || null,
        nav_group: group.navGroup || null,
        items: items,
      });

      await refreshDocsData(state.currentEntry ? state.currentEntry.docKey : "");
      setDocsReorderStatus("Ordine aggiornato.", "success");
    } catch (error) {
      console.error("Errore riordino pagine wiki:", error);
      setDocsReorderStatus(readString(error && error.message, "Riordino non riuscito."), "error");
    } finally {
      state.reorderSaving = false;
      renderDocsTree();
    }
  }

  function getSiblingPagesForReorder(section, parentSlug, navGroupKey) {
    var sourcePages = state.manageIndex && Array.isArray(state.manageIndex.pages)
      ? state.manageIndex.pages
      : state.index && Array.isArray(state.index.pages)
      ? state.index.pages
      : [];

    var normalizedSection = cleanSegment(readString(section, ""));
    var normalizedParent = normalizeReorderParentSlug(parentSlug);
    var normalizedGroupKey = toNavGroupKey(navGroupKey);

    var siblings = [];

    for (var i = 0; i < sourcePages.length; i += 1) {
      var page = sourcePages[i];
      if (!page) {
        continue;
      }

      if (page.sectionSlug !== normalizedSection) {
        continue;
      }

      if (normalizeReorderParentSlug(page.parentSlug) !== normalizedParent) {
        continue;
      }

      if (toNavGroupKey(page.navGroup) !== normalizedGroupKey) {
        continue;
      }

      siblings.push(page);
    }

    return siblings;
  }

  async function submitWikiReorder(payload) {
    var response = await fetch(WIKI_REORDER_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: "Bearer " + SUPABASE_ANON_KEY,
        "x-import-secret": IMPORT_SECRET,
      },
      body: JSON.stringify(payload),
    });

    var responseBody = await parseResponseBody(response);

    if (!response.ok) {
      throw new Error(readSupabaseError(responseBody, response.status));
    }

    if (responseBody && responseBody.success === false) {
      throw new Error(readString(responseBody.error || responseBody.message, "Riordino non riuscito."));
    }

    return responseBody || {};
  }

  function setDocsReorderStatus(message, tone) {
    if (!state.elements || !state.elements.treeReorderStatus) {
      return;
    }

    var status = state.elements.treeReorderStatus;

    if (state.reorderStatusTimer) {
      window.clearTimeout(state.reorderStatusTimer);
      state.reorderStatusTimer = 0;
    }

    status.textContent = readString(message, "");
    status.classList.remove("is-success", "is-error");

    if (!status.textContent) {
      return;
    }

    if (tone === "success") {
      status.classList.add("is-success");
    } else if (tone === "error") {
      status.classList.add("is-error");
    }

    if (tone === "success" || tone === "error") {
      state.reorderStatusTimer = window.setTimeout(function clearStatusLater() {
        if (!state.elements || !state.elements.treeReorderStatus) {
          return;
        }

        state.elements.treeReorderStatus.textContent = "";
        state.elements.treeReorderStatus.classList.remove("is-success", "is-error");
        state.reorderStatusTimer = 0;
      }, 2600);
    }
  }

  function bindEditorFieldAutomation(form) {
    var titleInput = form.elements.namedItem("title");
    var slugInput = form.elements.namedItem("slug");
    var sectionInput = form.elements.namedItem("section");
    var parentSelect = form.elements.namedItem("parent_slug");

    if (titleInput) {
      titleInput.addEventListener("input", function onTitleInput() {
        if (state.editorMode !== "create" || state.editorSlugManual) {
          return;
        }

        autoPopulateCreateSlug();
        populateParentSlugOptions();
      });
    }

    if (sectionInput) {
      sectionInput.addEventListener("change", function onSectionChange() {
        if (state.editorMode === "create" && !state.editorSlugManual) {
          autoPopulateCreateSlug();
        }

        populateParentSlugOptions();
      });
    }

    if (slugInput) {
      slugInput.addEventListener("input", function onSlugInput() {
        if (state.editorMode === "create") {
          var value = readString(slugInput.value, "");
          state.editorSlugManual = !!value;
        }

        populateParentSlugOptions();
      });
    }

    if (parentSelect) {
      parentSelect.addEventListener("change", function onParentChange() {
        suggestDepthFromParent();
      });
    }
  }
  function isMobileViewport() {
    return window.matchMedia("(max-width: 1080px)").matches;
  }

  function isDocsTreeExpanded() {
    return !!(state.elements.treePanel && state.elements.treePanel.classList.contains("is-open"));
  }

  function setDocsTreeExpanded(isExpanded) {
    if (state.elements.treePanel) {
      state.elements.treePanel.classList.toggle("is-open", isExpanded);
    }

    if (state.elements.treeToggle) {
      state.elements.treeToggle.setAttribute("aria-expanded", String(isExpanded));
    }
  }

  function syncDocsTreeToggleState() {
    if (!state.elements.treeToggle) {
      return;
    }

    if (isMobileViewport()) {
      state.elements.treeToggle.setAttribute("aria-expanded", String(isDocsTreeExpanded()));
      return;
    }

    state.elements.treeToggle.setAttribute("aria-expanded", "true");
    if (state.elements.treePanel) {
      state.elements.treePanel.classList.remove("is-open");
    }
  }

  function syncManageAccessState(forcedEnabled) {
    var accessCode = "";
    var layoutManageEnabled = null;

    try {
      accessCode = localStorage.getItem(ACCESS_CODE_KEY) || "";
    } catch (_error) {
      accessCode = "";
    }

    if (typeof forcedEnabled === "boolean") {
      state.isManageUnlocked = forcedEnabled;
    } else {
      layoutManageEnabled = readManageAccessFromLayout();
      if (typeof layoutManageEnabled === "boolean") {
        state.isManageUnlocked = layoutManageEnabled;
      } else {
        state.isManageUnlocked = accessCode === VALID_ACCESS_CODE;
      }
    }

    if (!state.isManageUnlocked) {
      state.reorderMode = false;
    }

    updateAccessPanelUi(accessCode);
    syncTreeControlsVisibility();
    syncReorderToggleUi();
  }

  function readManageAccessFromLayout() {
    if (!window.EnclaveLayout || typeof window.EnclaveLayout.getProfileState !== "function") {
      return null;
    }

    var profileState = window.EnclaveLayout.getProfileState();
    var code = readString(profileState && profileState.code, "");

    if (code === VALID_ACCESS_CODE) {
      return true;
    }

    if (!code || !profileState || !profileState.player) {
      return false;
    }

    return hasWikiManagePermission(profileState.player);
  }

  function hasWikiManagePermission(player) {
    if (!player || typeof player !== "object") {
      return false;
    }

    return (
      isTruthyManageValue(player.can_manage_wiki) ||
      isTruthyManageValue(player.can_manage_admin) ||
      isTruthyManageValue(player.can_manage) ||
      isTruthyManageValue(player.is_admin)
    );
  }

  function isTruthyManageValue(value) {
    if (value === true || value === 1) {
      return true;
    }

    if (typeof value === "string") {
      var normalized = value.trim().toLowerCase();
      return normalized === "true" || normalized === "1" || normalized === "yes";
    }

    return false;
  }

  function refreshManageUi(forcedEnabled) {
    var wasUnlocked = state.isManageUnlocked;
    var docFromUrl = normalizeDocPath(readDocParam());
    var requestedHiddenDoc =
      !!docFromUrl &&
      !!state.index &&
      !!state.index.pageMap &&
      !state.index.pageMap.has(docFromUrl);

    syncManageAccessState(forcedEnabled);
    syncEditActionVisibility();
    syncTreeControlsVisibility();
    syncReorderToggleUi();
    renderDocsTree();

    if (wasUnlocked !== state.isManageUnlocked) {
      if (!state.isManageUnlocked) {
        setReorderMode(false);
      }

      fetchWikiPages()
        .then(function onAccessRefreshRows(rows) {
          rebuildWikiIndexes(rows);
          renderDocsTree();
          return loadCurrentDocFromUrl({ replaceOnFallback: false });
        })
        .catch(function onAccessRefreshDataError(error) {
          console.error("Errore refresh dati documentazione:", error);
        });
      return;
    }

    if (state.index && requestedHiddenDoc) {
      loadCurrentDocFromUrl({ replaceOnFallback: false }).catch(function onAccessRefreshError(error) {
        console.error("Errore aggiornamento accesso locale:", error);
      });
    }
  }
  function saveAccessCodeLocal(value) {
    try {
      var normalized = String(value || "");
      if (!normalized) {
        localStorage.removeItem(ACCESS_CODE_KEY);
        return;
      }

      localStorage.setItem(ACCESS_CODE_KEY, normalized);
    } catch (_error) {
      // Ignore localStorage write issues.
    }
  }

  function isAccessPanelOpen() {
    return !!(state.elements && state.elements.accessPanel && !state.elements.accessPanel.hasAttribute("hidden"));
  }

  function setAccessPanelOpen(isOpen) {
    if (!state.elements || !state.elements.accessPanel || !state.elements.accessToggle) {
      return;
    }

    if (isOpen) {
      state.elements.accessPanel.hidden = false;
      state.elements.accessToggle.setAttribute("aria-expanded", "true");

      if (state.elements.accessInput && typeof state.elements.accessInput.focus === "function") {
        state.elements.accessInput.focus();
        if (typeof state.elements.accessInput.select === "function") {
          state.elements.accessInput.select();
        }
      }
      return;
    }

    state.elements.accessPanel.hidden = true;
    state.elements.accessToggle.setAttribute("aria-expanded", "false");
  }

  function updateAccessPanelUi(accessCode) {
    if (!state.elements) {
      return;
    }

    if (state.elements.accessToggle) {
      state.elements.accessToggle.classList.toggle("is-unlocked", state.isManageUnlocked);
    }

    if (state.elements.accessInput && document.activeElement !== state.elements.accessInput) {
      state.elements.accessInput.value = accessCode;
    }

    if (state.elements.accessStatus) {
      state.elements.accessStatus.classList.toggle("is-unlocked", state.isManageUnlocked);
      state.elements.accessStatus.textContent = state.isManageUnlocked
        ? "Gestione sbloccata."
        : "Gestione bloccata. Inserisci il codice valido.";
    }
  }
  function syncEditActionVisibility() {
    if (!state.elements) {
      return;
    }

    if (state.elements.createOpen) {
      state.elements.createOpen.hidden = !state.isManageUnlocked;
    }

    if (state.elements.editOpen) {
      state.elements.editOpen.hidden = !(state.isManageUnlocked && !!state.currentEntry);
    }

    if (state.elements.togglePublish) {
      var canToggle = state.isManageUnlocked && !!state.currentEntry;
      state.elements.togglePublish.hidden = !canToggle;
      state.elements.togglePublish.disabled = !canToggle || state.publishToggleBusy;
    }

    refreshPublishToggleLabel();
  }

  function refreshPublishToggleLabel() {
    if (!state.elements || !state.elements.togglePublish) {
      return;
    }

    var toggleButton = state.elements.togglePublish;
    var icon = toggleButton.querySelector("i");

    if (!state.currentEntry) {
      setIconButtonLabel(toggleButton, "Nascondi pagina");
      if (icon) {
        icon.className = "fa-solid fa-eye-slash";
      }
      return;
    }

    var isPublished = state.currentEntry.isPublished !== false;
    setIconButtonLabel(toggleButton, isPublished ? "Nascondi pagina" : "Pubblica pagina");

    if (icon) {
      icon.className = isPublished ? "fa-solid fa-eye-slash" : "fa-solid fa-eye";
    }
  }
  function setPublishToggleBusyState(isBusy) {
    state.publishToggleBusy = !!isBusy;
    syncEditActionVisibility();
  }

  function setIconButtonLabel(button, label) {
    if (!button) {
      return;
    }

    var resolvedLabel = readString(label, "");
    if (!resolvedLabel) {
      return;
    }

    button.setAttribute("aria-label", resolvedLabel);
    button.setAttribute("title", resolvedLabel);
    button.setAttribute("data-tooltip", resolvedLabel);
  }
  function isEditorOpen() {
    return !!(
      state.elements &&
      state.elements.editorModal &&
      !state.elements.editorModal.hasAttribute("hidden")
    );
  }

  function setEditorMode(mode) {
    var normalized = mode === "create" ? "create" : "edit";
    state.editorMode = normalized;
    state.editorSlugManual = normalized !== "create";

    if (state.elements && state.elements.editorTitle) {
      state.elements.editorTitle.textContent = normalized === "create" ? "Nuova pagina" : "Modifica pagina";
    }

    if (state.elements && state.elements.editorSubmit) {
      setIconButtonLabel(state.elements.editorSubmit, normalized === "create" ? "Crea pagina" : "Salva pagina");
      var submitIcon = state.elements.editorSubmit.querySelector("i");
      if (submitIcon) {
        submitIcon.className = normalized === "create" ? "fa-solid fa-plus" : "fa-solid fa-floppy-disk";
      }
    }
  }

  function openEditorForCreate() {
    if (!state.isManageUnlocked || !state.elements || !state.elements.editorForm) {
      return;
    }

    setEditorMode("create");
    fillEditorFormDefaults();
    resetEditorImageUploadUi();
    setEditorStatus("", "");
    openEditorModal();
  }

  function openEditorForCurrentEntry() {
    if (!state.isManageUnlocked || !state.currentEntry || !state.elements || !state.elements.editorForm) {
      return;
    }

    setEditorMode("edit");
    fillEditorForm(state.currentEntry);
    resetEditorImageUploadUi();
    setEditorStatus("", "");
    openEditorModal();
  }

  async function toggleCurrentEntryPublishState() {
    if (!state.isManageUnlocked || !state.currentEntry || state.publishToggleBusy) {
      return;
    }

    var current = state.currentEntry;
    var nextPublished = !(current.isPublished !== false);
    var confirmText = nextPublished
      ? "Vuoi pubblicare questa pagina?"
      : "Vuoi nascondere questa pagina dalla documentazione pubblica?";

    if (!window.confirm(confirmText)) {
      return;
    }

    var payload = {
      section: readString(current.sectionSlug, ""),
      slug: normalizeDocPath(readString(current.rawSlug, current.docKey || "")),
      title: readString(current.title, "Documento"),
      nav_group: toNullableString(current.navGroup),
      nav_group_order:
        Number.isFinite(current.navGroupOrder) && current.navGroupOrder !== Number.MAX_SAFE_INTEGER
          ? current.navGroupOrder
          : 0,
      nav_group_icon: toNullableString(current.navGroupIcon),
      nav_label: toNullableString(current.navLabel),
      page_icon: toNullableString(current.pageIcon),
      parent_slug: toNullablePath(current.parentSlug),
      sort_order:
        Number.isFinite(current.sortOrder) && current.sortOrder !== Number.MAX_SAFE_INTEGER
          ? current.sortOrder
          : 0,
      depth: Math.max(0, toDepth(current.depth)),
      is_published: nextPublished,
      excerpt: toNullableString(current.excerpt),
      content_md: String(current.contentMd || ""),
      previous_section: readString(current.sectionSlug, ""),
      previous_slug: normalizeDocPath(readString(current.rawSlug, current.docKey || "")),
    };

    setPublishToggleBusyState(true);

    try {
      var result = await upsertWikiPage(payload);
      var savedDocKey = resolveSavedDocKey(payload, result);

      if (nextPublished) {
        await refreshDocsData(savedDocKey);
      } else {
        await refreshDocsData("", {
          preferPublishedFallback: true,
          sectionSlug: current.sectionSlug,
          excludeDocKey: savedDocKey,
        });
      }
    } catch (error) {
      console.error("Errore aggiornamento stato pubblicazione:", error);
      var message = readString(error && error.message, "Aggiornamento pubblicazione non riuscito.");
      renderDocErrorState({
        title: "Operazione non completata",
        message: message,
      });
    } finally {
      setPublishToggleBusyState(false);
    }
  }
  function resetEditorHistory() {
    state.editorHistoryUndo = [];
    state.editorHistoryRedo = [];
    state.editorHistoryPendingSnapshot = null;
    state.editorHistoryRestoring = false;
  }

  function openEditorModal() {
    if (!state.elements || !state.elements.editorModal || !state.elements.editorForm) {
      return;
    }

    closeInternalLinkPicker();
    closeMediaLibraryPanel();

    state.elements.editorModal.hidden = false;
    state.isEditorOpen = true;
    document.body.classList.add("docs-editor-open");
    resetEditorHistory();

    var titleInput = state.elements.editorForm.elements.namedItem("title");
    if (titleInput && typeof titleInput.focus === "function") {
      titleInput.focus();
      if (typeof titleInput.select === "function") {
        titleInput.select();
      }
    }
  }

  function closeEditorModal(forceClose) {
    if (!state.elements || !state.elements.editorModal || ((state.editorSaving || state.imageUploading) && !forceClose)) {
      return;
    }

    closeInternalLinkPicker();
    closeMediaLibraryPanel();

    state.elements.editorModal.hidden = true;
    state.isEditorOpen = false;
    document.body.classList.remove("docs-editor-open");
  }

  function fillEditorForm(entry) {
    if (!state.elements || !state.elements.editorForm || !entry) {
      return;
    }

    var form = state.elements.editorForm;

    setFormFieldValue(form, "section", readString(entry.sectionSlug, "lore"));
    setFormFieldValue(form, "slug", readString(entry.rawSlug, entry.slug || ""));
    setFormFieldValue(form, "title", readString(entry.title, ""));
    setFormFieldValue(form, "nav_group", readString(entry.navGroup, ""));
    setFormFieldValue(
      form,
      "nav_group_order",
      Number.isFinite(entry.navGroupOrder) && entry.navGroupOrder !== Number.MAX_SAFE_INTEGER
        ? String(entry.navGroupOrder)
        : ""
    );
    setFormFieldValue(form, "nav_group_icon", readString(entry.navGroupIcon, ""));
    setFormFieldValue(form, "nav_label", readString(entry.navLabel, ""));
    setFormFieldValue(form, "page_icon", readString(entry.pageIcon, ""));
    setFormFieldValue(
      form,
      "sort_order",
      Number.isFinite(entry.sortOrder) && entry.sortOrder !== Number.MAX_SAFE_INTEGER
        ? String(entry.sortOrder)
        : ""
    );
    setFormFieldValue(form, "depth", String(toDepth(entry.depth)));
    setFormCheckboxValue(form, "is_published", entry.isPublished !== false);
    setFormFieldValue(form, "excerpt", readString(entry.excerpt, ""));
    setFormFieldValue(form, "content_md", readString(entry.contentMd, ""));

    populateParentSlugOptions(readString(entry.parentSlug, ""));
  }

  function fillEditorFormDefaults() {
    if (!state.elements || !state.elements.editorForm) {
      return;
    }

    var form = state.elements.editorForm;
    var sectionDefault = readString(state.currentEntry && state.currentEntry.sectionSlug, "lore");

    setFormFieldValue(form, "section", sectionDefault);
    setFormFieldValue(form, "slug", "");
    setFormFieldValue(form, "title", "");
    setFormFieldValue(form, "nav_group", "");
    setFormFieldValue(form, "nav_group_order", "0");
    setFormFieldValue(form, "nav_group_icon", "");
    setFormFieldValue(form, "nav_label", "");
    setFormFieldValue(form, "page_icon", "");
    setFormFieldValue(form, "sort_order", "0");
    setFormFieldValue(form, "depth", "0");
    setFormCheckboxValue(form, "is_published", true);
    setFormFieldValue(form, "excerpt", "");
    setFormFieldValue(form, "content_md", "# Nuova pagina\n\nScrivi qui il contenuto della nuova pagina.");

    populateParentSlugOptions("");
  }

  function autoPopulateCreateSlug() {
    if (!state.elements || !state.elements.editorForm || state.editorMode !== "create") {
      return;
    }

    var form = state.elements.editorForm;
    var section = cleanSegment(readString(getFormValue(form, "section"), "lore"));
    var title = cleanSegment(readString(getFormValue(form, "title"), ""));

    if (!title) {
      setFormFieldValue(form, "slug", "");
      return;
    }

    setFormFieldValue(form, "slug", section + "/" + title);
  }

  function populateParentSlugOptions(preferredValue) {
    if (!state.elements || !state.elements.editorForm) {
      return;
    }

    var parentSelect = state.elements.editorForm.elements.namedItem("parent_slug");
    if (!parentSelect) {
      return;
    }

    var section = cleanSegment(readString(getFormValue(state.elements.editorForm, "section"), ""));
    var currentDocKey = resolveEditorDocKey();
    var selected = typeof preferredValue === "string" ? normalizeDocPath(preferredValue) : normalizeDocPath(readString(parentSelect.value, ""));

    parentSelect.innerHTML = "";

    var emptyOption = document.createElement("option");
    emptyOption.value = "";
    emptyOption.textContent = "Nessuna pagina genitore";
    parentSelect.appendChild(emptyOption);

    var sourcePages = state.manageIndex && Array.isArray(state.manageIndex.pages)
      ? state.manageIndex.pages
      : state.index && Array.isArray(state.index.pages)
      ? state.index.pages
      : [];

    for (var i = 0; i < sourcePages.length; i += 1) {
      var page = sourcePages[i];

      if (!page || page.sectionSlug !== section) {
        continue;
      }

      if (currentDocKey && page.docKey === currentDocKey) {
        continue;
      }

      var option = document.createElement("option");
      option.value = page.docKey;

      var hiddenBadge = page.isPublished === false ? " (nascosta)" : "";
      option.textContent = page.title + " - " + page.docKey + hiddenBadge;

      parentSelect.appendChild(option);
    }

    parentSelect.value = hasSelectOption(parentSelect, selected) ? selected : "";
  }

  function resolveEditorDocKey() {
    if (!state.elements || !state.elements.editorForm) {
      return "";
    }

    if (state.editorMode === "edit" && state.currentEntry) {
      return readString(state.currentEntry.docKey, "");
    }

    var section = cleanSegment(readString(getFormValue(state.elements.editorForm, "section"), ""));
    var slug = normalizeDocPath(readString(getFormValue(state.elements.editorForm, "slug"), ""));

    if (!section || !slug) {
      return "";
    }

    return ensureCreateSlug(section, slug);
  }

  function suggestDepthFromParent() {
    if (!state.elements || !state.elements.editorForm) {
      return;
    }

    var parentSlug = normalizeDocPath(readString(getFormValue(state.elements.editorForm, "parent_slug"), ""));
    var depthField = state.elements.editorForm.elements.namedItem("depth");

    if (!depthField) {
      return;
    }

    if (!parentSlug) {
      return;
    }

    var parentEntry = state.manageIndex && state.manageIndex.pageMap
      ? state.manageIndex.pageMap.get(parentSlug)
      : null;

    if (!parentEntry) {
      return;
    }

    depthField.value = String(Math.max(0, toDepth(parentEntry.depth) + 1));
  }
  function hasSelectOption(selectElement, value) {
    var normalized = normalizeDocPath(readString(value, ""));
    if (!selectElement || !normalized) {
      return false;
    }

    for (var i = 0; i < selectElement.options.length; i += 1) {
      if (normalizeDocPath(selectElement.options[i].value) === normalized) {
        return true;
      }
    }

    return false;
  }
  function setFormFieldValue(form, name, value) {
    var field = form.elements.namedItem(name);
    if (!field) {
      return;
    }

    field.value = value;
  }

  function setFormCheckboxValue(form, name, isChecked) {
    var field = form.elements.namedItem(name);
    if (!field) {
      return;
    }

    field.checked = !!isChecked;
  }

  function setEditorStatus(message, tone) {
    if (!state.elements || !state.elements.editorStatus) {
      return;
    }

    var status = state.elements.editorStatus;
    status.textContent = readString(message, "");
    status.classList.remove("is-error", "is-success");

    if (tone === "error") {
      status.classList.add("is-error");
      return;
    }

    if (tone === "success") {
      status.classList.add("is-success");
    }
  }

  function setImageUploadStatus(message, tone) {
    if (!state.elements || !state.elements.editorImageStatus) {
      return;
    }

    var status = state.elements.editorImageStatus;
    status.textContent = readString(message, "");
    status.classList.remove("is-error", "is-success");

    if (tone === "error") {
      status.classList.add("is-error");
      return;
    }

    if (tone === "success") {
      status.classList.add("is-success");
    }
  }

  function resetEditorImageUploadUi() {
    if (!state.elements) {
      return;
    }

    state.imageUploading = false;

    if (state.elements.editorImageFile) {
      state.elements.editorImageFile.value = "";
    }

    if (state.elements.editorImageAlt) {
      state.elements.editorImageAlt.value = "";
    }

    setImageUploadStatus("", "");
    closeMediaLibraryPanel();
    setMediaLibraryStatus("", "");
    syncEditorUploadControlsState();
  }

  function setImageUploadState(isUploading) {
    state.imageUploading = !!isUploading;
    syncEditorUploadControlsState();
  }

  function syncEditorUploadControlsState() {
    if (!state.elements) {
      return;
    }

    var shouldDisable = state.editorSaving || state.imageUploading;

    if (shouldDisable) {
      closeInternalLinkPicker();
      closeMediaLibraryPanel();
    }

    if (state.elements.editorImageUpload) {
      state.elements.editorImageUpload.disabled = shouldDisable;
    }

    if (state.elements.editorImageFile) {
      state.elements.editorImageFile.disabled = shouldDisable;
    }

    if (state.elements.editorImageAlt) {
      state.elements.editorImageAlt.disabled = shouldDisable;
    }

    if (state.elements.editorMediaOpen) {
      state.elements.editorMediaOpen.disabled = shouldDisable || state.mediaLibraryLoading;
    }

    if (state.elements.editorMediaSearch) {
      state.elements.editorMediaSearch.disabled = shouldDisable || state.mediaLibraryLoading;
    }

    if (state.elements.editorMediaResults) {
      var mediaButtons = state.elements.editorMediaResults.querySelectorAll("button[data-docs-media-insert]");
      for (var mb = 0; mb < mediaButtons.length; mb += 1) {
        mediaButtons[mb].disabled = shouldDisable || state.mediaLibraryLoading;
      }
    }

    if (state.elements.editorSubmit) {
      state.elements.editorSubmit.disabled = shouldDisable;
    }

    if (state.elements.editorMarkdownToolbar) {
      var toolbarButtons = state.elements.editorMarkdownToolbar.querySelectorAll("button[data-md-action]");
      for (var b = 0; b < toolbarButtons.length; b += 1) {
        toolbarButtons[b].disabled = shouldDisable;
      }
    }

    if (state.elements.editorClose && state.elements.editorClose.length) {
      for (var i = 0; i < state.elements.editorClose.length; i += 1) {
        state.elements.editorClose[i].disabled = shouldDisable;
      }
    }
  }

  function setEditorSavingState(isSaving) {
    state.editorSaving = !!isSaving;
    syncEditorUploadControlsState();
  }

  async function uploadImageFromEditor() {
    if (!state.isManageUnlocked || !state.elements || !state.elements.editorForm) {
      return;
    }

    if (state.imageUploading || state.editorSaving) {
      return;
    }

    var fileInput = state.elements.editorImageFile;
    var file = fileInput && fileInput.files && fileInput.files.length ? fileInput.files[0] : null;

    if (!file) {
      setImageUploadStatus("Seleziona un file immagine da caricare.", "error");
      return;
    }

    if (!isAllowedImageFile(file)) {
      setImageUploadStatus("Formato non supportato. Usa JPG, PNG, WEBP o GIF.", "error");
      if (fileInput) {
        fileInput.value = "";
      }
      return;
    }

    var formData = new FormData();
    formData.append("image", file, file.name);

    var uploadSlug = resolveEditorSlugForImageUpload();
    if (uploadSlug) {
      formData.append("slug", uploadSlug);
    }

    var uploadSection = resolveEditorSectionForImageUpload();
    if (uploadSection) {
      formData.append("section", uploadSection);
    }

    setImageUploadState(true);
    setImageUploadStatus("Caricamento immagine in corso...", "");

    try {
      var result = await uploadWikiImage(formData);
      var publicUrl = readString(result && (result.public_url || result.publicUrl), "");

      if (!publicUrl) {
        throw new Error("Upload completato ma URL pubblico non disponibile.");
      }

      var altText = readString(state.elements.editorImageAlt && state.elements.editorImageAlt.value, "Immagine");
      var markdownImage = "![" + escapeMarkdownAltText(altText) + "](" + publicUrl + ")";

      insertMarkdownInEditor(markdownImage);
      setImageUploadStatus("Immagine caricata e inserita nel contenuto.", "success");
      markMediaLibraryStale();

      if (state.elements.editorImageFile) {
        state.elements.editorImageFile.value = "";
      }
    } catch (error) {
      console.error("Errore upload immagine wiki:", error);
      setImageUploadStatus(readString(error && error.message, "Upload immagine non riuscito."), "error");
    } finally {
      setImageUploadState(false);
    }
  }

  async function uploadWikiImage(formData) {
    var response = await fetch(WIKI_IMAGE_UPLOAD_ENDPOINT, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: "Bearer " + SUPABASE_ANON_KEY,
        "x-import-secret": IMPORT_SECRET,
      },
      body: formData,
    });

    var responseBody = await parseResponseBody(response);

    if (!response.ok) {
      throw new Error(readSupabaseError(responseBody, response.status));
    }

    if (responseBody && responseBody.success === false) {
      throw new Error(readString(responseBody.message, "Upload immagine non riuscito."));
    }

    return responseBody || {};
  }

  function resolveEditorSlugForImageUpload() {
    if (state.editorMode === "edit" && state.currentEntry) {
      return readString(state.currentEntry.docKey, "");
    }

    if (!state.elements || !state.elements.editorForm) {
      return "";
    }

    var form = state.elements.editorForm;
    var section = cleanSegment(readString(getFormValue(form, "section"), ""));
    var slug = normalizeDocPath(readString(getFormValue(form, "slug"), ""));

    if (!slug || !section) {
      return "";
    }

    return ensureCreateSlug(section, slug);
  }

  function resolveEditorSectionForImageUpload() {
    if (state.editorMode === "edit" && state.currentEntry) {
      return readString(state.currentEntry.sectionSlug, "");
    }

    if (!state.elements || !state.elements.editorForm) {
      return "";
    }

    return cleanSegment(readString(getFormValue(state.elements.editorForm, "section"), ""));
  }

  function isAllowedImageFile(file) {
    if (!file || typeof file !== "object") {
      return false;
    }

    var allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    var fileType = readString(file.type, "").toLowerCase();

    if (allowedTypes.indexOf(fileType) !== -1) {
      return true;
    }

    var fileName = readString(file.name, "").toLowerCase();
    var extension = fileName.indexOf(".") !== -1 ? fileName.split(".").pop() : "";

    return ["jpg", "jpeg", "png", "webp", "gif"].indexOf(extension) !== -1;
  }

  function applyMarkdownToolbarAction(action) {
    var textarea = getEditorMarkdownTextarea();
    if (!textarea || !action) {
      return;
    }

    if (action === "h2") {
      applyHeadingAction(textarea, 2);
      return;
    }

    if (action === "h3") {
      applyHeadingAction(textarea, 3);
      return;
    }

    if (action === "bold") {
      wrapSelection(textarea, "**", "**", "testo");
      return;
    }

    if (action === "italic") {
      wrapSelection(textarea, "*", "*", "testo");
      return;
    }

    if (action === "ul") {
      prefixSelectionLines(textarea, function () {
        return "- ";
      }, "- voce elenco", 2);
      return;
    }

    if (action === "ol") {
      prefixSelectionLines(
        textarea,
        function (index) {
          return String(index + 1) + ". ";
        },
        "1. primo elemento",
        3
      );
      return;
    }

    if (action === "quote") {
      prefixSelectionLines(textarea, function () {
        return "> ";
      }, "> nota", 2);
      return;
    }

    if (action === "divider") {
      insertBlockAtCursor(textarea, "---");
      return;
    }

    if (action === "link") {
      applyLinkAction(textarea, false);
      return;
    }

    if (action === "internal-link") {
      toggleInternalLinkPicker(textarea);
      return;
    }

    if (action === "image") {
      applyLinkAction(textarea, true);
      return;
    }

    if (action === "text-color") {
      toggleColorPicker(textarea);
      return;
    }

    if (action === "inline-code") {
      wrapSelection(textarea, "`", "`", "codice");
      return;
    }

    if (action === "code-block") {
      applyCodeBlockAction(textarea);
    }
  }

  function handleEditorMarkdownShortcut(event) {
    if (!event || event.defaultPrevented || !isPrimaryModifierPressed(event)) {
      return;
    }

    if (event.altKey) {
      return;
    }

    var key = String(event.key || "").toLowerCase();
    if (!key) {
      return;
    }

    if (key === "z") {
      if (event.shiftKey) {
        if (canRedoEditorHistory()) {
          event.preventDefault();
          redoEditorHistory();
        }
        return;
      }

      if (canUndoEditorHistory()) {
        event.preventDefault();
        undoEditorHistory();
      }
      return;
    }

    if (key === "y") {
      if (canRedoEditorHistory()) {
        event.preventDefault();
        redoEditorHistory();
      }
      return;
    }

    if (key === "b") {
      event.preventDefault();
      applyMarkdownToolbarAction("bold");
      return;
    }

    if (key === "i") {
      event.preventDefault();
      applyMarkdownToolbarAction("italic");
      return;
    }

    if (key === "k") {
      event.preventDefault();
      applyMarkdownToolbarAction("link");
    }
  }

  function isPrimaryModifierPressed(event) {
    return !!(event && (event.ctrlKey || event.metaKey));
  }

  function shouldTrackNativeEditorInput(event) {
    var inputType = readString(event && event.inputType, "");
    if (!inputType) {
      return true;
    }

    return inputType !== "historyUndo" && inputType !== "historyRedo";
  }

  function getEditorModalScrollContainer(textarea) {
    if (!textarea || !textarea.closest) {
      return null;
    }

    return textarea.closest(".docs-editor-modal__panel");
  }

  function getEditorHistorySnapshot(textarea) {
    if (!textarea) {
      return null;
    }

    var panel = getEditorModalScrollContainer(textarea);

    return {
      value: String(textarea.value || ""),
      selectionStart: typeof textarea.selectionStart === "number" ? textarea.selectionStart : 0,
      selectionEnd: typeof textarea.selectionEnd === "number" ? textarea.selectionEnd : 0,
      scrollTop: typeof textarea.scrollTop === "number" ? textarea.scrollTop : 0,
      scrollLeft: typeof textarea.scrollLeft === "number" ? textarea.scrollLeft : 0,
      panelScrollTop: panel && typeof panel.scrollTop === "number" ? panel.scrollTop : 0,
    };
  }

  function rememberEditorHistoryBeforeNativeInput(event) {
    if (state.editorHistoryRestoring || !shouldTrackNativeEditorInput(event)) {
      return;
    }

    var textarea = getEditorMarkdownTextarea();
    if (!textarea) {
      return;
    }

    state.editorHistoryPendingSnapshot = getEditorHistorySnapshot(textarea);
  }

  function commitEditorHistoryAfterNativeInput(event) {
    if (state.editorHistoryRestoring || !shouldTrackNativeEditorInput(event)) {
      state.editorHistoryPendingSnapshot = null;
      return;
    }

    var textarea = getEditorMarkdownTextarea();
    if (!textarea) {
      state.editorHistoryPendingSnapshot = null;
      return;
    }

    var snapshot = state.editorHistoryPendingSnapshot;
    state.editorHistoryPendingSnapshot = null;

    if (!snapshot) {
      return;
    }

    pushEditorHistorySnapshot(snapshot, textarea);
  }

  function trimEditorHistoryStack(stack) {
    while (stack.length > state.editorHistoryLimit) {
      stack.shift();
    }
  }

  function pushEditorHistorySnapshot(snapshot, textarea) {
    if (state.editorHistoryRestoring || !snapshot || !textarea) {
      return;
    }

    if (snapshot.value === String(textarea.value || "")) {
      return;
    }

    state.editorHistoryUndo.push(snapshot);
    trimEditorHistoryStack(state.editorHistoryUndo);
    state.editorHistoryRedo = [];
  }

  function canUndoEditorHistory() {
    return Array.isArray(state.editorHistoryUndo) && state.editorHistoryUndo.length > 0;
  }

  function canRedoEditorHistory() {
    return Array.isArray(state.editorHistoryRedo) && state.editorHistoryRedo.length > 0;
  }

  function restoreEditorHistorySnapshot(snapshot) {
    var textarea = getEditorMarkdownTextarea();
    if (!textarea || !snapshot) {
      return;
    }

    state.editorHistoryRestoring = true;
    try {
      setTextareaSelection(textarea, snapshot.value, snapshot.selectionStart, snapshot.selectionEnd, {
        preserveScrollTop: snapshot.scrollTop,
        preserveScrollLeft: snapshot.scrollLeft,
        preservePanelScrollTop: snapshot.panelScrollTop,
        skipHistory: true,
      });
    } finally {
      state.editorHistoryRestoring = false;
      state.editorHistoryPendingSnapshot = null;
    }
  }

  function undoEditorHistory() {
    var textarea = getEditorMarkdownTextarea();
    if (!textarea || !canUndoEditorHistory()) {
      return;
    }

    var currentSnapshot = getEditorHistorySnapshot(textarea);
    var previousSnapshot = state.editorHistoryUndo.pop();
    state.editorHistoryRedo.push(currentSnapshot);
    trimEditorHistoryStack(state.editorHistoryRedo);
    restoreEditorHistorySnapshot(previousSnapshot);
  }

  function redoEditorHistory() {
    var textarea = getEditorMarkdownTextarea();
    if (!textarea || !canRedoEditorHistory()) {
      return;
    }

    var currentSnapshot = getEditorHistorySnapshot(textarea);
    var nextSnapshot = state.editorHistoryRedo.pop();
    state.editorHistoryUndo.push(currentSnapshot);
    trimEditorHistoryStack(state.editorHistoryUndo);
    restoreEditorHistorySnapshot(nextSnapshot);
  }

  function getEditorMarkdownTextarea() {
    if (!state.elements) {
      return null;
    }

    if (state.elements.editorContentMd) {
      return state.elements.editorContentMd;
    }

    if (!state.elements.editorForm) {
      return null;
    }

    var field = state.elements.editorForm.elements.namedItem("content_md");
    state.elements.editorContentMd = field || null;
    return state.elements.editorContentMd;
  }

  function getSelectionInfo(textarea) {
    var value = String(textarea.value || "");
    var start = typeof textarea.selectionStart === "number" ? textarea.selectionStart : value.length;
    var end = typeof textarea.selectionEnd === "number" ? textarea.selectionEnd : start;

    if (end < start) {
      var swap = start;
      start = end;
      end = swap;
    }

    return {
      value: value,
      start: start,
      end: end,
      selectedText: value.slice(start, end),
    };
  }

  function setTextareaSelection(textarea, value, selectionStart, selectionEnd, options) {
    var opts = options || {};
    var previousSnapshot = !opts.skipHistory ? getEditorHistorySnapshot(textarea) : null;
    var panel = getEditorModalScrollContainer(textarea);
    var preservedScrollTop = typeof opts.preserveScrollTop === "number" ? opts.preserveScrollTop : textarea.scrollTop;
    var preservedScrollLeft = typeof opts.preserveScrollLeft === "number" ? opts.preserveScrollLeft : textarea.scrollLeft;
    var preservedPanelScrollTop = typeof opts.preservePanelScrollTop === "number"
      ? opts.preservePanelScrollTop
      : panel && typeof panel.scrollTop === "number"
      ? panel.scrollTop
      : 0;

    textarea.value = value;

    try {
      textarea.focus({ preventScroll: true });
    } catch (_error) {
      textarea.focus();
    }

    if (typeof textarea.setSelectionRange === "function") {
      textarea.setSelectionRange(selectionStart, selectionEnd);
    }

    textarea.scrollTop = preservedScrollTop;
    textarea.scrollLeft = preservedScrollLeft;

    if (panel && typeof panel.scrollTop === "number") {
      panel.scrollTop = preservedPanelScrollTop;
    }

    window.requestAnimationFrame(function restoreEditorScrollPosition() {
      textarea.scrollTop = preservedScrollTop;
      textarea.scrollLeft = preservedScrollLeft;

      if (panel && typeof panel.scrollTop === "number") {
        panel.scrollTop = preservedPanelScrollTop;
      }
    });

    if (!opts.skipHistory) {
      pushEditorHistorySnapshot(previousSnapshot, textarea);
    }
  }

  function replaceSelectionRange(textarea, replacement, selectionRange) {
    var info = getSelectionInfo(textarea);
    var before = info.value.slice(0, info.start);
    var after = info.value.slice(info.end);
    var nextValue = before + replacement + after;

    var start = before.length + (selectionRange ? selectionRange.start : replacement.length);
    var end = before.length + (selectionRange ? selectionRange.end : replacement.length);

    setTextareaSelection(textarea, nextValue, start, end);
  }

  function resolveInlineWrapToggle(info, prefix, suffix) {
    if (!info || !prefix || !suffix) {
      return null;
    }

    var selectedText = info.selectedText || "";
    var selectedLength = selectedText.length;
    var prefixLength = prefix.length;
    var suffixLength = suffix.length;

    if (
      selectedLength >= prefixLength + suffixLength &&
      selectedText.slice(0, prefixLength) === prefix &&
      selectedText.slice(selectedLength - suffixLength) === suffix
    ) {
      var unwrappedSelected = selectedText.slice(prefixLength, selectedLength - suffixLength);
      return {
        start: info.start,
        end: info.end,
        replacement: unwrappedSelected,
        selectionStart: 0,
        selectionEnd: unwrappedSelected.length,
      };
    }

    if (
      info.start >= prefixLength &&
      info.value.slice(info.start - prefixLength, info.start) === prefix &&
      info.value.slice(info.end, info.end + suffixLength) === suffix
    ) {
      var innerText = info.value.slice(info.start, info.end);
      return {
        start: info.start - prefixLength,
        end: info.end + suffixLength,
        replacement: innerText,
        selectionStart: 0,
        selectionEnd: innerText.length,
      };
    }

    return null;
  }

  function wrapSelection(textarea, prefix, suffix, placeholder) {
    var info = getSelectionInfo(textarea);
    var toggle = resolveInlineWrapToggle(info, prefix, suffix);

    if (toggle) {
      replaceSelectionByRange(textarea, toggle.start, toggle.end, toggle.replacement, {
        start: toggle.selectionStart,
        end: toggle.selectionEnd,
      });
      return;
    }

    var content = info.selectedText || placeholder;
    var replacement = prefix + content + suffix;

    replaceSelectionRange(textarea, replacement, {
      start: prefix.length,
      end: prefix.length + content.length,
    });
  }

  function prefixSelectionLines(textarea, prefixFactory, fallbackLine, fallbackSelectionStart) {
    var info = getSelectionInfo(textarea);

    if (!info.selectedText) {
      replaceSelectionRange(textarea, fallbackLine, {
        start: fallbackSelectionStart,
        end: fallbackLine.length,
      });
      return;
    }

    var linesList = info.selectedText.split(/\r?\n/);
    var replaced = [];

    for (var i = 0; i < linesList.length; i += 1) {
      replaced.push(prefixFactory(i) + linesList[i]);
    }

    var replacement = replaced.join("\n");
    replaceSelectionRange(textarea, replacement, {
      start: 0,
      end: replacement.length,
    });
  }

  function stripExistingHeadingPrefix(lineText) {
    var text = String(lineText || "");
    var index = 0;

    while (index < text.length && (text.charAt(index) === " " || text.charAt(index) === "	")) {
      index += 1;
    }

    var markerCount = 0;
    while (index + markerCount < text.length && text.charAt(index + markerCount) === "#" && markerCount < 6) {
      markerCount += 1;
    }

    if (!markerCount) {
      return text;
    }

    var nextIndex = index + markerCount;
    if (nextIndex < text.length && text.charAt(nextIndex) === " ") {
      while (nextIndex < text.length && text.charAt(nextIndex) === " ") {
        nextIndex += 1;
      }
      return text.slice(0, index) + text.slice(nextIndex);
    }

    return text;
  }

  function applyHeadingAction(textarea, level) {
    var marker = Array(level + 1).join("#") + " ";
    var info = getSelectionInfo(textarea);

    if (!info.selectedText) {
      var lineStart = info.value.lastIndexOf("\n", Math.max(0, info.start - 1));
      lineStart = lineStart === -1 ? 0 : lineStart + 1;

      var lineEnd = info.value.indexOf("\n", info.start);
      if (lineEnd === -1) {
        lineEnd = info.value.length;
      }

      var lineText = info.value.slice(lineStart, lineEnd);
      var leadingMatch = lineText.match(/^\s*/);
      var leadingWhitespace = leadingMatch ? leadingMatch[0] : "";
      var contentText = lineText.slice(leadingWhitespace.length).replace(/^#{1,6}\s+/, "");
      var replacement = leadingWhitespace + marker + contentText;
      var relativeCaret = Math.max(0, info.start - lineStart);
      var nextCaret = Math.max(leadingWhitespace.length + marker.length, relativeCaret + marker.length);
      nextCaret = Math.min(replacement.length, nextCaret);

      replaceSelectionByRange(textarea, lineStart, lineEnd, replacement, {
        start: nextCaret,
        end: nextCaret,
      });
      return;
    }

    var linesList = info.selectedText.split(/\r?\n/);
    var replaced = [];

    for (var i = 0; i < linesList.length; i += 1) {
      var currentLine = linesList[i];
      var currentLeadingMatch = currentLine.match(/^\s*/);
      var currentLeadingWhitespace = currentLeadingMatch ? currentLeadingMatch[0] : "";
      var currentContent = currentLine.slice(currentLeadingWhitespace.length).replace(/^#{1,6}\s+/, "");
      replaced.push(currentLeadingWhitespace + marker + currentContent);
    }

    var replacement = replaced.join("\n");
    replaceSelectionRange(textarea, replacement, {
      start: 0,
      end: replacement.length,
    });
  }

  function applyLinkAction(textarea, isImage) {
    var info = getSelectionInfo(textarea);
    var label = info.selectedText || (isImage ? "Alt text" : "Testo link");
    var prefix = isImage ? "!" : "";
    var replacement = prefix + "[" + label + "](https://)";
    var urlStart = replacement.lastIndexOf("(https://") + 1;
    var urlEnd = urlStart + "https://".length;

    replaceSelectionRange(textarea, replacement, {
      start: urlStart,
      end: urlEnd,
    });
  }

  function isColorPickerOpen() {
    return !!(
      state.elements &&
      state.elements.editorColorPicker &&
      !state.elements.editorColorPicker.hasAttribute("hidden")
    );
  }

  function isEventInsideColorPicker(target) {
    if (!state.elements) {
      return false;
    }

    if (state.elements.editorColorPicker && state.elements.editorColorPicker.contains(target)) {
      return true;
    }

    if (
      state.elements.editorMarkdownToolbar &&
      target &&
      target.closest &&
      target.closest('button[data-md-action="text-color"]') &&
      state.elements.editorMarkdownToolbar.contains(target)
    ) {
      return true;
    }

    return false;
  }

  function toggleColorPicker(textarea) {
    if (isColorPickerOpen()) {
      closeColorPicker({ restoreTextareaFocus: true });
      return;
    }

    openColorPicker(textarea);
  }

  function openColorPicker(textarea) {
    if (!state.elements || !state.elements.editorColorPicker) {
      return;
    }

    var editorTextarea = textarea || getEditorMarkdownTextarea();
    if (!editorTextarea) {
      return;
    }

    var snapshot = getSelectionInfo(editorTextarea);
    state.colorSelection = {
      start: snapshot.start,
      end: snapshot.end,
      selectedText: snapshot.selectedText,
    };

    closeInternalLinkPicker();
    closeMediaLibraryPanel();

    state.elements.editorColorPicker.hidden = false;
  }

  function closeColorPicker(options) {
    if (!state.elements || !state.elements.editorColorPicker) {
      return;
    }

    var opts = options || {};
    var snapshot = state.colorSelection;

    state.elements.editorColorPicker.hidden = true;

    if (!opts.keepSelection) {
      state.colorSelection = null;
    }

    if (opts.restoreTextareaFocus) {
      var textarea = getEditorMarkdownTextarea();
      if (textarea) {
        textarea.focus();

        if (snapshot && typeof textarea.setSelectionRange === "function") {
          var value = String(textarea.value || "");
          var start = Math.max(0, Math.min(snapshot.start, value.length));
          var end = Math.max(start, Math.min(snapshot.end, value.length));
          textarea.setSelectionRange(start, end);
        }
      }
    }
  }

  function normalizeWikiColor(value) {
    var allowed = {
      sage: true,
      sea: true,
      teal: true,
      moss: true,
      amber: true,
      ochre: true,
      slate: true,
      stone: true,
      plum: true,
      rose: true,
    };

    var color = cleanSegment(readString(value, ""));
    return allowed[color] ? color : "sage";
  }

  function escapeInlineHtmlText(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function insertColoredText(colorName) {
    var textarea = getEditorMarkdownTextarea();
    if (!textarea) {
      return;
    }

    var color = normalizeWikiColor(colorName);
    var value = String(textarea.value || "");
    var snapshot = state.colorSelection || getSelectionInfo(textarea);
    var start = Math.max(0, Math.min(Number(snapshot.start) || 0, value.length));
    var end = Math.max(start, Math.min(Number(snapshot.end) || start, value.length));
    var selectedText = value.slice(start, end) || readString(snapshot.selectedText, "");
    var content = selectedText || "testo colorato";
    var escapedContent = escapeInlineHtmlText(content);
    var openTag = '<span class="wiki-color wiki-color-' + color + '">';
    var closeTag = "</span>";
    var replacement = openTag + escapedContent + closeTag;

    replaceSelectionByRange(textarea, start, end, replacement, {
      start: openTag.length,
      end: openTag.length + escapedContent.length,
    });

    closeColorPicker();
  }
  function isInternalLinkPickerOpen() {
    return !!(
      state.elements &&
      state.elements.editorInternalLinkPanel &&
      !state.elements.editorInternalLinkPanel.hasAttribute("hidden")
    );
  }

  function isEventInsideInternalLinkPicker(target) {
    if (!state.elements) {
      return false;
    }

    if (state.elements.editorInternalLinkPanel && state.elements.editorInternalLinkPanel.contains(target)) {
      return true;
    }

    if (
      state.elements.editorMarkdownToolbar &&
      target &&
      target.closest &&
      target.closest('button[data-md-action="internal-link"]') &&
      state.elements.editorMarkdownToolbar.contains(target)
    ) {
      return true;
    }

    return false;
  }

  function toggleInternalLinkPicker(textarea) {
    if (isInternalLinkPickerOpen()) {
      closeInternalLinkPicker({ restoreTextareaFocus: true });
      return;
    }

    openInternalLinkPicker(textarea);
  }

  function openInternalLinkPicker(textarea) {
    if (!state.elements || !state.elements.editorInternalLinkPanel || !state.elements.editorInternalLinkInput) {
      return;
    }

    var editorTextarea = textarea || getEditorMarkdownTextarea();
    if (!editorTextarea) {
      return;
    }

    var snapshot = getSelectionInfo(editorTextarea);
    state.internalLinkSelection = {
      start: snapshot.start,
      end: snapshot.end,
      selectedText: snapshot.selectedText,
    };
    state.internalLinkQuery = "";

    closeMediaLibraryPanel();

    state.elements.editorInternalLinkInput.value = "";
    state.elements.editorInternalLinkPanel.hidden = false;
    renderInternalLinkResults();

    state.elements.editorInternalLinkInput.focus();
  }

  function closeInternalLinkPicker(options) {
    if (!state.elements || !state.elements.editorInternalLinkPanel) {
      return;
    }

    var opts = options || {};
    var snapshot = state.internalLinkSelection;

    state.elements.editorInternalLinkPanel.hidden = true;
    state.internalLinkQuery = "";

    if (state.elements.editorInternalLinkInput) {
      state.elements.editorInternalLinkInput.value = "";
    }

    if (state.elements.editorInternalLinkResults) {
      state.elements.editorInternalLinkResults.innerHTML = "";
    }

    if (!opts.keepSelection) {
      state.internalLinkSelection = null;
    }

    if (opts.restoreTextareaFocus) {
      var textarea = getEditorMarkdownTextarea();
      if (textarea) {
        textarea.focus();

        if (snapshot && typeof textarea.setSelectionRange === "function") {
          var start = Math.max(0, Math.min(snapshot.start, String(textarea.value || "").length));
          var end = Math.max(start, Math.min(snapshot.end, String(textarea.value || "").length));
          textarea.setSelectionRange(start, end);
        }
      }
    }
  }

  function renderInternalLinkResults() {
    if (!state.elements || !state.elements.editorInternalLinkResults) {
      return;
    }

    var container = state.elements.editorInternalLinkResults;
    var query = normalizeSearchText(state.internalLinkQuery);
    var results = searchInternalLinkTargets(query);

    container.innerHTML = "";

    if (!results.length) {
      var empty = document.createElement("p");
      empty.className = "docs-internal-link-picker__empty";
      empty.textContent = query ? "Nessuna pagina trovata." : "Inizia a digitare per cercare una pagina.";
      container.appendChild(empty);
      return;
    }

    var list = document.createElement("ul");
    list.className = "docs-internal-link-picker__list";

    for (var i = 0; i < results.length; i += 1) {
      var result = results[i];
      var entry = result.entry;
      var item = document.createElement("li");
      var button = document.createElement("button");

      button.type = "button";
      button.className = "docs-internal-link-picker__item";
      button.setAttribute("data-docs-internal-link-target", entry.docKey);

      var title = document.createElement("span");
      title.className = "docs-internal-link-picker__title";
      title.textContent = entry.title;
      button.appendChild(title);

      if (state.isManageUnlocked && entry.isPublished === false) {
        var badge = document.createElement("span");
        badge.className = "docs-internal-link-picker__badge";
        badge.textContent = "Nascosta";
        title.appendChild(document.createTextNode(" "));
        title.appendChild(badge);
      }

      var meta = document.createElement("span");
      meta.className = "docs-internal-link-picker__meta";
      meta.textContent = entry.sectionTitle + " | " + entry.docKey;
      button.appendChild(meta);

      item.appendChild(button);
      list.appendChild(item);
    }

    container.appendChild(list);
  }

  function searchInternalLinkTargets(normalizedQuery) {
    var pages = getInternalLinkSourcePages();
    if (!pages.length) {
      return [];
    }

    if (!normalizedQuery) {
      return pages.slice(0, INTERNAL_LINK_RESULT_LIMIT).map(function (entry) {
        return {
          entry: entry,
          score: 1,
        };
      });
    }

    var terms = normalizedQuery
      .split(/\s+/)
      .map(function (term) {
        return normalizeSearchText(term);
      })
      .filter(function (term) {
        return !!term;
      });

    if (!terms.length) {
      return [];
    }

    var scored = [];

    for (var i = 0; i < pages.length; i += 1) {
      var entry = pages[i];
      var score = scoreInternalLinkTarget(entry, normalizedQuery, terms);
      if (score <= 0) {
        continue;
      }

      scored.push({
        entry: entry,
        score: score,
      });
    }

    scored.sort(function (left, right) {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return readString(left.entry.title, "").localeCompare(readString(right.entry.title, ""), "it", {
        sensitivity: "base",
      });
    });

    return scored.slice(0, INTERNAL_LINK_RESULT_LIMIT);
  }

  function scoreInternalLinkTarget(entry, normalizedQuery, terms) {
    if (!entry) {
      return 0;
    }

    var title = normalizeSearchText(entry.title);
    var navLabel = normalizeSearchText(entry.navLabel);
    var slug = normalizeSearchText(entry.docKey);
    var excerpt = normalizeSearchText(entry.excerpt);

    var score = 0;

    if (title === normalizedQuery || navLabel === normalizedQuery || slug === normalizedQuery) {
      score += 140;
    }

    if (title.indexOf(normalizedQuery) !== -1) {
      score += title.indexOf(normalizedQuery) === 0 ? 70 : 45;
    }

    if (navLabel.indexOf(normalizedQuery) !== -1) {
      score += navLabel.indexOf(normalizedQuery) === 0 ? 36 : 24;
    }

    if (slug.indexOf(normalizedQuery) !== -1) {
      score += slug.indexOf(normalizedQuery) === 0 ? 32 : 22;
    }

    if (excerpt.indexOf(normalizedQuery) !== -1) {
      score += 12;
    }

    for (var i = 0; i < terms.length; i += 1) {
      var term = terms[i];
      if (!term) {
        continue;
      }

      var inTitle = title.indexOf(term) !== -1;
      var inNav = navLabel.indexOf(term) !== -1;
      var inSlug = slug.indexOf(term) !== -1;
      var inExcerpt = excerpt.indexOf(term) !== -1;

      if (!inTitle && !inNav && !inSlug && !inExcerpt) {
        return 0;
      }

      if (inTitle) {
        score += 15;
      } else if (inNav) {
        score += 10;
      } else if (inSlug) {
        score += 8;
      } else {
        score += 4;
      }
    }

    return score;
  }

  function getInternalLinkSourcePages() {
    if (state.isManageUnlocked && state.manageIndex && Array.isArray(state.manageIndex.pages)) {
      return state.manageIndex.pages;
    }

    if (state.index && Array.isArray(state.index.pages)) {
      return state.index.pages;
    }

    return [];
  }

  function insertInternalDocLinkByKey(docKey) {
    var target = resolveInternalLinkTargetByKey(docKey);
    if (!target) {
      return;
    }

    insertInternalDocLink(target);
  }

  function resolveInternalLinkTargetByKey(docKey) {
    var normalizedDocKey = normalizeDocPath(readString(docKey, ""));
    if (!normalizedDocKey) {
      return null;
    }

    if (state.isManageUnlocked && state.manageIndex && state.manageIndex.pageMap) {
      if (state.manageIndex.pageMap.has(normalizedDocKey)) {
        return state.manageIndex.pageMap.get(normalizedDocKey);
      }
    }

    if (state.index && state.index.pageMap && state.index.pageMap.has(normalizedDocKey)) {
      return state.index.pageMap.get(normalizedDocKey);
    }

    return null;
  }

  function insertInternalDocLink(target) {
    var textarea = getEditorMarkdownTextarea();
    if (!textarea || !target) {
      return;
    }

    var value = String(textarea.value || "");
    var snapshot = state.internalLinkSelection || getSelectionInfo(textarea);
    var start = Math.max(0, Math.min(Number(snapshot.start) || 0, value.length));
    var end = Math.max(start, Math.min(Number(snapshot.end) || start, value.length));
    var selectedText = value.slice(start, end);

    if (!selectedText) {
      selectedText = readString(snapshot.selectedText, "");
    }

    var label = selectedText || readString(target.title, "Pagina wiki");
    var markdownLink =
      "[" +
      escapeMarkdownLinkLabel(label) +
      "](docs.html?doc=" +
      readString(target.docKey, "") +
      ")";

    replaceSelectionByRange(textarea, start, end, markdownLink, {
      start: markdownLink.length,
      end: markdownLink.length,
    });

    closeInternalLinkPicker();
  }

  function replaceSelectionByRange(textarea, start, end, replacement, selectionRange) {
    var value = String(textarea.value || "");
    var safeStart = Math.max(0, Math.min(start, value.length));
    var safeEnd = Math.max(safeStart, Math.min(end, value.length));

    var before = value.slice(0, safeStart);
    var after = value.slice(safeEnd);
    var nextValue = before + replacement + after;

    var selectionStart = before.length + (selectionRange ? selectionRange.start : replacement.length);
    var selectionEnd = before.length + (selectionRange ? selectionRange.end : replacement.length);

    setTextareaSelection(textarea, nextValue, selectionStart, selectionEnd);
  }

  function escapeMarkdownLinkLabel(value) {
    var sanitized = String(value || "Pagina wiki")
      .replace(/\\/g, "\\\\")
      .replace(/\[/g, "\\[")
      .replace(/\]/g, "\\]")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)")
      .replace(/\n+/g, " ")
      .trim();

    return sanitized || "Pagina wiki";
  }

  function insertBlockAtCursor(textarea, block, blockSelectionRange) {
    var info = getSelectionInfo(textarea);
    var before = info.value.slice(0, info.start);
    var after = info.value.slice(info.end);

    var prefix = "";
    if (before) {
      if (/\n\n$/.test(before)) {
        prefix = "";
      } else if (/\n$/.test(before)) {
        prefix = "\n";
      } else {
        prefix = "\n\n";
      }
    }

    var suffix = "";
    if (after) {
      if (/^\n\n/.test(after)) {
        suffix = "";
      } else if (/^\n/.test(after)) {
        suffix = "\n";
      } else {
        suffix = "\n\n";
      }
    } else {
      suffix = "\n";
    }

    var replacement = prefix + block + suffix;

    var startOffset = prefix.length + block.length;
    var endOffset = startOffset;

    if (blockSelectionRange) {
      startOffset = prefix.length + blockSelectionRange.start;
      endOffset = prefix.length + blockSelectionRange.end;
    }

    replaceSelectionRange(textarea, replacement, {
      start: startOffset,
      end: endOffset,
    });
  }

  function applyCodeBlockAction(textarea) {
    var info = getSelectionInfo(textarea);

    if (info.selectedText) {
      var wrapped = "```text\n" + info.selectedText + "\n```";
      replaceSelectionRange(textarea, wrapped, {
        start: 0,
        end: wrapped.length,
      });
      return;
    }

    var emptyBlock = "```text\n\n```";
    var cursor = "```text\n".length;
    insertBlockAtCursor(textarea, emptyBlock, {
      start: cursor,
      end: cursor,
    });
  }

  function insertMarkdownInEditor(markdownLine) {
    if (!state.elements || !state.elements.editorForm) {
      return;
    }

    var field = state.elements.editorForm.elements.namedItem("content_md");
    if (!field) {
      return;
    }

    var textarea = field;
    var currentValue = String(textarea.value || "");
    var start = typeof textarea.selectionStart === "number" ? textarea.selectionStart : currentValue.length;
    var end = typeof textarea.selectionEnd === "number" ? textarea.selectionEnd : start;

    var before = currentValue.slice(0, start);
    var after = currentValue.slice(end);

    var prefix = "";
    if (before) {
      if (/\n\n$/.test(before)) {
        prefix = "";
      } else if (/\n$/.test(before)) {
        prefix = "\n";
      } else {
        prefix = "\n\n";
      }
    }

    var suffix = "";
    if (after) {
      if (/^\n\n/.test(after)) {
        suffix = "";
      } else if (/^\n/.test(after)) {
        suffix = "\n";
      } else {
        suffix = "\n\n";
      }
    } else {
      suffix = "\n";
    }

    var insertion = prefix + markdownLine + suffix;
    textarea.value = before + insertion + after;

    var caret = before.length + insertion.length;

    textarea.focus();
    if (typeof textarea.setSelectionRange === "function") {
      textarea.setSelectionRange(caret, caret);
    }
  }

  function escapeMarkdownAltText(value) {
    var sanitized = String(value || "Immagine")
      .replace(/\[/g, "\\[")
      .replace(/\]/g, "\\]")
      .replace(/\n+/g, " ")
      .trim();

    return sanitized || "Immagine";
  }

  function buildEditorPayload() {
    if (!state.elements || !state.elements.editorForm) {
      return null;
    }

    if (state.editorMode === "edit" && !state.currentEntry) {
      setEditorStatus("Nessuna pagina selezionata da modificare.", "error");
      return null;
    }

    var form = state.elements.editorForm;
    var section = cleanSegment(readString(getFormValue(form, "section"), ""));
    var slug = normalizeDocPath(readString(getFormValue(form, "slug"), ""));
    var title = readString(getFormValue(form, "title"), "");

    if (!section || !title) {
      setEditorStatus("Compila sezione, slug e titolo per salvare.", "error");
      return null;
    }

    if (state.editorMode === "create") {
      if (!slug) {
        slug = ensureCreateSlug(section, cleanSegment(title));
      } else {
        slug = ensureCreateSlug(section, slug);
      }
    }

    if (!slug) {
      setEditorStatus("Compila sezione, slug e titolo per salvare.", "error");
      return null;
    }

    var sortOrder = parseOptionalInteger(getFormValue(form, "sort_order"));
    var depth = parseOptionalInteger(getFormValue(form, "depth"));
    var navGroupOrder = parseOptionalInteger(getFormValue(form, "nav_group_order"));

    if (sortOrder.invalid) {
      setEditorStatus("Ordine non valido.", "error");
      return null;
    }

    if (depth.invalid) {
      setEditorStatus("Profondita non valida.", "error");
      return null;
    }

    if (navGroupOrder.invalid) {
      setEditorStatus("Ordine gruppo non valido.", "error");
      return null;
    }

    var publishedInput = form.elements.namedItem("is_published");

    var payload = {
      section: section,
      slug: slug,
      title: title,
      nav_group: toNullableString(getFormValue(form, "nav_group")),
      nav_group_order: navGroupOrder.value === null ? 0 : navGroupOrder.value,
      nav_group_icon: toNullableString(getFormValue(form, "nav_group_icon")),
      nav_label: toNullableString(getFormValue(form, "nav_label")),
      page_icon: toNullableString(getFormValue(form, "page_icon")),
      parent_slug: toNullablePath(getFormValue(form, "parent_slug")),
      sort_order: sortOrder.value === null ? 0 : sortOrder.value,
      depth: Math.max(0, depth.value === null ? 0 : depth.value),
      is_published: !!(publishedInput && publishedInput.checked),
      excerpt: toNullableString(getFormValue(form, "excerpt")),
      content_md: String(getFormValue(form, "content_md") || ""),
    };

    if (state.editorMode === "edit" && state.currentEntry) {
      payload.previous_section = readString(state.currentEntry.sectionSlug, "");
      payload.previous_slug = readString(state.currentEntry.rawSlug, state.currentEntry.slug || "");
    }

    return payload;
  }

  function ensureCreateSlug(section, slug) {
    var cleanSection = cleanSegment(section);
    var cleanSlug = normalizeDocPath(slug);

    if (!cleanSection || !cleanSlug) {
      return "";
    }

    if (cleanSlug.indexOf(cleanSection + "/") === 0) {
      return cleanSlug;
    }

    return cleanSection + "/" + cleanSlug;
  }

  function getFormValue(form, name) {
    var field = form.elements.namedItem(name);
    return field ? field.value : "";
  }

  function parseOptionalInteger(rawValue) {
    var value = readString(rawValue, "");

    if (!value) {
      return { value: null, invalid: false };
    }

    var parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return { value: null, invalid: true };
    }

    return { value: Math.floor(parsed), invalid: false };
  }

  function toNullableString(value) {
    var clean = readString(value, "");
    return clean || null;
  }

  function toNullablePath(value) {
    var clean = normalizeDocPath(readString(value, ""));
    return clean || null;
  }

  async function submitEditorForm() {
    var payload = buildEditorPayload();
    if (!payload) {
      return;
    }

    setEditorSavingState(true);
    setEditorStatus("Salvataggio in corso...", "");

    try {
      var result = await upsertWikiPage(payload);
      var targetDocKey = resolveSavedDocKey(payload, result);

      await refreshDocsData(targetDocKey);

      setEditorStatus(state.editorMode === "create" ? "Pagina creata con successo." : "Pagina salvata con successo.", "success");
      closeEditorModal(true);
    } catch (error) {
      console.error("Errore salvataggio pagina wiki:", error);
      setEditorStatus(readString(error && error.message, "Errore durante il salvataggio."), "error");
    } finally {
      setEditorSavingState(false);
    }
  }

  async function upsertWikiPage(payload) {
    var response = await fetch(WIKI_UPSERT_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: "Bearer " + SUPABASE_ANON_KEY,
        "x-import-secret": IMPORT_SECRET,
      },
      body: JSON.stringify(payload),
    });

    var responseBody = await parseResponseBody(response);

    if (!response.ok) {
      throw new Error(readSupabaseError(responseBody, response.status));
    }

    if (responseBody && responseBody.success === false) {
      throw new Error(readString(responseBody.message, "Salvataggio non riuscito."));
    }

    return responseBody || {};
  }

  function resolveSavedDocKey(payload, responseBody) {
    var fromPage = responseBody && responseBody.page ? responseBody.page : null;

    var section = cleanSegment(
      readString(fromPage && fromPage.section, readString(responseBody && responseBody.section, payload.section))
    );

    var slug = normalizeDocPath(
      readString(fromPage && fromPage.slug, readString(responseBody && responseBody.slug, payload.slug))
    );

    return buildDocKey(section, slug);
  }

  async function refreshDocsData(targetDocKey, options) {
    var wikiPages = await fetchWikiPages();
    rebuildWikiIndexes(wikiPages);
    renderDocsTree();

    var normalizedTarget = normalizeDocPath(targetDocKey);

    if (normalizedTarget && state.index && state.index.pageMap.has(normalizedTarget)) {
      await openDocEntry(state.index.pageMap.get(normalizedTarget), {
        historyMode: "replace",
        sourceIndex: state.index,
      });
      return;
    }

    if (
      normalizedTarget &&
      state.isManageUnlocked &&
      state.manageIndex &&
      state.manageIndex.pageMap.has(normalizedTarget)
    ) {
      await openDocEntry(state.manageIndex.pageMap.get(normalizedTarget), {
        historyMode: "replace",
        sourceIndex: state.manageIndex,
      });
      return;
    }

    if (options && options.preferPublishedFallback) {
      var fallbackKey = findPublishedFallbackDocKey(options.sectionSlug, options.excludeDocKey);
      if (fallbackKey && state.index && state.index.pageMap.has(fallbackKey)) {
        await openDocEntry(state.index.pageMap.get(fallbackKey), {
          historyMode: "replace",
          sourceIndex: state.index,
        });
        return;
      }

      var manageFallbackKey = normalizeDocPath(readString(options.excludeDocKey, ""));
      if (state.isManageUnlocked && state.manageIndex && state.manageIndex.pageMap) {
        if (manageFallbackKey && state.manageIndex.pageMap.has(manageFallbackKey)) {
          await openDocEntry(state.manageIndex.pageMap.get(manageFallbackKey), {
            historyMode: "replace",
            sourceIndex: state.manageIndex,
          });
          return;
        }

        if (state.manageIndex.defaultDoc && state.manageIndex.pageMap.has(state.manageIndex.defaultDoc)) {
          await openDocEntry(state.manageIndex.pageMap.get(state.manageIndex.defaultDoc), {
            historyMode: "replace",
            sourceIndex: state.manageIndex,
          });
          return;
        }
      }

      renderCriticalError("Nessuna pagina pubblicata disponibile.");
      return;
    }

    await loadCurrentDocFromUrl({ replaceOnFallback: true });
  }

  function findPublishedFallbackDocKey(sectionSlug, excludedDocKey) {
    if (!state.index || !Array.isArray(state.index.pages) || !state.index.pages.length) {
      return "";
    }

    var normalizedSection = cleanSegment(readString(sectionSlug, ""));
    var excluded = normalizeDocPath(readString(excludedDocKey, ""));

    for (var i = 0; i < state.index.pages.length; i += 1) {
      var page = state.index.pages[i];

      if (excluded && page.docKey === excluded) {
        continue;
      }

      if (normalizedSection && page.sectionSlug !== normalizedSection) {
        continue;
      }

      return page.docKey;
    }

    for (var j = 0; j < state.index.pages.length; j += 1) {
      if (!excluded || state.index.pages[j].docKey !== excluded) {
        return state.index.pages[j].docKey;
      }
    }

    return "";
  }
  function rebuildWikiIndexes(wikiPages) {
    state.publishedIndex = buildWikiIndex(wikiPages, { includeUnpublished: false });
    state.manageIndex = buildWikiIndex(wikiPages, { includeUnpublished: true });
    state.index = state.publishedIndex;
    state.currentDocIndex = state.index;
  }

  async function fetchWikiPages() {
    if (state.isManageUnlocked) {
      try {
        var manageRows = await fetchWikiPagesManage();
        if (Array.isArray(manageRows)) {
          return manageRows;
        }
      } catch (error) {
        console.warn("Fallback caricamento wiki pubblico: endpoint gestione non disponibile.", error);
      }
    }

    return fetchWikiPagesPublic();
  }

  async function fetchWikiPagesManage() {
    var response = await fetch(WIKI_MANAGE_LIST_ENDPOINT, {
      method: "GET",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: "Bearer " + SUPABASE_ANON_KEY,
        "x-import-secret": IMPORT_SECRET,
      },
    });

    var payload = await parseResponseBody(response);

    if (!response.ok) {
      throw new Error(readSupabaseError(payload, response.status));
    }

    if (Array.isArray(payload)) {
      return payload;
    }

    if (payload && Array.isArray(payload.pages)) {
      return payload.pages;
    }

    throw new Error("Risposta list-wiki-pages non valida.");
  }

  async function fetchWikiPagesPublic() {
    var queryParts = [
      "select=" +
        encodeURIComponent(
          [
            "section",
            "slug",
            "title",
            "content_md",
            "excerpt",
            "parent_slug",
            "sort_order",
            "is_published",
            "nav_group",
            "nav_group_order",
            "nav_group_icon",
            "nav_label",
            "page_icon",
            "depth",
          ].join(",")
        ),
      "order=" + encodeURIComponent("section.asc,nav_group_order.asc.nullslast,nav_group.asc.nullslast,sort_order.asc,title.asc"),
    ];

    var url = SUPABASE_URL + "/rest/v1/wiki_pages?" + queryParts.join("&");

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
      throw new Error("Risposta wiki_pages non valida.");
    }

    return payload;
  }

  function buildWikiIndex(rows, options) {
    options = options || { includeUnpublished: false };
    var includeUnpublished = !!options.includeUnpublished;
    var normalizedPages = [];

    for (var i = 0; i < rows.length; i += 1) {
      var page = normalizeWikiPage(rows[i]);
      if (page) {
        normalizedPages.push(page);
      }
    }

    normalizedPages.sort(compareWikiPages);

    var pages = [];
    var pageMap = new Map();
    var sectionMap = new Map();

    for (var j = 0; j < normalizedPages.length; j += 1) {
      var currentPage = normalizedPages[j];

      if (!includeUnpublished && currentPage.isPublished === false) {
        continue;
      }

      if (pageMap.has(currentPage.docKey)) {
        continue;
      }

      if (!sectionMap.has(currentPage.sectionSlug)) {
        sectionMap.set(currentPage.sectionSlug, {
          slug: currentPage.sectionSlug,
          title: currentPage.sectionTitle,
          description: readSectionDescription(currentPage.sectionSlug),
          rows: [],
        });
      }

      sectionMap.get(currentPage.sectionSlug).rows.push(currentPage);
      pageMap.set(currentPage.docKey, currentPage);
    }

    var sectionEntries = Array.from(sectionMap.values()).sort(function compareSections(left, right) {
      return readString(left.slug, "").localeCompare(readString(right.slug, ""), "it", {
        sensitivity: "base",
      });
    });

    var sections = [];

    for (var s = 0; s < sectionEntries.length; s += 1) {
      var sectionData = sectionEntries[s];
      if (!sectionData || !sectionData.rows.length) {
        continue;
      }

      var sectionNodes = buildSectionNodesFromPages(sectionData.rows);
      sections.push({
        slug: sectionData.slug,
        title: sectionData.title,
        description: sectionData.description,
        nodes: sectionNodes.nodes,
      });

      for (var p = 0; p < sectionNodes.orderedPages.length; p += 1) {
        pages.push(sectionNodes.orderedPages[p]);
      }
    }

    for (var k = 0; k < pages.length; k += 1) {
      pages[k].prevKey = k > 0 ? pages[k - 1].docKey : "";
      pages[k].nextKey = k < pages.length - 1 ? pages[k + 1].docKey : "";
    }

    var defaultDoc = pages.length ? pages[0].docKey : "";

    return {
      sections: sections,
      pages: pages,
      pageMap: pageMap,
      defaultDoc: defaultDoc,
    };
  }

  function compareWikiPages(left, right) {
    var sectionCompare = readString(left.sectionSlug, "").localeCompare(
      readString(right.sectionSlug, ""),
      "it",
      { sensitivity: "base" }
    );

    if (sectionCompare !== 0) {
      return sectionCompare;
    }

    var groupOrderCompare = toGroupOrder(left.navGroupOrder) - toGroupOrder(right.navGroupOrder);
    if (groupOrderCompare !== 0) {
      return groupOrderCompare;
    }

    var groupCompare = readString(left.navGroupDisplay, "").localeCompare(
      readString(right.navGroupDisplay, ""),
      "it",
      { sensitivity: "base" }
    );

    if (groupCompare !== 0) {
      return groupCompare;
    }

    var parentCompare = readString(left.parentSlug, "").localeCompare(readString(right.parentSlug, ""), "it", {
      sensitivity: "base",
    });

    if (parentCompare !== 0) {
      return parentCompare;
    }

    var sortCompare = toSortOrder(left.sortOrder) - toSortOrder(right.sortOrder);
    if (sortCompare !== 0) {
      return sortCompare;
    }

    return readString(left.title, "").localeCompare(readString(right.title, ""), "it", {
      sensitivity: "base",
    });
  }

  function normalizeWikiPage(row) {
    if (!row) {
      return null;
    }

    var sectionSlug = cleanSegment(readString(row.section, ""));
    var rawSlug = readString(row.slug, "");
    var docKey = buildDocKey(sectionSlug, rawSlug);

    if (!sectionSlug || !docKey) {
      return null;
    }

    var title = readString(row.title, "Documento");
    var navGroup = readString(row.nav_group, "");
    var navLabel = readString(row.nav_label, "");
    var navGroupDisplay = navGroup || "Generale";
    var breadcrumb = [toSectionTitle(sectionSlug)];

    if (navGroup) {
      breadcrumb.push(navGroup);
    }

    breadcrumb.push(title);

    return {
      title: title,
      navLabel: navLabel,
      sectionTitle: toSectionTitle(sectionSlug),
      sectionSlug: sectionSlug,
      docKey: docKey,
      rawSlug: rawSlug,
      slug: getLeafSlug(docKey),
      contentMd: readString(row.content_md, ""),
      excerpt: readString(row.excerpt, ""),
      isPublished: row.is_published !== false,
      navGroup: navGroup,
      navGroupDisplay: navGroupDisplay,
      navGroupOrder: toGroupOrder(row.nav_group_order),
      navGroupIcon: readString(row.nav_group_icon, ""),
      pageIcon: readString(row.page_icon, ""),
      parentSlug: resolveParentDocKey(sectionSlug, readString(row.parent_slug, "")),
      depth: toDepth(row.depth),
      sortOrder: toSortOrder(row.sort_order),
      prevKey: "",
      nextKey: "",
      breadcrumb: breadcrumb,
      parentPath: breadcrumb.slice(0, breadcrumb.length - 1),
    };
  }

  function resolveParentDocKey(sectionSlug, parentSlug) {
    var normalizedParent = normalizeDocPath(readString(parentSlug, ""));
    if (!normalizedParent) {
      return "";
    }

    if (normalizedParent.indexOf("/") !== -1) {
      return normalizedParent;
    }

    return buildDocKey(sectionSlug, normalizedParent);
  }

  function buildSectionNodesFromPages(pages) {
    var grouped = new Map();

    for (var i = 0; i < pages.length; i += 1) {
      var page = pages[i];
      var groupKey = toNavGroupKey(page.navGroup);

      if (!grouped.has(groupKey)) {
        grouped.set(groupKey, {
          key: groupKey,
          title: readString(page.navGroupDisplay, "Generale"),
          order: toGroupOrder(page.navGroupOrder),
          icon: readString(page.navGroupIcon, ""),
          pages: [],
        });
      }

      var group = grouped.get(groupKey);
      group.pages.push(page);

      if (!group.icon && page.navGroupIcon) {
        group.icon = page.navGroupIcon;
      }

      if (!Number.isFinite(group.order) || group.order === Number.MAX_SAFE_INTEGER) {
        group.order = toGroupOrder(page.navGroupOrder);
      }
    }

    var groups = Array.from(grouped.values()).sort(function compareGroups(left, right) {
      var orderCompare = toGroupOrder(left.order) - toGroupOrder(right.order);
      if (orderCompare !== 0) {
        return orderCompare;
      }

      return readString(left.title, "").localeCompare(readString(right.title, ""), "it", {
        sensitivity: "base",
      });
    });

    var nodes = [];
    var orderedPages = [];

    for (var g = 0; g < groups.length; g += 1) {
      var currentGroup = groups[g];
      currentGroup.pages.sort(comparePageWithinGroup);

      var docNodes = buildDocNodesByParent(currentGroup.pages);
      if (!docNodes.length) {
        continue;
      }

      nodes.push({
        kind: "group",
        title: currentGroup.title,
        icon: readString(currentGroup.icon, ""),
        navGroupKey: currentGroup.key,
        children: docNodes,
      });

      collectOrderedPagesFromNodes(docNodes, orderedPages);
    }

    return {
      nodes: nodes,
      orderedPages: orderedPages,
    };
  }

  function comparePageWithinGroup(left, right) {
    var parentCompare = readString(left.parentSlug, "").localeCompare(readString(right.parentSlug, ""), "it", {
      sensitivity: "base",
    });

    if (parentCompare !== 0) {
      return parentCompare;
    }

    var sortCompare = toSortOrder(left.sortOrder) - toSortOrder(right.sortOrder);
    if (sortCompare !== 0) {
      return sortCompare;
    }

    return readString(left.title, "").localeCompare(readString(right.title, ""), "it", {
      sensitivity: "base",
    });
  }

  function buildDocNodesByParent(pages) {
    var nodeMap = new Map();
    var roots = [];

    for (var i = 0; i < pages.length; i += 1) {
      var page = pages[i];
      nodeMap.set(page.docKey, {
        kind: "doc",
        title: page.navLabel || page.title,
        docKey: page.docKey,
        icon: readString(page.pageIcon, ""),
        sortOrder: toSortOrder(page.sortOrder),
        entry: page,
        children: [],
      });
    }

    for (var j = 0; j < pages.length; j += 1) {
      var currentPage = pages[j];
      var currentNode = nodeMap.get(currentPage.docKey);
      if (!currentNode) {
        continue;
      }

      var parentKey = resolveParentDocKey(currentPage.sectionSlug, currentPage.parentSlug);
      var parentNode = parentKey ? nodeMap.get(parentKey) : null;

      if (parentNode && parentKey !== currentPage.docKey) {
        parentNode.children.push(currentNode);
      } else {
        roots.push(currentNode);
      }
    }

    sortDocNodeTree(roots);
    return roots;
  }

  function sortDocNodeTree(nodes) {
    nodes.sort(function compareNodes(left, right) {
      var sortCompare = toSortOrder(left.sortOrder) - toSortOrder(right.sortOrder);
      if (sortCompare !== 0) {
        return sortCompare;
      }

      return readString(left.title, "").localeCompare(readString(right.title, ""), "it", {
        sensitivity: "base",
      });
    });

    for (var i = 0; i < nodes.length; i += 1) {
      if (nodes[i].children && nodes[i].children.length) {
        sortDocNodeTree(nodes[i].children);
      }
    }
  }

  function collectOrderedPagesFromNodes(nodes, orderedPages) {
    for (var i = 0; i < nodes.length; i += 1) {
      var node = nodes[i];

      if (node.entry) {
        orderedPages.push(node.entry);
      }

      if (node.children && node.children.length) {
        collectOrderedPagesFromNodes(node.children, orderedPages);
      }
    }
  }

  function toGroupOrder(value) {
    var parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return Number.MAX_SAFE_INTEGER;
    }

    return Math.floor(parsed);
  }
  function buildDocKey(sectionSlug, rawSlug) {
    var normalizedSection = cleanSegment(sectionSlug);
    var normalizedSlug = normalizeDocPath(rawSlug);

    if (!normalizedSection || !normalizedSlug) {
      return "";
    }

    if (normalizedSlug.indexOf(normalizedSection + "/") === 0) {
      return normalizedSlug;
    }

    return normalizedSection + "/" + normalizedSlug;
  }

  function normalizeDocPath(value) {
    var parts = String(value || "")
      .split("/")
      .map(function (segment) {
        return cleanSegment(segment);
      })
      .filter(function (segment) {
        return !!segment;
      });

    return parts.join("/");
  }

  function getLeafSlug(docKey) {
    var cleanKey = normalizeDocPath(docKey);
    var lastSlash = cleanKey.lastIndexOf("/");
    return lastSlash === -1 ? cleanKey : cleanKey.slice(lastSlash + 1);
  }

  function toSectionTitle(sectionSlug) {
    if (sectionSlug === "lore") {
      return "Lore";
    }

    if (sectionSlug === "regole") {
      return "Regole";
    }

    var raw = readString(sectionSlug, "Documentazione");
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }

  function readSectionDescription(sectionSlug) {
    if (sectionSlug === "lore") {
      return "Archivio narrativo dell'Enclave e stato delle fratture.";
    }

    if (sectionSlug === "regole") {
      return "Procedure operative e regole condivise di campagna.";
    }

    return "";
  }

  function toDepth(value) {
    var parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return 0;
    }

    return Math.floor(parsed);
  }

  function toSortOrder(value) {
    var parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
  }

  async function loadCurrentDocFromUrl(options) {
    var publishedIndex = state.index;
    var manageIndex = state.manageIndex;

    if (!publishedIndex || !manageIndex) {
      renderCriticalError("Nessuna pagina disponibile.");
      return;
    }

    var docFromUrl = normalizeDocPath(readDocParam());
    var sourceIndex = publishedIndex;
    var entry = null;

    if (docFromUrl) {
      if (publishedIndex.pageMap.has(docFromUrl)) {
        entry = publishedIndex.pageMap.get(docFromUrl);
        sourceIndex = publishedIndex;
      } else if (state.isManageUnlocked && manageIndex.pageMap.has(docFromUrl)) {
        entry = manageIndex.pageMap.get(docFromUrl);
        sourceIndex = manageIndex;
      } else {
        renderInvalidDocState(docFromUrl);
        return;
      }
    } else {
      if (publishedIndex.defaultDoc && publishedIndex.pageMap.has(publishedIndex.defaultDoc)) {
        entry = publishedIndex.pageMap.get(publishedIndex.defaultDoc);
        sourceIndex = publishedIndex;
      } else if (state.isManageUnlocked && manageIndex.defaultDoc && manageIndex.pageMap.has(manageIndex.defaultDoc)) {
        entry = manageIndex.pageMap.get(manageIndex.defaultDoc);
        sourceIndex = manageIndex;
      }
    }

    if (!entry) {
      renderCriticalError("Nessuna pagina pubblicata disponibile.");
      return;
    }

    var shouldReplace = !!(options && options.replaceOnFallback && docFromUrl !== entry.docKey);
    await openDocEntry(entry, {
      historyMode: shouldReplace ? "replace" : "none",
      sourceIndex: sourceIndex,
    });
  }

  async function openDocByKey(docKey, options) {
    var normalized = normalizeDocPath(readString(docKey, ""));

    if (!normalized) {
      renderInvalidDocState(readString(docKey, "(vuota)"));
      return;
    }

    var sourceIndex = state.index;
    var entry = state.index && state.index.pageMap ? state.index.pageMap.get(normalized) : null;

    if (!entry && state.isManageUnlocked && state.manageIndex && state.manageIndex.pageMap) {
      entry = state.manageIndex.pageMap.get(normalized);
      sourceIndex = state.manageIndex;
    }

    if (!entry) {
      renderInvalidDocState(readString(docKey, "(vuota)"));
      return;
    }

    var nextOptions = options || { historyMode: "none" };
    nextOptions.sourceIndex = sourceIndex;

    await openDocEntry(entry, nextOptions);
  }

  async function openDocEntry(entry, options) {
    options = options || { historyMode: "none" };

    if (options.historyMode === "push") {
      writeDocParam(entry.docKey, false);
    } else if (options.historyMode === "replace") {
      writeDocParam(entry.docKey, true);
    }

    state.currentEntry = entry;
    state.currentDocIndex = options.sourceIndex || state.index;
    syncEditActionVisibility();
    renderDocsTree();
    updatePortalGroupState(entry.sectionSlug);
    updateDocMeta(entry);
    document.title = buildPageTitle(entry);
    renderLoadingState();
    teardownTocTracking();

    try {
      var markdown = readString(entry.contentMd, "");
      var html = renderMarkdown(markdown);

      state.elements.content.innerHTML = html;

      var headings = addHeadingAnchors(state.elements.content);
      renderToc(headings);
      renderPrevNext(entry);
      setupTocTracking(headings);
    } catch (error) {
      console.error("Errore caricamento markdown:", error);
      renderDocErrorState({
        title: entry.title,
        message: "Il contenuto non e disponibile o il file non e leggibile.",
        technical: "Chiave documento: " + entry.docKey,
      });
      renderToc([]);
      renderPrevNext(entry);
      teardownTocTracking();
    }
  }
  function renderMarkdown(markdown) {
    if (!window.marked || typeof window.marked.parse !== "function") {
      throw new Error("Parser markdown non disponibile.");
    }

    window.marked.setOptions({
      gfm: true,
      breaks: false,
    });

    return window.marked.parse(markdown || "");
  }

  function updateDocMeta(entry) {
    state.elements.metaSection.textContent = entry.sectionTitle || "Documentazione";
    state.elements.metaTitle.textContent = entry.title || "Documento";

    var parentPath = Array.isArray(entry.parentPath) ? entry.parentPath.join(" / ") : "";
    state.elements.metaCrumb.textContent = parentPath;
  }

  function addHeadingAnchors(root) {
    var headings = root.querySelectorAll("h1, h2, h3");
    var seen = Object.create(null);
    var tocItems = [];

    for (var i = 0; i < headings.length; i += 1) {
      var heading = headings[i];
      var text = readString(heading.textContent, "");

      if (!text) {
        continue;
      }

      var id = createUniqueHeadingId(text, seen);
      heading.id = id;

      var anchor = document.createElement("a");
      anchor.className = "docs-heading-anchor";
      anchor.href = "#" + id;
      anchor.setAttribute("aria-label", "Vai alla sezione " + text);
      anchor.textContent = "#";
      heading.appendChild(anchor);

      var level = Number(heading.tagName.slice(1));
      tocItems.push({ id: id, text: text, level: level });
    }

    return tocItems;
  }

  function clearDocsSearch() {
    state.searchQuery = "";

    if (state.elements && state.elements.searchInput) {
      state.elements.searchInput.value = "";
      state.elements.searchInput.focus();
    }

    renderDocsSearchResults();
  }

  function renderDocsSearchResults() {
    if (!state.elements || !state.elements.searchResults) {
      return;
    }

    var panel = state.elements.searchResults;
    var normalizedQuery = normalizeSearchText(state.searchQuery);

    if (state.elements.searchClear) {
      state.elements.searchClear.hidden = normalizedQuery.length === 0;
    }

    if (normalizedQuery.length < DOCS_SEARCH_MIN_CHARS) {
      panel.hidden = true;
      panel.innerHTML = "";
      return;
    }

    var results = searchWikiPages(normalizedQuery);
    panel.hidden = false;

    if (!results.length) {
      panel.innerHTML = '<p class="docs-search__empty">Nessun risultato per "' + escapeHtml(state.searchQuery) + '".</p>';
      return;
    }

    var itemsHtml = [];
    for (var i = 0; i < results.length; i += 1) {
      var result = results[i];
      var entry = result.entry;
      var meta = entry.sectionTitle;
      if (entry.navGroup) {
        meta += " / " + entry.navGroup;
      }

      var hiddenBadge = "";
      if (state.isManageUnlocked && entry.isPublished === false) {
        hiddenBadge = ' <span class="docs-search-result__badge">Nascosta</span>';
      }

      itemsHtml.push(
        '<li><a class="docs-search-result" href="docs.html?doc=' +
          encodeURIComponent(entry.docKey) +
          '" data-doc-search-link="' +
          escapeHtml(entry.docKey) +
          '"><strong class="docs-search-result__title">' +
          highlightSearchMatch(entry.title, result.terms) +
          hiddenBadge +
          '</strong><span class="docs-search-result__meta">' +
          escapeHtml(meta) +
          '</span>' +
          (result.snippet
            ? '<span class="docs-search-result__snippet">' + highlightSearchMatch(result.snippet, result.terms) + '</span>'
            : "") +
          "</a></li>"
      );
    }

    panel.innerHTML = '<ul class="docs-search-result-list">' + itemsHtml.join("") + "</ul>";
  }

  function searchWikiPages(normalizedQuery) {
    var pages = [];
    if (state.isManageUnlocked && state.manageIndex && Array.isArray(state.manageIndex.pages)) {
      pages = state.manageIndex.pages;
    } else if (state.index && Array.isArray(state.index.pages)) {
      pages = state.index.pages;
    }

    if (!pages.length) {
      return [];
    }

    var terms = normalizedQuery
      .split(/\s+/)
      .map(function (term) {
        return normalizeSearchText(term);
      })
      .filter(function (term) {
        return !!term;
      });

    var scored = [];

    for (var i = 0; i < pages.length; i += 1) {
      var entry = pages[i];
      var scoreData = scoreWikiSearchEntry(entry, normalizedQuery, terms);
      if (!scoreData || scoreData.score <= 0) {
        continue;
      }

      scored.push({
        entry: entry,
        score: scoreData.score,
        terms: terms,
        snippet: buildSearchSnippet(entry, terms),
      });
    }

    scored.sort(function (left, right) {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return readString(left.entry.title, "").localeCompare(readString(right.entry.title, ""), "it", {
        sensitivity: "base",
      });
    });

    return scored.slice(0, DOCS_SEARCH_LIMIT);
  }

  function scoreWikiSearchEntry(entry, normalizedQuery, terms) {
    if (!entry) {
      return null;
    }

    var title = normalizeSearchText(entry.title);
    var navLabel = normalizeSearchText(entry.navLabel);
    var excerpt = normalizeSearchText(entry.excerpt);
    var content = normalizeSearchText(extractPlainText(entry.contentMd));
    var slug = normalizeSearchText(entry.docKey);
    var haystack = [title, navLabel, excerpt, content, slug].join(" ");

    var matchesQuery = haystack.indexOf(normalizedQuery) !== -1;
    if (!matchesQuery && terms.length) {
      matchesQuery = terms.every(function (term) {
        return haystack.indexOf(term) !== -1;
      });
    }

    if (!matchesQuery) {
      return null;
    }

    var score = 0;

    if (title === normalizedQuery) {
      score += 200;
    } else if (title.indexOf(normalizedQuery) === 0) {
      score += 160;
    } else if (title.indexOf(normalizedQuery) !== -1) {
      score += 130;
    }

    if (navLabel.indexOf(normalizedQuery) !== -1) {
      score += 90;
    }

    if (excerpt.indexOf(normalizedQuery) !== -1) {
      score += 70;
    }

    if (slug.indexOf(normalizedQuery) !== -1) {
      score += 30;
    }

    if (content.indexOf(normalizedQuery) !== -1) {
      score += 20;
    }

    for (var i = 0; i < terms.length; i += 1) {
      var term = terms[i];
      if (!term) {
        continue;
      }

      if (title.indexOf(term) !== -1) {
        score += 22;
      }

      if (navLabel.indexOf(term) !== -1) {
        score += 16;
      }

      if (excerpt.indexOf(term) !== -1) {
        score += 10;
      }

      if (content.indexOf(term) !== -1) {
        score += 6;
      }

      if (slug.indexOf(term) !== -1) {
        score += 4;
      }
    }

    return { score: score };
  }

  function buildSearchSnippet(entry, terms) {
    var source = readString(entry.excerpt, "");
    if (!source) {
      source = extractPlainText(entry.contentMd);
    }

    if (!source) {
      return "";
    }

    var plain = source.replace(/\s+/g, " ").trim();
    if (!plain) {
      return "";
    }

    var lower = normalizeSearchText(plain);
    var index = -1;

    for (var i = 0; i < terms.length; i += 1) {
      var term = terms[i];
      if (!term) {
        continue;
      }

      index = lower.indexOf(term);
      if (index !== -1) {
        break;
      }
    }

    if (index === -1) {
      return plain.slice(0, 160) + (plain.length > 160 ? "..." : "");
    }

    var start = Math.max(0, index - 56);
    var end = Math.min(plain.length, index + 104);
    var snippet = plain.slice(start, end);

    if (start > 0) {
      snippet = "..." + snippet;
    }

    if (end < plain.length) {
      snippet += "...";
    }

    return snippet;
  }

  function extractPlainText(value) {
    var text = String(value || "");
    if (!text) {
      return "";
    }

    return text
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/`[^`]*`/g, " ")
      .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/[#>*_~|]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizeSearchText(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function highlightSearchMatch(text, terms) {
    var safe = escapeHtml(text);
    if (!Array.isArray(terms) || !terms.length) {
      return safe;
    }

    var filtered = [];
    for (var i = 0; i < terms.length; i += 1) {
      var term = readString(terms[i], "");
      if (!term) {
        continue;
      }

      filtered.push(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    }

    if (!filtered.length) {
      return safe;
    }

    var pattern = new RegExp("(" + filtered.join("|") + ")", "gi");
    return safe.replace(pattern, "<mark>$1</mark>");
  }
  function renderDocsTree() {
    if (!state.index || !state.elements || !state.elements.tree) {
      return;
    }

    var container = state.elements.tree;
    container.innerHTML = "";
    state.reorderDrag = null;
    container.classList.toggle("is-reorder-enabled", isDocsTreeReorderEnabled());
    container.classList.toggle("is-reordering", !!state.reorderSaving);
    container.setAttribute("aria-busy", state.reorderSaving ? "true" : "false");

    if (!state.isManageUnlocked) {
      setDocsReorderStatus("", "");
    }

    var wrapper = document.createElement("div");
    wrapper.className = "docs-tree-nav";

    var sections = state.index.sections ? state.index.sections.slice() : [];

    if (state.isManageUnlocked) {
      var sectionSet = Object.create(null);

      for (var i = 0; i < sections.length; i += 1) {
        sectionSet[sections[i].slug] = true;
      }

      if (state.manageIndex && Array.isArray(state.manageIndex.pages)) {
        for (var m = 0; m < state.manageIndex.pages.length; m += 1) {
          var managePage = state.manageIndex.pages[m];

          if (!managePage || managePage.isPublished !== false || !managePage.sectionSlug) {
            continue;
          }

          if (!sectionSet[managePage.sectionSlug]) {
            sections.push({
              slug: managePage.sectionSlug,
              title: toSectionTitle(managePage.sectionSlug),
              description: readSectionDescription(managePage.sectionSlug),
              nodes: [],
            });
            sectionSet[managePage.sectionSlug] = true;
          }
        }
      }
    }

    if (!sections.length) {
      container.innerHTML = '<p class="docs-state">Indice non disponibile.</p>';
      renderDocsSearchResults();
      return;
    }

    for (var s = 0; s < sections.length; s += 1) {
      var section = sections[s];
      var sectionBlock = document.createElement("section");
      sectionBlock.className = "docs-tree-group";

      var heading = document.createElement("h2");
      heading.textContent = section.title;
      sectionBlock.appendChild(heading);

      if (section.description) {
        var description = document.createElement("p");
        description.className = "docs-tree-group__desc";
        description.textContent = section.description;
        sectionBlock.appendChild(description);
      }

      if (Array.isArray(section.nodes) && section.nodes.length) {
        var list = document.createElement("ul");
        list.className = "docs-tree-list";
        appendNodesToList(list, section.nodes);
        sectionBlock.appendChild(list);
      }

      if (state.isManageUnlocked) {
        renderHiddenPagesGroup(sectionBlock, section.slug);
      }

      wrapper.appendChild(sectionBlock);
    }

    container.appendChild(wrapper);
    renderDocsSearchResults();
  }

  function renderHiddenPagesGroup(sectionBlock, sectionSlug) {
    var hiddenPages = getHiddenPagesForSection(sectionSlug);
    if (!hiddenPages.length) {
      return;
    }

    var hiddenData = buildSectionNodesFromPages(hiddenPages);
    if (!hiddenData || !Array.isArray(hiddenData.nodes) || !hiddenData.nodes.length) {
      return;
    }

    var hiddenWrap = document.createElement("div");
    hiddenWrap.className = "docs-tree-hidden";

    var hiddenTitle = document.createElement("p");
    hiddenTitle.className = "docs-tree-hidden__title";

    var hiddenIcon = document.createElement("i");
    hiddenIcon.className = "fa-solid fa-eye-slash";
    hiddenIcon.setAttribute("aria-hidden", "true");

    var hiddenText = document.createElement("span");
    hiddenText.textContent = "Pagine nascoste";

    hiddenTitle.appendChild(hiddenIcon);
    hiddenTitle.appendChild(hiddenText);
    hiddenWrap.appendChild(hiddenTitle);

    var hiddenList = document.createElement("ul");
    hiddenList.className = "docs-tree-hidden__list docs-tree-list";
    appendNodesToList(hiddenList, hiddenData.nodes, {
      linkClass: "docs-tree-link docs-tree-link--hidden",
    });

    hiddenWrap.appendChild(hiddenList);
    sectionBlock.appendChild(hiddenWrap);
  }  function getHiddenPagesForSection(sectionSlug) {
    if (!state.manageIndex || !Array.isArray(state.manageIndex.pages)) {
      return [];
    }

    var hidden = [];
    for (var i = 0; i < state.manageIndex.pages.length; i += 1) {
      var page = state.manageIndex.pages[i];

      if (!page || page.sectionSlug !== sectionSlug || page.isPublished !== false) {
        continue;
      }

      hidden.push(page);
    }

    return hidden;
  }

  function resolveDocEntryForTree(docKey) {
    var normalized = normalizeDocPath(readString(docKey, ""));
    if (!normalized) {
      return null;
    }

    if (state.manageIndex && state.manageIndex.pageMap && state.manageIndex.pageMap.has(normalized)) {
      return state.manageIndex.pageMap.get(normalized);
    }

    if (state.index && state.index.pageMap && state.index.pageMap.has(normalized)) {
      return state.index.pageMap.get(normalized);
    }

    return null;
  }

  function resolveTreeIconClass(iconValue, fallback) {
    var raw = readString(iconValue, "");
    if (!raw) {
      return fallback;
    }

    var clean = raw
      .replace(/[^a-zA-Z0-9\s_-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!clean) {
      return fallback;
    }

    if (clean.indexOf("fa-") !== -1) {
      return clean;
    }

    var slug = cleanSegment(clean);
    return slug ? "fa-solid fa-" + slug : fallback;
  }

  function buildDocsTreeDocRow(options) {
    if (!options) {
      return null;
    }

    var docKey = normalizeDocPath(readString(options.docKey, ""));
    if (!docKey) {
      return null;
    }

    var entry = resolveDocEntryForTree(docKey);

    var row = document.createElement("div");
    row.className = "docs-tree-link-row";

    if (entry && state.isManageUnlocked) {
      var handle = document.createElement("span");
      handle.className = "docs-tree-drag-handle";
      handle.setAttribute("aria-hidden", "true");

      var handleIcon = document.createElement("i");
      handleIcon.className = "fa-solid fa-grip-lines";
      handleIcon.setAttribute("aria-hidden", "true");
      handle.appendChild(handleIcon);

      row.appendChild(handle);

      row.setAttribute("data-docs-draggable", "true");
      row.setAttribute("data-doc-key", entry.docKey);
      row.setAttribute("data-section", entry.sectionSlug);
      row.setAttribute("data-parent-slug", normalizeReorderParentSlug(entry.parentSlug));
      row.setAttribute("data-nav-group", normalizeReorderNavGroup(entry.navGroup));
      row.draggable = isDocsTreeReorderEnabled();

      if (!isDocsTreeReorderEnabled()) {
        row.classList.add("is-reorder-disabled");
      }
    }

    var link = document.createElement("a");
    link.className = options.linkClass || "docs-tree-link";
    link.href = "docs.html?doc=" + encodeURIComponent(docKey);
    link.setAttribute("data-doc-link", docKey);

    var iconWrap = document.createElement("span");
    iconWrap.className = "docs-tree-link__icon";

    var icon = document.createElement("i");
    icon.className = resolveTreeIconClass(options.icon || (entry && entry.pageIcon), "fa-solid fa-file-lines");
    icon.setAttribute("aria-hidden", "true");
    iconWrap.appendChild(icon);

    var text = document.createElement("span");
    text.className = "docs-tree-link__text";
    text.textContent = readString(options.title, "Documento");

    link.appendChild(iconWrap);
    link.appendChild(text);

    if (state.currentEntry && state.currentEntry.docKey === docKey) {
      link.classList.add("is-active");
      link.setAttribute("aria-current", "page");
    }

    row.appendChild(link);
    return row;
  }

  function appendNodesToList(list, nodes, options) {
    var opts = options || {};

    for (var i = 0; i < nodes.length; i += 1) {
      var node = nodes[i];
      var item = document.createElement("li");

      if (node.kind === "doc") {
        var row = buildDocsTreeDocRow({
          docKey: node.docKey,
          title: node.title,
          icon: node.icon,
          linkClass: opts.linkClass || "docs-tree-link",
        });

        if (row) {
          item.appendChild(row);
        }

        if (node.children && node.children.length) {
          var nestedList = document.createElement("ul");
          nestedList.className = "docs-tree-sublist";
          appendNodesToList(nestedList, node.children, opts);
          item.appendChild(nestedList);
        }
      } else {
        var label = document.createElement("span");
        label.className = "docs-tree-label";

        var groupIconWrap = document.createElement("span");
        groupIconWrap.className = "docs-tree-label__icon";

        var groupIcon = document.createElement("i");
        groupIcon.className = resolveTreeIconClass(node.icon, "fa-solid fa-folder-tree");
        groupIcon.setAttribute("aria-hidden", "true");
        groupIconWrap.appendChild(groupIcon);

        var groupText = document.createElement("span");
        groupText.className = "docs-tree-label__text";
        groupText.textContent = readString(node.title, "Gruppo");

        label.appendChild(groupIconWrap);
        label.appendChild(groupText);
        item.appendChild(label);

        if (node.children && node.children.length) {
          var subList = document.createElement("ul");
          subList.className = "docs-tree-sublist";
          appendNodesToList(subList, node.children, opts);
          item.appendChild(subList);
        }
      }

      list.appendChild(item);
    }
  }

  function renderToc(headings) {
    var container = state.elements.toc;
    container.innerHTML = "";

    var tocHeadings = [];
    for (var i = 0; i < headings.length; i += 1) {
      if (headings[i].level <= 3) {
        tocHeadings.push(headings[i]);
      }
    }

    if (!tocHeadings.length) {
      container.innerHTML = '<p class="docs-state docs-state--compact">Nessuna sezione disponibile.</p>';
      return;
    }

    var list = document.createElement("ul");
    list.className = "docs-toc-list";

    for (var j = 0; j < tocHeadings.length; j += 1) {
      var heading = tocHeadings[j];
      var li = document.createElement("li");
      var link = document.createElement("a");

      link.className = "docs-toc-link level-" + heading.level;
      link.href = "#" + heading.id;
      link.setAttribute("data-docs-toc-link", heading.id);
      link.textContent = heading.text;

      li.appendChild(link);
      list.appendChild(li);
    }

    container.appendChild(list);
  }

  function setupTocTracking(headings) {
    teardownTocTracking();

    if (!Array.isArray(headings) || !headings.length) {
      return;
    }

    var headingElements = [];
    for (var i = 0; i < headings.length; i += 1) {
      var el = document.getElementById(headings[i].id);
      if (el) {
        headingElements.push(el);
      }
    }

    if (!headingElements.length) {
      return;
    }

    state.tocScrollHandler = function onScroll() {
      if (state.tocRafId) {
        return;
      }

      state.tocRafId = window.requestAnimationFrame(function updateByRaf() {
        state.tocRafId = 0;
        updateActiveTocLink(headingElements);
      });
    };

    state.tocResizeHandler = state.tocScrollHandler;

    state.tocObserver = new IntersectionObserver(
      function onIntersect() {
        state.tocScrollHandler();
      },
      {
        root: null,
        rootMargin: "-12% 0px -70% 0px",
        threshold: [0, 1],
      }
    );

    for (var j = 0; j < headingElements.length; j += 1) {
      state.tocObserver.observe(headingElements[j]);
    }

    window.addEventListener("scroll", state.tocScrollHandler, { passive: true });
    window.addEventListener("resize", state.tocResizeHandler);

    updateActiveTocLink(headingElements);
  }

  function teardownTocTracking() {
    if (state.tocObserver) {
      state.tocObserver.disconnect();
      state.tocObserver = null;
    }

    if (state.tocScrollHandler) {
      window.removeEventListener("scroll", state.tocScrollHandler);
      state.tocScrollHandler = null;
    }

    if (state.tocResizeHandler) {
      window.removeEventListener("resize", state.tocResizeHandler);
      state.tocResizeHandler = null;
    }

    if (state.tocRafId) {
      window.cancelAnimationFrame(state.tocRafId);
      state.tocRafId = 0;
    }

    state.activeTocId = "";
  }

  function updateActiveTocLink(headingElements) {
    var marker = window.scrollY + 170;
    var activeId = headingElements[0].id;

    for (var i = 0; i < headingElements.length; i += 1) {
      if (headingElements[i].offsetTop <= marker) {
        activeId = headingElements[i].id;
      } else {
        break;
      }
    }

    if (state.activeTocId === activeId) {
      return;
    }

    state.activeTocId = activeId;

    var links = state.elements.toc.querySelectorAll(".docs-toc-link");
    for (var j = 0; j < links.length; j += 1) {
      var isActive = links[j].getAttribute("data-docs-toc-link") === activeId;
      links[j].classList.toggle("is-active", isActive);

      if (isActive) {
        links[j].setAttribute("aria-current", "location");
      } else {
        links[j].removeAttribute("aria-current");
      }
    }
  }

  function renderPrevNext(entry) {
    var container = state.elements.prevNext;
    container.innerHTML = "";

    if (!entry) {
      return;
    }

    var sourceIndex = state.currentDocIndex && state.currentDocIndex.pageMap ? state.currentDocIndex : state.index;
    var prevEntry = entry.prevKey && sourceIndex && sourceIndex.pageMap ? sourceIndex.pageMap.get(entry.prevKey) : null;
    var nextEntry = entry.nextKey && sourceIndex && sourceIndex.pageMap ? sourceIndex.pageMap.get(entry.nextKey) : null;

    if (!prevEntry && !nextEntry) {
      return;
    }

    if (prevEntry) {
      container.appendChild(createPrevNextLink(prevEntry, "Precedente", false));
    } else {
      container.appendChild(document.createElement("span"));
    }

    if (nextEntry) {
      container.appendChild(createPrevNextLink(nextEntry, "Successivo", true));
    }
  }

  function createPrevNextLink(entry, label, isNext) {
    var link = document.createElement("a");
    link.className = "docs-prev-next__item" + (isNext ? " docs-prev-next__item--next" : "");
    link.href = "docs.html?doc=" + encodeURIComponent(entry.docKey);
    link.setAttribute("data-doc-link", entry.docKey);

    var badge = document.createElement("span");
    badge.textContent = label;

    var title = document.createElement("strong");
    title.textContent = entry.title;

    link.appendChild(badge);
    link.appendChild(title);

    return link;
  }

  function renderLoadingState() {
    state.elements.content.innerHTML = '<p class="docs-state">Caricamento documento...</p>';
  }

  function renderDocErrorState(options) {
    options = options || {};

    var title = readString(options.title, "Documento");
    var message = readString(options.message, "Contenuto non disponibile.");
    var technical = readString(options.technical, "");

    var html =
      '<section class="docs-error" role="status">' +
      "<h3>" +
      escapeHtml(title) +
      "</h3>" +
      "<p>" +
      escapeHtml(message) +
      "</p>" +
      (technical
        ? '<p class="docs-error__meta">' + escapeHtml(technical) + "</p>"
        : "") +
      "</section>";

    state.elements.content.innerHTML = html;
  }

  function renderCriticalError(message) {
    state.currentEntry = null;
    syncEditActionVisibility();
    document.title = "Documentazione | " + APP_TITLE;

    state.elements.metaSection.textContent = "Documentazione";
    state.elements.metaTitle.textContent = "Errore caricamento";
    state.elements.metaCrumb.textContent = "";

    renderDocErrorState({
      title: "Documentazione non disponibile",
      message: message,
      technical: "Controlla la tabella wiki_pages su Supabase",
    });

    state.elements.tree.innerHTML = '<p class="docs-state">Indice non disponibile.</p>';
    state.elements.toc.innerHTML = '<p class="docs-state docs-state--compact">Nessuna sezione disponibile.</p>';
    state.elements.prevNext.innerHTML = "";
  }

  function renderInvalidDocState(docKey) {
    state.currentEntry = null;
    syncEditActionVisibility();
    document.title = "Documento non trovato | Documentazione | " + APP_TITLE;
    teardownTocTracking();

    state.elements.metaSection.textContent = "Documentazione";
    state.elements.metaTitle.textContent = "Documento non trovato";
    state.elements.metaCrumb.textContent = "Doc richiesto: " + docKey;

    renderDocErrorState({
      title: "Documento non trovato",
      message: "La pagina richiesta non esiste tra i contenuti pubblicati.",
      technical: "Doc richiesto: " + docKey,
    });
    renderToc([]);
    renderPrevNext(null);
  }

  function updatePortalGroupState(groupSlug) {
    for (var i = 0; i < state.elements.groupLinks.length; i += 1) {
      var link = state.elements.groupLinks[i];
      var slug = readString(link.getAttribute("data-doc-group-link"), "");
      link.classList.toggle("is-active", slug === groupSlug);
    }
  }

  function buildPageTitle(entry) {
    var docTitle = readString(entry && entry.title, "Documentazione");
    var sectionTitle = readString(entry && entry.sectionTitle, "Documentazione");
    return docTitle + " | " + sectionTitle + " | " + APP_TITLE;
  }

  function readDocParam() {
    var params = new URLSearchParams(window.location.search);
    return readString(params.get("doc"), "");
  }

  function writeDocParam(docKey, replace) {
    var url = new URL(window.location.href);
    url.searchParams.set("doc", docKey);

    if (replace) {
      window.history.replaceState({}, "", url.toString());
      return;
    }

    window.history.pushState({}, "", url.toString());
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

    return "Richiesta Supabase fallita (" + statusCode + ").";
  }
  function createUniqueHeadingId(text, seen) {
    var base = cleanSegment(text).replace(/-+/g, "-");
    if (!base) {
      base = "sezione";
    }

    if (!seen[base]) {
      seen[base] = 1;
      return base;
    }

    seen[base] += 1;
    return base + "-" + seen[base];
  }

  function cleanSegment(value) {
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

  function escapeHtml(text) {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
})();



