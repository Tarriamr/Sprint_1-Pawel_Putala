const http = require("http");
const fs = require("fs").promises;

const CONFIG = {
  PORT: process.env.PORT || 3000,
  PAGE_SIZE: 5,
};

const characterTemplate = {
  name: "",
  species: "",
  status: "",
  image: "",
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const setCorsHeaders = (res) => {
  for (const header in CORS_HEADERS) {
    res.setHeader(header, CORS_HEADERS[header]);
  }
};

const saveData = async (characters) => {
  const data = JSON.stringify(characters, null, 2);
  await fs.writeFile("db.json", data);
};

const sendError = (res, statusCode, message) => {
  res.writeHead(statusCode);
  return res.end(JSON.stringify({ message }));
};

const readFileAndParse = async (res) => {
  try {
    const data = await fs.readFile("db.json");
    return JSON.parse(data.toString());
  } catch (err) {
    console.error("Błąd odczytu pliku db.json:", err);
    return sendError(res, 500, "Błąd serwera");
  }
};

const validateCharacter = (newCharacter, res) => {
  for (const key in characterTemplate) {
    if (!(key in newCharacter)) {
      return sendError(res, 400, `Brakujące pole: ${key}`);
    }
    if (typeof newCharacter[key] !== typeof characterTemplate[key]) {
      return sendError(res, 400, `Niepoprawny typ pola: ${key}`);
    }
  }
  return newCharacter;
};

const handleInit = async (req, res) => {
  let initBody = "";
  req.on("data", (chunk) => (initBody += chunk));
  req.on("end", async () => {
    try {
      const initialCharacters = JSON.parse(initBody);

      if (!Array.isArray(initialCharacters) || initialCharacters.length > 20) {
        return sendError(
          res,
          400,
          "Niepoprawne dane inicjalizacyjne. Oczekiwana tablica do 20 elementów.",
        );
      }

      const validatedCharacters = initialCharacters
        .map((newCharacter) => validateCharacter(newCharacter, res))
        .filter(Boolean);

      const charactersWithId = validatedCharacters.map(
        (newCharacter, index) => ({
          ...newCharacter,
          id: index + 1,
        }),
      );

      await saveData(charactersWithId);
      res.writeHead(201);
      res.end(JSON.stringify({ message: "Dane zainicjalizowane pomyślnie" }));
    } catch (error) {
      sendError(res, 400, "Niepoprawne dane");
    }
  });
};

const handleGetCharacters = async (req, res) => {
  const characters = await readFileAndParse(res);
  if (!characters) return;

  const url = new URL(req.url, `http://${req.headers.host}`);
  const page = parseInt(url.searchParams.get("page")) || 1;
  const statusFilter = url.searchParams.get("status")?.toLowerCase(); // Konwersja statusu na małe litery
  const nameFilter = url.searchParams.get("name")?.toLowerCase(); // Konwersja name na małe litery

  let filteredCharacters = characters;

  if (statusFilter) {
    filteredCharacters = filteredCharacters.filter(
      (char) => char.status.toLowerCase() === statusFilter,
    );
  }

  if (nameFilter) {
    filteredCharacters = filteredCharacters.filter((char) =>
      char.name.toLowerCase().includes(nameFilter.toLowerCase()),
    );
  }

  const startIndex = (page - 1) * CONFIG.PAGE_SIZE;
  const endIndex = startIndex + CONFIG.PAGE_SIZE;
  const pageCharacters = filteredCharacters.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredCharacters.length / CONFIG.PAGE_SIZE);

  const response = {
    info: {
      pages: totalPages,
    },
    results: pageCharacters.map((character) => ({
      id: character.id,
      name: character.name,
      status: character.status,
      species: character.species,
      image: character.image,
    })),
  };

  res.writeHead(200);
  res.end(JSON.stringify(response));
};

const handleGetCharacterById = async (req, res) => {
  const characters = await readFileAndParse(res);
  if (!characters) return;

  const url = new URL(req.url, `http://${req.headers.host}`);
  const idString = url.pathname.split("/").pop();
  const id = idString ? parseInt(idString, 10) : NaN;

  if (isNaN(id)) {
    return sendError(res, 400, "Nieprawidłowe ID");
  }

  const character = characters.find((c) => c.id === id);

  if (character) {
    res.writeHead(200);
    res.end(JSON.stringify(character));
  } else {
    sendError(res, 404, "Character not found");
  }
};

const handleDeleteCharacter = async (req, res) => {
  const characters = await readFileAndParse(res);
  if (!characters) return;

  const url = new URL(req.url, `http://${req.headers.host}`);
  const idString = url.pathname.split("/").pop();
  const idToDelete = idString ? parseInt(idString, 10) : NaN;

  if (isNaN(idToDelete)) {
    return sendError(res, 400, "Nieprawidłowe ID");
  }

  const index = characters.findIndex((c) => c.id === idToDelete);

  if (index !== -1) {
    characters.splice(index, 1);
    await saveData(characters);
    res.writeHead(204);
    res.end();
  } else {
    sendError(res, 404, "Character not found");
  }
};

const handlePostCharacter = async (req, res) => {
  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", async () => {
    const characters = await readFileAndParse(res);
    if (!characters) return;

    try {
      const newCharacter = JSON.parse(body);

      const validatedCharacter = validateCharacter(newCharacter, res);
      if (!validatedCharacter) return;

      const maxId = characters.reduce((max, c) => Math.max(max, c.id), 0);
      newCharacter.id = maxId + 1 || 1;
      characters.push(newCharacter);
      await saveData(characters);
      res.writeHead(201);
      res.end(JSON.stringify(newCharacter));
    } catch (error) {
      sendError(res, 400, "Niepoprawne dane");
    }
  });
};

const server = http.createServer(async (req, res) => {
  setCorsHeaders(res);
  res.setHeader("Content-Type", "application/json");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;

  if (path.startsWith("/api/character")) {
    const subPath = path.substring("/api/character".length);
    switch (req.method) {
      case "GET":
        if (subPath === "") {
          return handleGetCharacters(req, res);
        } else if (/^\/\d+$/.test(subPath)) {
          return handleGetCharacterById(req, res);
        }
        break;
      case "DELETE":
        if (/^\/\d+$/.test(subPath)) {
          return handleDeleteCharacter(req, res);
        }
        break;
      case "POST":
        if (subPath === "") {
          return handlePostCharacter(req, res);
        } else if (subPath === "/init") {
          return handleInit(req, res);
        }
        break;
    }
  }

  return sendError(res, 404, "Route not found");
});

server.listen(CONFIG.PORT, () => {
  console.log(`Server is running on http://localhost:${CONFIG.PORT}`);
});
