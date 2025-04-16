#!/usr/bin/env node

/**
 * WP Engine API CLI Tool
 * An interactive command-line interface for interacting with the WP Engine API.
 */

import readline from "readline";
import chalk from "chalk";
import {
  fetchAccounts,
  fetchSitesByAccount,
  fetchInstallsBySite,
  deleteInstall,
  createInstall,
  createSite,
} from "./utils.js";

// ------------------- UI HELPERS ------------------- //

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});
readline.emitKeypressEvents(process.stdin);
if (process.stdin.isTTY) process.stdin.setRawMode(true);

function clearScreen() {
  process.stdout.write("\u001B[2J\u001B[0;0H");
}

function displayWelcome() {
  clearScreen();
  console.log(chalk.blue.bold("Welcome to the WP Engine API CLI Tool!"));
  console.log(
    chalk.gray(
      "Use arrow keys to navigate, Enter to select, Escape to go back, and Ctrl+C to exit.\n"
    )
  );
}

function displayLoading(message) {
  clearScreen();
  displayWelcome();
  console.log(chalk.yellow(message));
}

function displayInstallDetails(siteName, install) {
  clearScreen();
  displayWelcome();
  console.log(
    chalk.green(`Install Details for "${install.name}" on site "${siteName}":`)
  );
  console.log(chalk.white("\n" + "=".repeat(50)));
  console.log(chalk.cyan(`Site Name: ${install.name || "N/A"}`));
  console.log(chalk.white(`Environment: ${install.environment || "N/A"}`));
  console.log(
    chalk.white(`Primary Domain: ${install.primary_domain || "N/A"}`)
  );
  console.log(chalk.white(`CNAME: ${install.cname || "N/A"}`));
  console.log(chalk.white(`PHP Version: ${install.php_version || "N/A"}`));
  console.log(chalk.white(`Multisite: ${install.is_multisite ? "Yes" : "No"}`));
  console.log(chalk.white("\n" + "=".repeat(50)));
}

/**
 * Create a menu with keyboard navigation.
 * @param {string} title
 * @param {string[]} options
 * @param {boolean} [preserveScreen=false]
 * @returns {Promise<number>} selected index, or -1 for escape/back
 */
async function createMenu(title, options, preserveScreen = false) {
  return new Promise((resolve) => {
    let selectedIndex = 0;
    const maxIndex = options.length - 1;
    let firstRender = true;
    function renderMenu() {
      if (firstRender) {
        if (!preserveScreen) {
          clearScreen();
          displayWelcome();
        }
        console.log(chalk.yellow(`${title}\n`));
        firstRender = false;
      } else {
        process.stdout.write(`\u001B[${options.length}A`);
        process.stdout.write("\u001B[0J");
      }
      options.forEach((option, index) => {
        if (index === selectedIndex) {
          console.log(chalk.cyan(`→ ${option}`));
        } else {
          console.log(`  ${option}`);
        }
      });
    }
    renderMenu();
    function handleKeypress(str, key) {
      if (key) {
        if (key.name === "up" && selectedIndex > 0) {
          selectedIndex--;
          renderMenu();
        } else if (key.name === "down" && selectedIndex < maxIndex) {
          selectedIndex++;
          renderMenu();
        } else if (key.name === "return") {
          process.stdin.removeListener("keypress", handleKeypress);
          resolve(selectedIndex);
        } else if (key.name === "escape") {
          process.stdin.removeListener("keypress", handleKeypress);
          resolve(-1);
        } else if (key.ctrl && key.name === "c") {
          clearScreen();
          console.log(chalk.blue("Exiting WP Engine API CLI Tool..."));
          process.exit(0);
        }
      }
    }
    process.stdin.on("keypress", handleKeypress);
  });
}

async function getTextInput() {
  return new Promise((resolve) => {
    let input = "";
    process.stdout.write("> ");
    // Remove any existing keypress listeners
    const listeners = process.stdin.listeners("keypress");
    listeners.forEach((listener) =>
      process.stdin.removeListener("keypress", listener)
    );
    if (process.stdin.isTTY && !process.stdin.isRaw)
      process.stdin.setRawMode(true);
    function handleKeypress(str, key) {
      if (key && key.ctrl && key.name === "c") {
        process.stdout.write("\n");
        process.exit(0);
      }
      if (key && key.name === "return") {
        process.stdout.write("\n");
        process.stdin.removeListener("keypress", handleKeypress);
        listeners.forEach((listener) => process.stdin.on("keypress", listener));
        resolve(input);
      } else if (key && key.name === "backspace") {
        if (input.length > 0) {
          input = input.slice(0, -1);
          process.stdout.write("\b \b");
        }
      } else if (str && !key.ctrl && !key.meta && !key.alt) {
        input += str;
        process.stdout.write(str);
      }
    }
    process.stdin.on("keypress", handleKeypress);
  });
}

async function promptForField(label, hint) {
  clearScreen();
  displayWelcome();
  console.log(chalk.cyan(`Enter ${label}${hint ? ` ${hint}` : ""}:`));
  return getTextInput();
}

async function waitForKeyPress() {
  return new Promise((resolve) => {
    console.log(chalk.gray("Press any key to continue..."));
    function handleKeypress() {
      process.stdin.removeListener("keypress", handleKeypress);
      resolve();
    }
    process.stdin.once("keypress", handleKeypress);
  });
}

// ------------------- ENVIRONMENT HELPERS ------------------- //

const ALL_ENVIRONMENTS = ["production", "staging", "development"];

function getExistingEnvironments(installs) {
  return installs.map((install) => install.environment);
}

function getAvailableEnvironments(installs) {
  const existing = getExistingEnvironments(installs);
  return ALL_ENVIRONMENTS.filter((env) => !existing.includes(env));
}

function allEnvironmentsExist(installs) {
  const existing = getExistingEnvironments(installs);
  return ALL_ENVIRONMENTS.every((env) => existing.includes(env));
}

// ------------------- INSTALL CREATION FLOW ------------------- //

/**
 * Handles the flow for adding an install, used in both empty and non-empty install lists.
 * @param {Object} params
 * @param {Object} params.selectedSite
 * @param {Object} params.selectedAccount
 * @param {Array} params.installs
 * @returns {Promise<boolean>} true if install added, false otherwise
 */
async function addInstallFlow({ selectedSite, selectedAccount, installs }) {
  try {
    const name = await promptForField("name");
    clearScreen();
    displayWelcome();
    console.log(chalk.cyan("Select environment:"));
    const availableEnvironments = getAvailableEnvironments(installs);
    if (availableEnvironments.length === 0) {
      console.log(chalk.red("All environments already exist for this site."));
      await waitForKeyPress();
      return false;
    }
    const environmentIndex = await createMenu(
      "Select environment:",
      availableEnvironments
    );
    if (environmentIndex === -1) return false;
    const environment = availableEnvironments[environmentIndex];
    clearScreen();
    displayWelcome();
    console.log(chalk.yellow("Adding install..."));
    await createInstall(selectedSite.id, selectedAccount.id, {
      name,
      environment,
    });
    clearScreen();
    displayWelcome();
    console.log(chalk.green("Install added."));
    await waitForKeyPress();
    return true;
  } catch (error) {
    clearScreen();
    displayWelcome();
    console.log(chalk.red(`Failed to add install: ${error.message}`));
    await waitForKeyPress();
    return false;
  }
}

// ------------------- MAIN APP FLOW ------------------- //

async function main() {
  try {
    let exitApp = false;
    while (!exitApp) {
      // --- Account selection ---
      displayLoading("Loading accounts...");
      const accounts = await fetchAccounts();
      if (!accounts.length) {
        clearScreen();
        console.log(
          chalk.red("No accounts found. Please check your API credentials.")
        );
        process.exit(1);
      }
      const accountOptions = accounts.map((account) => account.name);
      const accountIndex = await createMenu(
        "Select an account:",
        accountOptions
      );
      if (accountIndex === -1) break;
      const selectedAccount = accounts[accountIndex];

      // --- Site selection ---
      let backToAccounts = false;
      while (!backToAccounts && !exitApp) {
        displayLoading(`Loading sites for account: ${selectedAccount.name}...`);
        const sites = await fetchSitesByAccount(selectedAccount.id);
        if (!sites.length) {
          clearScreen();
          displayWelcome();
          console.log(
            chalk.red(`No sites found for account: ${selectedAccount.name}`)
          );
          await waitForKeyPress();
          backToAccounts = true;
          continue;
        }
        const siteOptions = sites
          .map((site) => site.name)
          .concat(["+ Add site", "← Back to account selection"]);
        const siteIndex = await createMenu("Select a site:", siteOptions);
        if (siteIndex === -1 || siteIndex === siteOptions.length - 1) {
          backToAccounts = true;
          continue;
        } else if (siteIndex === siteOptions.length - 2) {
          // Add site flow
          try {
            const name = await promptForField("name");
            clearScreen();
            displayWelcome();
            console.log(chalk.yellow("Adding site..."));
            await createSite(selectedAccount.id, { name });
            clearScreen();
            displayWelcome();
            console.log(chalk.green("Site added."));
            await waitForKeyPress();
            continue;
          } catch (error) {
            clearScreen();
            displayWelcome();
            console.log(chalk.red(`Failed to add site: ${error.message}`));
            await waitForKeyPress();
            continue;
          }
        }
        const selectedSite = sites[siteIndex];

        // --- Install selection ---
        let backToSites = false;
        while (!backToSites && !backToAccounts && !exitApp) {
          displayLoading(`Loading installs for site: ${selectedSite.name}...`);
          const installs = await fetchInstallsBySite(selectedSite.id);
          if (!installs.length) {
            clearScreen();
            displayWelcome();
            console.log(
              chalk.red(`No installs found for site: ${selectedSite.name}`)
            );
            console.log("");
            const emptyInstallOptions = [
              "+ Add install",
              "← Back to site selection",
              "Exit",
            ];
            const emptyInstallIndex = await createMenu(
              "What would you like to do?",
              emptyInstallOptions,
              true
            );
            if (emptyInstallIndex === -1 || emptyInstallIndex === 1) {
              backToSites = true;
              continue;
            } else if (emptyInstallIndex === 2) {
              exitApp = true;
              continue;
            } else if (emptyInstallIndex === 0) {
              await addInstallFlow({ selectedSite, selectedAccount, installs });
              continue;
            }
            continue;
          }

          // Build install options
          const installOptions = installs.map(
            (install) =>
              `${install.name} (${install.environment}) - ${
                install.primary_domain || "No domain"
              }`
          );
          if (!allEnvironmentsExist(installs))
            installOptions.push("+ Add install");
          installOptions.push("← Back to site selection");

          const installIndex = await createMenu(
            "Select an install:",
            installOptions
          );
          const addInstallOffset = !allEnvironmentsExist(installs) ? 2 : 1;
          if (
            installIndex === -1 ||
            installIndex === installOptions.length - 1
          ) {
            backToSites = true;
            continue;
          } else if (
            !allEnvironmentsExist(installs) &&
            installIndex === installOptions.length - addInstallOffset
          ) {
            // Add install flow
            await addInstallFlow({ selectedSite, selectedAccount, installs });
            continue;
          }

          // --- Install management ---
          const selectedInstall = installs[installIndex];
          let backToInstalls = false;
          while (
            !backToInstalls &&
            !backToSites &&
            !backToAccounts &&
            !exitApp
          ) {
            displayInstallDetails(selectedSite.name, selectedInstall);
            const managementOptions = [
              "Delete install",
              "← Back to install selection",
              "Exit",
            ];
            const managementIndex = await createMenu(
              "What would you like to do?",
              managementOptions
            );
            if (managementIndex === -1 || managementIndex === 1) {
              backToInstalls = true;
            } else if (managementIndex === 0) {
              clearScreen();
              displayWelcome();
              console.log(
                chalk.red(
                  "WARNING: A deleted environment is not recoverable, and the name will no longer be available. You cannot undo this action."
                )
              );
              console.log(
                chalk.yellow(
                  `Type "${selectedInstall.name}" to confirm, then press Enter.`
                )
              );
              const confirmation = await getTextInput();
              if (confirmation !== selectedInstall.name) {
                clearScreen();
                displayWelcome();
                console.log(
                  chalk.red(
                    `Incorrect confirmation. You typed "${confirmation}" but the install name is "${selectedInstall.name}".`
                  )
                );
                await waitForKeyPress();
              } else {
                clearScreen();
                displayWelcome();
                console.log(chalk.yellow("Deleting install..."));
                try {
                  await deleteInstall(selectedInstall.id);
                  clearScreen();
                  displayWelcome();
                  console.log(chalk.green("Install deleted."));
                  await waitForKeyPress();
                  backToInstalls = true;
                } catch (error) {
                  clearScreen();
                  displayWelcome();
                  console.log(
                    chalk.red(`Failed to delete install: ${error.message}`)
                  );
                  await waitForKeyPress();
                }
              }
            } else if (managementIndex === 2) {
              exitApp = true;
            }
          }
        }
      }
    }
    clearScreen();
    console.log(chalk.blue("Thank you for using the WP Engine API CLI Tool!"));
    process.exit(0);
  } catch (error) {
    clearScreen();
    console.error(chalk.red("An error occurred:"), error);
    process.exit(1);
  }
}

// Handle Ctrl+C globally
process.on("SIGINT", () => {
  clearScreen();
  console.log(chalk.blue("\nExiting WP Engine API CLI Tool..."));
  process.exit(0);
});

main();
