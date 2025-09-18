// File: js/customers.js

import { supabase } from './supabaseClient.js';

const tableBody = document.getElementById('customers-table-body');
const searchInput = document.getElementById('search-input');
const loadingIndicator = document.getElementById('loading-indicator');

let allCustomers = []; // Cache untuk menyimpan data agar tidak selalu query

// --- FUNGSI UTAMA UNTUK MEMUAT DATA PELANGGAN ---
async function loadCustomers() {
    showLoading(true);
    
    // Query ini sedikit kompleks:
    // 1. Mengambil semua leads (transaksi) beserta detail produknya.
    // 2. Mengambil detail klien dari project_inquiries (asumsi ada relasi atau cara menghubungkan).
    // Kita akan menggunakan RPC function di Supabase untuk kalkulasi ini agar lebih efisien.
    
    // Anda perlu membuat fungsi ini di Supabase SQL Editor Anda:
    /*
    CREATE OR REPLACE FUNCTION get_customer_summary()
    RETURNS TABLE(
        client_id UUID,
        name TEXT,
        company TEXT,
        email TEXT,
        total_spent NUMERIC,
        transaction_count BIGINT
    )
    AS $$
    BEGIN
        RETURN QUERY
        SELECT
            pi.client_id, -- Asumsi ada client_id di project_inquiries
            pi.name,
            pi.company,
            pi.email,
            SUM(l.quantity * p.price) AS total_spent,
            COUNT(l.id) AS transaction_count
        FROM
            project_inquiries pi
        JOIN
            leads_solvixone l ON pi.id = l.inquiry_id -- Asumsi ada relasi inquiry_id
        JOIN
            products p ON l.product_id = p.id
        GROUP BY
            pi.client_id, pi.name, pi.company, pi.email;
    END;
    $$ LANGUAGE plpgsql;
    */
    // Jika struktur Anda berbeda, kita perlu sesuaikan fungsinya.
    // Untuk sekarang, kita asumsikan client_id ada di leads_solvixone dan kita bisa join ke tabel lain untuk nama.
    // Mari kita buat query yang lebih sederhana untuk sementara.

    const { data, error } = await supabase.rpc('get_customer_summary_simple');
    /*
    -- Buat fungsi ini di Supabase SQL Editor:
    CREATE OR REPLACE FUNCTION get_customer_summary_simple()
    RETURNS TABLE(client_id uuid, total_spent numeric, transaction_count bigint) AS $$
    SELECT
        l.client_id,
        SUM(l.quantity * p.price) as total_spent,
        COUNT(l.id) as transaction_count
    FROM
        leads_solvixone l
    JOIN
        products p ON l.product_id = p.id
    WHERE l.client_id IS NOT NULL
    GROUP BY
        l.client_id;
    $$ LANGUAGE sql;
    */
   // Kita juga butuh nama dan email, jadi query ini belum sempurna.
   // Mari kita lakukan di sisi client untuk demonstrasi, walau kurang efisien.

    const { data: leads, error: leadsError } = await supabase
        .from('leads_solvixone')
        .select(`
            *,
            products ( price ),
            project_inquiries ( name, company, email )
        `); // Asumsi ada relasi ke project_inquiries

    if (leadsError) {
        console.error('Error fetching data:', leadsError);
        tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Error loading data.</td></tr>`;
        showLoading(false);
        return;
    }

    // Agregasi data di sisi client
    const customerData = leads.reduce((acc, lead) => {
        const inquiry = lead.project_inquiries;
        if (!inquiry) return acc; // Lewati jika tidak ada data inquiry terkait

        const customerId = inquiry.email; // Gunakan email sebagai ID unik
        if (!acc[customerId]) {
            acc[customerId] = {
                name: inquiry.name,
                company: inquiry.company || 'N/A',
                email: inquiry.email,
                totalSpent: 0,
                transactionCount: 0,
            };
        }
        acc[customerId].totalSpent += lead.quantity * lead.products.price;
        acc[customerId].transactionCount += 1;
        return acc;
    }, {});

    allCustomers = Object.values(customerData);
    renderTable(allCustomers);
    showLoading(false);
}

// --- FUNGSI UNTUK MERENDER TABEL ---
function renderTable(customers) {
    tableBody.innerHTML = ''; // Kosongkan tabel
    if (customers.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" class="text-center">No customers found.</td></tr>`;
        return;
    }

    customers.forEach(customer => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <div class="d-flex align-items-center">
                    <div class="avatar-sm me-3">
                        <div class="avatar-title rounded-circle bg-primary-light text-primary fw-bold">
                            ${customer.name.charAt(0).toUpperCase()}
                        </div>
                    </div>
                    <div>
                        <div class="fw-bold">${customer.name}</div>
                    </div>
                </div>
            </td>
            <td class="d-none d-xl-table-cell">${customer.company}</td>
            <td>${customer.email}</td>
            <td class="d-none d-md-table-cell fw-bold text-success">${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(customer.totalSpent)}</td>
            <td class="d-none d-md-table-cell">${customer.transactionCount}</td>
            <td>
                <a href="#" class="btn btn-sm btn-outline-primary">View</a>
                <button class="btn btn-sm btn-outline-danger ms-1 d-none d-sm-inline">Delete</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// --- FUNGSI BANTUAN ---
function showLoading(isLoading) {
    if (isLoading) {
        loadingIndicator.classList.remove('d-none');
    } else {
        loadingIndicator.classList.add('d-none');
    }
}

// --- EVENT LISTENERS ---
searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filteredCustomers = allCustomers.filter(customer => 
        customer.name.toLowerCase().includes(searchTerm) ||
        customer.email.toLowerCase().includes(searchTerm) ||
        (customer.company && customer.company.toLowerCase().includes(searchTerm))
    );
    renderTable(filteredCustomers);
});

document.addEventListener('DOMContentLoaded', loadCustomers);

