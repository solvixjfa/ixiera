import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

document.addEventListener('DOMContentLoaded', async () => {
    // --- Konfigurasi Supabase ---
    const SUPABASE_URL = 'https://xtarsaurwclktwhhryas.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0YXJzYXVyd2Nsa3R3aGhyeWFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4MDM1ODksImV4cCI6MjA2NzM3OTU4OX0.ZAgs8NbZs8F2GuBVfiFYuyqOLrRC1hemdMyE-i4riYI';
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // --- Otentikasi Pengguna ---
    const { data: { session } } = await supabase.auth.getSession();
    const ALLOWED_UID = 'fb109bdd-584d-4f57-b50c-5069ba7ef12a';

    if (!session || session.user.id !== ALLOWED_UID) {
        window.location.href = 'login.html';
        return;
    }

    // --- Elemen DOM ---
    const productsTableBody = document.getElementById('products-table-body');
    const crudModal = new bootstrap.Modal(document.getElementById('crudModal'));
    const crudModalLabel = document.getElementById('crudModalLabel');
    const crudForm = document.getElementById('crudForm');
    const addNewBtn = document.getElementById('addNewBtn');
    const logoutLink = document.getElementById('logout-link');

    // --- Toast Elements ---
    const successToast = new bootstrap.Toast(document.getElementById('successToast'));
    const errorToast = new bootstrap.Toast(document.getElementById('errorToast'));

    let currentProductId = null;

    // --- Fungsi Utilitas ---
    const showSuccessToast = (message) => {
        document.getElementById('successToast').querySelector('.toast-body').textContent = message;
        successToast.show();
    };

    const showErrorToast = (message) => {
        document.getElementById('errorToast').querySelector('.toast-body').textContent = message;
        errorToast.show();
    };

    // --- Fungsi CRUD ---
    const fetchProducts = async () => {
        const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
        if (error) {
            console.error('Error fetching products:', error);
            showErrorToast('Error fetching product data.');
            return [];
        }
        return data;
    };

    const renderTable = (products) => {
        productsTableBody.innerHTML = '';
        products.forEach(product => {
            const row = document.createElement('tr');
            const statusText = product.is_active ? 'Active' : 'Inactive';
            const statusClass = product.is_active ? 'bg-success' : 'bg-danger';

            row.innerHTML = `
                <td>${product.name}</td>
                <td>${product.description.substring(0, 50)}${product.description.length > 50 ? '...' : ''}</td>
                <td>$${product.price}</td>
                <td><span class="badge ${statusClass}">${statusText}</span></td>
                <td>
                    <button class="btn btn-warning btn-sm edit-btn" data-id="${product.id}">
                        <i class="align-middle" data-feather="edit-2"></i> Edit
                    </button>
                    <button class="btn btn-danger btn-sm delete-btn" data-id="${product.id}">
                        <i class="align-middle" data-feather="trash-2"></i> Delete
                    </button>
                </td>
            `;
            productsTableBody.appendChild(row);
        });
        feather.replace();
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        const productName = document.getElementById('productName').value;
        const productDescription = document.getElementById('productDescription').value;
        const productPrice = document.getElementById('productPrice').value;
        const productStatus = document.getElementById('productStatus').value === 'true';

        const productData = {
            name: productName,
            description: productDescription,
            price: productPrice,
            is_active: productStatus,
        };

        if (currentProductId) {
            const { error } = await supabase.from('products').update(productData).eq('id', currentProductId);
            if (error) {
                console.error('Error updating product:', error);
                showErrorToast('Failed to update product.');
            } else {
                showSuccessToast('Product updated successfully!');
            }
        } else {
            const { error } = await supabase.from('products').insert([productData]);
            if (error) {
                console.error('Error creating product:', error);
                showErrorToast('Failed to add new product.');
            } else {
                showSuccessToast('New product added successfully!');
            }
        }
        
        crudModal.hide();
        loadProducts();
    };

    const handleDelete = async (e) => {
        const productId = e.target.closest('button').dataset.id;
        if (confirm('Are you sure you want to delete this product?')) {
            const { error } = await supabase.from('products').delete().eq('id', productId);
            if (error) {
                console.error('Error deleting product:', error);
                showErrorToast('Failed to delete product.');
            } else {
                showSuccessToast('Product deleted successfully!');
            }
            loadProducts();
        }
    };
    
    // --- Pemuatan Data & Event Listeners ---
    const loadProducts = async () => {
        const products = await fetchProducts();
        renderTable(products);
    };

    addNewBtn.addEventListener('click', () => {
        crudModalLabel.textContent = 'Add New Product';
        crudForm.reset();
        currentProductId = null;
    });

    crudForm.addEventListener('submit', handleFormSubmit);

    productsTableBody.addEventListener('click', async (e) => {
        const target = e.target.closest('.edit-btn, .delete-btn');
        if (!target) return;

        const productId = target.dataset.id;

        if (target.classList.contains('edit-btn')) {
            const { data, error } = await supabase.from('products').select('*').eq('id', productId).single();
            if (error) {
                console.error('Error fetching product for edit:', error);
                showErrorToast('Failed to fetch product for editing.');
                return;
            }

            crudModalLabel.textContent = 'Edit Product';
            document.getElementById('productId').value = data.id;
            document.getElementById('productName').value = data.name;
            document.getElementById('productDescription').value = data.description;
            document.getElementById('productPrice').value = data.price;
            document.getElementById('productStatus').value = data.is_active;
            currentProductId = data.id;
            crudModal.show();
        } else if (target.classList.contains('delete-btn')) {
            handleDelete(e);
        }
    });

    if (logoutLink) {
        logoutLink.addEventListener('click', async (e) => {
            e.preventDefault();
            await supabase.auth.signOut();
            window.location.href = 'login.html';
        });
    }

    const darkModeToggle = document.getElementById('darkModeToggle');

    const enableDarkMode = () => {
        document.body.classList.add('dark-mode');
        localStorage.setItem('theme', 'dark');
        if (typeof feather !== 'undefined') feather.replace();
    };

    const disableDarkMode = () => {
        document.body.classList.remove('dark-mode');
        localStorage.setItem('theme', 'light');
        if (typeof feather !== 'undefined') feather.replace();
    };

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        enableDarkMode();
    } else if (savedTheme === 'light') {
        disableDarkMode();
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        enableDarkMode();
    }

    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', (e) => {
            e.preventDefault();
            if (document.body.classList.contains('dark-mode')) {
                disableDarkMode();
            } else {
                enableDarkMode();
            }
        });
    }

    loadProducts();
});
