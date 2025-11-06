// lib/sacService.js
import sacCodesData from "../data/SAC.json";

// Convert the JSON data to match our interface
const allSACCodes = sacCodesData.map(item => ({
  code: item.SAC_CD.toString(), // Convert number to string for consistent searching
  description: item.SAC_Description
}));

// Local search function
export function searchSACCodes(query) {
  if (!query || query.length < 2) return [];
  
  const searchTerm = query.toLowerCase().trim();
  
  return allSACCodes.filter(sac =>
    sac.code.includes(query) || // Exact code match
    sac.description.toLowerCase().includes(searchTerm) || // Description match
    sac.code.startsWith(query) // Code starts with
  )
  .slice(0, 10); // Limit results for performance
}

// Optional: Async version to maintain the same interface
export async function searchSACCodesAsync(query) {
  return Promise.resolve(searchSACCodes(query));
}

// Optional: Get SAC code by exact code match
export function getSACByCode(code) {
  return allSACCodes.find(sac => sac.code === code);
}

// Optional: Get all SAC codes
export function getAllSACCodes() {
  return [...allSACCodes];
}