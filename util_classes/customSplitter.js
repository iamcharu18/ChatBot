import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Document } from "langchain/document";

export class CustomRecursiveCharacterTextSplitter extends RecursiveCharacterTextSplitter {
    async createDocuments(texts, metadatas = []) {
        if (!Array.isArray(texts)) {
            throw new Error('Expected "texts" to be an array');
        }
        if (metadatas && !Array.isArray(metadatas)) {
            throw new Error('Expected "metadatas" to be an array');
        }

        const _metadatas = metadatas.length > 0 ? metadatas : new Array(texts.length).fill({});
        const documents = new Array();

        for (let i = 0; i < texts.length; i++) {
            const text = texts[i];
            let lineCounterIndex = 1;
            let prevChunk = null;

            for (const chunk of await this.splitText(text)) {
                let numberOfIntermediateNewLines = 0;
                if (prevChunk) {
                    const indexChunk = text.indexOf(chunk);
                    const indexEndPrevChunk = text.indexOf(prevChunk) + prevChunk.length;
                    const removedNewlinesFromSplittingText = text.slice(
                        indexEndPrevChunk,
                        indexChunk
                    );
                    numberOfIntermediateNewLines = (
                        removedNewlinesFromSplittingText.match(/\n/g) || []
                    ).length;
                }

                lineCounterIndex += numberOfIntermediateNewLines;
                const newLinesCount = (chunk.match(/\n/g) || []).length;
                lineCounterIndex += newLinesCount;
                prevChunk = chunk;

                // Using _metadatas[i] instead of metadataWithLinesNumber
                documents.push(
                    new Document({
                        pageContent: chunk,
                        metadata: _metadatas[i],
                    })
                );
            }
        }
        return documents;
    }
}