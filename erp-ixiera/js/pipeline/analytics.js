// ===== PIPELINE ANALYTICS MODULE - FIXED VERSION =====
class PipelineAnalytics {
    constructor(pipelineApp) {
    console.log('🔧 Analytics Constructor called with app:', pipelineApp);
    this.app = pipelineApp;
    this.charts = {};
    this.currentTimeRange = '30days';
    
    // Inisialisasi setelah DOM ready
    setTimeout(() => {
        console.log('🔧 Analytics init starting...');
        this.init();
    }, 100);
}
    
    init() {
        console.log('📊 Analytics module initializing...');
        
        // Setup time filter event
        const timeFilter = document.getElementById('analyticsTimeFilter');
        if (timeFilter) {
            timeFilter.addEventListener('change', (e) => {
                this.currentTimeRange = e.target.value;
                this.updateAnalytics();
            });
        }
        
        // Setup chart containers
        this.initChartContainers();
        
        // Initial load
        this.updateAnalytics();
    }
    
    initChartContainers() {
        // Initialize chart placeholders with canvas elements
        this.initChart('temperatureChart', 'Leads by Temperature', 'pie');
        this.initChart('sourceChart', 'Leads by Source', 'doughnut');
        this.initChart('timelineChart', 'Leads Over Time', 'line');
    }
    
    initChart(chartId, title, type) {
        const container = document.getElementById(chartId);
        if (!container) {
            console.warn(`⚠️ Container ${chartId} not found`);
            return;
        }
        
        // Clear existing content
        container.innerHTML = '';
        
        // Create canvas element
        const canvas = document.createElement('canvas');
        canvas.id = `${chartId}Canvas`;
        container.appendChild(canvas);
        
        // Create chart instance (will be populated when data is available)
        this.charts[chartId] = {
            type: type,
            title: title,
            canvas: canvas,
            instance: null
        };
    }
    
    async updateAnalytics() {
        console.log('📈 Updating analytics...');
        
        // Show loading state
        this.showLoading(true);
        
        try {
            // Calculate analytics data
            const analyticsData = this.calculateAnalyticsData();
            
            // Update stats
            this.updateStats(analyticsData.stats);
            
            // Update charts
            this.updateCharts(analyticsData);
            
            // Hide loading state
            this.showLoading(false);
            
        } catch (error) {
            console.error('❌ Error updating analytics:', error);
            this.showLoading(false);
            this.showError('Failed to load analytics data');
        }
    }
    
    calculateAnalyticsData() {
        const leads = this.app.leads || [];
        const timeRange = this.getDateRange();
        
        // Filter leads by time range
        const filteredLeads = this.filterLeadsByTimeRange(leads, timeRange);
        
        // Calculate statistics
        const stats = this.calculateStatistics(filteredLeads, leads);
        
        // Calculate chart data
        const chartData = this.calculateChartData(filteredLeads);
        
        return {
            stats: stats,
            charts: chartData,
            filteredCount: filteredLeads.length,
            totalCount: leads.length
        };
    }
    
    getDateRange() {
        const now = new Date();
        const startDate = new Date();
        
        switch (this.currentTimeRange) {
            case '7days':
                startDate.setDate(now.getDate() - 7);
                break;
            case '30days':
                startDate.setDate(now.getDate() - 30);
                break;
            case '90days':
                startDate.setDate(now.getDate() - 90);
                break;
            case 'year':
                startDate.setFullYear(now.getFullYear() - 1);
                break;
            default:
                startDate.setDate(now.getDate() - 30);
        }
        
        return {
            start: startDate,
            end: now
        };
    }
    
    filterLeadsByTimeRange(leads, timeRange) {
        return leads.filter(lead => {
            if (!lead.created_at) return false;
            try {
                const leadDate = new Date(lead.created_at);
                return leadDate >= timeRange.start && leadDate <= timeRange.end;
            } catch (error) {
                console.warn('Invalid date for lead:', lead.id, lead.created_at);
                return false;
            }
        });
    }
    
    calculateStatistics(filteredLeads, allLeads) {
        const totalLeads = filteredLeads.length;
        
        // Temperature breakdown
        const hotLeads = filteredLeads.filter(lead => lead.temperature === 'hot').length;
        const warmLeads = filteredLeads.filter(lead => lead.temperature === 'warm').length;
        const coldLeads = filteredLeads.filter(lead => lead.temperature === 'cold').length;
        
        // Status breakdown
        const contactedLeads = filteredLeads.filter(lead => 
            lead.status === 'contacted' || lead.status === 'qualified' || lead.status === 'converted'
        ).length;
        
        const convertedLeads = filteredLeads.filter(lead => lead.status === 'converted').length;
        
        // Calculate rates
        const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;
        const responseRate = totalLeads > 0 ? Math.round((contactedLeads / totalLeads) * 100) : 0;
        
        // Calculate average response time (in hours)
        let totalResponseTime = 0;
        let respondedLeads = 0;
        
        filteredLeads.forEach(lead => {
            if (lead.last_contacted && lead.created_at) {
                try {
                    const created = new Date(lead.created_at);
                    const contacted = new Date(lead.last_contacted);
                    const hours = (contacted - created) / (1000 * 60 * 60);
                    if (hours > 0 && hours < 720) { // Max 30 days
                        totalResponseTime += hours;
                        respondedLeads++;
                    }
                } catch (error) {
                    console.warn('Invalid date in lead:', lead.id);
                }
            }
        });
        
        const avgResponseTime = respondedLeads > 0 ? Math.round(totalResponseTime / respondedLeads) : 0;
        
        // Calculate trends (simplified - no previous period for now)
        const totalLeadsTrend = '+0%';
        const conversionTrend = '+0%';
        const responseTrend = '+0%';
        const responseTimeTrend = '0%';
        
        return {
            totalLeads,
            hotLeads,
            warmLeads,
            coldLeads,
            conversionRate,
            responseRate,
            avgResponseTime,
            totalLeadsTrend,
            conversionTrend,
            responseTrend,
            responseTimeTrend
        };
    }
    
    calculateChartData(filteredLeads) {
        // Temperature chart data
        const temperatureData = this.groupByTemperature(filteredLeads);
        
        // Source chart data
        const sourceData = this.groupBySource(filteredLeads);
        
        // Timeline data
        const timelineData = this.groupByTime(filteredLeads);
        
        return {
            temperature: temperatureData,
            source: sourceData,
            timeline: timelineData
        };
    }
    
    groupByTemperature(leads) {
        const groups = {
            hot: { count: 0, color: '#ff4444' },
            warm: { count: 0, color: '#ffaa00' },
            cold: { count: 0, color: '#0099ff' }
        };
        
        leads.forEach(lead => {
            if (groups[lead.temperature]) {
                groups[lead.temperature].count++;
            }
        });
        
        return {
            labels: ['Hot', 'Warm', 'Cold'],
            datasets: [{
                data: [groups.hot.count, groups.warm.count, groups.cold.count],
                backgroundColor: [groups.hot.color, groups.warm.color, groups.cold.color],
                borderColor: ['#ffffff', '#ffffff', '#ffffff'],
                borderWidth: 2
            }]
        };
    }
    
    groupBySource(leads) {
        const sourceCounts = {};
        
        leads.forEach(lead => {
            const source = lead.source || 'unknown';
            sourceCounts[source] = (sourceCounts[source] || 0) + 1;
        });
        
        // Sort by count descending
        const sortedSources = Object.entries(sourceCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5); // Top 5 sources
        
        const colors = [
            '#ff4444', // Red
            '#ffaa00', // Orange
            '#00cc66', // Green
            '#0099ff', // Blue
            '#9966ff'  // Purple
        ];
        
        return {
            labels: sortedSources.map(([source]) => this.formatSourceName(source)),
            datasets: [{
                data: sortedSources.map(([, count]) => count),
                backgroundColor: colors.slice(0, sortedSources.length),
                borderColor: ['#ffffff'],
                borderWidth: 2
            }]
        };
    }
    
    groupByTime(leads) {
        const timeRange = this.getDateRange();
        const daysDiff = Math.ceil((timeRange.end - timeRange.start) / (1000 * 60 * 60 * 24));
        
        // Create date buckets
        let buckets = [];
        let interval = 'day';
        
        if (daysDiff <= 7) {
            // Daily buckets
            interval = 'day';
            for (let i = 0; i <= daysDiff; i++) {
                const date = new Date(timeRange.start);
                date.setDate(date.getDate() + i);
                buckets.push({
                    date: date,
                    label: date.getDate() + ' ' + date.toLocaleDateString('en-US', { month: 'short' }),
                    count: 0
                });
            }
        } else if (daysDiff <= 30) {
            // Weekly buckets
            interval = 'week';
            const weeks = Math.ceil(daysDiff / 7);
            for (let i = 0; i < weeks; i++) {
                const date = new Date(timeRange.start);
                date.setDate(date.getDate() + (i * 7));
                buckets.push({
                    date: date,
                    label: `Week ${i + 1}`,
                    count: 0
                });
            }
        } else {
            // Monthly buckets
            interval = 'month';
            const months = Math.ceil(daysDiff / 30);
            for (let i = 0; i < months; i++) {
                const date = new Date(timeRange.start);
                date.setMonth(date.getMonth() + i);
                buckets.push({
                    date: date,
                    label: date.toLocaleDateString('en-US', { month: 'short' }),
                    count: 0
                });
            }
        }
        
        // Count leads in each bucket
        leads.forEach(lead => {
            if (!lead.created_at) return;
            
            try {
                const leadDate = new Date(lead.created_at);
                
                for (const bucket of buckets) {
                    if (interval === 'day') {
                        if (leadDate.getDate() === bucket.date.getDate() &&
                            leadDate.getMonth() === bucket.date.getMonth() &&
                            leadDate.getFullYear() === bucket.date.getFullYear()) {
                            bucket.count++;
                            break;
                        }
                    } else if (interval === 'week') {
                        const weekStart = new Date(bucket.date);
                        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
                        const weekEnd = new Date(weekStart);
                        weekEnd.setDate(weekEnd.getDate() + 6);
                        
                        if (leadDate >= weekStart && leadDate <= weekEnd) {
                            bucket.count++;
                            break;
                        }
                    } else {
                        // month
                        if (leadDate.getMonth() === bucket.date.getMonth() &&
                            leadDate.getFullYear() === bucket.date.getFullYear()) {
                            bucket.count++;
                            break;
                        }
                    }
                }
            } catch (error) {
                console.warn('Invalid lead date:', lead.created_at);
            }
        });
        
        return {
            labels: buckets.map(b => b.label),
            datasets: [{
                label: 'Leads',
                data: buckets.map(b => b.count),
                backgroundColor: 'rgba(0, 153, 255, 0.2)',
                borderColor: 'rgba(0, 153, 255, 1)',
                borderWidth: 2,
                tension: 0.1,
                fill: true
            }]
        };
    }
    
    updateStats(stats) {
        // Update stat values
        this.updateElement('totalLeadsStat', stats.totalLeads);
        this.updateElement('conversionRateStat', `${stats.conversionRate}%`);
        this.updateElement('responseRateStat', `${stats.responseRate}%`);
        this.updateElement('avgResponseTimeStat', `${stats.avgResponseTime}h`);
        
        // Update trends
        this.updateTrendElement('totalLeadsTrend', stats.totalLeadsTrend);
        this.updateTrendElement('conversionTrend', stats.conversionTrend);
        this.updateTrendElement('responseTrend', stats.responseTrend);
        this.updateTrendElement('responseTimeTrend', stats.responseTimeTrend);
    }
    
    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    }
    
    updateTrendElement(elementId, trendValue) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        element.textContent = trendValue;
        
        // Remove existing classes
        element.classList.remove('text-success', 'text-danger', 'text-warning');
        
        // Simple trend coloring
        if (trendValue.startsWith('+')) {
            element.classList.add('text-success');
        } else if (trendValue.startsWith('-')) {
            element.classList.add('text-danger');
        } else {
            element.classList.add('text-warning');
        }
    }
    
    updateCharts(analyticsData) {
        // Destroy existing charts
        Object.values(this.charts).forEach(chart => {
            if (chart.instance) {
                chart.instance.destroy();
                chart.instance = null;
            }
        });
        
        // Create new charts
        setTimeout(() => {
            if (analyticsData.charts.temperature && this.charts.temperatureChart) {
                this.createChart('temperatureChart', 'pie', analyticsData.charts.temperature);
            }
            
            if (analyticsData.charts.source && this.charts.sourceChart) {
                this.createChart('sourceChart', 'doughnut', analyticsData.charts.source);
            }
            
            if (analyticsData.charts.timeline && this.charts.timelineChart) {
                this.createChart('timelineChart', 'line', analyticsData.charts.timeline, {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                precision: 0
                            }
                        }
                    }
                });
            }
        }, 100);
    }
    
    createChart(chartId, type, data, customOptions = {}) {
        const chartConfig = this.charts[chartId];
        if (!chartConfig || !data) {
            console.warn(`Chart config or data missing for ${chartId}`);
            return;
        }
        
        const defaultOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true,
                        font: {
                            size: 12,
                            weight: 'bold'
                        }
                    }
                },
                title: {
                    display: true,
                    text: chartConfig.title,
                    font: {
                        size: 16,
                        weight: 'bold'
                    },
                    padding: {
                        top: 10,
                        bottom: 30
                    }
                }
            }
        };
        
        const options = { ...defaultOptions, ...customOptions };
        
        try {
            // Get canvas context
            const ctx = chartConfig.canvas.getContext('2d');
            
            // Create chart
            chartConfig.instance = new Chart(ctx, {
                type: type,
                data: data,
                options: options
            });
            
            console.log(`✅ Chart ${chartId} created successfully`);
        } catch (error) {
            console.error(`❌ Error creating chart ${chartId}:`, error);
        }
    }
    
    formatSourceName(source) {
        const sourceNames = {
            'instagram': 'Instagram',
            'facebook': 'Facebook',
            'referral': 'Referral',
            'manual': 'Manual',
            'website': 'Website',
            'unknown': 'Unknown',
            'other': 'Other'
        };
        
        return sourceNames[source] || 
               source.charAt(0).toUpperCase() + source.slice(1).toLowerCase();
    }
    
    showLoading(show) {
        const containers = ['temperatureChart', 'sourceChart', 'timelineChart'];
        
        containers.forEach(containerId => {
            const container = document.getElementById(containerId);
            if (!container) return;
            
            if (show) {
                if (!container.querySelector('.spinner-border')) {
                    const height = containerId === 'timelineChart' ? '250px' : '200px';
                    container.innerHTML = `
                        <div class="d-flex justify-content-center align-items-center" style="height: ${height}">
                            <div class="spinner-border text-secondary"></div>
                        </div>
                    `;
                }
            } else {
                // Clear only if showing spinner
                if (container.querySelector('.spinner-border')) {
                    container.innerHTML = '';
                    const canvas = document.createElement('canvas');
                    canvas.id = `${containerId}Canvas`;
                    container.appendChild(canvas);
                    
                    // Update chart canvas reference
                    if (this.charts[containerId]) {
                        this.charts[containerId].canvas = canvas;
                    }
                }
            }
        });
    }
    
    showError(message) {
        const containers = ['temperatureChart', 'sourceChart', 'timelineChart'];
        
        containers.forEach(containerId => {
            const container = document.getElementById(containerId);
            if (container) {
                const height = containerId === 'timelineChart' ? '250px' : '200px';
                container.innerHTML = `
                    <div class="d-flex justify-content-center align-items-center" style="height: ${height}">
                        <div class="text-center text-danger">
                            <i class="bi bi-exclamation-triangle display-6 mb-2"></i>
                            <p class="small">${message}</p>
                        </div>
                    </div>
                `;
            }
        });
    }
    
    // Public method to refresh analytics
    refresh() {
        this.updateAnalytics();
    }
}