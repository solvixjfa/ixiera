

console.log('📚 Memuat Script Library...');

class ScriptLibrary {
    constructor() {
        this.supabase = window.supabaseClient;
        this.scripts = [];
        this.kategoriSekarang = 'all';
        this.idScriptSekarang = null;
        
        this.init();
    }
    
    async init() {
        console.log('🔄 Menginisialisasi Script Library...');
        
        // Muat script dari Supabase
        await this.muatScripts();
        
        // Setup event listeners
        this.setupEvents();
        
        console.log('✅ Script Library siap digunakan');
    }
    
    async muatScripts() {
        try {
            if (this.supabase) {
                console.log('🔍 Mengambil data dari Supabase...');
                
                // Gunakan SELECT dengan kolom yang benar
                const { data, error } = await this.supabase
                    .from('scripts')
                    .select('*')
                    .order('created_at', { ascending: false });
                
                if (error) {
                    console.error('❌ Error Supabase:', error);
                    throw error;
                }
                
                this.scripts = data || [];
                this.renderScripts();
                console.log(`✅ Berhasil memuat ${this.scripts.length} script dari Supabase`);
                return;
            } else {
                console.warn('⚠️ Supabase client tidak ditemukan');
            }
        } catch (error) {
            console.warn('⚠️ Error memuat dari Supabase:', error.message);
        }
        
        // Fallback ke data demo
        this.muatScriptsDemo();
    }
    
    muatScriptsDemo() {
        this.scripts = [
            {
                id: '1',
                title: 'Cold Call Opening',
                category: 'opening',
                content: 'Hi [Name], this is [Your Name] from [Your Company]. I came across your company and noticed you might benefit from our services. Do you have a quick moment to chat?',
                tags: ['phone', 'cold-call', 'opening'],
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },
            {
                id: '2',
                title: 'WhatsApp Follow-up',
                category: 'followup',
                content: 'Hi [Name], following up on our previous conversation about [Topic]. Were you able to review the information? Let me know if you have any questions!',
                tags: ['whatsapp', 'follow-up', 'engagement'],
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },
            {
                id: '3',
                title: 'Price Objection Handling',
                category: 'objection',
                content: 'I understand your concern about the price. Our solution actually saves you money in the long run by [Benefit]. Many clients find the ROI exceeds their expectations.',
                tags: ['objection', 'price', 'negotiation'],
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },
            {
                id: '4',
                title: 'Closing Call Script',
                category: 'closing',
                content: 'Based on everything we\'ve discussed, it seems like our solution is a great fit for your needs. Shall we proceed with the next steps?',
                tags: ['closing', 'phone', 'deal'],
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }
        ];
        
        this.renderScripts();
        console.log('📚 Menggunakan script demo');
    }
    
    renderScripts() {
        const container = document.getElementById('scriptsGrid');
        if (!container) {
            console.warn('⚠️ Container scriptsGrid tidak ditemukan');
            return;
        }
        
        // Filter script berdasarkan kategori
        let scriptTersaring = this.scripts;
        if (this.kategoriSekarang !== 'all') {
            scriptTersaring = this.scripts.filter(script => script.category === this.kategoriSekarang);
        }
        
        if (scriptTersaring.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="bi bi-file-text display-6 text-secondary mb-3"></i>
                    <p class="text-secondary">Tidak ada script ditemukan</p>
                    <button class="btn btn-primary mt-3" onclick="scriptLibrary.tampilkanModalTambahScript()">
                        <i class="bi bi-plus-lg me-2"></i> Tambah Script Pertama
                    </button>
                </div>
            `;
            return;
        }
        
        let html = '';
        scriptTersaring.forEach(script => {
            html += `
                <div class="script-card">
                    <div class="script-header">
                        <div>
                            <div class="script-title">${this.escapeHtml(script.title)}</div>
                            <span class="script-category badge bg-secondary">${script.category}</span>
                        </div>
                        <div class="dropdown">
                            <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown">
                                <i class="bi bi-three-dots-vertical"></i>
                            </button>
                            <ul class="dropdown-menu">
                                <li><a class="dropdown-item" href="#" onclick="scriptLibrary.salinKeClipboard('${script.id}')"><i class="bi bi-clipboard me-2"></i>Salin</a></li>
                                <li><a class="dropdown-item" href="#" onclick="scriptLibrary.editScript('${script.id}')"><i class="bi bi-pencil me-2"></i>Edit</a></li>
                                <li><a class="dropdown-item text-danger" href="#" onclick="scriptLibrary.hapusScript('${script.id}')"><i class="bi bi-trash me-2"></i>Hapus</a></li>
                            </ul>
                        </div>
                    </div>
                    
                    <div class="script-content" id="scriptContent-${script.id}">
                        ${this.formatIsiScript(script.content)}
                        <div class="read-more">
                            <button class="read-more-btn btn btn-sm btn-link p-0" onclick="scriptLibrary.toggleReadMore('${script.id}')">Baca Selengkapnya</button>
                        </div>
                    </div>
                    
                    ${script.tags && script.tags.length > 0 ? `
                        <div class="script-tags mt-2">
                            ${script.tags.map(tag => `<span class="script-tag badge bg-light text-dark me-1">#${this.escapeHtml(tag)}</span>`).join('')}
                        </div>
                    ` : ''}
                    
                    <div class="script-actions mt-3">
                        <button class="btn btn-sm btn-outline-primary me-2" onclick="scriptLibrary.gunakanScript('${script.id}')">
                            <i class="bi bi-play me-1"></i> Gunakan
                        </button>
                        <button class="btn btn-sm btn-outline-success" onclick="scriptLibrary.salinKeClipboard('${script.id}')">
                            <i class="bi bi-clipboard me-1"></i> Salin
                        </button>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    formatIsiScript(content, scriptId = null) {
    if (!content) return '';
    
    // Escape HTML terlebih dahulu
    content = this.escapeHtml(content);
    
    // Ganti placeholder dengan styled text
    content = content.replace(/\[(.*?)\]/g, '<span class="text-warning fw-bold">[$1]</span>');
    
    // Tambah line breaks
    content = content.replace(/\n/g, '<br>');
    
    // Tentukan apakah perlu truncate (hanya jika scriptId ada dan content panjang)
    const shouldTruncate = scriptId && content.length > 200;
    
    if (shouldTruncate) {
        // Truncate content
        const truncatedContent = content.substring(0, 200) + '...';
        
        // Simpan full content di data attribute
        return `
           <div class="truncated-content">
                ${truncatedContent}
            </div>
            <div class="full-content d-none" data-full-content="${this.escapeHtml(content)}">
                ${content}
            </div>
        `;
    }
    
    return content;
}
    
    setupEvents() {
        // Tab kategori
        document.querySelectorAll('.category-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const kategori = e.target.dataset.category;
                this.filterBerdasarkanKategori(kategori);
            });
        });
        
        // Tombol save script
        const saveBtn = document.getElementById('saveScriptBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.simpanScript());
        }
        
        // Form script
        const scriptForm = document.getElementById('scriptForm');
        if (scriptForm) {
            scriptForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.simpanScript();
            });
        }
        
        // Search input
        const searchInput = document.getElementById('searchScripts');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.cariScripts(e.target.value);
            });
        }
    }
    
    filterBerdasarkanKategori(kategori) {
        this.kategoriSekarang = kategori;
        
        // Update tab aktif
        document.querySelectorAll('.category-tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.category === kategori) {
                tab.classList.add('active');
            }
        });
        
        // Render ulang scripts
        this.renderScripts();
    }
    
    tampilkanModalTambahScript() {
        this.idScriptSekarang = null;
        
        // Reset form
        document.getElementById('scriptTitle').value = '';
        document.getElementById('scriptCategory').value = 'general';
        document.getElementById('scriptContent').value = '';
        document.getElementById('scriptTags').value = '';
        
        // Update modal title
        document.getElementById('scriptModalLabel').textContent = 'Tambah Script Baru';
        
        // Tampilkan modal
        const modal = new bootstrap.Modal(document.getElementById('scriptModal'));
        modal.show();
    }
    
    async editScript(scriptId) {
        const script = this.scripts.find(s => s.id === scriptId);
        if (!script) {
            this.tampilkanToast('Script tidak ditemukan', 'error');
            return;
        }
        
        this.idScriptSekarang = scriptId;
        
        // Isi form
        document.getElementById('scriptTitle').value = script.title;
        document.getElementById('scriptCategory').value = script.category;
        document.getElementById('scriptContent').value = script.content;
        document.getElementById('scriptTags').value = script.tags ? script.tags.join(', ') : '';
        
        // Update modal title
        document.getElementById('scriptModalLabel').textContent = 'Edit Script';
        
        // Tampilkan modal
        const modal = new bootstrap.Modal(document.getElementById('scriptModal'));
        modal.show();
    }
    
    async simpanScript() {
        const form = document.getElementById('scriptForm');
        if (!form) return;
        
        const dataScript = {
            title: document.getElementById('scriptTitle').value.trim(),
            category: document.getElementById('scriptCategory').value,
            content: document.getElementById('scriptContent').value.trim(),
            tags: document.getElementById('scriptTags').value
                .split(',')
                .map(tag => tag.trim())
                .filter(tag => tag),
            updated_at: new Date().toISOString()
        };
        
        // Validasi
        if (!dataScript.title || !dataScript.category || !dataScript.content) {
            this.tampilkanToast('Harap isi semua field yang diperlukan', 'error');
            return;
        }
        
        console.log('Menyimpan script:', dataScript);
        
        try {
            if (this.supabase) {
                let result;
                
                if (this.idScriptSekarang) {
                    // Update script yang ada
                    result = await this.supabase
                        .from('scripts')
                        .update(dataScript)
                        .eq('id', this.idScriptSekarang)
                        .select();
                } else {
                    // Buat script baru
                    dataScript.created_at = new Date().toISOString();
                    result = await this.supabase
                        .from('scripts')
                        .insert([dataScript])
                        .select();
                }
                
                if (result.error) {
                    console.error('❌ Error Supabase:', result.error);
                    throw result.error;
                }
                
                this.tampilkanToast(
                    `Script berhasil ${this.idScriptSekarang ? 'diperbarui' : 'disimpan'}!`, 
                    'success'
                );
            } else {
                // Mode demo
                if (this.idScriptSekarang) {
                    // Update
                    const index = this.scripts.findIndex(s => s.id === this.idScriptSekarang);
                    if (index !== -1) {
                        this.scripts[index] = { ...this.scripts[index], ...dataScript };
                    }
                } else {
                    // Buat baru
                    dataScript.id = Date.now().toString();
                    dataScript.created_at = new Date().toISOString();
                    this.scripts.unshift(dataScript);
                }
                
                this.tampilkanToast(
                    `Script ${this.idScriptSekarang ? 'diperbarui' : 'disimpan'} (mode demo)`, 
                    'info'
                );
            }
            
            // Refresh scripts
            await this.muatScripts();
            
            // Tutup modal
            const modalEl = document.getElementById('scriptModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            modal.hide();
            
        } catch (error) {
            console.error('❌ Error menyimpan script:', error);
            this.tampilkanToast('Gagal menyimpan. Periksa console.', 'error');
        }
    }
    
    async hapusScript(scriptId) {
        if (!confirm('Apakah Anda yakin ingin menghapus script ini?')) return;
        
        try {
            if (this.supabase) {
                const { error } = await this.supabase
                    .from('scripts')
                    .delete()
                    .eq('id', scriptId);
                
                if (error) throw error;
            }
            
            // Hapus dari array lokal
            this.scripts = this.scripts.filter(script => script.id !== scriptId);
            
            // Render ulang
            this.renderScripts();
            
            this.tampilkanToast('Script berhasil dihapus', 'success');
            
        } catch (error) {
            console.error('❌ Error menghapus script:', error);
            this.tampilkanToast('Gagal menghapus', 'error');
        }
    }
    
    async salinKeClipboard(scriptId) {
        const script = this.scripts.find(s => s.id === scriptId);
        if (!script) {
            this.tampilkanToast('Script tidak ditemukan', 'error');
            return;
        }
        
        try {
            await navigator.clipboard.writeText(script.content);
            this.tampilkanToast('Script berhasil disalin ke clipboard!', 'success');
        } catch (error) {
            console.error('Gagal menyalin:', error);
            this.tampilkanToast('Gagal menyalin', 'error');
        }
    }
    
    gunakanScript(scriptId) {
        const script = this.scripts.find(s => s.id === scriptId);
        if (!script) {
            this.tampilkanToast('Script tidak ditemukan', 'error');
            return;
        }
        
        // Tampilkan script di modal untuk diedit sebelum digunakan
        const modalHtml = `
            <div class="modal fade" id="useScriptModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">${this.escapeHtml(script.title)}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="mb-3">
                                <label class="form-label">Konten Script</label>
                                <textarea class="form-control script-editor" rows="8" style="font-family: monospace;">${this.escapeHtml(script.content)}</textarea>
                                <small class="text-muted">Edit script sesuai kebutuhan sebelum menyalin</small>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Preview</label>
                                <div class="script-preview border rounded p-3 bg-light">
                                    ${this.formatIsiScript(script.content)}
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Tutup</button>
                            <button type="button" class="btn btn-primary" onclick="scriptLibrary.salinScriptDiedit('${scriptId}')">
                                <i class="bi bi-clipboard me-2"></i> Salin Script yang Diedit
                            </button>
                            <button type="button" class="btn btn-success" onclick="scriptLibrary.salinScriptOriginal('${scriptId}')">
                                <i class="bi bi-clipboard-check me-2"></i> Salin Original
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHtml;
        document.body.appendChild(modalContainer);
        
        const modal = new bootstrap.Modal(document.getElementById('useScriptModal'));
        modal.show();
        
        // Hapus modal dari DOM setelah ditutup
        document.getElementById('useScriptModal').addEventListener('hidden.bs.modal', () => {
            modalContainer.remove();
        });
    }
    
    async salinScriptDiedit(scriptId) {
        const modal = document.getElementById('useScriptModal');
        if (!modal) return;
        
        const editor = modal.querySelector('.script-editor');
        if (!editor) return;
        
        try {
            await navigator.clipboard.writeText(editor.value);
            this.tampilkanToast('Script yang diedit berhasil disalin!', 'success');
            
            // Tutup modal
            const modalInstance = bootstrap.Modal.getInstance(modal);
            modalInstance.hide();
        } catch (error) {
            console.error('Gagal menyalin:', error);
            this.tampilkanToast('Gagal menyalin', 'error');
        }
    }
    
    async salinScriptOriginal(scriptId) {
        await this.salinKeClipboard(scriptId);
        
        const modal = document.getElementById('useScriptModal');
        if (modal) {
            const modalInstance = bootstrap.Modal.getInstance(modal);
            modalInstance.hide();
        }
    }
    
    toggleReadMore(scriptId) {
        const contentEl = document.getElementById(`scriptContent-${scriptId}`);
        if (!contentEl) return;
        
        const isExpanded = contentEl.classList.contains('expanded');
        
        if (isExpanded) {
            contentEl.classList.remove('expanded');
            contentEl.querySelector('.read-more-btn').textContent = 'Baca Selengkapnya';
        } else {
            contentEl.classList.add('expanded');
            contentEl.querySelector('.read-more-btn').textContent = 'Baca Lebih Sedikit';
        }
    }
    
    cariScripts(query) {
        if (!query.trim()) {
            this.renderScripts();
            return;
        }
        
        const searchTerm = query.toLowerCase();
        const scriptTersaring = this.scripts.filter(script =>
            script.title.toLowerCase().includes(searchTerm) ||
            script.content.toLowerCase().includes(searchTerm) ||
            (script.tags && script.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
        );
        
        this.renderHasilPencarian(scriptTersaring);
    }
    
    renderHasilPencarian(scripts) {
        const container = document.getElementById('scriptsGrid');
        if (!container) return;
        
        if (scripts.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="bi bi-search display-6 text-secondary mb-3"></i>
                    <p class="text-secondary">Tidak ada script yang cocok ditemukan</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        scripts.forEach(script => {
            html += `
                <div class="script-card">
                    <div class="script-header">
                        <div>
                            <div class="script-title">${this.escapeHtml(script.title)}</div>
                            <span class="script-category badge bg-secondary">${script.category}</span>
                        </div>
                        <div class="dropdown">
                            <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown">
                                <i class="bi bi-three-dots-vertical"></i>
                            </button>
                            <ul class="dropdown-menu">
                                <li><a class="dropdown-item" href="#" onclick="scriptLibrary.salinKeClipboard('${script.id}')"><i class="bi bi-clipboard me-2"></i>Salin</a></li>
                                <li><a class="dropdown-item" href="#" onclick="scriptLibrary.editScript('${script.id}')"><i class="bi bi-pencil me-2"></i>Edit</a></li>
                            </ul>
                        </div>
                    </div>
                    
                    <div class="script-content">
                        ${this.formatIsiScript(script.content.substring(0, 200))}...
                    </div>
                    
                    ${script.tags && script.tags.length > 0 ? `
                        <div class="script-tags mt-2">
                            ${script.tags.map(tag => `<span class="script-tag badge bg-light text-dark me-1">#${this.escapeHtml(tag)}</span>`).join('')}
                        </div>
                    ` : ''}
                    
                    <div class="script-actions mt-3">
                        <button class="btn btn-sm btn-outline-primary me-2" onclick="scriptLibrary.gunakanScript('${script.id}')">
                            <i class="bi bi-play me-1"></i> Gunakan
                        </button>
                        <button class="btn btn-sm btn-outline-success" onclick="scriptLibrary.salinKeClipboard('${script.id}')">
                            <i class="bi bi-clipboard me-1"></i> Salin
                        </button>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }
    
    tampilkanToast(pesan, tipe = 'info') {
        // Jika ada Pipeline.showToast, gunakan itu
        if (window.Pipeline && window.Pipeline.showToast) {
            window.Pipeline.showToast(pesan, tipe);
        } else {
            // Fallback toast sederhana
            const toastEl = document.createElement('div');
            toastEl.className = `toast align-items-center text-bg-${tipe === 'success' ? 'success' : tipe === 'error' ? 'danger' : 'info'} border-0`;
            toastEl.innerHTML = `
                <div class="d-flex">
                    <div class="toast-body">
                        ${pesan}
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                </div>
            `;
            
            document.body.appendChild(toastEl);
            const toast = new bootstrap.Toast(toastEl, { delay: 3000 });
            toast.show();
            
            toastEl.addEventListener('hidden.bs.toast', () => {
                toastEl.remove();
            });
        }
    }
}

// Inisialisasi Script Library
let scriptLibrary;

document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM siap, menginisialisasi Script Library...');
    scriptLibrary = new ScriptLibrary();
    window.ScriptLibrary = scriptLibrary;
    window.scriptLibrary = scriptLibrary; // EKSPOR KE GLOBAL
});

console.log('📚 Script Library dimuat');