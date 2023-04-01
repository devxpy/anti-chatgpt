let rules, elementSelector;

async function main() {
  let settings = await chrome.storage.sync.get({
    rules: "",
    elementSelector: "",
  });
  rules = settings.rules;
  elementSelector = settings.elementSelector;
  console.log(rules, elementSelector);

  setInterval(() => {
    getElemList().map(ensureOverlay);
  }, 100);

  while (1) {
    try {
      await Promise.all(getElemList().map(render));
    } catch (e) {
      console.error(e);
    }
    await sleep(500);
  }
}

function getElemList() {
  return Array.from(document.querySelectorAll(elementSelector));
}

const overlayId = "antichat-gpt-overlay";

function ensureOverlay(elem) {
  // ignore svg files
  if (elem.tagName === "IMG") {
    let src = elem.getAttribute("src");
    if (
      src?.includes(".svg") || // ignore svgs
      src?.startsWith("data:") || // ignore data urls
      elem.clientHeight < 80 // ignore emojis
    )
      return;
  }
  // ignore videos w/o a poster
  if (elem.tagName === "VIDEO" && !elem.getAttribute("poster")) return;

  let isImgOrVideo = ["IMG", "VIDEO"].includes(elem.tagName);

  // Check if the overlay already exists
  let overlay = elem.parentNode.querySelector("#" + overlayId);
  if (overlay) return;
  // Create a new overlay div
  overlay = document.createElement("div");

  overlay.id = overlayId;

  if (isImgOrVideo) {
    overlay.style.position = "absolute";
    overlay.style.top = 0;
    overlay.style.left = 0;
  } else {
    overlay.style.position = "relative";
  }
  overlay.style.zIndex = 1000;

  new ResizeObserver(() => {
    overlay.style.width = `${elem.clientWidth}px`;
    overlay.style.height = `${elem.clientHeight}px`;
    if (!isImgOrVideo) {
      overlay.style.marginTop = `-${elem.clientHeight}px`;
    }
  }).observe(elem);
  overlay.style.width = `${elem.clientWidth}px`;
  overlay.style.height = `${elem.clientHeight}px`;
  if (!isImgOrVideo) {
    overlay.style.marginTop = `-${elem.clientHeight}px`;
  }

  overlay.style.justifyContent = "center";
  overlay.style.alignItems = "center";
  overlay.style.display = "flex";

  overlay.style.backgroundColor = "black";
  overlay.style.color = "yellow";
  overlay.innerHTML = "[Loading...]";

  overlay.onmouseover = (e) => {
    overlay.style.display = "none";
  };
  overlay.onmouseout = (e) => {
    overlay.style.display = "flex";
  };

  // Append the overlay element to the target element's parent
  elem.parentNode.appendChild(overlay);
}

async function render(elem) {
  let text, imgSrc;
  if (elem.tagName === "IMG") {
    imgSrc = elem.getAttribute("src");
    // text = elem.getAttribute("alt");
  } else if (elem.tagName === "VIDEO") {
    imgSrc = elem.getAttribute("poster");
    // text = elem.getAttribute("alt");
  } else {
    text = elem.textContent;
  }
  text ??= "";
  text = text.trim();
  if (!(text || imgSrc)) return;

  let overlay = elem.parentNode.querySelector("#" + overlayId);
  if (!overlay) return;

  let ok = await isSafeCached(imgSrc, text);
  if (ok) {
    if (overlay.style.display !== "none") {
      overlay.style.display = "none";
    }
  } else {
    if (overlay.style.color !== "red") {
      overlay.style.color = "red";
      overlay.innerHTML = "[Redacted]";
    }
  }
}

const _isSafeCache = {};

async function isSafeCached(imgSrc, text) {
  let cacheKey = `${imgSrc}${text}`;
  if (cacheKey in _isSafeCache) {
    return _isSafeCache[cacheKey];
  } else {
    let value = isSafe(imgSrc, text);
    // let value = await isSafeRandom();
    _isSafeCache[cacheKey] = value;
    return value;
  }
}

async function isSafeRandom() {
  await sleep(2500);
  // return false;
  return Math.random() > 0.5;
}

async function isSafe(imgSrc, text) {
  if (imgSrc) {
    text = (await imgCaption(imgSrc)) || text;
  }
  // console.log(imgSrc, text);
  if (!text) return true;

  let prompt = `
[Message]:
${text.trim()}
**********
[Criterion]:
${rules.trim()}
**********
[Choices]:
(A) - The message meets at least one of the given criteria
(B) - The message doesn't meet any of the given criteria
**********
First, write out in a step by step manner your reasoning to be sure that your conclusion is correct. Avoid simply stating the correct answer at the outset. Then print only a single choice from "A" or "B" (without quotes or punctuation) on its own line corresponding to the correct answer. At the end, repeat just the answer by itself on a new line.

Reasoning:
`.trim();

  let cacheKey = "classifier/" + prompt;
  let result = await chrome.storage.local.get(cacheKey);
  if (result && Object.keys(result).length) {
    return result[cacheKey];
  }

  let gptResp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + openaiApiKey,
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are an intelligent AI assistant. Follow the instructions as closely as possible.",
        },
        { role: "user", content: prompt },
        // { role: "assistant", content: text },
        // { role: "system", content: prompt },
      ],
      temperature: 0,
    }),
  });
  let resp = await gptResp.json();
  let content = resp.choices[0].message.content;

  // let gptResp = await fetch("https://api.openai.com/v1/completions", {
  //   method: "POST",
  //   headers: {
  //     "Content-Type": "application/json",
  //     Authorization: "Bearer " + openaiApiKey,
  //   },
  //   body: JSON.stringify({
  //     model: "text-davinci-003",
  //     prompt: prompt,
  //     temperature: 0,
  //     max_tokens: 1024,
  //   }),
  // });
  // let resp = await gptResp.json();
  // let content = resp.choices[0].text;

  let choice = getChoice(content);
  let ok = choice !== "A";
  console.log({ imgSrc, text, choice, isSafe: ok });
  await chrome.storage.local.set({ [cacheKey]: ok });
  return ok;
}

async function imgCaption(imgSrc) {
  let cacheKey = "imgCaption#4/" + imgSrc;
  let result = await chrome.storage.local.get(cacheKey);
  if (result && Object.keys(result).length) {
    return result[cacheKey];
  }
  let output = await _predict({
    image: imgSrc,
    clip_model_name: "ViT-L-14/openai",
    mode: "fast",
  });
  await chrome.storage.local.set({ [cacheKey]: output });
  return output;
}

async function _predict(input) {
  let resp = await fetch("http://localhost:8080/replicate/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: url,
      input: input,
    }),
  });
  return await resp.json();
}

function sleep(millisec) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve("");
    }, millisec);
  });
}

function getChoice(text) {
  for (let line of text.split("\n").reverse()) {
    for (let choice of ["A", "B"]) {
      if (line.endsWith(choice)) {
        return choice;
      }
    }
  }
}

const openaiApiKey = "sk-XXXXX";

main();
