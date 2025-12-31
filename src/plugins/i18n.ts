import { createI18n } from 'vue-i18n';
import en from '../locales/en';
import fr from '../locales/fr';
import zh from '../locales/zh';
import { en as vuetifyEn, fr as vuetifyFr, zhHans as vuetifyZhHans } from 'vuetify/locale';

const STORAGE_KEY = 'espconnect-language';
const supportedLocales = ['en', 'fr', 'zh'] as const;
export type SupportedLocale = (typeof supportedLocales)[number];

function normalizeLocale(value: unknown): SupportedLocale {
  if (typeof value !== 'string') {
    return 'en';
  }

  const normalized = value.toLowerCase();
  return supportedLocales.includes(normalized as SupportedLocale)
    ? (normalized as SupportedLocale)
    : 'en';
}

function readStoredLocale(): SupportedLocale {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return 'en';
  }
  return normalizeLocale(window.localStorage.getItem(STORAGE_KEY));
}

const locale = readStoredLocale();

export const i18n = createI18n({
  legacy: false,
  locale: locale as string,
  fallbackLocale: 'en',
  messages: {
    en: {
      ...en,
      $vuetify: vuetifyEn,
    },
    fr: {
      ...fr,
      $vuetify: vuetifyFr,
    },
    zh: {
      ...zh,
      $vuetify: vuetifyZhHans,
    },
  },
});

export function getLanguage(): SupportedLocale {
  return normalizeLocale(i18n.global.locale.value);
}

export function setLanguage(next: string): SupportedLocale {
  const normalized = normalizeLocale(next);
  i18n.global.locale.value = normalized;

  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, normalized);
  }

  return normalized;
}
