'use strict';

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type !== 'ntc-notify') return;
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'Notion Trash Cleaner',
    message: msg.message,
  });
});
