# WP Engine Site Management CLI Tool (WP Engine API Demo)

An interactive command-line interface for working with the WP Engine API and managing your WordPress sites and installs.

## Overview

This tool provides a user-friendly CLI interface to interact with the WP Engine API. It allows you to:

- Browse accounts you have access to
- View sites within each account
- See detailed information about installs (environments) for each site

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

## Features

- Interactive navigation through WP Engine resources
- Account selection
- Site selection (filtered by selected account)
- Detailed install information display
- User-friendly interface with color-coded output
