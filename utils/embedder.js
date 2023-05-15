import { Document } from "langchain/document";
import { CustomRecursiveCharacterTextSplitter } from '../util_classes/customSplitter.js';
import { establishDBConnection } from "./dbCon.js";

const { customStore } = establishDBConnection();

export const embedDocumentsWithClient = async (documents, clientID) => {
    const splittedDocuments = await Promise.all(
        documents.map((row) => {
            const splitter = new CustomRecursiveCharacterTextSplitter({
                chunkSize: 1500,
                chunkOverlap: 80,
            });
            const docs = splitter.splitDocuments([
                new Document({
                    pageContent: row.pageContent,
                    metadata: {
                        source: row.metadata.source,
                    },
                }),
            ]);
            return docs;
        })
    );

    const splittedDocumentsFlattened = splittedDocuments.flat();
    customStore.addDocuments(splittedDocumentsFlattened, clientID);

    return true;
};
