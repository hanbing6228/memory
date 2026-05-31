/** Login / register UI for Render API mode */
window.MemorialAuth = {
  user: null,
  useApi: false,

  async init(useApi) {
    this.useApi = !!useApi;
    this.renderNav();
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
    if (window.MemorialContent) MemorialContent.renderGuidesAdmin();
    return this.user;
  },

  renderNav() {
    const slot = document.getElementById("nav-auth-slot");
    if (!slot) return;

    if (!this.useApi) {
      slot.innerHTML = "";
      return;
    }

    if (this.user) {
      const label = this.user.name || this.user.email.split("@")[0];
      slot.innerHTML = `
        <span class="nav-auth-user" title="${MemorialStore.escapeHtml(this.user.email)}">${MemorialStore.escapeHtml(label)}</span>
        <button type="button" class="nav-auth-btn" onclick="MemorialAuth.logout()">退出</button>
      `;
      return;
    }

    slot.innerHTML = `
      <button type="button" class="nav-auth-btn nav-auth-demo" onclick="MemorialAuth.demoLogin()">演示登录</button>
      <button type="button" class="nav-auth-btn" onclick="MemorialAuth.open('login')">登录</button>
    `;
  },

  open(mode) {
    const modal = document.getElementById("auth-modal");
    if (!modal) return;
    modal.dataset.mode = mode || "login";
    modal.classList.add("open");
    this.renderForm();
  },

  close() {
    document.getElementById("auth-modal")?.classList.remove("open");
  },

  switchMode(mode) {
    const modal = document.getElementById("auth-modal");
    if (modal) modal.dataset.mode = mode;
    this.renderForm();
  },

  renderForm() {
    const body = document.getElementById("auth-modal-body");
    const modal = document.getElementById("auth-modal");
    if (!body || !modal) return;
    const isLogin = modal.dataset.mode !== "register";

    body.innerHTML = `
      <h2 class="auth-title">${isLogin ? "登录念归处" : "注册账号"}</h2>
      <p class="auth-sub">${isLogin ? "登录后可管理纪念馆、确认家族记忆" : "创建账号以保存您的纪念馆"}</p>
      <div class="auth-field"><label>邮箱</label><input id="auth-email" type="email" autocomplete="username" /></div>
      <div class="auth-field"><label>密码</label><input id="auth-password" type="password" autocomplete="${isLogin ? "current-password" : "new-password"}" /></div>
      ${
        isLogin
          ? ""
          : '<div class="auth-field"><label>称呼（可选）</label><input id="auth-name" type="text" /></div>'
      }
      <button type="button" class="submit-btn auth-submit" onclick="MemorialAuth.submit()">${isLogin ? "登录" : "注册"}</button>
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

  async submit() {
    const email = document.getElementById("auth-email")?.value?.trim();
    const password = document.getElementById("auth-password")?.value;
    if (!email || !password) {
      showToast("请填写邮箱和密码");
      return;
    }
    const modal = document.getElementById("auth-modal");
    const isLogin = modal?.dataset.mode !== "register";
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
    } catch (e) {
      showToast(e.message || "操作失败");
    }
  },

  async demoLogin() {
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
    try {
      await MemorialApi.logout();
    } catch {
      /* ignore */
    }
    this.user = null;
    this.renderNav();
    showToast("已退出登录");
    if (window.MemorialCore) await MemorialCore.onAuthChanged();
  },

  promptLogin(message) {
    showToast(message || "请先登录");
    this.open("login");
  },

  requireLogin(message) {
    if (this.user) return true;
    this.promptLogin(message);
    return false;
  },
};
