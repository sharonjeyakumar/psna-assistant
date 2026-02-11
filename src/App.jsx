import { useState, useRef, useEffect } from 'react';
import './App.css';
import Fuse from 'fuse.js';
const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

const knowledgeBase = [
  { question: "hello", answer: "Hello! How can I help you today?" },
  { question: "hi", answer: "Hello! How can I help you today?" },
  { question: "what is your name", answer: "I'm PSNA Assistant, here to help you." },
  { question: "who are you", answer: "I'm PSNA Assistant, here to help you." },
  { question: "how are you", answer: "I'm just a bot, but I'm doing great! How about you?" },
  { question: "help", answer: "Sure! Tell me what you need help with." },
];

const teachers = [
  { title: "Dr.", name: "Anita", dept: "CSE", cabin: "Block A - Room 203", contact: "9876543210", mail: "anita@psnacollege.edu" },
  { title: "Mr.", name: "Ramesh", dept: "ECE", cabin: "Block B - Room 105", contact: "9123456780", mail: "ramesh@psnacollege.edu" },
  { title: "Ms.", name: "Kavitha", dept: "IT", cabin: "Block C - Room 310", contact: "9098765432", mail: "kavitha@psnacollege.edu" }
];

const fuse = new Fuse(knowledgeBase, { keys: ["question"], includeScore: true, threshold: 0.4 });

const fuseTeachers = new Fuse(teachers, {
  keys: ["name", "dept"],  // You can add "cabin" or "mail" if needed
  includeScore: true,
  threshold: 0.4
});

function App() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [isThinking, setIsThinking] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [lastTeacher, setLastTeacher] = useState(null);

  const inputRef = useRef(null);
  const outputAreaRef = useRef(null);

  const scrollToBottom = () => {
    outputAreaRef.current?.scrollTo({ top: outputAreaRef.current.scrollHeight, behavior: 'smooth' });
  };

  const reply = (userMessage) => {
    let fullResponse = "";
    const lowerMsg = userMessage.toLowerCase();

    const teacherKeywords = ["cabin", "contact", "mail", "email", "dept", "department", "all", "details", "whole"];
    const isTeacherQuery = teacherKeywords.some(kw => lowerMsg.includes(kw));
    let teacher = teachers.find(t => lowerMsg.includes(t.name.toLowerCase()));

    if (!teacher && isTeacherQuery && lastTeacher) teacher = lastTeacher;

    if (teacher) {
      setLastTeacher(teacher);
      const parts = [];
      if (lowerMsg.includes("cabin")) parts.push(`Cabin: ${teacher.cabin}`);
      if (lowerMsg.includes("contact")) parts.push(`Contact: ${teacher.contact}`);
      if (lowerMsg.includes("mail") || lowerMsg.includes("email")) parts.push(`Email: ${teacher.mail}`);
      if (lowerMsg.includes("dept") || lowerMsg.includes("department")) parts.push(`Department: ${teacher.dept}`);

      if (parts.length > 0) fullResponse = `${teacher.title} ${teacher.name}'s details:\n` + parts.join("\n");
      else if (lowerMsg.includes("all") || lowerMsg.includes("details") || lowerMsg.includes("whole")) {
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
      fullResponse = results.length > 0 ? results[0].item.answer : "I'm not sure I understand. Could you rephrase?";
    }

    // Add AI message with empty text first
    const messageObj = { sender: "ai", text: fullResponse, revealedLength: 0 };
    setMessages(prev => [...prev, messageObj]);
    setIsThinking(true);

    // Show thinking indicator for 700ms before typing
    setTimeout(() => {
      setIsThinking(false);
      setIsTyping(true);

      let index = 0;
      const interval = setInterval(() => {
        index++;
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1].revealedLength = index;
          return updated;
        });
        if (index >= fullResponse.length) {
          clearInterval(interval);
          setIsTyping(false);
        }
      }, 25);
    }, 700);
  };

  const handleSendClick = () => {
    if (isThinking || isTyping || message.trim() === '') return;

    const userMessage = message;
    setMessages(prev => [...prev, { sender: "user", text: message }]);
    setMessage('');
    reply(userMessage);

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
    const handleKeyDown = e => {
      if (document.activeElement && outputAreaRef.current?.contains(document.activeElement)) return;
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
      inputRef.current?.focus();
    };
    window.addEventListener('keydown', handleKeyDown);

    const outputEl = outputAreaRef.current;
    outputEl?.addEventListener('scroll', checkOverflowAndScroll);

    const handleResize = () => {
      setTimeout(() => scrollToBottom(), 100);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      outputEl?.removeEventListener('scroll', checkOverflowAndScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    checkOverflowAndScroll();
    scrollToBottom();
  }, [messages, isTyping, isThinking]);

  const handleKeyPress = e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendClick();
    }
  };

  return (
    <div className={`page ${messages.length > 0 ? 'hideAfter' : ''}`}>
      
      <div className="textArea">
        <div className={`outputArea ${hasOverflow ? 'hasOverflow' : ''}`} ref={outputAreaRef}>
         {messages.map((msg, index) => (
  <div key={index} className={`outputMessage ${msg.sender === "user" ? "userMsg" : "aiMsg"}`}>
    {msg.sender === "ai" ? (
      index === messages.length - 1 && isTyping ? ( // Only last AI message types
        msg.text.split("").map((char, i) => (
          <span
            key={i}
            style={{ visibility: i < msg.revealedLength ? 'visible' : 'hidden' }}
          >
            {char}
          </span>
        ))
      ) : isThinking && index === messages.length - 1 ? ( // Only last AI shows thinking
        <div className="thinkingIndicator">
          <div className="typingDot"></div>
          <div className="typingDot"></div>
          <div className="typingDot"></div>
        </div>
      ) : (
        msg.text // previous messages stay fully visible
      )
    ) : (
      msg.text
    )}
  </div>
))}

        </div>

        <div className="appName">
          <h2>PSNA Assistant</h2>
        </div>
        
        <div className="toolbar">
        <button className="toolBtn" onClick={handleResetClick}>Cutoff Calculator</button>
        <button className="toolBtn" onClick={handleResetClick}>Faculty</button> 
        <button className="toolBtn" onClick={handleResetClick}>Events</button>  
        <button className="toolBtn" onClick={handleResetClick}>Result</button>  
      </div>


        <div className="chat">
          <div className="chatBox">
            <input
              type="text"
              placeholder="What's on your mind?"
              className="messageBox"
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              ref={inputRef}
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck="false"
              autoComplete="off"
              inputMode="text"
            />
          </div>
          <div className="cToolsrow">
            <div className="tools">
              <div className="resetBtnWrapper">
                <div className="resetBtn" onClick={handleResetClick}></div>
              </div>
              <div
                className={`sendBtn ${message.trim() !== '' && !(isThinking || isTyping) ? 'active' : 'disabled'}`}
                onClick={handleSendClick}
              ></div>
            </div>
          </div>
        </div>

        <div
          className={`scrollHelper ${hasOverflow && !isNearBottom ? 'visible' : ''}`}
          onClick={() => scrollToBottom()}
        ></div>
      </div>
    </div>
  );
}

export default App;
