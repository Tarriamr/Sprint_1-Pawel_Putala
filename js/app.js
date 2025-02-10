const urlAPI = "https://rickandmortyapi.com/api/character";
const urlLS = "http://localhost:3000/api/character";
let url = urlAPI;
let maxPage = 1;
let currentPage = 1;
let filters = { name: "", status: "" };

const $displayElements = document.querySelector(".displayedElements");
const $buttonGoTo = document.querySelector("#goTo");
const $buttonLeft = document.querySelector("#left");
const $buttonRight = document.querySelector("#right");
const $buttonAddCharacter = document.querySelector("#addCharacter");
const $inputName = document.querySelector("#name");
const $radiosStatus = document.querySelectorAll('input[type="radio"]');
const $info = document.querySelector(".info");

$buttonGoTo.textContent = "Przejdź do Live Server";

async function fetchCharacters(pageNumber, filters) {
  try {
    const params = new URLSearchParams({ page: pageNumber, ...filters });
    const response = await fetch(`${url}?${params}`);

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

function updateVisibility() {
  const isSinglePage = maxPage === 1;
  $buttonLeft.style.visibility = isSinglePage ? "hidden" : "visible";
  $buttonRight.style.visibility = isSinglePage ? "hidden" : "visible";
  document.querySelector("#createCharacter").style.visibility =
    url === urlAPI ? "hidden" : "visible"; // Direct querySelector
}

async function getNewCharacters(filters, pageNumber = 1) {
  try {
    const characters = await fetchCharacters(pageNumber, filters);
    displayCharacters(characters);
    updateVisibility();
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
    updateVisibility();
  }
}

function createCharacter({ id, image, name, species, status }) {
  const characterContainer = document.createElement("div");
  characterContainer.className = "character";
  characterContainer.style.height = url === urlAPI ? "230px" : "270px";

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

  if (url === urlLS) {
    const buttonRemoveCharacter = document.createElement("button");
    buttonRemoveCharacter.id = id;
    buttonRemoveCharacter.className = "removeButton";
    buttonRemoveCharacter.textContent = "Usuń postać";
    buttonRemoveCharacter.onclick = () =>
      removeCharacter(id).then(() => getNewCharacters(filters)); // Keep then for chaining
    characterContainer.append(buttonRemoveCharacter);
  }

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

$buttonGoTo.onclick = async () => {
  if (url === urlAPI) {
    try {
      const result = await fetchCharacters(currentPage, filters);
      url = urlLS;
      $buttonGoTo.textContent = "Przejdź do API";
      resetFilters();
      $info.style.visibility = "hidden";

      const response = await fetch(`${urlLS}/init`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result),
      });

      if (!response.ok) {
        throw new Error("Network response was not ok.");
      }

      // Wywołanie getNewCharacters(filters) po pomyślnym wysłaniu danych
      await getNewCharacters(filters);
    } catch (error) {
      console.error("Error sending data or initializing:", error);
    }
  } else {
    $buttonGoTo.textContent = "Przejdź do Live Server";
    url = urlAPI;
    resetFilters();
    getNewCharacters(filters);
    $info.style.visibility = "visible";
  }
};

function resetFilters() {
  filters = { name: "", status: "" };
  $inputName.value = "";
  $radiosStatus.forEach((radio) => (radio.checked = false));
}

async function removeCharacter(id) {
  try {
    const response = await fetch(`${urlLS}/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (e) {
    console.error("Error removing character:", e);
  }
}

async function addCharacter() {
  const addName = document.querySelector("#characterName");
  const addStatus = document.querySelector("#characterStatus");
  const addSpecies = document.querySelector("#characterSpecies");
  const addImage = "https://rickandmortyapi.com/api/character/avatar/3.jpeg";

  try {
    const response = await fetch(`${urlLS}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: addName.value,
        status: addStatus.value,
        species: addSpecies.value,
        image: addImage,
      }), // Use .value
    });

    if (!response.ok) {
      throw new Error("Network response was not ok.");
    }

    await getNewCharacters(filters); // Await here to refresh display after add

    addName.value = "";
    addSpecies.value = "";
    addStatus.value = "unknown";
  } catch (e) {
    console.error("Error adding character:", e);
  }
}

$buttonAddCharacter.onclick = addCharacter; // Direct assignment, addCharacter is already async

getNewCharacters(filters);
