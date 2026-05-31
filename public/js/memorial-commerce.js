/**
 * Shop catalog, checkout, order confirmation
 */
window.MemorialCommerce = {
  products: [],
  cart: [],
  cartOpen: false,
  selectedProduct: null,
  stripeAvailable: false,

  async init(useApi) {
    this.cart = this.loadCart();
    this.updateCartUI();
    if (!useApi) {
      this.products = this.fallbackProducts();
      this.renderShopGrids();
      return;
    }
    try {
      const data = await MemorialApi.listProducts();
      this.products = data.products || [];
      if (!this.products.length) this.products = this.fallbackProducts();
    } catch {
      this.products = this.fallbackProducts();
    }
    this.stripeAvailable = !!(
      window.MEMORIAL_CONFIG && window.MEMORIAL_CONFIG.stripeEnabled
    );
    this.renderShopGrids();
    this.checkOrderFromUrl();
  },

  fallbackProducts() {
    return [
      { slug: "white-chrysanthemum", name: "白菊花束·思念", price: 128, listPrice: 168, category: "flower", emoji: "🌼", bg: "linear-gradient(135deg,#f5f5f5,#e8e8e8)", badge: "热销", description: "精选白菊与配叶，适合祭奠与追思。" },
      { slug: "white-wreath", name: "白色祭奠花圈", price: 298, category: "flower", emoji: "💐", bg: "linear-gradient(135deg,#f0f5f0,#e0ede0)", description: "含挽联定制，适合灵堂布置。" },
      { slug: "incense-gift-box", name: "祭祀香薰礼盒", price: 198, listPrice: 238, category: "candle", emoji: "🕯️", bg: "linear-gradient(135deg,#fdf5e8,#f5e8d0)", badge: "新品", description: "天然檀香与莲花蜡烛组合。" },
      { slug: "memorial-album", name: "精装纪念相册", price: 688, category: "gift", emoji: "📖", bg: "linear-gradient(135deg,#e8e8f5,#d8d8ed)", description: "30页硬壳相册，含排版服务。" },
      { slug: "memorial-tree", name: "代为种植纪念树", price: 168, category: "plant", emoji: "🌳", bg: "linear-gradient(135deg,#e8f5e8,#d0edd0)", badge: "环保", description: "附证书与坐标。" },
      { slug: "qr-plaque", name: "QR二维码铭牌", price: 388, category: "gift", emoji: "📱", bg: "linear-gradient(135deg,#1a1a1a,#2a2a2a)", description: "不锈钢激光蚀刻，扫码直达纪念馆。" },
    ];
  },

  loadCart() {
    try {
      return JSON.parse(localStorage.getItem("nianguichu_cart_v1") || "[]");
    } catch {
      return [];
    }
  },

  saveCart() {
    localStorage.setItem("nianguichu_cart_v1", JSON.stringify(this.cart));
  },

  productCard(p, detailFn) {
    const esc = MemorialStore.escapeHtml;
    const list =
      p.listPrice && p.listPrice > p.price
        ? `<span>¥${p.listPrice}</span>`
        : "";
    return `
    <div class="product-card" data-cat="${p.category}" onclick="${detailFn}('${esc(p.slug)}')">
      <div class="product-img" style="background:${p.bg || "#eee"}">${p.emoji || "🛍️"}${p.badge ? `<div class="product-badge">${esc(p.badge)}</div>` : ""}</div>
      <div class="product-body">
        <div class="product-name">${esc(p.name)}</div>
        <div class="product-price">¥${p.price}${list}</div>
      </div>
    </div>`;
  },

  renderShopGrids() {
    const shop = document.getElementById("shop-products-grid");
    if (shop) {
      shop.innerHTML = this.products
        .map((p) => this.productCard(p, "MemorialCommerce.openProduct"))
        .join("");
    }
    const qr = document.getElementById("qr-products-grid");
    if (qr) {
      const qrProducts = this.products.filter((p) =>
        ["qr-plaque", "brass-plaque", "stainless-plaque"].includes(p.slug)
      );
      const list = qrProducts.length
        ? qrProducts
        : this.products.filter((p) => p.category === "gift").slice(0, 3);
      qr.innerHTML = list
        .map(
          (p) => `
        <div class="qr-prod-card">
          <div class="qr-prod-visual" style="background:${p.bg}">${p.emoji}</div>
          <div class="qr-prod-info">
            <div class="qr-prod-name">${MemorialStore.escapeHtml(p.name)}</div>
            <div class="qr-prod-desc">${MemorialStore.escapeHtml(p.description || "")}</div>
            <div class="qr-prod-price">¥${p.price}<button class="qr-prod-btn" onclick="event.stopPropagation();MemorialCommerce.addBySlug('${MemorialStore.escapeHtml(p.slug)}')">加入购物车</button></div>
          </div>
        </div>`
        )
        .join("");
    }
  },

  filterShop(cat, el) {
    document.querySelectorAll(".shop-cat").forEach((t) => t.classList.remove("active"));
    if (el) el.classList.add("active");
    document.querySelectorAll("#shop-products-grid .product-card").forEach((card) => {
      card.style.display =
        cat === "all" || card.dataset.cat === cat ? "block" : "none";
    });
  },

  findProduct(slug) {
    return this.products.find((p) => p.slug === slug);
  },

  addBySlug(slug) {
    const p = this.findProduct(slug);
    if (p) this.addToCart(p);
  },

  addToCart(product, qty) {
    const q = qty || 1;
    const existing = this.cart.find((i) => i.slug === product.slug);
    if (existing) existing.qty += q;
    else {
      this.cart.push({
        slug: product.slug,
        name: product.name,
        price: product.price,
        qty: q,
      });
    }
    this.saveCart();
    this.updateCartUI();
    showToast(product.name + " 已加入购物车");
  },

  removeFromCart(index) {
    this.cart.splice(index, 1);
    this.saveCart();
    this.updateCartUI();
  },

  updateCartUI() {
    const fab = document.getElementById("cart-fab");
    const badge = document.getElementById("cart-badge");
    const items = document.getElementById("cart-items");
    const total = document.getElementById("cart-total");
    const count = this.cart.reduce((s, i) => s + i.qty, 0);
    const sum = this.cart.reduce((s, i) => s + i.price * i.qty, 0);
    if (badge) badge.textContent = count;
    if (fab) fab.classList.toggle("show", count > 0);
    if (items) {
      items.innerHTML = this.cart
        .map(
          (item, i) => `
        <div class="cart-item">
          <span class="cart-item-icon">🛍️</span>
          <span class="cart-item-name">${MemorialStore.escapeHtml(item.name)} ×${item.qty}</span>
          <span class="cart-item-price">¥${item.price * item.qty}</span>
          <button class="cart-item-del" onclick="MemorialCommerce.removeFromCart(${i})">✕</button>
        </div>`
        )
        .join("");
    }
    if (total) total.textContent = "¥" + sum;
  },

  toggleCart() {
    this.cartOpen = !this.cartOpen;
    document.getElementById("cart-drawer")?.classList.toggle("open", this.cartOpen);
  },

  openCheckout() {
    if (!this.cart.length) {
      showToast("购物车为空");
      return;
    }
    document.getElementById("checkout-modal")?.classList.add("open");
    const payRow = document.getElementById("checkout-pay-row");
    const inquiryOnly = document.getElementById("checkout-inquiry-only");
    if (payRow) {
      payRow.style.display = this.stripeAvailable ? "grid" : "none";
    }
    if (inquiryOnly) {
      inquiryOnly.style.display = this.stripeAvailable ? "none" : "block";
    }
    const summary = document.getElementById("checkout-summary");
    if (summary) {
      summary.innerHTML = this.cart
        .map(
          (i) =>
            `<div class="checkout-line">${MemorialStore.escapeHtml(i.name)} ×${i.qty} — ¥${i.price * i.qty}</div>`
        )
        .join("");
      const sum = this.cart.reduce((s, i) => s + i.price * i.qty, 0);
      summary.innerHTML += `<div class="checkout-total-line">合计：¥${sum}</div>`;
    }
  },

  closeCheckout() {
    document.getElementById("checkout-modal")?.classList.remove("open");
  },

  async submitCheckout(paymentMethod) {
    const payload = {
      contactName: document.getElementById("co-name")?.value?.trim(),
      contactEmail: document.getElementById("co-email")?.value?.trim(),
      contactPhone: document.getElementById("co-phone")?.value?.trim(),
      shippingProvince: document.getElementById("co-province")?.value?.trim(),
      shippingCity: document.getElementById("co-city")?.value?.trim(),
      shippingAddress: document.getElementById("co-address")?.value?.trim(),
      shippingPostal: document.getElementById("co-postal")?.value?.trim(),
      note: document.getElementById("co-note")?.value?.trim(),
      memorialSlug: window.MemorialCore?.slug,
      items: this.cart.map((i) => ({
        slug: i.slug,
        name: i.name,
        price: i.price,
        qty: i.qty,
      })),
      paymentMethod: paymentMethod || "inquiry",
    };

    if (
      !payload.contactName ||
      !payload.contactEmail ||
      !payload.contactPhone ||
      !payload.shippingAddress ||
      !payload.shippingCity ||
      !payload.shippingProvince
    ) {
      showToast("请完整填写联系与收货信息");
      return;
    }

    if (window.MemorialCore?.useApi) {
      try {
        const res = await MemorialApi.createOrder(payload);
        this.closeCheckout();
        this.cart = [];
        this.saveCart();
        this.updateCartUI();
        this.toggleCart();
        if (res.checkoutUrl) {
          window.location.href = res.checkoutUrl;
          return;
        }
        this.showOrderConfirm(res.orderNumber, res.total, res.paymentMethod);
        return;
      } catch (e) {
        showToast(e.message);
        return;
      }
    }

    this.closeCheckout();
    this.cart = [];
    this.saveCart();
    this.updateCartUI();
    this.showOrderConfirm("NG-DEMO-" + Date.now().toString(36).toUpperCase(), payload.items.reduce((s,i)=>s+i.price*i.qty,0), "inquiry");
  },

  showOrderConfirm(orderNumber, total, method) {
    const page = document.getElementById("page-order-confirm");
    if (!page) return;
    document.getElementById("order-num").textContent = orderNumber;
    document.getElementById("order-total").textContent = "¥" + total;
    document.getElementById("order-method").textContent =
      method === "stripe" ? "在线支付" : "人工跟进（客服将联系您）";
    goPage("order-confirm");
  },

  checkOrderFromUrl() {
    const params = new URLSearchParams(location.search);
    const order = params.get("order");
    if (!order) return;
    const paid = params.get("paid");
    if (paid === "1") {
      this.showOrderConfirm(order, "—", "stripe");
      showToast("支付成功，感谢您的订购");
    }
  },

  async openProduct(slug) {
    const local = this.findProduct(slug);
    if (window.MemorialCore?.useApi) {
      try {
        const data = await MemorialApi.getProduct(slug);
        this.selectedProduct = data.product;
      } catch {
        this.selectedProduct = local;
      }
    } else {
      this.selectedProduct = local;
    }
    if (!this.selectedProduct) return;
    const p = this.selectedProduct;
    document.getElementById("product-modal-title").textContent = p.name;
    document.getElementById("product-modal-body").innerHTML = `
      <div class="product-detail-hero" style="background:${p.bg}">${p.emoji || "🛍️"}</div>
      <p style="line-height:1.8;margin:16px 0">${MemorialStore.escapeHtml(p.description || "")}</p>
      <div class="product-detail-price">¥${p.price}${p.listPrice && p.listPrice > p.price ? ` <span style="text-decoration:line-through;opacity:.5;font-size:14px">¥${p.listPrice}</span>` : ""}</div>
      <button class="submit-btn" style="width:100%;margin-top:16px" onclick="MemorialCommerce.addBySlug('${MemorialStore.escapeHtml(p.slug)}');closeModal('product-modal')">加入购物车</button>
    `;
    document.getElementById("product-modal").classList.add("open");
  },
};

function addToCart(name, price) {
  const p = MemorialCommerce.products.find((x) => x.name === name);
  if (p) MemorialCommerce.addToCart(p);
  else MemorialCommerce.addToCart({ slug: "custom", name, price: parseInt(price, 10), qty: 1 });
}

function filterShop(el, cat) {
  MemorialCommerce.filterShop(cat, el);
}

function toggleCart() {
  MemorialCommerce.toggleCart();
}

function submitCartInquiry() {
  MemorialCommerce.openCheckout();
}

function removeCart(i) {
  MemorialCommerce.removeFromCart(i);
}

function updateCart() {
  MemorialCommerce.updateCartUI();
}
