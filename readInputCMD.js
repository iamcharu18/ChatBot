import readline from 'readline';
import { webScraper } from "./utils/webScraper.js";
import { embedDocumentsWithClient } from './utils/embedder.js';
import { answerQuery } from './utils/answerQueries.js';
import { checkScraped, insertScraped } from './utils/checkScraped.js';

import * as dotenv from 'dotenv';
dotenv.config();

let client;

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const askQuestion = async () => {
    rl.question('Enter your question (or "exit" to quit): ', async (input) => {
        if (input.trim().toLowerCase() === 'exit') {
            rl.close();
        } else {
            console.log(await answerQuery(input.trim(), client));
            askQuestion();
        }
    });
};

const validateUrl = (url) => {
    try {
        new URL(url);
        return true;
    } catch (_) {
        return false;
    }
}

rl.question('Enter the website you want to chat with: ', async (input) => {
    input = input.trim();
    if (!validateUrl(input)) {
        console.log("Invalid URL, please try again");
        return;
    }
    client = new URL(input).hostname.replace("www.", "");
    const res = await checkScraped(client);
    // console.log(res);
    if (res) {
        askQuestion();
    } else {
        const scraped = await webScraper(input);
        await embedDocumentsWithClient(scraped, client);
        await insertScraped(client);
        askQuestion();
    }
});
