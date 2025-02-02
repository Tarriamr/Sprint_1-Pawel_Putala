const urlAPI = "https://rickandmortyapi.com/api/character";
const urlLS = "http://localhost:3000/api/character";
let url = urlAPI;
let maxPage = 1;
let currentPage = 1;
let filters = {
  name: "",
  status: "",
};

const $goToButton = document.querySelector("#goTo");
const $displayElements = document.querySelector(".displayedElements");
const $leftButton = document.querySelector("#left");
const $rightButton = document.querySelector("#right");
const $nameInput = document.querySelector("#name");
const $statusRadios = document.querySelectorAll('input[type="radio"]');
const $info = document.querySelector(".info");

$goToButton.textContent = "Przejdź do Live Server";

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
        const message = `An error occurred: ${response.status}`;
        throw new Error(message);
      }
    }

    const data = await response.json();
    const {
      info: { pages },
      results,
    } = data;
    maxPage = pages;
    currentPage = pageNumber;
    console.log("max page:", maxPage);

    return results.map((character) => ({
      id: character.id,
      name: character.name,
      status: character.status,
      species: character.species,
      image: character.image,
    }));
  } catch (error) {
    console.error("Error fetching characters:", error);
    throw new Error(`Błąd pobierania danych z API: ${error.message}`);
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

function updateCarouselButtons() {
  const $createCharacter = document.querySelector("#createCharacter");

  $leftButton.style.visibility = maxPage === 1 ? "hidden" : "visible";
  $rightButton.style.visibility = maxPage === 1 ? "hidden" : "visible";
  $createCharacter.style.visibility = url === urlAPI ? "hidden" : "visible";
}

function getNewCharacters(filters, pageNumber = 1) {
  console.log(url);
  fetchCharacters(pageNumber, filters)
    .then((characters) => {
      displayCharacters(characters);
      updateCarouselButtons();
    })
    .catch((error) => {
      console.error("Wystąpił błąd:", error);
      $displayElements.innerHTML = "";
      const $message = document.createElement("div");
      $message.className = "empty";
      $message.textContent =
        "Wystąpił błąd podczas pobierania danych. Spróbuj ponownie później.";
      $displayElements.append($message);
      updateCarouselButtons();
    });
}

function createCharacter(id, image, name, species, status) {
  const divCharacter = document.createElement("div");
  divCharacter.className = "character";
  divCharacter.style.height = url === urlAPI ? "230px" : "270px";

  const avatarCharacter = document.createElement("div");
  avatarCharacter.className = "avatar";
  avatarCharacter.style.backgroundImage = `url("${image}")`;

  const nameCharacter = document.createElement("h2");
  nameCharacter.className = "name";
  nameCharacter.textContent = name;

  const statusCharacter = document.createElement("h3");
  statusCharacter.className = "status";
  statusCharacter.textContent = `Status: ${status}`;

  const speciesCharacter = document.createElement("h3");
  speciesCharacter.className = "species";
  speciesCharacter.textContent = `Gatunek: ${species}`;

  divCharacter.append(
    avatarCharacter,
    nameCharacter,
    statusCharacter,
    speciesCharacter,
  );

  const removeCharacterButton = document.createElement("button");
  removeCharacterButton.id = id;
  removeCharacterButton.className = "removeButton";
  removeCharacterButton.textContent = "Usuń postać";
  removeCharacterButton.onclick = () => {
    removeCharacter(id).then(() => getNewCharacters(filters));
  };

  if (url === urlLS) {
    divCharacter.append(removeCharacterButton);
  }

  return divCharacter;
}

$leftButton.onclick = () => {
  const newPage = currentPage === 1 ? maxPage : --currentPage;
  getNewCharacters(filters, newPage);
};

$rightButton.onclick = () => {
  const newPage = currentPage === maxPage ? 1 : ++currentPage;
  getNewCharacters(filters, newPage);
};

$nameInput.oninput = () => {
  filters.name = $nameInput.value.trim();
  getNewCharacters(filters);
};

$statusRadios.forEach((radio) => {
  radio.onchange = () => {
    filters.status = radio.value;
    getNewCharacters(filters);
  };
});

getNewCharacters(filters);

$goToButton.onclick = () => {
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
      $goToButton.textContent = "Przejdź do API";
      getNewCharacters(filters);
      $info.style.visibility = "hidden";
    });
  } else {
    $goToButton.textContent = "Przejdź do Live Server";
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
