//@ts-check

let lastObjectURL = null;
let buttonContainer;
let fileInput;
let img;
let canvas;
let ctx;

function main() {
    buttonContainer = document.getElementById("buttonContainer");
    //Add onclick to upload file button
    fileInput = buttonContainer.children[0].firstElementChild;
    buttonContainer.children[0].addEventListener("click", () => {
        fileInput.click();
    });

    //Add onchange to upload file input
    img = buttonContainer.children[0].children[1];
    fileInput.addEventListener("change", () => {
        if (fileInput.files.length > 0) {
            if (lastObjectURL) {
                URL.revokeObjectURL(lastObjectURL);
            }
            lastObjectURL = URL.createObjectURL(fileInput.files[0]);
            img.src = lastObjectURL;
        }
    });

    //Add onload to img
    canvas = document.querySelector("canvas");
    ctx = canvas.getContext("2d");
    img.addEventListener("load", () => {
        const imgScaledWidth = (img.width*canvas.height)/img.height;
        ctx.drawImage(img, (canvas.width-imgScaledWidth)/2, 0, imgScaledWidth, canvas.height);
    });

    init();
}