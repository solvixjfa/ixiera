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
    const invoicesTableBody = document.getElementById('invoices-table-body');
    const invoiceModal = new bootstrap.Modal(document.getElementById('invoiceModal'));
    const invoiceForm = document.getElementById('invoiceForm');
    const addNewInvoiceBtn = document.getElementById('addNewInvoiceBtn');
    const invoiceItemsContainer = document.getElementById('invoice-items-container');
    const addItemBtn = document.getElementById('addItemBtn');
    const logoutLink = document.getElementById('logout-link');

    // --- Fungsi Bantuan ---
    const getStatusBadge = (status) => {
        let badgeClass = 'bg-secondary';
        if (status === 'Paid') badgeClass = 'bg-success';
        else if (status === 'Unpaid') badgeClass = 'bg-danger';
        else if (status === 'Overdue') badgeClass = 'bg-warning text-dark';
        return `<span class="badge ${badgeClass}">${status}</span>`;
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
    };

    const calculateTotalAmount = () => {
        let total = 0;
        document.querySelectorAll('.item-amount').forEach(input => {
            total += parseFloat(input.value) || 0;
        });
        document.getElementById('invoice-amount').value = total.toFixed(2);
    };

    const addItemField = (description = '', amount = '') => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'input-group mb-2';
        itemDiv.innerHTML = `
            <input type="text" class="form-control item-description" placeholder="Description" value="${description}">
            <input type="number" class="form-control item-amount" placeholder="Amount" step="0.01" value="${amount}">
            <button type="button" class="btn btn-outline-danger remove-item-btn"><i class="align-middle" data-feather="x"></i></button>
        `;
        invoiceItemsContainer.appendChild(itemDiv);
        feather.replace();
    };

    // --- Fungsi CRUD ---
    const fetchInvoices = async () => {
        const { data, error } = await supabase.from('invoices').select('*').order('created_at', { ascending: false });
        if (error) {
            console.error('Error fetching invoices:', error);
            return [];
        }
        return data;
    };

    const renderTable = (invoices) => {
        invoicesTableBody.innerHTML = '';
        if (invoices.length === 0) {
            invoicesTableBody.innerHTML = `<tr><td colspan="6" class="text-center">No invoices found.</td></tr>`;
            return;
        }

        invoices.forEach(invoice => {
            const row = document.createElement('tr');
            const dueDate = new Date(invoice.due_date).toLocaleDateString();

            row.innerHTML = `
                <td>${invoice.invoice_number}</td>
                <td>${invoice.client_name}</td>
                <td>${formatCurrency(invoice.amount)}</td>
                <td>${getStatusBadge(invoice.status)}</td>
                <td class="d-none d-md-table-cell">${dueDate}</td>
                <td class="d-none d-md-table-cell">
                    <button class="btn btn-info btn-sm edit-btn" data-id="${invoice.id}">
                        <i class="align-middle" data-feather="edit"></i> Edit
                    </button>
                    <a href="invoice-client.html?id=${invoice.id}" target="_blank" class="btn btn-primary btn-sm">
                        <i class="align-middle" data-feather="link"></i> View Public
                    </a>
                    <button class="btn btn-danger btn-sm delete-btn" data-id="${invoice.id}">
                        <i class="align-middle" data-feather="trash-2"></i> Delete
                    </button>
                </td>
            `;
            invoicesTableBody.appendChild(row);
        });
        feather.replace();
    };

    const handleSaveInvoice = async (e) => {
        e.preventDefault();
        const invoiceId = document.getElementById('invoice-id').value;
        const invoiceData = {
            invoice_number: document.getElementById('invoice-no').value,
            client_name: document.getElementById('client-name').value,
            amount: parseFloat(document.getElementById('invoice-amount').value),
            due_date: document.getElementById('due-date').value,
            status: document.getElementById('status-selector').value,
        };

        let invoiceRecord;

        if (invoiceId) {
            // Update mode
            const { data, error } = await supabase.from('invoices').update(invoiceData).eq('id', invoiceId).select().single();
            if (error) {
                console.error('Error updating invoice:', error);
                return;
            }
            invoiceRecord = data;
        } else {
            // Add mode
            const { data, error } = await supabase.from('invoices').insert([invoiceData]).select().single();
            if (error) {
                console.error('Error adding new invoice:', error);
                return;
            }
            invoiceRecord = data;
        }

        const items = [];
        document.querySelectorAll('#invoice-items-container .input-group').forEach(itemDiv => {
            items.push({
                invoice_id: invoiceRecord.id,
                description: itemDiv.querySelector('.item-description').value,
                amount: parseFloat(itemDiv.querySelector('.item-amount').value),
            });
        });

        await supabase.from('invoice_items').delete().eq('invoice_id', invoiceRecord.id);
        if (items.length > 0) {
            await supabase.from('invoice_items').insert(items);
        }

        invoiceModal.hide();
        invoiceForm.reset();
        loadInvoices();
    };

    const handleDelete = async (e) => {
        const invoiceId = e.target.closest('button').dataset.id;
        if (confirm('Are you sure you want to delete this invoice?')) {
            const { error: itemsError } = await supabase.from('invoice_items').delete().eq('invoice_id', invoiceId);
            if (itemsError) {
                console.error('Error deleting invoice items:', itemsError);
                return;
            }

            const { error: invoiceError } = await supabase.from('invoices').delete().eq('id', invoiceId);
            if (invoiceError) console.error('Error deleting invoice:', invoiceError);
            
            loadInvoices();
        }
    };

    // --- Pemuatan Data & Event Listeners ---
    const loadInvoices = async () => {
        const invoices = await fetchInvoices();
        renderTable(invoices);
    };

    addNewInvoiceBtn.addEventListener('click', () => {
        document.getElementById('invoiceModalLabel').textContent = 'Add New Invoice';
        document.getElementById('invoice-id').value = '';
        invoiceForm.reset();
        invoiceItemsContainer.innerHTML = '';
        addItemField();
        invoiceModal.show();
    });

    invoiceForm.addEventListener('submit', handleSaveInvoice);
    addItemBtn.addEventListener('click', () => addItemField());

    invoicesTableBody.addEventListener('click', async (e) => {
        const target = e.target.closest('button');
        if (!target) return;

        if (target.classList.contains('edit-btn')) {
            const invoiceId = target.dataset.id;
            const { data: invoice, error: invoiceError } = await supabase.from('invoices').select('*').eq('id', invoiceId).single();
            const { data: items, error: itemsError } = await supabase.from('invoice_items').select('*').eq('invoice_id', invoiceId);
            
            if (invoiceError || itemsError) {
                console.error('Error fetching data for edit:', invoiceError || itemsError);
                return;
            }

            document.getElementById('invoiceModalLabel').textContent = 'Edit Invoice';
            document.getElementById('invoice-id').value = invoice.id;
            document.getElementById('invoice-no').value = invoice.invoice_number;
            document.getElementById('client-name').value = invoice.client_name;
            document.getElementById('invoice-amount').value = invoice.amount;
            document.getElementById('due-date').value = invoice.due_date;
            document.getElementById('status-selector').value = invoice.status;

            invoiceItemsContainer.innerHTML = '';
            if (items.length > 0) {
                items.forEach(item => addItemField(item.description, item.amount));
            } else {
                addItemField();
            }

            invoiceModal.show();
        } else if (target.classList.contains('delete-btn')) {
            handleDelete(e);
        }
    });

    invoiceItemsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-item-btn')) {
            e.target.closest('.input-group').remove();
            calculateTotalAmount();
        }
    });

    invoiceItemsContainer.addEventListener('input', (e) => {
        if (e.target.classList.contains('item-amount')) {
            calculateTotalAmount();
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

    loadInvoices();
});
