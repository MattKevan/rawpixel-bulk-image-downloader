# Rawpixel public domain image downloader

Automated tool for downloading CC0 licenced images from Rawpixel using browser automation. Downloads high-resolution images and saves comprehensive metadata to CSV.

## Features

- ✅ Downloads all images from Rawpixel boards/collections
- ✅ Multi-page support - automatically paginate through large boards
- ✅ CC0 license verification - only downloads public domain images
- ✅ Metadata extraction - saves title, artist, description, tags, and more to CSV
- ✅ Script to set up user authentication, required for downloading high resolution CC0 images
- ✅ Progress tracking with terminal output.

## Requirements

- Node.js (v14 or higher)
- npm

## Installation

1. Clone or download this repository
2. Install dependencies:

```bash
npm install
```

This will install:
- `playwright` - Browser automation
- `json2csv` - CSV export functionality
- `dotenv` - Environment variable management

3. Install Chromium browser (required by Playwright):

```bash
npm run install-browser
```

4. Set up your Rawpixel session cookie (required for downloads):

You'll need to create a free Rawpixel account to download images.

```bash
npm run setup
```

This will:
- Open a browser window
- Navigate to Rawpixel login page
- Wait for you to log in
- Automatically extract and save your session cookie to `.env`

**Alternative manual setup:**
If you prefer to set up the cookie manually, copy `.env.example` to `.env` and follow the instructions inside to paste your session cookie.

## Usage

### Interactive mode (recommended)

Simply run the script and follow the prompts:

```bash
npm start
```

Or:

```bash
node rp-downloader.js
```

The script will ask you for:
1. **Board URL** - The Rawpixel board/collection URL to download from
2. **Format** - Choose between high-resolution JPEG (recommended) or original TIFF

### Command line mode

You can also provide the board URL directly:

```bash
npm start -- 'https://www.rawpixel.com/search?page=1&path=BOARD_PATH&sort=curated'
```

Or:

```bash
node rp-downloader.js 'https://www.rawpixel.com/search?page=1&path=1522.3.sub_topic-2791&sort=curated'
```

### Finding board URLs

1. Go to [Rawpixel.com](https://www.rawpixel.com)
2. Browse to any public domain board or collection
3. Copy the URL from your browser address bar
4. Paste it when prompted (or use as command line argument)

## Metadata CSV

The `metadata.csv` file contains detailed information for each downloaded image:

| Column | Description |
|--------|-------------|
| `filename` | Downloaded filename (includes image ID prefix) |
| `imageId` | Rawpixel image ID |
| `title` | Image title |
| `artist` | Artist/creator name (if available) |
| `license` | License type (CC0, Public Domain, etc.) |
| `description` | Full image description |
| `tags` | Keywords and tags |
| `date` | Publication date (if available) |
| `url` | Direct link to the image page |

## Browser visibility

By default, the browser window is visible so you can see the download progress. This is useful for:
- Monitoring the process
- Debugging issues
- Verifying correct boards are being accessed

To run in headless mode (no visible browser), edit `browser-downloader.js` line 124:

```javascript
// Change from:
headless: false

// To:
headless: true
```

## Troubleshooting

If there are errors downloading it could be that:

- You're hitting rate limits. Wait for a while and try later.
- The boards contain non-public domain images. Check the image licences.
- Rawpixel have changed the structure of their pages. Drat.

## License

This tool is for personal use only. Respect Rawpixel's terms of service and only download CC0/public domain images.

## Contributing

Found a bug or want to improve the script? Feel free to submit issues or pull requests.

## Disclaimer

This is an unofficial tool and is not affiliated with or endorsed by Rawpixel. Use responsibly and in accordance with Rawpixel's terms of service.
