const incomeForm = document.getElementById('incomeForm');
const expenseForm = document.getElementById('expenseForm');
const transactionsDiv = document.getElementById('transactions');

const categories = {
  income: ['Wynagrodzenie', 'Premia', 'Sprzedaż', 'Inne'],
  expense: ['Jedzenie', 'Mieszkanie', 'Transport', 'Rozrywka', 'Inne']
};

let transactions = [];
let editingId = null;
let nextTransactionId = 1;

incomeForm.addEventListener('submit', function(e) {
  e.preventDefault();
  addTransaction(e.currentTarget, 'income');
});

expenseForm.addEventListener('submit', function(e) {
  e.preventDefault();
  addTransaction(e.currentTarget, 'expense');
});

transactionsDiv.addEventListener('click', function(e) {
  const button = e.target.closest('button');

  if (!button) {
    return;
  }

  const id = Number(button.dataset.id);

  if (button.dataset.action === 'edit') {
    editingId = id;
    renderTransactions();
  }

  if (button.dataset.action === 'delete') {
    transactions = transactions.filter(t => t.id !== id);
    if (editingId === id) {
      editingId = null;
    }
    renderTransactions();
  }

  if (button.dataset.action === 'cancel') {
    editingId = null;
    renderTransactions();
  }
});

transactionsDiv.addEventListener('submit', function(e) {
  e.preventDefault();

  if (!e.target.classList.contains('edit-form')) {
    return;
  }

  const form = e.target;
  const id = Number(form.dataset.id);
  const description = form.elements.description.value.trim();
  const amount = parseFloat(form.elements.amount.value);
  const type = form.elements.type.value;
  const category = form.elements.category.value;

  if (!description || Number.isNaN(amount) || amount <= 0) {
    return;
  }

  transactions = transactions.map(t => {
    if (t.id !== id) {
      return t;
    }

    return {
      ...t,
      description,
      amount,
      type,
      category
    };
  });

  editingId = null;
  renderTransactions();
});

transactionsDiv.addEventListener('change', function(e) {
  if (!e.target.classList.contains('edit-type')) {
    return;
  }

  const form = e.target.closest('.edit-form');
  const categorySelect = form.elements.category;
  fillCategorySelect(categorySelect, e.target.value);
});

function addTransaction(form, type) {
  const description = form.elements.description.value.trim();
  const amount = parseFloat(form.elements.amount.value);
  const category = form.elements.category.value;

  if (!description || Number.isNaN(amount) || amount <= 0) {
    return;
  }

  transactions.push({
    id: nextTransactionId,
    description,
    amount,
    type,
    category
  });

  nextTransactionId += 1;
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
    div.classList.add(t.type === 'income' ? 'transaction-income' : 'transaction-expense');

    if (editingId === t.id) {
      div.appendChild(createEditForm(t));
    } else {
      div.appendChild(createTransactionInfo(t));
      div.appendChild(createTransactionActions(t.id));
    }

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

function createTransactionInfo(transaction) {
  const info = document.createElement('div');
  info.classList.add('transaction-info');

  const title = document.createElement('span');
  title.textContent = `${transaction.description} (${transaction.category})`;

  const amount = document.createElement('strong');
  amount.textContent = `${transaction.amount} zł`;

  info.appendChild(title);
  info.appendChild(amount);

  return info;
}

function createTransactionActions(id) {
  const actions = document.createElement('div');
  actions.classList.add('transaction-actions');

  const editButton = document.createElement('button');
  editButton.type = 'button';
  editButton.textContent = 'Edytuj';
  editButton.dataset.action = 'edit';
  editButton.dataset.id = id;

  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.textContent = 'Usuń';
  deleteButton.classList.add('delete-button');
  deleteButton.dataset.action = 'delete';
  deleteButton.dataset.id = id;

  actions.appendChild(editButton);
  actions.appendChild(deleteButton);

  return actions;
}

function createEditForm(transaction) {
  const form = document.createElement('form');
  form.classList.add('edit-form');
  form.dataset.id = transaction.id;

  const descriptionInput = document.createElement('input');
  descriptionInput.type = 'text';
  descriptionInput.name = 'description';
  descriptionInput.value = transaction.description;
  descriptionInput.required = true;

  const amountInput = document.createElement('input');
  amountInput.type = 'number';
  amountInput.name = 'amount';
  amountInput.min = '0.01';
  amountInput.step = '0.01';
  amountInput.value = transaction.amount;
  amountInput.required = true;

  const typeSelect = document.createElement('select');
  typeSelect.name = 'type';
  typeSelect.classList.add('edit-type');
  addOption(typeSelect, 'income', 'Przychód', transaction.type);
  addOption(typeSelect, 'expense', 'Wydatek', transaction.type);

  const categorySelect = document.createElement('select');
  categorySelect.name = 'category';
  fillCategorySelect(categorySelect, transaction.type, transaction.category);

  const saveButton = document.createElement('button');
  saveButton.type = 'submit';
  saveButton.textContent = 'Zapisz';

  const cancelButton = document.createElement('button');
  cancelButton.type = 'button';
  cancelButton.textContent = 'Anuluj';
  cancelButton.dataset.action = 'cancel';
  cancelButton.dataset.id = transaction.id;

  form.appendChild(descriptionInput);
  form.appendChild(amountInput);
  form.appendChild(typeSelect);
  form.appendChild(categorySelect);
  form.appendChild(saveButton);
  form.appendChild(cancelButton);

  return form;
}

function fillCategorySelect(select, type, selectedCategory) {
  select.innerHTML = '';

  categories[type].forEach(category => {
    addOption(select, category, category, selectedCategory);
  });
}

function addOption(select, value, text, selectedValue) {
  const option = document.createElement('option');
  option.value = value;
  option.textContent = text;
  option.selected = value === selectedValue;
  select.appendChild(option);
}
