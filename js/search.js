/**
 * Search module
 * Multi-engine search with live Google suggestions, AI Mode, and history dropdown
 */
'use strict';

const Search = (() => {
  const ENGINES = [
    { id: 'google', name: 'Google', url: 'https://www.google.com/search?q={q}', icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>' },
    { id: 'duckduckgo', name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q={q}', icon: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" fill="#DE5833"/><path d="M8 8a2 2 0 1 1 4 0v2a2 2 0 1 1-4 0V8zm5 6c0 2-1.5 4-3 4s-3-2-3-4h6z" fill="white"/></svg>' },
    { id: 'bing', name: 'Bing', url: 'https://www.bing.com/search?q={q}', icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 3l3.5 1.25v12.5L14 13.5l4.5 2.25-5 3.5L5 21V3z" fill="#008373"/></svg>' },
    { id: 'brave', name: 'Brave', url: 'https://search.brave.com/search?q={q}', icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L3 7v10l9 5 9-5V7l-9-5zm0 2.5L18.5 8 12 11.5 5.5 8 12 4.5z" fill="#FB542B"/></svg>' },
    { id: 'youtube', name: 'YouTube', url: 'https://www.youtube.com/results?search_query={q}', icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.4 31.4 0 0 0 0 12a31.4 31.4 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1c.3-1.9.5-3.9.5-5.8a31.4 31.4 0 0 0-.5-5.8z" fill="#FF0000"/><polygon points="9.75 15.02 15.5 12 9.75 8.98" fill="white"/></svg>' },
  ];

  const DEFAULT_HISTORY = [
    { query: 'tiktok', sub: 'Google Search', isAi: false, count: 5, timestamp: Date.now() - 3600000 },
    { query: 'usdt to lkr', sub: '', isAi: false, count: 3, timestamp: Date.now() - 7200000 },
    { query: 'muditha methsara', sub: 'AI Mode History', isAi: true, count: 4, timestamp: Date.now() - 10800000 },
    { query: 'how does quantum computing work', sub: 'AI Mode History', isAi: true, count: 2, timestamp: Date.now() - 14400000 },
    { query: 'mynt extension', sub: '', isAi: false, count: 2, timestamp: Date.now() - 18000000 },
    { query: 'custom home tab reddit', sub: '', isAi: false, count: 1, timestamp: Date.now() - 21600000 },
    { query: 'translate', sub: '', isAi: false, count: 8, timestamp: Date.now() - 25200000 },
    { query: 'compare next.js vs vite in 2026', sub: 'AI Mode History', isAi: true, count: 3, timestamp: Date.now() - 28800000 },
    { query: 'home tab glass look design', sub: '', isAi: false, count: 1, timestamp: Date.now() - 32400000 },
    { query: 'anime wallpapers 4k', sub: '', isAi: false, count: 1, timestamp: Date.now() - 36000000 },
  ];

  const DEFAULT_AI_PROMPTS = [
    'Explain quantum computing simply',
    'Write a python script to parse JSON',
    'Summarize the latest tech news this week',
    'Compare Next.js vs Vite React in 2026',
    'Ideas for healthy quick dinner recipes',
    'How do black holes form in space',
  ];

  const ICON_HISTORY = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>`;
  const ICON_SEARCH = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;
  const ICON_AI_SPARKLE = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>`;
  const ICON_TRENDING = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`;

  const DEFAULT_TRENDING = [
    'ChatGPT',
    'World News',
    'Premier League',
    'James Webb Space Telescope',
    'Google Gemini AI',
    'Stock Market Today',
    'SpaceX Starship',
    'Anime 2026',
    'Weather Forecast',
    'GitHub Trending',
  ];

  const DEFAULT_TRENDING_BY_GEO = {
    'LK': ['Sri Lanka Cricket', 'Colombo Weather', 'Gold Price in Sri Lanka', 'USDT to LKR', 'Dialog Axiata', 'World News', 'Tech News'],
    'IN': ['Cricket Live Score', 'Stock Market Today', 'Weather Forecast', 'ChatGPT', 'Gold Rate Today', 'Tech News', 'World Cup'],
    'GB': ['BBC News', 'Premier League', 'Weather UK', 'Champions League', 'Formula 1', 'ChatGPT', 'Sky Sports'],
    'US': ['ChatGPT', 'World News', 'Premier League', 'James Webb Space Telescope', 'Google Gemini AI', 'Stock Market Today', 'SpaceX Starship'],
    'CA': ['NHL Scores', 'Canada Weather', 'CBC News', 'ChatGPT', 'Stock Market Today', 'Tech News'],
    'AU': ['AFL Scores', 'ABC News Australia', 'Australia Weather', 'ChatGPT', 'Cricket Live', 'Tech News'],
  };

  const KNOWN_ENTITIES = [
    {
      id: 'youtube',
      name: 'YouTube',
      aliases: ['youtube', 'yt', 'you tube', 'yotube'],
      url: 'https://www.youtube.com',
      domain: 'youtube.com',
      category: 'Video sharing company',
      iconSvg: '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="#ff0000" d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"/><path fill="#ffffff" d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>'
    },
    {
      id: 'github',
      name: 'GitHub',
      aliases: ['github', 'git hub', 'git'],
      url: 'https://github.com',
      domain: 'github.com',
      category: 'Software development platform',
      iconSvg: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>'
    },
    {
      id: 'spotify',
      name: 'Spotify',
      aliases: ['spotify', 'spot'],
      url: 'https://open.spotify.com',
      domain: 'spotify.com',
      category: 'Music streaming service',
      iconSvg: '<svg viewBox="0 0 24 24" width="18" height="18" fill="#1ed760"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424c-.18.295-.563.387-.857.207-2.35-1.435-5.308-1.76-8.793-.963-.335.077-.67-.133-.746-.468-.077-.334.132-.67.467-.746 3.808-.87 7.076-.503 9.722 1.113.294.18.386.563.207.857zm1.224-2.72c-.227.368-.71.482-1.077.255-2.69-1.654-6.79-2.133-9.97-1.168-.413.125-.85-.11-1.075-.523-.125-.413.11-.85.523-1.075 3.633-1.103 8.147-.568 11.244 1.335.367.226.482.709.255 1.076zm.106-2.83c-3.226-1.916-8.544-2.093-11.623-1.158-.495.15-1.022-.132-1.172-.627-.15-.495.132-1.022.627-1.172 3.535-1.072 9.404-.865 13.115 1.338.445.264.59.838.326 1.283-.264.444-.838.59-1.283.326z"/></svg>'
    },
    {
      id: 'chatgpt',
      name: 'ChatGPT',
      aliases: ['chatgpt', 'chat gpt', 'openai', 'gpt'],
      url: 'https://chatgpt.com',
      domain: 'chatgpt.com',
      category: 'AI chatbot by OpenAI',
      iconSvg: '<svg viewBox="0 0 24 24" width="18" height="18" fill="#10a37f"><path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l2.46-1.42 2.46 1.42v2.84l-2.46 1.42-2.46-1.42z"/></svg>'
    },
    {
      id: 'reddit',
      name: 'Reddit',
      aliases: ['reddit', 'reddt'],
      url: 'https://www.reddit.com',
      domain: 'reddit.com',
      category: 'Social news & discussion community',
      iconSvg: '<svg viewBox="0 0 24 24" width="18" height="18" fill="#ff4500"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/></svg>'
    },
    {
      id: 'netflix',
      name: 'Netflix',
      aliases: ['netflix', 'netflx'],
      url: 'https://www.netflix.com',
      domain: 'netflix.com',
      category: 'Streaming entertainment service',
      iconSvg: '<svg viewBox="0 0 24 24" width="18" height="18" fill="#e50914"><path d="M5.398 0v24c1.196-.27 2.457-.61 3.655-.95V0H5.398zm9.549 0v17.432c1.25.32 2.46.61 3.655.85V0h-3.655zM9.053 0l5.894 17.065V0h-1.895L9.053 11.23V0z"/></svg>'
    },
    {
      id: 'wikipedia',
      name: 'Wikipedia',
      aliases: ['wikipedia', 'wiki'],
      url: 'https://www.wikipedia.org',
      domain: 'wikipedia.org',
      category: 'Free online encyclopedia',
      iconSvg: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12.09 13.018l2.257-7.618h1.666l3.35 11.391 2.502-8.497h1.666L20.25 19.5h-1.666L15.234 8.109l-2.257 7.618h-1.77L7.857 4.301H9.52l3.35 11.391L15.372 7.2h-1.77l-1.512 5.818zM4.469 19.5L1.12 8.109H2.78l2.502 8.497L7.784 8.109h1.666L6.135 19.5H4.469z"/></svg>'
    },
    {
      id: 'instagram',
      name: 'Instagram',
      aliases: ['instagram', 'insta', 'ig'],
      url: 'https://www.instagram.com',
      domain: 'instagram.com',
      category: 'Photo & video sharing platform',
      iconSvg: '<svg viewBox="0 0 24 24" width="18" height="18" fill="#e1306c"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>'
    },
    {
      id: 'x',
      name: 'X (Twitter)',
      aliases: ['twitter', 'x.com', 'x corp'],
      url: 'https://x.com',
      domain: 'x.com',
      category: 'Social networking service',
      iconSvg: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>'
    },
    {
      id: 'amazon',
      name: 'Amazon',
      aliases: ['amazon', 'amzn'],
      url: 'https://www.amazon.com',
      domain: 'amazon.com',
      category: 'Online shopping & e-commerce',
      iconSvg: '<svg viewBox="0 0 24 24" width="18" height="18" fill="#ff9900"><path d="M13.954 11.233c-.066-.75-.544-1.077-1.282-1.077-.969 0-1.52.483-1.636 1.077h2.918zm-2.973 2.19c.073.74.654 1.134 1.488 1.134.78 0 1.282-.295 1.492-.684l1.32.74c-.535.89-1.583 1.34-2.812 1.34-1.922 0-3.15-1.272-3.15-3.23 0-1.996 1.306-3.272 3.197-3.272 2.052 0 3.036 1.442 3.036 3.23 0 .285-.022.545-.045.742h-4.526zm10.74 5.37c-3.167 2.083-7.55 3.072-11.83 2.378-3.714-.6-6.685-2.52-8.39-5.116-.3-.454.043-.984.53-.746 3.033 1.48 6.55 2.183 10.15 1.832 3.14-.306 6.096-1.542 8.653-3.364.577-.412 1.173.298.887 1.016zm1.323-1.503c-.346-.43-1.98-.31-2.998-.176-.307.04-.37-.21-.1-.39 1.76-1.168 3.842-.716 4.148-.335.306.38-.403 2.525-2.072 3.827-.257.2-.477.086-.347-.18.43-.884 1.715-2.316 1.37-2.746z"/></svg>'
    },
    {
      id: 'twitch',
      name: 'Twitch',
      aliases: ['twitch', 'twitch tv'],
      url: 'https://www.twitch.tv',
      domain: 'twitch.tv',
      category: 'Live streaming platform',
      iconSvg: '<svg viewBox="0 0 24 24" width="18" height="18" fill="#9146ff"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/></svg>'
    },
    {
      id: 'discord',
      name: 'Discord',
      aliases: ['discord', 'disc'],
      url: 'https://discord.com',
      domain: 'discord.com',
      category: 'Voice, video & text communication',
      iconSvg: '<svg viewBox="0 0 24 24" width="18" height="18" fill="#5865f2"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>'
    },
    {
      id: 'linkedin',
      name: 'LinkedIn',
      aliases: ['linkedin', 'linkdin'],
      url: 'https://www.linkedin.com',
      domain: 'linkedin.com',
      category: 'Professional networking platform',
      iconSvg: '<svg viewBox="0 0 24 24" width="18" height="18" fill="#0a66c2"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>'
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp Web',
      aliases: ['whatsapp', 'whatsapp web', 'wa web'],
      url: 'https://web.whatsapp.com',
      domain: 'whatsapp.com',
      category: 'Messaging & communication',
      iconSvg: '<svg viewBox="0 0 24 24" width="18" height="18" fill="#25d366"><path d="M12.031 0C5.397 0 .016 5.376.016 12a11.95 11.95 0 0 0 1.866 6.386L0 24l5.772-1.84A11.94 11.94 0 0 0 12.03 24c6.634 0 12.015-5.376 12.015-12S18.665 0 12.031 0zm7.042 16.993c-.294.825-1.472 1.513-2.42 1.717-.65.139-1.5.25-4.354-.932-3.647-1.51-6.002-5.215-6.184-5.456-.178-.242-1.468-1.956-1.468-3.73 0-1.775.928-2.648 1.258-3.01.328-.362.716-.453.955-.453.238 0 .478.002.686.013.22.01.513-.083.803.614.3.722 1.026 2.502 1.116 2.686.09.183.15.398.03.639-.12.242-.18.392-.358.604-.18.21-.377.47-.54.63-.18.179-.368.374-.158.734.21.36 1.127 1.858 2.422 3.011 1.666 1.484 3.07 1.944 3.504 2.16.434.215.688.18.944-.117.258-.297 1.106-1.29 1.4-1.733.295-.444.59-.37.994-.22.404.148 2.562 1.208 3.002 1.428.44.22.734.33.844.516.11.185.11 1.077-.184 1.902z"/></svg>'
    },
    {
      id: 'maps',
      name: 'Google Maps',
      aliases: ['maps', 'google maps', 'gmaps'],
      url: 'https://maps.google.com',
      domain: 'maps.google.com',
      category: 'Web mapping service',
      iconSvg: '<svg viewBox="0 0 24 24" width="18" height="18" fill="#4285f4"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>'
    },
    {
      id: 'gmail',
      name: 'Gmail',
      aliases: ['gmail', 'google mail'],
      url: 'https://mail.google.com',
      domain: 'mail.google.com',
      category: 'Email service by Google',
      iconSvg: '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="#ea4335" d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.272H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L12 9.545l8.073-6.052C21.69 2.279 24 3.434 24 5.457z"/></svg>'
    },
    {
      id: 'drive',
      name: 'Google Drive',
      aliases: ['drive', 'google drive', 'gdrive'],
      url: 'https://drive.google.com',
      domain: 'drive.google.com',
      category: 'Cloud storage service',
      iconSvg: '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="#FFC107" d="M8.6 15.5l-4.3 7.5h8.6l4.3-7.5H8.6z"/><path fill="#1976D2" d="M15.4 3.5l-8.6 15h4.3l8.6-15H15.4z"/><path fill="#4CAF50" d="M19.7 18.5l-4.3-7.5-4.3 7.5h8.6z"/></svg>'
    },
    {
      id: 'pinterest',
      name: 'Pinterest',
      aliases: ['pinterest', 'pin'],
      url: 'https://www.pinterest.com',
      domain: 'pinterest.com',
      category: 'Visual discovery & bookmarking',
      iconSvg: '<svg viewBox="0 0 24 24" width="18" height="18" fill="#e60023"><path d="M12 0a12 12 0 0 0-4.37 23.18c-.03-.94-.06-2.39.05-3.42l.8-3.39s-.2-.41-.2-1.02c0-.96.56-1.67 1.25-1.67.59 0 .88.44.88.97 0 .59-.38 1.48-.57 2.3-.16.69.34 1.25 1.02 1.25 1.23 0 2.17-1.3 2.17-3.17 0-1.66-1.19-2.82-2.9-2.82-1.97 0-3.13 1.48-3.13 3.01 0 .6.23 1.23.52 1.58.06.07.07.13.05.2l-.2 1.03c-.04.14-.12.17-.28.1-1.05-.49-1.7-2.03-1.7-3.26 0-2.65 1.93-5.09 5.56-5.09 2.92 0 5.19 2.08 5.19 4.86 0 2.9-1.83 5.23-4.37 5.23-.85 0-1.66-.44-1.93-.97l-.53 2.01c-.19.74-.71 1.66-1.06 2.22A12 12 0 1 0 12 0z"/></svg>'
    },
    {
      id: 'claude',
      name: 'Claude',
      aliases: ['claude', 'anthropic', 'claude ai'],
      url: 'https://claude.ai',
      domain: 'claude.ai',
      category: 'AI assistant by Anthropic',
      iconSvg: '<svg viewBox="0 0 24 24" width="18" height="18" fill="#d97706"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.5h-2v-2h2v2zm0-4h-2V7h2v5.5z"/></svg>'
    },
    {
      id: 'perplexity',
      name: 'Perplexity',
      aliases: ['perplexity', 'perplexity ai'],
      url: 'https://www.perplexity.ai',
      domain: 'perplexity.ai',
      category: 'AI conversational search engine',
      iconSvg: '<svg viewBox="0 0 24 24" width="18" height="18" fill="#20b2aa"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>'
    },
    {
      id: 'facebook',
      name: 'Facebook',
      aliases: ['facebook', 'fb', 'face book'],
      url: 'https://www.facebook.com',
      domain: 'facebook.com',
      category: 'Social networking service',
      iconSvg: '<svg viewBox="0 0 24 24" width="18" height="18" fill="#1877f2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>'
    },
    {
      id: 'telegram',
      name: 'Telegram',
      aliases: ['telegram', 'tg', 'tele'],
      url: 'https://web.telegram.org',
      domain: 'telegram.org',
      category: 'Cloud-based instant messaging',
      iconSvg: '<svg viewBox="0 0 24 24" width="18" height="18" fill="#24A1DE"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.458c.538-.196 1.006.128.832.941z"/></svg>'
    },
    {
      id: 'steam',
      name: 'Steam',
      aliases: ['steam', 'steam games', 'steampowered'],
      url: 'https://store.steampowered.com',
      domain: 'steampowered.com',
      category: 'Video game digital storefront',
      iconSvg: '<svg viewBox="0 0 24 24" width="18" height="18" fill="#171a21"><path fill="#00adee" d="M11.979 0C5.372 0 .017 5.344 0 11.947a11.94 11.94 0 0 0 2.227 6.942l4.898-2.028a3.52 3.52 0 0 1 1.748-2.735l2.673-3.876a4.707 4.707 0 1 1 4.707 4.708c-.085 0-.17-.004-.254-.01l-3.858 2.684a3.565 3.565 0 0 1-2.733 1.761L7.38 21.3a11.94 11.94 0 0 0 4.6 1.636c6.607 0 11.96-5.352 11.96-11.956S18.586 0 11.979 0z"/><circle cx="16.275" cy="7.714" r="2.944" fill="#ffffff"/></svg>'
    },
    {
      id: 'roblox',
      name: 'Roblox',
      aliases: ['roblox', 'rblx'],
      url: 'https://www.roblox.com',
      domain: 'roblox.com',
      category: 'Online game platform & creation system',
      iconSvg: '<svg viewBox="0 0 24 24" width="18" height="18" fill="#e2231a"><path d="M5.165 0L0 18.835 18.835 24 24 5.165 5.165 0zm10.024 14.189l-4.189 1.144-1.144-4.189 4.189-1.144 1.144 4.189z"/></svg>'
    },
    {
      id: 'figma',
      name: 'Figma',
      aliases: ['figma', 'fig'],
      url: 'https://www.figma.com',
      domain: 'figma.com',
      category: 'Collaborative design & prototyping tool',
      iconSvg: '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="#0acf83" d="M8 24a4 4 0 0 0 4-4v-4H8a4 4 0 0 0 0 8z"/><path fill="#a259ff" d="M4 12a4 4 0 0 1 4-4h4v8H8a4 4 0 0 1-4-4z"/><path fill="#f24e1e" d="M4 4a4 4 0 0 1 4-4h4v8H8a4 4 0 0 1-4-4z"/><path fill="#ff7262" d="M12 0h4a4 4 0 0 1 0 8h-4z"/><path fill="#1abcfe" d="M20 12a4 4 0 0 1-4 4h-4v-8h4a4 4 0 0 1 4 4z"/></svg>'
    },
    {
      id: 'notion',
      name: 'Notion',
      aliases: ['notion'],
      url: 'https://www.notion.so',
      domain: 'notion.so',
      category: 'Connected workspace for wiki, docs & tasks',
      iconSvg: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.213.98l14.523-.84c.84-.046.933-.56.933-1.167V6.354c0-.606-.233-.933-.793-.886l-15.083.886c-.56.047-.793.327-.793.934zm13.447.747c.093.42 0 .84-.42.887l-.7.14v9.613c-.373.187-.84.28-1.26.28-.7 0-1.12-.28-1.587-.84l-4.76-7.466v7.373l1.54.373c.047.42-.327.84-.747.887l-4.06.233c-.093-.42.093-.84.42-.887l.933-.233V8.874l-1.306-.14c-.093-.42.14-.84.56-.887l4.06-.233 5.087 7.7v-6.953l-1.353-.14c-.093-.42.14-.84.56-.887z"/></svg>'
    },
    {
      id: 'canva',
      name: 'Canva',
      aliases: ['canva'],
      url: 'https://www.canva.com',
      domain: 'canva.com',
      category: 'Graphic design platform',
      iconSvg: '<svg viewBox="0 0 24 24" width="18" height="18" fill="#00c4cc"><circle cx="12" cy="12" r="12"/><path fill="#ffffff" d="M12.984 8.788c-.68 0-1.293.31-1.674.802-.27-.514-.795-.802-1.464-.802-1.35 0-2.348 1.144-2.348 2.76 0 1.63 1.02 2.76 2.375 2.76.685 0 1.208-.292 1.482-.82.38.528 1 .82 1.673.82 1.34 0 2.375-1.125 2.375-2.76 0-1.62-1.023-2.76-2.42-2.76zm-3.11 4.54c-.792 0-1.378-.718-1.378-1.78 0-1.05.586-1.776 1.378-1.776.78 0 1.373.725 1.373 1.776 0 1.062-.593 1.78-1.373 1.78zm3.155 0c-.793 0-1.378-.718-1.378-1.78 0-1.05.585-1.776 1.378-1.776.78 0 1.374.725 1.374 1.776 0 1.062-.594 1.78-1.374 1.78z"/></svg>'
    },
    {
      id: 'stackoverflow',
      name: 'Stack Overflow',
      aliases: ['stackoverflow', 'stack overflow', 'stack'],
      url: 'https://stackoverflow.com',
      domain: 'stackoverflow.com',
      category: 'Developer Q&A platform',
      iconSvg: '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="#bcbbbb" d="M18.986 21.865v-6.404h2.134V24H2.88v-8.539h2.134v6.404z"/><path fill="#f48024" d="M6.924 17.513h10.158v2.134H6.924zm.447-4.225l9.967 2.052.427-2.091-9.967-2.052zm1.687-4.135l9.288 4.318.917-1.954-9.288-4.318zm3.567-3.834l7.986 6.368 1.332-1.696-7.986-6.368zM17.07 0l-1.707 1.33 6.398 8.012 1.707-1.33z"/></svg>'
    },
    {
      id: 'slack',
      name: 'Slack',
      aliases: ['slack'],
      url: 'https://slack.com',
      domain: 'slack.com',
      category: 'Business messaging platform',
      iconSvg: '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="#e01e5a" d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.528 2.528 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z"/><path fill="#36c5f0" d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z"/><path fill="#2eb67d" d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z"/><path fill="#ecb22e" d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.528 2.528 0 0 1 2.52-2.52h6.313A2.528 2.528 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/></svg>'
    },
    {
      id: 'gitlab',
      name: 'GitLab',
      aliases: ['gitlab'],
      url: 'https://gitlab.com',
      domain: 'gitlab.com',
      category: 'DevOps & code collaboration platform',
      iconSvg: '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="#e24329" d="M12 21.417L1.134 13.524a.89.89 0 0 1-.303-1.026l2.368-7.29a.89.89 0 0 1 1.693-.001l2.364 7.275h9.488l2.364-7.275a.89.89 0 0 1 1.693 0l2.368 7.291a.89.89 0 0 1-.303 1.026L12 21.417z"/></svg>'
    },
    {
      id: 'npm',
      name: 'npm',
      aliases: ['npm', 'npmjs'],
      url: 'https://www.npmjs.com',
      domain: 'npmjs.com',
      category: 'JavaScript package manager & registry',
      iconSvg: '<svg viewBox="0 0 24 24" width="18" height="18" fill="#cb3837"><path d="M0 7.334v9.332h24V7.334H0zm4 8H2.667V8.667H4v6.667zm5.333 0H6.667V8.667h2.666v6.667zm5.334 0h-4V8.667h4v6.667zm5.333 0H17.333V8.667H20v6.667z"/></svg>'
    },
    {
      id: 'paypal',
      name: 'PayPal',
      aliases: ['paypal'],
      url: 'https://www.paypal.com',
      domain: 'paypal.com',
      category: 'Online payment system',
      iconSvg: '<svg viewBox="0 0 24 24" width="18" height="18" fill="#003087"><path d="M20.067 8.478c.492.88.556 2.014.3 3.327-.86 4.417-3.792 6.643-8.8 6.643H7.818a1.144 1.144 0 0 1-1.13-1.01l-1.39-9.923a1.144 1.144 0 0 1 1.13-1.278h5.688c3.27 0 5.617.72 6.95 2.241z"/><path fill="#0079C1" d="M18.847 6.183C17.362 4.484 14.773 4 11.233 4H5.545a1.144 1.144 0 0 0-1.13 1.01L1.87 20.354a1.144 1.144 0 0 0 1.13 1.278h3.948l1.3-8.243-.04.254a1.144 1.144 0 0 1 1.13-1.01h2.24c4.185 0 6.627-1.855 7.344-5.536.31-1.58.12-2.793-.725-3.914z"/></svg>'
    },
    {
      id: 'ebay',
      name: 'eBay',
      aliases: ['ebay'],
      url: 'https://www.ebay.com',
      domain: 'ebay.com',
      category: 'Online shopping & auctions',
      iconSvg: '<svg viewBox="0 0 24 24" width="18" height="18"><text x="1" y="17" font-family="Outfit, sans-serif" font-weight="800" font-size="14" fill="#e53238">e<tspan fill="#0064d2">b</tspan><tspan fill="#f5af02">a</tspan><tspan fill="#86b817">y</tspan></text></svg>'
    }
  ];

  function _findMatchingEntity(query) {
    if (!query) return null;
    const cleanQ = query.trim().toLowerCase();
    if (cleanQ.length < 2) return null;

    // If query has more than 2 words, user is searching content rather than navigating to a brand
    const words = cleanQ.split(/\s+/).filter(Boolean);
    if (words.length > 2) return null;

    return KNOWN_ENTITIES.find(entity => {
      if (entity.domain && (cleanQ === entity.domain || cleanQ.startsWith(entity.domain) || entity.domain.startsWith(cleanQ))) {
        return true;
      }
      return entity.aliases.some(alias => {
        if (alias === cleanQ) return true;
        if (alias.startsWith(cleanQ)) return true;
        return false;
      });
    }) || null;
  }

  let currentEngine = 'google';
  let customUrl = '';
  let engineDropdownOpen = false;
  let menuOpen = false;
  let isAiMode = false;
  let isFrostedOmnibox = true;
  let trendingRegion = 'auto';
  let searchHistory = [];
  let currentSuggestions = [];
  let selectedIndex = -1;
  let debounceTimeout = null;
  let originalUserTyped = '';
  let cachedTrending = null;
  let lastTrendingFetchTime = 0;

  async function init() {
    const data = await Storage.getSync(['searchEngine', 'customSearchUrl', 'frostedOmnibox', 'trendingRegion']);
    currentEngine = data.searchEngine || 'google';
    customUrl = data.customSearchUrl || '';
    isFrostedOmnibox = typeof data.frostedOmnibox === 'boolean' ? data.frostedOmnibox : true;
    trendingRegion = data.trendingRegion || 'auto';

    // Always start in normal mode on new tabs until user turns on AI mode
    isAiMode = false;
    try {
      localStorage.removeItem('hometab_search_ai_mode');
    } catch (_) {}

    // Load search history
    _loadHistory();

    _updateIcon();
    _updateAiModeUI();
    _updateFrostedOmniboxUI();
    _buildEngineDropdown();
    _setupListeners();
  }

  function _updateFrostedOmniboxUI() {
    const wrap = document.getElementById('search-box-wrap');
    if (wrap) {
      wrap.classList.toggle('frosted-omnibox-enabled', !!isFrostedOmnibox);
    }
  }

  function setFrostedOmnibox(val) {
    isFrostedOmnibox = !!val;
    _updateFrostedOmniboxUI();
  }

  function _loadHistory() {
    try {
      const saved = localStorage.getItem('hometab_search_history');
      if (saved) {
        searchHistory = JSON.parse(saved);
        if (!Array.isArray(searchHistory)) {
          searchHistory = [...DEFAULT_HISTORY];
          _saveHistory();
        } else {
          // Normalize existing items to ensure valid count and timestamp
          searchHistory.forEach(h => {
            if (typeof h.count !== 'number' || h.count < 1) h.count = 1;
            if (typeof h.timestamp !== 'number') h.timestamp = Date.now();
          });
        }
      } else {
        searchHistory = [...DEFAULT_HISTORY];
        _saveHistory();
      }
    } catch (_) {
      searchHistory = [...DEFAULT_HISTORY];
    }
  }

  function _saveHistory() {
    try {
      localStorage.setItem('hometab_search_history', JSON.stringify(searchHistory.slice(0, 30)));
    } catch (_) {}
  }

  // Smart Frecency formula: balances search frequency (count) + recency (age)
  function _computeFrecency(item, now = Date.now()) {
    const count = (typeof item.count === 'number' && item.count > 0) ? item.count : 1;
    const ageMs = Math.max(0, now - (item.timestamp || now));
    const ageHours = ageMs / (1000 * 60 * 60);

    let recencyBonus = 0;
    if (ageHours < 4) {
      recencyBonus = 60;
    } else if (ageHours < 24) {
      recencyBonus = 40;
    } else if (ageHours < 72) {
      recencyBonus = 25;
    } else if (ageHours < 168) {
      recencyBonus = 10;
    }

    const frequencyScore = count * 15;
    return frequencyScore + recencyBonus;
  }

  function _addHistory(query, isAi) {
    if (!query) return;
    const cleanQuery = query.trim();
    if (!cleanQuery) return;

    // Find existing to increment search frequency
    const existing = searchHistory.find(h => h.query.toLowerCase() === cleanQuery.toLowerCase());
    const count = (existing && typeof existing.count === 'number') ? existing.count + 1 : 1;

    // Remove existing
    searchHistory = searchHistory.filter(h => h.query.toLowerCase() !== cleanQuery.toLowerCase());
    // Prepend new
    searchHistory.unshift({
      query: cleanQuery,
      sub: isAi ? 'AI Mode History' : (currentEngine === 'google' ? 'Google Search' : ''),
      isAi: !!isAi,
      timestamp: Date.now(),
      count: count
    });
    _saveHistory();
  }

  function _removeHistory(query) {
    searchHistory = searchHistory.filter(h => h.query.toLowerCase() !== query.toLowerCase());
    _saveHistory();
    const input = document.getElementById('search-input');
    _renderSuggestions(input ? input.value : '');
    if (input) input.focus();
  }

  function _clearHistory() {
    searchHistory = [];
    _saveHistory();
    const input = document.getElementById('search-input');
    _renderSuggestions(input ? input.value : '');
    if (input) input.focus();
  }

  function _clearAiHistory() {
    searchHistory = searchHistory.filter(h => !h.isAi);
    _saveHistory();
    const input = document.getElementById('search-input');
    _renderSuggestions(input ? input.value : '');
    if (input) input.focus();
    if (typeof App !== 'undefined' && App.showToast) {
      App.showToast('AI Mode history cleared');
    }
  }

  function _updateIcon() {
    const iconEl = document.getElementById('search-engine-icon');
    if (!iconEl) return;
    const engine = ENGINES.find(e => e.id === currentEngine);
    if (engine) {
      iconEl.innerHTML = engine.icon;
    } else {
      iconEl.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
    }
  }

  function _updateAiModeUI() {
    const btn = document.getElementById('btn-ai-mode');
    const closeBtn = document.getElementById('btn-ai-mode-close');
    const wrap = document.getElementById('search-box-wrap');
    const input = document.getElementById('search-input');
    const stdFooter = document.getElementById('search-dropdown-footer-standard');
    const aiFooter = document.getElementById('search-dropdown-footer-ai');

    // 1. Soft glowing accent-color running line indicator around search box
    if (wrap) {
      wrap.classList.toggle('is-ai-mode', isAiMode);
    }

    // 2. Instead of AI mode button, close button appears in AI mode
    if (btn) {
      btn.style.display = isAiMode ? 'none' : 'inline-flex';
    }
    if (closeBtn) {
      closeBtn.style.display = isAiMode ? 'inline-flex' : 'none';
    }

    // 3. Dropdown footer toggle
    if (stdFooter && aiFooter) {
      stdFooter.style.display = isAiMode ? 'none' : '';
      aiFooter.style.display = isAiMode ? '' : 'none';
    }

    // 4. Input placeholder
    if (input) {
      input.placeholder = isAiMode ? 'Ask AI Mode anything or type a prompt...' : 'Search Google or type a URL';
    }

    // 5. Update dropdown suggestions if menu is open or input is focused
    if (menuOpen || (input && document.activeElement === input)) {
      _renderSuggestions(input ? input.value : '');
    }
  }

  function _toggleAiMode() {
    isAiMode = !isAiMode;
    _updateAiModeUI();
    const input = document.getElementById('search-input');
    if (input) input.focus();
    if (typeof App !== 'undefined' && App.showToast) {
      App.showToast(isAiMode ? 'AI Search Mode enabled' : 'Standard Search Mode');
    }
  }

  function _buildEngineDropdown() {
    const dd = document.getElementById('search-engine-dropdown');
    if (!dd) return;
    dd.innerHTML = '';

    ENGINES.forEach(engine => {
      const btn = document.createElement('button');
      btn.className = 'search-engine-option';
      btn.setAttribute('role', 'option');
      btn.setAttribute('aria-selected', engine.id === currentEngine ? 'true' : 'false');
      btn.innerHTML = `<span class="engine-icon">${engine.icon}</span><span>${engine.name}</span>`;
      btn.addEventListener('click', () => _selectEngine(engine.id));
      dd.appendChild(btn);
    });

    const customBtn = document.createElement('button');
    customBtn.className = 'search-engine-option';
    customBtn.setAttribute('role', 'option');
    customBtn.setAttribute('aria-selected', currentEngine === 'custom' ? 'true' : 'false');
    customBtn.innerHTML = `<span class="engine-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span><span>${I18n.t('custom', 'Custom')}</span>`;
    customBtn.addEventListener('click', () => _selectEngine('custom'));
    dd.appendChild(customBtn);
  }

  function _selectEngine(id) {
    currentEngine = id;
    _updateIcon();
    _closeEngineDropdown();
    _save();

    document.querySelectorAll('.search-engine-option').forEach(opt => {
      opt.setAttribute('aria-selected', 'false');
    });
  }

  function _openEngineDropdown() {
    const dd = document.getElementById('search-engine-dropdown');
    if (!dd) return;
    _closeMenu();
    dd.style.display = '';
    engineDropdownOpen = true;
  }

  function _closeEngineDropdown() {
    const dd = document.getElementById('search-engine-dropdown');
    if (!dd) return;
    dd.style.display = 'none';
    engineDropdownOpen = false;
  }

  function _hideShortcuts() {
    document.body.classList.add('search-active');
    const shortcutsWidget = document.getElementById('shortcuts-widget');
    if (shortcutsWidget) shortcutsWidget.classList.add('search-hidden');
  }

  function _showShortcuts() {
    document.body.classList.remove('search-active');
    const shortcutsWidget = document.getElementById('shortcuts-widget');
    if (shortcutsWidget) shortcutsWidget.classList.remove('search-hidden');
  }

  function _openMenu() {
    _closeEngineDropdown();
    const menu = document.getElementById('search-dropdown-menu');
    const box = document.getElementById('search-box');
    const wrap = document.getElementById('search-box-wrap');
    if (menu) menu.style.display = 'block';
    if (box) box.classList.add('has-dropdown-open');
    if (wrap) wrap.classList.add('has-dropdown-open');
    document.body.classList.add('search-dropdown-active');
    _hideShortcuts();
    menuOpen = true;
    _adjustDropdownMaxHeight();
    const input = document.getElementById('search-input');
    _renderSuggestions(input ? input.value : '');

    // Ensure input retains active focus and blinking text cursor
    if (input && document.activeElement !== input) {
      input.focus();
    }
  }

  let activeSuggestionRequestId = 0;

  const suggestionsMemoryCache = new Map();

  function _closeMenu() {
    clearTimeout(debounceTimeout);
    debounceTimeout = null;
    activeSuggestionRequestId++; // Invalidate all in-flight suggestion promises

    const menu = document.getElementById('search-dropdown-menu');
    const box = document.getElementById('search-box');
    const wrap = document.getElementById('search-box-wrap');

    if (menu) {
      menu.style.display = 'none';
      menu.style.maxHeight = '';
    }
    const listEl = document.getElementById('search-suggestions-list');
    if (listEl) {
      listEl.style.maxHeight = '';
    }
    if (box) box.classList.remove('has-dropdown-open');
    if (wrap) wrap.classList.remove('has-dropdown-open');
    document.body.classList.remove('search-dropdown-active');
    _showShortcuts();
    menuOpen = false;
    selectedIndex = -1;
  }

  function _adjustDropdownMaxHeight() {
    const wrap = document.getElementById('search-box-wrap');
    const menu = document.getElementById('search-dropdown-menu');
    const listEl = document.getElementById('search-suggestions-list');
    if (!wrap || !menu || !listEl) return;

    const rect = wrap.getBoundingClientRect();
    // Keep at least 36px breathing space so suggestions box never touches the bottom of the screen
    const bottomGap = 36;
    const availableHeight = Math.max(160, Math.floor(window.innerHeight - rect.bottom - bottomGap));

    // Footer height (Clear history or AI view history)
    const footer = menu.querySelector('.search-dropdown-footer:not([style*="display: none"]):not([style*="display:none"])');
    const footerHeight = footer ? (footer.offsetHeight || 42) : 42;
    const maxListHeight = Math.max(100, availableHeight - footerHeight);

    menu.style.maxHeight = `${availableHeight}px`;
    listEl.style.maxHeight = `${maxListHeight}px`;
  }

  async function _fetchGoogleSuggestions(query) {
    if (!query || !query.trim()) return [];
    const q = query.trim().toLowerCase();
    if (suggestionsMemoryCache.has(q)) {
      return suggestionsMemoryCache.get(q);
    }
    try {
      const url = `https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(q)}`;
      const res = await fetch(url, { signal: (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) ? AbortSignal.timeout(3500) : undefined });
      if (!res.ok) return [];
      const data = await res.json();
      if (Array.isArray(data) && Array.isArray(data[1])) {
        const results = data[1].slice(0, 10);
        suggestionsMemoryCache.set(q, results);
        if (suggestionsMemoryCache.size > 200) {
          const firstKey = suggestionsMemoryCache.keys().next().value;
          suggestionsMemoryCache.delete(firstKey);
        }
        return results;
      }
    } catch (_) {
      // Fallback
    }
    return [];
  }

  function _detectUserCountry() {
    // 1. Weather location country code if set
    try {
      if (typeof Weather !== 'undefined' && Weather.location && Weather.location.country_code) {
        return Weather.location.country_code.toUpperCase();
      }
    } catch (_) {}

    // 2. Browser Timezone mapping
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) {
        const TZ_MAP = {
          'Asia/Colombo': 'LK',
          'Asia/Kolkata': 'IN',
          'Asia/Calcutta': 'IN',
          'Europe/London': 'GB',
          'Europe/Belfast': 'GB',
          'Asia/Singapore': 'SG',
          'Asia/Tokyo': 'JP',
          'Asia/Dubai': 'AE',
          'Asia/Kuala_Lumpur': 'MY',
          'Asia/Bangkok': 'TH',
          'Asia/Jakarta': 'ID',
          'Asia/Karachi': 'PK',
          'Asia/Dhaka': 'BD',
          'Australia/Sydney': 'AU',
          'Australia/Melbourne': 'AU',
          'Australia/Brisbane': 'AU',
          'Australia/Perth': 'AU',
          'Australia/Adelaide': 'AU',
          'America/Toronto': 'CA',
          'America/Vancouver': 'CA',
          'America/Montreal': 'CA',
          'Europe/Paris': 'FR',
          'Europe/Berlin': 'DE',
          'Europe/Rome': 'IT',
          'Europe/Madrid': 'ES',
          'Europe/Amsterdam': 'NL',
          'Europe/Zurich': 'CH',
          'Europe/Stockholm': 'SE',
          'Europe/Oslo': 'NO',
          'Europe/Helsinki': 'FI',
          'Europe/Dublin': 'IE',
          'America/Sao_Paulo': 'BR',
          'America/Mexico_City': 'MX',
          'Pacific/Auckland': 'NZ',
        };
        if (TZ_MAP[tz]) return TZ_MAP[tz];
        if (tz.startsWith('America/')) return 'US';
        if (tz.startsWith('Australia/')) return 'AU';
        if (tz.startsWith('Canada/')) return 'CA';
      }
    } catch (_) {}

    // 3. Browser locale / language
    try {
      const langs = navigator.languages || [navigator.language];
      for (const lang of langs) {
        if (lang && lang.includes('-')) {
          const code = lang.split('-')[1].toUpperCase();
          if (code && code.length === 2) return code;
        }
      }
    } catch (_) {}

    return 'US';
  }

  function _getActiveTrendingRegion() {
    if (trendingRegion && trendingRegion !== 'auto') {
      return trendingRegion.toUpperCase();
    }
    return _detectUserCountry();
  }

  function setTrendingRegion(region) {
    trendingRegion = region || 'auto';
    cachedTrending = null;
    lastTrendingFetchTime = 0;
  }

  async function _fetchTrendingSearches() {
    const geo = _getActiveTrendingRegion();
    const cacheKey = `hometab_cached_trending_${geo}`;
    const now = Date.now();

    if (cachedTrending && cachedTrending.geo === geo && (now - lastTrendingFetchTime < 30 * 60 * 1000)) {
      return cachedTrending.items;
    }

    try {
      const saved = localStorage.getItem(cacheKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.timestamp && (now - parsed.timestamp < 30 * 60 * 1000) && Array.isArray(parsed.items) && parsed.items.length > 0) {
          cachedTrending = { geo, timestamp: parsed.timestamp, items: parsed.items };
          return parsed.items;
        }
      }
    } catch (_) {}

    try {
      const res = await fetch(`https://trends.google.com/trending/rss?geo=${encodeURIComponent(geo)}`, { 
        cache: 'no-cache',
        signal: (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) ? AbortSignal.timeout(4500) : undefined
      });
      if (res.ok) {
        const text = await res.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, 'text/xml');
        const titleNodes = xmlDoc.querySelectorAll('item > title');
        const fetched = Array.from(titleNodes)
          .map(n => n.textContent.trim())
          .filter(t => !!t && !t.includes('Daily Search Trends'))
          .slice(0, 15);

        if (fetched.length > 0) {
          cachedTrending = { geo, timestamp: now, items: fetched };
          lastTrendingFetchTime = now;
          try {
            localStorage.setItem(cacheKey, JSON.stringify({
              timestamp: now,
              items: fetched
            }));
          } catch (_) {}
          return cachedTrending.items;
        }
      }
    } catch (_) {}

    const fallback = DEFAULT_TRENDING_BY_GEO[geo] || DEFAULT_TRENDING;
    cachedTrending = { geo, timestamp: now, items: fallback };
    return fallback;
  }

  function _buildItems(rawQuery, googleSuggestions) {
    const query = (rawQuery || '').trim().toLowerCase();
    const suggestions = Array.isArray(googleSuggestions) ? googleSuggestions : [];

    if (isAiMode) {
      if (!query) {
        // AI Mode History: past questions asked in AI Mode, ranked by frecency
        const now = Date.now();
        const rankedAiHistory = [...(searchHistory || [])]
          .filter(h => h.isAi)
          .sort((a, b) => {
            const scoreB = _computeFrecency(b, now);
            const scoreA = _computeFrecency(a, now);
            if (scoreB !== scoreA) return scoreB - scoreA;
            return (b.timestamp || 0) - (a.timestamp || 0);
          });

        const maxAiHistory = 5;
        const historyToShow = rankedAiHistory.slice(0, maxAiHistory);
        const historyItems = historyToShow.map(h => ({
          query: h.query,
          sub: 'AI Mode History',
          isAi: true,
          type: 'ai-history'
        }));

        // Complement with 3 AI prompts (or more if user has fewer than 5 AI history items)
        const neededPrompts = Math.max(3, 8 - historyItems.length);
        const existingQueries = new Set(historyItems.map(h => h.query.toLowerCase()));
        const promptItems = DEFAULT_AI_PROMPTS
          .filter(p => !existingQueries.has(p.toLowerCase()))
          .slice(0, neededPrompts)
          .map(p => ({
            query: p,
            sub: 'AI Prompt Suggestion',
            isAi: true,
            type: 'ai-prompt'
          }));

        return [...historyItems, ...promptItems].slice(0, 8);
      }

      // If query is present in AI Mode:
      const now = Date.now();
      const matchingAiHistory = [...(searchHistory || [])]
        .filter(h => h.isAi && h.query.toLowerCase().includes(query) && h.query.toLowerCase() !== query)
        .sort((a, b) => {
          const scoreB = _computeFrecency(b, now);
          const scoreA = _computeFrecency(a, now);
          if (scoreB !== scoreA) return scoreB - scoreA;
          return (b.timestamp || 0) - (a.timestamp || 0);
        });

      const topAiMatch = matchingAiHistory.find(h => h.query.toLowerCase().startsWith(query));
      const topGoogleMatch = suggestions.find(s => s.toLowerCase().startsWith(query));

      const isTopFromAi = !!topAiMatch;
      const topCompletion = topAiMatch ? topAiMatch.query : (topGoogleMatch || (rawQuery || '').trim());

      const topItem = {
        query: topCompletion,
        sub: isTopFromAi ? 'AI Mode History' : 'Search with AI Mode',
        isAi: true,
        type: isTopFromAi ? 'ai-history' : 'ai-prompt',
        isTopQuery: true
      };

      const matchedEntity = _findMatchingEntity(query);
      const entityItem = matchedEntity ? {
        query: matchedEntity.name,
        title: matchedEntity.name,
        sub: matchedEntity.category,
        url: matchedEntity.url,
        domain: matchedEntity.domain,
        iconSvg: matchedEntity.iconSvg,
        isAi: false,
        type: 'entity'
      } : null;

      const remainingAiHistory = matchingAiHistory
        .filter(h => h.query.toLowerCase() !== topCompletion.toLowerCase() &&
                     (!entityItem || h.query.toLowerCase() !== entityItem.query.toLowerCase()))
        .slice(0, 3)
        .map(h => ({
          query: h.query,
          sub: 'AI Mode History',
          isAi: true,
          type: 'ai-history'
        }));

      const otherItems = suggestions
        .filter(s => s.toLowerCase() !== topCompletion.toLowerCase() &&
                     (!entityItem || s.toLowerCase() !== entityItem.query.toLowerCase()) &&
                     !remainingAiHistory.some(h => h.query.toLowerCase() === s.toLowerCase()))
        .map(s => ({
          query: s,
          sub: 'AI Mode',
          isAi: true,
          type: 'ai-prompt'
        }));

      const resultItems = [topItem];
      if (entityItem) {
        resultItems.push(entityItem);
      }
      resultItems.push(...remainingAiHistory, ...otherItems);
      return resultItems.slice(0, 8);
    }

    if (!query) {
      // Standard search mode: Top 5 most used / recent history + 3 location trending searches
      const now = Date.now();
      const rankedHistory = [...(searchHistory || [])]
        .filter(h => !h.isAi)
        .sort((a, b) => {
          const scoreB = _computeFrecency(b, now);
          const scoreA = _computeFrecency(a, now);
          if (scoreB !== scoreA) return scoreB - scoreA;
          return (b.timestamp || 0) - (a.timestamp || 0);
        });

      const maxHistoryCount = 5;
      const historyToShow = rankedHistory.slice(0, maxHistoryCount);
      const historyItems = historyToShow.map(h => ({
        query: h.query,
        sub: h.sub || (currentEngine === 'google' ? 'Google Search' : ''),
        isAi: false,
        type: 'history'
      }));

      // At least 3 trending items; dynamically fills remaining spots up to 8 total
      const neededTrending = Math.max(3, 8 - historyItems.length);
      const geo = _getActiveTrendingRegion();
      const trendingList = (cachedTrending && cachedTrending.items) || DEFAULT_TRENDING_BY_GEO[geo] || DEFAULT_TRENDING;
      const historyQueries = new Set(historyItems.map(h => h.query.toLowerCase()));
      const trendingItems = trendingList
        .filter(t => !historyQueries.has(t.toLowerCase()))
        .slice(0, neededTrending)
        .map(t => ({
          query: t,
          sub: 'Trending',
          isAi: false,
          type: 'trending'
        }));

      return [...historyItems, ...trendingItems].slice(0, 8);
    }

    const now = Date.now();
    const sortedHistoryMatches = [...(searchHistory || [])]
      .filter(h => h.query.toLowerCase().includes(query) && h.query.toLowerCase() !== query)
      .sort((a, b) => {
        const scoreB = _computeFrecency(b, now);
        const scoreA = _computeFrecency(a, now);
        if (scoreB !== scoreA) return scoreB - scoreA;
        return (b.timestamp || 0) - (a.timestamp || 0);
      });

    // Chrome Omnibox Rule:
    // Row 1 / topCompletion only autocompletes inline if the suggestion completes
    // the CURRENT word/token being typed (no leading space, no internal space in the remaining tail).
    // If the suggestion introduces new words (e.g. user typed "Mathiya", suggestion is "Mathiya vanakkam images"),
    // Chrome leaves the input as "Mathiya", puts "Mathiya - Google Search" as Row 1,
    // and puts "mathiya vanakkam images" cleanly in the dropdown below as Row 2!
    let topCompletion = (rawQuery || '').trim();
    let hasInlineCandidate = false;

    // 1. Check if Google's top suggestion is a valid single-word completion
    if (suggestions.length > 0) {
      const topSugg = suggestions[0];
      if (topSugg.toLowerCase().startsWith(query)) {
        const tail = topSugg.slice(query.length);
        if (tail.length > 0 && !tail.startsWith(' ') && !tail.includes(' ')) {
          topCompletion = topSugg;
          hasInlineCandidate = true;
        }
      }
    }

    // 2. If no qualifying Google suggestion, check user history for single-word completion
    if (!hasInlineCandidate && sortedHistoryMatches.length > 0) {
      const topHist = sortedHistoryMatches[0].query;
      if (topHist.toLowerCase().startsWith(query)) {
        const tail = topHist.slice(query.length);
        if (tail.length > 0 && !tail.startsWith(' ') && !tail.includes(' ')) {
          topCompletion = topHist;
          hasInlineCandidate = true;
        }
      }
    }

    const topItem = {
      query: topCompletion,
      sub: currentEngine === 'google' ? 'Google Search' : currentEngine.toUpperCase() + ' Search',
      isAi: false,
      type: 'search',
      isTopQuery: true
    };

    const matchedEntity = _findMatchingEntity(query);
    const entityItem = matchedEntity ? {
      query: matchedEntity.name,
      title: matchedEntity.name,
      sub: matchedEntity.category,
      url: matchedEntity.url,
      domain: matchedEntity.domain,
      iconSvg: matchedEntity.iconSvg,
      isAi: false,
      type: 'entity'
    } : null;

    const remainingHistory = sortedHistoryMatches
      .filter(h => h.query.toLowerCase() !== topCompletion.toLowerCase() &&
                   (!entityItem || h.query.toLowerCase() !== entityItem.query.toLowerCase()))
      .slice(0, 2)
      .map(h => ({
        query: h.query,
        sub: h.isAi ? 'AI Mode' : (h.sub || (currentEngine === 'google' ? 'Google Search' : '')),
        isAi: h.isAi,
        type: 'history'
      }));

    const otherGoogleItems = suggestions
      .filter(s => s.toLowerCase() !== topCompletion.toLowerCase() &&
                   (!entityItem || (s.toLowerCase() !== entityItem.query.toLowerCase() && s.toLowerCase() !== (entityItem.domain || '').toLowerCase())) &&
                   !remainingHistory.some(h => h.query.toLowerCase() === s.toLowerCase()))
      .map(s => ({
        query: s,
        sub: '',
        isAi: false,
        type: 'suggest'
      }));

    const resultItems = [topItem];
    if (entityItem) {
      resultItems.push(entityItem);
    }
    resultItems.push(...remainingHistory, ...otherGoogleItems);
    return resultItems.slice(0, 8);
  }

  function _renderItemsToDOM(items, query, requestId) {
    if (!menuOpen || requestId !== activeSuggestionRequestId) return;
    const listEl = document.getElementById('search-suggestions-list');
    const menu = document.getElementById('search-dropdown-menu');
    const box = document.getElementById('search-box');
    const wrap = document.getElementById('search-box-wrap');
    if (!listEl || !menu) return;

    if (!items || items.length === 0) {
      menu.style.display = 'none';
      if (box) box.classList.remove('has-dropdown-open');
      if (wrap) wrap.classList.remove('has-dropdown-open');
      return;
    }

    menu.style.display = 'block';
    if (box) box.classList.add('has-dropdown-open');
    if (wrap) wrap.classList.add('has-dropdown-open');
    document.body.classList.add('search-dropdown-active');

    currentSuggestions = items;
    const fragment = document.createDocumentFragment();

    items.forEach((item, index) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'search-suggestion-item';
      if (item.type === 'entity') {
        btn.classList.add('is-entity-card');
      }
      if (item.isTopQuery) {
        btn.classList.add('is-top-query');
      }
      if (index === selectedIndex) {
        btn.classList.add('selected');
      }
      btn.setAttribute('role', 'option');
      btn.dataset.index = index;
      btn.title = item.type === 'entity' ? `${item.title} (${item.url})` : item.query;

      const iconSpan = document.createElement('span');
      iconSpan.className = 'suggestion-icon';
      if (item.type === 'entity') {
        iconSpan.classList.add('is-entity-icon');
        iconSpan.innerHTML = item.iconSvg || ICON_SEARCH;
      } else if (item.type === 'ai-prompt' || item.type === 'ai-history' || (isAiMode && item.isAi)) {
        iconSpan.innerHTML = ICON_AI_SPARKLE;
        iconSpan.classList.add('is-ai-icon');
      } else if (item.type === 'history') {
        iconSpan.innerHTML = ICON_HISTORY;
      } else if (item.type === 'trending') {
        iconSpan.innerHTML = ICON_TRENDING;
        iconSpan.classList.add('is-trending-icon');
      } else {
        iconSpan.innerHTML = ICON_SEARCH;
      }

      const contentSpan = document.createElement('span');
      contentSpan.className = 'suggestion-content';

      const mainText = document.createElement('span');
      mainText.className = 'suggestion-main';

      if (item.type === 'entity') {
        mainText.classList.add('suggestion-entity-name');
        mainText.textContent = item.title;
        contentSpan.appendChild(mainText);

        if (item.sub) {
          const subText = document.createElement('span');
          subText.className = 'suggestion-sub suggestion-entity-sub';
          subText.textContent = ' - ' + item.sub;
          contentSpan.appendChild(subText);
        }
      } else {
        // Bold the completion part (non-matching rest) like Chrome omnibox
        const typedQuery = query; // lowercase version of what user typed
        const suggestionLower = item.query.toLowerCase();
        if (typedQuery && suggestionLower.startsWith(typedQuery)) {
          // Typed prefix = normal weight, rest = bold
          const matchedPart = item.query.substring(0, typedQuery.length);
          const restPart = item.query.substring(typedQuery.length);
          const matchSpan = document.createElement('span');
          matchSpan.className = 'suggestion-match';
          matchSpan.textContent = matchedPart;
          mainText.appendChild(matchSpan);
          if (restPart) {
            const boldSpan = document.createElement('span');
            boldSpan.className = 'suggestion-bold';
            boldSpan.textContent = restPart;
            mainText.appendChild(boldSpan);
          }
        } else {
          mainText.textContent = item.query;
        }
        contentSpan.appendChild(mainText);

        // Idea 1: For long queries (> 32 chars), hide redundant "- Google Search" or engine sub-labels
        // so long sentences display cleanly without awkward clipping
        const isLongQuery = (item.query || '').trim().length > 32;
        const isSearchEngineSub = item.sub && /search/i.test(item.sub);

        if (item.sub && (!isLongQuery || !isSearchEngineSub)) {
          const subText = document.createElement('span');
          subText.className = 'suggestion-sub';
          subText.textContent = ' - ' + item.sub;
          contentSpan.appendChild(subText);
        } else if (item.isAi && !isLongQuery) {
          const aiSub = document.createElement('span');
          aiSub.className = 'suggestion-sub';
          aiSub.textContent = ' - AI Mode';
          contentSpan.appendChild(aiSub);
        }
      }

      btn.appendChild(iconSpan);
      btn.appendChild(contentSpan);

      // Arrow button to move query to search box (Chrome Omnibox style: ↖)
      const arrowBtn = document.createElement('button');
      arrowBtn.type = 'button';
      arrowBtn.className = 'suggestion-arrow-btn';
      arrowBtn.title = item.type === 'entity' ? 'Insert URL into search box' : 'Insert into search box';
      arrowBtn.setAttribute('aria-label', `Insert ${item.type === 'entity' ? (item.domain || item.url) : item.query} into search box`);
      arrowBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="17" y1="17" x2="7" y2="7"/><polyline points="7 17 7 7 17 7"/></svg>`;
      arrowBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const inputEl = document.getElementById('search-input');
        if (inputEl) {
          const fillVal = item.type === 'entity' ? (item.domain || item.url) : item.query;
          inputEl.value = fillVal;
          originalUserTyped = fillVal;
          inputEl.focus();
          inputEl.setSelectionRange(fillVal.length, fillVal.length);
          _renderSuggestions(fillVal);
        }
      });
      btn.appendChild(arrowBtn);

      // Delete button for history items
      if (item.type === 'history' || item.type === 'ai-history') {
        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'suggestion-delete-btn';
        delBtn.innerHTML = '×';
        delBtn.title = 'Remove from history';
        delBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          _removeHistory(item.query);
        });
        btn.appendChild(delBtn);
      }

      btn.addEventListener('click', (e) => {
        if (e.target.closest('.suggestion-delete-btn') || e.target.closest('.suggestion-arrow-btn')) return;
        if (item.type === 'entity' && item.url) {
          window.location.href = item.url;
          return;
        }
        const inputEl = document.getElementById('search-input');
        if (inputEl) inputEl.value = item.query;
        _executeSearch(item.query, item.isAi);
      });

      fragment.appendChild(btn);
    });

    listEl.replaceChildren(fragment);

    // Only show Clear history button in footer if there is active history and input is empty
    const clearHistoryBtn = document.getElementById('btn-clear-history');
    if (clearHistoryBtn) {
      clearHistoryBtn.style.display = (!query && searchHistory.some(h => !h.isAi)) ? 'inline-block' : 'none';
    }
    const aiClearHistoryBtn = document.getElementById('btn-ai-clear-history');
    if (aiClearHistoryBtn) {
      aiClearHistoryBtn.style.display = (!query && searchHistory.some(h => h.isAi)) ? 'inline-block' : 'none';
    }

    _adjustDropdownMaxHeight();
  }

  function _applyInlineAutocomplete(typedPrefix, fullSuggestion) {
    const input = document.getElementById('search-input');
    if (!input || document.activeElement !== input) return;
    if (!typedPrefix || !fullSuggestion) return;

    // Chrome behavior: only inline autocomplete when at least 3 characters are typed
    if (typedPrefix.trim().length < 3) return;

    // Guard against race conditions: input must start with what the user typed
    if (!input.value.toLowerCase().startsWith(typedPrefix.toLowerCase())) return;

    const typedLower = typedPrefix.toLowerCase();
    const suggLower = fullSuggestion.toLowerCase();

    // Must be a forward completion of the user's typed prefix with extra characters
    if (suggLower.startsWith(typedLower) && suggLower.length > typedLower.length) {
      const tail = fullSuggestion.substring(typedPrefix.length);
      // Multi-word protection: tail must NOT start with a space or contain any spaces
      if (tail.startsWith(' ') || tail.includes(' ')) return;

      const newVal = typedPrefix + tail;
      input.value = newVal;
      input.setSelectionRange(typedPrefix.length, newVal.length);
    }
  }

  function _renderSuggestions(rawQuery, allowInline = false) {
    if (!menuOpen) return;
    const listEl = document.getElementById('search-suggestions-list');
    if (!listEl) return;

    const requestId = ++activeSuggestionRequestId;
    const query = (rawQuery || '').trim().toLowerCase();

    // 1. If empty query: render history + trending immediately
    if (!query) {
      const items = _buildItems('', []);
      _renderItemsToDOM(items, '', requestId);

      if (!isAiMode && (!cachedTrending || (Date.now() - lastTrendingFetchTime > 30 * 60 * 1000))) {
        _fetchTrendingSearches().then(() => {
          if (menuOpen && requestId === activeSuggestionRequestId && !originalUserTyped) {
            const updatedItems = _buildItems('', []);
            _renderItemsToDOM(updatedItems, '', requestId);
          }
        });
      }
      return;
    }

    // 2. Query is already cached: render immediately with 0ms delay
    if (suggestionsMemoryCache.has(query)) {
      const cachedSugg = suggestionsMemoryCache.get(query) || [];
      const items = _buildItems(rawQuery, cachedSugg);
      _renderItemsToDOM(items, query, requestId);
      if (allowInline && items.length > 0 && items[0].query) {
        _applyInlineAutocomplete(originalUserTyped, items[0].query);
      }
      return;
    }

    // 3. Query is NOT in cache yet: Fetch fresh suggestions from Google.
    // Dropdown Stutter Elimination:
    // If the list already has items on screen, do NOT wipe the DOM down to a 1-item list!
    // Keeping existing items stable while the network response is in flight completely eliminates
    // the jittery "shutter" where the menu collapsed down to 1 item and expanded back on each keystroke.
    if (!listEl.children || listEl.children.length === 0) {
      const initialItems = _buildItems(rawQuery, []);
      _renderItemsToDOM(initialItems, query, requestId);
      if (allowInline && initialItems.length > 0 && initialItems[0].query) {
        _applyInlineAutocomplete(originalUserTyped, initialItems[0].query);
      }
    }

    _fetchGoogleSuggestions(query).then(freshSugg => {
      if (menuOpen && requestId === activeSuggestionRequestId) {
        const updatedItems = _buildItems(rawQuery, freshSugg);
        _renderItemsToDOM(updatedItems, query, requestId);
        if (allowInline && updatedItems.length > 0 && updatedItems[0].query) {
          _applyInlineAutocomplete(originalUserTyped, updatedItems[0].query);
        }
      }
    });
  }

  function _executeSearch(query, itemIsAi) {
    if (!query) return;
    const cleanQuery = query.trim();
    if (!cleanQuery) return;

    // Block dangerous pseudo-protocols
    if (/^(javascript|data|vbscript):/i.test(cleanQuery)) return;

    // Direct URL navigation if typed a valid URL or web domain
    if (!cleanQuery.includes(' ') && /^(https?:\/\/|[a-z0-9-]+\.[a-z]{2,}(\/.*)?$)/i.test(cleanQuery)) {
      const destUrl = /^https?:\/\//i.test(cleanQuery) ? cleanQuery : 'https://' + cleanQuery;
      window.location.href = destUrl;
      return;
    }

    const useAi = isAiMode || !!itemIsAi;
    _addHistory(cleanQuery, useAi);

    const url = _buildSearchUrl(cleanQuery, useAi);
    window.location.href = url;
  }

  function _buildSearchUrl(query, aiActive) {
    const encoded = encodeURIComponent(query);

    // AI Mode search
    if (aiActive) {
      const aiProvider = localStorage.getItem('hometab_ai_provider') || 'google_ai';
      switch (aiProvider) {
        case 'gemini':
          return `https://gemini.google.com/app?q=${encoded}`;
        case 'chatgpt':
          return `https://chatgpt.com/?q=${encoded}`;
        case 'perplexity':
          return `https://www.perplexity.ai/search?q=${encoded}`;
        case 'google_ai':
        default:
          return `https://www.google.com/search?q=${encoded}`;
      }
    }

    // Custom engine
    if (currentEngine === 'custom' && customUrl) {
      let finalUrl = customUrl.replace('{q}', encoded);
      if (!/^https?:\/\//i.test(finalUrl)) {
        finalUrl = 'https://' + finalUrl;
      }
      try {
        const parsed = new URL(finalUrl);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
          return finalUrl;
        }
      } catch (_) {}
      return `https://www.google.com/search?q=${encoded}`;
    }

    const engine = ENGINES.find(e => e.id === currentEngine);
    if (engine) {
      return engine.url.replace('{q}', encoded);
    }
    return `https://www.google.com/search?q=${encoded}`;
  }

  // Voice Search setup
  let recognition = null;
  let isListening = false;

  function _setupVoiceSearch() {
    const voiceBtn = document.getElementById('btn-voice-search');
    const input = document.getElementById('search-input');
    if (!voiceBtn) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      voiceBtn.title = 'Voice search is not supported in this browser';
      voiceBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof App !== 'undefined' && App.showToast) {
          App.showToast('Voice search requires Google Chrome or Chromium');
        }
      });
      return;
    }

    try {
      recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = navigator.language || 'en-US';

      recognition.onstart = () => {
        isListening = true;
        voiceBtn.classList.add('listening');
        if (input) input.placeholder = 'Listening...';
      };

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        if (input && transcript) {
          input.value = transcript;
          _renderSuggestions(transcript);
        }
      };

      recognition.onend = () => {
        isListening = false;
        voiceBtn.classList.remove('listening');
        _updateAiModeUI();
        if (input && input.value.trim()) {
          _executeSearch(input.value.trim(), isAiMode);
        }
      };

      recognition.onerror = (event) => {
        isListening = false;
        voiceBtn.classList.remove('listening');
        _updateAiModeUI();
        if (event.error !== 'no-speech' && typeof App !== 'undefined' && App.showToast) {
          App.showToast('Voice search: ' + event.error);
        }
      };

      voiceBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isListening) {
          recognition.stop();
        } else {
          try {
            recognition.start();
          } catch (_) {
            recognition.stop();
          }
        }
      });
    } catch (_) {}
  }

  // Google Lens modal and Image Search setup
  function _setupImageSearch() {
    const lensBtn = document.getElementById('btn-image-search');
    const lensModal = document.getElementById('search-lens-modal');
    const lensCloseBtn = document.getElementById('btn-lens-close');
    const lensBrowseBtn = document.getElementById('btn-lens-browse');
    const lensFileInput = document.getElementById('lens-file-input');
    const lensDropzone = document.getElementById('lens-dropzone');
    const lensUrlInput = document.getElementById('lens-url-input');
    const lensUrlBtn = document.getElementById('btn-lens-search-url');

    function openLens() {
      _closeMenu();
      _closeEngineDropdown();
      if (lensModal) {
        lensModal.style.display = 'block';
        const searchInput = document.getElementById('search-input');
        if (searchInput && lensUrlInput) {
          const val = (searchInput.value || '').trim();
          if (/^https?:\/\//i.test(val)) {
            lensUrlInput.value = val;
          }
        }
        if (lensUrlInput) setTimeout(() => lensUrlInput.focus(), 60);
      }
    }

    function closeLens() {
      if (lensModal) lensModal.style.display = 'none';
    }

    function triggerLensWithUrl(rawUrl) {
      const url = (rawUrl || '').trim();
      if (!url) return;
      closeLens();
      if (typeof App !== 'undefined' && App.showToast) {
        App.showToast('Searching with Google Lens...');
      }
      window.open(`https://www.google.com/searchbyimage?image_url=${encodeURIComponent(url)}`, '_blank');
    }

    function triggerLensUpload(fileName) {
      closeLens();
      if (typeof App !== 'undefined' && App.showToast) {
        App.showToast(fileName ? `Opening Google Lens for ${fileName}...` : 'Opening Google Lens...');
      }
      window.open('https://images.google.com/', '_blank');
    }

    if (lensBtn) {
      lensBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (lensModal && lensModal.style.display !== 'none') {
          closeLens();
        } else {
          openLens();
        }
      });
    }

    if (lensCloseBtn) {
      lensCloseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeLens();
      });
    }

    if (lensBrowseBtn && lensFileInput) {
      lensBrowseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        lensFileInput.click();
      });
    }

    if (lensFileInput) {
      lensFileInput.addEventListener('change', () => {
        if (lensFileInput.files && lensFileInput.files[0]) {
          triggerLensUpload(lensFileInput.files[0].name);
        }
      });
    }

    if (lensDropzone) {
      lensDropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        lensDropzone.classList.add('drag-over');
      });
      lensDropzone.addEventListener('dragleave', () => {
        lensDropzone.classList.remove('drag-over');
      });
      lensDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        lensDropzone.classList.remove('drag-over');
        const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        triggerLensUpload(file ? file.name : '');
      });
      lensDropzone.addEventListener('click', (e) => {
        if (e.target !== lensBrowseBtn && lensFileInput) {
          lensFileInput.click();
        }
      });
    }

    if (lensUrlBtn && lensUrlInput) {
      const handleUrlSearch = () => {
        triggerLensWithUrl(lensUrlInput.value);
      };
      lensUrlBtn.addEventListener('click', handleUrlSearch);
      lensUrlInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          handleUrlSearch();
        }
      });
    }

    document.addEventListener('click', (e) => {
      if (lensModal && lensModal.style.display !== 'none') {
        const wrap = document.getElementById('search-box-wrap');
        if (wrap && !wrap.contains(e.target)) {
          closeLens();
        }
      }
    });
  }

  // Left Plus (+) Tools menu setup
  function _setupAddMenu() {
    const addBtn = document.getElementById('btn-search-add');
    const addMenu = document.getElementById('search-add-menu');
    const optAddImages = document.getElementById('menu-opt-add-images');
    const optAddFiles = document.getElementById('menu-opt-add-files');
    const optCreateImages = document.getElementById('menu-opt-create-images');
    const imageInput = document.getElementById('search-image-input');
    const fileInput = document.getElementById('search-file-input');
    const searchInput = document.getElementById('search-input');

    function toggleAddMenu() {
      if (!addMenu) return;
      const isOpen = addMenu.style.display !== 'none';
      addMenu.style.display = isOpen ? 'none' : 'block';
    }

    function closeAddMenu() {
      if (addMenu) addMenu.style.display = 'none';
    }

    if (addBtn) {
      addBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleAddMenu();
      });
    }

    if (optAddImages && imageInput) {
      optAddImages.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAddMenu();
        imageInput.click();
      });
    }

    if (imageInput) {
      imageInput.addEventListener('change', () => {
        if (imageInput.files && imageInput.files[0]) {
          const fileName = imageInput.files[0].name;
          if (typeof App !== 'undefined' && App.showToast) {
            App.showToast(`Opening Google Lens for ${fileName}...`);
          }
          window.open('https://images.google.com/', '_blank');
        }
      });
    }

    if (optAddFiles && fileInput) {
      optAddFiles.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAddMenu();
        fileInput.click();
      });
    }

    if (fileInput) {
      fileInput.addEventListener('change', () => {
        if (fileInput.files && fileInput.files[0]) {
          if (typeof App !== 'undefined' && App.showToast) {
            App.showToast(`File attached: ${fileInput.files[0].name}`);
          }
        }
      });
    }

    if (optCreateImages) {
      optCreateImages.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAddMenu();
        const prompt = searchInput ? searchInput.value.trim() : '';
        const createUrl = prompt
          ? `https://www.bing.com/images/create?q=${encodeURIComponent(prompt)}`
          : `https://www.bing.com/images/create`;
        window.open(createUrl, '_blank');
      });
    }

    // Voice search from menu
    const optVoiceSearch = document.getElementById('menu-opt-voice-search');
    if (optVoiceSearch) {
      optVoiceSearch.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAddMenu();
        // Trigger voice search button
        const voiceBtn = document.getElementById('btn-voice-search');
        if (voiceBtn) voiceBtn.click();
      });
    }

    // Lens search from menu
    const optLensSearch = document.getElementById('menu-opt-lens-search');
    if (optLensSearch) {
      optLensSearch.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAddMenu();
        const searchInput = document.getElementById('search-input');
        const query = searchInput ? searchInput.value.trim() : '';
        if (query && /^https?:\/\//i.test(query)) {
          window.open(`https://www.google.com/searchbyimage?image_url=${encodeURIComponent(query)}`, '_blank');
        } else {
          window.open('https://images.google.com/', '_blank');
        }
      });
    }

    document.addEventListener('click', (e) => {
      const wrap = document.getElementById('search-add-wrap');
      if (wrap && !wrap.contains(e.target)) {
        closeAddMenu();
      }
    });
  }

  function _setupListeners() {
    const input = document.getElementById('search-input');
    const engineBtn = document.getElementById('search-engine-btn');
    const aiBtn = document.getElementById('btn-ai-mode');
    const addBtn = document.getElementById('btn-dropdown-add');
    const clearHistoryBtn = document.getElementById('btn-clear-history');
    const searchWrap = document.getElementById('search-box-wrap');

    if (!input) return;

    // Search submit arrow button
    const submitBtn = document.getElementById('search-submit-btn');
    if (submitBtn) {
      submitBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        _executeSearch(input.value, isAiMode);
      });
    }

    // Container click delegation for smooth click anywhere on the bar
    const searchBoxEl = document.getElementById('search-box');
    if (searchBoxEl) {
      searchBoxEl.addEventListener('mousedown', (e) => {
        if (!e.target.closest('button') && !e.target.closest('.search-add-menu')) {
          if (e.target !== input) {
            // Prevent container div from stealing focus away from input
            e.preventDefault();
            input.focus();
          }
          if (!menuOpen) _openMenu();
        }
      });

      searchBoxEl.addEventListener('click', (e) => {
        if (!e.target.closest('button') && !e.target.closest('.search-add-menu')) {
          if (input && document.activeElement !== input) {
            input.focus();
          }
        }
      });
    }

    // Focus / Click on input opens Google dropdown
    input.addEventListener('focus', () => {
      _hideShortcuts();
      _openMenu();
    });

    input.addEventListener('click', () => {
      _hideShortcuts();
      if (!menuOpen) _openMenu();
    });

    let isDeleting = false;

    // Input debounce for Google autocomplete with inline completion
    input.addEventListener('input', (e) => {
      _hideShortcuts();
      const isDeleteInput = isDeleting || (e.inputType && e.inputType.startsWith('delete'));
      isDeleting = false;

      originalUserTyped = input.value;
      selectedIndex = -1;

      if (!menuOpen) {
        _openMenu();
      }

      const allowInline = !isDeleteInput && originalUserTyped.trim().length >= 3;

      clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(() => {
        _renderSuggestions(originalUserTyped, allowInline);
      }, 160);
    });

    input.addEventListener('blur', () => {
      setTimeout(() => {
        if (!menuOpen && document.activeElement !== input) {
          _showShortcuts();
        }
      }, 120);
    });

    // Keyboard navigation
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' || e.key === 'Delete') {
        isDeleting = true;
      } else {
        isDeleting = false;
      }

      // Tab accepts inline suggestion or top dropdown suggestion
      if (e.key === 'Tab') {
        if (input.selectionStart !== input.selectionEnd && input.selectionEnd === input.value.length) {
          e.preventDefault();
          input.setSelectionRange(input.value.length, input.value.length);
          originalUserTyped = input.value;
          _renderSuggestions(input.value, false);
          return;
        }
        if (currentSuggestions.length > 0) {
          e.preventDefault();
          const targetIndex = selectedIndex >= 0 ? selectedIndex : 0;
          const targetItem = currentSuggestions[targetIndex];
          const targetQuery = targetItem.type === 'entity' ? (targetItem.domain || targetItem.url) : targetItem.query;
          input.value = targetQuery;
          originalUserTyped = targetQuery;
          input.setSelectionRange(targetQuery.length, targetQuery.length);
          _renderSuggestions(targetQuery, false);
          return;
        }
      }

      // ArrowRight or End at the end of input accepts inline autocompletion
      if (e.key === 'ArrowRight' || e.key === 'End') {
        if (input.selectionStart !== input.selectionEnd && input.selectionEnd === input.value.length) {
          e.preventDefault();
          input.setSelectionRange(input.value.length, input.value.length);
          originalUserTyped = input.value;
          return;
        }
        if (input.selectionStart === input.value.length && 
            currentSuggestions.length > 0 &&
            currentSuggestions[0].query.toLowerCase().startsWith(input.value.toLowerCase().trim())) {
          e.preventDefault();
          const targetQuery = currentSuggestions[0].query;
          input.value = targetQuery;
          originalUserTyped = targetQuery;
          input.setSelectionRange(targetQuery.length, targetQuery.length);
          _renderSuggestions(targetQuery, false);
          return;
        }
      }

      const items = document.querySelectorAll('.search-suggestion-item');

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!menuOpen) {
          _openMenu();
          return;
        }
        if (currentSuggestions.length > 0) {
          if (selectedIndex < currentSuggestions.length - 1) {
            selectedIndex++;
          } else {
            selectedIndex = -1;
          }
          _updateSelection(items, input);
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (!menuOpen) {
          _openMenu();
          return;
        }
        if (currentSuggestions.length > 0) {
          if (selectedIndex > -1) {
            selectedIndex--;
          } else {
            selectedIndex = currentSuggestions.length - 1;
          }
          _updateSelection(items, input);
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedIndex >= 0 && currentSuggestions[selectedIndex]?.type === 'entity') {
          window.location.href = currentSuggestions[selectedIndex].url;
          return;
        }
        _executeSearch(input.value, isAiMode);
      } else if (e.key === 'Escape') {
        input.blur();
        _closeMenu();
        _closeEngineDropdown();
        _showShortcuts();
      }
    });

    // "/" key to focus search
    document.addEventListener('keydown', (e) => {
      if (e.key === '/' && document.activeElement !== input && !_isInputFocused()) {
        e.preventDefault();
        input.focus();
        _openMenu();
      }
    });

    // Close / Exit AI Mode button
    const aiCloseBtn = document.getElementById('btn-ai-mode-close');
    if (aiCloseBtn) {
      const handleCloseAi = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (isAiMode) {
          _toggleAiMode();
        }
      };
      aiCloseBtn.addEventListener('click', handleCloseAi);
      aiCloseBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleCloseAi(e);
        }
      });
    }

    // AI Mode button click: if input has text, run AI search directly; otherwise toggle AI mode
    if (aiBtn) {
      aiBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const query = (input ? input.value : '').trim();
        if (query) {
          _executeSearch(query, true);
        } else {
          _toggleAiMode();
        }
      });
    }

    // AI Search History button inside AI dropdown footer
    const aiHistoryBtn = document.getElementById('btn-ai-view-history');
    if (aiHistoryBtn) {
      aiHistoryBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const input = document.getElementById('search-input');
        if (input) {
          input.value = '';
          originalUserTyped = '';
          input.focus();
        }
        const aiHistory = (searchHistory || []).filter(h => h.isAi);
        if (aiHistory.length === 0) {
          if (typeof App !== 'undefined' && App.showToast) {
            App.showToast('No past AI questions yet');
          }
          _renderSuggestions('');
          return;
        }
        const items = aiHistory.map(h => ({
          query: h.query,
          sub: 'AI Mode History',
          isAi: true,
          type: 'ai-history'
        }));
        _renderItemsToDOM(items, '', activeSuggestionRequestId);
      });
    }

    // AI Clear history button inside AI dropdown footer
    const aiClearHistoryBtn = document.getElementById('btn-ai-clear-history');
    if (aiClearHistoryBtn) {
      aiClearHistoryBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        _clearAiHistory();
      });
    }

    // Engine selector button
    if (engineBtn) {
      engineBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (engineDropdownOpen) {
          _closeEngineDropdown();
        } else {
          _openEngineDropdown();
        }
      });
    }

    // Add Shortcut button inside dropdown footer
    if (addBtn) {
      addBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        _closeMenu();
        const mainAddBtn = document.getElementById('btn-add-shortcut');
        if (mainAddBtn) {
          mainAddBtn.click();
        }
      });
    }

    // Clear history button
    if (clearHistoryBtn) {
      clearHistoryBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        _clearHistory();
      });
    }

    // Initialize sub-modules
    _setupVoiceSearch();
    _setupImageSearch();
    _setupAddMenu();

    // Close on click/tap outside
    // We track whether pointerdown started inside the search box so that dragging
    // to select text across the search box and releasing on the background does NOT
    // falsely trigger an outside dismissal, blur the input, and wipe the user's selected text!
    let pointerStartedInsideSearch = false;

    document.addEventListener('pointerdown', (e) => {
      if (searchWrap && searchWrap.contains(e.target)) {
        pointerStartedInsideSearch = true;
      } else {
        pointerStartedInsideSearch = false;
        // Genuinely clicked down outside searchWrap: dismiss search
        if (menuOpen || engineDropdownOpen) {
          _closeMenu();
          _closeEngineDropdown();
        }
        if (input && document.activeElement === input) {
          input.blur();
        }
        _showShortcuts();
      }
    }, true);

    document.addEventListener('pointerup', () => {
      // Allow current click event cycle to finish checking pointerStartedInsideSearch
      setTimeout(() => {
        pointerStartedInsideSearch = false;
      }, 50);
    }, true);

    document.addEventListener('click', (e) => {
      // If the interaction began inside the search box (e.g. mouse text selection drag),
      // do not treat the mouseup/click outside as an outside dismissal!
      if (pointerStartedInsideSearch) {
        return;
      }

      if (searchWrap && !searchWrap.contains(e.target)) {
        if (menuOpen || engineDropdownOpen) {
          _closeMenu();
          _closeEngineDropdown();
        }
        if (input && document.activeElement === input) {
          input.blur();
        }
        _showShortcuts();
      }
    }, true);

    // Auto-adjust dropdown height on window resize with rAF throttling to prevent layout thrashing
    let resizeRaf = null;
    window.addEventListener('resize', () => {
      if (menuOpen && !resizeRaf) {
        resizeRaf = requestAnimationFrame(() => {
          resizeRaf = null;
          if (menuOpen) _adjustDropdownMaxHeight();
        });
      }
    }, { passive: true });
  }

  function _updateSelection(items, input) {
    if (selectedIndex === -1) {
      items.forEach(item => item.classList.remove('selected'));
      if (input && typeof originalUserTyped === 'string') {
        input.value = originalUserTyped;
        input.setSelectionRange(input.value.length, input.value.length);
      }
      return;
    }

    items.forEach((item, idx) => {
      if (idx === selectedIndex) {
        item.classList.add('selected');
        item.scrollIntoView({ block: 'nearest' });
        if (currentSuggestions[selectedIndex]) {
          const cur = currentSuggestions[selectedIndex];
          const fillVal = cur.type === 'entity' ? (cur.domain || cur.url) : cur.query;
          input.value = fillVal;
          input.setSelectionRange(input.value.length, input.value.length);
        }
      } else {
        item.classList.remove('selected');
      }
    });
  }

  function _isInputFocused() {
    const tag = document.activeElement?.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.contentEditable === 'true';
  }

  async function _save() {
    await Storage.setSync({
      searchEngine: currentEngine,
      customSearchUrl: customUrl,
    });
  }

  function setCustomUrl(url) {
    customUrl = url;
    _save();
  }

  return {
    init, setCustomUrl, ENGINES,
    get engine() { return currentEngine; },
    get customUrl() { return customUrl; },
    get isAiMode() { return isAiMode; },
    get isFrostedOmnibox() { return isFrostedOmnibox; },
    get trendingRegion() { return trendingRegion; },
    setFrostedOmnibox,
    setTrendingRegion,
    detectCountry: _detectUserCountry,
    toggleAiMode: _toggleAiMode,
  };
})();
