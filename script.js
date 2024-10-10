const monthSelect = document.getElementById('month');
const searchInput = document.getElementById('search-input');
const tableBody = document.getElementById('table-body');
const prevButton = document.getElementById('prev-button');
const nextButton = document.getElementById('next-button');

let currentPage = 1;
let transactions = [];

monthSelect.addEventListener('change', async () => {
    const selectedMonth = monthSelect.value;
    transactions = await getTransactions(selectedMonth, currentPage);
    updateTable(transactions);
});

searchInput.addEventListener('input', async () => {
    const searchQuery = searchInput.value;
    const selectedMonth = monthSelect.value;
    transactions = await searchTransactions(searchQuery, selectedMonth, currentPage);
    updateTable(transactions);
});

prevButton.addEventListener('click', async () => {
    currentPage--;
    transactions = await getTransactions(monthSelect.value, currentPage);
    updateTable(transactions);
});

nextButton.addEventListener('click', async () => {
    currentPage++;
    transactions = await getTransactions(monthSelect.value, currentPage);
    updateTable(transactions);
});

function updateTable(transactions) {
    tableBody.innerHTML = '';
    transactions.forEach((transaction) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${transaction.id}</td>
            <td>${transaction.title}</td>
            <td>${transaction.description}</td>
            <td>${transaction.price}</td>
        `;
        tableBody.appendChild(row);
    });
}

async function getTransactions(month, page) {
    // API call to fetch transactions for the selected month and page
    const response = await fetch(`http://localhost:3000/page?month=${month}&page=${page}`);
    const data = await response.json();
    return data.transactions;
}

async function searchTransactions(searchQuery, month, page) {
    // API call to search transactions for the selected month and page
    const response = await fetch(`http://localhost:3000/page?month=${month}&page=${page}&search=${searchQuery}`);
    const data = await response.json();
    return data.transactions;
}

const statisticsBox = document.getElementById('statistics-box');

monthSelect.addEventListener('change', async () => {
    const selectedMonth = monthSelect.value;
    const statistics = await getStatistics(selectedMonth);
    updateStatisticsBox(statistics);
});

function updateStatisticsBox(statistics) {
    document.getElementById('total-amount-value').textContent = statistics.totalAmount;
    document.getElementById('total-sold-value').textContent = statistics.totalSold;
    document.getElementById('total-not-sold-value').textContent = statistics.totalNotSold;
}

async function getStatistics(month) {
    // API call to fetch statistics for the selected month
    const response = await fetch(`http://localhost:3000/statistics?month=${month}`);
    const data = await response.json();
    return data.statistics;
}
   
const chartCanvas = document.getElementById('chart-canvas');
const ctx = chartCanvas.getContext('2d');

monthSelect.addEventListener('change', async () => {
    const selectedMonth = monthSelect.value;
    const chartData = await getChartData(selectedMonth);
    createBarChart(ctx, chartData);
});

async function getChartData(month) {
    // API call to fetch chart data for the selected month
    const response = await fetch(`http://localhost:3000/bar-chart?month=${month}`);
    const data = await response.json();
    return data.chartData;
}

function createBarChart(ctx, chartData) {
    const chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: chartData.labels,
            datasets: [{
                label: 'Price Range',
                data: chartData.data,
                backgroundColor: [
                    'rgba(255, 99, 132, 0.2)',
                    'rgba(54, 162, 235, 0.2)',
                    'rgba(255, 206, 86, 0.2)',
                    'rgba(75, 192, 192, 0.2)',
                    'rgba(153, 102, 255, 0.2)',
                    'rgba(255, 159, 64, 0.2)'
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)',
                    'rgba(255, 159, 64, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}