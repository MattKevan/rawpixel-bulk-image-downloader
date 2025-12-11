const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { Parser } = require('json2csv');
const readline = require('readline');
require('dotenv').config();

// Get session cookie from .env file
const SESSION_COOKIE = process.env.RAWPIXEL_SESSION_COOKIE || "";

const sanitizeFilename = (filename) => {
    return filename
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
        .replace(/\s+/g, '_')
        .replace(/\.+$/, '')
        .substring(0, 200);
};

// Interactive prompt helper
const askQuestion = (query) => {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise(resolve => {
        rl.question(query, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
};

// Dismiss cookie consent / privacy modals
const dismissCookieConsent = async (page) => {
    try {
        // Wait a moment for modal to appear
        await page.waitForTimeout(1000);

        // Try to find and click "Accept" or "Agree" buttons
        const acceptSelectors = [
            'button:has-text("Accept")',
            'button:has-text("Agree")',
            'button:has-text("I agree")',
            'button:has-text("I Accept")',
            'button:has-text("OK")',
            'button:has-text("Got it")',
            '[class*="accept"]',
            '[class*="agree"]',
            '#qc-cmp2-ui button'  // Specific for the Quantcast modal
        ];

        for (const selector of acceptSelectors) {
            const button = page.locator(selector).first();
            if (await button.count() > 0) {
                await button.click({ timeout: 5000 });
                console.log(`      ⓘ Dismissed cookie consent modal`);
                await page.waitForTimeout(500);
                return true;
            }
        }
    } catch (e) {
        // If modal doesn't exist or can't be dismissed, that's fine
    }
    return false;
};

const extractMetadata = async (page, imageUrl, imageId) => {
    try {
        // Extract title
        const title = await page.title();
        const cleanTitle = title.split('|')[0].trim();

        // Extract artist/creator
        let artist = '';
        try {
            artist = await page.locator('a[href*="/artists/"], [class*="artist"], [class*="creator"]').first().textContent({ timeout: 2000 });
        } catch (e) {
            // Artist not found
        }

        // Extract license information
        let license = '';
        const pageText = await page.textContent('body');
        if (pageText.toLowerCase().includes('cc0')) {
            license = 'CC0';
        } else if (pageText.toLowerCase().includes('public domain')) {
            license = 'Public Domain';
        } else if (pageText.toLowerCase().includes('u.s. government')) {
            license = 'U.S. Government Works';
        }

        // Extract description
        let description = '';
        try {
            const descElement = await page.locator('[class*="description"], meta[name="description"]').first();
            if (await descElement.count() > 0) {
                const isMetaTag = await descElement.evaluate(el => el.tagName === 'META');
                if (isMetaTag) {
                    description = await descElement.getAttribute('content');
                } else {
                    description = await descElement.textContent({ timeout: 2000 });
                }
            }
        } catch (e) {
            // Description not found
        }

        // Extract tags/keywords
        let tags = '';
        try {
            const tagElements = await page.locator('[class*="tag"], [class*="keyword"], a[href*="/search?"]').all();
            const tagTexts = [];
            for (let i = 0; i < Math.min(tagElements.length, 10); i++) {
                const text = await tagElements[i].textContent();
                if (text && text.trim().length > 0 && text.trim().length < 30) {
                    tagTexts.push(text.trim());
                }
            }
            tags = tagTexts.join(', ');
        } catch (e) {
            // Tags not found
        }

        // Extract date if available
        let date = '';
        try {
            const dateElement = await page.locator('[class*="date"], time, [datetime]').first();
            if (await dateElement.count() > 0) {
                date = await dateElement.textContent({ timeout: 2000 });
            }
        } catch (e) {
            // Date not found
        }

        return {
            imageId,
            title: cleanTitle,
            artist: artist.trim(),
            license,
            description: description.trim().substring(0, 500), // Limit description length
            tags: tags.substring(0, 200), // Limit tags length
            date: date.trim(),
            url: imageUrl
        };
    } catch (err) {
        console.log(`      ⚠️  Error extracting metadata: ${err.message}`);
        return {
            imageId,
            title: '',
            artist: '',
            license: '',
            description: '',
            tags: '',
            date: '',
            url: imageUrl
        };
    }
};

async function main() {
    console.log("=== Rawpixel CC0 Image Downloader ===\n");

    // Check for session cookie
    if (!SESSION_COOKIE || SESSION_COOKIE.length === 0) {
        console.log("❌ ERROR: Session cookie not found!\n");
        console.log("Rawpixel requires login to download images, even for free CC0 content.\n");
        console.log("Quick setup (recommended):");
        console.log("  Run: npm run setup-cookie");
        console.log("  This will open a browser, let you log in, and automatically save your cookie.\n");
        console.log("Manual setup:");
        console.log("  1. Copy .env.example to .env:");
        console.log("     cp .env.example .env\n");
        console.log("  2. Log in to rawpixel.com in your browser\n");
        console.log("  3. Get your session cookie:");
        console.log("     • Press F12 (or Right-click → Inspect)");
        console.log("     • Go to: Application → Storage → Cookies → https://www.rawpixel.com");
        console.log("     • Find the cookie starting with 'SSESS'");
        console.log("     • Copy the VALUE (the long string after the = sign)\n");
        console.log("  4. Edit the .env file and paste your cookie value after the = sign\n");
        console.log("  5. Save the file and run: npm start\n");
        process.exit(1);
    }

    // Get board URL from command line or interactive prompt
    let boardUrl = process.argv[2];

    if (!boardUrl) {
        console.log("Enter the Rawpixel board URL to download from.");
        console.log("Example: https://www.rawpixel.com/search?page=1&path=1522.3.sub_topic-2791&sort=curated\n");
        boardUrl = await askQuestion("Board URL: ");

        if (!boardUrl || boardUrl.trim().length === 0) {
            console.log("❌ Error: Board URL is required");
            process.exit(1);
        }
    }

    // Ask for format preference
    console.log("\nChoose download format:");
    console.log("  1) High-resolution JPEG (recommended, smaller file size)");
    console.log("  2) Original TIFF (highest quality, larger file size)");
    const formatChoice = await askQuestion("\nEnter choice (1 or 2) [default: 1]: ");

    const downloadTiff = formatChoice.trim() === '2';
    const formatName = downloadTiff ? 'TIFF' : 'JPEG';

    console.log(`\n✓ Format selected: ${formatName}`);
    console.log("\nLaunching browser...\n");

    const browser = await chromium.launch({
        headless: false  // Show browser so you can see what's happening
    });

    const context = await browser.newContext({
        // Set up download directory
        acceptDownloads: true
    });

    // Add session cookie if provided (optional for public CC0 images)
    if (SESSION_COOKIE && SESSION_COOKIE.length > 0) {
        console.log("Using session cookie for authentication\n");
        await context.addCookies([{
            name: SESSION_COOKIE.split('=')[0],
            value: SESSION_COOKIE.split('=')[1],
            domain: '.rawpixel.com',
            path: '/'
        }]);
    } else {
        console.log("Running without authentication (public access only)\n");
    }

    const page = await context.newPage();

    try {
        // Parse the URL to handle pagination
        const url = new URL(boardUrl);
        const baseUrl = url.origin + url.pathname;
        const params = new URLSearchParams(url.search);

        // Get the path parameter for building URLs
        const pathParam = params.get('path');
        const sortParam = params.get('sort') || 'curated';

        console.log(`📥 Starting from: ${boardUrl}\n`);

        // Collect all image links from all pages
        let allImageLinks = new Set();
        let currentPage = 1;
        let hasMorePages = true;
        let boardTitle = null;

        while (hasMorePages) {
            const pageUrl = `${baseUrl}?page=${currentPage}&path=${pathParam}&sort=${sortParam}`;
            console.log(`📄 Fetching page ${currentPage}...`);

            await page.goto(pageUrl, { waitUntil: 'networkidle' });
            await page.waitForTimeout(3000);

            // Extract board title from the first page
            if (currentPage === 1 && !boardTitle) {
                try {
                    const pageTitle = await page.title();
                    // Extract the board name from title (usually before the first | or -)
                    boardTitle = pageTitle.split('|')[0].split('-')[0].trim();
                    if (!boardTitle || boardTitle.length === 0) {
                        boardTitle = 'board-downloads';
                    }
                    console.log(`   Board: ${boardTitle}`);
                } catch (e) {
                    boardTitle = 'board-downloads';
                }
            }

            // Get image links on this page
            const pageImageLinks = await page.$$eval('a[href*="/image/"]', links => {
                const uniqueLinks = new Set();
                links.forEach(link => {
                    const href = link.href;
                    if (href && href.includes('/image/')) {
                        uniqueLinks.add(href);
                    }
                });
                return Array.from(uniqueLinks);
            });

            if (pageImageLinks.length === 0) {
                console.log(`   No images found on page ${currentPage}, stopping.\n`);
                hasMorePages = false;
            } else {
                console.log(`   Found ${pageImageLinks.length} images on page ${currentPage}`);
                pageImageLinks.forEach(link => allImageLinks.add(link));

                // Check if there's a next page button
                const nextButton = await page.locator('a[rel="next"], button:has-text("Next"), a:has-text("Next")').count();

                if (nextButton === 0) {
                    console.log(`   No "Next" button found, this is the last page.\n`);
                    hasMorePages = false;
                } else {
                    currentPage++;
                    await page.waitForTimeout(2000); // Delay between pages
                }
            }
        }

        const imageLinks = Array.from(allImageLinks);
        console.log(`\n✅ Total images found across all pages: ${imageLinks.length}\n`);

        if (imageLinks.length === 0) {
            console.log("No images found!");
            await browser.close();
            return;
        }

        // Create output directory using board title
        const sanitizedBoardTitle = sanitizeFilename(boardTitle || 'board-downloads');
        const outputDir = path.join(__dirname, 'images', sanitizedBoardTitle);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        console.log(`📁 Saving to: ${outputDir}\n`);

        let successCount = 0;
        let failCount = 0;
        const metadataRecords = [];

        // Process each image
        for (let i = 0; i < imageLinks.length; i++) {
            const imageUrl = imageLinks[i];
            const imageId = imageUrl.match(/\/image\/(\d+)/)?.[1] || 'unknown';

            console.log(`\n📥 [${i + 1}/${imageLinks.length}] Image ID: ${imageId}`);

            try {
                // Navigate to image page
                await page.goto(imageUrl, { waitUntil: 'networkidle' });
                await page.waitForTimeout(2000);

                // Dismiss any cookie consent modals that might block the download button
                await dismissCookieConsent(page);

                // Check if CC0
                const pageText = await page.textContent('body');
                const isCC0 = pageText.toLowerCase().includes('cc0') ||
                             pageText.toLowerCase().includes('public domain') ||
                             pageText.toLowerCase().includes('u.s. government');

                if (!isCC0) {
                    console.log(`      ⚠️  Not CC0 licensed, skipping`);
                    failCount++;
                    continue;
                }

                // Get title
                const title = await page.title();
                console.log(`      Title: ${title}`);

                // Extract metadata
                console.log(`      ⓘ Extracting metadata...`);
                const metadata = await extractMetadata(page, imageUrl, imageId);

                // Look for download button - try multiple selectors
                let downloadButton = null;

                // Method 1: Look for button with "Download" text
                downloadButton = await page.locator('button:has-text("Download")').first();
                if (await downloadButton.count() === 0) {
                    // Method 2: Look for link with download in href
                    downloadButton = await page.locator('a[href*="download"]').first();
                }
                if (await downloadButton.count() === 0) {
                    // Method 3: Look for any button with download class
                    downloadButton = await page.locator('[class*="download"]').first();
                }

                if (await downloadButton.count() > 0) {
                    console.log(`      ✓ Found download button`);

                    try {
                        // Set up download promise BEFORE clicking anything
                        const downloadPromise = page.waitForEvent('download', { timeout: 30000 });

                        // Click the download button once
                        await downloadButton.click();
                        console.log(`      ⓘ Waiting for download to start...`);

                        // Wait for download to start
                        const download = await downloadPromise;

                        // Get suggested filename and sanitize
                        const suggestedFilename = download.suggestedFilename();
                        const titlePart = sanitizeFilename(title.split('|')[0].trim());

                        // Include image ID in filename to prevent duplicates
                        const filename = `${imageId}_${titlePart}${path.extname(suggestedFilename)}`;
                        const filepath = path.join(outputDir, filename);

                        // Save the download
                        await download.saveAs(filepath);

                        console.log(`      ✓ Downloaded: ${filename}`);

                        // Add filename to metadata and save to records
                        metadata.filename = filename;
                        metadataRecords.push(metadata);

                        successCount++;
                    } catch (downloadError) {
                        console.log(`      ❌ Download failed: ${downloadError.message}`);
                        console.log(`      ⓘ Skipping this image and continuing...`);
                        failCount++;
                    }
                } else {
                    console.log(`      ❌ Could not find download button`);
                    failCount++;
                }

            } catch (err) {
                console.log(`      ❌ Error: ${err.message}`);
                failCount++;
            }

            // Delay between downloads
            await page.waitForTimeout(2000);
        }

        console.log(`\n✅ Complete: ${successCount} succeeded, ${failCount} failed`);

        // Write metadata to CSV
        if (metadataRecords.length > 0) {
            console.log(`\n📝 Writing metadata to CSV...`);
            try {
                const csvFilePath = path.join(outputDir, 'metadata.csv');
                const fields = ['filename', 'imageId', 'title', 'artist', 'license', 'description', 'tags', 'date', 'url'];
                const parser = new Parser({ fields });
                const csv = parser.parse(metadataRecords);
                fs.writeFileSync(csvFilePath, csv);
                console.log(`   ✓ Metadata saved to: ${csvFilePath}`);
            } catch (err) {
                console.log(`   ⚠️  Error writing CSV: ${err.message}`);
            }
        }

    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        await browser.close();
    }
}

main();
