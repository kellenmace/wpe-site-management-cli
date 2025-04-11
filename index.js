#!/usr/bin/env node

/**
 * WP Engine API CLI Tool
 * 
 * An interactive command-line interface for interacting with the WP Engine API.
 */

// Import required modules
import readline from 'readline';
import chalk from 'chalk';
import { fetchAccounts, fetchSitesByAccount, fetchInstallsBySite, deleteInstall, createInstall, createSite } from './utils.js';

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
 * @param {boolean} [preserveScreen=false] - Whether to preserve the current screen content
 * @returns {Promise<number>} Selected index
 */
async function createMenu(title, options, preserveScreen = false) {
  return new Promise((resolve) => {
    let selectedIndex = 0;
    const maxIndex = options.length - 1;
    let firstRender = true;
    
    // Function to render the menu
    function renderMenu() {
      if (firstRender) {
        // First time rendering
        if (!preserveScreen) {
          clearScreen();
          displayWelcome();
        }
        console.log(chalk.yellow(`${title}\n`));
        firstRender = false;
      } else {
        // For subsequent renders, just clear and redraw the options
        // Move cursor up by the number of options
        process.stdout.write(`\u001B[${options.length}A`);
        // Clear from cursor to end of screen
        process.stdout.write('\u001B[0J');
      }
      
      // Draw the options
      options.forEach((option, index) => {
        if (index === selectedIndex) {
          console.log(chalk.cyan(`→ ${option}`));
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
 * Get text input from the user
 * @param {string} prompt - The prompt to display
 * @returns {Promise<string>} The user's input
 */
async function getTextInput() {
  return new Promise((resolve) => {
    let input = '';
    process.stdout.write('> ');
    
    // Remove any existing keypress listeners
    const listeners = process.stdin.listeners('keypress');
    listeners.forEach(listener => {
      process.stdin.removeListener('keypress', listener);
    });
    
    // Make sure raw mode is enabled
    if (process.stdin.isTTY && !process.stdin.isRaw) {
      process.stdin.setRawMode(true);
    }
    
    // Handle keypress events
    function handleKeypress(str, key) {
      // Exit on Ctrl+C
      if (key && key.ctrl && key.name === 'c') {
        process.stdout.write('\n');
        process.exit(0);
      }
      
      if (key && key.name === 'return') {
        // Enter key - submit input
        process.stdout.write('\n');
        process.stdin.removeListener('keypress', handleKeypress);
        
        // Restore previous listeners
        listeners.forEach(listener => {
          process.stdin.on('keypress', listener);
        });
        
        resolve(input);
      } else if (key && key.name === 'backspace') {
        // Backspace key - remove last character
        if (input.length > 0) {
          input = input.slice(0, -1);
          process.stdout.write('\b \b'); // Move back, write space, move back again
        }
      } else if (str && !key.ctrl && !key.meta && !key.alt) {
        // Regular character - add to input
        input += str;
        process.stdout.write(str);
      }
    }
    
    // Register the keypress handler
    process.stdin.on('keypress', handleKeypress);
  });
}

/**
 * Prompt for a field with a label
 * @param {string} label - The label for the field
 * @param {string} [hint] - Optional hint text
 * @returns {Promise<string>} The user's input
 */
async function promptForField(label, hint) {
  clearScreen();
  displayWelcome();
  console.log(chalk.cyan(`Enter ${label}${hint ? ` ${hint}` : ''}:`));
  return getTextInput();
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
        siteOptions.push('+ Add site');
        siteOptions.push('← Back to account selection');
        
        const siteIndex = await createMenu('Select a site:', siteOptions);
        
        if (siteIndex === -1 || siteIndex === siteOptions.length - 1) {
          // User pressed Escape or selected 'Back to account selection'
          backToAccounts = true;
          continue;
        } else if (siteIndex === siteOptions.length - 2) {
          // User selected '+ Add site'
          try {
            // Prompt for site details
            const name = await promptForField('name');
            
            // Display loading message
            clearScreen();
            displayWelcome();
            console.log(chalk.yellow('Adding site...'));
            
            // Create the site
            const newSite = await createSite(selectedAccount.id, { name });
            
            // Success message
            clearScreen();
            displayWelcome();
            console.log(chalk.green('Site added.'));
            await waitForKeyPress();
            
            // Stay on the site selection screen
            continue;
          } catch (error) {
            // Error message
            clearScreen();
            displayWelcome();
            console.log(chalk.red(`Failed to add site: ${error.message}`));
            await waitForKeyPress();
            continue;
          }
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
            console.log('');
            
            // Show options even when no installs are found
            const emptyInstallOptions = [
              '+ Add install',
              '← Back to site selection',
              'Exit'
            ];
            
            const emptyInstallIndex = await createMenu('What would you like to do?', emptyInstallOptions, true);
            
            if (emptyInstallIndex === -1 || emptyInstallIndex === 1) {
              // User pressed Escape or selected 'Back to site selection'
              backToSites = true;
              continue;
            } else if (emptyInstallIndex === 2) {
              // User selected 'Exit'
              exitApp = true;
              continue;
            } else if (emptyInstallIndex === 0) {
              // User selected '+ Add install'
              // This code is duplicated from below to handle the add install flow
              try {
                // Prompt for install details
                const name = await promptForField('name');
                
                // Environment selection menu instead of text input
                clearScreen();
                displayWelcome();
                console.log(chalk.cyan('Select environment:'));
                
                const environmentOptions = [
                  'production',
                  'staging',
                  'development'
                ];
                
                const environmentIndex = await createMenu('Select environment:', environmentOptions);
                
                // If user pressed Escape, cancel the operation
                if (environmentIndex === -1) {
                  continue;
                }
                
                const environment = environmentOptions[environmentIndex];
                
                // Display loading message
                clearScreen();
                displayWelcome();
                console.log(chalk.yellow('Adding install...'));
                
                // Create the install
                const newInstall = await createInstall(
                  selectedSite.id,
                  selectedAccount.id,
                  {
                    name,
                    environment
                  }
                );
                
                // Success message
                clearScreen();
                displayWelcome();
                console.log(chalk.green('Install added.'));
                await waitForKeyPress();
                
                // Stay on the install selection screen
                continue;
              } catch (error) {
                // Error message
                clearScreen();
                displayWelcome();
                console.log(chalk.red(`Failed to add install: ${error.message}`));
                await waitForKeyPress();
                continue;
              }
            }
            continue;
          }
          
          // Format install options with name, environment, and domain
          const installOptions = installs.map(install => 
            `${install.name} (${install.environment}) - ${install.primary_domain || 'No domain'}`
          );
          installOptions.push('+ Add install');
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
          } else if (installIndex === installOptions.length - 3) {
            // User selected '+ Add install'
            try {
              // Prompt for install details
              const name = await promptForField('name');
              
              // Environment selection menu instead of text input
              clearScreen();
              displayWelcome();
              console.log(chalk.cyan('Select environment:'));
              
              const environmentOptions = [
                'production',
                'staging',
                'development'
              ];
              
              const environmentIndex = await createMenu('Select environment:', environmentOptions);
              
              // If user pressed Escape, cancel the operation
              if (environmentIndex === -1) {
                continue;
              }
              
              const environment = environmentOptions[environmentIndex];
              
              // Display loading message
              clearScreen();
              displayWelcome();
              console.log(chalk.yellow('Adding install...'));
              
              // Create the install
              const newInstall = await createInstall(
                selectedSite.id,
                selectedAccount.id,
                {
                  name,
                  environment
                }
              );
              
              // Success message
              clearScreen();
              displayWelcome();
              console.log(chalk.green('Install added.'));
              await waitForKeyPress();
              
              // Stay on the install selection screen
              continue;
            } catch (error) {
              // Error message
              clearScreen();
              displayWelcome();
              console.log(chalk.red(`Failed to add install: ${error.message}`));
              await waitForKeyPress();
              continue;
            }
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
              clearScreen();
              displayWelcome();
              
              // Display warning message
              console.log(chalk.red('WARNING: A deleted environment is not recoverable, and the name will no longer be available. You cannot undo this action.'));
              console.log(chalk.yellow(`Type "${selectedInstall.name}" to confirm, then press Enter.`));
              
              // Get user confirmation without clearing the screen
              const confirmation = await getTextInput();
              
              if (confirmation !== selectedInstall.name) {
                // Incorrect confirmation
                clearScreen();
                displayWelcome();
                console.log(chalk.red(`Incorrect confirmation. You typed "${confirmation}" but the install name is "${selectedInstall.name}".`));
                await waitForKeyPress();
              } else {
                // Correct confirmation, proceed with deletion
                clearScreen();
                displayWelcome();
                console.log(chalk.yellow('Deleting install...'));
                
                try {
                  await deleteInstall(selectedInstall.id);
                  
                  // Success message
                  clearScreen();
                  displayWelcome();
                  console.log(chalk.green('Install deleted.'));
                  await waitForKeyPress();
                  
                  // Return to install selection
                  backToInstalls = true;
                } catch (error) {
                  // Error message
                  clearScreen();
                  displayWelcome();
                  console.log(chalk.red(`Failed to delete install: ${error.message}`));
                  await waitForKeyPress();
                }
              }
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
