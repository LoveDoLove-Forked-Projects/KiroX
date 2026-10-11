/** @file 已保存设置、写入队列与设置控件映射。 */

export const settingsState = {
  savedSnapshot: null,
  saving: false,
  writeQueue: Promise.resolve(),
  pendingWrites: 0,
  controls: {
    emailProxyMode: 'setting-email-proxy-mode',
    emailProxy: 'setting-email-proxy',
    otpTimeoutSeconds: 'setting-otp-timeout',
    retryProfile: 'setting-retry-profile',
    stopOnRisk: 'setting-stop-on-risk',
    soundEnabled: 'cfg-sound',
    desktopNotifications: 'setting-desktop-notification',
    soundVolume: 'setting-sound-volume',
    autoCheckUpdates: 'setting-auto-update',
    theme: 'setting-theme',
    language: 'setting-language',
    persistentLogs: 'setting-persistent-logs',
    logRetentionDays: 'setting-log-retention',
    autoProbeProxies: 'setting-auto-probe',
    moeMailExpiryMinutes: 'setting-moe-expiry',
  },
  appSettings: null,
};
