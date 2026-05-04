/* v1.53 2026-05-05T00:29:00+02:00 */

/*
  MOBILE TIMELINE PATCH
  Incolla questo script DOPO timeline.js, oppure integra le funzioni indicate nel file principale.

  Obiettivo:
  - su desktop non cambia nulla;
  - su mobile la timeline diventa verticale;
  - ogni card mostra il proprio marker mobile con:
    - icona evento reale
    - data breve
    - pill anno DR
  - l'asse desktop viene nascosto solo su mobile;
  - niente marker finti generati da CSS.
*/

(function () {
  "use strict";

  var MOBILE_QUERY = "(max-width: 780px)";
  var STYLE_ID = "timeline-mobile-vertical-patch-style";
  var refreshRaf = 0;
  var isPatching = false;

  var TYPE_META = {
    campaign: { label: "Campagna", icon: "fa-solid fa-dragon" },
    lore: { label: "Lore", icon: "fa-solid fa-book-open" },
    mission: { label: "Missione", icon: "fa-solid fa-scroll" },
    character: { label: "Personaggio", icon: "fa-solid fa-user-shield" },
    faction: { label: "Fazione", icon: "fa-solid fa-flag" },
    fracture: { label: "Frattura", icon: "fa-solid fa-burst" },
    alternate: { label: "Realtà alternativa", icon: "fa-solid fa-code-branch" }
  };

  document.addEventListener("DOMContentLoaded", initMobileTimelinePatch);
  document.addEventListener("click", handleMobileTimelineAnimation, true);
  document.addEventListener("click", handleMobileTimelineClick, true);
  window.addEventListener("resize", scheduleMobileTimelineRefresh);

  function initMobileTimelinePatch() {
    injectMobileTimelineStyles();
    patchExistingTimelineCards();
    observeTimelineList();
  }

  function observeTimelineList() {
    var list = getTimelineList();
    if (!list || list.dataset.mobileTimelineObserver === "true") return;

    list.dataset.mobileTimelineObserver = "true";

    var observer = new MutationObserver(function () {
      if (isPatching) return;
      scheduleMobileTimelineRefresh();
    });

    observer.observe(list, {
      childList: true
    });
  }

  function scheduleMobileTimelineRefresh() {
    if (refreshRaf) return;
    refreshRaf = window.requestAnimationFrame(function () {
      refreshRaf = 0;
      patchExistingTimelineCards();
    });
  }

  function patchExistingTimelineCards() {
    var list = getTimelineList();
    if (!list) return;

    isPatching = true;
    list.dataset.timelineMobileMode = isMobileTimeline() ? "vertical" : "desktop";

    var seenYears = new Set();

    Array.from(list.querySelectorAll(".timeline-event[data-event-id]")).forEach(function (card) {
      var dateLabel = readString(card.getAttribute("title"), "");
      var year = getTimelineYearFromCard(card, dateLabel);
      var showYear = Boolean(year && !seenYears.has(year));
      if (year) seenYears.add(year);
      patchTimelineCard(card, showYear);
    });

    isPatching = false;
  }

  function patchTimelineCard(card, showYear) {
    if (!card) return;

    var body = card.querySelector(".timeline-event-body");
    if (!body) return;

    var type = readString(card.dataset.eventType, "campaign");
    var typeMeta = TYPE_META[type] || TYPE_META.campaign;
    var dateLabel = readString(card.getAttribute("title"), "");
    var year = getTimelineYearFromCard(card, dateLabel);
    var shortDate = getShortDateLabel(dateLabel);

    var signature = [type, typeMeta.label, typeMeta.icon, dateLabel, year, shortDate, showYear ? "year" : "no-year"].join("||");
    var marker = card.querySelector(".timeline-mobile-marker");
    if (marker && marker.dataset.mobileMarkerSignature === signature) return;

    if (!marker) {
      marker = document.createElement("div");
      marker.className = "timeline-mobile-marker";
      marker.setAttribute("aria-hidden", "true");
      card.insertBefore(marker, body);
    }

    marker.dataset.mobileMarkerSignature = signature;
    marker.innerHTML =
      (year && showYear ? '<span class="timeline-mobile-marker__year">' + escapeHtml(year + " DR") + '</span>' : "") +
      '<span class="timeline-mobile-marker__icon" title="' + escapeAttribute(typeMeta.label) + '">' +
      '<i class="' + escapeAttribute(typeMeta.icon) + '"></i>' +
      '</span>' +
      '<span class="timeline-mobile-marker__date">' + escapeHtml(shortDate || "Senza data") + '</span>';
  }

  function handleMobileTimelineAnimation(event) {
    if (!isMobileTimeline()) return;

    if (event.target && event.target.closest && event.target.closest(".timeline-mobile-marker")) return;

    var card = event.target && event.target.closest ? event.target.closest(".timeline-event[data-event-id]") : null;
    if (!card) return;

    animateTimelineCardHeight(card);
  }

  function animateTimelineCardHeight(card, trigger) {
    if (!card || !isMobileTimeline()) {
      if (typeof trigger === "function") trigger();
      return;
    }

    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      if (typeof trigger === "function") trigger();
      return;
    }

    var startHeight = card.getBoundingClientRect().height;

    if (typeof trigger === "function") trigger();

    window.requestAnimationFrame(function () {
      var endHeight = card.getBoundingClientRect().height;
      if (!startHeight || !endHeight || Math.abs(endHeight - startHeight) < 2) return;

      card.dataset.mobileTimelineAnimating = "true";
      card.style.height = startHeight + "px";
      card.style.maxHeight = "none";
      card.style.overflow = "hidden";
      card.style.transition = "height 240ms cubic-bezier(0.2, 0.8, 0.2, 1)";

      window.requestAnimationFrame(function () {
        card.style.height = endHeight + "px";
      });

      window.setTimeout(function () {
        if (card.dataset.mobileTimelineAnimating !== "true") return;
        delete card.dataset.mobileTimelineAnimating;
        card.style.height = "";
        card.style.maxHeight = "";
        card.style.overflow = "";
        card.style.transition = "";
      }, 280);
    });
  }

  function handleMobileTimelineClick(event) {
    if (!isMobileTimeline()) return;

    var marker = event.target && event.target.closest ? event.target.closest(".timeline-mobile-marker") : null;
    if (!marker) return;

    var card = marker.closest(".timeline-event[data-event-id]");
    if (!card) return;

    event.preventDefault();
    event.stopPropagation();
    animateTimelineCardHeight(card, function () {
      card.click();
    });
  }

  function getTimelineList() {
    return document.querySelector("#timelineList, [data-timeline-list], .timeline-list");
  }

  function isMobileTimeline() {
    return window.matchMedia && window.matchMedia(MOBILE_QUERY).matches;
  }

  function getTimelineYearFromCard(card, dateLabel) {
    var sortKey = Number(card && card.dataset ? card.dataset.sortKey : "");
    if (Number.isFinite(sortKey) && sortKey) return String(Math.floor(sortKey / 1000));

    var label = readString(dateLabel, "");
    var match = label.match(/(-?\d+)\s*DR/i);
    return match ? match[1] : "";
  }

  function getShortDateLabel(dateLabel) {
    var label = readString(dateLabel, "");
    if (!label) return "";

    return label
      .replace(/\s*—\s*.*$/g, "")
      .replace(/,\s*(-?\d+)\s*DR\b/i, "")
      .replace(/\s+(-?\d+)\s*DR\b/i, "")
      .trim();
  }

  function injectMobileTimelineStyles() {
    var existing = document.getElementById(STYLE_ID);
    if (existing) existing.remove();
  }

  function readString(value, fallback) {
    if (typeof value === "string") return value.trim();
    if (value === null || typeof value === "undefined") return fallback || "";
    return String(value).trim();
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replaceAll("`", "&#096;");
  }
})();
