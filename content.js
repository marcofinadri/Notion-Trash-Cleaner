(() => {
  'use strict';

  const API_BASE = 'https://app.notion.com/api/v3';
  const SEARCH_PAGE_SIZE = 1000;
  const DELETE_CHUNK_SIZE = 100;
  const MAX_RETRIES = 4;
  const RETRY_BASE_DELAY = 500;

  const BUTTON_ID = 'ntc-inline-btn';
  const TOAST_ID = 'ntc-toast';
  const BG_IDLE = 'var(--ca-redBacSecTra, rgba(235,87,87,0.12))';
  const BG_HOVER = 'var(--ca-redBacTerTra, rgba(235,87,87,0.2))';
  const FG = 'var(--c-redTexAccPri, rgba(235,87,87,1))';

  const tr = (key, ...subs) => chrome.i18n.getMessage(key, subs) || key;
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const TRASH_SVG = `<svg aria-hidden="true" role="graphics-symbol" viewBox="0 0 16 16"
    style="width:14px;height:14px;fill:currentColor;flex-shrink:0;">
    <path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5zM11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H2.506a.58.58 0 0 0-.01 0H1.5a.5.5 0 0 0 0 1h.538l.853 10.66A2 2 0 0 0 4.885 16h6.23a2 2 0 0 0 1.994-1.84l.853-10.66H14.5a.5.5 0 0 0 0-1h-.995a.59.59 0 0 0-.01 0H11zm1.958 1-.846 10.58a1 1 0 0 1-.997.92h-6.23a1 1 0 0 1-.997-.92L3.042 3.5h9.916zm-7.487 1a.5.5 0 0 1 .528.47l.5 8.5a.5.5 0 0 1-.998.06L5.5 5.03a.5.5 0 0 1 .47-.53zm5.058 0a.5.5 0 0 1 .47.53l-.5 8.5a.5.5 0 1 1-.998-.06l.5-8.5a.5.5 0 0 1 .528-.47M8 4.5a.5.5 0 0 1 .5.5v8.5a.5.5 0 0 1-1 0V5a.5.5 0 0 1 .5-.5z"/>
  </svg>`;

  const SPINNER_SVG = `<svg viewBox="0 0 16 16"
    style="width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2;flex-shrink:0;animation:ntc-spin 0.7s linear infinite;">
    <path d="M14 8A6 6 0 1 1 8 2"/>
    <style>@keyframes ntc-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}</style>
  </svg>`;

  const BUTTON_BASE_STYLE = `
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: ${FG};
    background: ${BG_IDLE};
    transition: background 0.12s ease, opacity 0.12s ease;
    user-select: none;
    flex-shrink: 0;
  `;

  const ICON_BUTTON_STYLE = `${BUTTON_BASE_STYLE}
    width: 28px;
    height: 28px;
    border-radius: 6px;
  `;

  const LABEL_BUTTON_STYLE = `${BUTTON_BASE_STYLE}
    font-size: 14px;
    gap: 5px;
    white-space: nowrap;
    border-radius: 32px;
    height: 24px;
    padding: 0 8px;
  `;

  let isRunning = false;
  let abortController = null;

  const getButton = () => document.getElementById(BUTTON_ID);

  function buildButton(mode) {
    const btn = document.createElement('div');
    btn.id = BUTTON_ID;
    btn.role = 'button';
    btn.tabIndex = 0;
    btn.title = tr('emptyTrash');
    btn.dataset.mode = mode;
    btn.style.cssText = mode === 'icon' ? ICON_BUTTON_STYLE : LABEL_BUTTON_STYLE;
    btn.innerHTML = TRASH_SVG;

    if (mode === 'label') {
      const label = document.createElement('span');
      label.innerText = tr('emptyTrash');
      btn.appendChild(label);
    }

    btn.addEventListener('mouseenter', () => { btn.style.background = BG_HOVER; });
    btn.addEventListener('mouseleave', () => { btn.style.background = BG_IDLE; });
    btn.addEventListener('click', handleEmptyTrash);
    btn.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') handleEmptyTrash();
    });

    return btn;
  }

  function markBusy(btn) {
    btn.style.opacity = '0.5';
    btn.style.pointerEvents = 'none';
    btn.title = tr('deletionInProgress');
  }

  function setLoading(btn, loading) {
    btn.style.opacity = loading ? '0.85' : '1';
    btn.style.pointerEvents = loading ? 'none' : '';
    btn.innerHTML = loading ? SPINNER_SVG : TRASH_SVG;
    btn.title = loading ? tr('deletionInProgress') : tr('emptyTrash');

    if (btn.dataset.mode === 'label') {
      const span = document.createElement('span');
      span.innerText = loading ? tr('deletionInProgress') : tr('emptyTrash');
      btn.appendChild(span);
    }
  }

  function toast(message, isError = false, withRefresh = false) {
    const existing = document.getElementById(TOAST_ID);
    if (existing) existing.remove();

    const el = document.createElement('div');
    el.id = TOAST_ID;
    el.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%) translateY(8px);
      z-index: 99999;
      background: ${isError ? 'rgba(235,87,87,0.95)' : 'rgba(55,55,55,0.95)'};
      color: white;
      font-size: 14px;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      font-weight: 500;
      padding: 12px 16px;
      border-radius: 10px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.35);
      opacity: 0;
      display: flex;
      align-items: center;
      gap: 12px;
      transition: opacity 0.2s ease, transform 0.2s ease;
      pointer-events: ${withRefresh ? 'auto' : 'none'};
    `;

    const text = document.createElement('span');
    text.innerText = message;
    el.appendChild(text);

    if (withRefresh) {
      const refreshBtn = document.createElement('button');
      refreshBtn.innerText = tr('refresh');
      refreshBtn.style.cssText = `
        background: rgba(255,255,255,0.2);
        border: none;
        border-radius: 4px;
        color: white;
        font-size: 13px;
        font-weight: 600;
        font-family: inherit;
        padding: 5px 11px;
        cursor: pointer;
        flex-shrink: 0;
        transition: background 0.12s ease;
      `;
      refreshBtn.addEventListener('mouseenter', () => { refreshBtn.style.background = 'rgba(255,255,255,0.35)'; });
      refreshBtn.addEventListener('mouseleave', () => { refreshBtn.style.background = 'rgba(255,255,255,0.2)'; });
      refreshBtn.addEventListener('click', () => location.reload());
      el.appendChild(refreshBtn);
    }

    document.body.appendChild(el);

    requestAnimationFrame(() => {
      el.style.opacity = '1';
      el.style.transform = 'translateX(-50%) translateY(0)';
    });

    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateX(-50%) translateY(8px)';
      setTimeout(() => el.remove(), 300);
    }, withRefresh ? 8000 : 3500);
  }

  async function apiFetch(path, body, extraHeaders = {}) {
    const headers = {
      accept: '*/*',
      'cache-control': 'no-cache',
      'content-type': 'application/json',
      ...extraHeaders,
    };

    let lastError;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const resp = await fetch(`${API_BASE}/${path}`, {
          method: 'POST',
          mode: 'cors',
          credentials: 'include',
          headers,
          body: JSON.stringify(body),
          signal: abortController?.signal,
        });
        if (resp.ok) return resp.json();
        if (resp.status !== 429 && resp.status < 500) {
          throw new Error(`${path} failed: ${resp.status}`);
        }
        lastError = new Error(`${path} transient: ${resp.status}`);
      } catch (error) {
        if (error.name === 'AbortError') throw error;
        lastError = error;
      }
      if (attempt < MAX_RETRIES) await sleep(RETRY_BASE_DELAY * 2 ** attempt);
    }
    throw lastError;
  }

  async function getSpaceAndUser() {
    const json = await apiFetch('loadUserContent', {});
    if (!json.recordMap?.space || !json.recordMap?.notion_user) {
      throw new Error('Unexpected loadUserContent response shape');
    }
    return {
      spaceId: Object.keys(json.recordMap.space)[0],
      userId: Object.keys(json.recordMap.notion_user)[0],
    };
  }

  async function fetchTrashedPage(spaceId, from) {
    const json = await apiFetch('search', {
      type: 'BlocksInSpace',
      spaceId,
      limit: SEARCH_PAGE_SIZE,
      from,
      filters: {
        isDeletedOnly: true,
        excludeTemplates: false,
        navigableBlockContentOnly: false,
        requireEditPermissions: false,
        includePublicPagesWithoutExplicitAccess: false,
        ancestors: [],
        createdBy: [],
        editedBy: [],
        lastEditedTime: {},
        createdTime: {},
        inTeams: [],
      },
      sort: { field: 'relevance' },
      source: 'quick_find_input_change',
      searchExperimentOverrides: {},
    });
    return (json.results ?? []).map((result) => result.id);
  }

  async function deleteBatch(ids, spaceId, userId, skipped) {
    if (ids.length === 0) return 0;
    try {
      await apiFetch(
        'deleteBlocks',
        { blocks: ids.map((id) => ({ id, spaceId })), permanentlyDelete: true },
        { 'x-notion-active-user-header': userId },
      );
      return ids.length;
    } catch (error) {
      if (error.name === 'AbortError') throw error;
      if (ids.length === 1) {
        skipped.add(ids[0]);
        console.warn('[Notion Trash Cleaner] skipping undeletable block', ids[0], error);
        return 0;
      }
      const mid = ids.length >> 1;
      const left = await deleteBatch(ids.slice(0, mid), spaceId, userId, skipped);
      const right = await deleteBatch(ids.slice(mid), spaceId, userId, skipped);
      return left + right;
    }
  }

  async function deletePage(ids, spaceId, userId, skipped) {
    let deleted = 0;
    for (let i = 0; i < ids.length; i += DELETE_CHUNK_SIZE) {
      deleted += await deleteBatch(ids.slice(i, i + DELETE_CHUNK_SIZE), spaceId, userId, skipped);
    }
    return deleted;
  }

  async function emptyTrash(spaceId, userId, firstPage) {
    const skipped = new Set();
    let deleted = 0;
    let nextPage = firstPage;

    while (true) {
      if (nextPage.length === 0) break;

      const ids = nextPage.filter((id) => !skipped.has(id));
      if (ids.length === 0) {
        if (nextPage.length < SEARCH_PAGE_SIZE) break;
        nextPage = await fetchTrashedPage(spaceId, nextPage.length);
        continue;
      }

      deleted += await deletePage(ids, spaceId, userId, skipped);
      nextPage = await fetchTrashedPage(spaceId, 0);
    }

    return deleted;
  }

  async function handleEmptyTrash() {
    if (isRunning) return;
    const btn = getButton();
    if (!btn) return;

    isRunning = true;
    abortController = new AbortController();
    setLoading(btn, true);

    try {
      const { spaceId, userId } = await getSpaceAndUser();
      const firstPage = await fetchTrashedPage(spaceId, 0);

      setLoading(btn, false);

      if (firstPage.length === 0) {
        toast(tr('trashAlreadyEmpty'));
        return;
      }

      if (!confirm(tr('confirmDelete'))) return;

      setLoading(btn, true);
      const deleted = await emptyTrash(spaceId, userId, firstPage);

      const msg = deleted === 1 ? tr('oneItemDeleted') : tr('manyItemsDeleted', String(deleted));
      toast(msg, false, true);
      chrome.runtime.sendMessage({ type: 'ntc-notify', message: msg }).catch(() => {});
    } catch (error) {
      if (error.name !== 'AbortError') {
        toast(tr('errorMsg'), true);
        console.error('[Notion Trash Cleaner]', error);
      }
    } finally {
      isRunning = false;
      abortController = null;
      const current = getButton();
      if (current) setLoading(current, false);
    }
  }

  function findPillRow(trashMenu) {
    for (const div of trashMenu.querySelectorAll('div')) {
      const style = div.getAttribute('style') || '';
      if (style.includes('flex') && /gap:\s*6px/.test(style)) return div;
    }
    return null;
  }

  function injectLabelFallback(pillRow) {
    const labelBtn = buildButton('label');
    if (isRunning) markBusy(labelBtn);
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex; justify-content:flex-end; padding:4px 8px 2px;';
    wrapper.appendChild(labelBtn);
    pillRow.after(wrapper);
  }

  function tryInject() {
    if (getButton()) return;

    const trashMenu = document.querySelector('.notion-sidebar-trash-menu');
    if (!trashMenu) return;

    const pillRow = findPillRow(trashMenu);
    if (!pillRow) {
      const labelBtn = buildButton('label');
      if (isRunning) markBusy(labelBtn);
      trashMenu.prepend(labelBtn);
      return;
    }

    const iconBtn = buildButton('icon');
    if (isRunning) markBusy(iconBtn);

    if (pillRow.firstElementChild) {
      pillRow.firstElementChild.after(iconBtn);
    } else {
      pillRow.appendChild(iconBtn);
    }

    requestAnimationFrame(() => {
      const btnRect = iconBtn.getBoundingClientRect();
      const rowRect = pillRow.getBoundingClientRect();
      if (btnRect.width === 0 || btnRect.right > rowRect.right + 1) {
        iconBtn.remove();
        injectLabelFallback(pillRow);
      }
    });
  }

  function watchForButton() {
    const observer = new MutationObserver(() => {
      tryInject();
      const btn = getButton();
      if (!btn) return;
      observer.disconnect();
      const removalWatcher = new MutationObserver(() => {
        if (getButton()) return;
        removalWatcher.disconnect();
        watchForButton();
      });
      removalWatcher.observe(btn.parentElement ?? document.body, { childList: true });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  window.addEventListener('beforeunload', (event) => {
    if (!isRunning) return;
    abortController?.abort('page-unload');
    event.preventDefault();
    event.returnValue = '';
    return '';
  });

  watchForButton();
  tryInject();
})();
