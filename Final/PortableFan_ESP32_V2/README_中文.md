# Portable Fan — ESP32-S3-Touch-AMOLED-1.8 V2 固件（第一阶段）

## 目标与当前完成情况

这是一个 **ESP-IDF 5.5.x + LVGL 9 + Waveshare BSP 2.0.3** 示例项目。已将用户提供的 240×240 原版 SVG 栅格化为原尺寸 RGB565 像素素材，放在 Waveshare 1.8 英寸 AMOLED **368×448** 屏幕中央，不做缩放或插值。

- 屏幕左上角：`(368 - 240)/2 = 64`, `(448 - 240)/2 = 104`
- 背景：黑色；中央：保留原始黄绿色 240×240 UI
- 顶部状态：READY / RUN / LOW BATTERY
- 左侧模式：ECO / NORMAL / BOOST；不再用旧的线性开度数值作操作输入
- 电池数字：原用户 SVG 80×140 像素数字、00–99；初始未测到电池不会假装显示 99
- 电量条：跟随 ADC 电量估算百分比填充
- 风扇：4 / 6 / 8 辐条，用软件每 125ms 重画
- 软件 8 FPS 刷新 UI，不是显示控制器的硬件刷新率限制

**注意：这是独立 ESP-IDF 固件，不是把网页 React JS 直接运行到 ESP32 上。** React 用于网页/3D 展示；实体屏幕用本地 C / LVGL 输出一致的基础图形和交互。为了保留原始像素，`main/ui_base.h` 与 `main/battery_digits.h` 分别从你上传的两个 SVG 自动生成，不能随意删除。

## 文件结构

```
PortableFan_ESP32_V2/
├── CMakeLists.txt
├── sdkconfig.defaults
├── main/
│   ├── CMakeLists.txt
│   ├── idf_component.yml
│   ├── fan_board_config.h      # GPIO / 电阻 / 时序参数
│   ├── main.c                  # UI + GPIO + ADC + PWM hook
│   ├── ui_base.h               # 来自原 240x240 SVG
│   └── battery_digits.h        # 来自原 0..9 SVG
├── screen_native_368x448.png  # 画面布置预览，非固件必需
└── README_中文.md
```

## 实体按钮交互（**只有两枚**）

A：
- 长按至少 `850 ms`：切换软件开机 / 关机。
- 短按后 **松开**：仅循环 `ECO ↔ NORMAL`。
- 长按已触发后松开，不会再额外切换挡位。

B：
- 只在开机时有效。
- 按住：**临时 BOOST**，不修改基础挡位。
- 松开：**立即**回到按下前的 ECO/NORMAL。

关机时屏幕画面纯黑、PWM 输出 0，但 **ESP32 开发板依然供电**，并未从 PMU 上切断整板电源。要做真正的硬件断电，需要另设计电源锁存/PMU 唤醒电路。

`ECO/NORMAL/BOOST` 当前示例 PWM 占空比为 `28% / 58% / 95%`，只是演示曲线，必须以你的真实风扇控制器适配为准。

## 先核对 GPIO（必须）

工程 `main/fan_board_config.h` 内的 GPIO17 / GPIO18 是**演示用的待确认候选脚位，不是已验证的 V2 排针脚**；请先核对该开发板背面型号和 Waveshare 原理图、焊盘，确保可用且不和显示、IMU、中断等功能冲突。按钮接法：

```
GPIO_A --- 按钮 A --- GND
GPIO_B --- 按钮 B --- GND
```

示例启用 GPIO 内部上拉；长导线或电机环境建议增加外部约 10kΩ 上拉、良好地线和硬件滤波。不要用 `PWR` 引脚作为普通 GPIO，不要盲接 `BOOT/GPIO0`。

## 2S 电池电压 ADC 接线

你之前决定保留 **2S 圆柱电池组 + 原配 BMS + 原配 USB-C 充电板**。以下示例只接 BMS 的**受保护输出 P+ / P-** 来测总电压，不碰 BM 中点，也不接电芯裸端。

```text
           2S 7.4 V nominal / 8.4 V full
              (原配 BMS P+)
                    |
                 [220 kΩ]   R_TOP
                    |
                    +-------------------- GPIO1 / ADC1_CH0 (待确认可用的焊盘)
                    |
                  [82 kΩ]  R_BOTTOM
                    |
        (原配 BMS P-) +-------------------- ESP32 GND

GPIO1 / ADC node --- [100 nF ceramic] --- ESP32 GND
```

当电池满电 8.4 V 时：

`V_ADC = 8.4 × 82 / (220 + 82) ≈ 2.28 V`。

**绝不允许 2S 电池正极直接连接到 GPIO，也不要连接到 Waveshare 板载单节 3.7 V 锂电接口（MX1.25）。** Waveshare 板上 AXP2101 电源/充电结构不是 2S 的 BMS/充电器。

GPIO1 同时可能被板载 TF/microSD 卡线路使用：**此方案不启用 SDMMC**，且要确认实际 GPIO1 焊盘的可用性；若有冲突，必须更改到真正可用的 ADC1 输入 GPIO，并同步调整 `FAN_BAT_ADC_CHANNEL`（不能简单把通道号改成 GPIO 号）。

测试时建议先使用可调低压直流稳压电源模拟 2S 电压，经分压网络检查 ADC 节点实际电压，再接电池。使用 USB 单独为 ESP32 供电测量时，必须先确认地线共地连接与充电板供电拓扑的兼容性，避免短路或经 USB 形成意外回路。

ADC 会每 1.5 秒进行 16 次采样取平均、使用 ESP-IDF ADC 曲线校准，并进行指数滤波。电量表是一个**2S 锂离子电池的静置开路电压估计表**，并非 BMS 的真实剩余容量信息。大电流运转时电压下垂、充电中电压升高、不同电芯型号都会影响百分比。后续必须通过实际电池做静置/负载标定；不要把这一电压估算当成安全保护或欠压切断的唯一依据。

## 电机驱动接口

`FAN_MOTOR_PWM_GPIO = -1`：**默认完全关闭物理 PWM 输出**。ESP32 串口会打印开关机、基础挡位、BOOST 状态、逻辑占空比，OLED 会跟随显示。

因为你之前展示过高速电机与驱动板的 PWM 正/负两针，但没有验证接口电平、参考地、隔离、启停控制要求，所以不能安全地直接把 ESP32 GPIO 接到驱动板 PWM，更不能直接把高速电机接到 ESP32。

如果以后选用已确认 **3.3V CMOS PWM 输入**的低压驱动器，并确认电源电压/使能方式/共地要求，再指定安全 GPIO（`FAN_MOTOR_PWM_GPIO`），该程序才能输出 20 kHz PWM。实际电机也可能要求其他频率、电平或信号类型，这段驱动钩子并不保证兼容原板。

## 编译与烧录

你已经在 Windows / VS Code 里安装 ESP-IDF v5.5.6，并使用过 COM5。先用 Waveshare 官方 `00_bsp_quickstart` 测通显示，再单独打开本工程根目录。

ESP-IDF PowerShell 环境内运行：

```powershell
idf.py set-target esp32s3
idf.py build
idf.py -p COM5 flash monitor
```

`COM5` 是之前记录的端口，实际以 Windows 设备管理器为准。

官方 BSP 依赖 `waveshare/esp32_s3_touch_amoled_1_8 ^2.0.3` 会在第一次编译时由组件管理器下载。若你已有 `00_bsp_quickstart` 的完整板卡项目配置，亦可将本工程 `main` 内容合并进去以复用其经过验证的 `sdkconfig.defaults` 和屏幕驱动初始化。

**本工程是初始硬件移植版，没有在当前环境用 ESP-IDF 编译器或真实屏幕、真实 2S 电池测试过。** 如发现驱动 API 版本差异，优先以你本地 `managed_components` 的 BSP 头文件和官方示例为准。

## 验证步骤

1. 暂时不接电池、电机，只接确认可用的两枚按钮；上电后屏幕应黑。
2. 长按 A，出现 240×240 原尺寸居中的黄绿色 UI；电量未连接时显示 `--` 而不是 99。
3. 短按 A 松开，ECO / NORMAL 交替；B 按住为 BOOST，松开应立即恢复。
4. 用稳压源+分压器模拟 6.0–8.4 V，检查串口输出的电压及电量数字。
5. A 再长按，屏幕黑、逻辑 PWM 输出归零。
6. 完成确认之后再逐步接入经过验证的真实 motor driver。

## 最重要的硬件限制

- 单节电池口仅适用于指定规格的单节电池，**不允许直接接 2S 7.4/8.4V**。
- ESP32-S3 GPIO ADC 电压必须经分压，避免超过 ADC/芯片允许输入。
- BMS 是保护板，不一定具有完整的 2S 充电控制和均衡功能。只继续使用经过确认兼容的原配充电器/保护板。
- 仅从保护后的电池总输出测量，不从 B−/BM/B+ 上随意引线到 ESP32。
