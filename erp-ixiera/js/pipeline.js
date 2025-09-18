// File: js/pipeline.js (Refactored)

import { supabase } from './supabaseClient.js';

// Definisikan kolom-kolom untuk Kanban Board
const KANBAN_COLUMNS = [
    { status: 'New Inquiry', color: 'primary' },
    { status: 'Contacted', color: 'info' },
    { status: 'Proposal Sent', color: 'warning' },
    { status: 'Won', color: 'success' },
    { status: 'Lost', color: 'danger' }
];

const kanbanBoard = document.getElementById('kanban-board');
const inquiriesTableBody = document.getElementById('inquiries-table-body');

// --- FUNGSI UTAMA UNTUK MEMUAT SEMUA DATA ---
async function loadPipelineData() {
    const { data: inquiries, error } = await supabase
        .from('project_inquiries')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching inquiries:', error);
        kanbanBoard.innerHTML = '<p class="text-danger">Failed to load pipeline data.</p>';
        inquiriesTableBody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Failed to load inquiries.</td></tr>';
        return;
    }

    renderKanbanBoard(inquiries);
    renderInquiriesTable(inquiries);
    initializeDragAndDrop();
    feather.replace();
}

// --- FUNGSI UNTUK MERENDER TAMPILAN ---

function renderKanbanBoard(inquiries) {
    kanbanBoard.innerHTML = ''; // Kosongkan papan

    KANBAN_COLUMNS.forEach(column => {
        const cardsForColumn = inquiries.filter(inq => inq.status === column.status);
        
        const columnWrapper = document.createElement('div');
        // Membuat kolom responsif
        columnWrapper.className = 'col-12 col-md-6 col-xl'; 
        
        columnWrapper.innerHTML = `
            <div class="card">
                <div class="card-header px-4 py-3">
                    <div class="d-flex justify-content-between align-items-center">
                        <h5 class="card-title mb-0 text-${column.color}">${column.status}</h5>
                        <span class="badge bg-${column.color}-light text-${column.color}">${cardsForColumn.length}</span>
                    </div>
                </div>
                <div class="card-body p-3 kanban-dropzone bg-light" data-status="${column.status}" style="min-height: 400px;">
                    ${cardsForColumn.map(inq => createCardHtml(inq)).join('')}
                </div>
            </div>
        `;
        kanbanBoard.appendChild(columnWrapper);
    });
}

function createCardHtml(inquiry) {
    return `
        <div class="card mb-3 shadow-sm kanban-draggable-card" draggable="true" data-id="${inquiry.id}">
            <div class="card-body p-3">
                <p class="card-title fw-bold mb-1">${inquiry.name || 'No Name'}</p>
                <p class="card-text text-muted small">${inquiry.message ? inquiry.message.substring(0, 70) + '...' : 'No message.'}</p>
                <small class="text-muted">${new Date(inquiry.created_at).toLocaleDateString('id-ID')}</small>
            </div>
        </div>
    `;
}

function renderInquiriesTable(inquiries) {
    inquiriesTableBody.innerHTML = '';
    if (inquiries.length === 0) {
        inquiriesTableBody.innerHTML = '<tr><td colspan="5" class="text-center">No inquiries found.</td></tr>';
        return;
    }
    
    inquiries.forEach(inq => {
        const row = `
            <tr>
                <td>${inq.name || '-'}</td>
                <td>${inq.email || '-'}</td>
                <td><span class="badge bg-secondary">${inq.status || 'N/A'}</span></td>
                <td class="d-none d-md-table-cell">${inq.budget ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(inq.budget) : '-'}</td>
                <td class="d-none d-md-table-cell">${new Date(inq.created_at).toLocaleDateString('id-ID')}</td>
            </tr>
        `;
        inquiriesTableBody.innerHTML += row;
    });
}

// --- FUNGSI UNTUK DRAG & DROP ---

function initializeDragAndDrop() {
    const cards = document.querySelectorAll('.kanban-draggable-card');
    const dropzones = document.querySelectorAll('.kanban-dropzone');

    cards.forEach(card => {
        card.addEventListener('dragstart', () => {
            card.classList.add('opacity-50');
        });
        card.addEventListener('dragend', () => {
            card.classList.remove('opacity-50');
        });
    });

    dropzones.forEach(zone => {
        zone.addEventListener('dragover', e => {
            e.preventDefault();
        });

        zone.addEventListener('drop', async (e) => {
            e.preventDefault();
            const draggingCard = document.querySelector('.opacity-50');
            if (!draggingCard) return;

            const newStatus = zone.dataset.status;
            const inquiryId = draggingCard.dataset.id;
            
            // Cek apakah drop di kolom yang sama
            if (draggingCard.parentElement === zone) return;
            
            zone.appendChild(draggingCard);
            await updateInquiryStatus(inquiryId, newStatus);
        });
    });
}

// --- FUNGSI UNTUK INTERAKSI DENGAN SUPABASE ---

async function updateInquiryStatus(id, newStatus) {
    const { error } = await supabase
        .from('project_inquiries')
        .update({ status: newStatus })
        .eq('id', id);

    if (error) {
        console.error('Failed to update status:', error);
        alert('Error: Could not update inquiry status. Reloading page.');
    } else {
        console.log(`Inquiry ${id} moved to ${newStatus}`);
    }
    loadPipelineData();
}

// --- EVENT LISTENER UTAMA ---
document.addEventListener('DOMContentLoaded', loadPipelineData);

