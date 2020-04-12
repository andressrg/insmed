#include <SoftwareSerial.h>

SoftwareSerial BT(5, 6);

int cont;
String inputString;
bool startBT = LOW;

int P1, P2, P3;

void setup()
{
  Serial.begin(115200);
  BT.begin(9600);
}

void loop()
{
  if (Serial.available())
  {

    char inChar = Serial.read();

    if (inChar == 'a')
      startBT = HIGH;

    if (startBT && inChar != 'a' && inChar != 'b' && inChar != 'c' && inChar != ';')
      inputString += inChar;

    if (inChar == 'b')
    {
      P1 = inputString.toInt();
      inputString = "";
    }

    if (inChar == 'c')
    {
      P2 = inputString.toInt();
      inputString = "";
    }

    if (inChar == ';')
    {
      P3 = inputString.toInt();
      inputString = "";
      startBT = LOW;
      Serial.print("P1: ");
      Serial.print(P1);
      Serial.print("    P2: ");
      Serial.print(P2);
      Serial.print("    P3: ");
      Serial.println(P3);
    }
  }
}
