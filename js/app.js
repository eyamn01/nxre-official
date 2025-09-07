
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

const state = {
  products: [],
  selected: null,
  cart: JSON.parse(localStorage.getItem('cart') || '[]')
};

const fmt = v => new Intl.NumberFormat(undefined, {style:'currency', currency:'USD'}).format(v/100);

function renderProducts() {
  const grid = $('#productGrid');
  grid.innerHTML = '';
  state.products.forEach(p => {
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
  grid.addEventListener('click', e => {
    const btn = e.target.closest('button[data-id]');
    if(!btn) return;
    const id = btn.getAttribute('data-id');
    const product = state.products.find(x => x.id === id);
    openModal(product);
  });
}

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

function closeModal() { $('#productModal').classList.remove('open'); }

function saveCart() {
  localStorage.setItem('cart', JSON.stringify(state.cart));
  updateCartBadge();
  renderCart();
}

function updateCartBadge() {
  $('#openCart').setAttribute('data-badge', state.cart.reduce((a,c)=>a+c.qty,0));
}

function addSelectedToCart() {
  const qty = Math.max(1, parseInt($('#qtyInput').value || '1', 10));
  const p = state.selected;
  const existing = state.cart.find(i => i.id === p.id && i.checkout_url === p.checkout_url);
  if(existing){ existing.qty += qty; } else {
    state.cart.push({ id: p.id, title: p.title, price: p.price, image: p.image, qty, checkout_url: p.checkout_url });
  }
  saveCart();
  closeModal();
  openCart();
}

function subtotal() {
  return state.cart.reduce((a,c)=> a + c.price*c.qty, 0);
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
          <button class="icon-btn" data-remove="${idx}">✕</button>
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

function openCart(){ $('#cartPanel').classList.add('open'); }
function closeCart(){ $('#cartPanel').classList.remove('open'); }

async function init() {
  const res = await fetch('data/products.json');
  state.products = await res.json();
  renderProducts();
  renderCart();
  updateCartBadge();
  $('#year').textContent = new Date().getFullYear();
}

document.addEventListener('click', e => {
  if(e.target.id === 'closeModal' || e.target.id === 'productModal') closeModal();
  if(e.target.id === 'addToCart') addSelectedToCart();
  if(e.target.id === 'openCart') openCart();
  if(e.target.id === 'closeCart') closeCart();
  if(e.target.matches('button[data-remove]')){
    const idx = parseInt(e.target.getAttribute('data-remove'), 10);
    state.cart.splice(idx,1);
    saveCart();
  }
});
document.addEventListener('input', e => {
  if(e.target.matches('input[data-qty]')){
    const idx = parseInt(e.target.getAttribute('data-qty'), 10);
    state.cart[idx].qty = Math.max(1, parseInt(e.target.value || '1',10));
    saveCart();
  }
});

$('#checkoutBtn')?.addEventListener('click', () => {
  // Strategy: open the first item's checkout link in a new tab.
  if(state.cart.length === 0) return;
  const first = state.cart[0];
  window.open(first.checkout_url, '_blank');
});

$('#contactForm')?.addEventListener('submit', (e)=>{
  e.preventDefault();
  const name = $('#name').value.trim();
  const email = $('#email').value.trim();
  const msg = $('#msg').value.trim();
  // Simple mailto fallback. Replace with a real form endpoint (e.g., Formspree/Netlify Forms) in production.
  const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${msg}`);
  window.location.href = `mailto:hello@yourstore.com?subject=Website Contact&body=${body}`;
  $('#contactNote').textContent = "Opening your email app…";
});

window.addEventListener('load', init);
