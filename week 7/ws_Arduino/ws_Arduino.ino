// Number Adder device: five buttons work the Number Adder on screen,
// and the LED matrix shows the total.
#include <ArduinoHttpClient.h>
#include <WiFiS3.h>
#include "Arduino_LED_Matrix.h"
#include "arduino_secrets.h"

char ssid[] = SECRET_SSID;
char pass[] = SECRET_PASS;
char serverAddress[] = "10.50.2.179";  // change to the IP your server printed
int port = 8080;

WiFiClient wifi;
WebSocketClient client = WebSocketClient(wifi, serverAddress, port);
ArduinoLEDMatrix matrix;
uint8_t frame[8][12];

// Same order as the buttons on screen, left to right
const int buttonPins[5] = {2, 3, 4, 5, 6};
const char* buttonNames[5] = {"-2", "-1", "reset", "+1", "+2"};
int lastStates[5] = {HIGH, HIGH, HIGH, HIGH, HIGH};

int total = 0;

void setup() {
  Serial.begin(9600);
  matrix.begin();
  for (int i = 0; i < 5; i++) {
    pinMode(buttonPins[i], INPUT_PULLUP);  // HIGH when released, LOW when pressed
  }

  while (WiFi.begin(ssid, pass) != WL_CONNECTED) {
    Serial.println("Connecting to WiFi...");
    delay(1000);
  }
  delay(2000);  // give the board time to get its IP address
  Serial.print("WiFi connected. Arduino IP: ");
  Serial.println(WiFi.localIP());
  client.begin();
}

void loop() {
  // Keep the connection to the server open
  if (!client.connected()) {
    Serial.println("Connecting to server...");
    client.begin();
    delay(1000);
    return;
  }

  // Screen -> device: the React app sends "TOTAL:5"
  if (client.parseMessage() > 0) {
    String message = client.readString();
    Serial.println("Received: " + message);
    if (message.startsWith("TOTAL:")) {
      total = message.substring(6).toInt();
      showTotal();
    }
  }

  // Device -> screen: one message per press, per button
  for (int i = 0; i < 5; i++) {
    int state = digitalRead(buttonPins[i]);
    if (state == LOW && lastStates[i] == HIGH) {
      sendButton(buttonNames[i]);
      delay(50);  // ignore switch bounce
    }
    lastStates[i] = state;
  }
}

// Sends {"button": "+1"} and so on
void sendButton(const char* name) {
  client.beginMessage(TYPE_TEXT);
  client.print("{\"button\": \"");
  client.print(name);
  client.print("\"}");
  client.endMessage();
  Serial.print("Sent: ");
  Serial.println(name);
}

// One LED per point: positive totals fill from the start of the matrix,
// negative totals fill backwards from the end
void showTotal() {
  memset(frame, 0, sizeof(frame));
  int count = min(abs(total), 96);
  for (int i = 0; i < count; i++) {
    int led = (total >= 0) ? i : 95 - i;
    frame[led / 12][led % 12] = 1;
  }
  matrix.renderBitmap(frame, 8, 12);
}