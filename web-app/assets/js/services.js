// Service Content Configuration - DISESUAIKAN DENGAN SERVICES.HTML
const serviceContents = {
    'website-app': {
        title: 'Website & Aplikasi Custom',
        description: 'Bangun aset digital milik Anda sendiri yang scalable dan sesuai kebutuhan spesifik bisnis. Bayangkan website yang bisa kirim notifikasi otomatis, update stok sendiri, dan generate laporan real-time.',
        features: [
            'Website company profile profesional',
            'E-commerce system lengkap', 
            'Custom web application',
            'Mobile-responsive design',
            'SEO optimized',
            'Admin dashboard lengkap'
        ],
        benefits: [
            'Kontrol penuh atas aset digital',
            'Scalable sesuai perkembangan bisnis',
            'Branding yang konsisten',
            'Tidak ada batasan platform'
        ],
        sidebarFeatures: [
            'Custom Dashboard',
            'Multi-platform Support', 
            'Security First',
            'Real-time Updates',
            'Backup Otomatis'
        ],
        stats: {
            stat1: '24/7',
            stat2: '99.9%',
            stat3: '2-4 Minggu'
        }
    },
    'automation': {
        title: 'Otomatisasi Bisnis', 
        description: 'Hemat 80% waktu operasional dengan sistem yang bekerja otomatis 24/7. Proses berulang berjalan sendiri, dari notifikasi hingga laporan.',
        features: [
            'Workflow automation',
            'Multi-channel notifications',
            'Inventory management auto-sync',
            'Laporan otomatis terjadwal',
            'Payment reminder system',
            'Email marketing automation'
        ],
        benefits: [
            'Pengurangan human error',
            'Efisiensi waktu operasional',
            'Konsistensi proses bisnis',
            'Skalabilitas yang mudah'
        ],
        sidebarFeatures: [
            'Multi-channel Notif',
            'Auto Workflow',
            'Scheduling System',
            'Error Handling',
            'Performance Tracking'
        ],
        stats: {
            stat1: '80%',
            stat2: '24/7',
            stat3: '3-5 Minggu'
        }
    },
    'crm-task': {
        title: 'CRM & Management System',
        description: 'Kelola pelanggan, tim, dan proyek dalam satu platform terintegrasi. Semua data tersusun rapi dan mudah diakses.',
        features: [
            '360° customer database',
            'Sales pipeline management',
            'Team collaboration tools',
            'Project tracking system',
            'Customizable workflow',
            'Performance analytics'
        ],
        benefits: [
            'Single source of truth',
            'Improved team collaboration',
            'Better customer insights', 
            'Data-driven decision making'
        ],
        sidebarFeatures: [
            'Customer Database',
            'Team Collaboration',
            'Project Tracking',
            'Sales Pipeline',
            'Analytics Dashboard'
        ],
        stats: {
            stat1: '100%',
            stat2: 'Real-time',
            stat3: '3-6 Minggu'
        }
    },
    'reporting': {
        title: 'Analytics & Business Intelligence',
        description: 'Data real-time untuk pengambilan keputusan yang lebih cerdas dan akurat. Lihat performa bisnis dengan jelas.',
        features: [
            'Real-time business dashboard',
            'Sales performance analytics',
            'Financial reporting system',
            'Customer behavior insights',
            'Predictive trend analysis',
            'Custom report builder'
        ],
        benefits: [
            'Visibility bisnis 360°',
            'Quick decision making',
            'Identifikasi peluang baru',
            'Optimasi performa bisnis'
        ],
        sidebarFeatures: [
            'Real-time Dashboard',
            'Custom Reports',
            'Data Visualization',
            'Trend Analysis',
            'Export Capabilities'
        ],
        stats: {
            stat1: 'Real-time',
            stat2: '100% Accurate',
            stat3: '2-4 Minggu'
        }
    },
    'chat-communication': {
        title: 'Customer Engagement Platform',
        description: 'Tingkatkan experience pelanggan dengan sistem komunikasi terpadu. Respon cepat dan profesional 24/7.',
        features: [
            'Multi-channel chat system',
            'WhatsApp/Telegram integration',
            'AI-powered chatbot',
            'Auto-response system',
            'Customer service dashboard',
            'Conversation analytics'
        ],
        benefits: [
            'Response time yang lebih cepat',
            'Customer satisfaction meningkat',
            'Operasional 24/7',
            'Data percakapan terorganisir'
        ],
        sidebarFeatures: [
            'Multi-channel Support',
            'AI Chatbot',
            'Auto Responses',
            'Analytics',
            'CRM Integration'
        ],
        stats: {
            stat1: '24/7',
            stat2: '<5 menit',
            stat3: '3-6 Minggu'
        }
    },
    'integration': {
        title: 'System Integration & API',
        description: 'Hubungkan semua tools yang sudah ada, ciptakan ecosystem digital yang solid. Data mengalir lancar antar sistem.',
        features: [
            'Marketplace integration',
            'Third-party API connection',
            'Legacy system migration',
            'Data synchronization',
            'Secure cloud backup',
            'Custom API development'
        ],
        benefits: [
            'Ecosystem yang terintegrasi',
            'Data consistency across platforms',
            'Future-proof architecture',
            'Reduced manual data entry'
        ],
        sidebarFeatures: [
            'API Development',
            'Data Sync',
            'Security First',
            'Monitoring',
            'Documentation'
        ],
        stats: {
            stat1: '99.9%',
            stat2: 'Secure',
            stat3: '4-8 Minggu'
        }
    }
};

// Get service parameter from URL
function getServiceParameter() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('service') || 'website-app';
    } catch (error) {
        console.log('URL parameter error:', error);
        return 'website-app';
    }
}

// Update page content based on service
function updateServiceContent() {
    // Only run on service-details page
    if (!window.location.pathname.includes('services-details')) return;
    
    try {
        const serviceKey = getServiceParameter();
        const service = serviceContents[serviceKey] || serviceContents['website-app'];
        
        // Update page title
        document.title = `${service.title} | Ixiera`;
        
        // Update meta description
        const metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription) {
            metaDescription.setAttribute('content', service.description);
        }
        
        // Update main title
        const pageTitle = document.querySelector('#dynamic-page-title');
        if (pageTitle) {
            pageTitle.textContent = service.title;
        }
        
        // Update breadcrumb
        const breadcrumb = document.querySelector('#dynamic-breadcrumb');
        if (breadcrumb) {
            breadcrumb.textContent = service.title.split(' ')[0]; // Ambil kata pertama saja
        }
        
        // Update all sections
        updateVisualizationSection(service);
        updateSidebarFeatures(service.sidebarFeatures);
        updateFeaturesSection(service.features);
        updateBenefitsSection(service.benefits);
        updateActiveService(serviceKey);
        
    } catch (error) {
        console.error('Service content update error:', error);
    }
}

// Update visualization section
function updateVisualizationSection(service) {
    try {
        const vizTitle = document.querySelector('#dynamic-title');
        const vizDescription = document.querySelector('#dynamic-description');
        
        if (vizTitle) vizTitle.textContent = service.title;
        if (vizDescription) vizDescription.textContent = service.description;
        
        // Update stats
        if (service.stats) {
            updateStatsSection(service.stats);
        }
    } catch (error) {
        console.log('Visualization section update error:', error);
    }
}

// Update stats section
function updateStatsSection(stats) {
    try {
        const stat1 = document.querySelector('#stat-1');
        const stat2 = document.querySelector('#stat-2');
        const stat3 = document.querySelector('#stat-3');
        
        if (stat1 && stats.stat1) stat1.textContent = stats.stat1;
        if (stat2 && stats.stat2) stat2.textContent = stats.stat2;
        if (stat3 && stats.stat3) stat3.textContent = stats.stat3;
    } catch (error) {
        console.log('Stats update error:', error);
    }
}

// Update function untuk enhanced sidebar features
function updateSidebarFeatures(features) {
    try {
        const featuresContainer = document.querySelector('#dynamic-sidebar-features');
        if (!featuresContainer) return;
        
        featuresContainer.innerHTML = '';
        
        const featureDescriptions = {
            'Custom Dashboard': 'Tailored to your workflow',
            'Multi-platform Support': 'Web & mobile ready', 
            'Security First': 'Enterprise-grade protection',
            'Real-time Updates': 'Live data synchronization',
            'Backup Otomatis': 'Data protection guaranteed',
            'Multi-channel Notif': 'WhatsApp, Email, Telegram',
            'Auto Workflow': 'Smart process automation',
            'Scheduling System': 'Timed operations',
            'Error Handling': 'Automatic issue resolution',
            'Performance Tracking': 'Real-time monitoring',
            'Customer Database': '360° client profiles',
            'Team Collaboration': 'Seamless communication',
            'Project Tracking': 'Progress monitoring',
            'Sales Pipeline': 'Deal flow management',
            'Analytics Dashboard': 'Business intelligence',
            'Real-time Dashboard': 'Live metrics',
            'Custom Reports': 'Tailored analytics',
            'Data Visualization': 'Interactive charts',
            'Trend Analysis': 'Predictive insights',
            'Export Capabilities': 'Data portability',
            'API Development': 'Custom integrations',
            'Data Sync': 'Cross-platform harmony',
            'Monitoring': '24/7 system health',
            'Documentation': 'Comprehensive guides'
        };
        
        features.forEach((feature, index) => {
            const desc = featureDescriptions[feature] || 'Premium feature included';
            const featureHTML = `
                <div class="feature-item-enhanced">
                    <div class="feature-icon-wrapper">
                        <i class="bi bi-check-circle-fill"></i>
                    </div>
                    <div class="feature-content">
                        <span class="feature-title">${feature}</span>
                        <span class="feature-desc">${desc}</span>
                    </div>
                </div>
            `;
            featuresContainer.innerHTML += featureHTML;
        });
    } catch (error) {
        console.log('Sidebar features update error:', error);
    }
}
// Update features section
function updateFeaturesSection(features) {
    try {
        const featuresContainer = document.querySelector('#dynamic-features-list');
        if (!featuresContainer) return;
        
        featuresContainer.innerHTML = '';
        
        features.forEach((feature, index) => {
            const featureHTML = `
                <div class="col-md-6" data-aos="fade-up" data-aos-delay="${(index % 2) * 100}">
                    <div class="feature-card">
                        <div class="feature-icon">
                            <i class="bi bi-check-circle"></i>
                        </div>
                        <div class="feature-content">
                            <h5>${feature}</h5>
                            <p>Solusi terintegrasi untuk meningkatkan efisiensi bisnis Anda</p>
                        </div>
                    </div>
                </div>
            `;
            featuresContainer.innerHTML += featureHTML;
        });
    } catch (error) {
        console.log('Features section update error:', error);
    }
}

// Update benefits section
function updateBenefitsSection(benefits) {
    try {
        const benefitsContainer = document.querySelector('#dynamic-benefits');
        if (!benefitsContainer) return;
        
        benefitsContainer.innerHTML = '';
        
        benefits.forEach((benefit, index) => {
            const benefitHTML = `
                <div class="col-md-6" data-aos="fade-up" data-aos-delay="${index * 100}">
                    <div class="benefit-card">
                        <div class="benefit-icon">
                            <i class="bi bi-lightning"></i>
                        </div>
                        <div class="benefit-content">
                            <h5>${benefit}</h5>
                            <p>Manfaat langsung untuk pengembangan bisnis Anda</p>
                        </div>
                    </div>
                </div>
            `;
            benefitsContainer.innerHTML += benefitHTML;
        });
    } catch (error) {
        console.log('Benefits section update error:', error);
    }
}

// Update active service in sidebar
function updateActiveService(serviceKey) {
    try {
        const serviceLinks = document.querySelectorAll('.services-list a');
        serviceLinks.forEach(link => {
            link.classList.remove('active');
            const href = link.getAttribute('href');
            if (href && href.includes(serviceKey)) {
                link.classList.add('active');
            }
        });
    } catch (error) {
        console.log('Active service update error:', error);
    }
}

// Enhance services page with dynamic content
function enhanceServicesPage() {
    if (!window.location.pathname.includes('services.html')) return;
    
    try {
        const serviceCards = document.querySelectorAll('.service-card');
        
        serviceCards.forEach((card, index) => {
            // Add hover effects
            card.style.transition = 'transform 0.3s ease, box-shadow 0.3s ease';
            card.addEventListener('mouseenter', () => {
                card.style.transform = 'translateY(-5px)';
            });
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'translateY(0)';
            });
        });
    } catch (error) {
        console.log('Services page enhancement error:', error);
    }
}

// Initialize when DOM is loaded dengan error handling
document.addEventListener('DOMContentLoaded', function() {
    try {
        updateServiceContent();
        enhanceServicesPage();
    } catch (error) {
        console.error('DOMContentLoaded error:', error);
    }
});