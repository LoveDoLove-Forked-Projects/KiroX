/** @file 任务完成提示音、桌面通知与反馈。 */

import { getAppApi } from '../platform/wails.js';

import { tr } from '../i18n/index.js';
import { settingsState } from '../settings/state.js';
import { showToast } from '../ui/toast.js';

export function playCompletionChime() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return false;

    const ctx = new AudioContextClass();
    const master = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const startAt = ctx.currentTime + 0.03;
    const notes = [
      { frequency: 523.25, delay: 0, duration: 0.46, volume: 0.16 },
      { frequency: 659.25, delay: 0.12, duration: 0.52, volume: 0.14 },
      { frequency: 783.99, delay: 0.26, duration: 0.62, volume: 0.12 },
    ];

    filter.type = 'lowpass';
    filter.frequency.value = 3200;
    filter.Q.value = 0.7;
    const configuredVolume =
      settingsState.appSettings && Number(settingsState.appSettings.soundVolume);
    master.gain.value = ((Number.isFinite(configuredVolume) ? configuredVolume : 70) / 100) * 0.75;
    master.connect(filter);
    filter.connect(ctx.destination);

    notes.forEach(function (note) {
      const noteStart = startAt + note.delay;
      const noteEnd = noteStart + note.duration;
      const gain = ctx.createGain();
      const fundamental = ctx.createOscillator();
      const overtone = ctx.createOscillator();
      const overtoneGain = ctx.createGain();

      fundamental.type = 'sine';
      fundamental.frequency.setValueAtTime(note.frequency, noteStart);
      fundamental.frequency.exponentialRampToValueAtTime(note.frequency * 1.006, noteStart + 0.08);
      overtone.type = 'triangle';
      overtone.frequency.setValueAtTime(note.frequency * 2, noteStart);
      overtoneGain.gain.value = 0.12;

      gain.gain.setValueAtTime(0.0001, noteStart);
      gain.gain.exponentialRampToValueAtTime(note.volume, noteStart + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteEnd);

      fundamental.connect(gain);
      overtone.connect(overtoneGain);
      overtoneGain.connect(gain);
      gain.connect(master);
      fundamental.start(noteStart);
      overtone.start(noteStart);
      fundamental.stop(noteEnd);
      overtone.stop(noteEnd);
    });

    if (ctx.state === 'suspended') ctx.resume().catch(function () {});
    setTimeout(function () {
      ctx.close().catch(function () {});
    }, 1200);
    return true;
  } catch (e) {
    return false;
  }
}

export function showTaskDesktopNotification(message) {
  const app = getAppApi();
  if (!app || !app.ShowDesktopNotification) return;
  app.ShowDesktopNotification('KiroX', message).catch(function () {});
}

export function notifyTaskComplete(taskName, success, failed, total) {
  const msg = tr(
    'toast.taskCompleteMsg',
    { name: taskName, s: success, f: failed, t: total },
    '{name} 任务完成！成功 {s} / 失败 {f} / 共 {t}',
  );
  showToast(msg, success > 0 ? 'success' : 'error');
  const soundEnabled = document.getElementById('cfg-sound');
  if (soundEnabled && soundEnabled.checked) {
    playCompletionChime();
  }
  if (!settingsState.appSettings || settingsState.appSettings.desktopNotifications !== false) {
    showTaskDesktopNotification(msg);
  }
}
