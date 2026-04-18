import { useState, useRef, useEffect } from "react";
import "./App.css";
import Fuse from "fuse.js";
const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);


// Used for tracking and sending Whole chat Logs to AI
var chatLogs = [];
var userMsgForChatLogs = "";


const events = [
  {
    name: "Hackathon 2026",
    dept: "CSE",
    date: "2026-04-10",
    link: "https://example.com/hackathon",
  },
  {
    name: "Tech Symposium",
    dept: "ECE",
    date: "2026-04-15",
    link: "https://example.com/symposium",
  },
  {
    name: "AI Workshop",
    dept: "IT",
    date: "2026-04-20",
    link: null,
  },
];

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
  const lastMessageCount = useRef(0);
  const bottomRef = useRef(null);

  const scrollToBottom = () => {
    if (outputAreaRef.current) {
      const element = outputAreaRef.current;
      element.scrollTo({
        top: element.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  const reply = async (userMessage) => {
    if (mode !== "chat") return;

    // 1. Create EMPTY AI bubble immediately (so thinking can render)
    setMessages((prev) => [
      ...prev,
      { sender: "ai", text: "", revealedLength: 0 },
    ]);

    setIsThinking(true);

    let fullResponse = "";
    const lowerMsg = userMessage.toLowerCase();

    // ---------- LOCAL LOGIC (Teachers + Fuse) ----------
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

    if (!teacher && isTeacherQuery && lastTeacher) {
      teacher = lastTeacher;
    }

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

      if (parts.length > 0) {
        fullResponse =
          `${teacher.title} ${teacher.name}'s details:\n` + parts.join("\n");
      } else if (
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
      fullResponse = results.length > 0 ? results[0].item.answer : "";
    }

    // ---------- AI API CALL ----------
    try {
      const apiResponse = await fetch("http://localhost:8000/api/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: JSON.stringify(chatLogs) }),
      });

      const data = await apiResponse.json();

      // Prefer AI response if available
      if (data?.response) {
        fullResponse = data.response;
        console.log(fullResponse);
        chatLogs = [...chatLogs, { AI_MODEL: fullResponse }];
        console.log(chatLogs);
      }
    } catch (err) {
      console.error("API Error:", err);
      if (!fullResponse) {
        fullResponse = "Server is unreachable. Please try again later.";
      }
    }

    // ---------- THINKING → TYPING FLOW ----------
    setTimeout(() => {
      setIsThinking(false);
      setIsTyping(true);

      let index = 0;

      const interval = setInterval(() => {
        index++;

        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];

          last.text = fullResponse;
          last.revealedLength = index;

          return updated;
        });

        if (index >= fullResponse.length) {
          clearInterval(interval);
          setIsTyping(false);
        }
      }, 12);
    }, 0);
  };

  const handleSendClick = async () => {
    if (mode !== "chat") return;
    if (isThinking || isTyping || message.trim() === "") return;

    const userMessage = message;
    console.log({ message });
    setMessages((prev) => [...prev, { sender: "user", text: message }]);
    console.log("Before ", chatLogs);
    chatLogs = [...chatLogs, { USER: userMsgForChatLogs }];
    console.log("After", chatLogs);
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

    const prevCount = lastMessageCount.current;
    const currentCount = messages.length;

    if (currentCount > prevCount) {
      const lastMsg = messages[messages.length - 1];

      // Force scroll if it's a widget (like Cutoff) OR if user is already near bottom
      if (lastMsg.sender === "widget" || isNearBottom) {
        setTimeout(scrollToBottom, 50);
      }
    }

    lastMessageCount.current = currentCount;
  }, [messages, isNearBottom]);
  useEffect(() => {
    if (isThinking || isTyping) {
      scrollToBottom();
    }
  }, [isThinking, isTyping]);

  useEffect(() => {
    // Only check overflow after AI typing finishes
    if (isThinking || isTyping) return;

    // Wait for DOM to render new messages
    const timer = setTimeout(() => {
      checkOverflowAndScroll();
    }, 50); // small delay to ensure AI message is rendered

    return () => clearTimeout(timer);
  }, [messages, isThinking, isTyping]);

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
    setTimeout(() => {
      scrollToBottom();
    }, 100);
  };

  // Events
  const handleEventsClick = () => {
  setMode("events");
  setMessages((prev) => [
    ...prev,
    { sender: "widget", type: "events" },
  ]);
};
const handleEventClick = (event) => {
  setMessages((prev) => [
    ...prev,
    {
      sender: "ai",
      text: `📅 ${event.name}
Department: ${event.dept}
Date: ${event.date}

${getDaysLeft(event.date)}`,
    },
  ]);

  setMode("chat"); // optional: go back to chat mode
};


const getDaysLeft = (dateString) => {
  const today = new Date();
  const eventDate = new Date(dateString);

  // Remove time for accurate day diff
  today.setHours(0, 0, 0, 0);
  eventDate.setHours(0, 0, 0, 0);

  const diffTime = eventDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays > 0) return `${diffDays} days to go`;
  if (diffDays === 0) return "Today 🎉";
  return "Event passed";
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

             // EVENTS WIDGET
if (msg.sender === "widget" && msg.type === "events") {
  return (
    <div key={index} className="outputMessage eventsWidget">
      <h3>📅 Upcoming Events</h3>

      <div className="eventsContainer">
       {events.map((event, i) => {
  const isClickable = event.link && event.link.trim() !== "";

  return (
    <div
      key={i}
      className={`eventCard ${!isClickable ? "disabled" : ""}`}
      onClick={() => {
        if (!isClickable) return;
        window.open(event.link, "_blank");
      }}
    >
      <div className="eventHeader">
        <h4>{event.name}</h4>
        <div className="eventDate">{event.date}</div>
      </div>

      <div className="eventBottom">
        <div className="eventDept">Department: {event.dept}</div>
        <div className="eventCountdown">
          {getDaysLeft(event.date)}
        </div>
      </div>
    </div>
  );
})}

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
            
          <button className="toolBtn" onClick={handleEventsClick}>
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
              onChange={(e) => {
                setMessage(e.target.value);
                if (String(e.target.value) !== "") {
                  userMsgForChatLogs = e.target.value;
                }
              }}
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
            hasOverflow && !isNearBottom ? "visible" : ""
          }`}
          onClick={() => scrollToBottom()}
        ></div>
      </div>
    </div>
  );
}

export default App;
