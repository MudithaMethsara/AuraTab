/**
 * Clock module
 * Digital and analog clock with 12/24h, seconds, localized date
 * Uses requestAnimationFrame, pauses when tab hidden
 */
'use strict';

const Clock = (() => {
  let mode = 'digital'; // 'digital' or 'analog'
  let use24h = false;
  let showSeconds = false;
  let font = 'Outfit';
  let size = 100; // percentage 60-140
  let animFrameId = null;
  let tickTimerId = null;
  let tickIntervalId = null;
  let markersCreated = false;

  // Cached DOM elements to eliminate continuous querySelector / getElementById overhead
  let dom = null;

  function _getDom() {
    if (!dom) {
      dom = {
        digital: document.getElementById('clock-digital'),
        analog: document.getElementById('clock-analog'),
        time: document.getElementById('clock-time'),
        ampm: document.getElementById('clock-ampm'),
        sec: document.getElementById('clock-seconds'),
        topTime: document.getElementById('top-time'),
        date: document.getElementById('clock-date'),
        greetingDate: document.getElementById('greeting-date'),
        topDate: document.getElementById('top-date'),
        clockDateTop: document.getElementById('clock-date-top'),
        hourHand: document.getElementById('clock-hour-hand'),
        minuteHand: document.getElementById('clock-minute-hand'),
        secondHand: document.getElementById('clock-second-hand'),
        greetingText: document.getElementById('greeting-text'),
      };
    }
    return dom;
  }

  const FONT_MAP = {
    'Outfit': "'Outfit', system-ui, -apple-system, sans-serif",
    'iOS Rounded': "-apple-system, BlinkMacSystemFont, 'SF Pro Rounded', 'SF Pro Display', 'Plus Jakarta Sans', 'Inter', sans-serif",
    'iOS': "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'SF Pro', 'Plus Jakarta Sans', 'Inter', sans-serif",
    'Plus Jakarta Sans': "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
    'Inter': "'Inter', system-ui, -apple-system, sans-serif",
    'Space Grotesk': "'Space Grotesk', system-ui, -apple-system, sans-serif",
    'Urbanist': "'Urbanist', system-ui, -apple-system, sans-serif",
    'Orbitron': "'Orbitron', monospace, sans-serif",
    'System': 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  };

  async function init() {
    const data = await Storage.getSync(['clockMode', 'clock24h', 'showSeconds', 'clockFont', 'clockSize']);
    mode = data.clockMode || 'digital';
    use24h = data.clock24h || false;
    showSeconds = data.showSeconds || false;
    font = data.clockFont || localStorage.getItem('hometab_clock_font') || 'Outfit';
    size = data.clockSize || parseInt(localStorage.getItem('hometab_clock_size')) || 100;

    _getDom();
    _applyFont(font);
    _applySize(size);
    _setupAnalogMarkers();
    _showMode();
    _startTick();
    _setupHeaderClockListener();

    // Pause when hidden to preserve 100% CPU and battery
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        _stopTick();
      } else {
        _startTick();
      }
    });
  }

  function _showMode() {
    const d = _getDom();

    if (mode === 'digital') {
      if (d.digital) d.digital.style.display = '';
      if (d.analog) d.analog.style.display = 'none';
    } else {
      if (d.digital) d.digital.style.display = 'none';
      if (d.analog) d.analog.style.display = '';
    }

    // Always show the signature blue second hand on the rounded clock
    if (d.secondHand) {
      d.secondHand.style.display = '';
    }

    document.querySelectorAll('.clock-style-mode-btn, .clock-style-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-mode') === mode);
    });
  }

  function setMode(newMode) {
    if (newMode !== 'digital' && newMode !== 'analog') return;
    mode = newMode;
    _showMode();
    _startTick();
    _save();
  }

  function toggle() {
    mode = mode === 'digital' ? 'analog' : 'digital';
    _showMode();
    _startTick();
    _save();
  }

  function set24h(val) {
    use24h = val;
    _update();
    _save();
  }

  function setShowSeconds(val) {
    showSeconds = val;
    const d = _getDom();
    if (d.secondHand) {
      d.secondHand.style.display = showSeconds ? '' : 'none';
    }
    _startTick();
    _save();
  }

  function _stopTick() {
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
    if (tickTimerId) {
      clearTimeout(tickTimerId);
      tickTimerId = null;
    }
    if (tickIntervalId) {
      clearInterval(tickIntervalId);
      tickIntervalId = null;
    }
  }

  function _startTick() {
    _stopTick();
    if (document.hidden) return;

    if (mode === 'analog') {
      const tick = () => {
        _update();
        animFrameId = requestAnimationFrame(tick);
      };
      tick();
      return;
    }

    // Digital mode: adaptive sleeping to eliminate CPU drain
    _update();
    const now = new Date();
    if (showSeconds) {
      const msToNextSecond = Math.max(10, 1000 - now.getMilliseconds());
      tickTimerId = setTimeout(() => {
        _update();
        tickIntervalId = setInterval(_update, 1000);
      }, msToNextSecond);
    } else {
      const msToNextMinute = Math.max(50, (60 - now.getSeconds()) * 1000 - now.getMilliseconds());
      tickTimerId = setTimeout(() => {
        _update();
        tickIntervalId = setInterval(_update, 60000);
      }, msToNextMinute);
    }
  }

  function _update() {
    const now = new Date();

    // Digital
    if (mode === 'digital') {
      _updateDigital(now);
    } else {
      _updateAnalog(now);
    }

    // Date line
    _updateDate(now);

    // Live Greeting check (dynamically in sync with current hour)
    _updateGreetingTime(now);
  }

  let lastGreetingHour = -1;

  function _updateGreetingTime(now) {
    const hour = now.getHours();
    if (hour !== lastGreetingHour) {
      lastGreetingHour = hour;
      if (typeof App !== 'undefined' && App.updateGreeting) {
        App.updateGreeting();
      } else {
        const d = _getDom();
        if (d.greetingText) {
          const g = (hour >= 5 && hour < 12) ? 'Good morning' :
            (hour >= 12 && hour < 17) ? 'Good afternoon' :
            (hour >= 17 && hour < 22) ? 'Good evening' : 'Good night';
          d.greetingText.textContent = g;
        }
      }
    }
  }

  let _lastDigitalKey = '';
  let _lastTopTimeKey = '';

  function _updateDigital(now) {
    const d = _getDom();

    let hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    let ampm = '';

    if (!use24h) {
      ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
    }

    const timeStr = (use24h ? String(hours).padStart(2, '0') : String(hours)) + ':' + String(minutes).padStart(2, '0');
    const digitalKey = `${timeStr}|${ampm}|${showSeconds ? seconds : ''}`;

    if (digitalKey !== _lastDigitalKey) {
      _lastDigitalKey = digitalKey;

      if (d.time && d.time.textContent !== timeStr) {
        d.time.textContent = timeStr;
      }

      if (d.sec) {
        if (showSeconds) {
          d.sec.textContent = String(seconds).padStart(2, '0');
          if (d.sec.style.display !== '') d.sec.style.display = '';
        } else if (d.sec.style.display !== 'none') {
          d.sec.style.display = 'none';
        }
      }

      if (d.ampm) {
        if (!use24h) {
          d.ampm.textContent = ampm;
          if (d.ampm.style.display !== '') d.ampm.style.display = '';
        } else if (d.ampm.style.display !== 'none') {
          d.ampm.style.display = 'none';
        }
      }
    }

    if (d.topTime) {
      const topKey = `${use24h ? now.getHours() : hours}:${minutes}:${showSeconds ? seconds : ''}:${ampm}`;
      if (topKey !== _lastTopTimeKey) {
        _lastTopTimeKey = topKey;
        const secPart = showSeconds ? `<span class="header-clock-sec">:${String(seconds).padStart(2, '0')}</span>` : '';
        if (use24h) {
          d.topTime.innerHTML = `${String(now.getHours()).padStart(2, '0')}:${String(minutes).padStart(2, '0')}${secPart}`;
        } else {
          const ampmPart = `<span class="header-clock-ampm">${ampm}</span>`;
          d.topTime.innerHTML = `${hours}:${String(minutes).padStart(2, '0')}${secPart}${ampmPart}`;
        }
      }
    }
  }

  function _updateAnalog(now) {
    const d = _getDom();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    const ms = now.getMilliseconds();

    // Smooth second hand
    const secDeg = (seconds + ms / 1000) * 6;
    const minDeg = (minutes + seconds / 60) * 6;
    const hourDeg = ((hours % 12) + minutes / 60) * 30;

    if (d.hourHand) {
      d.hourHand.setAttribute('transform', `rotate(${hourDeg} 100 100)`);
    }
    if (d.minuteHand) {
      d.minuteHand.setAttribute('transform', `rotate(${minDeg} 100 100)`);
    }
    if (d.secondHand) {
      d.secondHand.setAttribute('transform', `rotate(${secDeg} 100 100)`);
    }
  }

  let lastDateCacheKey = '';

  function _updateDate(now) {
    const lang = I18n.currentLang || navigator.language || 'en';
    const dayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${lang}`;
    if (dayKey === lastDateCacheKey) return;
    lastDateCacheKey = dayKey;

    const dateEl = document.getElementById('clock-date');
    const greetingDateEl = document.getElementById('greeting-date');
    const topDateEl = document.getElementById('top-date');
    const clockDateTopEl = document.getElementById('clock-date-top');

    try {
      // Lock screen format: "Tue Apr 1" (matching iOS reference)
      const shortWeekday = new Intl.DateTimeFormat(lang, { weekday: 'short' }).format(now);
      const dayNum = now.getDate();
      const shortMonth = new Intl.DateTimeFormat(lang, { month: 'short' }).format(now);
      const lockDateStr = `${shortWeekday} ${shortMonth} ${dayNum}`;

      // Center subtitle date format: "September 30, 2026 · Wednesday"
      const monthStr = new Intl.DateTimeFormat(lang, { month: 'long' }).format(now);
      const yearNum = now.getFullYear();
      const weekdayStr = new Intl.DateTimeFormat(lang, { weekday: 'long' }).format(now);
      const fullDateStr = `${monthStr} ${dayNum}, ${yearNum} · ${weekdayStr}`;

      // Compact top-right format: "Wed, Sep 30, 2026"
      const topDateStr = `${shortWeekday}, ${shortMonth} ${dayNum}, ${yearNum}`;

      if (clockDateTopEl) clockDateTopEl.textContent = lockDateStr;
      if (dateEl) dateEl.textContent = fullDateStr;
      if (greetingDateEl) greetingDateEl.textContent = fullDateStr;
      if (topDateEl) topDateEl.textContent = topDateStr;
    } catch {
      const fallback = now.toDateString();
      if (clockDateTopEl) clockDateTopEl.textContent = fallback;
      if (dateEl) dateEl.textContent = fallback;
      if (greetingDateEl) greetingDateEl.textContent = fallback;
      if (topDateEl) topDateEl.textContent = fallback;
    }
  }

  function _setupAnalogMarkers() {
    if (markersCreated) return;
    const g = document.getElementById('clock-markers');
    if (!g) return;

    for (let i = 0; i < 12; i++) {
      const angle = i * 30;
      const isMajor = i % 3 === 0;
      // 12, 3, 6, 9 are bold capsule pills, other 8 are clean ticks
      const r1 = isMajor ? 74 : 80;
      const r2 = 86;
      const rad = (angle - 90) * Math.PI / 180;

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', 100 + r1 * Math.cos(rad));
      line.setAttribute('y1', 100 + r1 * Math.sin(rad));
      line.setAttribute('x2', 100 + r2 * Math.cos(rad));
      line.setAttribute('y2', 100 + r2 * Math.sin(rad));
      if (isMajor) line.classList.add('major');
      g.appendChild(line);
    }
    markersCreated = true;
  }

  function _applyFont(fontName) {
    const family = FONT_MAP[fontName] || FONT_MAP['Outfit'];
    document.documentElement.style.setProperty('--font-clock', family);
  }

  function _applySize(val) {
    const numeric = parseInt(val) || 100;
    const pxVal = Math.round(15 * (numeric / 100));
    document.documentElement.style.setProperty('--header-clock-size', pxVal + 'px');
    document.documentElement.style.setProperty('--header-clock-scale', (numeric / 100).toFixed(2));
    document.documentElement.style.setProperty('--clock-size', numeric + '%');
  }

  function _setupHeaderClockListener() {
    const headerClock = document.getElementById('header-clock-widget');
    if (headerClock) {
      headerClock.addEventListener('click', () => {
        set24h(!use24h);
        if (typeof App !== 'undefined' && App.showToast) {
          App.showToast(`Time format: ${use24h ? '24-hour' : '12-hour'}`);
        }
      });
    }
  }

  function setFont(fontName) {
    if (!FONT_MAP[fontName]) return;
    font = fontName;
    _applyFont(fontName);
    try {
      localStorage.setItem('hometab_clock_font', fontName);
    } catch (_) { }
    _save();
  }

  function setSize(val) {
    size = Math.max(60, Math.min(200, parseInt(val) || 100));
    _applySize(size);
    try {
      localStorage.setItem('hometab_clock_size', size);
    } catch (_) { }
    _save();
  }

  async function _save() {
    await Storage.setSync({
      clockMode: mode,
      clock24h: use24h,
      showSeconds: showSeconds,
      clockFont: font,
      clockSize: size,
    });
  }

  return {
    init, toggle, setMode, set24h, setShowSeconds, setFont, setSize,
    get mode() { return mode; },
    get is24h() { return use24h; },
    get hasSeconds() { return showSeconds; },
    get font() { return font; },
    get size() { return size; },
    get fontMap() { return FONT_MAP; },
  };
})();
