function init() {
    //Add onclick to pixelate button
    buttonContainer.children[1].addEventListener("click", () => {
        const frameBuffer = ctx.getImageData(0, 0, canvas.width, canvas.height);
        for (let y = 0; y < frameBuffer.height; y++) {
            for (let x = 0; x < frameBuffer.width; x++) {
                //NOTE: Channel0=R, Channel1=G, Channel2=B

                //Calculate Channel0=R index for current pixel
                const r = y * (frameBuffer.width * 4) + x * 4;

                //WARNING: We don't modify the alpha channel
                for (let channel = 0; channel < 3; channel++) {
                    if (frameBuffer.data[r+channel] < 42) frameBuffer.data[r+channel] = 0;
                    else if (frameBuffer.data[r+channel] < 127) frameBuffer.data[r+channel] = 85;
                    else if (frameBuffer.data[r+channel] < 213) frameBuffer.data[r+channel] = 170;
                    else frameBuffer.data[r+channel] = 255;
                }
            }
        }
        ctx.putImageData(frameBuffer, 0, 0);
    });
}