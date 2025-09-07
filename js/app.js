// === NXRE Official — Storefront App (Full Rewrite with Backdrop Fix) ===

const $  = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const fmt = (cents) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' })
    .format(cents / 100);

// ---------- State ----------
const state = {
  products: [],
  selected: null,
  cart: JSON.parse(localStorage.getItem('cart') || '[]'),
};

// ---------- Rendering ----------
function renderProducts() {
  const grid = $('#productGrid');
  grid.innerHTML = '';
  state.products.forEach((p) => {
    const card = document.createElement('article');
    card.className = 'card';
    card.setAttribute('role', 'listitem');
    card.innerHTML = `
      <img src="${p.image}" alt="${p.title}">
      <div class="body">
        <strong>${p.title}</strong>
        <span class="price">${fmt(p.price)}</span>
        <button class="btn ghost" data-id="${p.id}">View</button>
      </div>
    `;
    grid.append(card);
  });

  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-id]');
    if (!btn) return;
    const id = btn.getAttribute('data-id');
    const product = state.products.find((x) => x.id === id);
    openModal(product);
  });
}

function renderCart() {
  const list = $('#cartItems');
  list.innerHTML = '';
  state.cart.forEach((item, idx) => {
    const div = document.createElement('div');
    div.className = 'cart-item';
    div.innerHTML = `
      <img src="${item.image}" alt="${item.title}">
      <div style="flex:1;">
        <div style="display:flex; justify-content:space-between;">
          <strong>${item.title}</strong>
          <button type="button" class="icon-btn" data-remove="${idx}" aria-label="Remove ${item.title}">✕</button>
        </div>
        <div style="display:flex; gap:8px; align-items:center; margin-top:6px;">
          <span class="price">${fmt(item.price)}</span>
          <label>Qty</label>
          <input type="number" min="1" value="${item.qty}" data-qty="${idx}" style="width:64px;">
        </div>
      </div>
    `;
    list.append(div);
  });
  $('#cartSubtotal').textContent = fmt(subtotal());
}

function updateCartBadge() {
  const count = state.cart.reduce((a, c) => a + c.qty, 0);
  $('#openCart')?.setAttribute('data-badge', count);
}

// ---------- Modal ----------
function openModal(product) {
  state.selected = product;
  $('#modalImg').src = product.image;
  $('#modalImg').alt = product.title;
  $('#modalTitle').textContent = product.title;
  $('#modalDesc').textContent = product.description;
  $('#modalPrice').textContent = fmt(product.price);
  $('#qtyInput').value = 1;
  $('#productModal').classList.add('open');
}

function closeModal() {
  $('#productModal').classList.remove('open');
  state.selected = null;
}

// ---------- Cart Logic ----------
function saveCart() {
  localStorage.setItem('cart', JSON.stringify(state.cart));
  updateCartBadge();
  renderCart();
}

function addSelectedToCart() {
  const qty = Math.max(1, parseInt($('#qtyInput').value || '1', 10));
  const p = state.selected;
  if (!p) return;
  const existing = state.cart.find(
    (i) => i.id === p.id && i.checkout_url === p.checkout_url
  );
  if (existing) existing.qty += qty;
  else
    state.cart.push({
      id: p.id,
      title: p.title,
      price: p.price,
      image: p.image,
      qty,
      checkout_url: p.checkout_url,
    });
  saveCart();
  closeModal();
  openCart();
}

function subtotal() {
  return state.cart.reduce((a, c) => a + c.price * c.qty, 0);
}

// ---------- Backdrop + Cart ----------
let cartBackdrop = null;

function ensureBackdrop() {
  if (!cartBackdrop) {
    cartBackdrop = document.createElement('div');
    cartBackdrop.id = 'cartBackdrop';
    Object.assign(cartBackdrop.style, {
      position: 'fixed',
      inset: '0',
      background: 'rgba(0,0,0,0.5)',
      opacity: '0',
      transition: 'opacity .2s ease',
      zIndex: '9998',   // above header
      display: 'none',
    });
    document.body.appendChild(cartBackdrop);
    cartBackdrop.addEventListener('click', () => closeCart());
  }
}

function showBackdrop() {
  ensureBackdrop();
  cartBackdrop.style.display = 'block';
  cartBackdrop.getBoundingClientRect(); // force reflow
  cartBackdrop.style.opacity = '1';
}

function hideBackdrop() {
  if (!cartBackdrop) return;
  cartBackdrop.style.opacity = '0';
  setTimeout(() => {
    if (cartBackdrop) cartBackdrop.style.display = 'none';
  }, 200);
}

function openCart() {
  $('#cartPanel').classList.add('open');
  showBackdrop();
  try { history.pushState({ cart: true }, '', '#cart'); } catch (e) {}
}

function closeCart(fromPop = false) {
  $('#cartPanel').classList.remove('open');
  hideBackdrop();
  if (!fromPop && location.hash === '#cart') {
    try { history.back(); } catch (e) {}
  }
}

// ---------- Init ----------
async function init() {
  try {
    const res = await fetch('data/products.json', { cache: 'no-store' });
    state.products = await res.json();
  } catch (e) {
    state.products = [];
    console.warn('Failed to load products.json', e);
  }
  renderProducts();
  renderCart();
  updateCartBadge();
  $('#year').textContent = new Date().getFullYear();
  ensureBackdrop();
}

// ---------- Listeners ----------
document.addEventListener('click', (e) => {
  if (e.target.id === 'closeModal' || e.target.id === 'productModal') closeModal();
  if (e.target.id === 'addToCart') addSelectedToCart();
  if (e.target.id === 'openCart') openCart();
  if (e.target.id === 'closeCart') closeCart();
});

$('#cartItems')?.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-remove]');
  if (!btn) return;
  const idx = parseInt(btn.getAttribute('data-remove'), 10);
  if (Number.isFinite(idx)) {
    state.cart.splice(idx, 1);
    saveCart();
  }
});

document.addEventListener('input', (e) => {
  if (e.target.matches('input[data-qty]')) {
    const idx = parseInt(e.target.getAttribute('data-qty'), 10);
    state.cart[idx].qty = Math.max(1, parseInt(e.target.value || '1', 10));
    saveCart();
  }
});

$('#checkoutBtn')?.addEventListener('click', () => {
  if (state.cart.length === 0) return;
  const first = state.cart[0];
  window.open(first.checkout_url, '_blank');
});

$('#contactForm')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = $('#name').value.trim();
  const email = $('#email').value.trim();
  const msg = $('#msg').value.trim();
  const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${msg}`);
  window.location.href = `mailto:contact@nxreofficial.com?subject=Website Contact&body=${body}`;
  $('#contactNote').textContent = 'Opening your email app…';
});

// ESC closes modal or cart
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if ($('#productModal')?.classList.contains('open')) closeModal();
    else closeCart();
  }
});

// Back button closes cart
window.addEventListener('popstate', () => {
  if (location.hash !== '#cart') closeCart(true);
});

// Boot
window.addEventListener('load', init);
