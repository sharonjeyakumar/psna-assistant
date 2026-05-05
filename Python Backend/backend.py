from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from contextlib import asynccontextmanager

from langchain_community.document_loaders import TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_huggingface.embeddings import HuggingFaceEmbeddings

import os
import json

from google import genai
from dotenv import load_dotenv

load_dotenv()

# Global references — populated after port is bound
vectorStore = None
embedding_model = None
client = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Everything inside here runs AFTER FastAPI binds to the port,
    so Render detects the port immediately and doesn't time out.
    """
    global vectorStore, embedding_model, client

    print("Loading embedding model...")
    embedding_model = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

    print("Loading vector store...")
    if os.path.exists("vectordbs") and len(os.listdir("vectordbs")) >= 1:
        vectorStore = FAISS.load_local(
            os.path.join("vectordbs", os.listdir("vectordbs")[0]),
            embedding_model,
            allow_dangerous_deserialization=True
        )
    else:
        docs = []
        for i in os.listdir('files'):
            if i.endswith(".txt"):
                filepath = os.path.join('files', i)
                loader = TextLoader(filepath, encoding="utf-8")
                docs.extend(loader.load())

        splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
        chunks = splitter.split_documents(docs)

        vectorStore = FAISS.from_documents(chunks, embedding_model)
        vectorStore.save_local('vectordbs/first_db')

    print("Initialising Gemini client...")
    client = genai.Client()

    print("All models loaded. Ready to serve requests.")
    yield
    # Cleanup (if needed) goes here


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_headers=['*'],
    allow_credentials=False,
    allow_methods=['*']
)


class BasicRequest(BaseModel):
    prompt: str


link_format = "$%FILE_LINK:{\"type\": \"image/file\", \"link\":\"https://link.to.image/\"}"


@app.get("/")
def health_check():
    return {"status": "ok"}


@app.post('/api/respond')
def send_response(req: BasicRequest):
    chatLogs = req.prompt
    chatLogsJSON = json.loads(chatLogs)
    prompt = chatLogsJSON[-1]["USER"]
    print(prompt)
    retrieved_docs = vectorStore.similarity_search(prompt, k=3)
    context = "\n\n".join([doc.page_content for doc in retrieved_docs])
    print(context)

    custom_prompt = f"""You are a Cheerful Assistant from PSNA College of Engineering and Technology trying to help people by answering their queries.
    You are to act like a real friendly person, and answer the user query with what you know as context. **Keep your answers to a maximum of 3 sentences**. If there are any links involved, like a link of a file or image, give that link in the following JSON format with the prefix code attached, AT THE VERY END OF THE REPLY.\n\n
    **Format for links**\n
    If there seems to be any links in the context, form that link in a JSON String with following 2 attributes.\n 
    1. "type" -> if it an image link, then type should be "image", else it should be "file"\n
    2. "link" -> the link that you found. \n
    Attach this json string AT THE VERY END OF YOUR REPLY with this prefix "$%FILE_LINK:"
    **THERE SHOULD NOT BE ANY TEXT AFTER YOU GAVE THE IMAGE AND YOU CAN ONLY REPLY ONE IMAGE PER QUERY**\n
    **If there is no image or file links involved for the answer, you can ignore the json string all together, just give the text reply**
What you know about this query:
{context}

User Query:
{prompt}
"""

    response = client.models.generate_content(
        model="gemini-3-flash-preview", contents=custom_prompt
    )

    data = response.text

    return {
        "response": data,
        "done": True
    }