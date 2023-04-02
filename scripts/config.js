// add your openai api key here
const openaiApiKey = "sk-XXXX";

// deploy clip-interrogator (https://replicate.com/pharmapsychotic/clip-interrogator/api)
//  $ docker run -d -p 5000:5000 --gpus=all r8.im/pharmapsychotic/clip-interrogator@sha256:a4a8bafd6089e1716b06057c42b19378250d008b80fe87caa5cd36d40c1eda90
const clipInterrogatorUrl = "http://localhost:5000/predictions/";

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
