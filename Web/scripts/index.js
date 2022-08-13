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

    init();
}