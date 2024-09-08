

if (!localStorage.getItem('totalWins')){
    localStorage.setItem('totalWins', 0)
}
let totalWins = parseInt(localStorage.getItem('totalWins'), 10)

document.querySelector('.total-wins').textContent = `Total Wins: ${totalWins}`



if (!localStorage.getItem('recordTime')){
    localStorage.setItem('recordTime', 'N/A')
}

let recordTime = localStorage.getItem('recordTime')

if(Number(localStorage.getItem('recordTime'))){

    recordTime = Number(localStorage.getItem('recordTime'))


}



if (!localStorage.getItem('recordDuration')){
    localStorage.setItem('recordDuration', Infinity)
}

if(isFinite(+localStorage.getItem('recordDuration'))){
    document.querySelector('.best-time').textContent = `Record  ${recordTime}`
}


// Update the DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', () => {
    const difficultyButtons = document.querySelectorAll('input[name="level"]');

    difficultyButtons.forEach(radio => {
        radio.addEventListener('change', applyDifficulty);
    });

    createLoadingBar();
    initializeRecordTimeDisplay(); // Add this line
    applyDifficulty()
});


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
        const response = await fetch(url);
        const data = await response.json();
        
        const newCharacters = data.results.map(char => ({
            original: char.name,
            transformed: char.name.replaceAll(' ','').replaceAll('é', 'e').replaceAll('-','').toUpperCase()
        }));

        characters = characters.concat(newCharacters);
        
        if (data.next && characters.length < MAX_CHARACTERS) {
            return fetchStarWarsCharacters(data.next, characters);
        }
        
        const popularFound = characters.filter(char => popularCharacters.includes(char.transformed));
        const otherCharacters = characters.filter(char => !popularCharacters.includes(char.transformed));
        
        return [...popularFound, ...otherCharacters].slice(0, MAX_CHARACTERS)
    } catch (error) {
        throw new Error(`Failed to fetch Star Wars characters: ${error.message}`);
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
        return
    }
    clearInterval(timer)
    running = 0
}
function resetTimer() {
    stopTimer();
    duration = 0;
    running = 0;
    // Reset the display
    document.querySelector('.current-time').textContent = 'Time: 0.00';
}

function applyDifficulty() {
    const difficulty = document.querySelector('input[name="level"]:checked');
    const wordsToFind = document.getElementById('wordList');
    if (difficulty) {
        showLoadingState();

        if (difficulty.value === 'padawan') {
            wordsToFind.style.display = 'block';
        } else if (difficulty.value === 'jediMaster') {
            wordsToFind.style.display = 'none';
        }

        setTimeout(() => restartGame(), 50); // Small delay to ensure UI updates
    } else {
        console.warn("No difficulty level selected");
    }
}

function showLoadingState() {
    // Show loading bar
    const wordSearchElem = document.getElementById('wordSearch');
    if (wordSearchElem) {
        wordSearchElem.innerHTML = ''; // Clear the grid
        const loadingBar = createLoadingBar();
        loadingBar.style.display = 'block';
    }

    // Show loading message
    const loadingElem = document.getElementById('loading');
    if (loadingElem) {
        loadingElem.style.display = 'block';
        loadingElem.textContent = 'Loading Star Wars data...';
    }

    // Clear word list
    const wordListElem = document.getElementById('wordList');
    if (wordListElem) {
        wordListElem.innerHTML = '<h2>Words to find:</h2>Loading...';
    }

    // Clear found words
    const foundWordsElem = document.querySelector('#foundWords ul');
    if (foundWordsElem) {
        foundWordsElem.innerHTML = '';
    }

    // Stop the timer
    stopTimer();
    // Reset the timer display
    document.querySelector('.current-time').textContent = 'Time: 0.00';
}

function hideLoadingState() {
    // Hide loading bar
    const loadingBar = document.getElementById('loading-bar');
    if (loadingBar) {
        loadingBar.style.display = 'none';
    }

    // Hide loading message
    const loadingElem = document.getElementById('loading');
    if (loadingElem) {
        loadingElem.style.display = 'none';
    }
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
            endGame()
            setRecordTime()
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
        const transformedWord = selectedWords.find(w => w.original === wordElem.textContent).transformed
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

function addToTotalWins(){
    totalWins++
    localStorage.setItem('totalWins', totalWins.toString())
    document.querySelector('.total-wins').textContent = `Total Wins: ${totalWins}`
}

// Add this function to initialize record time display
function initializeRecordTimeDisplay() {
    const recordTime = localStorage.getItem('recordTime');
    const recordDuration = parseFloat(localStorage.getItem('recordDuration'))
    
    if (recordTime && recordTime !== 'N/A' && isFinite(recordDuration)) {
        document.querySelector('.best-time').textContent = `Record: ${recordTime}`;
    } else {
        document.querySelector('.best-time').textContent = 'Record: N/A';
    }
}

function setRecordTime() {

    let recordDuration = parseFloat(localStorage.getItem('recordDuration'));
    if (!isFinite(recordDuration) || duration < recordDuration) {
        localStorage.setItem('recordDuration', duration.toString());
        localStorage.setItem('recordTime', display);
        document.querySelector('.best-time').textContent = `Record: ${display}`;
    }
}

function createLoadingBar() {
    let loadingBar = document.getElementById('loading-bar');
    if (!loadingBar) {
        loadingBar = document.createElement('div');
        loadingBar.id = 'loading-bar';
        loadingBar.className = 'loading-bar';
        const wordSearchElem = document.getElementById('wordSearch');
        if (wordSearchElem) {
            wordSearchElem.appendChild(loadingBar);
        }
    }
    return loadingBar;
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

// Modify the endGame function to call setRecordTime
function endGame() {
    stopTimer();
    setRecordTime(); // Add this line
    addToTotalWins();
    
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

    // Play both sounds
    const winSound = new Audio('audio/saber_sfx_win.mp3');
    const winSong = new Audio('audio/win_song.mp3');

    winSound.play().catch(error => console.error('Error playing win sound:', error));
    winSong.play().catch(error => console.error('Error playing win song:', error));
  
    document.getElementById('restartButton').addEventListener('click', restartGame);
}

function restartGame() {
    // Reset game variables
    foundWords = [];
    currentSelection = [];
    selectionStart = null;

    // Reset the display of wordsToFind element
    const wordsToFind = document.getElementById('wordList');
    wordsToFind.style.display = 'block'; // Ensure it is visible by default

    // Initialize the game
    initializeGame();
}



async function initializeGame() {
    try {
        showLoadingState();

        const allCharacters = await fetchStarWarsCharacters(SWAPI_URL);
        selectedWords = selectRandomCharacters(allCharacters, WORDS_TO_USE);

        const grid = generateWordSearch(selectedWords);
        
        hideLoadingState();

        displayWordSearch(grid);
        displayWordList(selectedWords);

        // Start the timer after everything is loaded
        startTimer();
    } catch (error) {
        hideLoadingState();
        showError(`Failed to start the game: ${error.message}`);
    }
}

