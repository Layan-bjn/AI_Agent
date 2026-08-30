import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://api.fuse.humainaic.com/v1",
  apiKey: "sk-hr-DHInfObit5hkjBC6MD_XODmI5We1062LFL9xrJ0HAdM",
});

const response = await client.chat.completions.create({
  model: "moonshotai/Kimi-K3",
  messages: [{ role: "user", content: "Hello!" }],
});

console.log(response.choices[0].message.content);