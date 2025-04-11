#!/usr/bin/env node

/**
 * WP Engine API CLI Tool
 * 
 * An interactive command-line interface for interacting with the WP Engine API.
 */

// Import required modules
import inquirer from 'inquirer';
import chalk from 'chalk';
import { fetchAccounts, fetchSitesByAccount, fetchInstallsBySite } from './utils.js';

/**
 * Display a welcome message
 */
function displayWelcome() {
  console.clear();
  console.log(chalk.blue.bold('Welcome to the WP Engine API CLI Tool!'));
  console.log(chalk.gray('Use arrow keys to navigate, Enter to select, and Escape to go back.\n'));
}

/**
 * Setup escape key handling for inquirer prompts
 */
function setupEscapeKey(rl) {
  // Save the original _listeners
  const origListeners = rl.listeners('keypress');
  
  // Remove all existing listeners
  rl.removeAllListeners('keypress');
  
  // Add our own listener that will check for escape key
  rl.on('keypress', (s, key) => {
    if (key && key.name === 'escape') {
      // Simulate selecting the 'back' option by sending the input for it
      rl.output.unmute();
      rl.close();
      return rl.emit('line', 'back');
    }
    
    // Call the original listeners
    for (const listener of origListeners) {
      listener(s, key);
    }
  });
  
  return rl;
}

/**
 * Prompt the user to select an account
 * @returns {Promise<Object>} The selected account
 */
async function selectAccount() {
  displayWelcome();
  
  try {
    console.log(chalk.yellow('Loading accounts...'));
    const accounts = await fetchAccounts();
    
    if (!accounts.length) {
      console.log(chalk.red('No accounts found. Please check your API credentials.'));
      process.exit(1);
    }
    
    console.clear();
    displayWelcome();
    
    // Create a custom prompt that handles the escape key
    const prompt = inquirer.createPromptModule({
      skipThenForConfirmIfFalse: true
    });
    
    const { selectedAccount } = await prompt([
      {
        type: 'list',
        name: 'selectedAccount',
        message: 'Select an account:',
        choices: accounts.map(account => ({
          name: account.name,
          value: account
        })),
        pageSize: 10
      }
    ]);
    
    return selectedAccount;
  } catch (error) {
    console.error(chalk.red('Error selecting account:'), error);
    process.exit(1);
  }
}

/**
 * Prompt the user to select a site from the given account
 * @param {Object} account - The account to select sites from
 * @returns {Promise<Object>} The selected site
 */
async function selectSite(account) {
  console.clear();
  displayWelcome();
  
  try {
    console.log(chalk.yellow(`Loading sites for account: ${account.name}...`));
    const sites = await fetchSitesByAccount(account.id);
    
    if (!sites.length) {
      console.log(chalk.red(`No sites found for account: ${account.name}`));
      console.log(chalk.gray('Press any key to go back...'));
      process.stdin.setRawMode(true);
      await new Promise(resolve => process.stdin.once('data', () => {
        process.stdin.setRawMode(false);
        resolve();
      }));
      return null;
    }
    
    console.clear();
    displayWelcome();
    
    // Create a custom prompt that handles the escape key
    const prompt = inquirer.createPromptModule({
      skipThenForConfirmIfFalse: true
    });
    
    const { selectedSite } = await prompt([
      {
        type: 'list',
        name: 'selectedSite',
        message: 'Select a site:',
        choices: [
          ...sites.map(site => ({
            name: site.name,
            value: site
          })),
          new inquirer.Separator(),
          {
            name: '← Back to account selection',
            value: 'back'
          }
        ],
        pageSize: 10
      }
    ]);
    
    if (selectedSite === 'back') {
      return null;
    }
    
    return selectedSite;
  } catch (error) {
    console.error(chalk.red('Error selecting site:'), error);
    console.log(chalk.gray('Press any key to go back...'));
    process.stdin.setRawMode(true);
    await new Promise(resolve => process.stdin.once('data', () => {
      process.stdin.setRawMode(false);
      resolve();
    }));
    return null;
  }
}

/**
 * Display installs for the given site
 * @param {Object} site - The site to display installs for
 */
async function displayInstalls(site) {
  console.clear();
  displayWelcome();
  
  try {
    console.log(chalk.yellow(`Loading installs for site: ${site.name}...`));
    const installs = await fetchInstallsBySite(site.id);
    
    console.clear();
    displayWelcome();
    
    console.log(chalk.green(`Installs for site "${site.name}":`));
    
    if (!installs.length) {
      console.log(chalk.red(`No installs found for site: ${site.name}`));
    } else {
      installs.forEach((install, index) => {
        console.log(chalk.white('\n' + '='.repeat(50)));
        console.log(chalk.cyan(`Install #${index + 1}:`));
        console.log(chalk.white(`Site Name: ${install.name || 'N/A'}`));
        console.log(chalk.white(`Environment: ${install.environment || 'N/A'}`));
        console.log(chalk.white(`CNAME: ${install.cname || 'N/A'}`));
        console.log(chalk.white(`PHP Version: ${install.php_version || 'N/A'}`));
        console.log(chalk.white(`Multisite: ${install.is_multisite ? 'Yes' : 'No'}`));
      });
    }
    
    console.log(chalk.white('\n' + '='.repeat(50)));
    
    // Create a custom prompt that handles the escape key
    const prompt = inquirer.createPromptModule({
      skipThenForConfirmIfFalse: true
    });
    
    const { action } = await prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          {
            name: '← Back to site selection',
            value: 'back'
          },
          {
            name: 'Exit',
            value: 'exit'
          }
        ]
      }
    ]);
    
    return action;
  } catch (error) {
    console.error(chalk.red('Error displaying installs:'), error);
    console.log(chalk.gray('Press any key to go back...'));
    process.stdin.setRawMode(true);
    await new Promise(resolve => process.stdin.once('data', () => {
      process.stdin.setRawMode(false);
      resolve();
    }));
    return 'back';
  }
}

/**
 * Main function to run the CLI tool
 */
async function main() {
  try {
    // Register keypress events
    process.stdin.on('keypress', (str, key) => {
      if (key && key.name === 'escape') {
        // This will be handled by the individual prompts
      }
    });
    
    let exitApp = false;
    
    while (!exitApp) {
      const account = await selectAccount();
      
      if (account) {
        let backToAccounts = false;
        
        while (!backToAccounts) {
          const site = await selectSite(account);
          
          if (!site) {
            backToAccounts = true;
            continue;
          }
          
          const action = await displayInstalls(site);
          
          if (action === 'exit') {
            exitApp = true;
            backToAccounts = true;
          } else if (action === 'back') {
            // Continue the loop to select another site
          }
        }
      }
    }
    
    console.clear();
    console.log(chalk.blue('Thank you for using the WP Engine API CLI Tool!'));
    process.exit(0);
  } catch (error) {
    console.error(chalk.red('An error occurred:'), error);
    process.exit(1);
  }
}

// Enable keypress events
process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.setEncoding('utf8');

// Run the main function
main();
