import { SupabaseVectorStore } from "langchain/vectorstores/supabase";
import { Document } from "langchain/document";

export class CustomSupabaseVectorStore extends SupabaseVectorStore {
    // constructor(embeddings, args) {
    //     super(embeddings, args);
    //     this.client = args.client; // Assign the client property from args
    // }

    async addDocuments(documents, clientID) {
        const texts = documents.map(({ pageContent }) => pageContent);
        return this.addVectors(
            await this.embeddings.embedDocuments(texts),
            documents,
            clientID
        );
    }

    async addVectors(vectors, documents, clientID) {
        const rows = vectors.map((embedding, idx) => ({
            pageContent: documents[idx].pageContent,
            embeddings: embedding,
            metadata: documents[idx].metadata,
            client: clientID,
        }));

        const chunkSize = 500;
        for (let i = 0; i < rows.length; i += chunkSize) {
            const chunk = rows.slice(i, i + chunkSize);

            const { data, error } = await this.client.from(this.tableName).insert(chunk);
            if (error) {
                throw new Error(
                    `Error inserting: ${error.message} ${error.status} ${error.statusText}`
                );
            }
        }
    }

    async similaritySearchVectorWithScore(query, k, client) {
        const matchDocumentsParams = {
            query_embedding: query,
            match_count: k,
            client,
        };

        const { data: searches, error } = await this.client.rpc(
            this.queryName,
            matchDocumentsParams
        );

        if (error) {
            throw new Error(
                `Error searching for documents: ${error.code} ${error.message} ${error.details}`
            );
        }

        const result = searches.map((resp) => [
            new Document({
                metadata: resp.metadata,
                pageContent: resp.content,
            }),
            resp.similarity,
        ]);
        return result;
    }
}
