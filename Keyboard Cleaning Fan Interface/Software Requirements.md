# Keyboard Cleaning Fan — Software Requirements

## Must Have

**1. Fan Speed Control**

As a user, when I change the fan speed, I expect the interface to show the selected speed level and update the fan rotation, so that I can clearly understand the current fan power.

**2. Fan Status**

As a user, when I turn the fan on or off, I expect the interface to switch between RUN and READY, so that I can immediately recognize whether the fan is operating.

**3. Battery Indicator**

As a user, when the battery level changes, I expect the interface to update the battery percentage and battery bar, so that I can monitor the remaining power.

**4. Fan Opening Angle**

As a user, when I adjust the fan opening angle, I expect the interface to display the angle in degrees and update the visual indicator, so that I can understand the airflow coverage.

**5. Pixel Number Animation**

As a user, when a numerical value changes, I expect the display to animate the transition using pixel-style numbers, so that the information updates smoothly while maintaining the pixel aesthetic.

## Nice to Have

**6. DualSense Adaptive Trigger Feedback**

As a user, when I control the fan using the DualSense triggers, I expect to feel adaptive resistance based on the fan settings, so that I can receive physical feedback while adjusting the fan.

**7. Charging and Low Battery Status**

As a user, when the fan is charging or the battery is low, I expect the interface to display CHARGING or LOW BATTERY, so that I can understand the battery condition.

## Dropped

**8. Real-Time RPM Display**

As a user, when the fan is running, I would expect the interface to show the exact motor RPM, so that I can monitor its performance.

**Reason for dropping:** Exact RPM measurement requires additional hardware feedback and is not essential for the basic interface.

**9. Frame-by-Frame Pixel Rotation Animation**

As a user, when the fan is running, I would expect the interface to display a frame-by-frame pixel animation to simulate its rotation.

**Reason for dropping:** The display has a sufficiently high refresh rate to show smooth rotation directly. Continuous rotation produces a clearer and more visually appealing effect than manually switching between pixel frames.
