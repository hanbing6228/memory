/** Login / register UI */
window.MemorialAuth = {
  user: null,
  useApi: false,
  _mode: "login",

  async init(useApi) {
    this.useApi = !!useApi;
    this.renderNav();
    this.renderAuthPage();
    if (!this.useApi) return;
    await this.refresh();
  },

  async refresh() {
    if (!this.useApi || !window.MemorialApi) return;
    try {
      this.user = (await MemorialApi.me()).user;
    } catch {
      this.user = null;
    }
    this.renderNav();
    this.renderAuthPage();
    if (window.MemorialContent) MemorialContent.renderGuidesAdmin();
    return this.user;
  },

  renderNav() {
    const slot = document.getElementById("nav-auth-slot");
    if (!slot) return;

    if (this.user) {
      const label = this.user.name || this.user.email.split("@")[0];
      slot.innerHTML = `
        <button type="button" class="nav-auth-user" title="${MemorialStore.escapeHtml(this.user.email)}" onclick="MemorialAuth.openAccount()">我的账户</button>
        <button type="button" class="nav-auth-btn" onclick="MemorialAuth.logout()">退出</button>
      `;
      return;
    }

    slot.innerHTML = `
      <button type="button" class="nav-auth-btn" onclick="MemorialAuth.openPage('login')">登录</button>
      <button type="button" class="nav-auth-btn nav-auth-demo" onclick="MemorialAuth.demoLogin()">演示</button>
    `;
  },

  openPage(mode) {
    this._mode = mode || "login";
    if (typeof goPage === "function") goPage("auth");
    this.renderAuthPage();
  },

  openAccount() {
    if (!this.user) {
      this.openPage("login");
      return;
    }
    if (typeof goPage === "function") goPage("account");
    this.renderAccountPage();
  },

  open(mode) {
    this.openPage(mode);
  },

  close() {
    document.getElementById("auth-modal")?.classList.remove("open");
  },

  switchMode(mode) {
    this._mode = mode;
    this.renderAuthPage();
  },

  getMode() {
    const modal = document.getElementById("auth-modal");
    if (modal?.classList.contains("open")) {
      return modal.dataset.mode !== "register" ? "login" : "register";
    }
    return this._mode === "register" ? "register" : "login";
  },

  formHtml(isLogin) {
    const offline = !this.useApi;
    return `
      <h2 class="auth-title">${isLogin ? "登录念归处" : "注册账号"}</h2>
      <p class="auth-sub">${
        offline
          ? "当前为离线演示。连接服务器后可登录、上传照片与下单。"
          : isLogin
            ? "登录后可管理纪念馆、上传照片、结算购物车"
            : "创建账号以保存您的纪念馆"
      }</p>
      <div class="auth-field"><label>邮箱</label><input id="auth-email" type="email" autocomplete="username" /></div>
      <div class="auth-field"><label>密码</label><input id="auth-password" type="password" autocomplete="${isLogin ? "current-password" : "new-password"}" /></div>
      ${
        isLogin
          ? ""
          : '<div class="auth-field"><label>称呼（可选）</label><input id="auth-name" type="text" /></div>'
      }
      <button type="button" class="submit-btn auth-submit" onclick="MemorialAuth.submit()" ${offline ? "disabled" : ""}>${isLogin ? "登录" : "注册"}</button>
      <p class="auth-switch">
        ${
          isLogin
            ? '还没有账号？<button type="button" class="auth-link" onclick="MemorialAuth.switchMode(\'register\')">注册</button>'
            : '已有账号？<button type="button" class="auth-link" onclick="MemorialAuth.switchMode(\'login\')">登录</button>'
        }
      </p>
      <p class="auth-hint">演示账号：demo@nianguichu.local / demo-demo-demo</p>
    `;
  },

  renderAuthPage() {
    const page = document.getElementById("auth-page-body");
    if (!page) return;
    const isLogin = this.getMode() !== "register";
    page.innerHTML = this.formHtml(isLogin);
  },

  renderForm() {
    const body = document.getElementById("auth-modal-body");
    const modal = document.getElementById("auth-modal");
    if (!body || !modal) return;
    const isLogin = modal.dataset.mode !== "register";
    body.innerHTML = this.formHtml(isLogin);
  },

  async submit() {
    if (!this.useApi) {
      showToast("请等待服务器连接后再登录");
      return;
    }
    const email = document.getElementById("auth-email")?.value?.trim();
    const password = document.getElementById("auth-password")?.value;
    if (!email || !password) {
      showToast("请填写邮箱和密码");
      return;
    }
    const isLogin = this.getMode() !== "register";
    try {
      if (isLogin) {
        await MemorialApi.login({ email, password });
        showToast("欢迎回来");
      } else {
        const name = document.getElementById("auth-name")?.value?.trim();
        const reg = await MemorialApi.register({
          email,
          password,
          name: name || undefined,
        });
        showToast("注册成功");
        await this.refresh();
        this.close();
        if (window.MemorialCore) {
          await MemorialCore.onAuthChanged();
        }
        if (reg.memorialSlug && window.MemorialCore) {
          await MemorialCore.loadMemorial(reg.memorialSlug);
          goPage("profile-li");
        } else {
          goPage("account");
          this.renderAccountPage();
        }
        return;
      }
      await this.refresh();
      this.close();
      if (window.MemorialCore) {
        await MemorialCore.onAuthChanged();
      }
      if (isLogin) {
        goPage("profile-li");
      }
    } catch (e) {
      showToast(e.message || "操作失败");
    }
  },

  async demoLogin() {
    if (!this.useApi) {
      showToast("服务器未连接，请稍后再试");
      return;
    }
    try {
      await MemorialApi.login({
        email: "demo@nianguichu.local",
        password: "demo-demo-demo",
      });
      showToast("已以演示账号登录");
      await this.refresh();
      if (window.MemorialCore) await MemorialCore.onAuthChanged();
    } catch (e) {
      showToast(e.message || "演示登录失败");
    }
  },

  async logout() {
    if (this.useApi) {
      try {
        await MemorialApi.logout();
      } catch {
        /* ignore */
      }
    }
    this.user = null;
    this.renderNav();
    this.renderAuthPage();
    showToast("已退出登录");
    if (window.MemorialCore) await MemorialCore.onAuthChanged();
  },

  promptLogin(message) {
    showToast(message || "请先登录");
    this.openPage("login");
  },

  requireLogin(message) {
    if (this.user) return true;
    this.promptLogin(message);
    return false;
  },

  async renderAccountPage() {
    const body = document.getElementById("account-page-body");
    if (!body) return;
    if (!this.user) {
      body.innerHTML =
        '<p class="p0-empty">请先 <button type="button" class="auth-link" onclick="MemorialAuth.openPage(\'login\')">登录</button></p>';
      return;
    }

    body.innerHTML = `<p class="p0-empty">加载中…</p>`;

    let memorials = [];
    if (this.useApi) {
      try {
        const data = await MemorialApi.listMyMemorials();
        memorials = data.memorials || [];
      } catch (e) {
        body.innerHTML = `<p class="p0-empty">${MemorialStore.escapeHtml(e.message)}</p>`;
        return;
      }
    }

    const memorialList =
      memorials.length > 0
        ? memorials
            .map(
              (m) => `
        <div class="account-memorial-row">
          <div>
            <strong>${MemorialStore.escapeHtml(m.name)}</strong>
            <span class="account-memorial-meta">${MemorialStore.escapeHtml(m.slug)} · ${m.privacy === "public" ? "公开" : m.privacy === "family" ? "家人" : "私密"}</span>
          </div>
          <button type="button" class="submit-btn" style="padding:8px 14px;font-size:13px" onclick="MemorialCore.openMemorial('${MemorialStore.escapeHtml(m.slug)}')">管理</button>
        </div>`
            )
            .join("")
        : `<p class="p0-empty">您还没有创建纪念馆，可点击下方按钮创建。</p>`;

    body.innerHTML = `
      <h2 class="auth-title">我的账户</h2>
      <p class="auth-sub">管理个人资料与您创建的纪念馆</p>
      <div class="auth-field"><label>邮箱</label><input type="email" value="${MemorialStore.escapeHtml(this.user.email)}" disabled /></div>
      <div class="auth-field"><label>称呼</label><input id="account-name" type="text" value="${MemorialStore.escapeHtml(this.user.name || "")}" placeholder="您的姓名或昵称" /></div>
      <button type="button" class="submit-btn auth-submit" onclick="MemorialAuth.saveAccount()">保存资料</button>
      <h3 class="account-section-title">我的纪念馆</h3>
      <div class="account-memorial-list">${memorialList}</div>
      <button type="button" class="obit-back-btn" style="width:100%;margin-top:12px" onclick="MemorialCore.goCreate()">创建新纪念馆</button>
      <button type="button" class="nav-auth-btn" style="width:100%;margin-top:12px" onclick="MemorialAuth.logout()">退出登录</button>
    `;
  },

  async saveAccount() {
    if (!this.useApi) {
      showToast("请连接服务器后保存");
      return;
    }
    const name = document.getElementById("account-name")?.value?.trim();
    if (!name) {
      showToast("请填写称呼");
      return;
    }
    try {
      const data = await MemorialApi.updateProfile({ name });
      this.user = data.user;
      this.renderNav();
      showToast("资料已保存");
    } catch (e) {
      showToast(e.message || "保存失败");
    }
  },
};
