# Rawpixel public domain image downloader

Automated tool for downloading CC0 licenced images from Rawpixel using browser automation. Downloads high-resolution images and saves comprehensive metadata to CSV.

## Features

- ✅ Downloads all images from Rawpixel boards/collections
- ✅ Multi-page support - automatically paginate through large boards
- ✅ CC0 license verification - only downloads public domain images
- ✅ Metadata extraction - saves title, artist, description, tags, and more to CSV
- ✅ No authentication required for public CC0 images
- ✅ Progress tracking with terminal output

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

### Interactive Mode (Recommended)

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

### Command Line Mode

You can also provide the board URL directly:

```bash
npm start -- 'https://www.rawpixel.com/search?page=1&path=BOARD_PATH&sort=curated'
```

Or:

```bash
node rp-downloader.js 'https://www.rawpixel.com/search?page=1&path=1522.3.sub_topic-2791&sort=curated'
```

### Finding Board URLs

1. Go to [Rawpixel.com](https://www.rawpixel.com)
2. Browse to any public domain board or collection
3. Copy the URL from your browser address bar
4. Paste it when prompted (or use as command line argument)

## Output

### Folder Structure

Downloads are organized by board name:

```
images/
└── Floreal_Dessins_&_Coloris_Nouveaux_by_E.A._Seguy/
    ├── 5896135_Floral_colorful_background,_vintage_art.jpg
    ├── 5928464_Vintage_art_deco_&_art.jpg
    ├── 5900575_Floral_colorful_background,_vintage_art.jpg
    ├── ...
    └── metadata.csv
```

### Metadata CSV

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

### Sample CSV output

```csv
"filename","imageId","title","artist","license","description","tags","date","url"
"5896135_Floral_colorful_background,_vintage_art.jpg","5896135","Floral colorful background, vintage art","","CC0","Download free image of Floral colorful background...","Images, Illustrations","PNGPSDVector","https://www.rawpixel.com/image/5896135/..."
```

## Browser Visibility

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

### "Timeout exceeded while waiting for download"

**Cause:** Rate limiting or network issues

**Solutions:**
- Wait 1-2 hours before retrying (account cooldown)
- Add a session cookie for authenticated access
- Check your internet connection

### "No images found"

**Cause:** Invalid board URL or private board

**Solutions:**
- Verify the board URL is correct
- Check the board is public
- Try adding authentication if it's a member-only board

### "Could not find download button"

**Cause:** Page layout changed or non-CC0 image

**Solutions:**
- Verify the images are CC0 licensed
- The script automatically skips non-CC0 images
- Rawpixel may have updated their page structure

### Browser won't close

**Cause:** Script error or timeout

**Solution:**
- Press Ctrl+C to force quit
- Close the browser window manually
- Check the terminal for error messages

## Delays and rate limiting

The script includes built-in delays to be respectful to Rawpixel's servers:

- 3 seconds between page fetches
- 2 seconds between image downloads
- 2 seconds between pagination checks

**Do not reduce these delays** as it may result in:
- IP blocking
- Account suspension
- Download failures


## License

This tool is for personal use only. Respect Rawpixel's terms of service and only download CC0/public domain images.

## Contributing

Found a bug or want to improve the script? Feel free to submit issues or pull requests.

## Disclaimer

This is an unofficial tool and is not affiliated with or endorsed by Rawpixel. Use responsibly and in accordance with Rawpixel's terms of service.
