export const $ = (sel) => document.querySelector(sel);
export const $$ = (sel) => document.querySelectorAll(sel);

export function showToast(message, isError = false) {
  const toast = $("#toast");
  if (!toast) return;
  toast.textContent = message;
  toast.style.background = isError ? "#e53e3e" : "var(--pink-600)";
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3000);
}

export function showLogin() {
  const overlay = $("#loginOverlay");
  if (overlay) overlay.classList.remove("hidden");
}

export function hideLogin() {
  const overlay = $("#loginOverlay");
  if (overlay) overlay.classList.add("hidden");
}
