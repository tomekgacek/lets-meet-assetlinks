console.log("I18N loaded:", {
  pl: window.I18N_PL,
  en: window.I18N_EN,
  de: window.I18N_DE,
  fr: window.I18N_FR,
});

const i18n = {
  lang: "en",

  dicts: {
    pl: window.I18N_PL,
    en: window.I18N_EN,
    de: window.I18N_DE,
    fr: window.I18N_FR,
  },

t(key, vars = {}) {
  let text = this.dicts[this.lang]?.[key] ?? key;

  Object.keys(vars).forEach(k => {
    text = text.replace(`{${k}}`, vars[k]);
  });

  return text;
}
,

  setLanguage(lang, updateUrl = true) {
    if (!this.dicts[lang]) return;

    this.lang = lang;
    localStorage.setItem("lang", lang);

    if (updateUrl) {
      const url = new URL(window.location.href);
      url.searchParams.set("lang", lang);
      window.history.replaceState({}, "", url.toString());
    }

    this.apply();
  },

apply() {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.dataset.i18n;

    if (el.tagName === "TITLE") {
      document.title = this.t(key);
    } else {
      el.textContent = this.t(key);
    }
  });
}

};

// ---------- INIT ----------
(function initI18n() {
  const params = new URLSearchParams(window.location.search);
  const urlLang = params.get("lang");

  const storedLang = localStorage.getItem("lang");

  const browserLang = navigator.language?.slice(0, 2);

let lang = "en";

if (urlLang && i18n.dicts[urlLang]) {
  lang = urlLang;
} else if (storedLang && i18n.dicts[storedLang]) {
  lang = storedLang;
} else if (browserLang && i18n.dicts[browserLang]) {
  lang = browserLang;
}

  i18n.setLanguage(lang, false);
})();

window.i18n = i18n;
