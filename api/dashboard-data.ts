import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Ambil environment variable dari Vercel Dashboard
const supabaseUrl = process.env.SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceRoleKey);

function formatCurrency(value: number | null): string {
  if (value === null || isNaN(value)) return "Rp 0";
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
}

function parseBudget(budgetString: string | null): number {
  if (!budgetString) return 0;
  const value = budgetString.replace(/[^0-9]/g, '');
  return parseFloat(value) || 0;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

    res.status(200).json({
      totalRevenue: formatCurrency(totalRevenueNum),
      averageDealSize: formatCurrency(avgDealSizeNum),
      salesGrowth,
      newInquiries,
      newCustomers,
      newsletterSubscribers,
      revenueChart: { labels, data: revenueData }
    });
  } catch (err: any) {
    console.error('Dashboard API Error:', err);
    res.status(500).json({ error: err.message });
  }
}