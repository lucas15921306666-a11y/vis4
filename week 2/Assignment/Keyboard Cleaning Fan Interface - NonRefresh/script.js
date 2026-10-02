const canvas =
    document.getElementById("screen");

const ctx =
    canvas.getContext("2d");

ctx.imageSmoothingEnabled = false;


/* =========================================================
   CONTROLS
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
   ASSETS
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


const images = {

    frame: null,

    batteryDigits: null,

    openingDigits: null,

    fan: null,

    degreeStates: []

};


/* =========================================================
   STATIC FRAME BUFFER
   ========================================================= */

const staticCanvas =
    document.createElement("canvas");

staticCanvas.width = 240;
staticCanvas.height = 240;


const staticCtx =
    staticCanvas.getContext("2d");

staticCtx.imageSmoothingEnabled = false;


/* =========================================================
   COORDINATES
   ========================================================= */


/* -------------------------
   DEGREE
   ------------------------- */

const DEGREE_X = 10;
const DEGREE_Y = 65;

const DEGREE_W = 40;
const DEGREE_H = 40;


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
   shifted right 1
   shifted down 10
   ------------------------- */

const BATTERY_X = 60;
const BATTERY_Y = 55;

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
   DIGIT SPRITE SETTINGS
   ========================================================= */


/* Battery digits */

const BIG_DIGIT_CELL = 90;

const BIG_DIGIT_W = 80;
const BIG_DIGIT_H = 140;


/* Degree digits */

const SMALL_DIGIT_CELL = 8;

const SMALL_DIGIT_W = 6;
const SMALL_DIGIT_H = 10;


/* =========================================================
   FAN
   ========================================================= */

let fanAngle = 0;

let previousTime = 0;


/*
Maximum fan speed
in revolutions per second
*/

const FAN_MAX_RPS = 2;


/* =========================================================
   LOAD IMAGE
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


resetScaleBtn.addEventListener(

    "click",

    function() {

        scaleInput.value = 1;

        applyScale(1);

    }

);


/* =========================================================
   TEXT VALUES
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
   SMALL DIGIT
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

        sourceX,
        0,

        SMALL_DIGIT_W,
        SMALL_DIGIT_H,

        x,
        y,

        SMALL_DIGIT_W,
        SMALL_DIGIT_H

    );

}


/* =========================================================
   BIG DIGIT
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

        sourceX,
        0,

        BIG_DIGIT_W,
        BIG_DIGIT_H,

        x,
        y,

        BIG_DIGIT_W,
        BIG_DIGIT_H

    );

}


/* =========================================================
   DRAW DEGREE
   ========================================================= */

function drawDegree() {

    /*
    Restore original 40x40
    Degree frame first
    */

    ctx.drawImage(

        staticCanvas,

        DEGREE_X,
        DEGREE_Y,

        DEGREE_W,
        DEGREE_H,

        DEGREE_X,
        DEGREE_Y,

        DEGREE_W,
        DEGREE_H

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
    Draw opening SVG at original size
    */

    ctx.drawImage(

        images.degreeStates[
            stateIndex
        ],

        DEGREE_X,
        DEGREE_Y

    );


    const text =
        twoDigits(value);


    /*
    First digit
    */

    drawSmallDigit(

        ctx,

        text[0],

        DEGREE_X +
        DEGREE_DIGIT_1_X,

        DEGREE_Y +
        DEGREE_DIGIT_1_Y

    );


    /*
    Second digit
    */

    drawSmallDigit(

        ctx,

        text[1],

        DEGREE_X +
        DEGREE_DIGIT_2_X,

        DEGREE_Y +
        DEGREE_DIGIT_2_Y

    );

}


/* =========================================================
   DRAW BATTERY NUMBER
   ========================================================= */

function drawBatteryNumber() {

    /*
    Restore original area first
    */

    ctx.drawImage(

        staticCanvas,

        BATTERY_X,
        BATTERY_Y,

        170,
        140,

        BATTERY_X,
        BATTERY_Y,

        170,
        140

    );


    const value =
        Number(
            batterySlider.value
        );


    const text =
        twoDigits(value);


    drawBigDigit(

        ctx,

        text[0],

        BATTERY_X +
        BATTERY_DIGIT_1_X,

        BATTERY_Y

    );


    drawBigDigit(

        ctx,

        text[1],

        BATTERY_X +
        BATTERY_DIGIT_2_X,

        BATTERY_Y

    );

}


/* =========================================================
   DRAW BATTERY BAR
   ========================================================= */

function drawBatteryBar() {

    /*
    Restore original bar first
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


    const percent =
        value / 99;


    const innerWidth =
        BATTERY_BAR_W - 2;


    const fillWidth =
        Math.round(

            innerWidth *
            percent

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


/* =========================================================
   DRAW FAN
   ========================================================= */

function drawFan() {

    /*
    Restore a large enough area
    to remove rotation leftovers
    */

    const clearX =
        FAN_CENTER_X - 30;

    const clearY =
        FAN_CENTER_Y - 30;

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


    ctx.save();


    /*
    Keep new fan inside
    the 40x40 fan frame
    */

    ctx.beginPath();

    ctx.rect(
        FAN_X,
        FAN_Y,
        FAN_W,
        FAN_H
    );

    ctx.clip();


    ctx.imageSmoothingEnabled = false;


    ctx.translate(

        FAN_CENTER_X,
        FAN_CENTER_Y

    );


    ctx.rotate(
        fanAngle
    );


    ctx.drawImage(

        images.fan,

        -20,
        -20,

        40,
        40

    );


    ctx.restore();


    ctx.imageSmoothingEnabled = false;

}


/* =========================================================
   UPDATE FAN
   ========================================================= */

function updateFan(
    deltaSeconds
) {

    const speed =
        Number(
            speedSlider.value
        );


    /*
    STOP:
    return to original position
    */

    if (speed <= 0) {

        fanAngle = 0;

        drawFan();

        return;

    }


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


    fanAngle %=

        Math.PI *
        2;


    drawFan();

}


/* =========================================================
   STATIC ELEMENT UPDATE
   ========================================================= */

function updateStaticUI() {

    updateControlTexts();

    drawDegree();

    drawBatteryNumber();

    drawBatteryBar();

}


/* =========================================================
   SLIDER EVENTS
   ========================================================= */


/*
Battery updates instantly
*/

batterySlider.addEventListener(

    "input",

    function() {

        updateControlTexts();

        drawBatteryNumber();

        drawBatteryBar();

    }

);


/*
Degree updates instantly
*/

openingSlider.addEventListener(

    "input",

    function() {

        updateControlTexts();

        drawDegree();

    }

);


/*
Fan text updates instantly.
Rotation itself is handled
by requestAnimationFrame.
*/

speedSlider.addEventListener(

    "input",

    function() {

        updateControlTexts();


        /*
        If moved to zero,
        immediately return
        to vertical position.
        */

        if (
            Number(
                speedSlider.value
            ) === 0
        ) {

            fanAngle = 0;

            drawFan();

        }

    }

);


/* =========================================================
   ANIMATION LOOP
   ========================================================= */

function animate(timestamp) {

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


    updateFan(
        deltaSeconds
    );


    requestAnimationFrame(
        animate
    );

}


/* =========================================================
   INIT
   ========================================================= */

async function init() {

    try {


        /* -------------------------
           FRAME
           ------------------------- */

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
        Show base frame immediately
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


        /* -------------------------
           DIGITS
           ------------------------- */

        images.batteryDigits =
            await loadImage(
                ASSETS.batteryDigits
            );


        images.openingDigits =
            await loadImage(
                ASSETS.openingDigits
            );


        /* -------------------------
           FAN
           ------------------------- */

        images.fan =
            await loadImage(
                ASSETS.fan
            );


        /* -------------------------
           DEGREE STATES
           ------------------------- */

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


        /* -------------------------
           UI
           ------------------------- */

        applyScale(

            Number(
                scaleInput.value
            )

        );


        updateStaticUI();


        /*
        Initial fan
        */

        fanAngle = 0;

        drawFan();


        /* -------------------------
           START FAN LOOP
           ------------------------- */

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