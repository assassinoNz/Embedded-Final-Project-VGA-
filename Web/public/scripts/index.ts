class FrameBuffer {
    private hPixelsPerByte: number;

    readonly hRes: number;
    readonly vRes: number;
    readonly hPixels: number;
    readonly vPixels: number;
    readonly ctx: CanvasRenderingContext2D;

    constructor(canvas: HTMLCanvasElement) {
        this.hPixelsPerByte = parseInt(canvas.dataset.hPixelsPerByte!);
        if (this.hPixelsPerByte === 1) {
            //CASE: Pallette is 8bit, output mode is PORT
            //So, the supported pixel grid is 57x120
            canvas.width = 57;
            canvas.height = 120;
        } else if (this.hPixelsPerByte === 8) {
            //CASE: Pallette is 1bit, output mode is USART
            //So, the supported pixel grid is 192x240
            canvas.width = 192;
            canvas.height = 240;
        }

        this.hPixels = canvas.width;
        this.vPixels = canvas.height;
        this.hRes = parseInt(canvas.dataset.hRes!);
        this.vRes = parseInt(canvas.dataset.vRes!);

        this.ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    }

    get outputMode() {
        if (this.hPixelsPerByte === 1) {
            return "PORT";
        } else if (this.hPixelsPerByte === 8) {
            return "USART";
        } else {
            return "UNKNOWN"
        }
    }

    get palletteBits() {
        if (this.hPixelsPerByte === 1) {
            return 8;
        } else if (this.hPixelsPerByte === 8) {
            return 1;
        } else {
            return -1
        }
    }

    get hBytes() {
        return this.hPixels / this.hPixelsPerByte;
    }

    get vBytes() {
        return this.vPixels;
    }

    get imageData(): ImageData {
        return this.ctx.getImageData(0, 0, this.hPixels, this.vPixels);
    }

    set imageData(frameBufferData: ImageData) {
        this.ctx.putImageData(frameBufferData, 0, 0);
    }
}

class Pixelator {
    static lastObjectURL: string | null;

    static midPointInput: HTMLInputElement;
    static buttonContainer: HTMLDivElement;
    static fileInput: HTMLInputElement;
    static img: HTMLImageElement;
    static canvas: HTMLCanvasElement;
    static frameBuffer: FrameBuffer;

    static canvasRect: DOMRect;
    static handlers = {
        pointerMoveCanvas: Pixelator.pointerMoveCanvas.bind(Pixelator)
    };

    static {
        Pixelator.midPointInput = document.getElementById("midPointInput") as HTMLInputElement;
        Pixelator.buttonContainer = document.getElementById("buttonContainer") as HTMLDivElement;
        Pixelator.fileInput = Pixelator.buttonContainer.children[0].firstElementChild as HTMLInputElement;
        Pixelator.img = Pixelator.buttonContainer.children[0].children[1] as HTMLImageElement;
        Pixelator.canvas = document.querySelector("canvas") as HTMLCanvasElement;
        Pixelator.frameBuffer = new FrameBuffer(Pixelator.canvas);
    }

    static init() {
        //Clear canvas
        Pixelator.frameBuffer.ctx.fillStyle = "black";
        Pixelator.frameBuffer.ctx.fillRect(0, 0, Pixelator.canvas.width, Pixelator.canvas.height);

        //Add onmousedown and onmouseup to canvas
        Pixelator.canvas.addEventListener("mousedown", Pixelator.pointerDownCanvas);
        Pixelator.canvas.addEventListener("mouseup", Pixelator.pointerUpCanvas);

        //Add onclick to upload file button
        Pixelator.buttonContainer.children[0].addEventListener("click", () => Pixelator.fileInput.click());

        //Add onload to img
        Pixelator.img.addEventListener("load", () => {
            Pixelator.loadImageOnCanvas();

            //Auto calculate a suitable mid point
            //NOTE: midpoint = (sum of pixelRGBAverage)/pixelCount
            const frameBuffer = Pixelator.frameBuffer.ctx.getImageData(0, 0, Pixelator.canvas.width, Pixelator.canvas.height);
            let rgbAverageSum = 0;
            for (let pixel = 0; pixel < frameBuffer.data.length; pixel += 4) {
                const rgbAverage = (frameBuffer.data[pixel] + frameBuffer.data[pixel + 1] + frameBuffer.data[pixel + 2]) / 3;
                rgbAverageSum += rgbAverage;
            }

            Pixelator.midPointInput.value = (rgbAverageSum / (frameBuffer.data.length / 4)).toString();

            //Immediately preview effects
            Pixelator.applyEffects();
        });

        //Add onchange to upload file input
        Pixelator.fileInput.addEventListener("change", Pixelator.changeUploadedImage);

        //Add onchange to midpoint input
        Pixelator.midPointInput.addEventListener("change", () => {
            Pixelator.loadImageOnCanvas();
            Pixelator.applyEffects();
        });

        //Add onclick to export button
        Pixelator.buttonContainer.children[2].addEventListener("click", Pixelator.generateCode);
    }

    static loadImageOnCanvas() {
        //Clear canvas
        Pixelator.frameBuffer.ctx.fillStyle = "black";
        Pixelator.frameBuffer.ctx.fillRect(0, 0, Pixelator.canvas.width, Pixelator.canvas.height);

        let imgScaledWidth = (Pixelator.img.width * Pixelator.canvas.height) / Pixelator.img.height;
        if (Pixelator.frameBuffer.outputMode === "USART") {
            imgScaledWidth *= 0.7;
        } else if (Pixelator.frameBuffer.outputMode === "PORT") {
            imgScaledWidth *= 0.4;
        }
        Pixelator.frameBuffer.ctx.drawImage(Pixelator.img, (Pixelator.canvas.width - imgScaledWidth) / 2, 0, imgScaledWidth, Pixelator.canvas.height);
    }

    static changeUploadedImage() {
        if (Pixelator.fileInput.files) {
            if (Pixelator.lastObjectURL) {
                URL.revokeObjectURL(Pixelator.lastObjectURL);
            }
            Pixelator.lastObjectURL = URL.createObjectURL(Pixelator.fileInput.files[0]);
            Pixelator.img.src = Pixelator.lastObjectURL as string;
        }
    }

    static applyEffects() {
        const imageData = Pixelator.frameBuffer.imageData;

        //Determine the black/white-ness based on mid point for each pixel
        for (let pixel = 0; pixel < imageData.data.length; pixel += 4) {
            if (Pixelator.frameBuffer.palletteBits === 1) {
                //CASE: Each channel must be represented by either 225 or 0
                //NOTE: All the channel values of the same pixel must be the same
                const rgbAverage = (imageData.data[pixel] + imageData.data[pixel + 1] + imageData.data[pixel + 2]) / 3;
                for (let channel = 0; channel < 3; channel++) {
                    if (rgbAverage > parseInt(Pixelator.midPointInput.value)) {
                        imageData.data[pixel + channel] = 255;
                    } else {
                        imageData.data[pixel + channel] = 0;
                    } 
                }
            } else if (Pixelator.frameBuffer.palletteBits === 8) {
                //CASE: Each channel must be represented by either 225, 170, 85 or 0
                //NOTE: All the channel values of the same pixel are not required to be the same
                for (let channel = 0; channel < 3; channel++) {
                    if (imageData.data[pixel + channel] >= 213) {
                        imageData.data[pixel + channel] = 255;
                    } else if (imageData.data[pixel + channel] >= 127) {
                        imageData.data[pixel + channel] = 170;
                    } else if (imageData.data[pixel + channel] >= 42) {
                        imageData.data[pixel + channel] = 85;
                    } else {
                        imageData.data[pixel + channel] = 0;
                    } 
                }
            }

            imageData.data[pixel + 3] = 255; //Set alpha channel to no transparency
        }

        Pixelator.frameBuffer.imageData = imageData; //Update canvas
    }

    static generateCode() {
        //Initial parts of the code
        let content =
            `
/**Auto generated by Pixelator. No to be edited by hand**/

//CONDITIONAL COMPILATION DEFINITIONS
#define RESOLUTION_${Pixelator.frameBuffer.hRes}x${Pixelator.frameBuffer.vRes}
#define PALETTE_${Pixelator.frameBuffer.palletteBits}BIT
#define OUTPUT_${Pixelator.frameBuffer.outputMode}

const unsigned short vRes = ${Pixelator.frameBuffer.vRes}; //Number of vertical display pixels in the targeted VGA mode
const unsigned short hRes = ${Pixelator.frameBuffer.hRes}; //Number of horizontal display pixels in the targeted VGA mode
const unsigned short vPixels = ${Pixelator.frameBuffer.vPixels}; //Number of actual vertical pixels
const unsigned short hPixels = ${Pixelator.frameBuffer.hPixels}; //Number of actual horizontal pixels
const unsigned char vBytes = ${Pixelator.frameBuffer.vBytes}; //Number of rows in the frame buffer
const unsigned char hBytes = ${Pixelator.frameBuffer.hBytes}; //Number of bytes in a row of the frame buffer

const unsigned char frameBuffer[vBytes][hBytes] PROGMEM = {\n`;

        const frameBufferData = Pixelator.frameBuffer.imageData;

        for (let vPixel = 0; vPixel < frameBufferData.height; vPixel++) {
            let rowArr = "    {"; //Start a new array for current row

            if (Pixelator.frameBuffer.palletteBits === 1) {
                //CASE: 1 pixel is represented by 1 bit
                for (let hPixel = 0; hPixel < frameBufferData.width; hPixel += 8) {
                    let rowArrByteBin = "";

                    for (let hBit = hPixel; hBit < hPixel + 8; hBit++) {
                        //Calculate Channel0=R index for current pixel
                        const r = vPixel * (frameBufferData.width * 4) + hBit * 4;

                        if (hBit === 191) {
                            //CASE: Currently processing the last bit of the line
                            //NOTE: In USART based code, there will be a 1 pixel wide HIGH band in the left side of the frame. To balance that ugliness, we manually add a 1 pixel wide HIGH band at the end also.
                            //Make that bit high. No matter the actual value
                            rowArrByteBin += "1";
                        } else {
                            //CASE: Currently processing a bit other than the last bit
                            //NOTE: By now every R,G,B byte of the current pixel is either 255 or 0. So checking only the R byte is enough
                            if (frameBufferData.data[r] === 0) {
                                rowArrByteBin += "0";
                            } else if (frameBufferData.data[r] === 255) {
                                rowArrByteBin += "1";
                            }
                        }
                    }

                    //NOTE: By now the rowArrByteBin is complete
                    const rowArrByteHex = parseInt(rowArrByteBin, 2).toString(16).toUpperCase(); //Parse the binary string as hex with uppercase
                    rowArr += "0x" + (rowArrByteHex.length == 1 ? "0" + rowArrByteHex : rowArrByteHex) + ","; //Make the hex always 2 digit //Insert the hex byte as the next element in the rowStr array
                }
            } else if (Pixelator.frameBuffer.palletteBits === 8) {
                //CASE: 1 pixel is represented by 8 bits
                for (let hPixel = 0; hPixel < frameBufferData.width; hPixel++) {
                    //NOTE: A byte is encoded as 0bAARRGGBB where AA is always 00
                    let rowArrByteBin = "00"; //Inititialize with AA bits which are 00

                    //Calculate Channel0=R index for current pixel
                    const r = vPixel * (frameBufferData.width * 4) + hPixel * 4;

                    if (hPixel === frameBufferData.width - 1) {
                        //CASE: Currently processing the last pixel of the line
                        //NOTE: Since the last pixel is stretched, we will bank it and remove that pixel
                        rowArrByteBin += "000000";
                    } else {
                        //CASE: Currently processing a pixel other than the last pixel
                        //NOTE: By now every R,G,B byte of the current pixel is either 255,170,85 or 0

                        //Iterate over channels in current pixel and encode each channel to 2 bits
                        for (let channel = 0; channel < 3; channel++) {
                            if (frameBufferData.data[r + channel] === 0) {
                                rowArrByteBin += "00";
                            } else if (frameBufferData.data[r + channel] === 85) {
                                rowArrByteBin += "10";
                            } else if (frameBufferData.data[r + channel] === 170) {
                                rowArrByteBin += "01";
                            } else if (frameBufferData.data[r + channel] === 255) {
                                rowArrByteBin += "11";
                            }
                        }
                    }

                    //NOTE: By now the rowArrByteBin is complete
                    const rowArrByteHex = parseInt(rowArrByteBin, 2).toString(16).toUpperCase(); //Parse the binary string as hex with uppercase
                    rowArr += "0x" + (rowArrByteHex.length == 1 ? "0" + rowArrByteHex : rowArrByteHex) + ","; //Make the hex always 2 digit //Insert the hex byte as the next element in the rowStr array
                }
            }

            content += rowArr.slice(0, -1) + "},\n"; //Remove the trailing comma in the last element //Close the rowArr
        }

        content = content.slice(0, -2) + "\n};"; //Remove the trailing comma in the last array //Close the multi dimensional array

        Pixelator.uploadToMCU(content);
    }

    static uploadToMCU(content: string) {
        fetch("/build", {
            method: "POST",
            headers: {
                "Content-Type": "text/plain"
            },
            body: content
        })
        .then(res => res.json())
        .then(res => {
            console.log(res.data);
            if (res.status) {
                
                fetch("/upload")
                .then(res => res.json())
                .then(res => {
                    console.log(res.data);
                    if (!res.status) {
                        alert("Upload failed. Refer console for more details");
                    }
                });

            } else {
                alert("Build failed. Refer console for more details");
            }
        });
    }

    static pointerDownCanvas(event: MouseEvent) {
        Pixelator.canvasRect = Pixelator.canvas.getBoundingClientRect();

        if (event.ctrlKey) {
            Pixelator.frameBuffer.ctx.strokeStyle = "black";
        } else {
            Pixelator.frameBuffer.ctx.strokeStyle = "white";
        }
        Pixelator.frameBuffer.ctx.lineWidth = 1;

        const mousePosX = event.clientX - Pixelator.canvasRect.left;
        const mousePosY = event.clientY - Pixelator.canvasRect.top;
        Pixelator.frameBuffer.ctx.beginPath();
        Pixelator.frameBuffer.ctx.moveTo(mousePosX / (Pixelator.frameBuffer.hRes / Pixelator.frameBuffer.vPixels), mousePosY / (Pixelator.frameBuffer.vRes / Pixelator.frameBuffer.hPixels));

        Pixelator.canvas.addEventListener("mousemove", Pixelator.pointerMoveCanvas);
    }

    static pointerMoveCanvas(event: MouseEvent) {
        const mousePosX = event.clientX - Pixelator.canvasRect.left;
        const mousePosY = event.clientY - Pixelator.canvasRect.top;
        Pixelator.frameBuffer.ctx.lineTo(mousePosX / (Pixelator.frameBuffer.hRes / Pixelator.frameBuffer.vPixels), mousePosY / (Pixelator.frameBuffer.vRes / Pixelator.frameBuffer.hPixels));
        Pixelator.frameBuffer.ctx.stroke();
    }

    static pointerUpCanvas() {
        Pixelator.canvas.removeEventListener("mousemove", Pixelator.pointerMoveCanvas);
    }
}

Pixelator.init();