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

from google import genai
from dotenv import load_dotenv

load_dotenv()

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

link_format = "$%FILE_LINK:{\"type\": \"image/file\", \"link\":\"https://link.to.image/\"}"

client = genai.Client()

ai_resp = client.models.generate_content(
    model="gemma-4-31b-it", contents="Explain how AI works in a few words"
)
print(ai_resp.text)


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

    # response = requests.post(
    #     "http://localhost:11434/api/generate",
    #     headers={"Content-Type": "application/json"},
    #     json={
    #         "model": "mistral",
    #         "prompt": custom_prompt,
    #         "stream": False 
    #     }
    # )

    response = client.models.generate_content(
    model="gemini-3-flash-preview", contents=custom_prompt
    )

    data = response.text

    return {
        "response": data,
        "done": True
    }