(function () {
  const grid = document.querySelector("[data-blog-grid]");
  if (!grid) return;

  const limit = Number(grid.getAttribute("data-limit")) || 0;

  function escapeHtml(str) {
    return String(str || "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[c]);
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function renderCard(post) {
    return `
      <article class="post-card reveal">
        <span class="date">${formatDate(post.createdAt)}</span>
        <h3>${escapeHtml(post.title)}</h3>
        <p>${escapeHtml(post.excerpt)}</p>
        <a class="read-more" href="/blog/${encodeURIComponent(post.slug)}">
          Read post
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        </a>
      </article>`;
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

  async function loadPosts() {
    try {
      const res = await fetch("/api/blog");
      if (!res.ok) throw new Error("Failed to load posts");
      let posts = await res.json();
      if (limit) posts = posts.slice(0, limit);
      if (!posts.length) {
        grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">No posts published yet — check back soon.</div>`;
        return;
      }
      grid.innerHTML = posts.map(renderCard).join("");
      observeReveals();
    } catch (err) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">Couldn't load posts right now. Please refresh the page.</div>`;
    }
  }

  loadPosts();
})();
