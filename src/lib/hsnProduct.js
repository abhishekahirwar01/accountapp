// lib/hsnProduct.js
import hsnCodesData from "../data/HSN.json";

// Convert JSON data to desired format
const allHSNCodes = hsnCodesData.map(item => ({
  code: item.HSN_CD.toString(),
  description: item.HSN_Description,
}));

// Local search function for HSN codes
export function searchHSNCodes(query) {
  if (!query || query.length < 2) return [];

  const searchTerm = query.toLowerCase().trim();

  return allHSNCodes
    .filter(
      hsn =>
        hsn.code.includes(query) ||
        hsn.description.toLowerCase().includes(searchTerm) ||
        hsn.code.startsWith(query)
    )
    .slice(0, 10);
}

// Search by exact HSN code
export function getHSNByCode(code) {
  return allHSNCodes.find(hsn => hsn.code === code);
}

// Optional: Get all HSN codes
export function getAllHSNCodes() {
  return [...allHSNCodes];
}

// Search with filters
export function searchHSNCodesWithFilters(filters) {
  let results = allHSNCodes;

  if (filters.query && filters.query.length >= 2) {
    const searchTerm = filters.query.toLowerCase().trim();
    results = results.filter(
      hsn =>
        hsn.code.includes(filters.query) ||
        hsn.description.toLowerCase().includes(searchTerm)
    );
  }

  return results.slice(0, 15);
}
