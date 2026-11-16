idf_component_register(
    SRCS "main.c"
    INCLUDE_DIRS "."
    REQUIRES esp32_s3_touch_amoled_1_8 esp_driver_i2c esp_driver_gpio esp_driver_ledc esp_adc esp_timer)
target_compile_options(${COMPONENT_LIB} PRIVATE -Wno-error=shift-count-negative)

idf_component_get_property(LVGL_LIB lvgl__lvgl COMPONENT_LIB)
if(TARGET ${LVGL_LIB})
    target_compile_options(${LVGL_LIB} PRIVATE -Wno-error=attributes)
endif()
