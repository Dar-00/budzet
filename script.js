const storageKey = 'premium-budget-transactions';

const categories = {
  income: ['Wynagrodzenie', 'Premia', 'Zwrot', 'Inwestycje', 'Inne'],
  expense: ['Jedzenie', 'Mieszkanie', 'Transport', 'Zdrowie', 'Rozrywka', 'Subskrypcje', 'Inne']
};

const elements = {
  form: document.getElementById('transactionForm'),
  category: document.getElementById('transactionCategory'),
  transactions: document.getElementById('transactions'),
  transactionsCount: document.getElementById('transactionsCount'),
  analytics: document.getElementById('categoryAnalytics'),
  monthStatus: document.getElementById('monthStatus'),
  income: document.getElementById('income'),
  expenses: document.getElementById('expenses'),
  balance: document.getElementById('balance'),
  incomeMeta: document.getElementById('incomeMeta'),
  expenseMeta: document.getElementById('expenseMeta'),
  balanceMeta: document.getElementById('balanceMeta'),
  heroBalance: document.getElementById('heroBalance'),
  heroTransactions: document.getElementById('heroTransactions'),
  heroCategory: document.getElementById('heroCategory'),
  financialPulse: document.getElementById('financialPulse')
};

const state = {
  transactions: loadTransactions(),
  editingId: null
};

setMonthStatus();
setDefaultDate();
fillCategorySelect(elements.category, getSelectedType(elements.form));
bindEvents();
render();

function bindEvents() {
  elements.form.addEventListener('submit', handleCreateTransaction);
  elements.form.addEventListener('change', handleCreateFormChange);
  elements.transactions.addEventListener('click', handleTransactionAction);
  elements.transactions.addEventListener('submit', handleEditTransaction);
  elements.transactions.addEventListener('change', handleEditFormChange);
}

function handleCreateFormChange(event) {
  if (event.target.name !== 'type') {
    return;
  }

  fillCategorySelect(elements.category, getSelectedType(elements.form));
}

function handleCreateTransaction(event) {
  event.preventDefault();

  const data = readTransactionForm(elements.form);

  if (!isValidTransaction(data)) {
    return;
  }

  state.transactions.push({
    id: createId(),
    createdAt: new Date().toISOString(),
    ...data
  });

  saveTransactions();
  elements.form.reset();
  setDefaultDate();
  fillCategorySelect(elements.category, getSelectedType(elements.form));
  elements.form.elements.description.focus();
  render();
}

function handleTransactionAction(event) {
  const button = event.target.closest('button[data-action]');

  if (!button) {
    return;
  }

  const id = button.dataset.id;
  const action = button.dataset.action;

  if (action === 'edit') {
    state.editingId = id;
    renderTransactions();
    return;
  }

  if (action === 'cancel') {
    state.editingId = null;
    renderTransactions();
    return;
  }

  if (action === 'delete') {
    state.transactions = state.transactions.filter(transaction => transaction.id !== id);

    if (state.editingId === id) {
      state.editingId = null;
    }

    saveTransactions();
    render();
  }
}

function handleEditTransaction(event) {
  event.preventDefault();

  const form = event.target;

  if (!form.classList.contains('edit-form')) {
    return;
  }

  const id = form.dataset.id;
  const data = readTransactionForm(form);

  if (!isValidTransaction(data)) {
    return;
  }

  state.transactions = state.transactions.map(transaction => {
    if (transaction.id !== id) {
      return transaction;
    }

    return {
      ...transaction,
      ...data
    };
  });

  state.editingId = null;
  saveTransactions();
  render();
}

function handleEditFormChange(event) {
  if (!event.target.classList.contains('edit-type')) {
    return;
  }

  const form = event.target.closest('.edit-form');
  fillCategorySelect(form.elements.category, form.elements.type.value);
}

function readTransactionForm(form) {
  return {
    description: form.elements.description.value.trim(),
    amount: Number(form.elements.amount.value),
    type: form.elements.type.value,
    category: form.elements.category.value,
    date: form.elements.date.value
  };
}

function isValidTransaction(transaction) {
  return (
    transaction.description.length > 0 &&
    Number.isFinite(transaction.amount) &&
    transaction.amount > 0 &&
    Boolean(transaction.date) &&
    Boolean(categories[transaction.type]) &&
    categories[transaction.type].includes(transaction.category)
  );
}

function render() {
  const monthTransactions = getCurrentMonthTransactions();
  const incomeTotal = sumByType(monthTransactions, 'income');
  const expenseTotal = sumByType(monthTransactions, 'expense');
  const balance = incomeTotal - expenseTotal;
  const incomeCount = countByType(monthTransactions, 'income');
  const expenseCount = countByType(monthTransactions, 'expense');
  const topCategory = getTopExpenseCategory(monthTransactions);

  elements.income.textContent = formatCurrency(incomeTotal);
  elements.expenses.textContent = formatCurrency(expenseTotal);
  elements.balance.textContent = formatCurrency(balance);
  elements.heroBalance.textContent = formatCurrency(balance);
  elements.heroTransactions.textContent = String(monthTransactions.length);
  elements.heroCategory.textContent = topCategory ? topCategory.category : 'Brak';
  elements.incomeMeta.textContent = formatCount(incomeCount, 'transakcja', 'transakcje', 'transakcji');
  elements.expenseMeta.textContent = formatCount(expenseCount, 'transakcja', 'transakcje', 'transakcji');
  elements.balanceMeta.textContent = balance >= 0 ? 'Dodatni wynik miesiąca' : 'Budżet wymaga korekty';
  elements.financialPulse.textContent = createPulseText(balance, incomeTotal, expenseTotal, monthTransactions.length);

  renderAnalytics(monthTransactions);
  renderTransactions();
}

function renderTransactions() {
  elements.transactions.innerHTML = '';
  elements.transactionsCount.textContent = formatCount(
    state.transactions.length,
    'pozycja',
    'pozycje',
    'pozycji'
  );

  if (state.transactions.length === 0) {
    elements.transactions.appendChild(createEmptyState('Brak transakcji. Pierwszy wpis pojawi się tutaj od razu po dodaniu.'));
    return;
  }

  const sortedTransactions = [...state.transactions].sort((first, second) => {
    const dateDiff = new Date(second.date) - new Date(first.date);
    return dateDiff || new Date(second.createdAt) - new Date(first.createdAt);
  });

  sortedTransactions.forEach(transaction => {
    if (state.editingId === transaction.id) {
      elements.transactions.appendChild(createEditCard(transaction));
      return;
    }

    elements.transactions.appendChild(createTransactionCard(transaction));
  });
}

function renderAnalytics(monthTransactions) {
  elements.analytics.innerHTML = '';

  const expenses = monthTransactions.filter(transaction => transaction.type === 'expense');
  const total = expenses.reduce((sum, transaction) => sum + transaction.amount, 0);

  if (expenses.length === 0 || total === 0) {
    elements.analytics.appendChild(createEmptyState('Brak wydatków w tym miesiącu. Analityka pojawi się po dodaniu kosztów.'));
    return;
  }

  const totals = expenses.reduce((result, transaction) => {
    result.set(transaction.category, (result.get(transaction.category) || 0) + transaction.amount);
    return result;
  }, new Map());

  [...totals.entries()]
    .sort((first, second) => second[1] - first[1])
    .forEach(([category, amount]) => {
      const percent = Math.round((amount / total) * 100);
      const item = document.createElement('div');
      item.className = 'analytics-item';

      const row = document.createElement('div');
      row.className = 'analytics-row';

      const name = document.createElement('span');
      name.textContent = category;

      const value = document.createElement('span');
      value.textContent = `${formatCurrency(amount)} · ${percent}%`;

      const track = document.createElement('div');
      track.className = 'progress-track';

      const fill = document.createElement('div');
      fill.className = 'progress-fill';
      fill.style.width = `${percent}%`;

      row.append(name, value);
      track.appendChild(fill);
      item.append(row, track);
      elements.analytics.appendChild(item);
    });
}

function createTransactionCard(transaction) {
  const card = document.createElement('article');
  card.className = `transaction-card is-${transaction.type}`;

  const icon = document.createElement('div');
  icon.className = 'transaction-icon';
  icon.textContent = transaction.type === 'income' ? '+' : '-';

  const main = document.createElement('div');
  main.className = 'transaction-main';

  const title = document.createElement('h3');
  title.className = 'transaction-title';
  title.textContent = transaction.description;

  const meta = document.createElement('div');
  meta.className = 'transaction-meta';
  meta.append(createMetaItem(transaction.category), createMetaItem(formatDate(transaction.date)));

  const amount = document.createElement('div');
  amount.className = 'transaction-amount';
  amount.textContent = `${transaction.type === 'income' ? '+' : '-'} ${formatCurrency(transaction.amount)}`;

  const actions = document.createElement('div');
  actions.className = 'transaction-actions';
  actions.append(
    createIconButton('edit', transaction.id, 'Edytuj transakcję'),
    createIconButton('delete', transaction.id, 'Usuń transakcję')
  );

  main.append(title, meta);
  card.append(icon, main, amount, actions);

  return card;
}

function createEditCard(transaction) {
  const card = document.createElement('article');
  card.className = `transaction-card is-${transaction.type}`;

  const form = document.createElement('form');
  form.className = 'edit-form';
  form.dataset.id = transaction.id;

  const description = createInput('text', 'description', transaction.description);
  description.required = true;

  const amount = createInput('number', 'amount', transaction.amount);
  amount.min = '0.01';
  amount.step = '0.01';
  amount.required = true;

  const date = createInput('date', 'date', transaction.date);
  date.required = true;

  const type = document.createElement('select');
  type.name = 'type';
  type.className = 'edit-type';
  addOption(type, 'income', 'Przychód', transaction.type);
  addOption(type, 'expense', 'Wydatek', transaction.type);

  const category = document.createElement('select');
  category.name = 'category';
  fillCategorySelect(category, transaction.type, transaction.category);

  const save = document.createElement('button');
  save.type = 'submit';
  save.className = 'save-button';
  save.textContent = 'Zapisz';

  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.className = 'cancel-button';
  cancel.textContent = 'Anuluj';
  cancel.dataset.action = 'cancel';
  cancel.dataset.id = transaction.id;

  form.append(description, amount, date, type, category, save, cancel);
  card.appendChild(form);

  return card;
}

function createInput(type, name, value) {
  const input = document.createElement('input');
  input.type = type;
  input.name = name;
  input.value = value;
  return input;
}

function createIconButton(action, id, label) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `icon-button ${action}`;
  button.dataset.action = action;
  button.dataset.id = id;
  button.setAttribute('aria-label', label);
  button.appendChild(createIcon(action));
  return button;
}

function createIcon(action) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');

  const paths = action === 'edit'
    ? [
        ['path', { d: 'M12 20h9' }],
        ['path', { d: 'M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z' }]
      ]
    : [
        ['path', { d: 'M3 6h18' }],
        ['path', { d: 'M8 6V4h8v2' }],
        ['path', { d: 'M6 6l1 14h10l1-14' }],
        ['path', { d: 'M10 11v5' }],
        ['path', { d: 'M14 11v5' }]
      ];

  paths.forEach(([tagName, attributes]) => {
    const element = document.createElementNS('http://www.w3.org/2000/svg', tagName);
    Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, value));
    svg.appendChild(element);
  });

  return svg;
}

function createMetaItem(text) {
  const item = document.createElement('span');
  item.textContent = text;
  return item;
}

function createEmptyState(text) {
  const empty = document.createElement('div');
  empty.className = 'empty-state';
  empty.textContent = text;
  return empty;
}

function fillCategorySelect(select, type, selectedCategory) {
  const options = categories[type] || [];
  const selected = options.includes(selectedCategory) ? selectedCategory : options[0];
  select.innerHTML = '';

  options.forEach(category => {
    addOption(select, category, category, selected);
  });
}

function addOption(select, value, text, selectedValue) {
  const option = document.createElement('option');
  option.value = value;
  option.textContent = text;
  option.selected = value === selectedValue;
  select.appendChild(option);
}

function getCurrentMonthTransactions() {
  const now = new Date();

  return state.transactions.filter(transaction => {
    const date = parseDate(transaction.date);
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  });
}

function getTopExpenseCategory(transactions) {
  const totals = transactions
    .filter(transaction => transaction.type === 'expense')
    .reduce((result, transaction) => {
      result.set(transaction.category, (result.get(transaction.category) || 0) + transaction.amount);
      return result;
    }, new Map());

  return [...totals.entries()]
    .sort((first, second) => second[1] - first[1])
    .map(([category, amount]) => ({ category, amount }))[0];
}

function sumByType(transactions, type) {
  return transactions
    .filter(transaction => transaction.type === type)
    .reduce((sum, transaction) => sum + transaction.amount, 0);
}

function countByType(transactions, type) {
  return transactions.filter(transaction => transaction.type === type).length;
}

function createPulseText(balance, incomeTotal, expenseTotal, count) {
  if (count === 0) {
    return 'Dodaj pierwszą transakcję, aby zobaczyć obraz miesiąca.';
  }

  if (balance >= 0) {
    return `Po wydatkach zostaje ${formatCurrency(balance)}. Przychody pokrywają ${formatCoverage(incomeTotal, expenseTotal)} kosztów.`;
  }

  return `Wydatki przekraczają przychody o ${formatCurrency(Math.abs(balance))}. Warto sprawdzić największe kategorie.`;
}

function formatCoverage(incomeTotal, expenseTotal) {
  if (expenseTotal === 0) {
    return '100%';
  }

  return `${Math.round((incomeTotal / expenseTotal) * 100)}%`;
}

function setMonthStatus() {
  elements.monthStatus.textContent = `Aktywny miesiąc · ${capitalize(formatMonth(new Date()))}`;
}

function setDefaultDate() {
  elements.form.elements.date.value = toDateInputValue(new Date());
}

function getSelectedType(form) {
  return form.elements.type.value;
}

function saveTransactions() {
  localStorage.setItem(storageKey, JSON.stringify(state.transactions));
}

function loadTransactions() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));

    if (!Array.isArray(saved)) {
      return [];
    }

    return saved
      .map(normalizeTransaction)
      .filter(Boolean);
  } catch {
    return [];
  }
}

function normalizeTransaction(transaction) {
  if (!transaction || typeof transaction !== 'object') {
    return null;
  }

  const type = categories[transaction.type] ? transaction.type : 'expense';
  const category = categories[type].includes(transaction.category)
    ? transaction.category
    : categories[type][0];
  const amount = Number(transaction.amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return {
    id: String(transaction.id || createId()),
    createdAt: transaction.createdAt || new Date().toISOString(),
    description: String(transaction.description || '').trim() || 'Transakcja',
    amount,
    type,
    category,
    date: transaction.date || toDateInputValue(new Date())
  };
}

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatCurrency(value) {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN',
    maximumFractionDigits: 2
  }).format(value);
}

function formatDate(value) {
  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(parseDate(value));
}

function formatMonth(value) {
  return new Intl.DateTimeFormat('pl-PL', {
    month: 'long',
    year: 'numeric'
  }).format(value);
}

function formatCount(count, singular, pluralFew, pluralMany) {
  if (count === 1) {
    return `1 ${singular}`;
  }

  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;

  if (lastDigit >= 2 && lastDigit <= 4 && !(lastTwoDigits >= 12 && lastTwoDigits <= 14)) {
    return `${count} ${pluralFew}`;
  }

  return `${count} ${pluralMany}`;
}

function parseDate(value) {
  return new Date(`${value}T00:00:00`);
}

function toDateInputValue(date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
