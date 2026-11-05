import type { CountryConfig, CountryCode } from './types';

/**
 * Country configuration layer.
 *
 * IMPORTANT: this file holds structural information only (currencies, units,
 * tariff structure names, bill vocabulary, official sources). It deliberately
 * contains NO prices, tax rates or levy amounts: those change frequently and
 * must come from the user's own bills or from a verified, dated data source.
 *
 * All entries are `reviewStatus: 'draft'` until checked against the official
 * sources listed in each entry.
 */
const DRAFT = { lastReviewed: '2026-11-05', reviewStatus: 'draft' as const };

const FR: CountryConfig = {
  code: 'FR',
  status: 'launch',
  currency: 'EUR',
  locale: 'fr-FR',
  defaultLanguage: 'fr',
  languages: ['fr', 'en'],
  electricity: {
    unit: 'kWh',
    hasStandingCharge: true,
    tariffStructures: [
      { id: 'fr_base', localName: 'Option Base', kind: 'single' },
      { id: 'fr_hphc', localName: 'Heures Pleines / Heures Creuses', kind: 'time_of_use' },
      { id: 'fr_tempo', localName: 'Tempo', kind: 'dynamic_day_type' },
    ],
  },
  gas: {
    supported: true,
    billingUnit: 'kWh',
    note: 'Bills convert m³ to kWh using a conversion coefficient printed on the bill.',
  },
  billTerms: [
    { local: 'Abonnement', concept: 'subscription' },
    { local: 'Consommation', concept: 'energy_price' },
    { local: 'Acheminement (TURPE)', concept: 'network_charge' },
    { local: "Accise sur l'électricité", concept: 'energy_tax' },
    { local: 'CTA (Contribution Tarifaire d’Acheminement)', concept: 'levy' },
    { local: 'TVA', concept: 'vat' },
  ],
  officialSources: [
    { name: 'Commission de régulation de l’énergie (CRE)', url: 'https://www.cre.fr', kind: 'regulator' },
    { name: 'Comparateur du Médiateur national de l’énergie', url: 'https://www.energie-info.fr', kind: 'comparator' },
    { name: 'Médiateur national de l’énergie', url: 'https://www.energie-mediateur.fr', kind: 'ombudsman' },
  ],
  smartMeter: {
    name: 'Linky (Enedis)',
    dataAccessNote:
      'Daily and half-hourly history can be accessed with the customer’s consent through Enedis. Real-time data needs a local module on the meter’s customer interface.',
  },
  ...DRAFT,
};

const BE: CountryConfig = {
  code: 'BE',
  status: 'launch',
  currency: 'EUR',
  locale: 'fr-BE',
  defaultLanguage: 'fr',
  languages: ['fr', 'nl', 'de', 'en'],
  electricity: {
    unit: 'kWh',
    hasStandingCharge: true,
    tariffStructures: [
      { id: 'be_single', localName: 'Mono-horaire / Enkelvoudig', kind: 'single' },
      { id: 'be_dual', localName: 'Bi-horaire / Tweevoudig', kind: 'time_of_use' },
      { id: 'be_dynamic', localName: 'Contrat dynamique / Dynamisch contract', kind: 'dynamic' },
      { id: 'be_capacity_fl', localName: 'Capaciteitstarief (Vlaanderen)', kind: 'capacity_based' },
    ],
  },
  gas: { supported: true, billingUnit: 'kWh' },
  billTerms: [
    { local: 'Redevance fixe / Vaste vergoeding', concept: 'subscription' },
    { local: 'Frais de réseau / Nettarieven', concept: 'network_charge' },
    { local: 'Cotisation fédérale / Federale bijdrage', concept: 'levy' },
    { local: 'Accise / Bijzondere accijns', concept: 'energy_tax' },
    { local: 'TVA / BTW', concept: 'vat' },
  ],
  officialSources: [
    { name: 'CREG', url: 'https://www.creg.be', kind: 'regulator' },
    { name: 'VREG (Flanders) – V-test', url: 'https://www.vreg.be', kind: 'comparator' },
    { name: 'CWaPE (Wallonia)', url: 'https://www.cwape.be', kind: 'regulator' },
    { name: 'BRUGEL (Brussels)', url: 'https://www.brugel.brussels', kind: 'regulator' },
  ],
  smartMeter: {
    name: 'Compteur numérique / Digitale meter',
    dataAccessNote:
      'Rollout and data access differ by region and network operator. Local real-time data may be available through the meter’s user port when activated.',
  },
  ...DRAFT,
};

const DE: CountryConfig = {
  code: 'DE',
  status: 'launch',
  currency: 'EUR',
  locale: 'de-DE',
  defaultLanguage: 'de',
  languages: ['de', 'en'],
  electricity: {
    unit: 'kWh',
    hasStandingCharge: true,
    tariffStructures: [
      { id: 'de_single', localName: 'Eintarif', kind: 'single' },
      { id: 'de_ht_nt', localName: 'Zweitarif (HT/NT)', kind: 'time_of_use' },
      { id: 'de_dynamic', localName: 'Dynamischer Stromtarif', kind: 'dynamic' },
    ],
  },
  gas: {
    supported: true,
    billingUnit: 'kWh',
    note: 'Bills convert m³ to kWh using the Zustandszahl and Brennwert printed on the bill.',
  },
  billTerms: [
    { local: 'Grundpreis', concept: 'subscription' },
    { local: 'Arbeitspreis', concept: 'energy_price' },
    { local: 'Netzentgelt', concept: 'network_charge' },
    { local: 'Stromsteuer', concept: 'energy_tax' },
    { local: 'Konzessionsabgabe', concept: 'levy' },
    { local: 'Messstellenbetrieb', concept: 'meter_rental' },
    { local: 'Umsatzsteuer (MwSt.)', concept: 'vat' },
  ],
  officialSources: [
    { name: 'Bundesnetzagentur', url: 'https://www.bundesnetzagentur.de', kind: 'regulator' },
    { name: 'Schlichtungsstelle Energie', url: 'https://www.schlichtungsstelle-energie.de', kind: 'ombudsman' },
  ],
  smartMeter: {
    name: 'Intelligentes Messsystem (iMSys)',
    dataAccessNote:
      'Rollout is progressive; many households still have a modern meter without a communication gateway and therefore no remote data.',
  },
  ...DRAFT,
};

const ES: CountryConfig = {
  code: 'ES',
  status: 'launch',
  currency: 'EUR',
  locale: 'es-ES',
  defaultLanguage: 'es',
  languages: ['es', 'en'],
  electricity: {
    unit: 'kWh',
    hasStandingCharge: true,
    tariffStructures: [
      { id: 'es_pvpc', localName: 'PVPC (precio regulado)', kind: 'dynamic' },
      { id: 'es_20td', localName: 'Peaje 2.0TD (punta / llano / valle)', kind: 'time_of_use' },
      { id: 'es_fixed', localName: 'Mercado libre – precio fijo', kind: 'single' },
    ],
  },
  gas: { supported: true, billingUnit: 'kWh' },
  billTerms: [
    { local: 'Término de potencia', concept: 'capacity' },
    { local: 'Término de energía', concept: 'energy_price' },
    { local: 'Impuesto especial sobre la electricidad', concept: 'energy_tax' },
    { local: 'Alquiler de equipos de medida', concept: 'meter_rental' },
    { local: 'IVA', concept: 'vat' },
  ],
  officialSources: [
    { name: 'CNMC', url: 'https://www.cnmc.es', kind: 'regulator' },
    { name: 'Comparador de ofertas CNMC', url: 'https://comparador.cnmc.gob.es', kind: 'comparator' },
    { name: 'Datadis (datos de consumo)', url: 'https://datadis.es', kind: 'network_data' },
  ],
  smartMeter: {
    name: 'Contador inteligente',
    dataAccessNote: 'Hourly consumption history is generally available through Datadis with the holder’s authorisation.',
  },
  ...DRAFT,
};

const PT: CountryConfig = {
  code: 'PT',
  status: 'launch',
  currency: 'EUR',
  locale: 'pt-PT',
  defaultLanguage: 'pt',
  languages: ['pt', 'en'],
  electricity: {
    unit: 'kWh',
    hasStandingCharge: true,
    tariffStructures: [
      { id: 'pt_simples', localName: 'Tarifa simples', kind: 'single' },
      { id: 'pt_bi', localName: 'Bi-horária', kind: 'time_of_use' },
      { id: 'pt_tri', localName: 'Tri-horária', kind: 'time_of_use' },
    ],
  },
  gas: { supported: true, billingUnit: 'kWh' },
  billTerms: [
    { local: 'Potência contratada', concept: 'capacity' },
    { local: 'Termo de energia', concept: 'energy_price' },
    { local: 'Redes (acesso às redes)', concept: 'network_charge' },
    { local: 'IEC (Imposto Especial de Consumo)', concept: 'energy_tax' },
    { local: 'CAV (Contribuição Audiovisual)', concept: 'levy' },
    { local: 'IVA', concept: 'vat' },
  ],
  officialSources: [
    { name: 'ERSE', url: 'https://www.erse.pt', kind: 'regulator' },
    { name: 'E-REDES', url: 'https://www.e-redes.pt', kind: 'network_data' },
  ],
  smartMeter: {
    name: 'Contador inteligente (E-REDES)',
    dataAccessNote: 'Consumption history is available through the network operator’s customer portal; coverage depends on the installed meter.',
  },
  ...DRAFT,
};

const NL: CountryConfig = {
  code: 'NL',
  status: 'launch',
  currency: 'EUR',
  locale: 'nl-NL',
  defaultLanguage: 'nl',
  languages: ['nl', 'en'],
  electricity: {
    unit: 'kWh',
    hasStandingCharge: true,
    tariffStructures: [
      { id: 'nl_single', localName: 'Enkeltarief', kind: 'single' },
      { id: 'nl_dual', localName: 'Dubbeltarief (normaal / dal)', kind: 'time_of_use' },
      { id: 'nl_dynamic', localName: 'Dynamisch contract', kind: 'dynamic' },
    ],
  },
  gas: { supported: true, billingUnit: 'm3', note: 'Gas is usually billed per m³.' },
  billTerms: [
    { local: 'Vaste leveringskosten', concept: 'subscription' },
    { local: 'Netbeheerkosten', concept: 'network_charge' },
    { local: 'Energiebelasting', concept: 'energy_tax' },
    { local: 'Vermindering energiebelasting', concept: 'energy_tax' },
    { local: 'BTW', concept: 'vat' },
  ],
  officialSources: [
    { name: 'ACM', url: 'https://www.acm.nl', kind: 'regulator' },
    { name: 'ConsuWijzer', url: 'https://www.consuwijzer.nl', kind: 'ombudsman' },
  ],
  smartMeter: {
    name: 'Slimme meter (P1-poort)',
    dataAccessNote: 'Near real-time data is available locally through the P1 port with a compatible reader.',
  },
  ...DRAFT,
};

/** Architecture-ready markets, not yet offered in onboarding. */
function planned(
  code: CountryCode,
  currency: CountryConfig['currency'],
  locale: string,
  defaultLanguage: CountryConfig['defaultLanguage'],
  regulator: { name: string; url: string },
): CountryConfig {
  return {
    code,
    status: 'planned',
    currency,
    locale,
    defaultLanguage,
    languages: defaultLanguage === 'en' ? ['en'] : [defaultLanguage, 'en'],
    electricity: { unit: 'kWh', hasStandingCharge: true, tariffStructures: [] },
    gas: { supported: false, billingUnit: 'kWh' },
    billTerms: [],
    officialSources: [{ ...regulator, kind: 'regulator' }],
    ...DRAFT,
  };
}

export const COUNTRIES: Record<CountryCode, CountryConfig> = {
  FR,
  BE,
  DE,
  ES,
  PT,
  NL,
  IT: planned('IT', 'EUR', 'it-IT', 'it', { name: 'ARERA', url: 'https://www.arera.it' }),
  LU: planned('LU', 'EUR', 'fr-LU', 'fr', { name: 'ILR', url: 'https://web.ilr.lu' }),
  AT: planned('AT', 'EUR', 'de-AT', 'de', { name: 'E-Control', url: 'https://www.e-control.at' }),
  IE: planned('IE', 'EUR', 'en-IE', 'en', { name: 'CRU', url: 'https://www.cru.ie' }),
  DK: planned('DK', 'DKK', 'da-DK', 'en', { name: 'Forsyningstilsynet', url: 'https://forsyningstilsynet.dk' }),
  SE: planned('SE', 'SEK', 'sv-SE', 'en', { name: 'Energimarknadsinspektionen', url: 'https://ei.se' }),
};
