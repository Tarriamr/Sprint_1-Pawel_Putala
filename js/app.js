const urlAPI = "https://rickandmortyapi.com/api/character";
const urlLS = "http://localhost:3000/api/character";
let url = urlAPI;
let maxPage = 1;
let currentPage = 1;
let filters = { name: "", status: "" };

const $buttonGoTo = document.querySelector("#goTo");
const $displayElements = document.querySelector(".displayedElements");
const $buttonLeft = document.querySelector("#left");
const $buttonRight = document.querySelector("#right");
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
  const $createCharacter = document.querySelector("#createCharacter");
  const isSinglePage = maxPage === 1;

  $buttonLeft.style.visibility = isSinglePage ? "hidden" : "visible";
  $buttonRight.style.visibility = isSinglePage ? "hidden" : "visible";
  $createCharacter.style.visibility = url === urlAPI ? "hidden" : "visible";
}

function getNewCharacters(filters, pageNumber = 1) {
  fetchCharacters(pageNumber, filters)
    .then(displayCharacters)
    .catch((error) => {
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
    });
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
      removeCharacter(id).then(() => getNewCharacters(filters));
    characterContainer.append(buttonRemoveCharacter);
  }

  return characterContainer;
}

$buttonLeft.onclick = () => {
  const newPage = currentPage === 1 ? maxPage : --currentPage;
  getNewCharacters(filters, newPage);
};

$buttonRight.onclick = () => {
  const newPage = currentPage === maxPage ? 1 : ++currentPage;
  getNewCharacters(filters, newPage);
};

$inputName.oninput = () => {
  filters.name = $inputName.value.trim();
  getNewCharacters(filters);
};

$radiosStatus.forEach((radio) => {
  radio.onchange = () => {
    filters.status = radio.value;
    getNewCharacters(filters);
  };
});

$buttonGoTo.onclick = () => {
  if (url === urlAPI) {
    fetchCharacters(currentPage, filters).then((result) => {
      url = urlLS;
      $buttonGoTo.textContent = "Przejdź do API";
      resetFilters();
      getNewCharacters(filters);
      $info.style.visibility = "hidden";

      fetch(`${urlLS}/init`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result),
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("Network response was not ok.");
          }
          return response.json();
        })
        .catch((error) => console.error("Error sending data: ", error));
    });
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
    await fetch(`${urlLS}/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
  }
}

async function addCharacter() {
  const addName = document.querySelector("#characterName");
  const addStatus = document.querySelector("#characterStatus");
  const addSpecies = document.querySelector("#characterSpecies");
  const addImage = "https://rickandmortyapi.com/api/character/avatar/3.jpeg";

  try {
    await fetch(`${urlLS}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: addName,
        status: addStatus,
        species: addSpecies,
        image: addImage,
      }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok.");
        }
        return response.json();
      })
      .catch((error) => console.error("Error sending data: ", error));

    getNewCharacters(filters);
  } catch (e) {
    console.error(e);
  }
}

getNewCharacters(filters);
