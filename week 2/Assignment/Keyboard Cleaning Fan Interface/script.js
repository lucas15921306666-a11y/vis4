/* =========================================================
   CANVAS
   Logical resolution is ALWAYS 240 x 240
   ========================================================= */

const canvas = document.getElementById("screen");

const ctx = canvas.getContext("2d");

ctx.imageSmoothingEnabled = false;


/* =========================================================
   HTML CONTROLS
   ========================================================= */

const scaleInput =
    document.getElementById("scaleInput");

const applyScaleBtn =
    document.getElementById("applyScale");

const resetScaleBtn =
    document.getElementById("resetScale");


const batterySlider =
    document.getElementById("batterySlider");

const speedSlider =
    document.getElementById("speedSlider");

const openingSlider =
    document.getElementById("openingSlider");


const batteryText =
    document.getElementById("batteryText");

const speedText =
    document.getElementById("speedText");

const openingText =
    document.getElementById("openingText");


/* =========================================================
   ASSET PATHS
   ========================================================= */

const ASSETS = {

    frame:
        "assets/frame.svg",

    batteryDigits:
        "assets/battery-digits.svg",

    openingDigits:
        "assets/opening-digits.svg",

    fan:
        "assets/fan.svg",

    degreeStates: [

        "assets/degree-1.svg",
        "assets/degree-2.svg",
        "assets/degree-3.svg",
        "assets/degree-4.svg",
        "assets/degree-5.svg",
        "assets/degree-6.svg"

    ]

};


/* =========================================================
   LOADED IMAGES
   ========================================================= */

const images = {

    frame: null,

    batteryDigits: null,

    openingDigits: null,

    fan: null,

    degreeStates: []

};


/* =========================================================
   STATIC 240 x 240 FRAME BUFFER
   ========================================================= */

const staticCanvas =
    document.createElement("canvas");

staticCanvas.width = 240;
staticCanvas.height = 240;


const staticCtx =
    staticCanvas.getContext("2d");

staticCtx.imageSmoothingEnabled = false;


/* =========================================================
   DEGREE TARGET BUFFER
   40 x 40
   ========================================================= */

const degreeCanvas =
    document.createElement("canvas");

degreeCanvas.width = 40;
degreeCanvas.height = 40;


const degreeCtx =
    degreeCanvas.getContext("2d");

degreeCtx.imageSmoothingEnabled = false;


/* =========================================================
   BATTERY NUMBER TARGET BUFFER
   170 x 140
   ========================================================= */

const batteryCanvas =
    document.createElement("canvas");

batteryCanvas.width = 170;
batteryCanvas.height = 140;


const batteryCtx =
    batteryCanvas.getContext("2d");

batteryCtx.imageSmoothingEnabled = false;


/* =========================================================
   EXACT SCREEN COORDINATES
   ========================================================= */


/* -------------------------
   DEGREE
   ------------------------- */

const DEGREE_X = 10;
const DEGREE_Y = 65;

const DEGREE_W = 40;
const DEGREE_H = 40;


/*
Inside the Degree 40x40 frame:

left digit:
13,30

right digit:
21,30
*/

const DEGREE_DIGIT_1_X = 13;
const DEGREE_DIGIT_1_Y = 30;

const DEGREE_DIGIT_2_X = 21;
const DEGREE_DIGIT_2_Y = 30;


/* -------------------------
   FAN
   ------------------------- */

const FAN_X = 10;
const FAN_Y = 135;

const FAN_W = 40;
const FAN_H = 40;

const FAN_CENTER_X =
    FAN_X + 20;

const FAN_CENTER_Y =
    FAN_Y + 20;


/* -------------------------
   BATTERY NUMBER

   Original:
   59,45

   requested:
   +1 px right
   +10 px down
   ------------------------- */

const BATTERY_X = 60;
const BATTERY_Y = 55;

const BATTERY_W = 170;
const BATTERY_H = 140;


/*
Within the battery buffer:

First digit:
x = 0

Second digit:
x = 90
*/

const BATTERY_DIGIT_1_X = 0;
const BATTERY_DIGIT_2_X = 90;


/* -------------------------
   BATTERY BAR
   ------------------------- */

const BATTERY_BAR_X = 59;
const BATTERY_BAR_Y = 215;

const BATTERY_BAR_W = 171;
const BATTERY_BAR_H = 8;


/* =========================================================
   DIGIT SPRITES
   ========================================================= */


/* -------------------------
   LARGE BATTERY DIGITS

   SVG:
   0 1 2 3 4 5 6 7 8 9

   each digit = 80x140
   cell step = 90px
   ------------------------- */

const BIG_DIGIT_CELL = 90;

const BIG_DIGIT_W = 80;
const BIG_DIGIT_H = 140;


/* -------------------------
   SMALL DEGREE DIGITS

   SVG:
   0 1 2 3 4 5 6 7 8 9

   each digit = 6x10
   cell step = 8px
   ------------------------- */

const SMALL_DIGIT_CELL = 8;

const SMALL_DIGIT_W = 6;
const SMALL_DIGIT_H = 10;


/* =========================================================
   REFRESH SETTINGS
   ========================================================= */


/* ---------------------------------------------------------
   DEGREE

   40 x 40
   1 x 1 pixels

   1600 pixels total

   full refresh = 250ms
   --------------------------------------------------------- */

const DEGREE_REFRESH_TIME = 250;

const DEGREE_TOTAL_PIXELS =
    DEGREE_W * DEGREE_H;       // 1600


const DEGREE_PIXEL_TIME =
    DEGREE_REFRESH_TIME /
    DEGREE_TOTAL_PIXELS;


/*
Current pixel index:

0 -> first pixel
1599 -> last pixel
*/

let degreePixelIndex = 0;

let degreeTimeAccumulator = 0;


/* ---------------------------------------------------------
   BATTERY

   each digit:
   80 x 140

   voxel:
   10 x 10

   8 columns x 14 rows
   = 112 tiles per digit

   2 digits
   = 224 tiles

   full refresh = 1000ms
   --------------------------------------------------------- */

const BATTERY_TILE_SIZE = 10;

const BATTERY_TILE_COLUMNS = 8;
const BATTERY_TILE_ROWS = 14;

const BATTERY_TILES_PER_DIGIT =
    BATTERY_TILE_COLUMNS *
    BATTERY_TILE_ROWS;


const BATTERY_TOTAL_TILES =
    BATTERY_TILES_PER_DIGIT * 2;
// 224


const BATTERY_REFRESH_TIME = 1000;


const BATTERY_TILE_TIME =
    BATTERY_REFRESH_TIME /
    BATTERY_TOTAL_TILES;


let batteryTileIndex = 0;

let batteryTimeAccumulator = 0;


/* =========================================================
   FAN
   ========================================================= */


/*
Current angle in radians
*/

let fanAngle = 0;


/*
At speed = 100

fan rotates at this many
full revolutions per second.

Change this number later
if you want faster/slower animation.
*/

const FAN_MAX_RPS = 2;


/* =========================================================
   TIME
   ========================================================= */

let previousTime = 0;


/* =========================================================
   IMAGE LOADING
   ========================================================= */

function loadImage(src) {

    return new Promise(

        function(resolve, reject) {

            const img =
                new Image();


            img.onload =
                function() {

                    console.log(
                        "Loaded:",
                        src
                    );

                    resolve(img);

                };


            img.onerror =
                function() {

                    console.error(
                        "FAILED:",
                        src
                    );

                    reject(src);

                };


            img.src = src;

        }

    );

}


/* =========================================================
   TWO DIGITS
   ========================================================= */

function twoDigits(value) {

    return String(value)
        .padStart(
            2,
            "0"
        );

}


/* =========================================================
   SCALE
   ========================================================= */

function applyScale(scale) {

    canvas.style.width =
        (240 * scale) + "px";


    canvas.style.height =
        (240 * scale) + "px";

}


/* Apply button */

applyScaleBtn.addEventListener(

    "click",

    function() {

        let scale =
            Number(
                scaleInput.value
            );


        if (scale < 1) {

            scale = 1;

        }


        if (scale > 10) {

            scale = 10;

        }


        scaleInput.value =
            scale;


        applyScale(scale);

    }

);


/* Reset */

resetScaleBtn.addEventListener(

    "click",

    function() {

        scaleInput.value = 1;

        applyScale(1);

    }

);


/* =========================================================
   CONTROL LABELS
   ========================================================= */

function updateControlTexts() {

    batteryText.textContent =
        twoDigits(
            batterySlider.value
        );


    speedText.textContent =
        speedSlider.value;


    openingText.textContent =
        twoDigits(
            openingSlider.value
        );

}


batterySlider.addEventListener(
    "input",
    updateControlTexts
);


speedSlider.addEventListener(
    "input",
    updateControlTexts
);


openingSlider.addEventListener(
    "input",
    updateControlTexts
);


/* =========================================================
   DEGREE STATE
   ========================================================= */

function getDegreeStateIndex(value) {

    value =
        Number(value);


    if (value <= 15) {

        return 0;

    }


    if (value <= 30) {

        return 1;

    }


    if (value <= 45) {

        return 2;

    }


    if (value <= 60) {

        return 3;

    }


    if (value <= 75) {

        return 4;

    }


    return 5;

}


/* =========================================================
   DRAW SMALL DIGIT
   ========================================================= */

function drawSmallDigit(
    targetCtx,
    digit,
    x,
    y
) {

    const n =
        Number(digit);


    const sourceX =
        n *
        SMALL_DIGIT_CELL;


    targetCtx.drawImage(

        images.openingDigits,


        /* source */

        sourceX,
        0,

        SMALL_DIGIT_W,
        SMALL_DIGIT_H,


        /* destination */

        x,
        y,

        SMALL_DIGIT_W,
        SMALL_DIGIT_H

    );

}


/* =========================================================
   DRAW BIG DIGIT
   ========================================================= */

function drawBigDigit(
    targetCtx,
    digit,
    x,
    y
) {

    const n =
        Number(digit);


    const sourceX =
        n *
        BIG_DIGIT_CELL;


    targetCtx.drawImage(

        images.batteryDigits,


        /* source */

        sourceX,
        0,

        BIG_DIGIT_W,
        BIG_DIGIT_H,


        /* destination */

        x,
        y,

        BIG_DIGIT_W,
        BIG_DIGIT_H

    );

}


/* =========================================================
   BUILD DEGREE TARGET
   ========================================================= */

function buildDegreeTarget() {

    degreeCtx.clearRect(
        0,
        0,
        40,
        40
    );


    const value =
        Number(
            openingSlider.value
        );


    const stateIndex =
        getDegreeStateIndex(
            value
        );


    /*
    IMPORTANT:

    No forced scaling.

    Use the SVG's original
    intrinsic width / height.
    */

    degreeCtx.drawImage(

        images.degreeStates[
            stateIndex
        ],

        0,
        0

    );


    const text =
        twoDigits(value);


    /*
    First digit
    */

    drawSmallDigit(

        degreeCtx,

        text[0],

        DEGREE_DIGIT_1_X,

        DEGREE_DIGIT_1_Y

    );


    /*
    Second digit
    */

    drawSmallDigit(

        degreeCtx,

        text[1],

        DEGREE_DIGIT_2_X,

        DEGREE_DIGIT_2_Y

    );

}


/* =========================================================
   REFRESH ONE DEGREE PIXEL
   ========================================================= */

function refreshOneDegreePixel() {

    /*
    Pixel order:

    left -> right
    then next row

    x:
    0 ... 39

    y:
    0 ... 39
    */

    const localX =
        degreePixelIndex %
        DEGREE_W;


    const localY =
        Math.floor(

            degreePixelIndex /
            DEGREE_W

        );


    const screenX =
        DEGREE_X +
        localX;


    const screenY =
        DEGREE_Y +
        localY;


    /*
    First restore the
    original frame pixel
    */

    ctx.drawImage(

        staticCanvas,

        screenX,
        screenY,

        1,
        1,

        screenX,
        screenY,

        1,
        1

    );


    /*
    Then copy the target pixel
    */

    ctx.drawImage(

        degreeCanvas,

        localX,
        localY,

        1,
        1,

        screenX,
        screenY,

        1,
        1

    );


    degreePixelIndex++;


    /*
    One complete 40x40 scan
    */

    if (
        degreePixelIndex >=
        DEGREE_TOTAL_PIXELS
    ) {

        degreePixelIndex = 0;


        /*
        Capture current slider
        value for next scan
        */

        buildDegreeTarget();

    }

}


/* =========================================================
   BUILD BATTERY TARGET
   ========================================================= */

function buildBatteryTarget() {

    batteryCtx.clearRect(
        0,
        0,
        BATTERY_W,
        BATTERY_H
    );


    const value =
        Number(
            batterySlider.value
        );


    const text =
        twoDigits(value);


    /* First number */

    drawBigDigit(

        batteryCtx,

        text[0],

        BATTERY_DIGIT_1_X,

        0

    );


    /* Second number */

    drawBigDigit(

        batteryCtx,

        text[1],

        BATTERY_DIGIT_2_X,

        0

    );

}


/* =========================================================
   REFRESH ONE BATTERY 10x10 TILE
   ========================================================= */

function refreshOneBatteryTile() {

    let digitIndex;

    let localTileIndex;


    /*
    First 112 tiles =
    first digit

    Next 112 =
    second digit
    */

    if (

        batteryTileIndex <
        BATTERY_TILES_PER_DIGIT

    ) {

        digitIndex = 0;

        localTileIndex =
            batteryTileIndex;

    }

    else {

        digitIndex = 1;

        localTileIndex =

            batteryTileIndex -
            BATTERY_TILES_PER_DIGIT;

    }


    /*
    Tile position inside
    one 80x140 digit
    */

    const column =
        localTileIndex %
        BATTERY_TILE_COLUMNS;


    const row =
        Math.floor(

            localTileIndex /
            BATTERY_TILE_COLUMNS

        );


    /*
    X inside 170px battery buffer
    */

    const digitOffsetX =
        digitIndex === 0
            ? 0
            : 90;


    const localX =
        digitOffsetX +
        column *
        BATTERY_TILE_SIZE;


    const localY =
        row *
        BATTERY_TILE_SIZE;


    const screenX =
        BATTERY_X +
        localX;


    const screenY =
        BATTERY_Y +
        localY;


    /*
    Restore old/static background
    */

    ctx.drawImage(

        staticCanvas,

        screenX,
        screenY,

        10,
        10,

        screenX,
        screenY,

        10,
        10

    );


    /*
    Draw new tile
    */

    ctx.drawImage(

        batteryCanvas,

        localX,
        localY,

        10,
        10,

        screenX,
        screenY,

        10,
        10

    );


    batteryTileIndex++;


    if (

        batteryTileIndex >=
        BATTERY_TOTAL_TILES

    ) {

        batteryTileIndex = 0;


        /*
        Capture newest battery
        value for next cycle
        */

        buildBatteryTarget();

    }

}


/* =========================================================
   BATTERY BAR
   ========================================================= */

function drawBatteryBar() {

    /*
    Restore full bar region first
    */

    ctx.drawImage(

        staticCanvas,

        BATTERY_BAR_X,
        BATTERY_BAR_Y,

        BATTERY_BAR_W,
        BATTERY_BAR_H,

        BATTERY_BAR_X,
        BATTERY_BAR_Y,

        BATTERY_BAR_W,
        BATTERY_BAR_H

    );


    const value =
        Number(
            batterySlider.value
        );


    const percentage =
        value / 99;


    const innerWidth =
        BATTERY_BAR_W - 2;


    const fillWidth =
        Math.round(

            innerWidth *
            percentage

        );


    if (fillWidth <= 0) {

        return;

    }


    ctx.fillStyle =
        "black";


    ctx.fillRect(

        BATTERY_BAR_X + 1,

        BATTERY_BAR_Y + 1,

        fillWidth,

        BATTERY_BAR_H - 2

    );

}


/* Battery bar updates instantly */

batterySlider.addEventListener(

    "input",

    drawBatteryBar

);


/* =========================================================
   FAN
   SVG ONLY
   ========================================================= */

function drawFan() {

    /* =========================================
       CLEAR OLD ROTATION ARTIFACTS

       A 40x40 square becomes about 57x57
       when rotated 45 degrees.

       So restore a larger area first.
       ========================================= */

    const clearX = FAN_CENTER_X - 30;
    const clearY = FAN_CENTER_Y - 30;

    const clearSize = 60;


    ctx.drawImage(

        staticCanvas,

        clearX,
        clearY,
        clearSize,
        clearSize,

        clearX,
        clearY,
        clearSize,
        clearSize

    );


    /* =========================================
       DRAW FAN
       ========================================= */

    ctx.save();


    /*
    Do not allow the NEW fan drawing
    outside the 40x40 Fan frame.
    */

    ctx.beginPath();

    ctx.rect(
        FAN_X,
        FAN_Y,
        FAN_W,
        FAN_H
    );

    ctx.clip();


    /*
    Keep the original rendering behavior.
    */

    ctx.imageSmoothingEnabled = false;


    /*
    Move rotation center to
    center of Fan frame.
    */

    ctx.translate(
        FAN_CENTER_X,
        FAN_CENTER_Y
    );


    /*
    Use the normal continuous angle.
    */

    ctx.rotate(
        fanAngle
    );


    /*
    Draw original 40x40 SVG.
    No extra graphics.
    */

    ctx.drawImage(

        images.fan,

        -20,
        -20,

        40,
        40

    );


    ctx.restore();

}


/* =========================================================
   UPDATE FAN ANGLE
   ========================================================= */

function updateFan(deltaSeconds) {

    const speed =
        Number(
            speedSlider.value
        );


    /* =========================================
       STOPPED
       ========================================= */

    if (speed <= 0) {

        /*
        Always return to original
        vertical + horizontal position.
        */

        fanAngle = 0;


        drawFan();

        return;

    }


    /* =========================================
       RUNNING
       ========================================= */

    const rotationsPerSecond =

        FAN_MAX_RPS *
        (speed / 100);


    const radiansPerSecond =

        rotationsPerSecond *
        Math.PI *
        2;


    fanAngle +=

        radiansPerSecond *
        deltaSeconds;


    /*
    Keep angle manageable.
    */

    fanAngle %=

        Math.PI *
        2;


    drawFan();

}


/* =========================================================
   MAIN ANIMATION LOOP
   ========================================================= */

function animate(timestamp) {

    /*
    First frame
    */

    if (!previousTime) {

        previousTime =
            timestamp;

    }


    const deltaMs =
        timestamp -
        previousTime;


    previousTime =
        timestamp;


    const deltaSeconds =
        deltaMs /
        1000;


    /* =====================================================
       DEGREE PIXEL REFRESH
       ===================================================== */

    degreeTimeAccumulator +=
        deltaMs;


    while (

        degreeTimeAccumulator >=
        DEGREE_PIXEL_TIME

    ) {

        refreshOneDegreePixel();


        degreeTimeAccumulator -=
            DEGREE_PIXEL_TIME;

    }


    /* =====================================================
       BATTERY TILE REFRESH
       ===================================================== */

    batteryTimeAccumulator +=
        deltaMs;


    while (

        batteryTimeAccumulator >=
        BATTERY_TILE_TIME

    ) {

        refreshOneBatteryTile();


        batteryTimeAccumulator -=
            BATTERY_TILE_TIME;

    }


    /* =====================================================
       FAN
       ===================================================== */

    updateFan(
        deltaSeconds
    );


    requestAnimationFrame(
        animate
    );

}


/* =========================================================
   INITIALIZE
   ========================================================= */

async function init() {

    try {


        /* =================================================
           FRAME FIRST

           This means the UI frame appears
           even before other assets finish loading.
           ================================================= */

        images.frame =
            await loadImage(
                ASSETS.frame
            );


        staticCtx.clearRect(
            0,
            0,
            240,
            240
        );


        staticCtx.drawImage(

            images.frame,

            0,
            0,

            240,
            240

        );


        /*
        Immediately show base screen
        */

        ctx.clearRect(
            0,
            0,
            240,
            240
        );


        ctx.drawImage(

            staticCanvas,

            0,
            0

        );


        /* =================================================
           OTHER ASSETS
           ================================================= */

        images.batteryDigits =
            await loadImage(
                ASSETS.batteryDigits
            );


        images.openingDigits =
            await loadImage(
                ASSETS.openingDigits
            );


        images.fan =
            await loadImage(
                ASSETS.fan
            );


        /* Degree states */

        for (

            let i = 0;

            i <
            ASSETS.degreeStates.length;

            i++

        ) {

            const img =
                await loadImage(

                    ASSETS.degreeStates[i]

                );


            images.degreeStates.push(
                img
            );

        }


        /* =================================================
           INITIAL UI
           ================================================= */

        updateControlTexts();


        applyScale(

            Number(
                scaleInput.value
            )

        );


        /*
        Build first target states
        */

        buildDegreeTarget();

        buildBatteryTarget();


        /*
        Initial battery bar
        */

        drawBatteryBar();


        /*
        Initial static fan
        */

        drawFan();


        /* =================================================
           START ANIMATION
           ================================================= */

        requestAnimationFrame(
            animate
        );

    }


    catch(error) {

        console.error(

            "Initialization failed:",

            error

        );

    }

}


/* =========================================================
   START
   ========================================================= */

init();