# Chinese Novel Lookups

An Obsidian plugin that allows you to look up Chinese novels (and other books) by ISBN and automatically create markdown files with all relevant information.

## Features

- Look up books by ISBN (10 or 13 digits)
- Automatically fetches book information from Open Library and Google Books APIs
- Creates beautifully formatted markdown files with:
  - Book title
  - Author(s)
  - Publication date
  - Publisher
  - ISBN
  - Page count
  - Language
  - Description
  - Cover image
  - Subjects/categories
  - Notes section for your personal thoughts

## Installation

### Manual Installation

1. Download the latest release from the releases page
2. Copy the `main.js`, `manifest.json`, and `styles.css` files to your vault's `.obsidian/plugins/chinese-novel-lookups/` folder
3. Reload Obsidian
4. Enable the plugin in Settings → Community plugins

### Development Installation

1. Clone this repository
2. Run `npm install` to install dependencies
3. Run `npm run dev` to start development mode
4. Copy the `main.js`, `manifest.json`, and `styles.css` files to your vault's `.obsidian/plugins/chinese-novel-lookups/` folder
5. Reload Obsidian

## Usage

1. Click the book icon in the ribbon, or
2. Use the command palette (Ctrl/Cmd + P) and search for "Lookup Chinese Novel by ISBN"
3. Enter the ISBN (10 or 13 digits)
4. Click "Lookup"
5. A new markdown file will be created with all the book information

## API Credits

This plugin uses:
- [Open Library API](https://openlibrary.org/developers/api) - Free, no API key required
- [Google Books API](https://developers.google.com/books) - Free, no API key required (used as fallback)

## License

MIT


