# WP Engine Site Management CLI Tool (WP Engine API Demo)

An interactive command-line interface for working with the [WP Engine API](https://wpengineapi.com/) and managing your WordPress sites and installs.

This is a demo app to accompany the [Mastering the WP Engine API: A Comprehensive Guide for Developers](https://wpengine.com/builders/mastering-the-wp-engine-api-a-comprehensive-guide-for-developers/) article. It demonstrates how to use the WP Engine API in practice.

![wpe-cli-demo](https://github.com/user-attachments/assets/ea27eb3c-e821-419d-a5f8-ee2d4573eb4b)


## Overview

This tool provides a user-friendly CLI interface to interact with the WP Engine API. It allows you to:

- Browse accounts you have access to
- View sites within each account
- View installs (environments) within each site
- Create and delete sites
- Create and delete installs (environments)

## Installation

1. Clone this repository
2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the project root with your WP Engine API credentials:

```
WP_ENGINE_API_USER_ID=your-api-user-id
WP_ENGINE_API_PASSWORD=your-api-password
```

You can enable API access and get your credentials by following the steps in the [WP Engine Customer API](https://wpengine.com/support/enabling-wp-engine-api/) Support Center article.

## Usage

Start the CLI tool:

```bash
npm start
```

Or run directly:

```bash
node index.js
```

## Navigation

- Use arrow keys (↑/↓) to navigate through lists
- Press Enter to select an item
- Select the "Back" option or press Escape to go back to the previous screen
- Press Ctrl+C to exit the application
