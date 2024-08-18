const SWAPI_URL = 'https://swapi.dev/api/people/?page=1';
const MAX_CHARACTERS = 40;
const WORDS_TO_USE = 15;
const GRID_SIZE = 20;
const popularCharacters = [
    "LUKE", "LEIA", "HAN", "CHEWBACCA", "VADER", "YODA", "OBIWAN", "R2D2", "C3PO",
    "ANAKIN", "PADME", "QUIGON", "MACE", "PALPATINE", "REY", "FINN", "POE", "KYLO",
    "BB8", "JABBA", "LANDO", "BOBA", "JANGO", "DOOKU", "GRIEVOUS", "MAUL"
];

const directions = [
    [0, 1], [1, 0], [1, 1], [-1, 1],
    [0, -1], [-1, 0], [-1, -1], [1, -1]
];

let selectedWords = [];
let foundWords = [];
let currentSelection = [];
let selectionStart = null;

async function fetchStarWarsCharacters(url, characters = []) {
    try {
        showLoading(true);
        const response = await fetch(url);
        const data = await response.json();
        
        
        const newCharacters = data.results.map(char => ({
            original: char.name,
            transformed: char.name.toUpperCase().replaceAll(' ','').replaceAll('é', 'e').replaceAll('-','')
        }))

        characters = characters.concat(newCharacters);
        
        if (data.next && characters.length < MAX_CHARACTERS) {
            return fetchStarWarsCharacters(data.next, characters);
        }
        
        const popularFound = characters.filter(char => popularCharacters.includes(char.transformed));
        const otherCharacters = characters.filter(char => !popularCharacters.includes(char.transformed));
        
        return [...popularFound, ...otherCharacters].slice(0, MAX_CHARACTERS)
    } catch (error) {
        throw new Error(`Failed to fetch Star Wars characters: ${error.message}`);
    } finally {
        showLoading(false);
    }
}

function selectRandomCharacters(characters, count) {
    const popularCount = Math.min(Math.ceil(count / 2), popularCharacters.length);
    const otherCount = count - popularCount;

    const selectedPopular = characters.filter(char => popularCharacters.includes(char.transformed))
                                      .sort(() => 0.5 - Math.random())
                                      .slice(0, popularCount);
    
    const selectedOther = characters.filter(char => !popularCharacters.includes(char.transformed))
                                    .sort(() => 0.5 - Math.random())
                                    .slice(0, otherCount);

    return [...selectedPopular, ...selectedOther];
}

function generateWordSearch(words) {
    const grid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(''));
    
    words.forEach(word => {
        let placed = false;
        let attempts = 0;
        while (!placed && attempts < 100) {
            const direction = directions[Math.floor(Math.random() * directions.length)];
            const [startX, startY] = [Math.floor(Math.random() * GRID_SIZE), Math.floor(Math.random() * GRID_SIZE)];

            if (canPlaceWord(grid, word.transformed, startX, startY, direction)) {
                placeWord(grid, word.transformed, startX, startY, direction);
                placed = true;
            }
            attempts++;
        }
    });

    fillEmptySpaces(grid);
    return grid;
}

function canPlaceWord(grid, word, startX, startY, [dx, dy]) {
    return word.split('').every((letter, i) => {
        const [x, y] = [startX + i * dx, startY + i * dy];
        return x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE &&
               (grid[x][y] === '' || grid[x][y] === letter);
    });
}

function placeWord(grid, word, startX, startY, [dx, dy]) {
    word.split('').forEach((letter, i) => {
        const [x, y] = [startX + i * dx, startY + i * dy];
        grid[x][y] = letter;
    });
}

function fillEmptySpaces(grid) {
    for (let i = 0; i < GRID_SIZE; i++) {
        for (let j = 0; j < GRID_SIZE; j++) {
            if (grid[i][j] === '') {
                grid[i][j] = String.fromCharCode(65 + Math.floor(Math.random() * 26));
            }
        }
    }
}

function displayWordSearch(grid) {
    const wordSearchElem = document.getElementById('wordSearch');
    wordSearchElem.innerHTML = grid.map((row, i) => 
        row.map((letter, j) => `<span data-row="${i}" data-col="${j}">${letter}</span>`).join('')
    ).join('');

    wordSearchElem.addEventListener('mousedown', startSelection);
    wordSearchElem.addEventListener('mousemove', updateSelection);
    wordSearchElem.addEventListener('mouseup', endSelection);
    document.addEventListener('mouseup', endSelection);

    wordSearchElem.addEventListener('touchstart', handleTouchStart, { passive: false });
    wordSearchElem.addEventListener('touchmove', handleTouchMove, { passive: false });
    wordSearchElem.addEventListener('touchend', handleTouchEnd, { passive: false });
}

function displayWordList(words) {
    const wordListElem = document.getElementById('wordList');
    wordListElem.innerHTML = '<h2>Words to find:</h2>' + 
        words.map(word => `<span class="word">${word.original}</span>`).join(', ');
    selectedWords = words
    startTimer()
}

function startSelection(e) {
    if (e.target.tagName === 'SPAN') {
        clearSelection();
        selectionStart = e.target;
        currentSelection = [e.target];
        e.target.classList.add('selected');
    }
}

function updateSelection(e) {
    if (selectionStart && e.target.tagName === 'SPAN') {
        const startRow = parseInt(selectionStart.dataset.row);
        const startCol = parseInt(selectionStart.dataset.col);
        const currentRow = parseInt(e.target.dataset.row);
        const currentCol = parseInt(e.target.dataset.col);

        const rowDiff = currentRow - startRow;
        const colDiff = currentCol - startCol;

        if (rowDiff === 0 || colDiff === 0 || Math.abs(rowDiff) === Math.abs(colDiff)) {
            clearSelection();
            currentSelection = [selectionStart];
            selectionStart.classList.add('selected');

            const steps = Math.max(Math.abs(rowDiff), Math.abs(colDiff));
            const rowStep = rowDiff / steps;
            const colStep = colDiff / steps;

            for (let i = 1; i <= steps; i++) {
                const row = startRow + i * rowStep;
                const col = startCol + i * colStep;
                const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                if (cell) {
                    currentSelection.push(cell);
                    cell.classList.add('selected');
                }
            }
        }
    }
}

function endSelection() {
    if (currentSelection.length > 0) {
        const selectedWord = currentSelection.map(span => span.textContent).join('');
        checkWord(selectedWord);
    }
    clearSelection();
    selectionStart = null;
}

function clearSelection() {
    const wordSearched = document.querySelectorAll('.selected')
    wordSearched.forEach(span => span.classList.remove('selected'));
    currentSelection = [];
}

let timer,
    running,
    display,
    duration = 0

function startTimer(){
    if (running === 1){
        console.log('the timer has already begun')
        return
    }
    let begin = +new Date()
    timer = setInterval(() => {
        duration = ((+new Date() - begin) / 1000)
        let minutes = Math.floor(duration / 60);
        let seconds = Math.floor(duration % 60);
        let hundredths = Math.floor((duration % 1) * 100);
        
        if (minutes < 1) {
            if (seconds < 1) {
                display = `Time: .${hundredths.toString().padStart(2, '0')}`;
            } else if (seconds < 10) {
                display = `Time: ${seconds}.${hundredths.toString().padStart(2, '0')}`;
            } else {
                display = `Time: ${seconds.toString().padStart(2, '0')}.${hundredths.toString().padStart(2, '0')}`;
            }
        } else {
            display = `Time: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${hundredths.toString().padStart(2, '0')}`;
        }

        document.querySelector('.current-time').textContent = display
    },10)
    running = 1
}

function stopTimer(){
    if (running === 0){
        console.log('timers not running')
        return
    }
    clearInterval(timer)
}

function resetTimer(){
    duration = 0
}


function checkWord(word) {
    const straightIndex = selectedWords.findIndex(w => w.transformed === word)
    const revIndex = selectedWords.findIndex(w => w.transformed === word.split('').reverse().join(''))

    const index = straightIndex !== -1 ? straightIndex : revIndex
    if (index !== -1 && !foundWords.includes(selectedWords[index].transformed)) {
        foundWords.push(selectedWords[index].transformed);
        illuminateFoundWord(word);
        updateFoundWords();
        updateWordList();
        playFoundWordSound();
        
        if (foundWords.length === selectedWords.length) {
            stopTimer()
            endGame();
        }
    }
}

function illuminateFoundWord(word) {
    const colors = ['red', 'blue', 'green', 'purple'];
    const colorIndex = foundWords.length % 4;
    const color = colors[colorIndex];
    
    currentSelection.forEach(span => {
        span.classList.add('found');
        span.setAttribute('data-color', color);
    });
}

function updateFoundWords() {
    const foundWordsElem = document.querySelector('#foundWords ul');
    foundWordsElem.innerHTML = foundWords.map(word => {
        const origWord = selectedWords.find(w => w.transformed === word).original
        return `<li>${origWord}</li>`
    }).join('')
}

function updateWordList() {
    const wordListElem = document.getElementById('wordList');
    const words = wordListElem.querySelectorAll('.word');
    words.forEach(wordElem => {
        const transformedWord = selectedWords.find(w => w.orignal === wordElem.textContent).transformed
        if (foundWords.includes(transformedWord)) {
            wordElem.classList.add('found');
        }
    });
}

function playFoundWordSound() {
    const audio = document.getElementById('foundWordSound');
    if (audio) {
        audio.currentTime = 0;
        const playPromise = audio.play();

        if (playPromise !== undefined) {
            playPromise.then(_ => {
            }).catch(error => {
                console.log("Audio playback was prevented. Error: ", error);
                showPlayButton();
            });
        }
    } else {
        console.error("Audio element 'foundWordSound' not found");
    }
}

function showPlayButton() {
    const playButton = document.createElement('button');
    playButton.textContent = 'Play Sound';
    playButton.onclick = function() {
        const audio = document.getElementById('foundWordSound');
        if (audio) {
            audio.play().catch(error => console.error('Error playing sound:', error));
        }
        this.remove()
    };
    document.body.appendChild(playButton);
}

function showLoading(isLoading) {
    document.getElementById('loading').style.display = isLoading ? 'block' : 'none';
}

function showError(message) {
    const errorElem = document.getElementById('error');
    errorElem.textContent = message;
    errorElem.style.display = 'block';
}

function handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    if (target.tagName === 'SPAN') {
        startSelection({ target });
    }
}

function handleTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    if (target.tagName === 'SPAN') {
        updateSelection({ target });
    }
}

function handleTouchEnd(e) {
    e.preventDefault();
    endSelection();
}

function endGame() {
    const wordSearchElem = document.getElementById('wordSearch');
    
    const letterSpans = wordSearchElem.querySelectorAll('span');
    letterSpans.forEach(span => {
      span.style.visibility = 'hidden';
    });
  
    const messageElem = document.createElement('div');
    messageElem.id = 'winMessage';
    messageElem.innerHTML = `
      <h1>Congrats!</h1>
      <p>You're a Jedi Master!</p>
      <button id="restartButton">Play Again</button>
    `;
    wordSearchElem.appendChild(messageElem);
  
    const winSound = new Audio('audio/saber_sfx_win.mp3');
    winSound.play().catch(error => console.error('Error playing win sound:', error));
  
    document.getElementById('restartButton').addEventListener('click', restartGame);
  }

  function restartGame() {
    const winMessage = document.getElementById('winMessage');
    if (winMessage) {
        winMessage.remove();
    }
    
    const letterSpans = document.querySelectorAll('#wordSearch span');
    letterSpans.forEach(span => {
        span.style.visibility = 'visible';
    });
    
    foundWords = [];
    currentSelection = [];
    selectionStart = null;
    
    document.getElementById('wordList').innerHTML = '';
    document.querySelector('#foundWords ul').innerHTML = '';
    
    resetTimer()
    initializeGame();
  }

async function initializeGame() {
    try {
        const allCharacters = await fetchStarWarsCharacters(SWAPI_URL);
        const selectedCharacters = selectRandomCharacters(allCharacters, WORDS_TO_USE);
        const grid = generateWordSearch(selectedCharacters);

        displayWordSearch(grid);
        displayWordList(selectedCharacters);
        
        foundWords = [];
    } catch (error) {
        showError(`Failed to start the game: ${error.message}`);
    }
}

initializeGame();