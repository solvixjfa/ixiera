// ===== PIPELINE APP - REAL-TIME VERSION =====
console.log('🚀 Pipeline App Starting...');
// Tambahkan di file pipeline-app.js
class MobileHandler {
    static init() {
        this.handleTouchEvents();
        this.handleKeyboard();
        this.preventZoom();
        this.fixViewportHeight();
    }

    static handleTouchEvents() {
        // Tambahkan touch feedback
        document.addEventListener('touchstart', () => {}, { passive: true });
        
        // Prevent double tap zoom
        let lastTouchEnd = 0;
        document.addEventListener('touchend', (event) => {
            const now = Date.now();
            if (now - lastTouchEnd <= 300) {
                event.preventDefault();
            }
            lastTouchEnd = now;
        }, { passive: false });
    }

    static handleKeyboard() {
        // Scroll ke input yang sedang aktif
        const inputs = document.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            input.addEventListener('focus', () => {
                setTimeout(() => {
                    input.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 300);
            });
        });
    }

    static preventZoom() {
        // Mencegah zoom dengan double tap di iOS
        document.addEventListener('gesturestart', (e) => {
            e.preventDefault();
        });
    }

    static fixViewportHeight() {
        // Fix untuk mobile viewport height
        const setVH = () => {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        };
        
        setVH();
        window.addEventListener('resize', setVH);
        window.addEventListener('orientationchange', setVH);
    }
}

// Panggil di initialization
document.addEventListener('DOMContentLoaded', () => {
    MobileHandler.init();
});
class PipelineApp {
    constructor() {
    this.currentPage = 'dashboard';
    this.theme = localStorage.getItem('pipeline-theme') || 'dark';
    this.sidebarOpen = false;
    this.supabase = window.supabaseClient;
    this.leads = [];
    this.realtimeSubscription = null;
    this.analytics = null; 
    this.init();
}
    async init() {
        console.log('🔄 Initializing app...');
        
        // Set theme
        this.setTheme(this.theme);
        
        // Setup events
        this.setupEvents();
        
        // Initialize Bootstrap tooltips
        this.initTooltips();
        
        // Initialize Supabase
        await this.initSupabase();
        
        // Load initial data
        await this.loadData();
        
        // Setup real-time subscription
        this.setupRealtime();
        
        // Hide loading screen
        setTimeout(() => {
            const loading = document.getElementById('loadingScreen');
            const app = document.querySelector('.app-container');
            if (loading) loading.style.display = 'none';
            if (app) app.style.display = 'flex';
        }, 1000);
        
        console.log('✅ App ready');
    }
    
    async initSupabase() {
        if (!this.supabase) {
            console.warn('⚠️ Supabase client not found, using demo mode');
            return false;
        }
        
        try {
            // Test connection
            const { data, error } = await this.supabase
                .from('leads')
                .select('count', { count: 'exact', head: true });
            
            if (error) {
                console.warn('⚠️ Supabase connection failed:', error.message);
                return false;
            }
            
            console.log('✅ Supabase connected successfully');
            return true;
        } catch (error) {
            console.error('❌ Supabase init error:', error);
            return false;
        }
    }
    
    async loadData() {
        console.log('📊 Loading data...');
        
        try {
            if (this.supabase) {
                // Load all leads
                const { data: leads, error } = await this.supabase
                    .from('leads')
                    .select('*')
                    .order('created_at', { ascending: false });
                
                if (error) throw error;
                
                this.leads = leads || [];
                this.updateAllStats();
                this.renderRecentLeads();
                this.renderAllLeadsTable();
                this.renderPipelineViews();
                
                console.log(`✅ Loaded ${this.leads.length} leads from Supabase`);
                return;
            }
        } catch (error) {
            console.warn('⚠️ Supabase load error:', error.message);
        }
        
        // Fallback to demo data
        this.loadDemoData();
        console.log('📊 Using demo data');
    }
    
    loadDemoData() {
        this.leads = [
            {
                id: '1',
                name: 'John Doe',
                email: 'john@example.com',
                phone: '+628123456789',
                company: 'PT. Contoh',
                source: 'instagram',
                temperature: 'hot',
                status: 'contacted',
                notes: 'Very interested in premium package',
                last_contacted: new Date().toISOString(),
                next_follow_up: new Date(Date.now() + 86400000).toISOString(),
                created_at: new Date().toISOString(),
                is_active: true
            },
            {
                id: '2',
                name: 'Sarah Lee',
                email: 'sarah@example.com',
                phone: '+628987654321',
                company: 'Tech Corp',
                source: 'referral',
                temperature: 'warm',
                status: 'new',
                notes: 'Referred by Mike Chan',
                last_contacted: null,
                next_follow_up: new Date().toISOString(),
                created_at: new Date().toISOString(),
                is_active: true
            },
            {
                id: '3',
                name: 'Michael Wong',
                email: 'michael@example.com',
                phone: '+6281122334455',
                company: 'Digital Solutions',
                source: 'facebook',
                temperature: 'cold',
                status: 'contacted',
                notes: 'Budget constraints',
                last_contacted: new Date(Date.now() - 3 * 86400000).toISOString(),
                next_follow_up: new Date().toISOString(),
                created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
                is_active: true
            }
        ];
        
        this.updateAllStats();
        this.renderRecentLeads();
        this.renderAllLeadsTable();
        this.renderPipelineViews();
    }
    
    updateAllStats() {
        const totalLeads = this.leads.length;
        const hotLeads = this.leads.filter(lead => lead.temperature === 'hot').length;
        const warmLeads = this.leads.filter(lead => lead.temperature === 'warm').length;
        const coldLeads = this.leads.filter(lead => lead.temperature === 'cold').length;
        
        // Calculate today's follow-ups
        const today = new Date().toISOString().split('T')[0];
        const followUps = this.leads.filter(lead => {
            if (!lead.next_follow_up) return false;
            const followUpDate = new Date(lead.next_follow_up).toISOString().split('T')[0];
            return followUpDate === today;
        }).length;
        
        // Calculate conversion rate
        const contactedLeads = this.leads.filter(lead => lead.status === 'contacted' || lead.status === 'qualified').length;
        const conversionRate = totalLeads > 0 ? Math.round((contactedLeads / totalLeads) * 100) : 0;
        
        // Update dashboard stats
        document.getElementById('statTotalLeads').textContent = totalLeads;
        document.getElementById('statHotLeads').textContent = hotLeads;
        document.getElementById('statFollowUps').textContent = followUps;
        document.getElementById('statConversion').textContent = `${conversionRate}%`;
        
        // Update sidebar counts
        document.getElementById('hotCount').textContent = hotLeads;
        document.getElementById('warmCount').textContent = warmLeads;
        document.getElementById('coldCount').textContent = coldLeads;
        document.getElementById('followUpCount').textContent = followUps;
        document.getElementById('totalLeadsCount').textContent = totalLeads;
    }
    
    renderRecentLeads() {
        const table = document.getElementById('recentLeadsTable');
        if (!table) return;
        
        const recentLeads = this.leads.slice(0, 5);
        
        if (recentLeads.length === 0) {
            table.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-4 text-secondary">
                        <i class="bi bi-inbox me-2"></i> No leads found
                    </td>
                </tr>
            `;
            return;
        }
        
        let html = '';
        recentLeads.forEach(lead => {
            html += `
                <tr>
                    <td>
                        <div class="fw-bold">${this.escapeHtml(lead.name)}</div>
                        <small class="text-secondary">${this.escapeHtml(lead.company || 'No company')}</small>
                    </td>
                    <td>
                        <div>📧 ${this.escapeHtml(lead.email)}</div>
                        <small class="text-secondary">📱 ${this.escapeHtml(lead.phone)}</small>
                    </td>
                    <td>
                        <span class="temp-badge ${lead.temperature}">
                            ${lead.temperature}
                        </span>
                    </td>
                    <td>
                        <span class="badge bg-secondary">
                            ${lead.status}
                        </span>
                    </td>
                    <td>
                        ${lead.last_contacted ? this.formatDate(lead.last_contacted) : 'Never'}
                    </td>
                    <td>
                        <span class="badge ${this.isToday(lead.next_follow_up) ? 'bg-danger' : 'bg-warning'}">
                            ${lead.next_follow_up ? this.formatDate(lead.next_follow_up) : 'Not set'}
                        </span>
                    </td>
                    <td>
                        <div class="d-flex gap-1">
                            <button class="btn btn-sm btn-outline-primary" onclick="app.viewLead('${lead.id}')">
                                <i class="bi bi-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-success" onclick="app.contactLead('${lead.id}')">
                                <i class="bi bi-chat"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-info" onclick="app.editLead('${lead.id}')">
                                <i class="bi bi-pencil"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        table.innerHTML = html;
    }
    
    renderAllLeadsTable() {
        const table = document.getElementById('allLeadsTable');
        if (!table) return;
        
        if (this.leads.length === 0) {
            table.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-4 text-secondary">
                        <i class="bi bi-inbox me-2"></i> No leads found
                    </td>
                </tr>
            `;
            return;
        }
        
        let html = '';
        this.leads.forEach(lead => {
            html += `
                <tr>
                    <td>${this.escapeHtml(lead.name)}</td>
                    <td>${this.escapeHtml(lead.email)}</td>
                    <td>${this.escapeHtml(lead.phone)}</td>
                    <td>
                        <span class="temp-badge ${lead.temperature}">
                            ${lead.temperature}
                        </span>
                    </td>
                    <td>
                        <span class="badge bg-secondary">
                            ${lead.status}
                        </span>
                    </td>
                    <td>${lead.last_contacted ? this.formatDate(lead.last_contacted) : 'Never'}</td>
                    <td>
                        <div class="d-flex gap-1">
                            <button class="btn btn-sm btn-outline-primary" onclick="app.viewLead('${lead.id}')">
                                <i class="bi bi-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-success" onclick="app.contactLead('${lead.id}')">
                                <i class="bi bi-chat"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-info" onclick="app.editLead('${lead.id}')">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="app.deleteLead('${lead.id}')">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        table.innerHTML = html;
    }
    
    renderPipelineViews() {
        // Render hot leads
        this.renderPipelineView('hot');
        this.renderPipelineView('warm');
        this.renderPipelineView('cold');
    }
    
    renderPipelineView(temperature) {
        const container = document.getElementById(`${temperature}LeadsGrid`);
        if (!container) return;
        
        const filteredLeads = this.leads.filter(lead => lead.temperature === temperature);
        
        if (filteredLeads.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="bi bi-inbox display-6 text-secondary mb-3"></i>
                    <p class="text-secondary">No ${temperature} leads found</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        filteredLeads.forEach(lead => {
            html += `
                <div class="col-12 col-md-6 col-lg-4">
                    <div class="lead-card">
                        <div class="d-flex justify-content-between align-items-start mb-3">
                            <div>
                                <h6 class="mb-1 fw-bold">${this.escapeHtml(lead.name)}</h6>
                                <small class="text-secondary">${this.escapeHtml(lead.company || 'No company')}</small>
                            </div>
                            <span class="temp-badge ${lead.temperature}">
                                ${lead.temperature}
                            </span>
                        </div>
                        
                        <div class="mb-3">
                            <div class="small text-secondary mb-1">
                                <i class="bi bi-envelope me-1"></i> ${this.escapeHtml(lead.email)}
                            </div>
                            <div class="small text-secondary">
                                <i class="bi bi-whatsapp me-1"></i> ${this.escapeHtml(lead.phone)}
                            </div>
                            <div class="small text-muted mt-1">
                                <i class="bi bi-calendar me-1"></i> Next: ${lead.next_follow_up ? this.formatDate(lead.next_follow_up) : 'Not set'}
                            </div>
                        </div>
                        
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="badge bg-secondary">${lead.status}</span>
                            <div class="d-flex gap-1">
                                <button class="btn btn-sm btn-outline-primary" onclick="app.viewLead('${lead.id}')">
                                    <i class="bi bi-eye"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-success" onclick="app.contactLead('${lead.id}')">
                                    <i class="bi bi-chat"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-warning" onclick="app.scheduleFollowup('${lead.id}')">
                                    <i class="bi bi-calendar-plus"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }
    
    async loadFollowups() {
        console.log('📅 Loading follow-ups...');
        
        const today = new Date().toISOString().split('T')[0];
        
        // Filter leads yang perlu follow-up hari ini
        const todaysFollowUps = this.leads.filter(lead => {
            if (!lead.next_follow_up) return false;
            const followUpDate = new Date(lead.next_follow_up).toISOString().split('T')[0];
            return followUpDate === today;
        });
        
        // Filter leads yang sudah lewat follow-up
        const overdueFollowUps = this.leads.filter(lead => {
            if (!lead.next_follow_up) return false;
            const followUpDate = new Date(lead.next_follow_up).toISOString().split('T')[0];
            return followUpDate < today;
        });
        
        this.renderFollowups(todaysFollowUps, overdueFollowUps);
    }
    
    renderFollowups(todaysFollowUps, overdueFollowUps) {
        const container = document.getElementById('followupsList');
        if (!container) {
            console.warn('⚠️ Container followupsList tidak ditemukan');
            return;
        }
        
        if (todaysFollowUps.length === 0 && overdueFollowUps.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="bi bi-check-circle display-6 text-success mb-3"></i>
                    <p class="text-secondary">Tidak ada follow-up hari ini</p>
                    <p class="text-muted small">Semua follow-up sudah selesai atau belum dijadwalkan</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        
        // Overdue Follow-ups
        if (overdueFollowUps.length > 0) {
            html += `
                <div class="mb-4">
                    <h5 class="text-danger mb-3">
                        <i class="bi bi-exclamation-triangle me-2"></i>
                        Overdue Follow-ups (${overdueFollowUps.length})
                    </h5>
            `;
            
            overdueFollowUps.forEach(lead => {
                const followUpDate = this.formatDate(lead.next_follow_up);
                
                html += `
                    <div class="followup-item overdue mb-3 p-3 border rounded">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <div>
                                <h6 class="mb-1 fw-bold">${this.escapeHtml(lead.name)}</h6>
                                <div class="small text-secondary">
                                    <i class="bi bi-telephone me-1"></i> ${this.escapeHtml(lead.phone)}
                                    <span class="mx-2">•</span>
                                    <i class="bi bi-calendar-x me-1"></i> ${followUpDate}
                                </div>
                            </div>
                            <span class="badge bg-danger">Terlambat</span>
                        </div>
                        
                        <div class="mb-2">
                            <small class="text-muted">Follow-up sudah lewat waktu</small>
                        </div>
                        
                        <div class="d-flex gap-2">
                            <button class="btn btn-sm btn-success" onclick="app.completeFollowup('${lead.id}')">
                                <i class="bi bi-check-circle me-1"></i> Selesai
                            </button>
                            <button class="btn btn-sm btn-primary" onclick="app.contactLead('${lead.id}')">
                                <i class="bi bi-chat me-1"></i> Hubungi Sekarang
                            </button>
                            <button class="btn btn-sm btn-outline-secondary" onclick="app.rescheduleFollowup('${lead.id}')">
                                <i class="bi bi-calendar-plus me-1"></i> Jadwalkan Ulang
                            </button>
                        </div>
                    </div>
                `;
            });
            
            html += `</div><hr>`;
        }
        
        // Today's Follow-ups
        if (todaysFollowUps.length > 0) {
            html += `
                <div class="mb-4">
                    <h5 class="text-warning mb-3">
                        <i class="bi bi-clock me-2"></i>
                        Today's Follow-ups (${todaysFollowUps.length})
                    </h5>
            `;
            
            todaysFollowUps.forEach(lead => {
                const lastContacted = lead.last_contacted ? this.formatDate(lead.last_contacted) : 'Belum pernah';
                
                html += `
                    <div class="followup-item today mb-3 p-3 border rounded">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <div>
                                <h6 class="mb-1 fw-bold">${this.escapeHtml(lead.name)}</h6>
                                <div class="small text-secondary">
                                    <i class="bi bi-telephone me-1"></i> ${this.escapeHtml(lead.phone)}
                                    <span class="mx-2">•</span>
                                    <i class="bi bi-envelope me-1"></i> ${this.escapeHtml(lead.email)}
                                </div>
                            </div>
                            <span class="badge bg-warning">Hari Ini</span>
                        </div>
                        
                        <div class="mb-2">
                            <div class="row small">
                                <div class="col-6">
                                    <i class="bi bi-buildings me-1"></i> ${this.escapeHtml(lead.company || 'Tidak ada')}
                                </div>
                                <div class="col-6">
                                    <i class="bi bi-calendar-check me-1"></i> Terakhir: ${lastContacted}
                                </div>
                            </div>
                        </div>
                        
                        <div class="d-flex gap-2">
                            <button class="btn btn-sm btn-success" onclick="app.completeFollowup('${lead.id}')">
                                <i class="bi bi-check-circle me-1"></i> Selesai
                            </button>
                            <button class="btn btn-sm btn-primary" onclick="app.contactLead('${lead.id}')">
                                <i class="bi bi-chat me-1"></i> Hubungi
                            </button>
                            <button class="btn btn-sm btn-outline-secondary" onclick="app.viewLead('${lead.id}')">
                                <i class="bi bi-eye me-1"></i> Detail
                            </button>
                        </div>
                    </div>
                `;
            });
            
            html += `</div>`;
        }
        
        container.innerHTML = html;
    }
    
    async completeFollowup(leadId) {
        const lead = this.leads.find(l => l.id === leadId);
        if (!lead) {
            this.showToast('Lead tidak ditemukan', 'error');
            return;
        }
        
        try {
            // Update next_follow_up ke 3 hari lagi
            const newFollowUpDate = new Date(Date.now() + 3 * 86400000).toISOString();
            
            if (this.supabase) {
                const { error } = await this.supabase
                    .from('leads')
                    .update({
                        last_contacted: new Date().toISOString(),
                        next_follow_up: newFollowUpDate
                    })
                    .eq('id', leadId);
                
                if (error) throw error;
            }
            
            // Update local data
            const leadIndex = this.leads.findIndex(l => l.id === leadId);
            if (leadIndex !== -1) {
                this.leads[leadIndex].last_contacted = new Date().toISOString();
                this.leads[leadIndex].next_follow_up = newFollowUpDate;
            }
            
            this.showToast('Follow-up selesai! Next follow-up dijadwalkan 3 hari lagi', 'success');
            
            // Refresh follow-ups list
            setTimeout(() => {
                this.loadFollowups();
                this.updateAllStats();
            }, 500);
            
        } catch (error) {
            console.error('❌ Error completing follow-up:', error);
            this.showToast('Gagal menyelesaikan follow-up', 'error');
        }
    }
    
    scheduleFollowup(leadId) {
        const lead = this.leads.find(l => l.id === leadId);
        if (!lead) {
            this.showToast('Lead tidak ditemukan', 'error');
            return;
        }
        
        this.rescheduleFollowup(leadId);
    }
    
    rescheduleFollowup(leadId) {
        const lead = this.leads.find(l => l.id === leadId);
        if (!lead) {
            this.showToast('Lead tidak ditemukan', 'error');
            return;
        }
        
        const modalHtml = `
            <div class="modal fade" id="rescheduleModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Jadwalkan Ulang Follow-up</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="mb-3">
                                <label class="form-label">Untuk: ${this.escapeHtml(lead.name)}</label>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Tanggal Follow-up Baru</label>
                                <input type="date" id="newFollowUpDate" class="form-control" 
                                       value="${new Date(Date.now() + 86400000).toISOString().split('T')[0]}">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Catatan (opsional)</label>
                                <textarea id="followUpNotes" class="form-control" rows="2" 
                                          placeholder="Alasan penjadwalan ulang..."></textarea>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Batal</button>
                            <button type="button" class="btn btn-primary" onclick="app.saveReschedule('${leadId}')">
                                Simpan Jadwal Baru
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHtml;
        document.body.appendChild(modalContainer);
        
        const modal = new bootstrap.Modal(document.getElementById('rescheduleModal'));
        modal.show();
        
        document.getElementById('rescheduleModal').addEventListener('hidden.bs.modal', () => {
            modalContainer.remove();
        });
    }
    
    async saveReschedule(leadId) {
        const newDateInput = document.getElementById('newFollowUpDate');
        const notesInput = document.getElementById('followUpNotes');
        
        if (!newDateInput || !newDateInput.value) {
            this.showToast('Harap pilih tanggal', 'error');
            return;
        }
        
        const newDate = new Date(newDateInput.value + 'T12:00:00').toISOString();
        
        try {
            if (this.supabase) {
                const { error } = await this.supabase
                    .from('leads')
                    .update({
                        next_follow_up: newDate,
                        notes: notesInput.value || null
                    })
                    .eq('id', leadId);
                
                if (error) throw error;
            }
            
            // Update local data
            const leadIndex = this.leads.findIndex(l => l.id === leadId);
            if (leadIndex !== -1) {
                this.leads[leadIndex].next_follow_up = newDate;
                if (notesInput.value) {
                    this.leads[leadIndex].notes = notesInput.value;
                }
            }
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('rescheduleModal'));
            modal.hide();
            
            this.showToast('Follow-up dijadwalkan ulang', 'success');
            
            // Refresh follow-ups
            setTimeout(() => {
                this.loadFollowups();
                this.updateAllStats();
                this.renderPipelineViews();
                this.renderAllLeadsTable();
                this.renderRecentLeads();
            }, 500);
            
        } catch (error) {
            console.error('❌ Error rescheduling:', error);
            this.showToast('Gagal menjadwalkan ulang', 'error');
        }
    }
    
    // EDIT LEAD FUNCTION
    async editLead(leadId) {
        const lead = this.leads.find(l => l.id === leadId);
        if (!lead) {
            this.showToast('Lead tidak ditemukan', 'error');
            return;
        }
        
        const modalHtml = `
            <div class="modal fade" id="editLeadModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Edit Lead: ${this.escapeHtml(lead.name)}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="editLeadForm">
                                <div class="row">
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label">Nama Lengkap *</label>
                                        <input type="text" class="form-control" id="editLeadName" value="${this.escapeHtml(lead.name)}" required>
                                    </div>
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label">Email *</label>
                                        <input type="email" class="form-control" id="editLeadEmail" value="${this.escapeHtml(lead.email)}" required>
                                    </div>
                                </div>
                                
                                <div class="row">
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label">WhatsApp *</label>
                                        <input type="tel" class="form-control" id="editLeadPhone" value="${this.escapeHtml(lead.phone)}" required>
                                    </div>
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label">Perusahaan</label>
                                        <input type="text" class="form-control" id="editLeadCompany" value="${this.escapeHtml(lead.company || '')}">
                                    </div>
                                </div>
                                
                                <div class="row">
                                    <div class="col-md-4 mb-3">
                                        <label class="form-label">Source</label>
                                        <select class="form-select" id="editLeadSource">
                                            <option value="instagram" ${lead.source === 'instagram' ? 'selected' : ''}>Instagram</option>
                                            <option value="facebook" ${lead.source === 'facebook' ? 'selected' : ''}>Facebook</option>
                                            <option value="referral" ${lead.source === 'referral' ? 'selected' : ''}>Referral</option>
                                            <option value="manual" ${lead.source === 'manual' ? 'selected' : ''}>Manual</option>
                                            <option value="website" ${lead.source === 'website' ? 'selected' : ''}>Website</option>
                                        </select>
                                    </div>
                                    <div class="col-md-4 mb-3">
                                        <label class="form-label">Temperature</label>
                                        <select class="form-select" id="editLeadTemperature">
                                            <option value="hot" ${lead.temperature === 'hot' ? 'selected' : ''}>🔥 Hot</option>
                                            <option value="warm" ${lead.temperature === 'warm' ? 'selected' : ''}>😊 Warm</option>
                                            <option value="cold" ${lead.temperature === 'cold' ? 'selected' : ''}>🥶 Cold</option>
                                        </select>
                                    </div>
                                    <div class="col-md-4 mb-3">
                                        <label class="form-label">Status</label>
                                        <select class="form-select" id="editLeadStatus">
                                            <option value="new" ${lead.status === 'new' ? 'selected' : ''}>New</option>
                                            <option value="contacted" ${lead.status === 'contacted' ? 'selected' : ''}>Contacted</option>
                                            <option value="qualified" ${lead.status === 'qualified' ? 'selected' : ''}>Qualified</option>
                                            <option value="converted" ${lead.status === 'converted' ? 'selected' : ''}>Converted</option>
                                            <option value="lost" ${lead.status === 'lost' ? 'selected' : ''}>Lost</option>
                                        </select>
                                    </div>
                                </div>
                                
                                <div class="mb-3">
                                    <label class="form-label">Catatan</label>
                                    <textarea class="form-control" id="editLeadNotes" rows="3">${this.escapeHtml(lead.notes || '')}</textarea>
                                </div>
                                
                                <div class="row">
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label">Terakhir Kontak</label>
                                        <input type="date" class="form-control" id="editLeadLastContacted" 
                                               value="${lead.last_contacted ? new Date(lead.last_contacted).toISOString().split('T')[0] : ''}">
                                    </div>
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label">Next Follow-up</label>
                                        <input type="date" class="form-control" id="editLeadNextFollowUp" 
                                               value="${lead.next_follow_up ? new Date(lead.next_follow_up).toISOString().split('T')[0] : ''}">
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Batal</button>
                            <button type="button" class="btn btn-primary" onclick="app.saveEditedLead('${leadId}')">
                                Simpan Perubahan
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHtml;
        document.body.appendChild(modalContainer);
        
        const modal = new bootstrap.Modal(document.getElementById('editLeadModal'));
        modal.show();
        
        document.getElementById('editLeadModal').addEventListener('hidden.bs.modal', () => {
            modalContainer.remove();
        });
    }
    
    async saveEditedLead(leadId) {
        const leadData = {
            name: document.getElementById('editLeadName').value,
            email: document.getElementById('editLeadEmail').value,
            phone: document.getElementById('editLeadPhone').value,
            company: document.getElementById('editLeadCompany').value || '',
            source: document.getElementById('editLeadSource').value,
            temperature: document.getElementById('editLeadTemperature').value,
            status: document.getElementById('editLeadStatus').value,
            notes: document.getElementById('editLeadNotes').value,
            last_contacted: document.getElementById('editLeadLastContacted').value ? 
                new Date(document.getElementById('editLeadLastContacted').value + 'T12:00:00').toISOString() : null,
            next_follow_up: document.getElementById('editLeadNextFollowUp').value ? 
                new Date(document.getElementById('editLeadNextFollowUp').value + 'T12:00:00').toISOString() : null,
            updated_at: new Date().toISOString()
        };
        
        try {
            if (this.supabase) {
                const { error } = await this.supabase
                    .from('leads')
                    .update(leadData)
                    .eq('id', leadId);
                
                if (error) throw error;
            }
            
            // Update local data
            const leadIndex = this.leads.findIndex(l => l.id === leadId);
            if (leadIndex !== -1) {
                this.leads[leadIndex] = { ...this.leads[leadIndex], ...leadData };
            }
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('editLeadModal'));
            modal.hide();
            
            this.showToast('Lead berhasil diperbarui', 'success');
            
            // Refresh UI
            setTimeout(() => {
                this.updateAllStats();
                this.renderRecentLeads();
                this.renderAllLeadsTable();
                this.renderPipelineViews();
            }, 500);
            
        } catch (error) {
            console.error('❌ Error updating lead:', error);
            this.showToast('Gagal memperbarui lead', 'error');
        }
    }
    
    // TAMBAHKAN METHOD INI UNTUK ESCAPE HTML
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    setupRealtime() {
        if (!this.supabase) return;
        
        try {
            // Subscribe to leads table changes
            this.realtimeSubscription = this.supabase
                .channel('leads-channel')
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'leads'
                    },
                    (payload) => {
                        console.log('🔔 Real-time update:', payload);
                        this.handleRealtimeUpdate(payload);
                    }
                )
                .subscribe();
            
            console.log('✅ Real-time subscription active');
        } catch (error) {
            console.warn('⚠️ Real-time setup failed:', error.message);
        }
    }
    
    handleRealtimeUpdate(payload) {
    const { eventType, new: newData, old: oldData } = payload;
    
    switch (eventType) {
        case 'INSERT':
            this.leads.unshift(newData);
            break;
        case 'UPDATE':
            const index = this.leads.findIndex(lead => lead.id === newData.id);
            if (index !== -1) {
                this.leads[index] = newData;
            }
            break;
        case 'DELETE':
            this.leads = this.leads.filter(lead => lead.id !== oldData.id);
            break;
    }
    
    // Update UI
    this.updateAllStats();
    this.renderRecentLeads();
    this.renderAllLeadsTable();
    this.renderPipelineViews();
    
    // ===== TAMBAHKAN INI =====
    // Refresh analytics jika sedang di halaman analytics
    if (this.currentPage === 'analytics' && this.analytics) {
        this.analytics.refresh();
    }
    // ========================
    
    // Show notification
    this.showToast(`Lead ${eventType.toLowerCase()}d`, 'info');
}
    async saveLead() {
        const form = document.getElementById('addLeadForm');
        if (!form) return;
        
        const leadData = {
            name: document.getElementById('leadName').value,
            email: document.getElementById('leadEmail').value,
            phone: document.getElementById('leadWhatsApp').value,
            company: document.getElementById('leadCompany').value || '',
            source: document.getElementById('leadSource').value,
            temperature: document.getElementById('leadTemperature').value,
            status: document.getElementById('leadStatus').value,
            notes: '',
            last_contacted: null,
            next_follow_up: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
            created_at: new Date().toISOString(),
            is_active: true
        };
        
        console.log('Saving lead:', leadData);
        
        try {
            if (this.supabase) {
                const { data, error } = await this.supabase
                    .from('leads')
                    .insert([leadData])
                    .select();
                
                if (error) throw error;
                
                this.showToast('Lead saved to database!', 'success');
                console.log('✅ Saved to Supabase:', data);
            } else {
                // Demo mode
                leadData.id = Date.now().toString();
                this.leads.unshift(leadData);
                this.showToast('Lead saved (demo mode)', 'success');
            }
            
            // Reset form
            form.reset();
            
            // Update UI
            this.updateAllStats();
            this.renderRecentLeads();
            this.renderAllLeadsTable();
            this.renderPipelineViews();
            
            // Go to dashboard
            setTimeout(() => {
                this.showPage('dashboard');
            }, 1000);
            
        } catch (error) {
            console.error('❌ Save error:', error);
            this.showToast('Save failed. Check console.', 'error');
        }
    }
    
    async deleteLead(leadId) {
        if (!confirm('Are you sure you want to delete this lead?')) return;
        
        try {
            if (this.supabase) {
                const { error } = await this.supabase
                    .from('leads')
                    .delete()
                    .eq('id', leadId);
                
                if (error) throw error;
                
                this.showToast('Lead deleted', 'success');
            } else {
                // Demo mode
                this.leads = this.leads.filter(lead => lead.id !== leadId);
                this.updateAllStats();
                this.renderRecentLeads();
                this.renderAllLeadsTable();
                this.renderPipelineViews();
                this.showToast('Lead deleted (demo mode)', 'success');
            }
        } catch (error) {
            console.error('❌ Delete error:', error);
            this.showToast('Delete failed', 'error');
        }
    }
    
    viewLead(leadId) {
        const lead = this.leads.find(l => l.id === leadId);
        if (!lead) {
            this.showToast('Lead not found', 'error');
            return;
        }
        
        // Show lead details in modal
        const modalHtml = `
            <div class="modal fade" id="leadModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">${this.escapeHtml(lead.name)}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <p><strong>Email:</strong> ${this.escapeHtml(lead.email)}</p>
                                    <p><strong>Phone:</strong> ${this.escapeHtml(lead.phone)}</p>
                                    <p><strong>Company:</strong> ${this.escapeHtml(lead.company || 'N/A')}</p>
                                    <p><strong>Source:</strong> ${this.escapeHtml(lead.source)}</p>
                                </div>
                                <div class="col-md-6">
                                    <p><strong>Temperature:</strong> <span class="temp-badge ${lead.temperature}">${lead.temperature}</span></p>
                                    <p><strong>Status:</strong> <span class="badge bg-secondary">${lead.status}</span></p>
                                    <p><strong>Created:</strong> ${this.formatDate(lead.created_at)}</p>
                                    <p><strong>Last Contact:</strong> ${lead.last_contacted ? this.formatDate(lead.last_contacted) : 'Never'}</p>
                                </div>
                            </div>
                            ${lead.notes ? `<hr><p><strong>Notes:</strong><br>${this.escapeHtml(lead.notes)}</p>` : ''}
                            <hr>
                            <div class="d-flex gap-2">
                                <button class="btn btn-primary" onclick="app.contactLead('${lead.id}')">
                                    <i class="bi bi-chat me-1"></i> Contact
                                </button>
                                <button class="btn btn-info" onclick="app.editLead('${lead.id}')">
                                    <i class="bi bi-pencil me-1"></i> Edit
                                </button>
                                <button class="btn btn-warning" onclick="app.scheduleFollowup('${lead.id}')">
                                    <i class="bi bi-calendar-plus me-1"></i> Schedule Follow-up
                                </button>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Create and show modal
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHtml;
        document.body.appendChild(modalContainer);
        
        const modal = new bootstrap.Modal(document.getElementById('leadModal'));
        modal.show();
        
        // Remove modal from DOM after hidden
        document.getElementById('leadModal').addEventListener('hidden.bs.modal', () => {
            modalContainer.remove();
        });
    }
    
    contactLead(leadId) {
        const lead = this.leads.find(l => l.id === leadId);
        if (!lead) {
            this.showToast('Lead not found', 'error');
            return;
        }
        
        // Update last contacted date
        if (this.supabase) {
            this.supabase
                .from('leads')
                .update({ last_contacted: new Date().toISOString() })
                .eq('id', leadId);
        }
        
        // Open contact options
        const whatsappUrl = `https://wa.me/${lead.phone.replace(/\D/g, '')}`;
        const emailUrl = `mailto:${lead.email}`;
        
        const modalHtml = `
            <div class="modal fade" id="contactModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Contact ${this.escapeHtml(lead.name)}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="d-grid gap-2">
                                <a href="${whatsappUrl}" target="_blank" class="btn btn-success">
                                    <i class="bi bi-whatsapp me-2"></i> WhatsApp
                                </a>
                                <a href="${emailUrl}" class="btn btn-primary">
                                    <i class="bi bi-envelope me-2"></i> Email
                                </a>
                                <button type="button" class="btn btn-outline-secondary" onclick="navigator.clipboard.writeText('${this.escapeHtml(lead.phone)}')">
                                    <i class="bi bi-clipboard me-2"></i> Copy Phone Number
                                </button>
                            </div>
                            <div class="mt-3">
                                <small class="text-muted">Klik tombol di atas akan membuka aplikasi terkait</small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHtml;
        document.body.appendChild(modalContainer);
        
        const modal = new bootstrap.Modal(document.getElementById('contactModal'));
        modal.show();
        
        document.getElementById('contactModal').addEventListener('hidden.bs.modal', () => {
            modalContainer.remove();
        });
    }
    
    showPage(page) {
    console.log('Showing page:', page);
    
    // Update current page
    this.currentPage = page; // <-- INI PENTING!
    
    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    
    // Update nav
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    
    // Show selected page
    const pageEl = document.getElementById(`page-${page}`);
    const navLink = document.querySelector(`[data-page="${page}"]`);
    
    if (pageEl) pageEl.classList.add('active');
    if (navLink) navLink.classList.add('active');
    
    // Update title
    const titles = {
        'dashboard': 'Dashboard',
        'add': 'Add New Lead',
        'hot': 'Hot Leads',
        'warm': 'Warm Leads',
        'cold': 'Cold Leads',
        'all': 'All Leads',
        'scripts': 'Script Library',
        'followups': 'Follow-ups',
        'analytics': 'Analytics',
        'export': 'Export Data',
        'settings': 'Settings'
    };
    
    const titleEl = document.getElementById('pageTitle');
    if (titleEl && titles[page]) {
        titleEl.textContent = titles[page];
    }
    
    // ===== TAMBAHKAN INI UNTUK ANALYTICS =====
    if (page === 'analytics') {
        setTimeout(() => {
            if (!this.analytics) {
                console.log('📊 Initializing analytics module...');
                this.analytics = new PipelineAnalytics(this);
            } else {
                // Refresh analytics data
                this.analytics.refresh();
            }
        }, 100);
    }
    // ========================================
    
    // Auto-load data for specific pages
    if (page === 'followups') {
        setTimeout(() => {
            this.loadFollowups();
        }, 100);
    }
    
    // Close sidebar on mobile
    if (window.innerWidth < 992) {
        this.toggleSidebar(false);
    }
}
    setTheme(theme) {
        this.theme = theme;
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem('pipeline-theme', theme);
        
        // Update theme toggle icons
        const sunIcons = document.querySelectorAll('#sunIcon, #desktopSunIcon');
        const moonIcons = document.querySelectorAll('#moonIcon, #desktopMoonIcon');
        
        if (theme === 'dark') {
            sunIcons.forEach(icon => icon.classList.add('d-none'));
            moonIcons.forEach(icon => icon.classList.remove('d-none'));
        } else {
            sunIcons.forEach(icon => icon.classList.remove('d-none'));
            moonIcons.forEach(icon => icon.classList.add('d-none'));
        }
    }
    
    toggleTheme() {
        const newTheme = this.theme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
        this.showToast(`Switched to ${newTheme} mode`, 'info');
    }
    
    toggleSidebar(show) {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;
        
        if (show === undefined) {
            this.sidebarOpen = !this.sidebarOpen;
        } else {
            this.sidebarOpen = show;
        }
        
        if (this.sidebarOpen) {
            sidebar.classList.add('active');
        } else {
            sidebar.classList.remove('active');
        }
    }
    
    setupEvents() {
        console.log('🔗 Setting up events...');
        
        // Nav links
        document.querySelectorAll('.nav-link[data-page]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.getAttribute('data-page');
                this.showPage(page);
            });
        });
        
        // Theme toggles
        document.getElementById('themeToggle')?.addEventListener('click', () => this.toggleTheme());
        document.getElementById('mobileThemeToggle')?.addEventListener('click', () => this.toggleTheme());
        
        // Mobile menu
        document.getElementById('mobileMenuToggle')?.addEventListener('click', () => this.toggleSidebar(true));
        document.getElementById('sidebarClose')?.addEventListener('click', () => this.toggleSidebar(false));
        
        // Add lead form
        const addForm = document.getElementById('addLeadForm');
        if (addForm) {
            addForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveLead();
            });
        }
        
        // Logout
        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            if (confirm('Are you sure you want to logout?')) {
                this.showToast('Logged out', 'success');
                // Here you would typically redirect to login page
            }
        });
        
        // Global search
        const searchInput = document.getElementById('globalSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchLeads(e.target.value);
            });
        }
        
        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', (e) => {
            if (window.innerWidth < 992 && this.sidebarOpen) {
                const sidebar = document.getElementById('sidebar');
                const mobileToggle = document.getElementById('mobileMenuToggle');
                
                if (!sidebar.contains(e.target) && !mobileToggle.contains(e.target)) {
                    this.toggleSidebar(false);
                }
            }
        });
        
        console.log('✅ Events setup');
    }
    
    initTooltips() {
        const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
        tooltipTriggerList.forEach(tooltipTriggerEl => {
            new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }
    
    searchLeads(query) {
        if (!query.trim()) {
            this.renderAllLeadsTable();
            return;
        }
        
        const searchTerm = query.toLowerCase();
        const filteredLeads = this.leads.filter(lead => 
            lead.name.toLowerCase().includes(searchTerm) ||
            lead.email.toLowerCase().includes(searchTerm) ||
            lead.phone.includes(searchTerm) ||
            (lead.company && lead.company.toLowerCase().includes(searchTerm))
        );
        
        this.renderSearchResults(filteredLeads);
    }
    
    renderSearchResults(leads) {
        const table = document.getElementById('allLeadsTable');
        if (!table) return;
        
        if (leads.length === 0) {
            table.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-4 text-secondary">
                        <i class="bi bi-search me-2"></i> No matching leads found
                    </td>
                </tr>
            `;
            return;
        }
        
        let html = '';
        leads.forEach(lead => {
            html += `
                <tr>
                    <td>${this.escapeHtml(lead.name)}</td>
                    <td>${this.escapeHtml(lead.email)}</td>
                    <td>${this.escapeHtml(lead.phone)}</td>
                    <td>
                        <span class="temp-badge ${lead.temperature}">
                            ${lead.temperature}
                        </span>
                    </td>
                    <td>
                        <span class="badge bg-secondary">
                            ${lead.status}
                        </span>
                    </td>
                    <td>${lead.last_contacted ? this.formatDate(lead.last_contacted) : 'Never'}</td>
                    <td>
                        <div class="d-flex gap-1">
                            <button class="btn btn-sm btn-outline-primary" onclick="app.viewLead('${lead.id}')">
                                <i class="bi bi-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-success" onclick="app.contactLead('${lead.id}')">
                                <i class="bi bi-chat"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        table.innerHTML = html;
    }
    
    showToast(message, type = 'success') {
        const toastEl = document.getElementById('toast');
        const toastMessage = document.getElementById('toastMessage');
        
        if (!toastEl || !toastMessage) return;
        
        // Set message saja (tanpa title)
        toastMessage.textContent = message;
        
        // Set toast color based on type
        toastEl.className = 'toast';
        if (type === 'success') {
            toastEl.classList.add('bg-success', 'text-white');
        } else if (type === 'error') {
            toastEl.classList.add('bg-danger', 'text-white');
        } else if (type === 'info') {
            toastEl.classList.add('bg-info', 'text-white');
        } else if (type === 'warning') {
            toastEl.classList.add('bg-warning', 'text-dark');
        }
        
        // Show toast
        const toast = new bootstrap.Toast(toastEl);
        toast.show();
    }
    
    exportData(type) {
        let dataToExport = [];
        
        switch (type) {
            case 'hot':
                dataToExport = this.leads.filter(lead => lead.temperature === 'hot');
                break;
            case 'warm':
                dataToExport = this.leads.filter(lead => lead.temperature === 'warm');
                break;
            case 'cold':
                dataToExport = this.leads.filter(lead => lead.temperature === 'cold');
                break;
            case 'all':
                dataToExport = this.leads;
                break;
        }
        
        if (dataToExport.length === 0) {
            this.showToast('No data to export', 'warning');
            return;
        }
        
        // Convert to CSV
        const headers = ['Name', 'Email', 'Phone', 'Company', 'Source', 'Temperature', 'Status', 'Last Contacted', 'Next Follow-up'];
        const csv = [
            headers.join(','),
            ...dataToExport.map(lead => [
                `"${lead.name}"`,
                `"${lead.email}"`,
                `"${lead.phone}"`,
                `"${lead.company || ''}"`,
                `"${lead.source}"`,
                `"${lead.temperature}"`,
                `"${lead.status}"`,
                `"${lead.last_contacted || ''}"`,
                `"${lead.next_follow_up || ''}"`
            ].join(','))
        ].join('\n');
        
        // Download CSV
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}-leads-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        this.showToast(`Exported ${dataToExport.length} leads`, 'success');
    }
    
    // Utility functions
    formatDate(dateString) {
        if (!dateString) return 'Never';
        const date = new Date(dateString);
        return date.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    }
    
    isToday(dateString) {
        if (!dateString) return false;
        const today = new Date().toISOString().split('T')[0];
        const date = new Date(dateString).toISOString().split('T')[0];
        return today === date;
    }
}

// Initialize app
let app;

document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM ready, starting app...');
    app = new PipelineApp();
    window.app = app;
    
    // Global functions for onclick attributes
    window.Pipeline = {
        showPage: (page) => app.showPage(page),
        exportData: (type) => app.exportData(type),
        hideToast: () => app.hideToast(),
        toggleTheme: () => app.toggleTheme(),
        loadFollowups: () => app.loadFollowups(),
        showToast: (message, type) => app.showToast(message, type)
    };
});

console.log('👨‍💻 Pipeline App loaded');