// polyglotI18nProvider pone React Admin en español con los textos de mensajesEspañol
import polyglotI18nProvider from "ra-i18n-polyglot";
import { spanishMessages } from "./mensajesEspañol";

export const i18nProvider = polyglotI18nProvider(() => spanishMessages, "es");
