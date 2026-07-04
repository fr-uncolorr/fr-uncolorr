const fs = require("fs");

const WIDTH = 32;
const HEIGHT = 26;

const STATE_FILE = "state.json";

// conways game of life rules
// - any dead cell with = 3 n turns into a living cell
// - any living cell with < 2 n dies from isolation
// - any living cell with > 3 n dies from overcrowding
// - any living cell with = 2 : 3 n remains alive

// functions for loop

// load and save state
// generates new grid if no state exists (first game)

function loadState() {
    if (!fs.existsSync(STATE_FILE)) {
        const grid = generateRandomGrid();

        return {
            time: 0,
            games: 1,
            population: 0,
            history: [],
            grid
        };
    }

    return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
}

function saveState(state) {
    fs.writeFileSync(
        STATE_FILE,
        JSON.stringify(state, null, 4),
        "utf8"
    );
}

// generate random grid
// 35% chance of generating a living cell

function generateRandomGrid() {
    let grid = "";

    for (let i = 0; i < WIDTH * HEIGHT; i++) {
        grid += Math.random() < 0.35 ? "1" : "0";
    }
    
    return grid;
}

// grid and matrix conversion

function gridToMatrix(grid) {
    const matrix = [];

    for (let y = 0; y < HEIGHT; y++) {
        const row = [];

        for (let x = 0; x < WIDTH; x++) {
            const index = y * WIDTH + x;

            row.push(Number(grid[index]));
        }

        matrix.push(row);
    }

    return matrix;
}

function gridToLines(matrix) {
    const lines = [];
    for (const row of matrix) {
        lines.push(row.map(cell => cell ? "██" : "  ").join(""));
    }
    return lines;
}

function printGrid(matrix) {
    const lines = gridToLines(matrix);
    for (const line of lines) {
        console.log(line);
    }
}

function getGridHash(grid) {
    // Simple hash: just use the grid string itself
    return grid;
}

function matrixToGrid(matrix) {
    let grid = "";

    for (const row of matrix) {
        for (const cell of row) {
            grid += cell;
        }
    }

    return grid;
}

function printHeader(time, population, games) {
    return `Conway's Game of Life | Generation: ${time} | Population: ${population} | Games: ${games}`;
}

function generateSVG(headerText, gridLines) {
    const lineHeight = 20;
    const topPadding = 30;
    const leftPadding = 20;
    const svgHeight = topPadding + (gridLines.length + 1) * lineHeight + 20;
    const svgWidth = 900;

    let textElements = ``;
    let y = topPadding;

    // Add header
    textElements += `<text class="text" x="${leftPadding}" y="${y}" xml:space="preserve">${escapeHtml(headerText)}</text>\n`;
    y += lineHeight * 2;

    // Add grid lines
    for (const line of gridLines) {
        textElements += `<text class="text" x="${leftPadding}" y="${y}" xml:space="preserve">${escapeHtml(line)}</text>\n`;
        y += lineHeight;
    }

    const svg = `<svg xmlns="http://www.w3.org/2000/svg"
     width="${svgWidth}"
     height="${svgHeight}">

<style>
  :root {
    color-scheme: light dark;
  }

  .background {
    fill: #ffffff;
  }

  .text {
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    font-size: 16px;
    fill: #24292f;
  }

  @media (prefers-color-scheme: light) {
    .background {
      fill: #ffffff;
    }

    .text {
      fill: #24292f;
    }
  }

  @media (prefers-color-scheme: dark) {
    .background {
      fill: #0d1117;
    }

    .text {
      fill: #f0f6fc;
    }
  }
</style>

<rect class="background" width="100%" height="100%"/>

${textElements}</svg>`;

    return svg;
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

function saveSVG(svg, filename) {
    fs.writeFileSync(filename, svg, "utf8");
}

// game and generation functions

function countNeighbors(matrix, x, y) {
    let neighbors = 0

    for (let dy = -1; dy <= 1; dy++) {

        for (let dx = -1; dx <= 1; dx++) {

            if (dx === 0 && dy === 0) continue;

            const nx = x + dx;
            const ny = y + dy;

            if (
                nx >= 0 &&
                nx < WIDTH &&
                ny >= 0 &&
                ny < HEIGHT
            ) {
                neighbors += matrix[ny][nx];
            }
        }
    }

    return neighbors;
}

function nextGeneration(matrix) {
    const next = [];

    for (let y = 0; y < HEIGHT; y++) {

        next[y] = [];

        for (let x = 0; x < WIDTH; x++) {
            const alive = matrix[y][x];
            const neighbors = countNeighbors(matrix, x, y);

            if (alive) {

                if (neighbors < 2 || neighbors > 3)
                    next[y][x] = 0;
                else
                    next[y][x] = 1;

            } else {

                if (neighbors === 3)
                    next[y][x] = 1;
                else
                    next[y][x] = 0;
            }
        }
    }

    return next;
}

// base loop

function main() {
    const state = loadState();

    const matrix = gridToMatrix(state.grid);

    const nextMatrix = nextGeneration(matrix);

    state.grid = matrixToGrid(nextMatrix);

    // calculations for logging only
    state.population = state.grid.split("").filter(cell => cell === "1").length;
    state.time++;

    const newHash = getGridHash(state.grid);

    // Check if universe has stabilized (cycle detected)
    if (state.history.includes(newHash)) {
        console.log("Universe stabilized! Restarting...");
        state.games++;
        state.time = 0;
        state.history = [];
        state.grid = generateRandomGrid();
        state.population = state.grid.split("").filter(cell => cell === "1").length;
    } else {
        // Add to history only if not a cycle
        state.history.push(newHash);
    }

    saveState(state);

    const headerText = printHeader(state.time, state.population, state.games);
    console.log(headerText);

    const gridLines = gridToLines(nextMatrix);
    const svg = generateSVG(headerText, gridLines);
    saveSVG(svg, "state.svg");
}

if (require.main === module) {
    main();
}

module.exports = {
    generateSVG
};

// todo: change state.history.includes(newHash) to Set.has