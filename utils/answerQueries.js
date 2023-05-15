import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { OpenAI } from "langchain/llms/openai";
import { loadQAStuffChain, loadQAMapReduceChain, loadQARefineChain } from "langchain/chains";
import { establishDBConnection } from "./dbCon.js";

const { customStore } = establishDBConnection();

import * as dotenv from 'dotenv';
dotenv.config();

export const answerQuery = async (query, clientName) => {
    try {
        const embeddings = new OpenAIEmbeddings();
        const res = await embeddings.embedQuery(query);
        const result = (await customStore.similaritySearchVectorWithScore(res, 3, clientName)).flat();
        // result = result.flat();
        const llm = new OpenAI();
        const chainA = loadQAStuffChain(llm);
        // const chainB = loadQAMapReduceChain(llm);
        // const chainC = loadQARefineChain(llm);

        const resA = await chainA.call({
            input_documents: result,
            question: query,
        });

        // const resB = await chainB.call({
        //     input_documents: result,
        //     question: query,
        // });

        // const resC = await chainC.call({
        //     input_documents: result,
        //     question: query,
        // });

        // console.log(resA);
        // console.log(resB);
        // console.log(resC);

        return resA;
    } catch (error) {
        console.error(`Error processing the query: ${error}`);
        throw error;
    }
};
