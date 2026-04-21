const form = document.getElementById('budgetForm');
const transactionsDiv = document.getElementById('transactions');

let transactions = [];

form.addEventListener('submit', function(e) {
  e.preventDefault();

  const description = document.getElementById('description').value;
  const amount = parseFloat(document.getElementById('amount').value);
  const type = document.getElementById('type').value;
  const category = document.getElementById('category').value;

  transactions.push({
    description,
    amount,
    type,
    category
  });

  form.reset();
  renderTransactions();
});

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