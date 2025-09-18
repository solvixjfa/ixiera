// --- Mode: dev (lokal) / prod (Vercel hosting) ---
const MODE = 'dev'; // 'dev' untuk lokal / Acode, 'prod' untuk Vercel
const SUPABASE_FUNCTION_URL = MODE === 'dev'
  ? "https://xtarsaurwclktwhhryas.functions.supabase.co/dashboard-data" // langsung full access
  : "/functions/dashboard-data"; // relative path untuk Vercel

// --- Format Rupiah helper ---
function formatCurrency(value) {
  if (!value || isNaN(value)) return "Rp 0";
  return new Intl.NumberFormat('id-ID', { style:'currency', currency:'IDR', minimumFractionDigits:0 }).format(value);
}

// --- Fetch Dashboard Data ---
async function fetchDashboardData() {
  try {
    const res = await fetch(SUPABASE_FUNCTION_URL);
    if (!res.ok) throw new Error('Failed to fetch dashboard data');
    const data = await res.json();

    // --- Update KPI DOM ---
    ['totalRevenue','averageDealSize','salesGrowth','newInquiries','newCustomers','newsletterSubscribers'].forEach(key => {
      const id = key === 'averageDealSize' ? 'average-deal-size-value'
                : key === 'totalRevenue' ? 'total-revenue-value'
                : key === 'salesGrowth' ? 'sales-growth-value'
                : key === 'newInquiries' ? 'new-inquiries-value'
                : key === 'newCustomers' ? 'new-customers-value'
                : 'newsletter-count-value';
      document.getElementById(id).innerText = data[key] || '0';
    });

    // --- Chart ---
    if (data.revenueChart) {
      const ctx = document.getElementById("monthly-revenue-chart").getContext("2d");
      new Chart(ctx, {
        type:"line",
        data:{
          labels: data.revenueChart.labels,
          datasets:[{
            label:"Revenue",
            fill:true,
            backgroundColor:"rgba(215, 227, 244, 0.5)",
            borderColor:'#6a5acd',
            data: data.revenueChart.data
          }]
        },
        options:{
          responsive:true,
          plugins:{
            tooltip:{
              callbacks:{ label: ctx => formatCurrency(ctx.parsed.y) }
            }
          },
          scales:{ y:{ ticks:{ callback: val => 'Rp '+(val/1000000)+' Jt' } } }
        }
      });
    }

  } catch (err) {
    console.error('Error loading dashboard:', err);
    ['total-revenue-value','average-deal-size-value','sales-growth-value',
     'new-inquiries-value','new-customers-value','newsletter-count-value']
     .forEach(id => document.getElementById(id).innerText='Error');
  }
}

document.addEventListener('DOMContentLoaded', fetchDashboardData);