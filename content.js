(function () {
  'use strict';

  const TRASH_SVG = `<svg aria-hidden="true" role="graphics-symbol" viewBox="0 0 16 16"
    style="width:14px;height:14px;fill:currentColor;flex-shrink:0;">
    <path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5zM11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H2.506a.58.58 0 0 0-.01 0H1.5a.5.5 0 0 0 0 1h.538l.853 10.66A2 2 0 0 0 4.885 16h6.23a2 2 0 0 0 1.994-1.84l.853-10.66H14.5a.5.5 0 0 0 0-1h-.995a.59.59 0 0 0-.01 0H11zm1.958 1-.846 10.58a1 1 0 0 1-.997.92h-6.23a1 1 0 0 1-.997-.92L3.042 3.5h9.916zm-7.487 1a.5.5 0 0 1 .528.47l.5 8.5a.5.5 0 0 1-.998.06L5.5 5.03a.5.5 0 0 1 .47-.53zm5.058 0a.5.5 0 0 1 .47.53l-.5 8.5a.5.5 0 1 1-.998-.06l.5-8.5a.5.5 0 0 1 .528-.47M8 4.5a.5.5 0 0 1 .5.5v8.5a.5.5 0 0 1-1 0V5a.5.5 0 0 1 .5-.5z"/>
  </svg>`;

  const SPINNER_SVG = `<svg viewBox="0 0 16 16"
    style="width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2;flex-shrink:0;animation:ntc-spin 0.7s linear infinite;">
    <path d="M14 8A6 6 0 1 1 8 2"/>
    <style>@keyframes ntc-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}</style>
  </svg>`;

  // --- BUTTON ---

  // mode: 'icon' = icon only (in pill row), 'label' = icon + text (own row below)
  function buildButton(mode) {
    const btn = document.createElement('div');
    btn.id = 'ntc-inline-btn';
    btn.role = 'button';
    btn.tabIndex = 0;
    btn.title = 'Empty trash';
    btn.dataset.mode = mode;

    if (mode === 'icon') {
      btn.style.cssText = `
        width: 28px;
        height: 28px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        cursor: pointer;
        color: var(--c-redTexAccPri, rgba(235,87,87,1));
        background: var(--ca-redBacSecTra, rgba(235,87,87,0.12));
        transition: background 0.12s ease, opacity 0.12s ease;
        user-select: none;
        flex-shrink: 0;
      `;
      btn.innerHTML = TRASH_SVG;
    } else {
      btn.style.cssText = `
        font-size: 14px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 5px;
        white-space: nowrap;
        border-radius: 32px;
        height: 24px;
        padding: 0 8px;
        cursor: pointer;
        color: var(--c-redTexAccPri, rgba(235,87,87,1));
        background: var(--ca-redBacSecTra, rgba(235,87,87,0.12));
        transition: background 0.12s ease, opacity 0.12s ease;
        user-select: none;
        flex-shrink: 0;
      `;
      const label = document.createElement('span');
      label.innerText = 'Empty trash';
      btn.innerHTML = TRASH_SVG;
      btn.appendChild(label);
    }

    btn.addEventListener('mouseenter', () => {
      btn.style.background = 'var(--ca-redBacTerTra, rgba(235,87,87,0.2))';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'var(--ca-redBacSecTra, rgba(235,87,87,0.12))';
    });
    btn.addEventListener('click', handleEmptyTrash);
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') handleEmptyTrash();
    });

    return btn;
  }

  // --- LOADING STATE ---

  function setLoading(btn, loading) {
    const hasLabel = btn.dataset.mode === 'label';
    if (loading) {
      btn.innerHTML = hasLabel ? `${SPINNER_SVG}<span>Working…</span>` : SPINNER_SVG;
      btn.style.opacity = '0.7';
      btn.style.pointerEvents = 'none';
    } else {
      btn.style.opacity = '1';
      btn.style.pointerEvents = '';
      btn.innerHTML = TRASH_SVG;
      btn.title = 'Empty trash';
      if (hasLabel) {
        const span = document.createElement('span');
        span.innerText = 'Empty trash';
        btn.appendChild(span);
      }
    }
  }

  function setProgress(count) {
    const btn = document.getElementById('ntc-inline-btn');
    if (!btn) return;
    btn.title = `${count} deleted…`;
    const span = btn.querySelector('span');
    if (span) span.innerText = `${count} deleted…`;
  }

  // --- TOAST ---

  function toast(msg, isError = false, withRefresh = false) {
    const existing = document.getElementById('ntc-toast');
    if (existing) existing.remove();

    const t = document.createElement('div');
    t.id = 'ntc-toast';
    t.style.cssText = `
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
    text.innerText = msg;
    t.appendChild(text);

    if (withRefresh) {
      const btn = document.createElement('button');
      btn.innerText = 'Refresh';
      btn.style.cssText = `
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
      btn.addEventListener('mouseenter', () => {
        btn.style.background = 'rgba(255,255,255,0.35)';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.background = 'rgba(255,255,255,0.2)';
      });
      btn.addEventListener('click', () => location.reload());
      t.appendChild(btn);
    }

    document.body.appendChild(t);
    requestAnimationFrame(() => {
      t.style.opacity = '1';
      t.style.transform = 'translateX(-50%) translateY(0)';
    });

    const hide = () => {
      t.style.opacity = '0';
      t.style.transform = 'translateX(-50%) translateY(8px)';
      setTimeout(() => t.remove(), 300);
    };

    setTimeout(hide, withRefresh ? 8000 : 3500);
  }

  // --- API ---

  async function getSpaceAndUser() {
    const resp = await fetch('https://app.notion.com/api/v3/loadUserContent', {
      method: 'POST', mode: 'cors', credentials: 'include',
      headers: { accept: '*/*', 'cache-control': 'no-cache', 'content-type': 'application/json' },
      body: '{}',
    });
    const json = await resp.json();
    return {
      spaceId: Object.keys(json.recordMap.space)[0],
      userId: Object.keys(json.recordMap.notion_user)[0],
    };
  }

  async function getBlockIds(spaceId) {
    const resp = await fetch('https://app.notion.com/api/v3/search', {
      method: 'POST', mode: 'cors', credentials: 'include',
      headers: { accept: '*/*', 'cache-control': 'no-cache', 'content-type': 'application/json' },
      body: JSON.stringify({
        type: 'BlocksInSpace', spaceId, limit: 1000,
        filters: {
          isDeletedOnly: true, excludeTemplates: false, navigableBlockContentOnly: false,
          requireEditPermissions: false, includePublicPagesWithoutExplicitAccess: false,
          ancestors: [], createdBy: [], editedBy: [], lastEditedTime: {}, createdTime: {}, inTeams: [],
        },
        sort: { field: 'relevance' }, source: 'quick_find_input_change', searchExperimentOverrides: {},
      }),
    });
    const json = await resp.json();
    return json.results.map(el => el.id);
  }

  async function deleteBlocks(blockIds, spaceId, userId, onProgress) {
    // Send all IDs in a single API call — the endpoint accepts an array
    const resp = await fetch('https://app.notion.com/api/v3/deleteBlocks', {
      method: 'POST', mode: 'cors', credentials: 'include',
      referrerPolicy: 'strict-origin-when-cross-origin',
      headers: {
        accept: '*/*', 'cache-control': 'no-cache', 'content-type': 'application/json',
        'x-notion-active-user-header': userId,
      },
      body: JSON.stringify({
        blocks: blockIds.map(id => ({ id, spaceId })),
        permanentlyDelete: true,
      }),
    });
    const count = resp.ok ? blockIds.length : 0;
    onProgress(count);
    return count;
  }

  // --- MAIN HANDLER ---

  let isRunning = false;

  async function handleEmptyTrash() {
    if (isRunning) return;
    const btn = document.getElementById('ntc-inline-btn');
    if (!btn) return;

    isRunning = true;
    setLoading(btn, true);

    try {
      const { spaceId, userId } = await getSpaceAndUser();
      const firstBatch = await getBlockIds(spaceId);

      setLoading(btn, false);

      if (firstBatch.length === 0) {
        toast('Trash is already empty');
        return;
      }

      const ok = confirm(`Permanently delete all items from trash?\n\nThis cannot be undone.`);
      if (!ok) return;

      setLoading(btn, true);

      let totalDeleted = 0;
      let batchIds = firstBatch;

      while (batchIds.length > 0) {
        const base = totalDeleted;
        const batchDeleted = await deleteBlocks(batchIds, spaceId, userId, (done) => {
          setProgress(base + done);
        });
        totalDeleted += batchDeleted;

        // Stop if last batch wasn't full, or if nothing was deleted (all forbidden)
        if (batchIds.length < 1000 || batchDeleted === 0) break;
        batchIds = await getBlockIds(spaceId);
      }

      toast(`${totalDeleted} item${totalDeleted !== 1 ? 's' : ''} deleted — Refresh to see changes`, false, true);

    } catch (err) {
      toast('Error — check console', true);
      console.error('[Notion Trash Cleaner]', err);
    } finally {
      isRunning = false;
      const b = document.getElementById('ntc-inline-btn');
      if (b) setLoading(b, false);
    }
  }

  // --- INJECTION ---

  function tryInject() {
    if (document.getElementById('ntc-inline-btn')) return;

    const trashMenu = document.querySelector('.notion-sidebar-trash-menu');
    if (!trashMenu) return;

    // Find the filter pill row
    let pillRow = null;
    for (const div of trashMenu.querySelectorAll('div')) {
      const style = div.getAttribute('style') || '';
      if (style.includes('flex') && /gap:\s*6px/.test(style)) {
        pillRow = div;
        break;
      }
    }

    if (!pillRow) {
      // Fallback: no pill row found, inject labeled button at top
      trashMenu.prepend(buildButton('label'));
      return;
    }

    // Try icon-only in the pill row
    const iconBtn = buildButton('icon');
    if (isRunning) {
      iconBtn.style.opacity = '0.5';
      iconBtn.style.pointerEvents = 'none';
      iconBtn.title = 'Deletion in progress…';
    }
    pillRow.appendChild(iconBtn);

    // After paint, check if the button was clipped by the row's overflow
    requestAnimationFrame(() => {
      const btnRect = iconBtn.getBoundingClientRect();
      const rowRect = pillRow.getBoundingClientRect();

      if (btnRect.width === 0 || btnRect.right > rowRect.right + 1) {
        // Clipped — remove and place labeled pill on its own row below
        iconBtn.remove();
        const labelBtn = buildButton('label');
        if (isRunning) {
          labelBtn.style.opacity = '0.5';
          labelBtn.style.pointerEvents = 'none';
          labelBtn.title = 'Deletion in progress…';
        }
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'display:flex; justify-content:flex-end; padding:4px 8px 2px;';
        wrapper.appendChild(labelBtn);
        pillRow.after(wrapper);
      }
    });
  }

  const observer = new MutationObserver(() => {
    tryInject();
    // Disconnect once button is in the DOM — reconnect only if it disappears
    if (document.getElementById('ntc-inline-btn')) {
      observer.disconnect();
      // Watch for the button being removed (panel closed) to re-arm injection
      const removalWatcher = new MutationObserver(() => {
        if (!document.getElementById('ntc-inline-btn')) {
          removalWatcher.disconnect();
          observer.observe(document.body, { childList: true, subtree: true });
        }
      });
      removalWatcher.observe(document.body, { childList: true, subtree: true });
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  tryInject();

})();
