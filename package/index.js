const http = require("http");
const fs = require("fs").promises;

const PORT = process.env.PORT || 3000;
const PAGE_SIZE = 5;

const characterTemplate = { name: "", species: "", status: "", image: "" };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const setCorsHeaders = (res) => {
  for (const header in corsHeaders) {
    res.setHeader(header, corsHeaders[header]);
  }
};

const saveData = async (characters) => {
  await fs.writeFile("db.json", JSON.stringify(characters, null, 2));
};

const sendError = (res, code, message) => {
  res.writeHead(code);
  res.end(JSON.stringify({ message }));
};

const loadCharacters = async () => {
  try {
    const data = await fs.readFile("db.json");
    return JSON.parse(data.toString());
  } catch (error) {
    return [];
  }
};

const validateCharacter = (character, res) => {
  for (const key in characterTemplate) {
    if (
      !(key in character) ||
      typeof character[key] !== typeof characterTemplate[key]
    ) {
      sendError(res, 400, `Invalid or missing field: ${key}`);
      return null;
    }
  }
  return character;
};

let dataInitialized = new Promise((resolve) => {
  const handleInitialize = (req, res) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const characters = JSON.parse(body)
          .map((character, index) => ({
            ...validateCharacter(character, res),
            id: (index + 1).toString(),
          }))
          .filter((character) => character);

        if (characters.length === 0)
          return sendError(res, 400, "Invalid initialization data");
        if (characters.length > 20)
          return sendError(res, 400, "Too many initial characters");

        saveData(characters)
          .then(() => {
            resolve();
            res.writeHead(201);
            res.end(
              JSON.stringify({ message: "Data initialized", characters }),
            );
          })
          .catch((error) => sendError(res, 500, "Error saving data"));
      } catch (error) {
        sendError(res, 400, "Invalid JSON");
      }
    });
  };

  const handlePostCharacter = (req, res) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const character = validateCharacter(JSON.parse(body), res);
        if (!character) return;

        const characters = await loadCharacters();
        character.id = (
          characters.reduce((max, c) => Math.max(max, parseInt(c.id) || 0), 0) +
          1
        ).toString();
        characters.push(character);

        await saveData(characters);
        res.writeHead(201);
        res.end(JSON.stringify(character));
      } catch (error) {
        sendError(res, 500, "Server error");
      }
    });
  };

  const handleGetCharacters = async (req, res) => {
    await dataInitialized;
    const characters = await loadCharacters();

    const { searchParams } = new URL(req.url, `http://${req.headers.host}`);
    const page = parseInt(searchParams.get("page") || 1);
    const status = searchParams.get("status")?.toLowerCase();
    const name = searchParams.get("name")?.toLowerCase();

    const filteredCharacters = characters.filter(
      (character) =>
        (!status || character.status.toLowerCase() === status) &&
        (!name || character.name.toLowerCase().includes(name)),
    );
    const start = (page - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const results = filteredCharacters
      .slice(start, end)
      .map(({ id, name, status, species, image }) => ({
        id,
        name,
        status,
        species,
        image,
      }));
    const pages = Math.ceil(filteredCharacters.length / PAGE_SIZE);

    // Dodajemy nagłówki Cache-Control i Connection:
    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate",
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Connection", "close"); // Dodajemy Connection: close
    res.writeHead(200);
    res.end(JSON.stringify({ info: { pages }, results }));
  };

  const handleDeleteCharacter = async (req, res) => {
    await dataInitialized;
    const characters = await loadCharacters();
    const id = req.url.substring("/api/character/".length);
    const index = characters.findIndex((character) => character.id === id);

    if (index === -1) return sendError(res, 404, "Character not found");

    const deletedCharacter = characters.splice(index, 1)[0];
    await saveData(characters);

    res.writeHead(200);
    res.end(
      JSON.stringify({
        message: "Character deleted",
        character: deletedCharacter,
      }),
    );
  };

  const server = http.createServer((req, res) => {
    setCorsHeaders(res);
    res.setHeader("Content-Type", "application/json");

    if (req.method === "OPTIONS") return res.end();

    const { pathname } = new URL(req.url, `http://${req.headers.host}`);

    if (pathname === "/api/character/init" && req.method === "POST")
      return handleInitialize(req, res);
    if (pathname === "/api/character" && req.method === "POST")
      return handlePostCharacter(req, res);
    if (pathname === "/api/character" && req.method === "GET")
      return handleGetCharacters(req, res);
    if (pathname.startsWith("/api/character/") && req.method === "DELETE")
      return handleDeleteCharacter(req, res);

    sendError(res, 404, "Not found");
  });

  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
