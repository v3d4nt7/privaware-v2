chrome.runtime.onInstalled.addListener(() => {
  console.log('PrivAware v2 installed');
  chrome.storage.local.set({ scanHistory: [] });
});
