// Starting data: a number, an array, and an object.
let total = 0;
let history = [];
let operationCount = { additions: 0, subtractions: 0 };

// Step 1: display operation history with a for loop.
function updateHistory() {
    let historyContent = "";
    for (let i = 0; i < history.length; i++) {
        // Bonus: each entry can be clicked to remove it.
        historyContent += "<li><button class='history-item' data-index='" + i + "'>" + history[i] + "</button></li>";
    }
    document.querySelector("#historyList").innerHTML = historyContent;
}

// Step 2: show the addition/subtraction counts from our object.
function updateSummary() {
    document.querySelector("#summary").innerHTML =
        "Total additions: " + operationCount.additions +
        "<br>Total subtractions: " + operationCount.subtractions;
}

// Step 3: check whether the total is positive, negative, or zero.
function checkTotal() {
    if (total > 0) {
        document.querySelector("#totalMessage").innerHTML = "The total is positive.";
    } else if (total < 0) {
        document.querySelector("#totalMessage").innerHTML = "The total is negative.";
    } else {
        document.querySelector("#totalMessage").innerHTML = "The total is zero.";
    }
}

// One update function is called once by every calculator button.
function updateResults() {
    document.querySelector("#resultId").innerHTML = total;
    updateHistory();
    updateSummary();
    checkTotal();
}

document.getElementById("subtractTwo").addEventListener("click", function() {
    total = total - 2;
    history.push("-2");
    operationCount.subtractions = operationCount.subtractions + 1;
    updateResults();
});

document.getElementById("subtractOne").addEventListener("click", function() {
    total = total - 1;
    history.push("-1");
    operationCount.subtractions = operationCount.subtractions + 1;
    updateResults();
});

document.getElementById("reset").addEventListener("click", function() {
    total = 0;
    history.push("Reset");
    updateResults();
});

document.getElementById("addOne").addEventListener("click", function() {
    total = total + 1;
    history.push("+1");
    operationCount.additions = operationCount.additions + 1;
    updateResults();
});

document.getElementById("addTwo").addEventListener("click", function() {
    total = total + 2;
    history.push("+2");
    operationCount.additions = operationCount.additions + 1;
    updateResults();
});

// Step 4: clear all data (unlike Reset, this clears history and counts).
function ClearAll() {
    total = 0;
    history = [];
    operationCount.additions = 0;
    operationCount.subtractions = 0;
    updateResults();
}
document.getElementById("clearAll").addEventListener("click", ClearAll);

// Bonus: remove only the clicked history item using splice().
// Removing history does not undo the total or operation counts.
function removeHistoryItem(index) {
    history.splice(index, 1);
    updateHistory();
}
document.getElementById("historyList").addEventListener("click", function(event) {
    const button = event.target.closest("button[data-index]");
    if (button) {
        removeHistoryItem(Number(button.dataset.index));
    }
});

// Draw the initial state when the page loads.
updateResults();
