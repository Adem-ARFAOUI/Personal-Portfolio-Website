(function () {
  const grid = document.querySelector("[data-projects-grid]");
  const filterRow = document.querySelector("[data-projects-filter]");
  if (!grid) return;

  const ICONS = {
    github: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5C5.73.5.5 5.73.5 12c0 5.09 3.29 9.4 7.86 10.93.58.1.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.24 3.34.95.1-.74.4-1.24.72-1.53-2.56-.29-5.26-1.28-5.26-5.7 0-1.26.45-2.29 1.18-3.09-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.58.24 2.75.12 3.04.74.8 1.18 1.83 1.18 3.09 0 4.43-2.71 5.4-5.29 5.68.42.36.78 1.08.78 2.18 0 1.57-.01 2.84-.01 3.23 0 .31.21.67.8.56A10.52 10.52 0 0 0 23.5 12c0-6.27-5.23-11.5-11.5-11.5Z"/></svg>`,
    external: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14 21 3"/></svg>`,
  };

  function escapeHtml(str) {
    return String(str || "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  }

  function renderCard(p) {
    const links = [];
    if (p.githubUrl)
      links.push(
        `<a href="${escapeHtml(p.githubUrl)}" target="_blank" rel="noopener">${ICONS.github}Code</a>`,
      );
    if (p.liveUrl)
      links.push(
        `<a href="${escapeHtml(p.liveUrl)}" target="_blank" rel="noopener">${ICONS.external}Live demo</a>`,
      );

    return `
      <article class="project-card reveal">
        <div class="project-thumb">
          ${p.featured ? '<span class="featured-badge">Featured</span>' : ""}
          <img src="${escapeHtml(p.image || "/images/project-portfolio.png")}" alt="${escapeHtml(p.title)} preview" loading="lazy">
        </div>
        <div class="project-body">
          <span class="cat">${escapeHtml(p.category || "Project")}</span>
          <h3>${escapeHtml(p.title)}</h3>
          <p>${escapeHtml(p.description)}</p>
          <div class="project-tags">
            ${(p.tags || []).map((t) => `<span>${escapeHtml(t)}</span>`).join("")}
          </div>
          ${links.length ? `<div class="project-cta-row">${links.join("")}</div>` : ""}
        </div>
      </article>`;
  }

  function renderSkeletons(n) {
    grid.innerHTML = Array.from({ length: n })
      .map(
        () => `
        <div class="project-card">
          <div class="skeleton" style="aspect-ratio:16/10;border-radius:0;"></div>
          <div class="project-body">
            <div class="skeleton" style="width:60%;height:12px;"></div>
            <div class="skeleton" style="width:80%;height:18px;"></div>
            <div class="skeleton" style="width:100%;height:40px;"></div>
          </div>
        </div>`,
      )
      .join("");
  }

  function observeReveals() {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.1 },
    );
    grid.querySelectorAll(".reveal").forEach((el) => io.observe(el));
  }

  let allProjects = [];
  let activeFilter = "All";

  function renderFilters() {
    if (!filterRow) return;
    const tags = new Set();
    allProjects.forEach((p) => (p.tags || []).forEach((t) => tags.add(t)));
    const filters = ["All", ...Array.from(tags).sort()];
    filterRow.innerHTML = filters
      .map(
        (f) =>
          `<button type="button" class="chip${f === activeFilter ? " active" : ""}" data-filter="${escapeHtml(f)}"><span class="dot"></span>${escapeHtml(f)}</button>`,
      )
      .join("");
    filterRow.querySelectorAll("[data-filter]").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeFilter = btn.getAttribute("data-filter");
        renderFilters();
        applyFilter();
      });
    });
  }

  function applyFilter() {
    const list =
      activeFilter === "All"
        ? allProjects
        : allProjects.filter((p) => (p.tags || []).includes(activeFilter));
    if (!list.length) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">No projects match this filter yet.</div>`;
      return;
    }
    grid.innerHTML = list.map(renderCard).join("");
    observeReveals();
  }

  async function loadProjects() {
    renderSkeletons(3);
    try {
      const res = await fetch("/api/projects");
      if (!res.ok) throw new Error("Failed to load projects");
      allProjects = await res.json();
      allProjects.sort((a, b) => (a.order || 0) - (b.order || 0));
      renderFilters();
      applyFilter();
    } catch (err) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">Couldn't load projects right now. Please refresh the page.</div>`;
    }
  }

  loadProjects();
})();
