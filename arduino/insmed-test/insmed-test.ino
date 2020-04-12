

int cont = 0;

void setup()
{
  // put your setup code here, to run once:
  Serial.begin(9600);
  Serial1.begin(9600);

  Serial1.println("AT+RESTART");
}

unsigned long sinTimer = 0;
float sinRes = 0;

int amp = 1;
String inputString;
bool startBT = LOW;

bool handShaked = LOW;

unsigned long beatTimer = 0;

void loop()
{
  if (handShaked && (millis() - sinTimer) > 100)
  {
    sinTimer = millis();

    cont = cont + 10;
    sinRes = sin(DEG_TO_RAD * cont) * amp;

    Serial.print('t');
    Serial.print(sinTimer);
    Serial.print('p');
    Serial.print(sinRes);
    Serial.print(';');

    Serial1.print('t');
    Serial1.print(sinTimer);
    Serial1.print('p');
    Serial1.print(sinRes);
    Serial1.print(';');
  }

  if (handShaked && (millis() - beatTimer) > 10 * 1000)
  {
    Serial1.println("AT+RESTART");
    Serial.println("");
    Serial.println("BLE restarted");
    Serial.println("");

    handShaked = LOW;
  }

  if (Serial1.available())
  {
    char inChar = Serial1.read();
    Serial.write(inChar);

    if (inChar == 'h')
    {
      handShaked = HIGH;
      beatTimer = millis();

      Serial.println("handshaked");
    }

    if (inChar == 'a')
      startBT = HIGH;

    if (startBT && inChar != 'a' && inChar != 'h' && inChar != 'b' && inChar != 'c' && inChar != ';')
      inputString += inChar;

    if (inChar == ';')
    {
      amp = inputString.toInt();
      inputString = "";
      startBT = LOW;
    }
  }
}
