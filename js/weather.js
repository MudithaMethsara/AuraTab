/**
 * Weather module
 * Uses Open-Meteo (free, no key) for weather + geocoding
 * 30-min cache, offline fallback, °C/°F toggle
 */
'use strict';

const Weather = (() => {
  const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
  const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast';
  const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

  let unit = 'celsius';
  let location = null; // { name, lat, lon, country }
  let lastData = null;
  let popoverEl = null;
  let hourlyMode = 'temp'; // 'temp' | 'uv'

  // WMO weather codes to descriptions and icon names
  const WMO_CODES = {
    0: { desc: 'Clear sky', icon: 'sun' },
    1: { desc: 'Mainly clear', icon: 'sun' },
    2: { desc: 'Partly cloudy', icon: 'cloud-sun' },
    3: { desc: 'Overcast', icon: 'cloud' },
    45: { desc: 'Foggy', icon: 'fog' },
    48: { desc: 'Rime fog', icon: 'fog' },
    51: { desc: 'Light drizzle', icon: 'drizzle' },
    53: { desc: 'Moderate drizzle', icon: 'drizzle' },
    55: { desc: 'Dense drizzle', icon: 'drizzle' },
    61: { desc: 'Slight rain', icon: 'rain' },
    63: { desc: 'Moderate rain', icon: 'rain' },
    65: { desc: 'Heavy rain', icon: 'rain' },
    71: { desc: 'Slight snow', icon: 'snow' },
    73: { desc: 'Moderate snow', icon: 'snow' },
    75: { desc: 'Heavy snow', icon: 'snow' },
    80: { desc: 'Slight showers', icon: 'rain' },
    81: { desc: 'Moderate showers', icon: 'rain' },
    82: { desc: 'Violent showers', icon: 'rain' },
    85: { desc: 'Snow showers', icon: 'snow' },
    86: { desc: 'Heavy snow showers', icon: 'snow' },
    95: { desc: 'Thunderstorm', icon: 'storm' },
    96: { desc: 'Thunderstorm with hail', icon: 'storm' },
    99: { desc: 'Thunderstorm with heavy hail', icon: 'storm' },
  };

  const WEATHER_ICONS = {
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>',
    'cloud-sun': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2v2M4.93 4.93l1.41 1.41M20 12h2M17.66 17.66l1.41 1.41M2 12h2M6.34 17.66l-1.41 1.41M17.07 4.93l1.41-1.41"/><circle cx="12" cy="9" r="4"/><path d="M8 16a5 5 0 0 1 8 0"/></svg>',
    cloud: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>',
    fog: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 15h18M3 19h18M5 11h14a4 4 0 0 0 0-8H9a4 4 0 0 0-4 4"/></svg>',
    drizzle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/><line x1="8" y1="21" x2="8" y2="23"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="16" y1="21" x2="16" y2="23"/></svg>',
    rain: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M16 13V7a4 4 0 0 0-8 0v6"/><path d="M8 13a5 5 0 0 0 8 0"/><line x1="8" y1="17" x2="7" y2="21"/><line x1="12" y1="17" x2="11" y2="21"/><line x1="16" y1="17" x2="15" y2="21"/></svg>',
    snow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/><line x1="8" y1="22" x2="8" y2="22.01"/><line x1="12" y1="22" x2="12" y2="22.01"/><line x1="16" y1="22" x2="16" y2="22.01"/></svg>',
    storm: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 9"/><polyline points="13 11 9 17 15 17 11 23"/></svg>',
  };

  let selectedSkinType = 'fair';
  try {
    const savedSkin = localStorage.getItem('hometab_uv_skin');
    if (savedSkin) selectedSkinType = savedSkin;
  } catch (_) {}

  function _getUvDetails(uv) {
    const val = Number(uv) || 0;
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';

    if (val < 0.1) {
      return {
        level: 'None',
        color: isLight ? '#475569' : '#94a3b8',
        bg: isLight ? 'rgba(71, 85, 105, 0.08)' : 'rgba(148, 163, 184, 0.16)',
        border: isLight ? 'rgba(71, 85, 105, 0.22)' : 'rgba(148, 163, 184, 0.35)',
        status: 'No UV Radiation',
        advice: 'No protection needed. Safe for all outdoor activities.',
        burnTimes: {
          fair: 'No risk',
          medium: 'No risk',
          dark: 'No risk',
          spf: 'All day'
        }
      };
    }
    if (val <= 2.9) {
      return {
        level: 'Low',
        color: isLight ? '#16a34a' : '#4ade80',
        bg: isLight ? 'rgba(22, 163, 74, 0.1)' : 'rgba(74, 222, 128, 0.16)',
        border: isLight ? 'rgba(22, 163, 74, 0.28)' : 'rgba(74, 222, 128, 0.35)',
        status: 'Minimal Risk',
        advice: 'Minimal sun risk. Safe to enjoy outdoors with light protection.',
        burnTimes: {
          fair: `~${Math.max(45, Math.round(67 / val))} min`,
          medium: `~${Math.max(60, Math.round(100 / val))} min`,
          dark: '60+ min',
          spf: '4+ hours'
        }
      };
    }
    if (val <= 5.9) {
      return {
        level: 'Moderate',
        color: isLight ? '#ca8a04' : '#facc15',
        bg: isLight ? 'rgba(202, 138, 4, 0.1)' : 'rgba(250, 204, 21, 0.16)',
        border: isLight ? 'rgba(202, 138, 4, 0.28)' : 'rgba(250, 204, 21, 0.35)',
        status: 'Moderate Risk',
        advice: 'Sunscreen SPF 30+ recommended. Wear sunglasses on bright days.',
        burnTimes: {
          fair: `~${Math.round(67 / val)} min`,
          medium: `~${Math.round(100 / val)} min`,
          dark: `~${Math.round(200 / val)} min`,
          spf: '3+ hours'
        }
      };
    }
    if (val <= 7.9) {
      return {
        level: 'High',
        color: isLight ? '#ea580c' : '#fb923c',
        bg: isLight ? 'rgba(234, 88, 12, 0.1)' : 'rgba(251, 146, 60, 0.18)',
        border: isLight ? 'rgba(234, 88, 12, 0.28)' : 'rgba(251, 146, 60, 0.4)',
        status: 'High Risk',
        advice: 'Protection required. Seek shade midday, wear a hat and SPF 30+.',
        burnTimes: {
          fair: `~${Math.round(67 / val)} min`,
          medium: `~${Math.round(100 / val)} min`,
          dark: `~${Math.round(200 / val)} min`,
          spf: '2.5 hours'
        }
      };
    }
    if (val <= 10.9) {
      return {
        level: 'Very High',
        color: isLight ? '#dc2626' : '#f87171',
        bg: isLight ? 'rgba(220, 38, 38, 0.1)' : 'rgba(248, 113, 113, 0.18)',
        border: isLight ? 'rgba(220, 38, 38, 0.28)' : 'rgba(248, 113, 113, 0.4)',
        status: 'Very High Risk',
        advice: 'Extra precaution needed. Avoid sun 11 AM - 3 PM and reapply SPF.',
        burnTimes: {
          fair: `~${Math.max(8, Math.round(67 / val))} min`,
          medium: `~${Math.round(100 / val)} min`,
          dark: `~${Math.round(200 / val)} min`,
          spf: '2 hours'
        }
      };
    }
    return {
      level: 'Extreme',
      color: isLight ? '#9f1239' : '#f43f5e',
      bg: isLight ? 'rgba(159, 18, 57, 0.1)' : 'rgba(244, 63, 94, 0.18)',
      border: isLight ? 'rgba(159, 18, 57, 0.28)' : 'rgba(244, 63, 94, 0.4)',
      status: 'Extreme Hazard',
      advice: 'Take all precautions. Unprotected skin and eyes can burn in minutes.',
      burnTimes: {
        fair: `< ${Math.max(5, Math.round(67 / val))} min`,
        medium: `~${Math.round(100 / val)} min`,
        dark: `~${Math.round(200 / val)} min`,
        spf: '1.5 hours'
      }
    };
  }

  async function init() {
    const data = await Storage.getSync(['weatherUnit', 'weatherLocation']);
    unit = data.weatherUnit || 'celsius';
    location = data.weatherLocation || null;

    _setupPanelListeners();

    if (location) {
      await _fetchAndDisplay();
    } else {
      _showPlaceholder();
    }

    // Auto-refresh every 30 minutes while tab remains open
    setInterval(() => {
      if (location) _fetchAndDisplay();
    }, CACHE_DURATION);

    // Auto-refresh when user switches back to this tab if hour has rolled over
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && location) {
        _fetchAndDisplay();
      }
    });

    // Re-render weather panel when user toggles between light and dark themes
    try {
      const themeObserver = new MutationObserver((mutations) => {
        for (const m of mutations) {
          if (m.attributeName === 'data-theme' && lastData) {
            _display(lastData);
          }
        }
      });
      themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    } catch (_) {}
  }

  function _degToCompass(deg) {
    if (deg === undefined || deg === null) return 'NE';
    const val = Math.floor((deg / 22.5) + 0.5);
    const arr = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    return arr[(val % 16)] || 'N';
  }

  function _getHumidityComfort(h) {
    if (h < 30) return 'Dry';
    if (h <= 60) return 'Optimal';
    if (h <= 75) return 'Humid';
    return 'High';
  }

  function _getWindDescription(speedKmh) {
    if (speedKmh < 6) return 'Calm breeze';
    if (speedKmh < 20) return 'Light air';
    if (speedKmh < 30) return 'Moderate breeze';
    if (speedKmh < 45) return 'Strong breeze';
    return 'High wind alert';
  }

  function _getSolarUvForHour(hour, maxUv = 7.8) {
    if (hour < 6 || hour >= 19) return 0;
    const solarNoon = 12.8;
    const hourDist = Math.abs(hour - solarNoon);
    if (hourDist >= 6.5) return 0;
    const factor = Math.cos((hourDist / 6.5) * (Math.PI / 2));
    const val = maxUv * Math.pow(Math.max(0, factor), 1.8);
    return Math.round(val * 10) / 10;
  }

  function _getMockTodayUvProfile(maxUv = 7.8) {
    const profile = [];
    for (let h = 0; h < 24; h++) {
      profile.push({
        hour: h,
        uv: _getSolarUvForHour(h, maxUv)
      });
    }
    return profile;
  }

  function _getTodayUvProfile(hourly, maxUv = 7.8, currentTimeStr = '') {
    if (!hourly || !hourly.time || !hourly.uv_index) {
      return _getMockTodayUvProfile(maxUv);
    }
    let todayDateStr = '';
    if (currentTimeStr && currentTimeStr.length >= 10) {
      todayDateStr = currentTimeStr.slice(0, 10);
    } else {
      const d = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      todayDateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    }

    const profile = [];
    for (let i = 0; i < hourly.time.length; i++) {
      if (hourly.time[i].startsWith(todayDateStr)) {
        const h = parseInt(hourly.time[i].slice(11, 13), 10);
        const uv = (typeof hourly.uv_index[i] === 'number')
          ? Math.max(0, Math.round(hourly.uv_index[i] * 10) / 10)
          : 0;
        profile.push({ hour: h, uv });
      }
    }
    if (profile.length < 20) {
      return _getMockTodayUvProfile(maxUv);
    }
    return profile;
  }

  function _getMockHourly(tempBase, maxUv = 7.8) {
    const currentHour = new Date().getHours();
    const list = [];
    const offsets = [
      0, -1, -1, -2, -2, -3, -3, -2, -1, 1, 3, 5,
      6, 7, 7, 6, 5, 3, 2, 1, 0, -1, -1, -2
    ];
    for (let i = 0; i < 24; i++) {
      const h = (currentHour + i) % 24;
      const isBoundary = (i > 0 && h === 0);
      const timeLabel = (i === 0) ? 'Now' : (h === 0 ? '12 AM' : h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM`);
      list.push({
        time: timeLabel,
        hour: h,
        temp: `${tempBase + (offsets[i] !== undefined ? offsets[i] : 0)}°`,
        weatherCode: (h >= 6 && h <= 18) ? 1 : 0,
        uv: _getSolarUvForHour(h, maxUv),
        isNow: (i === 0),
        isDayBoundary: isBoundary,
        dayLabel: isBoundary ? 'Tomorrow' : ''
      });
    }
    return list;
  }

  function _getHourlyFromApi(hourly, maxUv = 7.8, currentTimeStr = '') {
    if (!hourly || !hourly.time || !hourly.temperature_2m) return [];
    const list = [];
    
    let startIndex = -1;
    if (currentTimeStr && currentTimeStr.length >= 13) {
      const targetPrefix = currentTimeStr.slice(0, 13);
      startIndex = hourly.time.findIndex(t => t.startsWith(targetPrefix));
    }

    if (startIndex === -1) {
      const d = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const localPrefix = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}`;
      startIndex = hourly.time.findIndex(t => t.startsWith(localPrefix));
      if (startIndex === -1) {
        const localHour = d.getHours();
        startIndex = hourly.time.findIndex(t => parseInt(t.slice(11, 13), 10) === localHour);
      }
      if (startIndex === -1) startIndex = 0;
    }

    for (let i = 0; i < 24; i++) {
      const idx = startIndex + i;
      if (idx >= hourly.time.length) break;
      const timeStr = hourly.time[idx];
      const h = parseInt(timeStr.slice(11, 13), 10);
      const isBoundary = (i > 0 && h === 0);
      const timeLabel = (i === 0) ? 'Now' : (h === 0 ? '12 AM' : h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM`);
      const tempVal = Math.round(hourly.temperature_2m[idx]);
      const code = hourly.weather_code ? hourly.weather_code[idx] : 1;
      const uvVal = (hourly.uv_index && typeof hourly.uv_index[idx] === 'number')
        ? Math.max(0, Math.round(hourly.uv_index[idx] * 10) / 10)
        : _getSolarUvForHour(h, maxUv);

      list.push({
        time: timeLabel,
        hour: h,
        temp: `${tempVal}°`,
        weatherCode: code,
        uv: uvVal,
        isNow: (i === 0),
        isDayBoundary: isBoundary,
        dayLabel: isBoundary ? 'Tomorrow' : ''
      });
    }
    return list;
  }

  function _showPlaceholder() {
    const iconEl = document.getElementById('weather-icon');
    const tempEl = document.getElementById('weather-temp');
    const condEl = document.getElementById('weather-condition');
    const uvWrapEl = document.getElementById('weather-uv-wrap');
    const uvValEl = document.getElementById('weather-uv-val');
    const uvLevelEl = document.getElementById('weather-uv-level');

    if (iconEl) iconEl.innerHTML = WEATHER_ICONS['cloud-sun'] || WEATHER_ICONS.sun;
    if (tempEl) tempEl.textContent = '24°C';
    if (condEl) condEl.textContent = 'Singapore';
    if (uvWrapEl) uvWrapEl.style.display = 'inline-flex';
    if (uvValEl) uvValEl.textContent = 'UV 3.2';
    if (uvLevelEl) {
      const isLight = document.documentElement.getAttribute('data-theme') === 'light';
      uvLevelEl.textContent = 'Moderate';
      uvLevelEl.style.color = isLight ? '#ca8a04' : '#facc15';
    }

    lastData = {
      temp: 24,
      feelsLike: 26,
      tempMax: 29,
      tempMin: 22,
      humidity: 68,
      windSpeed: 14,
      windCompass: 'NE',
      weatherCode: 2,
      uvIndex: 3.2,
      uvMax: 7.8,
      hourlyList: _getMockHourly(24, 7.8),
      todayUvProfile: _getMockTodayUvProfile(7.8),
      unit: unit,
      location: 'Singapore',
    };
    _renderPanelData(lastData);
  }

  async function _fetchAndDisplay() {
    // Check cache
    const cached = await Storage.getLocal(['weatherCache']);
    if (cached.weatherCache) {
      const cache = cached.weatherCache;
      const age = Date.now() - (cache.timestamp || 0);
      if (age < CACHE_DURATION && cache.data && cache.data.hourlyList && cache.data.hourlyList.length >= 24) {
        const nextHour = cache.data.hourlyList[1].hour;
        const currentLocalHour = new Date().getHours();
        const expectedNextHour = (currentLocalHour + 1) % 24;
        if (Math.abs(nextHour - expectedNextHour) <= 1) {
          lastData = cache.data;
          _display(cache.data);
          return;
        }
      }
    }

    // Fetch fresh
    try {
      const params = new URLSearchParams({
        latitude: location.lat,
        longitude: location.lon,
        current: 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,uv_index',
        hourly: 'temperature_2m,weather_code,uv_index',
        daily: 'temperature_2m_max,temperature_2m_min,uv_index_max',
        forecast_days: '3',
        temperature_unit: unit === 'fahrenheit' ? 'fahrenheit' : 'celsius',
        wind_speed_unit: 'kmh',
        timezone: 'auto',
      });

      const resp = await fetch(`${WEATHER_URL}?${params}`);
      if (!resp.ok) throw new Error('Weather fetch failed');
      const result = await resp.json();

      const currentUv = (typeof result.current?.uv_index === 'number')
        ? Math.round(result.current.uv_index * 10) / 10
        : 0;
      const maxUv = (result.daily?.uv_index_max?.[0] !== undefined)
        ? Math.round(result.daily.uv_index_max[0] * 10) / 10
        : currentUv;
      const tempMax = (result.daily?.temperature_2m_max?.[0] !== undefined)
        ? Math.round(result.daily.temperature_2m_max[0])
        : Math.round(result.current.temperature_2m) + 3;
      const tempMin = (result.daily?.temperature_2m_min?.[0] !== undefined)
        ? Math.round(result.daily.temperature_2m_min[0])
        : Math.round(result.current.temperature_2m) - 3;
      const windDir = _degToCompass(result.current?.wind_direction_10m);
      const currentTimeStr = result.current?.time || '';
      const hourlyList = _getHourlyFromApi(result.hourly, maxUv, currentTimeStr);
      const todayUvProfile = _getTodayUvProfile(result.hourly, maxUv, currentTimeStr);

      const data = {
        temp: Math.round(result.current.temperature_2m),
        feelsLike: Math.round(result.current.apparent_temperature),
        tempMax: tempMax,
        tempMin: tempMin,
        humidity: result.current.relative_humidity_2m,
        windSpeed: Math.round(result.current.wind_speed_10m),
        windCompass: windDir,
        weatherCode: result.current.weather_code,
        uvIndex: currentUv,
        uvMax: maxUv,
        hourlyList: hourlyList.length ? hourlyList : _getMockHourly(Math.round(result.current.temperature_2m), maxUv),
        todayUvProfile: todayUvProfile,
        unit: unit,
        location: location.name,
      };

      lastData = data;
      _display(data);

      // Cache it
      await Storage.setLocal({
        weatherCache: { data, timestamp: Date.now() }
      });
    } catch (e) {
      console.warn('Weather fetch error:', e);
      if (lastData) {
        _display(lastData);
      } else {
        const tempEl = document.getElementById('weather-temp');
        const condEl = document.getElementById('weather-condition');
        if (tempEl) tempEl.textContent = '--°';
        if (condEl) condEl.textContent = I18n.t('offline', 'Offline');
      }
    }
  }

  function _display(data) {
    const iconEl = document.getElementById('weather-icon');
    const tempEl = document.getElementById('weather-temp');
    const condEl = document.getElementById('weather-condition');
    const uvWrapEl = document.getElementById('weather-uv-wrap');
    const uvValEl = document.getElementById('weather-uv-val');
    const uvLevelEl = document.getElementById('weather-uv-level');

    const wmo = WMO_CODES[data.weatherCode] || WMO_CODES[0];
    const unitSymbol = data.unit === 'fahrenheit' ? '°F' : '°C';

    if (iconEl) iconEl.innerHTML = WEATHER_ICONS[wmo.icon] || WEATHER_ICONS['cloud-sun'] || WEATHER_ICONS.sun;
    if (tempEl) tempEl.textContent = `${data.temp}${unitSymbol}`;
    if (condEl) {
      condEl.textContent = data.location || (location ? location.name : wmo.desc) || 'Singapore';
    }

    // Update UV in Header (Style C: ☼ 28°C · UV 4.2 · High)
    // Only display when UV > 0; completely hide when UV <= 0 (e.g., night / 0.0)
    const uv = Number(data.uvIndex) || 0;
    const uvInfo = _getUvDetails(uv);

    if (uv > 0) {
      if (uvWrapEl) uvWrapEl.style.display = 'inline-flex';
      if (uvValEl) uvValEl.textContent = `UV ${uv.toFixed(1)}`;
      if (uvLevelEl) {
        uvLevelEl.textContent = uvInfo.level;
        uvLevelEl.style.color = uvInfo.color;
      }
    } else {
      if (uvWrapEl) uvWrapEl.style.display = 'none';
    }

    _renderPanelData(data);
  }

  function _renderPanelData(data) {
    const panel = document.getElementById('weather-panel');
    if (!panel || !data) return;

    const cityEl = document.getElementById('weather-popover-city');
    const condEl = document.getElementById('weather-popover-cond');
    const iconEl = document.getElementById('weather-popover-icon');
    const tempEl = document.getElementById('weather-popover-temp');
    const feelsEl = document.getElementById('weather-popover-feels');
    const highEl = document.getElementById('weather-popover-high');
    const lowEl = document.getElementById('weather-popover-low');
    const humEl = document.getElementById('weather-popover-humidity');
    const humComfortEl = document.getElementById('weather-humidity-comfort');
    const humFillEl = document.getElementById('weather-humidity-fill');
    const windEl = document.getElementById('weather-popover-wind');
    const windDirEl = document.getElementById('weather-wind-dir');
    const windDescEl = document.getElementById('weather-wind-desc');

    const uvScoreEl = document.getElementById('weather-uv-score');
    const uvBadgeEl = document.getElementById('weather-uv-badge');
    const uvStatusEl = document.getElementById('weather-uv-status');
    const uvPeakEl = document.getElementById('weather-uv-peak-text');
    const uvAdviceEl = document.getElementById('weather-uv-advice');
    const trackEl = document.getElementById('weather-hourly-track');

    const wmo = WMO_CODES[data.weatherCode] || WMO_CODES[0];
    const unitSymbol = data.unit === 'fahrenheit' ? '°F' : '°C';

    if (cityEl) cityEl.textContent = data.location || (location ? location.name : 'Your Location');
    if (condEl) condEl.textContent = wmo.desc || 'Clear sky';
    if (iconEl) iconEl.innerHTML = WEATHER_ICONS[wmo.icon] || WEATHER_ICONS.sun;
    if (tempEl) {
      tempEl.textContent = `${data.temp}°`;
      // Dynamic futuristic temperature gradient based on Celsius range
      const tempC = (data.unit === 'fahrenheit') ? Math.round((data.temp - 32) * 5 / 9) : data.temp;
      tempEl.classList.remove('temp-freezing', 'temp-cold', 'temp-mild', 'temp-warm', 'temp-hot');
      if (tempC <= 0) tempEl.classList.add('temp-freezing');
      else if (tempC <= 14) tempEl.classList.add('temp-cold');
      else if (tempC <= 23) tempEl.classList.add('temp-mild');
      else if (tempC <= 30) tempEl.classList.add('temp-warm');
      else tempEl.classList.add('temp-hot');
    }
    if (feelsEl) feelsEl.textContent = `Feels like ${data.feelsLike}°`;
    if (highEl) highEl.textContent = `H: ${data.tempMax ?? data.temp + 2}°`;
    if (lowEl) lowEl.textContent = `L: ${data.tempMin ?? data.temp - 3}°`;

    // Unit toggle pill state
    const unitCPill = panel.querySelector('.unit-c');
    const unitFPill = panel.querySelector('.unit-f');
    if (unitCPill) unitCPill.classList.toggle('active', data.unit === 'celsius');
    if (unitFPill) unitFPill.classList.toggle('active', data.unit === 'fahrenheit');

    // Hourly Forecast Track (supports Temp & UV modes)
    _renderHourlyTrack(data.hourlyList);

    // Bento UV
    const uv = data.uvIndex ?? 0;
    const uvInfo = _getUvDetails(uv);

    if (uvScoreEl) uvScoreEl.textContent = uv.toFixed(1);
    if (uvBadgeEl) {
      uvBadgeEl.textContent = uvInfo.level;
      uvBadgeEl.style.backgroundColor = uvInfo.bg;
      uvBadgeEl.style.color = uvInfo.color;
      uvBadgeEl.style.borderColor = uvInfo.border;
    }
    if (uvStatusEl) uvStatusEl.textContent = uvInfo.status;
    if (uvPeakEl) uvPeakEl.textContent = `Peak: ${data.uvMax ?? uv} today`;
    if (uvAdviceEl) uvAdviceEl.textContent = uvInfo.advice;

    // Circular SVG UV Arc Gauge calculation
    const uvArcFillEl = document.getElementById('uv-arc-fill');
    const uvArcDotEl = document.getElementById('uv-arc-dot');

    if (uvArcFillEl) {
      const uvRatio = Math.min(1, Math.max(0, uv / 12));
      const totalArcLength = 173; // Semi-circle circumference: PI * 55 ≈ 172.78
      const offset = totalArcLength * (1 - uvRatio);
      uvArcFillEl.style.strokeDashoffset = offset;
    }

    if (uvArcDotEl) {
      const uvRatio = Math.min(1, Math.max(0, uv / 12));
      const angle = Math.PI - (uvRatio * Math.PI);
      const cx = 70 + (55 * Math.cos(angle));
      const cy = 72 - (55 * Math.sin(angle));
      uvArcDotEl.setAttribute('cx', cx.toFixed(1));
      uvArcDotEl.setAttribute('cy', cy.toFixed(1));
      uvArcDotEl.style.filter = `drop-shadow(0 0 6px ${uvInfo.color})`;
    }

    // 24-Hour Day UV Curve & Sun Protection Window
    _renderUvSparkline(data.todayUvProfile, uv, data.uvMax);

    _updateBurnCalculator(uvInfo);

    // Bento Wind
    if (windEl) windEl.textContent = data.windSpeed;
    if (windDirEl) windDirEl.textContent = data.windCompass || 'NE';
    if (windDescEl) windDescEl.textContent = _getWindDescription(data.windSpeed);

    // Bento Humidity
    if (humEl) humEl.textContent = data.humidity;
    if (humComfortEl) humComfortEl.textContent = _getHumidityComfort(data.humidity);
    if (humFillEl) humFillEl.style.width = `${Math.min(100, Math.max(10, data.humidity))}%`;
  }

  function _renderHourlyTrack(hourlyList) {
    const trackEl = document.getElementById('weather-hourly-track');
    if (!trackEl) return;
    trackEl.innerHTML = '';
    const list = hourlyList || (lastData ? lastData.hourlyList : []);

    list.forEach(item => {
      const col = document.createElement('div');
      col.className = 'weather-hourly-item' +
        (item.isNow ? ' now' : '') +
        (item.isDayBoundary ? ' day-boundary' : '') +
        (hourlyMode === 'uv' ? ' uv-mode' : '');

      const dayTag = item.dayLabel ? `<span class="weather-hourly-day-tag">${item.dayLabel}</span>` : '';

      if (hourlyMode === 'temp') {
        const itemWmo = WMO_CODES[item.weatherCode] || WMO_CODES[0];
        const iconSvg = WEATHER_ICONS[itemWmo.icon] || WEATHER_ICONS.sun;
        col.innerHTML = `
          ${dayTag}
          <span class="weather-hourly-time">${item.time}</span>
          <div class="weather-hourly-icon">${iconSvg}</div>
          <span class="weather-hourly-temp">${item.temp}</span>
        `;
      } else {
        const uv = (typeof item.uv === 'number') ? item.uv : 0;
        const uvInfo = _getUvDetails(uv);
        const warnChip = uv >= 3 ? `<span class="weather-hourly-warn-chip" title="Protection recommended">SPF</span>` : '';
        col.innerHTML = `
          ${dayTag}
          <span class="weather-hourly-time">${item.time}</span>
          <div class="weather-hourly-sun-icon" style="color: ${uvInfo.color};">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
              <circle cx="12" cy="12" r="4"/>
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
            </svg>
          </div>
          <span class="weather-hourly-uv-badge" style="background:${uvInfo.bg}; color:${uvInfo.color}; border: 1px solid ${uvInfo.border};">${uv.toFixed(1)}</span>
          ${warnChip}
        `;
      }
      trackEl.appendChild(col);
    });

    const btnTemp = document.getElementById('btn-hourly-temp');
    const btnUv = document.getElementById('btn-hourly-uv');
    if (btnTemp) btnTemp.classList.toggle('active', hourlyMode === 'temp');
    if (btnUv) btnUv.classList.toggle('active', hourlyMode === 'uv');

    _updateHourlyNav();
  }

  function _updateHourlyNav() {
    const trackEl = document.getElementById('weather-hourly-track');
    const prevBtn = document.getElementById('btn-hourly-prev');
    const nextBtn = document.getElementById('btn-hourly-next');
    if (!trackEl || !prevBtn || !nextBtn) return;
    const atStart = trackEl.scrollLeft <= 4;
    const atEnd = trackEl.scrollLeft + trackEl.clientWidth >= trackEl.scrollWidth - 6;
    prevBtn.disabled = atStart;
    nextBtn.disabled = atEnd;
    prevBtn.classList.toggle('disabled', atStart);
    nextBtn.classList.toggle('disabled', atEnd);
  }

  function _renderUvSparkline(profile, currentUv, maxUv) {
    const wrap = document.getElementById('weather-uv-sparkline');
    const windowChip = document.getElementById('weather-uv-window');
    if (!wrap) return;

    if (!profile || profile.length === 0) {
      profile = _getMockTodayUvProfile(maxUv || 7.8);
    }

    // 1. Calculate Sun Protection Window (hours where UV >= 3)
    const dangerousHours = profile.filter(p => p.uv >= 3);
    if (windowChip) {
      if (dangerousHours.length > 0) {
        const startH = dangerousHours[0].hour;
        const endH = dangerousHours[dangerousHours.length - 1].hour;
        const fmtH = (h) => (h === 0 ? '12 AM' : h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM`);
        windowChip.textContent = `Protection: ${fmtH(startH)} – ${fmtH(endH + 1)}`;
        windowChip.classList.remove('safe');
      } else {
        windowChip.textContent = 'Safe All Day';
        windowChip.classList.add('safe');
      }
    }

    // 2. Generate smooth SVG curve for 24 hours (ViewBox: 0 0 240 44)
    const maxVal = Math.max(10, Math.ceil(maxUv || 10));
    const currentHour = new Date().getHours();
    const pts = profile.map((p, i) => {
      const x = 4 + (i * 10.08);
      const ratio = Math.min(1, Math.max(0, p.uv / maxVal));
      const y = 40 - (ratio * 34);
      return { x, y, hour: p.hour, uv: p.uv };
    });

    let dLine = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1];
      const cur = pts[i];
      const cpX = (prev.x + cur.x) / 2;
      dLine += ` C ${cpX.toFixed(1)} ${prev.y.toFixed(1)}, ${cpX.toFixed(1)} ${cur.y.toFixed(1)}, ${cur.x.toFixed(1)} ${cur.y.toFixed(1)}`;
    }

    const dArea = `${dLine} L ${pts[pts.length - 1].x.toFixed(1)} 42 L ${pts[0].x.toFixed(1)} 42 Z`;
    const uv3Y = (40 - ((3 / maxVal) * 34)).toFixed(1);

    const curPt = pts[currentHour] || pts[12];
    const curInfo = _getUvDetails(curPt.uv);

    wrap.innerHTML = `
      <svg class="uv-sparkline-svg" viewBox="0 0 240 44" preserveAspectRatio="none">
        <defs>
          <linearGradient id="uv-spark-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#facc15" stop-opacity="0.35"/>
            <stop offset="60%" stop-color="#4ade80" stop-opacity="0.12"/>
            <stop offset="100%" stop-color="#4ade80" stop-opacity="0"/>
          </linearGradient>
          <linearGradient id="uv-spark-stroke" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#4ade80"/>
            <stop offset="35%" stop-color="#facc15"/>
            <stop offset="55%" stop-color="#fb923c"/>
            <stop offset="85%" stop-color="#facc15"/>
            <stop offset="100%" stop-color="#4ade80"/>
          </linearGradient>
        </defs>
        <!-- UV 3 threshold reference line -->
        <line x1="4" y1="${uv3Y}" x2="236" y2="${uv3Y}" stroke="rgba(255,255,255,0.14)" stroke-dasharray="2 3" stroke-width="1"/>
        <!-- Filled daylight curve area -->
        <path d="${dArea}" fill="url(#uv-spark-grad)"/>
        <!-- Luminous curve stroke -->
        <path d="${dLine}" fill="none" stroke="url(#uv-spark-stroke)" stroke-width="2.2" stroke-linecap="round"/>
        <!-- Current hour vertical marker -->
        <line x1="${curPt.x.toFixed(1)}" y1="4" x2="${curPt.x.toFixed(1)}" y2="42" stroke="${curInfo.color}" stroke-opacity="0.5" stroke-dasharray="2 2" stroke-width="1"/>
        <!-- Current hour glowing dot indicator -->
        <circle cx="${curPt.x.toFixed(1)}" cy="${curPt.y.toFixed(1)}" r="4" fill="#ffffff" stroke="${curInfo.color}" stroke-width="2" style="filter: drop-shadow(0 0 6px ${curInfo.color});"/>
      </svg>
    `;
  }

  function _updateBurnCalculator(uvInfo) {
    if (!uvInfo && lastData) {
      uvInfo = _getUvDetails(lastData.uvIndex ?? 0);
    }
    if (!uvInfo) return;

    const naturalEl = document.getElementById('uv-burn-natural');
    const spfEl = document.getElementById('uv-burn-spf');

    if (naturalEl) naturalEl.textContent = uvInfo.burnTimes[selectedSkinType] || '--';
    if (spfEl) spfEl.textContent = uvInfo.burnTimes.spf || '3+ hours';

    document.querySelectorAll('.uv-skin-btn').forEach(btn => {
      const isSelected = btn.getAttribute('data-skin') === selectedSkinType;
      btn.classList.toggle('active', isSelected);
    });
  }

  function _setupPanelListeners() {
    const widget = document.getElementById('weather-widget');
    const panel = document.getElementById('weather-panel');
    if (!widget || !panel) return;

    if (widget.hasAttribute('data-bound')) return;
    widget.setAttribute('data-bound', 'true');

    widget.addEventListener('click', (e) => {
      e.stopPropagation();
      if (typeof Panels !== 'undefined') {
        Panels.toggle(panel, () => {
          if (lastData) _renderPanelData(lastData);
        });
      } else {
        const isOpen = panel.style.display !== 'none';
        if (!isOpen) {
          panel.style.display = '';
          if (lastData) _renderPanelData(lastData);
        } else {
          panel.style.display = 'none';
        }
      }
    });

    const closeBtn = panel.querySelector('[data-close]');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof Panels !== 'undefined') {
          Panels.close(panel);
        } else {
          panel.style.display = 'none';
        }
      });
    }

    const refreshBtn = document.getElementById('btn-weather-refresh');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        refreshBtn.classList.add('spin');
        try {
          await refresh();
          if (typeof App !== 'undefined' && App.showToast) {
            App.showToast('Weather & UV refreshed');
          }
        } finally {
          setTimeout(() => refreshBtn.classList.remove('spin'), 600);
        }
      });
    }

    // Homescreen Quick Refresh Button (within compact card)
    const quickRefreshBtn = document.getElementById('btn-weather-quick-refresh');
    if (quickRefreshBtn) {
      quickRefreshBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        e.preventDefault();
        quickRefreshBtn.classList.add('spin');
        try {
          await refresh();
          if (typeof App !== 'undefined' && App.showToast) {
            App.showToast('Weather & UV refreshed');
          }
        } finally {
          setTimeout(() => quickRefreshBtn.classList.remove('spin'), 600);
        }
      });
    }

    // Quick Unit Toggle (°C / °F)
    const unitToggle = document.getElementById('btn-weather-unit-toggle');
    if (unitToggle) {
      unitToggle.addEventListener('click', async (e) => {
        e.stopPropagation();
        const newUnit = (unit === 'celsius') ? 'fahrenheit' : 'celsius';
        await setUnit(newUnit);
        if (typeof App !== 'undefined' && App.showToast) {
          App.showToast(`Switched to ${newUnit === 'celsius' ? '°C' : '°F'}`);
        }
      });
    }

    // Hourly Mode Toggle (Temp vs UV)
    const btnHourlyTemp = document.getElementById('btn-hourly-temp');
    const btnHourlyUv = document.getElementById('btn-hourly-uv');
    const hourlyTrack = document.getElementById('weather-hourly-track');
    const btnHourlyPrev = document.getElementById('btn-hourly-prev');
    const btnHourlyNext = document.getElementById('btn-hourly-next');

    if (btnHourlyPrev && hourlyTrack) {
      btnHourlyPrev.addEventListener('click', (e) => {
        e.stopPropagation();
        hourlyTrack.scrollBy({ left: -hourlyTrack.clientWidth, behavior: 'smooth' });
      });
    }

    if (btnHourlyNext && hourlyTrack) {
      btnHourlyNext.addEventListener('click', (e) => {
        e.stopPropagation();
        hourlyTrack.scrollBy({ left: hourlyTrack.clientWidth, behavior: 'smooth' });
      });
    }

    if (hourlyTrack) {
      hourlyTrack.addEventListener('scroll', () => {
        _updateHourlyNav();
      }, { passive: true });
    }

    if (btnHourlyTemp) {
      btnHourlyTemp.addEventListener('click', (e) => {
        e.stopPropagation();
        if (hourlyMode === 'temp') return;
        hourlyMode = 'temp';
        if (hourlyTrack) hourlyTrack.scrollLeft = 0;
        if (lastData) _renderHourlyTrack(lastData.hourlyList);
      });
    }
    if (btnHourlyUv) {
      btnHourlyUv.addEventListener('click', (e) => {
        e.stopPropagation();
        if (hourlyMode === 'uv') return;
        hourlyMode = 'uv';
        if (hourlyTrack) hourlyTrack.scrollLeft = 0;
        if (lastData) _renderHourlyTrack(lastData.hourlyList);
      });
    }

    panel.querySelectorAll('.uv-skin-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const skin = btn.getAttribute('data-skin');
        if (skin) {
          selectedSkinType = skin;
          try { localStorage.setItem('hometab_uv_skin', skin); } catch (_) {}
          _updateBurnCalculator();
        }
      });
    });
  }

  /** Search cities via geocoding API */
  async function searchCity(query) {
    if (!query || query.length < 2) return [];
    try {
      const params = new URLSearchParams({
        name: query,
        count: 8,
        language: I18n.currentLang || 'en',
      });
      const resp = await fetch(`${GEOCODING_URL}?${params}`);
      if (!resp.ok) return [];
      const data = await resp.json();
      return (data.results || []).map(r => ({
        name: r.name,
        country: r.country || '',
        admin1: r.admin1 || '',
        lat: r.latitude,
        lon: r.longitude,
      }));
    } catch (e) {
      console.warn('Geocoding error:', e);
      return [];
    }
  }

  /** Set location and fetch weather */
  async function setLocation(loc) {
    location = loc;
    await Storage.setSync({ weatherLocation: loc });
    await _fetchAndDisplay();
  }

  /** Set unit */
  async function setUnit(u) {
    unit = u;
    await Storage.setSync({ weatherUnit: u });
    // Clear cache to refetch with new unit
    await Storage.removeLocal(['weatherCache']);
    if (location) await _fetchAndDisplay();
  }

  /** Use browser geolocation */
  async function useGeolocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const loc = {
            name: 'Current Location',
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            country: '',
          };
          // Try reverse geocoding to get city name
          try {
            const results = await searchCity(`${pos.coords.latitude},${pos.coords.longitude}`);
            if (results.length > 0) {
              loc.name = results[0].name;
              loc.country = results[0].country;
            }
          } catch { /* keep 'Current Location' */ }
          await setLocation(loc);
          resolve(loc);
        },
        (err) => reject(err),
        { timeout: 10000, maximumAge: 300000 }
      );
    });
  }

  /** Refresh weather data */
  async function refresh() {
    await Storage.removeLocal(['weatherCache']);
    if (location) await _fetchAndDisplay();
  }

  return {
    init, searchCity, setLocation, setUnit, useGeolocation, refresh,
    WMO_CODES, WEATHER_ICONS,
    get unit() { return unit; },
    get location() { return location; },
    get lastData() { return lastData; },
  };
})();
