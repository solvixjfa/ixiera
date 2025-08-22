// File: js/dashboard.js (Final CEO Version v2)

import { supabase } from './supabaseClient.js';

// Helper function to format currency
function formatCurrency(value) {
    if (value === null || isNaN(value)) return "Rp 0";
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
}

// --- FUNGSI UNTUK MENGAMBIL DATA KPI UTAMA ---
async function loadFinancialKpis() {
    try {
        // Panggil fungsi RPC secara paralel untuk efisiensi
        const [
            { data: totalRevenue, error: err1 },
            { data: avgDealSize, error: err2 },
            { data: currentMonthRevenue, error: err3 },
            { data: lastMonthRevenue, error: err4 },
            { data: newCustomers, error: err5 }
        ] = await Promise.all([
            supabase.rpc('get_total_revenue'),
            supabase.rpc('get_average_deal_size'),
            supabase.rpc('get_current_month_revenue'),
            supabase.rpc('get_last_month_revenue'),
            supabase.from('leads_solvixone').select('id', { count: 'exact', head: true }).gte('created_at', new Date(new Date().setDate(1)).toISOString())
        ]);

        // Cek jika ada error pada salah satu panggilan
        if (err1 || err2 || err3 || err4 || err5) throw new Error(err1?.message || err2?.message || err3?.message || err4?.message || err5?.message);

        // Update UI
        document.getElementById('total-revenue-value').innerText = formatCurrency(totalRevenue);
        document.getElementById('average-deal-size-value').innerText = formatCurrency(avgDealSize);
        document.getElementById('new-customers-value').innerText = newCustomers.count.toLocaleString('id-ID');

        // Kalkulasi Sales Growth
        const lastMonth = lastMonthRevenue || 0;
        const currentMonth = currentMonthRevenue || 0;
        const growthElement = document.getElementById('sales-growth-value');
        if (lastMonth === 0) {
            growthElement.innerText = currentMonth > 0 ? '+∞%' : '0%';
        } else {
            const growth = ((currentMonth - lastMonth) / lastMonth) * 100;
            growthElement.innerText = `${growth > 0 ? '+' : ''}${growth.toFixed(1)}%`;
            growthElement.parentElement.className = growth >= 0 ? 'mt-1 mb-3 text-success' : 'mt-1 mb-3 text-danger';
        }

    } catch (error) {
        console.error('Error fetching financial KPIs:', error);
    }
}

// --- FUNGSI UNTUK MENGAMBIL KPI INQUIRIES ---
async function loadInquiriesKpi() {
    try {
        const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
        const { count, error } = await supabase
            .from('project_inquiries')
            .select('id', { count: 'exact', head: true })
            .gte('created_at', firstDayOfMonth);

        if (error) throw error;
        document.getElementById('new-inquiries-value').innerText = count.toLocaleString('id-ID');

    } catch (error) {
        console.error('Error fetching new inquiries:', error);
        document.getElementById('new-inquiries-value').innerText = 'Error';
    }
}


// --- FUNGSI UNTUK MENGAMBIL & MENAMPILKAN GRAFIK REVENUE ---
async function loadRevenueChart() {
    try {
        const { data, error } = await supabase.rpc('get_monthly_revenue_data');
        if (error) throw error;
        
        if (data && data.length > 0) {
            const labels = data.map(item => new Date(item.month + '-02').toLocaleString('default', { month: 'short' }));
            const revenueData = data.map(item => item.revenue);

            const ctx = document.getElementById("monthly-revenue-chart").getContext("2d");
            new Chart(ctx, {
                type: "line",
                data: {
                    labels: labels,
                    datasets: [{
                        label: "Revenue",
                        fill: true,
                        backgroundColor: "rgba(215, 227, 244, 0.5)",
                        borderColor: window.theme.primary,
                        data: revenueData
                    }]
                },
                options: {
                    maintainAspectRatio: false,
                    legend: { display: false },
                    tooltips: {
                        intersect: false,
                        callbacks: {
                            label: (tooltipItem) => formatCurrency(tooltipItem.yLabel)
                        }
                    },
                    scales: {
                        yAxes: [{
                            ticks: {
                                callback: (value) => 'Rp ' + (value / 1000000) + ' Jt'
                            }
                        }]
                    }
                }
            });
        }
    } catch(error) {
        console.error('Error fetching revenue chart data:', error);
    }
}

// --- EVENT LISTENER ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("CEO Dashboard Initializing...");
    loadFinancialKpis();
    loadInquiriesKpi();
    loadRevenueChart();
});

