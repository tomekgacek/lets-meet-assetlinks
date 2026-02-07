const dictionaries = {
  pl: window.I18N_PL,
  en: window.I18N_EN,
  de: window.I18N_DE,
  fr: window.I18N_FR,
};

let currentLang = "pl";

function detectLanguage() {
  const saved = localStorage.getItem("lang");
  if (saved && dictionaries[saved]) return saved;

  const browser = navigator.language.slice(0, 2);
  if (dictionaries[browser]) return browser;

  return "en";
}

function setLanguage(lang) {
  if (!dictionaries[lang]) return;

  currentLang = lang;
  localStorage.setItem("lang", lang);
  translatePage();
}

function t(key) {
  return dictionaries[currentLang]?.[key] || key;
}

function translatePage() {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.dataset.i18n;
    el.textContent = t(key);
  });
}

currentLang = detectLanguage();
document.addEventListener("DOMContentLoaded", translatePage);

window.i18n = { t, setLanguage, currentLang };
