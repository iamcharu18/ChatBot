import { Document } from "langchain/document";
import fs from 'fs';
import puppeteer from 'puppeteer';
import { performance } from "perf_hooks";

const MAX_CONCURRENT_REQUESTS = 5;
const MAX_RETRIES = 3;
const TIMEOUT = 30000;
const DELAY_BETWEEN_REQUESTS = 1;

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrapeUrls(browser, pages, url, mainDomain, isHTTPS) {
    const visitedUrls = new Set();
    let count = 0;
    let urlCount = 0;
    const pageDocuments = [];
    const urlQueue = [url];

    async function visitUrl(url, pageIndex, retryCount = 0) {
        const page = pages[pageIndex];

        if (visitedUrls.has(url)) {
            return;
        }

        try {
            const beforeUrl = url;
            await page.goto(url, { waitUntil: "domcontentloaded", timeout: TIMEOUT });
            count += 1;
            url = page.url();
            if (beforeUrl != url) {
                // console.log(beforeUrl, url);
                visitedUrls.add(beforeUrl);
            }
            if (visitedUrls.has(url)) {
                return;
            }
            if (count % 5 == 0) {
                let t2 = performance.now();
                console.log(`Completed ${count} urls out of ${urlCount} in ${t2 - t0}ms - Remaining ${urlCount - count}`);
            }
            visitedUrls.add(url);
            isHTTPS = url.slice(0, 5) === "https";
        } catch (error) {
            console.log(`Error visiting ${url}: ${error.message}`);
            if (retryCount < MAX_RETRIES) {
                await delay(DELAY_BETWEEN_REQUESTS);
                await visitUrl(url, pageIndex, retryCount + 1);
            }
            return;
        }

        await page.evaluate(() => {
            const hiddenElements = Array.from(document.querySelectorAll('*')).filter(element => {
                const styles = getComputedStyle(element);
                return styles.visibility === 'hidden' || styles.display === 'none';
            });

            // console.log(hiddenElements);


            // console.log(hiddenElements);
            hiddenElements.forEach((element) => {
                element.style.visibility = 'visible';
            });
        });

        const { textContent, urls } = await page.evaluate(() => {
            const urls = Array.from(document.querySelectorAll("a[href]"))
                .map(a => a.href.split("#")[0].split("?")[0])
                .filter(url => url.startsWith("http") || url.startsWith("/"));
            return {
                textContent: document.body.innerText.trim(),
                urls,
                // .replace(/\s+/g, ' ')
            };
        });
        // console.log(textContent);
        const doc = new Document({ pageContent: textContent, metadata: { source: url } });
        pageDocuments.push(doc);
        urls.forEach(u => {
            if (!visitedUrls.has(u)) {
                const domain = new URL(u).hostname.replace("www.", "");
                if (domain.includes(mainDomain)) {
                    if (u.startsWith("https") || !isHTTPS) {
                        const fileExtension = u.split(".").pop().toLowerCase();
                        if (!["jpg", "jpeg", "png", "pdf", "docx"].includes(fileExtension)) {
                            if (!urlQueue.includes(u)) {
                                urlQueue.push(u);
                                urlCount += 1;
                            }
                        }
                    }
                    if (u.startsWith("http") && !u.startsWith("https") && isHTTPS) {
                        u = "https" + u.slice(4);
                        const fileExtension = u.split(".").pop().toLowerCase();
                        if (!["jpg", "jpeg", "png", "pdf", "docx"].includes(fileExtension)) {
                            if (!urlQueue.includes(u)) {
                                urlQueue.push(u);
                                urlCount += 1;
                            }
                        }
                    }
                }
            }
        });
    }
    const t0 = performance.now();
    while (urlQueue.length > 0) {
        const currentUrls = urlQueue.splice(0, MAX_CONCURRENT_REQUESTS);
        await Promise.all(
            currentUrls.map(async (url, index) => {
                await delay(DELAY_BETWEEN_REQUESTS);
                return visitUrl(url, index);
            })
        );
    }
    const t1 = performance.now();

    console.log(`Scraped ${pageDocuments.length} documents in ${t1 - t0}ms`);
    // console.log(visitedUrls);

    return pageDocuments;
}

export const webScraper = async (url) => {
    const browser = await puppeteer.launch({ headless: "new", args: ['--ignore-certificate-errors'] });
    const pages = await Promise.all([...Array(MAX_CONCURRENT_REQUESTS)].map(() => browser.newPage()));
    for (const page of pages) {
        await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36');
        await page.setCacheEnabled(false);
    }

    const mainDomain = new URL(url).hostname.replace("www.", "");
    let isHTTPS = url.slice(0, 5) === "https";
    const pageDocuments = await scrapeUrls(browser, pages, url, mainDomain, isHTTPS);


    await browser.close();
    return pageDocuments;
};