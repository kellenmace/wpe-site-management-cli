/**
 * Utility functions for working with the WP Engine API
 */
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * Creates a Basic Authentication header for WP Engine API requests
 * @returns The Base64 encoded authentication string
 */
export function createAuthHeader() {
  const API_USER_ID = process.env.WP_ENGINE_API_USER_ID || '';
  const API_PASSWORD = process.env.WP_ENGINE_API_PASSWORD || '';
  
  if (!API_USER_ID || !API_PASSWORD) {
    console.error('Error: WP Engine API credentials not found in environment variables.');
    console.error('Please create a .env file with WP_ENGINE_API_USER_ID and WP_ENGINE_API_PASSWORD.');
    process.exit(1);
  }
  
  // Create the authorization header
  const auth = Buffer.from(`${API_USER_ID}:${API_PASSWORD}`).toString('base64');
  return `Basic ${auth}`;
}

/**
 * Fetches accounts from the WP Engine API
 * @returns {Promise<Array>} Array of account objects
 */
export async function fetchAccounts() {
  try {
    const response = await fetch('https://api.wpengineapi.com/v1/accounts', {
      headers: { 'Authorization': createAuthHeader() }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('Error fetching accounts:', error);
    throw error;
  }
}

/**
 * Fetches all sites from the WP Engine API
 * @returns {Promise<Array>} Array of site objects
 */
export async function fetchSites() {
  try {
    const response = await fetch('https://api.wpengineapi.com/v1/sites', {
      headers: { 'Authorization': createAuthHeader() }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('Error fetching sites:', error);
    throw error;
  }
}

/**
 * Fetches sites for a specific account
 * @param {string} accountId - The account ID to filter sites by
 * @returns {Promise<Array>} Array of site objects filtered by account
 */
export async function fetchSitesByAccount(accountId) {
  try {
    // First, fetch all sites
    const allSites = await fetchSites();
    
    // Then filter sites by account ID
    return allSites.filter(site => {
      // Check if the site belongs to the specified account
      // Some sites may have an account property or we may need to check other properties
      return site.account === accountId || 
             (site.account && site.account.id === accountId) ||
             (site.accountId === accountId);
    });
  } catch (error) {
    console.error(`Error fetching sites for account ${accountId}:`, error);
    throw error;
  }
}

/**
 * Fetches all installs from the WP Engine API
 * @returns {Promise<Array>} Array of install objects
 */
export async function fetchInstalls() {
  try {
    const response = await fetch('https://api.wpengineapi.com/v1/installs', {
      headers: { 'Authorization': createAuthHeader() }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('Error fetching installs:', error);
    throw error;
  }
}

/**
 * Fetches installs for a specific site
 * @param {string} siteId - The site ID to filter installs by
 * @returns {Promise<Array>} Array of install objects filtered by site
 */
export async function fetchInstallsBySite(siteId) {
  try {
    // First, fetch all installs
    const allInstalls = await fetchInstalls();
    
    // Then filter installs by site ID
    return allInstalls.filter(install => {
      // Check if the install belongs to the specified site
      return install.site === siteId || 
             (install.site && install.site.id === siteId) ||
             (install.siteId === siteId);
    });
  } catch (error) {
    console.error(`Error fetching installs for site ${siteId}:`, error);
    throw error;
  }
}
