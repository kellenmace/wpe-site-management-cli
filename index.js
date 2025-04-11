#!/usr/bin/env node

/**
 * WP Engine API CLI Tool
 * 
 * An interactive command-line interface for interacting with the WP Engine API.
 */

// Import required modules
import readline from 'readline';
import chalk from 'chalk';
import { fetchAccounts, fetchSitesByAccount, fetchInstallsBySite } from './utils.js';

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Enable keypress events
readline.emitKeypressEvents(process.stdin);
if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
}

/**
 * Clear the screen completely
 */
function clearScreen() {
  // ANSI escape codes to clear screen and move cursor to top-left
  process.stdout.write('\u001B[2J\u001B[0;0H');
}

/**
 * Display a welcome message
 */
function displayWelcome() {
  clearScreen();
  console.log(chalk.blue.bold('Welcome to the WP Engine API CLI Tool!'));
  console.log(chalk.gray('Use arrow keys to navigate, Enter to select, and Escape to go back.\n'));
}

/**
 * Create a simple menu with keyboard navigation
 * @param {string} title - Menu title
 * @param {Array} options - Menu options
 * @returns {Promise<number>} Selected index
 */
async function createMenu(title, options) {
  return new Promise((resolve) => {
    let selectedIndex = 0;
    const maxIndex = options.length - 1;
    
    // Function to render the menu
    function renderMenu() {
      clearScreen();
      displayWelcome();
      console.log(chalk.yellow(`${title}\n`));
      
      options.forEach((option, index) => {
        if (index === selectedIndex) {
          console.log(chalk.cyan(`❯ ${option}`));
        } else {
          console.log(`  ${option}`);
        }
      });
    }
    
    // Initial render
    renderMenu();
    
    // Handle keypress events
    function handleKeypress(str, key) {
      if (key) {
        if (key.name === 'up' && selectedIndex > 0) {
          selectedIndex--;
          renderMenu();
        } else if (key.name === 'down' && selectedIndex < maxIndex) {
          selectedIndex++;
          renderMenu();
        } else if (key.name === 'return') {
          process.stdin.removeListener('keypress', handleKeypress);
          resolve(selectedIndex);
        } else if (key.name === 'escape') {
          process.stdin.removeListener('keypress', handleKeypress);
          resolve(-1); // Special value for 'back'
        } else if (key.ctrl && key.name === 'c') {
          clearScreen();
          console.log(chalk.blue('Exiting WP Engine API CLI Tool...'));
          process.exit(0);
        }
      }
    }
    
    // Register keypress handler
    process.stdin.on('keypress', handleKeypress);
  });
}

/**
 * Display a loading message
 * @param {string} message - Loading message
 */
function displayLoading(message) {
  clearScreen();
  displayWelcome();
  console.log(chalk.yellow(message));
}

/**
 * Display installs information
 * @param {string} siteName - Site name
 * @param {Object} selectedInstall - The selected install to display details for
 */
function displayInstallDetails(siteName, selectedInstall) {
  clearScreen();
  displayWelcome();
  
  console.log(chalk.green(`Install Details for "${selectedInstall.name}" on site "${siteName}":`));
  console.log(chalk.white('\n' + '='.repeat(50)));
  console.log(chalk.cyan(`Site Name: ${selectedInstall.name || 'N/A'}`));
  console.log(chalk.white(`Environment: ${selectedInstall.environment || 'N/A'}`));
  console.log(chalk.white(`Primary Domain: ${selectedInstall.primary_domain || 'N/A'}`));
  console.log(chalk.white(`CNAME: ${selectedInstall.cname || 'N/A'}`));
  console.log(chalk.white(`PHP Version: ${selectedInstall.php_version || 'N/A'}`));
  console.log(chalk.white(`Multisite: ${selectedInstall.is_multisite ? 'Yes' : 'No'}`));
  console.log(chalk.white('\n' + '='.repeat(50)));
}

/**
 * Wait for any key press
 * @returns {Promise<void>}
 */
async function waitForKeyPress() {
  return new Promise((resolve) => {
    console.log(chalk.gray('Press any key to continue...'));
    
    function handleKeypress() {
      process.stdin.removeListener('keypress', handleKeypress);
      resolve();
    }
    
    process.stdin.once('keypress', handleKeypress);
  });
}

/**
 * Main function to run the CLI tool
 */
async function main() {
  try {
    let exitApp = false;
    
    while (!exitApp) {
      // Account selection
      displayLoading('Loading accounts...');
      const accounts = await fetchAccounts();
      
      if (!accounts.length) {
        clearScreen();
        console.log(chalk.red('No accounts found. Please check your API credentials.'));
        process.exit(1);
      }
      
      const accountOptions = accounts.map(account => account.name);
      const accountIndex = await createMenu('Select an account:', accountOptions);
      
      if (accountIndex === -1) {
        // User pressed Escape at the top level, exit the app
        exitApp = true;
        continue;
      }
      
      const selectedAccount = accounts[accountIndex];
      
      // Site selection
      let backToAccounts = false;
      
      while (!backToAccounts && !exitApp) {
        displayLoading(`Loading sites for account: ${selectedAccount.name}...`);
        const sites = await fetchSitesByAccount(selectedAccount.id);
        
        if (!sites.length) {
          clearScreen();
          displayWelcome();
          console.log(chalk.red(`No sites found for account: ${selectedAccount.name}`));
          await waitForKeyPress();
          backToAccounts = true;
          continue;
        }
        
        const siteOptions = sites.map(site => site.name);
        siteOptions.push('← Back to account selection');
        
        const siteIndex = await createMenu('Select a site:', siteOptions);
        
        if (siteIndex === -1 || siteIndex === siteOptions.length - 1) {
          // User pressed Escape or selected 'Back'
          backToAccounts = true;
          continue;
        }
        
        const selectedSite = sites[siteIndex];
        
        // Install selection
        let backToSites = false;
        
        while (!backToSites && !backToAccounts && !exitApp) {
          displayLoading(`Loading installs for site: ${selectedSite.name}...`);
          const installs = await fetchInstallsBySite(selectedSite.id);
          
          if (!installs.length) {
            clearScreen();
            displayWelcome();
            console.log(chalk.red(`No installs found for site: ${selectedSite.name}`));
            await waitForKeyPress();
            backToSites = true;
            continue;
          }
          
          // Format install options with name, environment, and domain
          const installOptions = installs.map(install => 
            `${install.name} (${install.environment}) - ${install.primary_domain || 'No domain'}`
          );
          installOptions.push('← Back to site selection');
          installOptions.push('Exit');
          
          const installIndex = await createMenu('Select an install:', installOptions);
          
          if (installIndex === -1 || installIndex === installOptions.length - 2) {
            // User pressed Escape or selected 'Back to site selection'
            backToSites = true;
            continue;
          } else if (installIndex === installOptions.length - 1) {
            // User selected 'Exit'
            exitApp = true;
            continue;
          }
          
          const selectedInstall = installs[installIndex];
          
          // Display install management options
          let backToInstalls = false;
          
          while (!backToInstalls && !backToSites && !backToAccounts && !exitApp) {
            displayInstallDetails(selectedSite.name, selectedInstall);
            
            const managementOptions = [
              'Delete install',
              '← Back to install selection',
              'Exit'
            ];
            
            const managementIndex = await createMenu('What would you like to do?', managementOptions);
            
            if (managementIndex === -1 || managementIndex === 1) {
              // User pressed Escape or selected 'Back to install selection'
              backToInstalls = true;
            } else if (managementIndex === 0) {
              // User selected 'Delete install'
              // This will do nothing for now, as requested
              clearScreen();
              displayWelcome();
              console.log(chalk.yellow('Delete functionality will be implemented in a future update.'));
              await waitForKeyPress();
            } else if (managementIndex === 2) {
              // User selected 'Exit'
              exitApp = true;
            }
          }
        }
      }
    }
    
    clearScreen();
    console.log(chalk.blue('Thank you for using the WP Engine API CLI Tool!'));
    process.exit(0);
  } catch (error) {
    clearScreen();
    console.error(chalk.red('An error occurred:'), error);
    process.exit(1);
  }
}

// Handle Ctrl+C globally
process.on('SIGINT', () => {
  clearScreen();
  console.log(chalk.blue('\nExiting WP Engine API CLI Tool...'));
  process.exit(0);
});

// Run the main function
main();
