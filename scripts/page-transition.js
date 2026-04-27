window.addEventListener("pageshow", () => {
  document.body.classList.remove("is-page-leaving");
  requestAnimationFrame(() => {
    document.body.classList.add("is-page-ready");
  });
});

document.addEventListener("click", (event) => {
  const link = event.target.closest("a[href]");
  if (!link) return;

  const href = link.getAttribute("href");
  if (!href) return;

  const isModifiedClick =
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    event.button !== 0;

  const isExternal = link.origin !== window.location.origin;
  const isAnchorOnly = href.startsWith("#");
  const isNewTab = link.target === "_blank";
  const isDownload = link.hasAttribute("download");
  const isDocTreeLink = link.hasAttribute("data-doc-link");

  if (
    isModifiedClick ||
    isExternal ||
    isAnchorOnly ||
    isNewTab ||
    isDownload ||
    isDocTreeLink
  ) {
    return;
  }

  event.preventDefault();

  document.body.classList.add("is-page-leaving");

  setTimeout(() => {
    window.location.href = link.href;
  }, 160);
});
