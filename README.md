# PSNA Assisstant

### How to set up PSNA Assisstant - DEV MODE

#### Prequisites

- Have to have installed Ollama
- Need Python
- Need Node js

#### Step By step Guide to install

1. Download Ollama from [this link](https://ollama.com/download)
2. Install [Python](https://www.python.org/downloads/) and [Node.js](https://nodejs.org/en/download) is you haven't already
3. Clone this repo.
   1. Go to your desired Directory / Folder in your machine
   2. Open up terminal / command prompt
   3. Type the following and hit enter
      `git clone https://github.com/sharonjeyakumar/psna-assistant` <br>

4. Now in the terminal, run this Ollama command <br>
   `ollama run mistral`

   > This will install an Open Source AI model onto your system, the size is about 4 gigabytes, so it might take a while

5. After Ollama is running, we have to run the Front End server, and the Back End server.
6. In the Directory / Folder of `psna-assistant`, run

   `npm install` <br>
   `npm run dev` <br>

   > This should get the front end server running.

7. Now, go to the Directory of `Python Backend` in the Terminal, using `cd` command. Run the following while in that directory.

   `pip install -r requirements.txt` <br>
   `uvicorn backend:app` <br>

   > Sometimes this doesnt work. If thats the case, run these commands.
   - If this command `pip install -r requirements.txt` doesnt work, try this
     - `python -m pip install -r requirements.txt` or `python3 -m pip install -r requirements.txt` <br>

   - If this command `uvicorn backend:app` doesnt work, try this
     - `python -m uvicorn backend:app` <br>

       > NOTE: Running backend takes a bit of Time. So please be patient, until you see this screen
       > ![Backend Loaded Successful](/README%20Images/Backend_Success.png)
