# WP Engine CLI Tool

An interactive command-line interface for working with the WP Engine API.

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

3. Configure your WP Engine API credentials in the `.env` file:

```
WP_ENGINE_API_USER_ID=your-api-user-id
WP_ENGINE_API_PASSWORD=your-api-password
```

You can get your API credentials from the WP Engine User Portal.

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

## Features

- Interactive navigation through WP Engine resources
- Account selection
- Site selection (filtered by selected account)
- Detailed install information display
- User-friendly interface with color-coded output
