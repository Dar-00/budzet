const storageKey = 'premium-budget-transactions';
const themeStorageKey = 'premium-budget-theme';
const casinoStorageKey = 'premium-budget-casino-demo';
const casinoInitialCredits = 1000;
const casinoHistoryLimit = 6;
const casinoMaxStake = 200;
const casinoMaxStakeRatio = 0.25;

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
  themeSelect: document.getElementById('themeSelect'),
  casinoBalanceLabel: document.getElementById('casinoBalanceLabel'),
  casinoCredits: document.getElementById('casinoCredits'),
  casinoGameTabs: document.querySelectorAll('[data-casino-game]'),
  casinoBetInput: document.getElementById('casinoBetInput'),
  casinoBetHint: document.getElementById('casinoBetHint'),
  casinoChipButtons: document.querySelectorAll('[data-bet-chip]'),
  rouletteChoicePanel: document.getElementById('rouletteChoicePanel'),
  rouletteColorRadios: document.querySelectorAll('input[name="rouletteColor"]'),
  casinoPlayButton: document.getElementById('casinoPlayButton'),
  casinoResetButton: document.getElementById('casinoResetButton'),
  casinoStage: document.getElementById('casinoStage'),
  casinoResult: document.getElementById('casinoResult'),
  casinoJackpotBanner: document.getElementById('casinoJackpotBanner'),
  casinoRoundStatus: document.getElementById('casinoRoundStatus'),
  casinoModeLabel: document.getElementById('casinoModeLabel'),
  casinoGameTitle: document.getElementById('casinoGameTitle'),
  casinoHistory: document.getElementById('casinoHistory'),
  casinoHistoryCount: document.getElementById('casinoHistoryCount'),
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
  editingId: null,
  casino: loadCasinoState()
};

initTheme();
initCasino();
setMonthStatus();
setDefaultDate();
fillCategorySelect(elements.category, getSelectedType(elements.form));
bindEvents();
render();

function bindEvents() {
  elements.themeSelect.addEventListener('change', handleThemeChange);
  elements.form.addEventListener('submit', handleCreateTransaction);
  elements.form.addEventListener('change', handleCreateFormChange);
  elements.transactions.addEventListener('click', handleTransactionAction);
  elements.transactions.addEventListener('submit', handleEditTransaction);
  elements.transactions.addEventListener('change', handleEditFormChange);
  elements.casinoGameTabs.forEach(button => button.addEventListener('click', handleCasinoGameChange));
  elements.casinoChipButtons.forEach(button => button.addEventListener('click', handleCasinoChipClick));
  elements.rouletteColorRadios.forEach(input => input.addEventListener('change', handleRouletteChoiceChange));
  elements.casinoBetInput.addEventListener('input', handleCasinoStakeInput);
  elements.casinoBetInput.addEventListener('change', handleCasinoStakeCommit);
  elements.casinoPlayButton.addEventListener('click', handleCasinoPlay);
  elements.casinoResetButton.addEventListener('click', handleCasinoReset);
}

function handleThemeChange(event) {
  const theme = event.target.value;
  applyTheme(theme);
  saveTheme(theme);
}

function handleCasinoGameChange(event) {
  const game = event.currentTarget.dataset.casinoGame;

  if (!['blackjack', 'roulette', 'slots'].includes(game)) {
    return;
  }

  state.casino.game = game;
  state.casino.lastRound = null;
  state.casino.status = 'Ready';
  saveCasinoState();
  renderCasino();
}

function handleCasinoChipClick(event) {
  state.casino.stake = clampCasinoStake(Number(event.currentTarget.dataset.betChip));
  state.casino.lastRound = null;
  saveCasinoState();
  renderCasino();
}

function handleCasinoStakeInput(event) {
  state.casino.stake = clampCasinoStake(Number(event.target.value));
  renderCasinoControls();
}

function handleCasinoStakeCommit() {
  state.casino.stake = clampCasinoStake(state.casino.stake);
  saveCasinoState();
  renderCasinoControls();
}

function handleRouletteChoiceChange() {
  state.casino.lastRound = null;
  renderCasinoStage();
}

function handleCasinoPlay() {
  if (state.casino.credits <= 0) {
    renderCasino();
    return;
  }

  const stake = clampCasinoStake(state.casino.stake);

  if (stake <= 0) {
    renderCasino();
    return;
  }

  const round = playCasinoRound(state.casino.game, stake);
  const nextCredits = Math.max(0, state.casino.credits + round.delta);

  state.casino.credits = nextCredits;
  state.casino.stake = clampCasinoStake(stake);
  state.casino.lastRound = round;
  state.casino.status = round.label;
  state.casino.history = [
    createCasinoHistoryEntry(round, nextCredits),
    ...state.casino.history
  ].slice(0, casinoHistoryLimit);

  saveCasinoState();
  renderCasino();
}

function handleCasinoReset() {
  state.casino.credits = casinoInitialCredits;
  state.casino.stake = 50;
  state.casino.history = [];
  state.casino.lastRound = null;
  state.casino.status = 'Ready';
  saveCasinoState();
  renderCasino();
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

function initCasino() {
  state.casino.stake = clampCasinoStake(state.casino.stake);
  renderCasino();
}

function renderCasino() {
  renderCasinoControls();
  renderCasinoStage();
  renderCasinoHistory();
}

function renderCasinoControls() {
  const minStake = getCasinoMinStake();
  const maxStake = getCasinoMaxStake();
  const creditsEmpty = state.casino.credits <= 0;
  const gameMeta = getCasinoGameMeta(state.casino.game);

  elements.casinoBalanceLabel.textContent = getCasinoBalanceLabel();
  elements.casinoCredits.textContent = formatCasinoAmount(state.casino.credits);
  elements.casinoPlayButton.textContent = gameMeta.action;
  elements.casinoPlayButton.disabled = creditsEmpty;
  elements.casinoResetButton.hidden = !creditsEmpty;
  elements.rouletteChoicePanel.hidden = state.casino.game !== 'roulette';
  elements.casinoBetInput.disabled = creditsEmpty;
  elements.casinoBetInput.min = String(minStake);
  elements.casinoBetInput.max = String(maxStake);
  elements.casinoBetInput.value = String(state.casino.stake);
  elements.casinoModeLabel.textContent = gameMeta.label;
  elements.casinoGameTitle.textContent = gameMeta.label;
  elements.casinoRoundStatus.textContent = creditsEmpty ? 'Demo balance empty' : state.casino.status;

  elements.casinoBetHint.textContent = creditsEmpty
    ? `Saldo PLN wynosi 0. Możesz zresetować wyłącznie fikcyjne saldo symulacji.`
    : `Limit rundy: ${formatCasinoAmount(minStake)}-${formatCasinoAmount(maxStake)}. Budżet domowy pozostaje odseparowany.`;

  elements.casinoGameTabs.forEach(button => {
    const isActive = button.dataset.casinoGame === state.casino.game;
    button.classList.toggle('is-active', isActive);
  });

  elements.casinoChipButtons.forEach(button => {
    const value = Number(button.dataset.betChip);
    button.disabled = creditsEmpty || value > maxStake || value < minStake;
    button.textContent = formatCasinoAmount(value);
  });
}

function renderCasinoStage() {
  const round = state.casino.lastRound;
  const currentRound = round && round.game === state.casino.game ? round : null;

  elements.casinoStage.innerHTML = '';
  elements.casinoStage.appendChild(createCasinoStageView(state.casino.game, currentRound));
  elements.casinoJackpotBanner.hidden = !currentRound || currentRound.type !== 'jackpot';
  elements.casinoResult.className = `casino-result ${currentRound ? getCasinoResultClass(currentRound.type) : ''}`.trim();
  elements.casinoResult.textContent = currentRound
    ? currentRound.message
    : 'Wybierz demo stake i uruchom fikcyjną rundę.';
}

function renderCasinoHistory() {
  elements.casinoHistory.innerHTML = '';
  elements.casinoHistoryCount.textContent = formatCount(
    state.casino.history.length,
    'runda',
    'rundy',
    'rund'
  );

  if (state.casino.history.length === 0) {
    elements.casinoHistory.appendChild(createCasinoEmptyState('Historia pokaże tylko wyniki fikcyjnych rund demo.'));
    return;
  }

  state.casino.history.forEach(entry => {
    const item = document.createElement('article');
    item.className = 'casino-history-item';

    const meta = document.createElement('div');
    meta.className = 'casino-history-meta';

    const title = document.createElement('strong');
    title.textContent = `${entry.gameName} · ${entry.label}`;

    const detail = document.createElement('span');
    detail.textContent = `${entry.detail} · saldo: ${formatCasinoAmount(entry.creditsAfter)}`;

    const delta = document.createElement('div');
    delta.className = `casino-history-delta ${entry.delta > 0 ? 'win' : entry.delta < 0 ? 'loss' : 'neutral'}`;
    delta.textContent = `${entry.delta > 0 ? '+' : ''}${formatCasinoAmount(entry.delta)}`;

    meta.append(title, detail);
    item.append(meta, delta);
    elements.casinoHistory.appendChild(item);
  });
}

function createCasinoStageView(game, round) {
  if (game === 'roulette') {
    return createRouletteView(round);
  }

  if (game === 'slots') {
    return createSlotsView(round);
  }

  return createBlackjackView(round);
}

function createBlackjackView(round) {
  const visual = round ? round.visual : createBlackjackPreview();
  const table = document.createElement('div');
  table.className = 'blackjack-table';

  const hands = document.createElement('div');
  hands.className = 'blackjack-hands';
  hands.append(
    createBlackjackHand('Demo player', visual.playerCards, visual.playerTotal),
    createBlackjackHand('Dealer UI', visual.dealerCards, visual.dealerTotal)
  );

  table.appendChild(hands);
  return table;
}

function createBlackjackHand(label, cards, total) {
  const hand = document.createElement('div');
  hand.className = 'blackjack-hand';

  const title = document.createElement('span');
  title.textContent = label;

  const cardRow = document.createElement('div');
  cardRow.className = 'blackjack-cards';

  cards.forEach(card => {
    const cardElement = document.createElement('div');
    cardElement.className = `playing-card ${card.color === 'red' ? 'red-card' : ''}`;
    cardElement.textContent = card.rank;
    cardRow.appendChild(cardElement);
  });

  const totalElement = document.createElement('div');
  totalElement.className = 'hand-total';
  totalElement.textContent = `${total} points`;

  hand.append(title, cardRow, totalElement);
  return hand;
}

function createRouletteView(round) {
  const visual = round ? round.visual : { color: 'black', number: '--', choice: getSelectedRouletteColor(), spinning: false };
  const table = document.createElement('div');
  table.className = 'roulette-table';

  const label = document.createElement('span');
  label.className = 'roulette-label';
  label.textContent = `Demo pick: ${visual.choice}`;

  const wheel = document.createElement('div');
  wheel.className = `roulette-wheel ${visual.spinning ? 'is-spinning' : ''}`;

  const ball = document.createElement('div');
  ball.className = 'roulette-ball';

  const outcome = document.createElement('div');
  outcome.className = `roulette-outcome ${visual.color}`;
  outcome.textContent = visual.number;

  const summary = document.createElement('div');
  summary.className = 'roulette-summary';
  summary.textContent = round ? `Result: ${visual.color}` : 'Fictional roulette interface preview';

  wheel.append(ball, outcome);
  table.append(label, wheel, summary);
  return table;
}

function createSlotsView(round) {
  const visual = round ? round.visual : { reels: ['BAR', '7', 'GEM'], spinning: false };
  const table = document.createElement('div');
  table.className = 'slot-table';

  const label = document.createElement('span');
  label.className = 'slot-label';
  label.textContent = 'Slot Machine Simulation';

  const reels = document.createElement('div');
  reels.className = 'slot-reels';

  visual.reels.forEach(symbol => {
    const reel = document.createElement('div');
    reel.className = `slot-reel ${visual.spinning ? 'is-spinning' : ''}`;
    reel.textContent = symbol;
    reels.appendChild(reel);
  });

  const summary = document.createElement('div');
  summary.className = 'slot-summary';
  summary.textContent = round ? visual.pattern : 'Three demo reels, fictional credits only';

  table.append(label, reels, summary);
  return table;
}

function playCasinoRound(game, stake) {
  if (game === 'roulette') {
    return playRouletteRound(stake);
  }

  if (game === 'slots') {
    return playSlotsRound(stake);
  }

  return playBlackjackRound(stake);
}

function playBlackjackRound(stake) {
  const outcome = weightedCasinoOutcome([
    ['jackpot', 0.012],
    ['bonus', 0.14],
    ['standard', 0.34],
    ['loss', 0.508]
  ]);
  const visual = createBlackjackOutcome(outcome);
  const gameName = 'Blackjack Simulation';

  if (outcome === 'jackpot') {
    const delta = calculateCasinoJackpot(stake);
    return createCasinoRound({
      game: 'blackjack',
      gameName,
      type: 'jackpot',
      label: 'Jackpot event',
      delta,
      stake,
      detail: 'Blackjack demo hand',
      message: `Symboliczny jackpot event: +${formatCasinoAmount(delta)}. To nadal fikcyjna symulacja UI.`,
      visual
    });
  }

  if (outcome === 'bonus') {
    const delta = Math.ceil(stake * 1.8);
    return createCasinoRound({
      game: 'blackjack',
      gameName,
      type: 'bonus',
      label: 'Bonus win',
      delta,
      stake,
      detail: 'Clean 21 in demo hand',
      message: `Bonus win: +${formatCasinoAmount(delta)} za demonstracyjną rękę 21.`,
      visual
    });
  }

  if (outcome === 'standard') {
    return createCasinoRound({
      game: 'blackjack',
      gameName,
      type: 'standard',
      label: 'Standard win',
      delta: stake,
      stake,
      detail: 'Player total beats dealer UI',
      message: `Standard win: +${formatCasinoAmount(stake)} w rundzie blackjack simulation.`,
      visual
    });
  }

  const delta = -Math.ceil(stake * 0.55);
  return createCasinoRound({
    game: 'blackjack',
    gameName,
    type: 'loss',
    label: 'Small loss',
    delta,
    stake,
    detail: 'Dealer UI has higher total',
    message: `Small loss: ${formatCasinoAmount(delta)}. Saldo nie może zejść poniżej 0.`,
    visual
  });
}

function playRouletteRound(stake) {
  const choice = getSelectedRouletteColor();
  const result = getRouletteResult();
  const isMatch = choice === result.color;
  const gameName = 'Roulette Simulation';
  const visual = {
    choice,
    color: result.color,
    number: result.number,
    spinning: true
  };

  if (isMatch && result.color === 'green' && Math.random() < 0.22) {
    const delta = calculateCasinoJackpot(stake);
    return createCasinoRound({
      game: 'roulette',
      gameName,
      type: 'jackpot',
      label: 'Jackpot event',
      delta,
      stake,
      detail: `Green ${result.number}`,
      message: `Symboliczny jackpot event: +${formatCasinoAmount(delta)} po trafieniu green.`,
      visual
    });
  }

  if (isMatch && result.color === 'green') {
    const delta = Math.ceil(stake * 4);
    return createCasinoRound({
      game: 'roulette',
      gameName,
      type: 'bonus',
      label: 'Bonus win',
      delta,
      stake,
      detail: `Green ${result.number}`,
      message: `Bonus win: +${formatCasinoAmount(delta)} za trafienie green.`,
      visual
    });
  }

  if (isMatch) {
    return createCasinoRound({
      game: 'roulette',
      gameName,
      type: 'standard',
      label: 'Standard win',
      delta: stake,
      stake,
      detail: `${capitalize(result.color)} ${result.number}`,
      message: `Standard win: +${formatCasinoAmount(stake)}. Wynik fikcyjnej ruletki: ${result.color}.`,
      visual
    });
  }

  const delta = -Math.ceil(stake * 0.6);
  return createCasinoRound({
    game: 'roulette',
    gameName,
    type: 'loss',
    label: 'Small loss',
    delta,
    stake,
    detail: `${capitalize(result.color)} ${result.number}`,
    message: `Small loss: ${formatCasinoAmount(delta)}. Wynik fikcyjnej ruletki: ${result.color}.`,
    visual
  });
}

function playSlotsRound(stake) {
  const outcome = weightedCasinoOutcome([
    ['jackpot', 0.012],
    ['bonus', 0.15],
    ['standard', 0.31],
    ['loss', 0.528]
  ]);
  const visual = createSlotsOutcome(outcome);
  const gameName = 'Slot Machine Simulation';

  if (outcome === 'jackpot') {
    const delta = calculateCasinoJackpot(stake);
    return createCasinoRound({
      game: 'slots',
      gameName,
      type: 'jackpot',
      label: 'Jackpot event',
      delta,
      stake,
      detail: visual.pattern,
      message: `Symboliczny jackpot event: +${formatCasinoAmount(delta)} na fikcyjnych rolkach.`,
      visual
    });
  }

  if (outcome === 'bonus') {
    const delta = Math.ceil(stake * 2.2);
    return createCasinoRound({
      game: 'slots',
      gameName,
      type: 'bonus',
      label: 'Bonus win',
      delta,
      stake,
      detail: visual.pattern,
      message: `Bonus win: +${formatCasinoAmount(delta)} za kombinację ${visual.pattern}.`,
      visual
    });
  }

  if (outcome === 'standard') {
    return createCasinoRound({
      game: 'slots',
      gameName,
      type: 'standard',
      label: 'Standard win',
      delta: stake,
      stake,
      detail: visual.pattern,
      message: `Standard win: +${formatCasinoAmount(stake)} za prostą kombinację symboli.`,
      visual
    });
  }

  const delta = -Math.ceil(stake * 0.5);
  return createCasinoRound({
    game: 'slots',
    gameName,
    type: 'loss',
    label: 'Small loss',
    delta,
    stake,
    detail: visual.pattern,
    message: `Small loss: ${formatCasinoAmount(delta)}. To wyłącznie demonstracyjna runda.`,
    visual
  });
}

function createCasinoRound(round) {
  return {
    id: createId(),
    createdAt: new Date().toISOString(),
    ...round
  };
}

function createCasinoHistoryEntry(round, creditsAfter) {
  return {
    id: round.id,
    gameName: round.gameName,
    label: round.label,
    detail: round.detail,
    delta: round.delta,
    creditsAfter,
    createdAt: round.createdAt
  };
}

function createBlackjackPreview() {
  return {
    playerCards: [
      { rank: 'A', color: 'black' },
      { rank: 'K', color: 'red' }
    ],
    dealerCards: [
      { rank: '10', color: 'black' },
      { rank: '8', color: 'red' }
    ],
    playerTotal: 21,
    dealerTotal: 18
  };
}

function createBlackjackOutcome(outcome) {
  const outcomes = {
    jackpot: {
      playerCards: [
        { rank: 'A', color: 'black' },
        { rank: 'K', color: 'red' }
      ],
      dealerCards: [
        { rank: 'Q', color: 'black' },
        { rank: '9', color: 'red' }
      ],
      playerTotal: 21,
      dealerTotal: 19
    },
    bonus: {
      playerCards: [
        { rank: 'A', color: 'red' },
        { rank: '10', color: 'black' }
      ],
      dealerCards: [
        { rank: '9', color: 'black' },
        { rank: '8', color: 'red' }
      ],
      playerTotal: 21,
      dealerTotal: 17
    },
    standard: {
      playerCards: [
        { rank: '10', color: 'black' },
        { rank: '9', color: 'red' }
      ],
      dealerCards: [
        { rank: '8', color: 'black' },
        { rank: '8', color: 'red' }
      ],
      playerTotal: 19,
      dealerTotal: 16
    },
    loss: {
      playerCards: [
        { rank: '10', color: 'red' },
        { rank: '6', color: 'black' }
      ],
      dealerCards: [
        { rank: '10', color: 'black' },
        { rank: '9', color: 'red' }
      ],
      playerTotal: 16,
      dealerTotal: 19
    }
  };

  return outcomes[outcome] || outcomes.standard;
}

function getRouletteResult() {
  const color = weightedCasinoOutcome([
    ['red', 0.485],
    ['black', 0.485],
    ['green', 0.03]
  ]);
  const number = color === 'green' ? '0' : String(randomInt(1, 36));
  return { color, number };
}

function createSlotsOutcome(outcome) {
  const symbols = ['7', 'BAR', 'GEM', 'ACE', 'STAR'];

  if (outcome === 'jackpot') {
    return {
      reels: ['7', '7', '7'],
      pattern: '7 / 7 / 7',
      spinning: true
    };
  }

  if (outcome === 'bonus') {
    const symbol = randomFrom(['GEM', 'BAR', 'STAR']);
    return {
      reels: [symbol, symbol, symbol],
      pattern: `${symbol} / ${symbol} / ${symbol}`,
      spinning: true
    };
  }

  if (outcome === 'standard') {
    const symbol = randomFrom(symbols);
    const third = randomFrom(symbols.filter(item => item !== symbol));
    return {
      reels: [symbol, symbol, third],
      pattern: `${symbol} / ${symbol} / ${third}`,
      spinning: true
    };
  }

  const reels = shuffleArray([...symbols]).slice(0, 3);
  return {
    reels,
    pattern: reels.join(' / '),
    spinning: true
  };
}

function getCasinoGameMeta(game) {
  const games = {
    blackjack: {
      label: 'Blackjack Simulation',
      action: 'Deal demo round'
    },
    roulette: {
      label: 'Roulette Simulation',
      action: 'Spin demo wheel'
    },
    slots: {
      label: 'Slot Machine Simulation',
      action: 'Spin demo reels'
    }
  };

  return games[game] || games.blackjack;
}

function getCasinoResultClass(type) {
  if (type === 'jackpot') {
    return 'is-jackpot';
  }

  if (type === 'loss') {
    return 'is-loss';
  }

  return 'is-win';
}

function getSelectedRouletteColor() {
  const selected = [...elements.rouletteColorRadios].find(input => input.checked);
  return selected ? selected.value : 'red';
}

function getCasinoMaxStake() {
  if (state.casino.credits <= 0) {
    return 0;
  }

  return Math.max(1, Math.min(casinoMaxStake, Math.floor(state.casino.credits * casinoMaxStakeRatio)));
}

function getCasinoMinStake() {
  const maxStake = getCasinoMaxStake();
  return maxStake > 0 ? Math.min(10, maxStake) : 0;
}

function clampCasinoStake(value) {
  const minStake = getCasinoMinStake();
  const maxStake = getCasinoMaxStake();

  if (maxStake <= 0) {
    return 0;
  }

  if (!Number.isFinite(value)) {
    return minStake;
  }

  return Math.min(maxStake, Math.max(minStake, Math.floor(value)));
}

function calculateCasinoJackpot(stake) {
  return Math.min(300, Math.max(75, stake * 4));
}

function weightedCasinoOutcome(weightedItems) {
  const roll = Math.random();
  let cursor = 0;

  for (const [value, weight] of weightedItems) {
    cursor += weight;

    if (roll <= cursor) {
      return value;
    }
  }

  return weightedItems[weightedItems.length - 1][0];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFrom(items) {
  return items[randomInt(0, items.length - 1)];
}

function shuffleArray(items) {
  return items
    .map(item => ({ item, order: Math.random() }))
    .sort((first, second) => first.order - second.order)
    .map(entry => entry.item);
}

function createCasinoEmptyState(text) {
  const empty = document.createElement('div');
  empty.className = 'casino-empty-state';
  empty.textContent = text;
  return empty;
}

function initTheme() {
  const theme = loadTheme();
  applyTheme(theme);
  elements.themeSelect.value = theme;
}

function applyTheme(theme) {
  const normalizedTheme = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = normalizedTheme;
}

function saveTheme(theme) {
  try {
    localStorage.setItem(themeStorageKey, theme === 'dark' ? 'dark' : 'light');
  } catch {
    return;
  }
}

function loadTheme() {
  try {
    return localStorage.getItem(themeStorageKey) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

function saveCasinoState() {
  try {
    localStorage.setItem(casinoStorageKey, JSON.stringify({
      credits: state.casino.credits,
      game: state.casino.game,
      stake: state.casino.stake,
      history: state.casino.history
    }));
  } catch {
    return;
  }
}

function loadCasinoState() {
  try {
    const saved = JSON.parse(localStorage.getItem(casinoStorageKey));

    if (!saved || typeof saved !== 'object') {
      return createDefaultCasinoState();
    }

    return {
      credits: normalizeCasinoCredits(saved.credits),
      game: ['blackjack', 'roulette', 'slots'].includes(saved.game) ? saved.game : 'blackjack',
      stake: Number.isFinite(Number(saved.stake)) ? Number(saved.stake) : 50,
      status: 'Ready',
      lastRound: null,
      history: Array.isArray(saved.history)
        ? saved.history.map(normalizeCasinoHistoryEntry).filter(Boolean).slice(0, casinoHistoryLimit)
        : []
    };
  } catch {
    return createDefaultCasinoState();
  }
}

function createDefaultCasinoState() {
  return {
    credits: casinoInitialCredits,
    game: 'blackjack',
    stake: 50,
    status: 'Ready',
    lastRound: null,
    history: []
  };
}

function normalizeCasinoCredits(value) {
  const credits = Math.floor(Number(value));

  if (!Number.isFinite(credits) || credits < 0) {
    return casinoInitialCredits;
  }

  return credits;
}

function normalizeCasinoHistoryEntry(entry) {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  return {
    id: String(entry.id || createId()),
    gameName: String(entry.gameName || 'Casino Simulation'),
    label: String(entry.label || 'Demo round'),
    detail: String(entry.detail || 'Fictional result'),
    delta: Math.trunc(Number(entry.delta) || 0),
    creditsAfter: normalizeCasinoCredits(entry.creditsAfter),
    createdAt: entry.createdAt || new Date().toISOString()
  };
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

function formatCasinoAmount(value) {
  return formatCurrency(value);
}

function getCasinoBalanceLabel() {
  return 'PLN';
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
