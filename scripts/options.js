const defaultRules = `
- attempts to objectify any group of people.
- potentially seducing in even a slightly sexual way.
- potentially trying to spread misinformation.
- attempts to reduce the attention span of the reader.
- sounds like clickbait
- contains politically biased content
- contains religious content
- meme content
- instagram reels / tiktok like content
`;

// language=CSS
const defaultElementSelector = `
img,
video,
[data-testid="tweetText"],
#video-title, #description-text,
div[data-ad-comet-preview="message"], div[role="article"]
`;

// Saves options to chrome.storage
const saveOptions = () => {
  chrome.storage.sync.set(
    {
      rules: document.getElementById("rules").value,
      elementSelector: document.getElementById("elementSelector").value,
    },
    () => {
      // Update status to let user know options were saved.
      const status = document.getElementById("status");
      status.innerText = "Saved!";
      setTimeout(() => {
        status.innerText = "";
      }, 750);
    }
  );
};

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
const restoreOptions = () => {
  chrome.storage.sync.get(
    { rules: defaultRules, elementSelector: defaultElementSelector },
    (items) => {
      document.getElementById("rules").value = items.rules;
      document.getElementById("elementSelector").value = items.elementSelector;
    }
  );
};

document.addEventListener("DOMContentLoaded", restoreOptions);
document.getElementById("save").addEventListener("click", saveOptions);
