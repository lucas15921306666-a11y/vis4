/* =========================================================
   CANVAS
   ========================================================= */

const canvas =
    document.getElementById("screen");

const ctx =
    canvas.getContext("2d");

ctx.imageSmoothingEnabled = false;

canvas.style.imageRendering =
    "pixelated";


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


const resetBatteryBtn =
    document.getElementById("resetBatteryBtn");

const chargingToggle =
    document.getElementById("chargingToggle");


/* =========================================================
   CONNECTION UI
   ========================================================= */

const controllerConnectionStatus =
    document.getElementById(
        "controllerConnectionStatus"
    );

const bridgeConnectionStatus =
    document.getElementById(
        "bridgeConnectionStatus"
    );


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


/* =========================================================
   IMAGES
   ========================================================= */

const images = {

    frame: null,

    batteryDigits: null,

    openingDigits: null,

    fan: null,

    degreeStates: []

};


/* =========================================================
   STATIC CANVAS
   ========================================================= */

const staticCanvas =
    document.createElement(
        "canvas"
    );

staticCanvas.width = 240;
staticCanvas.height = 240;


const staticCtx =
    staticCanvas.getContext(
        "2d"
    );

staticCtx.imageSmoothingEnabled =
    false;


/* =========================================================
   DEGREE BUFFER
   ========================================================= */

const degreeCanvas =
    document.createElement(
        "canvas"
    );

degreeCanvas.width = 40;
degreeCanvas.height = 40;


const degreeCtx =
    degreeCanvas.getContext(
        "2d"
    );

degreeCtx.imageSmoothingEnabled =
    false;


/* =========================================================
   BATTERY BUFFER
   ========================================================= */

const batteryCanvas =
    document.createElement(
        "canvas"
    );

batteryCanvas.width = 170;
batteryCanvas.height = 140;


const batteryCtx =
    batteryCanvas.getContext(
        "2d"
    );

batteryCtx.imageSmoothingEnabled =
    false;


/* =========================================================
   STATUS
   ========================================================= */

const STATUS_X = 10;
const STATUS_Y = 10;

const STATUS_W = 220;
const STATUS_H = 10;


const LOW_BATTERY_THRESHOLD =
    20;


let lastStatusText =
    "";


/* =========================================================
   PIXEL FONT 5 x 7
   ========================================================= */

const PIXEL_FONT = {

    "A": [
        "01110",
        "10001",
        "10001",
        "11111",
        "10001",
        "10001",
        "10001"
    ],

    "B": [
        "11110",
        "10001",
        "10001",
        "11110",
        "10001",
        "10001",
        "11110"
    ],

    "C": [
        "01111",
        "10000",
        "10000",
        "10000",
        "10000",
        "10000",
        "01111"
    ],

    "D": [
        "11110",
        "10001",
        "10001",
        "10001",
        "10001",
        "10001",
        "11110"
    ],

    "E": [
        "11111",
        "10000",
        "10000",
        "11110",
        "10000",
        "10000",
        "11111"
    ],

    "F": [
        "11111",
        "10000",
        "10000",
        "11110",
        "10000",
        "10000",
        "10000"
    ],

    "G": [
        "01111",
        "10000",
        "10000",
        "10111",
        "10001",
        "10001",
        "01111"
    ],

    "H": [
        "10001",
        "10001",
        "10001",
        "11111",
        "10001",
        "10001",
        "10001"
    ],

    "I": [
        "11111",
        "00100",
        "00100",
        "00100",
        "00100",
        "00100",
        "11111"
    ],

    "J": [
        "00111",
        "00010",
        "00010",
        "00010",
        "00010",
        "10010",
        "01100"
    ],

    "K": [
        "10001",
        "10010",
        "10100",
        "11000",
        "10100",
        "10010",
        "10001"
    ],

    "L": [
        "10000",
        "10000",
        "10000",
        "10000",
        "10000",
        "10000",
        "11111"
    ],

    "M": [
        "10001",
        "11011",
        "10101",
        "10101",
        "10001",
        "10001",
        "10001"
    ],

    "N": [
        "10001",
        "11001",
        "11001",
        "10101",
        "10011",
        "10011",
        "10001"
    ],

    "O": [
        "01110",
        "10001",
        "10001",
        "10001",
        "10001",
        "10001",
        "01110"
    ],

    "P": [
        "11110",
        "10001",
        "10001",
        "11110",
        "10000",
        "10000",
        "10000"
    ],

    "Q": [
        "01110",
        "10001",
        "10001",
        "10001",
        "10101",
        "10010",
        "01101"
    ],

    "R": [
        "11110",
        "10001",
        "10001",
        "11110",
        "10100",
        "10010",
        "10001"
    ],

    "S": [
        "01111",
        "10000",
        "10000",
        "01110",
        "00001",
        "00001",
        "11110"
    ],

    "T": [
        "11111",
        "00100",
        "00100",
        "00100",
        "00100",
        "00100",
        "00100"
    ],

    "U": [
        "10001",
        "10001",
        "10001",
        "10001",
        "10001",
        "10001",
        "01110"
    ],

    "V": [
        "10001",
        "10001",
        "10001",
        "10001",
        "10001",
        "01010",
        "00100"
    ],

    "W": [
        "10001",
        "10001",
        "10001",
        "10101",
        "10101",
        "10101",
        "01010"
    ],

    "X": [
        "10001",
        "10001",
        "01010",
        "00100",
        "01010",
        "10001",
        "10001"
    ],

    "Y": [
        "10001",
        "10001",
        "01010",
        "00100",
        "00100",
        "00100",
        "00100"
    ],

    "Z": [
        "11111",
        "00001",
        "00010",
        "00100",
        "01000",
        "10000",
        "11111"
    ],

    "0": [
        "01110",
        "10001",
        "10011",
        "10101",
        "11001",
        "10001",
        "01110"
    ],

    "1": [
        "00100",
        "01100",
        "00100",
        "00100",
        "00100",
        "00100",
        "01110"
    ],

    "2": [
        "01110",
        "10001",
        "00001",
        "00010",
        "00100",
        "01000",
        "11111"
    ],

    "3": [
        "11110",
        "00001",
        "00001",
        "01110",
        "00001",
        "00001",
        "11110"
    ],

    "4": [
        "00010",
        "00110",
        "01010",
        "10010",
        "11111",
        "00010",
        "00010"
    ],

    "5": [
        "11111",
        "10000",
        "10000",
        "11110",
        "00001",
        "00001",
        "11110"
    ],

    "6": [
        "01110",
        "10000",
        "10000",
        "11110",
        "10001",
        "10001",
        "01110"
    ],

    "7": [
        "11111",
        "00001",
        "00010",
        "00100",
        "01000",
        "01000",
        "01000"
    ],

    "8": [
        "01110",
        "10001",
        "10001",
        "01110",
        "10001",
        "10001",
        "01110"
    ],

    "9": [
        "01110",
        "10001",
        "10001",
        "01111",
        "00001",
        "00001",
        "01110"
    ],

    ":": [
        "00000",
        "00100",
        "00100",
        "00000",
        "00100",
        "00100",
        "00000"
    ],

    "/": [
        "00001",
        "00010",
        "00010",
        "00100",
        "01000",
        "01000",
        "10000"
    ],

    "-": [
        "00000",
        "00000",
        "00000",
        "11111",
        "00000",
        "00000",
        "00000"
    ],

    " ": [
        "00000",
        "00000",
        "00000",
        "00000",
        "00000",
        "00000",
        "00000"
    ]

};


/* =========================================================
   DRAW PIXEL TEXT
   ========================================================= */

function drawPixelText(
    text,
    x,
    y
) {

    const CHARACTER_WIDTH =
        5;

    const CHARACTER_GAP =
        1;


    ctx.fillStyle =
        "black";


    let cursorX =
        x;


    const upperText =
        text.toUpperCase();


    for (
        const character of upperText
    ) {

        const glyph =

            PIXEL_FONT[
                character
            ]
            ||
            PIXEL_FONT[" "];


        for (
            let row = 0;
            row < 7;
            row++
        ) {

            for (
                let column = 0;
                column < 5;
                column++
            ) {

                if (
                    glyph[row][column]
                    ===
                    "1"
                ) {

                    ctx.fillRect(

                        cursorX +
                        column,

                        y +
                        row,

                        1,
                        1

                    );

                }

            }

        }


        cursorX +=

            CHARACTER_WIDTH +
            CHARACTER_GAP;

    }

}


/* =========================================================
   DEGREE
   ========================================================= */

const DEGREE_X = 10;
const DEGREE_Y = 65;

const DEGREE_W = 40;
const DEGREE_H = 40;


const DEGREE_DIGIT_1_X = 13;
const DEGREE_DIGIT_1_Y = 30;

const DEGREE_DIGIT_2_X = 21;
const DEGREE_DIGIT_2_Y = 30;


/* =========================================================
   FAN
   ========================================================= */

const FAN_X = 10;
const FAN_Y = 135;

const FAN_W = 40;
const FAN_H = 40;


const FAN_CENTER_X =
    FAN_X + 20;

const FAN_CENTER_Y =
    FAN_Y + 20;


let fanAngle =
    0;


const FAN_MAX_RPS =
    2;


/* =========================================================
   BATTERY NUMBER
   ========================================================= */

const BATTERY_X = 60;
const BATTERY_Y = 55;

const BATTERY_W = 170;
const BATTERY_H = 140;


const BATTERY_DIGIT_1_X =
    0;

const BATTERY_DIGIT_2_X =
    90;


/* =========================================================
   BATTERY BAR
   ========================================================= */

const BATTERY_BAR_X = 59;
const BATTERY_BAR_Y = 215;

const BATTERY_BAR_W = 171;
const BATTERY_BAR_H = 8;


const LCD_COLOR =
    "#CFFB50";


const CHARGE_PLUS_LEAD =
    5;


const CHARGE_PLUS_BOUNCE_TIME =
    220;


/* =========================================================
   DIGIT SPRITES
   ========================================================= */

const BIG_DIGIT_CELL =
    90;

const BIG_DIGIT_W =
    80;

const BIG_DIGIT_H =
    140;


const SMALL_DIGIT_CELL =
    8;

const SMALL_DIGIT_W =
    6;

const SMALL_DIGIT_H =
    10;


/* =========================================================
   DEGREE REFRESH
   ========================================================= */

const DEGREE_REFRESH_TIME =
    250;


const DEGREE_TOTAL_PIXELS =

    DEGREE_W *
    DEGREE_H;


const DEGREE_PIXEL_TIME =

    DEGREE_REFRESH_TIME /
    DEGREE_TOTAL_PIXELS;


let degreePixelIndex =
    0;


let degreeTimeAccumulator =
    0;


let degreeNeedsCommit =
    false;


/* =========================================================
   BATTERY LCD REFRESH
   ========================================================= */

const BATTERY_TILE_SIZE =
    10;


const BATTERY_TILE_COLUMNS =
    8;


const BATTERY_TILE_ROWS =
    14;


const BATTERY_TILES_PER_DIGIT =

    BATTERY_TILE_COLUMNS *
    BATTERY_TILE_ROWS;


const BATTERY_TOTAL_TILES =

    BATTERY_TILES_PER_DIGIT *
    2;


const BATTERY_REFRESH_TIME =
    1000;


const BATTERY_TILE_TIME =

    BATTERY_REFRESH_TIME /
    BATTERY_TOTAL_TILES;


let batteryTileIndex =
    0;


let batteryTimeAccumulator =
    0;


/* =========================================================
   BATTERY / CHARGING
   ========================================================= */

let batteryLevel =
    99;


let lastDisplayedBattery =
    99;


/*
Maximum speed:

-1% every 2 seconds
*/

const BATTERY_DRAIN_AT_MAX_SPEED =
    0.5;


/*
Charging:

+1% every 2 seconds
*/

const BATTERY_CHARGE_PER_SECOND =
    0.5;


/* =========================================================
   GAMEPAD
   ========================================================= */

let activeGamepadIndex =
    null;


/*
Standard mapping:

Triangle = 3
R2       = 7
D-pad Up = 12
D-pad Down = 13
*/

const TRIANGLE_BUTTON_INDEX =
    3;


const R2_BUTTON_INDEX =
    7;


const DPAD_UP_INDEX =
    12;


const DPAD_DOWN_INDEX =
    13;


const R2_DEADZONE =
    0.02;


let triangleWasPressed =
    false;


/* =========================================================
   D-PAD
   ========================================================= */

const DPAD_REPEAT_DELAY =
    350;


const DPAD_REPEAT_INTERVAL =
    80;


let dpadUpWasPressed =
    false;


let dpadUpPressTime =
    0;


let dpadUpLastRepeatTime =
    0;


let dpadDownWasPressed =
    false;


let dpadDownPressTime =
    0;


let dpadDownLastRepeatTime =
    0;


/* =========================================================
   PYTHON / EXE BRIDGE
   ========================================================= */

let controllerSocket =
    null;


let reconnectTimer =
    null;


let lastSentFanSpeed =
    -1;


/* =========================================================
   TIME
   ========================================================= */

let previousTime =
    0;


/* =========================================================
   CONNECTION UI
   ========================================================= */

function setControllerConnectionUI(
    connected
) {

    if (
        !controllerConnectionStatus
    ) {

        return;

    }


    if (
        connected
    ) {

        controllerConnectionStatus.textContent =
            "CONNECTED";


        controllerConnectionStatus.className =
            "connection-status connected";

    }

    else {

        controllerConnectionStatus.textContent =
            "WAITING";


        controllerConnectionStatus.className =
            "connection-status waiting";

    }

}


function setBridgeConnectionUI(
    connected
) {

    if (
        !bridgeConnectionStatus
    ) {

        return;

    }


    if (
        connected
    ) {

        bridgeConnectionStatus.textContent =
            "CONNECTED";


        bridgeConnectionStatus.className =
            "connection-status connected";

    }

    else {

        bridgeConnectionStatus.textContent =
            "NOT CONNECTED";


        bridgeConnectionStatus.className =
            "connection-status disconnected";

    }

}


/* =========================================================
   FIND EXISTING GAMEPAD
   ========================================================= */

/*
If the controller was connected before
this page loaded, gamepadconnected may
not fire immediately.

This checks navigator.getGamepads()
directly.
*/

function findExistingGamepad() {

    const gamepads =
        navigator.getGamepads();


    for (
        const gamepad of gamepads
    ) {

        if (
            gamepad
        ) {

            activeGamepadIndex =
                gamepad.index;


            setControllerConnectionUI(
                true
            );


            return true;

        }

    }


    return false;

}


/* =========================================================
   LOAD IMAGE
   ========================================================= */

function loadImage(src) {

    return new Promise(

        function(
            resolve,
            reject
        ) {

            const img =
                new Image();


            img.onload =
                function() {

                    console.log(
                        "Loaded:",
                        src
                    );


                    resolve(
                        img
                    );

                };


            img.onerror =
                function() {

                    console.error(
                        "FAILED:",
                        src
                    );


                    reject(
                        src
                    );

                };


            img.src =
                src;

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

    scale =
        Math.round(
            Number(scale)
        );


    scale =
        Math.max(

            1,

            Math.min(
                10,
                scale
            )

        );


    scaleInput.value =
        scale;


    canvas.style.width =

        (
            240 *
            scale
        ) +
        "px";


    canvas.style.height =

        (
            240 *
            scale
        ) +
        "px";


    canvas.style.imageRendering =
        "pixelated";

}


applyScaleBtn.addEventListener(

    "click",

    function() {

        applyScale(
            scaleInput.value
        );

    }

);


resetScaleBtn.addEventListener(

    "click",

    function() {

        applyScale(
            1
        );

    }

);


/* =========================================================
   STATUS LOGIC
   ========================================================= */

function getStatusText() {

    const running =

        Number(
            speedSlider.value
        ) > 0;


    const charging =
        chargingToggle.checked;


    const lowBattery =

        batteryLevel <=
        LOW_BATTERY_THRESHOLD;


    if (
        running
    ) {

        if (
            charging
        ) {

            return (
                "STATE: RUN / CHARGING"
            );

        }


        if (
            lowBattery
        ) {

            return (
                "STATE: RUN / LOW BATTERY"
            );

        }


        return (
            "STATE: RUN"
        );

    }


    if (
        charging
    ) {

        return (
            "STATE: CHARGING"
        );

    }


    if (
        lowBattery
    ) {

        return (
            "STATE: LOW BATTERY"
        );

    }


    return (
        "STATE: READY"
    );

}


/* =========================================================
   DRAW STATUS
   ========================================================= */

function drawStatus(
    force = false
) {

    const statusText =
        getStatusText();


    if (
        !force &&
        statusText ===
        lastStatusText
    ) {

        return;

    }


    lastStatusText =
        statusText;


    ctx.drawImage(

        staticCanvas,

        STATUS_X,
        STATUS_Y,

        STATUS_W,
        STATUS_H,

        STATUS_X,
        STATUS_Y,

        STATUS_W,
        STATUS_H

    );


    drawPixelText(

        statusText,

        STATUS_X,
        STATUS_Y

    );

}


/* =========================================================
   CONTROL TEXT
   ========================================================= */

function updateControlTexts() {

    batteryText.textContent =

        twoDigits(

            Math.floor(
                batteryLevel
            )

        );


    speedText.textContent =
        speedSlider.value;


    openingText.textContent =

        twoDigits(
            openingSlider.value
        );

}


/* =========================================================
   CHARGING MODE
   ========================================================= */

function setChargingMode(
    enabled
) {

    chargingToggle.checked =
        enabled;


    drawStatus(
        true
    );

}


chargingToggle.addEventListener(

    "change",

    function() {

        setChargingMode(
            chargingToggle.checked
        );

    }

);


/* =========================================================
   OPENING
   ========================================================= */

function setOpeningValueWithoutRefresh(
    value
) {

    value =
        Math.round(
            value
        );


    value =

        Math.max(

            1,

            Math.min(
                90,
                value
            )

        );


    const currentValue =

        Number(
            openingSlider.value
        );


    if (
        value ===
        currentValue
    ) {

        return false;

    }


    openingSlider.value =
        value;


    openingText.textContent =

        twoDigits(
            value
        );


    degreeNeedsCommit =
        true;


    return true;

}


/* =========================================================
   COMMIT OPENING
   ========================================================= */

function commitOpeningToDisplay() {

    if (
        !degreeNeedsCommit
    ) {

        return;

    }


    buildDegreeTarget();


    degreePixelIndex =
        0;


    degreeTimeAccumulator =
        0;


    degreeNeedsCommit =
        false;

}


/* =========================================================
   MANUAL OPENING
   ========================================================= */

openingSlider.addEventListener(

    "input",

    function() {

        openingText.textContent =

            twoDigits(
                openingSlider.value
            );


        buildDegreeTarget();


        degreePixelIndex =
            0;


        degreeTimeAccumulator =
            0;


        degreeNeedsCommit =
            false;

    }

);


/* =========================================================
   BATTERY LCD RESTART
   ========================================================= */

function restartBatteryRefresh() {

    buildBatteryTarget();


    batteryTileIndex =
        0;


    batteryTimeAccumulator =
        0;

}


/* =========================================================
   BATTERY SLIDER
   ========================================================= */

batterySlider.addEventListener(

    "input",

    function() {

        batteryLevel =

            Number(
                batterySlider.value
            );


        lastDisplayedBattery =

            Math.floor(
                batteryLevel
            );


        batteryText.textContent =

            twoDigits(
                lastDisplayedBattery
            );


        restartBatteryRefresh();


        drawStatus();

    }

);


/* =========================================================
   SPEED SLIDER
   ========================================================= */

speedSlider.addEventListener(

    "input",

    function() {

        speedText.textContent =
            speedSlider.value;


        sendFanSpeedToBridge(

            Number(
                speedSlider.value
            )

        );


        drawStatus();

    }

);


/* =========================================================
   RESET BATTERY
   ========================================================= */

resetBatteryBtn.addEventListener(

    "click",

    function() {

        batteryLevel =
            99;


        lastDisplayedBattery =
            99;


        batterySlider.value =
            99;


        batteryText.textContent =
            "99";


        restartBatteryRefresh();


        drawStatus(
            true
        );

    }

);


/* =========================================================
   CONNECT CONTROLLER BRIDGE
   ========================================================= */

function connectControllerBridge() {

    if (
        controllerSocket &&
        (
            controllerSocket.readyState ===
            WebSocket.OPEN

            ||

            controllerSocket.readyState ===
            WebSocket.CONNECTING
        )
    ) {

        return;

    }


    setBridgeConnectionUI(
        false
    );


    controllerSocket =

        new WebSocket(

            "ws://127.0.0.1:8765"

        );


    controllerSocket.addEventListener(

        "open",

        function() {

            console.log(
                "Controller bridge connected."
            );


            lastSentFanSpeed =
                -1;


            setBridgeConnectionUI(
                true
            );

        }

    );


    controllerSocket.addEventListener(

        "close",

        function() {

            console.log(
                "Controller bridge disconnected."
            );


            setBridgeConnectionUI(
                false
            );


            controllerSocket =
                null;


            clearTimeout(
                reconnectTimer
            );


            reconnectTimer =

                setTimeout(

                    connectControllerBridge,

                    1000

                );

        }

    );


    controllerSocket.addEventListener(

        "error",

        function() {

            setBridgeConnectionUI(
                false
            );

        }

    );

}


/* =========================================================
   SEND FAN SPEED
   ========================================================= */

function sendFanSpeedToBridge(
    fanSpeed
) {

    fanSpeed =

        Math.round(
            fanSpeed
        );


    if (
        fanSpeed ===
        lastSentFanSpeed
    ) {

        return;

    }


    if (
        !controllerSocket

        ||

        controllerSocket.readyState !==
        WebSocket.OPEN
    ) {

        return;

    }


    controllerSocket.send(

        JSON.stringify({

            type:
                "fanSpeed",

            value:
                fanSpeed

        })

    );


    lastSentFanSpeed =
        fanSpeed;

}


/* =========================================================
   PAGE CLOSE
   ========================================================= */

window.addEventListener(

    "beforeunload",

    function() {

        if (
            controllerSocket

            &&

            controllerSocket.readyState ===
            WebSocket.OPEN
        ) {

            controllerSocket.send(

                JSON.stringify({

                    type:
                        "stop"

                })

            );

        }

    }

);


/* =========================================================
   GAMEPAD CONNECT
   ========================================================= */

window.addEventListener(

    "gamepadconnected",

    function(event) {

        activeGamepadIndex =
            event.gamepad.index;


        setControllerConnectionUI(
            true
        );


        console.log(

            "Gamepad connected:",

            event.gamepad.id

        );

    }

);


/* =========================================================
   GAMEPAD DISCONNECT
   ========================================================= */

window.addEventListener(

    "gamepaddisconnected",

    function(event) {

        if (
            event.gamepad.index ===
            activeGamepadIndex
        ) {

            commitOpeningToDisplay();


            activeGamepadIndex =
                null;


            speedSlider.value =
                0;


            speedText.textContent =
                0;


            sendFanSpeedToBridge(
                0
            );


            dpadUpWasPressed =
                false;


            dpadDownWasPressed =
                false;


            triangleWasPressed =
                false;


            setControllerConnectionUI(
                false
            );


            drawStatus(
                true
            );

        }

    }

);


/* =========================================================
   TRIANGLE INPUT
   ========================================================= */

function updateTriangleInput(
    gamepad
) {

    const triangle =

        gamepad.buttons[
            TRIANGLE_BUTTON_INDEX
        ];


    if (
        !triangle
    ) {

        return;

    }


    const pressed =
        triangle.pressed;


    if (
        pressed &&
        !triangleWasPressed
    ) {

        setChargingMode(

            !chargingToggle.checked

        );

    }


    triangleWasPressed =
        pressed;

}


/* =========================================================
   D-PAD INPUT
   ========================================================= */

function updateDpadInput(
    gamepad,
    timestamp
) {

    const upButton =

        gamepad.buttons[
            DPAD_UP_INDEX
        ];


    const downButton =

        gamepad.buttons[
            DPAD_DOWN_INDEX
        ];


    if (
        !upButton ||
        !downButton
    ) {

        return;

    }


    const upPressed =
        upButton.pressed;


    const downPressed =
        downButton.pressed;


    const upWasPressed =
        dpadUpWasPressed;


    const downWasPressed =
        dpadDownWasPressed;


    /* -------------------------
       UP
       ------------------------- */

    if (
        upPressed
    ) {

        if (
            !upWasPressed
        ) {

            setOpeningValueWithoutRefresh(

                Number(
                    openingSlider.value
                ) + 1

            );


            dpadUpPressTime =
                timestamp;


            dpadUpLastRepeatTime =
                timestamp;

        }

        else {

            const holdTime =

                timestamp -
                dpadUpPressTime;


            const repeatTime =

                timestamp -
                dpadUpLastRepeatTime;


            if (
                holdTime >=
                DPAD_REPEAT_DELAY

                &&

                repeatTime >=
                DPAD_REPEAT_INTERVAL
            ) {

                setOpeningValueWithoutRefresh(

                    Number(
                        openingSlider.value
                    ) + 1

                );


                dpadUpLastRepeatTime =
                    timestamp;

            }

        }

    }


    /* -------------------------
       DOWN
       ------------------------- */

    if (
        downPressed
    ) {

        if (
            !downWasPressed
        ) {

            setOpeningValueWithoutRefresh(

                Number(
                    openingSlider.value
                ) - 1

            );


            dpadDownPressTime =
                timestamp;


            dpadDownLastRepeatTime =
                timestamp;

        }

        else {

            const holdTime =

                timestamp -
                dpadDownPressTime;


            const repeatTime =

                timestamp -
                dpadDownLastRepeatTime;


            if (
                holdTime >=
                DPAD_REPEAT_DELAY

                &&

                repeatTime >=
                DPAD_REPEAT_INTERVAL
            ) {

                setOpeningValueWithoutRefresh(

                    Number(
                        openingSlider.value
                    ) - 1

                );


                dpadDownLastRepeatTime =
                    timestamp;

            }

        }

    }


    /* -------------------------
       RELEASE
       ------------------------- */

    const wasAdjusting =

        upWasPressed ||
        downWasPressed;


    const isAdjusting =

        upPressed ||
        downPressed;


    if (
        wasAdjusting &&
        !isAdjusting
    ) {

        commitOpeningToDisplay();

    }


    dpadUpWasPressed =
        upPressed;


    dpadDownWasPressed =
        downPressed;

}


/* =========================================================
   GAMEPAD INPUT
   ========================================================= */

function updateGamepadInput(
    timestamp
) {

    /*
    If we do not yet have a gamepad,
    scan for one.

    This lets users connect first,
    open the page second,
    then press a button.
    */

    if (
        activeGamepadIndex ===
        null
    ) {

        findExistingGamepad();

    }


    if (
        activeGamepadIndex ===
        null
    ) {

        return;

    }


    const gamepads =
        navigator.getGamepads();


    const gamepad =

        gamepads[
            activeGamepadIndex
        ];


    if (
        !gamepad
    ) {

        activeGamepadIndex =
            null;


        setControllerConnectionUI(
            false
        );


        return;

    }


    setControllerConnectionUI(
        true
    );


    /* Triangle */

    updateTriangleInput(
        gamepad
    );


    /* D-pad */

    updateDpadInput(
        gamepad,
        timestamp
    );


    /* R2 */

    const r2 =

        gamepad.buttons[
            R2_BUTTON_INDEX
        ];


    if (
        !r2
    ) {

        return;

    }


    if (
        batteryLevel <= 0

        &&

        !chargingToggle.checked
    ) {

        speedSlider.value =
            0;


        speedText.textContent =
            0;


        sendFanSpeedToBridge(
            0
        );


        drawStatus();


        return;

    }


    let triggerDepth =
        r2.value;


    if (
        triggerDepth <
        R2_DEADZONE
    ) {

        triggerDepth =
            0;

    }


    const previousSpeed =

        Number(
            speedSlider.value
        );


    const fanSpeed =

        Math.round(

            triggerDepth *
            100

        );


    speedSlider.value =
        fanSpeed;


    speedText.textContent =
        fanSpeed;


    sendFanSpeedToBridge(
        fanSpeed
    );


    if (
        (previousSpeed === 0)
        !==
        (fanSpeed === 0)
    ) {

        drawStatus();

    }

}


/* =========================================================
   BATTERY MODEL
   ========================================================= */

function updateBattery(
    deltaSeconds
) {

    const speed =

        Number(
            speedSlider.value
        );


    const charging =
        chargingToggle.checked;


    const speedRatio =

        speed /
        100;


    const drainPerSecond =

        BATTERY_DRAIN_AT_MAX_SPEED *
        speedRatio;


    const chargePerSecond =

        charging
            ? BATTERY_CHARGE_PER_SECOND
            : 0;


    const netChange =

        chargePerSecond -
        drainPerSecond;


    batteryLevel +=

        netChange *
        deltaSeconds;


    batteryLevel =

        Math.max(

            0,

            Math.min(
                99,
                batteryLevel
            )

        );


    const displayedBattery =

        Math.floor(
            batteryLevel
        );


    if (
        displayedBattery !==
        lastDisplayedBattery
    ) {

        lastDisplayedBattery =
            displayedBattery;


        batterySlider.value =
            displayedBattery;


        batteryText.textContent =

            twoDigits(
                displayedBattery
            );


        restartBatteryRefresh();


        drawStatus();

    }


    if (
        batteryLevel <= 0

        &&

        !charging
    ) {

        if (
            Number(
                speedSlider.value
            ) !== 0
        ) {

            speedSlider.value =
                0;


            speedText.textContent =
                0;


            sendFanSpeedToBridge(
                0
            );


            drawStatus(
                true
            );

        }

    }

}


/* =========================================================
   DEGREE STATE
   ========================================================= */

function getDegreeStateIndex(
    value
) {

    value =
        Number(value);


    if (
        value <= 15
    ) {

        return 0;

    }


    if (
        value <= 30
    ) {

        return 1;

    }


    if (
        value <= 45
    ) {

        return 2;

    }


    if (
        value <= 60
    ) {

        return 3;

    }


    if (
        value <= 75
    ) {

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

    const sourceX =

        Number(digit) *
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

    const sourceX =

        Number(digit) *
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
   BUILD DEGREE TARGET
   ========================================================= */

function buildDegreeTarget() {

    degreeCtx.clearRect(

        0,
        0,

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


    degreeCtx.drawImage(

        images.degreeStates[
            stateIndex
        ],

        0,
        0

    );


    const text =

        twoDigits(
            value
        );


    drawSmallDigit(

        degreeCtx,

        text[0],

        DEGREE_DIGIT_1_X,
        DEGREE_DIGIT_1_Y

    );


    drawSmallDigit(

        degreeCtx,

        text[1],

        DEGREE_DIGIT_2_X,
        DEGREE_DIGIT_2_Y

    );

}


/* =========================================================
   DEGREE PIXEL REFRESH
   ========================================================= */

function refreshOneDegreePixel() {

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


    if (
        degreePixelIndex >=
        DEGREE_TOTAL_PIXELS
    ) {

        degreePixelIndex =
            0;

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

        Math.max(

            0,

            Math.min(

                99,

                Math.floor(
                    batteryLevel
                )

            )

        );


    const text =

        twoDigits(
            value
        );


    drawBigDigit(

        batteryCtx,

        text[0],

        BATTERY_DIGIT_1_X,

        0

    );


    drawBigDigit(

        batteryCtx,

        text[1],

        BATTERY_DIGIT_2_X,

        0

    );

}


/* =========================================================
   BATTERY TILE REFRESH
   ========================================================= */

function refreshOneBatteryTile() {

    let digitIndex;

    let localTileIndex;


    if (
        batteryTileIndex <
        BATTERY_TILES_PER_DIGIT
    ) {

        digitIndex =
            0;


        localTileIndex =
            batteryTileIndex;

    }

    else {

        digitIndex =
            1;


        localTileIndex =

            batteryTileIndex -
            BATTERY_TILES_PER_DIGIT;

    }


    const column =

        localTileIndex %
        BATTERY_TILE_COLUMNS;


    const row =

        Math.floor(

            localTileIndex /
            BATTERY_TILE_COLUMNS

        );


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


    ctx.drawImage(

        staticCanvas,

        screenX,
        screenY,

        BATTERY_TILE_SIZE,
        BATTERY_TILE_SIZE,

        screenX,
        screenY,

        BATTERY_TILE_SIZE,
        BATTERY_TILE_SIZE

    );


    ctx.drawImage(

        batteryCanvas,

        localX,
        localY,

        BATTERY_TILE_SIZE,
        BATTERY_TILE_SIZE,

        screenX,
        screenY,

        BATTERY_TILE_SIZE,
        BATTERY_TILE_SIZE

    );


    batteryTileIndex++;


    if (
        batteryTileIndex >=
        BATTERY_TOTAL_TILES
    ) {

        batteryTileIndex =
            0;

    }

}


/* =========================================================
   CHARGING PLUS PIXEL
   ========================================================= */

function drawChargePlusPixel(
    x,
    y,
    fillEndX
) {

    if (
        x <= fillEndX
    ) {

        ctx.fillStyle =
            LCD_COLOR;

    }

    else {

        ctx.fillStyle =
            "black";

    }


    ctx.fillRect(

        x,
        y,

        1,
        1

    );

}


/* =========================================================
   CHARGING PLUS
   ========================================================= */

function drawChargingPlus(
    centerX,
    centerY,
    fillEndX
) {

    /* Vertical */

    for (
        let dy = -2;
        dy <= 2;
        dy++
    ) {

        drawChargePlusPixel(

            centerX,

            centerY + dy,

            fillEndX

        );

    }


    /* Horizontal */

    for (
        let dx = -2;
        dx <= 2;
        dx++
    ) {

        drawChargePlusPixel(

            centerX + dx,

            centerY,

            fillEndX

        );

    }

}


/* =========================================================
   BATTERY BAR
   ========================================================= */

function drawBatteryBar(
    timestamp
) {

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

        Math.max(

            0,

            Math.min(
                99,
                batteryLevel
            )

        );


    const percentage =

        value /
        99;


    const innerX =

        BATTERY_BAR_X +
        1;


    const innerWidth =

        BATTERY_BAR_W -
        2;


    const fillWidth =

        Math.round(

            innerWidth *
            percentage

        );


    const fillEndX =

        innerX +
        fillWidth -
        1;


    if (
        fillWidth > 0
    ) {

        ctx.fillStyle =
            "black";


        ctx.fillRect(

            innerX,

            BATTERY_BAR_Y + 1,

            fillWidth,

            BATTERY_BAR_H - 2

        );

    }


    if (
        !chargingToggle.checked
    ) {

        return;

    }


    let plusCenterX =

        innerX +
        fillWidth +
        CHARGE_PLUS_LEAD;


    const maxPlusCenterX =

        BATTERY_BAR_X +
        BATTERY_BAR_W -
        4;


    const minPlusCenterX =

        BATTERY_BAR_X +
        3;


    plusCenterX =

        Math.max(

            minPlusCenterX,

            Math.min(

                maxPlusCenterX,

                plusCenterX

            )

        );


    const bounce =

        Math.floor(

            timestamp /
            CHARGE_PLUS_BOUNCE_TIME

        ) % 2;


    const plusCenterY =

        BATTERY_BAR_Y +
        3 +
        bounce;


    drawChargingPlus(

        plusCenterX,

        plusCenterY,

        fillEndX

    );

}


/* =========================================================
   DRAW FAN
   ========================================================= */

function drawFan() {

    const clearX =

        FAN_CENTER_X -
        30;


    const clearY =

        FAN_CENTER_Y -
        30;


    const clearSize =
        60;


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


    ctx.beginPath();


    ctx.rect(

        FAN_X,
        FAN_Y,

        FAN_W,
        FAN_H

    );


    ctx.clip();


    ctx.imageSmoothingEnabled =
        false;


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


    ctx.imageSmoothingEnabled =
        false;

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


    if (
        speed <= 0
    ) {

        fanAngle =
            0;


        drawFan();

        return;

    }


    const rotationsPerSecond =

        FAN_MAX_RPS *

        (
            speed /
            100
        );


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
   MAIN LOOP
   ========================================================= */

function animate(
    timestamp
) {

    if (
        !previousTime
    ) {

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


    /* Controller */

    updateGamepadInput(
        timestamp
    );


    /* Battery */

    updateBattery(
        deltaSeconds
    );


    /* Degree */

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


    /* Battery numbers */

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


    /* Fan */

    updateFan(
        deltaSeconds
    );


    /* Battery bar */

    drawBatteryBar(
        timestamp
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
           CONNECTION UI
           ------------------------- */

        setControllerConnectionUI(
            false
        );


        setBridgeConnectionUI(
            false
        );


        /*
        Detect a controller that may
        already be connected.
        */

        findExistingGamepad();


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
           OTHER ASSETS
           ------------------------- */

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
           DEFAULT STATE
           ------------------------- */

        batteryLevel =
            99;


        lastDisplayedBattery =
            99;


        batterySlider.value =
            99;


        chargingToggle.checked =
            false;


        triangleWasPressed =
            false;


        /* -------------------------
           UI
           ------------------------- */

        updateControlTexts();


        applyScale(
            scaleInput.value
        );


        /* -------------------------
           DEGREE
           ------------------------- */

        buildDegreeTarget();


        degreePixelIndex =
            0;


        degreeTimeAccumulator =
            0;


        degreeNeedsCommit =
            false;


        /* -------------------------
           BATTERY
           ------------------------- */

        buildBatteryTarget();


        batteryTileIndex =
            0;


        batteryTimeAccumulator =
            0;


        /* -------------------------
           FAN
           ------------------------- */

        drawFan();


        /* -------------------------
           STATUS
           ------------------------- */

        drawStatus(
            true
        );


        /* -------------------------
           LOCAL EXE BRIDGE
           ------------------------- */

        connectControllerBridge();


        /* -------------------------
           START
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