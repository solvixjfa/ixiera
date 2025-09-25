// products.js
import { supabase } from "./supabase.js";

export async function fetchProducts() {
  const { data: products, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching products:", error);
    return [];
  }

  renderFeatured(products);
  renderNewArrivals(products);
  return products;
}

function renderFeatured(products) {
  const container = document.getElementById("featured-products");
  const featured = products.filter(p => p.is_featured).slice(0, 8);

  container.innerHTML = featured.map(product => `
    <div class="col-lg-3 col-md-6 col-sm-12 pb-1">
      <div class="card product-item border-0 mb-4">
        <div class="card-header product-img position-relative overflow-hidden bg-transparent border p-0">
          <img class="img-fluid w-100" src="${product.image_url}" alt="${product.name}" style="height: 250px; object-fit: cover;">
        </div>
        <div class="card-body border-left border-right text-center p-0 pt-4 pb-3">
          <h6 class="text-truncate mb-3">${product.name}</h6>
          <div class="d-flex justify-content-center">
            <h6>Rp ${product.price.toLocaleString()}</h6>
            ${product.original_price ? `<h6 class="text-muted ml-2"><del>Rp ${product.original_price.toLocaleString()}</del></h6>` : ""}
          </div>
        </div>
        <div class="card-footer d-flex justify-content-between bg-light border">
          <a href="detail.html?id=${product.id}" class="btn btn-sm text-dark p-0">
            <i class="fas fa-eye text-primary mr-1"></i>Detail
          </a>
          <button class="btn btn-sm text-dark p-0 add-to-cart" data-product-id="${product.id}">
            <i class="fas fa-shopping-cart text-primary mr-1"></i>+ Keranjang
          </button>
        </div>
      </div>
    </div>
  `).join("");
}

function renderNewArrivals(products) {
  const container = document.getElementById("new-arrivals");
  const arrivals = products.filter(p => p.is_new_arrival).slice(0, 8);

  container.innerHTML = arrivals.map(product => `
    <div class="col-lg-3 col-md-6 col-sm-12 pb-1">
      <div class="card product-item border-0 mb-4">
        <div class="card-header product-img position-relative overflow-hidden bg-transparent border p-0">
          <img class="img-fluid w-100" src="${product.image_url}" alt="${product.name}" style="height: 250px; object-fit: cover;">
          ${product.is_new_arrival ? '<span class="position-absolute top-0 start-0 bg-danger text-white px-2 py-1">Baru</span>' : ''}
        </div>
        <div class="card-body border-left border-right text-center p-0 pt-4 pb-3">
          <h6 class="text-truncate mb-3">${product.name}</h6>
          <div class="d-flex justify-content-center">
            <h6>Rp ${product.price.toLocaleString()}</h6>
          </div>
        </div>
        <div class="card-footer d-flex justify-content-between bg-light border">
          <a href="detail.html?id=${product.id}" class="btn btn-sm text-dark p-0">
            <i class="fas fa-eye text-primary mr-1"></i>Detail
          </a>
          <button class="btn btn-sm text-dark p-0 add-to-cart" data-product-id="${product.id}">
            <i class="fas fa-shopping-cart text-primary mr-1"></i>+ Keranjang
          </button>
        </div>
      </div>
    </div>
  `).join("");
}

// Auto-fetch products saat halaman dimuat
document.addEventListener("DOMContentLoaded", fetchProducts);