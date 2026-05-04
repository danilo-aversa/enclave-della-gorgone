/* v1.51 2026-05-04T23:14:00+02:00 */

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

  function handleMobileTimelineClick(event) {
    if (!isMobileTimeline()) return;

    var marker = event.target && event.target.closest ? event.target.closest(".timeline-mobile-marker") : null;
    if (!marker) return;

    var card = marker.closest(".timeline-event[data-event-id]");
    if (!card) return;

    event.preventDefault();
    event.stopPropagation();
    card.click();
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
    if (document.getElementById(STYLE_ID)) return;

    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = "" +
      ".timeline-mobile-marker{display:none!important;}" +
      "@media (max-width: 780px) {" +
      ".timeline-reading-page .content-shell,.timeline-page,.timeline-shell,.timeline-main,.timeline-content{height:auto!important;min-height:0!important;overflow:visible!important;}" +
      ".timeline-page{display:block!important;padding-bottom:1rem!important;}" +
      ".timeline-main{display:block!important;}" +
      ".timeline-content{padding:.85rem!important;}" +
      ".timeline-content::before,.timeline-content::after,.timeline-background-stage,.timeline-axis-background{display:none!important;}" +
      ".timeline-list{--timeline-mobile-axis-gutter:5.05rem!important;--timeline-card-min:100%!important;--timeline-card-focus:100%!important;--timeline-card-gap:.9rem!important;--timeline-focus:1!important;--timeline-scale:1!important;position:relative!important;display:grid!important;grid-template-columns:minmax(0,1fr)!important;gap:var(--timeline-card-gap)!important;width:100%!important;max-width:100%!important;height:auto!important;min-height:0!important;overflow:visible!important;padding:1rem .15rem 1.5rem var(--timeline-mobile-axis-gutter)!important;scroll-snap-type:none!important;cursor:default!important;user-select:auto!important;touch-action:pan-y!important;}" +
      ".timeline-list::before{display:block!important;content:''!important;position:absolute!important;z-index:1!important;left:1.45rem!important;top:1rem!important;bottom:1.5rem!important;width:2px!important;border-radius:999px!important;background:linear-gradient(to bottom,transparent,rgba(var(--accent-strong-rgb),.42),rgba(var(--warn-rgb),.32),rgba(var(--accent-strong-rgb),.42),transparent)!important;pointer-events:none!important;}" +
      ".timeline-list::after,.timeline-event-gap{display:none!important;}" +
      ".timeline-event,.timeline-event[data-timeline-position='bottom'],.timeline-event.is-timeline-focus,.timeline-event[data-timeline-position='bottom'].is-timeline-focus,.timeline-event.is-expanded,.timeline-event[data-timeline-position='bottom'].is-expanded{--timeline-focus:1!important;--timeline-scale:1!important;--timeline-text-width:calc(100% - 1.64rem - 1.55rem)!important;--timeline-title-width:var(--timeline-text-width)!important;--timeline-summary-width:var(--timeline-text-width)!important;position:relative!important;z-index:3!important;display:grid!important;grid-template-columns:1fr!important;width:auto!important;min-width:0!important;max-width:100%!important;max-height:none!important;opacity:1!important;transform:none!important;scroll-snap-align:none!important;margin:0!important;text-align:center!important;justify-items:center!important;align-content:start!important;}" +
      ".timeline-event::after,.timeline-event[data-timeline-position='bottom']::after{display:none!important;}" +
      ".timeline-event-body{display:grid!important;justify-items:center!important;align-items:start!important;text-align:center!important;width:var(--timeline-text-width)!important;min-width:0!important;max-width:var(--timeline-text-width)!important;padding-right:0!important;margin-inline:auto!important;}" +
      ".timeline-event-title,.timeline-event-summary,.timeline-event-date-line,.timeline-event-details,.timeline-event-details__section,.timeline-event-details__title,.timeline-event-details__text,.timeline-markdown-content{text-align:center!important;justify-content:center!important;justify-items:center!important;}" +
      ".timeline-event-title{display:flex!important;justify-content:center!important;align-items:center!important;white-space:normal!important;text-wrap:balance!important;}" +
      ".timeline-event-title::after{display:none!important;}" +
      ".timeline-event-summary,.timeline-event-date-line,.timeline-event-meta,.timeline-event.is-expanded .timeline-event-meta,.timeline-event-characters{justify-content:center!important;align-items:center!important;text-align:center!important;margin-inline:auto!important;}" +
      ".timeline-chip,.timeline-badge{text-align:center!important;}" +
      ".timeline-event.is-expanded .timeline-event-details{max-height:none!important;overflow:visible!important;}" +
      ".timeline-event.is-expanded .timeline-event-meta{max-height:none!important;}" +
      ".timeline-mobile-marker{position:absolute!important;z-index:8!important;left:calc(var(--timeline-mobile-axis-gutter) * -1 + .18rem)!important;top:0!important;bottom:0!important;width:4.35rem!important;display:block!important;pointer-events:auto!important;}" +
      ".timeline-mobile-marker::before{content:''!important;position:absolute!important;z-index:-1!important;left:2.08rem!important;top:1.85rem!important;width:calc(var(--timeline-mobile-axis-gutter) - 3.75rem)!important;height:1px!important;background:linear-gradient(to right,rgba(var(--event-rgb),.72),rgba(var(--event-rgb),.08))!important;transform:translateX(1.1rem)!important;}" +
      ".timeline-mobile-marker__icon{position:absolute!important;left:.65rem!important;top:.74rem!important;width:2.25rem!important;height:2.25rem!important;display:grid!important;place-items:center!important;border:1px solid rgba(var(--event-strong-rgb),.74)!important;border-radius:999px!important;background:rgba(var(--surface-rgb),.98)!important;color:rgb(var(--event-strong-rgb))!important;box-shadow:0 0 0 4px rgba(var(--surface-strong-rgb),.92),0 0 15px rgba(var(--event-rgb),.2)!important;}" +
      ".timeline-mobile-marker__icon i{font-size:.95rem!important;line-height:1!important;}" +
      ".timeline-mobile-marker__date{position:absolute!important;left:calc(var(--timeline-mobile-axis-gutter) - 1.28rem)!important;top:50%!important;max-width:none!important;writing-mode:vertical-rl!important;transform:translateY(-50%) rotate(180deg)!important;transform-origin:center!important;color:rgba(var(--text-rgb),.64)!important;font-size:.58rem!important;font-weight:900!important;line-height:1!important;letter-spacing:.08em!important;text-align:center!important;text-transform:uppercase!important;white-space:nowrap!important;pointer-events:none!important;}" +
      ".timeline-mobile-marker__year{position:absolute!important;left:.2rem!important;top:-.72rem!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;min-height:1.12rem!important;margin-bottom:0!important;border:1px solid rgba(var(--text-rgb),.14)!important;border-radius:999px!important;background:rgba(var(--surface-rgb),.98)!important;color:rgba(var(--text-rgb),.52)!important;font-family:var(--font-title)!important;font-size:.68rem!important;letter-spacing:.06em!important;line-height:1!important;padding:.12rem .34rem!important;white-space:nowrap!important;box-shadow:0 0 0 2px rgba(var(--surface-strong-rgb),.68)!important;}" +
      "}" +
      "@media (max-width: 560px) {" +
      ".timeline-list{--timeline-mobile-axis-gutter:4.62rem!important;padding-left:var(--timeline-mobile-axis-gutter)!important;}" +
      ".timeline-list::before{left:1.28rem!important;}" +
      ".timeline-mobile-marker{width:4rem!important;left:calc(var(--timeline-mobile-axis-gutter) * -1 + .08rem)!important;}" +
      ".timeline-mobile-marker::before{left:1.94rem!important;width:calc(var(--timeline-mobile-axis-gutter) - 3.42rem)!important;transform:translateX(1rem)!important;}" +
      ".timeline-mobile-marker__icon{left:.56rem!important;width:2.05rem!important;height:2.05rem!important;}" +
      ".timeline-mobile-marker__icon i{font-size:.84rem!important;}" +
      ".timeline-mobile-marker__date{left:calc(var(--timeline-mobile-axis-gutter) - 1.18rem)!important;top:50%!important;font-size:.54rem!important;}" +
      ".timeline-mobile-marker__year{font-size:.62rem!important;}" +
      "}";

    document.head.appendChild(style);
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
