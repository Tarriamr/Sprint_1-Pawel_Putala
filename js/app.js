const urlAPI = "https://rickandmortyapi.com/api/character";
const urlLS = "http://localhost:3000/api/character";
let url = urlAPI;
let maxPage = 1;
let currentPage = 1;
let filters = {
  name: "",
  status: "",
};

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
    const params = new URLSearchParams({
      page: pageNumber,
      name: filters.name,
      status: filters.status,
    });
    const response = await fetch(`${url}?${params}`);

    if (!response.ok) {
      if (response.status === 404) {
        console.error("No characters found.");
        return null;
      } else {
        throw new Error(`An error occurred: ${response.status}`);
      }
    }

    const data = await response.json();
    const {
      info: { pages },
      results,
    } = data;
    maxPage = pages;
    currentPage = pageNumber;

    return results.map((character) => ({
      id: character.id,
      name: character.name,
      status: character.status,
      species: character.species,
      image: character.image,
    }));
  } catch (error) {
    console.error("Error fetching characters:", error);
    throw new Error(`The error of getting data from API: ${error.message}`);
  }
}

function displayCharacters(characters) {
  $displayElements.innerHTML = "";

  if (!characters || characters.length === 0) {
    const $message = document.createElement("div");
    $message.className = "empty";
    $message.textContent =
      "Nie znaleziono postaci spełniających kryteria wyszukiwania.";
    $displayElements.append($message);
    return;
  }

  characters.forEach((character) => {
    $displayElements.append(
      createCharacter(
        character.id,
        character.image,
        character.name,
        character.species,
        character.status,
      ),
    );
  });
}

function updateVisibility() {
  const $createCharacter = document.querySelector("#createCharacter");

  $buttonLeft.style.visibility = maxPage === 1 ? "hidden" : "visible";
  $buttonRight.style.visibility = maxPage === 1 ? "hidden" : "visible";
  $createCharacter.style.visibility = url === urlAPI ? "hidden" : "visible";
}

function getNewCharacters(filters, pageNumber = 1) {
  fetchCharacters(pageNumber, filters)
    .then((characters) => {
      displayCharacters(characters);
      updateVisibility();
    })
    .catch((error) => {
      console.error("An error occurred:", error);
      $displayElements.innerHTML = "";
      const $message = document.createElement("div");
      $message.className = "empty";
      $message.textContent =
        "Wystąpił błąd podczas pobierania danych. Spróbuj ponownie później.";
      $displayElements.append($message);
      currentPage = 1;
      maxPage = 1;
      updateVisibility();
    });
}

function createCharacter(id, image, name, species, status) {
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

  const buttonRemoveCharacter = document.createElement("button");
  buttonRemoveCharacter.id = id;
  buttonRemoveCharacter.className = "removeButton";
  buttonRemoveCharacter.textContent = "Usuń postać";
  buttonRemoveCharacter.onclick = () => {
    removeCharacter(id).then(() => getNewCharacters(filters));
  };

  if (url === urlLS) {
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
  const $character = document.querySelectorAll(".character");
  if (url === urlAPI) {
    fetchCharacters(currentPage, filters).then((result) => {
      console.log("goTo result:", result);
      url = urlLS;
      console.log("goTo url:", url);
      fetch(`${urlLS}/init`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(result),
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("Network response was not ok.");
          }
          return response.json();
        })
        .then((data) => {
          console.log("Data saved.", data);
        })
        .catch((error) => {
          console.error("Error sending data: ", error);
        });

      console.log("url after goto:", url);
      $buttonGoTo.textContent = "Przejdź do API";
      getNewCharacters(filters);
      $info.style.visibility = "hidden";
    });
  } else {
    $buttonGoTo.textContent = "Przejdź do Live Server";
    url = urlAPI;
    getNewCharacters(filters);
    $info.style.visibility = "visible";
  }
};

async function removeCharacter(id) {
  try {
    await fetch(`${urlLS}/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
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
      headers: {
        "Content-Type": "application/json",
      },
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
      .then((data) => {
        console.log("Data saved.", data);
      })
      .catch((error) => {
        console.error("Error sending data: ", error);
      });

    console.log("url after add:", url);
    getNewCharacters(filters);
  } catch (e) {
    console.error(e);
  }
}

getNewCharacters(filters);
