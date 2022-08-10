#include <avr/io.h>
#include <avr/interrupt.h>

int main(void) {
    //HORIZONTAL SIGNAL (counter0, clocked by external 5MHz clock on PD4/T0/D4)
    //====IO=========================
    DDRD &= ~(1<<PD4); //Set PD4/T0/D4 as input
    DDRD |= (1<<PD5); //Set PD5/OC0B/T1/D5 as output

    //====TCCR0A,TCCR0B==============
    TCCR0B |= (1<<WGM02); TCCR0A |= (1<<WGM01) | (1<<WGM00); //Use mode: Fast PWM, reset when TCNT0=0CR0A
    TCCR0A |= (1<<COM0B1) | (1<<COM0B0); //Use mode: When in fast PWM, clear OC0B at 0, set OC0B when TCNT0=OCR0B (inverting mode)

    //====TCNT0,OCR0A,OCR0B==========
    /*NOTE:
    The counter0 has milestones 0-16(LOW), 16-132(HIGH)
    0-16 is the sync pulse (3.2us)
    16-27 is the back porch (2.2us)
    27-127 is the visible time (20us)
    127-132 is the front porch (1us)

    0-132 is the total (26.4us)
    */
    TCNT0 = 0; //Set the initial counter0 value
    OCR0B = (unsigned char) 15; //Set OC0B level change value for counter0
    OCR0A = (unsigned char) 131; //Set counter0 TOP value

    //VERTICAL SIGNAL (counter1, clocked by counter0's output on PD5/OC0B/T1/D5)
    //====IO=========================
    DDRB |= (1<<PB2); //Set PB2/OC1B/D10 as output

    //====TCCR1A,TCCR1B==============
    TCCR1B |= (1<<WGM13) | (1<<WGM12); TCCR1A |= (1<<WGM11) | (1<<WGM10); //Use mode: Fast PWM, clear counter when TCNT1=OCR1A
    TCCR1A |= (1<<COM1B1) | (1<<COM1B0); //Use mode: When in fast PWM, clear OC1B at 0, set OC1B when TCNT1=OCR1B (inverting mode)

    //====TCNT1,OCR1A,OCR1B==========
    /*NOTE:
    The counter1 has milestones 0-4(LOW), 4-628(HIGH)
    0-4 is the sync pulse (0.1056ms)
    4-27 is the back porch (0.6072ms)
    27-627 is the visible time (15.84ms)
    627-628 is the front porch (0.0264ms)

    0-628 is the total (16.5792ms)
    */
    TCNT1 = 0; //Set the initial counter1 value
    OCR1B = (unsigned short) 3; //Set OC1B level change value for counter1
    OCR1A = (unsigned short) 627; //Set counter1 TOP

    //DATA SIGNAL
    //====IO=========================
    DDRC = 0b111111; //Set PC0:5/A0:5 as output
    PORTC = 0; //Initially output black from PORTC

    //COUNTER INITIALIZATION
    TCCR0B |= (1<<CS02) | (1<<CS01); //Start counter0 with NGT clock on PD4/T0/D4
    TCCR1B |= (1<<CS12) | (1<<CS11); //Start counter1 with NGT clock on PD5/OC0B/T1/D5 (Output of counter0)
    
    while (1) {
        
    }
}