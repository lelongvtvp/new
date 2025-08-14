const diceElements = [
	document.getElementById('dice1'),
	document.getElementById('dice2'),
	document.getElementById('dice3')
];
const rollBtn = document.getElementById('rollBtn');
const resetBtn = document.getElementById('resetBtn');
const sumText = document.getElementById('sum');
const resultText = document.getElementById('resultText');
const bowl = document.querySelector('.bowl');
const toggleBowlBtn = document.getElementById('toggleBowl');
const plate = document.querySelector('.plate');

// Betting & timer UI
const betTaiBtn = document.getElementById('betTai');
const betXiuBtn = document.getElementById('betXiu');
const betTaiAmtEl = document.getElementById('betTaiAmt');
const betXiuAmtEl = document.getElementById('betXiuAmt');
const betStatusEl = document.getElementById('betStatus');
const timerEl = document.getElementById('timer');
const historyChartEl = document.getElementById('historyChart');

let isRolling = false;
let lastTimeoutId = null;

// Betting state
let bettingOpen = true;
let totalBetTai = 0;
let totalBetXiu = 0;

// Round timer state
let secondsLeft = 60;
let timerIntervalId = null;

// History state
const HISTORY_LIMIT = 24;
const historyResults = []; // 'tai' | 'xiu'

// Audio
const audioSupport = !!(window.AudioContext || window.webkitAudioContext);
let audioCtx = null;
let masterGain = null;
function ensureAudio() {
	if (!audioSupport) return;
	if (!audioCtx) {
		audioCtx = new (window.AudioContext || window.webkitAudioContext)();
		masterGain = audioCtx.createGain();
		masterGain.gain.value = 0.6;
		masterGain.connect(audioCtx.destination);
	}
}
function playRollSound() {
	ensureAudio();
	if (!audioCtx) return;
	const duration = 0.7;
	const bufferSize = Math.floor(audioCtx.sampleRate * duration);
	const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
	const data = buffer.getChannelData(0);
	for (let i = 0; i < bufferSize; i++) {
		const t = i / bufferSize;
		const env = Math.exp(-4 * t);
		data[i] = (Math.random() * 2 - 1) * env * 0.8;
	}
	const src = audioCtx.createBufferSource();
	src.buffer = buffer;
	const g = audioCtx.createGain();
	g.gain.setValueAtTime(0.0001, audioCtx.currentTime);
	g.gain.exponentialRampToValueAtTime(0.5, audioCtx.currentTime + 0.03);
	g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
	src.connect(g).connect(masterGain);
	src.start();
}
function playClack() {
	ensureAudio();
	if (!audioCtx) return;
	const now = audioCtx.currentTime;
	const osc = audioCtx.createOscillator();
	osc.type = 'triangle';
	osc.frequency.setValueAtTime(280, now);
	osc.frequency.exponentialRampToValueAtTime(120, now + 0.12);
	const g = audioCtx.createGain();
	g.gain.setValueAtTime(0.0001, now);
	g.gain.exponentialRampToValueAtTime(0.8, now + 0.01);
	g.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
	osc.connect(g).connect(masterGain);
	osc.start(now);
	osc.stop(now + 0.16);
}

function randomInt(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRotationForValue(value) {
	switch (value) {
		case 1: return { x: 0, y: 0 };
		case 2: return { x: 0, y: 90 };
		case 3: return { x: 0, y: 180 };
		case 4: return { x: 0, y: -90 };
		case 5: return { x: -90, y: 0 };
		case 6: return { x: 90, y: 0 };
		default: return { x: 0, y: 0 };
	}
}

function applyDiceRotation(diceEl, value, extraSpin = {x:0,y:0}) {
	const { x, y } = getRotationForValue(value);
	const rx = x + extraSpin.x;
	const ry = y + extraSpin.y;
	diceEl.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) translateZ(10px)`;
	diceEl.setAttribute('data-value', String(value));
}

function rollOnce() {
	const values = diceElements.map(() => randomInt(1, 6));
	const spins = diceElements.map(() => ({ x: randomInt(3, 5) * 360, y: randomInt(3, 6) * 360 }));

	diceElements.forEach((el, idx) => {
		el.classList.add('is-rolling');
		applyDiceRotation(el, values[idx], spins[idx]);
	});

	const sum = values.reduce((a, b) => a + b, 0);
	sumText.textContent = String(sum);

	const result = sum >= 11 ? 'Tài' : 'Xỉu';
	resultText.textContent = `${result} (${sum})`;

	spawnSparkles(10);

	return { values, sum, result };
}

function spawnSparkles(count) {
	for (let i = 0; i < count; i++) {
		const s = document.createElement('div');
		s.className = 'sparkle';
		s.style.left = `${randomInt(20, 80)}%`;
		s.style.top = `${randomInt(20, 80)}%`;
		plate.appendChild(s);
		setTimeout(() => s.remove(), 700);
	}
}

function startRoll() {
	if (isRolling) return Promise.resolve(null);
	isRolling = true;
	document.body.classList.add('rolling');
	diceElements.forEach(el => el.classList.add('is-rolling'));
	setBettingOpen(false);
	playRollSound();

	// Close bowl while rolling
	setBowlOpen(false);

	let tick = 0;
	const shakeInterval = setInterval(() => {
		diceElements.forEach(el => {
			const rx = randomInt(-30, 30);
			const ry = randomInt(-30, 30);
			el.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) translateZ(10px)`;
		});
		tick += 1;
	}, 80);

	return new Promise(resolve => {
		lastTimeoutId = setTimeout(() => {
			clearInterval(shakeInterval);
			const outcome = rollOnce();
			isRolling = false;
			document.body.classList.remove('rolling');
			diceElements.forEach(el => el.classList.remove('is-rolling'));
			setBowlOpen(true);
			playClack();
			appendHistory(outcome.result);
			resolve(outcome);
		}, 1200);
	});
}

function resetGame() {
	if (lastTimeoutId) clearTimeout(lastTimeoutId);
	isRolling = false;
	document.body.classList.remove('rolling');
	diceElements.forEach((el, i) => applyDiceRotation(el, 1));
	sumText.textContent = '—';
	resultText.textContent = 'Hãy tung để bắt đầu!';
	setBowlOpen(true);
	resetBets();
	resetHistory();
	startRoundTimer();
}

function setBowlOpen(open) {
	bowl.setAttribute('data-state', open ? 'open' : 'closed');
	if (toggleBowlBtn) toggleBowlBtn.setAttribute('aria-pressed', open ? 'false' : 'true');
}

function setBettingOpen(open) {
	bettingOpen = !!open;
	updateBettingUI();
}

function updateBettingUI() {
	if (betTaiBtn) betTaiBtn.disabled = !bettingOpen;
	if (betXiuBtn) betXiuBtn.disabled = !bettingOpen;
	if (betStatusEl) {
		if (secondsLeft <= 15) betStatusEl.textContent = 'Đóng cược';
		else betStatusEl.textContent = bettingOpen ? 'Đang mở cược' : 'Đóng cược';
	}
	if (timerEl) timerEl.textContent = `${Math.max(0, secondsLeft)}s`;
	if (betTaiAmtEl) betTaiAmtEl.textContent = String(totalBetTai);
	if (betXiuAmtEl) betXiuAmtEl.textContent = String(totalBetXiu);
}

function placeBet(side) {
	if (!bettingOpen) return;
	if (side === 'tai') totalBetTai += 1;
	if (side === 'xiu') totalBetXiu += 1;
	updateBettingUI();
}

function resetBets() {
	totalBetTai = 0;
	totalBetXiu = 0;
	updateBettingUI();
}

function appendHistory(resultTextVN) {
	const side = resultTextVN === 'Tài' ? 'tai' : 'xiu';
	historyResults.push(side);
	while (historyResults.length > HISTORY_LIMIT) historyResults.shift();
	renderHistory();
}

function resetHistory() {
	historyResults.length = 0;
	renderHistory();
}

function renderHistory() {
	if (!historyChartEl) return;
	historyChartEl.innerHTML = '';
	for (const side of historyResults) {
		const dot = document.createElement('div');
		dot.className = `dot ${side}`;
		dot.title = side === 'tai' ? 'Tài' : 'Xỉu';
		historyChartEl.appendChild(dot);
	}
}

function startRoundTimer() {
	if (timerIntervalId) clearInterval(timerIntervalId);
	secondsLeft = 60;
	setBettingOpen(true);
	updateBettingUI();
	timerIntervalId = setInterval(async () => {
		secondsLeft -= 1;
		if (secondsLeft <= 15 && bettingOpen) setBettingOpen(false);
		updateBettingUI();
		if (secondsLeft <= 0) {
			clearInterval(timerIntervalId);
			timerIntervalId = null;
			await startRoll();
			resetBets();
			startRoundTimer();
		}
	}, 1000);
}

rollBtn?.addEventListener('click', async () => {
	await startRoll();
	resetBets();
	startRoundTimer();
});
resetBtn?.addEventListener('click', resetGame);

toggleBowlBtn?.addEventListener('click', () => {
	const isOpen = bowl.getAttribute('data-state') === 'open';
	setBowlOpen(!isOpen);
});

betTaiBtn?.addEventListener('click', () => placeBet('tai'));
betXiuBtn?.addEventListener('click', () => placeBet('xiu'));

// Keyboard shortcuts
window.addEventListener('keydown', (e) => {
	if (e.code === 'Space') {
		startRoll();
		e.preventDefault();
	}
	if (e.key?.toLowerCase() === 'r') resetGame();
	if (e.key?.toLowerCase() === 'b') setBowlOpen(bowl.getAttribute('data-state') !== 'open');
});

// Initialize
applyDiceRotation(diceElements[0], 1);
applyDiceRotation(diceElements[1], 2);
applyDiceRotation(diceElements[2], 3);
renderHistory();
updateBettingUI();
startRoundTimer();