export default defineBackground(() => {
  // Keep-alive for MV3 service worker via periodic alarms
  browser.alarms.create('keepalive', { periodInMinutes: 0.4 })
  browser.alarms.onAlarm.addListener(() => { /* no-op — just prevents SW termination */ })
})
