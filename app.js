// ─────────────────────────────────────
// 🍅 番茄钟 - Pomodoro Timer
// ─────────────────────────────────────

// DOM elements
const minutesEl = document.getElementById('minutes');
const secondsEl = document.getElementById('seconds');
const statusEl = document.getElementById('status');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const resetBtn = document.getElementById('reset-btn');
const modeBtns = document.querySelectorAll('.mode-btn');
const timerDisplay = document.querySelector('.timer-display');
const progressRing = document.querySelector('.progress-ring-fill');
const alarmSound = document.getElementById('alarm-sound');
const sessionCountEl = document.getElementById('session-count');
const totalTimeEl = document.getElementById('total-time');
const totalSessionsEl = document.getElementById('total-sessions');
const taskInput = document.getElementById('task-input');
const addTaskBtn = document.getElementById('add-task-btn');
const taskList = document.getElementById('task-list');
const customMinutesInput = document.getElementById('custom-minutes');
const customTimeRow = document.getElementById('custom-time-row');

// State
let currentMode = 'work';
let currentDuration = 25; // minutes
let customDuration = loadCustomDuration(); // custom minutes
let timeRemaining = 25 * 60; // seconds
let totalSeconds = 25 * 60;
let timerInterval = null;
let isRunning = false;
let stats = loadStats();
let tasks = loadTasks();

const CIRCUMFERENCE = 2 * Math.PI * 90; // ~565.49

// ─────────────────────────────────────
// Timer Functions
// ─────────────────────────────────────

function updateDisplay() {
    const mins = Math.floor(timeRemaining / 60);
    const secs = timeRemaining % 60;
    minutesEl.textContent = String(mins).padStart(2, '0');
    secondsEl.textContent = String(secs).padStart(2, '0');
    updateProgressRing();
    document.title = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')} - 番茄钟`;
}

function updateProgressRing() {
    const fraction = timeRemaining / totalSeconds;
    const offset = CIRCUMFERENCE * (1 - fraction);
    progressRing.style.strokeDashoffset = offset;
}

function startTimer() {
    if (isRunning) return;

    isRunning = true;
    timerDisplay.classList.add('timer-active');
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    statusEl.textContent = getStatusText();

    timerInterval = setInterval(() => {
        timeRemaining--;

        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            isRunning = false;
            timeRemaining = 0;
            updateDisplay();
            handleTimerEnd();
            return;
        }

        updateDisplay();
    }, 1000);
}

function pauseTimer() {
    if (!isRunning) return;

    clearInterval(timerInterval);
    isRunning = false;
    timerDisplay.classList.remove('timer-active');
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    statusEl.textContent = '已暂停';
}

function resetTimer() {
    clearInterval(timerInterval);
    isRunning = false;
    timeRemaining = currentDuration * 60;
    totalSeconds = timeRemaining;
    timerDisplay.classList.remove('timer-active');
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    statusEl.textContent = '准备开始';
    updateDisplay();
}

function handleTimerEnd() {
    timerDisplay.classList.remove('timer-active');
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    statusEl.textContent = '✅ 完成！';

    playAlarm();

    if (currentMode === 'work') {
        stats.todaySessions++;
        stats.totalSessions++;
        stats.todayMinutes += currentDuration;
        saveStats();
        updateStatsDisplay();
    }

    // Auto-switch: work → short break, breaks → work
    setTimeout(() => {
        if (currentMode === 'work') {
            // After every 4 work sessions, suggest long break
            if (stats.todaySessions % 4 === 0) {
                switchMode('long-break');
            } else {
                switchMode('short-break');
            }
        } else {
            switchMode('work');
        }
    }, 1500);
}

function playAlarm() {
    alarmSound.currentTime = 0;
    alarmSound.play().catch(() => {
        // Autoplay blocked, ignore
    });

    // Repeat beeps
    setTimeout(() => {
        alarmSound.currentTime = 0;
        alarmSound.play().catch(() => {});
    }, 1000);
    setTimeout(() => {
        alarmSound.currentTime = 0;
        alarmSound.play().catch(() => {});
    }, 2000);
}

function getStatusText() {
    switch (currentMode) {
        case 'work': return '🍅 专注中...';
        case 'short-break': return '☕ 休息中...';
        case 'long-break': return '🌴 放松中...';
        default: return '运行中...';
    }
}

// ─────────────────────────────────────
// Mode Switching
// ─────────────────────────────────────

function switchMode(mode) {
    currentMode = mode;
    const btn = document.querySelector(`[data-mode="${mode}"]`);

    if (mode === 'custom') {
        currentDuration = customDuration;
        customTimeRow.style.display = 'flex';
        customMinutesInput.value = customDuration;
    } else {
        currentDuration = parseInt(btn.dataset.duration);
        customTimeRow.style.display = 'none';
    }

    timeRemaining = currentDuration * 60;
    totalSeconds = timeRemaining;

    // Update active button
    modeBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Update progress ring color
    const colors = {
        'work': '#e74c3c',
        'short-break': '#3498db',
        'long-break': '#2ecc71',
        'custom': '#9b59b6'
    };
    progressRing.style.stroke = colors[mode];

    // Reset state
    clearInterval(timerInterval);
    isRunning = false;
    timerDisplay.classList.remove('timer-active');
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    statusEl.textContent = '准备开始';
    updateDisplay();
}

modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        switchMode(btn.dataset.mode);
    });
});

// Custom minutes input: update duration in real time
const customBtn = document.querySelector('[data-mode="custom"]');

customMinutesInput.addEventListener('input', () => {
    let val = parseInt(customMinutesInput.value);
    if (isNaN(val) || val < 1) val = 1;
    if (val > 120) val = 120;
    customMinutesInput.value = val;
    customDuration = val;
    saveCustomDuration(val);
    customBtn.textContent = `⚙ 自定义 ${val}分钟`;

    if (currentMode === 'custom') {
        currentDuration = val;
        timeRemaining = val * 60;
        totalSeconds = timeRemaining;
        updateDisplay();
        statusEl.textContent = '准备开始';
    }
});

// ─────────────────────────────────────
// Custom Duration Persistence
// ─────────────────────────────────────

function loadCustomDuration() {
    try {
        const saved = localStorage.getItem('pomodoro-custom-duration');
        return saved ? parseInt(saved) : 30;
    } catch (e) {
        return 30;
    }
}

function saveCustomDuration(val) {
    localStorage.setItem('pomodoro-custom-duration', val);
}

// ─────────────────────────────────────
// Stats
// ─────────────────────────────────────

function loadStats() {
    try {
        const saved = localStorage.getItem('pomodoro-stats');
        if (saved) {
            const parsed = JSON.parse(saved);
            // Reset today stats if it's a new day
            const today = new Date().toDateString();
            if (parsed.date !== today) {
                return { date: today, todaySessions: 0, todayMinutes: 0, totalSessions: parsed.totalSessions || 0 };
            }
            return parsed;
        }
    } catch (e) { /* ignore */ }
    return {
        date: new Date().toDateString(),
        todaySessions: 0,
        todayMinutes: 0,
        totalSessions: 0
    };
}

function saveStats() {
    localStorage.setItem('pomodoro-stats', JSON.stringify(stats));
}

function updateStatsDisplay() {
    sessionCountEl.textContent = stats.todaySessions;
    totalTimeEl.textContent = formatMinutes(stats.todayMinutes);
    totalSessionsEl.textContent = stats.totalSessions;
}

function formatMinutes(m) {
    if (m < 60) return `${m}分钟`;
    const h = Math.floor(m / 60);
    const min = m % 60;
    return min > 0 ? `${h}小时${min}分` : `${h}小时`;
}

// ─────────────────────────────────────
// Tasks
// ─────────────────────────────────────

function loadTasks() {
    try {
        const saved = localStorage.getItem('pomodoro-tasks');
        return saved ? JSON.parse(saved) : [];
    } catch (e) {
        return [];
    }
}

function saveTasks() {
    localStorage.setItem('pomodoro-tasks', JSON.stringify(tasks));
}

function renderTasks() {
    taskList.innerHTML = '';
    if (tasks.length === 0) {
        taskList.innerHTML = '<li style="color: var(--text-muted); justify-content: center;">暂无任务</li>';
        return;
    }
    tasks.forEach((task, index) => {
        const li = document.createElement('li');
        if (task.completed) li.classList.add('completed');

        li.innerHTML = `
            <span>${escapeHtml(task.text)}</span>
            <span class="task-actions">
                <button class="done-btn" data-index="${index}" title="完成">${task.completed ? '↩' : '✔'}</button>
                <button class="delete-btn" data-index="${index}" title="删除">✕</button>
            </span>
        `;
        taskList.appendChild(li);
    });

    // Event delegation
    taskList.querySelectorAll('.done-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.target.dataset.index);
            tasks[idx].completed = !tasks[idx].completed;
            saveTasks();
            renderTasks();
        });
    });

    taskList.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.target.dataset.index);
            tasks.splice(idx, 1);
            saveTasks();
            renderTasks();
        });
    });
}

function addTask() {
    const text = taskInput.value.trim();
    if (!text) return;
    tasks.unshift({ text, completed: false });
    saveTasks();
    taskInput.value = '';
    renderTasks();
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ─────────────────────────────────────
// Button Events
// ─────────────────────────────────────

startBtn.addEventListener('click', startTimer);
pauseBtn.addEventListener('click', pauseTimer);
resetBtn.addEventListener('click', resetTimer);

addTaskBtn.addEventListener('click', addTask);
taskInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addTask();
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return; // Don't intercept when typing
    switch (e.code) {
        case 'Space':
            e.preventDefault();
            isRunning ? pauseTimer() : startTimer();
            break;
        case 'KeyR':
            resetTimer();
            break;
        case 'Digit1':
            switchMode('work');
            break;
        case 'Digit2':
            switchMode('short-break');
            break;
        case 'Digit3':
            switchMode('long-break');
            break;
        case 'Digit4':
            switchMode('custom');
            break;
    }
});

// ─────────────────────────────────────
// Init
// ─────────────────────────────────────

progressRing.style.strokeDasharray = CIRCUMFERENCE;
customMinutesInput.value = customDuration;
updateDisplay();
updateStatsDisplay();
renderTasks();

console.log('🍅 番茄钟已就绪！');
console.log('⌨ 快捷键：空格=开始/暂停  R=重置  1=工作  2=短休息  3=长休息  4=自定义');
