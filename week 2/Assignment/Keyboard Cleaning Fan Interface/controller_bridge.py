import asyncio
import json

import websockets

from pydualsense import (
    pydualsense,
    TriggerModes
)


# ============================================================
# DUALSENSE
# ============================================================

controller = pydualsense()

print("Connecting to DualSense...")

controller.init()

print("DualSense connected.")


# ============================================================
# FEEDBACK SETTINGS
# ============================================================

#
# RUMBLE CURVE
#
# 1.0 = linear
# 2.0 = quadratic
#
# Current:
# low speed = subtle
# high speed = much stronger
#

RUMBLE_CURVE_EXPONENT = 2.0


#
# ADAPTIVE TRIGGER CURVE
#
# Slightly less aggressive than rumble,
# so R2 stays controllable at medium speed.
#

TRIGGER_CURVE_EXPONENT = 1.6


#
# Minimum trigger resistance after
# the fan begins running.
#
# 0 - 255
#

TRIGGER_MIN_FORCE = 25


#
# Maximum R2 resistance.
#
# 0 - 255
#

TRIGGER_MAX_FORCE = 220


# ============================================================
# CURRENT STATE
# ============================================================

current_speed = 0

last_trigger_force = -1


# ============================================================
# RUMBLE MAPPING
# ============================================================

def speed_to_motor_strength(speed):

    speed = max(
        0,
        min(
            100,
            int(speed)
        )
    )


    normalized = (
        speed / 100.0
    )


    curved = (
        normalized
        ** RUMBLE_CURVE_EXPONENT
    )


    strength = round(
        curved * 255
    )


    return strength


# ============================================================
# TRIGGER FORCE MAPPING
# ============================================================

def speed_to_trigger_force(speed):

    speed = max(
        0,
        min(
            100,
            int(speed)
        )
    )


    #
    # Fan stopped:
    # no adaptive-trigger resistance.
    #

    if speed <= 0:

        return 0


    normalized = (
        speed / 100.0
    )


    curved = (
        normalized
        ** TRIGGER_CURVE_EXPONENT
    )


    force_range = (
        TRIGGER_MAX_FORCE
        -
        TRIGGER_MIN_FORCE
    )


    force = (

        TRIGGER_MIN_FORCE

        +

        round(
            curved
            *
            force_range
        )

    )


    force = max(
        0,
        min(
            255,
            force
        )
    )


    return force


# ============================================================
# RUMBLE
# ============================================================

def set_rumble(speed):

    strength = (
        speed_to_motor_strength(
            speed
        )
    )


    controller.setLeftMotor(
        strength
    )


    controller.setRightMotor(
        strength
    )


    return strength


# ============================================================
# STOP RUMBLE
# ============================================================

def stop_rumble():

    controller.setLeftMotor(
        0
    )


    controller.setRightMotor(
        0
    )


# ============================================================
# CLEAR RIGHT TRIGGER EFFECT
# ============================================================

def clear_trigger():

    global last_trigger_force


    #
    # Switch adaptive trigger off.
    #

    controller.triggerR.setMode(
        TriggerModes.Off
    )


    #
    # Clear all available force parameters.
    #

    for force_id in range(7):

        controller.triggerR.setForce(
            force_id,
            0
        )


    last_trigger_force = 0


# ============================================================
# SET RIGHT TRIGGER RESISTANCE
# ============================================================

def set_trigger_resistance(speed):

    global last_trigger_force


    force = (
        speed_to_trigger_force(
            speed
        )
    )


    #
    # Speed 0:
    #
    # R2 should return to its normal
    # unrestricted state.
    #

    if force <= 0:

        if last_trigger_force != 0:

            clear_trigger()

        return 0


    #
    # Avoid repeatedly sending the exact
    # same trigger setting.
    #

    if force == last_trigger_force:

        return force


    #
    # Rigid = continuous resistance.
    #
    # pydualsense's own example uses
    # Force parameter 1 for Rigid mode.
    #

    controller.triggerR.setMode(
        TriggerModes.Rigid
    )


    #
    # Clear previous parameters first.
    #

    for force_id in range(7):

        controller.triggerR.setForce(
            force_id,
            0
        )


    #
    # Force parameter 1 controls
    # the Rigid resistance in the
    # pydualsense example.
    #

    controller.triggerR.setForce(
        1,
        force
    )


    last_trigger_force = force


    return force


# ============================================================
# APPLY COMPLETE FAN FEEDBACK
# ============================================================

def set_fan_feedback(speed):

    global current_speed


    speed = max(
        0,
        min(
            100,
            int(speed)
        )
    )


    current_speed = speed


    #
    # 1. Controller body rumble
    #

    rumble_strength = (
        set_rumble(
            speed
        )
    )


    #
    # 2. R2 adaptive-trigger resistance
    #

    trigger_force = (
        set_trigger_resistance(
            speed
        )
    )


    print(

        f"Fan Speed: {speed:3d}"

        f" | Rumble: {rumble_strength:3d}"

        f" | R2 Force: {trigger_force:3d}",

        end="\r"

    )


# ============================================================
# STOP ALL FEEDBACK
# ============================================================

def stop_all_feedback():

    global current_speed


    current_speed = 0


    stop_rumble()


    clear_trigger()


# ============================================================
# WEBSOCKET CLIENT
# ============================================================

async def handle_client(websocket):

    print()

    print(
        "Browser connected."
    )


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


            message_type = (
                data.get(
                    "type"
                )
            )


            # =================================================
            # FAN SPEED
            # =================================================

            if (
                message_type
                ==
                "fanSpeed"
            ):

                speed = (
                    data.get(
                        "value",
                        0
                    )
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


                set_fan_feedback(
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

                stop_all_feedback()


    except websockets.ConnectionClosed:

        pass


    finally:

        #
        # Extremely important:
        #
        # If browser closes or disconnects,
        # remove BOTH vibration and
        # adaptive-trigger resistance.
        #

        stop_all_feedback()


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


    print()

    print(
        "Feedback:"
    )

    print(
        "- Controller rumble"
    )

    print(
        "- R2 adaptive resistance"
    )

    print()


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

    #
    # Always clear feedback before exit.
    #

    stop_all_feedback()


    controller.close()


    print(
        "DualSense disconnected."
    )