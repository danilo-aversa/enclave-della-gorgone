(function () {
  "use strict";

  var SUPABASE_URL = "https://atglgaritxzowshenaqr.supabase.co";
  var SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0Z2xnYXJpdHh6b3dzaGVuYXFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NzcxNDQsImV4cCI6MjA5MjM1MzE0NH0.ObDvvWMkddZL8wABKyI-TBi4KgVoYArJQjoOnAmVVe8";

  var SIDEBAR_PARTIAL_PATH = "partials/sidebar.html";

  function readSidebarPartialPath() {
    var container = document.querySelector("[data-sidebar-container]");
    var explicitPath =
      container && container.getAttribute("data-sidebar-partial");

    if (explicitPath) {
      return resolveSitePath(explicitPath);
    }

    return joinSiteBasePath(SIDEBAR_PARTIAL_PATH);
  }

  var ACCESS_CODE_KEY = "gorgoneAccessCode";
  var THEME_KEY = "gorgoneTheme";
  var DEFAULT_THEME = "dark";
  var ADMIN_CODE = "Enclave";
  var MOBILE_SIDEBAR_BREAKPOINT = 980;
  var RESOLVE_PLAYER_ENDPOINT = SUPABASE_URL + "/functions/v1/resolve-player";
  var FALLBACK_TOKEN_IMAGE =
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' fill='%23162229'/><circle cx='32' cy='24' r='12' fill='%234db8a6'/><rect x='14' y='40' width='36' height='16' fill='%233b5865'/></svg>";

  var cachedSiteBase = "";

  var state = {
    code: "",
    player: null,
    characters: [],
    loading: false,
    lastResolvedCode: "",
    error: "",
  };

  var dom = {
    sidebarContainers: [],
    profileContainers: [],
    profileRoot: null,
    trigger: null,
    popover: null,
    input: null,
    applyButton: null,
    clearButton: null,
    status: null,
    name: null,
    tokens: null,
    popoverTokens: null,
    profileMeta: null,
    themeToggle: null,
    themeButtons: [],
    primarySidebarContainer: null,
    mobileSidebarToggle: null,
    mobileSidebarBackdrop: null,
    mobileSidebarEventsBound: false,
    sidebarSlideToggles: [],
    desktopSidebarCollapsed: false,
  };

  var bootstrapPromise = null;

  window.EnclaveLayout = {
    getProfileState: function getProfileState() {
      return {
        code: state.code,
        player: state.player,
        characters: state.characters.slice(),
      };
    },
    getTheme: function getTheme() {
      return readCurrentTheme();
    },
    setTheme: function setTheme(theme) {
      applyTheme(theme, { persist: true });
      syncThemeControls();
    },
    getSiteBase: function getSiteBase() {
      return readSiteBase();
    },
  };

  applyTheme(readStoredTheme(), { persist: false });

  document.addEventListener("DOMContentLoaded", function onReady() {
    applyTheme(readStoredTheme(), { persist: false });
    bootstrapPromise = bootstrapLayout();
  });

  window.addEventListener("storage", function onStorage(event) {
    if (event.key === THEME_KEY) {
      applyTheme(readStoredTheme(), { persist: false });
      syncThemeControls();
      return;
    }

    if (event.key !== ACCESS_CODE_KEY) {
      return;
    }

    state.code = readStoredAccessCode();
    syncManageAccessControls();
    dispatchAccessCodeUpdated();
    resolveProfileCode(state.code, { silentSuccess: true });
  });

  async function bootstrapLayout() {
    dom.sidebarContainers = Array.prototype.slice.call(
      document.querySelectorAll("[data-sidebar-container]"),
    );
    dom.profileContainers = Array.prototype.slice.call(
      document.querySelectorAll("[data-profile-widget]"),
    );

    if (dom.sidebarContainers.length) {
      await injectSidebarPartial();
      initMobileSidebar();
      initDesktopSidebar();
      bindThemeControls();
      syncManageAccessControls();
      setActiveNavItem();
      document.dispatchEvent(new CustomEvent("enclave:sidebar-ready"));
    }

    if (dom.profileContainers.length) {
      renderProfileWidget();
    }

    state.code = readStoredAccessCode();

    if (dom.input && state.code) {
      dom.input.value = state.code;
    }

    syncManageAccessControls();
    dispatchAccessCodeUpdated();
    await resolveProfileCode(state.code, { silentSuccess: true });
    document.dispatchEvent(new CustomEvent("enclave:layout-ready"));
  }

  async function injectSidebarPartial() {
    var response;

    try {
      response = await fetch(readSidebarPartialPath(), { cache: "no-store" });
    } catch (error) {
      console.warn("Impossibile caricare la sidebar condivisa:", error);
      return;
    }

    if (!response.ok) {
      console.warn(
        "Impossibile caricare la sidebar condivisa (" + response.status + ").",
      );
      return;
    }

    var html = await response.text();

    for (var i = 0; i < dom.sidebarContainers.length; i += 1) {
      dom.sidebarContainers[i].innerHTML = html;
      rewriteSidebarAssetUrls(dom.sidebarContainers[i]);
      rewriteSidebarLinks(dom.sidebarContainers[i]);
    }
  }

  function rewriteSidebarAssetUrls(container) {
    if (!container) {
      return;
    }

    var srcNodes = container.querySelectorAll("[src]");

    for (var i = 0; i < srcNodes.length; i += 1) {
      var src = srcNodes[i].getAttribute("src");
      var resolvedSrc = resolveSiteAssetUrl(src);

      if (resolvedSrc !== src) {
        srcNodes[i].setAttribute("src", resolvedSrc);
      }
    }

    var srcsetNodes = container.querySelectorAll("[srcset]");

    for (var s = 0; s < srcsetNodes.length; s += 1) {
      var srcset = srcsetNodes[s].getAttribute("srcset");
      var resolvedSrcset = resolveSrcsetAssetUrls(srcset);

      if (resolvedSrcset !== srcset) {
        srcsetNodes[s].setAttribute("srcset", resolvedSrcset);
      }
    }
  }

  function resolveSrcsetAssetUrls(srcset) {
    if (!srcset || typeof srcset !== "string") {
      return srcset;
    }

    return srcset
      .split(",")
      .map(function mapSrcsetPart(part) {
        var trimmed = part.trim();
        var pieces;

        if (!trimmed) {
          return trimmed;
        }

        pieces = trimmed.split(/\s+/);
        pieces[0] = resolveSiteAssetUrl(pieces[0]);

        return pieces.join(" ");
      })
      .join(", ");
  }

  function resolveSiteAssetUrl(value) {
    var cleanValue = readString(value, "");

    if (!cleanValue || isExternalLikeUrl(cleanValue)) {
      return value;
    }

    if (
      cleanValue.indexOf("/assets/") === 0 ||
      cleanValue.indexOf("assets/") === 0
    ) {
      return joinSiteBasePath(cleanValue.replace(/^\/+/, ""));
    }

    return value;
  }

  function resolveSitePath(value) {
    var cleanValue = readString(value, "");

    if (!cleanValue || isExternalLikeUrl(cleanValue)) {
      return value;
    }

    if (cleanValue.indexOf("../") === 0 || cleanValue.indexOf("./") === 0) {
      return cleanValue;
    }

    if (cleanValue.charAt(0) === "/") {
      return joinSiteBasePath(cleanValue.replace(/^\/+/, ""));
    }

    return cleanValue;
  }

  function joinSiteBasePath(path) {
    var base = readSiteBase();
    var cleanPath = readString(path, "").replace(/^\/+/, "");

    if (!cleanPath) {
      return base;
    }

    return base + cleanPath;
  }

  function readSiteBase() {
    var explicitBase;
    var metaBase;
    var htmlBase;
    var pathParts;

    if (cachedSiteBase) {
      return cachedSiteBase;
    }

    explicitBase =
      readString(window.EnclaveSiteBase, "") ||
      readString(window.SITE_BASE, "");

    htmlBase = document.documentElement
      ? readString(document.documentElement.getAttribute("data-site-base"), "")
      : "";

    metaBase = readString(
      document.querySelector('meta[name="site-base"]') &&
        document.querySelector('meta[name="site-base"]').getAttribute("content"),
      "",
    );

    if (explicitBase || htmlBase || metaBase) {
      cachedSiteBase = normalizeSiteBase(explicitBase || htmlBase || metaBase);
      return cachedSiteBase;
    }

    if (window.location.hostname.indexOf("github.io") !== -1) {
      pathParts = (window.location.pathname || "").split("/").filter(Boolean);

      if (pathParts.length) {
        cachedSiteBase = "/" + pathParts[0] + "/";
        return cachedSiteBase;
      }
    }

    cachedSiteBase = "/";
    return cachedSiteBase;
  }

  function normalizeSiteBase(value) {
    var cleanValue = readString(value, "/");

    if (isExternalLikeUrl(cleanValue)) {
      return cleanValue.replace(/\/?$/, "/");
    }

    cleanValue = "/" + cleanValue.replace(/^\/+/, "").replace(/\/+$/, "");

    if (cleanValue === "/") {
      return "/";
    }

    return cleanValue + "/";
  }

  function isExternalLikeUrl(value) {
    var cleanValue = readString(value, "").toLowerCase();

    return (
      cleanValue.indexOf("http://") === 0 ||
      cleanValue.indexOf("https://") === 0 ||
      cleanValue.indexOf("//") === 0 ||
      cleanValue.indexOf("mailto:") === 0 ||
      cleanValue.indexOf("tel:") === 0 ||
      cleanValue.indexOf("data:") === 0 ||
      cleanValue.indexOf("blob:") === 0 ||
      cleanValue.indexOf("#") === 0
    );
  }

  function rewriteSidebarLinks(container) {
    var prefix = container.getAttribute("data-sidebar-link-prefix") || "";

    if (!prefix) {
      return;
    }

    var links = container.querySelectorAll("a[href]");

    for (var i = 0; i < links.length; i += 1) {
      var href = links[i].getAttribute("href");

      if (
        !href ||
        href.charAt(0) === "#" ||
        href.indexOf("http://") === 0 ||
        href.indexOf("https://") === 0 ||
        href.indexOf("mailto:") === 0 ||
        href.indexOf("../") === 0 ||
        href.charAt(0) === "/"
      ) {
        continue;
      }

      links[i].setAttribute("href", prefix + href);
    }
  }

  function initMobileSidebar() {
    if (!document.body || !dom.sidebarContainers.length) {
      return;
    }

    dom.primarySidebarContainer = dom.sidebarContainers[0];

    if (!dom.primarySidebarContainer.querySelector(".sidebar")) {
      return;
    }

    if (!dom.primarySidebarContainer.id) {
      dom.primarySidebarContainer.id = "portal-sidebar";
    }

    document.body.classList.add("has-mobile-sidebar");
    ensureMobileSidebarControls();
    bindMobileSidebarCloseOnNavigation(dom.primarySidebarContainer);

    if (!dom.mobileSidebarEventsBound) {
      dom.mobileSidebarEventsBound = true;

      window.addEventListener("resize", function onResize() {
        if (!isMobileViewport()) {
          setMobileSidebarOpen(false);
        }
      });

      document.addEventListener("keydown", function onEscape(event) {
        if (event.key !== "Escape" || !isMobileSidebarOpen()) {
          return;
        }

        setMobileSidebarOpen(false);
      });
    }
  }

  function initDesktopSidebar() {
    if (!document.body || !dom.sidebarContainers.length) {
      return;
    }

    dom.sidebarSlideToggles = Array.prototype.slice.call(
      document.querySelectorAll("[data-sidebar-slide-toggle]"),
    );

    var defaultCollapsed = isDesktopSidebarDefaultCollapsedPage();
    setDesktopSidebarCollapsed(defaultCollapsed);

    for (var i = 0; i < dom.sidebarSlideToggles.length; i += 1) {
      if (dom.sidebarSlideToggles[i].dataset.sidebarSlideBound === "true") {
        continue;
      }

      dom.sidebarSlideToggles[i].dataset.sidebarSlideBound = "true";
      dom.sidebarSlideToggles[i].addEventListener("click", function onSidebarSlideToggle() {
        if (isMobileViewport()) {
          return;
        }

        setDesktopSidebarCollapsed(!dom.desktopSidebarCollapsed);
      });
    }

    window.addEventListener("resize", syncDesktopSidebarOnResize);
    syncDesktopSidebarOnResize();
  }

  function isDesktopSidebarDefaultCollapsedPage() {
    return !!(
      document.body &&
      (document.body.classList.contains("docs-reading-page") ||
        document.body.classList.contains("world-map-reading-page"))
    );
  }

  function syncDesktopSidebarOnResize() {
    if (!document.body) {
      return;
    }

    if (isMobileViewport()) {
      document.body.classList.remove("sidebar-collapsed");
      updateSidebarSlideToggleControls(false);
      return;
    }

    document.body.classList.toggle("sidebar-collapsed", !!dom.desktopSidebarCollapsed);
    updateSidebarSlideToggleControls(!!dom.desktopSidebarCollapsed);
  }

  function setDesktopSidebarCollapsed(isCollapsed) {
    dom.desktopSidebarCollapsed = !!isCollapsed;
    syncDesktopSidebarOnResize();
  }

  function updateSidebarSlideToggleControls(isCollapsed) {
    for (var i = 0; i < dom.sidebarSlideToggles.length; i += 1) {
      var button = dom.sidebarSlideToggles[i];
      var icon = button.querySelector("i");

      button.setAttribute("aria-pressed", String(!!isCollapsed));
      button.setAttribute(
        "aria-label",
        isCollapsed ? "Mostra barra laterale" : "Nascondi barra laterale",
      );
      button.setAttribute(
        "title",
        isCollapsed ? "Mostra barra laterale" : "Nascondi barra laterale",
      );

      if (icon) {
        icon.classList.toggle("fa-angles-left", !isCollapsed);
        icon.classList.toggle("fa-angles-right", isCollapsed);
      }
    }
  }

  function ensureMobileSidebarControls() {
    if (!document.body || !dom.primarySidebarContainer) {
      return;
    }

    if (!dom.mobileSidebarToggle) {
      dom.mobileSidebarToggle = document.createElement("button");
      dom.mobileSidebarToggle.type = "button";
      dom.mobileSidebarToggle.className = "mobile-sidebar-toggle";
      dom.mobileSidebarToggle.setAttribute("aria-label", "Apri menu");
      dom.mobileSidebarToggle.setAttribute("aria-expanded", "false");
      dom.mobileSidebarToggle.innerHTML =
        '<i class="fa-solid fa-bars" aria-hidden="true"></i>';
      document.body.appendChild(dom.mobileSidebarToggle);

      dom.mobileSidebarToggle.addEventListener("click", function onToggleClick() {
        if (!isMobileViewport()) {
          return;
        }

        setMobileSidebarOpen(!isMobileSidebarOpen());
      });
    }

    dom.mobileSidebarToggle.setAttribute(
      "aria-controls",
      dom.primarySidebarContainer.id,
    );

    if (!dom.mobileSidebarBackdrop) {
      dom.mobileSidebarBackdrop = document.createElement("button");
      dom.mobileSidebarBackdrop.type = "button";
      dom.mobileSidebarBackdrop.className = "mobile-sidebar-backdrop";
      dom.mobileSidebarBackdrop.setAttribute(
        "aria-label",
        "Chiudi menu laterale",
      );
      dom.mobileSidebarBackdrop.tabIndex = -1;
      dom.mobileSidebarBackdrop.addEventListener(
        "click",
        function onBackdropClick() {
          setMobileSidebarOpen(false);
        },
      );
    }

    var sidebarHost = dom.primarySidebarContainer.parentElement || document.body;
    if (dom.mobileSidebarBackdrop.parentElement !== sidebarHost) {
      sidebarHost.appendChild(dom.mobileSidebarBackdrop);
    }

    updateMobileSidebarControls(false);
  }

  function bindMobileSidebarCloseOnNavigation(container) {
    if (!container || container.dataset.mobileSidebarBound === "true") {
      return;
    }

    container.dataset.mobileSidebarBound = "true";
    container.addEventListener("click", function onSidebarClick(event) {
      if (!isMobileViewport() || !isMobileSidebarOpen()) {
        return;
      }

      var target = event.target;
      var link = target && target.closest ? target.closest("a[href]") : null;
      var actionButton =
        target && target.closest ? target.closest(".manage-action") : null;

      if (link) {
        setMobileSidebarOpen(false);
        return;
      }

      if (actionButton && !actionButton.disabled) {
        setMobileSidebarOpen(false);
      }
    });
  }

  function setMobileSidebarOpen(isOpen) {
    if (!document.body) {
      return;
    }

    var shouldOpen = !!isOpen && isMobileViewport();
    document.body.classList.toggle("sidebar-mobile-open", shouldOpen);
    updateMobileSidebarControls(shouldOpen);
  }

  function isMobileSidebarOpen() {
    return !!(
      document.body &&
      document.body.classList.contains("sidebar-mobile-open")
    );
  }

  function isMobileViewport() {
    if (typeof window.matchMedia !== "function") {
      return window.innerWidth <= MOBILE_SIDEBAR_BREAKPOINT;
    }

    return window.matchMedia(
      "(max-width: " + MOBILE_SIDEBAR_BREAKPOINT + "px)",
    ).matches;
  }

  function updateMobileSidebarControls(isOpen) {
    if (!dom.mobileSidebarToggle || !dom.mobileSidebarBackdrop) {
      return;
    }

    var open = !!isOpen;
    var icon = dom.mobileSidebarToggle.querySelector("i");

    dom.mobileSidebarToggle.setAttribute("aria-expanded", String(open));
    dom.mobileSidebarToggle.setAttribute(
      "aria-label",
      open ? "Chiudi menu" : "Apri menu",
    );

    if (icon) {
      icon.classList.toggle("fa-bars", !open);
      icon.classList.toggle("fa-xmark", open);
    }

    dom.mobileSidebarBackdrop.setAttribute("aria-hidden", String(!open));
  }

  function bindThemeControls() {
    dom.themeToggle = document.querySelector("[data-theme-toggle]");
    dom.themeButtons = Array.prototype.slice.call(
      document.querySelectorAll("[data-theme-option]"),
    );

    if (!dom.themeToggle && !dom.themeButtons.length) {
      return;
    }

    if (dom.themeToggle) {
      dom.themeToggle.addEventListener("click", function onThemeToggleClick(event) {
        var target = event.target;
        if (
          target &&
          typeof target.closest === "function" &&
          target.closest("[data-theme-option], [data-theme-toggle]")
        ) {
          toggleTheme();
        }
      });
    } else {
      for (var i = 0; i < dom.themeButtons.length; i += 1) {
        dom.themeButtons[i].addEventListener("click", function onThemeClick() {
          toggleTheme();
        });
      }
    }

    syncThemeControls();
  }

  function toggleTheme() {
    var currentTheme = readCurrentTheme();
    var nextTheme = currentTheme === "light" ? "dark" : "light";
    applyTheme(nextTheme, { persist: true });
    syncThemeControls();
  }

  function syncThemeControls() {
    var activeTheme = readCurrentTheme();

    for (var i = 0; i < dom.themeButtons.length; i += 1) {
      var buttonTheme = normalizeTheme(
        dom.themeButtons[i].getAttribute("data-theme-option"),
      );
      var isActive = buttonTheme === activeTheme;

      dom.themeButtons[i].classList.toggle("is-active", isActive);
      dom.themeButtons[i].setAttribute("aria-pressed", String(isActive));
    }
  }

  function applyTheme(theme, options) {
    options = options || {};
    theme = normalizeTheme(theme);

    document.documentElement.setAttribute("data-theme", theme);

    if (document.body) {
      document.body.setAttribute("data-theme", theme);
    }

    if (options.persist !== false) {
      writeStoredTheme(theme);
    }

    document.dispatchEvent(
      new CustomEvent("enclave:theme-changed", {
        detail: { theme: theme },
      }),
    );
  }

  function readCurrentTheme() {
    return normalizeTheme(
      document.documentElement.getAttribute("data-theme") ||
        (document.body && document.body.getAttribute("data-theme")) ||
        readStoredTheme(),
    );
  }

  function readStoredTheme() {
    try {
      return normalizeTheme(window.localStorage.getItem(THEME_KEY));
    } catch (_error) {
      return DEFAULT_THEME;
    }
  }

  function writeStoredTheme(theme) {
    try {
      window.localStorage.setItem(THEME_KEY, normalizeTheme(theme));
    } catch (_error) {
      // Ignore storage errors.
    }
  }

  function normalizeTheme(value) {
    return value === "light" ? "light" : DEFAULT_THEME;
  }

  function renderProfileWidget() {
    var markup =
      '<div class="profile-widget" data-profile-root>' +
      '  <button type="button" class="profile-widget__trigger" data-profile-trigger aria-expanded="false" aria-controls="profile-popover">' +
      '    <i class="fa-solid fa-user-circle" aria-hidden="true"></i>' +
      '    <span class="profile-widget__name" data-profile-name>Profilo</span>' +
      '    <span class="profile-widget__tokens" data-profile-trigger-tokens aria-hidden="true"></span>' +
      "  </button>" +
      '  <div id="profile-popover" class="profile-widget__popover" data-profile-popover hidden>' +
      '    <label class="profile-widget__label" for="profile-access-input">Codice identificativo</label>' +
      '    <input id="profile-access-input" class="profile-widget__input" type="text" autocomplete="off" spellcheck="false" data-profile-input />' +
      '    <div class="profile-widget__actions">' +
      '      <button type="button" class="profile-widget__btn profile-widget__btn--primary" data-profile-apply>Riconosci</button>' +
      '      <button type="button" class="profile-widget__btn" data-profile-clear>Esci</button>' +
      "    </div>" +
      '    <p class="profile-widget__status" data-profile-status aria-live="polite"></p>' +
      '    <p class="profile-widget__meta" data-profile-meta hidden></p>' +
      '    <div class="profile-widget__characters" data-profile-popover-tokens hidden></div>' +
      "  </div>" +
      "</div>";

    for (var i = 0; i < dom.profileContainers.length; i += 1) {
      dom.profileContainers[i].innerHTML = markup;
    }

    dom.profileRoot = document.querySelector("[data-profile-root]");
    if (!dom.profileRoot) {
      return;
    }

    dom.trigger = dom.profileRoot.querySelector("[data-profile-trigger]");
    dom.popover = dom.profileRoot.querySelector("[data-profile-popover]");
    dom.input = dom.profileRoot.querySelector("[data-profile-input]");
    dom.applyButton = dom.profileRoot.querySelector("[data-profile-apply]");
    dom.clearButton = dom.profileRoot.querySelector("[data-profile-clear]");
    dom.status = dom.profileRoot.querySelector("[data-profile-status]");
    dom.name = dom.profileRoot.querySelector("[data-profile-name]");
    dom.tokens = dom.profileRoot.querySelector("[data-profile-trigger-tokens]");
    dom.popoverTokens = dom.profileRoot.querySelector(
      "[data-profile-popover-tokens]",
    );
    dom.profileMeta = dom.profileRoot.querySelector("[data-profile-meta]");

    if (dom.trigger) {
      dom.trigger.addEventListener("click", function onTriggerClick(event) {
        event.stopPropagation();
        setPopoverOpen(!isPopoverOpen());
      });
    }

    if (dom.applyButton) {
      dom.applyButton.addEventListener("click", function onApplyClick() {
        var code = dom.input ? dom.input.value.trim() : "";
        applyProfileCode(code);
      });
    }

    if (dom.clearButton) {
      dom.clearButton.addEventListener("click", function onClearClick() {
        clearProfileCode();
      });
    }

    if (dom.input) {
      dom.input.addEventListener("keydown", function onInputKeydown(event) {
        if (event.key === "Enter") {
          event.preventDefault();
          applyProfileCode(dom.input.value.trim());
        }
      });
    }

    document.addEventListener("click", function onDocumentClick(event) {
      if (!isPopoverOpen()) {
        return;
      }

      if (dom.profileRoot && dom.profileRoot.contains(event.target)) {
        return;
      }

      setPopoverOpen(false);
    });

    document.addEventListener("keydown", function onEscape(event) {
      if (event.key !== "Escape" || !isPopoverOpen()) {
        return;
      }

      setPopoverOpen(false);
    });
  }

  function isPopoverOpen() {
    return !!(dom.popover && !dom.popover.hidden);
  }

  function setPopoverOpen(isOpen) {
    if (!dom.popover || !dom.trigger) {
      return;
    }

    dom.popover.hidden = !isOpen;
    dom.trigger.setAttribute("aria-expanded", String(isOpen));

    if (isOpen && dom.input) {
      dom.input.focus();
      if (typeof dom.input.select === "function") {
        dom.input.select();
      }
    }
  }

  function applyProfileCode(code) {
    state.code = code;

    if (!code) {
      clearStoredAccessCode();
      syncManageAccessControls();
      dispatchAccessCodeUpdated();
      clearResolvedPlayerState(true);
      return;
    }

    writeStoredAccessCode(code);
    syncManageAccessControls();
    dispatchAccessCodeUpdated();
    resolveProfileCode(code);
  }

  function clearProfileCode() {
    state.code = "";
    clearStoredAccessCode();
    syncManageAccessControls();
    dispatchAccessCodeUpdated();
    clearResolvedPlayerState(true);

    if (dom.input) {
      dom.input.value = "";
    }

    setProfileStatus("Profilo disconnesso.", "");
  }

  async function resolveProfileCode(code, options) {
    options = options || {};
    var silentSuccess = !!options.silentSuccess;

    if (!code) {
      clearResolvedPlayerState(true);
      return;
    }

    if (code === ADMIN_CODE) {
      clearResolvedPlayerState(true);
      state.lastResolvedCode = code;
      setProfileStatus("Codice gestione attivo.", "is-valid");
      if (dom.profileMeta) {
        dom.profileMeta.hidden = false;
        dom.profileMeta.textContent = "Gestione amministrativa abilitata";
      }
      syncManageAccessControls();
      return;
    }

    state.loading = true;
    setProfileStatus("Verifica codice...", "");

    var payload;
    try {
      payload = await postResolvePlayer(code);
    } catch (error) {
      state.loading = false;
      clearResolvedPlayerState(true);
      setProfileStatus("Impossibile verificare il codice.", "is-error");
      syncManageAccessControls();
      return;
    }

    state.loading = false;

    if (!payload || payload.success !== true || !payload.player) {
      clearResolvedPlayerState(true);
      setProfileStatus("Codice non valido.", "is-error");
      syncManageAccessControls();
      return;
    }

    state.player = payload.player;
    state.characters = Array.isArray(payload.characters)
      ? payload.characters
      : [];
    state.lastResolvedCode = code;
    renderProfileSummary();

    if (!silentSuccess) {
      setProfileStatus("Profilo riconosciuto.", "is-valid");
    } else {
      setProfileStatus("", "");
    }

    dispatchPlayerResolved(code);
    syncManageAccessControls();
  }

  function clearResolvedPlayerState(dispatchClearEvent) {
    state.player = null;
    state.characters = [];
    state.lastResolvedCode = "";
    renderProfileSummary();

    if (dispatchClearEvent) {
      dispatchPlayerCleared();
    }
  }

  function renderProfileSummary() {
    if (!dom.name || !dom.tokens || !dom.popoverTokens || !dom.profileMeta) {
      return;
    }

    dom.tokens.innerHTML = "";
    dom.popoverTokens.innerHTML = "";

    if (!state.player) {
      dom.name.textContent = "Profilo";
      dom.profileMeta.hidden = true;
      dom.profileMeta.textContent = "";
      dom.popoverTokens.hidden = true;
      return;
    }

    dom.name.textContent = readString(state.player.display_name, "Profilo");
    dom.profileMeta.hidden = false;
    dom.profileMeta.textContent = hasAdminPlayerPermission(state.player)
      ? "Gestione amministrativa abilitata"
      : "Codice giocatore valido";

    if (!state.characters.length) {
      dom.popoverTokens.hidden = true;
      return;
    }

    for (var i = 0; i < state.characters.length; i += 1) {
      var character = state.characters[i] || {};
      var imageSrc =
        readString(character.portrait_url, "") ||
        readString(character.token_url, "") ||
        FALLBACK_TOKEN_IMAGE;
      var alt = readString(character.name, "Personaggio");

      dom.tokens.appendChild(
        createTokenImage(
          imageSrc,
          alt,
          "profile-widget__token profile-widget__token--small",
        ),
      );
      dom.popoverTokens.appendChild(
        createTokenImage(imageSrc, alt, "profile-widget__token"),
      );
    }

    dom.popoverTokens.hidden = false;
  }

  function createTokenImage(src, alt, className) {
    var image = document.createElement("img");
    image.className = className;
    image.src = src;
    image.alt = alt;
    image.title = alt;

    image.addEventListener("error", function onImageError() {
      if (image.dataset.fallbackApplied === "true") {
        return;
      }

      image.dataset.fallbackApplied = "true";
      image.src = FALLBACK_TOKEN_IMAGE;
    });

    return image;
  }

  function syncManageAccessControls() {
    var isEnabled = isManageAccessEnabled();
    var actions = document.querySelectorAll("[data-manage-action]");

    for (var i = 0; i < actions.length; i += 1) {
      actions[i].disabled = !isEnabled;
      actions[i].setAttribute("aria-disabled", String(!isEnabled));
    }

    document.dispatchEvent(
      new CustomEvent("enclave:manage-access-changed", {
        detail: { enabled: isEnabled },
      }),
    );
  }

  function isManageAccessEnabled() {
    var storedCode = readStoredAccessCode();

    if (storedCode === ADMIN_CODE) {
      return true;
    }

    if (
      !storedCode ||
      !state.player ||
      !hasAdminPlayerPermission(state.player)
    ) {
      return false;
    }

    return state.lastResolvedCode === storedCode;
  }

  function hasAdminPlayerPermission(player) {
    if (!player || typeof player !== "object") {
      return false;
    }

    if (
      isTruthyPermission(player.can_manage_wiki) ||
      isTruthyPermission(player.canManageWiki) ||
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

  function setActiveNavItem() {
    var activeKeys = readActiveKeysForPage();
    var links = document.querySelectorAll(
      "[data-sidebar-container] [data-active-for]",
    );

    for (var i = 0; i < links.length; i += 1) {
      var link = links[i];
      var raw = readString(link.getAttribute("data-active-for"), "");
      var keys = raw.split("|");
      var isActive = false;

      for (var k = 0; k < keys.length; k += 1) {
        if (activeKeys.has(keys[k])) {
          isActive = true;
          break;
        }
      }

      link.classList.toggle("is-active", isActive);
    }
  }

  function readActiveKeysForPage() {
    var keys = new Set();
    var fileName = readCurrentFileName();
    var pageKey = fileName.replace(/\.html$/i, "") || "index";

    keys.add(pageKey);

    if (pageKey === "docs") {
      var docKey = readString(
        new URLSearchParams(window.location.search).get("doc"),
        "",
      ).toLowerCase();
      if (docKey.indexOf("lore/") === 0) {
        keys.add("docs-lore");
      }
      if (docKey.indexOf("regole/") === 0) {
        keys.add("docs-regole");
      }
      if (docKey.indexOf("sessioni-e-quest") !== -1) {
        keys.add("docs-cronache");
      }
    }

    if (pageKey === "quest") {
      keys.add("quest");
    }

    return keys;
  }

  function readCurrentFileName() {
    var path = window.location.pathname || "";
    var cleaned = path.split("?")[0].split("#")[0];
    var parts = cleaned.split("/").filter(Boolean);
    return parts.length ? parts[parts.length - 1].toLowerCase() : "index.html";
  }

  async function postResolvePlayer(code) {
    var response = await fetch(RESOLVE_PLAYER_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: "Bearer " + SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        player_code: code,
      }),
    });

    var payload = await parseJsonResponse(response);

    if (!response.ok) {
      throw new Error(readResponseError(payload, response.status));
    }

    return payload;
  }

  async function parseJsonResponse(response) {
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

  function readResponseError(payload, statusCode) {
    var details =
      readString(payload && payload.message, "") ||
      readString(payload && payload.error, "") ||
      readString(payload && payload.details, "");

    if (details) {
      return details;
    }

    return "Richiesta non riuscita (" + statusCode + ").";
  }

  function dispatchPlayerResolved(code) {
    document.dispatchEvent(
      new CustomEvent("enclave:player-resolved", {
        detail: {
          code: code,
          player: state.player,
          characters: state.characters.slice(),
        },
      }),
    );
  }

  function dispatchPlayerCleared() {
    document.dispatchEvent(new CustomEvent("enclave:player-cleared"));
  }

  function dispatchAccessCodeUpdated() {
    document.dispatchEvent(
      new CustomEvent("enclave:access-code-updated", {
        detail: { code: state.code || "" },
      }),
    );
  }

  function setProfileStatus(message, tone) {
    if (!dom.status) {
      return;
    }

    dom.status.textContent = message;
    dom.status.classList.remove("is-valid", "is-error");

    if (tone === "is-valid" || tone === "is-error") {
      dom.status.classList.add(tone);
    }
  }

  function readStoredAccessCode() {
    try {
      return readString(window.localStorage.getItem(ACCESS_CODE_KEY), "");
    } catch (_error) {
      return "";
    }
  }

  function writeStoredAccessCode(value) {
    try {
      window.localStorage.setItem(ACCESS_CODE_KEY, value);
    } catch (_error) {
      // Ignore storage errors.
    }
  }

  function clearStoredAccessCode() {
    try {
      window.localStorage.removeItem(ACCESS_CODE_KEY);
    } catch (_error) {
      // Ignore storage errors.
    }
  }

  function readString(value, fallback) {
    return typeof value === "string" && value.trim() !== ""
      ? value.trim()
      : fallback;
  }
})();