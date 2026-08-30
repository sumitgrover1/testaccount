import { City, State } from 'country-state-city';

// India's 28 states + 8 union territories, from a well-maintained public
// dataset rather than a hand-typed list — used to drive proper State/City
// dropdowns (instead of free text, which drifts into inconsistent spellings
// like "Gurugram" vs "gurgaon" vs "Gurgaon,") everywhere a patient's address
// is captured.
const INDIA_STATE_RECORDS = State.getStatesOfCountry('IN');

export const STATE_OPTIONS = INDIA_STATE_RECORDS.map((s) => ({ label: s.name, value: s.name }));

const STATE_NAME_TO_ISO = new Map(INDIA_STATE_RECORDS.map((s) => [s.name, s.isoCode]));

// City is a Select whose options depend on the selected state; call this
// whenever the state field changes to get that state's valid cities.
export function getCityOptions(stateName: string | undefined): { label: string; value: string }[] {
  const isoCode = stateName ? STATE_NAME_TO_ISO.get(stateName) : undefined;
  if (!isoCode) return [];
  return City.getCitiesOfState('IN', isoCode).map((c) => ({ label: c.name, value: c.name }));
}
