(function () {
  const loginView = document.querySelector('[data-view="login"]');
  const dashView = document.querySelector('[data-view="dashboard"]');
  const loginForm = document.querySelector("[data-login-form]");
  const loginStatus = document.querySelector("[data-login-status]");

  function escapeHtml(str) {
    return String(str || "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[c]);
  }

  async function api(path, options = {}) {
    const res = await fetch(path, {
      credentials: "include",
      headers: options.body instanceof FormData ? {} : { "Content-Type": "application/json" },
      ...options,
    });
    let data = null;
    try {
      data = await res.json();
    } catch (e) {
      /* no body */
    }
    if (!res.ok) {
      throw new Error((data && data.error) || `Request failed (${res.status})`);
    }
    return data;
  }

  // ============================================================
  // AUTH
  // ============================================================
  async function checkSession() {
    try {
      const me = await api("/api/auth/me");
      showDashboard(me.email);
    } catch (err) {
      showLogin();
    }
  }

  function showLogin() {
    loginView.hidden = false;
    dashView.hidden = true;
  }

  async function showDashboard(email) {
    loginView.hidden = true;
    dashView.hidden = false;
    document.querySelector("[data-signed-in-as]").textContent = `signed in as ${email}`;
    await Promise.all([loadProjects(), loadPosts(), loadMessages(), loadSettings()]);
  }

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginStatus.textContent = "";
    loginStatus.className = "form-status";
    const formData = new FormData(loginForm);
    try {
      const data = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(formData.entries())),
      });
      showDashboard(data.email);
    } catch (err) {
      loginStatus.textContent = err.message;
      loginStatus.className = "form-status error";
    }
  });

  document.querySelector("[data-logout]").addEventListener("click", async () => {
    await api("/api/auth/logout", { method: "POST" });
    showLogin();
  });

  // ============================================================
  // TAB NAVIGATION
  // ============================================================
  const tabTitles = { projects: "Projects", blog: "Blog", messages: "Messages", settings: "Settings" };
  document.querySelectorAll("[data-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-tab]").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const tab = btn.getAttribute("data-tab");
      document.querySelectorAll("[data-panel]").forEach((p) => (p.hidden = p.getAttribute("data-panel") !== tab));
      document.querySelector("[data-tab-title]").textContent = tabTitles[tab];
      document.querySelector("[data-add-btn]").hidden = tab === "messages" || tab === "settings";
      document.querySelector("[data-add-btn]").textContent = tab === "blog" ? "+ New post" : "+ New project";
      document.querySelector("[data-add-btn]").setAttribute("data-add-for", tab);
    });
  });

  document.querySelector("[data-add-btn]").addEventListener("click", () => {
    const tab = document.querySelector("[data-add-btn]").getAttribute("data-add-for") || "projects";
    if (tab === "blog") openPostModal();
    else openProjectModal();
  });

  document.querySelectorAll("[data-close-modal]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".modal-backdrop").forEach((m) => (m.hidden = true));
    });
  });

  // ============================================================
  // PROJECTS
  // ============================================================
  const projectsTbody = document.querySelector("[data-projects-tbody]");
  const projectModal = document.querySelector("[data-project-modal]");
  const projectForm = document.querySelector("[data-project-form]");
  let editingProjectId = null;

  async function loadProjects() {
    const projects = await api("/api/projects");
    projects.sort((a, b) => (a.order || 0) - (b.order || 0));
    if (!projects.length) {
      projectsTbody.innerHTML = `<tr><td colspan="6"><div class="empty-state">No projects yet. Add your first one.</div></td></tr>`;
      return;
    }
    projectsTbody.innerHTML = projects
      .map(
        (p) => `
      <tr>
        <td><img class="row-thumb" src="${escapeHtml(p.image || "/images/project-portfolio.png")}" alt=""></td>
        <td>${escapeHtml(p.title)}</td>
        <td>${escapeHtml(p.category || "—")}</td>
        <td>${(p.tags || []).map((t) => `<span class="tag-pill">${escapeHtml(t)}</span>`).join("")}</td>
        <td>${p.featured ? "★" : ""}</td>
        <td>
          <div class="row-actions">
            <button class="icon-btn" data-edit-project="${p.id}" title="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z"/></svg></button>
            <button class="icon-btn danger" data-delete-project="${p.id}" title="Delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
          </div>
        </td>
      </tr>`,
      )
      .join("");

    projectsTbody.querySelectorAll("[data-edit-project]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const project = projects.find((p) => p.id === Number(btn.getAttribute("data-edit-project")));
        openProjectModal(project);
      });
    });
    projectsTbody.querySelectorAll("[data-delete-project]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("Delete this project? This can't be undone.")) return;
        await api(`/api/projects/${btn.getAttribute("data-delete-project")}`, { method: "DELETE" });
        showToast("Project deleted");
        loadProjects();
      });
    });
  }

  function openProjectModal(project) {
    editingProjectId = project ? project.id : null;
    document.querySelector("[data-project-modal-title]").textContent = project ? "Edit project" : "New project";
    projectForm.reset();
    const preview = projectForm.querySelector("[data-project-image-preview]");
    preview.hidden = true;
    if (project) {
      projectForm.title.value = project.title;
      projectForm.description.value = project.description;
      projectForm.category.value = project.category || "";
      projectForm.tags.value = (project.tags || []).join(", ");
      projectForm.githubUrl.value = project.githubUrl || "";
      projectForm.liveUrl.value = project.liveUrl || "";
      projectForm.featured.checked = Boolean(project.featured);
      projectForm.image.value = project.image || "";
      if (project.image) {
        preview.src = project.image;
        preview.hidden = false;
      }
    }
    projectModal.hidden = false;
  }

  projectForm.querySelector("[data-project-image-input]").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("image", file);
    try {
      const data = await api("/api/upload/image", { method: "POST", body: fd });
      projectForm.image.value = data.url;
      const preview = projectForm.querySelector("[data-project-image-preview]");
      preview.src = data.url;
      preview.hidden = false;
    } catch (err) {
      showToast(err.message);
    }
  });

  projectForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(projectForm);
    const payload = {
      title: fd.get("title"),
      description: fd.get("description"),
      category: fd.get("category"),
      tags: fd.get("tags"),
      githubUrl: fd.get("githubUrl"),
      liveUrl: fd.get("liveUrl"),
      image: fd.get("image"),
      featured: fd.get("featured") === "on",
    };
    try {
      if (editingProjectId) {
        await api(`/api/projects/${editingProjectId}`, { method: "PUT", body: JSON.stringify(payload) });
        showToast("Project updated");
      } else {
        await api("/api/projects", { method: "POST", body: JSON.stringify(payload) });
        showToast("Project created");
      }
      projectModal.hidden = true;
      loadProjects();
    } catch (err) {
      showToast(err.message);
    }
  });

  // ============================================================
  // BLOG
  // ============================================================
  const postsTbody = document.querySelector("[data-posts-tbody]");
  const postModal = document.querySelector("[data-post-modal]");
  const postForm = document.querySelector("[data-post-form]");
  let editingPostId = null;

  async function loadPosts() {
    const posts = await api("/api/blog/all");
    posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    document.querySelector('[data-count="blog"]').textContent = posts.length || "";
    if (!posts.length) {
      postsTbody.innerHTML = `<tr><td colspan="4"><div class="empty-state">No posts yet. Write your first one.</div></td></tr>`;
      return;
    }
    postsTbody.innerHTML = posts
      .map(
        (p) => `
      <tr>
        <td>${escapeHtml(p.title)}</td>
        <td><span class="status-pill ${p.published ? "published" : "draft"}">${p.published ? "Published" : "Draft"}</span></td>
        <td class="mono">${new Date(p.createdAt).toLocaleDateString()}</td>
        <td>
          <div class="row-actions">
            <button class="icon-btn" data-edit-post="${p.id}" title="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z"/></svg></button>
            <button class="icon-btn danger" data-delete-post="${p.id}" title="Delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
          </div>
        </td>
      </tr>`,
      )
      .join("");

    postsTbody.querySelectorAll("[data-edit-post]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const post = posts.find((p) => p.id === Number(btn.getAttribute("data-edit-post")));
        openPostModal(post);
      });
    });
    postsTbody.querySelectorAll("[data-delete-post]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("Delete this post? This can't be undone.")) return;
        await api(`/api/blog/${btn.getAttribute("data-delete-post")}`, { method: "DELETE" });
        showToast("Post deleted");
        loadPosts();
      });
    });
  }

  function openPostModal(post) {
    editingPostId = post ? post.id : null;
    document.querySelector("[data-post-modal-title]").textContent = post ? "Edit post" : "New post";
    postForm.reset();
    const preview = postForm.querySelector("[data-post-image-preview]");
    preview.hidden = true;
    if (post) {
      postForm.title.value = post.title;
      postForm.excerpt.value = post.excerpt || "";
      postForm.content.value = post.content;
      postForm.published.checked = Boolean(post.published);
      postForm.coverImage.value = post.coverImage || "";
      if (post.coverImage) {
        preview.src = post.coverImage;
        preview.hidden = false;
      }
    } else {
      postForm.published.checked = true;
    }
    postModal.hidden = false;
  }

  postForm.querySelector("[data-post-image-input]").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("image", file);
    try {
      const data = await api("/api/upload/image", { method: "POST", body: fd });
      postForm.coverImage.value = data.url;
      const preview = postForm.querySelector("[data-post-image-preview]");
      preview.src = data.url;
      preview.hidden = false;
    } catch (err) {
      showToast(err.message);
    }
  });

  postForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(postForm);
    const payload = {
      title: fd.get("title"),
      excerpt: fd.get("excerpt"),
      content: fd.get("content"),
      coverImage: fd.get("coverImage"),
      published: fd.get("published") === "on",
    };
    try {
      if (editingPostId) {
        await api(`/api/blog/${editingPostId}`, { method: "PUT", body: JSON.stringify(payload) });
        showToast("Post updated");
      } else {
        await api("/api/blog", { method: "POST", body: JSON.stringify(payload) });
        showToast("Post created");
      }
      postModal.hidden = true;
      loadPosts();
    } catch (err) {
      showToast(err.message);
    }
  });

  // ============================================================
  // MESSAGES
  // ============================================================
  const messagesList = document.querySelector("[data-messages-list]");

  async function loadMessages() {
    const messages = await api("/api/messages");
    document.querySelector('[data-count="messages"]').textContent =
      messages.filter((m) => !m.read).length || "";
    if (!messages.length) {
      messagesList.innerHTML = `<div class="empty-state">No messages yet — they'll show up here as soon as someone uses your contact form.</div>`;
      return;
    }
    messagesList.innerHTML = messages
      .map(
        (m) => `
      <div class="message-card ${m.read ? "" : "unread"}">
        <div class="message-card-head">
          <span class="who">${escapeHtml(m.name)}<a href="mailto:${escapeHtml(m.email)}">${escapeHtml(m.email)}</a></span>
          <span class="when mono">${new Date(m.createdAt).toLocaleString()}</span>
        </div>
        <p>${escapeHtml(m.message)}</p>
        <div class="message-card-actions">
          ${!m.read ? `<button class="btn btn-outline btn-sm" data-mark-read="${m.id}">Mark as read</button>` : ""}
          <button class="btn btn-outline btn-sm" data-delete-message="${m.id}">Delete</button>
        </div>
      </div>`,
      )
      .join("");

    messagesList.querySelectorAll("[data-mark-read]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await api(`/api/messages/${btn.getAttribute("data-mark-read")}/read`, { method: "PATCH" });
        loadMessages();
      });
    });
    messagesList.querySelectorAll("[data-delete-message]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("Delete this message?")) return;
        await api(`/api/messages/${btn.getAttribute("data-delete-message")}`, { method: "DELETE" });
        showToast("Message deleted");
        loadMessages();
      });
    });
  }

  // ============================================================
  // SETTINGS
  // ============================================================
  async function loadSettings() {
    const settings = await api("/api/settings");
    document.querySelector("[data-cv-current]").textContent = settings.cvFile
      ? `Current file: ${settings.cvFile}`
      : "No CV uploaded yet";
  }

  document.querySelector("[data-cv-input]").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("cv", file);
    try {
      await api("/api/upload/cv", { method: "POST", body: fd });
      showToast("CV uploaded");
      loadSettings();
    } catch (err) {
      showToast(err.message);
    }
  });

  checkSession();
})();
