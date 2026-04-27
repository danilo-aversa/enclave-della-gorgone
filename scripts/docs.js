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
  var WIKI_CHECKLIST_STORAGE_PREFIX = "gorgoneWikiChecklist:";
  var DOCS_TREE_COLLAPSE_STORAGE_KEY = "gorgoneDocsTreeCollapsed";
  var WIKI_BOX_TYPES = {
    info: { label: "Info", icon: "fa-solid fa-circle-info" },
    note: { label: "Nota", icon: "fa-solid fa-note-sticky" },
    warning: { label: "Attenzione", icon: "fa-solid fa-triangle-exclamation" },
    success: { label: "Successo", icon: "fa-solid fa-circle-check" },
    danger: { label: "Pericolo", icon: "fa-solid fa-skull-crossbones" },
  };
  var WIKI_TOOLTIP_TYPES = {
    base: { label: "Base", icon: "fa-solid fa-circle-info" },
    lore: { label: "Lore", icon: "fa-solid fa-scroll" },
    spell: { label: "Incantesimo", icon: "fa-solid fa-wand-magic-sparkles" },
    monster: { label: "Mostro", icon: "fa-solid fa-dragon" },
    npc: { label: "PNG", icon: "fa-solid fa-user" },
    location: { label: "Luogo", icon: "fa-solid fa-location-dot" },
    item: { label: "Oggetto", icon: "fa-solid fa-gem" },
    rule: { label: "Regola", icon: "fa-solid fa-gavel" },
  };
  var WIKI_BOX_ICON_CHOICES = [
    "fa-solid fa-circle-info",
    "fa-solid fa-note-sticky",
    "fa-solid fa-triangle-exclamation",
    "fa-solid fa-circle-check",
    "fa-solid fa-circle-xmark",
    "fa-solid fa-circle-question",
    "fa-solid fa-circle-exclamation",
    "fa-solid fa-skull-crossbones",
    "fa-solid fa-lightbulb",
    "fa-solid fa-book",
    "fa-solid fa-book-open",
    "fa-solid fa-book-bookmark",
    "fa-solid fa-book-atlas",
    "fa-solid fa-book-bible",
    "fa-solid fa-scroll",
    "fa-solid fa-scroll-torah",
    "fa-solid fa-file",
    "fa-solid fa-file-lines",
    "fa-solid fa-file-signature",
    "fa-solid fa-folder",
    "fa-solid fa-folder-open",
    "fa-solid fa-folder-tree",
    "fa-solid fa-bookmark",
    "fa-solid fa-tags",
    "fa-solid fa-tag",
    "fa-solid fa-feather",
    "fa-solid fa-feather-pointed",
    "fa-solid fa-pen-nib",
    "fa-solid fa-signature",
    "fa-solid fa-language",
    "fa-solid fa-quote-left",
    "fa-solid fa-heading",
    "fa-solid fa-list-ul",
    "fa-solid fa-list-ol",
    "fa-solid fa-square-check",
    "fa-solid fa-table",
    "fa-solid fa-table-columns",
    "fa-solid fa-eye",
    "fa-solid fa-eye-slash",
    "fa-solid fa-magnifying-glass",
    "fa-solid fa-binoculars",
    "fa-solid fa-location-dot",
    "fa-solid fa-map-pin",
    "fa-solid fa-map",
    "fa-solid fa-map-location-dot",
    "fa-solid fa-compass",
    "fa-solid fa-route",
    "fa-solid fa-road",
    "fa-solid fa-signs-post",
    "fa-solid fa-mountain",
    "fa-solid fa-water",
    "fa-solid fa-tree",
    "fa-solid fa-seedling",
    "fa-solid fa-leaf",
    "fa-solid fa-campground",
    "fa-solid fa-tent",
    "fa-solid fa-fire",
    "fa-solid fa-fire-flame-curved",
    "fa-solid fa-droplet",
    "fa-solid fa-wind",
    "fa-solid fa-snowflake",
    "fa-solid fa-cloud",
    "fa-solid fa-cloud-bolt",
    "fa-solid fa-cloud-moon",
    "fa-solid fa-cloud-sun",
    "fa-solid fa-sun",
    "fa-solid fa-moon",
    "fa-solid fa-star",
    "fa-solid fa-bolt",
    "fa-solid fa-meteor",
    "fa-solid fa-volcano",
    "fa-solid fa-dungeon",
    "fa-solid fa-door-open",
    "fa-solid fa-landmark",
    "fa-solid fa-monument",
    "fa-solid fa-archway",
    "fa-solid fa-place-of-worship",
    "fa-solid fa-church",
    "fa-solid fa-house",
    "fa-solid fa-house-chimney",
    "fa-solid fa-city",
    "fa-solid fa-warehouse",
    "fa-solid fa-bridge",
    "fa-solid fa-bridge-water",
    "fa-solid fa-anchor",
    "fa-solid fa-ship",
    "fa-solid fa-user",
    "fa-solid fa-user-shield",
    "fa-solid fa-user-secret",
    "fa-solid fa-user-ninja",
    "fa-solid fa-user-tie",
    "fa-solid fa-users",
    "fa-solid fa-user-group",
    "fa-solid fa-people-group",
    "fa-solid fa-person",
    "fa-solid fa-person-walking",
    "fa-solid fa-person-hiking",
    "fa-solid fa-person-rays",
    "fa-solid fa-mask",
    "fa-solid fa-masks-theater",
    "fa-solid fa-crown",
    "fa-solid fa-chess-king",
    "fa-solid fa-chess-queen",
    "fa-solid fa-chess-rook",
    "fa-solid fa-chess-knight",
    "fa-solid fa-chess-bishop",
    "fa-solid fa-chess-pawn",
    "fa-solid fa-shield",
    "fa-solid fa-shield-halved",
    "fa-solid fa-gavel",
    "fa-solid fa-scale-balanced",
    "fa-solid fa-handshake",
    "fa-solid fa-hand-fist",
    "fa-solid fa-crosshairs",
    "fa-solid fa-bullseye",
    "fa-solid fa-flag",
    "fa-solid fa-flag-checkered",
    "fa-solid fa-key",
    "fa-solid fa-lock",
    "fa-solid fa-unlock",
    "fa-solid fa-vault",
    "fa-solid fa-box-archive",
    "fa-solid fa-box-open",
    "fa-solid fa-briefcase",
    "fa-solid fa-toolbox",
    "fa-solid fa-hammer",
    "fa-solid fa-screwdriver-wrench",
    "fa-solid fa-helmet-safety",
    "fa-solid fa-flask",
    "fa-solid fa-vial",
    "fa-solid fa-mortar-pestle",
    "fa-solid fa-prescription-bottle",
    "fa-solid fa-wand-magic-sparkles",
    "fa-solid fa-hat-wizard",
    "fa-solid fa-hand-sparkles",
    "fa-solid fa-khanda",
    "fa-solid fa-ankh",
    "fa-solid fa-cross",
    "fa-solid fa-ghost",
    "fa-solid fa-skull",
    "fa-solid fa-dragon",
    "fa-solid fa-paw",
    "fa-solid fa-horse",
    "fa-solid fa-frog",
    "fa-solid fa-fish",
    "fa-solid fa-dove",
    "fa-solid fa-crow",
    "fa-solid fa-kiwi-bird",
    "fa-solid fa-spider",
    "fa-solid fa-bug",
    "fa-solid fa-worm",
    "fa-solid fa-heart",
    "fa-solid fa-heart-crack",
    "fa-solid fa-droplet-slash",
    "fa-solid fa-radiation",
    "fa-solid fa-biohazard",
    "fa-solid fa-bomb",
    "fa-solid fa-gem",
    "fa-solid fa-ring",
    "fa-solid fa-coins",
    "fa-solid fa-sack-dollar",
    "fa-solid fa-dice",
    "fa-solid fa-dice-d20",
    "fa-solid fa-dice-d6",
    "fa-solid fa-hourglass",
    "fa-solid fa-hourglass-half",
    "fa-solid fa-clock",
    "fa-solid fa-calendar-days",
    "fa-solid fa-triangle-exclamation",
    "fa-solid fa-circle-radiation"
  ];
  var EDITOR_MARKDOWN_CONTEXT_ACTIONS = [
    { action: "h1", icon: "fa-solid fa-heading", label: "Titolo H1" },
    { action: "h2", icon: "fa-solid fa-heading", label: "Titolo H2" },
    { action: "h3", icon: "fa-solid fa-text-height", label: "Titolo H3" },
    { separator: true },
    { action: "bold", icon: "fa-solid fa-bold", label: "Grassetto" },
    { action: "italic", icon: "fa-solid fa-italic", label: "Corsivo" },
    { action: "inline-code", icon: "fa-solid fa-code", label: "Codice inline" },
    { separator: true },
    { action: "ul", icon: "fa-solid fa-list-ul", label: "Lista puntata" },
    { action: "ol", icon: "fa-solid fa-list-ol", label: "Lista numerata" },
    { action: "checklist", icon: "fa-solid fa-square-check", label: "Checklist" },
    { action: "quote", icon: "fa-solid fa-quote-left", label: "Citazione" },
    { action: "box", icon: "fa-solid fa-square-caret-right", label: "Box" },
    { action: "stepper", icon: "fa-solid fa-list-ol", label: "Stepper" },
    { action: "expandable", icon: "fa-solid fa-square-caret-down", label: "Expandable" },
    { action: "columns", icon: "fa-solid fa-table-columns", label: "Columns" },
    { action: "table", icon: "fa-solid fa-table", label: "Tabella" },
    { action: "divider", icon: "fa-solid fa-minus", label: "Divisore" },
    { separator: true },
    { action: "link", icon: "fa-solid fa-link", label: "Link" },
    { action: "internal-link", icon: "fa-solid fa-book-bookmark", label: "Link interno" },
    { action: "tooltip", icon: "fa-solid fa-circle-info", label: "Tooltip" },
    { action: "image", icon: "fa-solid fa-image", label: "Immagine" },
    { action: "text-color", icon: "fa-solid fa-palette", label: "Colore testo" },
    { action: "code-block", icon: "fa-solid fa-file-code", label: "Blocco codice" },
  ];
  var EDITOR_BLOCK_INSERT_ACTIONS = [
    { action: "h1", icon: "fa-solid fa-heading", label: "Titolo H1" },
    { action: "h2", icon: "fa-solid fa-heading", label: "Titolo H2" },
    { action: "h3", icon: "fa-solid fa-text-height", label: "Titolo H3" },
    { separator: true },
    { action: "ul", icon: "fa-solid fa-list-ul", label: "Lista puntata" },
    { action: "ol", icon: "fa-solid fa-list-ol", label: "Lista numerata" },
    { action: "checklist", icon: "fa-solid fa-square-check", label: "Checklist" },
    { action: "quote", icon: "fa-solid fa-quote-left", label: "Citazione" },
    { action: "box", icon: "fa-solid fa-square-caret-right", label: "Box" },
    { action: "stepper", icon: "fa-solid fa-list-ol", label: "Stepper" },
    { action: "expandable", icon: "fa-solid fa-square-caret-down", label: "Expandable" },
    { action: "columns", icon: "fa-solid fa-table-columns", label: "Columns" },
    { action: "table", icon: "fa-solid fa-table", label: "Tabella" },
    { action: "divider", icon: "fa-solid fa-minus", label: "Divisore" },
    { action: "image", icon: "fa-solid fa-image", label: "Immagine" },
    { separator: true },
    { action: "inline-code", icon: "fa-solid fa-code", label: "Codice inline" },
    { action: "code-block", icon: "fa-solid fa-file-code", label: "Blocco codice" },
  ];

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
    outlineSpine: null,
    outlineHeadings: [],
    activeTocId: "",
    isManageUnlocked: false,
    isEditorOpen: false,
    editorSaving: false,
    imageUploading: false,
    publishToggleBusy: false,
    editorMode: "edit",
    editorViewMode: "editor",
    editorSourceMode: "visual",
    editorSlugManual: false,
    editorFreshTimer: 0,
    searchQuery: "",
    internalLinkQuery: "",
    internalLinkSelection: null,
    visualInternalLinkSelection: null,
    linkSelection: null,
    visualLinkSelection: null,
    editorLinkPanel: null,
    colorSelection: null,
    visualColorSelection: null,
    boxSelection: null,
    boxTitle: "",
    visualBoxSelection: null,
    editorBoxPicker: null,
    editorBoxIconPicker: null,
    boxIconTargetElement: null,
    tooltipSelection: null,
    visualTooltipSelection: null,
    imagePickerSelection: null,
    visualImageSelection: null,
    imagePickerQuery: "",
    imagePickerExternalUrl: "",
    imagePickerAlt: "",
    imagePickerLayout: "full",
    imagePickerWidthValue: "100",
    imagePickerWidthUnit: "%",
    imagePickerTargetElement: null,
    editorImagePicker: null,
    editorContextSelection: null,
    editorContextMenu: null,
    editorContextMenuMode: "full",
    visualBlockControls: null,
    visualBlockTarget: null,
    visualBlockDrag: null,
    visualBlockCloseTimer: 0,
    editorTableControls: null,
    editorTableMenu: null,
    editorTableContext: null,
    editorTableDrag: null,
    editorColumnsPanel: null,
    editorColumnsContext: null,
    reorderSaving: false,
    reorderDrag: null,
    reorderMode: false,
    reorderStatusTimer: 0,
    treeContextEntryKey: "",
    treeContextMode: "",
    treeContextGroup: null,
    treeContextIcon: null,
    treeIconPicker: null,
    treeCollapsedKeys: null,
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
    editorCodeMirror: null,
    codeMirrorAssetsReady: false,
    codeMirrorAssetsLoading: false,
    codeMirrorAssetCallbacks: [],
    wikiColorChoices: [
      { value: "sage", label: "Sage", group: "standard" },
      { value: "sea", label: "Sea", group: "standard" },
      { value: "teal", label: "Teal", group: "standard" },
      { value: "moss", label: "Moss", group: "standard" },
      { value: "amber", label: "Amber", group: "standard" },
      { value: "ochre", label: "Ochre", group: "standard" },
      { value: "slate", label: "Slate", group: "standard" },
      { value: "stone", label: "Stone", group: "standard" },
      { value: "plum", label: "Plum", group: "standard" },
      { value: "rose", label: "Rose", group: "standard" },
      { value: "clay", label: "Clay Red", group: "standard" },
      { value: "copper", label: "Copper", group: "standard" },
      { value: "indigo", label: "Indigo", group: "standard" },
      { value: "olive", label: "Olive", group: "standard" },
      { value: "ash", label: "Ash", group: "standard" },
      { value: "tooltip-base", label: "Tooltip Base", group: "tooltip", tooltipType: "base" },
      { value: "tooltip-lore", label: "Tooltip Lore", group: "tooltip", tooltipType: "lore" },
      { value: "tooltip-spell", label: "Tooltip Incantesimo", group: "tooltip", tooltipType: "spell" },
      { value: "tooltip-monster", label: "Tooltip Mostro", group: "tooltip", tooltipType: "monster" },
      { value: "tooltip-npc", label: "Tooltip PNG", group: "tooltip", tooltipType: "npc" },
      { value: "tooltip-location", label: "Tooltip Luogo", group: "tooltip", tooltipType: "location" },
      { value: "tooltip-item", label: "Tooltip Oggetto", group: "tooltip", tooltipType: "item" },
      { value: "tooltip-rule", label: "Tooltip Regola", group: "tooltip", tooltipType: "rule" },
    ],
    wikiTooltipActive: null,
    wikiTooltipBubble: null,
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
      editorTabs: document.querySelector("[data-docs-editor-tabs]"),
      editorTabButtons: document.querySelectorAll("[data-docs-editor-tab]"),
      editorPanes: document.querySelectorAll("[data-docs-editor-pane]"),
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
      editorVisualTabs: document.querySelector("[data-docs-visual-tabs]"),
      editorVisualTabButtons: document.querySelectorAll("[data-docs-visual-tab]"),
      editorVisualEditor: document.querySelector("[data-docs-visual-editor]"),
      editorInternalLinkPanel: document.querySelector("[data-docs-internal-link-panel]"),
      editorInternalLinkInput: document.querySelector("[data-docs-internal-link-input]"),
      editorInternalLinkResults: document.querySelector("[data-docs-internal-link-results]"),
      editorColorPicker: document.querySelector("[data-docs-color-picker]"),
      editorTooltipPanel: document.querySelector("[data-docs-tooltip-editor]"),
      editorTooltipVisible: document.querySelector("[data-docs-tooltip-visible]"),
      editorTooltipTitle: document.querySelector("[data-docs-tooltip-title]"),
      editorTooltipType: document.querySelector("[data-docs-tooltip-type]"),
      editorTooltipText: document.querySelector("[data-docs-tooltip-text]"),
      editorTooltipApply: document.querySelector("[data-docs-tooltip-apply]"),
      editorTooltipCancel: document.querySelector("[data-docs-tooltip-cancel]"),
      accessToggle: document.querySelector("[data-docs-access-toggle]"),
      accessPanel: document.querySelector("[data-docs-access-panel]"),
      accessInput: document.querySelector("[data-docs-access-input]"),
      accessStatus: document.querySelector("[data-docs-access-status]"),
      searchInput: document.querySelector("[data-docs-search-input]"),
      searchResults: document.querySelector("[data-docs-search-results]"),
      searchClear: document.querySelector("[data-docs-search-clear]"),
      treeReorderStatus: document.querySelector("[data-docs-reorder-status]"),
      treeContextMenu: document.querySelector("[data-docs-tree-context-menu]"),
      treeContextNew: document.querySelector("[data-docs-tree-context-new]"),
      treeContextEdit: document.querySelector("[data-docs-tree-context-edit]"),
      treeContextToggle: document.querySelector("[data-docs-tree-context-toggle]"),
      treeContextSubpage: document.querySelector("[data-docs-tree-context-subpage]"),
      treeContextGroupPage: document.querySelector("[data-docs-tree-context-group-page]"),
      treeContextIcon: document.querySelector("[data-docs-tree-context-icon]"),
    };

    if (
      !elements.tree ||
      !elements.content ||
      !elements.prevNext ||
      !elements.metaSection ||
      !elements.metaTitle ||
      !elements.metaCrumb
    ) {
      return;
    }

    state.elements = elements;
    repairEditorMarkdownTextarea();

    ensureDocsTreeContextEnhancements();
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
  function repairEditorMarkdownTextarea() {
    if (!state.elements || !state.elements.editorForm) {
      return;
    }

    var form = state.elements.editorForm;
    var existingField = form.elements.namedItem("content_md");

    if (existingField && String(existingField.tagName || "").toLowerCase() === "textarea") {
      state.elements.editorContentMd = existingField;
      return;
    }

    var textarea = document.createElement("textarea");
    textarea.name = "content_md";
    textarea.rows = 16;
    textarea.required = true;
    textarea.setAttribute("data-docs-content-md", "");

    if (!document.getElementById("docs-editor-content-md")) {
      textarea.id = "docs-editor-content-md";
    }

    var placeholderNode = findEditorTextNode(form, "$1");
    if (placeholderNode && placeholderNode.parentNode) {
      placeholderNode.parentNode.replaceChild(textarea, placeholderNode);
      state.elements.editorContentMd = textarea;
      return;
    }

    var tooltipPanel = form.querySelector("[data-docs-tooltip-editor]");
    if (tooltipPanel && tooltipPanel.parentNode) {
      tooltipPanel.parentNode.insertBefore(textarea, tooltipPanel.nextSibling);
      state.elements.editorContentMd = textarea;
      return;
    }

    var contentWrap = form.querySelector(".docs-editor-form__content-wrap");
    if (contentWrap) {
      contentWrap.appendChild(textarea);
      state.elements.editorContentMd = textarea;
      return;
    }

    form.appendChild(textarea);
    state.elements.editorContentMd = textarea;
  }

  function findEditorTextNode(root, text) {
    if (!root || !text || !document.createTreeWalker) {
      return null;
    }

    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var node = walker.nextNode();

    while (node) {
      if (String(node.nodeValue || "").trim() === text) {
        return node;
      }

      node = walker.nextNode();
    }

    return null;
  }

  function ensureDocsTreeContextEnhancements() {
    if (!state.elements || !state.elements.treeContextMenu) {
      return;
    }

    if (!state.elements.treeContextSubpage) {
      var subpageButton = document.createElement("button");
      subpageButton.type = "button";
      subpageButton.className = "docs-tree-context__action";
      subpageButton.setAttribute("data-docs-tree-context-subpage", "");
      subpageButton.setAttribute("role", "menuitem");
      subpageButton.innerHTML = '<i class="fa-solid fa-turn-down" aria-hidden="true"></i><span>Aggiungi sottopagina</span>';
      state.elements.treeContextMenu.appendChild(subpageButton);
      state.elements.treeContextSubpage = subpageButton;
    }

    if (!state.elements.treeContextGroupPage) {
      var groupPageButton = document.createElement("button");
      groupPageButton.type = "button";
      groupPageButton.className = "docs-tree-context__action";
      groupPageButton.setAttribute("data-docs-tree-context-group-page", "");
      groupPageButton.setAttribute("role", "menuitem");
      groupPageButton.innerHTML = '<i class="fa-solid fa-file-circle-plus" aria-hidden="true"></i><span>Aggiungi pagina</span>';
      state.elements.treeContextMenu.appendChild(groupPageButton);
      state.elements.treeContextGroupPage = groupPageButton;
    }

    if (!state.elements.treeContextIcon) {
      var iconButton = document.createElement("button");
      iconButton.type = "button";
      iconButton.className = "docs-tree-context__action";
      iconButton.setAttribute("data-docs-tree-context-icon", "");
      iconButton.setAttribute("role", "menuitem");
      iconButton.innerHTML = '<i class="fa-solid fa-icons" aria-hidden="true"></i><span>Assegna icona</span>';
      state.elements.treeContextMenu.appendChild(iconButton);
      state.elements.treeContextIcon = iconButton;
    }
  }

  function bindUIEvents() {
    ensureEditorMarkdownContextMenu();
    ensureEditorBoxPicker();
    ensureEditorImagePicker();
    ensureEditorMarkdownToolbarEnhancements();
    ensureVisualEditor();
    state.elements.tree.addEventListener("click", function onTreeClick(event) {
      var collapseToggle = event.target.closest("[data-docs-tree-collapse]");
      if (collapseToggle && state.elements.tree.contains(collapseToggle)) {
        event.preventDefault();
        event.stopPropagation();
        toggleDocsTreeCollapsed(collapseToggle.getAttribute("data-docs-tree-collapse"));
        return;
      }

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

    
    if (state.elements.treePanel) {
      state.elements.treePanel.addEventListener("contextmenu", function onTreePanelContextMenu(event) {
        handleDocsTreeContextMenu(event);
      });
    }

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

    if (state.elements.content) {
      state.elements.content.addEventListener("change", function onWikiChecklistChange(event) {
        handleWikiChecklistChange(event);
      });

      state.elements.content.addEventListener("click", function onWikiTooltipClick(event) {
        handleWikiTooltipClick(event);
      });

      state.elements.content.addEventListener("mouseover", function onWikiTooltipHoverIn(event) {
        handleWikiTooltipMouseOver(event);
      });

      state.elements.content.addEventListener("mouseout", function onWikiTooltipHoverOut(event) {
        handleWikiTooltipMouseOut(event);
      });

      state.elements.content.addEventListener("focusin", function onWikiTooltipFocusIn(event) {
        handleWikiTooltipFocusIn(event);
      });

      state.elements.content.addEventListener("focusout", function onWikiTooltipFocusOut(event) {
        handleWikiTooltipFocusOut(event);
      });
    }
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

    if (state.elements.treeContextNew) {
      state.elements.treeContextNew.addEventListener("click", function onTreeContextNewClick(event) {
        event.preventDefault();
        closeDocsTreeContextMenu();
        openEditorForCreate();
      });
    }

    if (state.elements.treeContextEdit) {
      state.elements.treeContextEdit.addEventListener("click", function onTreeContextEditClick(event) {
        event.preventDefault();
        var entry = getTreeContextEntry();
        closeDocsTreeContextMenu();
        openEditorForEntry(entry);
      });
    }

    if (state.elements.treeContextToggle) {
      state.elements.treeContextToggle.addEventListener("click", function onTreeContextToggleClick(event) {
        event.preventDefault();
        var entry = getTreeContextEntry();
        closeDocsTreeContextMenu();
        togglePublishForEntry(entry);
      });
    }

    if (state.elements.treeContextSubpage) {
      state.elements.treeContextSubpage.addEventListener("click", function onTreeContextSubpageClick(event) {
        event.preventDefault();
        var entry = getTreeContextEntry();
        closeDocsTreeContextMenu();
        openEditorForSubpage(entry);
      });
    }

    if (state.elements.treeContextGroupPage) {
      state.elements.treeContextGroupPage.addEventListener("click", function onTreeContextGroupPageClick(event) {
        event.preventDefault();
        var group = getTreeContextGroup();
        closeDocsTreeContextMenu();
        openEditorForGroupPage(group);
      });
    }

    if (state.elements.treeContextIcon) {
      state.elements.treeContextIcon.addEventListener("click", function onTreeContextIconClick(event) {
        event.preventDefault();
        event.stopPropagation();
        openDocsTreeIconPickerFromContext();
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

    if (state.elements.editorTabButtons && state.elements.editorTabButtons.length) {
      for (var tb = 0; tb < state.elements.editorTabButtons.length; tb += 1) {
        state.elements.editorTabButtons[tb].addEventListener("click", function onEditorTabClick(event) {
          var button = event.currentTarget;
          var mode = readString(button && button.getAttribute("data-docs-editor-tab"), "editor");
          setEditorViewMode(mode);
        });
      }
    }

    if (state.elements.editorMarkdownToolbar) {
      state.elements.editorMarkdownToolbar.addEventListener("mousedown", function onMarkdownToolbarMouseDown(event) {
        var formatTrigger = event.target.closest("button[data-md-format-trigger]");
        if (formatTrigger && state.elements.editorMarkdownToolbar.contains(formatTrigger)) {
          event.preventDefault();
          return;
        }

        var button = event.target.closest("button[data-md-action]");
        if (!button || button.disabled) {
          return;
        }

        event.preventDefault();
      });

      state.elements.editorMarkdownToolbar.addEventListener("click", function onMarkdownToolbarClick(event) {
        var formatTrigger = event.target.closest("button[data-md-format-trigger]");
        if (formatTrigger && state.elements.editorMarkdownToolbar.contains(formatTrigger)) {
          event.preventDefault();
          event.stopPropagation();
          toggleEditorFormatMenu(formatTrigger, document.querySelector("[data-md-format-menu]"));
          return;
        }

        var button = event.target.closest("button[data-md-action]");
        if (!button || button.disabled) {
          return;
        }

        event.preventDefault();
        applyMarkdownToolbarAction(button.getAttribute("data-md-action"));
      });

      state.elements.editorMarkdownToolbar.addEventListener("change", function onMarkdownToolbarChange(event) {
        var select = event.target && event.target.closest ? event.target.closest("select[data-md-block-style]") : null;
        if (!select || select.disabled) {
          return;
        }

        var action = readString(select.value, "");
        select.value = "";

        if (!action) {
          return;
        }

        applyMarkdownToolbarAction(action);
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

      state.elements.editorContentMd.addEventListener("contextmenu", function onEditorMarkdownContextMenu(event) {
        handleEditorMarkdownContextMenu(event);
      });
    }

    ensureEditorColorPickerChoices();
    ensureEditorTooltipPanelEnhancements();

    if (state.elements.editorColorPicker) {
      state.elements.editorColorPicker.addEventListener("click", function onColorPickerClick(event) {
        var button = event.target.closest("[data-docs-color-choice]");
        if (!button || button.disabled) {
          return;
        }

        event.preventDefault();

        if (button.hasAttribute("data-docs-color-clear")) {
          clearColoredText();
          return;
        }

        insertColoredText(button.getAttribute("data-docs-color-choice"));
      });
    }

    if (state.elements.editorTooltipApply) {
      state.elements.editorTooltipApply.addEventListener("click", function onTooltipApplyClick(event) {
        event.preventDefault();
        applyTooltipEditorSelection();
      });
    }

    if (state.elements.editorTooltipCancel) {
      state.elements.editorTooltipCancel.addEventListener("click", function onTooltipCancelClick(event) {
        event.preventDefault();
        closeTooltipEditor({ restoreTextareaFocus: true });
      });
    }

    if (state.elements.editorTooltipVisible) {
      state.elements.editorTooltipVisible.addEventListener("keydown", handleTooltipEditorKeydown);
    }

    if (state.elements.editorTooltipTitle) {
      state.elements.editorTooltipTitle.addEventListener("keydown", handleTooltipEditorKeydown);
    }

    if (state.elements.editorTooltipType) {
      state.elements.editorTooltipType.addEventListener("keydown", handleTooltipEditorKeydown);
    }

    if (state.elements.editorTooltipText) {
      state.elements.editorTooltipText.addEventListener("keydown", handleTooltipEditorKeydown);
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

      if (isWikiTooltipOpen()) {
        closeWikiTooltip();
        return;
      }

      if (isEditorColumnsPanelOpen()) {
        closeEditorColumnsPanel();
        return;
      }

      if (isEditorTableMenuOpen()) {
        closeEditorTableMenu();
        return;
      }

      if (isEditorMarkdownContextMenuOpen()) {
        closeEditorMarkdownContextMenu({ restoreTextareaFocus: true });
        return;
      }

      if (isTooltipEditorOpen()) {
        closeTooltipEditor({ restoreTextareaFocus: true });
        return;
      }

      if (isLinkEditorOpen()) {
        closeLinkEditor({ restoreTextareaFocus: true });
        return;
      }

      if (isEditorImagePickerOpen()) {
        closeEditorImagePicker({ restoreTextareaFocus: true });
        return;
      }

      if (isDocsTreeIconPickerOpen()) {
        closeDocsTreeIconPicker();
        return;
      }

      if (isEditorBoxIconPickerOpen()) {
        closeEditorBoxIconPicker({ restoreFocus: true });
        return;
      }

      if (isEditorBoxPickerOpen()) {
        closeEditorBoxPicker({ restoreFocus: true });
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

      if (isDocsTreeContextMenuOpen()) {
        closeDocsTreeContextMenu();
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
      closeDocsTreeContextMenu();
      closeDocsTreeIconPicker();
      closeEditorMarkdownContextMenu();
      closeEditorFormatMenu();
      closeLinkEditor();
      closeInternalLinkPicker();
      closeTooltipEditor();
      closeEditorImagePicker();
      closeEditorBoxPicker();
      closeEditorBoxIconPicker();
      closeEditorBoxIconPicker();
      closeDocsTreeIconPicker();
      closeVisualBlockControls();
      closeVisualTableControls();
      closeEditorTableMenu();
      closeEditorColumnsPanel();
      clearVisualBlockDragState();
      closeWikiTooltip();
    });

    window.addEventListener("scroll", function onDocsScroll(event) {
      closeDocsTreeContextMenu();
      closeEditorMarkdownContextMenu();

      if (isLinkEditorOpen() && !isEventInsideLinkEditor(event && event.target)) {
        closeLinkEditor();
      }

      if (isInternalLinkPickerOpen() && !isEventInsideInternalLinkPicker(event && event.target)) {
        closeInternalLinkPicker();
      }

      if (isTooltipEditorOpen() && !isEventInsideTooltipEditor(event && event.target)) {
        closeTooltipEditor();
      }

      if (isEditorImagePickerOpen() && !isEventInsideEditorImagePicker(event && event.target)) {
        closeEditorImagePicker();
      }

      if (isEditorBoxPickerOpen() && !isEventInsideEditorBoxPicker(event && event.target)) {
        closeEditorBoxPicker();
      }

      if (isEditorBoxIconPickerOpen() && !isEventInsideEditorBoxIconPicker(event && event.target)) {
        closeEditorBoxIconPicker();
      }

      closeVisualBlockControls();
      closeVisualTableControls();
      closeEditorTableMenu();
      closeEditorColumnsPanel();
      clearVisualBlockDragState();
      closeWikiTooltip();
    }, true);

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

    document.addEventListener("click", function onDocsTreeContextOutsideClick(event) {
      if (!isDocsTreeContextMenuOpen()) {
        return;
      }

      if (state.elements.treeContextMenu && state.elements.treeContextMenu.contains(event.target)) {
        return;
      }

      if (isEventInsideDocsTreeIconPicker(event.target)) {
        return;
      }

      closeDocsTreeContextMenu();
    });

    document.addEventListener("click", function onDocsTreeIconPickerOutsideClick(event) {
      if (!isDocsTreeIconPickerOpen()) {
        return;
      }

      if (isEventInsideDocsTreeIconPicker(event.target)) {
        return;
      }

      closeDocsTreeIconPicker();
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

    document.addEventListener("click", function onEditorColumnsPanelOutsideClick(event) {
      if (!isEditorColumnsPanelOpen()) {
        return;
      }

      if (isEventInsideEditorColumnsUi(event.target)) {
        return;
      }

      closeEditorColumnsPanel();
    });

    document.addEventListener("click", function onEditorTableMenuOutsideClick(event) {
      if (!isEditorTableMenuOpen()) {
        return;
      }

      if (isEventInsideEditorTableUi(event.target)) {
        return;
      }

      closeEditorTableMenu();
    });

    document.addEventListener("click", function onEditorMarkdownContextOutsideClick(event) {
      if (!isEditorMarkdownContextMenuOpen()) {
        return;
      }

      if (isEventInsideEditorMarkdownContextMenu(event.target)) {
        return;
      }

      closeEditorMarkdownContextMenu();
    });

    document.addEventListener("click", function onEditorFormatMenuOutsideClick(event) {
      if (isEventInsideEditorFormatMenu(event.target)) {
        return;
      }

      closeEditorFormatMenu();
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

    document.addEventListener("click", function onLinkEditorOutsideClick(event) {
      if (!isLinkEditorOpen()) {
        return;
      }

      if (isEventInsideLinkEditor(event.target)) {
        return;
      }

      closeLinkEditor();
    });

    document.addEventListener("click", function onEditorBoxPickerOutsideClick(event) {
      if (!isEditorBoxPickerOpen()) {
        return;
      }

      if (isEventInsideEditorBoxPicker(event.target)) {
        return;
      }

      closeEditorBoxPicker();
    });

    document.addEventListener("click", function onEditorBoxIconPickerOutsideClick(event) {
      if (!isEditorBoxIconPickerOpen()) {
        return;
      }

      if (isEventInsideEditorBoxIconPicker(event.target)) {
        return;
      }

      closeEditorBoxIconPicker();
    });

    document.addEventListener("click", function onEditorImagePickerOutsideClick(event) {
      if (!isEditorImagePickerOpen()) {
        return;
      }

      if (isEventInsideEditorImagePicker(event.target)) {
        return;
      }

      closeEditorImagePicker();
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

    document.addEventListener("click", function onTooltipEditorOutsideClick(event) {
      if (!isTooltipEditorOpen()) {
        return;
      }

      if (isEventInsideTooltipEditor(event.target)) {
        return;
      }

      closeTooltipEditor();
    });
    document.addEventListener("dragover", function onDocumentVisualBlockDragOver(event) {
      handleVisualTableDragOver(event);
      handleVisualEditorDragOver(event);
    });

    document.addEventListener("drop", function onDocumentVisualBlockDrop(event) {
      if (state.editorTableDrag) {
        handleVisualTableDrop(event);
      }

      if (state.visualBlockDrag) {
        handleVisualEditorDrop(event);
      }
    });

    document.addEventListener("dragend", function onDocumentVisualBlockDragEnd() {
      clearVisualTableDragState();
      clearVisualBlockDragState();
    });

    window.addEventListener("blur", function onWindowVisualBlockDragBlur() {
      clearVisualBlockDragState();
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
    document.addEventListener("click", function onWikiTooltipOutsideClick(event) {
      if (!isWikiTooltipOpen()) {
        return;
      }

      if (isEventInsideWikiTooltip(event.target)) {
        return;
      }

      closeWikiTooltip();
    });
  }

  function ensureVisualEditor() {
    if (!state.elements || !state.elements.editorForm) {
      return;
    }

    var textarea = getEditorMarkdownTextarea();
    if (!textarea) {
      return;
    }

    if (!state.elements.editorVisualTabs) {
      var tabs = document.createElement("div");
      tabs.className = "docs-editor-visual-tabs";
      tabs.setAttribute("data-docs-visual-tabs", "");
      tabs.setAttribute("role", "tablist");
      tabs.setAttribute("aria-label", "Modalita contenuto");

      var visualButton = createVisualModeButton("visual", "Visuale", true);
      var markdownButton = createVisualModeButton("html", "HTML", false);
      tabs.appendChild(visualButton);
      tabs.appendChild(markdownButton);

      var toolbar = state.elements.editorMarkdownToolbar;
      var contentWrap = textarea.closest(".docs-editor-form__content-wrap") || textarea.parentNode;
      if (toolbar) {
        tabs.classList.add("docs-editor-visual-tabs--toolbar");
        toolbar.insertBefore(tabs, toolbar.firstChild);
      } else if (contentWrap) {
        contentWrap.insertBefore(tabs, contentWrap.firstChild);
      }

      state.elements.editorVisualTabs = tabs;
      state.elements.editorVisualTabButtons = tabs.querySelectorAll("[data-docs-visual-tab]");
    }

    if (!state.elements.editorVisualEditor) {
      var visualEditor = document.createElement("div");
      visualEditor.className = "docs-visual-editor";
      visualEditor.setAttribute("data-docs-visual-editor", "");
      visualEditor.setAttribute("contenteditable", "true");
      visualEditor.setAttribute("role", "textbox");
      visualEditor.setAttribute("aria-multiline", "true");
      visualEditor.setAttribute("aria-label", "Editor visuale contenuto wiki");

      textarea.parentNode.insertBefore(visualEditor, textarea);
      state.elements.editorVisualEditor = visualEditor;

      visualEditor.addEventListener("beforeinput", function onVisualEditorBeforeInput(event) {
        rememberVisualEditorHistoryBeforeNativeInput(event);
      });

      visualEditor.addEventListener("input", function onVisualEditorInput(event) {
        commitVisualEditorHistoryAfterNativeInput(event);

        if (state.editorSourceMode === "visual") {
          setEditorStatus("", "");
        }
      });

      visualEditor.addEventListener("keydown", function onVisualEditorKeydown(event) {
        if (handleVisualEditorBoxDeletionKeydown(event)) {
          return;
        }

        handleVisualEditorShortcut(event);
      });

      visualEditor.addEventListener("contextmenu", function onVisualEditorContextMenu(event) {
        handleVisualEditorContextMenu(event);
      });

      visualEditor.addEventListener("click", function onVisualEditorClick(event) {
        handleVisualStepperClick(event);
        handleVisualColumnsClick(event);
        handleVisualTableClick(event);
        handleVisualEditorClick(event);
      });

      visualEditor.addEventListener("mouseup", function onVisualEditorMouseUp() {
        normalizeVisualSelectionWhitespace();
      });

      visualEditor.addEventListener("keyup", function onVisualEditorKeyUp() {
        normalizeVisualSelectionWhitespace();
      });

      visualEditor.addEventListener("mousemove", function onVisualEditorMouseMove(event) {
        handleVisualTableMouseMove(event);
        handleVisualEditorMouseMove(event);
      });

      visualEditor.addEventListener("mouseleave", function onVisualEditorMouseLeave() {
        scheduleVisualBlockControlsClose();
        scheduleVisualTableControlsClose();
      });

      visualEditor.addEventListener("dragover", function onVisualEditorDragOver(event) {
        handleVisualEditorDragOver(event);
      });

      visualEditor.addEventListener("drop", function onVisualEditorDrop(event) {
        handleVisualEditorDrop(event);
      });

      visualEditor.addEventListener("dragend", function onVisualEditorDragEnd() {
        clearVisualBlockDragState();
      });
    }

    if (state.elements.editorVisualTabButtons && state.elements.editorVisualTabButtons.length) {
      for (var i = 0; i < state.elements.editorVisualTabButtons.length; i += 1) {
        state.elements.editorVisualTabButtons[i].addEventListener("click", function onVisualModeClick(event) {
          var mode = readString(event.currentTarget.getAttribute("data-docs-visual-tab"), "visual");
          setEditorSourceMode(mode);
        });
      }
    }

    setEditorSourceMode(state.editorSourceMode || "visual", { skipSync: true });
  }

  function createVisualModeButton(mode, label, isActive) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "docs-editor-visual-tabs__btn" + (isActive ? " is-active" : "");
    button.setAttribute("data-docs-visual-tab", mode);
    button.setAttribute("role", "tab");
    button.setAttribute("aria-selected", isActive ? "true" : "false");
    button.textContent = label;
    return button;
  }

  function isVisualEditorMode() {
    return state.editorSourceMode === "visual" && !!(state.elements && state.elements.editorVisualEditor);
  }

  function setEditorSourceMode(mode, options) {
    var normalized = mode === "html" || mode === "markdown" ? "html" : "visual";
    var opts = options || {};
    var previous = state.editorSourceMode;

    if (!opts.skipSync && previous === "visual" && normalized === "html") {
      syncVisualEditorToMarkdown();
    }

    if (!opts.skipSync && previous === "html" && normalized === "visual") {
      syncCodeMirrorToTextarea();
    }

    state.editorSourceMode = normalized;

    if (!opts.skipSync && normalized === "visual") {
      syncMarkdownToVisualEditor();
    }

    if (normalized === "html") {
      ensureEditorCodeMirror({ refresh: true });
    }

    syncEditorSourceModeUi();
  }

  function syncEditorSourceModeUi() {
    if (!state.elements) {
      return;
    }

    var isVisual = state.editorSourceMode !== "html";
    var codeMirror = state.editorCodeMirror;
    var codeMirrorWrapper = codeMirror && codeMirror.getWrapperElement ? codeMirror.getWrapperElement() : null;

    if (state.elements.editorVisualEditor) {
      state.elements.editorVisualEditor.hidden = !isVisual;
    }

    if (state.elements.editorContentMd) {
      state.elements.editorContentMd.hidden = isVisual || !!codeMirrorWrapper;
    }

    if (codeMirrorWrapper) {
      codeMirrorWrapper.hidden = isVisual;
      if (!isVisual) {
        window.requestAnimationFrame(function refreshCodeMirrorAfterModeSwitch() {
          if (state.editorCodeMirror && state.editorCodeMirror.refresh) {
            state.editorCodeMirror.refresh();
            state.editorCodeMirror.focus();
          }
        });
      }
    }

    if (state.elements.editorVisualTabButtons && state.elements.editorVisualTabButtons.length) {
      for (var i = 0; i < state.elements.editorVisualTabButtons.length; i += 1) {
        var button = state.elements.editorVisualTabButtons[i];
        var active = readString(button.getAttribute("data-docs-visual-tab"), "visual") === state.editorSourceMode;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-selected", active ? "true" : "false");
      }
    }
  }

  function syncMarkdownToVisualEditor() {
    if (!state.elements || !state.elements.editorVisualEditor) {
      return;
    }

    var source = getEditorMarkdownSource();
    state.elements.editorVisualEditor.innerHTML = storedContentToVisualEditorHtml(source);
    prepareVisualEditorDomForEditing(state.elements.editorVisualEditor);
  }

  function syncVisualEditorToMarkdown() {
    if (!state.elements || !state.elements.editorVisualEditor) {
      return;
    }

    var textarea = getEditorMarkdownTextarea();
    if (!textarea) {
      return;
    }

    setEditorMarkdownSource(formatEditorHtmlSource(visualEditorDomToHtml(state.elements.editorVisualEditor)));
  }

  function storedContentToVisualEditorHtml(sourceValue) {
    var source = String(sourceValue || "").trim();
    if (!source) {
      return "<p><br></p>";
    }

    if (isLegacyMarkdownContent(source)) {
      try {
        return renderMarkdown(source);
      } catch (_legacyError) {
        return "<p>" + escapeInlineHtmlText(source) + "</p>";
      }
    }

    if (isStoredHtmlContent(source)) {
      return normalizeStoredHtmlContent(source);
    }

    try {
      return renderMarkdown(source);
    } catch (_error) {
      return "<p>" + escapeInlineHtmlText(source) + "</p>";
    }
  }

  function markdownToVisualEditorHtml(markdown) {
    return storedContentToVisualEditorHtml(markdown);
  }

  function visualEditorDomToHtml(root) {
    if (!root) {
      return "";
    }

    var clone = root.cloneNode(true);
    cleanVisualHtmlForStorage(clone);
    return clone.innerHTML.trim();
  }

  function formatEditorHtmlSource(sourceValue) {
    var source = String(sourceValue || "").trim();
    if (!source) {
      return "";
    }

    if (!isStoredHtmlContent(source)) {
      return source;
    }

    var template = document.createElement("template");
    template.innerHTML = source;

    var lines = [];
    for (var i = 0; i < template.content.childNodes.length; i += 1) {
      appendFormattedHtmlNode(template.content.childNodes[i], 0, lines);
    }

    return lines.join(String.fromCharCode(10)).trim();
  }

  function appendFormattedHtmlNode(node, depth, lines) {
    if (!node || !Array.isArray(lines)) {
      return;
    }

    if (node.nodeType === Node.TEXT_NODE) {
      var text = readString(node.nodeValue, "");
      if (text) {
        lines.push(createHtmlIndent(depth) + text);
      }
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return;
    }

    var tag = String(node.tagName || "").toLowerCase();
    var inlineTags = {
      a: true,
      abbr: true,
      b: true,
      br: true,
      code: true,
      em: true,
      i: true,
      mark: true,
      small: true,
      span: true,
      strong: true,
      u: true,
    };

    if (isCompactHtmlElement(node, inlineTags)) {
      lines.push(createHtmlIndent(depth) + serializeCompactHtmlElement(node));
      return;
    }

    var openTag = buildHtmlOpenTag(node);
    var closeTag = "</" + tag + ">";

    if (isVoidHtmlTag(tag)) {
      lines.push(createHtmlIndent(depth) + openTag);
      return;
    }

    lines.push(createHtmlIndent(depth) + openTag);

    for (var i = 0; i < node.childNodes.length; i += 1) {
      appendFormattedHtmlNode(node.childNodes[i], depth + 1, lines);
    }

    lines.push(createHtmlIndent(depth) + closeTag);
  }

  function createHtmlIndent(depth) {
    var count = Math.max(0, Number(depth) || 0);
    return new Array(count + 1).join("  ");
  }

  function isCompactHtmlElement(node, inlineTags) {
    if (!node || node.nodeType !== Node.ELEMENT_NODE) {
      return false;
    }

    var tag = String(node.tagName || "").toLowerCase();
    if (isVoidHtmlTag(tag)) {
      return true;
    }

    var children = node.childNodes || [];
    if (!children.length) {
      return true;
    }

    if (tag === "p" || tag === "h1" || tag === "h2" || tag === "h3" || tag === "li" || tag === "td" || tag === "th" || tag === "summary") {
      for (var i = 0; i < children.length; i += 1) {
        var child = children[i];
        if (child.nodeType === Node.TEXT_NODE) {
          continue;
        }

        if (child.nodeType !== Node.ELEMENT_NODE) {
          return false;
        }

        var childTag = String(child.tagName || "").toLowerCase();
        if (!inlineTags[childTag]) {
          return false;
        }
      }

      return true;
    }

    if (!inlineTags[tag]) {
      return false;
    }

    for (var j = 0; j < children.length; j += 1) {
      var inlineChild = children[j];
      if (inlineChild.nodeType === Node.TEXT_NODE) {
        continue;
      }

      if (inlineChild.nodeType !== Node.ELEMENT_NODE || !inlineTags[String(inlineChild.tagName || "").toLowerCase()]) {
        return false;
      }
    }

    return true;
  }

  function serializeCompactHtmlElement(node) {
    if (!node || node.nodeType !== Node.ELEMENT_NODE) {
      return "";
    }

    var tag = String(node.tagName || "").toLowerCase();
    var openTag = buildHtmlOpenTag(node);

    if (isVoidHtmlTag(tag)) {
      return openTag;
    }

    return openTag + node.innerHTML.trim() + "</" + tag + ">";
  }

  function buildHtmlOpenTag(node) {
    if (!node || node.nodeType !== Node.ELEMENT_NODE) {
      return "";
    }

    var tag = String(node.tagName || "").toLowerCase();
    var attrs = [];

    for (var i = 0; i < node.attributes.length; i += 1) {
      var attr = node.attributes[i];
      if (!attr || !attr.name) {
        continue;
      }

      attrs.push(attr.name + '="' + escapeInlineHtmlText(attr.value) + '"');
    }

    return "<" + tag + (attrs.length ? " " + attrs.join(" ") : "") + ">";
  }

  function isVoidHtmlTag(tagName) {
    var tag = String(tagName || "").toLowerCase();
    return tag === "br" || tag === "hr" || tag === "img" || tag === "input";
  }

  function prepareVisualEditorDomForEditing(root) {
    if (!root || !root.querySelectorAll) {
      return;
    }

    ensureVisualEditorStepperAddButtons(root);

    var images = root.querySelectorAll(".wiki-image");
    for (var i = 0; i < images.length; i += 1) {
      images[i].setAttribute("contenteditable", "false");
    }

    var boxIcons = root.querySelectorAll(".wiki-box__icon");
    for (var iconIndex = 0; iconIndex < boxIcons.length; iconIndex += 1) {
      boxIcons[iconIndex].setAttribute("contenteditable", "false");
      boxIcons[iconIndex].setAttribute("title", "Cambia icona");
      boxIcons[iconIndex].setAttribute("data-tooltip", "Cambia icona");
    }

    var checklistInputs = root.querySelectorAll("input[data-wiki-check-id]");
    for (var checkIndex = 0; checkIndex < checklistInputs.length; checkIndex += 1) {
      checklistInputs[checkIndex].setAttribute("contenteditable", "false");
      checklistInputs[checkIndex].setAttribute("type", "checkbox");
    }
  }

  function cleanVisualHtmlForStorage(root) {
    if (!root || !root.querySelectorAll) {
      return;
    }

    var stepperAddButtons = root.querySelectorAll("[data-wiki-stepper-add]");
    for (var stepperAddIndex = 0; stepperAddIndex < stepperAddButtons.length; stepperAddIndex += 1) {
      stepperAddButtons[stepperAddIndex].remove();
    }

    var anchors = root.querySelectorAll(".docs-heading-anchor");
    for (var anchorIndex = 0; anchorIndex < anchors.length; anchorIndex += 1) {
      anchors[anchorIndex].remove();
    }

    var all = root.querySelectorAll("*");
    for (var i = 0; i < all.length; i += 1) {
      var element = all[i];
      element.removeAttribute("contenteditable");
      element.removeAttribute("aria-describedby");
      element.classList.remove("is-open", "is-visual-drop-before", "is-visual-drop-after", "is-visual-block-dragging");

        if (element.classList && element.classList.contains("wiki-image")) {
        var imageData = readWikiImageDataFromNode(element);
        if (imageData && imageData.width) {
          element.setAttribute("data-wiki-image-width", imageData.width);
          element.style.setProperty("--wiki-image-width", imageData.width);
        }
      }

      if (String(element.tagName || "").toLowerCase() === "input" && element.getAttribute("data-wiki-check-id")) {
        element.setAttribute("type", "checkbox");
        element.removeAttribute("checked");
      }
    }
  }

  function visualEditorDomToMarkdown(root) {
    if (!root) {
      return "";
    }

    var lineFeed = String.fromCharCode(10);
    var blocks = [];

    for (var i = 0; i < root.childNodes.length; i += 1) {
      var block = serializeVisualBlock(root.childNodes[i]);
      if (block) {
        blocks.push(block);
      }
    }

    if (!blocks.length) {
      return serializeVisualInline(root).trim();
    }

    return collapseMarkdownBlankLines(blocks.join(lineFeed + lineFeed)).trim();
  }

  function collapseMarkdownBlankLines(value) {
    var lineFeed = String.fromCharCode(10);
    var lines = String(value || "").split(lineFeed);
    var output = [];
    var blankCount = 0;

    for (var i = 0; i < lines.length; i += 1) {
      var line = lines[i];
      if (!String(line || "").trim()) {
        blankCount += 1;
        if (blankCount <= 1) {
          output.push("");
        }
        continue;
      }

      blankCount = 0;
      output.push(line);
    }

    return output.join(lineFeed);
  }

  function serializeVisualBlock(node) {
    if (!node) {
      return "";
    }

    if (node.nodeType === Node.TEXT_NODE) {
      return readString(node.nodeValue, "");
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return "";
    }

    var lineFeed = String.fromCharCode(10);
    var tag = String(node.tagName || "").toLowerCase();

    if (node.classList && node.classList.contains("wiki-box")) {
      return serializeVisualWikiBox(node);
    }

    if (node.classList && node.classList.contains("wiki-image") && node.classList.contains("wiki-image--full")) {
      return serializeVisualImage(node);
    }

    if (node.querySelector) {
      var nestedWikiBox = node.querySelector(".wiki-box");
      if (nestedWikiBox && !readString(serializeVisualInlineWithoutSpecialBlocks(node), "")) {
        return serializeVisualWikiBox(nestedWikiBox);
      }

      var nestedFullImage = node.querySelector(".wiki-image--full");
      if (nestedFullImage && !readString(serializeVisualInlineWithoutSpecialBlocks(node), "")) {
        return serializeVisualImage(nestedFullImage);
      }
    }

    if (tag === "h1" || tag === "h2" || tag === "h3") {
      var level = Number(tag.slice(1));
      return Array(level + 1).join("#") + " " + serializeVisualInline(node).trim();
    }

    if (tag === "p" || tag === "div") {
      return serializeVisualInline(node).trim();
    }

    if (tag === "ul" || tag === "ol") {
      return serializeVisualList(node, tag === "ol");
    }

    if (tag === "blockquote") {
      return serializeVisualInline(node).trim().split(lineFeed).map(function (line) {
        return "> " + line;
      }).join(lineFeed);
    }

    if (tag === "pre") {
      return "```text" + lineFeed + readString(node.textContent, "") + lineFeed + "```";
    }

    if (tag === "hr") {
      return "---";
    }

    if (tag === "img") {
      return serializeVisualImage(node);
    }

    return serializeVisualInline(node).trim();
  }

  function serializeVisualList(list, isOrdered) {
    var lineFeed = String.fromCharCode(10);
    var items = [];
    var children = list.children || [];

    for (var i = 0; i < children.length; i += 1) {
      if (String(children[i].tagName || "").toLowerCase() !== "li") {
        continue;
      }

      items.push((isOrdered ? String(items.length + 1) + ". " : "- ") + serializeVisualInline(children[i]).trim());
    }

    return items.join(lineFeed);
  }

  function serializeVisualWikiBox(node) {
    var lineFeed = String.fromCharCode(10);
    var type = "info";
    var keys = Object.keys(WIKI_BOX_TYPES);

    for (var i = 0; i < keys.length; i += 1) {
      if (node.classList.contains("wiki-box--" + keys[i])) {
        type = keys[i];
        break;
      }
    }

    var content = node.querySelector(".wiki-box__content") || node;
    var titleNode = content.querySelector(".wiki-box__title");
    var title = titleNode ? serializeVisualInline(titleNode).trim() : "";
    var contentBlocks = [];

    for (var childIndex = 0; childIndex < content.childNodes.length; childIndex += 1) {
      var child = content.childNodes[childIndex];
      if (child === titleNode) {
        continue;
      }

      var block = serializeVisualBlock(child);
      if (block) {
        contentBlocks.push(block);
      }
    }

    return ":::box " + type + (title ? " " + title : "") + lineFeed + contentBlocks.join(lineFeed + lineFeed) + lineFeed + ":::";
  }

  function serializeVisualInline(node) {
    if (!node) {
      return "";
    }

    var output = "";
    for (var i = 0; i < node.childNodes.length; i += 1) {
      output += serializeVisualInlineNode(node.childNodes[i]);
    }

    return output;
  }

  function serializeVisualInlineWithoutWikiBoxes(node) {
    return serializeVisualInlineWithoutSpecialBlocks(node);
  }

  function serializeVisualInlineWithoutSpecialBlocks(node) {
    if (!node) {
      return "";
    }

    var output = "";
    for (var i = 0; i < node.childNodes.length; i += 1) {
      var child = node.childNodes[i];
      if (
        child.nodeType === Node.ELEMENT_NODE &&
        child.classList &&
        (child.classList.contains("wiki-box") || child.classList.contains("wiki-image--full"))
      ) {
        continue;
      }

      output += serializeVisualInlineNode(child);
    }

    return output;
  }

  function serializeVisualInlineNode(node) {
    if (!node) {
      return "";
    }

    if (node.nodeType === Node.TEXT_NODE) {
      return String(node.nodeValue || "");
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return "";
    }

    var lineFeed = String.fromCharCode(10);
    var tag = String(node.tagName || "").toLowerCase();
    var text = serializeVisualInline(node);

    if (tag === "br") {
      return lineFeed;
    }

    if (tag === "strong" || tag === "b") {
      return "**" + text + "**";
    }

    if (tag === "em" || tag === "i") {
      return "*" + text + "*";
    }

    if (tag === "code") {
      return "`" + readString(node.textContent, text) + "`";
    }

    if (tag === "a") {
      return "[" + text + "](" + readString(node.getAttribute("href"), "#") + ")";
    }

    if (tag === "img" || (node.classList && node.classList.contains("wiki-image"))) {
      return serializeVisualImage(node);
    }

    if (node.classList && node.classList.contains("wiki-tooltip")) {
      return buildTooltipHtml(
        text || readString(node.textContent, "testo visibile"),
        readString(node.getAttribute("data-tooltip"), ""),
        readString(node.getAttribute("data-tooltip-title"), ""),
        normalizeWikiTooltipType(node.getAttribute("data-tooltip-type"))
      );
    }

    if (node.classList && node.classList.contains("wiki-color")) {
      var colorClass = readWikiColorClass(node);
      return '<span class="wiki-color ' + colorClass + '">' + escapeInlineHtmlText(text) + "</span>";
    }

    return text;
  }

  function serializeVisualImage(node) {
    var imageData = readWikiImageDataFromNode(node);
    if (!imageData || !imageData.src) {
      return "";
    }

    return buildWikiImageHtml(imageData.src, imageData.alt, imageData.layout, imageData.width);
  }

  function readWikiImageDataFromNode(node) {
    if (!node || node.nodeType !== Node.ELEMENT_NODE) {
      return null;
    }

    var element = node;
    var image = null;

    if (String(element.tagName || "").toLowerCase() === "img") {
      image = element;
    } else if (element.querySelector) {
      image = element.querySelector("img");
    }

    if (!image) {
      return null;
    }

    var wrapper = image.closest ? image.closest(".wiki-image") : null;
    var layout = wrapper && wrapper.classList && wrapper.classList.contains("wiki-image--inline") ? "inline" : "full";
    var width = readString(image.getAttribute("data-wiki-image-width"), "");

    if (!width && wrapper) {
      width = readString(wrapper.getAttribute("data-wiki-image-width"), "");
    }

    if (!width && wrapper && wrapper.style) {
      width = readString(wrapper.style.getPropertyValue("--wiki-image-width"), "");
    }

    return {
      src: readString(image.getAttribute("src"), ""),
      alt: readString(image.getAttribute("alt"), "Immagine"),
      layout: layout,
      width: normalizeWikiImageWidth(width, layout),
    };
  }

  function createWikiBlockId(prefix) {
    return prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  function buildWikiChecklistHtml(items) {
    var listId = createWikiBlockId("checklist");
    var rows = Array.isArray(items) && items.length ? items : ["Prima voce"];
    var html = '<ul class="wiki-checklist" data-wiki-checklist-id="' + escapeInlineHtmlText(listId) + '">';

    for (var i = 0; i < rows.length; i += 1) {
      var checkId = listId + "-" + String(i + 1);
      html += '<li class="wiki-checklist__item">' +
        '<label class="wiki-checkitem">' +
        '<input type="checkbox" data-wiki-check-id="' + escapeInlineHtmlText(checkId) + '">' +
        '<span>' + escapeInlineHtmlText(rows[i]) + '</span>' +
        '</label>' +
        '</li>';
    }

    html += "</ul>";
    return html;
  }

  function buildWikiStepperHtml(steps) {
    var rows = Array.isArray(steps) && steps.length ? steps : [{ title: "Passo", body: "Descrizione." }];
    var html = '<div class="wiki-stepper">';

    for (var i = 0; i < rows.length; i += 1) {
      var step = rows[i] || {};
      html += '<section class="wiki-step">' +
        '<div class="wiki-step__rail" aria-hidden="true">' +
        '<span class="wiki-step__number">' + String(i + 1) + '</span>' +
        '</div>' +
        '<div class="wiki-step__body">' +
        '<h3>' + escapeInlineHtmlText(readString(step.title, "Passo " + String(i + 1))) + '</h3>' +
        '<p>' + escapeInlineHtmlText(readString(step.body, "Descrizione del passaggio.")) + '</p>' +
        '</div>' +
        '</section>';
    }

    html += "</div>";
    return html;
  }

  function buildWikiExpandableHtml(title, body) {
    return '<details class="wiki-expandable">' +
      '<summary class="wiki-expandable__summary">' +
      '<span class="wiki-expandable__title">' + escapeInlineHtmlText(readString(title, "Titolo expandable")) + '</span>' +
      '<span class="wiki-expandable__chevron" aria-hidden="true"><i class="fa-solid fa-chevron-down"></i></span>' +
      '</summary>' +
      '<div class="wiki-expandable__content"><p>' + escapeInlineHtmlText(readString(body, "Contenuto nascosto espandibile.")) + '</p></div>' +
      '</details>';
  }

  function buildWikiColumnsHtml(columns) {
    var count = Math.max(2, Math.min(Number(columns) || 2, 3));
    var html = '<div class="wiki-columns wiki-columns--' + String(count) + '" data-wiki-columns="' + String(count) + '">';

    for (var i = 0; i < count; i += 1) {
      html += '<div class="wiki-column"><p>Contenuto colonna ' + String(i + 1) + '.</p></div>';
    }

    html += '</div>';
    return html;
  }

  function buildWikiTableHtml(rows, columns) {
    var rowCount = Math.max(1, Math.min(Number(rows) || 3, 12));
    var columnCount = Math.max(1, Math.min(Number(columns) || 3, 8));
    var html = '<table class="wiki-table"><thead><tr>';

    for (var c = 0; c < columnCount; c += 1) {
      html += '<th>Colonna ' + String(c + 1) + '</th>';
    }

    html += '</tr></thead><tbody>';

    for (var r = 0; r < rowCount; r += 1) {
      html += '<tr>';
      for (var cell = 0; cell < columnCount; cell += 1) {
        html += '<td>Dato</td>';
      }
      html += '</tr>';
    }

    html += '</tbody></table>';
    return html;
  }

  function buildWikiImageHtml(src, altText, layout, width) {
    var imageLayout = normalizeWikiImageLayout(layout);
    var imageWidth = normalizeWikiImageWidth(width, imageLayout);
    var safeSrc = escapeInlineHtmlText(src);
    var safeAlt = escapeInlineHtmlText(altText || "Immagine");
    var safeWidth = escapeInlineHtmlText(imageWidth);
    var className = imageLayout === "inline" ? "wiki-image wiki-image--inline" : "wiki-image wiki-image--full";
    var tagName = imageLayout === "inline" ? "span" : "figure";

    return "<" + tagName + " class=\"" + className + "\" contenteditable=\"false\" data-wiki-image-layout=\"" + imageLayout + "\" data-wiki-image-width=\"" + safeWidth + "\" style=\"--wiki-image-width: " + safeWidth + ";\"><img src=\"" + safeSrc + "\" alt=\"" + safeAlt + "\" data-wiki-image-width=\"" + safeWidth + "\"></" + tagName + ">";
  }

  function normalizeWikiImageLayout(value) {
    return readString(value, "full") === "inline" ? "inline" : "full";
  }

  function normalizeWikiImageWidthUnit(value) {
    return readString(value, "%") === "px" ? "px" : "%";
  }

  function normalizeWikiImageWidth(value, layout) {
    var raw = readString(value, "");
    var imageLayout = normalizeWikiImageLayout(layout);

    if (!raw) {
      return imageLayout === "inline" ? "320px" : "100%";
    }

    var match = raw.match(/^([0-9]+(?:\.[0-9]+)?)(px|%)?$/);
    if (!match) {
      return imageLayout === "inline" ? "320px" : "100%";
    }

    var amount = Number(match[1]);
    var unit = normalizeWikiImageWidthUnit(match[2] || "%");
    if (!Number.isFinite(amount) || amount <= 0) {
      return imageLayout === "inline" ? "320px" : "100%";
    }

    if (unit === "%") {
      amount = Math.max(1, Math.min(amount, 100));
    } else {
      amount = Math.max(24, Math.min(amount, 1800));
    }

    return String(Math.round(amount * 100) / 100) + unit;
  }

  function splitWikiImageWidth(width, layout) {
    var normalized = normalizeWikiImageWidth(width, layout);
    var match = normalized.match(/^([0-9]+(?:\.[0-9]+)?)(px|%)$/);
    return {
      value: match ? match[1] : layout === "inline" ? "320" : "100",
      unit: match ? match[2] : layout === "inline" ? "px" : "%",
    };
  }

  function readWikiColorClass(node) {
    if (!node || !node.classList) {
      return "wiki-color-sage";
    }

    for (var i = 0; i < node.classList.length; i += 1) {
      var value = String(node.classList[i] || "");
      if (value.indexOf("wiki-color-") === 0 && value !== "wiki-color") {
        return value;
      }
    }

    return "wiki-color-sage";
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
    closeTooltipEditor();

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
    var markdownImage = buildWikiImageHtml(item.publicUrl, altText, "full", "100%");

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

    if (
      isTruthyManageValue(player.can_manage_wiki) ||
      isTruthyManageValue(player.canManageWiki) ||
      isTruthyManageValue(player.can_manage_admin) ||
      isTruthyManageValue(player.canManageAdmin) ||
      isTruthyManageValue(player.can_manage) ||
      isTruthyManageValue(player.canManage) ||
      isTruthyManageValue(player.is_admin) ||
      isTruthyManageValue(player.isAdmin)
    ) {
      return true;
    }

    var role = readString(player.role, "").trim().toLowerCase();
    return role === "admin" || role === "gm";
  }

  function isTruthyManageValue(value) {
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

  function setEditorViewMode(mode) {
    var normalized = mode === "metadata" ? "metadata" : "editor";
    state.editorViewMode = normalized;

    if (!state.elements) {
      return;
    }

    if (state.elements.editorTabButtons && state.elements.editorTabButtons.length) {
      for (var i = 0; i < state.elements.editorTabButtons.length; i += 1) {
        var button = state.elements.editorTabButtons[i];
        var isActive = readString(button.getAttribute("data-docs-editor-tab"), "") === normalized;
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-selected", isActive ? "true" : "false");
        button.setAttribute("tabindex", isActive ? "0" : "-1");
      }
    }

    if (state.elements.editorPanes && state.elements.editorPanes.length) {
      for (var pIndex = 0; pIndex < state.elements.editorPanes.length; pIndex += 1) {
        var pane = state.elements.editorPanes[pIndex];
        var paneMode = readString(pane.getAttribute("data-docs-editor-pane"), "editor");
        pane.hidden = paneMode !== normalized;
      }
    }

    if (normalized !== "editor") {
      closeEditorMarkdownContextMenu();
      closeLinkEditor();
      closeInternalLinkPicker();
      closeColorPicker();
      closeTooltipEditor();
      closeEditorImagePicker();
      closeEditorBoxIconPicker();
      closeMediaLibraryPanel();
    }
  }

  function resetEditorViewMode() {
    setEditorViewMode("editor");
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

  function openEditorForSubpage(parentEntry) {
    if (!state.isManageUnlocked || !parentEntry || !state.elements || !state.elements.editorForm) {
      return;
    }

    setEditorMode("create");
    fillEditorFormDefaults();
    prefillEditorFormForSubpage(parentEntry);
    resetEditorImageUploadUi();
    setEditorStatus("", "");
    openEditorModal();
  }

  function openEditorForGroupPage(group) {
    if (!state.isManageUnlocked || !group || !state.elements || !state.elements.editorForm) {
      return;
    }

    setEditorMode("create");
    fillEditorFormDefaults();
    prefillEditorFormForGroupPage(group);
    resetEditorImageUploadUi();
    setEditorStatus("", "");
    openEditorModal();
  }

  function openEditorForCurrentEntry() {
    openEditorForEntry(state.currentEntry);
  }

  function openEditorForEntry(entry) {
    if (!state.isManageUnlocked || !entry || !state.elements || !state.elements.editorForm) {
      return;
    }

    setEditorMode("edit");
    fillEditorForm(entry);
    resetEditorImageUploadUi();
    setEditorStatus("", "");
    openEditorModal();
  }

  async function toggleCurrentEntryPublishState() {
    await togglePublishForEntry(state.currentEntry);
  }

  async function togglePublishForEntry(entry) {
    if (!state.isManageUnlocked || !entry || state.publishToggleBusy) {
      return;
    }

    var current = entry;
    var isCurrentEntry = !!(state.currentEntry && state.currentEntry.docKey === current.docKey);
    var currentDocKey = state.currentEntry ? state.currentEntry.docKey : "";
    var nextPublished = !(current.isPublished !== false);
    var confirmText = nextPublished
      ? "Vuoi pubblicare questa pagina?"
      : "Vuoi nascondere questa pagina dalla documentazione pubblica?";

    if (!window.confirm(confirmText)) {
      return;
    }

    var payload = buildPublishPayload(current, nextPublished);

    setPublishToggleBusyState(true);

    try {
      var result = await upsertWikiPage(payload);
      var savedDocKey = resolveSavedDocKey(payload, result);

      if (nextPublished) {
        await refreshDocsData(isCurrentEntry ? savedDocKey : currentDocKey || savedDocKey);
      } else if (isCurrentEntry) {
        await refreshDocsData("", {
          preferPublishedFallback: true,
          sectionSlug: current.sectionSlug,
          excludeDocKey: savedDocKey,
        });
      } else {
        await refreshDocsData(currentDocKey || "", {
          preferPublishedFallback: false,
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

  function buildPublishPayload(entry, isPublished) {
    return {
      section: readString(entry.sectionSlug, ""),
      slug: normalizeDocPath(readString(entry.rawSlug, entry.docKey || "")),
      title: readString(entry.title, "Documento"),
      nav_group: toNullableString(entry.navGroup),
      nav_group_order:
        Number.isFinite(entry.navGroupOrder) && entry.navGroupOrder !== Number.MAX_SAFE_INTEGER
          ? entry.navGroupOrder
          : 0,
      nav_group_icon: toNullableString(entry.navGroupIcon),
      nav_label: toNullableString(entry.navLabel),
      page_icon: toNullableString(entry.pageIcon),
      parent_slug: toNullablePath(entry.parentSlug),
      sort_order:
        Number.isFinite(entry.sortOrder) && entry.sortOrder !== Number.MAX_SAFE_INTEGER
          ? entry.sortOrder
          : 0,
      depth: Math.max(0, toDepth(entry.depth)),
      is_published: !!isPublished,
      excerpt: toNullableString(entry.excerpt),
      content_md: String(entry.contentMd || ""),
      previous_section: readString(entry.sectionSlug, ""),
      previous_slug: normalizeDocPath(readString(entry.rawSlug, entry.docKey || "")),
    };
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

    closeLinkEditor();
    closeInternalLinkPicker();
    closeEditorMarkdownContextMenu();
    closeEditorFormatMenu();
    closeMediaLibraryPanel();
    closeTooltipEditor();
    closeEditorImagePicker();
    closeEditorBoxPicker();
    closeEditorBoxIconPicker();
    closeDocsTreeContextMenu();
    closeWikiTooltip();
    resetEditorViewMode();
    setEditorSourceMode("visual", { skipSync: true });
    syncMarkdownToVisualEditor();

    state.elements.editorModal.hidden = false;
    state.isEditorOpen = true;
    document.body.classList.add("docs-editor-open");
    resetEditorHistory();

    state.elements.editorModal.classList.add("is-fresh");
    if (state.editorFreshTimer) {
      window.clearTimeout(state.editorFreshTimer);
      state.editorFreshTimer = 0;
    }

    state.editorFreshTimer = window.setTimeout(function clearFreshEditorState() {
      if (!state.elements || !state.elements.editorModal) {
        return;
      }

      state.elements.editorModal.classList.remove("is-fresh");
      state.editorFreshTimer = 0;
    }, 280);

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

    closeLinkEditor();
    closeInternalLinkPicker();
    closeEditorMarkdownContextMenu();
    closeEditorFormatMenu();
    closeMediaLibraryPanel();
    closeColorPicker();
    closeTooltipEditor();
    closeEditorImagePicker();
    closeEditorBoxPicker();
    closeEditorBoxIconPicker();
    closeVisualBlockControls();
    closeVisualTableControls();
    closeEditorTableMenu();
    closeEditorColumnsPanel();
    clearVisualBlockDragState();

    if (state.editorFreshTimer) {
      window.clearTimeout(state.editorFreshTimer);
      state.editorFreshTimer = 0;
    }

    state.elements.editorModal.classList.remove("is-fresh");
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
    syncMarkdownToVisualEditor();

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
    setFormFieldValue(form, "content_md", "<h2>Nuova pagina</h2><p>Scrivi qui il contenuto della nuova pagina.</p>");
    syncMarkdownToVisualEditor();

    populateParentSlugOptions("");
  }

  function prefillEditorFormForSubpage(parentEntry) {
    if (!state.elements || !state.elements.editorForm || !parentEntry) {
      return;
    }

    var form = state.elements.editorForm;
    var parentDepth = toDepth(parentEntry.depth);

    state.editorSlugManual = false;

    setFormFieldValue(form, "section", readString(parentEntry.sectionSlug, "lore"));
    setFormFieldValue(form, "slug", "");
    setFormFieldValue(form, "title", "");
    setFormFieldValue(form, "nav_group", readString(parentEntry.navGroup, ""));
    setFormFieldValue(
      form,
      "nav_group_order",
      Number.isFinite(parentEntry.navGroupOrder) && parentEntry.navGroupOrder !== Number.MAX_SAFE_INTEGER
        ? String(parentEntry.navGroupOrder)
        : "0"
    );
    setFormFieldValue(form, "nav_group_icon", readString(parentEntry.navGroupIcon, ""));
    setFormFieldValue(form, "parent_slug", readString(parentEntry.docKey, ""));
    setFormFieldValue(form, "depth", String(parentDepth + 1));
    setFormFieldValue(form, "sort_order", "0");

    populateParentSlugOptions(readString(parentEntry.docKey, ""));
    syncMarkdownToVisualEditor();
  }

  function prefillEditorFormForGroupPage(group) {
    if (!state.elements || !state.elements.editorForm || !group) {
      return;
    }

    var form = state.elements.editorForm;
    var groupMeta = resolveDocsTreeGroupEditorDefaults(group);

    state.editorSlugManual = false;

    setFormFieldValue(form, "section", groupMeta.section || "lore");
    setFormFieldValue(form, "slug", "");
    setFormFieldValue(form, "title", "");
    setFormFieldValue(form, "nav_group", groupMeta.navGroup);
    setFormFieldValue(form, "nav_group_order", String(groupMeta.navGroupOrder));
    setFormFieldValue(form, "nav_group_icon", readString(groupMeta.navGroupIcon, ""));
    setFormFieldValue(form, "parent_slug", "");
    setFormFieldValue(form, "depth", "0");
    setFormFieldValue(form, "sort_order", "0");

    populateParentSlugOptions("");
    syncMarkdownToVisualEditor();
  }

  function resolveDocsTreeGroupEditorDefaults(group) {
    var section = cleanSegment(readString(group && group.section, ""));
    var groupKey = toNavGroupKey(group && group.navGroup);
    var sourcePages = state.manageIndex && Array.isArray(state.manageIndex.pages) ? state.manageIndex.pages : [];
    var fallback = {
      section: section,
      navGroup: readString(group && group.navGroup, ""),
      navGroupOrder: 0,
      navGroupIcon: readString(group && group.icon, ""),
    };

    for (var i = 0; i < sourcePages.length; i += 1) {
      var page = sourcePages[i];
      if (!page || page.sectionSlug !== section || toNavGroupKey(page.navGroup) !== groupKey) {
        continue;
      }

      return {
        section: section,
        navGroup: readString(page.navGroup, fallback.navGroup),
        navGroupOrder:
          Number.isFinite(page.navGroupOrder) && page.navGroupOrder !== Number.MAX_SAFE_INTEGER
            ? page.navGroupOrder
            : fallback.navGroupOrder,
        navGroupIcon: readString(page.navGroupIcon, fallback.navGroupIcon),
      };
    }

    return fallback;
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

    if (name === "content_md") {
      setEditorMarkdownSource(value);
    }
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
      closeEditorMarkdownContextMenu();
      closeLinkEditor();
      closeInternalLinkPicker();
      closeTooltipEditor();
      closeEditorImagePicker();
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

    if (state.elements.editorTabButtons && state.elements.editorTabButtons.length) {
      for (var tbi = 0; tbi < state.elements.editorTabButtons.length; tbi += 1) {
        state.elements.editorTabButtons[tbi].disabled = shouldDisable;
      }
    }

    if (state.elements.editorMarkdownToolbar) {
      var toolbarButtons = state.elements.editorMarkdownToolbar.querySelectorAll("button[data-md-action]");
      for (var b = 0; b < toolbarButtons.length; b += 1) {
        toolbarButtons[b].disabled = shouldDisable;
      }

      var toolbarSelects = state.elements.editorMarkdownToolbar.querySelectorAll("select[data-md-block-style]");
      for (var selectIndex = 0; selectIndex < toolbarSelects.length; selectIndex += 1) {
        toolbarSelects[selectIndex].disabled = shouldDisable;
      }

      var toolbarFormatButtons = state.elements.editorMarkdownToolbar.querySelectorAll("button[data-md-format-trigger], button[data-md-format-action]");
      for (var formatButtonIndex = 0; formatButtonIndex < toolbarFormatButtons.length; formatButtonIndex += 1) {
        toolbarFormatButtons[formatButtonIndex].disabled = shouldDisable;
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
      var markdownImage = buildWikiImageHtml(publicUrl, altText, "full", "100%");

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
    if (isVisualEditorMode()) {
      if (applyVisualToolbarAction(action)) {
        return;
      }

      syncVisualEditorToMarkdown();
      setEditorSourceMode("html", { skipSync: true });
    }

    var textarea = getEditorMarkdownTextarea();
    if (!textarea || !action) {
      return;
    }

    if (action === "paragraph") {
      wrapHtmlSelection(textarea, '<div class="wiki-paragraph">', "</div>", "Testo base");
      return;
    }

    if (action === "h1") {
      wrapHtmlSelection(textarea, "<h1>", "</h1>", "Titolo");
      return;
    }

    if (action === "h2") {
      wrapHtmlSelection(textarea, "<h2>", "</h2>", "Titolo");
      return;
    }

    if (action === "h3") {
      wrapHtmlSelection(textarea, "<h3>", "</h3>", "Titolo");
      return;
    }

    if (action === "bold") {
      wrapHtmlSelection(textarea, "<strong>", "</strong>", "testo");
      return;
    }

    if (action === "italic") {
      wrapHtmlSelection(textarea, "<em>", "</em>", "testo");
      return;
    }

    if (action === "underline") {
      wrapHtmlSelection(textarea, "<u>", "</u>", "testo");
      return;
    }

    if (action === "ul") {
      wrapHtmlSelection(textarea, "<ul><li>", "</li></ul>", "voce elenco");
      return;
    }

    if (action === "ol") {
      wrapHtmlSelection(textarea, "<ol><li>", "</li></ol>", "primo elemento");
      return;
    }

    if (action === "checklist") {
      insertBlockAtCursor(textarea, buildWikiChecklistHtml(["Prima voce", "Seconda voce", "Terza voce"]));
      return;
    }

    if (action === "quote") {
      wrapHtmlSelection(textarea, "<blockquote>", "</blockquote>", "citazione");
      return;
    }

    if (action === "box") {
      openEditorBoxPicker(textarea);
      return;
    }

    if (action === "stepper") {
      insertBlockAtCursor(textarea, buildWikiStepperHtml([
        { title: "Primo passo", body: "Descrivi cosa fare in questo passaggio." },
        { title: "Secondo passo", body: "Aggiungi istruzioni, note o requisiti." },
        { title: "Terzo passo", body: "Chiudi il processo con il risultato atteso." }
      ]));
      return;
    }

    if (action === "expandable") {
      insertBlockAtCursor(textarea, buildWikiExpandableHtml("Titolo expandable", "Scrivi qui il contenuto nascosto."));
      return;
    }

    if (action === "columns") {
      insertBlockAtCursor(textarea, buildWikiColumnsHtml(2));
      return;
    }

    if (action === "table") {
      insertBlockAtCursor(textarea, buildWikiTableHtml(3, 3));
      return;
    }

    if (action === "divider") {
      insertBlockAtCursor(textarea, "<hr>");
      return;
    }

    if (action === "link") {
      toggleLinkEditor(textarea);
      return;
    }

    if (action === "internal-link") {
      toggleInternalLinkPicker(textarea);
      return;
    }

    if (action === "tooltip") {
      applyTooltipAction(textarea);
      return;
    }

    if (action === "image") {
      toggleEditorImagePicker(textarea);
      return;
    }

    if (action === "text-color") {
      toggleColorPicker(textarea);
      return;
    }

    if (action === "inline-code") {
      wrapHtmlSelection(textarea, "<code>", "</code>", "codice");
      return;
    }

    if (action === "code-block") {
      applyCodeBlockAction(textarea);
    }
  }

  function applyVisualToolbarAction(action) {
    if (!state.elements || !state.elements.editorVisualEditor || !action) {
      return false;
    }

    var editor = state.elements.editorVisualEditor;
    try {
      editor.focus({ preventScroll: true });
    } catch (_error) {
      editor.focus();
    }

    if (action === "link") {
      openVisualLinkEditor();
      return true;
    }

    if (action === "tooltip") {
      openVisualTooltipEditor();
      return true;
    }

    if (action === "internal-link") {
      openVisualInternalLinkPicker();
      return true;
    }

    if (action === "image") {
      openVisualImagePicker();
      return true;
    }

    if (action === "text-color") {
      openVisualColorPicker();
      return true;
    }

    if (action === "paragraph") {
      rememberVisualEditorHistoryBeforeProgrammaticChange();
      applyVisualParagraphFormat();
      return true;
    }

    if (action === "bold") {
      rememberVisualEditorHistoryBeforeProgrammaticChange();
      document.execCommand("bold", false, null);
      return true;
    }

    if (action === "italic") {
      rememberVisualEditorHistoryBeforeProgrammaticChange();
      document.execCommand("italic", false, null);
      return true;
    }

    if (action === "underline") {
      rememberVisualEditorHistoryBeforeProgrammaticChange();
      document.execCommand("underline", false, null);
      return true;
    }

    if (action === "ul") {
      applyVisualListFormat(false);
      return true;
    }

    if (action === "ol") {
      applyVisualListFormat(true);
      return true;
    }

    if (action === "checklist") {
      insertVisualHtmlBlock(buildWikiChecklistHtml(["Prima voce", "Seconda voce", "Terza voce"]));
      return true;
    }

    if (action === "h1") {
      rememberVisualEditorHistoryBeforeProgrammaticChange();
      document.execCommand("formatBlock", false, "h1");
      return true;
    }

    if (action === "h2") {
      rememberVisualEditorHistoryBeforeProgrammaticChange();
      document.execCommand("formatBlock", false, "h2");
      return true;
    }

    if (action === "h3") {
      rememberVisualEditorHistoryBeforeProgrammaticChange();
      document.execCommand("formatBlock", false, "h3");
      return true;
    }

    if (action === "quote") {
      rememberVisualEditorHistoryBeforeProgrammaticChange();
      document.execCommand("formatBlock", false, "blockquote");
      return true;
    }

    if (action === "divider") {
      rememberVisualEditorHistoryBeforeProgrammaticChange();
      document.execCommand("insertHTML", false, "<hr>");
      return true;
    }

    if (action === "inline-code") {
      rememberVisualEditorHistoryBeforeProgrammaticChange();
      document.execCommand("insertHTML", false, "<code>codice</code>");
      return true;
    }

    if (action === "box") {
      openVisualBoxPicker();
      return true;
    }

    if (action === "stepper") {
      insertVisualHtmlBlock(buildWikiStepperHtml([
        { title: "Primo passo", body: "Descrivi cosa fare in questo passaggio." },
        { title: "Secondo passo", body: "Aggiungi istruzioni, note o requisiti." },
        { title: "Terzo passo", body: "Chiudi il processo con il risultato atteso." }
      ]));
      return true;
    }

    if (action === "expandable") {
      insertVisualHtmlBlock(buildWikiExpandableHtml("Titolo expandable", "Scrivi qui il contenuto nascosto."));
      return true;
    }

    if (action === "columns") {
      insertVisualHtmlBlock(buildWikiColumnsHtml(2));
      return true;
    }

    if (action === "table") {
      insertVisualHtmlBlock(buildWikiTableHtml(3, 3));
      return true;
    }

    return false;
  }

  function applyVisualListFormat(isOrdered) {
    var editor = state.elements && state.elements.editorVisualEditor;
    if (!editor || !window.getSelection) {
      return;
    }

    var range = getCurrentVisualRange();
    if (!range || !editor.contains(range.commonAncestorContainer)) {
      rememberVisualEditorHistoryBeforeProgrammaticChange();
      document.execCommand(isOrdered ? "insertOrderedList" : "insertUnorderedList", false, null);
      return;
    }

    var boxContent = findVisualWikiBoxContentFromRange(range);
    if (!boxContent) {
      rememberVisualEditorHistoryBeforeProgrammaticChange();
      document.execCommand(isOrdered ? "insertOrderedList" : "insertUnorderedList", false, null);
      return;
    }

    rememberVisualEditorHistoryBeforeProgrammaticChange();

    var currentBlock = getClosestVisualBlockWithin(boxContent, range.commonAncestorContainer);
    var selectedText = readString(range.toString(), "");
    var lineBreakPattern = new RegExp(String.fromCharCode(13) + "?" + String.fromCharCode(10));
    var lines = selectedText
      ? selectedText.split(lineBreakPattern).map(function mapSelectedLine(line) {
        return readString(line, "");
      }).filter(Boolean)
      : [];

    if (!lines.length && currentBlock && !currentBlock.classList.contains("wiki-box__title")) {
      lines = readString(currentBlock.textContent, "voce elenco").split(lineBreakPattern).map(function mapBlockLine(line) {
        return readString(line, "");
      }).filter(Boolean);
    }

    if (!lines.length) {
      lines = [isOrdered ? "primo elemento" : "voce elenco"];
    }

    var list = document.createElement(isOrdered ? "ol" : "ul");
    for (var i = 0; i < lines.length; i += 1) {
      var item = document.createElement("li");
      item.textContent = lines[i];
      list.appendChild(item);
    }

    if (currentBlock && currentBlock.parentNode === boxContent && !currentBlock.classList.contains("wiki-box__title")) {
      currentBlock.parentNode.replaceChild(list, currentBlock);
    } else {
      insertNodeInVisualContainerAtRange(boxContent, list, range);
    }

    placeCaretInsideElement(list.querySelector("li") || list, false);
    prepareVisualEditorDomForEditing(editor);
  }

  function applyVisualParagraphFormat() {
    var editor = state.elements && state.elements.editorVisualEditor;
    if (!editor || !window.getSelection) {
      return;
    }

    var selection = window.getSelection();
    var range = selection && selection.rangeCount ? selection.getRangeAt(0) : null;
    var block = range && range.commonAncestorContainer ? range.commonAncestorContainer : null;

    if (block && block.nodeType === Node.TEXT_NODE) {
      block = block.parentNode;
    }

    if (block && block.closest) {
      block = block.closest("h1, h2, h3, p, div, blockquote, li");
    }

    if (!block || !editor.contains(block) || block === editor) {
      document.execCommand("formatBlock", false, "div");
      block = getCurrentVisualRangeBlock();
    }

    if (!block || !editor.contains(block) || block === editor) {
      return;
    }

    var paragraph = document.createElement("div");
    paragraph.className = "wiki-paragraph";
    paragraph.innerHTML = block.innerHTML || "<br>";
    block.parentNode.replaceChild(paragraph, block);

    var nextRange = document.createRange();
    nextRange.selectNodeContents(paragraph);
    nextRange.collapse(false);
    selection.removeAllRanges();
    selection.addRange(nextRange);
  }

  function getCurrentVisualRangeBlock() {
    var range = getCurrentVisualRange();
    var node = range && range.commonAncestorContainer ? range.commonAncestorContainer : null;
    if (node && node.nodeType === Node.TEXT_NODE) {
      node = node.parentNode;
    }
    return node && node.closest ? node.closest("h1, h2, h3, p, div, blockquote, li") : null;
  }

  function getVisualEditorBlockFromTarget(target) {
    var editor = state.elements && state.elements.editorVisualEditor;
    if (!editor || !target || !target.closest) {
      return null;
    }

    if (!editor.contains(target)) {
      return null;
    }

    var block = target.closest("h1, h2, h3, p, ul, ol, blockquote, pre, table, details, hr, .wiki-box, .wiki-image--full, .wiki-stepper, .wiki-checklist, .wiki-expandable, .wiki-columns");
    if (!block || block === editor || !editor.contains(block)) {
      return null;
    }

    while (block.parentElement && block.parentElement !== editor) {
      block = block.parentElement;
    }

    if (!block || block === editor || !editor.contains(block)) {
      return null;
    }

    return block;
  }

  function ensureVisualBlockControls() {
    if (state.visualBlockControls && state.visualBlockControls.root && state.visualBlockControls.root.isConnected) {
      return state.visualBlockControls;
    }

    var root = document.createElement("div");
    root.className = "docs-visual-block-controls";
    root.setAttribute("data-docs-visual-block-controls", "");
    root.hidden = true;

    var addButton = document.createElement("button");
    addButton.type = "button";
    addButton.className = "docs-visual-block-controls__btn";
    addButton.setAttribute("aria-label", "Inserisci blocco");
    addButton.setAttribute("title", "Inserisci blocco");
    addButton.setAttribute("data-tooltip", "Inserisci blocco");
    addButton.innerHTML = '<i class="fa-solid fa-plus" aria-hidden="true"></i>';

    var dragHandle = document.createElement("button");
    dragHandle.type = "button";
    dragHandle.className = "docs-visual-block-controls__btn docs-visual-block-controls__handle";
    dragHandle.setAttribute("aria-label", "Sposta blocco");
    dragHandle.setAttribute("title", "Sposta blocco");
    dragHandle.setAttribute("data-tooltip", "Sposta blocco");
    dragHandle.setAttribute("draggable", "true");
    dragHandle.innerHTML = '<i class="fa-solid fa-grip-vertical" aria-hidden="true"></i>';

    var deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "docs-visual-block-controls__btn docs-visual-block-controls__delete";
    deleteButton.setAttribute("aria-label", "Elimina blocco");
    deleteButton.setAttribute("title", "Elimina blocco");
    deleteButton.setAttribute("data-tooltip", "Elimina blocco");
    deleteButton.innerHTML = '<i class="fa-solid fa-trash" aria-hidden="true"></i>';

    root.appendChild(addButton);
    root.appendChild(dragHandle);
    root.appendChild(deleteButton);
    document.body.appendChild(root);

    root.addEventListener("mouseenter", function onControlsEnter() {
      root.setAttribute("data-hover", "true");
    });

    root.addEventListener("mouseleave", function onControlsLeave() {
      root.removeAttribute("data-hover");
      scheduleVisualBlockControlsClose();
    });

    addButton.addEventListener("mousedown", function onAddMouseDown(event) {
      event.preventDefault();
    });

    addButton.addEventListener("click", function onAddClick(event) {
      event.preventDefault();
      event.stopPropagation();
      openVisualBlockInsertMenu();
    });

    deleteButton.addEventListener("mousedown", function onDeleteMouseDown(event) {
      event.preventDefault();
    });

    deleteButton.addEventListener("click", function onDeleteClick(event) {
      event.preventDefault();
      event.stopPropagation();
      deleteVisualBlockTarget();
    });

    dragHandle.addEventListener("dragstart", function onHandleDragStart(event) {
      startVisualBlockDrag(event);
    });

    dragHandle.addEventListener("dragend", function onHandleDragEnd() {
      clearVisualBlockDragState();
    });

    state.visualBlockControls = {
      root: root,
      addButton: addButton,
      dragHandle: dragHandle,
      deleteButton: deleteButton,
    };

    return state.visualBlockControls;
  }

  function handleVisualEditorMouseMove(event) {
    if (!isVisualEditorMode()) {
      return;
    }

    var block = getVisualEditorBlockFromTarget(event.target);
    if (!block) {
      scheduleVisualBlockControlsClose();
      return;
    }

    showVisualBlockControls(block);
  }

  function showVisualBlockControls(block) {
    if (!block || !state.elements || !state.elements.editorVisualEditor) {
      return;
    }

    var controls = ensureVisualBlockControls();
    if (!controls || !controls.root) {
      return;
    }

    if (state.visualBlockCloseTimer) {
      window.clearTimeout(state.visualBlockCloseTimer);
      state.visualBlockCloseTimer = 0;
    }

    state.visualBlockTarget = block;
    controls.root.hidden = false;

    if (controls.deleteButton) {
      controls.deleteButton.hidden = !isDeletableVisualBlock(block);
    }

    var rect = block.getBoundingClientRect();
    var left = Math.max(8, rect.left - 42);
    var top = Math.max(8, rect.top + 2);

    controls.root.style.left = left + "px";
    controls.root.style.top = top + "px";
  }

  function scheduleVisualBlockControlsClose() {
    if (state.visualBlockCloseTimer) {
      window.clearTimeout(state.visualBlockCloseTimer);
    }

    state.visualBlockCloseTimer = window.setTimeout(function closeVisualBlockControlsLater() {
      state.visualBlockCloseTimer = 0;
      var controls = state.visualBlockControls;
      if (!controls || !controls.root || controls.root.getAttribute("data-hover") === "true") {
        return;
      }

      if (state.visualBlockDrag) {
        return;
      }

      controls.root.hidden = true;
      state.visualBlockTarget = null;
    }, 220);
  }

  function closeVisualBlockControls() {
    if (state.visualBlockCloseTimer) {
      window.clearTimeout(state.visualBlockCloseTimer);
      state.visualBlockCloseTimer = 0;
    }

    if (state.visualBlockControls && state.visualBlockControls.root) {
      state.visualBlockControls.root.hidden = true;
    }

    state.visualBlockTarget = null;
  }

  function isDeletableVisualBlock(block) {
    if (!block || !block.classList) {
      return false;
    }

    var tag = String(block.tagName || "").toLowerCase();
    return (
      block.classList.contains("wiki-box") ||
      block.classList.contains("wiki-stepper") ||
      block.classList.contains("wiki-checklist") ||
      block.classList.contains("wiki-image--full") ||
      block.classList.contains("wiki-expandable") ||
      block.classList.contains("wiki-columns") ||
      tag === "table" ||
      tag === "details" ||
      tag === "blockquote" ||
      tag === "pre"
    );
  }

  function ensureVisualEditorStepperAddButtons(root) {
    if (!root || !root.querySelectorAll) {
      return;
    }

    var steppers = root.querySelectorAll(".wiki-stepper");
    for (var i = 0; i < steppers.length; i += 1) {
      var stepper = steppers[i];
      var addStep = stepper.querySelector("[data-wiki-stepper-add]");

      if (!addStep) {
        addStep = buildVisualStepperAddButton();
        stepper.appendChild(addStep);
      } else if (addStep.parentNode !== stepper) {
        stepper.appendChild(addStep);
      } else if (addStep.nextElementSibling) {
        stepper.appendChild(addStep);
      }

      addStep.setAttribute("contenteditable", "false");
      renumberVisualStepper(stepper);
    }
  }

  function buildVisualStepperAddButton() {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "wiki-step wiki-step--add";
    button.setAttribute("data-wiki-stepper-add", "");
    button.setAttribute("contenteditable", "false");
    button.setAttribute("aria-label", "Aggiungi step");
    button.setAttribute("title", "Aggiungi step");

    button.innerHTML =
      '<span class="wiki-step__rail" aria-hidden="true">' +
      '<span class="wiki-step__number wiki-step__number--add"><i class="fa-solid fa-plus" aria-hidden="true"></i></span>' +
      '</span>' +
      '<span class="wiki-step__body wiki-step__body--add" aria-hidden="true"></span>';

    return button;
  }

  function getVisualStepperSteps(stepper) {
    if (!stepper || !stepper.children) {
      return [];
    }

    var steps = [];
    for (var i = 0; i < stepper.children.length; i += 1) {
      var child = stepper.children[i];
      if (!child || !child.classList || !child.classList.contains("wiki-step") || child.hasAttribute("data-wiki-stepper-add")) {
        continue;
      }

      steps.push(child);
    }

    return steps;
  }

  function renumberVisualStepper(stepper) {
    var steps = getVisualStepperSteps(stepper);
    for (var i = 0; i < steps.length; i += 1) {
      var number = steps[i].querySelector(".wiki-step__number");
      if (number) {
        number.textContent = String(i + 1);
      }
    }
  }

  function buildVisualStepperStep(stepNumber) {
    var step = document.createElement("section");
    step.className = "wiki-step";
    step.innerHTML =
      '<div class="wiki-step__rail" aria-hidden="true">' +
      '<span class="wiki-step__number">' + String(stepNumber) + '</span>' +
      '</div>' +
      '<div class="wiki-step__body">' +
      '<h3>Passo ' + String(stepNumber) + '</h3>' +
      '<p>Descrizione del passaggio.</p>' +
      '</div>';
    return step;
  }

  function handleVisualStepperClick(event) {
    if (!isVisualEditorMode() || !event || !event.target || !event.target.closest) {
      return;
    }

    var addStep = event.target.closest("[data-wiki-stepper-add]");
    if (!addStep || !state.elements || !state.elements.editorVisualEditor.contains(addStep)) {
      return;
    }

    var stepper = addStep.closest(".wiki-stepper");
    if (!stepper) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    rememberVisualEditorHistoryBeforeProgrammaticChange();

    var nextNumber = getVisualStepperSteps(stepper).length + 1;
    var step = buildVisualStepperStep(nextNumber);
    stepper.insertBefore(step, addStep);
    renumberVisualStepper(stepper);
    prepareVisualEditorDomForEditing(state.elements.editorVisualEditor);

    var title = step.querySelector("h3");
    if (title && window.getSelection) {
      var range = document.createRange();
      range.selectNodeContents(title);
      range.collapse(false);
      var selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    }

    try {
      state.elements.editorVisualEditor.focus({ preventScroll: true });
    } catch (_error) {
      state.elements.editorVisualEditor.focus();
    }
  }

  function getVisualColumnsFromTarget(target) {
    var editor = state.elements && state.elements.editorVisualEditor;
    if (!editor || !target || !target.closest) {
      return null;
    }

    var columns = target.closest(".wiki-columns");
    return columns && editor.contains(columns) ? columns : null;
  }

  function handleVisualColumnsClick(event) {
    if (!isVisualEditorMode()) {
      return;
    }

    var columns = getVisualColumnsFromTarget(event && event.target);
    if (!columns) {
      return;
    }

    state.editorColumnsContext = { columns: columns };
    openEditorColumnsPanel(columns);
  }

  function ensureEditorColumnsPanel() {
    if (state.editorColumnsPanel && state.editorColumnsPanel.isConnected) {
      return state.editorColumnsPanel;
    }

    var panel = document.createElement("div");
    panel.className = "docs-editor-md-context docs-columns-panel";
    panel.setAttribute("data-docs-columns-panel", "");
    panel.setAttribute("role", "menu");
    panel.setAttribute("aria-label", "Dimensioni colonne");
    panel.hidden = true;

    panel.innerHTML =
      '<p class="docs-columns-panel__label">Larghezza colonne</p>' +
      '<div class="docs-columns-panel__presets">' +
      '<button type="button" class="docs-editor-md-context__action" data-columns-layout="50,50"><i class="fa-solid fa-table-columns" aria-hidden="true"></i><span>50 / 50</span></button>' +
      '<button type="button" class="docs-editor-md-context__action" data-columns-layout="33,67"><i class="fa-solid fa-table-columns" aria-hidden="true"></i><span>33 / 67</span></button>' +
      '<button type="button" class="docs-editor-md-context__action" data-columns-layout="67,33"><i class="fa-solid fa-table-columns" aria-hidden="true"></i><span>67 / 33</span></button>' +
      '<button type="button" class="docs-editor-md-context__action" data-columns-layout="33,34,33"><i class="fa-solid fa-table-columns" aria-hidden="true"></i><span>33 / 34 / 33</span></button>' +
      '<button type="button" class="docs-editor-md-context__action" data-columns-layout="25,50,25"><i class="fa-solid fa-table-columns" aria-hidden="true"></i><span>25 / 50 / 25</span></button>' +
      '</div>' +
      '<label class="docs-columns-panel__custom"><span>Custom %</span><input type="text" data-columns-custom placeholder="es. 40,60 oppure 25,50,25"></label>' +
      '<button type="button" class="docs-editor-md-context__action docs-columns-panel__apply" data-columns-apply><i class="fa-solid fa-check" aria-hidden="true"></i><span>Applica</span></button>';

    panel.addEventListener("mousedown", function onColumnsPanelMouseDown(event) {
      if (event.target && event.target.closest && event.target.closest("input")) {
        return;
      }
      event.preventDefault();
    });

    panel.addEventListener("click", function onColumnsPanelClick(event) {
      var preset = event.target.closest("button[data-columns-layout]");
      if (preset) {
        event.preventDefault();
        event.stopPropagation();
        applyVisualColumnsWidths(preset.getAttribute("data-columns-layout"));
        return;
      }

      var apply = event.target.closest("button[data-columns-apply]");
      if (apply) {
        event.preventDefault();
        event.stopPropagation();
        var input = panel.querySelector("[data-columns-custom]");
        applyVisualColumnsWidths(input ? input.value : "");
      }
    });

    document.body.appendChild(panel);
    state.editorColumnsPanel = panel;
    return panel;
  }

  function isEditorColumnsPanelOpen() {
    return !!(state.editorColumnsPanel && !state.editorColumnsPanel.hasAttribute("hidden"));
  }

  function isEventInsideEditorColumnsUi(target) {
    if (!target) {
      return false;
    }

    if (state.editorColumnsPanel && state.editorColumnsPanel.contains(target)) {
      return true;
    }

    if (target.closest && target.closest(".wiki-columns")) {
      return true;
    }

    return false;
  }

  function openEditorColumnsPanel(columns) {
    var panel = ensureEditorColumnsPanel();
    if (!panel || !columns) {
      return;
    }

    var input = panel.querySelector("[data-columns-custom]");
    if (input) {
      input.value = readString(columns.getAttribute("data-wiki-column-widths"), "");
    }

    panel.hidden = false;
    var rect = columns.getBoundingClientRect();
    positionEditorPopoverAtPoint(panel, { x: rect.right, y: rect.top + 18 });
  }

  function closeEditorColumnsPanel() {
    if (!state.editorColumnsPanel) {
      return;
    }

    state.editorColumnsPanel.hidden = true;
    resetEditorPopoverPlacement(state.editorColumnsPanel);
    state.editorColumnsContext = null;
  }

  function parseColumnsWidthList(value) {
    var parts = readString(value, "").split(",");
    var widths = [];
    var total = 0;

    for (var i = 0; i < parts.length; i += 1) {
      var parsed = Number(String(parts[i] || "").trim());
      if (!Number.isFinite(parsed) || parsed <= 0) {
        continue;
      }

      parsed = Math.max(5, Math.min(parsed, 95));
      widths.push(Math.round(parsed * 100) / 100);
      total += parsed;
    }

    if (widths.length < 2 || widths.length > 3 || total <= 0) {
      return [];
    }

    var normalized = [];
    var normalizedTotal = 0;
    for (var w = 0; w < widths.length; w += 1) {
      var valuePercent = Math.round((widths[w] / total) * 10000) / 100;
      normalized.push(valuePercent);
      normalizedTotal += valuePercent;
    }

    if (normalized.length) {
      normalized[normalized.length - 1] = Math.round((normalized[normalized.length - 1] + (100 - normalizedTotal)) * 100) / 100;
    }

    return normalized;
  }

  function applyVisualColumnsWidths(value) {
    var context = state.editorColumnsContext || {};
    var columns = context.columns;
    if (!columns || !columns.isConnected) {
      closeEditorColumnsPanel();
      return;
    }

    var widths = parseColumnsWidthList(value);
    if (!widths.length) {
      return;
    }

    rememberVisualEditorHistoryBeforeProgrammaticChange();

    var currentColumns = Array.prototype.slice.call(columns.querySelectorAll(":scope > .wiki-column"));
    var targetCount = widths.length;

    while (currentColumns.length < targetCount) {
      var newColumn = document.createElement("div");
      newColumn.className = "wiki-column";
      newColumn.innerHTML = "<p>Nuova colonna.</p>";
      columns.appendChild(newColumn);
      currentColumns.push(newColumn);
    }

    while (currentColumns.length > targetCount && currentColumns.length > 1) {
      currentColumns.pop().remove();
    }

    columns.classList.remove("wiki-columns--2", "wiki-columns--3");
    columns.classList.add("wiki-columns--" + String(targetCount));
    columns.setAttribute("data-wiki-columns", String(targetCount));
    columns.setAttribute("data-wiki-column-widths", widths.join(","));
    columns.style.gridTemplateColumns = widths.map(function mapColumnWidth(width) {
      return String(width) + "%";
    }).join(" ");

    closeEditorColumnsPanel();
  }

  function getVisualTableCellFromTarget(target) {
    var editor = state.elements && state.elements.editorVisualEditor;
    if (!editor || !target || !target.closest) {
      return null;
    }

    var cell = target.closest("th, td");
    if (!cell || !editor.contains(cell)) {
      return null;
    }

    var table = cell.closest("table");
    return table && editor.contains(table) ? cell : null;
  }

  function readVisualTableContextFromCell(cell) {
    if (!cell) {
      return null;
    }

    var table = cell.closest("table");
    var row = cell.closest("tr");
    if (!table || !row) {
      return null;
    }

    var rows = getVisualTableRows(table);
    var cells = getVisualTableRowCells(row);
    var rowIndex = rows.indexOf(row);
    var columnIndex = cells.indexOf(cell);

    if (rowIndex < 0 || columnIndex < 0) {
      return null;
    }

    return {
      table: table,
      row: row,
      cell: cell,
      rowIndex: rowIndex,
      columnIndex: columnIndex,
    };
  }

  function getVisualTableRows(table) {
    if (!table) {
      return [];
    }

    return Array.prototype.slice.call(table.querySelectorAll("tr"));
  }

  function getVisualTableRowCells(row) {
    if (!row) {
      return [];
    }

    return Array.prototype.slice.call(row.children).filter(function filterTableCells(cell) {
      var tag = String(cell.tagName || "").toLowerCase();
      return tag === "td" || tag === "th";
    });
  }

  function getVisualTableColumnCount(table) {
    var rows = getVisualTableRows(table);
    var max = 0;
    for (var i = 0; i < rows.length; i += 1) {
      max = Math.max(max, getVisualTableRowCells(rows[i]).length);
    }

    return max;
  }

  function ensureEditorTableControls() {
    if (state.editorTableControls && state.editorTableControls.root && state.editorTableControls.root.isConnected) {
      return state.editorTableControls;
    }

    var root = document.createElement("div");
    root.className = "docs-table-controls";
    root.setAttribute("data-docs-table-controls", "");
    root.hidden = true;

    var menuButton = document.createElement("button");
    menuButton.type = "button";
    menuButton.className = "docs-table-controls__cell-menu";
    menuButton.setAttribute("aria-label", "Opzioni cella");
    menuButton.setAttribute("title", "Opzioni cella");
    menuButton.setAttribute("data-tooltip", "Opzioni cella");
    menuButton.innerHTML = '<i class="fa-solid fa-ellipsis-vertical" aria-hidden="true"></i>';

    var addRowButton = document.createElement("button");
    addRowButton.type = "button";
    addRowButton.className = "docs-table-controls__add docs-table-controls__add--row";
    addRowButton.setAttribute("aria-label", "Aggiungi riga");
    addRowButton.setAttribute("title", "Aggiungi riga");
    addRowButton.innerHTML = '<i class="fa-solid fa-plus" aria-hidden="true"></i>';

    var addColumnButton = document.createElement("button");
    addColumnButton.type = "button";
    addColumnButton.className = "docs-table-controls__add docs-table-controls__add--column";
    addColumnButton.setAttribute("aria-label", "Aggiungi colonna");
    addColumnButton.setAttribute("title", "Aggiungi colonna");
    addColumnButton.innerHTML = '<i class="fa-solid fa-plus" aria-hidden="true"></i>';

    var rowHandles = document.createElement("div");
    rowHandles.className = "docs-table-controls__row-handles";

    var columnHandles = document.createElement("div");
    columnHandles.className = "docs-table-controls__column-handles";

    var dropIndicator = document.createElement("span");
    dropIndicator.className = "docs-table-controls__drop-indicator";
    dropIndicator.setAttribute("aria-hidden", "true");
    dropIndicator.hidden = true;

    root.appendChild(dropIndicator);
    root.appendChild(rowHandles);
    root.appendChild(columnHandles);
    root.appendChild(menuButton);
    root.appendChild(addRowButton);
    root.appendChild(addColumnButton);
    document.body.appendChild(root);

    root.addEventListener("mouseenter", function onTableControlsEnter() {
      root.setAttribute("data-hover", "true");
    });

    root.addEventListener("mouseleave", function onTableControlsLeave() {
      root.removeAttribute("data-hover");
      scheduleVisualTableControlsClose();
    });

    menuButton.addEventListener("mousedown", function onTableMenuMouseDown(event) {
      event.preventDefault();
    });

    menuButton.addEventListener("click", function onTableMenuClick(event) {
      event.preventDefault();
      event.stopPropagation();
      openEditorTableMenu();
    });

    addRowButton.addEventListener("click", function onAddTableRowClick(event) {
      event.preventDefault();
      event.stopPropagation();
      addVisualTableRowAtEnd();
    });

    addColumnButton.addEventListener("click", function onAddTableColumnClick(event) {
      event.preventDefault();
      event.stopPropagation();
      addVisualTableColumnAtEnd();
    });

    root.addEventListener("dragstart", function onTableHandleDragStart(event) {
      startVisualTableHandleDrag(event);
    });

    root.addEventListener("dragover", function onTableHandleDragOver(event) {
      handleVisualTableHandleDragOver(event);
    });

    root.addEventListener("drop", function onTableHandleDrop(event) {
      handleVisualTableHandleDrop(event);
    });

    root.addEventListener("dragend", function onTableHandleDragEnd() {
      clearVisualTableDragState();
    });

    state.editorTableControls = {
      root: root,
      menuButton: menuButton,
      addRowButton: addRowButton,
      addColumnButton: addColumnButton,
      rowHandles: rowHandles,
      columnHandles: columnHandles,
      dropIndicator: dropIndicator,
    };

    return state.editorTableControls;
  }

  function handleVisualTableMouseMove(event) {
    if (!isVisualEditorMode()) {
      return;
    }

    var cell = getVisualTableCellFromTarget(event && event.target);
    if (!cell) {
      scheduleVisualTableControlsClose();
      return;
    }

    showVisualTableControls(cell);
  }

  function handleVisualTableClick(event) {
    if (!isVisualEditorMode()) {
      return;
    }

    var cell = getVisualTableCellFromTarget(event && event.target);
    if (cell) {
      state.editorTableContext = readVisualTableContextFromCell(cell);
      showVisualTableControls(cell);
    }
  }

  function showVisualTableControls(cell) {
    var context = readVisualTableContextFromCell(cell);
    if (!context || !context.table) {
      return;
    }

    var controls = ensureEditorTableControls();
    if (!controls || !controls.root) {
      return;
    }

    if (state.visualBlockCloseTimer) {
      window.clearTimeout(state.visualBlockCloseTimer);
      state.visualBlockCloseTimer = 0;
    }

    state.editorTableContext = context;
    controls.root.hidden = false;

    positionVisualTableControls(context);
  }

  function positionVisualTableControls(context) {
    var controls = ensureEditorTableControls();
    if (!controls || !controls.root || !context || !context.table || !context.cell) {
      return;
    }

    var tableRect = context.table.getBoundingClientRect();
    var cellRect = context.cell.getBoundingClientRect();
    var root = controls.root;

    root.style.left = "0px";
    root.style.top = "0px";

    controls.menuButton.style.left = Math.round(cellRect.right - 14) + "px";
    controls.menuButton.style.top = Math.round(cellRect.top + cellRect.height / 2 - 13) + "px";

    controls.addRowButton.style.left = Math.round(tableRect.left) + "px";
    controls.addRowButton.style.top = Math.round(tableRect.bottom + 7) + "px";
    controls.addRowButton.style.width = Math.max(26, Math.round(tableRect.width)) + "px";
    controls.addRowButton.style.height = "26px";

    controls.addColumnButton.style.left = Math.round(tableRect.right + 7) + "px";
    controls.addColumnButton.style.top = Math.round(tableRect.top) + "px";
    controls.addColumnButton.style.width = "26px";
    controls.addColumnButton.style.height = Math.max(26, Math.round(tableRect.height)) + "px";

    renderVisualTableHandles(context.table, controls, context);
  }

  function renderVisualTableHandles(table, controls, context) {
    if (!table || !controls || !context) {
      return;
    }

    controls.rowHandles.innerHTML = "";
    controls.columnHandles.innerHTML = "";

    var rows = getVisualTableRows(table);
    var activeRowIndex = Math.max(0, Math.min(Number(context.rowIndex) || 0, rows.length - 1));
    var activeRow = rows[activeRowIndex];

    if (activeRow) {
      var rowRect = activeRow.getBoundingClientRect();
      var rowHandle = document.createElement("button");
      rowHandle.type = "button";
      rowHandle.className = "docs-table-controls__handle docs-table-controls__handle--row";
      rowHandle.setAttribute("draggable", "true");
      rowHandle.setAttribute("data-table-row-handle", String(activeRowIndex));
      rowHandle.setAttribute("aria-label", "Sposta riga " + String(activeRowIndex + 1));
      rowHandle.innerHTML = '<i class="fa-solid fa-grip-lines" aria-hidden="true"></i>';
      rowHandle.style.left = Math.round(rowRect.left - 26) + "px";
      rowHandle.style.top = Math.round(rowRect.top + rowRect.height / 2 - 10) + "px";
      controls.rowHandles.appendChild(rowHandle);
    }

    var firstRow = rows[0];
    var firstCells = getVisualTableRowCells(firstRow);
    var activeColumnIndex = Math.max(0, Math.min(Number(context.columnIndex) || 0, firstCells.length - 1));
    var activeCell = firstCells[activeColumnIndex];

    if (activeCell) {
      var cellRect = activeCell.getBoundingClientRect();
      var columnHandle = document.createElement("button");
      columnHandle.type = "button";
      columnHandle.className = "docs-table-controls__handle docs-table-controls__handle--column";
      columnHandle.setAttribute("draggable", "true");
      columnHandle.setAttribute("data-table-column-handle", String(activeColumnIndex));
      columnHandle.setAttribute("aria-label", "Sposta colonna " + String(activeColumnIndex + 1));
      columnHandle.innerHTML = '<i class="fa-solid fa-grip-lines" aria-hidden="true"></i>';
      columnHandle.style.left = Math.round(cellRect.left + cellRect.width / 2 - 10) + "px";
      columnHandle.style.top = Math.round(cellRect.top - 26) + "px";
      controls.columnHandles.appendChild(columnHandle);
    }
  }

  function scheduleVisualTableControlsClose() {
    var controls = state.editorTableControls;
    if (!controls || !controls.root) {
      return;
    }

    window.setTimeout(function closeVisualTableControlsLater() {
      var currentControls = state.editorTableControls;
      if (!currentControls || !currentControls.root || currentControls.root.getAttribute("data-hover") === "true") {
        return;
      }

      if (isEditorTableMenuOpen() || state.editorTableDrag) {
        return;
      }

      closeVisualTableControls();
    }, 220);
  }

  function closeVisualTableControls() {
    if (state.editorTableControls && state.editorTableControls.root) {
      state.editorTableControls.root.hidden = true;
      state.editorTableControls.rowHandles.innerHTML = "";
      state.editorTableControls.columnHandles.innerHTML = "";
      hideVisualTableDropIndicator();
    }

    state.editorTableContext = null;
  }

  function isEventInsideEditorTableUi(target) {
    if (!target) {
      return false;
    }

    if (state.editorTableControls && state.editorTableControls.root && state.editorTableControls.root.contains(target)) {
      return true;
    }

    if (state.editorTableMenu && state.editorTableMenu.contains(target)) {
      return true;
    }

    return false;
  }

  function ensureEditorTableMenu() {
    if (state.editorTableMenu && state.editorTableMenu.isConnected) {
      return state.editorTableMenu;
    }

    var menu = document.createElement("div");
    menu.className = "docs-editor-md-context docs-table-menu";
    menu.setAttribute("data-docs-table-menu", "");
    menu.setAttribute("role", "menu");
    menu.setAttribute("aria-label", "Opzioni tabella");
    menu.hidden = true;

    var actions = [
      { action: "toggle-header", icon: "fa-solid fa-heading", label: "Mostra/nascondi header" },
      { separator: true },
      { action: "row-above", icon: "fa-solid fa-arrow-up", label: "Riga sopra" },
      { action: "row-below", icon: "fa-solid fa-arrow-down", label: "Riga sotto" },
      { action: "delete-row", icon: "fa-solid fa-trash", label: "Elimina riga" },
      { separator: true },
      { action: "col-left", icon: "fa-solid fa-arrow-left", label: "Colonna a sinistra" },
      { action: "col-right", icon: "fa-solid fa-arrow-right", label: "Colonna a destra" },
      { action: "delete-col", icon: "fa-solid fa-trash", label: "Elimina colonna" },
      { separator: true },
      { action: "align-left", icon: "fa-solid fa-align-left", label: "Allinea a sinistra" },
      { action: "align-center", icon: "fa-solid fa-align-center", label: "Allinea al centro" },
      { action: "align-right", icon: "fa-solid fa-align-right", label: "Allinea a destra" },
      { separator: true },
      { action: "valign-top", icon: "fa-solid fa-arrow-up-short-wide", label: "Allinea in alto" },
      { action: "valign-middle", icon: "fa-solid fa-arrows-up-down", label: "Allinea al centro verticale" },
      { action: "valign-bottom", icon: "fa-solid fa-arrow-down-wide-short", label: "Allinea in basso" },
    ];

    for (var i = 0; i < actions.length; i += 1) {
      var item = actions[i];
      if (item.separator) {
        var separator = document.createElement("span");
        separator.className = "docs-editor-md-context__separator";
        separator.setAttribute("aria-hidden", "true");
        menu.appendChild(separator);
        continue;
      }

      var button = document.createElement("button");
      button.type = "button";
      button.className = "docs-editor-md-context__action";
      button.setAttribute("data-table-action", item.action);
      button.setAttribute("role", "menuitem");
      button.setAttribute("aria-label", item.label);
      button.innerHTML = '<i class="' + item.icon + '" aria-hidden="true"></i><span>' + item.label + '</span>';
      menu.appendChild(button);
    }

    menu.addEventListener("mousedown", function onTableMenuMouseDown(event) {
      event.preventDefault();
    });

    menu.addEventListener("click", function onTableMenuActionClick(event) {
      var button = event.target.closest("button[data-table-action]");
      if (!button || button.disabled) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      applyVisualTableAction(button.getAttribute("data-table-action"));
    });

    document.body.appendChild(menu);
    state.editorTableMenu = menu;
    return menu;
  }

  function isEditorTableMenuOpen() {
    return !!(state.editorTableMenu && !state.editorTableMenu.hasAttribute("hidden"));
  }

  function openEditorTableMenu() {
    var context = state.editorTableContext;
    if (!context || !context.cell || !context.cell.isConnected) {
      return;
    }

    var menu = ensureEditorTableMenu();
    if (!menu) {
      return;
    }

    menu.hidden = false;
    var rect = context.cell.getBoundingClientRect();
    positionEditorPopoverAtPoint(menu, { x: rect.right, y: rect.top + rect.height / 2 });
  }

  function closeEditorTableMenu() {
    if (!state.editorTableMenu) {
      return;
    }

    state.editorTableMenu.hidden = true;
    resetEditorPopoverPlacement(state.editorTableMenu);
  }

  function applyVisualTableAction(action) {
    var context = state.editorTableContext;
    if (!context || !context.table || !context.cell || !context.table.isConnected) {
      closeEditorTableMenu();
      return;
    }

    rememberVisualEditorHistoryBeforeProgrammaticChange();

    if (action === "toggle-header") {
      toggleVisualTableHeader(context.table);
    } else if (action === "row-above") {
      insertVisualTableRow(context.table, context.rowIndex);
    } else if (action === "row-below") {
      insertVisualTableRow(context.table, context.rowIndex + 1);
    } else if (action === "delete-row") {
      deleteVisualTableRow(context.table, context.rowIndex);
    } else if (action === "col-left") {
      insertVisualTableColumn(context.table, context.columnIndex);
    } else if (action === "col-right") {
      insertVisualTableColumn(context.table, context.columnIndex + 1);
    } else if (action === "delete-col") {
      deleteVisualTableColumn(context.table, context.columnIndex);
    } else if (action.indexOf("align-") === 0) {
      setVisualTableCellHorizontalAlign(context.cell, action.replace("align-", ""));
    } else if (action.indexOf("valign-") === 0) {
      setVisualTableCellVerticalAlign(context.cell, action.replace("valign-", ""));
    }

    prepareVisualEditorDomForEditing(state.elements.editorVisualEditor);
    closeEditorTableMenu();

    if (context.cell && context.cell.isConnected) {
      showVisualTableControls(context.cell);
    } else {
      closeVisualTableControls();
    }
  }

  function createVisualTableCell(tagName, text) {
    var cell = document.createElement(tagName || "td");
    cell.textContent = readString(text, tagName === "th" ? "Colonna" : "Dato");
    return cell;
  }

  function insertVisualTableRow(table, index) {
    var rows = getVisualTableRows(table);
    var columnCount = Math.max(1, getVisualTableColumnCount(table));
    var insertIndex = Math.max(0, Math.min(Number(index) || 0, rows.length));
    var body = table.tBodies && table.tBodies.length ? table.tBodies[0] : table;
    var row = document.createElement("tr");

    for (var c = 0; c < columnCount; c += 1) {
      row.appendChild(createVisualTableCell("td", "Dato"));
    }

    if (insertIndex >= rows.length) {
      body.appendChild(row);
    } else {
      rows[insertIndex].parentNode.insertBefore(row, rows[insertIndex]);
    }
  }

  function deleteVisualTableRow(table, rowIndex) {
    var rows = getVisualTableRows(table);
    if (rows.length <= 1) {
      return;
    }

    var index = Math.max(0, Math.min(Number(rowIndex) || 0, rows.length - 1));
    rows[index].remove();

    if (table.tHead && !table.tHead.querySelector("tr")) {
      table.tHead.remove();
    }
  }

  function insertVisualTableColumn(table, index) {
    var rows = getVisualTableRows(table);
    var columnCount = Math.max(1, getVisualTableColumnCount(table));
    var insertIndex = Math.max(0, Math.min(Number(index) || 0, columnCount));

    for (var r = 0; r < rows.length; r += 1) {
      var row = rows[r];
      var cells = getVisualTableRowCells(row);
      var tag = cells.length && String(cells[0].tagName || "").toLowerCase() === "th" ? "th" : "td";
      var newCell = createVisualTableCell(tag, tag === "th" ? "Colonna" : "Dato");

      if (insertIndex >= cells.length) {
        row.appendChild(newCell);
      } else {
        row.insertBefore(newCell, cells[insertIndex]);
      }
    }
  }

  function deleteVisualTableColumn(table, columnIndex) {
    var columnCount = getVisualTableColumnCount(table);
    if (columnCount <= 1) {
      return;
    }

    var index = Math.max(0, Math.min(Number(columnIndex) || 0, columnCount - 1));
    var rows = getVisualTableRows(table);

    for (var r = 0; r < rows.length; r += 1) {
      var cells = getVisualTableRowCells(rows[r]);
      if (cells[index]) {
        cells[index].remove();
      }
    }
  }

  function addVisualTableRowAtEnd() {
    var context = state.editorTableContext;
    if (!context || !context.table) {
      return;
    }

    rememberVisualEditorHistoryBeforeProgrammaticChange();
    insertVisualTableRow(context.table, getVisualTableRows(context.table).length);
    prepareVisualEditorDomForEditing(state.elements.editorVisualEditor);
    showVisualTableControls(context.cell && context.cell.isConnected ? context.cell : context.table.querySelector("td, th"));
  }

  function addVisualTableColumnAtEnd() {
    var context = state.editorTableContext;
    if (!context || !context.table) {
      return;
    }

    rememberVisualEditorHistoryBeforeProgrammaticChange();
    insertVisualTableColumn(context.table, getVisualTableColumnCount(context.table));
    prepareVisualEditorDomForEditing(state.elements.editorVisualEditor);
    showVisualTableControls(context.cell && context.cell.isConnected ? context.cell : context.table.querySelector("td, th"));
  }

  function toggleVisualTableHeader(table) {
    if (!table) {
      return;
    }

    var thead = table.tHead;
    if (thead && thead.querySelector("tr")) {
      var headerRow = thead.querySelector("tr");
      var body = table.tBodies && table.tBodies.length ? table.tBodies[0] : table.createTBody();
      var headerCells = getVisualTableRowCells(headerRow);
      for (var h = 0; h < headerCells.length; h += 1) {
        var td = document.createElement("td");
        td.innerHTML = headerCells[h].innerHTML || "Dato";
        headerRow.replaceChild(td, headerCells[h]);
      }
      body.insertBefore(headerRow, body.firstChild);
      thead.remove();
      return;
    }

    var rows = getVisualTableRows(table);
    if (!rows.length) {
      return;
    }

    var firstRow = rows[0];
    var cells = getVisualTableRowCells(firstRow);
    for (var c = 0; c < cells.length; c += 1) {
      var th = document.createElement("th");
      th.innerHTML = cells[c].innerHTML || "Colonna";
      firstRow.replaceChild(th, cells[c]);
    }

    var newHead = table.createTHead();
    newHead.appendChild(firstRow);
  }

  function clearVisualTableCellAlignClasses(cell) {
    if (!cell || !cell.classList) {
      return;
    }

    cell.classList.remove(
      "wiki-cell-align-left",
      "wiki-cell-align-center",
      "wiki-cell-align-right",
      "wiki-cell-valign-top",
      "wiki-cell-valign-middle",
      "wiki-cell-valign-bottom"
    );
  }

  function setVisualTableCellHorizontalAlign(cell, align) {
    if (!cell || !cell.classList) {
      return;
    }

    cell.classList.remove("wiki-cell-align-left", "wiki-cell-align-center", "wiki-cell-align-right");
    cell.classList.add("wiki-cell-align-" + (align === "center" || align === "right" ? align : "left"));
  }

  function setVisualTableCellVerticalAlign(cell, align) {
    if (!cell || !cell.classList) {
      return;
    }

    var value = align === "middle" || align === "bottom" ? align : "top";
    cell.classList.remove("wiki-cell-valign-top", "wiki-cell-valign-middle", "wiki-cell-valign-bottom");
    cell.classList.add("wiki-cell-valign-" + value);
  }

  function startVisualTableHandleDrag(event) {
    var target = event && event.target && event.target.closest ? event.target.closest("[data-table-row-handle], [data-table-column-handle]") : null;
    var context = state.editorTableContext;
    if (!target || !context || !context.table) {
      return;
    }

    event.stopPropagation();
    closeEditorTableMenu();
    closeEditorColumnsPanel();
    closeVisualBlockControls();

    var rowIndex = target.getAttribute("data-table-row-handle");
    var columnIndex = target.getAttribute("data-table-column-handle");
    state.editorTableDrag = {
      table: context.table,
      kind: rowIndex !== null ? "row" : "column",
      sourceIndex: rowIndex !== null ? Number(rowIndex) : Number(columnIndex),
      targetIndex: -1,
    };

    target.classList.add("is-dragging");
    context.table.classList.add("is-table-drag-source");

    if (state.elements && state.elements.editorVisualEditor) {
      state.elements.editorVisualEditor.classList.add("is-table-drag-active");
      state.elements.editorVisualEditor.style.userSelect = "none";
      state.elements.editorVisualEditor.style.caretColor = "transparent";
      state.elements.editorVisualEditor.style.cursor = "grabbing";
    }

    document.body.classList.add("is-wiki-table-dragging");

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.dropEffect = "move";
      try {
        event.dataTransfer.setData("text/plain", "wiki-table-" + state.editorTableDrag.kind);
      } catch (_error) {
        // Ignore dataTransfer errors.
      }
    }
  }

  function handleVisualTableHandleDragOver(event) {
    handleVisualTableDragOver(event);
  }

  function handleVisualTableHandleDrop(event) {
    handleVisualTableDrop(event);
  }

  function handleVisualTableDragOver(event) {
    if (!state.editorTableDrag || !state.editorTableDrag.table) {
      return;
    }

    var placement = resolveVisualTableDropPlacement(event);
    if (!placement) {
      hideVisualTableDropIndicator();
      state.editorTableDrag.targetIndex = -1;
      if (event && event.dataTransfer) {
        event.dataTransfer.dropEffect = "none";
      }
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    state.editorTableDrag.targetIndex = placement.insertIndex;
    renderVisualTableDropIndicator(placement);

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }
  }

  function handleVisualTableDrop(event) {
    if (!state.editorTableDrag || !state.editorTableDrag.table) {
      clearVisualTableDragState();
      return;
    }

    var drag = state.editorTableDrag;
    var placement = resolveVisualTableDropPlacement(event);

    if (event && typeof event.preventDefault === "function") {
      event.preventDefault();
      event.stopPropagation();
    }

    if (!placement) {
      clearVisualTableDragState();
      return;
    }

    var source = Number(drag.sourceIndex);
    var target = Number(placement.insertIndex);

    if (!Number.isFinite(source) || !Number.isFinite(target) || target < 0) {
      clearVisualTableDragState();
      return;
    }

    if (drag.kind === "row" && (target === source || target === source + 1)) {
      clearVisualTableDragState();
      return;
    }

    if (drag.kind === "column" && (target === source || target === source + 1)) {
      clearVisualTableDragState();
      return;
    }

    rememberVisualEditorHistoryBeforeProgrammaticChange();

    if (drag.kind === "row") {
      moveVisualTableRowToIndex(drag.table, source, target);
    } else {
      moveVisualTableColumnToIndex(drag.table, source, target);
    }

    prepareVisualEditorDomForEditing(state.elements.editorVisualEditor);

    var nextCell = drag.table.querySelector("td, th");
    clearVisualTableDragState();

    if (nextCell) {
      showVisualTableControls(nextCell);
    }
  }

  function resolveVisualTableDropPlacement(event) {
    var drag = state.editorTableDrag;
    if (!drag || !drag.table || !drag.table.isConnected || !event) {
      return null;
    }

    var table = drag.table;
    var tableRect = table.getBoundingClientRect();
    var x = Number(event.clientX);
    var y = Number(event.clientY);
    var margin = 18;

    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return null;
    }

    if (x < tableRect.left - margin || x > tableRect.right + margin || y < tableRect.top - margin || y > tableRect.bottom + margin) {
      return null;
    }

    if (drag.kind === "row") {
      var rows = getVisualTableRows(table);
      if (!rows.length) {
        return null;
      }

      var rowInsertIndex = rows.length;
      for (var r = 0; r < rows.length; r += 1) {
        var rowRect = rows[r].getBoundingClientRect();
        if (y < rowRect.top + rowRect.height / 2) {
          rowInsertIndex = r;
          break;
        }
      }

      return {
        kind: "row",
        table: table,
        insertIndex: rowInsertIndex,
      };
    }

    var firstRow = getVisualTableRows(table)[0];
    var cells = getVisualTableRowCells(firstRow);
    if (!cells.length) {
      return null;
    }

    var columnInsertIndex = cells.length;
    for (var c = 0; c < cells.length; c += 1) {
      var cellRect = cells[c].getBoundingClientRect();
      if (x < cellRect.left + cellRect.width / 2) {
        columnInsertIndex = c;
        break;
      }
    }

    return {
      kind: "column",
      table: table,
      insertIndex: columnInsertIndex,
    };
  }

  function renderVisualTableDropIndicator(placement) {
    var controls = ensureEditorTableControls();
    if (!controls || !controls.dropIndicator || !placement || !placement.table) {
      return;
    }

    var indicator = controls.dropIndicator;
    var tableRect = placement.table.getBoundingClientRect();
    indicator.hidden = false;
    indicator.classList.toggle("is-row", placement.kind === "row");
    indicator.classList.toggle("is-column", placement.kind === "column");
    indicator.style.position = "fixed";
    indicator.style.zIndex = "10095";
    indicator.style.pointerEvents = "none";
    indicator.style.borderRadius = "999px";
    indicator.style.background = "var(--accent-strong)";
    indicator.style.boxShadow = "0 0 0 3px rgba(var(--accent-strong-rgb), 0.18)";

    if (placement.kind === "row") {
      var rows = getVisualTableRows(placement.table);
      var y = tableRect.bottom;
      if (placement.insertIndex < rows.length) {
        y = rows[placement.insertIndex].getBoundingClientRect().top;
      }

      indicator.style.left = Math.round(tableRect.left) + "px";
      indicator.style.top = Math.round(y - 1) + "px";
      indicator.style.width = Math.max(24, Math.round(tableRect.width)) + "px";
      indicator.style.height = "2px";
      return;
    }

    var firstRow = getVisualTableRows(placement.table)[0];
    var cells = getVisualTableRowCells(firstRow);
    var x = tableRect.right;
    if (placement.insertIndex < cells.length) {
      x = cells[placement.insertIndex].getBoundingClientRect().left;
    }

    indicator.style.left = Math.round(x - 1) + "px";
    indicator.style.top = Math.round(tableRect.top) + "px";
    indicator.style.width = "2px";
    indicator.style.height = Math.max(24, Math.round(tableRect.height)) + "px";
  }

  function hideVisualTableDropIndicator() {
    if (state.editorTableControls && state.editorTableControls.dropIndicator) {
      state.editorTableControls.dropIndicator.hidden = true;
      state.editorTableControls.dropIndicator.classList.remove("is-row", "is-column");
    }
  }

  function clearVisualTableDragState() {
    if (state.editorTableControls && state.editorTableControls.root) {
      var dragging = state.editorTableControls.root.querySelectorAll(".is-dragging");
      for (var i = 0; i < dragging.length; i += 1) {
        dragging[i].classList.remove("is-dragging");
      }
    }

    hideVisualTableDropIndicator();

    if (state.editorTableDrag && state.editorTableDrag.table) {
      state.editorTableDrag.table.classList.remove("is-table-drag-source");
    }

    if (state.elements && state.elements.editorVisualEditor) {
      state.elements.editorVisualEditor.classList.remove("is-table-drag-active");
      state.elements.editorVisualEditor.style.removeProperty("user-select");
      state.elements.editorVisualEditor.style.removeProperty("caret-color");
      state.elements.editorVisualEditor.style.removeProperty("cursor");
    }

    document.body.classList.remove("is-wiki-table-dragging");
    state.editorTableDrag = null;
  }

  function moveVisualTableRowToIndex(table, sourceIndex, insertIndex) {
    var rows = getVisualTableRows(table);
    var source = rows[sourceIndex];
    if (!source) {
      return;
    }

    var parent = source.parentNode;
    var adjustedIndex = insertIndex;
    if (sourceIndex < insertIndex) {
      adjustedIndex -= 1;
    }

    source.remove();

    var nextRows = getVisualTableRows(table);
    var reference = nextRows[adjustedIndex] || null;
    if (reference && reference.parentNode) {
      reference.parentNode.insertBefore(source, reference);
    } else if (parent) {
      parent.appendChild(source);
    }
  }

  function moveVisualTableColumnToIndex(table, sourceIndex, insertIndex) {
    var rows = getVisualTableRows(table);
    var adjustedIndex = sourceIndex < insertIndex ? insertIndex - 1 : insertIndex;

    for (var r = 0; r < rows.length; r += 1) {
      var cells = getVisualTableRowCells(rows[r]);
      var source = cells[sourceIndex];
      if (!source) {
        continue;
      }

      source.remove();
      var nextCells = getVisualTableRowCells(rows[r]);
      var reference = nextCells[adjustedIndex] || null;
      rows[r].insertBefore(source, reference);
    }
  }

  function deleteVisualBlockTarget() {
    var block = state.visualBlockTarget;
    var editor = state.elements && state.elements.editorVisualEditor;

    if (!editor || !block || !block.isConnected || !editor.contains(block) || !isDeletableVisualBlock(block)) {
      closeVisualBlockControls();
      return;
    }

    rememberVisualEditorHistoryBeforeProgrammaticChange();

    var nextFocus = block.nextElementSibling || block.previousElementSibling || null;
    block.remove();

    if (!editor.childNodes.length || !String(editor.textContent || "").trim()) {
      editor.innerHTML = "<p><br></p>";
      nextFocus = editor.querySelector("p");
    }

    prepareVisualEditorDomForEditing(editor);
    closeVisualBlockControls();

    if (nextFocus && nextFocus.isConnected && window.getSelection) {
      var range = document.createRange();
      range.selectNodeContents(nextFocus);
      range.collapse(true);

      var selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    }

    try {
      editor.focus({ preventScroll: true });
    } catch (_error) {
      editor.focus();
    }
  }

  function setVisualSelectionBeforeBlock(block) {
    var editor = state.elements && state.elements.editorVisualEditor;
    if (!editor || !block || !window.getSelection) {
      return false;
    }

    var range = document.createRange();
    range.setStartBefore(block);
    range.collapse(true);

    var selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    state.visualTooltipSelection = range.cloneRange();

    try {
      editor.focus({ preventScroll: true });
    } catch (_error) {
      editor.focus();
    }

    return true;
  }

  function openVisualBlockInsertMenu() {
    var block = state.visualBlockTarget;
    if (!block || !block.isConnected) {
      closeVisualBlockControls();
      return;
    }

    setVisualSelectionBeforeBlock(block);

    closeInternalLinkPicker();
    closeColorPicker();
    closeTooltipEditor();
    closeEditorImagePicker();
    closeEditorBoxPicker();
    closeEditorBoxIconPicker();
    closeMediaLibraryPanel();

    var rect = block.getBoundingClientRect();
    openEditorMarkdownContextMenu(Math.max(8, rect.left - 4), Math.max(8, rect.top + 4), { mode: "insert" });
  }

  function startVisualBlockDrag(event) {
    var block = state.visualBlockTarget;
    var editor = state.elements && state.elements.editorVisualEditor;
    if (!block || !block.isConnected || !editor) {
      return;
    }

    clearVisualBlockDragState();

    state.visualBlockDrag = {
      source: block,
      target: null,
      position: "before",
    };

    editor.classList.add("is-visual-block-drag-active");
    block.classList.add("is-visual-block-dragging");

    if (event && event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.dropEffect = "move";
      try {
        event.dataTransfer.setData("text/plain", "wiki-block");
      } catch (_error) {
        // Ignore dataTransfer errors.
      }
    }
  }

  function clearVisualBlockDropIndicators() {
    var editor = state.elements && state.elements.editorVisualEditor;
    if (!editor || !editor.querySelectorAll) {
      return;
    }

    var marked = editor.querySelectorAll(".is-visual-drop-before, .is-visual-drop-after, .is-visual-block-dragging");
    for (var i = 0; i < marked.length; i += 1) {
      marked[i].classList.remove("is-visual-drop-before", "is-visual-drop-after", "is-visual-block-dragging");
    }
  }

  function clearVisualBlockDragState() {
    clearVisualBlockDropIndicators();

    if (state.elements && state.elements.editorVisualEditor) {
      state.elements.editorVisualEditor.classList.remove("is-visual-block-drag-active");
    }

    state.visualBlockDrag = null;
  }

  function handleVisualEditorDragOver(event) {
    if (!state.visualBlockDrag || !state.visualBlockDrag.source) {
      return;
    }

    var editor = state.elements && state.elements.editorVisualEditor;
    if (!editor || !event || !event.target || !editor.contains(event.target)) {
      clearVisualBlockDropIndicators();
      state.visualBlockDrag.source.classList.add("is-visual-block-dragging");
      state.visualBlockDrag.target = null;
      if (event && event.dataTransfer) {
        event.dataTransfer.dropEffect = "none";
      }
      return;
    }

    event.preventDefault();

    var target = getVisualEditorBlockFromTarget(event.target);
    if (!target || target === state.visualBlockDrag.source || target.contains(state.visualBlockDrag.source)) {
      clearVisualBlockDropIndicators();
      state.visualBlockDrag.source.classList.add("is-visual-block-dragging");
      state.visualBlockDrag.target = null;
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "none";
      }
      return;
    }

    var rect = target.getBoundingClientRect();
    var position = event.clientY < rect.top + rect.height / 2 ? "before" : "after";

    clearVisualBlockDropIndicators();
    state.visualBlockDrag.source.classList.add("is-visual-block-dragging");
    target.classList.add(position === "before" ? "is-visual-drop-before" : "is-visual-drop-after");

    state.visualBlockDrag.target = target;
    state.visualBlockDrag.position = position;

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }
  }

  function handleVisualEditorDrop(event) {
    if (!state.visualBlockDrag || !state.visualBlockDrag.source) {
      clearVisualBlockDragState();
      return;
    }

    if (event && typeof event.preventDefault === "function") {
      event.preventDefault();
    }

    var source = state.visualBlockDrag.source;
    var target = state.visualBlockDrag.target;
    var position = state.visualBlockDrag.position;
    var editor = state.elements && state.elements.editorVisualEditor;

    if (
      source &&
      target &&
      editor &&
      source !== target &&
      source.isConnected &&
      target.isConnected &&
      source.parentNode === target.parentNode
    ) {
      rememberVisualEditorHistoryBeforeProgrammaticChange();

      if (position === "after") {
        target.parentNode.insertBefore(source, target.nextSibling);
      } else {
        target.parentNode.insertBefore(source, target);
      }

      prepareVisualEditorDomForEditing(editor);
    }

    clearVisualBlockDragState();
    closeVisualBlockControls();
  }

  function handleVisualEditorClick(event) {
    if (!isVisualEditorMode() || !event || !event.target || !event.target.closest) {
      return;
    }

    var iconWrap = event.target.closest(".wiki-box__icon");
    if (!iconWrap || !state.elements || !state.elements.editorVisualEditor.contains(iconWrap)) {
      return;
    }

    var box = iconWrap.closest(".wiki-box");
    if (!box) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    openVisualBoxIconPicker(box, iconWrap);
  }

  function handleVisualEditorContextMenu(event) {
    if (!isVisualEditorMode() || !state.elements || !state.elements.editorVisualEditor) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    closeInternalLinkPicker();
    closeColorPicker();
    closeTooltipEditor();
    closeEditorImagePicker();
    closeEditorBoxPicker();
    closeEditorBoxIconPicker();
    closeMediaLibraryPanel();

    saveVisualSelectionSnapshot();
    openEditorMarkdownContextMenu(event.clientX, event.clientY);
  }

  function getCurrentVisualRange() {
    if (!state.elements || !state.elements.editorVisualEditor || !window.getSelection) {
      return null;
    }

    var selection = window.getSelection();
    if (!selection || selection.rangeCount < 1) {
      return null;
    }

    var range = selection.getRangeAt(0);
    var editor = state.elements.editorVisualEditor;

    if (!editor.contains(range.commonAncestorContainer)) {
      return null;
    }

    return range;
  }

  function saveVisualSelectionSnapshot() {
    normalizeVisualSelectionWhitespace();
    var range = getCurrentVisualRange();
    state.visualTooltipSelection = range ? range.cloneRange() : null;
    state.editorContextSelection = null;
  }

  function restoreVisualSelectionSnapshot() {
    if (!state.visualTooltipSelection || !window.getSelection || !state.elements || !state.elements.editorVisualEditor) {
      return false;
    }

    var selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(state.visualTooltipSelection);

    try {
      state.elements.editorVisualEditor.focus({ preventScroll: true });
    } catch (_error) {
      state.elements.editorVisualEditor.focus();
    }

    return true;
  }

  function getVisualSelectionText() {
    normalizeVisualSelectionWhitespace();
    var range = getCurrentVisualRange() || state.visualTooltipSelection;
    return range ? readString(String(range.toString() || "").trim(), "") : "";
  }

  function getVisualSelectionAnchorPoint() {
    var range = getCurrentVisualRange() || state.visualTooltipSelection;
    if (!range || typeof range.getBoundingClientRect !== "function") {
      return null;
    }

    var rect = range.getBoundingClientRect();
    if (!rect || (!rect.width && !rect.height)) {
      var fallbackRect = state.elements && state.elements.editorVisualEditor
        ? state.elements.editorVisualEditor.getBoundingClientRect()
        : null;
      return fallbackRect ? { x: fallbackRect.left + 32, y: fallbackRect.top + 32 } : null;
    }

    return {
      x: rect.left + rect.width / 2,
      y: rect.bottom,
    };
  }

  function normalizeVisualSelectionWhitespace() {
    if (!state.elements || !state.elements.editorVisualEditor || !window.getSelection) {
      return false;
    }

    var editor = state.elements.editorVisualEditor;
    var selection = window.getSelection();
    if (!selection || selection.rangeCount < 1 || selection.isCollapsed) {
      return false;
    }

    var range = selection.getRangeAt(0);
    if (!range || !editor.contains(range.commonAncestorContainer)) {
      return false;
    }

    var trimmed = trimVisualRangeWhitespace(range, editor);
    if (!trimmed) {
      return false;
    }

    selection.removeAllRanges();
    selection.addRange(trimmed);
    state.visualTooltipSelection = trimmed.cloneRange();
    return true;
  }

  function trimVisualRangeWhitespace(range, root) {
    if (!range || !root) {
      return null;
    }

    var text = String(range.toString() || "");
    var clean = text.trim();
    if (!text || text === clean) {
      return null;
    }

    var leading = text.indexOf(clean);
    var trailing = text.length - leading - clean.length;
    var startPoint = leading > 0 ? getRangeTextPoint(range, leading, root) : null;
    var endPoint = trailing > 0 ? getRangeTextPoint(range, leading + clean.length, root) : null;
    var nextRange = range.cloneRange();

    if (startPoint) {
      nextRange.setStart(startPoint.node, startPoint.offset);
    }

    if (endPoint) {
      nextRange.setEnd(endPoint.node, endPoint.offset);
    }

    if (nextRange.collapsed || !String(nextRange.toString() || "").trim()) {
      return null;
    }

    return nextRange;
  }

  function getRangeTextPoint(range, targetOffset, root) {
    if (!range || !root || !document.createTreeWalker) {
      return null;
    }

    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function acceptRangeTextNode(node) {
        return range.intersectsNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      },
    });

    var consumed = 0;
    var node = walker.nextNode();

    while (node) {
      var nodeStart = node === range.startContainer ? range.startOffset : 0;
      var nodeEnd = node === range.endContainer ? range.endOffset : String(node.nodeValue || "").length;
      var length = Math.max(0, nodeEnd - nodeStart);

      if (targetOffset <= consumed + length) {
        return {
          node: node,
          offset: nodeStart + Math.max(0, targetOffset - consumed),
        };
      }

      consumed += length;
      node = walker.nextNode();
    }

    return null;
  }

  function positionEditorPopoverAtPoint(panel, point) {
    if (!panel || !point) {
      return;
    }

    prepareEditorPopoverPanel(panel);

    var viewportPadding = 12;
    panel.style.left = "0px";
    panel.style.top = "0px";
    panel.style.right = "auto";
    panel.style.bottom = "auto";
    applyEditorPopoverScrollBounds(panel, viewportPadding);
    panel.style.visibility = "hidden";

    var panelRect = panel.getBoundingClientRect();
    var left = point.x - panelRect.width / 2;
    var top = point.y + 12;

    if (top + panelRect.height > window.innerHeight - viewportPadding) {
      top = point.y - panelRect.height - 12;
    }

    left = Math.max(viewportPadding, Math.min(left, window.innerWidth - panelRect.width - viewportPadding));
    top = Math.max(viewportPadding, Math.min(top, window.innerHeight - panelRect.height - viewportPadding));

    panel.style.left = left + "px";
    panel.style.top = top + "px";
    panel.style.visibility = "";
  }

  function openVisualColorPicker() {
    if (!state.elements || !state.elements.editorColorPicker || !state.elements.editorVisualEditor) {
      return;
    }

    saveVisualSelectionSnapshot();

    var existingColor = findVisualColorElementFromSelection();
    var selectedText = getVisualSelectionText() || "testo colorato";

    if (existingColor) {
      selectedText = readString(existingColor.textContent, selectedText);
      state.visualColorSelection = document.createRange();
      state.visualColorSelection.selectNodeContents(existingColor);
    } else {
      state.visualColorSelection = state.visualTooltipSelection ? state.visualTooltipSelection.cloneRange() : null;
    }

    state.colorSelection = {
      mode: "visual",
      selectedText: selectedText,
      element: existingColor || null,
    };

    closeInternalLinkPicker();
    closeTooltipEditor();
    closeEditorImagePicker();
    closeMediaLibraryPanel();

    state.elements.editorColorPicker.hidden = false;
    positionEditorPopoverAtPoint(state.elements.editorColorPicker, getVisualSelectionAnchorPoint());
  }

  function findVisualColorElementFromSelection() {
    var range = getCurrentVisualRange();
    if (!range) {
      return null;
    }

    var node = range.commonAncestorContainer;
    if (node && node.nodeType === Node.TEXT_NODE) {
      node = node.parentNode;
    }

    return node && node.closest ? node.closest(".wiki-color") : null;
  }

  function restoreVisualColorSelection() {
    var range = state.visualColorSelection || state.visualTooltipSelection;
    if (!range || !window.getSelection || !state.elements || !state.elements.editorVisualEditor) {
      return false;
    }

    var selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);

    try {
      state.elements.editorVisualEditor.focus({ preventScroll: true });
    } catch (_error) {
      state.elements.editorVisualEditor.focus();
    }

    return true;
  }

  function insertVisualColoredText(colorName) {
    var color = normalizeWikiColor(colorName);
    var snapshot = state.colorSelection || {};
    var className = "wiki-color-" + color;

    if (snapshot.element && snapshot.element.isConnected) {
      rememberVisualEditorHistoryBeforeProgrammaticChange();

      for (var i = snapshot.element.classList.length - 1; i >= 0; i -= 1) {
        var currentClass = String(snapshot.element.classList[i] || "");
        if (currentClass.indexOf("wiki-color-") === 0) {
          snapshot.element.classList.remove(currentClass);
        }
      }

      snapshot.element.classList.add("wiki-color", className);
      closeColorPicker();
      return;
    }

    var range = state.visualColorSelection || state.visualTooltipSelection;
    if (!range || !state.elements || !state.elements.editorVisualEditor || !window.getSelection) {
      closeColorPicker();
      return;
    }

    var editor = state.elements.editorVisualEditor;
    if (!editor.contains(range.commonAncestorContainer)) {
      closeColorPicker();
      return;
    }

    rememberVisualEditorHistoryBeforeProgrammaticChange();

    var content = range.toString() || readString(snapshot.selectedText, "testo colorato");
    var span = document.createElement("span");
    span.className = "wiki-color " + className;
    span.textContent = content;

    range.deleteContents();
    range.insertNode(span);

    var selection = window.getSelection();
    var nextRange = document.createRange();
    nextRange.selectNodeContents(span);
    nextRange.collapse(false);
    selection.removeAllRanges();
    selection.addRange(nextRange);

    try {
      editor.focus({ preventScroll: true });
    } catch (_error) {
      editor.focus();
    }

    closeColorPicker();
  }

  function openVisualImagePicker() {
    var picker = ensureEditorImagePicker();
    if (!picker || !picker.panel || !state.elements || !state.elements.editorVisualEditor) {
      return;
    }

    saveVisualSelectionSnapshot();
    var existingImage = findVisualImageElementFromSelection();
    var existingData = existingImage ? readWikiImageDataFromNode(existingImage) : null;
    var existingWidthParts = existingData ? splitWikiImageWidth(existingData.width, existingData.layout) : null;

    state.visualImageSelection = state.visualTooltipSelection ? state.visualTooltipSelection.cloneRange() : null;
    state.imagePickerTargetElement = existingImage || null;
    state.imagePickerSelection = {
      mode: "visual",
      selectedText: getVisualSelectionText(),
    };
    state.imagePickerQuery = "";
    state.imagePickerExternalUrl = existingData ? existingData.src : "";
    state.imagePickerAlt = existingData ? existingData.alt : getVisualSelectionText() || readString(state.elements && state.elements.editorImageAlt && state.elements.editorImageAlt.value, "Immagine");
    state.imagePickerLayout = existingData ? existingData.layout : "full";
    state.imagePickerWidthValue = existingWidthParts ? existingWidthParts.value : "100";
    state.imagePickerWidthUnit = existingWidthParts ? existingWidthParts.unit : "%";

    closeInternalLinkPicker();
    closeColorPicker();
    closeTooltipEditor();
    closeMediaLibraryPanel();

    if (picker.alt) {
      picker.alt.value = state.imagePickerAlt;
    }

    if (picker.layout) {
      picker.layout.addEventListener("change", function onImagePickerLayoutChange(event) {
        state.imagePickerLayout = normalizeWikiImageLayout(event.target.value);
      });
    }

    if (picker.widthValue) {
      picker.widthValue.addEventListener("input", function onImagePickerWidthValueInput(event) {
        state.imagePickerWidthValue = readString(event.target.value, "");
      });

      picker.widthValue.addEventListener("keydown", handleEditorImagePickerKeydown);
    }

    if (picker.widthUnit) {
      picker.widthUnit.addEventListener("change", function onImagePickerWidthUnitChange(event) {
        state.imagePickerWidthUnit = normalizeWikiImageWidthUnit(event.target.value);
      });
    }

    if (picker.url) {
      picker.url.value = state.imagePickerExternalUrl || "";
    }

    if (picker.layout) {
      picker.layout.value = state.imagePickerLayout;
    }

    if (picker.widthValue) {
      picker.widthValue.value = state.imagePickerWidthValue;
    }

    if (picker.widthUnit) {
      picker.widthUnit.value = state.imagePickerWidthUnit;
    }

    if (picker.search) {
      picker.search.value = "";
    }

    setEditorImagePickerStatus("", "");
    picker.panel.hidden = false;
    renderEditorImagePickerResults();
    positionEditorPopoverAtPoint(picker.panel, getVisualSelectionAnchorPoint());

    ensureMediaLibraryLoaded(state.mediaLibraryNeedsRefresh)
      .then(function onVisualImageLibraryLoaded() {
        renderEditorImagePickerResults();
      })
      .catch(function onVisualImageLibraryError() {
        renderEditorImagePickerResults();
      });

    if (picker.search && typeof picker.search.focus === "function") {
      picker.search.focus();
    }
  }

  function findVisualImageElementFromSelection() {
    var range = getCurrentVisualRange();
    if (!range) {
      return null;
    }

    var node = range.commonAncestorContainer;
    if (node && node.nodeType === Node.TEXT_NODE) {
      node = node.parentNode;
    }

    if (!node || !node.closest) {
      return null;
    }

    var wrapper = node.closest(".wiki-image");
    if (wrapper) {
      return wrapper;
    }

    var image = node.closest("img");
    return image || null;
  }

  function restoreVisualImageSelection() {
    var range = state.visualImageSelection || state.visualTooltipSelection;
    if (!range || !window.getSelection || !state.elements || !state.elements.editorVisualEditor) {
      return false;
    }

    var selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);

    try {
      state.elements.editorVisualEditor.focus({ preventScroll: true });
    } catch (_error) {
      state.elements.editorVisualEditor.focus();
    }

    return true;
  }

  function insertVisualImageFromPicker(url, altText) {
    if (!state.elements || !state.elements.editorVisualEditor) {
      return;
    }

    var layout = state.editorImagePicker && state.editorImagePicker.layout
      ? state.editorImagePicker.layout.value
      : state.imagePickerLayout;
    var widthValue = state.editorImagePicker && state.editorImagePicker.widthValue
      ? state.editorImagePicker.widthValue.value
      : state.imagePickerWidthValue;
    var widthUnit = state.editorImagePicker && state.editorImagePicker.widthUnit
      ? state.editorImagePicker.widthUnit.value
      : state.imagePickerWidthUnit;
    var normalizedLayout = normalizeWikiImageLayout(layout);
    var width = normalizeWikiImageWidth(readString(widthValue, "") + normalizeWikiImageWidthUnit(widthUnit), normalizedLayout);
    var html = buildWikiImageHtml(url, altText, normalizedLayout, width);
    var replacement = createElementFromHtml(html);

    if (!replacement) {
      closeEditorImagePicker();
      return;
    }

    if (state.imagePickerTargetElement && state.imagePickerTargetElement.isConnected) {
      rememberVisualEditorHistoryBeforeProgrammaticChange();
      state.imagePickerTargetElement.parentNode.replaceChild(replacement, state.imagePickerTargetElement);
      closeEditorImagePicker();
      return;
    }

    insertVisualImageNode(replacement, normalizedLayout);
    closeEditorImagePicker();
  }

  function createElementFromHtml(html) {
    var temp = document.createElement("div");
    temp.innerHTML = String(html || "").trim();
    return temp.firstElementChild || null;
  }

  function insertVisualHtmlBlock(html) {
    if (!state.elements || !state.elements.editorVisualEditor) {
      return;
    }

    var editor = state.elements.editorVisualEditor;
    var node = createElementFromHtml(html);
    if (!node) {
      return;
    }

    restoreVisualSelectionSnapshot();
    rememberVisualEditorHistoryBeforeProgrammaticChange();

    var selection = window.getSelection ? window.getSelection() : null;
    var range = selection && selection.rangeCount ? selection.getRangeAt(0) : null;

    if (!range || !editor.contains(range.commonAncestorContainer)) {
      range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
    }

    var boxContent = findVisualWikiBoxContentFromRange(range);
    if (boxContent) {
      insertNodeInVisualContainerAtRange(boxContent, node, range);
      prepareVisualEditorDomForEditing(editor);
      placeCaretAfterInsertedVisualBlock(node);

      try {
        editor.focus({ preventScroll: true });
      } catch (_error) {
        editor.focus();
      }
      return;
    }

    var spacer = document.createElement("p");
    spacer.appendChild(document.createElement("br"));

    range.deleteContents();
    range.insertNode(spacer);
    range.insertNode(node);

    var nextRange = document.createRange();
    nextRange.selectNodeContents(spacer);
    nextRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(nextRange);

    prepareVisualEditorDomForEditing(editor);

    try {
      editor.focus({ preventScroll: true });
    } catch (_error) {
      editor.focus();
    }
  }

  function findVisualWikiBoxContentFromRange(range) {
    if (!range) {
      return null;
    }

    var node = range.commonAncestorContainer;
    if (node && node.nodeType === Node.TEXT_NODE) {
      node = node.parentNode;
    }

    if (!node || !node.closest) {
      return null;
    }

    var content = node.closest(".wiki-box__content");
    if (!content) {
      return null;
    }

    var box = content.closest(".wiki-box");
    var editor = state.elements && state.elements.editorVisualEditor;
    return box && editor && editor.contains(box) ? content : null;
  }

  function getClosestVisualBlockWithin(container, node) {
    if (!container || !node) {
      return null;
    }

    var current = node.nodeType === Node.TEXT_NODE ? node.parentNode : node;
    while (current && current !== container) {
      if (current.nodeType === Node.ELEMENT_NODE) {
        var tag = String(current.tagName || "").toLowerCase();
        if (
          tag === "p" ||
          tag === "div" ||
          tag === "ul" ||
          tag === "ol" ||
          tag === "blockquote" ||
          tag === "pre" ||
          tag === "table" ||
          tag === "details" ||
          tag === "hr" ||
          (current.classList &&
            (current.classList.contains("wiki-stepper") ||
              current.classList.contains("wiki-checklist") ||
              current.classList.contains("wiki-expandable") ||
              current.classList.contains("wiki-columns") ||
              current.classList.contains("wiki-image--full")))
        ) {
          return current;
        }
      }
      current = current.parentNode;
    }

    return null;
  }

  function insertNodeInVisualContainerAtRange(container, node, range) {
    if (!container || !node) {
      return;
    }

    var reference = getClosestVisualBlockWithin(container, range && range.commonAncestorContainer);

    if (reference && reference.classList && reference.classList.contains("wiki-box__title")) {
      reference = reference.nextElementSibling || null;
    }

    if (reference && reference.parentNode === container) {
      container.insertBefore(node, reference.nextSibling);
    } else {
      container.appendChild(node);
    }

    if (!node.nextElementSibling) {
      var spacer = document.createElement("p");
      spacer.appendChild(document.createElement("br"));
      container.insertBefore(spacer, node.nextSibling);
    }
  }

  function placeCaretInsideElement(element, collapseToStart) {
    if (!element || !window.getSelection) {
      return;
    }

    var range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(!!collapseToStart);

    var selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function placeCaretAfterInsertedVisualBlock(node) {
    if (!node || !window.getSelection) {
      return;
    }

    var target = node.nextElementSibling || node;
    placeCaretInsideElement(target, true);
  }

  function insertVisualImageNode(imageNode, layout) {
    var editor = state.elements && state.elements.editorVisualEditor;
    if (!editor || !imageNode) {
      return;
    }

    restoreVisualImageSelection();
    rememberVisualEditorHistoryBeforeProgrammaticChange();

    var selection = window.getSelection ? window.getSelection() : null;
    var range = selection && selection.rangeCount ? selection.getRangeAt(0) : null;

    if (!range || !editor.contains(range.commonAncestorContainer)) {
      range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
    }

    range.deleteContents();

    if (normalizeWikiImageLayout(layout) === "inline") {
      var trailingSpace = document.createTextNode(" ");
      range.insertNode(trailingSpace);
      range.insertNode(imageNode);

      var inlineRange = document.createRange();
      inlineRange.setStartAfter(trailingSpace);
      inlineRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(inlineRange);
    } else {
      var paragraph = document.createElement("p");
      paragraph.appendChild(document.createElement("br"));

      range.insertNode(paragraph);
      range.insertNode(imageNode);

      var blockRange = document.createRange();
      blockRange.selectNodeContents(paragraph);
      blockRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(blockRange);
    }

    try {
      editor.focus({ preventScroll: true });
    } catch (_error) {
      editor.focus();
    }
  }

  function openVisualInternalLinkPicker() {
    if (!state.elements || !state.elements.editorInternalLinkPanel || !state.elements.editorInternalLinkInput) {
      return;
    }

    saveVisualSelectionSnapshot();

    var selectedText = getVisualSelectionText() || "";
    var existingLink = findVisualLinkElementFromSelection();

    if (existingLink) {
      selectedText = readString(existingLink.textContent, selectedText || "Pagina wiki");
      state.visualInternalLinkSelection = document.createRange();
      state.visualInternalLinkSelection.selectNodeContents(existingLink);
    } else {
      state.visualInternalLinkSelection = state.visualTooltipSelection ? state.visualTooltipSelection.cloneRange() : null;
    }

    state.internalLinkSelection = {
      mode: "visual",
      selectedText: selectedText,
      element: existingLink || null,
    };
    state.internalLinkQuery = "";

    closeMediaLibraryPanel();
    closeTooltipEditor();
    closeColorPicker();
    closeEditorImagePicker();

    state.elements.editorInternalLinkInput.value = "";
    state.elements.editorInternalLinkPanel.hidden = false;
    renderInternalLinkResults();
    positionEditorPopoverAtPoint(state.elements.editorInternalLinkPanel, getVisualSelectionAnchorPoint());
    state.elements.editorInternalLinkInput.focus();
  }

  function findVisualLinkElementFromSelection() {
    var range = getCurrentVisualRange();
    if (!range) {
      return null;
    }

    var node = range.commonAncestorContainer;
    if (node && node.nodeType === Node.TEXT_NODE) {
      node = node.parentNode;
    }

    return node && node.closest ? node.closest("a") : null;
  }

  function restoreVisualInternalLinkSelection() {
    var range = state.visualInternalLinkSelection || state.visualTooltipSelection;
    if (!range || !window.getSelection || !state.elements || !state.elements.editorVisualEditor) {
      return false;
    }

    var selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);

    try {
      state.elements.editorVisualEditor.focus({ preventScroll: true });
    } catch (_error) {
      state.elements.editorVisualEditor.focus();
    }

    return true;
  }

  function insertVisualInternalDocLink(target) {
    var snapshot = state.internalLinkSelection || {};
    var href = "docs.html?doc=" + readString(target.docKey, "");
    var label = readString(snapshot.selectedText, readString(target.title, "Pagina wiki"));

    if (snapshot.element && snapshot.element.isConnected) {
      rememberVisualEditorHistoryBeforeProgrammaticChange();
      snapshot.element.textContent = label;
      snapshot.element.setAttribute("href", href);
      closeInternalLinkPicker();
      return;
    }

    if (!restoreVisualInternalLinkSelection()) {
      closeInternalLinkPicker();
      return;
    }

    rememberVisualEditorHistoryBeforeProgrammaticChange();
    document.execCommand(
      "insertHTML",
      false,
      '<a href="' + escapeInlineHtmlText(href) + '">' + escapeInlineHtmlText(label) + '</a>'
    );

    closeInternalLinkPicker();
  }

  function openVisualTooltipEditor() {
    if (!state.elements || !state.elements.editorTooltipPanel) {
      return;
    }

    saveVisualSelectionSnapshot();

    var selectedText = getVisualSelectionText() || "testo visibile";
    var existingTooltip = findVisualTooltipElementFromSelection();
    var tooltipText = existingTooltip ? readString(existingTooltip.getAttribute("data-tooltip"), "") : "";
    var tooltipTitle = existingTooltip ? readString(existingTooltip.getAttribute("data-tooltip-title"), "") : "";
    var tooltipType = existingTooltip ? normalizeWikiTooltipType(existingTooltip.getAttribute("data-tooltip-type")) : "base";

    if (existingTooltip) {
      selectedText = readString(existingTooltip.textContent, selectedText);
      state.visualTooltipSelection = document.createRange();
      state.visualTooltipSelection.selectNodeContents(existingTooltip);
    }

    state.tooltipSelection = {
      mode: "visual",
      selectedText: selectedText,
      element: existingTooltip || null,
    };

    closeInternalLinkPicker();
    closeColorPicker();
    closeEditorImagePicker();
    closeMediaLibraryPanel();

    setTooltipEditorFields(selectedText, tooltipText, tooltipTitle, tooltipType);

    state.elements.editorTooltipPanel.hidden = false;
    positionEditorPopoverAtPoint(state.elements.editorTooltipPanel, getVisualSelectionAnchorPoint());

    var focusTarget = state.elements.editorTooltipText || state.elements.editorTooltipVisible;
    if (focusTarget && typeof focusTarget.focus === "function") {
      focusTarget.focus();
      if (tooltipText && typeof focusTarget.select === "function") {
        focusTarget.select();
      }
    }
  }

  function findVisualTooltipElementFromSelection() {
    var range = getCurrentVisualRange();
    if (!range) {
      return null;
    }

    var node = range.commonAncestorContainer;
    if (node && node.nodeType === Node.TEXT_NODE) {
      node = node.parentNode;
    }

    return node && node.closest ? node.closest(".wiki-tooltip") : null;
  }

  function applyVisualTooltipEditorSelection() {
    var snapshot = state.tooltipSelection || {};
    var tooltipValues = readEditorTooltipFormValues(snapshot.selectedText || "testo visibile", "testo tooltip");
    var visibleText = tooltipValues.visibleText;
    var tooltipText = tooltipValues.tooltipText;
    var tooltipTitle = tooltipValues.tooltipTitle;
    var tooltipType = tooltipValues.tooltipType;

    if (snapshot.element && snapshot.element.isConnected) {
      rememberVisualEditorHistoryBeforeProgrammaticChange();
      snapshot.element.textContent = visibleText;
      snapshot.element.setAttribute("data-tooltip", tooltipText);
      snapshot.element.setAttribute("data-tooltip-type", tooltipType);
      snapshot.element.setAttribute("tabindex", "0");
      if (tooltipTitle) {
        snapshot.element.setAttribute("data-tooltip-title", tooltipTitle);
      } else {
        snapshot.element.removeAttribute("data-tooltip-title");
      }
      applyWikiTooltipTypeClass(snapshot.element, tooltipType);
      closeTooltipEditor();
      return;
    }

    if (!restoreVisualSelectionSnapshot()) {
      closeTooltipEditor();
      return;
    }

    rememberVisualEditorHistoryBeforeProgrammaticChange();
    document.execCommand("insertHTML", false, buildTooltipHtml(visibleText, tooltipText, tooltipTitle, tooltipType));
    closeTooltipEditor();
  }

  function openVisualBoxPicker() {
    var picker = ensureEditorBoxPicker();
    if (!picker || !state.elements || !state.elements.editorVisualEditor) {
      return;
    }

    saveVisualSelectionSnapshot();

    var existingBox = findVisualWikiBoxElementFromSelection();
    if (existingBox) {
      state.visualBoxSelection = null;
      state.boxSelection = {
        mode: "visual",
        element: existingBox,
        selectedText: "",
      };
      state.boxTitle = readVisualWikiBoxTitle(existingBox);
    } else {
      state.visualBoxSelection = state.visualTooltipSelection ? state.visualTooltipSelection.cloneRange() : null;
      state.boxSelection = {
        mode: "visual",
        element: null,
        selectedText: getVisualSelectionText(),
      };
      state.boxTitle = "";
    }

    closeInternalLinkPicker();
    closeColorPicker();
    closeTooltipEditor();
    closeEditorImagePicker();
    closeMediaLibraryPanel();

    syncEditorBoxPickerTitleInput();
    picker.hidden = false;
    positionEditorPopoverAtPoint(picker, getVisualSelectionAnchorPoint());
  }

  function findVisualWikiBoxElementFromSelection() {
    var range = getCurrentVisualRange();
    if (!range) {
      return null;
    }

    var node = range.commonAncestorContainer;
    if (node && node.nodeType === Node.TEXT_NODE) {
      node = node.parentNode;
    }

    return node && node.closest ? node.closest(".wiki-box") : null;
  }

  function restoreVisualBoxSelection() {
    var range = state.visualBoxSelection || state.visualTooltipSelection;
    if (!range || !window.getSelection || !state.elements || !state.elements.editorVisualEditor) {
      return false;
    }

    var selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);

    try {
      state.elements.editorVisualEditor.focus({ preventScroll: true });
    } catch (_error) {
      state.elements.editorVisualEditor.focus();
    }

    return true;
  }

  function updateVisualWikiBoxType(box, type) {
    if (!box || !box.classList) {
      return;
    }

    var boxType = normalizeWikiBoxType(type);
    var keys = Object.keys(WIKI_BOX_TYPES);

    for (var i = 0; i < keys.length; i += 1) {
      box.classList.remove("wiki-box--" + keys[i]);
    }

    box.classList.add("wiki-box--" + boxType);

    if (!readString(box.getAttribute("data-wiki-box-icon"), "")) {
      setVisualWikiBoxIcon(box, readDefaultWikiBoxIcon(boxType), { skipData: true });
    }
  }

  function readDefaultWikiBoxIcon(type) {
    var boxType = normalizeWikiBoxType(type);
    var meta = WIKI_BOX_TYPES[boxType] || WIKI_BOX_TYPES.info;
    return meta.icon;
  }

  function isSafeIconToken(token) {
    var text = String(token || "");
    if (!text) {
      return false;
    }

    for (var i = 0; i < text.length; i += 1) {
      var code = text.charCodeAt(i);
      var isNumber = code >= 48 && code <= 57;
      var isUpper = code >= 65 && code <= 90;
      var isLower = code >= 97 && code <= 122;
      var isDash = code === 45;
      var isUnderscore = code === 95;

      if (!isNumber && !isUpper && !isLower && !isDash && !isUnderscore) {
        return false;
      }
    }

    return true;
  }

  function normalizeWikiBoxIconClass(value, fallback) {
    var raw = readString(value, "");
    var parts = raw.split(" ");
    var safeParts = [];

    for (var i = 0; i < parts.length; i += 1) {
      if (isSafeIconToken(parts[i])) {
        safeParts.push(parts[i]);
      }
    }

    var clean = safeParts.join(" ").trim();
    if (!clean || clean.indexOf("fa-") === -1) {
      return fallback || readDefaultWikiBoxIcon("info");
    }

    return clean;
  }

  function readWikiBoxTypeFromElement(box) {
    var keys = Object.keys(WIKI_BOX_TYPES);
    for (var i = 0; i < keys.length; i += 1) {
      if (box && box.classList && box.classList.contains("wiki-box--" + keys[i])) {
        return keys[i];
      }
    }

    return "info";
  }

  function readWikiBoxIconClass(box) {
    var type = readWikiBoxTypeFromElement(box);
    var fallback = readDefaultWikiBoxIcon(type);
    var custom = readString(box && box.getAttribute && box.getAttribute("data-wiki-box-icon"), "");

    if (custom) {
      return normalizeWikiBoxIconClass(custom, fallback);
    }

    var icon = box && box.querySelector ? box.querySelector(".wiki-box__icon i") : null;
    return normalizeWikiBoxIconClass(icon && icon.className, fallback);
  }

  function setVisualWikiBoxIcon(box, iconClass, options) {
    if (!box || !box.querySelector) {
      return;
    }

    var opts = options || {};
    var normalized = normalizeWikiBoxIconClass(iconClass, readDefaultWikiBoxIcon(readWikiBoxTypeFromElement(box)));
    var icon = box.querySelector(".wiki-box__icon i");

    if (icon) {
      icon.className = normalized;
    }

    if (!opts.skipData) {
      box.setAttribute("data-wiki-box-icon", normalized);
    }
  }

  function readVisualWikiBoxTitle(box) {
    var titleNode = box && box.querySelector ? box.querySelector(".wiki-box__title") : null;
    return readString(titleNode && titleNode.textContent, "");
  }

  function updateVisualWikiBoxTitle(box, title) {
    if (!box || !box.querySelector) {
      return;
    }

    var contentWrap = box.querySelector(".wiki-box__content") || box;
    var titleNode = contentWrap.querySelector(".wiki-box__title");
    var value = readString(title, "");

    if (!value) {
      if (titleNode) {
        titleNode.remove();
      }
      box.classList.remove("has-title");
      return;
    }

    if (!titleNode) {
      titleNode = document.createElement("p");
      titleNode.className = "wiki-box__title";
      contentWrap.insertBefore(titleNode, contentWrap.firstChild);
    }

    titleNode.textContent = value;
    box.classList.add("has-title");
  }

  function insertVisualWikiBox(type, contentText, title) {
    if (!state.elements || !state.elements.editorVisualEditor) {
      return;
    }

    var boxType = normalizeWikiBoxType(type);
    var meta = WIKI_BOX_TYPES[boxType] || WIKI_BOX_TYPES.info;
    var content = readString(contentText, "Testo del box");
    var titleText = readString(title, "");
    var editor = state.elements.editorVisualEditor;
    var selection = window.getSelection ? window.getSelection() : null;
    var range = selection && selection.rangeCount ? selection.getRangeAt(0) : null;

    if (!range || !editor.contains(range.commonAncestorContainer)) {
      range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
    }

    rememberVisualEditorHistoryBeforeProgrammaticChange();

    var box = document.createElement("aside");
    box.className = "wiki-box wiki-box--" + boxType;
    box.setAttribute("role", "note");

    var iconWrap = document.createElement("div");
    iconWrap.className = "wiki-box__icon";
    iconWrap.setAttribute("aria-hidden", "true");
    iconWrap.setAttribute("contenteditable", "false");
    iconWrap.setAttribute("title", "Cambia icona");
    iconWrap.setAttribute("data-tooltip", "Cambia icona");

    var icon = document.createElement("i");
    icon.className = meta.icon;
    icon.setAttribute("aria-hidden", "true");
    iconWrap.appendChild(icon);

    var contentWrap = document.createElement("div");
    contentWrap.className = "wiki-box__content";

    if (titleText) {
      var titleParagraph = document.createElement("p");
      titleParagraph.className = "wiki-box__title";
      titleParagraph.textContent = titleText;
      contentWrap.appendChild(titleParagraph);
      box.classList.add("has-title");
    }

    var paragraph = document.createElement("p");
    paragraph.textContent = content;
    contentWrap.appendChild(paragraph);

    box.appendChild(iconWrap);
    box.appendChild(contentWrap);

    var spacer = document.createElement("p");
    spacer.appendChild(document.createElement("br"));

    range.deleteContents();
    range.insertNode(spacer);
    range.insertNode(box);

    var nextRange = document.createRange();
    nextRange.selectNodeContents(paragraph);
    nextRange.collapse(false);
    selection.removeAllRanges();
    selection.addRange(nextRange);

    try {
      editor.focus({ preventScroll: true });
    } catch (_error) {
      editor.focus();
    }
  }

  function getVisualEditorHistorySnapshot(editor) {
    if (!editor) {
      return null;
    }

    var panel = getEditorModalScrollContainer(editor);

    return {
      mode: "visual",
      html: String(editor.innerHTML || ""),
      scrollTop: typeof editor.scrollTop === "number" ? editor.scrollTop : 0,
      scrollLeft: typeof editor.scrollLeft === "number" ? editor.scrollLeft : 0,
      panelScrollTop: panel && typeof panel.scrollTop === "number" ? panel.scrollTop : 0,
    };
  }

  function getActiveEditorHistorySnapshot() {
    if (isVisualEditorMode() && state.elements && state.elements.editorVisualEditor) {
      return getVisualEditorHistorySnapshot(state.elements.editorVisualEditor);
    }

    return getEditorHistorySnapshot(getEditorMarkdownTextarea());
  }

  function restoreVisualEditorHistorySnapshot(snapshot) {
    var editor = state.elements && state.elements.editorVisualEditor;
    if (!editor || !snapshot) {
      return;
    }

    var panel = getEditorModalScrollContainer(editor);

    editor.innerHTML = String(snapshot.html || "");
    prepareVisualEditorDomForEditing(editor);

    editor.scrollTop = typeof snapshot.scrollTop === "number" ? snapshot.scrollTop : 0;
    editor.scrollLeft = typeof snapshot.scrollLeft === "number" ? snapshot.scrollLeft : 0;

    if (panel && typeof panel.scrollTop === "number") {
      panel.scrollTop = typeof snapshot.panelScrollTop === "number" ? snapshot.panelScrollTop : 0;
    }

    placeCaretAtVisualEditorEnd(editor);

    window.requestAnimationFrame(function restoreVisualEditorScrollPosition() {
      editor.scrollTop = typeof snapshot.scrollTop === "number" ? snapshot.scrollTop : 0;
      editor.scrollLeft = typeof snapshot.scrollLeft === "number" ? snapshot.scrollLeft : 0;

      if (panel && typeof panel.scrollTop === "number") {
        panel.scrollTop = typeof snapshot.panelScrollTop === "number" ? snapshot.panelScrollTop : 0;
      }
    });
  }

  function placeCaretAtVisualEditorEnd(editor) {
    if (!editor || !window.getSelection) {
      return;
    }

    try {
      editor.focus({ preventScroll: true });
    } catch (_error) {
      editor.focus();
    }

    var range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);

    var selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function rememberVisualEditorHistoryBeforeNativeInput(event) {
    if (state.editorHistoryRestoring || !isVisualEditorMode() || !shouldTrackNativeEditorInput(event)) {
      return;
    }

    state.editorHistoryPendingSnapshot = getVisualEditorHistorySnapshot(state.elements.editorVisualEditor);
  }

  function commitVisualEditorHistoryAfterNativeInput(event) {
    if (state.editorHistoryRestoring || !isVisualEditorMode() || !shouldTrackNativeEditorInput(event)) {
      state.editorHistoryPendingSnapshot = null;
      return;
    }

    var snapshot = state.editorHistoryPendingSnapshot;
    state.editorHistoryPendingSnapshot = null;

    if (!snapshot) {
      return;
    }

    pushEditorHistorySnapshot(snapshot);
  }

  function rememberVisualEditorHistoryBeforeProgrammaticChange() {
    if (state.editorHistoryRestoring || !isVisualEditorMode() || !state.elements || !state.elements.editorVisualEditor) {
      return;
    }

    pushEditorHistoryCheckpoint(getVisualEditorHistorySnapshot(state.elements.editorVisualEditor));
  }

  function handleVisualEditorBoxDeletionKeydown(event) {
    if (!event || event.defaultPrevented || !isVisualEditorMode()) {
      return false;
    }

    if (event.key !== "Backspace" && event.key !== "Delete") {
      return false;
    }

    if (event.ctrlKey || event.metaKey || event.altKey) {
      return false;
    }

    var editor = state.elements && state.elements.editorVisualEditor;
    var range = getCurrentVisualRange();
    if (!editor || !range || !range.collapsed || !editor.contains(range.commonAncestorContainer)) {
      return false;
    }

    var boxContent = findVisualWikiBoxContentFromRange(range);
    if (!boxContent) {
      return false;
    }

    var currentBlock = getClosestVisualBlockWithin(boxContent, range.commonAncestorContainer);
    if (!currentBlock || currentBlock === boxContent || currentBlock.classList.contains("wiki-box__title")) {
      return false;
    }

    if (event.key === "Backspace") {
      if (!isVisualCaretAtStartOfElement(currentBlock, range)) {
        return false;
      }

      event.preventDefault();
      mergeVisualBoxBlockBackward(boxContent, currentBlock);
      return true;
    }

    if (!isVisualCaretAtEndOfElement(currentBlock, range)) {
      return false;
    }

    event.preventDefault();
    mergeVisualBoxBlockForward(boxContent, currentBlock);
    return true;
  }

  function isVisualCaretAtStartOfElement(element, range) {
    if (!element || !range) {
      return false;
    }

    var probe = document.createRange();
    probe.selectNodeContents(element);
    probe.setEnd(range.startContainer, range.startOffset);
    return probe.toString().length === 0;
  }

  function isVisualCaretAtEndOfElement(element, range) {
    if (!element || !range) {
      return false;
    }

    var probe = document.createRange();
    probe.selectNodeContents(element);
    probe.setStart(range.startContainer, range.startOffset);
    return probe.toString().length === 0;
  }

  function getPreviousEditableBoxBlock(boxContent, block) {
    var previous = block ? block.previousElementSibling : null;

    while (previous && previous.classList && previous.classList.contains("wiki-box__title")) {
      previous = previous.previousElementSibling;
    }

    return previous && previous.parentNode === boxContent ? previous : null;
  }

  function getNextEditableBoxBlock(boxContent, block) {
    var next = block ? block.nextElementSibling : null;

    while (next && next.classList && next.classList.contains("wiki-box__title")) {
      next = next.nextElementSibling;
    }

    return next && next.parentNode === boxContent ? next : null;
  }

  function ensureBoxContentHasEditableParagraph(boxContent) {
    if (!boxContent || !boxContent.isConnected) {
      return null;
    }

    var editable = boxContent.querySelector("p:not(.wiki-box__title), div, ul, ol, blockquote, pre, table, details, hr, .wiki-stepper, .wiki-checklist, .wiki-expandable, .wiki-columns, .wiki-image--full");
    if (editable) {
      return editable;
    }

    var paragraph = document.createElement("p");
    paragraph.appendChild(document.createElement("br"));
    boxContent.appendChild(paragraph);
    return paragraph;
  }

  function mergeVisualBoxBlockBackward(boxContent, currentBlock) {
    var editor = state.elements && state.elements.editorVisualEditor;
    if (!editor || !boxContent || !currentBlock) {
      return;
    }

    var previous = getPreviousEditableBoxBlock(boxContent, currentBlock);

    rememberVisualEditorHistoryBeforeProgrammaticChange();

    if (!previous) {
      return;
    }

    var caretTarget = previous;
    var offsetNode = document.createTextNode(" ");
    previous.appendChild(offsetNode);

    while (currentBlock.firstChild) {
      previous.appendChild(currentBlock.firstChild);
    }

    currentBlock.remove();
    prepareVisualEditorDomForEditing(editor);
    placeCaretAfterNode(offsetNode);
  }

  function mergeVisualBoxBlockForward(boxContent, currentBlock) {
    var editor = state.elements && state.elements.editorVisualEditor;
    if (!editor || !boxContent || !currentBlock) {
      return;
    }

    var next = getNextEditableBoxBlock(boxContent, currentBlock);

    rememberVisualEditorHistoryBeforeProgrammaticChange();

    if (!next) {
      ensureBoxContentHasEditableParagraph(boxContent);
      return;
    }

    var offsetNode = document.createTextNode(" ");
    currentBlock.appendChild(offsetNode);

    while (next.firstChild) {
      currentBlock.appendChild(next.firstChild);
    }

    next.remove();
    prepareVisualEditorDomForEditing(editor);
    placeCaretAfterNode(offsetNode);
  }

  function placeCaretAfterNode(node) {
    if (!node || !node.parentNode || !window.getSelection) {
      return;
    }

    var range = document.createRange();
    range.setStartAfter(node);
    range.collapse(true);

    var selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);

    var editor = state.elements && state.elements.editorVisualEditor;
    if (editor) {
      try {
        editor.focus({ preventScroll: true });
      } catch (_error) {
        editor.focus();
      }
    }
  }

  function handleVisualEditorShortcut(event) {
    if (!event || event.defaultPrevented || !isPrimaryModifierPressed(event) || event.altKey) {
      return;
    }

    var key = String(event.key || "").toLowerCase();

    if (key === "1" || key === "2" || key === "3") {
      event.preventDefault();
      applyMarkdownToolbarAction("h" + key);
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

    if (key === "1" || key === "2" || key === "3") {
      event.preventDefault();
      applyMarkdownToolbarAction("h" + key);
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

  function ensureEditorMarkdownToolbarEnhancements() {
    if (!state.elements || !state.elements.editorMarkdownToolbar) {
      return;
    }

    var toolbar = state.elements.editorMarkdownToolbar;
    var existingTabs = toolbar.querySelector("[data-docs-visual-tabs]");
    toolbar.innerHTML = "";

    if (existingTabs) {
      toolbar.appendChild(existingTabs);
    }

    var formatGroup = document.createElement("div");
    formatGroup.className = "docs-md-toolbar__group docs-md-toolbar__group--format";
    formatGroup.setAttribute("data-md-toolbar-group", "format");

    var formatTrigger = document.createElement("button");
    formatTrigger.type = "button";
    formatTrigger.className = "docs-md-toolbar__format-trigger";
    formatTrigger.setAttribute("data-md-format-trigger", "");
    formatTrigger.setAttribute("aria-haspopup", "true");
    formatTrigger.setAttribute("aria-expanded", "false");
    formatTrigger.setAttribute("aria-label", "Formato contenuto");
    formatTrigger.setAttribute("data-tooltip", "Formato contenuto");
    formatTrigger.innerHTML =
      '<i class="fa-solid fa-paragraph" aria-hidden="true"></i>' +
      '<span data-md-format-label>Formato</span>' +
      '<i class="fa-solid fa-chevron-down docs-md-toolbar__format-chevron" aria-hidden="true"></i>';

    var formatMenu = document.createElement("div");
    formatMenu.className = "docs-editor-md-context docs-md-format-menu";
    formatMenu.setAttribute("data-md-format-menu", "");
    formatMenu.setAttribute("role", "menu");
    formatMenu.setAttribute("aria-label", "Formato contenuto");
    formatMenu.hidden = true;

    var options = [
      { action: "paragraph", icon: "fa-solid fa-paragraph", label: "Testo base" },
      { separator: true },
      { action: "h1", icon: "fa-solid fa-heading", label: "H1" },
      { action: "h2", icon: "fa-solid fa-heading", label: "H2" },
      { action: "h3", icon: "fa-solid fa-text-height", label: "H3" },
      { separator: true },
      { action: "ul", icon: "fa-solid fa-list-ul", label: "Lista puntata" },
      { action: "ol", icon: "fa-solid fa-list-ol", label: "Lista numerata" },
      { action: "checklist", icon: "fa-solid fa-square-check", label: "Lista checkbox" },
    ];

    renderEditorFormatMenuActions(formatMenu, options);

    formatTrigger.addEventListener("mousedown", function onFormatTriggerMouseDown(event) {
      event.preventDefault();
    });

    formatTrigger.addEventListener("click", function onFormatTriggerClick(event) {
      event.preventDefault();
      event.stopPropagation();
      toggleEditorFormatMenu(formatTrigger, formatMenu);
    });

    formatMenu.addEventListener("mousedown", function onFormatMenuMouseDown(event) {
      event.preventDefault();
    });

    formatMenu.addEventListener("click", function onFormatMenuClick(event) {
      var button = event.target.closest("button[data-md-format-action]");
      if (!button || button.disabled) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      var action = readString(button.getAttribute("data-md-format-action"), "");
      closeEditorFormatMenu(formatTrigger, formatMenu);
      applyMarkdownToolbarAction(action);
    });

    formatGroup.appendChild(formatTrigger);
    document.body.appendChild(formatMenu);
    toolbar.appendChild(formatGroup);

    appendEditorToolbarGroup(toolbar, [
      { action: "bold", icon: "fa-solid fa-bold", label: "Grassetto" },
      { action: "italic", icon: "fa-solid fa-italic", label: "Corsivo" },
      { action: "underline", icon: "fa-solid fa-underline", label: "Sottolineato" },
      { action: "text-color", icon: "fa-solid fa-palette", label: "Colore testo" },
    ]);

    appendEditorToolbarGroup(toolbar, [
      { action: "box", icon: "fa-solid fa-square-caret-right", label: "Box" },
      { action: "expandable", icon: "fa-solid fa-square-caret-down", label: "Expandable" },
      { action: "quote", icon: "fa-solid fa-quote-left", label: "Citazione" },
    ]);

    appendEditorToolbarGroup(toolbar, [
      { action: "link", icon: "fa-solid fa-link", label: "Link" },
      { action: "internal-link", icon: "fa-solid fa-book-bookmark", label: "Link interno" },
      { action: "tooltip", icon: "fa-solid fa-circle-info", label: "Tooltip" },
    ]);

    appendEditorToolbarGroup(toolbar, [
      { action: "columns", icon: "fa-solid fa-table-columns", label: "Colonne" },
      { action: "table", icon: "fa-solid fa-table", label: "Tabella" },
      { action: "divider", icon: "fa-solid fa-minus", label: "Divisore" },
    ]);

    appendEditorToolbarGroup(toolbar, [
      { action: "image", icon: "fa-solid fa-image", label: "Immagine" },
    ]);

    appendEditorToolbarGroup(toolbar, [
      { action: "inline-code", icon: "fa-solid fa-code", label: "Codice inline" },
      { action: "code-block", icon: "fa-solid fa-file-code", label: "Blocco codice" },
    ]);
  }

  function renderEditorFormatMenuActions(menu, actions) {
    if (!menu || !Array.isArray(actions)) {
      return;
    }

    menu.innerHTML = "";

    for (var i = 0; i < actions.length; i += 1) {
      var item = actions[i];

      if (item.separator) {
        var separator = document.createElement("span");
        separator.className = "docs-editor-md-context__separator";
        separator.setAttribute("aria-hidden", "true");
        menu.appendChild(separator);
        continue;
      }

      var button = document.createElement("button");
      button.type = "button";
      button.className = "docs-editor-md-context__action";
      button.setAttribute("data-md-format-action", item.action);
      button.setAttribute("role", "menuitem");
      button.setAttribute("aria-label", item.label);

      var icon = document.createElement("i");
      icon.className = item.icon;
      icon.setAttribute("aria-hidden", "true");
      button.appendChild(icon);

      var label = document.createElement("span");
      label.textContent = item.label;
      button.appendChild(label);

      menu.appendChild(button);
    }
  }

  function toggleEditorFormatMenu(trigger, menu) {
    if (!trigger) {
      return;
    }

    var resolvedMenu = menu || document.querySelector("[data-md-format-menu]");
    if (!resolvedMenu) {
      return;
    }

    if (!resolvedMenu.hidden) {
      closeEditorFormatMenu(trigger, resolvedMenu);
      return;
    }

    closeEditorMarkdownContextMenu();
    closeLinkEditor();
    closeInternalLinkPicker();
    closeColorPicker();
    closeTooltipEditor();
    closeEditorImagePicker();
    closeEditorBoxPicker();
    closeEditorBoxIconPicker();
    closeMediaLibraryPanel();

    resolvedMenu.hidden = false;
    positionEditorFormatMenu(trigger, resolvedMenu);
    trigger.classList.add("is-open");
    trigger.setAttribute("aria-expanded", "true");
  }

  function positionEditorFormatMenu(trigger, menu) {
    if (!trigger || !menu) {
      return;
    }

    prepareEditorPopoverPanel(menu);

    var viewportPadding = 8;
    var rect = trigger.getBoundingClientRect();
    menu.style.left = "0px";
    menu.style.top = "0px";
    menu.style.right = "auto";
    menu.style.bottom = "auto";
    menu.style.maxHeight = Math.max(180, window.innerHeight - viewportPadding * 2) + "px";
    menu.style.visibility = "hidden";

    var menuRect = menu.getBoundingClientRect();
    var left = rect.left;
    var top = rect.bottom + 8;

    if (left + menuRect.width > window.innerWidth - viewportPadding) {
      left = Math.max(viewportPadding, window.innerWidth - menuRect.width - viewportPadding);
    }

    if (top + menuRect.height > window.innerHeight - viewportPadding) {
      top = Math.max(viewportPadding, rect.top - menuRect.height - 8);
    }

    menu.style.left = Math.round(left) + "px";
    menu.style.top = Math.round(top) + "px";
    menu.style.visibility = "";
  }

  function closeEditorFormatMenu(trigger, menu) {
    var resolvedMenu = menu || document.querySelector("[data-md-format-menu]");
    var resolvedTrigger = trigger || (state.elements && state.elements.editorMarkdownToolbar ? state.elements.editorMarkdownToolbar.querySelector("[data-md-format-trigger]") : null);

    if (resolvedMenu) {
      resolvedMenu.hidden = true;
      resetEditorPopoverPlacement(resolvedMenu);
    }

    if (resolvedTrigger) {
      resolvedTrigger.classList.remove("is-open");
      resolvedTrigger.setAttribute("aria-expanded", "false");
    }
  }

  function isEventInsideEditorFormatMenu(target) {
    if (!target) {
      return false;
    }

    if (target.closest && target.closest("[data-md-format-menu]")) {
      return true;
    }

    if (
      state.elements &&
      state.elements.editorMarkdownToolbar &&
      target.closest &&
      target.closest("[data-md-format-trigger]") &&
      state.elements.editorMarkdownToolbar.contains(target)
    ) {
      return true;
    }

    return false;
  }

  function appendEditorToolbarGroup(toolbar, items) {
    if (!toolbar || !Array.isArray(items) || !items.length) {
      return null;
    }

    var group = document.createElement("div");
    group.className = "docs-md-toolbar__group";

    for (var i = 0; i < items.length; i += 1) {
      group.appendChild(createEditorToolbarButton(items[i].action, items[i].icon, items[i].label));
    }

    toolbar.appendChild(group);
    return group;
  }

  function createEditorToolbarButton(action, iconClass, label) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "docs-md-toolbar__btn";
    button.setAttribute("data-md-action", action);
    button.setAttribute("aria-label", label);
    button.setAttribute("data-tooltip", label);
    button.removeAttribute("title");

    var icon = document.createElement("i");
    icon.className = iconClass;
    icon.setAttribute("aria-hidden", "true");
    button.appendChild(icon);

    return button;
  }

  function ensureEditorToolbarButton(action, iconClass, label, insertAfterSelector) {
    if (!state.elements || !state.elements.editorMarkdownToolbar) {
      return null;
    }

    var toolbar = state.elements.editorMarkdownToolbar;
    if (toolbar.querySelector('button[data-md-action="' + action + '"]')) {
      return toolbar.querySelector('button[data-md-action="' + action + '"]');
    }

    var button = document.createElement("button");
    button.type = "button";
    button.className = "docs-md-toolbar__btn";
    button.setAttribute("data-md-action", action);
    button.setAttribute("aria-label", label);
    button.setAttribute("title", label);
    button.setAttribute("data-tooltip", label);

    var icon = document.createElement("i");
    icon.className = iconClass;
    icon.setAttribute("aria-hidden", "true");
    button.appendChild(icon);

    var insertAfter = insertAfterSelector ? toolbar.querySelector(insertAfterSelector) : null;
    if (insertAfter && insertAfter.nextSibling) {
      toolbar.insertBefore(button, insertAfter.nextSibling);
    } else if (insertAfter) {
      toolbar.appendChild(button);
    } else {
      toolbar.appendChild(button);
    }

    return button;
  }

  function buildEditorMarkdownContextActions(mode) {
    if (mode === "insert") {
      return EDITOR_BLOCK_INSERT_ACTIONS;
    }

    return [
      {
        submenu: true,
        icon: "fa-solid fa-heading",
        label: "Titolo",
        items: [
          { action: "h1", icon: "fa-solid fa-heading", label: "Titolo H1" },
          { action: "h2", icon: "fa-solid fa-heading", label: "Titolo H2" },
          { action: "h3", icon: "fa-solid fa-text-height", label: "Titolo H3" },
        ],
      },
      {
        submenu: true,
        icon: "fa-solid fa-font",
        label: "Formattazione",
        items: [
          { action: "bold", icon: "fa-solid fa-bold", label: "Grassetto" },
          { action: "italic", icon: "fa-solid fa-italic", label: "Corsivo" },
          { action: "underline", icon: "fa-solid fa-underline", label: "Sottolineato" },
        ],
      },
      {
        submenu: true,
        icon: "fa-solid fa-palette",
        label: "Colore testo",
        items: buildEditorColorContextActions(),
      },
      { separator: true },
      { action: "ul", icon: "fa-solid fa-list-ul", label: "Lista puntata" },
      { action: "ol", icon: "fa-solid fa-list-ol", label: "Lista numerata" },
      { action: "checklist", icon: "fa-solid fa-square-check", label: "Checklist" },
      { separator: true },
      { action: "quote", icon: "fa-solid fa-quote-left", label: "Citazione" },
      { action: "box", icon: "fa-solid fa-square-caret-right", label: "Box" },
      { action: "stepper", icon: "fa-solid fa-list-ol", label: "Stepper" },
      { action: "expandable", icon: "fa-solid fa-square-caret-down", label: "Expandable" },
      { action: "columns", icon: "fa-solid fa-table-columns", label: "Columns" },
      { action: "table", icon: "fa-solid fa-table", label: "Tabella" },
      { action: "divider", icon: "fa-solid fa-minus", label: "Divisore" },
      { separator: true },
      { action: "link", icon: "fa-solid fa-link", label: "Link" },
      { action: "internal-link", icon: "fa-solid fa-book-bookmark", label: "Link interno" },
      { action: "tooltip", icon: "fa-solid fa-circle-info", label: "Tooltip" },
      { action: "image", icon: "fa-solid fa-image", label: "Immagine" },
      { separator: true },
      { action: "inline-code", icon: "fa-solid fa-code", label: "Codice inline" },
      { action: "code-block", icon: "fa-solid fa-file-code", label: "Blocco codice" },
    ];
  }

  function buildEditorColorContextActions() {
    var choices = Array.isArray(state.wikiColorChoices) ? state.wikiColorChoices : [];
    var actions = [
      { action: "color-clear", icon: "fa-solid fa-droplet-slash", label: "Colore base" },
    ];
    var standard = [];
    var tooltip = [];

    for (var i = 0; i < choices.length; i += 1) {
      var choice = choices[i];
      if (!choice || !choice.value) {
        continue;
      }

      var color = normalizeWikiColor(choice.value);
      var item = {
        action: "color:" + color,
        icon: "fa-solid fa-circle wiki-color wiki-color-" + color,
        label: choice.label,
      };

      if (choice.tooltipType) {
        var type = normalizeWikiTooltipType(choice.tooltipType);
        var meta = readWikiTooltipTypeMeta(type);
        item.icon = meta.icon + " wiki-color wiki-color-" + color;
      }

      if (choice.group === "tooltip") {
        tooltip.push(item);
      } else {
        standard.push(item);
      }
    }

    if (standard.length) {
      actions.push({ separator: true });
      actions = actions.concat(standard);
    }

    if (tooltip.length) {
      actions.push({ separator: true });
      actions = actions.concat(tooltip);
    }

    return actions;
  }

  function ensureEditorMarkdownContextMenu() {
    if (state.editorContextMenu && state.editorContextMenu.isConnected) {
      return state.editorContextMenu;
    }


    var menu = document.createElement("div");
    menu.className = "docs-editor-md-context";
    menu.setAttribute("data-docs-editor-md-context", "");
    menu.setAttribute("role", "menu");
    menu.setAttribute("aria-label", "Strumenti editor");
    menu.hidden = true;

    renderEditorMarkdownContextMenuActions(menu, EDITOR_MARKDOWN_CONTEXT_ACTIONS);

    menu.addEventListener("mousedown", function onEditorContextMouseDown(event) {
      event.preventDefault();
    });

    menu.addEventListener("click", function onEditorContextClick(event) {
      var submenuTrigger = event.target.closest("button[data-md-context-submenu-trigger]");
      if (submenuTrigger && menu.contains(submenuTrigger)) {
        event.preventDefault();
        event.stopPropagation();
        toggleEditorContextSubmenu(submenuTrigger);
        return;
      }

      var button = event.target.closest("button[data-md-context-action]");
      if (!button || button.disabled) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      runEditorMarkdownContextAction(button.getAttribute("data-md-context-action"));
    });

    menu.addEventListener("mouseover", function onEditorContextMouseOver(event) {
      var submenuTrigger = event.target.closest("button[data-md-context-submenu-trigger]");
      if (!submenuTrigger || !menu.contains(submenuTrigger) || submenuTrigger.disabled) {
        return;
      }

      openEditorContextSubmenu(submenuTrigger);
    });

    document.body.appendChild(menu);
    state.editorContextMenu = menu;
    return menu;
  }

  function renderEditorMarkdownContextMenuActions(menu, actions) {
    if (!menu) {
      return;
    }

    menu.innerHTML = "";

    var items = Array.isArray(actions) && actions.length ? actions : EDITOR_MARKDOWN_CONTEXT_ACTIONS;
    appendEditorMarkdownContextMenuItems(menu, items);
  }

  function appendEditorMarkdownContextMenuItems(container, items) {
    if (!container || !Array.isArray(items)) {
      return;
    }

    for (var i = 0; i < items.length; i += 1) {
      var item = items[i];

      if (item.separator) {
        var separator = document.createElement("span");
        separator.className = "docs-editor-md-context__separator";
        separator.setAttribute("aria-hidden", "true");
        container.appendChild(separator);
        continue;
      }

      if (item.submenu && Array.isArray(item.items) && item.items.length) {
        container.appendChild(createEditorContextSubmenuItem(item));
        continue;
      }

      container.appendChild(createEditorContextActionButton(item, "data-md-context-action"));
    }
  }

  function createEditorContextActionButton(item, actionAttribute) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "docs-editor-md-context__action";
    button.setAttribute(actionAttribute, item.action || "");
    button.setAttribute("role", "menuitem");
    button.setAttribute("aria-label", item.label || "Azione");

    var icon = document.createElement("i");
    icon.className = item.icon || "fa-solid fa-circle";
    icon.setAttribute("aria-hidden", "true");
    button.appendChild(icon);

    var label = document.createElement("span");
    label.textContent = item.label || "Azione";
    button.appendChild(label);

    return button;
  }

  function createEditorContextSubmenuItem(item) {
    var wrapper = document.createElement("div");
    wrapper.className = "docs-editor-md-context__submenu-wrap";
    wrapper.style.position = "relative";

    var trigger = createEditorContextActionButton(item, "data-md-context-submenu-trigger");
    trigger.classList.add("docs-editor-md-context__action--submenu");
    trigger.style.display = "flex";
    trigger.style.alignItems = "center";
    trigger.style.width = "100%";
    trigger.setAttribute("aria-haspopup", "true");
    trigger.setAttribute("aria-expanded", "false");

    var chevron = document.createElement("i");
    chevron.className = "fa-solid fa-chevron-right docs-editor-md-context__submenu-chevron";
    chevron.style.marginLeft = "auto";
    chevron.setAttribute("aria-hidden", "true");
    trigger.appendChild(chevron);

    var submenu = document.createElement("div");
    submenu.className = "docs-editor-md-context docs-editor-md-context__submenu";
    submenu.setAttribute("role", "menu");
    submenu.setAttribute("aria-label", item.label || "Sottomenu");
    submenu.hidden = true;
    submenu.style.position = "absolute";
    submenu.style.left = "calc(100% + 6px)";
    submenu.style.top = "0px";
    submenu.style.minWidth = "210px";
    submenu.style.zIndex = "10070";

    appendEditorMarkdownContextMenuItems(submenu, item.items);

    wrapper.appendChild(trigger);
    wrapper.appendChild(submenu);
    return wrapper;
  }

  function toggleEditorContextSubmenu(trigger) {
    if (!trigger) {
      return;
    }

    var wrapper = trigger.closest(".docs-editor-md-context__submenu-wrap");
    var submenu = wrapper ? wrapper.querySelector(":scope > .docs-editor-md-context__submenu") : null;
    if (!submenu) {
      return;
    }

    if (!submenu.hidden) {
      closeEditorContextSubmenu(wrapper);
      return;
    }

    openEditorContextSubmenu(trigger);
  }

  function openEditorContextSubmenu(trigger) {
    if (!trigger || trigger.disabled) {
      return;
    }

    var wrapper = trigger.closest(".docs-editor-md-context__submenu-wrap");
    var submenu = wrapper ? wrapper.querySelector(":scope > .docs-editor-md-context__submenu") : null;
    if (!wrapper || !submenu) {
      return;
    }

    closeSiblingEditorContextSubmenus(wrapper);
    submenu.hidden = false;
    trigger.classList.add("is-open");
    trigger.setAttribute("aria-expanded", "true");
    positionEditorContextSubmenu(wrapper, submenu);
  }

  function closeEditorContextSubmenu(wrapper) {
    if (!wrapper) {
      return;
    }

    var trigger = wrapper.querySelector(":scope > button[data-md-context-submenu-trigger]");
    var submenu = wrapper.querySelector(":scope > .docs-editor-md-context__submenu");
    if (submenu) {
      closeEditorContextSubmenus(submenu);
      submenu.hidden = true;
      resetEditorPopoverPlacement(submenu);
      submenu.style.position = "absolute";
      submenu.style.left = "calc(100% + 6px)";
      submenu.style.top = "0px";
      submenu.style.minWidth = "210px";
      submenu.style.zIndex = "10070";
    }

    if (trigger) {
      trigger.classList.remove("is-open");
      trigger.setAttribute("aria-expanded", "false");
    }
  }

  function closeSiblingEditorContextSubmenus(wrapper) {
    var parent = wrapper && wrapper.parentElement;
    if (!parent) {
      return;
    }

    var siblings = parent.querySelectorAll(":scope > .docs-editor-md-context__submenu-wrap");
    for (var i = 0; i < siblings.length; i += 1) {
      if (siblings[i] !== wrapper) {
        closeEditorContextSubmenu(siblings[i]);
      }
    }
  }

  function closeEditorContextSubmenus(root) {
    if (!root || !root.querySelectorAll) {
      return;
    }

    var wrappers = root.querySelectorAll(".docs-editor-md-context__submenu-wrap");
    for (var i = 0; i < wrappers.length; i += 1) {
      closeEditorContextSubmenu(wrappers[i]);
    }
  }

  function positionEditorContextSubmenu(wrapper, submenu) {
    if (!wrapper || !submenu) {
      return;
    }

    submenu.style.left = "calc(100% + 6px)";
    submenu.style.right = "auto";
    submenu.style.top = "0px";
    submenu.style.bottom = "auto";
    submenu.style.maxHeight = Math.max(180, window.innerHeight - 16) + "px";
    submenu.style.visibility = "hidden";

    var trigger = wrapper.querySelector(":scope > button[data-md-context-submenu-trigger]");
    var triggerRect = trigger ? trigger.getBoundingClientRect() : wrapper.getBoundingClientRect();
    var submenuRect = submenu.getBoundingClientRect();
    var viewportPadding = 8;

    if (triggerRect.right + 6 + submenuRect.width > window.innerWidth - viewportPadding) {
      submenu.style.left = "auto";
      submenu.style.right = "calc(100% + 6px)";
    }

    var overflowBottom = triggerRect.top + submenuRect.height - (window.innerHeight - viewportPadding);
    if (overflowBottom > 0) {
      submenu.style.top = Math.round(Math.max(-triggerRect.top + viewportPadding, -overflowBottom)) + "px";
    }

    submenu.style.visibility = "";
  }

  function isEditorMarkdownContextMenuOpen() {
    return !!(state.editorContextMenu && !state.editorContextMenu.hasAttribute("hidden"));
  }

  function isEventInsideEditorMarkdownContextMenu(target) {
    return !!(state.editorContextMenu && target && state.editorContextMenu.contains(target));
  }

  function handleEditorMarkdownContextMenu(event) {
    var textarea = getEditorMarkdownTextarea();
    if (!textarea || event.target !== textarea || !isEditorOpen()) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    closeInternalLinkPicker();
    closeColorPicker();
    closeTooltipEditor();
    closeMediaLibraryPanel();

    focusEditorMarkdownSourceAtRange(null);

    var snapshot = getSelectionInfo(textarea);
    state.editorContextSelection = {
      start: snapshot.start,
      end: snapshot.end,
      selectedText: snapshot.selectedText,
    };

    openEditorMarkdownContextMenu(event.clientX, event.clientY);
  }

  function handleEditorCodeMirrorContextMenu(event) {
    if (!state.editorCodeMirror || state.editorSourceMode !== "html" || !isEditorOpen()) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    closeInternalLinkPicker();
    closeColorPicker();
    closeTooltipEditor();
    closeMediaLibraryPanel();

    state.editorCodeMirror.focus();

    var textarea = getEditorMarkdownTextarea();
    var snapshot = getSelectionInfo(textarea);
    state.editorContextSelection = {
      start: snapshot.start,
      end: snapshot.end,
      selectedText: snapshot.selectedText,
    };

    openEditorMarkdownContextMenu(event.clientX, event.clientY);
  }

  function openEditorMarkdownContextMenu(clientX, clientY, options) {
    var menu = ensureEditorMarkdownContextMenu();
    if (!menu) {
      return;
    }

    var opts = options || {};
    state.editorContextMenuMode = opts.mode === "insert" ? "insert" : "full";
    renderEditorMarkdownContextMenuActions(menu, buildEditorMarkdownContextActions(state.editorContextMenuMode));

    syncEditorMarkdownContextMenuButtons();
    menu.hidden = false;

    var viewportPadding = 8;
    menu.style.left = "0px";
    menu.style.top = "0px";
    menu.style.visibility = "hidden";

    var rect = menu.getBoundingClientRect();
    var left = Number(clientX) || viewportPadding;
    var top = Number(clientY) || viewportPadding;

    if (left + rect.width > window.innerWidth - viewportPadding) {
      left = Math.max(viewportPadding, window.innerWidth - rect.width - viewportPadding);
    }

    if (top + rect.height > window.innerHeight - viewportPadding) {
      top = Math.max(viewportPadding, window.innerHeight - rect.height - viewportPadding);
    }

    menu.style.left = left + "px";
    menu.style.top = top + "px";
    menu.style.visibility = "";
  }

  function closeEditorMarkdownContextMenu(options) {
    if (!state.editorContextMenu) {
      return;
    }

    var opts = options || {};
    var snapshot = state.editorContextSelection;

    closeEditorContextSubmenus(state.editorContextMenu);
    state.editorContextMenu.hidden = true;
    state.editorContextMenuMode = "full";
    state.editorContextMenu.style.left = "";
    state.editorContextMenu.style.top = "";
    state.editorContextMenu.style.visibility = "";

    if (!opts.keepSelection) {
      state.editorContextSelection = null;
    }

    if (opts.restoreTextareaFocus && snapshot) {
      restoreEditorContextSelection(snapshot);
    }
  }

  function restoreEditorContextSelection(snapshot) {
    focusEditorMarkdownSourceAtRange(snapshot);
  }

  function focusEditorMarkdownSourceAtRange(snapshot) {
    var textarea = getEditorMarkdownTextarea();

    if (state.editorCodeMirror && typeof state.editorCodeMirror.focus === "function") {
      var cm = state.editorCodeMirror;
      var value = String(cm.getValue() || "");
      var start = snapshot ? Math.max(0, Math.min(Number(snapshot.start) || 0, value.length)) : cm.indexFromPos(cm.getCursor("from"));
      var end = snapshot ? Math.max(start, Math.min(Number(snapshot.end) || start, value.length)) : cm.indexFromPos(cm.getCursor("to"));
      cm.focus();
      if (typeof cm.posFromIndex === "function" && typeof cm.setSelection === "function") {
        cm.setSelection(cm.posFromIndex(start), cm.posFromIndex(end));
      }
      return true;
    }

    if (!textarea) {
      return false;
    }

    try {
      textarea.focus({ preventScroll: true });
    } catch (_error) {
      textarea.focus();
    }

    if (snapshot && typeof textarea.setSelectionRange === "function") {
      var textValue = String(textarea.value || "");
      var textStart = Math.max(0, Math.min(Number(snapshot.start) || 0, textValue.length));
      var textEnd = Math.max(textStart, Math.min(Number(snapshot.end) || textStart, textValue.length));
      textarea.setSelectionRange(textStart, textEnd);
    }

    return true;
  }

  function runEditorMarkdownContextAction(action) {
    if (!action || state.editorSaving || state.imageUploading) {
      closeEditorMarkdownContextMenu();
      return;
    }

    var snapshot = state.editorContextSelection;
    if (snapshot) {
      restoreEditorContextSelection(snapshot);
    }

    closeEditorMarkdownContextMenu({ keepSelection: true });

    if (action === "color-clear" || action.indexOf("color:") === 0) {
      applyEditorContextColorAction(action, snapshot);
      state.editorContextSelection = null;
      return;
    }

    applyMarkdownToolbarAction(action);
    state.editorContextSelection = null;
  }

  function applyEditorContextColorAction(action, snapshot) {
    if (isVisualEditorMode()) {
      if (!restoreVisualSelectionSnapshot()) {
        return;
      }

      var existingColor = findVisualColorElementFromSelection();
      var range = getCurrentVisualRange();
      state.visualColorSelection = range ? range.cloneRange() : state.visualTooltipSelection;
      state.colorSelection = {
        mode: "visual",
        selectedText: getVisualSelectionText() || (existingColor ? readString(existingColor.textContent, "") : "testo colorato"),
        element: existingColor || null,
      };

      if (action === "color-clear") {
        clearColoredText();
        return;
      }

      insertColoredText(action.slice("color:".length));
      return;
    }

    var textarea = getEditorMarkdownTextarea();
    if (!textarea) {
      return;
    }

    var selection = snapshot || getSelectionInfo(textarea);
    state.colorSelection = {
      start: selection.start,
      end: selection.end,
      selectedText: selection.selectedText,
    };

    if (action === "color-clear") {
      clearColoredText();
      return;
    }

    insertColoredText(action.slice("color:".length));
  }

  function syncEditorMarkdownContextMenuButtons() {
    if (!state.editorContextMenu) {
      return;
    }

    var disabled = !!(state.editorSaving || state.imageUploading);
    var buttons = state.editorContextMenu.querySelectorAll("button[data-md-context-action], button[data-md-context-submenu-trigger]");
    for (var i = 0; i < buttons.length; i += 1) {
      buttons[i].disabled = disabled;
    }
  }

  function ensureEditorBoxPicker() {
    if (state.editorBoxPicker && state.editorBoxPicker.isConnected) {
      ensureEditorBoxIconPicker();
      return state.editorBoxPicker;
    }

    var picker = document.createElement("div");
    picker.className = "docs-editor-md-context docs-box-picker";
    picker.setAttribute("data-docs-box-picker", "");
    picker.setAttribute("role", "menu");
    picker.setAttribute("aria-label", "Tipo box");
    picker.hidden = true;

    var titleLabel = document.createElement("label");
    titleLabel.className = "docs-box-picker__field";

    var titleText = document.createElement("span");
    titleText.textContent = "Titolo box";
    titleLabel.appendChild(titleText);

    var titleInput = document.createElement("input");
    titleInput.type = "text";
    titleInput.placeholder = "Facoltativo";
    titleInput.setAttribute("data-docs-box-title", "");
    titleInput.autocomplete = "off";
    titleInput.spellcheck = false;
    titleLabel.appendChild(titleInput);
    picker.appendChild(titleLabel);

    var keys = Object.keys(WIKI_BOX_TYPES);
    for (var i = 0; i < keys.length; i += 1) {
      var type = keys[i];
      var meta = WIKI_BOX_TYPES[type];
      var button = document.createElement("button");
      button.type = "button";
      button.className = "docs-editor-md-context__action";
      button.setAttribute("data-docs-box-choice", type);
      button.setAttribute("role", "menuitem");
      button.setAttribute("aria-label", meta.label);

      var icon = document.createElement("i");
      icon.className = meta.icon;
      icon.setAttribute("aria-hidden", "true");
      button.appendChild(icon);

      var label = document.createElement("span");
      label.textContent = meta.label;
      button.appendChild(label);

      picker.appendChild(button);
    }

    picker.addEventListener("mousedown", function onBoxPickerMouseDown(event) {
      if (event.target && event.target.closest && event.target.closest("input, textarea, select")) {
        return;
      }

      event.preventDefault();
    });

    titleInput.addEventListener("input", function onBoxTitleInput(event) {
      state.boxTitle = readString(event.target.value, "");
    });

    titleInput.addEventListener("keydown", function onBoxTitleKeydown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        closeEditorBoxPicker({ restoreFocus: true });
      }
    });

    picker.addEventListener("click", function onBoxPickerClick(event) {
      var button = event.target.closest("button[data-docs-box-choice]");
      if (!button || button.disabled) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      applyEditorBoxChoice(button.getAttribute("data-docs-box-choice"));
    });

    document.body.appendChild(picker);
    state.editorBoxPicker = picker;
    ensureEditorBoxIconPicker();
    return picker;
  }

  function isEditorBoxPickerOpen() {
    return !!(state.editorBoxPicker && !state.editorBoxPicker.hasAttribute("hidden"));
  }

  function isEventInsideEditorBoxPicker(target) {
    if (state.editorBoxPicker && target && state.editorBoxPicker.contains(target)) {
      return true;
    }

    if (
      state.elements &&
      state.elements.editorMarkdownToolbar &&
      target &&
      target.closest &&
      target.closest('button[data-md-action="box"]') &&
      state.elements.editorMarkdownToolbar.contains(target)
    ) {
      return true;
    }

    return false;
  }

  function openEditorBoxPicker(textarea) {
    if (isVisualEditorMode()) {
      openVisualBoxPicker();
      return;
    }

    var picker = ensureEditorBoxPicker();
    var editorTextarea = textarea || getEditorMarkdownTextarea();
    if (!picker || !editorTextarea) {
      return;
    }

    var snapshot = getSelectionInfo(editorTextarea);
    state.boxSelection = {
      mode: "markdown",
      start: snapshot.start,
      end: snapshot.end,
      selectedText: snapshot.selectedText,
    };
    state.boxTitle = "";
    syncEditorBoxPickerTitleInput();

    closeInternalLinkPicker();
    closeColorPicker();
    closeTooltipEditor();
    closeEditorImagePicker();
    closeMediaLibraryPanel();

    picker.hidden = false;
    positionEditorPopoverPanel(picker, editorTextarea, snapshot);
  }

  function closeEditorBoxPicker(options) {
    if (!state.editorBoxPicker) {
      return;
    }

    var opts = options || {};
    var snapshot = state.boxSelection;

    state.editorBoxPicker.hidden = true;
    resetEditorPopoverPlacement(state.editorBoxPicker);

    if (!opts.keepSelection) {
      state.boxSelection = null;
      state.visualBoxSelection = null;
      state.boxTitle = "";
      syncEditorBoxPickerTitleInput();
    }

    if (!opts.restoreFocus || !snapshot) {
      return;
    }

    if (snapshot.mode === "visual" && state.elements && state.elements.editorVisualEditor) {
      try {
        state.elements.editorVisualEditor.focus({ preventScroll: true });
      } catch (_error) {
        state.elements.editorVisualEditor.focus();
      }
      return;
    }

    var textarea = getEditorMarkdownTextarea();
    if (textarea && typeof textarea.setSelectionRange === "function") {
      try {
        textarea.focus({ preventScroll: true });
      } catch (_focusError) {
        textarea.focus();
      }
      textarea.setSelectionRange(snapshot.start || 0, snapshot.end || snapshot.start || 0);
    }
  }

  function applyEditorBoxChoice(type) {
    var boxType = normalizeWikiBoxType(type);
    var snapshot = state.boxSelection || {};
    var title = getEditorBoxPickerTitle();

    if (snapshot.mode === "visual") {
      if (snapshot.element && snapshot.element.isConnected) {
        rememberVisualEditorHistoryBeforeProgrammaticChange();
        updateVisualWikiBoxType(snapshot.element, boxType);
        updateVisualWikiBoxTitle(snapshot.element, title);
        closeEditorBoxPicker();
        return;
      }

      restoreVisualBoxSelection();
      insertVisualWikiBox(boxType, snapshot.selectedText || "Testo del box", title);
      closeEditorBoxPicker();
      return;
    }

    insertMarkdownWikiBoxFromPicker(boxType, title);
    closeEditorBoxPicker();
  }

  function getEditorBoxPickerTitle() {
    var input = state.editorBoxPicker && state.editorBoxPicker.querySelector
      ? state.editorBoxPicker.querySelector("[data-docs-box-title]")
      : null;
    return readString(input && input.value, state.boxTitle || "");
  }

  function syncEditorBoxPickerTitleInput() {
    var input = state.editorBoxPicker && state.editorBoxPicker.querySelector
      ? state.editorBoxPicker.querySelector("[data-docs-box-title]")
      : null;
    if (input) {
      input.value = readString(state.boxTitle, "");
    }
  }

  function insertMarkdownWikiBoxFromPicker(type, title) {
    var textarea = getEditorMarkdownTextarea();
    if (!textarea) {
      return;
    }

    var snapshot = state.boxSelection || getSelectionInfo(textarea);
    var value = String(textarea.value || "");
    var start = Math.max(0, Math.min(Number(snapshot.start) || 0, value.length));
    var end = Math.max(start, Math.min(Number(snapshot.end) || start, value.length));
    var selectedText = value.slice(start, end) || readString(snapshot.selectedText, "");
    var content = selectedText || "Testo del box";
    var block = buildWikiBoxSourceHtml(type, title || "", content);

    replaceSelectionByRange(textarea, start, end, block, {
      start: block.indexOf(escapeInlineHtmlText(content)),
      end: block.indexOf(escapeInlineHtmlText(content)) + escapeInlineHtmlText(content).length,
    });
  }

  function ensureEditorBoxIconPicker() {
    if (state.editorBoxIconPicker && state.editorBoxIconPicker.isConnected) {
      return state.editorBoxIconPicker;
    }

    var picker = document.createElement("div");
    picker.className = "docs-box-icon-picker docs-editor-md-context";
    picker.setAttribute("data-docs-box-icon-picker", "");
    picker.setAttribute("role", "menu");
    picker.setAttribute("aria-label", "Icona box");
    picker.hidden = true;

    var label = document.createElement("p");
    label.className = "docs-box-icon-picker__label";
    label.textContent = "Icona box";
    picker.appendChild(label);

    var search = createIconPickerSearchInput("Cerca icona box...");
    picker.appendChild(search);

    var grid = document.createElement("div");
    grid.className = "docs-box-icon-picker__grid";

    for (var i = 0; i < WIKI_BOX_ICON_CHOICES.length; i += 1) {
      var iconClass = WIKI_BOX_ICON_CHOICES[i];
      var button = document.createElement("button");
      button.type = "button";
      button.className = "docs-box-icon-picker__choice";
      button.setAttribute("data-docs-box-icon-choice", iconClass);
      button.setAttribute("data-icon-search", buildIconPickerSearchText(iconClass));
      button.setAttribute("role", "menuitem");
      button.setAttribute("aria-label", iconClassToLabel(iconClass));

      var icon = document.createElement("i");
      icon.className = iconClass;
      icon.setAttribute("aria-hidden", "true");
      button.appendChild(icon);
      grid.appendChild(button);
    }

    picker.appendChild(grid);

    search.addEventListener("input", function onBoxIconSearchInput(event) {
      filterIconPickerChoices(picker, event.target.value);
    });

    picker.addEventListener("mousedown", function onBoxIconPickerMouseDown(event) {
      if (event.target && event.target.closest && event.target.closest("input")) {
        return;
      }

      event.preventDefault();
    });

    picker.addEventListener("click", function onBoxIconPickerClick(event) {
      var button = event.target.closest("button[data-docs-box-icon-choice]");
      if (!button || button.disabled) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      applyVisualBoxIconChoice(button.getAttribute("data-docs-box-icon-choice"));
    });

    document.body.appendChild(picker);
    state.editorBoxIconPicker = picker;
    return picker;
  }

  function iconClassToLabel(iconClass) {
    var text = readString(iconClass, "icona");
    var parts = text.split(" ");
    var last = parts.length ? parts[parts.length - 1] : text;
    return last.replace(/^fa-/, "").replace(/-/g, " ");
  }

  function createIconPickerSearchInput(placeholder) {
    var input = document.createElement("input");
    input.type = "search";
    input.className = "docs-box-icon-picker__search";
    input.setAttribute("data-docs-icon-picker-search", "");
    input.setAttribute("autocomplete", "off");
    input.setAttribute("spellcheck", "false");
    input.setAttribute("aria-label", "Cerca icona");
    input.placeholder = readString(placeholder, "Cerca icona...");
    return input;
  }

  function buildIconPickerSearchText(iconClass) {
    var icon = readString(iconClass, "");
    var label = iconClassToLabel(icon);
    return normalizeSearchText(icon + " " + label);
  }

  function resetIconPickerSearch(picker) {
    if (!picker) {
      return;
    }

    var input = picker.querySelector("[data-docs-icon-picker-search]");
    if (input) {
      input.value = "";
    }

    filterIconPickerChoices(picker, "");
  }

  function focusIconPickerSearch(picker) {
    if (!picker) {
      return;
    }

    var input = picker.querySelector("[data-docs-icon-picker-search]");
    if (input && typeof input.focus === "function") {
      input.focus();
    }
  }

  function filterIconPickerChoices(picker, query) {
    if (!picker || !picker.querySelectorAll) {
      return;
    }

    var normalizedQuery = normalizeSearchText(query);
    var terms = normalizedQuery.split(" ").filter(function filterIconSearchTerm(term) {
      return !!term;
    });
    var buttons = picker.querySelectorAll("button[data-docs-box-icon-choice], button[data-docs-tree-icon-choice]");
    var visibleCount = 0;

    for (var i = 0; i < buttons.length; i += 1) {
      var button = buttons[i];
      var haystack = readString(button.getAttribute("data-icon-search"), "");
      var matches = true;

      for (var termIndex = 0; termIndex < terms.length; termIndex += 1) {
        if (haystack.indexOf(terms[termIndex]) === -1) {
          matches = false;
          break;
        }
      }

      button.hidden = !matches;
      if (matches) {
        visibleCount += 1;
      }
    }

    var empty = picker.querySelector("[data-docs-icon-picker-empty]");
    if (!empty) {
      empty = document.createElement("p");
      empty.className = "docs-box-icon-picker__empty";
      empty.setAttribute("data-docs-icon-picker-empty", "");
      empty.textContent = "Nessuna icona trovata.";
      picker.appendChild(empty);
    }

    empty.hidden = visibleCount > 0;
  }

  function isEditorBoxIconPickerOpen() {
    return !!(state.editorBoxIconPicker && !state.editorBoxIconPicker.hasAttribute("hidden"));
  }

  function isEventInsideEditorBoxIconPicker(target) {
    if (state.editorBoxIconPicker && target && state.editorBoxIconPicker.contains(target)) {
      return true;
    }

    if (target && target.closest && target.closest(".wiki-box__icon")) {
      return true;
    }

    return false;
  }

  function openVisualBoxIconPicker(box, iconWrap) {
    var picker = ensureEditorBoxIconPicker();
    if (!picker || !box) {
      return;
    }

    closeEditorMarkdownContextMenu();
    closeEditorBoxPicker();
    closeInternalLinkPicker();
    closeColorPicker();
    closeTooltipEditor();
    closeEditorImagePicker();
    closeMediaLibraryPanel();

    state.boxIconTargetElement = box;
    resetIconPickerSearch(picker);
    syncEditorBoxIconPickerSelection(box);
    picker.hidden = false;

    var rect = iconWrap && typeof iconWrap.getBoundingClientRect === "function" ? iconWrap.getBoundingClientRect() : null;
    var point = rect ? { x: rect.left + rect.width / 2, y: rect.bottom } : getVisualSelectionAnchorPoint();
    positionEditorPopoverAtPoint(picker, point);
    focusIconPickerSearch(picker);
  }

  function closeEditorBoxIconPicker(options) {
    if (!state.editorBoxIconPicker) {
      return;
    }

    var opts = options || {};
    state.editorBoxIconPicker.hidden = true;
    resetEditorPopoverPlacement(state.editorBoxIconPicker);

    if (!opts.keepSelection) {
      state.boxIconTargetElement = null;
    }

    if (opts.restoreFocus && state.elements && state.elements.editorVisualEditor) {
      try {
        state.elements.editorVisualEditor.focus({ preventScroll: true });
      } catch (_error) {
        state.elements.editorVisualEditor.focus();
      }
    }
  }

  function syncEditorBoxIconPickerSelection(box) {
    if (!state.editorBoxIconPicker) {
      return;
    }

    var currentIcon = readWikiBoxIconClass(box);
    var buttons = state.editorBoxIconPicker.querySelectorAll("button[data-docs-box-icon-choice]");
    for (var i = 0; i < buttons.length; i += 1) {
      var isSelected = buttons[i].getAttribute("data-docs-box-icon-choice") === currentIcon;
      buttons[i].classList.toggle("is-selected", isSelected);
      buttons[i].setAttribute("aria-pressed", isSelected ? "true" : "false");
    }
  }

  function applyVisualBoxIconChoice(iconClass) {
    var box = state.boxIconTargetElement;
    if (!box || !box.isConnected) {
      closeEditorBoxIconPicker();
      return;
    }

    rememberVisualEditorHistoryBeforeProgrammaticChange();
    setVisualWikiBoxIcon(box, iconClass);
    closeEditorBoxIconPicker({ restoreFocus: true });
  }

  function ensureEditorImagePicker() {
    if (state.editorImagePicker && state.editorImagePicker.panel && state.editorImagePicker.panel.isConnected) {
      return state.editorImagePicker;
    }


    var panel = document.createElement("div");
    panel.className = "docs-image-picker";
    panel.setAttribute("data-docs-image-picker", "");
    panel.hidden = true;

    panel.innerHTML =
      '<p class="docs-image-picker__label">Immagine</p>' +
      '<label class="docs-image-picker__field docs-image-picker__field--alt">' +
      '<span>Alt text</span>' +
      '<input type="text" data-docs-image-picker-alt placeholder="Immagine" autocomplete="off" spellcheck="false" />' +
      '</label>' +
      '<div class="docs-image-picker__options">' +
      '<label class="docs-image-picker__field">' +
      '<span>Layout</span>' +
      '<select data-docs-image-picker-layout>' +
      '<option value="full">Full-width</option>' +
      '<option value="inline">Inline</option>' +
      '</select>' +
      '</label>' +
      '<label class="docs-image-picker__field">' +
      '<span>Larghezza</span>' +
      '<input type="number" min="1" step="1" data-docs-image-picker-width-value placeholder="100" />' +
      '</label>' +
      '<label class="docs-image-picker__field">' +
      '<span>Unità</span>' +
      '<select data-docs-image-picker-width-unit>' +
      '<option value="%">%</option>' +
      '<option value="px">px</option>' +
      '</select>' +
      '</label>' +
      '</div>' +
      '<div class="docs-image-picker__external">' +
      '<label class="docs-image-picker__field">' +
      '<span>URL esterno</span>' +
      '<input type="url" data-docs-image-picker-url placeholder="https://..." autocomplete="off" spellcheck="false" />' +
      '</label>' +
      '<button type="button" class="docs-image-picker__btn docs-image-picker__btn--primary" data-docs-image-picker-insert-url>Inserisci URL</button>' +
      '</div>' +
      '<div class="docs-image-picker__library-head">' +
      '<label class="docs-image-picker__field docs-image-picker__field--search">' +
      '<span>Galleria Supabase</span>' +
      '<input type="search" data-docs-image-picker-search placeholder="Cerca immagine..." autocomplete="off" spellcheck="false" />' +
      '</label>' +
      '</div>' +
      '<div class="docs-image-picker__results" data-docs-image-picker-results aria-live="polite"></div>' +
      '<p class="docs-image-picker__status" data-docs-image-picker-status aria-live="polite"></p>';

    var picker = {
      panel: panel,
      alt: panel.querySelector("[data-docs-image-picker-alt]"),
      url: panel.querySelector("[data-docs-image-picker-url]"),
      search: panel.querySelector("[data-docs-image-picker-search]"),
      results: panel.querySelector("[data-docs-image-picker-results]"),
      status: panel.querySelector("[data-docs-image-picker-status]"),
      insertUrl: panel.querySelector("[data-docs-image-picker-insert-url]"),
      layout: panel.querySelector("[data-docs-image-picker-layout]"),
      widthValue: panel.querySelector("[data-docs-image-picker-width-value]"),
      widthUnit: panel.querySelector("[data-docs-image-picker-width-unit]"),
    };

    if (picker.search) {
      picker.search.addEventListener("input", function onImagePickerSearchInput(event) {
        state.imagePickerQuery = readString(event.target.value, "");
        renderEditorImagePickerResults();
      });

      picker.search.addEventListener("keydown", handleEditorImagePickerKeydown);
    }

    if (picker.alt) {
      picker.alt.addEventListener("keydown", handleEditorImagePickerKeydown);
    }

    if (picker.url) {
      picker.url.addEventListener("input", function onImagePickerUrlInput(event) {
        state.imagePickerExternalUrl = readString(event.target.value, "");
      });

      picker.url.addEventListener("keydown", handleEditorImagePickerKeydown);
    }

    if (picker.insertUrl) {
      picker.insertUrl.addEventListener("click", function onImagePickerInsertUrlClick(event) {
        event.preventDefault();
        insertExternalImageFromPicker();
      });
    }

    if (picker.results) {
      picker.results.addEventListener("click", function onImagePickerResultClick(event) {
        var button = event.target.closest("button[data-docs-image-picker-path]");
        if (!button || button.disabled) {
          return;
        }

        event.preventDefault();
        insertImageFromPickerLibraryPath(button.getAttribute("data-docs-image-picker-path"));
      });
    }

    document.body.appendChild(panel);
    state.editorImagePicker = picker;
    return picker;
  }

  function isEditorImagePickerOpen() {
    return !!(
      state.editorImagePicker &&
      state.editorImagePicker.panel &&
      !state.editorImagePicker.panel.hasAttribute("hidden")
    );
  }

  function isEventInsideEditorImagePicker(target) {
    if (state.editorImagePicker && state.editorImagePicker.panel && target && state.editorImagePicker.panel.contains(target)) {
      return true;
    }

    if (
      state.elements &&
      state.elements.editorMarkdownToolbar &&
      target &&
      target.closest &&
      target.closest('button[data-md-action="image"]') &&
      state.elements.editorMarkdownToolbar.contains(target)
    ) {
      return true;
    }

    return false;
  }

  function toggleEditorImagePicker(textarea) {
    if (isEditorImagePickerOpen()) {
      closeEditorImagePicker({ restoreTextareaFocus: true });
      return;
    }

    openEditorImagePicker(textarea);
  }

  async function openEditorImagePicker(textarea) {
    if (isVisualEditorMode()) {
      openVisualImagePicker();
      return;
    }
    var picker = ensureEditorImagePicker();
    if (!picker || !picker.panel) {
      applyLinkAction(textarea, true);
      return;
    }

    var editorTextarea = textarea || getEditorMarkdownTextarea();
    if (!editorTextarea) {
      return;
    }

    var snapshot = getSelectionInfo(editorTextarea);
    state.imagePickerSelection = {
      start: snapshot.start,
      end: snapshot.end,
      selectedText: snapshot.selectedText,
    };
    state.imagePickerQuery = "";
    state.imagePickerExternalUrl = "";
    state.imagePickerAlt = snapshot.selectedText || readString(state.elements && state.elements.editorImageAlt && state.elements.editorImageAlt.value, "Immagine");
    state.imagePickerLayout = "full";
    state.imagePickerWidthValue = "100";
    state.imagePickerWidthUnit = "%";
    state.imagePickerTargetElement = null;

    closeInternalLinkPicker();
    closeColorPicker();
    closeTooltipEditor();
    closeMediaLibraryPanel();

    if (picker.alt) {
      picker.alt.value = state.imagePickerAlt;
    }

    if (picker.url) {
      picker.url.value = "";
    }

    if (picker.layout) {
      picker.layout.value = state.imagePickerLayout;
    }

    if (picker.widthValue) {
      picker.widthValue.value = state.imagePickerWidthValue;
    }

    if (picker.widthUnit) {
      picker.widthUnit.value = state.imagePickerWidthUnit;
    }

    if (picker.search) {
      picker.search.value = "";
    }

    setEditorImagePickerStatus("", "");
    picker.panel.hidden = false;
    positionEditorPopoverPanel(picker.panel, editorTextarea, snapshot);
    renderEditorImagePickerResults();

    try {
      await ensureMediaLibraryLoaded(state.mediaLibraryNeedsRefresh);
      renderEditorImagePickerResults();
    } catch (_error) {
      renderEditorImagePickerResults();
    }

    if (picker.search && typeof picker.search.focus === "function") {
      picker.search.focus();
    }
  }

  function closeEditorImagePicker(options) {
    if (!state.editorImagePicker || !state.editorImagePicker.panel) {
      return;
    }

    var opts = options || {};
    var snapshot = state.imagePickerSelection;

    state.editorImagePicker.panel.hidden = true;
    resetEditorPopoverPlacement(state.editorImagePicker.panel);
    state.imagePickerQuery = "";
    state.imagePickerExternalUrl = "";

    if (state.editorImagePicker.search) {
      state.editorImagePicker.search.value = "";
    }

    if (state.editorImagePicker.url) {
      state.editorImagePicker.url.value = "";
    }

    if (state.editorImagePicker.results) {
      state.editorImagePicker.results.innerHTML = "";
    }

    setEditorImagePickerStatus("", "");

    if (!opts.keepSelection) {
      state.imagePickerSelection = null;
      state.visualImageSelection = null;
      state.imagePickerTargetElement = null;
    }

    if (snapshot && snapshot.mode === "visual") {
      if (opts.restoreTextareaFocus && state.elements && state.elements.editorVisualEditor) {
        try {
          state.elements.editorVisualEditor.focus({ preventScroll: true });
        } catch (_error) {
          state.elements.editorVisualEditor.focus();
        }
      }
      return;
    }

    if (opts.restoreTextareaFocus && snapshot) {
      restoreImagePickerTextareaSelection(snapshot);
    }
  }

  function restoreImagePickerTextareaSelection(snapshot) {
    var textarea = getEditorMarkdownTextarea();
    if (!textarea || !snapshot) {
      return;
    }

    try {
      textarea.focus({ preventScroll: true });
    } catch (_error) {
      textarea.focus();
    }

    if (typeof textarea.setSelectionRange === "function") {
      var value = String(textarea.value || "");
      var start = Math.max(0, Math.min(Number(snapshot.start) || 0, value.length));
      var end = Math.max(start, Math.min(Number(snapshot.end) || start, value.length));
      textarea.setSelectionRange(start, end);
    }
  }

  function handleEditorImagePickerKeydown(event) {
    if (!event) {
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeEditorImagePicker({ restoreTextareaFocus: true });
      return;
    }

    if (event.key === "Enter" && event.target && event.target.matches && event.target.matches("[data-docs-image-picker-url]")) {
      event.preventDefault();
      event.stopPropagation();
      insertExternalImageFromPicker();
      return;
    }

    if (event.key === "Enter" && isPrimaryModifierPressed(event)) {
      event.preventDefault();
      event.stopPropagation();
      insertExternalImageFromPicker();
    }
  }

  function setEditorImagePickerStatus(message, tone) {
    if (!state.editorImagePicker || !state.editorImagePicker.status) {
      return;
    }

    var status = state.editorImagePicker.status;
    status.textContent = readString(message, "");
    status.classList.remove("is-error", "is-success");

    if (tone === "error") {
      status.classList.add("is-error");
    } else if (tone === "success") {
      status.classList.add("is-success");
    }
  }

  function renderEditorImagePickerResults() {
    var picker = state.editorImagePicker;
    if (!picker || !picker.results) {
      return;
    }

    var container = picker.results;
    container.innerHTML = "";

    if (state.mediaLibraryLoading) {
      var loading = document.createElement("p");
      loading.className = "docs-image-picker__empty";
      loading.textContent = "Caricamento immagini...";
      container.appendChild(loading);
      return;
    }

    if (!Array.isArray(state.mediaLibraryItems) || !state.mediaLibraryItems.length) {
      var empty = document.createElement("p");
      empty.className = "docs-image-picker__empty";
      empty.textContent = "Nessuna immagine nella galleria.";
      container.appendChild(empty);
      return;
    }

    var results = getFilteredMediaLibraryItems(normalizeSearchText(state.imagePickerQuery));
    if (!results.length) {
      var noResults = document.createElement("p");
      noResults.className = "docs-image-picker__empty";
      noResults.textContent = "Nessuna immagine trovata.";
      container.appendChild(noResults);
      return;
    }

    var grid = document.createElement("div");
    grid.className = "docs-image-picker__grid";

    for (var i = 0; i < results.length; i += 1) {
      var item = results[i].item;
      var button = document.createElement("button");
      button.type = "button";
      button.className = "docs-image-picker__item";
      button.setAttribute("data-docs-image-picker-path", item.path);
      button.setAttribute("aria-label", "Inserisci " + item.name);

      var image = document.createElement("img");
      image.className = "docs-image-picker__thumb";
      image.src = item.publicUrl;
      image.alt = "";
      image.loading = "lazy";
      button.appendChild(image);

      var label = document.createElement("span");
      label.className = "docs-image-picker__name";
      label.textContent = item.name;
      button.appendChild(label);

      grid.appendChild(button);
    }

    container.appendChild(grid);
  }

  function getImagePickerAltText() {
    var picker = state.editorImagePicker;
    var value = picker && picker.alt ? readString(picker.alt.value, "") : "";
    return value || state.imagePickerAlt || "Immagine";
  }

  function insertImageMarkdownFromPicker(url, altText) {
    if (state.imagePickerSelection && state.imagePickerSelection.mode === "visual") {
      insertVisualImageFromPicker(url, altText);
      return;
    }

    var textarea = getEditorMarkdownTextarea();
    if (!textarea) {
      return;
    }

    var value = getEditorMarkdownSource();
    var snapshot = state.imagePickerSelection || getSelectionInfo(textarea);
    var start = Math.max(0, Math.min(Number(snapshot.start) || 0, value.length));
    var end = Math.max(start, Math.min(Number(snapshot.end) || start, value.length));
    var layout = state.editorImagePicker && state.editorImagePicker.layout ? state.editorImagePicker.layout.value : state.imagePickerLayout;
    var widthValue = state.editorImagePicker && state.editorImagePicker.widthValue ? state.editorImagePicker.widthValue.value : state.imagePickerWidthValue;
    var widthUnit = state.editorImagePicker && state.editorImagePicker.widthUnit ? state.editorImagePicker.widthUnit.value : state.imagePickerWidthUnit;
    var width = normalizeWikiImageWidth(readString(widthValue, "") + normalizeWikiImageWidthUnit(widthUnit), layout);
    var markdownImage = buildWikiImageHtml(url, altText, layout, width);

    replaceSelectionByRange(textarea, start, end, markdownImage, {
      start: markdownImage.length,
      end: markdownImage.length,
    });

    closeEditorImagePicker();
  }

  function insertImageFromPickerLibraryPath(path) {
    var item = resolveMediaLibraryItemByPath(path);
    if (!item) {
      setEditorImagePickerStatus("Immagine non disponibile.", "error");
      return;
    }

    insertImageMarkdownFromPicker(item.publicUrl, getImagePickerAltText() || item.name || "Immagine");
  }

  function insertExternalImageFromPicker() {
    var picker = state.editorImagePicker;
    var url = picker && picker.url ? readString(picker.url.value, "") : "";

    if (!/^https?:\/\//i.test(url)) {
      setEditorImagePickerStatus("Inserisci un URL immagine valido, con http:// o https://.", "error");
      return;
    }

    insertImageMarkdownFromPicker(url, getImagePickerAltText());
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
    if (state.editorCodeMirror && typeof state.editorCodeMirror.getValue === "function") {
      var cm = state.editorCodeMirror;
      var wrapper = cm.getWrapperElement ? cm.getWrapperElement() : null;
      var panel = getEditorModalScrollContainer(wrapper || textarea);
      var scrollInfo = cm.getScrollInfo ? cm.getScrollInfo() : { top: 0, left: 0 };

      return {
        mode: "html",
        value: String(cm.getValue() || ""),
        selectionStart: cm.indexFromPos(cm.getCursor("from")),
        selectionEnd: cm.indexFromPos(cm.getCursor("to")),
        scrollTop: typeof scrollInfo.top === "number" ? scrollInfo.top : 0,
        scrollLeft: typeof scrollInfo.left === "number" ? scrollInfo.left : 0,
        panelScrollTop: panel && typeof panel.scrollTop === "number" ? panel.scrollTop : 0,
      };
    }

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

  function areEditorHistorySnapshotsEqual(left, right) {
    if (!left || !right) {
      return false;
    }

    if (left.mode === "visual" || right.mode === "visual") {
      return left.mode === right.mode && String(left.html || "") === String(right.html || "");
    }

    return String(left.value || "") === String(right.value || "");
  }

  function pushEditorHistoryCheckpoint(snapshot) {
    if (state.editorHistoryRestoring || !snapshot) {
      return;
    }

    var last = state.editorHistoryUndo.length ? state.editorHistoryUndo[state.editorHistoryUndo.length - 1] : null;
    if (areEditorHistorySnapshotsEqual(last, snapshot)) {
      return;
    }

    state.editorHistoryUndo.push(snapshot);
    trimEditorHistoryStack(state.editorHistoryUndo);
    state.editorHistoryRedo = [];
  }

  function pushEditorHistorySnapshot(snapshot, textarea) {
    if (state.editorHistoryRestoring || !snapshot) {
      return;
    }

    if (snapshot.mode === "visual") {
      var editor = state.elements && state.elements.editorVisualEditor;
      if (!editor || snapshot.html === String(editor.innerHTML || "")) {
        return;
      }
    } else {
      var field = textarea || getEditorMarkdownTextarea();
      if (!field || snapshot.value === String(field.value || "")) {
        return;
      }
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
    if (!snapshot) {
      return;
    }

    state.editorHistoryRestoring = true;
    try {
      if (snapshot.mode === "visual") {
        restoreVisualEditorHistorySnapshot(snapshot);
        return;
      }

      var textarea = getEditorMarkdownTextarea();
      if (!textarea) {
        return;
      }

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
    if (!canUndoEditorHistory()) {
      return;
    }

    var currentSnapshot = getActiveEditorHistorySnapshot();
    var previousSnapshot = state.editorHistoryUndo.pop();

    if (currentSnapshot) {
      state.editorHistoryRedo.push(currentSnapshot);
      trimEditorHistoryStack(state.editorHistoryRedo);
    }

    restoreEditorHistorySnapshot(previousSnapshot);
  }

  function redoEditorHistory() {
    if (!canRedoEditorHistory()) {
      return;
    }

    var currentSnapshot = getActiveEditorHistorySnapshot();
    var nextSnapshot = state.editorHistoryRedo.pop();

    if (currentSnapshot) {
      state.editorHistoryUndo.push(currentSnapshot);
      trimEditorHistoryStack(state.editorHistoryUndo);
    }

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

  function getEditorMarkdownSource() {
    if (state.editorCodeMirror && typeof state.editorCodeMirror.getValue === "function") {
      return String(state.editorCodeMirror.getValue() || "");
    }

    var textarea = getEditorMarkdownTextarea();
    return textarea ? String(textarea.value || "") : "";
  }

  function setEditorMarkdownSource(value) {
    var source = String(value || "");
    var textarea = getEditorMarkdownTextarea();

    if (textarea) {
      textarea.value = source;
    }

    if (state.editorCodeMirror && typeof state.editorCodeMirror.setValue === "function") {
      if (state.editorCodeMirror.getValue() !== source) {
        state.editorCodeMirror.setValue(source);
      }
    }
  }

  function syncCodeMirrorToTextarea() {
    var textarea = getEditorMarkdownTextarea();
    if (!textarea || !state.editorCodeMirror || typeof state.editorCodeMirror.getValue !== "function") {
      return;
    }

    textarea.value = state.editorCodeMirror.getValue();
  }

  function ensureEditorCodeMirror(options) {
    var textarea = getEditorMarkdownTextarea();
    if (!textarea) {
      return null;
    }

    if (state.editorCodeMirror && state.editorCodeMirror.getWrapperElement) {
      if (options && options.refresh) {
        window.requestAnimationFrame(function refreshExistingCodeMirror() {
          if (state.editorCodeMirror && state.editorCodeMirror.refresh) {
            state.editorCodeMirror.refresh();
          }
        });
      }
      return state.editorCodeMirror;
    }

    if (!window.CodeMirror) {
      loadCodeMirrorAssets(function onCodeMirrorReady() {
        ensureEditorCodeMirror({ refresh: true });
        syncEditorSourceModeUi();
      });
      return null;
    }

    var codeMirrorOptions = {
      mode: "htmlmixed",
      lineNumbers: true,
      lineWrapping: true,
      tabSize: 2,
      indentUnit: 2,
      smartIndent: true,
      autoCloseTags: true,
      viewportMargin: Infinity,
      extraKeys: {
        "Ctrl-1": function applyH1(cm) { applyCodeMirrorToolbarAction(cm, "h1"); },
        "Cmd-1": function applyH1Mac(cm) { applyCodeMirrorToolbarAction(cm, "h1"); },
        "Ctrl-2": function applyH2(cm) { applyCodeMirrorToolbarAction(cm, "h2"); },
        "Cmd-2": function applyH2Mac(cm) { applyCodeMirrorToolbarAction(cm, "h2"); },
        "Ctrl-3": function applyH3(cm) { applyCodeMirrorToolbarAction(cm, "h3"); },
        "Cmd-3": function applyH3Mac(cm) { applyCodeMirrorToolbarAction(cm, "h3"); },
        "Ctrl-B": function applyBold(cm) { applyCodeMirrorToolbarAction(cm, "bold"); },
        "Cmd-B": function applyBoldMac(cm) { applyCodeMirrorToolbarAction(cm, "bold"); },
        "Ctrl-I": function applyItalic(cm) { applyCodeMirrorToolbarAction(cm, "italic"); },
        "Cmd-I": function applyItalicMac(cm) { applyCodeMirrorToolbarAction(cm, "italic"); },
        "Ctrl-K": function applyLink(cm) { applyCodeMirrorToolbarAction(cm, "link"); },
        "Cmd-K": function applyLinkMac(cm) { applyCodeMirrorToolbarAction(cm, "link"); },
      },
    };

    if (
      window.CodeMirror.prototype &&
      typeof window.CodeMirror.prototype.findMatchingTag === "function"
    ) {
      codeMirrorOptions.matchTags = { bothTags: true };
    }

    state.editorCodeMirror = window.CodeMirror.fromTextArea(textarea, codeMirrorOptions);

    state.editorCodeMirror.on("change", function onCodeMirrorChange(cm) {
      textarea.value = cm.getValue();
      if (state.editorSourceMode === "html") {
        setEditorStatus("", "");
      }
    });

    var wrapper = state.editorCodeMirror.getWrapperElement();
    if (wrapper) {
      wrapper.classList.add("docs-code-editor");
      wrapper.hidden = state.editorSourceMode !== "html";
      wrapper.addEventListener("contextmenu", handleEditorCodeMirrorContextMenu);
    }

    syncEditorSourceModeUi();
    return state.editorCodeMirror;
  }

  function applyCodeMirrorToolbarAction(cm, action) {
    if (!cm || !action) {
      return;
    }

    syncCodeMirrorToTextarea();
    applyMarkdownToolbarAction(action);
    if (state.editorCodeMirror && state.editorSourceMode === "html") {
      state.editorCodeMirror.focus();
    }
  }

  function loadCodeMirrorAssets(callback) {
    if (window.CodeMirror) {
      state.codeMirrorAssetsReady = true;
      if (typeof callback === "function") {
        callback();
      }
      return;
    }

    if (typeof callback === "function") {
      state.codeMirrorAssetCallbacks.push(callback);
    }

    if (state.codeMirrorAssetsLoading) {
      return;
    }

    state.codeMirrorAssetsLoading = true;

    loadCodeMirrorCss("https://cdn.jsdelivr.net/npm/codemirror@5.65.16/lib/codemirror.min.css");

    loadScriptSequence([
      "https://cdn.jsdelivr.net/npm/codemirror@5.65.16/lib/codemirror.min.js",
      "https://cdn.jsdelivr.net/npm/codemirror@5.65.16/mode/xml/xml.min.js",
      "https://cdn.jsdelivr.net/npm/codemirror@5.65.16/mode/javascript/javascript.min.js",
      "https://cdn.jsdelivr.net/npm/codemirror@5.65.16/mode/css/css.min.js",
      "https://cdn.jsdelivr.net/npm/codemirror@5.65.16/mode/htmlmixed/htmlmixed.min.js",
      "https://cdn.jsdelivr.net/npm/codemirror@5.65.16/addon/edit/closetag.min.js",
      "https://cdn.jsdelivr.net/npm/codemirror@5.65.16/addon/fold/xml-fold.min.js",
      "https://cdn.jsdelivr.net/npm/codemirror@5.65.16/addon/edit/matchtags.min.js",
    ], function onAssetsLoaded(error) {
      state.codeMirrorAssetsLoading = false;
      state.codeMirrorAssetsReady = !error && !!window.CodeMirror;

      if (error) {
        console.warn("CodeMirror non disponibile, fallback al textarea HTML.", error);
      }

      var callbacks = state.codeMirrorAssetCallbacks.slice();
      state.codeMirrorAssetCallbacks = [];

      for (var i = 0; i < callbacks.length; i += 1) {
        callbacks[i](error || null);
      }
    });
  }

  function loadCodeMirrorCss(href) {
    if (!href || document.querySelector('link[data-codemirror-css="true"]')) {
      return;
    }

    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.setAttribute("data-codemirror-css", "true");
    document.head.appendChild(link);
  }

  function loadScriptSequence(urls, done) {
    var index = 0;

    function next(error) {
      if (error) {
        done(error);
        return;
      }

      if (index >= urls.length) {
        done(null);
        return;
      }

      var src = urls[index];
      index += 1;
      loadExternalScript(src, next);
    }

    next(null);
  }

  function loadExternalScript(src, done) {
    var existing = document.querySelector('script[src="' + src + '"]');
    if (existing) {
      done(null);
      return;
    }

    var script = document.createElement("script");
    script.src = src;
    script.async = false;
    script.onload = function onScriptLoad() { done(null); };
    script.onerror = function onScriptError() { done(new Error("Impossibile caricare " + src)); };
    document.head.appendChild(script);
  }

  function getSelectionInfo(textarea) {
    if (state.editorCodeMirror && typeof state.editorCodeMirror.getValue === "function") {
      var cm = state.editorCodeMirror;
      var value = String(cm.getValue() || "");
      var from = cm.indexFromPos(cm.getCursor("from"));
      var to = cm.indexFromPos(cm.getCursor("to"));
      var start = Math.max(0, Math.min(from, to));
      var end = Math.max(start, Math.max(from, to));

      return {
        value: value,
        start: start,
        end: end,
        selectedText: value.slice(start, end),
      };
    }

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

  function getTextareaCaretViewportPoint(textarea, position) {
    if (state.editorCodeMirror && typeof state.editorCodeMirror.posFromIndex === "function") {
      var cm = state.editorCodeMirror;
      var value = String(cm.getValue() || "");
      var caretIndex = Math.max(0, Math.min(Number(position) || 0, value.length));
      var cursor = cm.posFromIndex(caretIndex);
      var coords = cm.cursorCoords(cursor, "window");
      return {
        x: coords.left,
        y: coords.bottom,
      };
    }

    if (!textarea || typeof textarea.getBoundingClientRect !== "function") {
      return null;
    }

    var value = String(textarea.value || "");
    var caretIndex = Math.max(0, Math.min(Number(position) || 0, value.length));
    var rect = textarea.getBoundingClientRect();
    var style = window.getComputedStyle ? window.getComputedStyle(textarea) : null;

    if (!style) {
      return {
        x: rect.left + 18,
        y: rect.top + 28,
      };
    }

    var mirror = document.createElement("div");
    var copiedProperties = [
      "boxSizing",
      "width",
      "fontFamily",
      "fontSize",
      "fontWeight",
      "fontStyle",
      "letterSpacing",
      "textTransform",
      "textAlign",
      "lineHeight",
      "paddingTop",
      "paddingRight",
      "paddingBottom",
      "paddingLeft",
      "borderTopWidth",
      "borderRightWidth",
      "borderBottomWidth",
      "borderLeftWidth",
      "tabSize",
    ];

    mirror.style.position = "absolute";
    mirror.style.visibility = "hidden";
    mirror.style.pointerEvents = "none";
    mirror.style.whiteSpace = "pre-wrap";
    mirror.style.overflowWrap = "break-word";
    mirror.style.wordBreak = "break-word";
    mirror.style.left = "-99999px";
    mirror.style.top = "0";
    mirror.style.height = "auto";
    mirror.style.minHeight = "0";
    mirror.style.overflow = "hidden";

    for (var i = 0; i < copiedProperties.length; i += 1) {
      var property = copiedProperties[i];
      mirror.style[property] = style[property];
    }

    mirror.style.width = rect.width + "px";

    var before = value.slice(0, caretIndex);
    mirror.appendChild(document.createTextNode(before));

    var marker = document.createElement("span");
    marker.textContent = "​";
    mirror.appendChild(marker);

    document.body.appendChild(mirror);

    var lineHeight = parseFloat(style.lineHeight);
    if (!Number.isFinite(lineHeight)) {
      lineHeight = parseFloat(style.fontSize) * 1.2;
    }

    var point = {
      x: rect.left + marker.offsetLeft - textarea.scrollLeft,
      y: rect.top + marker.offsetTop - textarea.scrollTop + lineHeight,
    };

    document.body.removeChild(mirror);

    point.x = Math.max(rect.left + 8, Math.min(point.x, rect.right - 8));
    point.y = Math.max(rect.top + 8, Math.min(point.y, rect.bottom - 8));

    return point;
  }

  function prepareEditorPopoverPanel(panel) {
    if (!panel) {
      return;
    }

    if (panel.parentNode !== document.body) {
      document.body.appendChild(panel);
    }

    panel.style.position = "fixed";
    panel.style.zIndex = "10050";
  }

  function getEditorPopoverMaxHeight(panel, viewportPadding) {
    var availableHeight = Math.max(180, window.innerHeight - viewportPadding * 2);

    if (panel && panel.classList && panel.classList.contains("docs-box-icon-picker")) {
      return Math.max(180, Math.min(450, availableHeight));
    }

    return availableHeight;
  }

  function applyEditorPopoverScrollBounds(panel, viewportPadding) {
    if (!panel) {
      return;
    }

    panel.style.maxHeight = getEditorPopoverMaxHeight(panel, viewportPadding) + "px";

    if (panel.classList && panel.classList.contains("docs-box-icon-picker")) {
      panel.style.overflowY = "auto";
      panel.style.overflowX = "hidden";
    }
  }

  function resetEditorPopoverPlacement(panel) {
    if (!panel) {
      return;
    }

    panel.style.position = "";
    panel.style.left = "";
    panel.style.top = "";
    panel.style.right = "";
    panel.style.bottom = "";
    panel.style.zIndex = "";
    panel.style.maxHeight = "";
    panel.style.overflowY = "";
    panel.style.overflowX = "";
    panel.style.visibility = "";
  }

  function positionEditorPopoverPanel(panel, textarea, selectionInfo) {
    if (!panel || !textarea) {
      return;
    }

    prepareEditorPopoverPanel(panel);

    var info = selectionInfo || getSelectionInfo(textarea);
    var anchorIndex = typeof info.end === "number" ? info.end : typeof info.start === "number" ? info.start : 0;
    var anchor = getTextareaCaretViewportPoint(textarea, anchorIndex);
    var viewportPadding = 12;

    if (!anchor) {
      var textareaRect = textarea.getBoundingClientRect();
      anchor = {
        x: textareaRect.left + 24,
        y: textareaRect.top + 36,
      };
    }

    panel.style.left = "0px";
    panel.style.top = "0px";
    panel.style.right = "auto";
    panel.style.bottom = "auto";
    applyEditorPopoverScrollBounds(panel, viewportPadding);
    panel.style.visibility = "hidden";

    var panelRect = panel.getBoundingClientRect();
    var left = anchor.x - panelRect.width / 2;
    var top = anchor.y + 12;

    if (top + panelRect.height > window.innerHeight - viewportPadding) {
      top = anchor.y - panelRect.height - 12;
    }

    left = Math.max(viewportPadding, Math.min(left, window.innerWidth - panelRect.width - viewportPadding));
    top = Math.max(viewportPadding, Math.min(top, window.innerHeight - panelRect.height - viewportPadding));

    panel.style.left = left + "px";
    panel.style.top = top + "px";
    panel.style.visibility = "";
  }

  function setTextareaSelection(textarea, value, selectionStart, selectionEnd, options) {
    var opts = options || {};
    var previousSnapshot = !opts.skipHistory ? getEditorHistorySnapshot(textarea) : null;

    if (state.editorCodeMirror && typeof state.editorCodeMirror.setValue === "function") {
      var cm = state.editorCodeMirror;
      var wrapper = cm.getWrapperElement ? cm.getWrapperElement() : null;
      var panel = getEditorModalScrollContainer(wrapper || textarea);
      var scrollInfo = cm.getScrollInfo ? cm.getScrollInfo() : { top: 0, left: 0 };
      var preservedScrollTop = typeof opts.preserveScrollTop === "number" ? opts.preserveScrollTop : scrollInfo.top || 0;
      var preservedScrollLeft = typeof opts.preserveScrollLeft === "number" ? opts.preserveScrollLeft : scrollInfo.left || 0;
      var preservedPanelScrollTop = typeof opts.preservePanelScrollTop === "number"
        ? opts.preservePanelScrollTop
        : panel && typeof panel.scrollTop === "number"
        ? panel.scrollTop
        : 0;
      var nextValue = String(value || "");
      var start = Math.max(0, Math.min(Number(selectionStart) || 0, nextValue.length));
      var end = Math.max(start, Math.min(Number(selectionEnd) || start, nextValue.length));

      cm.operation(function updateCodeMirrorSelection() {
        cm.setValue(nextValue);
        if (textarea) {
          textarea.value = nextValue;
        }
        cm.setSelection(cm.posFromIndex(start), cm.posFromIndex(end));
        cm.scrollTo(preservedScrollLeft, preservedScrollTop);
      });

      if (panel && typeof panel.scrollTop === "number") {
        panel.scrollTop = preservedPanelScrollTop;
      }

      window.requestAnimationFrame(function restoreCodeMirrorScrollPosition() {
        if (state.editorCodeMirror && state.editorCodeMirror.scrollTo) {
          state.editorCodeMirror.scrollTo(preservedScrollLeft, preservedScrollTop);
        }

        if (panel && typeof panel.scrollTop === "number") {
          panel.scrollTop = preservedPanelScrollTop;
        }
      });

      if (!opts.skipHistory) {
        pushEditorHistorySnapshot(previousSnapshot, textarea);
      }
      return;
    }

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

  function wrapHtmlSelection(textarea, openTag, closeTag, placeholder) {
    if (!textarea) {
      return;
    }

    var info = getSelectionInfo(textarea);
    var content = info.selectedText || placeholder;
    var replacement = openTag + escapeInlineHtmlText(content) + closeTag;

    replaceSelectionRange(textarea, replacement, {
      start: openTag.length,
      end: openTag.length + escapeInlineHtmlText(content).length,
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

  function applyWikiBoxAction(textarea, type) {
    if (!textarea) {
      return;
    }

    var boxType = normalizeWikiBoxType(type);
    var info = getSelectionInfo(textarea);
    var content = info.selectedText || "Testo del box";
    var block = buildWikiBoxSourceHtml(boxType, "", content);

    if (info.selectedText) {
      replaceSelectionRange(textarea, block, {
        start: 0,
        end: block.length,
      });
      return;
    }

    insertBlockAtCursor(textarea, block, {
      start: block.indexOf(escapeInlineHtmlText(content)),
      end: block.indexOf(escapeInlineHtmlText(content)) + escapeInlineHtmlText(content).length,
    });
  }

  function buildWikiBoxSourceHtml(type, title, content) {
    var boxType = normalizeWikiBoxType(type);
    var meta = WIKI_BOX_TYPES[boxType] || WIKI_BOX_TYPES.info;
    var titleValue = readString(title, "");
    var titleHtml = titleValue ? '<p class="wiki-box__title">' + escapeInlineHtmlText(titleValue) + '</p>' : "";
    var contentHtml = '<p>' + escapeInlineHtmlText(content || "Testo del box") + '</p>';
    var titleClass = titleValue ? " has-title" : "";

    return '<aside class="wiki-box wiki-box--' + boxType + titleClass + '" role="note">' +
      '<div class="wiki-box__icon" aria-hidden="true"><i class="' + escapeInlineHtmlText(meta.icon) + '"></i></div>' +
      '<div class="wiki-box__content">' + titleHtml + contentHtml + '</div>' +
      '</aside>';
  }

  function normalizeWikiBoxType(value) {
    var type = cleanSegment(readString(value, "info"));
    return WIKI_BOX_TYPES[type] ? type : "info";
  }

  function applyLinkAction(textarea, isImage) {
    var info = getSelectionInfo(textarea);
    var label = info.selectedText || (isImage ? "Alt text" : "Testo link");

    if (isImage) {
      var imageHtml = buildWikiImageHtml("https://", label, "full", "100%");
      replaceSelectionRange(textarea, imageHtml, {
        start: imageHtml.indexOf("https://"),
        end: imageHtml.indexOf("https://") + "https://".length,
      });
      return;
    }

    var safeLabel = escapeInlineHtmlText(label);
    var replacement = '<a href="https://">' + safeLabel + '</a>';
    var urlStart = replacement.indexOf("https://");
    var urlEnd = urlStart + "https://".length;

    replaceSelectionRange(textarea, replacement, {
      start: urlStart,
      end: urlEnd,
    });
  }

  function ensureEditorLinkPanel() {
    if (state.editorLinkPanel && state.editorLinkPanel.panel && state.editorLinkPanel.panel.isConnected) {
      return state.editorLinkPanel;
    }

    var panel = document.createElement("div");
    panel.className = "docs-link-editor docs-editor-md-context";
    panel.setAttribute("data-docs-link-editor", "");
    panel.hidden = true;

    panel.innerHTML =
      '<p class="docs-link-editor__label">Link</p>' +
      '<label class="docs-link-editor__field">' +
      '<span>Testo visibile</span>' +
      '<input type="text" data-docs-link-label autocomplete="off" spellcheck="false" placeholder="Testo link">' +
      '</label>' +
      '<label class="docs-link-editor__field">' +
      '<span>URL</span>' +
      '<input type="url" data-docs-link-url autocomplete="off" spellcheck="false" placeholder="https://...">' +
      '</label>' +
      '<div class="docs-link-editor__actions">' +
      '<button type="button" class="docs-link-editor__btn docs-link-editor__btn--primary" data-docs-link-apply>Applica</button>' +
      '<button type="button" class="docs-link-editor__btn" data-docs-link-cancel>Annulla</button>' +
      '</div>' +
      '<p class="docs-link-editor__status" data-docs-link-status aria-live="polite"></p>';

    var linkPanel = {
      panel: panel,
      label: panel.querySelector("[data-docs-link-label]"),
      url: panel.querySelector("[data-docs-link-url]"),
      apply: panel.querySelector("[data-docs-link-apply]"),
      cancel: panel.querySelector("[data-docs-link-cancel]"),
      status: panel.querySelector("[data-docs-link-status]"),
    };

    panel.addEventListener("mousedown", function onLinkPanelMouseDown(event) {
      if (event.target && event.target.closest && event.target.closest("input, textarea, select, button")) {
        return;
      }
      event.preventDefault();
    });

    if (linkPanel.apply) {
      linkPanel.apply.addEventListener("click", function onLinkApplyClick(event) {
        event.preventDefault();
        applyLinkEditorSelection();
      });
    }

    if (linkPanel.cancel) {
      linkPanel.cancel.addEventListener("click", function onLinkCancelClick(event) {
        event.preventDefault();
        closeLinkEditor({ restoreTextareaFocus: true });
      });
    }

    if (linkPanel.label) {
      linkPanel.label.addEventListener("keydown", handleLinkEditorKeydown);
    }

    if (linkPanel.url) {
      linkPanel.url.addEventListener("keydown", handleLinkEditorKeydown);
    }

    document.body.appendChild(panel);
    state.editorLinkPanel = linkPanel;
    return linkPanel;
  }

  function isLinkEditorOpen() {
    return !!(state.editorLinkPanel && state.editorLinkPanel.panel && !state.editorLinkPanel.panel.hasAttribute("hidden"));
  }

  function isEventInsideLinkEditor(target) {
    if (state.editorLinkPanel && state.editorLinkPanel.panel && target && state.editorLinkPanel.panel.contains(target)) {
      return true;
    }

    if (
      state.elements &&
      state.elements.editorMarkdownToolbar &&
      target &&
      target.closest &&
      target.closest('button[data-md-action="link"]') &&
      state.elements.editorMarkdownToolbar.contains(target)
    ) {
      return true;
    }

    return false;
  }

  function setLinkEditorStatus(message, tone) {
    var panel = state.editorLinkPanel;
    if (!panel || !panel.status) {
      return;
    }

    panel.status.textContent = readString(message, "");
    panel.status.classList.remove("is-error", "is-success");

    if (tone === "error") {
      panel.status.classList.add("is-error");
    } else if (tone === "success") {
      panel.status.classList.add("is-success");
    }
  }

  function normalizeExternalLinkUrl(value) {
    var url = readString(value, "");
    if (!url) {
      return "";
    }

    var lower = url.toLowerCase();
    if (
      lower.indexOf("http://") === 0 ||
      lower.indexOf("https://") === 0 ||
      lower.indexOf("mailto:") === 0 ||
      lower.indexOf("tel:") === 0 ||
      lower.indexOf("docs.html?doc=") === 0 ||
      url.charAt(0) === "#"
    ) {
      return url;
    }

    return "https://" + url;
  }

  function toggleLinkEditor(textarea) {
    if (isLinkEditorOpen()) {
      closeLinkEditor({ restoreTextareaFocus: true });
      return;
    }

    openLinkEditor(textarea);
  }

  function openLinkEditor(textarea) {
    if (isVisualEditorMode()) {
      openVisualLinkEditor();
      return;
    }

    var panel = ensureEditorLinkPanel();
    var editorTextarea = textarea || getEditorMarkdownTextarea();
    if (!panel || !editorTextarea) {
      return;
    }

    var snapshot = getSelectionInfo(editorTextarea);
    var existing = findHtmlAnchorAroundTextareaSelection(snapshot);
    var selectedText = existing ? existing.label : snapshot.selectedText || "Testo link";
    var href = existing ? existing.href : "https://";

    state.linkSelection = {
      mode: "html",
      start: existing ? existing.start : snapshot.start,
      end: existing ? existing.end : snapshot.end,
      selectedText: selectedText,
      element: null,
    };

    closeInternalLinkPicker();
    closeColorPicker();
    closeTooltipEditor();
    closeEditorImagePicker();
    closeMediaLibraryPanel();

    if (panel.label) {
      panel.label.value = selectedText;
    }

    if (panel.url) {
      panel.url.value = href;
    }

    setLinkEditorStatus("", "");
    panel.panel.hidden = false;
    positionEditorPopoverPanel(panel.panel, editorTextarea, {
      start: state.linkSelection.start,
      end: state.linkSelection.end,
    });

    if (panel.url && typeof panel.url.focus === "function") {
      panel.url.focus();
      panel.url.select();
    }
  }

  function findHtmlAnchorAroundTextareaSelection(info) {
    if (!info || !info.value) {
      return null;
    }

    var value = String(info.value || "");
    var start = Math.max(0, Math.min(Number(info.start) || 0, value.length));
    var end = Math.max(start, Math.min(Number(info.end) || start, value.length));
    var anchorStart = value.lastIndexOf("<a", start);
    if (anchorStart === -1) {
      return null;
    }

    var openEnd = value.indexOf(">", anchorStart);
    var anchorEnd = value.indexOf("</a>", Math.max(end, openEnd));
    if (openEnd === -1 || anchorEnd === -1) {
      return null;
    }

    anchorEnd += 4;
    if (end < anchorStart || start > anchorEnd) {
      return null;
    }

    var rawOpen = value.slice(anchorStart, openEnd + 1);
    var href = readAttributeFromHtmlTag(rawOpen, "href");
    if (!href) {
      return null;
    }

    return {
      start: anchorStart,
      end: anchorEnd,
      href: href,
      label: stripHtmlForEditorLabel(value.slice(openEnd + 1, anchorEnd - 4)) || "Testo link",
    };
  }

  function readAttributeFromHtmlTag(tagHtml, attrName) {
    var template = document.createElement("template");
    template.innerHTML = String(tagHtml || "") + "</a>";
    var element = template.content.querySelector("a");
    return element ? readString(element.getAttribute(attrName), "") : "";
  }

  function stripHtmlForEditorLabel(value) {
    var template = document.createElement("template");
    template.innerHTML = String(value || "");
    return readString(template.content.textContent, "Testo link");
  }

  function closeLinkEditor(options) {
    if (!state.editorLinkPanel || !state.editorLinkPanel.panel) {
      return;
    }

    var opts = options || {};
    var snapshot = state.linkSelection;

    state.editorLinkPanel.panel.hidden = true;
    resetEditorPopoverPlacement(state.editorLinkPanel.panel);
    setLinkEditorStatus("", "");

    if (!opts.keepSelection) {
      state.linkSelection = null;
      state.visualLinkSelection = null;
    }

    if (snapshot && snapshot.mode === "visual") {
      if (opts.restoreTextareaFocus && state.elements && state.elements.editorVisualEditor) {
        try {
          state.elements.editorVisualEditor.focus({ preventScroll: true });
        } catch (_error) {
          state.elements.editorVisualEditor.focus();
        }
      }
      return;
    }

    if (opts.restoreTextareaFocus && snapshot) {
      var textarea = getEditorMarkdownTextarea();
      if (textarea && typeof textarea.setSelectionRange === "function") {
        try {
          textarea.focus({ preventScroll: true });
        } catch (_focusError) {
          textarea.focus();
        }

        var value = String(textarea.value || "");
        var start = Math.max(0, Math.min(Number(snapshot.start) || 0, value.length));
        var end = Math.max(start, Math.min(Number(snapshot.end) || start, value.length));
        textarea.setSelectionRange(start, end);
      }
    }
  }

  function handleLinkEditorKeydown(event) {
    if (!event) {
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeLinkEditor({ restoreTextareaFocus: true });
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      applyLinkEditorSelection();
    }
  }

  function applyLinkEditorSelection() {
    var panel = state.editorLinkPanel || ensureEditorLinkPanel();
    if (!panel) {
      return;
    }

    var label = readString(panel.label && panel.label.value, "Testo link");
    var href = normalizeExternalLinkUrl(panel.url && panel.url.value);

    if (!href) {
      setLinkEditorStatus("Inserisci un URL valido.", "error");
      return;
    }

    if (state.linkSelection && state.linkSelection.mode === "visual") {
      applyVisualLinkEditorSelection(label, href);
      return;
    }

    var textarea = getEditorMarkdownTextarea();
    if (!textarea) {
      closeLinkEditor();
      return;
    }

    var value = String(textarea.value || "");
    var snapshot = state.linkSelection || getSelectionInfo(textarea);
    var start = Math.max(0, Math.min(Number(snapshot.start) || 0, value.length));
    var end = Math.max(start, Math.min(Number(snapshot.end) || start, value.length));
    var replacement = '<a href="' + escapeInlineHtmlText(href) + '">' + escapeInlineHtmlText(label) + '</a>';

    replaceSelectionByRange(textarea, start, end, replacement, {
      start: replacement.length,
      end: replacement.length,
    });

    closeLinkEditor();
  }

  function openVisualLinkEditor() {
    if (!state.elements || !state.elements.editorVisualEditor) {
      return;
    }

    var panel = ensureEditorLinkPanel();
    if (!panel) {
      return;
    }

    saveVisualSelectionSnapshot();

    var existingLink = findVisualLinkElementFromSelection();
    var selectedText = getVisualSelectionText() || "Testo link";
    var href = "https://";

    if (existingLink) {
      selectedText = readString(existingLink.textContent, selectedText);
      href = readString(existingLink.getAttribute("href"), href);
      state.visualLinkSelection = document.createRange();
      state.visualLinkSelection.selectNodeContents(existingLink);
    } else {
      state.visualLinkSelection = state.visualTooltipSelection ? state.visualTooltipSelection.cloneRange() : null;
    }

    state.linkSelection = {
      mode: "visual",
      selectedText: selectedText,
      element: existingLink || null,
    };

    closeInternalLinkPicker();
    closeColorPicker();
    closeTooltipEditor();
    closeEditorImagePicker();
    closeMediaLibraryPanel();

    if (panel.label) {
      panel.label.value = selectedText;
    }

    if (panel.url) {
      panel.url.value = href;
    }

    setLinkEditorStatus("", "");
    panel.panel.hidden = false;
    positionEditorPopoverAtPoint(panel.panel, getVisualSelectionAnchorPoint());

    if (panel.url && typeof panel.url.focus === "function") {
      panel.url.focus();
      panel.url.select();
    }
  }

  function restoreVisualLinkSelection() {
    var range = state.visualLinkSelection || state.visualTooltipSelection;
    if (!range || !window.getSelection || !state.elements || !state.elements.editorVisualEditor) {
      return false;
    }

    var selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);

    try {
      state.elements.editorVisualEditor.focus({ preventScroll: true });
    } catch (_error) {
      state.elements.editorVisualEditor.focus();
    }

    return true;
  }

  function applyVisualLinkEditorSelection(label, href) {
    var snapshot = state.linkSelection || {};
    var editor = state.elements && state.elements.editorVisualEditor;
    if (!editor) {
      closeLinkEditor();
      return;
    }

    rememberVisualEditorHistoryBeforeProgrammaticChange();

    if (snapshot.element && snapshot.element.isConnected) {
      snapshot.element.textContent = label;
      snapshot.element.setAttribute("href", href);
      closeLinkEditor();
      return;
    }

    if (!restoreVisualLinkSelection()) {
      closeLinkEditor();
      return;
    }

    document.execCommand("insertHTML", false, '<a href="' + escapeInlineHtmlText(href) + '">' + escapeInlineHtmlText(label) + '</a>');
    closeLinkEditor();
  }

  function ensureEditorColorPickerChoices() {
    if (!state.elements || !state.elements.editorColorPicker) {
      return;
    }

    var picker = state.elements.editorColorPicker;
    var choices = Array.isArray(state.wikiColorChoices) ? state.wikiColorChoices : [];
    if (!choices.length) {
      return;
    }

    picker.innerHTML = "";

    var label = document.createElement("p");
    label.className = "docs-color-picker__label";
    label.textContent = "Colore testo";
    picker.appendChild(label);

    var clearButton = document.createElement("button");
    clearButton.type = "button";
    clearButton.className = "docs-color-picker__choice docs-color-picker__choice--clear";
    clearButton.setAttribute("data-docs-color-choice", "");
    clearButton.setAttribute("data-docs-color-clear", "");
    clearButton.setAttribute("aria-label", "Colore base");
    clearButton.removeAttribute("title");
    clearButton.textContent = "Base";
    picker.appendChild(clearButton);

    appendEditorColorPickerGroup(picker, "Colori standard", choices.filter(function filterStandardColor(choice) {
      return !choice || choice.group !== "tooltip";
    }));

    appendEditorColorPickerGroup(picker, "Colori tooltip", choices.filter(function filterTooltipColor(choice) {
      return choice && choice.group === "tooltip";
    }));
  }

  function appendEditorColorPickerGroup(picker, title, choices) {
    if (!picker || !Array.isArray(choices) || !choices.length) {
      return;
    }

    var group = document.createElement("section");
    group.className = "docs-color-picker__section";

    var heading = document.createElement("p");
    heading.className = "docs-color-picker__section-title";
    heading.textContent = title;
    group.appendChild(heading);

    var grid = document.createElement("div");
    grid.className = "docs-color-picker__grid";

    for (var i = 0; i < choices.length; i += 1) {
      var choice = choices[i];
      var color = normalizeWikiColor(choice.value);
      var button = document.createElement("button");
      button.type = "button";
      button.className = "docs-color-picker__choice wiki-color wiki-color-" + color;
      button.setAttribute("data-docs-color-choice", color);
      button.setAttribute("aria-label", choice.label);
      button.removeAttribute("title");
      button.textContent = "Aa";

      if (choice.tooltipType) {
        var tooltipType = normalizeWikiTooltipType(choice.tooltipType);
        var tooltipMeta = readWikiTooltipTypeMeta(tooltipType);
        button.classList.add("docs-color-picker__choice--tooltip");
        button.setAttribute("data-docs-tooltip-color-type", tooltipType);
        button.style.color = "rgb(var(--docs-tooltip-" + tooltipType + "-rgb))";
        button.innerHTML = "";

        var tooltipIcon = document.createElement("i");
        tooltipIcon.className = tooltipMeta.icon;
        tooltipIcon.setAttribute("aria-hidden", "true");
        button.appendChild(tooltipIcon);
      }

      grid.appendChild(button);
    }

    group.appendChild(grid);
    picker.appendChild(group);
  }

  function ensureEditorTooltipPanelEnhancements() {
    if (!state.elements || !state.elements.editorTooltipPanel) {
      return;
    }

    var panel = state.elements.editorTooltipPanel;
    var visibleField = state.elements.editorTooltipVisible || panel.querySelector("[data-docs-tooltip-visible]");
    var textField = state.elements.editorTooltipText || panel.querySelector("[data-docs-tooltip-text]");

    if (!state.elements.editorTooltipTitle) {
      var titleLabel = document.createElement("label");
      titleLabel.className = "docs-tooltip-editor__field docs-tooltip-editor__field--title";
      titleLabel.innerHTML = '<span>Titolo tooltip</span><input type="text" data-docs-tooltip-title placeholder="Facoltativo" autocomplete="off" spellcheck="false">';
      panel.insertBefore(titleLabel, visibleField && visibleField.closest ? visibleField.closest("label") : panel.firstChild);
      state.elements.editorTooltipTitle = titleLabel.querySelector("[data-docs-tooltip-title]");
    }

    if (!state.elements.editorTooltipType) {
      var typeLabel = document.createElement("label");
      typeLabel.className = "docs-tooltip-editor__field docs-tooltip-editor__field--type";

      var typeText = document.createElement("span");
      typeText.textContent = "Tipologia";
      typeLabel.appendChild(typeText);

      var select = document.createElement("select");
      select.setAttribute("data-docs-tooltip-type", "");
      select.autocomplete = "off";

      var keys = Object.keys(WIKI_TOOLTIP_TYPES);
      for (var i = 0; i < keys.length; i += 1) {
        var key = keys[i];
        var option = document.createElement("option");
        option.value = key;
        option.textContent = WIKI_TOOLTIP_TYPES[key].label;
        select.appendChild(option);
      }

      typeLabel.appendChild(select);
      panel.insertBefore(typeLabel, textField && textField.closest ? textField.closest("label") : panel.firstChild);
      state.elements.editorTooltipType = select;
    }
  }

  function normalizeWikiTooltipType(value) {
    var type = cleanSegment(readString(value, "base"));
    return WIKI_TOOLTIP_TYPES[type] ? type : "base";
  }

  function readWikiTooltipTypeMeta(type) {
    var normalized = normalizeWikiTooltipType(type);
    return WIKI_TOOLTIP_TYPES[normalized] || WIKI_TOOLTIP_TYPES.base;
  }

  function applyWikiTooltipTypeClass(element, type) {
    if (!element || !element.classList) {
      return;
    }

    var keys = Object.keys(WIKI_TOOLTIP_TYPES);
    for (var i = 0; i < keys.length; i += 1) {
      element.classList.remove("wiki-tooltip--" + keys[i]);
    }
  }

  function readEditorTooltipFormValues(fallbackVisible, fallbackText) {
    var title = readString(state.elements && state.elements.editorTooltipTitle && state.elements.editorTooltipTitle.value, "");
    var type = normalizeWikiTooltipType(state.elements && state.elements.editorTooltipType && state.elements.editorTooltipType.value);
    var visible = readString(state.elements && state.elements.editorTooltipVisible && state.elements.editorTooltipVisible.value, fallbackVisible || "testo visibile");
    var text = readString(state.elements && state.elements.editorTooltipText && state.elements.editorTooltipText.value, fallbackText || "testo tooltip");

    return {
      visibleText: visible,
      tooltipTitle: title,
      tooltipType: type,
      tooltipText: text,
    };
  }

  function setTooltipEditorFields(visibleText, tooltipText, tooltipTitle, tooltipType) {
    ensureEditorTooltipPanelEnhancements();

    if (state.elements.editorTooltipVisible) {
      state.elements.editorTooltipVisible.value = readString(visibleText, "testo visibile");
    }

    if (state.elements.editorTooltipTitle) {
      state.elements.editorTooltipTitle.value = readString(tooltipTitle, "");
    }

    if (state.elements.editorTooltipType) {
      state.elements.editorTooltipType.value = normalizeWikiTooltipType(tooltipType);
    }

    if (state.elements.editorTooltipText) {
      state.elements.editorTooltipText.value = readString(tooltipText, "");
    }
  }

  function applyTooltipAction(textarea) {
    if (!textarea) {
      return;
    }

    if (state.elements && state.elements.editorTooltipPanel) {
      toggleTooltipEditor(textarea);
      return;
    }

    applyTooltipPromptFallback(textarea);
  }

  function applyTooltipPromptFallback(textarea) {
    var info = getSelectionInfo(textarea);
    var visibleText = info.selectedText || "testo visibile";
    var tooltipInput = window.prompt("Contenuto tooltip", "");

    if (tooltipInput === null) {
      if (typeof textarea.focus === "function") {
        textarea.focus();
      }
      return;
    }

    var snippet = buildTooltipHtml(visibleText, tooltipInput, "", "base");

    replaceSelectionByRange(textarea, info.start, info.end, snippet, {
      start: snippet.length,
      end: snippet.length,
    });
  }

  function buildTooltipHtml(visibleText, tooltipText, tooltipTitle, tooltipType) {
    var visible = escapeInlineHtmlText(readString(visibleText, "testo visibile"));
    var tooltip = escapeInlineHtmlText(readString(tooltipText, "testo tooltip"));
    var title = escapeInlineHtmlText(readString(tooltipTitle, ""));
    var type = normalizeWikiTooltipType(tooltipType);
    var titleAttr = title ? ' data-tooltip-title="' + title + '"' : "";

    return '<span class="wiki-tooltip" tabindex="0" data-tooltip="' + tooltip + '" data-tooltip-type="' + type + '"' + titleAttr + '>' + visible + '</span>';
  }

  function buildTooltipShortcode(visibleText, tooltipText) {
    var visibleSegment = escapeTooltipShortcodeSegment(visibleText, "testo visibile");
    var tooltipSegment = escapeTooltipShortcodeSegment(tooltipText, "testo tooltip");
    return "{{tooltip:" + visibleSegment + "|" + tooltipSegment + "}}";
  }

  function isTooltipEditorOpen() {
    return !!(
      state.elements &&
      state.elements.editorTooltipPanel &&
      !state.elements.editorTooltipPanel.hasAttribute("hidden")
    );
  }

  function isEventInsideTooltipEditor(target) {
    if (!state.elements) {
      return false;
    }

    if (state.elements.editorTooltipPanel && state.elements.editorTooltipPanel.contains(target)) {
      return true;
    }

    if (
      state.elements.editorMarkdownToolbar &&
      target &&
      target.closest &&
      target.closest('button[data-md-action="tooltip"]') &&
      state.elements.editorMarkdownToolbar.contains(target)
    ) {
      return true;
    }

    return false;
  }

  function toggleTooltipEditor(textarea) {
    if (isTooltipEditorOpen()) {
      closeTooltipEditor({ restoreTextareaFocus: true });
      return;
    }

    openTooltipEditor(textarea);
  }

  function openTooltipEditor(textarea) {
    if (!state.elements || !state.elements.editorTooltipPanel) {
      applyTooltipPromptFallback(textarea);
      return;
    }

    var editorTextarea = textarea || getEditorMarkdownTextarea();
    if (!editorTextarea) {
      return;
    }

    var info = getSelectionInfo(editorTextarea);
    var existing = findHtmlTooltipAroundTextareaSelection(info) || findTooltipShortcodeAroundSelection(info);
    var visibleText = existing ? existing.label : info.selectedText || "testo visibile";
    var tooltipText = existing ? existing.tooltipText : "";
    var tooltipTitle = existing ? readString(existing.tooltipTitle, "") : "";
    var tooltipType = existing ? normalizeWikiTooltipType(existing.tooltipType) : "base";

    state.tooltipSelection = {
      start: existing ? existing.start : info.start,
      end: existing ? existing.end : info.end,
      selectedText: existing ? existing.raw : info.selectedText,
    };

    closeInternalLinkPicker();
    closeColorPicker();
    closeMediaLibraryPanel();

    setTooltipEditorFields(visibleText, tooltipText, tooltipTitle, tooltipType);

    state.elements.editorTooltipPanel.hidden = false;
    positionEditorPopoverPanel(state.elements.editorTooltipPanel, editorTextarea, {
      start: state.tooltipSelection.start,
      end: state.tooltipSelection.end,
    });

    var focusTarget = state.elements.editorTooltipText || state.elements.editorTooltipVisible;
    if (focusTarget && typeof focusTarget.focus === "function") {
      focusTarget.focus();
      if (tooltipText && typeof focusTarget.select === "function") {
        focusTarget.select();
      }
    }
  }

  function closeTooltipEditor(options) {
    if (!state.elements || !state.elements.editorTooltipPanel) {
      return;
    }

    var opts = options || {};
    var snapshot = state.tooltipSelection;

    state.elements.editorTooltipPanel.hidden = true;
    resetEditorPopoverPlacement(state.elements.editorTooltipPanel);

    if (state.elements.editorTooltipVisible) {
      state.elements.editorTooltipVisible.value = "";
    }

    if (state.elements.editorTooltipTitle) {
      state.elements.editorTooltipTitle.value = "";
    }

    if (state.elements.editorTooltipType) {
      state.elements.editorTooltipType.value = "base";
    }

    if (state.elements.editorTooltipText) {
      state.elements.editorTooltipText.value = "";
    }

    if (!opts.keepSelection) {
      state.tooltipSelection = null;
      state.visualTooltipSelection = null;
    }

    if (snapshot && snapshot.mode === "visual") {
      if (opts.restoreTextareaFocus && state.elements.editorVisualEditor) {
        try {
          state.elements.editorVisualEditor.focus({ preventScroll: true });
        } catch (_error) {
          state.elements.editorVisualEditor.focus();
        }
      }
      return;
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

  function handleTooltipEditorKeydown(event) {
    if (!event) {
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeTooltipEditor({ restoreTextareaFocus: true });
      return;
    }

    if (event.key === "Enter" && isPrimaryModifierPressed(event)) {
      event.preventDefault();
      event.stopPropagation();
      applyTooltipEditorSelection();
    }
  }

  function applyTooltipEditorSelection() {
    if (state.tooltipSelection && state.tooltipSelection.mode === "visual") {
      applyVisualTooltipEditorSelection();
      return;
    }

    var textarea = getEditorMarkdownTextarea();
    if (!textarea) {
      return;
    }

    var value = getEditorMarkdownSource();
    var snapshot = state.tooltipSelection || getSelectionInfo(textarea);
    var start = Math.max(0, Math.min(Number(snapshot.start) || 0, value.length));
    var end = Math.max(start, Math.min(Number(snapshot.end) || start, value.length));
    var selectedText = value.slice(start, end) || readString(snapshot.selectedText, "");
    var tooltipValues = readEditorTooltipFormValues(selectedText || "testo visibile", "testo tooltip");
    var snippet = buildTooltipHtml(
      tooltipValues.visibleText,
      tooltipValues.tooltipText,
      tooltipValues.tooltipTitle,
      tooltipValues.tooltipType
    );

    replaceSelectionByRange(textarea, start, end, snippet, {
      start: snippet.length,
      end: snippet.length,
    });

    closeTooltipEditor();
  }

  function findHtmlTooltipAroundTextareaSelection(info) {
    if (!info || !info.value) {
      return null;
    }

    var value = String(info.value || "");
    var start = Math.max(0, Math.min(Number(info.start) || 0, value.length));
    var end = Math.max(start, Math.min(Number(info.end) || start, value.length));
    var spanStart = value.lastIndexOf("<span", start);

    while (spanStart !== -1) {
      var openEnd = value.indexOf(">", spanStart);
      var closeStart = value.indexOf("</span>", Math.max(end, openEnd));

      if (openEnd === -1 || closeStart === -1) {
        return null;
      }

      var closeEnd = closeStart + "</span>".length;
      var openTag = value.slice(spanStart, openEnd + 1);

      if (end >= spanStart && start <= closeEnd && /class=["'][^"']*wiki-tooltip[^"']*["']/i.test(openTag)) {
        return {
          start: spanStart,
          end: closeEnd,
          raw: value.slice(spanStart, closeEnd),
          label: stripHtmlForEditorLabel(value.slice(openEnd + 1, closeStart)) || "testo visibile",
          tooltipText: readAttributeFromGenericHtmlTag(openTag, "data-tooltip", "span"),
          tooltipTitle: readAttributeFromGenericHtmlTag(openTag, "data-tooltip-title", "span"),
          tooltipType: normalizeWikiTooltipType(readAttributeFromGenericHtmlTag(openTag, "data-tooltip-type", "span")),
        };
      }

      spanStart = value.lastIndexOf("<span", spanStart - 1);
    }

    return null;
  }

  function readAttributeFromGenericHtmlTag(tagHtml, attrName, tagName) {
    var tag = cleanSegment(tagName || "span") || "span";
    var template = document.createElement("template");
    template.innerHTML = String(tagHtml || "") + "</" + tag + ">";
    var element = template.content.querySelector(tag);
    return element ? readString(element.getAttribute(attrName), "") : "";
  }

  function findTooltipShortcodeAroundSelection(info) {
    if (!info || !info.value) {
      return null;
    }

    var value = String(info.value || "");
    var searchStart = Math.max(0, Math.min(Number(info.start) || 0, value.length));
    var shortcodeStart = value.lastIndexOf("{{tooltip:", searchStart);

    if (shortcodeStart === -1) {
      return null;
    }

    var labelResult = readTooltipTokenSegment(value, shortcodeStart + 10, "|");
    if (!labelResult.found) {
      return null;
    }

    var textResult = readTooltipTokenSegment(value, labelResult.nextIndex, "}}");
    if (!textResult.found) {
      return null;
    }

    var shortcodeEnd = textResult.nextIndex;
    if (info.end < shortcodeStart || info.start > shortcodeEnd) {
      return null;
    }

    return {
      start: shortcodeStart,
      end: shortcodeEnd,
      raw: value.slice(shortcodeStart, shortcodeEnd),
      label: decodeTooltipShortcodeSegment(labelResult.value, "testo visibile"),
      tooltipText: decodeTooltipShortcodeSegment(textResult.value, ""),
      tooltipTitle: "",
      tooltipType: "base",
    };
  }

  function escapeTooltipShortcodeSegment(value, fallback) {
    var source = readString(value, "").replace(/\r?\n+/g, " ").trim();
    if (!source) {
      source = readString(fallback, "").trim();
    }

    return source
      .replace(/\\/g, "\\\\")
      .replace(/\|/g, "\\|")
      .replace(/\{/g, "\\{")
      .replace(/\}/g, "\\}");
  }

  function decodeTooltipShortcodeSegment(value, fallback) {
    var raw = readString(value, "");
    var decoded = "";
    var backslash = String.fromCharCode(92);
    var carriageReturn = String.fromCharCode(13);
    var lineFeed = String.fromCharCode(10);

    for (var i = 0; i < raw.length; i += 1) {
      var current = raw.charAt(i);

      if (current === backslash && i + 1 < raw.length) {
        var next = raw.charAt(i + 1);

        if (next === backslash || next === "|" || next === "{" || next === "}") {
          decoded += next;
          i += 1;
          continue;
        }
      }

      decoded += current;
    }

    var source = decoded
      .split(carriageReturn).join(lineFeed)
      .split(lineFeed).join(" ")
      .trim();

    if (!source) {
      source = readString(fallback, "").trim();
    }

    return source;
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
    closeTooltipEditor();
    closeMediaLibraryPanel();

    state.elements.editorColorPicker.hidden = false;
    positionEditorPopoverPanel(state.elements.editorColorPicker, editorTextarea, snapshot);
  }

  function closeColorPicker(options) {
    if (!state.elements || !state.elements.editorColorPicker) {
      return;
    }

    var opts = options || {};
    var snapshot = state.colorSelection;

    state.elements.editorColorPicker.hidden = true;
    resetEditorPopoverPlacement(state.elements.editorColorPicker);

    if (!opts.keepSelection) {
      state.colorSelection = null;
      state.visualColorSelection = null;
    }

    if (snapshot && snapshot.mode === "visual") {
      if (opts.restoreTextareaFocus && state.elements.editorVisualEditor) {
        try {
          state.elements.editorVisualEditor.focus({ preventScroll: true });
        } catch (_error) {
          state.elements.editorVisualEditor.focus();
        }
      }
      return;
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
      clay: true,
      copper: true,
      indigo: true,
      olive: true,
      ash: true,
      "tooltip-base": true,
      "tooltip-lore": true,
      "tooltip-spell": true,
      "tooltip-monster": true,
      "tooltip-npc": true,
      "tooltip-location": true,
      "tooltip-item": true,
      "tooltip-rule": true,
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

  function clearColoredText() {
    if (state.colorSelection && state.colorSelection.mode === "visual") {
      clearVisualColoredText();
      return;
    }

    var textarea = getEditorMarkdownTextarea();
    if (!textarea) {
      closeColorPicker();
      return;
    }

    var value = String(textarea.value || "");
    var snapshot = state.colorSelection || getSelectionInfo(textarea);
    var existing = findHtmlColorSpanAroundTextareaSelection({
      value: value,
      start: snapshot.start,
      end: snapshot.end,
    });

    if (existing) {
      replaceSelectionByRange(textarea, existing.start, existing.end, existing.content, {
        start: 0,
        end: existing.content.length,
      });
      closeColorPicker();
      return;
    }

    closeColorPicker({ restoreTextareaFocus: true });
  }

  function clearVisualColoredText() {
    var snapshot = state.colorSelection || {};
    var editor = state.elements && state.elements.editorVisualEditor;
    if (!editor) {
      closeColorPicker();
      return;
    }

    rememberVisualEditorHistoryBeforeProgrammaticChange();

    if (snapshot.element && snapshot.element.isConnected) {
      unwrapElementPreservingChildren(snapshot.element);
      closeColorPicker();
      return;
    }

    var range = state.visualColorSelection || state.visualTooltipSelection || getCurrentVisualRange();
    if (!range || !editor.contains(range.commonAncestorContainer)) {
      closeColorPicker();
      return;
    }

    var root = range.commonAncestorContainer;
    if (root && root.nodeType === Node.TEXT_NODE) {
      root = root.parentNode;
    }

    var scope = root && root.closest ? root.closest(".docs-visual-editor") || editor : editor;
    var colored = scope.querySelectorAll ? scope.querySelectorAll(".wiki-color") : [];
    var touched = [];

    for (var i = 0; i < colored.length; i += 1) {
      if (typeof range.intersectsNode === "function" && range.intersectsNode(colored[i])) {
        touched.push(colored[i]);
      }
    }

    if (!touched.length) {
      closeColorPicker();
      return;
    }

    for (var j = 0; j < touched.length; j += 1) {
      unwrapElementPreservingChildren(touched[j]);
    }

    closeColorPicker();
  }

  function unwrapElementPreservingChildren(element) {
    if (!element || !element.parentNode) {
      return;
    }

    var parent = element.parentNode;
    while (element.firstChild) {
      parent.insertBefore(element.firstChild, element);
    }
    parent.removeChild(element);
  }

  function findHtmlColorSpanAroundTextareaSelection(info) {
    if (!info || !info.value) {
      return null;
    }

    var value = String(info.value || "");
    var start = Math.max(0, Math.min(Number(info.start) || 0, value.length));
    var end = Math.max(start, Math.min(Number(info.end) || start, value.length));
    var searchStart = value.lastIndexOf("<span", start);

    while (searchStart !== -1) {
      var openEnd = value.indexOf(">", searchStart);
      var closeStart = value.indexOf("</span>", Math.max(end, openEnd));

      if (openEnd === -1 || closeStart === -1) {
        return null;
      }

      var openTag = value.slice(searchStart, openEnd + 1);
      var closeEnd = closeStart + "</span>".length;

      if (end >= searchStart && start <= closeEnd && /class=["'][^"']*wiki-color[^"']*["']/i.test(openTag)) {
        return {
          start: searchStart,
          end: closeEnd,
          content: value.slice(openEnd + 1, closeStart),
        };
      }

      searchStart = value.lastIndexOf("<span", searchStart - 1);
    }

    return null;
  }

  function insertColoredText(colorName) {
    if (state.colorSelection && state.colorSelection.mode === "visual") {
      insertVisualColoredText(colorName);
      return;
    }

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
    closeTooltipEditor();

    state.elements.editorInternalLinkInput.value = "";
    state.elements.editorInternalLinkPanel.hidden = false;
    renderInternalLinkResults();
    positionEditorPopoverPanel(state.elements.editorInternalLinkPanel, editorTextarea, snapshot);

    state.elements.editorInternalLinkInput.focus();
  }

  function closeInternalLinkPicker(options) {
    if (!state.elements || !state.elements.editorInternalLinkPanel) {
      return;
    }

    var opts = options || {};
    var snapshot = state.internalLinkSelection;

    state.elements.editorInternalLinkPanel.hidden = true;
    resetEditorPopoverPlacement(state.elements.editorInternalLinkPanel);
    state.internalLinkQuery = "";

    if (state.elements.editorInternalLinkInput) {
      state.elements.editorInternalLinkInput.value = "";
    }

    if (state.elements.editorInternalLinkResults) {
      state.elements.editorInternalLinkResults.innerHTML = "";
    }

    if (!opts.keepSelection) {
      state.internalLinkSelection = null;
      state.visualInternalLinkSelection = null;
    }

    if (snapshot && snapshot.mode === "visual") {
      resetEditorPopoverPlacement(state.elements.editorInternalLinkPanel);
      if (opts.restoreTextareaFocus && state.elements.editorVisualEditor) {
        try {
          state.elements.editorVisualEditor.focus({ preventScroll: true });
        } catch (_error) {
          state.elements.editorVisualEditor.focus();
        }
      }
      return;
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
    if (state.internalLinkSelection && state.internalLinkSelection.mode === "visual") {
      insertVisualInternalDocLink(target);
      return;
    }

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
    var markdownLink = '<a href="docs.html?doc=' + escapeInlineHtmlText(readString(target.docKey, "")) + '">' + escapeInlineHtmlText(label) + '</a>';

    replaceSelectionByRange(textarea, start, end, markdownLink, {
      start: markdownLink.length,
      end: markdownLink.length,
    });

    closeInternalLinkPicker();
  }

  function replaceSelectionByRange(textarea, start, end, replacement, selectionRange) {
    var value = state.editorCodeMirror && typeof state.editorCodeMirror.getValue === "function"
      ? String(state.editorCodeMirror.getValue() || "")
      : String(textarea.value || "");
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
    var content = info.selectedText || "codice";
    var escaped = escapeInlineHtmlText(content);
    var block = "<pre><code>" + escaped + "</code></pre>";

    replaceSelectionRange(textarea, block, {
      start: "<pre><code>".length,
      end: "<pre><code>".length + escaped.length,
    });
  }

  function insertMarkdownInEditor(markdownLine) {
    var textarea = getEditorMarkdownTextarea();
    if (!textarea) {
      return;
    }

    insertBlockAtCursor(textarea, markdownLine);
    focusEditorMarkdownSourceAtRange(null);
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
    if (state.editorSourceMode === "visual") {
      syncVisualEditorToMarkdown();
    } else {
      syncCodeMirrorToTextarea();
    }

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
      content_md: normalizeEditorSourceForStorage(String(getFormValue(form, "content_md") || "")),
    };

    if (state.editorMode === "edit" && state.currentEntry) {
      payload.previous_section = readString(state.currentEntry.sectionSlug, "");
      payload.previous_slug = readString(state.currentEntry.rawSlug, state.currentEntry.slug || "");
    }

    return payload;
  }

  function normalizeEditorSourceForStorage(value) {
    var source = String(value || "").trim();
    if (!source) {
      return "";
    }

    if (isLegacyMarkdownContent(source)) {
      return normalizeStoredHtmlContent(renderMarkdown(source));
    }

    if (isStoredHtmlContent(source)) {
      return normalizeStoredHtmlContent(source);
    }

    return "<p>" + escapeInlineHtmlText(source) + "</p>";
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
    if (name === "content_md") {
      syncCodeMirrorToTextarea();
      return getEditorMarkdownSource();
    }

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

      var wasCreateMode = state.editorMode === "create";
      if (wasCreateMode) {
        setEditorMode("edit");
      }

      resetEditorHistory();
      setEditorStatus(wasCreateMode ? "Pagina creata con successo." : "Pagina salvata con successo.", "success");
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
          section: page.sectionSlug,
          navGroup: readString(page.navGroup, ""),
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
        section: readString(currentGroup.section, ""),
        navGroup: readString(currentGroup.navGroup, ""),
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
    renderPageOutlineSpine([]);

    try {
      var markdown = readString(entry.contentMd, "");
      var html = renderMarkdown(markdown);

      state.elements.content.innerHTML = html;

      setupWikiInteractiveBlocks(state.elements.content, entry);
      var headings = addHeadingAnchors(state.elements.content);
      renderToc(headings);
      renderPageOutlineSpine(headings);
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
      renderPageOutlineSpine([]);
      renderPrevNext(entry);
      teardownTocTracking();
    }
  }
  function renderMarkdown(markdown) {
    var source = String(markdown || "").trim();
    if (!source) {
      return "";
    }

    if (!isLegacyMarkdownContent(source) && isStoredHtmlContent(source)) {
      return normalizeStoredHtmlContent(source);
    }

    if (!window.marked || typeof window.marked.parse !== "function") {
      throw new Error("Parser markdown non disponibile.");
    }

    window.marked.setOptions({
      gfm: true,
      breaks: false,
    });

    var legacySource = normalizeLegacyMarkdownSource(source);
    var prepared = replaceWikiBoxBlocks(replaceTooltipShortcodes(legacySource));
    return normalizeStoredHtmlContent(window.marked.parse(prepared));
  }

  function isStoredHtmlContent(value) {
    var source = String(value || "").trim();
    if (!source) {
      return false;
    }

    var boundary = String.fromCharCode(92) + "b";
    var htmlPattern = new RegExp("</?(?:p|h[1-6]|ul|ol|li|blockquote|pre|code|span|a|figure|aside|img|div|section|input|label|hr|br|strong|em|b|i|table|thead|tbody|tfoot|tr|th|td|details|summary)" + boundary, "i");
    return htmlPattern.test(source);
  }

  function normalizeLegacyMarkdownSource(value) {
    var source = String(value || "").trim();
    if (!source) {
      return source;
    }

    var lineFeed = String.fromCharCode(10);
    var slash = String.fromCharCode(92);
    var normalized = source;

    normalized = normalized.replace(new RegExp(slash + "s+---" + slash + "s+", "g"), lineFeed + lineFeed + "---" + lineFeed + lineFeed);
    normalized = normalized.replace(new RegExp("(^|" + slash + "s)(#{2,6}" + slash + "s+)", "g"), function (_match, before, marker) {
      return (before && before.trim() ? before : "") + lineFeed + lineFeed + marker;
    });
    normalized = normalized.replace(new RegExp(slash + "s+:::box" + slash + "s+(info|note|warning|success|danger)" + slash + "s+([" + slash + "s" + slash + "S]*?)" + slash + "s+:::", "g"), function (_match, type, content) {
      return lineFeed + lineFeed + ":::box " + type + lineFeed + String(content || "").trim() + lineFeed + ":::" + lineFeed + lineFeed;
    });
    normalized = normalized.replace(new RegExp(slash + "s+-" + slash + "s+", "g"), lineFeed + "- ");
    normalized = normalized.replace(new RegExp(slash + "s+>" + slash + "s+", "g"), lineFeed + lineFeed + "> ");

    return normalized.trim();
  }

  function isLegacyMarkdownContent(value) {
    var source = String(value || "").trim();
    if (!source) {
      return false;
    }

    if (
      source.indexOf("{{tooltip:") !== -1 ||
      source.indexOf(":::box") !== -1 ||
      source.indexOf("![") !== -1 ||
      source.indexOf("](") !== -1 ||
      source.indexOf("```") !== -1 ||
      source.indexOf("---") !== -1 ||
      source.indexOf("**") !== -1
    ) {
      return true;
    }

    var slash = String.fromCharCode(92);
    var headingPattern = new RegExp("(^|" + slash + "s)#{1,6}" + slash + "s+");
    var listPattern = new RegExp("(^|" + slash + "s)[-*+]" + slash + "s+");
    var orderedListPattern = new RegExp("(^|" + slash + "s)[0-9]+[.]" + slash + "s+");
    var quotePattern = new RegExp("(^|" + slash + "s)>" + slash + "s+");

    return headingPattern.test(source) || listPattern.test(source) || orderedListPattern.test(source) || quotePattern.test(source);
  }

  function normalizeStoredHtmlContent(value) {
    var source = String(value || "").trim();
    if (!source) {
      return "";
    }

    var template = document.createElement("template");
    template.innerHTML = source;
    cleanStoredHtmlFragment(template.content);
    return template.innerHTML.trim();
  }

  function cleanStoredHtmlFragment(root) {
    if (!root || !root.querySelectorAll) {
      return;
    }

    normalizeStoredTextDivs(root);

    var scripts = root.querySelectorAll("script, iframe, object, embed");
    for (var scriptIndex = 0; scriptIndex < scripts.length; scriptIndex += 1) {
      scripts[scriptIndex].remove();
    }

    var editorOnlyStepperAddButtons = root.querySelectorAll("[data-wiki-stepper-add]");
    for (var addIndex = 0; addIndex < editorOnlyStepperAddButtons.length; addIndex += 1) {
      editorOnlyStepperAddButtons[addIndex].remove();
    }

    var all = root.querySelectorAll("*");
    for (var i = 0; i < all.length; i += 1) {
      var element = all[i];
      var tag = String(element.tagName || "").toLowerCase();

      for (var attrIndex = element.attributes.length - 1; attrIndex >= 0; attrIndex -= 1) {
        var attr = element.attributes[attrIndex];
        var name = String(attr.name || "").toLowerCase();
        var value = String(attr.value || "");

        if (name.indexOf("on") === 0) {
          element.removeAttribute(attr.name);
          continue;
        }

        if ((name === "href" || name === "src") && /^javascript:/i.test(value.trim())) {
          element.removeAttribute(attr.name);
          continue;
        }

        if (
          name === "style" &&
          !(
            element.classList &&
            (element.classList.contains("wiki-image") || element.classList.contains("wiki-columns"))
          )
        ) {
          element.removeAttribute(attr.name);
        }
      }

      element.removeAttribute("contenteditable");

      if (tag === "a") {
        var href = readString(element.getAttribute("href"), "");
        if (href && !/^https?:\/\//i.test(href) && href.indexOf("docs.html?doc=") !== 0 && href.charAt(0) !== "#") {
          element.removeAttribute("href");
        }
      }

      if (element.classList && element.classList.contains("wiki-image")) {
        var imageData = readWikiImageDataFromNode(element);
        if (imageData && imageData.width) {
          element.setAttribute("data-wiki-image-layout", imageData.layout);
          element.setAttribute("data-wiki-image-width", imageData.width);
          element.style.setProperty("--wiki-image-width", imageData.width);
        }
      }

      if (tag === "input" && element.getAttribute("data-wiki-check-id")) {
        element.setAttribute("type", "checkbox");
        element.removeAttribute("checked");
      }
    }
  }

  function normalizeStoredTextDivs(root) {
    if (!root || !root.querySelectorAll) {
      return;
    }

    var divs = root.querySelectorAll("div");
    for (var i = 0; i < divs.length; i += 1) {
      var div = divs[i];
      if (!isPlainTextParagraphDiv(div)) {
        continue;
      }

      div.classList.add("wiki-paragraph");
    }
  }

  function isPlainTextParagraphDiv(div) {
    if (!div || String(div.tagName || "").toLowerCase() !== "div") {
      return false;
    }

    if (div.classList && div.classList.length) {
      return false;
    }

    if (div.closest && div.closest(".wiki-box, .wiki-stepper, .wiki-columns, .wiki-expandable, table, figure, blockquote, pre")) {
      return false;
    }

    var text = readString(div.textContent, "");
    if (!text) {
      return false;
    }

    var children = div.children || [];
    for (var i = 0; i < children.length; i += 1) {
      var tag = String(children[i].tagName || "").toLowerCase();
      if (tag === "br" || tag === "span" || tag === "strong" || tag === "em" || tag === "b" || tag === "i" || tag === "code" || tag === "a" || tag === "mark") {
        continue;
      }

      return false;
    }

    return true;
  }

  function replaceWikiBoxBlocks(markdown) {
    var source = String(markdown || "");
    if (!source || source.indexOf(":::box") === -1) {
      return source;
    }

    var lineFeed = String.fromCharCode(10);
    var lines = source.split(lineFeed);
    var output = [];
    var index = 0;

    while (index < lines.length) {
      var line = lines[index];
      var trimmed = String(line || "").trim();

      if (trimmed.indexOf(":::box") !== 0) {
        output.push(line);
        index += 1;
        continue;
      }

      var header = trimmed.slice(":::box".length).trim();
      var headerParts = header.split(" ");
      var type = normalizeWikiBoxType(headerParts.shift() || "info");
      var title = headerParts.join(" ").trim();
      var contentLines = [];
      index += 1;

      while (index < lines.length && String(lines[index] || "").trim() !== ":::") {
        contentLines.push(lines[index]);
        index += 1;
      }

      if (index >= lines.length) {
        output.push(line);
        for (var brokenIndex = 0; brokenIndex < contentLines.length; brokenIndex += 1) {
          output.push(contentLines[brokenIndex]);
        }
        continue;
      }

      index += 1;
      output.push(buildWikiBoxHtml(type, title, contentLines.join(lineFeed)));
    }

    return output.join(lineFeed);
  }

  function buildWikiBoxHtml(type, title, content) {
    var boxType = normalizeWikiBoxType(type);
    var meta = WIKI_BOX_TYPES[boxType] || WIKI_BOX_TYPES.info;
    var titleValue = readString(title, "");
    var titleHtml = titleValue ? '<p class="wiki-box__title">' + escapeInlineHtmlText(titleValue) + '</p>' : "";
    var contentHtml = content ? window.marked.parse(replaceTooltipShortcodes(content)) : "";
    var titleClass = titleValue ? " has-title" : "";

    return '<aside class="wiki-box wiki-box--' + boxType + titleClass + '" role="note">' +
      '<div class="wiki-box__icon" aria-hidden="true"><i class="' + escapeInlineHtmlText(meta.icon) + '"></i></div>' +
      '<div class="wiki-box__content">' + titleHtml + contentHtml + '</div>' +
      '</aside>';
  }

  function replaceTooltipShortcodes(markdown) {
    var source = String(markdown || "");
    if (!source) {
      return source;
    }

    var output = "";
    var cursor = 0;

    while (cursor < source.length) {
      var start = source.indexOf("{{tooltip:", cursor);
      if (start === -1) {
        output += source.slice(cursor);
        break;
      }

      output += source.slice(cursor, start);

      var labelResult = readTooltipTokenSegment(source, start + 10, "|");
      if (!labelResult.found) {
        output += source.slice(start, start + 2);
        cursor = start + 2;
        continue;
      }

      var textResult = readTooltipTokenSegment(source, labelResult.nextIndex, "}}");
      if (!textResult.found) {
        output += source.slice(start, start + 2);
        cursor = start + 2;
        continue;
      }

      var label = decodeTooltipShortcodeSegment(labelResult.value, "testo visibile");
      var tooltipText = decodeTooltipShortcodeSegment(textResult.value, "");
      if (!tooltipText) {
        tooltipText = label;
      }

      output += buildTooltipHtml(label, tooltipText, "", "base");

      cursor = textResult.nextIndex;
    }

    return output;
  }

  function readTooltipTokenSegment(source, startIndex, delimiter) {
    var text = String(source || "");
    var value = "";
    var i = Math.max(0, Number(startIndex) || 0);

    while (i < text.length) {
      var current = text.charAt(i);

      if (current === "\\") {
        if (i + 1 < text.length) {
          value += current + text.charAt(i + 1);
          i += 2;
          continue;
        }

        value += current;
        i += 1;
        continue;
      }

      if (delimiter === "|") {
        if (current === "|") {
          return {
            found: true,
            value: value,
            nextIndex: i + 1,
          };
        }
      } else if (delimiter === "}}") {
        if (current === "}" && i + 1 < text.length && text.charAt(i + 1) === "}") {
          return {
            found: true,
            value: value,
            nextIndex: i + 2,
          };
        }
      }

      value += current;
      i += 1;
    }

    return {
      found: false,
      value: value,
      nextIndex: i,
    };
  }

  function findWikiTooltipTrigger(target) {
    if (!state.elements || !state.elements.content || !target || !target.closest) {
      return null;
    }

    var trigger = target.closest(".wiki-tooltip");
    if (!trigger || !state.elements.content.contains(trigger)) {
      return null;
    }

    return trigger;
  }

  function isWikiTooltipOpen() {
    return !!(state.wikiTooltipActive && state.wikiTooltipBubble && !state.wikiTooltipBubble.hidden);
  }

  function isEventInsideWikiTooltip(target) {
    if (findWikiTooltipTrigger(target)) {
      return true;
    }

    if (state.wikiTooltipBubble && state.wikiTooltipBubble.contains && state.wikiTooltipBubble.contains(target)) {
      return true;
    }

    return false;
  }

  function ensureWikiTooltipBubble() {
    if (state.wikiTooltipBubble && state.wikiTooltipBubble.isConnected) {
      return state.wikiTooltipBubble;
    }

    var bubble = document.createElement("div");
    bubble.id = "wiki-tooltip-bubble";
    bubble.className = "wiki-tooltip-bubble";
    bubble.setAttribute("role", "tooltip");
    bubble.hidden = true;
    document.body.appendChild(bubble);

    state.wikiTooltipBubble = bubble;
    return bubble;
  }

  function positionWikiTooltipBubble(trigger, bubble) {
    if (!trigger || !bubble) {
      return;
    }

    var viewportPadding = 10;
    var triggerRect = trigger.getBoundingClientRect();

    bubble.style.left = "0px";
    bubble.style.top = "0px";
    bubble.style.maxWidth = Math.max(180, Math.min(380, window.innerWidth - viewportPadding * 2)) + "px";
    bubble.style.visibility = "hidden";

    var bubbleRect = bubble.getBoundingClientRect();
    var top = triggerRect.top - bubbleRect.height - 10;
    var placement = "top";

    if (top < viewportPadding) {
      top = triggerRect.bottom + 10;
      placement = "bottom";
    }

    if (top + bubbleRect.height > window.innerHeight - viewportPadding) {
      top = Math.max(viewportPadding, window.innerHeight - bubbleRect.height - viewportPadding);
    }

    var left = triggerRect.left + triggerRect.width / 2 - bubbleRect.width / 2;
    left = Math.max(viewportPadding, Math.min(left, window.innerWidth - bubbleRect.width - viewportPadding));

    bubble.style.left = left + "px";
    bubble.style.top = top + "px";
    bubble.setAttribute("data-placement", placement);
    bubble.style.visibility = "visible";
  }

  function renderTooltipMarkdownContent(value) {
    var carriageReturn = String.fromCharCode(13);
    var lineFeed = String.fromCharCode(10);
    var source = String(value || "")
      .split(carriageReturn + lineFeed).join(lineFeed)
      .split(carriageReturn).join(lineFeed)
      .trim();

    if (!source) {
      return "";
    }

    var lines = source.split(lineFeed);
    var output = [];
    var paragraph = [];
    var index = 0;

    function flushParagraph() {
      if (!paragraph.length) {
        return;
      }

      output.push("<p>" + renderTooltipInlineMarkdown(paragraph.join(" ")) + "</p>");
      paragraph = [];
    }

    while (index < lines.length) {
      var line = String(lines[index] || "").trim();

      if (!line) {
        flushParagraph();
        index += 1;
        continue;
      }

      if (isTooltipMarkdownHr(line)) {
        flushParagraph();
        output.push("<hr>");
        index += 1;
        continue;
      }

      var headingLevel = readTooltipMarkdownHeadingLevel(line);
      if (headingLevel) {
        flushParagraph();
        output.push("<h" + String(headingLevel) + ">" + renderTooltipInlineMarkdown(line.slice(headingLevel + 1).trim()) + "</h" + String(headingLevel) + ">");
        index += 1;
        continue;
      }

      if (isTooltipMarkdownUnorderedListLine(line)) {
        flushParagraph();
        var unorderedItems = [];
        while (index < lines.length) {
          var unorderedLine = String(lines[index] || "").trim();
          if (!isTooltipMarkdownUnorderedListLine(unorderedLine)) {
            break;
          }
          unorderedItems.push(unorderedLine.slice(2).trim());
          index += 1;
        }
        output.push("<ul>" + unorderedItems.map(function mapTooltipUlItem(item) {
          return "<li>" + renderTooltipInlineMarkdown(item) + "</li>";
        }).join("") + "</ul>");
        continue;
      }

      if (isTooltipMarkdownOrderedListLine(line)) {
        flushParagraph();
        var orderedItems = [];
        while (index < lines.length) {
          var orderedLine = String(lines[index] || "").trim();
          if (!isTooltipMarkdownOrderedListLine(orderedLine)) {
            break;
          }
          orderedItems.push(stripTooltipMarkdownOrderedMarker(orderedLine));
          index += 1;
        }
        output.push("<ol>" + orderedItems.map(function mapTooltipOlItem(item) {
          return "<li>" + renderTooltipInlineMarkdown(item) + "</li>";
        }).join("") + "</ol>");
        continue;
      }

      paragraph.push(line);
      index += 1;
    }

    flushParagraph();
    return output.join("");
  }

  function isTooltipMarkdownHr(line) {
    var text = String(line || "").trim();
    if (text.length < 3) {
      return false;
    }

    var first = text.charAt(0);
    if (first !== "-" && first !== "*" && first !== "_") {
      return false;
    }

    for (var i = 0; i < text.length; i += 1) {
      if (text.charAt(i) !== first) {
        return false;
      }
    }

    return true;
  }

  function readTooltipMarkdownHeadingLevel(line) {
    var text = String(line || "");
    var level = 0;

    while (level < text.length && text.charAt(level) === "#" && level < 3) {
      level += 1;
    }

    if (!level || text.charAt(level) !== " ") {
      return 0;
    }

    return level;
  }

  function isTooltipMarkdownUnorderedListLine(line) {
    var text = String(line || "");
    if (text.length < 3) {
      return false;
    }

    var marker = text.charAt(0);
    return (marker === "-" || marker === "*" || marker === "+") && text.charAt(1) === " ";
  }

  function isTooltipMarkdownOrderedListLine(line) {
    var text = String(line || "");
    var index = 0;

    while (index < text.length && text.charAt(index) >= "0" && text.charAt(index) <= "9") {
      index += 1;
    }

    if (!index || index + 1 >= text.length) {
      return false;
    }

    var marker = text.charAt(index);
    return (marker === "." || marker === ")") && text.charAt(index + 1) === " ";
  }

  function stripTooltipMarkdownOrderedMarker(line) {
    var text = String(line || "");
    var index = 0;

    while (index < text.length && text.charAt(index) >= "0" && text.charAt(index) <= "9") {
      index += 1;
    }

    return text.slice(index + 2).trim();
  }

  function renderTooltipInlineMarkdown(value) {
    var source = escapeInlineHtmlText(value || "");
    source = renderTooltipInlineCode(source);
    source = renderTooltipInlineStrong(source, "**");
    source = renderTooltipInlineStrong(source, "__");
    source = renderTooltipInlineEmphasis(source, "*");
    source = renderTooltipInlineEmphasis(source, "_");
    return source;
  }

  function renderTooltipInlineCode(source) {
    return replaceTooltipDelimitedInline(source, "`", "code");
  }

  function renderTooltipInlineStrong(source, delimiter) {
    return replaceTooltipDelimitedInline(source, delimiter, "strong");
  }

  function renderTooltipInlineEmphasis(source, delimiter) {
    return replaceTooltipDelimitedInline(source, delimiter, "em");
  }

  function replaceTooltipDelimitedInline(sourceValue, delimiter, tagName) {
    var source = String(sourceValue || "");
    var token = String(delimiter || "");
    var tag = cleanSegment(tagName || "span") || "span";
    var output = "";
    var cursor = 0;

    while (cursor < source.length) {
      var start = source.indexOf(token, cursor);
      if (start === -1) {
        output += source.slice(cursor);
        break;
      }

      var end = source.indexOf(token, start + token.length);
      if (end === -1) {
        output += source.slice(cursor);
        break;
      }

      var inner = source.slice(start + token.length, end);
      if (!inner.trim()) {
        output += source.slice(cursor, end + token.length);
        cursor = end + token.length;
        continue;
      }

      output += source.slice(cursor, start) + "<" + tag + ">" + inner + "</" + tag + ">";
      cursor = end + token.length;
    }

    return output;
  }

  function openWikiTooltip(trigger) {
    if (!trigger) {
      return;
    }

    var text = readString(trigger.getAttribute("data-tooltip"), "");
    if (!text) {
      closeWikiTooltip();
      return;
    }

    var title = readString(trigger.getAttribute("data-tooltip-title"), "");
    var type = normalizeWikiTooltipType(trigger.getAttribute("data-tooltip-type"));
    var meta = readWikiTooltipTypeMeta(type);
    var bubble = ensureWikiTooltipBubble();

    if (state.wikiTooltipActive && state.wikiTooltipActive !== trigger) {
      state.wikiTooltipActive.classList.remove("is-open");
      state.wikiTooltipActive.removeAttribute("aria-describedby");
    }

    state.wikiTooltipActive = trigger;
    trigger.classList.add("is-open");
    trigger.setAttribute("aria-describedby", bubble.id);

    var hasHeader = !!title || type !== "base";
    var headerText = title || (type !== "base" ? meta.label : "");
    var headerHtml = hasHeader
      ? '<div class="wiki-tooltip-bubble__header"><i class="' + escapeInlineHtmlText(meta.icon) + '" aria-hidden="true"></i><span>' + escapeInlineHtmlText(headerText) + '</span></div>'
      : "";

    bubble.className = "wiki-tooltip-bubble wiki-tooltip-bubble--" + type + (hasHeader ? " has-header" : "");
    bubble.innerHTML = headerHtml + '<div class="wiki-tooltip-bubble__body">' + renderTooltipMarkdownContent(text) + "</div>";
    bubble.hidden = false;
    bubble.classList.add("is-visible");

    positionWikiTooltipBubble(trigger, bubble);
  }

  function closeWikiTooltip() {
    if (state.wikiTooltipActive) {
      state.wikiTooltipActive.classList.remove("is-open");
      state.wikiTooltipActive.removeAttribute("aria-describedby");
      state.wikiTooltipActive = null;
    }

    if (state.wikiTooltipBubble) {
      state.wikiTooltipBubble.hidden = true;
      state.wikiTooltipBubble.className = "wiki-tooltip-bubble";
      state.wikiTooltipBubble.style.visibility = "";
      state.wikiTooltipBubble.removeAttribute("data-placement");
    }
  }

  function handleWikiTooltipClick(event) {
    var trigger = findWikiTooltipTrigger(event && event.target);
    if (!trigger) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (state.wikiTooltipActive === trigger && isWikiTooltipOpen()) {
      closeWikiTooltip();
      return;
    }

    openWikiTooltip(trigger);
  }

  function handleWikiTooltipMouseOver(event) {
    if (!window.matchMedia || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      return;
    }

    var trigger = findWikiTooltipTrigger(event && event.target);
    if (!trigger) {
      return;
    }

    openWikiTooltip(trigger);
  }

  function handleWikiTooltipMouseOut(event) {
    if (!window.matchMedia || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      return;
    }

    var trigger = findWikiTooltipTrigger(event && event.target);
    if (!trigger) {
      return;
    }

    var related = event.relatedTarget;
    if (related && trigger.contains && trigger.contains(related)) {
      return;
    }

    closeWikiTooltip();
  }

  function handleWikiTooltipFocusIn(event) {
    var trigger = findWikiTooltipTrigger(event && event.target);
    if (!trigger) {
      return;
    }

    openWikiTooltip(trigger);
  }

  function handleWikiTooltipFocusOut(event) {
    var trigger = findWikiTooltipTrigger(event && event.target);
    if (!trigger) {
      return;
    }

    var related = event.relatedTarget;
    if (related && trigger.contains && trigger.contains(related)) {
      return;
    }

    closeWikiTooltip();
  }

  function setupWikiInteractiveBlocks(root, entry) {
    setupWikiChecklistState(root, entry);
    setupWikiExpandablesDefaultCollapsed(root);
  }

  function setupWikiExpandablesDefaultCollapsed(root) {
    if (!root || !root.querySelectorAll) {
      return;
    }

    var expandables = root.querySelectorAll("details.wiki-expandable");
    for (var i = 0; i < expandables.length; i += 1) {
      expandables[i].removeAttribute("open");
      expandables[i].classList.remove("is-open");
    }
  }

  function getWikiChecklistStorageKey(entry, checkId) {
    var docKey = normalizeDocPath(readString(entry && entry.docKey, state.currentEntry && state.currentEntry.docKey));
    var id = readString(checkId, "");
    return WIKI_CHECKLIST_STORAGE_PREFIX + docKey + ":" + id;
  }

  function setupWikiChecklistState(root, entry) {
    if (!root || !root.querySelectorAll) {
      return;
    }

    var inputs = root.querySelectorAll("input[data-wiki-check-id]");
    for (var i = 0; i < inputs.length; i += 1) {
      var input = inputs[i];
      var key = getWikiChecklistStorageKey(entry, input.getAttribute("data-wiki-check-id"));
      var saved = "";

      try {
        saved = localStorage.getItem(key) || "";
      } catch (_error) {
        saved = "";
      }

      input.checked = saved === "1";
      input.classList.toggle("is-checked", input.checked);
    }
  }

  function handleWikiChecklistChange(event) {
    var input = event && event.target && event.target.closest ? event.target.closest("input[data-wiki-check-id]") : null;
    if (!input || !state.elements || !state.elements.content || !state.elements.content.contains(input)) {
      return;
    }

    var key = getWikiChecklistStorageKey(state.currentEntry, input.getAttribute("data-wiki-check-id"));

    try {
      if (input.checked) {
        localStorage.setItem(key, "1");
      } else {
        localStorage.removeItem(key);
      }
    } catch (_error) {
      // Ignore localStorage write issues.
    }

    input.classList.toggle("is-checked", input.checked);
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

    if (isStoredHtmlContent(text)) {
      var template = document.createElement("template");
      template.innerHTML = normalizeStoredHtmlContent(text);
      return String(template.content.textContent || "").replace(new RegExp(String.fromCharCode(92) + "s+", "g"), " ").trim();
    }

    return text
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/`[^`]*`/g, " ")
      .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
      .replace(/\[([^\]]+)\]\([^)]*\)/g, function (_match, label) {
        return label;
      })
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
    return safe.replace(pattern, function (match) {
      return "<mark>" + match + "</mark>";
    });
  }
  function isDocsTreeContextMenuOpen() {
    return !!(
      state.elements &&
      state.elements.treeContextMenu &&
      !state.elements.treeContextMenu.hasAttribute("hidden")
    );
  }

  function getTreeContextEntry() {
    var key = normalizeDocPath(readString(state.treeContextEntryKey, ""));
    if (!key) {
      return null;
    }

    if (state.manageIndex && state.manageIndex.pageMap && state.manageIndex.pageMap.has(key)) {
      return state.manageIndex.pageMap.get(key);
    }

    if (state.index && state.index.pageMap && state.index.pageMap.has(key)) {
      return state.index.pageMap.get(key);
    }

    return null;
  }

  function getTreeContextGroup() {
    return state.treeContextGroup && typeof state.treeContextGroup === "object" ? state.treeContextGroup : null;
  }

  function closeDocsTreeContextMenu() {
    if (!state.elements || !state.elements.treeContextMenu) {
      return;
    }

    state.elements.treeContextMenu.hidden = true;
    state.elements.treeContextMenu.style.left = "";
    state.elements.treeContextMenu.style.top = "";
    state.treeContextEntryKey = "";
    state.treeContextMode = "";
    state.treeContextGroup = null;
    state.treeContextGroup = null;
  }

  function isDocsTreeIconPickerOpen() {
    return !!(state.treeIconPicker && !state.treeIconPicker.hasAttribute("hidden"));
  }

  function isEventInsideDocsTreeIconPicker(target) {
    return !!(state.treeIconPicker && target && state.treeIconPicker.contains(target));
  }

  function ensureDocsTreeIconPicker() {
    if (state.treeIconPicker && state.treeIconPicker.isConnected) {
      return state.treeIconPicker;
    }

    var picker = document.createElement("div");
    picker.className = "docs-box-icon-picker docs-tree-icon-picker docs-editor-md-context";
    picker.setAttribute("data-docs-tree-icon-picker", "");
    picker.setAttribute("role", "menu");
    picker.setAttribute("aria-label", "Icona TOC");
    picker.hidden = true;

    var label = document.createElement("p");
    label.className = "docs-box-icon-picker__label";
    label.textContent = "Icona TOC";
    picker.appendChild(label);

    var search = createIconPickerSearchInput("Cerca icona pagina o gruppo...");
    picker.appendChild(search);

    var grid = document.createElement("div");
    grid.className = "docs-box-icon-picker__grid";

    for (var i = 0; i < WIKI_BOX_ICON_CHOICES.length; i += 1) {
      var iconClass = WIKI_BOX_ICON_CHOICES[i];
      var button = document.createElement("button");
      button.type = "button";
      button.className = "docs-box-icon-picker__choice";
      button.setAttribute("data-docs-tree-icon-choice", iconClass);
      button.setAttribute("data-icon-search", buildIconPickerSearchText(iconClass));
      button.setAttribute("role", "menuitem");
      button.setAttribute("aria-label", iconClassToLabel(iconClass));

      var icon = document.createElement("i");
      icon.className = iconClass;
      icon.setAttribute("aria-hidden", "true");
      button.appendChild(icon);
      grid.appendChild(button);
    }

    picker.appendChild(grid);

    search.addEventListener("input", function onTreeIconSearchInput(event) {
      filterIconPickerChoices(picker, event.target.value);
    });

    picker.addEventListener("mousedown", function onTreeIconPickerMouseDown(event) {
      if (event.target && event.target.closest && event.target.closest("input")) {
        return;
      }

      event.preventDefault();
    });

    picker.addEventListener("click", function onTreeIconPickerClick(event) {
      var button = event.target.closest("button[data-docs-tree-icon-choice]");
      if (!button || button.disabled) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      applyDocsTreeIconChoice(button.getAttribute("data-docs-tree-icon-choice"));
    });

    document.body.appendChild(picker);
    state.treeIconPicker = picker;
    return picker;
  }

  function closeDocsTreeIconPicker() {
    if (!state.treeIconPicker) {
      return;
    }

    state.treeIconPicker.hidden = true;
    resetEditorPopoverPlacement(state.treeIconPicker);
    state.treeContextIcon = null;
  }

  function openDocsTreeIconPickerFromContext() {
    var mode = readString(state.treeContextMode, "");
    var entry = getTreeContextEntry();
    var group = getTreeContextGroup();

    if (mode !== "group" && !entry) {
      closeDocsTreeContextMenu();
      return;
    }

    if (mode === "group" && !group) {
      closeDocsTreeContextMenu();
      return;
    }

    var picker = ensureDocsTreeIconPicker();
    if (!picker) {
      return;
    }

    state.treeContextIcon = {
      mode: mode === "group" ? "group" : "page",
      entryKey: entry ? entry.docKey : "",
      group: group,
    };

    resetIconPickerSearch(picker);
    syncDocsTreeIconPickerSelection();
    picker.hidden = false;

    var menuRect = state.elements && state.elements.treeContextMenu
      ? state.elements.treeContextMenu.getBoundingClientRect()
      : null;
    var point = menuRect
      ? { x: menuRect.left + menuRect.width + 12, y: menuRect.top + 12 }
      : { x: 24, y: 24 };

    positionEditorPopoverAtPoint(picker, point);
    focusIconPickerSearch(picker);
    closeDocsTreeContextMenu();
  }

  function syncDocsTreeIconPickerSelection() {
    var picker = ensureDocsTreeIconPicker();
    var context = state.treeContextIcon || {};
    var currentIcon = "";

    if (context.mode === "group" && context.group) {
      currentIcon = readString(context.group.icon, "");
    } else if (context.entryKey) {
      var entry = resolveDocEntryForTree(context.entryKey);
      currentIcon = readString(entry && entry.pageIcon, "");
    }

    var normalized = currentIcon ? resolveTreeIconClass(currentIcon, "") : "";
    var buttons = picker.querySelectorAll("button[data-docs-tree-icon-choice]");
    for (var i = 0; i < buttons.length; i += 1) {
      var isSelected = normalized && buttons[i].getAttribute("data-docs-tree-icon-choice") === normalized;
      buttons[i].classList.toggle("is-selected", !!isSelected);
      buttons[i].setAttribute("aria-pressed", isSelected ? "true" : "false");
    }
  }

  async function applyDocsTreeIconChoice(iconClass) {
    var context = state.treeContextIcon || {};
    var normalizedIcon = normalizeWikiBoxIconClass(iconClass, "fa-solid fa-file-lines");

    closeDocsTreeIconPicker();

    if (context.mode === "group" && context.group) {
      await persistDocsTreeGroupIcon(context.group, normalizedIcon);
      return;
    }

    if (context.entryKey) {
      var entry = resolveDocEntryForTree(context.entryKey);
      await persistDocsTreePageIcon(entry, normalizedIcon);
    }
  }

  async function persistDocsTreePageIcon(entry, iconClass) {
    if (!state.isManageUnlocked || !entry || state.editorSaving) {
      return;
    }

    var payload = buildPublishPayload(entry, entry.isPublished !== false);
    payload.page_icon = toNullableString(iconClass);

    setEditorSavingState(true);

    try {
      var result = await upsertWikiPage(payload);
      var savedDocKey = resolveSavedDocKey(payload, result);
      await refreshDocsData(savedDocKey || entry.docKey);
    } catch (error) {
      console.error("Errore aggiornamento icona pagina:", error);
      renderDocErrorState({
        title: "Operazione non completata",
        message: readString(error && error.message, "Aggiornamento icona non riuscito."),
      });
    } finally {
      setEditorSavingState(false);
    }
  }

  async function persistDocsTreeGroupIcon(group, iconClass) {
    if (!state.isManageUnlocked || !group || state.editorSaving) {
      return;
    }

    var pages = state.manageIndex && Array.isArray(state.manageIndex.pages) ? state.manageIndex.pages : [];
    var section = cleanSegment(readString(group.section, ""));
    var groupKey = toNavGroupKey(group.navGroup);
    var matchingPages = [];

    for (var i = 0; i < pages.length; i += 1) {
      var page = pages[i];
      if (!page || page.sectionSlug !== section) {
        continue;
      }

      if (toNavGroupKey(page.navGroup) === groupKey) {
        matchingPages.push(page);
      }
    }

    if (!matchingPages.length) {
      return;
    }

    var currentDocKey = state.currentEntry ? state.currentEntry.docKey : "";
    setEditorSavingState(true);

    try {
      for (var p = 0; p < matchingPages.length; p += 1) {
        var payload = buildPublishPayload(matchingPages[p], matchingPages[p].isPublished !== false);
        payload.nav_group_icon = toNullableString(iconClass);
        await upsertWikiPage(payload);
      }

      await refreshDocsData(currentDocKey);
    } catch (error) {
      console.error("Errore aggiornamento icona gruppo:", error);
      renderDocErrorState({
        title: "Operazione non completata",
        message: readString(error && error.message, "Aggiornamento icona gruppo non riuscito."),
      });
    } finally {
      setEditorSavingState(false);
    }
  }

  function closeDocsTreeContextMenu() {
    if (!state.elements || !state.elements.treeContextMenu) {
      return;
    }

    state.elements.treeContextMenu.hidden = true;
    state.elements.treeContextMenu.style.left = "";
    state.elements.treeContextMenu.style.top = "";
    state.treeContextEntryKey = "";
    state.treeContextMode = "";
    state.treeContextGroup = null;
  }

  function openDocsTreeContextMenu(clientX, clientY, mode, entry, group) {
    if (!state.elements || !state.elements.treeContextMenu) {
      return;
    }

    var menu = state.elements.treeContextMenu;
    var newButton = state.elements.treeContextNew;
    var editButton = state.elements.treeContextEdit;
    var toggleButton = state.elements.treeContextToggle;
    var iconButton = state.elements.treeContextIcon;
    var subpageButton = state.elements.treeContextSubpage;
    var groupPageButton = state.elements.treeContextGroupPage;

    if (!newButton || !editButton || !toggleButton) {
      return;
    }

    var normalizedMode = mode === "group" ? "group" : mode === "hidden" ? "hidden" : mode === "existing" ? "existing" : "blank";

    state.treeContextMode = normalizedMode;
    state.treeContextEntryKey = entry && entry.docKey ? entry.docKey : "";
    state.treeContextGroup = normalizedMode === "group" ? group || null : null;

    newButton.hidden = normalizedMode !== "blank";
    editButton.hidden = normalizedMode === "blank" || normalizedMode === "group";
    toggleButton.hidden = normalizedMode === "blank" || normalizedMode === "group";

    if (subpageButton) {
      subpageButton.hidden = normalizedMode !== "existing" && normalizedMode !== "hidden";
    }

    if (groupPageButton) {
      groupPageButton.hidden = normalizedMode !== "group";
    }

    if (iconButton) {
      iconButton.hidden = normalizedMode === "blank";
    }

    var toggleIcon = toggleButton.querySelector("i");
    if (normalizedMode === "hidden") {
      setIconButtonLabel(toggleButton, "Pubblica pagina");
      var toggleLabelShow = toggleButton.querySelector("span");
      if (toggleLabelShow) {
        toggleLabelShow.textContent = "Pubblica pagina";
      }
      if (toggleIcon) {
        toggleIcon.className = "fa-solid fa-eye";
      }
    } else {
      setIconButtonLabel(toggleButton, "Nascondi pagina");
      var toggleLabelHide = toggleButton.querySelector("span");
      if (toggleLabelHide) {
        toggleLabelHide.textContent = "Nascondi pagina";
      }
      if (toggleIcon) {
        toggleIcon.className = "fa-solid fa-eye-slash";
      }
    }

    menu.hidden = false;

    var viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
    var viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
    var rect = menu.getBoundingClientRect();
    var left = Number(clientX) || 0;
    var top = Number(clientY) || 0;

    if (left + rect.width > viewportWidth - 8) {
      left = Math.max(8, viewportWidth - rect.width - 8);
    }

    if (top + rect.height > viewportHeight - 8) {
      top = Math.max(8, viewportHeight - rect.height - 8);
    }

    menu.style.left = String(left) + "px";
    menu.style.top = String(top) + "px";
  }

  function handleDocsTreeContextMenu(event) {
    if (!state.isManageUnlocked || !state.elements || !state.elements.treeContextMenu) {
      return;
    }

    var target = event.target;
    if (!target || !state.elements.treePanel || !state.elements.treePanel.contains(target)) {
      return;
    }

    var groupNode = target.closest("[data-docs-tree-group]");
    var link = target.closest("a[data-doc-link]");
    var row = target.closest("[data-doc-key]");
    var entry = null;
    var group = null;
    var mode = "blank";

    if (groupNode) {
      group = readDocsTreeGroupFromElement(groupNode);
      mode = group ? "group" : "blank";
    } else if (link) {
      entry = resolveDocEntryForTree(link.getAttribute("data-doc-link"));
    } else if (row) {
      entry = resolveDocEntryForTree(row.getAttribute("data-doc-key"));
    }

    if (entry) {
      mode = entry.isPublished === false ? "hidden" : "existing";
    }

    event.preventDefault();
    openDocsTreeContextMenu(event.clientX, event.clientY, mode, entry, group);
  }

  function renderDocsTree() {
    if (!state.index || !state.elements || !state.elements.tree) {
      return;
    }

    closeDocsTreeContextMenu();

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

  function getDocsTreeCollapsedSet() {
    if (state.treeCollapsedKeys instanceof Set) {
      return state.treeCollapsedKeys;
    }

    var values = [];
    try {
      values = JSON.parse(localStorage.getItem(DOCS_TREE_COLLAPSE_STORAGE_KEY) || "[]");
    } catch (_error) {
      values = [];
    }

    state.treeCollapsedKeys = new Set(Array.isArray(values) ? values.filter(Boolean) : []);
    return state.treeCollapsedKeys;
  }

  function persistDocsTreeCollapsedSet() {
    var set = getDocsTreeCollapsedSet();
    try {
      localStorage.setItem(DOCS_TREE_COLLAPSE_STORAGE_KEY, JSON.stringify(Array.from(set.values())));
    } catch (_error) {
      // Ignore localStorage write issues.
    }
  }

  function buildDocsTreeCollapseKey(kind, value) {
    var normalizedKind = cleanSegment(kind || "node") || "node";
    var normalizedValue = readString(value, "");
    return normalizedKind + ":" + normalizedValue;
  }

  function isDocsTreeCollapsed(collapseKey) {
    var key = readString(collapseKey, "");
    return !!key && getDocsTreeCollapsedSet().has(key);
  }

  function toggleDocsTreeCollapsed(collapseKey) {
    var key = readString(collapseKey, "");
    if (!key) {
      return;
    }

    var set = getDocsTreeCollapsedSet();
    if (set.has(key)) {
      set.delete(key);
    } else {
      set.add(key);
    }

    persistDocsTreeCollapsedSet();
    renderDocsTree();
  }

  function readDocsTreeGroupFromElement(element) {
    if (!element) {
      return null;
    }

    var section = cleanSegment(readString(element.getAttribute("data-section"), ""));
    var navGroup = readString(element.getAttribute("data-nav-group"), "");
    var navGroupKey = toNavGroupKey(element.getAttribute("data-nav-group-key") || navGroup);

    if (!section || !navGroupKey) {
      return null;
    }

    return {
      section: section,
      navGroup: navGroup,
      navGroupKey: navGroupKey,
      icon: readString(element.getAttribute("data-nav-group-icon"), ""),
    };
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
      var hasChildren = !!(node.children && node.children.length);

      if (node.kind === "doc") {
        item.className = "docs-tree-item docs-tree-item--doc" + (hasChildren ? " has-children" : "");

        var row = buildDocsTreeDocRow({
          docKey: node.docKey,
          title: node.title,
          icon: node.icon,
          linkClass: opts.linkClass || "docs-tree-link",
        });

        var docCollapseKey = buildDocsTreeCollapseKey("doc", node.docKey);
        var docCollapsed = hasChildren && isDocsTreeCollapsed(docCollapseKey);

        if (row) {
          if (hasChildren) {
            row.classList.add("has-children");
            row.setAttribute("aria-expanded", docCollapsed ? "false" : "true");

            var docToggle = document.createElement("span");
            docToggle.className = "docs-tree-collapse-toggle docs-tree-collapse-toggle--inside-link";
            docToggle.setAttribute("data-docs-tree-collapse", docCollapseKey);
            docToggle.setAttribute("role", "button");
            docToggle.setAttribute("tabindex", "0");
            docToggle.setAttribute("aria-label", docCollapsed ? "Espandi sottopagine" : "Comprimi sottopagine");
            docToggle.setAttribute("aria-expanded", docCollapsed ? "false" : "true");
            docToggle.innerHTML = '<i class="fa-solid fa-chevron-down" aria-hidden="true"></i>';

            var rowLink = row.querySelector("a[data-doc-link]");
            if (rowLink) {
              rowLink.classList.add("has-children");
              rowLink.setAttribute("aria-expanded", docCollapsed ? "false" : "true");
              rowLink.appendChild(docToggle);
            }
          }

          item.appendChild(row);
        }

        if (hasChildren) {
          var nestedList = document.createElement("ul");
          nestedList.className = "docs-tree-sublist";
          nestedList.hidden = docCollapsed;
          appendNodesToList(nestedList, node.children, opts);
          item.appendChild(nestedList);
        }
      } else {
        item.className = "docs-tree-item docs-tree-item--group" + (hasChildren ? " has-children" : "");

        var groupCollapseKey = buildDocsTreeCollapseKey("group", readString(node.section, "") + ":" + toNavGroupKey(node.navGroup));
        var groupCollapsed = hasChildren && isDocsTreeCollapsed(groupCollapseKey);

        var label = document.createElement("button");
        label.type = "button";
        label.className = "docs-tree-label docs-tree-label--collapsible";
        label.setAttribute("data-docs-tree-group", "");
        label.setAttribute("data-section", readString(node.section, ""));
        label.setAttribute("data-nav-group", readString(node.navGroup, ""));
        label.setAttribute("data-nav-group-key", toNavGroupKey(node.navGroup));
        label.setAttribute("data-nav-group-icon", readString(node.icon, ""));
        label.setAttribute("data-docs-tree-collapse", groupCollapseKey);
        label.setAttribute("aria-expanded", groupCollapsed ? "false" : "true");

        var groupChevron = document.createElement("span");
        groupChevron.className = "docs-tree-label__chevron";
        groupChevron.innerHTML = '<i class="fa-solid fa-chevron-down" aria-hidden="true"></i>';

        var groupIconWrap = document.createElement("span");
        groupIconWrap.className = "docs-tree-label__icon";

        var groupIcon = document.createElement("i");
        groupIcon.className = resolveTreeIconClass(node.icon, "fa-solid fa-folder-tree");
        groupIcon.setAttribute("aria-hidden", "true");
        groupIconWrap.appendChild(groupIcon);

        var groupText = document.createElement("span");
        groupText.className = "docs-tree-label__text";
        groupText.textContent = readString(node.title, "Gruppo");

        label.appendChild(groupChevron);
        label.appendChild(groupIconWrap);
        label.appendChild(groupText);
        item.appendChild(label);

        if (hasChildren) {
          var subList = document.createElement("ul");
          subList.className = "docs-tree-sublist";
          subList.hidden = groupCollapsed;
          appendNodesToList(subList, node.children, opts);
          item.appendChild(subList);
        }
      }

      list.appendChild(item);
    }
  }

  function renderToc(headings) {
    var container = state.elements && state.elements.toc;
    if (!container) {
      return;
    }

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

  function ensurePageOutlineSpine() {
    if (state.outlineSpine && state.outlineSpine.root && state.outlineSpine.root.isConnected) {
      return state.outlineSpine;
    }

    var root = document.querySelector("[data-docs-outline-spine]");

    if (!root) {
      root = document.createElement("aside");
      root.className = "docs-outline-spine";
      root.setAttribute("data-docs-outline-spine", "");
      root.setAttribute("aria-label", "Indice rapido pagina");
      root.hidden = true;
      document.body.appendChild(root);
    }

    var button = root.querySelector("[data-docs-outline-trigger]");
    if (!button) {
      button = document.createElement("button");
      button.type = "button";
      button.className = "docs-outline-spine__trigger";
      button.setAttribute("data-docs-outline-trigger", "");
      button.setAttribute("aria-haspopup", "true");
      button.setAttribute("aria-expanded", "false");
      button.setAttribute("aria-label", "Mostra indice pagina");
      root.appendChild(button);
    }

    var mini = root.querySelector("[data-docs-outline-mini]");
    if (!mini) {
      mini = document.createElement("span");
      mini.className = "docs-outline-spine__mini";
      mini.setAttribute("data-docs-outline-mini", "");
      mini.setAttribute("aria-hidden", "true");
      button.appendChild(mini);
    }

    var popover = root.querySelector("[data-docs-outline-popover]");
    if (!popover) {
      popover = document.createElement("div");
      popover.className = "docs-outline-spine__popover";
      popover.setAttribute("data-docs-outline-popover", "");
      popover.setAttribute("role", "navigation");
      popover.setAttribute("aria-label", "In questa pagina");
      popover.hidden = true;
      root.appendChild(popover);
    }

    var viewport = popover.querySelector(".docs-outline-spine__viewport");
    if (!viewport) {
      viewport = document.createElement("div");
      viewport.className = "docs-outline-spine__viewport";
      popover.appendChild(viewport);
    }

    var track = viewport.querySelector(".docs-outline-spine__track");
    if (!track) {
      track = document.createElement("span");
      track.className = "docs-outline-spine__track";
      track.setAttribute("aria-hidden", "true");
      viewport.appendChild(track);
    }

    var indicator = root.querySelector("[data-docs-outline-indicator]");
    if (!indicator) {
      indicator = document.createElement("span");
      indicator.className = "docs-outline-spine__indicator";
      indicator.setAttribute("data-docs-outline-indicator", "");
      indicator.setAttribute("aria-hidden", "true");
      viewport.appendChild(indicator);
    }

    var list = root.querySelector("[data-docs-outline-list]");
    if (!list) {
      list = document.createElement("div");
      list.className = "docs-outline-spine__list";
      list.setAttribute("data-docs-outline-list", "");
      viewport.appendChild(list);
    }

    state.outlineSpine = {
      root: root,
      button: button,
      mini: mini,
      popover: popover,
      indicator: indicator,
      list: list,
    };

    if (root.getAttribute("data-docs-outline-bound") !== "true") {
      root.setAttribute("data-docs-outline-bound", "true");

      root.addEventListener("mouseenter", function onOutlineMouseEnter() {
        setPageOutlineSpineOpen(true);
      });

      root.addEventListener("mouseleave", function onOutlineMouseLeave() {
        setPageOutlineSpineOpen(false);
      });

      root.addEventListener("focusin", function onOutlineFocusIn() {
        setPageOutlineSpineOpen(true);
      });

      root.addEventListener("focusout", function onOutlineFocusOut(event) {
        if (event.relatedTarget && root.contains(event.relatedTarget)) {
          return;
        }

        setPageOutlineSpineOpen(false);
      });

      button.addEventListener("click", function onOutlineButtonClick(event) {
        event.preventDefault();
        setPageOutlineSpineOpen(!root.classList.contains("is-open"));
      });

      list.addEventListener("click", function onOutlineLinkClick(event) {
        var link = event.target.closest("a[data-docs-outline-link]");
        if (!link) {
          return;
        }

        setPageOutlineSpineOpen(false);
      });
    }

    return state.outlineSpine;
  }

  function setPageOutlineSpineOpen(isOpen) {
    var spine = state.outlineSpine;
    if (!spine || !spine.root || !spine.button || !spine.popover) {
      return;
    }

    var open = !!isOpen;
    spine.root.classList.toggle("is-open", open);
    spine.popover.hidden = !open;
    spine.button.hidden = open;
    spine.button.setAttribute("aria-expanded", open ? "true" : "false");

    if (open && state.activeTocId) {
      window.requestAnimationFrame(function syncOpenOutlineIndicator() {
        syncPageOutlineSpineActive(state.activeTocId);
      });
    }
  }

  function renderPageOutlineSpine(headings) {
    var spine = ensurePageOutlineSpine();
    var tocHeadings = [];

    if (Array.isArray(headings)) {
      for (var i = 0; i < headings.length; i += 1) {
        if (headings[i] && headings[i].level <= 3) {
          tocHeadings.push(headings[i]);
        }
      }
    }

    state.outlineHeadings = tocHeadings;

    if (!spine || !spine.root || !spine.mini || !spine.list) {
      return;
    }

    spine.mini.innerHTML = "";
    spine.list.innerHTML = "";
    spine.root.hidden = !tocHeadings.length;
    setPageOutlineSpineOpen(false);

    if (!tocHeadings.length) {
      return;
    }

    for (var j = 0; j < tocHeadings.length; j += 1) {
      var heading = tocHeadings[j];

      var tick = document.createElement("span");
      tick.className = "docs-outline-spine__tick level-" + heading.level;
      tick.setAttribute("data-docs-outline-tick", heading.id);
      tick.setAttribute("data-docs-outline-level", String(heading.level));

      if (heading.level === 1) {
        tick.style.setProperty("--outline-tick-width", "30px");
        tick.style.setProperty("--outline-tick-offset", "0px");
      } else if (heading.level === 2) {
        tick.style.setProperty("--outline-tick-width", "22px");
        tick.style.setProperty("--outline-tick-offset", "4px");
      } else {
        tick.style.setProperty("--outline-tick-width", "12px");
        tick.style.setProperty("--outline-tick-offset", "14px");
      }

      spine.mini.appendChild(tick);

      var link = document.createElement("a");
      link.className = "docs-outline-spine__link level-" + heading.level;
      link.href = "#" + heading.id;
      link.setAttribute("data-docs-outline-link", heading.id);
      link.textContent = heading.text;
      spine.list.appendChild(link);
    }

    syncPageOutlineSpineActive(state.activeTocId || tocHeadings[0].id);
  }

  function syncPageOutlineSpineActive(activeId) {
    var spine = state.outlineSpine;
    if (!spine || !spine.root) {
      return;
    }

    var id = readString(activeId, "");
    var ticks = spine.root.querySelectorAll("[data-docs-outline-tick]");
    var links = spine.root.querySelectorAll("[data-docs-outline-link]");
    var activeLink = null;

    for (var i = 0; i < ticks.length; i += 1) {
      var tickActive = ticks[i].getAttribute("data-docs-outline-tick") === id;
      ticks[i].classList.toggle("is-active", tickActive);
    }

    for (var j = 0; j < links.length; j += 1) {
      var linkActive = links[j].getAttribute("data-docs-outline-link") === id;
      links[j].classList.toggle("is-active", linkActive);

      if (linkActive) {
        links[j].setAttribute("aria-current", "location");
        activeLink = links[j];
      } else {
        links[j].removeAttribute("aria-current");
      }
    }

    updatePageOutlineIndicator(activeLink);
  }

  function updatePageOutlineIndicator(activeLink) {
    var spine = state.outlineSpine;
    if (!spine || !spine.indicator || !spine.list || !activeLink) {
      return;
    }

    if (spine.popover && spine.popover.hidden) {
      return;
    }

    var listRect = spine.list.getBoundingClientRect();
    var linkRect = activeLink.getBoundingClientRect();

    if (!listRect.height || !linkRect.height) {
      return;
    }

    var top = Math.max(0, linkRect.top - listRect.top);
    var height = Math.max(14, linkRect.height);

    spine.indicator.style.top = top + "px";
    spine.indicator.style.height = height + "px";
    spine.indicator.style.transform = "none";
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

    syncPageOutlineSpineActive(activeId);

    if (!state.elements || !state.elements.toc) {
      return;
    }

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
    closeWikiTooltip();
    state.elements.content.innerHTML = '<p class="docs-state">Caricamento documento...</p>';
  }

  function renderDocErrorState(options) {
    options = options || {};
    closeWikiTooltip();

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
    if (state.elements.toc) {
      state.elements.toc.innerHTML = '<p class="docs-state docs-state--compact">Nessuna sezione disponibile.</p>';
    }
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
    renderPageOutlineSpine([]);
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
})()