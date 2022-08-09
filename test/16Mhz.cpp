#include <avr/io.h>
#include <avr/interrupt.h>

int main(void) {
    //HORIZONTAL SIGNAL (counter0, clocked by system 16/8MHz clock)
    //====IO=========================
    DDRD |= (1<<PD5); //Set PD5/OC0B/D5 as output

    //====TCCR0A,TCCR0B==============
    TCCR0B |= (1<<WGM02); TCCR0A |= (1<<WGM01) | (1<<WGM00); //Use mode: Fast PWM, reset when TCNT0=0CR0A
    TCCR0A |= (1<<COM0B1) | (1<<COM0B0); //Use mode: When in fast PWM, clear OC0B at 0, set OC0B when TCNT0=OCR0B (inverting mode)

    //====TCNT0,OCR0A,OCR0B==========
    /*NOTE:
    The counter0 has milestones 0-6(LOW), 6-53(HIGH)
    0-6 is the sync pulse (3.2us)
    6-?? is the back porch (2.2us)
    ??-?? is the visible time (20us)
    ??-53 is the front porch (1us)

    0-53 is the total (26.4us)
    */
    TCNT0 = 0; //Set the initial counter0 value
    OCR0B = (unsigned char) 6; //Set OC0B level change value for counter0
    OCR0A = (unsigned char) 53; //Set TOP value for counter0

    //VERTICAL SIGNAL (counter1, clocked by counter0 on T1/PD5/C0B)
    //====IO=========================
    DDRB |= (1<<PB1); //Set PB1/OC1A/D9 as output

    //====TCCR1A,TCCR1B==============
    TCCR1B |= (1<<WGM13) | (1<<WGM12); TCCR1A |= (1<<WGM11); //Use mode: Fast PWM, clear counter when TCNT1=ICR1
    TCCR1A |= (1<<COM1A1) | (1<<COM1A0); //Use mode: When in fast PWM, clear OC1A at 0, set OC1A when TCNT1=OCR1A (inverting mode)

    //====TCNT1,ICR1,OCR1A===========
    /*NOTE:
    The counter1 has milestones 0-4(LOW), 4-628(HIGH)
    0-4 is the sync pulse (0.1056ms)
    4-?? is the back porch (0.6072ms)
    ??-?? is the visible time (15.84ms)
    ??-628 is the front porch (0.0264ms)

    0-628 is the total (16.5792ms)
    */
    TCNT1 = 0; //Set the initial counter1 value
    OCR1A = (unsigned short) 4; //Set OC1A level change value for counter1
    ICR1 = (unsigned short) 628; //Set TOP value for counter1

    //COUNTER INITIALIZATION
    TCCR0B |= (1<<CS01); //Start counter0 with a pre-scaler of 8
    TCCR1B |= (1<<CS12) | (1<<CS11); //Start counter1 with NGT clock on PD5/OC0B/T1 (This clock counts 1 tick per a cycle of counter0)
    
    while (1) {
        
    }
}