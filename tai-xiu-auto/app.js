/* Tai Xiu Auto Simulation */
(function() {
	const sessionEl = document.getElementById('sessionId');
	const amountTaiEl = document.getElementById('amountTai');
	const amountXiuEl = document.getElementById('amountXiu');
	const playersTaiEl = document.getElementById('playersTai');
	const playersXiuEl = document.getElementById('playersXiu');
	const countdownEl = document.getElementById('countdown');
	const beadsEl = document.getElementById('beads');
	const btnAuto = document.getElementById('btnAuto');
	const btnCancel = document.getElementById('btnCancel');
	const btnOther = document.getElementById('btnOther');
	const btnConfirm = document.getElementById('btnConfirm');
	const chipButtons = Array.from(document.querySelectorAll('.chip'));

	let currentSession = Math.floor(2000000 + Math.random() * 1000000);
	let timerInterval = null;
	let seconds = 36;
	let pendingBet = 0; // number for demo controls, not required for auto
	let lastResults = []; // 'tai' | 'xiu'

	function formatNumber(n) {
		return n.toLocaleString('vi-VN');
	}

	function setSession(id) {
		currentSession = id;
		sessionEl.textContent = currentSession.toString();
	}

	function resetRound() {
		seconds = 36;
		countdownEl.textContent = seconds.toString();
		// generate initial crowd state
		const baseTai = randomBetween(50_000, 2_000_000);
		const baseXiu = randomBetween(50_000, 2_000_000);
		amountTaiEl.textContent = formatNumber(baseTai);
		amountXiuEl.textContent = formatNumber(baseXiu);
		playersTaiEl.textContent = randomBetween(100, 450).toString();
		playersXiuEl.textContent = randomBetween(100, 450).toString();
	}

	function randomBetween(min, max) {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}

	function tick() {
		seconds -= 1;
		if (seconds < 0) return;
		countdownEl.textContent = seconds.toString();

		// While betting open, money and players trickle in
		if (seconds >= 6) {
			const incTai = randomBetween(5_000, 200_000);
			const incXiu = randomBetween(5_000, 200_000);
			amountTaiEl.textContent = formatNumber(parseNumber(amountTaiEl.textContent) + incTai);
			amountXiuEl.textContent = formatNumber(parseNumber(amountXiuEl.textContent) + incXiu);
			if (Math.random() < 0.5) { playersTaiEl.textContent = (parseInt(playersTaiEl.textContent) + 1).toString(); }
			if (Math.random() < 0.5) { playersXiuEl.textContent = (parseInt(playersXiuEl.textContent) + 1).toString(); }
		}

		// Closing window to roll result
		if (seconds === 5) {
			rollResult();
		}
		if (seconds === 0) {
			nextRound();
		}
	}

	function parseNumber(s) {
		return Number(String(s).replaceAll('.', '').replace(/\D/g, ''));
	}

	function rollResult() {
		// Weighted bias toward the side with lower money to emulate house balance
		const tai = parseNumber(amountTaiEl.textContent);
		const xiu = parseNumber(amountXiuEl.textContent);
		const total = tai + xiu || 1;
		const probTai = Math.max(0.25, Math.min(0.75, (xiu / total))); // more xiu money => more chance tai
		const isTai = Math.random() < probTai;
		animateResult(isTai ? 'tai' : 'xiu');
	}

	function animateResult(winner) {
		countdownEl.textContent = winner === 'tai' ? 'T' : 'X';
		countdownEl.style.color = winner === 'tai' ? '#33ff7d' : '#33d0ff';
		setTimeout(() => {
			updateBeads(winner);
		}, 600);
	}

	function updateBeads(winner) {
		lastResults.unshift(winner);
		if (lastResults.length > 18) lastResults.pop();
		renderBeads();
	}

	function renderBeads() {
		beadsEl.innerHTML = '';
		const all = lastResults.concat(Array.from({ length: Math.max(0, 18 - lastResults.length) }, () => null));
		all.forEach(result => {
			const dot = document.createElement('div');
			dot.className = 'bead' + (result ? ' active' : '');
			if (result) {
				dot.style.background = result === 'tai'
					? 'radial-gradient(circle at 35% 35%, #fff, #6bff91 40%, #20b954 70%, #0e6b34)'
					: 'radial-gradient(circle at 35% 35%, #fff, #86c5ff 40%, #4096ff 70%, #1c4ea3)';
			}
			beadsEl.appendChild(dot);
		});
	}

	function startTimer() {
		clearInterval(timerInterval);
		timerInterval = setInterval(tick, 1000);
	}

	function nextRound() {
		setSession(currentSession + 1);
		resetRound();
		countdownEl.style.color = '#ffea42';
	}

	// UI demo buttons (optional)
	chipButtons.forEach(btn => {
		btn.addEventListener('click', () => {
			pendingBet += Number(btn.getAttribute('data-val'));
			btnConfirm.textContent = 'Đồng ý (' + formatNumber(pendingBet) + ')';
		});
	});
	btnCancel.addEventListener('click', () => {
		pendingBet = 0;
		btnConfirm.textContent = 'Đồng ý';
	});
	btnOther.addEventListener('click', () => {
		const val = prompt('Nhập số tiền (đ):', '10000');
		if (!val) return;
		const n = parseInt(val);
		if (Number.isFinite(n) && n > 0) {
			pendingBet += n;
			btnConfirm.textContent = 'Đồng ý (' + formatNumber(pendingBet) + ')';
		}
	});
	btnConfirm.addEventListener('click', () => {
		if (pendingBet <= 0) return;
		// Randomly add to a side to fake placement
		if (Math.random() < 0.5) {
			amountTaiEl.textContent = formatNumber(parseNumber(amountTaiEl.textContent) + pendingBet);
			playersTaiEl.textContent = (parseInt(playersTaiEl.textContent) + 1).toString();
		} else {
			amountXiuEl.textContent = formatNumber(parseNumber(amountXiuEl.textContent) + pendingBet);
			playersXiuEl.textContent = (parseInt(playersXiuEl.textContent) + 1).toString();
		}
		pendingBet = 0;
		btnConfirm.textContent = 'Đồng ý';
	});
	btnAuto.addEventListener('click', () => {
		// burst of random bets both sides
		for (let i = 0; i < 6; i++) {
			const money = randomBetween(50_000, 3_000_000);
			if (Math.random() < 0.5) {
				amountTaiEl.textContent = formatNumber(parseNumber(amountTaiEl.textContent) + money);
				playersTaiEl.textContent = (parseInt(playersTaiEl.textContent) + 1).toString();
			} else {
				amountXiuEl.textContent = formatNumber(parseNumber(amountXiuEl.textContent) + money);
				playersXiuEl.textContent = (parseInt(playersXiuEl.textContent) + 1).toString();
			}
		}
	});

	// bootstrap
	setSession(currentSession);
	resetRound();
	renderBeads();
	startTimer();
})();