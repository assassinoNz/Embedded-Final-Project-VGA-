//EXTERNAL DEPENDENCIES
#include <avr/io.h>
#include <avr/interrupt.h>
#include <avr/pgmspace.h>

//LOCAL DEPENDENCIES
#include <640x480/1bit/UoCLogo.h>

//LOCAL DEFINITIONS
#define nop5 asm volatile("nop\n\t");asm volatile("nop\n\t");asm volatile("nop\n\t");asm volatile("nop\n\t");asm volatile("nop\n\t")

//GLOBALS
unsigned char rowItr;

//INTERRUPT SERVICE ROUTINES
ISR(TIMER0_OVF_vect) {
    //CASE: Painting of a new line started
    
    //NOTE: Within the horizontal sync pulse, all R,G,B channels must be at 0V
    //Since we are disabling USART at the end of each line, no need to do it here

    /*NOTE:
    currentVisibleScanLineIndex = currentScanLineIndex - nonVisibleScanLines
    rowIter increments once per every 2**(vPixels/rows-1) scan lines
    */
    #ifdef RESOLUTION_800x600
        rowItr = (TCNT1-27)>>(vPixels/rows-1); //Pre-calculate row iterator for current visible scan line
    #endif
    #ifdef RESOLUTION_640x480
        rowItr = (TCNT1-35)>>(vPixels/rows-1); //Pre-calculate row iterator for current visible scan line
    #endif

    UDR0 = pgm_read_byte(&frameBuffer[rowItr][0]); //Pre-load the first column to transmission buffer
}

ISR(TIMER0_COMPB_vect) {
    //CASE: Non-sync region of the currently painting line started

    /*NOTE:
    USART protocol requires small HIGH(5V) time on the transmitter pin to establish connection.
    Therfore, enabling USART transmission on pin that is LOW(0V) may need to be made HIGH for a few microseconds for it to be ready.
    */
    //WARNING: Since we are enabling USART on a LOW pin, few starting pixels on each scan line will turn white
    //WARNING: Since we are enabling USART on a LOW pin, few starting pixels on each scan line will turn white
    UCSR0B = (1<<TXEN0); //Turn USART transmitter on

    //WARNING: Since we have preloaded the 0th index column, next column is at 1st index
    UDR0 = pgm_read_byte(&frameBuffer[rowItr][1]);
    UDR0 = pgm_read_byte(&frameBuffer[rowItr][2]);
    nop5;
    UDR0 = pgm_read_byte(&frameBuffer[rowItr][3]);
    UDR0 = pgm_read_byte(&frameBuffer[rowItr][4]);
    nop5;
    UDR0 = pgm_read_byte(&frameBuffer[rowItr][5]);
    UDR0 = pgm_read_byte(&frameBuffer[rowItr][6]);
    nop5;
    UDR0 = pgm_read_byte(&frameBuffer[rowItr][7]);
    UDR0 = pgm_read_byte(&frameBuffer[rowItr][8]);
    nop5;
    UDR0 = pgm_read_byte(&frameBuffer[rowItr][9]);
    UDR0 = pgm_read_byte(&frameBuffer[rowItr][10]);
    nop5;
    UDR0 = pgm_read_byte(&frameBuffer[rowItr][11]);
    UDR0 = pgm_read_byte(&frameBuffer[rowItr][12]);
    nop5;
    UDR0 = pgm_read_byte(&frameBuffer[rowItr][13]);
    UDR0 = pgm_read_byte(&frameBuffer[rowItr][14]);
    nop5;
    UDR0 = pgm_read_byte(&frameBuffer[rowItr][15]);
    UDR0 = pgm_read_byte(&frameBuffer[rowItr][16]);
    nop5;
    UDR0 = pgm_read_byte(&frameBuffer[rowItr][17]);
    UDR0 = pgm_read_byte(&frameBuffer[rowItr][18]);
    nop5;
    UDR0 = pgm_read_byte(&frameBuffer[rowItr][19]);

    #ifdef RESOLUTION_640x480
        UDR0 = pgm_read_byte(&frameBuffer[rowItr][20]);
        nop5;
        UDR0 = pgm_read_byte(&frameBuffer[rowItr][21]);
        UDR0 = pgm_read_byte(&frameBuffer[rowItr][22]);
        nop5;
        UDR0 = pgm_read_byte(&frameBuffer[rowItr][23]);
    #endif

    UCSR0B = 0; //Turn USART transmitter off to blank all R,G,B channels
}

//METHODS
void setupHorizontalSignal() {
    //HORIZONTAL SIGNAL (counter0, clocked by system 16/8MHz clock)
    //====IO=========================
    DDRD |= (1<<PD5); //Set PD5/OC0B/T1/D5 as output

    //====TCCR0A,TCCR0B==============
    TCCR0B |= (1<<WGM02); TCCR0A |= (1<<WGM01) | (1<<WGM00); //Use mode: Fast PWM, reset when TCNT0=0CR0A
    TCCR0A |= (1<<COM0B1) | (1<<COM0B0); //Use mode: When in fast PWM, clear OC0B at 0, set OC0B when TCNT0=OCR0B (inverting mode)

    //====TCNT0,OCR0A,OCR0B==========
    #ifdef RESOLUTION_800x600
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
    #endif
    #ifdef RESOLUTION_640x480
        /*NOTE:
        The counter0 has milestones 0-7.6(LOW), 7.6-63.55(HIGH)
        0-7.6 is the sync pulse (3.8133us)
        7.6-11.43 is the back porch (1.9066us)
        11.43-62.28 is the visible time (25.4220us)
        62.28-63.55 is the front porch (31.7775us)

        0-63.55 is the total (16.5792ms)
        */
        TCNT0 = 0; //Set the initial counter0 value
        OCR0B = (unsigned char) 7; //Set OC0B level change value for counter0
        OCR0A = (unsigned char) 63; //Set counter0 TOP value
    #endif

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
    #ifdef RESOLUTION_800x600
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
    #endif
    #ifdef RESOLUTION_640x480
        /*NOTE:
        The counter1 has milestones 0-2(LOW), 2-525(HIGH)
        0-2 is the sync pulse (0.0635ms)
        2-35 is the back porch (1.0486ms)
        35-515.70 is the visible time (15.2532ms)
        515-525 is the front porch (0.6355ms)

        0-525 is the total (16.5792ms)
        */
        TCNT1 = 0; //Set the initial counter1 value
        OCR1B = (unsigned short) 1; //Set OC1B level change value for counter1
        OCR1A = (unsigned short) 524; //Set counter1 TOP
    #endif
}

void setupUSART() {
    //====UBRR0=======================
    //NOTE: Baud Rate = 16MHz/(2*(1+UBRR0))
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