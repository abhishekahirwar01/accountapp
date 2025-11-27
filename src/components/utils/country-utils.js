// utils/country-utils.js
// Lazy loaded country-state-city utilities with proper error handling and caching

let countryData = null;
let loadPromise = null;
let loadError = null;

export const getCountryData = async () => {
  // Return cached data if available
  if (countryData) {
    return countryData;
  }

  // Return existing promise if already loading
  if (loadPromise) {
    return loadPromise;
  }

  // Reset error on retry
  loadError = null;

  // Create loading promise
  loadPromise = (async () => {
    try {
      const { Country, State, City } = await import('country-state-city');
      countryData = { Country, State, City };
      return countryData;
    } catch (error) {
      loadError = error;
      console.error('Failed to load country-state-city:', error);
      throw error;
    } finally {
      loadPromise = null;
    }
  })();

  return loadPromise;
};

export const getStatesOfCountry = async (countryCode = 'IN') => {
  try {
    const { State } = await getCountryData();
    return State.getStatesOfCountry(countryCode) || [];
  } catch (error) {
    console.error(`Failed to get states for country ${countryCode}:`, error);
    return [];
  }
};

export const getCitiesOfState = async (countryCode = 'IN', stateCode) => {
  try {
    const { City } = await getCountryData();
    return City.getCitiesOfState(countryCode, stateCode) || [];
  } catch (error) {
    console.error(
      `Failed to get cities for ${countryCode}-${stateCode}:`,
      error,
    );
    return [];
  }
};

export const getAllCountries = async () => {
  try {
    const { Country } = await getCountryData();
    return Country.getAllCountries() || [];
  } catch (error) {
    console.error('Failed to get all countries:', error);
    return [];
  }
};

// Utility to check if data is loaded
export const isCountryDataLoaded = () => {
  return countryData !== null;
};

// Utility to get loading state
export const getCountryDataLoadError = () => {
  return loadError;
};

// Clear cache (useful for testing)
export const clearCountryDataCache = () => {
  countryData = null;
  loadPromise = null;
  loadError = null;
};
