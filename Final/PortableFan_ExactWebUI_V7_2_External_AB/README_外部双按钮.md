# PortableFan V7.2 — 两枚独立外部实体按钮 + 原驱动板 MOSFET 模拟按键

基于最终网页版 240×240 原始 Canvas UI 的 V7 工程，只修改实体按钮输入映射及串口日志。**不是把外部按钮直接接到原驱动板上**：A、B 都接 ESP32；ESP32 根据状态通过 GPIO18/Ceksezx 模拟原驱动板上的单一 KEY。

## 外部按钮接线（默认推荐）

| 功能 | ESP32 引脚 | 外部按钮另一端 | 备注 |
|---|---|---|---|
| Button A | GPIO42（IO42 焊盘） | ESP32 GND | **独立于板载 BOOT**。可能复用 I2S 音频时钟，本项目不能同时启用音频，需先确认实际 V2 焊盘 |
| Button B | GPIO16（IO16 焊盘） | ESP32 GND | 仅输入按键，程序不初始化板载音频 |
| 原驱动板按键模拟 | GPIO18 → 1kΩ → Ceksezx PWM | 模块控制 GND → ESP32 GND | 注意模块必须支持 3.3V PWM 输入，先验证与原板按键 GND/KEY 的兼容性 |
| 电池分压 ADC | GPIO17 | 100kΩ 上拉到 BMS P+，47kΩ 下拉到 BMS P− | 2S 电池电压估算；ADC、ESP 及 BMS 地线按已验证接线共地 |

- **外部 A 按钮：** 一端 IO42，另一端 ESP32 GND。
- **外部 B 按钮：** 一端 IO16，另一端 ESP32 GND。
- 两只按钮使用常开（NO）轻触开关，按下接地，松开通过 ESP32 内部上拉恢复 3.3V。**绝不能接原板 KEY 的 5V、2S 电池 P+、5V 电源。**
- 四脚按键同侧两脚可能本来就相通，务必用万用表通断档确认按下才导通的两端。
- IO42 在部分板卡与板载音频/I2S 主时钟复用；本固件没有启用音频，但**如实际 V2 硬件没有标注 IO42，先不要盲接**。可改为 `#define FAN_BUTTON_A_GPIO 0` 并接外部按钮到 GPIO0（等于并联 BOOT；按住启动可能进入烧录模式），或使用合适的 GPIO 扩展器。

## 按钮控制语义（固件现有）

- OFF 状态，A 短按：只亮屏，不启动电机；A 长按 800ms：启动，进入此前 ECO/NORMAL 基础档。
- ON 状态，A 短按：ECO ↔ NORMAL；A 长按：关机。
- ON 状态按住 B：目标 BOOST；松开 B：目标恢复 ECO/NORMAL。
- OFF 状态按 B：不启动电机。
- 任意 A/B 操作与屏幕触摸唤醒显示，连续 60 秒无操作显示亮度为 0；风扇状态不受息屏影响。

**硬件限制**：原驱动板仍只有 KEY 单按键接口；GPIO18 模拟短按来切换档位。因此 BOOST 只是软件目标立即切换，原电机可能在几次切档及稳定等待后才能达到目标；松开也可能延迟恢复，不能保证“立即”物理变速。

## MOSFET 测试安全开关

文件 `main/fan_board_config.h`：

```c
#define FAN_ENABLE_BUTTON_INPUT 1
#define FAN_ENABLE_MOSFET_KEY 0
```

默认值 `0` 是**安全软件测试模式**：A/B、屏幕、UI 可工作，GPIO18 不发真实按键脉冲。确认 Ceksezx 模块的 VIN/OUT 端子结构、单按钮 KEY 对 GND 的电位、模块控制端 3.3V 兼容和共地安全后，再改成 `1` 并重新烧录；在确认前不得带高速风机测试。

如尚未连接 ADC 电路，则将 `FAN_ENABLE_BATTERY_ADC` 设为 0，以便使用 99% 演示值，不必先接电池。不要将 7.4–8.4V 电池接到 Waveshare 的 3.7V 单节电池接口。

## 编译烧录

```powershell
$env:IDF_TARGET = "esp32s3"
idf.py set-target esp32s3
idf.py build
idf.py -p COM5 flash monitor
```

按下外部 A/B 后，串口监视器应出现：

```text
EXTERNAL BUTTONS: A GPIO42, B GPIO16; active LOW ...
Initial levels: A=1, B=1
EXTERNAL A GPIO42 -> PRESSED
EXTERNAL A GPIO42 -> RELEASED
EXTERNAL B GPIO16 -> PRESSED
EXTERNAL B GPIO16 -> RELEASED
```

如果一直没有 `PRESSED`：用万用表检查按钮按下时对应 GPIO 对 ESP32 GND 是否变成 0V，重点核对实际焊盘是不是 GPIO42/16。

## 版本说明

- 沿用之前用户已验证可用的 TCA9554 reset + Waveshare CO5300 BSP。
- 保留网页界面素材、240×240 画布、触摸唤醒、60 秒息屏、ADC、MOSFET 时序状态机。
- GPIO42 复用安全依赖实物与板卡修订版本；仍未在你的真实 V2 屏幕完成编译/验证。此文件在离线环境只进行了编译语法检查。
