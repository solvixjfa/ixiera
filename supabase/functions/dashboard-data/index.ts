// File: supabase/functions/dashboard-data/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// --- CORS headers ---
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Production bisa diganti domain
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function formatCurrency(value: number | null): string {
  if (value === null || isNaN(value)) return "Rp 0";
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
}

function parseBudget(budgetString: string | null): number {
  if (!budgetString) return 0;
  const value = budgetString.replace(/[^0-9]/g, '');
  return parseFloat(value) || 0;
}

// --- Supabase admin client from ENV ---
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY tidak ditemukan di ENV');
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

// --- Edge Function ---
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // --- Financial KPI ---
    const { data: dealsData = [] } = await supabase
      .from('project_inquiries')
      .select('budget, created_at, status')
      .eq('status', 'deal');

    const dealsWithValue = dealsData.map(d => ({
      value: parseBudget(d.budget),
      created_at: d.created_at
    }));

    const totalRevenueNum = dealsWithValue.reduce((sum, d) => sum + d.value, 0);
    const avgDealSizeNum = dealsWithValue.length ? totalRevenueNum / dealsWithValue.length : 0;

    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const currentMonthRevenue = dealsWithValue
      .filter(d => new Date(d.created_at) >= thisMonthStart)
      .reduce((sum, d) => sum + d.value, 0);

    const lastMonthRevenue = dealsWithValue
      .filter(d => new Date(d.created_at) >= lastMonthStart && new Date(d.created_at) < thisMonthStart)
      .reduce((sum, d) => sum + d.value, 0);

    const salesGrowth = lastMonthRevenue === 0
      ? currentMonthRevenue ? '+100%' : '0%'
      : `${((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1)}%`;

    // --- Customers & Inquiries ---
    const { count: newInquiries = 0 } = await supabase
      .from('project_inquiries')
      .select('id', { count: 'exact' })
      .eq('status', 'new')
      .gte('created_at', firstDayOfMonth);

    const { count: newCustomers = 0 } = await supabase
      .from('clients')
      .select('id', { count: 'exact' })
      .gte('created_at', firstDayOfMonth);

    const { count: newsletterSubscribers = 0 } = await supabase
      .from('newsletter_subscribers')
      .select('id', { count: 'exact' });

    // --- Revenue Chart ---
    const monthlyRevenueMap: Record<string, number> = {};
    dealsWithValue.forEach(d => {
      const date = new Date(d.created_at);
      const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
      monthlyRevenueMap[key] = (monthlyRevenueMap[key] || 0) + d.value;
    });

    const labels = Object.keys(monthlyRevenueMap).map(k => {
      const [y, m] = k.split('-');
      return new Date(parseInt(y), parseInt(m) - 1).toLocaleString('default', { month: 'short', year: 'numeric' });
    });

    const revenueData = Object.values(monthlyRevenueMap);

    return new Response(JSON.stringify({
      totalRevenue: formatCurrency(totalRevenueNum),
      averageDealSize: formatCurrency(avgDealSizeNum),
      salesGrowth,
      newInquiries,
      newCustomers,
      newsletterSubscribers,
      revenueChart: { labels, data: revenueData }
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Dashboard Edge Function Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
});