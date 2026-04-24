(function () {
  "use strict";

  var SUPABASE_URL = "https://atglgaritxzowshenaqr.supabase.co";
  var SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0Z2xnYXJpdHh6b3dzaGVuYXFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NzcxNDQsImV4cCI6MjA5MjM1MzE0NH0.ObDvvWMkddZL8wABKyI-TBi4KgVoYArJQjoOnAmVVe8";

  var SIDEBAR_PARTIAL_PATH = "partials/sidebar.html";
  var ACCESS_CODE_KEY = "gorgoneAccessCode";
  var ADMIN_CODE = "Enclave";
  var RESOLVE_PLAYER_ENDPOINT = SUPABASE_URL + "/functions/v1/resolve-player";
  var FALLBACK_TOKEN_IMAGE =
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' fill='%23162229'/><circle cx='32' cy='24' r='12' fill='%234db8a6'/><rect x='14' y='40' width='36' height='16' fill='%233b5865'/></svg>";

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
  };

  document.addEventListener("DOMContentLoaded", function onReady() {
    bootstrapPromise = bootstrapLayout();
  });

  window.addEventListener("storage", function onStorage(event) {
    if (event.key !== ACCESS_CODE_KEY) {
      return;
    }

    state.code = readStoredAccessCode();
    syncManageAccessControls();
    dispatchAccessCodeUpdated();
    resolveProfileCode(state.code, { silentSuccess: true });
  });

  async function bootstrapLayout() {
    dom.sidebarContainers = Array.prototype.slice.call(document.querySelectorAll("[data-sidebar-container]"));
    dom.profileContainers = Array.prototype.slice.call(document.querySelectorAll("[data-profile-widget]"));

    if (dom.sidebarContainers.length) {
      await injectSidebarPartial();
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
      response = await fetch(SIDEBAR_PARTIAL_PATH, { cache: "no-store" });
    } catch (error) {
      console.warn("Impossibile caricare la sidebar condivisa:", error);
      return;
    }

    if (!response.ok) {
      console.warn("Impossibile caricare la sidebar condivisa (" + response.status + ").");
      return;
    }

    var html = await response.text();

    for (var i = 0; i < dom.sidebarContainers.length; i += 1) {
      dom.sidebarContainers[i].innerHTML = html;
    }
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
    dom.popoverTokens = dom.profileRoot.querySelector("[data-profile-popover-tokens]");
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
      setProfileStatus("Codice gestione attivo.", "is-valid");
      if (dom.profileMeta) {
        dom.profileMeta.hidden = false;
        dom.profileMeta.textContent = "Gestione amministrativa abilitata";
      }
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
      return;
    }

    state.loading = false;

    if (!payload || payload.success !== true || !payload.player) {
      clearResolvedPlayerState(true);
      setProfileStatus("Codice non valido.", "is-error");
      return;
    }

    state.player = payload.player;
    state.characters = Array.isArray(payload.characters) ? payload.characters : [];
    state.lastResolvedCode = code;
    renderProfileSummary();

    if (!silentSuccess) {
      setProfileStatus("Profilo riconosciuto.", "is-valid");
    } else {
      setProfileStatus("", "");
    }

    dispatchPlayerResolved(code);
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
    dom.profileMeta.textContent = "Codice giocatore valido";

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

      dom.tokens.appendChild(createTokenImage(imageSrc, alt, "profile-widget__token profile-widget__token--small"));
      dom.popoverTokens.appendChild(createTokenImage(imageSrc, alt, "profile-widget__token"));
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
    var isEnabled = readStoredAccessCode() === ADMIN_CODE;
    var actions = document.querySelectorAll("[data-manage-action]");

    for (var i = 0; i < actions.length; i += 1) {
      actions[i].disabled = !isEnabled;
      actions[i].setAttribute("aria-disabled", String(!isEnabled));
    }

    document.dispatchEvent(
      new CustomEvent("enclave:manage-access-changed", {
        detail: { enabled: isEnabled },
      })
    );
  }

  function setActiveNavItem() {
    var activeKeys = readActiveKeysForPage();
    var links = document.querySelectorAll("[data-sidebar-container] [data-active-for]");

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
      var docKey = readString(new URLSearchParams(window.location.search).get("doc"), "").toLowerCase();
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
      })
    );
  }

  function dispatchPlayerCleared() {
    document.dispatchEvent(new CustomEvent("enclave:player-cleared"));
  }

  function dispatchAccessCodeUpdated() {
    document.dispatchEvent(
      new CustomEvent("enclave:access-code-updated", {
        detail: { code: state.code || "" },
      })
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
    return typeof value === "string" && value.trim() !== "" ? value.trim() : fallback;
  }
})();










