export const firebaseConfig = {
  apiKey: "AIzaSyC59YEPBiFV8Wl1KKk1LafD8L85WV9zxAA",
  authDomain: "own-your-options-compass.firebaseapp.com",
  projectId: "own-your-options-compass",
  storageBucket: "own-your-options-compass.firebasestorage.app",
  messagingSenderId: "100672984556",
  appId: "1:100672984556:web:0680dae284836a6817dcc9",
  measurementId: "G-TKPKHN553V"
};

export const adminEmails = [
  "legacybuildersyyc@gmail.com"
];

export const appLinks = {
  lwa: "PASTE_YOUR_LWA_LINK_HERE",
  premiumPayment: "PASTE_YOUR_PREMIUM_PAYMENT_LINK_HERE"
};

export function hasFirebaseConfig() {
  return !Object.values(firebaseConfig).some((value) => value.startsWith("PASTE_"));
}

export function isAdminEmail(email) {
  return adminEmails.includes(String(email || "").trim().toLowerCase());
}

export function getAppLink(name) {
  const value = appLinks[name] || "";
  return value.startsWith("http") ? value : "";
}
