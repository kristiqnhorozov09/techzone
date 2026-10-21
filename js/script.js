const API_BASE_URL = 'api';
let products = [];

const productGrid = document.querySelector("#productGrid");
const searchInput = document.querySelector("#searchInput");
const sortSelect = document.querySelector("#sortSelect");
const emptyState = document.querySelector("#emptyState");
const cartCount = document.querySelector("#cartCount");
const cartDialog = document.querySelector("#cartDialog");
const cartItems = document.querySelector("#cartItems");
const cartTotal = document.querySelector("#cartTotal");
const toast = document.querySelector("#toast");

let activeCategory = "Всички";
let cart = JSON.parse(localStorage.getItem("techzone-cart") || "[]");

const money = value => new Intl.NumberFormat("bg-BG", { style: "currency", currency: "BGN" }).format(value);

async function fetchProducts() {
  try {
    const term = searchInput.value.trim().toLocaleLowerCase("bg");
    const category = activeCategory === "Всички" ? "" : activeCategory;
    const sort = sortSelect.value;

    const params = new URLSearchParams();
    if (category) params.append("category", category);
    if (term) params.append("search", term);
    if (sort) params.append("sort", sort);

    const response = await fetch(`${API_BASE_URL}/products.php?${params}`);
    if (!response.ok) throw new Error("Failed to fetch products");

    products = await response.json();
    renderProducts();
  } catch (error) {
    console.error("Error fetching products:", error);
    productGrid.innerHTML = '<p class="demo-note">Грешка при зареждане на продуктите. Опитайте по-късно.</p>';
  }
}

function renderProducts() {
  productGrid.innerHTML = products.map(product => `
    <article class="product-card">
      <div class="product-art">
        <span class="product-tag">${product.tag}</span>
        <span class="product-emoji" role="img" aria-label="${product.category}">${product.emoji}</span>
      </div>
      <div class="product-info">
        <p class="product-category">${product.category}</p>
        <h3>${product.name}</h3>
        <p class="product-description">${product.description}</p>
        <div class="product-bottom">
          <span class="product-price">${money(product.price)}</span>
          <button class="add-button" data-add="${product.id}">+ Добави</button>
        </div>
      </div>
    </article>
  `).join("");

  emptyState.hidden = visible.length > 0;
}

function saveCart() {
  localStorage.setItem("techzone-cart", JSON.stringify(cart));
  updateCart();
}

function addToCart(id) {
  const existing = cart.find(item => item.id === id);
  if (existing) existing.quantity += 1;
  else cart.push({ id, quantity: 1 });
  saveCart();
  const product = products.find(item => item.id === id);
  showToast(`${product.name} е добавен в количката.`);
}

function updateCart() {
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  cartCount.textContent = count;
  cartItems.innerHTML = cart.length ? cart.map(item => {
    const product = products.find(entry => entry.id === item.id);
    if (!product) return "";
    return `<div class="cart-line">
      <span class="line-emoji">${product.emoji}</span>
      <div class="line-info"><strong>${product.name}</strong><small>${item.quantity} × ${money(product.price)}</small></div>
      <button class="remove-line" data-remove="${product.id}">Премахни</button>
    </div>`;
  }).join("") : '<p class="demo-note">Количката е празна. Добави продукт от каталога.</p>';
  const total = cart.reduce((sum, item) => {
    const product = products.find(entry => entry.id === item.id);
    return sum + (product ? product.price * item.quantity : 0);
  }, 0);
  cartTotal.textContent = money(total);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2600);
}

productGrid.addEventListener("click", event => {
  const button = event.target.closest("[data-add]");
  if (button) addToCart(Number(button.dataset.add));
});

cartItems.addEventListener("click", event => {
  const button = event.target.closest("[data-remove]");
  if (!button) return;
  cart = cart.filter(item => item.id !== Number(button.dataset.remove));
  saveCart();
});

searchInput.addEventListener("input", fetchProducts);
sortSelect.addEventListener("change", fetchProducts);

document.querySelectorAll("[data-filter]").forEach(button => {
  button.addEventListener("click", () => {
    activeCategory = button.dataset.filter;
    document.querySelectorAll("[data-filter]").forEach(chip => chip.classList.toggle("selected", chip === button));
    fetchProducts();
    document.querySelector("#products").scrollIntoView({ behavior: "smooth" });
  });
});

document.querySelectorAll("[data-category]").forEach(button => {
  button.addEventListener("click", () => {
    activeCategory = button.dataset.category;
    document.querySelectorAll("[data-filter]").forEach(chip => chip.classList.toggle("selected", chip.dataset.filter === activeCategory));
    fetchProducts();
    document.querySelector("#products").scrollIntoView({ behavior: "smooth" });
  });
});

document.querySelector("#cartButton").addEventListener("click", () => cartDialog.showModal());
document.querySelector("#closeCart").addEventListener("click", () => cartDialog.close());
document.querySelector("#checkoutButton").addEventListener("click", async () => {
  if (cart.length === 0) {
    showToast("Количката е празна.");
    return;
  }

  try {
    const total = cart.reduce((sum, item) => {
      const product = products.find(entry => entry.id === item.id);
      return sum + (product ? product.price * item.quantity : 0);
    }, 0);

    const orderData = {
      items: cart,
      total: total
    };

    const response = await fetch(`${API_BASE_URL}/orders.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderData)
    });

    if (!response.ok) throw new Error("Failed to create order");

    const result = await response.json();
    showToast(`Поръчка #${result.order_id} е създадена успешно!`);

    cart = [];
    saveCart();
    cartDialog.close();

  } catch (error) {
    console.error("Error creating order:", error);
    showToast("Грешка при създаване на поръчка. Опитайте отново.");
  }
});
document.querySelector("#year").textContent = new Date().getFullYear();

document.querySelector("#menuToggle").addEventListener("click", event => {
  const nav = document.querySelector(".main-nav");
  const open = nav.classList.toggle("open");
  event.currentTarget.setAttribute("aria-expanded", String(open));
});
document.querySelectorAll(".main-nav a").forEach(link => link.addEventListener("click", () => {
  document.querySelector(".main-nav").classList.remove("open");
  document.querySelector("#menuToggle").setAttribute("aria-expanded", "false");
}));

fetchProducts();
updateCart();
