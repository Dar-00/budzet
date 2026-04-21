const incomeForm = document.getElementById('incomeForm');
const expenseForm = document.getElementById('expenseForm');
const transactionsDiv = document.getElementById('transactions');

let transactions = [];

incomeForm.addEventListener('submit', function(e) {
  e.preventDefault();
  addTransaction(e.currentTarget, 'income');
});

expenseForm.addEventListener('submit', function(e) {
  e.preventDefault();
  addTransaction(e.currentTarget, 'expense');
});

function addTransaction(form, type) {
  const description = form.elements.description.value.trim();
  const amount = parseFloat(form.elements.amount.value);
  const category = form.elements.category.value;

  if (!description || Number.isNaN(amount) || amount <= 0) {
    return;
  }

  transactions.push({
    description,
    amount,
    type,
    category
  });

  form.reset();
  renderTransactions();
}

function renderTransactions() {
  transactionsDiv.innerHTML = '';

  let income = 0;
  let expenses = 0;

  transactions.forEach(t => {
    const div = document.createElement('div');
    div.classList.add('transaction');

    div.innerHTML = `
      <span>${t.description} (${t.category})</span>
      <span>${t.amount} zł</span>
    `;

    transactionsDiv.appendChild(div);

    if (t.type === 'income') {
      income += t.amount;
    } else {
      expenses += t.amount;
    }
  });

  document.getElementById('income').textContent = income + ' zł';
  document.getElementById('expenses').textContent = expenses + ' zł';
  document.getElementById('balance').textContent = (income - expenses) + ' zł';
}
