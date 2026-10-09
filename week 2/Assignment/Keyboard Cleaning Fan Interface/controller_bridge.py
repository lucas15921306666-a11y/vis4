import asyncio
import json

import websockets
from pydualsense import pydualsense


# ============================================================
# DUALSENSE
# ============================================================

controller = pydualsense()

print("Connecting to DualSense...")

controller.init()

print("DualSense connected.")


# ============================================================
# RUMBLE
# ============================================================

def set_rumble(speed):

    # Clamp:
    # 0 - 100

    speed = max(
        0,
        min(
            100,
            int(speed)
        )
    )


    # Convert 0 - 100 to 0.0 - 1.0

    x = speed / 100.0


    # ========================================================
    # NON-LINEAR HAPTIC CURVE
    #
    # Low speed:
    # gentler vibration
    #
    # High speed:
    # increasingly stronger change
    #
    # curve =
    # 25% linear
    # +
    # 75% quadratic
    # ========================================================

    curve = (
        0.25 * x
        +
        0.75 * (x ** 2)
    )


    strength = round(
        curve * 255
    )


    # Safety clamp

    strength = max(
        0,
        min(
            255,
            strength
        )
    )


    controller.setLeftMotor(
        strength
    )


    controller.setRightMotor(
        strength
    )


    print(
        f"Fan Speed: {speed:3d}"
        f" | Rumble: {strength:3d}",
        end="\r"
    )


def stop_rumble():

    controller.setLeftMotor(
        0
    )

    controller.setRightMotor(
        0
    )


# ============================================================
# WEBSOCKET CLIENT
# ============================================================

async def handle_client(websocket):

    print()
    print("Browser connected.")


    try:

        async for message in websocket:

            try:

                data = json.loads(
                    message
                )

            except json.JSONDecodeError:

                print()
                print(
                    "Invalid JSON:",
                    message
                )

                continue


            message_type = data.get(
                "type"
            )


            # =================================================
            # FAN SPEED
            # =================================================

            if (
                message_type
                ==
                "fanSpeed"
            ):

                speed = data.get(
                    "value",
                    0
                )


                try:

                    speed = int(
                        speed
                    )

                except (
                    TypeError,
                    ValueError
                ):

                    speed = 0


                set_rumble(
                    speed
                )


            # =================================================
            # STOP
            # =================================================

            elif (
                message_type
                ==
                "stop"
            ):

                stop_rumble()


    except websockets.ConnectionClosed:

        pass


    finally:

        stop_rumble()

        print()
        print(
            "Browser disconnected."
        )


# ============================================================
# SERVER
# ============================================================

async def main():

    print(
        "Starting WebSocket bridge..."
    )


    async with websockets.serve(

        handle_client,

        "127.0.0.1",

        8765

    ):

        print(
            "Bridge ready:"
        )

        print(
            "ws://127.0.0.1:8765"
        )

        print()

        print(
            "Open the webpage and press R2."
        )

        print(
            "Press Ctrl+C to stop."
        )

        print()


        await asyncio.Future()


# ============================================================
# START
# ============================================================

try:

    asyncio.run(
        main()
    )


except KeyboardInterrupt:

    print()
    print(
        "Stopping bridge..."
    )


finally:

    stop_rumble()

    controller.close()

    print(
        "DualSense disconnected."
    )