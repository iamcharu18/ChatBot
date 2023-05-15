import { CustomSupabaseVectorStore } from "../util_classes/customSupabase.js";
import { createClient } from "@supabase/supabase-js";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";

import * as dotenv from 'dotenv';
dotenv.config();

export const establishDBConnection = () => {
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

    const supabaseArgs = {
        client: supabaseClient,
        tableName: "documents",
        queryName: "match_documents",
    };

    const embeddings = new OpenAIEmbeddings();
    const customStore = new CustomSupabaseVectorStore(embeddings, supabaseArgs);
    return { supabaseClient, customStore };
};
