(function () {
  const links = document.querySelectorAll("[data-cv-link]");
  if (!links.length) return;

  fetch("/api/settings")
    .then((res) => res.json())
    .then((settings) => {
      if (settings.cvFile) {
        links.forEach((el) => {
          el.setAttribute("href", settings.cvFile);
          el.removeAttribute("aria-disabled");
        });
      } else {
        links.forEach((el) => {
          el.setAttribute("href", "#contact");
          el.setAttribute("title", "CV coming soon — get in touch instead");
        });
      }
    })
    .catch(() => {});
})();
