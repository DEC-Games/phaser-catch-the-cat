import data from "../data";
import CatchTheCatGame from "../game";
import Cat from "../sprites/cat";
import Block from "../sprites/block";
import ResetButton from "../sprites/resetButton";
import UndoButton from "../sprites/undoButton";
import StatusBar from "../sprites/statusBar";
import CreditText from "../sprites/creditText";
import _ from "../i18n";
import nearestSolver from "../solvers/nearestSolver";
import RawSVGFile from "../lib/RawSVGFile";

declare type NeighbourData = {
    i?: number,
    j?: number,
    x?: number,
    y?: number,
}

declare type RecordCoord = {
    cat: {i:number, j:number}[],
    wall: {i:number, j:number}[],
}

enum GameState {
    PLAYING = "playing",
    WIN = "win",
    LOSE = "lose",
}

export default class MainScene extends Phaser.Scene {
    public readonly w: number;
    public readonly h: number;
    public readonly r: number;
    public readonly initialWallCount: number;
    public readonly dx: number;
    public readonly dy: number;
    public game: CatchTheCatGame;
    private recordCoord: RecordCoord;
    startTime: Date;
    timeText: Phaser.GameObjects.Text;
    isGameOver: boolean = false;

    constructor(w: number, h: number, r: number, initialWallCount: number) {
        super({
            key: "MainScene",
        });
        this.w = w;
        this.h = h;
        this.r = r;
        this.initialWallCount = initialWallCount;
        this.dx = this.r * 2;
        this.dy = this.r * Math.sqrt(3);
    }

    get blocks(): Block[][] {
        return this.data.get("blocks");
    }

    set blocks(value: Block[][]) {
        this.data.set("blocks", value);
    }

    get blocksData(): boolean[][] {
        let result: boolean[][] = [];
        this.blocks.forEach((column, i) => {
            result[i] = [];
            column.forEach((block, j) => {
                result[i][j] = block.isWall;
            });
        });
        return result;
    }

    get cat(): Cat {
        return this.data.get("cat");
    }

    set cat(value: Cat) {
        this.data.set("cat", value);
    }

    get statusBar(): Phaser.GameObjects.Text {
        return this.data.get("status_bar");
    }

    set statusBar(value: Phaser.GameObjects.Text) {
        this.data.set("status_bar", value);
    }

    get creditText(): CreditText {
        return this.data.get("credit_text");
    }

    set creditText(value: CreditText) {
        this.data.set("credit_text", value);
    }

    get state(): GameState {
        return this.data.get("state");
    }

    set state(value: GameState) {
        switch (value) {
            case GameState.PLAYING:
                break;
            case GameState.LOSE:
                this.setStatusText(_("The cat has run to the edge of the map, you lose."));
                break;
            case GameState.WIN:
                this.setStatusText(_("The cat has nowhere to go, you win."));
                break;
            default:
                return;
        }
        this.data.set("state", value);
    }

    static getNeighbours(i: number, j: number): NeighbourData[] {
        let left = {i: i - 1, j: j};
        let right = {i: i + 1, j: j};
        let top_left;
        let top_right;
        let bottom_left;
        let bottom_right;
        if ((j & 1) === 0) {
            top_left = {i: i - 1, j: j - 1};
            top_right = {i: i, j: j - 1};
            bottom_left = {i: i - 1, j: j + 1};
            bottom_right = {i: i, j: j + 1};
        } else {
            top_left = {i: i, j: j - 1};
            top_right = {i: i + 1, j: j - 1};
            bottom_left = {i: i, j: j + 1};
            bottom_right = {i: i + 1, j: j + 1};
        }
        let neighbours = [];
        neighbours[0] = left;
        neighbours[1] = top_left;
        neighbours[2] = top_right;
        neighbours[3] = right;
        neighbours[4] = bottom_right;
        neighbours[5] = bottom_left;
        return neighbours;
    }

    preload(): void {
        let textureScale = this.r / data.catStepLength;
        for (let key in data.textures) {
            this.load.addFile(new RawSVGFile(this.load, key, data.textures[key], {scale: textureScale}));
        }
    }

    create(): void {
        this.createAnimations();
        this.createBlocks();
        this.createCat();
        this.createStatusText();
        this.createResetButton();
        this.createUndoButton();
        this.createCreditText();
        if (this.game.solver) {
            this.cat.solver = this.game.solver;
        }
        // Add these lines for the timer
        // --- Add this block to the top of the create() method ---
        const urlParams = new URLSearchParams(window.location.search);
        const name = urlParams.get('name');
        const email = urlParams.get('email');

        // If the parameters exist in the URL, store them
        if (name) {
            localStorage.setItem('userName', name);
        }
        if (email) {
            localStorage.setItem('userEmail', email);
        }
        // --- End of new block ---
        this.isGameOver = false;
        this.startTime = new Date();
        const { width, height } = this.cameras.main;
        this.timeText = this.add.text(width - 10, height - 10, 'Time: 0s', { 
            fontSize: '16px', 
            color: '#ffffff',
            backgroundColor: '#000000' 
        });
        this.timeText.setOrigin(1, 1);
        this.reset();
    }

    update() {
        // Add these lines to update the timer text
        if (!this.isGameOver) {
            const elapsed = Math.floor((new Date().getTime() - this.startTime.getTime()) / 1000);
            this.timeText.setText('Time: ' + elapsed + 's');
        }
        // ... rest of the update() method might be here
    }

    // gameOver(win: boolean) {
    //     // Stop the timer and calculate final score
    //     const finalTime = Math.floor((new Date().getTime() - this.startTime.getTime()) / 1000);

    //     if (win) {
    //         // Ask player to submit score
    //         const submit = confirm(`You won in ${finalTime} seconds! 🏆\n\nDo you want to submit your score?`);
    //         if (submit) {
    //         alert(`Score of ${finalTime}s submitted!`);
    //         // In a real game, you would send the score to a server here.
    //         // e.g., fetch('https://your-api.com/submit', { method: 'POST', body: JSON.stringify({ score: finalTime }) });
    //         }
    //     } else {
    //         alert(`The cat escaped after ${finalTime} seconds! 😿`);
    //     }

    //     // Restart the game
    //     this.scene.restart();
    // }


    getPosition(i: number, j: number): NeighbourData {
        return {
            x: this.r * 3 + ((j & 1) === 0 ? this.r : this.dx) + i * this.dx,
            y: this.r * 3 + this.r + j * this.dy,
        };
    }

    getBlock(i: number, j: number): Block | null {
        if (!(i >= 0 && i < this.w && j >= 0 && j < this.h)) {
            return null;
        }
        return this.blocks[i][j];
    }

    playerClick(i: number, j: number): boolean {
        if (this.cat.anims.isPlaying) {
            this.cat.anims.stop();
        }
        if (this.state !== GameState.PLAYING) {
            this.setStatusText(_("The game is over, let's start over."));
            this.reset();
            return false;
        }
        let block = this.getBlock(i, j);
        if (!block) {
            this.setStatusText(_("Code error, current location does not exist."));
            return false;
        }
        if (block.isWall) {
            this.setStatusText(_("The click position is already a wall, click is prohibited."));
            return false;
        }
        if (this.cat.i === i && this.cat.j === j) {
            this.setStatusText(_("The click position is the cat's current position, click is prohibited."));
            return false;
        }
        block.isWall = true;
        if (this.cat.isCaught()) {
            this.setStatusText(_("The cat has nowhere to go, you win."));
            this.state = GameState.WIN;
            return false;
        }

        this.recordCoord.cat.push({i: this.cat.i, j:this.cat.j});
        this.recordCoord.wall.push({i, j});

        this.setStatusText(_("You clicked ") + `(${i}, ${j})`);
        let result = this.cat.step();
        if (!result) {
            this.setStatusText(_("The cat admits defeat, you win!"));
            this.isGameOver = true;
            
            const finalTime = Math.floor((new Date().getTime() - this.startTime.getTime()) / 1000);
            const submit = confirm(`You won in ${finalTime} seconds! 🏆\n\nDo you want to submit your score?`);
            // Get the stored best score, or null if it doesn't exist
            const bestScore = localStorage.getItem('catchTheCatBestScore');
            // Check if the current time is better than the best score
            if (bestScore === null || finalTime < parseInt(bestScore, 10)) {
                localStorage.setItem('catchTheCatBestScore', finalTime.toString());
                console.log(`New best score: ${finalTime}s`);
                // Dispatch an event to notify the HTML page
                window.dispatchEvent(new CustomEvent('bestScoreUpdated'));
            }
            if (submit) {
                // Retrieve user info from storage
                const savedName = localStorage.getItem('userName') || 'Anonymous';
                const savedEmail = localStorage.getItem('userEmail') || 'No Email';
                const bestScore2 = localStorage.getItem('catchTheCatBestScore');
                const functionUrl = 'https://submitcatgameform-gksuylu43a-uc.a.run.app';
                // Prepare the data payload
                const scoreData = {
                    name: savedName,
                    email: savedEmail,
                    score: finalTime,
                    bestScore: bestScore2,
                    timestamp: new Date().toISOString()
                };
                
                // Start the fetch request
                fetch(functionUrl, {
                    method: 'POST',
                    headers: {
                    'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(scoreData),
                })
                .then(response => {
                    // This first .then() checks if the server responded successfully
                    if (response.ok) {
                    // If the response is good (status 200-299), we can parse the JSON
                    return response.json();
                    } else {
                    // If the server responded with an error, we create our own error
                    // to be handled by the .catch() block
                    return response.text().then(text => { throw new Error(text) });
                    }
                })
                .then(result => {
                    // This second .then() runs only if the response was successful
                    console.log('Success:', result);
                    console.log('Submitting score:', scoreData);
                    alert(`Score of ${finalTime}s submitted!`);
                })
                .catch(error => {
                    // The .catch() block will handle any network errors or errors we threw
                    console.error('Submission failed:', error);
                    alert(`Submission failed: ${error.message}`);
                });
                
                
            // In a real game, you would send the score to a server here.  https://submitcatgameform-gksuylu43a-uc.a.run.app 
            // e.g., fetch('https://your-api.com/submit', { method: 'POST', body: JSON.stringify({ score: finalTime }) });
            }
            this.state = GameState.WIN;
        }
        return true;
    }

    reset() {
        this.cat.reset();
        this.resetBlocks();
        this.randomWall();
        this.startTime = new Date();
        this.isGameOver = false;
        this.recordCoord = {
            cat: [],
            wall: []
        };
        this.state = GameState.PLAYING;
        this.setStatusText(_("Click on the small dots to surround the kitten."));
    }

    undo() {
        if (this.recordCoord.cat.length) {
            if (this.state !== GameState.PLAYING) {
                this.setStatusText(_("The game is over, let's start over."));
                this.reset();
            } else {
                const catCoord = this.recordCoord.cat.pop();
                const {i, j} = this.recordCoord.wall.pop();

                this.cat.undo(catCoord.i, catCoord.j);
                this.getBlock(i, j).isWall = false;
            }
        } else {
            this.setStatusText(_("There is no way back!!!"));
        }
    }
    private setStatusText(message: string) {
        this.statusBar.setText(message);
    }

    private createAnimations(): void {
        data.animations.forEach(animation => {
            let frames: AnimationFrameConfig[] = [];
            animation.textures.forEach(texture => {
                frames.push({
                    key: texture,
                    frame: 0,
                });
            });
            this.anims.create({
                key: animation.name,
                frames: frames,
                frameRate: data.frameRate,
                repeat: animation.repeat,
            });
        });
    }

    private createBlocks(): void {
        let blocks = [];
        for (let i = 0; i < this.w; i++) {
            blocks[i] = [];
            for (let j = 0; j < this.h; j++) {
                let block = new Block(this, i, j, this.r * 0.9);
                blocks[i][j] = block;
                this.add.existing(block);
                block.on("player_click", this.playerClick.bind(this));
            }
        }
        this.blocks = blocks;
    }

    private createCat(): void {
        let cat = new Cat(this);
        cat.on("escaped", () => {
            this.state = GameState.LOSE;
        });
        cat.on("win", () => {
            this.state = GameState.WIN;
        });
        cat.solver = nearestSolver;
        this.cat = cat;
        this.add.existing(cat);
    }

    private createStatusText(): void {
        let statusBar = new StatusBar(this);
        this.statusBar = statusBar;
        this.add.existing(statusBar);
    }

    private createResetButton(): void {
        let resetButton = new ResetButton(this);
        this.add.existing(resetButton);
        resetButton.on("pointerup", () => {
            this.reset();
        });
    }

    private createUndoButton(): void {
        let undoButton = new UndoButton(this);
        this.add.existing(undoButton);
        undoButton.on("pointerup", () => {
            this.undo();
        });
    }

    private createCreditText(): void {
        let creditText = new CreditText(this);
        this.creditText = creditText;
        this.add.existing(creditText);
    }

    private resetBlocks() {
        this.blocks.forEach(blocks => {
            blocks.forEach(block => {
                block.isWall = false;
            });
        });
    }

    private randomWall() {
        const array = [];
        for (let j = 0; j < this.h; j++) {
            for (let i = 0; i < this.w; i++) {
                if (i !== this.cat.i || j !== this.cat.j) {
                    array.push(j * this.w + i);
                }
            }
        }
        for (let i = 0; i < array.length; i++) {
            if (i >= this.initialWallCount) {
                break;
            }
            // Shuffle array
            const j = i + Math.floor(Math.random() * (array.length - i));
            var temp = array[i];
            array[i] = array[j];
            array[j] = temp;
            // Set wall
            let wallI = array[i] % this.w;
            let wallJ = Math.floor(array[i] / this.w);
            this.getBlock(wallI, wallJ).isWall = true;
        }
    }
}
