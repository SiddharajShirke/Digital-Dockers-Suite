const asyncHandler = require('express-async-handler');
const puppeteer = require('puppeteer');
const PptxGenJS = require('pptxgenjs');
const axios = require('axios');
const path = require('path');
const fs = require('fs').promises;

// N8N Webhook URL for PPT generation (returns HTML from Gemini)
// Using production webhook URL
const N8N_PPT_WEBHOOK_URL = process.env.N8N_PPT_WEBHOOK_URL || 'https://rohan-2409.app.n8n.cloud/webhook/ppt-generator';

// Singleton browser instance for better performance
let browserInstance = null;

/**
 * Get or create a browser instance
 * Reuses the same browser across requests for better performance
 */
const getBrowser = async () => {
    if (!browserInstance || !browserInstance.isConnected()) {
        console.log('Launching new Puppeteer browser instance...');
        browserInstance = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--window-size=1920,1080'
            ]
        });
    }
    return browserInstance;
};

/**
 * Gracefully close browser on process exit
 */
process.on('SIGINT', async () => {
    if (browserInstance) {
        await browserInstance.close();
    }
    process.exit();
});

process.on('SIGTERM', async () => {
    if (browserInstance) {
        await browserInstance.close();
    }
    process.exit();
});

/**
 * Generates ISO 8601 timestamp with timezone offset
 */
const getISOWithTimezone = () => {
    const now = new Date();
    const offset = -now.getTimezoneOffset();
    const sign = offset >= 0 ? '+' : '-';
    const hours = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0');
    const minutes = String(Math.abs(offset) % 60).padStart(2, '0');
    const isoBase = now.toISOString().slice(0, -1);
    return `${isoBase}${sign}${hours}:${minutes}`;
};

/**
 * @desc    Generate PPTX from presentation data
 * @route   POST /api/ppt/generate
 * @access  Private
 */
const generatePptx = asyncHandler(async (req, res) => {
    const { topic, targetAudience, keyPoints, colorScheme } = req.body;

    // Validate required fields
    if (!topic || !targetAudience || !keyPoints || !colorScheme) {
        res.status(400);
        throw new Error('All fields are required: topic, targetAudience, keyPoints, colorScheme');
    }

    console.log(`Generating PPTX for topic: "${topic}"`);

    let page = null;
    const tempFilePath = path.join(__dirname, '..', 'temp', `presentation_${Date.now()}.pptx`);

    try {
        // Step 1: Call n8n webhook to get HTML from Gemini
        console.log('Calling n8n webhook for HTML generation...');
        const n8nPayload = [{
            "Topic": topic,
            "Target Audience": targetAudience,
            "Key Points to Cover": keyPoints,
            "Preferred Color Scheme": colorScheme,
            "submittedAt": getISOWithTimezone(),
            "formMode": "production"
        }];

        const n8nResponse = await axios.post(N8N_PPT_WEBHOOK_URL, n8nPayload, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 120000 // 2 minute timeout for Gemini AI
        });

        // Log response structure for debugging
        console.log('n8n response type:', typeof n8nResponse.data);
        console.log('n8n response is array:', Array.isArray(n8nResponse.data));
        if (typeof n8nResponse.data === 'object' && !Array.isArray(n8nResponse.data)) {
            console.log('n8n response keys:', Object.keys(n8nResponse.data));
        }
        if (Array.isArray(n8nResponse.data) && n8nResponse.data.length > 0) {
            console.log('First array item keys:', Object.keys(n8nResponse.data[0] || {}));
        }

        // Extract HTML content from n8n response
        let htmlContent = '';
        if (typeof n8nResponse.data === 'string') {
            htmlContent = n8nResponse.data;
        } else if (Array.isArray(n8nResponse.data) && n8nResponse.data.length > 0) {
            // n8n HTML node returns array with 'data' property containing HTML
            const firstItem = n8nResponse.data[0];
            if (firstItem.data) {
                htmlContent = firstItem.data;
            } else if (firstItem.html) {
                htmlContent = firstItem.html;
            } else if (firstItem.body) {
                htmlContent = firstItem.body;
            } else if (typeof firstItem === 'string') {
                htmlContent = firstItem;
            } else {
                // Look for any property containing HTML
                for (const key of Object.keys(firstItem)) {
                    const value = firstItem[key];
                    if (typeof value === 'string' && value.includes('<!DOCTYPE') || value.includes('<html')) {
                        htmlContent = value;
                        console.log(`Found HTML in property: ${key}`);
                        break;
                    }
                }
            }
        } else if (n8nResponse.data?.html) {
            htmlContent = n8nResponse.data.html;
        } else if (n8nResponse.data?.data) {
            htmlContent = n8nResponse.data.data;
        }

        // If still no HTML, log the full response and throw error
        if (!htmlContent || htmlContent.length < 100) {
            console.error('n8n response data:', JSON.stringify(n8nResponse.data, null, 2).substring(0, 1000));
            throw new Error('No valid HTML content received from n8n webhook. Check n8n response structure.');
        }

        console.log(`Received HTML content (${htmlContent.length} chars)`);

        // Step 2: Launch Puppeteer and render HTML
        console.log('Launching Puppeteer to render HTML...');
        const browser = await getBrowser();
        page = await browser.newPage();

        // Set viewport to 16:9 aspect ratio (1920x1080)
        await page.setViewport({
            width: 1920,
            height: 1080,
            deviceScaleFactor: 2 // High quality screenshots
        });

        // Load HTML content
        await page.setContent(htmlContent, {
            waitUntil: ['networkidle0', 'domcontentloaded'],
            timeout: 30000
        });

        // Wait for fonts and animations to load
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Step 3: Detect and capture slides
        console.log('Detecting slides in HTML...');

        // Find all slide elements using multiple selectors
        const slideSelectors = ['.slide', 'section', '[class*="slide"]', '.presentation-slide'];
        let slides = [];

        for (const selector of slideSelectors) {
            const elements = await page.$$(selector);
            if (elements.length > 0) {
                slides = elements;
                console.log(`Found ${elements.length} slides using selector: "${selector}"`);
                break;
            }
        }

        // Fallback: if no slides found, capture the entire page as one slide
        if (slides.length === 0) {
            console.log('No slide elements found, capturing entire page as single slide');
            slides = [await page.$('body')];
        }

        // Step 4: Capture screenshots of each slide
        console.log(`Capturing screenshots of ${slides.length} slides...`);
        const slideScreenshots = [];

        for (let i = 0; i < slides.length; i++) {

            // Make sure only this slide is visible (for multi-slide presentations)
            await page.evaluate((slideIndex, selectors) => {
                // Try to hide all other slides and show only the current one
                for (const selector of selectors) {
                    const allSlides = document.querySelectorAll(selector);
                    if (allSlides.length > 1) {
                        allSlides.forEach((s, idx) => {
                            s.style.display = idx === slideIndex ? 'flex' : 'none';
                        });
                        break;
                    }
                }
            }, i, slideSelectors);

            await new Promise(resolve => setTimeout(resolve, 300)); // Wait for display change

            // Take screenshot
            const screenshot = await page.screenshot({
                type: 'png',
                clip: {
                    x: 0,
                    y: 0,
                    width: 1920,
                    height: 1080
                }
            });

            slideScreenshots.push(screenshot);
            console.log(`Captured slide ${i + 1}/${slides.length}`);
        }

        // Close the page (but keep browser for reuse)
        await page.close();
        page = null;

        // Step 5: Create PPTX with pptxgenjs
        console.log('Creating PPTX file...');
        const pptx = new PptxGenJS();

        // Set presentation properties
        pptx.layout = 'LAYOUT_WIDE'; // 16:9 format
        pptx.title = topic;
        pptx.subject = `Presentation for ${targetAudience}`;
        pptx.author = 'Digital Dockers Suite';

        // Add each screenshot as a slide
        for (let i = 0; i < slideScreenshots.length; i++) {
            const slide = pptx.addSlide();

            // Convert buffer to base64 for pptxgenjs
            const base64Image = slideScreenshots[i].toString('base64');

            // Add image as full-bleed background
            slide.addImage({
                data: `data:image/png;base64,${base64Image}`,
                x: 0,
                y: 0,
                w: '100%',
                h: '100%'
            });
        }

        // Ensure temp directory exists
        const tempDir = path.join(__dirname, '..', 'temp');
        try {
            await fs.mkdir(tempDir, { recursive: true });
        } catch (_err) {
            // Directory might already exist
        }

        // Save PPTX to temp file
        await pptx.writeFile({ fileName: tempFilePath });
        console.log(`PPTX saved to: ${tempFilePath}`);

        // Step 6: Send file to client
        res.download(tempFilePath, `${topic.replace(/[^a-zA-Z0-9]/g, '_')}_presentation.pptx`, async (err) => {
            // Clean up temp file after download (or on error)
            try {
                await fs.unlink(tempFilePath);
                console.log('Temp file cleaned up');
            } catch (unlinkErr) {
                console.error('Failed to clean up temp file:', unlinkErr.message);
            }

            if (err) {
                console.error('Download error:', err);
            }
        });

    } catch (error) {
        // Clean up on error
        if (page) {
            try {
                await page.close();
            } catch (closeErr) {
                console.error('Failed to close page:', closeErr.message);
            }
        }

        // Try to clean up temp file if it exists
        try {
            await fs.unlink(tempFilePath);
        } catch (unlinkErr) {
            // File might not exist yet
        }

        console.error('PPTX generation error:', error.message);
        res.status(500);
        throw new Error(`Failed to generate PPTX: ${error.message}`);
    }
});

/**
 * @desc    Health check for PPT service
 * @route   GET /api/ppt/health
 * @access  Public
 */
const healthCheck = asyncHandler(async (req, res) => {
    res.json({
        status: 'ok',
        service: 'ppt-generator',
        browserConnected: browserInstance ? browserInstance.isConnected() : false
    });
});

module.exports = {
    generatePptx,
    healthCheck
};
