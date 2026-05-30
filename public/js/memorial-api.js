/**
 * API client — syncs with Next.js backend when deployed on VPS
 */
window.MemorialApi = {
  base: "",

  async request(path, options = {}) {
    const res = await fetch(this.base + path, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.ok) {
      throw new Error(json.error || res.statusText || "请求失败");
    }
    return json.data;
  },

  async health() {
    try {
      return await this.request("/api/integrations/status");
    } catch {
      return null;
    }
  },

  async getMemorial(slug) {
    return this.request("/api/memorials/" + encodeURIComponent(slug));
  },

  async patchMemorial(slug, patch) {
    return this.request("/api/memorials/" + encodeURIComponent(slug), {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  async addRitual(slug, { type, message, author }) {
    return this.request("/api/rituals", {
      method: "POST",
      body: JSON.stringify({ slug, type, message, author }),
    });
  },

  async addFragment(slug, payload) {
    return this.request("/api/fragments", {
      method: "POST",
      body: JSON.stringify({ slug, ...payload }),
    });
  },

  async approveFragment(slug, fragmentId) {
    return this.request("/api/fragments/approve", {
      method: "POST",
      body: JSON.stringify({ slug, fragmentId }),
    });
  },

  async subscribeReminder(slug, email) {
    return this.request("/api/reminders", {
      method: "POST",
      body: JSON.stringify({ slug, email }),
    });
  },

  async createMemorial(payload) {
    return this.request("/api/memorials", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async register(payload) {
    return this.request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
