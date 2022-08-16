class Monochromer {
    static lastObjectURL: string | null;

    static midPointInput: HTMLInputElement;
    static buttonContainer: HTMLDivElement;
    static fileInput: HTMLInputElement;
    static img: HTMLImageElement;
    static canvas: HTMLCanvasElement;
    static ctx: CanvasRenderingContext2D;

    static hRes: number;
    static vRes: number;
    static canvasRect: DOMRect;
    static handlers = {
        pointerMoveCanvas: Monochromer.pointerMoveCanvas.bind(Monochromer)
    };

    static {
        Monochromer.midPointInput = document.getElementById("midPointInput") as HTMLInputElement;
        Monochromer.buttonContainer = document.getElementById("buttonContainer") as HTMLDivElement;
        Monochromer.fileInput = Monochromer.buttonContainer.children[0].firstElementChild as HTMLInputElement;
        Monochromer.img = Monochromer.buttonContainer.children[0].children[1] as HTMLImageElement;
        Monochromer.canvas = document.querySelector("canvas") as HTMLCanvasElement;
        Monochromer.ctx = Monochromer.canvas.getContext("2d") as CanvasRenderingContext2D;

        Monochromer.hRes = parseInt(Monochromer.canvas.dataset.hRes!);
        Monochromer.vRes = parseInt(Monochromer.canvas.dataset.vRes!);
    }

    static init() {
        //Clear canvas
        Monochromer.ctx.fillStyle = "black";
        Monochromer.ctx.fillRect(0, 0, Monochromer.canvas.width, Monochromer.canvas.height);

        //Add onmousedown and onmouseup to canvas
        Monochromer.canvas.addEventListener("mousedown", Monochromer.pointerDownCanvas);
        Monochromer.canvas.addEventListener("mouseup", Monochromer.pointerUpCanvas);

        //Add onclick to upload file button
        Monochromer.buttonContainer.children[0].addEventListener("click", () => Monochromer.fileInput.click());

        //Add onload to img
        Monochromer.img.addEventListener("load", () => {
            Monochromer.loadImageOnCanvas();

            //Auto calculate a suitable mid point
            //NOTE: midpoint = (sum of pixelRGBAverage)/pixelCount

            const frameBuffer = Monochromer.ctx.getImageData(0, 0, Monochromer.canvas.width, Monochromer.canvas.height);
            let rgbAverageSum = 0;
            for (let pixel = 0; pixel < frameBuffer.data.length; pixel += 4) {
                const rgbAverage = (frameBuffer.data[pixel] + frameBuffer.data[pixel + 1] + frameBuffer.data[pixel + 2]) / 3;
                rgbAverageSum += rgbAverage;
            }

            Monochromer.midPointInput.value = (rgbAverageSum / (frameBuffer.data.length / 4)).toString();

            //Immediately preview effects
            Monochromer.applyEffects();
        });

        //Add onchange to upload file input
        Monochromer.fileInput.addEventListener("change", Monochromer.changeUploadedImage);

        //Add onchange to midpoint input
        Monochromer.midPointInput.addEventListener("change", () => {
            Monochromer.loadImageOnCanvas();
            Monochromer.applyEffects();
        });

        //Add onclick to export button
        Monochromer.buttonContainer.children[2].addEventListener("click", Monochromer.generateCode);
    }

    static loadImageOnCanvas() {
        //Clear canvas
        Monochromer.ctx.fillStyle = "black";
        Monochromer.ctx.fillRect(0, 0, Monochromer.canvas.width, Monochromer.canvas.height);

        const imgScaledWidth = (Monochromer.img.width * Monochromer.canvas.height) / Monochromer.img.height;
        Monochromer.ctx.drawImage(Monochromer.img, (Monochromer.canvas.width - imgScaledWidth * 0.7) / 2, 0, imgScaledWidth * 0.7, Monochromer.canvas.height);
    }

    static changeUploadedImage() {
        if (Monochromer.fileInput.files) {
            if (Monochromer.lastObjectURL) {
                URL.revokeObjectURL(Monochromer.lastObjectURL);
            }
            Monochromer.lastObjectURL = URL.createObjectURL(Monochromer.fileInput.files[0]);
            Monochromer.img.src = Monochromer.lastObjectURL as string;
        }
    }

    static applyEffects() {
        const frameBuffer = Monochromer.ctx.getImageData(0, 0, Monochromer.canvas.width, Monochromer.canvas.height);

        //Determine the black/white-ness based on mid point for each pixel
        for (let pixel = 0; pixel < frameBuffer.data.length; pixel += 4) {
            const rgbAverage = (frameBuffer.data[pixel] + frameBuffer.data[pixel + 1] + frameBuffer.data[pixel + 2]) / 3;
            if (rgbAverage > parseInt(Monochromer.midPointInput.value)) {
                frameBuffer.data[pixel] = 255;
                frameBuffer.data[pixel + 1] = 255;
                frameBuffer.data[pixel + 2] = 255;
            } else {
                frameBuffer.data[pixel] = 0;
                frameBuffer.data[pixel + 1] = 0;
                frameBuffer.data[pixel + 2] = 0;
            }
            frameBuffer.data[pixel + 3] = 255; //No transparency
        }
        Monochromer.ctx.putImageData(frameBuffer, 0, 0); //Update canvas
    }

    static generateCode() {
        //Initial parts of the code
        let frameBufferArr = 
`<pre>
/**Auto generated by Monochromer. No to be edited by hand**/

//CONDITIONAL COMPILATION DEFINITIONS
#define RESOLUTION_${Monochromer.hRes}x${Monochromer.vRes}
#define PALETTE_1BIT

const unsigned short hPixels = ${Monochromer.hRes}; //Number of horizontal pixels in the targeted VGA mode
const unsigned short vPixels = ${Monochromer.vRes}; //Number of vertical pixels in the targeted VGA mode
const unsigned char cols = ${Monochromer.canvas.width/8}; //Number of columns/bytes horizontally supported by the current display mode
const unsigned char rows = ${Monochromer.canvas.height}; //Number of rows vertically supported by the current display mode

//NOTE: The following frame buffer maps directly to the frame buffer displayed
const unsigned char frameBuffer[rows][cols] PROGMEM = {\n`;

        const frameBuffer = Monochromer.ctx.getImageData(0, 0, Monochromer.canvas.width, Monochromer.canvas.height);

        for (let row = 0; row < frameBuffer.height; row++) {
            let rowArr = "    {"; //Start a new array for current row

            for (let col = 0; col < frameBuffer.width; col += 8) {
                let arrElementBin = ""; //Start a new 8bit binary string for current column

                for (let bit = col; bit < col + 8; bit++) {
                    //Calculate Channel0=R index for current pixel
                    const r = row * (frameBuffer.width * 4) + bit * 4;

                    if (bit === 191) {
                        //CASE: Currently processing the last bit of the line
                        //NOTE: In USART based code, ther will be a 1 pixel wide HIGH band in the left side of the frame. To balance that ugliness, we manually add a 1 pixel wide HIGH band at the end also.
                        //Make that bit high. No matter the actual value
                        arrElementBin += "1";
                    } else {
                        //CASE: Currently processing a bit other than the last bit
                        //NOTE: By now every R,G,B byte of the current pixel is either 255 or 0
                        //NOTE: So checking only the R byte is enough
                        if (frameBuffer.data[r] === 0) {
                            arrElementBin += "0";
                        } else if (frameBuffer.data[r] === 255) {
                            arrElementBin += "1";
                        }
                    }
                }

                const arrElementHex = parseInt(arrElementBin, 2).toString(16).toUpperCase(); //Parse the binary string as hex with uppercase
                rowArr += "0x" + (arrElementHex.length == 1 ? "0" + arrElementHex : arrElementHex) + ","; //Make the hex always 2 digit //Insert the hex byte as the next element in the rowStr array
            }

            frameBufferArr += rowArr.slice(0, -1) + "},\n"; //Remove the trailing comma in the last element //close the array
        }

        frameBufferArr = frameBufferArr.slice(0, -2) + "\n};</pre>"; //Remove the trailing comma in the last array //Close the multi dimensional array

        const newWindow = window.open() as Window;
        newWindow.document.body.innerHTML = frameBufferArr;
    }

    static pointerDownCanvas(event: MouseEvent) {
        Monochromer.canvasRect = Monochromer.canvas.getBoundingClientRect();

        if (event.ctrlKey) {
            Monochromer.ctx.strokeStyle = "black";
        } else {
            Monochromer.ctx.strokeStyle = "white";
        }
        Monochromer.ctx.lineWidth = 1;
        
        const mousePosX = event.clientX - Monochromer.canvasRect.left;
        const mousePosY = event.clientY - Monochromer.canvasRect.top;
        Monochromer.ctx.beginPath();
        Monochromer.ctx.moveTo(mousePosX/(Monochromer.hRes/Monochromer.canvas.width), mousePosY/(Monochromer.vRes/Monochromer.canvas.height));

        Monochromer.canvas.addEventListener("mousemove", Monochromer.pointerMoveCanvas);
    }

    static pointerMoveCanvas(event: MouseEvent) {
        const mousePosX = event.clientX - Monochromer.canvasRect.left;
        const mousePosY = event.clientY - Monochromer.canvasRect.top;
        Monochromer.ctx.lineTo(mousePosX/(Monochromer.hRes/Monochromer.canvas.width), mousePosY/(Monochromer.vRes/Monochromer.canvas.height));
        Monochromer.ctx.stroke();
    }

    static pointerUpCanvas() {
        Monochromer.canvas.removeEventListener("mousemove", Monochromer.pointerMoveCanvas);
    }
}

Monochromer.init();