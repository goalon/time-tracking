/**
 * Time Tracking
 * Docs & License: https://github.com/goalon/time-tracking
 * 2022 Mateusz Bajorek
 * University of Warsaw, MIMUW, SOVA
 */

type TimeTrackingFundamentalNormalizedData = {
  additions: number[],
  deletions: number[],
  actions: number[],
};

type TimeTrackingFundamentalNormalizedLanguagesData = {
  [languageId: string]: TimeTrackingFundamentalNormalizedData,
};

export {
  TimeTrackingFundamentalNormalizedData,
  TimeTrackingFundamentalNormalizedLanguagesData,
};
