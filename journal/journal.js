const form = document.getElementById("tradeForm");
const clearFormBtn = document.getElementById("clearFormBtn");
const table = document.getElementById("tradeTable");

const resultFilter = document.getElementById("resultFilter");
const startDateInput = document.getElementById("startDate");
const endDateInput = document.getElementById("endDate");
const clearFiltersBtn = document.getElementById("clearFiltersBtn");

let trades = JSON.parse(localStorage.getItem("trades")) || [];

/* ===============================
   ADD TRADE or clear the form
================================= */
form.addEventListener("submit", function (e) {
    e.preventDefault();

    const trade = {
        id: Date.now(),
        date: document.getElementById("date").value,
        direction: document.getElementById("direction").value,
        symbol: document.getElementById("symbol").value,
        entry: parseFloat(document.getElementById("entry").value),
        stop: parseFloat(document.getElementById("stop").value),
        target: parseFloat(document.getElementById("target").value),
        exit: parseFloat(document.getElementById("exit").value),
        quantity : parseFloat(document.getElementById("quantity").value),
        notes : document.getElementById("notes").value || ""
    };

    // Risk per share
    trade.risk = Math.abs(trade.entry - trade.stop);

    // Reward per share
    trade.reward = Math.abs(trade.target - trade.entry);

    trade.rr = (trade.reward / trade.risk).toFixed(2);

    // Calculate P/L properly
    let priceDifference;

    if (trade.direction === "long") {
        priceDifference = trade.exit - trade.entry;
    } else {
        priceDifference = trade.entry - trade.exit;
    }

    // REAL PROFIT/LOSS
    trade.pl = (priceDifference * trade.quantity).toFixed(2);

    trades.push(trade);
    saveTrades();
    render();

    form.reset();
});

clearFormBtn.addEventListener("click", function () {
    form.reset();
});

/* ===============================
   STORAGE
================================= */
function saveTrades() {
    localStorage.setItem("trades", JSON.stringify(trades));
}

/* ===============================
   DELETE TRADE
================================= */
// delete one trade 
function deleteTrade(id) {
    trades = trades.filter(t => t.id !== id);
    saveTrades();
    render();
}

// clear all trades 
const clearAllBtn = document.getElementById("clearAllBtn");

clearAllBtn.addEventListener("click", function () {
    if (confirm("Are you sure you want to delete all trades?")) {
        trades = [];
        saveTrades();
        render();
    }
});


/* ===============================
   FILTER LOGIC
================================= */
function getFilteredTrades() {
    let filtered = [...trades];

    const resultValue = resultFilter.value;
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;

    if (resultValue === "win") {
        filtered = filtered.filter(t => parseFloat(t.pl) > 0);
    }

    if (resultValue === "loss") {
        filtered = filtered.filter(t => parseFloat(t.pl) < 0);
    }

    if (startDate) {
        filtered = filtered.filter(t => t.date >= startDate);
    }

    if (endDate) {
        filtered = filtered.filter(t => t.date <= endDate);
    }

    return filtered;
}

/* ===============================
   RENDER TABLE
================================= */
function renderTable(filteredTrades) {

    table.innerHTML = "";

    filteredTrades.forEach(trade => {

        table.innerHTML += `
            <tr>
                <td>${trade.date}</td>
                <td>${trade.symbol}</td>
                <td>${trade.direction}</td>
                <td>${trade.entry}</td>
                <td>${trade.stop}</td>
                <td>${trade.target}</td>
                <td>${trade.exit}</td>
                <td>${trade.quantity}</td>
                <td>${trade.rr}</td>
                <td>${trade.pl}</td>
                <td>
                    <textarea 
                        onchange="updateNotes(${trade.id}, this.value)"
                        rows="2"
                        style="width:150px;"
                    >${trade.notes || ""}</textarea>
                </td>
                <td>
                    <button onclick="deleteTrade(${trade.id})">Delete</button>
                </td>
            </tr>
        `;
    });
}

/* ===============================
   Update Notes
================================= */

function updateNotes(id, value) {

    const trade = trades.find(t => t.id === id);
    if (trade) {
        trade.notes = value;
        saveTrades();
    }
}

/* ===============================
   STATS + EXPECTANCY
================================= */
function updateStats(filteredTrades) {

    const totalTrades = filteredTrades.length;
    document.getElementById("totalTrades").innerText = totalTrades;

    const wins = filteredTrades.filter(t => parseFloat(t.pl) > 0);
    const losses = filteredTrades.filter(t => parseFloat(t.pl) < 0);

    const winRate = totalTrades
        ? ((wins.length / totalTrades) * 100).toFixed(2)
        : 0;

    document.getElementById("winRate").innerText = winRate + "%";

    const totalPL = filteredTrades
        .reduce((acc, t) => acc + parseFloat(t.pl), 0)
        .toFixed(2);

    document.getElementById("totalPL").innerText = totalPL;

    const avgWin = wins.length
        ? wins.reduce((a, t) => a + parseFloat(t.pl), 0) / wins.length
        : 0;

    const avgLoss = losses.length
        ? losses.reduce((a, t) => a + parseFloat(t.pl), 0) / losses.length
        : 0;

    const expectancy = totalTrades
        ? ((winRate / 100) * avgWin + ((100 - winRate) / 100) * avgLoss)
        : 0;

    document.getElementById("expectancy").innerText = expectancy.toFixed(2);

    updateChart(filteredTrades);
}

/* ===============================
   EQUITY CURVE
================================= */
let chart;

function updateChart(filteredTrades) {

    const ctx = document.getElementById("equityChart").getContext("2d");

    let equity = 0;
    const equityPoints = [0]; // Start from 0 for accurate segment comparison

    filteredTrades.forEach(trade => {
        equity += parseFloat(trade.pl);
        equityPoints.push(equity);
    });

    if (chart) chart.destroy();

    chart = new Chart(ctx, {
        type: "line",
        data: {
            labels: equityPoints.map((_, i) => i),
            datasets: [{
                label: "Profit and Loss",
                data: equityPoints,
                borderWidth: 3,
                fill: false,
                segment: {
                    borderColor: ctx => {
                        const { p0, p1 } = ctx;

                        return p1.parsed.y > p0.parsed.y
                            ? "green"
                            : "red";
                    }
                }
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: "Number of Trades"
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: "Profit and Loss"
                    }
                }
            }
        }
    });
}


/* ===============================
   Export data in csv
================================= */

const exportBtn = document.getElementById("exportBtn");

exportBtn.addEventListener("click", function () {

    if (!trades.length) {
        alert("No trades to export.");
        return;
    }

    const headers = [
        "Date","Symbol","Direction","Entry","Stop",
        "Target","Exit","Quantity","RR","PL"
    ];

    const rows = trades.map(t => [
        t.date,
        t.symbol,
        t.direction,
        t.entry,
        t.stop,
        t.target,
        t.exit,
        t.quantity,
        t.rr,
        t.pl
    ]);

    let csvContent = "data:text/csv;charset=utf-8,"
        + [headers, ...rows]
        .map(e => e.join(","))
        .join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "trades.csv");
    document.body.appendChild(link);

    link.click();
    document.body.removeChild(link);
});


/* ===============================
   MAIN RENDER
================================= */
function render() {
    checkFiltersActive();
    const filteredTrades = getFilteredTrades();
    renderTable(filteredTrades);
    updateStats(filteredTrades);
}

/* ===============================
   FILTER EVENTS
================================= */
resultFilter.addEventListener("change", () => {
    render();
    checkFiltersActive();
});

startDateInput.addEventListener("change", () => {
    render();
    checkFiltersActive();
});

endDateInput.addEventListener("change", () => {
    render();
    checkFiltersActive();
});

clearFiltersBtn.addEventListener("click", function () {

    resultFilter.value = "all";
    startDateInput.value = "";
    endDateInput.value = "";

    render();
    checkFiltersActive();
});

function checkFiltersActive() {

    const isFiltered =
        resultFilter.value !== "all" ||
        startDateInput.value !== "" ||
        endDateInput.value !== "";

    clearFiltersBtn.disabled = !isFiltered;
    clearFiltersBtn.style.opacity = isFiltered ? "1" : "0.5";
}


/* Initial Load */
render();
