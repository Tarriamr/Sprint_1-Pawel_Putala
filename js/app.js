const API_URL = "http://localhost:3000/character";
const CHARACTERS_PER_PAGE = 5;

let maxPage = 1;
let filters = {
  name: "",
  status: "",
  page: 1,
  limit: CHARACTERS_PER_PAGE,
};

const $displayElements = document.querySelector(".displayedElements");
const $buttonLeft = document.querySelector("#left");
const $buttonRight = document.querySelector("#right");
const $buttonAddCharacter = document.querySelector("#addCharacter");
const $inputName = document.querySelector("#name");
const $radiosStatus = document.querySelectorAll('input[type="radio"]');

async function fetchCharacterCount(filters) {
  try {
    const params = new URLSearchParams();
    if (filters.name) {
      params.append("name_like", filters.name);
    }
    if (filters.status) {
      params.append("status", filters.status);
    }

    const response = await fetch(`${API_URL}?${params}`);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }
    const characters = await response.json();
    return characters.length;
  } catch (error) {
    console.error("Error fetching character count:", error);
    $displayElements.innerHTML = "<div class='empty'>Wystąpił błąd podczas pobierania liczby postaci.</div>";
    return 0;
  }
}

async function fetchCharacters(filters) {
  try {
    const params = new URLSearchParams();
    if (filters.name) {
      params.append("name_like", filters.name);
    }
    if (filters.status) {
      params.append("status", filters.status);
    }
    if (filters.page) {
      params.append("_page", filters.page);
    }
    if (filters.limit) {
      params.append("_limit", filters.limit);
    }

    const response = await fetch(`${API_URL}?${params}`);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching characters:", error);
    $displayElements.innerHTML = "<div class='empty'>Wystąpił błąd podczas pobierania postaci.</div>";
    return [];
  }
}

function displayCharacters(characters) {
  $displayElements.innerHTML = "";
  if (characters.length === 0) {
    $displayElements.innerHTML = "<div class='empty'>Brak postaci.</div>";
    return;
  }
  characters.forEach((character) => {
    const characterElement = createCharacterElement(character);
    $displayElements.appendChild(characterElement);
  });
}

function updatePaginationButtons() {
  $buttonLeft.style.visibility = maxPage <= 1 ? "hidden" : "visible";
  $buttonRight.style.visibility = maxPage <= 1 ? "hidden" : "visible";
}

async function loadCharacters(currentFilters = filters) {
  try {
    const totalCount = await fetchCharacterCount(currentFilters);
    maxPage = Math.ceil(totalCount / CHARACTERS_PER_PAGE);
    if (isNaN(maxPage) || maxPage < 1) {
      maxPage = 1;
    }

    const characters = await fetchCharacters(currentFilters);
    displayCharacters(characters);
    updatePaginationButtons();
  } catch (error) {
    console.error("Error in loadCharacters:", error);
    $displayElements.innerHTML = "<div class='empty'>Wystąpił błąd ogólny. Spróbuj ponownie.</div>";
  }
}

function createCharacterElement(character) {
  const container = document.createElement("div");
  container.className = "character";
  container.innerHTML = `
    <div class="avatar" style="background-image: url('${character.image}')"></div>
    <h2 class="name">${character.name}</h2>
    <h3 class="status">Status: ${character.status}</h3>
    <h3 class="species">Gatunek: ${character.species}</h3>
    <button class="removeButton" data-id="${character.id}">Usuń postać</button>
  `;
  const removeButton = container.querySelector(".removeButton");
  removeButton.addEventListener("click", () => removeCharacter(character.id));
  return container;
}

async function removeCharacter(id) {
  try {
    const response = await fetch(`${API_URL}/${id}`, {method: "DELETE"});
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }
    await loadCharacters(filters);
  } catch (error) {
    console.error("Error removing character:", error);
    alert("Nie udało się usunąć postaci: " + error.message);
  }
}

$buttonLeft.onclick = () => {
  if (filters.page === 1) {
    filters.page = maxPage;
  } else {
    --filters.page;
  }
  loadCharacters(filters);
};

$buttonRight.onclick = () => {
  if (filters.page === maxPage) {
    filters.page = 1;
  } else {
    ++filters.page;
  }
  loadCharacters(filters);
};

$inputName.addEventListener("input", () => {
  filters.name = $inputName.value.trim();
  filters.page = 1;
  loadCharacters(filters);
});

$radiosStatus.forEach((radio) => {
  radio.addEventListener("change", () => {
    filters.status = radio.value;
    filters.page = 1;
    loadCharacters(filters);
  });
});

$buttonAddCharacter.addEventListener("click", async () => {
  const name = document.querySelector("#characterName").value;
  const status = document.querySelector("#characterStatus").value;
  const species = document.querySelector("#characterSpecies").value;
  const image = "https://rickandmortyapi.com/api/character/avatar/3.jpeg";

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({name, status, species, image}),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    document.querySelector("#characterName").value = "";
    document.querySelector("#characterSpecies").value = "";
    document.querySelector("#characterStatus").value = "unknown";

    await loadCharacters(filters);
  } catch (error) {
    console.error("Error adding character:", error);
    alert("Dodawanie postaci nie powiodło się: " + error.message);
  }
});

loadCharacters();
