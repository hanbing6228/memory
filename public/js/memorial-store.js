/** localStorage 持久化（MVP：单设备演示，后续接 API） */
window.MemorialStore = {
  KEY: "nianguichu_memorial_v1",
  DEFAULT_SLUG: "li-mingde",

  defaultMemorial() {
    return {
      slug: this.DEFAULT_SLUG,
      name: "李明德",
      birthDate: "1938-04-03",
      deathDate: "2023-11-18",
      motto: "春蚕到死丝尽，蜡炬成灰泪始干",
      privacy: "family",
      quietMode: true,
      rituals: [],
      fragments: [],
      reminders: [],
      tributeCounts: { 蜡烛: 3247, 鲜花: 2186, 焚香: 1840, 贡品: 967, 心语: 4520 },
    };
  },

  loadAll() {
    try {
      const raw = localStorage.getItem(this.KEY);
      if (!raw) return { memorials: { [this.DEFAULT_SLUG]: this.defaultMemorial() } };
      const data = JSON.parse(raw);
      if (!data.memorials) data.memorials = {};
      if (!data.memorials[this.DEFAULT_SLUG]) {
        data.memorials[this.DEFAULT_SLUG] = this.defaultMemorial();
      }
      return data;
    } catch {
      return { memorials: { [this.DEFAULT_SLUG]: this.defaultMemorial() } };
    }
  },

  saveAll(data) {
    localStorage.setItem(this.KEY, JSON.stringify(data));
  },

  get(slug = this.DEFAULT_SLUG) {
    const data = this.loadAll();
    return data.memorials[slug] || null;
  },

  update(slug, patch) {
    const data = this.loadAll();
    data.memorials[slug] = { ...(data.memorials[slug] || this.defaultMemorial()), ...patch, slug };
    this.saveAll(data);
    return data.memorials[slug];
  },

  addRitual(slug, { type, message, author }) {
    const m = this.get(slug);
    if (!m) return null;
    const entry = {
      id: "r_" + Date.now(),
      type,
      message: (message || "").trim(),
      author: (author || "").trim() || "家人",
      at: new Date().toISOString(),
    };
    m.rituals = [entry, ...(m.rituals || [])];
    const key = type === "蜡烛" ? "蜡烛" : type === "鲜花" ? "鲜花" : type === "焚香" ? "焚香" : type === "贡品" ? "贡品" : "心语";
    m.tributeCounts = m.tributeCounts || {};
    m.tributeCounts[key] = (m.tributeCounts[key] || 0) + 1;
    this.update(slug, m);
    return entry;
  },

  addFragment(slug, { content, relation, year, author }) {
    const m = this.get(slug);
    if (!m) return null;
    const entry = {
      id: "f_" + Date.now(),
      content: (content || "").trim(),
      relation: (relation || "").trim(),
      year: (year || "").trim(),
      author: (author || "").trim() || "家人",
      status: "pending",
      at: new Date().toISOString(),
    };
    m.fragments = [entry, ...(m.fragments || [])];
    this.update(slug, m);
    return entry;
  },

  approveFragment(slug, id) {
    const m = this.get(slug);
    if (!m) return;
    m.fragments = (m.fragments || []).map((f) =>
      f.id === id ? { ...f, status: "approved" } : f
    );
    this.update(slug, m);
  },

  addReminder(slug, email) {
    const m = this.get(slug);
    if (!m) return;
    const e = (email || "").trim();
    if (!e || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return false;
    if ((m.reminders || []).some((r) => r.email === e)) return true;
    m.reminders = [{ email: e, at: new Date().toISOString() }, ...(m.reminders || [])];
    this.update(slug, m);
    return true;
  },

  createMemorial({ name, birthDate, deathDate, motto, privacy, quietMode }) {
    const slug =
      "m_" +
      Date.now().toString(36) +
      "_" +
      (name || "memorial").replace(/\s+/g, "").slice(0, 8);
    const memorial = {
      slug,
      name: name || "未命名",
      birthDate: birthDate || "",
      deathDate: deathDate || "",
      motto: motto || "",
      privacy: privacy || "family",
      quietMode: quietMode !== false,
      rituals: [],
      fragments: [],
      reminders: [],
      tributeCounts: {},
    };
    const data = this.loadAll();
    data.memorials[slug] = memorial;
    this.saveAll(data);
    return memorial;
  },

  escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  },
};
