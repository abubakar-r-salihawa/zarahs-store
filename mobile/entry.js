import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';

const native = Capacitor.isNativePlatform();
const callback = 'app.zarahs.store://auth/callback';
const targets = new Set(['auth.html', 'vendor-login.html']);
window.StoreMobile = {
  native,
  async signInWithGoogle(target = 'auth.html') {
    if (!targets.has(target)) throw new Error('Invalid sign-in destination.');
    localStorage.setItem('mobileAuthTarget', target);
    const { data, error } = await window.supabaseClient.auth.signInWithOAuth({
      provider: 'google', options: { redirectTo: callback, skipBrowserRedirect: true }
    });
    if (error) throw error;
    if (!data?.url) throw new Error('Sign-in could not be started.');
    await Browser.open({ url: data.url });
  }
};

let handlingCallback = false;
async function finishLogin(raw) {
  const url = new URL(raw);
  if (url.protocol !== 'app.zarahs.store:' || url.host !== 'auth' || url.pathname !== '/callback') return;
  if (handlingCallback) return;
  const code = url.searchParams.get('code');
  if (!code || sessionStorage.getItem('lastMobileAuthCode') === code) return;
  handlingCallback = true;
  try {
    const { error } = await window.supabaseClient.auth.exchangeCodeForSession(code);
    if (error) throw error;
    sessionStorage.setItem('lastMobileAuthCode', code);
    await Browser.close().catch(() => {});
    const target = localStorage.getItem('mobileAuthTarget');
    localStorage.removeItem('mobileAuthTarget');
    location.replace(targets.has(target) ? target : 'auth.html');
  } catch {
    alert('Sign-in could not be completed. Return to sign in and try again.');
  } finally { handlingCallback = false; }
}

if (native) {
  document.documentElement.classList.add('native-app');
  document.addEventListener('DOMContentLoaded', async () => {
    try {
      await App.addListener('appUrlOpen', event => { finishLogin(event.url).catch(() => {}); });
      await App.addListener('backButton', ({ canGoBack }) => {
        if (canGoBack) history.back();
        else if (!location.pathname.endsWith('/index.html') && location.pathname !== '/') location.href = 'index.html';
        else App.minimizeApp().catch(() => {});
      });
      const launch = await App.getLaunchUrl();
      if (launch?.url) await finishLogin(launch.url);
    } catch { console.warn('Native navigation could not initialize.'); }
  });
}
