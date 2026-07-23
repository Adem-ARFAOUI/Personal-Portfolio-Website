(function () {
  const container = document.querySelector("[data-post-page]");
  if (!container) return;

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
      month: "long",
      day: "numeric",
    });
  }

  const slug = decodeURIComponent(window.location.pathname.split("/blog/")[1] || "");

  async function loadPost() {
    if (!slug) {
      container.innerHTML = `<div class="empty-state">No post specified.</div>`;
      return;
    }
    try {
      const res = await fetch(`/api/blog/${encodeURIComponent(slug)}`);
      if (!res.ok) throw new Error("not found");
      const post = await res.json();
      document.title = `${post.title} — Blog`;
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute("content", post.excerpt || "");

      container.innerHTML = `
        <div class="post-header reveal is-visible">
          <span class="date mono">${formatDate(post.createdAt)}</span>
          <h1>${escapeHtml(post.title)}</h1>
        </div>
        ${post.coverImage ? `<div class="post-cover reveal is-visible"><img src="${escapeHtml(post.coverImage)}" alt="${escapeHtml(post.title)}"></div>` : ""}
        <div class="post-content reveal is-visible">${post.content}</div>
      `;
    } catch (err) {
      container.innerHTML = `<div class="empty-state">This post couldn't be found. <a href="/blog" style="color:var(--accent);">Back to blog</a></div>`;
    }
  }

  loadPost();
})();
