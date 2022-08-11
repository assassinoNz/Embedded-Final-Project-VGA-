#include <avr/io.h>
#include <avr/interrupt.h>
#include <avr/pgmspace.h>

#include <bitmap_800x600@60.h>

unsigned char rowItr;

ISR(TIMER0_OVF_vect) {
    //CASE: Painting of a new line started
    
    //NOTE: 3.2us are available before the compare interrupt occurs
    UCSR0B = 0;//Turn USART transmitter off

    //WARNING: Following line is responsible for the leftmost blank column
    UDR0 = 0; //Clear transmission buffer

    /*NOTE:
    currentVisibleScanLineIndex = currentScanLineIndex - nonVisibleScanLines
    So,
    currentVisibleScanLineIndex = TCNT1 - 27

    rowIter increments once per every 2 scan lines
    */
    rowItr = (TCNT1-27)>>1; //Pre-calculate row iterator for current visible scan line
}

ISR(TIMER0_COMPB_vect) {
    //CASE: Non-sync region of the currently painting line started
    UCSR0B = (1<<TXEN0); //Turn USART transmitter on

    UDR0 = pgm_read_byte(&bitmap[rowItr][0]);
    UDR0 = pgm_read_byte(&bitmap[rowItr][1]);
    asm volatile("nop\n\t");
    asm volatile("nop\n\t");
    asm volatile("nop\n\t");
    asm volatile("nop\n\t");
    asm volatile("nop\n\t");
    UDR0 = pgm_read_byte(&bitmap[rowItr][2]);
    UDR0 = pgm_read_byte(&bitmap[rowItr][3]);
    asm volatile("nop\n\t");
    asm volatile("nop\n\t");
    asm volatile("nop\n\t");
    asm volatile("nop\n\t");
    asm volatile("nop\n\t");
    UDR0 = pgm_read_byte(&bitmap[rowItr][4]);
    UDR0 = pgm_read_byte(&bitmap[rowItr][5]);
    asm volatile("nop\n\t");
    asm volatile("nop\n\t");
    asm volatile("nop\n\t");
    asm volatile("nop\n\t");
    asm volatile("nop\n\t");
    UDR0 = pgm_read_byte(&bitmap[rowItr][6]);
    UDR0 = pgm_read_byte(&bitmap[rowItr][7]);
    asm volatile("nop\n\t");
    asm volatile("nop\n\t");
    asm volatile("nop\n\t");
    asm volatile("nop\n\t");
    asm volatile("nop\n\t");
    UDR0 = pgm_read_byte(&bitmap[rowItr][8]);
    UDR0 = pgm_read_byte(&bitmap[rowItr][9]);
    asm volatile("nop\n\t");
    asm volatile("nop\n\t");
    asm volatile("nop\n\t");
    asm volatile("nop\n\t");
    asm volatile("nop\n\t");
    UDR0 = pgm_read_byte(&bitmap[rowItr][10]);
    UDR0 = pgm_read_byte(&bitmap[rowItr][11]);
    asm volatile("nop\n\t");
    asm volatile("nop\n\t");
    asm volatile("nop\n\t");
    asm volatile("nop\n\t");
    asm volatile("nop\n\t");
    UDR0 = pgm_read_byte(&bitmap[rowItr][12]);
    UDR0 = pgm_read_byte(&bitmap[rowItr][13]);
    asm volatile("nop\n\t");
    asm volatile("nop\n\t");
    asm volatile("nop\n\t");
    asm volatile("nop\n\t");
    asm volatile("nop\n\t");
    UDR0 = pgm_read_byte(&bitmap[rowItr][14]);
    UDR0 = pgm_read_byte(&bitmap[rowItr][15]);
    asm volatile("nop\n\t");
    asm volatile("nop\n\t");
    asm volatile("nop\n\t");
    asm volatile("nop\n\t");
    asm volatile("nop\n\t");
    UDR0 = pgm_read_byte(&bitmap[rowItr][16]);
    UDR0 = pgm_read_byte(&bitmap[rowItr][17]);
    asm volatile("nop\n\t");
    asm volatile("nop\n\t");
    asm volatile("nop\n\t");
    asm volatile("nop\n\t");
    asm volatile("nop\n\t");
    UDR0 = pgm_read_byte(&bitmap[rowItr][18]);
}

void setupHorizontalSignal() {
    //HORIZONTAL SIGNAL (counter0, clocked by system 16/8MHz clock)
    //====IO=========================
    DDRD |= (1<<PD5); //Set PD5/OC0B/T1/D5 as output

    //====TCCR0A,TCCR0B==============
    TCCR0B |= (1<<WGM02); TCCR0A |= (1<<WGM01) | (1<<WGM00); //Use mode: Fast PWM, reset when TCNT0=0CR0A
    TCCR0A |= (1<<COM0B1) | (1<<COM0B0); //Use mode: When in fast PWM, clear OC0B at 0, set OC0B when TCNT0=OCR0B (inverting mode)

    //====TCNT0,OCR0A,OCR0B==========
    /*NOTE:
    The counter0 has milestones 0-6(LOW), 6-53(HIGH)
    0-6.4 is the sync pulse (3.2us)
    6.4-10.8 is the back porch (2.2us)
    10.8-50.8 is the visible time (20us)
    50.8-52.8 is the front porch (1us)

    0-53 is the total (26.4us)
    */
    TCNT0 = 0; //Set the initial counter0 value
    OCR0B = (unsigned char) 6; //Set OC0B level change value for counter0
    OCR0A = (unsigned char) 53; //Set counter0 TOP value

    //====TIMSK0==============
    TIMSK0 |= (1<<TOIE0) | (1<<OCIE0B); //Enable counter0 overflow and compareB interrupts
}

void setupVerticalSignal() {
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
}

void setupUSART() {
    //====UBRR0======================
    /*NOTE:
    Baud Rate = 16MHz/(2*(1+UBRR0))
    */
    UBRR0 = 0; //Must be set to zero for maximum baud rate

    //====IO==========================
    DDRD |= (1<<PD4); //Set PD4/XCK/D4 as output

    //====UCSR0C======================
    UCSR0C |= (1<<UMSEL01) | (1<<UMSEL00); //Use mode: Master SPI (MSPIM)
    UCSR0C |= (1<<UCPHA0) | (1<<UCPOL0);
    UCSR0C &= ~(1<<UDORD0); //MSB first transfer mode
}

int main(void) {
    //====SIGNALS=====================
    setupHorizontalSignal();
    setupVerticalSignal();
    setupUSART();
    
    //====INTERRUPTS==================
    sei(); //Enable global interrupts

    //COUNTER INITIALIZATION
    TCCR0B |= (1<<CS01); //Start counter0 with a pre-scaler of 8
    TCCR1B |= (1<<CS12) | (1<<CS11); //Start counter1 with NGT clock on PD5/OC0B/T1/D5 (Output of counter0)
    
    while (1) {
        
    }
}