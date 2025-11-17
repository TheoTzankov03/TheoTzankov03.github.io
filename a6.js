// SERIAL STATE
let port;            // Serial port
let reader;          // Reader for incoming serial data
let decoder = new TextDecoder();
let buffer = "";     // Holds incoming partial lines

// ARDUINO INPUTS
let joyX = 512;      // Joystick X (0–1023)
let joyY = 512;      // Joystick Y (0–1023)
let btn  = 0;        // Button state: 1 pressed, 0 not

// ARDUINO OUTPUT (LED CONTROL)
let ledValue = 0;    // PWM 0–255

// CANVAS SETUP (a6.js)
function setup() {
  createCanvas(500, 400);
  textSize(16);

  // Connect Arduino
  document.getElementById("connect").addEventListener("click", connectSerial);
}


// DRAW LOOP
function draw() {

  background(230);

  // Display Arduino values
  fill(0);
  text(`X: ${joyX}  Y: ${joyY}  Button: ${btn}`, 10, 25);
  text(`LED PWM: ${ledValue}`, 10, 50);

  // Convert joystick to ball position
  let x = map(joyX, 0, 1023, 0, width);
  let y = map(joyY, 0, 1023, 80, height);

  // Button pressed = red ball
  fill(btn ? "red" : "dodgerblue");

  // ball
  circle(x, y, 40);

  // Mouse drag controls LED brightness
  if (mouseIsPressed) {
    ledValue = round(map(mouseX, 0, width, 0, 255));
    sendToArduino("L" + ledValue);
  }
}
// KEYBOARD INPUT - ARDUINO COMMANDS
function keyPressed() {

  if (key === "b" || key === "B") sendToArduino("B"); // Blink LED
  if (key === "r" || key === "R") {                   // Reset LED
    sendToArduino("R");
    ledValue = 0;
  }
}

// CONNECT TO ARDUINO USING WEB SERIAL
async function connectSerial() {

  port = await navigator.serial.requestPort();
  await port.open({ baudRate: 9600 });

  reader = port.readable.getReader();

  readLoop(); // Begin reading
}

// READ DATA FROM ARDUINO FOREVER
async function readLoop() {
  while (port.readable) {
    const { value, done } = await reader.read();
    if (done) {
      reader.releaseLock();
      break;
    }

    // Decode incoming bytes into text
    const text = decoder.decode(value);
    buffer += text;

    // Split buffer into complete lines
    let lines = buffer.split("\n");
    buffer = lines.pop(); // save incomplete line

    // Process each full line
    for (let line of lines) {
      let parts = line.trim().split(",");
      if (parts.length === 3) {
        joyX = int(parts[0]);
        joyY = int(parts[1]);
        btn  = int(parts[2]);
      }
    }
  }
}

// SEND ANY MESSAGE TO ARDUINO
async function sendToArduino(msg) {
  if (!port || !port.writable) return;

  let writer = port.writable.getWriter();
  await writer.write(new TextEncoder().encode(msg + "\n"));
  writer.releaseLock();
}