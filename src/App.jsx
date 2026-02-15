import { useState, useRef, useEffect } from "react";
import "./App.css";
import Fuse from "fuse.js";
const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

/////////////////////// OLD LOGIC
const knowledgeBase = [
  { question: "hello", answer: "Hello! How can I help you today?" },
  { question: "hi", answer: "Hello! How can I help you today?" },
  {
    question: "what is your name",
    answer: "I'm PSNA Assistant, here to help you.",
  },
  { question: "who are you", answer: "I'm PSNA Assistant, here to help you." },
  {
    question: "how are you",
    answer: "I'm just a bot, but I'm doing great! How about you?",
  },
  { question: "help", answer: "Sure! Tell me what you need help with." },
];

const teachers = [
  {
    title: "Dr.",
    name: "Anita",
    dept: "CSE",
    cabin: "Block A - Room 203",
    contact: "9876543210",
    mail: "anita@psnacollege.edu",
  },
  {
    title: "Mr.",
    name: "Ramesh",
    dept: "ECE",
    cabin: "Block B - Room 105",
    contact: "9123456780",
    mail: "ramesh@psnacollege.edu",
  },
  {
    title: "Ms.",
    name: "Kavitha",
    dept: "IT",
    cabin: "Block C - Room 310",
    contact: "9098765432",
    mail: "kavitha@psnacollege.edu",
  },
];

const fuse = new Fuse(knowledgeBase, {
  keys: ["question"],
  includeScore: true,
  threshold: 0.4,
});

const fuseTeachers = new Fuse(teachers, {
  keys: ["name", "dept"], // You can add "cabin" or "mail" if needed
  includeScore: true,
  threshold: 0.4,
});

////////////////////////// END of OLD LOGIC

function App() {
  // CUTTOFF LOGIC
  const [cutoffData, setCutoffData] = useState({
    maths: "",
    physics: "",
    chemistry: "",
    result: null,
  });

  const [mode, setMode] = useState("chat");

  // Important variables that govern thinking animation and typing animation
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [isThinking, setIsThinking] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [lastTeacher, setLastTeacher] = useState(null);

  const inputRef = useRef(null);
  const outputAreaRef = useRef(null);

  const scrollToBottom = () => {
    outputAreaRef.current?.scrollTo({
      top: outputAreaRef.current.scrollHeight,
      behavior: "smooth",
    });
  };

  const reply = async (userMessage) => {
    //if the mode is anything other than chat it will not send the normal chat bot reply
    if (mode !== "chat") return;

    //CHANGE FROM HERE TILL
    let fullResponse = "";
    const lowerMsg = userMessage.toLowerCase();

    const teacherKeywords = [
      "cabin",
      "contact",
      "mail",
      "email",
      "dept",
      "department",
      "all",
      "details",
      "whole",
    ];
    const isTeacherQuery = teacherKeywords.some((kw) => lowerMsg.includes(kw));
    let teacher = teachers.find((t) => lowerMsg.includes(t.name.toLowerCase()));

    if (!teacher && isTeacherQuery && lastTeacher) teacher = lastTeacher;

    if (teacher) {
      setLastTeacher(teacher);
      const parts = [];
      if (lowerMsg.includes("cabin")) parts.push(`Cabin: ${teacher.cabin}`);
      if (lowerMsg.includes("contact"))
        parts.push(`Contact: ${teacher.contact}`);
      if (lowerMsg.includes("mail") || lowerMsg.includes("email"))
        parts.push(`Email: ${teacher.mail}`);
      if (lowerMsg.includes("dept") || lowerMsg.includes("department"))
        parts.push(`Department: ${teacher.dept}`);

      if (parts.length > 0)
        fullResponse =
          `${teacher.title} ${teacher.name}'s details:\n` + parts.join("\n");
      else if (
        lowerMsg.includes("all") ||
        lowerMsg.includes("details") ||
        lowerMsg.includes("whole")
      ) {
        fullResponse =
          `${teacher.title} ${teacher.name} (${teacher.dept})\n` +
          `Cabin: ${teacher.cabin}\n` +
          `Contact: ${teacher.contact}\n` +
          `Email: ${teacher.mail}`;
      } else {
        fullResponse = `${teacher.title} ${teacher.name} is a Faculty member of PSNA College. What do you want to know? (cabin, contact, mail, dept, or all details)`;
      }
    } else {
      const results = fuse.search(userMessage);
      fullResponse =
        results.length > 0
          ? results[0].item.answer
          : "I'm not sure I understand. Could you rephrase?";
    }

    let apiReponse = await fetch("http://localhost:5173/api/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: userMessage }),
    });
    fullResponse = (await apiReponse.json()).response;
    console.log(fullResponse);
    // Add AI message with empty text first
    const messageObj = { sender: "ai", text: fullResponse, revealedLength: 0 };
    setMessages((prev) => [...prev, messageObj]);

    //TIL HERE////////////////////////////////////////

    // Show thinking indicator for 700ms before typing
    setTimeout(() => {
      setIsThinking(false);
      setIsTyping(true);

      let index = 0;
      const interval = setInterval(() => {
        index++;
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1].revealedLength = index;
          return updated;
        });
        if (index >= fullResponse.length) {
          clearInterval(interval);
          setIsTyping(false);
        }
      }, 25);
    }, 0);

    // End of Reply
  };

  const handleSendClick = async () => {
    if (mode !== "chat") return;
    if (isThinking || isTyping || message.trim() === "") return;

    const userMessage = message;
    setMessages((prev) => [...prev, { sender: "user", text: message }]);
    setMessage("");
    // THE THINKING LOGIC ALWAYS DO THIS BEFORE APPENDING THE DIV
    setIsThinking(true);
    await reply(userMessage);

    setTimeout(() => inputRef.current?.blur(), 100);

    const isMobile = /Mobi|Android/i.test(navigator.userAgent);
    if (!isMobile) setTimeout(() => inputRef.current?.focus(), 1000);
  };

  const handleResetClick = () => window.location.reload();

  const checkOverflowAndScroll = () => {
    const el = outputAreaRef.current;
    if (el) {
      const isOverflow = el.scrollHeight > el.clientHeight;
      const scrollTop = el.scrollTop;
      const scrollHeight = el.scrollHeight - el.clientHeight;
      const scrollPercent = scrollHeight === 0 ? 1 : scrollTop / scrollHeight;
      setHasOverflow(isOverflow);
      setIsNearBottom(scrollPercent > 0.9);
    }
  };

  useEffect(() => {
    if (!isMobile) {
      inputRef.current?.focus();
    }

    // This make sure that the input is focused when keyboard keys are pressed
    const handleKeyDown = (e) => {
      if (
        document.activeElement &&
        outputAreaRef.current?.contains(document.activeElement)
      )
        return;
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", handleKeyDown);

    // This scrolls to the bottom when new div is added
    const outputEl = outputAreaRef.current;
    outputEl?.addEventListener("scroll", checkOverflowAndScroll);

    const handleResize = () => {
      setTimeout(() => scrollToBottom(), 100);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      outputEl?.removeEventListener("scroll", checkOverflowAndScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    checkOverflowAndScroll();
    scrollToBottom();
  }, [messages, isTyping, isThinking]);

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSendClick();
    }
  };

  // CUTTOFF CALCULATOR
  const handleCutoffClick = () => {
    setMode("cutoff");
    setMessages((prev) => [...prev, { sender: "widget", type: "cutoff" }]);
  };

  const calculateCutoff = () => {
    const m = parseFloat(cutoffData.maths);
    const p = parseFloat(cutoffData.physics);
    const c = parseFloat(cutoffData.chemistry);

    if (isNaN(m) || isNaN(p) || isNaN(c)) {
      alert("Please enter all three marks");
      return;
    }

    const cutoff = m + p / 2 + c / 2;

    setCutoffData((prev) => ({
      ...prev,
      result: cutoff.toFixed(2),
    }));
  };

  return (
    <div className={`page ${messages.length > 0 ? "hideAfter" : ""}`}>
      <div className="textArea">
        <div
          className={`outputArea ${hasOverflow ? "hasOverflow" : ""}`}
          ref={outputAreaRef}
        >
          {/* CUTTOFF DIV */}
          {messages.map((msg, index) => {
            if (msg.sender === "widget" && msg.type === "cutoff") {
              return (
                <div key={index} className="outputMessage cutoffWidget">
                  <h3>🎯 Cutoff Calculator</h3>
                  <p>Enter your three subject marks</p>

                  <div className="cutoffInputs">
                    <label>
                      Mathematics
                      <input
                        type="number"
                        value={cutoffData.maths}
                        onChange={(e) =>
                          setCutoffData((prev) => ({
                            ...prev,
                            maths: e.target.value,
                          }))
                        }
                        placeholder="Enter Maths mark"
                        min="0"
                        max="100"
                        required
                      />
                    </label>

                    <label>
                      Physics
                      <input
                        type="number"
                        value={cutoffData.physics}
                        onChange={(e) =>
                          setCutoffData((prev) => ({
                            ...prev,
                            physics: e.target.value,
                          }))
                        }
                        placeholder="Enter Physics mark"
                        min="0"
                        max="100"
                        required
                      />
                    </label>

                    <label>
                      Chemistry
                      <input
                        type="number"
                        value={cutoffData.chemistry}
                        onChange={(e) =>
                          setCutoffData((prev) => ({
                            ...prev,
                            chemistry: e.target.value,
                          }))
                        }
                        placeholder="Enter Chemistry mark"
                        min="0"
                        max="100"
                        required
                      />
                    </label>

                    <button
                      className="calcBtn"
                      onClick={(e) => {
                        e.preventDefault();
                        // Use browser validation
                        const form = e.target.closest("div"); // closest parent container
                        const inputs = form.querySelectorAll("input");
                        for (let input of inputs) {
                          if (!input.checkValidity()) {
                            input.reportValidity();
                            return;
                          }
                        }
                        calculateCutoff();
                      }}
                    >
                      Calculate
                    </button>

                    {cutoffData.result !== null && (
                      <div className="cutoffResult">
                        🎓 Your Cutoff: <b>{cutoffData.result}</b> / 200
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            return (
              <div
                key={index}
                className={`outputMessage ${
                  msg.sender === "user" ? "userMsg" : "aiMsg"
                }`}
              >
                {msg.sender === "ai" ? (
                  index === messages.length - 1 && isTyping ? (
                    msg.text.split("").map((char, i) => (
                      <span
                        key={i}
                        style={{
                          visibility:
                            i < msg.revealedLength ? "visible" : "hidden",
                        }}
                      >
                        {char}
                      </span>
                    ))
                  ) : isThinking && index === messages.length - 1 ? (
                    <div className="thinkingIndicator">
                      <div className="typingDot"></div>
                      <div className="typingDot"></div>
                      <div className="typingDot"></div>
                    </div>
                  ) : (
                    msg.text
                  )
                ) : (
                  msg.text
                )}
              </div>
            );
          })}
        </div>
        <div className="appName">
          <h2>PSNA Assistant</h2>
        </div>
        <div className="toolbar">
          <button className="toolBtn" onClick={handleCutoffClick}>
            Cutoff
          </button>
          <button className="toolBtn" onClick={handleResetClick}>
            Faculty
          </button>
           
          <button className="toolBtn" onClick={handleResetClick}>
            Result
          </button>
            
          <button className="toolBtn" onClick={handleResetClick}>
            Events
          </button>
            
        </div>
        <div className="chat">
          <div className="chatBox">
            <input
              type="text"
              placeholder="What's on your mind?"
              className="messageBox"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              ref={inputRef}
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck="false"
              autoComplete="off"
              inputMode="text"
              onFocus={() => setMode("chat")}
            />
          </div>
          <div className="cToolsrow">
            <div className="tools">
              <div className="resetBtnWrapper">
                <div className="resetBtn" onClick={handleResetClick}></div>
              </div>
              <div
                className={`sendBtn ${
                  message.trim() !== "" && !(isThinking || isTyping)
                    ? "active"
                    : "disabled"
                }`}
                onClick={handleSendClick}
              ></div>
            </div>
          </div>
        </div>

        <div
          className={`scrollHelper ${
            hasOverflow && !isNearBottom && !isThinking && !isTyping
              ? "visible"
              : ""
          }`}
          onClick={() => scrollToBottom()}
        ></div>
      </div>
    </div>
  );
}

export default App;
