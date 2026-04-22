const storageKey = 'premium-budget-transactions';
const themeStorageKey = 'premium-budget-theme';
const casinoStorageKey = 'premium-budget-casino-demo';
const casinoHistoryLimit = 6;
const casinoMaxStake = 200;
const casinoMaxStakeRatio = 0.25;
const casinoCategory = 'Symulacja casino';
const casinoTransactionSource = 'casino-simulation';

const categories = {
  income: ['Wynagrodzenie', 'Premia', 'Zwrot', 'Inwestycje', casinoCategory, 'Inne'],
  expense: ['Jedzenie', 'Mieszkanie', 'Transport', 'Zdrowie', 'Rozrywka', 'Subskrypcje', casinoCategory, 'Inne']
};

const blackjackSuits = [
  { symbol: 'S', color: 'black' },
  { symbol: 'H', color: 'red' },
  { symbol: 'D', color: 'red' },
  { symbol: 'C', color: 'black' }
];
const blackjackRanks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const rouletteRedNumbers = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

class BlackjackSimulation {
  constructor() {
    this.resetRound();
  }

  resetRound() {
    this.playerHand = [];
    this.dealerHand = [];
    this.deck = [];
    this.roundStatus = 'waiting';
    this.playerTurnStatus = 'waiting';
    this.dealerTurnStatus = 'waiting';
    this.outcomeState = null;
    this.actionHistory = [];
    this.stake = 0;
    this.lastResult = null;
  }

  startRound(stake) {
    this.deck = createBlackjackDeck();
    this.playerHand = [];
    this.dealerHand = [];
    this.roundStatus = 'player-turn';
    this.playerTurnStatus = 'active';
    this.dealerTurnStatus = 'waiting';
    this.outcomeState = null;
    this.actionHistory = ['New round: two cards dealt to player and dealer.'];
    this.stake = stake;
    this.lastResult = null;

    this.drawTo('player');
    this.drawTo('dealer');
    this.drawTo('player');
    this.drawTo('dealer');

    if (this.getPlayerScore() === 21) {
      this.finishRound('blackjack');
    }

    return this.lastResult;
  }

  hit() {
    if (!this.canHit()) {
      return null;
    }

    const card = this.drawTo('player');
    this.actionHistory.push(`Hit: player drew ${formatBlackjackCard(card)}.`);

    if (this.getPlayerScore() > 21) {
      return this.finishRound('player-bust');
    }

    if (this.getPlayerScore() === 21) {
      this.actionHistory.push('Player reached 21. Stand is available.');
    }

    return null;
  }

  stand() {
    if (!this.canStand()) {
      return null;
    }

    this.roundStatus = 'dealer-turn';
    this.playerTurnStatus = 'stood';
    this.dealerTurnStatus = 'active';
    this.actionHistory.push('Stand: dealer turn started.');

    while (this.getDealerScore() < 17) {
      const card = this.drawTo('dealer');
      this.actionHistory.push(`Dealer drew ${formatBlackjackCard(card)}.`);
    }

    return this.finishRound('compare');
  }

  drawTo(owner) {
    if (this.deck.length === 0) {
      this.deck = createBlackjackDeck();
    }

    const card = this.deck.pop();

    if (owner === 'dealer') {
      this.dealerHand.push(card);
      return card;
    }

    this.playerHand.push(card);
    return card;
  }

  finishRound(reason) {
    const playerScore = this.getPlayerScore();
    const dealerScore = this.getDealerScore();
    const isNaturalBlackjack = playerScore === 21 && this.playerHand.length === 2;

    this.roundStatus = 'finished';
    this.playerTurnStatus = playerScore > 21 ? 'bust' : 'finished';
    this.dealerTurnStatus = dealerScore > 21 ? 'bust' : 'finished';

    if (reason === 'blackjack' && isNaturalBlackjack && Math.random() < 0.04) {
      this.outcomeState = {
        type: 'jackpot',
        label: 'Jackpot event',
        delta: calculateCasinoJackpot(this.stake),
        detail: `Natural 21 vs dealer ${dealerScore}`,
        message: `Symboliczny jackpot event: +${formatCasinoAmount(calculateCasinoJackpot(this.stake))} za demonstracyjne natural 21.`
      };
    } else if (playerScore > 21) {
      const delta = -Math.ceil(this.stake * 0.55);
      this.outcomeState = {
        type: 'loss',
        label: 'Small loss',
        delta,
        detail: `Player bust ${playerScore}`,
        message: `Small loss: ${formatCasinoAmount(delta)}. Runda zakończona po przekroczeniu 21.`
      };
    } else if (dealerScore > 21 || playerScore > dealerScore) {
      const isBonus = isNaturalBlackjack || playerScore === 21;
      const delta = isBonus ? Math.ceil(this.stake * 1.5) : this.stake;
      this.outcomeState = {
        type: isBonus ? 'bonus' : 'standard',
        label: isBonus ? 'Bonus win' : 'Standard win',
        delta,
        detail: `Player ${playerScore} vs dealer ${dealerScore}`,
        message: `${isBonus ? 'Bonus win' : 'Standard win'}: +${formatCasinoAmount(delta)} w pełnej rundzie Blackjack Simulation.`
      };
    } else if (playerScore === dealerScore) {
      this.outcomeState = {
        type: 'neutral',
        label: 'Push',
        delta: 0,
        detail: `Player ${playerScore} vs dealer ${dealerScore}`,
        message: 'Push: wynik remisowy, saldo pozostaje bez zmian.'
      };
    } else {
      const delta = -Math.ceil(this.stake * 0.55);
      this.outcomeState = {
        type: 'loss',
        label: 'Small loss',
        delta,
        detail: `Player ${playerScore} vs dealer ${dealerScore}`,
        message: `Small loss: ${formatCasinoAmount(delta)}. Dealer kończy rundę z wyższą sumą.`
      };
    }

    this.actionHistory.push(`Round finished: ${this.outcomeState.label}.`);
    this.lastResult = this.createRoundResult();
    return this.lastResult;
  }

  createRoundResult() {
    return createCasinoRound({
      game: 'blackjack',
      gameName: 'Blackjack Simulation',
      type: this.outcomeState.type,
      label: this.outcomeState.label,
      delta: this.outcomeState.delta,
      stake: this.stake,
      detail: this.outcomeState.detail,
      message: this.outcomeState.message,
      visual: this.getViewModel()
    });
  }

  canDeal() {
    return this.roundStatus === 'waiting' || this.roundStatus === 'finished';
  }

  canHit() {
    return this.roundStatus === 'player-turn' && this.playerTurnStatus === 'active' && this.getPlayerScore() < 21;
  }

  canStand() {
    return this.roundStatus === 'player-turn' && this.playerTurnStatus === 'active';
  }

  getAvailableActions() {
    return {
      deal: this.canDeal(),
      hit: this.canHit(),
      stand: this.canStand()
    };
  }

  getPlayerScore() {
    return scoreBlackjackHand(this.playerHand);
  }

  getDealerScore() {
    return scoreBlackjackHand(this.dealerHand);
  }

  getStatusMessage() {
    const statuses = {
      waiting: 'Waiting to start',
      'player-turn': 'Player turn',
      'dealer-turn': 'Dealer turn',
      finished: 'Round finished'
    };

    return statuses[this.roundStatus] || 'Waiting to start';
  }

  getViewModel() {
    const preview = createBlackjackPreview();
    const playerCards = this.playerHand.length > 0 ? this.playerHand : preview.playerCards;
    const dealerCards = this.dealerHand.length > 0 ? this.dealerHand : preview.dealerCards;

    return {
      playerCards,
      dealerCards,
      playerTotal: this.playerHand.length > 0 ? this.getPlayerScore() : preview.playerTotal,
      dealerTotal: this.dealerHand.length > 0 ? this.getDealerScore() : preview.dealerTotal,
      roundStatus: this.roundStatus,
      playerTurnStatus: this.playerTurnStatus,
      dealerTurnStatus: this.dealerTurnStatus,
      statusMessage: this.getStatusMessage(),
      outcome: this.outcomeState,
      actionHistory: this.actionHistory.slice(-5)
    };
  }
}

class RouletteSimulation {
  constructor() {
    this.selectedNumbers = new Set();
    this.selectedColors = new Set();
    this.phase = 'selection';
    this.result = null;
    this.pendingStake = 0;
    this.recentResults = [];
  }

  toggleNumber(number) {
    if (this.phase === 'spin' || this.phase === 'reveal') {
      return;
    }

    if (this.selectedNumbers.has(number)) {
      this.selectedNumbers.delete(number);
    } else {
      this.selectedNumbers.add(number);
    }

    this.phase = 'selection';
    this.result = null;
  }

  toggleColor(color) {
    if (this.phase === 'spin' || this.phase === 'reveal') {
      return;
    }

    if (!['red', 'black', 'green'].includes(color)) {
      return;
    }

    if (this.selectedColors.has(color)) {
      this.selectedColors.delete(color);
    } else {
      this.selectedColors.clear();
      this.selectedColors.add(color);
    }

    this.phase = 'selection';
    this.result = null;
  }

  resetSelections() {
    if (this.phase === 'spin' || this.phase === 'reveal') {
      return;
    }

    this.selectedNumbers.clear();
    this.selectedColors.clear();
    this.phase = 'selection';
    this.result = null;
    this.pendingStake = 0;
  }

  reset() {
    this.selectedNumbers.clear();
    this.selectedColors.clear();
    this.phase = 'selection';
    this.result = null;
    this.pendingStake = 0;
    this.recentResults = [];
  }

  canSpin() {
    return this.hasSelections() && this.phase !== 'spin' && this.phase !== 'reveal';
  }

  hasSelections() {
    return this.selectedNumbers.size > 0 || this.selectedColors.size > 0;
  }

  startSpin(stake) {
    if (!this.canSpin()) {
      return false;
    }

    this.phase = 'spin';
    this.pendingStake = stake;
    this.result = null;
    return true;
  }

  finishSpin() {
    if (this.phase !== 'spin') {
      return null;
    }

    const result = this.drawResult();
    const selectedNumbers = [...this.selectedNumbers].sort((first, second) => first - second);
    const selectedColors = [...this.selectedColors];
    const matchType = this.getMatchType(result);
    const round = this.createRound(this.pendingStake, result, selectedNumbers, selectedColors, matchType);

    this.phase = 'reveal';
    this.result = result;
    this.pendingStake = 0;
    this.recentResults = [result, ...this.recentResults].slice(0, 8);

    return round;
  }

  finishSummary() {
    if (this.phase === 'reveal') {
      this.phase = 'summary';
    }
  }

  drawResult() {
    const number = randomInt(0, 36);

    return {
      number,
      color: getRouletteNumberColor(number)
    };
  }

  getMatchType(result) {
    if (this.selectedNumbers.has(result.number)) {
      return 'number';
    }

    if (this.selectedColors.has(result.color)) {
      return 'color';
    }

    return 'none';
  }

  createRound(stake, result, selectedNumbers, selectedColors, matchType) {
    const gameName = 'Roulette Simulation';
    const visual = {
      color: result.color,
      number: String(result.number),
      selectedNumbers,
      selectedColors,
      spinning: true
    };

    if (matchType !== 'none' && result.number === 0 && Math.random() < 0.08) {
      const delta = calculateCasinoJackpot(stake);

      return createCasinoRound({
        game: 'roulette',
        gameName,
        type: 'jackpot',
        label: 'Jackpot event',
        delta,
        stake,
        detail: `Green 0 · ${this.getSelectionSummary()}`,
        message: `Symboliczny jackpot event: +${formatCasinoAmount(delta)} po trafieniu pola 0.`,
        visual
      });
    }

    if (matchType !== 'none') {
      const isNumberMatch = matchType === 'number';
      const isBonus = result.number === 0 || isNumberMatch && selectedNumbers.length <= 2;
      const multiplier = getRouletteMultiplier(result, selectedNumbers.length, selectedColors.length, matchType);
      const delta = Math.ceil(stake * multiplier);
      const detailPrefix = isNumberMatch ? `Number ${result.number}` : `${capitalize(result.color)} color`;

      return createCasinoRound({
        game: 'roulette',
        gameName,
        type: isBonus ? 'bonus' : 'standard',
        label: isBonus ? 'Bonus win' : 'Standard win',
        delta,
        stake,
        detail: `${detailPrefix} · ${this.getSelectionSummary()}`,
        message: `${isBonus ? 'Bonus win' : 'Standard win'}: +${formatCasinoAmount(delta)} za trafienie ${isNumberMatch ? `pola ${result.number}` : `koloru ${result.color}`}.`,
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
      detail: `${capitalize(result.color)} ${result.number} · ${this.getSelectionSummary()}`,
      message: `Small loss: ${formatCasinoAmount(delta)}. Wylosowane pole ${result.number} nie było w aktualnych wyborach.`,
      visual
    });
  }

  getSelectionSummary() {
    const selectedNumbers = [...this.selectedNumbers].sort((first, second) => first - second);
    const selectedColors = [...this.selectedColors].map(getRouletteColorLabel);
    const parts = [];

    if (selectedColors.length > 0) {
      parts.push(`Kolory: ${selectedColors.join(', ')}`);
    }

    if (selectedNumbers.length > 0) {
      parts.push(selectedNumbers.length <= 8
        ? `Numery: ${selectedNumbers.join(', ')}`
        : `Numery: ${selectedNumbers.slice(0, 8).join(', ')} +${selectedNumbers.length - 8}`);
    }

    return parts.length > 0 ? parts.join(' · ') : 'Brak wyborów';
  }

  getStatusMessage() {
    const statuses = {
      selection: this.hasSelections() ? 'Faza wyboru stawki' : 'Wybierz numer lub kolor',
      spin: 'Spin phase',
      reveal: 'Result reveal phase',
      summary: 'Round summary'
    };

    return statuses[this.phase] || 'Wybierz numer lub kolor';
  }
}

const elements = {
  form: document.getElementById('transactionForm'),
  category: document.getElementById('transactionCategory'),
  transactions: document.getElementById('transactions'),
  transactionsCount: document.getElementById('transactionsCount'),
  analytics: document.getElementById('categoryAnalytics'),
  themeSelect: document.getElementById('themeSelect'),
  casinoSection: document.querySelector('.casino-section'),
  casinoContent: document.getElementById('casinoSimulationContent'),
  casinoToggleButton: document.getElementById('casinoToggleButton'),
  casinoMiniBalance: document.getElementById('casinoMiniBalance'),
  casinoBalanceLabel: document.getElementById('casinoBalanceLabel'),
  casinoCredits: document.getElementById('casinoCredits'),
  casinoGameTabs: document.querySelectorAll('[data-casino-game]'),
  casinoBetInput: document.getElementById('casinoBetInput'),
  casinoBetHint: document.getElementById('casinoBetHint'),
  casinoChipButtons: document.querySelectorAll('[data-bet-chip]'),
  blackjackActionPanel: document.getElementById('blackjackActionPanel'),
  blackjackDealButton: document.getElementById('blackjackDealButton'),
  blackjackHitButton: document.getElementById('blackjackHitButton'),
  blackjackStandButton: document.getElementById('blackjackStandButton'),
  rouletteChoicePanel: document.getElementById('rouletteChoicePanel'),
  rouletteColorButtons: document.querySelectorAll('[data-roulette-color]'),
  roulettePicksSummary: document.getElementById('roulettePicksSummary'),
  rouletteClearButton: document.getElementById('rouletteClearButton'),
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
  casino: loadCasinoState(),
  casinoExpanded: false,
  blackjack: new BlackjackSimulation(),
  roulette: new RouletteSimulation(),
  rouletteSpinTimer: null
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
  elements.casinoToggleButton.addEventListener('click', handleCasinoToggle);
  elements.casinoGameTabs.forEach(button => button.addEventListener('click', handleCasinoGameChange));
  elements.casinoChipButtons.forEach(button => button.addEventListener('click', handleCasinoChipClick));
  elements.blackjackDealButton.addEventListener('click', handleBlackjackDeal);
  elements.blackjackHitButton.addEventListener('click', handleBlackjackHit);
  elements.blackjackStandButton.addEventListener('click', handleBlackjackStand);
  elements.rouletteColorButtons.forEach(button => button.addEventListener('click', handleRouletteColorClick));
  elements.rouletteClearButton.addEventListener('click', handleRouletteClear);
  elements.casinoBetInput.addEventListener('input', handleCasinoStakeInput);
  elements.casinoBetInput.addEventListener('change', handleCasinoStakeCommit);
  elements.casinoPlayButton.addEventListener('click', handleCasinoPlay);
  elements.casinoResetButton.addEventListener('click', handleCasinoReset);
  elements.casinoStage.addEventListener('click', handleCasinoStageClick);
}

function handleThemeChange(event) {
  const theme = event.target.value;
  applyTheme(theme);
  saveTheme(theme);
}

function handleCasinoToggle() {
  state.casinoExpanded = !state.casinoExpanded;
  renderCasinoVisibility();
}

function handleCasinoGameChange(event) {
  const game = event.currentTarget.dataset.casinoGame;

  if (!['blackjack', 'roulette', 'slots'].includes(game)) {
    return;
  }

  clearRouletteSpinTimer();
  state.casino.game = game;
  state.casino.lastRound = null;
  state.casino.status = getActiveCasinoStatus();
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

function handleBlackjackDeal() {
  const stake = getPlayableCasinoStake();

  if (!stake) {
    renderCasino();
    return;
  }

  state.casino.lastRound = null;
  const round = state.blackjack.startRound(stake);
  state.casino.status = state.blackjack.getStatusMessage();
  state.casino.stake = stake;
  saveCasinoState();

  if (round) {
    completeCasinoRound(round);
    return;
  }

  renderCasino();
}

function handleBlackjackHit() {
  const round = state.blackjack.hit();
  state.casino.status = state.blackjack.getStatusMessage();

  if (round) {
    completeCasinoRound(round);
    return;
  }

  renderCasino();
}

function handleBlackjackStand() {
  const round = state.blackjack.stand();
  state.casino.status = state.blackjack.getStatusMessage();

  if (round) {
    completeCasinoRound(round);
    return;
  }

  renderCasino();
}

function handleRouletteClear() {
  state.roulette.resetSelections();
  state.casino.lastRound = null;
  state.casino.status = state.roulette.getStatusMessage();
  renderCasino();
}

function handleRouletteColorClick(event) {
  state.roulette.toggleColor(event.currentTarget.dataset.rouletteColor);
  state.casino.lastRound = null;
  state.casino.status = state.roulette.getStatusMessage();
  renderCasino();
}

function handleCasinoStageClick(event) {
  if (state.casino.game !== 'roulette') {
    return;
  }

  const button = event.target.closest('[data-roulette-number]');

  if (!button) {
    return;
  }

  state.roulette.toggleNumber(Number(button.dataset.rouletteNumber));
  state.casino.lastRound = null;
  state.casino.status = state.roulette.getStatusMessage();
  renderCasino();
}

function handleCasinoPlay() {
  if (state.casino.game === 'roulette') {
    handleRouletteSpin();
    return;
  }

  if (state.casino.game !== 'slots') {
    renderCasino();
    return;
  }

  const stake = getPlayableCasinoStake();

  if (!stake) {
    renderCasino();
    return;
  }

  completeCasinoRound(playSlotsRound(stake));
}

function handleRouletteSpin() {
  const stake = getPlayableCasinoStake();

  if (!stake || !state.roulette.canSpin()) {
    state.casino.status = state.roulette.getStatusMessage();
    renderCasino();
    return;
  }

  if (!state.roulette.startSpin(stake)) {
    renderCasino();
    return;
  }

  state.casino.stake = stake;
  state.casino.lastRound = null;
  state.casino.status = state.roulette.getStatusMessage();
  saveCasinoState();
  renderCasino();

  clearRouletteSpinTimer();
  state.rouletteSpinTimer = window.setTimeout(() => {
    const round = state.roulette.finishSpin();

    if (round) {
      state.casino.lastRound = round;
      state.casino.status = state.roulette.getStatusMessage();
      renderCasino();

      state.rouletteSpinTimer = window.setTimeout(() => {
        state.roulette.finishSummary();
        state.rouletteSpinTimer = null;
        completeCasinoRound(round);
      }, 520);
      return;
    }

    state.rouletteSpinTimer = null;
    renderCasino();
  }, 780);
}

function completeCasinoRound(round) {
  const availableBalance = getCasinoAvailableBalance();
  const nextBalance = Math.max(0, availableBalance + round.delta);

  state.casino.stake = clampCasinoStake(round.stake);
  state.casino.lastRound = round;
  state.casino.status = round.label;
  state.casino.history = [
    createCasinoHistoryEntry(round, nextBalance),
    ...state.casino.history
  ].slice(0, casinoHistoryLimit);

  addCasinoTransaction(round);
  saveTransactions();
  saveCasinoState();
  render();
}

function handleCasinoReset() {
  clearRouletteSpinTimer();
  state.blackjack.resetRound();
  state.roulette.reset();
  state.casino.stake = 50;
  state.casino.history = [];
  state.casino.lastRound = null;
  state.casino.status = getActiveCasinoStatus();
  state.transactions = state.transactions.filter(transaction => transaction.source !== casinoTransactionSource);
  saveTransactions();
  saveCasinoState();
  render();
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
  renderCasino();
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

function getCurrentMonthBalance() {
  const monthTransactions = getCurrentMonthTransactions();
  return sumByType(monthTransactions, 'income') - sumByType(monthTransactions, 'expense');
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
  renderCasinoVisibility();
  renderCasinoControls();
  renderCasinoStage();
  renderCasinoHistory();
}

function renderCasinoVisibility() {
  elements.casinoContent.hidden = !state.casinoExpanded;
  elements.casinoSection.classList.toggle('is-collapsed', !state.casinoExpanded);
  elements.casinoToggleButton.setAttribute('aria-expanded', String(state.casinoExpanded));
  elements.casinoToggleButton.textContent = state.casinoExpanded ? 'Zminimalizuj' : 'Rozwiń symulator';
}

function renderCasinoControls() {
  const minStake = getCasinoMinStake();
  const maxStake = getCasinoMaxStake();
  const availableBalance = getCasinoAvailableBalance();
  const balanceEmpty = availableBalance <= 0;
  const hasCasinoTransactions = state.transactions.some(transaction => transaction.source === casinoTransactionSource);
  const gameMeta = getCasinoGameMeta(state.casino.game);
  const blackjackActions = state.blackjack.getAvailableActions();
  const isBlackjack = state.casino.game === 'blackjack';
  const isRoulette = state.casino.game === 'roulette';
  const isSlots = state.casino.game === 'slots';
  const stakeLocked = (isBlackjack && !blackjackActions.deal) || (isRoulette && ['spin', 'reveal'].includes(state.roulette.phase));

  state.casino.stake = balanceEmpty ? 0 : clampCasinoStake(state.casino.stake);
  elements.casinoBalanceLabel.textContent = getCasinoBalanceLabel();
  elements.casinoCredits.textContent = formatCasinoAmount(availableBalance);
  elements.casinoMiniBalance.textContent = formatCasinoAmount(availableBalance);
  elements.casinoPlayButton.textContent = gameMeta.action;
  elements.casinoPlayButton.hidden = isBlackjack;
  elements.casinoPlayButton.disabled = balanceEmpty || (isRoulette && !state.roulette.canSpin()) || (!isSlots && !isRoulette);
  elements.casinoResetButton.hidden = !hasCasinoTransactions && state.casino.history.length === 0;
  elements.blackjackActionPanel.hidden = !isBlackjack;
  elements.blackjackDealButton.disabled = balanceEmpty || !blackjackActions.deal;
  elements.blackjackHitButton.disabled = balanceEmpty || !blackjackActions.hit;
  elements.blackjackStandButton.disabled = balanceEmpty || !blackjackActions.stand;
  elements.rouletteChoicePanel.hidden = !isRoulette;
  elements.roulettePicksSummary.textContent = state.roulette.getSelectionSummary();
  elements.rouletteClearButton.disabled = !state.roulette.hasSelections() || ['spin', 'reveal'].includes(state.roulette.phase);
  elements.casinoBetInput.disabled = balanceEmpty || stakeLocked;
  elements.casinoBetInput.min = String(minStake);
  elements.casinoBetInput.max = String(maxStake);
  elements.casinoBetInput.value = String(state.casino.stake);
  elements.casinoModeLabel.textContent = gameMeta.label;
  elements.casinoGameTitle.textContent = gameMeta.label;
  elements.casinoRoundStatus.textContent = balanceEmpty ? 'Brak dostępnego bilansu' : getActiveCasinoStatus();

  elements.casinoBetHint.textContent = balanceEmpty
    ? `Bilans miesiąca wynosi ${formatCasinoAmount(availableBalance)}. Dodaj przychód lub usuń wydatki, aby uruchomić symulację.`
    : `Limit rundy: ${formatCasinoAmount(minStake)}-${formatCasinoAmount(maxStake)}. Saldo casino synchronizuje się z bilansem miesiąca.`;

  elements.casinoGameTabs.forEach(button => {
    const isActive = button.dataset.casinoGame === state.casino.game;
    button.classList.toggle('is-active', isActive);
  });

  elements.casinoChipButtons.forEach(button => {
    const value = Number(button.dataset.betChip);
    button.disabled = balanceEmpty || stakeLocked || value > maxStake || value < minStake;
    button.textContent = formatCasinoAmount(value);
  });

  elements.rouletteColorButtons.forEach(button => {
    const color = button.dataset.rouletteColor;
    button.disabled = !isRoulette || ['spin', 'reveal'].includes(state.roulette.phase);
    button.classList.toggle('is-selected', state.roulette.selectedColors.has(color));
  });
}

function renderCasinoStage() {
  const round = state.casino.lastRound;
  const currentRound = round && round.game === state.casino.game ? round : null;
  const resultType = currentRound ? currentRound.type : getActiveCasinoResultType();

  elements.casinoStage.innerHTML = '';
  elements.casinoStage.appendChild(createCasinoStageView(state.casino.game, currentRound));
  elements.casinoJackpotBanner.hidden = resultType !== 'jackpot';
  elements.casinoResult.className = `casino-result ${resultType ? getCasinoResultClass(resultType) : ''}`.trim();
  elements.casinoResult.textContent = currentRound
    ? currentRound.message
    : getActiveCasinoResultMessage();
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
    elements.casinoHistory.appendChild(createCasinoEmptyState('Historia pokaże tylko wyniki fikcyjnych rund symulacji.'));
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
    detail.textContent = `${entry.detail} · saldo: ${formatCasinoAmount(entry.balanceAfter)}`;

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
  const visual = round ? round.visual : state.blackjack.getViewModel();
  const table = document.createElement('div');
  table.className = 'blackjack-table';

  const statusGrid = document.createElement('div');
  statusGrid.className = 'blackjack-status-grid';
  statusGrid.append(
    createBlackjackStatusItem('Round', visual.statusMessage),
    createBlackjackStatusItem('Player', `${visual.playerTotal} points`),
    createBlackjackStatusItem('Dealer', `${visual.dealerTotal} points`)
  );

  const hands = document.createElement('div');
  hands.className = 'blackjack-hands';
  hands.append(
    createBlackjackHand('Player hand', visual.playerCards, visual.playerTotal, visual.roundStatus === 'player-turn', visual.playerTurnStatus),
    createBlackjackHand('Dealer hand', visual.dealerCards, visual.dealerTotal, visual.roundStatus === 'dealer-turn', visual.dealerTurnStatus)
  );

  table.append(statusGrid, hands, createBlackjackResultPanel(visual));
  return table;
}

function createBlackjackStatusItem(label, value) {
  const item = document.createElement('div');
  item.className = 'blackjack-status-item';

  const labelElement = document.createElement('span');
  labelElement.textContent = label;

  const valueElement = document.createElement('strong');
  valueElement.textContent = value;

  item.append(labelElement, valueElement);
  return item;
}

function createBlackjackHand(label, cards, total, isActive, turnStatus) {
  const hand = document.createElement('div');
  hand.className = `blackjack-hand ${isActive ? 'is-active' : ''} ${turnStatus === 'finished' || turnStatus === 'bust' ? 'is-finished' : ''}`.trim();

  const header = document.createElement('div');
  header.className = 'blackjack-hand-header';
  const title = document.createElement('span');
  title.className = 'blackjack-hand-title';
  title.textContent = label;

  const turn = document.createElement('span');
  turn.className = 'blackjack-turn-pill';
  turn.textContent = turnStatus;

  const cardRow = document.createElement('div');
  cardRow.className = 'blackjack-cards';

  cards.forEach(card => {
    cardRow.appendChild(createPlayingCard(card));
  });

  const totalElement = document.createElement('div');
  totalElement.className = 'hand-total';
  totalElement.textContent = `${total} points`;

  header.append(title, turn);
  hand.append(header, cardRow, totalElement);
  return hand;
}

function createPlayingCard(card) {
  const cardElement = document.createElement('div');
  cardElement.className = `playing-card ${card.color === 'red' ? 'red-card' : ''}`;

  const rank = document.createElement('span');
  rank.textContent = card.rank;

  const suit = document.createElement('small');
  suit.textContent = card.suit || '';

  cardElement.append(rank, suit);
  return cardElement;
}

function createBlackjackResultPanel(visual) {
  const panel = document.createElement('div');
  panel.className = 'blackjack-result-panel';

  const title = document.createElement('strong');
  title.textContent = visual.outcome ? visual.outcome.label : visual.statusMessage;

  const description = document.createElement('p');
  description.textContent = visual.outcome
    ? visual.outcome.detail
    : 'Deal starts a new round. Hit draws one card, Stand moves control to dealer.';

  panel.append(title, description);
  return panel;
}

function createRouletteView(round) {
  const result = state.roulette.result;
  const selected = [...state.roulette.selectedNumbers].sort((first, second) => first - second);
  const visual = round
    ? {
        ...round.visual,
        spinning: state.roulette.phase === 'spin'
      }
    : {
        color: result ? result.color : 'black',
        number: result ? String(result.number) : '--',
        selected,
        spinning: state.roulette.phase === 'spin'
      };
  const winningNumber = result ? result.number : round ? Number(round.visual.number) : null;
  const table = document.createElement('div');
  table.className = 'roulette-table';

  const wheelPanel = document.createElement('div');
  wheelPanel.className = 'roulette-wheel-panel';

  const label = document.createElement('span');
  label.className = 'roulette-label';
  label.textContent = state.roulette.getStatusMessage();

  const wheel = document.createElement('div');
  wheel.className = `roulette-wheel ${visual.spinning ? 'is-spinning' : ''}`;

  const ball = document.createElement('div');
  ball.className = 'roulette-ball';

  const outcome = document.createElement('div');
  outcome.className = `roulette-outcome ${visual.color}`;
  outcome.textContent = visual.number;

  const summary = document.createElement('div');
  summary.className = 'roulette-summary';
  summary.textContent = round || result
    ? `Winning field: ${visual.number} · ${visual.color}`
    : 'Toggle numbered cells before spinning.';

  wheel.append(ball, outcome);
  wheelPanel.append(label, wheel, summary, createRouletteRecentResults());
  table.append(wheelPanel, createRouletteBoard(selected, winningNumber), createRouletteResultPanel(round));
  return table;
}

function createRouletteBoard(selected, winningNumber) {
  const panel = document.createElement('div');
  panel.className = 'roulette-board-panel';

  const title = document.createElement('div');
  title.className = 'roulette-board-title';

  const label = document.createElement('span');
  label.textContent = 'Number board';

  const count = document.createElement('strong');
  count.textContent = `${selected.length} selected`;

  const grid = document.createElement('div');
  grid.className = 'roulette-number-grid';

  for (let number = 0; number <= 36; number += 1) {
    const button = document.createElement('button');
    const color = getRouletteNumberColor(number);
    button.type = 'button';
    button.className = `roulette-number-cell ${color}`;
    button.dataset.rouletteNumber = String(number);
    button.textContent = String(number);
    button.disabled = state.roulette.phase === 'spin' || state.roulette.phase === 'reveal';
    button.classList.toggle('is-selected', state.roulette.selectedNumbers.has(number));
    button.classList.toggle('is-winning', winningNumber === number);
    grid.appendChild(button);
  }

  title.append(label, count);
  panel.append(title, grid);
  return panel;
}

function createRouletteResultPanel(round) {
  const panel = document.createElement('div');
  panel.className = 'roulette-result-panel';

  const title = document.createElement('strong');
  const description = document.createElement('p');

  if (round) {
    title.textContent = round.label;
    description.textContent = round.detail;
  } else if (state.roulette.phase === 'spin') {
    title.textContent = 'Spin phase';
    description.textContent = 'Wheel animation is running. Result will reveal automatically.';
  } else if (state.roulette.hasSelections()) {
    title.textContent = 'Ready to spin';
    description.textContent = `Aktualne wybory: ${state.roulette.getSelectionSummary()}.`;
  } else {
    title.textContent = 'Selection phase';
    description.textContent = 'Wybierz przynajmniej jeden numer albo kolor, aby odblokować spin.';
  }

  panel.append(title, description);
  return panel;
}

function createRouletteRecentResults() {
  const recent = document.createElement('div');
  recent.className = 'roulette-recent-results';

  if (state.roulette.recentResults.length === 0) {
    recent.textContent = 'Recent results will appear here.';
    return recent;
  }

  state.roulette.recentResults.forEach(result => {
    const item = document.createElement('span');
    item.className = `roulette-mini-result ${result.color}`;
    item.textContent = result.number;
    recent.appendChild(item);
  });

  return recent;
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
  summary.textContent = round ? visual.pattern : 'Trzy rolki fikcyjnej symulacji PLN';

  table.append(label, reels, summary);
  return table;
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

function createCasinoHistoryEntry(round, balanceAfter) {
  return {
    id: round.id,
    gameName: round.gameName,
    label: round.label,
    detail: round.detail,
    delta: round.delta,
    balanceAfter,
    createdAt: round.createdAt
  };
}

function addCasinoTransaction(round) {
  if (round.delta === 0) {
    return;
  }

  state.transactions.push({
    id: createId(),
    createdAt: new Date().toISOString(),
    description: `${round.gameName}: ${round.label}`,
    amount: Math.abs(round.delta),
    type: round.delta > 0 ? 'income' : 'expense',
    category: casinoCategory,
    date: toDateInputValue(new Date()),
    source: casinoTransactionSource
  });
}

function createBlackjackDeck() {
  const deck = [];

  blackjackSuits.forEach(suit => {
    blackjackRanks.forEach(rank => {
      deck.push({
        rank,
        suit: suit.symbol,
        color: suit.color
      });
    });
  });

  return shuffleArray(deck);
}

function scoreBlackjackHand(hand) {
  let score = 0;
  let aces = 0;

  hand.forEach(card => {
    if (card.rank === 'A') {
      aces += 1;
      score += 11;
      return;
    }

    score += ['K', 'Q', 'J'].includes(card.rank) ? 10 : Number(card.rank);
  });

  while (score > 21 && aces > 0) {
    score -= 10;
    aces -= 1;
  }

  return score;
}

function formatBlackjackCard(card) {
  return `${card.rank}${card.suit}`;
}

function getRouletteNumberColor(number) {
  if (number === 0) {
    return 'green';
  }

  return rouletteRedNumbers.has(number) ? 'red' : 'black';
}

function getRouletteColorLabel(color) {
  const labels = {
    red: 'Czerwone',
    black: 'Czarne',
    green: 'Zielone'
  };

  return labels[color] || color;
}

function getRouletteMultiplier(result, selectedNumberCount, selectedColorCount, matchType) {
  if (result.number === 0) {
    return matchType === 'number' ? 3.5 : 2.4;
  }

  if (matchType === 'number') {
    return selectedNumberCount <= 2 ? 2.1 : 1.25;
  }

  return selectedColorCount === 1 ? 0.95 : 0.65;
}

function createBlackjackPreview() {
  return {
    playerCards: [
      { rank: 'A', suit: 'S', color: 'black' },
      { rank: 'K', suit: 'H', color: 'red' }
    ],
    dealerCards: [
      { rank: '10', suit: 'C', color: 'black' },
      { rank: '8', suit: 'D', color: 'red' }
    ],
    playerTotal: 21,
    dealerTotal: 18
  };
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
      action: 'Deal / New Round'
    },
    roulette: {
      label: 'Roulette Simulation',
      action: 'Spin wheel'
    },
    slots: {
      label: 'Slot Machine Simulation',
      action: 'Spin reels'
    }
  };

  return games[game] || games.blackjack;
}

function getActiveCasinoStatus() {
  if (state.casino.game === 'blackjack') {
    return state.blackjack.getStatusMessage();
  }

  if (state.casino.game === 'roulette') {
    return state.roulette.getStatusMessage();
  }

  return state.casino.status || 'Ready';
}

function getActiveCasinoResultType() {
  if (state.casino.game === 'blackjack' && state.blackjack.outcomeState) {
    return state.blackjack.outcomeState.type;
  }

  if (state.casino.game === 'roulette' && state.roulette.phase === 'summary' && state.casino.lastRound) {
    return state.casino.lastRound.type;
  }

  return null;
}

function getActiveCasinoResultMessage() {
  if (getCasinoAvailableBalance() <= 0) {
    return 'Bilans miesiąca wynosi 0,00 zł. Symulacja nie tworzy długu ani ujemnego salda.';
  }

  if (state.casino.game === 'blackjack') {
    if (state.blackjack.outcomeState) {
      return state.blackjack.outcomeState.message;
    }

    return `${state.blackjack.getStatusMessage()}. Użyj dostępnych akcji Deal / Hit / Stand.`;
  }

  if (state.casino.game === 'roulette') {
    if (state.roulette.phase === 'spin') {
      return 'Spin phase: koło jest w ruchu, wynik zostanie odsłonięty automatycznie.';
    }

    if (state.roulette.phase === 'reveal') {
      return 'Result reveal phase: zwycięskie pole jest podświetlone, za chwilę pojawi się podsumowanie.';
    }

    if (state.roulette.hasSelections()) {
      return `Aktualne wybory: ${state.roulette.getSelectionSummary()}. Możesz uruchomić spin albo zresetować wybór.`;
    }

    return 'Wybierz co najmniej jeden kolor albo numer, aby odblokować spin.';
  }

  return 'Wybierz stawkę PLN i uruchom fikcyjną rundę.';
}

function getCasinoResultClass(type) {
  if (type === 'jackpot') {
    return 'is-jackpot';
  }

  if (type === 'loss') {
    return 'is-loss';
  }

  if (type === 'neutral') {
    return 'is-neutral';
  }

  return 'is-win';
}

function getCasinoAvailableBalance() {
  return Math.max(0, getCurrentMonthBalance());
}

function getPlayableCasinoStake() {
  if (getCasinoAvailableBalance() <= 0) {
    return null;
  }

  const stake = clampCasinoStake(state.casino.stake);

  return stake > 0 ? stake : null;
}

function clearRouletteSpinTimer() {
  if (!state.rouletteSpinTimer) {
    return;
  }

  window.clearTimeout(state.rouletteSpinTimer);
  state.rouletteSpinTimer = null;

  if (state.roulette.phase === 'spin' || state.roulette.phase === 'reveal') {
    state.roulette.phase = 'selection';
  }
}

function getCasinoMaxStake() {
  const availableBalance = getCasinoAvailableBalance();

  if (availableBalance <= 0) {
    return 0;
  }

  return Math.max(1, Math.min(casinoMaxStake, Math.floor(availableBalance * casinoMaxStakeRatio)));
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
    game: 'blackjack',
    stake: 50,
    status: 'Ready',
    lastRound: null,
    history: []
  };
}

function normalizeCasinoHistoryEntry(entry) {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  return {
    id: String(entry.id || createId()),
    gameName: String(entry.gameName || 'Royal Casino'),
    label: String(entry.label || 'Simulation round'),
    detail: String(entry.detail || 'Fictional result'),
    delta: Math.trunc(Number(entry.delta) || 0),
    balanceAfter: Math.max(0, Number(entry.balanceAfter) || 0),
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
    date: transaction.date || toDateInputValue(new Date()),
    source: transaction.source === casinoTransactionSource ? casinoTransactionSource : undefined
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
