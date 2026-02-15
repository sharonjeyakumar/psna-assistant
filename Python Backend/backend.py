from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from langchain_community.document_loaders import TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_huggingface.embeddings import HuggingFaceEmbeddings

import os
import requests
import json

docs = []
for i in os.listdir('files'):
    if i.endswith(".txt"):
        filepath = os.path.join('files', i)
        loader = TextLoader(filepath, encoding="utf-8")
        docs.extend(loader.load())

splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
chunks = splitter.split_documents(docs)

embedding_model = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

vectorStore = FAISS.from_documents(chunks,embedding_model)
vectorStore.save_local('first_db')


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_headers=['*'],
    allow_credentials=False,
    allow_methods=['*']
)

class BasicRequest(BaseModel):
    prompt : str



@app.post('/api/respond')
def send_response(req: BasicRequest):
    prompt = req.prompt

    retrieved_docs = vectorStore.similarity_search(prompt, k=3)
    context = "\n\n".join([doc.page_content for doc in retrieved_docs])

    custom_prompt = f"""You are a Cheerful Assistant trying to help people by answering their queries.

What you know about this query:
{context}

User Query:
{prompt}
"""

    response = requests.post(
        "http://localhost:11434/api/generate",
        headers={"Content-Type": "application/json"},
        json={
            "model": "mistral",
            "prompt": custom_prompt,
            "stream": False 
        }
    )

    data = response.json()

    return {
        "response": data.get("response", ""),
        "done": data.get("done", True)
    }