import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./locales/en.json";
import ar from "./locales/ar.json";
import fr from "./locales/fr.json";

const resources = {
  en: {
    translation: en,
  },
  ar: {
    translation: ar,
  },
  fr: {
    translation: fr,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    debug: false,

    interpolation: {
      escapeValue: false,
    },

    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      caches: ["localStorage"],
    },
  });

// Keep the document direction/lang in sync with the active language so that
// a saved RTL language (Arabic) renders correctly on first paint / reload,
// not only after the user re-selects it.
const applyDir = (lng: string) => {
  document.documentElement.dir = lng === "ar" ? "rtl" : "ltr";
  document.documentElement.lang = lng;
};

applyDir(i18n.language);
i18n.on("languageChanged", applyDir);

export default i18n;
