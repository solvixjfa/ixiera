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

    // --- Inisialisasi Tampilan & Elemen DOM ---
    const monthlyRevenueChart = document.getElementById("monthly-revenue-chart");
    const latestProjectsTable = document.getElementById("latest-projects-table");

    // --- Fungsi Bantuan ---
    function formatCurrency(value) {
        if (value === null || isNaN(value)) return "Rp 0";
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
    }
    
    function parseBudget(budgetString) {
        if (!budgetString) return 0;
        
        const budgetMap = {
            '< 1 jt': 1000000,
            '1 jt - 5 jt': 3000000,
            '5 jt - 10 jt': 7500000,
            '> 10 jt': 12000000
        };
        const mappedValue = budgetMap[budgetString];
        if (mappedValue) {
            return mappedValue;
        }
        const value = budgetString.replace(/[^0-9]/g, '');
        return parseFloat(value) || 0;
    }

    // --- Fungsi Pengambilan Data dari Supabase ---
    async function getDashboardData() {
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        
        const { data: projectsData, error: projectsError } = await supabase
            .from('tally_projects')
            .select('project_budget, created_at, status, project_title, client_name')
            .order('created_at', { ascending: false });

        if (projectsError) {
            console.error('Error fetching projects:', projectsError);
            return {};
        }

        const { count: newInquiries, error: inquiriesError } = await supabase
            .from('project_inquiries')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'new')
            .gte('created_at', firstDayOfMonth);
        
        if (inquiriesError) console.error('Error fetching new inquiries:', inquiriesError);
        
        const { count: newsletterSubscribers, error: newsletterError } = await supabase
            .from('newsletter_subscribers')
            .select('id', { count: 'exact', head: true });

        if (newsletterError) console.error('Error fetching newsletter subscribers:', newsletterError);

        return {
            projectsData,
            newInquiries: newInquiries || 0,
            newsletterSubscribers: newsletterSubscribers || 0,
        };
    }
    
    // --- Logika Perhitungan & Tampilan Dashboard KPI ---
    async function loadDashboardKPIs() {
        try {
            const { projectsData, newInquiries, newsletterSubscribers } = await getDashboardData();
            
            const completedProjects = projectsData.filter(d => d.status === 'Completed' || d.status === 'Deal');

            const totalRevenueNum = completedProjects.reduce((sum, d) => sum + parseBudget(d.project_budget), 0);
            const avgDealSizeNum = completedProjects.length ? totalRevenueNum / completedProjects.length : 0;
            const completedProjectsCount = completedProjects.length;
            
            const now = new Date();
            const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

            const currentMonthRevenue = completedProjects
                .filter(d => new Date(d.created_at) >= thisMonthStart)
                .reduce((sum, d) => sum + parseBudget(d.project_budget), 0);
            
            const lastMonthRevenue = completedProjects
                .filter(d => new Date(d.created_at) >= lastMonthStart && new Date(d.created_at) < thisMonthStart)
                .reduce((sum, d) => sum + parseBudget(d.project_budget), 0);
            
            const salesGrowth = lastMonthRevenue === 0
                ? currentMonthRevenue ? '+100%' : '0%'
                : `${((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1)}%`;
            
            document.getElementById('total-revenue-value').innerText = formatCurrency(totalRevenueNum);
            document.getElementById('average-deal-size-value').innerText = formatCurrency(avgDealSizeNum);
            document.getElementById('sales-growth-value').innerText = salesGrowth;
            document.getElementById('new-inquiries-value').innerText = newInquiries;
            document.getElementById('completed-projects-value').innerText = completedProjectsCount;
            document.getElementById('newsletter-count-value').innerText = newsletterSubscribers;
            
            const monthlyRevenueMap = {};
            completedProjects.forEach(d => {
                const date = new Date(d.created_at);
                const key = `${date.getFullYear()}-${date.getMonth()}`;
                monthlyRevenueMap[key] = (monthlyRevenueMap[key] || 0) + parseBudget(d.project_budget);
            });

            const labels = Object.keys(monthlyRevenueMap).map(k => {
                const [y, m] = k.split('-');
                return new Date(parseInt(y), parseInt(m)).toLocaleString('id-ID', { month: 'short', year: 'numeric' });
            });
            const revenueData = Object.values(monthlyRevenueMap);
            
            // Perbaikan visualisasi grafik di sini
            const ctx = monthlyRevenueChart.getContext("2d");
            if (window.myRevenueChart) {
                window.myRevenueChart.destroy();
            }

            // Buat gradien untuk area chart
            const gradient = ctx.createLinearGradient(0, 0, 0, 225);
            gradient.addColorStop(0, 'rgba(106, 90, 205, 0.4)'); // Lebih pekat di atas
            gradient.addColorStop(1, 'rgba(106, 90, 205, 0)'); // Transparan di bawah

            window.myRevenueChart = new Chart(ctx, {
                type: "line",
                data: {
                    labels: labels,
                    datasets: [{
                        label: "Revenue",
                        fill: true,
                        backgroundColor: gradient, // Gunakan gradien
                        borderColor: '#6a5acd', // Warna garis
                        pointBackgroundColor: '#6a5acd', // Warna titik
                        pointRadius: 4, // Ukuran titik
                        pointHoverRadius: 6, // Ukuran titik saat di-hover
                        data: revenueData,
                        tension: 0.4 // Membuat garis melengkung
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: ctx => formatCurrency(ctx.parsed.y)
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: {
                                display: false
                            }
                        },
                        y: {
                            ticks: {
                                callback: val => 'Rp ' + (val / 1000000) + ' Jt'
                            }
                        }
                    }
                }
            });
            
            // Menampilkan data di tabel Latest Projects
            latestProjectsTable.innerHTML = '';
            projectsData.slice(0, 5).forEach(project => {
                const date = new Date(project.created_at).toLocaleDateString('id-ID');
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${project.project_title}</td>
                    <td>${project.client_name}</td>
                    <td class="d-none d-xl-table-cell">${formatCurrency(parseBudget(project.project_budget))}</td>
                    <td class="d-none d-xl-table-cell">${date}</td>
                    <td><span class="badge ${project.status === 'Completed' ? 'bg-success' : 'bg-warning'}">${project.status}</span></td>
                `;
                latestProjectsTable.appendChild(row);
            });

        } catch (err) {
            console.error('Error loading dashboard:', err);
        }
    }
    
    // --- Logika Navigasi & Sesi ---
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    sidebarLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            
            document.querySelectorAll('div[id]').forEach(section => {
                section.style.display = 'none';
            });
            
            document.getElementById(targetId).style.display = 'block';

            sidebarLinks.forEach(item => item.parentElement.classList.remove('active'));
            link.parentElement.classList.add('active');
        });
    });

    const logoutLink = document.getElementById('logout-link');
    if (logoutLink) {
        logoutLink.addEventListener('click', async (e) => {
            e.preventDefault();
            await supabase.auth.signOut();
            window.location.href = 'login.html';
        });
    }
    
    // --- Panggil Fungsi Awal ---
    await loadDashboardKPIs();
});
