/** P0 情感交互：隐私场域、追思节律、记忆共创、祭奠心意 */
window.MemorialCore = {
  slug: MemorialStore.DEFAULT_SLUG,
  pendingRitualType: "蜡烛",
  useApi: false,
  _schedule: null,

  async init() {
    this.applyWelcomeCopy();
    this.bindCreateNav();
    if (window.MemorialApi) {
      const status = await MemorialApi.health();
      this.useApi = !!(status && status.database);
    }
    if (this.useApi) await this.hydrateFromApi();
    const m = MemorialStore.get(this.slug);
    if (m) {
      this.applyQuietMode(m.quietMode);
      this.renderPrivacyBar(m);
      this.renderAnniversaryTab(m);
      this.renderMemoryTab(m);
      this.renderCoMemorialTab(m);
      this.syncTributeCounts(m);
    }
  },

  async hydrateFromApi() {
    try {
      const data = await MemorialApi.getMemorial(this.slug);
      const mem = data.memorial;
      this._schedule = data.schedule;
      MemorialStore.update(this.slug, {
        name: mem.name,
        birthDate: mem.birthDate,
        deathDate: mem.deathDate,
        motto: mem.motto,
        privacy: mem.privacy,
        quietMode: mem.quietMode,
        tributeCounts: mem.tributeCounts || {},
        rituals: (mem.rituals || []).map((r) => ({
          id: r.id,
          type: r.type,
          message: r.message,
          author: r.author,
          at: r.at,
        })),
        fragments: (mem.fragments || []).map((f) => ({
          id: f.id,
          content: f.content,
          relation: f.relation,
          year: f.year,
          author: f.author,
          status: f.status,
          at: f.at,
        })),
        reminders: (mem.reminders || []).map((r) => ({ email: r.email, at: r.at })),
      });
    } catch (e) {
      console.warn("API hydrate skipped:", e.message);
      this.useApi = false;
    }
  },

  async loadMemorial(slug) {
    this.slug = slug;
    if (this.useApi) await this.hydrateFromApi();
    const m = MemorialStore.get(slug);
    if (m) {
      this.applyQuietMode(m.quietMode);
      this.renderPrivacyBar(m);
      this.renderAnniversaryTab(m);
      this.renderMemoryTab(m);
      this.renderCoMemorialTab(m);
      this.syncTributeCounts(m);
    }
  },

  applyWelcomeCopy() {
    const c = MEMORIAL_COPY.welcome;
    const badge = document.querySelector(".hero-badge");
    const tagline = document.querySelector(".hero-tagline");
    const search = document.getElementById("searchInput");
    const searchBtn = document.querySelector(".hero-search-btn");
    if (badge) badge.textContent = "✦ " + c.badge + " ✦";
    if (tagline) tagline.innerHTML = c.tagline + "<br><span style=\"font-size:13px;opacity:.75\">" + c.taglineHint + "</span>";
    if (search) search.placeholder = c.searchPlaceholder;
    if (searchBtn) searchBtn.textContent = c.searchBtn;
    const navBtn = document.querySelector(".nav-btn");
    if (navBtn) {
      navBtn.textContent = c.createCta;
      navBtn.onclick = () => this.goCreate();
    }
  },

  bindCreateNav() {
    document.querySelectorAll('[data-action="create-memorial"]').forEach((el) => {
      el.onclick = () => this.goCreate();
    });
  },

  goCreate() {
    if (typeof goPage === "function") goPage("create");
    else location.hash = "create";
  },

  getMemorialPage() {
    return document.getElementById("page-profile-li");
  },

  applyQuietMode(on) {
    document.body.classList.toggle("quiet-mode", !!on);
    const shopTab = document.querySelector('#page-profile-li .profile-tab[onclick*="tab-shop-li"]');
    if (shopTab) shopTab.style.display = on ? "none" : "";
    const cartFab = document.getElementById("cart-fab");
    if (cartFab) cartFab.style.display = on ? "none" : "";
  },

  async toggleQuiet() {
    const m = MemorialStore.get(this.slug);
    const next = !m.quietMode;
    if (this.useApi) {
      try {
        await MemorialApi.patchMemorial(this.slug, { quietMode: next });
      } catch (e) {
        showToast(e.message);
        return;
      }
    }
    MemorialStore.update(this.slug, { quietMode: next });
    this.applyQuietMode(next);
    showToast(next ? MEMORIAL_COPY.privacy.quietOn : MEMORIAL_COPY.privacy.quietOff);
  },

  async setPrivacy(level) {
    if (this.useApi) {
      try {
        await MemorialApi.patchMemorial(this.slug, { privacy: level });
      } catch (e) {
        showToast(e.message);
        return;
      }
    }
    MemorialStore.update(this.slug, { privacy: level });
    this.renderPrivacyBar(MemorialStore.get(this.slug));
    const labels = MEMORIAL_COPY.privacy;
    showToast("可见范围：" + (labels[level] || level));
  },

  renderPrivacyBar(m) {
    const page = this.getMemorialPage();
    if (!page) return;
    let bar = page.querySelector(".memorial-privacy-bar");
    if (!bar) {
      bar = document.createElement("div");
      bar.className = "memorial-privacy-bar";
      const tabs = page.querySelector(".profile-tabs");
      if (tabs) tabs.before(bar);
    }
    const p = MEMORIAL_COPY.privacy;
    bar.innerHTML = `
      <div class="privacy-chips">
        <button type="button" class="privacy-chip ${m.privacy === "private" ? "active" : ""}" onclick="MemorialCore.setPrivacy('private')">${p.private}</button>
        <button type="button" class="privacy-chip ${m.privacy === "family" ? "active" : ""}" onclick="MemorialCore.setPrivacy('family')">${p.family}</button>
        <button type="button" class="privacy-chip ${m.privacy === "public" ? "active" : ""}" onclick="MemorialCore.setPrivacy('public')">${p.public}</button>
      </div>
      <button type="button" class="quiet-toggle ${m.quietMode ? "on" : ""}" onclick="MemorialCore.toggleQuiet()" title="${p.quiet}">
        ${m.quietMode ? "🌙 " + p.quiet : "☀️ " + p.quiet}
      </button>
    `;
  },

  renderAnniversaryTab(m) {
    const el = document.getElementById("tab-anniversary-li");
    if (!el) return;
    const c = MEMORIAL_COPY.anniversary;
    const schedule =
      this._schedule ||
      MemorialDates.buildSchedule({
        birthDate: m.birthDate,
        deathDate: m.deathDate,
      });
    const list = schedule
      .map(
        (it) => `
      <div class="anniversary-card ${it.isPast ? "past" : ""}">
        <div class="anniversary-label">${c.labels[it.labelKey] || it.label}</div>
        <div class="anniversary-date">${MemorialStore.escapeHtml(it.dateStr)}</div>
        <div class="anniversary-note">${MemorialStore.escapeHtml(it.note)}</div>
        ${
          !it.isPast && it.daysUntil >= 0
            ? `<div class="anniversary-countdown">${it.daysUntil === 0 ? "今日" : "还有 " + it.daysUntil + " 天"}</div>`
            : ""
        }
      </div>`
      )
      .join("");

    const subs = (m.reminders || [])
      .map((r) => `<li>${MemorialStore.escapeHtml(r.email)}</li>`)
      .join("");

    el.innerHTML = `
      <p class="p0-intro">${c.intro}</p>
      <div class="anniversary-grid">${list}</div>
      <div class="reminder-box">
        <h4>${c.subscribe}</h4>
        <div class="form-row">
          <input type="email" id="reminder-email" placeholder="${c.emailPlaceholder}" />
          <button type="button" class="submit-btn" onclick="MemorialCore.subscribeReminder()">订阅</button>
        </div>
        ${subs ? `<ul class="reminder-list">${subs}</ul>` : ""}
      </div>
    `;
  },

  async subscribeReminder() {
    const input = document.getElementById("reminder-email");
    const email = input?.value?.trim();
    if (!email) {
      showToast("请填写邮箱");
      return;
    }
    if (this.useApi) {
      try {
        await MemorialApi.subscribeReminder(this.slug, email);
        showToast(MEMORIAL_COPY.anniversary.subscribed);
        if (input) input.value = "";
        await this.hydrateFromApi();
        this.renderAnniversaryTab(MemorialStore.get(this.slug));
        return;
      } catch (e) {
        showToast(e.message);
        return;
      }
    }
    const ok = MemorialStore.addReminder(this.slug, email);
    if (ok) {
      showToast(MEMORIAL_COPY.anniversary.subscribed);
      if (input) input.value = "";
      this.renderAnniversaryTab(MemorialStore.get(this.slug));
    } else {
      showToast("请填写有效邮箱");
    }
  },

  renderMemoryTab(m) {
    const el = document.getElementById("tab-memory-li");
    if (!el) return;
    const c = MEMORIAL_COPY.memory;
    const fragments = m.fragments || [];

    const list = fragments.length
      ? fragments
          .map(
            (f) => `
        <div class="memory-card status-${f.status}">
          <div class="memory-meta">${MemorialStore.escapeHtml(f.relation || "亲友")} · ${MemorialStore.escapeHtml(f.year || "")} · ${MemorialStore.escapeHtml(f.author)}</div>
          <p>${MemorialStore.escapeHtml(f.content)}</p>
          <div class="memory-status">${f.status === "approved" ? c.approved : c.pending}</div>
          ${
            f.status === "pending"
              ? `<button type="button" class="memory-approve-btn" onclick="MemorialCore.approveFragment('${f.id}')">家人确认并入</button>`
              : ""
          }
        </div>`
          )
          .join("")
      : `<p class="p0-empty">${c.invite}</p>`;

    el.innerHTML = `
      <p class="p0-intro">${c.invite}<br><span class="p0-hint">${c.voiceHint}</span></p>
      <div class="memory-form guestbook-form">
        <textarea id="frag-content" rows="3" placeholder="${c.contentPlaceholder}"></textarea>
        <div class="form-row">
          <input type="text" id="frag-relation" placeholder="${c.relationPlaceholder}" />
          <input type="text" id="frag-year" placeholder="${c.yearPlaceholder}" />
        </div>
        <div class="form-row">
          <input type="text" id="frag-author" placeholder="您的称呼（可选）" />
          <button type="button" class="submit-btn" onclick="MemorialCore.submitFragment()">${c.submit}</button>
        </div>
      </div>
      <div class="memory-list">${list}</div>
    `;
  },

  async submitFragment() {
    const content = document.getElementById("frag-content")?.value;
    if (!content?.trim()) {
      showToast("请写下一点记忆");
      return;
    }
    const payload = {
      content,
      relation: document.getElementById("frag-relation")?.value,
      year: document.getElementById("frag-year")?.value,
      author: document.getElementById("frag-author")?.value,
    };
    if (this.useApi) {
      try {
        await MemorialApi.addFragment(this.slug, payload);
        showToast("已交给家族保存，待确认后展示");
        await this.hydrateFromApi();
        const m = MemorialStore.get(this.slug);
        this.renderMemoryTab(m);
        this.renderCoMemorialTab(m);
        return;
      } catch (e) {
        showToast(e.message);
        return;
      }
    }
    MemorialStore.addFragment(this.slug, payload);
    showToast("已交给家族保存，待确认后展示");
    this.renderMemoryTab(MemorialStore.get(this.slug));
    this.renderCoMemorialTab(MemorialStore.get(this.slug));
  },

  async approveFragment(id) {
    if (this.useApi) {
      try {
        await MemorialApi.approveFragment(this.slug, id);
      } catch (e) {
        showToast(e.message);
        return;
      }
    } else {
      MemorialStore.approveFragment(this.slug, id);
    }
    showToast(MEMORIAL_COPY.memory.approved);
    if (this.useApi) await this.hydrateFromApi();
    const m = MemorialStore.get(this.slug);
    this.renderMemoryTab(m);
    this.renderCoMemorialTab(m);
  },

  renderCoMemorialTab(m) {
    const el = document.getElementById("tab-comemorial-li");
    if (!el) return;
    const c = MEMORIAL_COPY.coMemorial;
    const rituals = m.rituals || [];
    if (!rituals.length) {
      el.innerHTML = `<p class="p0-intro">${c.intro}</p><p class="p0-empty">${c.empty}</p>`;
      return;
    }
    el.innerHTML =
      `<p class="p0-intro">${c.intro}</p>` +
      `<div class="comemorial-stream">` +
      rituals
        .map((r) => {
          const d = new Date(r.at);
          const when = d.toLocaleString("zh-CN", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
          return `<div class="comemorial-item">
            <div class="comemorial-time">${when}</div>
            <div class="comemorial-who">${MemorialStore.escapeHtml(r.author)} · ${MemorialStore.escapeHtml(r.type)}</div>
            ${r.message ? `<p class="comemorial-msg">「${MemorialStore.escapeHtml(r.message)}」</p>` : ""}
          </div>`;
        })
        .join("") +
      `</div>`;
  },

  syncTributeCounts(m) {
    const map = { 蜡烛: "tc1", 鲜花: "tc2", 焚香: "tc3", 贡品: "tc4", 心语: "tc5" };
    Object.entries(map).forEach(([type, id]) => {
      const el = document.getElementById(id);
      if (el && m.tributeCounts?.[type] != null) {
        el.textContent = Number(m.tributeCounts[type]).toLocaleString("zh");
      }
    });
  },

  openRitualModal(type) {
    this.pendingRitualType = type;
    const c = MEMORIAL_COPY.ritual;
    const overlay = document.getElementById("ritual-modal");
    if (!overlay) return;
    document.getElementById("ritual-modal-title").textContent = c.modalTitle + " · " + type;
    document.getElementById("ritual-modal-prompt").textContent = c.prompt;
    document.getElementById("ritual-message").value = "";
    document.getElementById("ritual-author").value = "";
    overlay.classList.add("open");
  },

  closeRitualModal() {
    document.getElementById("ritual-modal")?.classList.remove("open");
  },

  async confirmRitual() {
    const message = document.getElementById("ritual-message")?.value;
    const author = document.getElementById("ritual-author")?.value;
    const type = this.pendingRitualType;
    if (this.useApi) {
      try {
        await MemorialApi.addRitual(this.slug, { type, message, author });
        await this.hydrateFromApi();
      } catch (e) {
        showToast(e.message);
        return;
      }
    } else {
      MemorialStore.addRitual(this.slug, { type, message, author });
    }
    const m = MemorialStore.get(this.slug);
    this.syncTributeCounts(m);
    this.renderCoMemorialTab(m);
    this.closeRitualModal();
    showToast(MEMORIAL_COPY.ritual.after);
  },

  /** 创建纪念馆向导 */
  createStep: 1,

  renderCreatePage() {
    const page = document.getElementById("page-create");
    if (!page) return;
    const c = MEMORIAL_COPY.create;
    page.querySelector(".create-inner").innerHTML = `
      <h1 class="section-title">${c.title}</h1>
      <div class="create-steps">
        <span class="${this.createStep >= 1 ? "on" : ""}">1</span>
        <span class="${this.createStep >= 2 ? "on" : ""}">2</span>
        <span class="${this.createStep >= 3 ? "on" : ""}">3</span>
      </div>
      <div id="create-step-body"></div>
    `;
    const body = document.getElementById("create-step-body");
    if (this.createStep === 1) {
      body.innerHTML = `
        <div class="create-field"><label>${c.name}</label><input id="cr-name" type="text" /></div>
        <div class="create-field"><label>${c.birth}</label><input id="cr-birth" type="date" /></div>
        <div class="create-field"><label>${c.death}</label><input id="cr-death" type="date" /></div>
        <div class="create-field"><label>${c.motto}</label><input id="cr-motto" type="text" /></div>
        <button class="submit-btn" onclick="MemorialCore.createNext()">下一步</button>
      `;
    } else if (this.createStep === 2) {
      body.innerHTML = `
        <p class="p0-intro">${c.privacyLabel}</p>
        <div class="privacy-chips" style="justify-content:center;margin-bottom:20px">
          <button type="button" class="privacy-chip" data-pv="private" onclick="MemorialCore.pickPrivacy(this,'private')">${MEMORIAL_COPY.privacy.private}</button>
          <button type="button" class="privacy-chip active" data-pv="family" onclick="MemorialCore.pickPrivacy(this,'family')">${MEMORIAL_COPY.privacy.family}</button>
          <button type="button" class="privacy-chip" data-pv="public" onclick="MemorialCore.pickPrivacy(this,'public')">${MEMORIAL_COPY.privacy.public}</button>
        </div>
        <label class="create-check"><input type="checkbox" id="cr-quiet" checked /> ${c.quietDefault}</label>
        <button class="submit-btn" onclick="MemorialCore.createNext()">创建</button>
      `;
      this._createPrivacy = "family";
    } else {
      body.innerHTML = `
        <p class="p0-intro" style="text-align:center">${c.done}</p>
        <p class="p0-hint" style="text-align:center">${c.doneHint}</p>
        <button class="submit-btn" style="display:block;margin:24px auto" onclick="goPage('profile-li')">${c.open}</button>
      `;
    }
  },

  pickPrivacy(btn, level) {
    btn.parentElement.querySelectorAll(".privacy-chip").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    this._createPrivacy = level;
  },

  async createNext() {
    if (this.createStep === 1) {
      this._createDraft = {
        name: document.getElementById("cr-name")?.value,
        birthDate: document.getElementById("cr-birth")?.value,
        deathDate: document.getElementById("cr-death")?.value,
        motto: document.getElementById("cr-motto")?.value,
      };
      if (!this._createDraft.name?.trim() || !this._createDraft.deathDate) {
        showToast("请填写姓名与辞世日期");
        return;
      }
      this.createStep = 2;
      this.renderCreatePage();
      return;
    }
    if (this.createStep === 2) {
      const quiet = document.getElementById("cr-quiet")?.checked !== false;
      const payload = {
        ...this._createDraft,
        privacy: this._createPrivacy || "family",
        quietMode: quiet,
      };
      if (this.useApi) {
        try {
          const res = await MemorialApi.createMemorial(payload);
          this.slug = res.slug;
        } catch (e) {
          showToast(e.message);
          return;
        }
      } else {
        const created = MemorialStore.createMemorial(payload);
        this.slug = created.slug;
      }
      this.createStep = 3;
      this.renderCreatePage();
      return;
    }
  },
};

function openRitualModal(type) {
  MemorialCore.openRitualModal(type);
}

function addTribute(btn, type) {
  openRitualModal(type);
}

document.addEventListener("DOMContentLoaded", () => {
  if (window.MemorialCore) MemorialCore.init().catch(console.error);
  const origGoPage = window.goPage;
  if (origGoPage) {
    window.goPage = function (id) {
      origGoPage(id);
      if (id === "create" && window.MemorialCore) {
        MemorialCore.createStep = 1;
        MemorialCore.renderCreatePage();
      }
      if (id === "profile-li" && window.MemorialCore) {
        const slug = MemorialCore.slug || "li-mingde";
        const m = MemorialStore.get(slug);
        if (m) {
          MemorialCore.applyQuietMode(m.quietMode);
          MemorialCore.renderPrivacyBar(m);
          MemorialCore.renderAnniversaryTab(m);
          MemorialCore.renderMemoryTab(m);
          MemorialCore.renderCoMemorialTab(m);
        }
      }
      if (id && id.startsWith("profile-") && id !== "profile-li" && window.MemorialCore) {
        const slug = id.replace(/^profile-/, "");
        MemorialCore.slug = slug;
        MemorialCore.loadMemorial(slug).catch(console.error);
      }
    };
  }
});
