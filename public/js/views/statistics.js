// ======================= Statistics View =======================

import { clearElement, createElement } from '../utils/dom.js';
import { formatCurrency } from '../utils/currency.js';

/**
 * Render statistics dashboard
 * @param {HTMLElement} container
 * @param {{ store: import('../state/store.js').store, formatCurrency: typeof formatCurrency }} context
 */
export function renderStatistics(container, context) {
    clearElement(container);
    const { store } = context;
    const { expenses, categories, income, user } = store.getState();
    const currency = user.preferences.currency;

    // Header
    const header = createElement('div', { classes: ['section-header'] });
    header.innerHTML = `
        <h2>Statistics & Insights</h2>
        <p class="section-header__meta">Analyze your spending patterns and financial trends</p>
    `;
    container.appendChild(header);

    // Calculate statistics
    const stats = calculateStatistics(expenses, categories, income);

    // Overview Cards
    renderOverviewCards(container, stats, currency, context);

    // Spending by Category Chart
    renderCategoryChart(container, stats, currency, context);

    // Category Usage Table
    renderCategoryTable(container, stats, currency, context);

    // Monthly Trend
    renderMonthlyTrend(container, expenses, currency, context);
}

/**
 * Calculate all statistics
 */
function calculateStatistics(expenses, categories, income) {
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalIncome = income.reduce((sum, i) => sum + i.amount, 0);
    
    // Category breakdown
    const categoryStats = new Map();
    categories.forEach(cat => {
        categoryStats.set(cat.id, {
            id: cat.id,
            name: cat.name,
            color: cat.color,
            total: 0,
            count: 0,
            percentage: 0
        });
    });

    expenses.forEach(expense => {
        const stat = categoryStats.get(expense.categoryId);
        if (stat) {
            stat.total += expense.amount;
            stat.count += 1;
        }
    });

    // Convert to array and calculate percentages
    const categoryArray = Array.from(categoryStats.values())
        .filter(stat => stat.total > 0)
        .map(stat => ({
            ...stat,
            percentage: totalExpenses > 0 ? (stat.total / totalExpenses) * 100 : 0
        }))
        .sort((a, b) => b.total - a.total);

    // Monthly breakdown
    const monthlyData = {};
    expenses.forEach(expense => {
        const month = expense.createdAt.slice(0, 7); // YYYY-MM
        if (!monthlyData[month]) {
            monthlyData[month] = 0;
        }
        monthlyData[month] += expense.amount;
    });

    return {
        totalExpenses,
        totalIncome,
        balance: totalIncome - totalExpenses,
        categoryBreakdown: categoryArray,
        monthlyData,
        transactionCount: expenses.length,
        averageTransaction: expenses.length > 0 ? totalExpenses / expenses.length : 0
    };
}

/**
 * Render overview cards
 */
function renderOverviewCards(container, stats, currency, context) {
    const cardsContainer = createElement('div', { classes: ['stats-overview'] });
    
    const cards = [
        {
            title: 'Total Expenses',
            value: formatCurrency(stats.totalExpenses, currency),
            icon: 'trend-down',
            color: 'danger'
        },
        {
            title: 'Total Income',
            value: formatCurrency(stats.totalIncome, currency),
            icon: 'trend-up',
            color: 'success'
        },
        {
            title: 'Balance',
            value: formatCurrency(stats.balance, currency),
            icon: stats.balance >= 0 ? 'trend-up' : 'trend-down',
            color: stats.balance >= 0 ? 'success' : 'danger'
        },
        {
            title: 'Transactions',
            value: stats.transactionCount.toString(),
            icon: 'stats',
            color: 'primary'
        }
    ];

    cards.forEach(card => {
        const cardEl = createElement('div', { classes: ['stats-card', `stats-card--${card.color}`] });
        cardEl.innerHTML = `
            <div class="stats-card__icon">
                <svg width="24" height="24" viewBox="0 0 24 24" class="icon">
                    <use href="#icon-${card.icon}" />
                </svg>
            </div>
            <div class="stats-card__content">
                <div class="stats-card__title">${card.title}</div>
                <div class="stats-card__value">${card.value}</div>
            </div>
        `;
        cardsContainer.appendChild(cardEl);
    });

    container.appendChild(cardsContainer);
}

/**
 * Render category spending chart (bar chart)
 */
function renderCategoryChart(container, stats, currency, context) {
    if (stats.categoryBreakdown.length === 0) {
        return;
    }

    const section = createElement('section', { classes: ['stats-section'] });
    const sectionHeader = createElement('h3', { classes: ['stats-section__title'] });
    sectionHeader.textContent = 'Spending by Category';
    section.appendChild(sectionHeader);

    const chartContainer = createElement('div', { classes: ['chart-container'] });
    
    // Get top 10 categories
    const topCategories = stats.categoryBreakdown.slice(0, 10);
    const maxAmount = Math.max(...topCategories.map(c => c.total));

    topCategories.forEach(cat => {
        const barWrapper = createElement('div', { classes: ['chart-bar-wrapper'] });
        
        const label = createElement('div', { classes: ['chart-bar-label'] });
        label.innerHTML = `
            <span class="chart-bar-name">${cat.name}</span>
            <span class="chart-bar-value">${formatCurrency(cat.total, currency)}</span>
        `;
        
        const barContainer = createElement('div', { classes: ['chart-bar-container'] });
        const bar = createElement('div', { classes: ['chart-bar'] });
        bar.style.width = `${(cat.total / maxAmount) * 100}%`;
        bar.style.backgroundColor = cat.color;
        
        const percentage = createElement('span', { classes: ['chart-bar-percentage'] });
        percentage.textContent = `${cat.percentage.toFixed(1)}%`;
        bar.appendChild(percentage);
        
        barContainer.appendChild(bar);
        barWrapper.appendChild(label);
        barWrapper.appendChild(barContainer);
        chartContainer.appendChild(barWrapper);
    });

    section.appendChild(chartContainer);
    container.appendChild(section);
}

/**
 * Render category usage table with top 5 highlighted
 */
function renderCategoryTable(container, stats, currency, context) {
    if (stats.categoryBreakdown.length === 0) {
        return;
    }

    const section = createElement('section', { classes: ['stats-section'] });
    const sectionHeader = createElement('h3', { classes: ['stats-section__title'] });
    sectionHeader.textContent = 'Category Usage Analysis';
    section.appendChild(sectionHeader);

    const hint = createElement('p', { classes: ['stats-section__hint'] });
    hint.textContent = 'Categories ranked by frequency of use';
    section.appendChild(hint);

    // Sort by usage count
    const sortedByCount = [...stats.categoryBreakdown].sort((a, b) => b.count - a.count);

    const table = createElement('table', { classes: ['stats-table'] });
    table.innerHTML = `
        <thead>
            <tr>
                <th>Rank</th>
                <th>Category</th>
                <th>Times Used</th>
                <th>Total Spent</th>
                <th>% of Total</th>
            </tr>
        </thead>
    `;

    const tbody = createElement('tbody');
    sortedByCount.forEach((cat, index) => {
        const row = createElement('tr', { 
            classes: index < 5 ? ['stats-table__row--highlight'] : [] 
        });
        
        row.innerHTML = `
            <td class="stats-table__rank">${index + 1}</td>
            <td class="stats-table__category">
                <span class="category-dot" style="background-color: ${cat.color}"></span>
                <span class="category-name">${cat.name}</span>
                ${index === 0 ? '<svg class="crown-icon" width="16" height="16" viewBox="0 0 24 24" fill="#FFD700" stroke="#FFA500" stroke-width="1.5"><path d="M12 2l2.5 7.5L22 7l-3 9H5L2 7l7.5 2.5L12 2z"/><rect x="4" y="17" width="16" height="3" fill="#FFD700" stroke="#FFA500" stroke-width="1.5"/></svg>' : ''}
            </td>
            <td class="stats-table__count">${cat.count}</td>
            <td class="stats-table__amount">${formatCurrency(cat.total, currency)}</td>
            <td class="stats-table__percentage">
                <div class="percentage-bar">
                    <div class="percentage-bar__fill" style="width: ${cat.percentage}%; background-color: ${cat.color}"></div>
                    <span class="percentage-bar__text">${cat.percentage.toFixed(1)}%</span>
                </div>
            </td>
        `;
        
        tbody.appendChild(row);
    });

    table.appendChild(tbody);
    section.appendChild(table);
    container.appendChild(section);
}

/**
 * Render monthly trend chart
 */
function renderMonthlyTrend(container, expenses, currency, context) {
    if (expenses.length === 0) {
        return;
    }

    const section = createElement('section', { classes: ['stats-section'] });
    const sectionHeader = createElement('h3', { classes: ['stats-section__title'] });
    sectionHeader.textContent = 'Monthly Spending Trend';
    section.appendChild(sectionHeader);

    // Group by month
    const monthlyData = {};
    expenses.forEach(expense => {
        const month = expense.createdAt.slice(0, 7); // YYYY-MM
        if (!monthlyData[month]) {
            monthlyData[month] = 0;
        }
        monthlyData[month] += expense.amount;
    });

    // Get last 6 months
    const months = Object.keys(monthlyData).sort().slice(-6);
    const maxAmount = Math.max(...months.map(m => monthlyData[m]));

    const trendContainer = createElement('div', { classes: ['trend-chart'] });
    
    months.forEach(month => {
        const amount = monthlyData[month];
        const monthName = new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        
        const col = createElement('div', { classes: ['trend-chart__column'] });
        
        const bar = createElement('div', { classes: ['trend-chart__bar'] });
        bar.style.height = `${(amount / maxAmount) * 100}%`;
        
        const value = createElement('div', { classes: ['trend-chart__value'] });
        value.textContent = formatCurrency(amount, currency);
        
        const label = createElement('div', { classes: ['trend-chart__label'] });
        label.textContent = monthName;
        
        col.appendChild(value);
        col.appendChild(bar);
        col.appendChild(label);
        trendContainer.appendChild(col);
    });

    section.appendChild(trendContainer);
    container.appendChild(section);
}
