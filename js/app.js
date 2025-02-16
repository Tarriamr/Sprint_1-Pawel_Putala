const urlAPI = "https://rickandmortyapi.com/api/character";
let maxPage = 1;
let currentPage = 1;
let filters = { name: "", status: "" };

const $displayElements = document.querySelector(".displayedElements");
const $buttonLeft = document.querySelector("#left");
const $buttonRight = document.querySelector("#right");
const $inputName = document.querySelector("#name");
const $radiosStatus = document.querySelectorAll('input[type="radio"]');

async function fetchCharacters(pageNumber, filters) {
  try {
    const params = new URLSearchParams({ page: pageNumber, ...filters });
    const response = await fetch(`${urlAPI}?${params}`);

    if (!response.ok) {
      if (response.status === 404) {
        console.error("No characters found.");
        return null;
      }
      throw new Error(`An error occurred: ${response.status}`);
    }

    const {
      info: { pages },
      results,
    } = await response.json();
    maxPage = pages;
    currentPage = pageNumber;

    return results.map(({ id, name, status, species, image }) => ({
      id,
      name,
      status,
      species,
      image,
    }));
  } catch (error) {
    console.error("Error fetching characters:", error);
    throw new Error(`The error of getting data from API: ${error.message}`);
  }
}

function displayCharacters(characters) {
  $displayElements.innerHTML = "";

  if (!characters || characters.length === 0) {
    const message = document.createElement("div");
    message.className = "empty";
    message.textContent =
      "Nie znaleziono postaci spełniających kryteria wyszukiwania.";
    $displayElements.append(message);
    return;
  }

  characters.forEach((character) =>
    $displayElements.append(createCharacter(character)),
  );
}

function updatePaginationButtons() {
  const isSinglePage = maxPage === 1;
  $buttonLeft.style.visibility = isSinglePage ? "hidden" : "visible";
  $buttonRight.style.visibility = isSinglePage ? "hidden" : "visible";
}

async function getNewCharacters(filters, pageNumber = 1) {
  try {
    const characters = await fetchCharacters(pageNumber, filters);
    displayCharacters(characters);
    updatePaginationButtons();
  } catch (error) {
    console.error("An error occurred:", error);
    $displayElements.innerHTML = "";
    const message = document.createElement("div");
    message.className = "empty";
    message.textContent =
      "Wystąpił błąd podczas pobierania danych. Spróbuj ponownie później.";
    $displayElements.append(message);
    currentPage = 1;
    maxPage = 1;
    updatePaginationButtons();
  }
}

function createCharacter({ image, name, species, status }) {
  const characterContainer = document.createElement("div");
  characterContainer.className = "character";

  const characterAvatar = document.createElement("div");
  characterAvatar.className = "avatar";
  characterAvatar.style.backgroundImage = `url("${image}")`;

  const characterName = document.createElement("h2");
  characterName.className = "name";
  characterName.textContent = name;

  const characterStatus = document.createElement("h3");
  characterStatus.className = "status";
  characterStatus.textContent = `Status: ${status}`;

  const characterSpecies = document.createElement("h3");
  characterSpecies.className = "species";
  characterSpecies.textContent = `Gatunek: ${species}`;

  characterContainer.append(
    characterAvatar,
    characterName,
    characterStatus,
    characterSpecies,
  );

  return characterContainer;
}

$buttonLeft.onclick = () =>
  getNewCharacters(filters, currentPage === 1 ? maxPage : --currentPage);

$buttonRight.onclick = () =>
  getNewCharacters(filters, currentPage === maxPage ? 1 : ++currentPage);

$inputName.oninput = () => {
  filters.name = $inputName.value.trim();
  getNewCharacters(filters);
};

$radiosStatus.forEach(
  (radio) =>
    (radio.onchange = () => {
      filters.status = radio.value;
      getNewCharacters(filters);
    }),
);

getNewCharacters(filters);
