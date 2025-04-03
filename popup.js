document.addEventListener("DOMContentLoaded", () => {
  const output = document.getElementById("output");
  const progressBar = document.getElementById("progress-bar");
  const button = document.getElementById("calculate");

  button.addEventListener("click", () => {
    runEstimate();
    if (!window.intervalSet) {
      window.intervalSet = true;
      setInterval(runEstimate, 10000); // refresh every 10 seconds
    }
  });

  function runEstimate() {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: estimateTime
      });
    });
  }

  function estimateTime() {
    const getText = (selector) => {
      const el = document.querySelector(selector);
      return el ? el.textContent.trim() : null;
    };

    const parseTime = (timeStr) => {
      const parts = timeStr.split(":").map(Number);
      if (parts.length === 3) {
        const [hrs, mins, secs] = parts;
        return hrs * 3600 + mins * 60 + secs;
      } else if (parts.length === 2) {
        const [mins, secs] = parts;
        return mins * 60 + secs;
      }
      return 0;
    };

    const elapsedStr = getText("#then");
    const processedStr = getText(".processed_count");
    const totalStr = getText("#of");

    if (!elapsedStr || !processedStr || !totalStr) {
      chrome.runtime.sendMessage({ text: "Couldn't extract info. Make sure you're on an import progress page." });
      return;
    }

    const elapsed = parseTime(elapsedStr);
    const processed = parseInt(processedStr);
    const total = parseInt(totalStr);
    const rate = processed / elapsed;
    const remaining = total - processed;
    const secondsLeft = Math.round(remaining / rate);

    const now = new Date();
    const eta = new Date(now.getTime() + secondsLeft * 1000);
    const etaStr = eta.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const hours = Math.floor(secondsLeft / 3600);
    const mins = Math.floor((secondsLeft % 3600) / 60);
    const secs = secondsLeft % 60;

    const timeLeftStr = 
      (hours > 0 ? `${hours} hr ` : "") +
      (mins > 0 ? `${mins} min ` : "") +
      `${secs} sec`;

    chrome.runtime.sendMessage({ 
      text: `Estimated time left: ${timeLeftStr}\nFinish around: ${etaStr}`,
      progress: Math.round((processed / total) * 100)
    });
  }

  chrome.runtime.onMessage.addListener((message) => {
    output.textContent = message.text;
    if (message.progress !== undefined) {
      progressBar.style.width = message.progress + "%";
      progressBar.textContent = message.progress + "%";
    }
  });
});