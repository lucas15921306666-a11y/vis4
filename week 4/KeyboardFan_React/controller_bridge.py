
"""DualSense haptic bridge for Keyboard Cleaning Fan."""

import asyncio
import json
import math
import os
import sys
from pathlib import Path

# Allow Windows to find hidapi.dll beside this file.
if os.name == "nt":
    here = Path(__file__).resolve().parent

    if hasattr(os, "add_dll_directory"):
        os.add_dll_directory(str(here))

    os.environ["PATH"] = (
        str(here) + os.pathsep + os.environ.get("PATH", "")
    )

import websockets
from pydualsense import pydualsense, TriggerModes


HOST = "127.0.0.1"
PORT = 8765

RUMBLE_EXPONENT = 2.0
TRIGGER_EXPONENT = 1.6

TRIGGER_MIN_FORCE = 25
TRIGGER_MAX_FORCE = 220


def clamp_speed(value):
    try:
        number = float(value)
    except (ValueError, TypeError):
        return 0

    if not math.isfinite(number):
        return 0

    return round(max(0, min(100, number)))


def speed_to_rumble(speed):
    return round(
        255 * (speed / 100) ** RUMBLE_EXPONENT
    )


def speed_to_trigger(speed):
    if speed == 0:
        return 0

    fraction = (speed / 100) ** TRIGGER_EXPONENT

    return round(
        TRIGGER_MIN_FORCE
        + (TRIGGER_MAX_FORCE - TRIGGER_MIN_FORCE) * fraction
    )


class FanController:

    def __init__(self):
        self.device = None
        self.last_speed = None
        self.last_trigger_force = None

    def open(self):
        print("Connecting to DualSense (USB recommended)...")

        self.device = pydualsense()
        self.device.init()

        self.stop()
        print("DualSense connected.")

    def stop(self):
        if self.device is None:
            return

        self.device.setLeftMotor(0)
        self.device.setRightMotor(0)

        self.device.triggerR.setMode(TriggerModes.Off)

        for index in range(7):
            self.device.triggerR.setForce(index, 0)

        self.last_speed = 0
        self.last_trigger_force = 0

    def apply_speed(self, value):
        speed = clamp_speed(value)

        if speed == self.last_speed:
            return

        if speed == 0:
            self.stop()
            print("Fan 0% | Rumble OFF | R2 OFF")
            return

        rumble = speed_to_rumble(speed)
        force = speed_to_trigger(speed)

        # Controller body vibration
        self.device.setLeftMotor(rumble)
        self.device.setRightMotor(rumble)

        # R2 adaptive trigger resistance
        if force != self.last_trigger_force:
            self.device.triggerR.setMode(TriggerModes.Rigid)
            self.device.triggerR.setForce(1, force)
            self.last_trigger_force = force

        self.last_speed = speed

        print(
            f"Fan {speed:3d}%"
            f" | Rumble {rumble:3d}/255"
            f" | R2 {force:3d}/255"
        )

    def close(self):
        if self.device is not None:
            try:
                self.stop()
            finally:
                self.device.close()
                self.device = None


async def main():
    controller = FanController()
    active_client = None

    try:
        controller.open()

        async def handle_client(websocket):
            nonlocal active_client

            if active_client is not None:
                await websocket.close(
                    code=1013,
                    reason="Another browser tab is controlling DualSense"
                )
                return

            active_client = websocket
            print("Browser connected.")

            try:
                async for raw_message in websocket:
                    try:
                        data = json.loads(raw_message)
                    except (json.JSONDecodeError, TypeError):
                        continue

                    if not isinstance(data, dict):
                        continue

                    command = data.get("type")

                    if command == "fanSpeed":
                        controller.apply_speed(
                            data.get("value", 0)
                        )

                    elif command == "stop":
                        controller.stop()

            except websockets.exceptions.ConnectionClosed:
                pass

            finally:
                controller.stop()
                active_client = None
                print("Browser disconnected. Feedback reset.")

        async with websockets.serve(
            handle_client,
            HOST,
            PORT
        ):
            print(f"Bridge ready: ws://{HOST}:{PORT}")
            print("Open the React page and press R2.")
            print("Press Ctrl+C to stop.")

            await asyncio.Future()

    finally:
        controller.close()
        print("DualSense feedback disabled and device closed.")


if __name__ == "__main__":
    try:
        asyncio.run(main())

    except KeyboardInterrupt:
        print("Stopped by user.")

    except OSError as exc:
        print(f"Device or HIDAPI error: {exc}")
        print(
            "If HIDAPI is missing, place x64 hidapi.dll "
            "beside controller_bridge.py."
        )
        sys.exit(1)

    except Exception as exc:
        print(f"Cannot start controller bridge: {exc}")
        sys.exit(1)
