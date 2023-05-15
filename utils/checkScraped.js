import { createClient } from "@supabase/supabase-js";
import * as dotenv from 'dotenv';
dotenv.config();
const privateKey = process.env.SUPABASE_PRIVATE_KEY;
if (!privateKey) {
    console.error("SUPABASE_PRIVATE_KEY not set in the environment");
    process.exit(1);
}

const url = process.env.SUPABASE_URL;
if (!url) {
    console.error("SUPABASE_URL not set in the environment");
    process.exit(1);
}

const supabaseClient = createClient(url, privateKey);
export const checkScraped = async (client) => {
    let { data, error } = await supabaseClient.from('scraped').select("*").eq('client', client);
    return data.length === 1;
};

export const insertScraped = async (client) => {
    let { data, error } = await supabaseClient.from('scraped').insert([{ client: `${client}` }]);
    return;
};