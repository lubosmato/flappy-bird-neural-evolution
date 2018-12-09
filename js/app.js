const canvasWidth = 800;
const canvasHeight = 600;

const birdAbsVelocityLimit = 100.0;
const birdSize = 30;
const birdX = 50;
const birdJumpVelocity = 10.0;
const gravity = 1.0;

const defaultPipeSpace = 120;
const spaceBetweenPipes = 150;
const pipeWidth = 40;
const pipeSpeed = 2.0;

const populationSize = 200;

class Population {
    constructor(size) {
        this._populationSize = size;

        this._deadBirds = [];
        this._bestBirds = [];

        this._birds = [];
        this._generationCount = 0;
        this._scoreComparer = function (a, b) {
            if (a.score < b.score) {
                return 1;
            } else if (a.score > b.score) {
                return -1;
            }
            return 0;
        };

        for (let i = 0; i < size; i++) {
            this._birds.push(new Bird());
        }
    }

    add(bird) {
        this._birds.push(bird);
    }

    get generationCount() {
        return this._generationCount;
    }

    get size() {
        return this._birds.length;
    }

    get birds() {
        return this._birds;
    }

    get currentBest() {
        if (this.empty()) {
            return null;
        }

        let best = this._birds[0];
        for (let bird of this._birds) {
            if (best.score < bird.score) {
                best = bird;
            }
        }
        return best;
    }

    get bests() {
        return this._bestBirds;
    }

    reproduce() {
        this._generationCount++;

        const bestCount = 5;
        const unificationRatio = 0.8;

        this._bestBirds = this._bestBirds.concat(this._deadBirds.sort(this._scoreComparer));
        this._bestBirds = this._bestBirds.sort(this._scoreComparer).splice(0, bestCount);

        this._birds = [];
        this._deadBirds = [];

        for (let i = 0; i < this._populationSize; i++) {
            let bestIndex = Math.floor(Math.random() * this._bestBirds.length);
            let survival = this._bestBirds[bestIndex];

            let newBird = new Bird();
            // randomize
            newBird.brain.mutate(1.0, 10.0, 5.0);

            let connections = survival.brain._network.connections;

            for (let j = 0; j < connections.length; j++) {
                if (Math.random() < unificationRatio) {
                    newBird.brain._network.connections[j].weight = connections[j].weight;
                }
            }

            let nodes = survival.brain._network.nodes;

            for (let j = 0; j < nodes.length; j++) {
                if (Math.random() < unificationRatio) {
                    newBird.brain._network.nodes[j].bias = nodes[j].bias;
                }
            }
            this._birds.push(newBird);
        }

        this._deadBirds = [];
    }

    update(pipe) {
        for (let i = this._birds.length - 1; i >= 0; i--) {
            if (this._birds[i].y >= canvasHeight || this._birds[i].y == 0) {
                this._birds[i].die();
                this._deadBirds.push(this._birds[i]);
                this._birds.splice(i, 1);
                continue;
            }

            if (pipe.collide(this._birds[i])) {
                this._birds[i].die();
                this._deadBirds.push(this._birds[i]);
                this._birds.splice(i, 1);
                continue;
            }
            this._birds[i].update(pipe);
        }
    }

    draw() {
        for (let bird of this._birds) {
            bird.draw();
        }

        let best = this.currentBest;
        if (best) {
            best.brain.draw();
            best.draw(true);
        }
    }

    empty() {
        return this._birds.length == 0;
    }
}

class Brain {
    constructor() {
        // create the layers 5, 7, 1
        // inputs: birdY, birdVelocity, pipeTop, pipeBottom, pipeX 
        // outputs: jump

        this._lastInfo = [];
        this._network = new neataptic.Architect.Perceptron(5, 7, 1);
    }

    load(json) {
        this._network = neataptic.Network.fromJSON(JSON.parse(json));
    }

    save() {
        return JSON.stringify(this._network.toJSON());
    }

    mutate(mutationRate, mutationMultA, mutationMultB) {
        let connections = this._network.connections;
        let nodes = this._network.nodes;

        for (let i = 0; i < connections.length; i++) {
            if (Math.random() > mutationRate) {
                continue;
            }
            connections[i].weight += connections[i].weight * (Math.random() - 0.5) * mutationMultA + (Math.random() - 0.5) * mutationMultB;
        }

        for (let i = 0; i < nodes.length; i++) {
            if (Math.random() > mutationRate) {
                continue;
            }
            nodes[i].bias += nodes[i].bias * (Math.random() - 0.5) * mutationMultA + (Math.random() - 0.5) * mutationMultB;
        }
    }

    static drawProgress(x, y, value, color, label) {
        const height = 250;
        const width = 10;

        stroke(0);
        fill(255);
        rect(x, y, width, -height);

        stroke(0);
        fill(color[0], color[1], color[2]);
        rect(x, y - height, width, height * value);

        text(label, x - 1, y - 5 - height);
    }

    shouldJump(birdY, birdVelocity, pipeTop, pipeBottom, pipeX) {
        let output = this._network.activate([birdY, birdVelocity, pipeTop, pipeBottom, pipeX]);
        this._lastInfo = [birdY, birdVelocity, pipeTop, pipeBottom, pipeX, output[0]];
        return output[0] > 0.5;
    }

    draw() {
        const y = canvasHeight - 5;
        let spaceBetween = 18;

        Brain.drawProgress(canvasWidth - spaceBetween * 7, y, this._lastInfo[5] > 0.5 ? 1 : 0, [255, 150, 0], 'J');
        Brain.drawProgress(canvasWidth - spaceBetween * 6, y, this._lastInfo[5], [255, 0, 0], 'O');
        Brain.drawProgress(canvasWidth - spaceBetween * 5, y, this._lastInfo[0], [0, 255, 0], 'BY');
        Brain.drawProgress(canvasWidth - spaceBetween * 4, y, this._lastInfo[1], [0, 255, 255], 'BV');
        Brain.drawProgress(canvasWidth - spaceBetween * 3, y, this._lastInfo[2], [255, 0, 255], 'PT');
        Brain.drawProgress(canvasWidth - spaceBetween * 2, y, this._lastInfo[3], [255, 255, 0], 'PB');
        Brain.drawProgress(canvasWidth - spaceBetween * 1, y, this._lastInfo[4], [0, 0, 255], 'PX');
    }
}

class Bird {
    constructor() {
        this._x = birdX;
        this._y = canvasHeight / 2; // + random(-canvasHeight / 2, canvasHeight / 2)
        this._velocity = 0.0;
        this._score = 0;

        this._brain = new Brain();
        this._dead = false;
    }

    get x() {
        return this._x;
    }

    get y() {
        return this._y;
    }

    get score() {
        return this._score;
    }

    scoreUp() {
        this._score++;
    }

    get brain() {
        return this._brain;
    }

    static norm(range, value) {
        if (value == 0.0)
            return 0.0;
        return value / range;
    }

    update(nearestPipe) {
        let normBirdY = Bird.norm(canvasHeight, this._y);
        let normBirdVelocity = Bird.norm((birdAbsVelocityLimit * 2), this._velocity) + 0.5;
        let normPipeTop = Bird.norm(canvasHeight, nearestPipe.spaceStartY);
        let normPipeBottom = Bird.norm(canvasHeight, nearestPipe.spaceStartY + pipeSpaceSlider.value());
        let normPipeX = Bird.norm(canvasWidth, nearestPipe.x);

        if (this._brain.shouldJump(normBirdY, normBirdVelocity, normPipeTop, normPipeBottom, normPipeX)) {
            this.jump();
        }

        this.scoreUp();
        this._y += this._velocity;

        this._velocity += gravity;
        if (this._velocity > 0) {
            if (this._velocity > birdAbsVelocityLimit) {
                this._velocity = birdAbsVelocityLimit;
            }
        } else {
            if (-this._velocity > birdAbsVelocityLimit) {
                this._velocity = -birdAbsVelocityLimit;
            }
        }

        if (this._y >= canvasHeight) {
            this._y = canvasHeight;
            this._velocity = 0;
        }

        if (this._y < 0) {
            this._y = 0;
            this._velocity = 0;
        }
    }

    die() {
        this._dead = true;
    }

    get died() {
        return this._dead;
    }

    jump() {
        this._velocity = -birdJumpVelocity;
    }

    draw(highlighted = false) {
        stroke(0);
        if (highlighted) {
            fill(255, 10, 0);
        } else {
            fill(255, 200, 20);
        }
        ellipse(this._x, this._y, birdSize, birdSize);
    }
}

class Pipe {
    constructor(x) {
        this._x = x;
        this._spaceTop = random(canvasHeight - pipeSpaceSlider.value());
    }

    get x() {
        return this._x;
    }

    get spaceStartY() {
        return this._spaceTop;
    }

    collide(bird) {
        return collideRectCircle(this._x, 0, pipeWidth, this._spaceTop, bird.x, bird.y, birdSize - 2) || collideRectCircle(this._x, this._spaceTop + pipeSpaceSlider.value() + 2, pipeWidth, canvasHeight, bird.x, bird.y, birdSize - 2);
    }

    update() {
        this._x -= pipeSpeed;
    }

    draw() {
        stroke(0);
        fill(0, 200, 20);
        rect(this._x, 0, pipeWidth, this._spaceTop);
        rect(this._x, this._spaceTop + pipeSpaceSlider.value(), pipeWidth, canvasHeight);
    }
}

let birds = new Population(0);
let pipes = [];

let speedSlider;
let pipeSpaceSlider;

let generationBestScoreInput;
let generationSizeInput;
let generationNumberInput;
let populationBestScoreInput;

function setup() {
    let canvas = createCanvas(canvasWidth, canvasHeight);
    canvas.parent('sketch-holder');

    speedSlider = createSlider(1, 50, 5);
    speedSlider.parent('speed-slider');

    pipeSpaceSlider = createSlider(120, canvasHeight, defaultPipeSpace);
    pipeSpaceSlider.parent('space-slider');

    generationBestScoreInput = createInput();
    generationBestScoreInput.addClass('form-control form-control-sm');
    generationBestScoreInput.parent('generation-best-score');

    generationSizeInput = createInput();
    generationSizeInput.addClass('form-control form-control-sm');
    generationSizeInput.parent('generation-size');

    generationNumberInput = createInput();
    generationNumberInput.addClass('form-control form-control-sm');
    generationNumberInput.parent('generation-number');

    populationBestScoreInput = createInput();
    populationBestScoreInput.addClass('form-control form-control-sm');
    populationBestScoreInput.parent('population-best-score');

    birds = new Population(populationSize);
    reset();
}

function reset() {
    pipes = [];
    pipes.push(new Pipe(canvasWidth));
}

function update() {
    if (birds.empty()) {
        reset();
        birds.reproduce();
        return;
    }

    for (let s = 0; s < speedSlider.value(); s++) {
        for (let i = pipes.length - 1; i >= 0; i--) {
            if (pipes[i].x <= -pipeWidth - 5) {
                pipes.splice(i, 1);
                continue;
            }
            pipes[i].update();
        }

        if (pipes[pipes.length - 1].x < canvasWidth - spaceBetweenPipes - pipeWidth) {
            pipes.push(new Pipe(canvasWidth));
        }

        let pipe = null;
        if (pipes.length) {
            for (let j = 0; j < pipes.length; j++) {
                pipe = pipes[j];
                let distance = birdX - pipes[j].x - (birdSize + pipeWidth);
                if (distance < 0) {
                    break;
                }
            }
            birds.update(pipe);
        }
    }
}

function draw() {
    background(255);

    for (let pipe of pipes) {
        pipe.draw();
    }

    birds.draw();

    if (frameCount % 5 == 0) {
        let currentBest = birds.currentBest;
        let currentBestScore = 0;
        if (currentBest) {
            currentBestScore = birds.currentBest.score;
            generationBestScoreInput.value(currentBestScore);
        }

        generationSizeInput.value(birds.size);
        generationNumberInput.value(birds.generationCount);

        if (birds.bests.length) {
            populationBestScoreInput.value(Math.max(currentBestScore, birds.bests[0].score));
        }
    }

    update();

    var fps = frameRate();
    fill(0);
    text("FPS: " + fps.toFixed(2), 10, height - 10);
}

$(function () {
    $('#add-bird').click(function (e) {
        let bird = new Bird();
        bird.brain.load($('#bird-brain-json').val());
        birds.add(bird);
    });

    $('#export-best').click(function (e) {
        $('#bird-brain-json').val(birds.currentBest.brain.save());
    });
});