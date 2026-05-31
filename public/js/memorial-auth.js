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
        <span class="nav-auth-user" title="${MemorialStore.escapeHtml(this.user.email)}">${MemorialStore.escapeHtml(label)}</span>
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
        await MemorialApi.register({ email, password, name: name || undefined });
        showToast("注册成功");
      }
      await this.refresh();
      this.close();
      if (window.MemorialCore) {
        await MemorialCore.onAuthChanged();
      }
      goPage("profile-li");
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
};
