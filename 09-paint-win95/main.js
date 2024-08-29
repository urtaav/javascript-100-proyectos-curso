// CONSTANTS 
const MODES = {
    DRAW: 'draw',
    ERASE: 'erase',
    RECTANGLE: 'rectangle',
    ELLIPSE: 'ellipse',
    PICKER: 'picker'
};

// UTILITIES 
const $ = selector => document.querySelector(selector);
const $$ = selector => document.querySelectorAll(selector);

// ELEMENTS 
const $canvas = $('#canvas');
const $colorPicker = $('#color-picker');
const $clearBtn = $('#clear-btn');
const $drawBtn = $('#draw-btn');
const $eraseBtn = $('#erase-btn');
const $rectangleBtn = $('#rectangle-btn');
const $pickerBtn = $('#picker-btn');
const $ellipseBtn = $('#ellipse-btn');
const $saveBtn = $('#save-btn');

const ctx = $canvas.getContext('2d');

// STATE 
let isDrawing = false;
let isShiftPressed = false;
let startX, startY;
let lastX = 0;
let lastY = 0;
let mode = MODES.DRAW;
let imageData = null;
let drawingHistory = [];
let currentStep = -1;

// EVENTS 
$canvas.addEventListener('mousedown', startDrawing);
$canvas.addEventListener('mousemove', draw);
$canvas.addEventListener('mouseup', stopDrawing);
$canvas.addEventListener('mouseleave', stopDrawing);
$colorPicker.addEventListener('change', handleChangeColor);
$clearBtn.addEventListener('click', clearCanvas);
document.addEventListener('keydown', handleKeyDown);
document.addEventListener('keyup', handleKeyUp);
$pickerBtn.addEventListener('click', () => setMode(MODES.PICKER));
$eraseBtn.addEventListener('click', () => setMode(MODES.ERASE));
$rectangleBtn.addEventListener('click', () => setMode(MODES.RECTANGLE));
$ellipseBtn.addEventListener('click', () => setMode(MODES.ELLIPSE));
$drawBtn.addEventListener('click', () => setMode(MODES.DRAW));
$saveBtn.addEventListener('click',save);

// METHODS

function startDrawing(event) {
    isDrawing = true;
    const { offsetX, offsetY } = event;
    [startX, startY] = [offsetX, offsetY];
    [lastX, lastY] = [offsetX, offsetY];

    // Guardar el estado del canvas antes de empezar a dibujar o borrar
    saveState();
    imageData = ctx.getImageData(0, 0, $canvas.width, $canvas.height);
}

function draw(event) {
    if (!isDrawing) return;

    const { offsetX, offsetY } = event;

    if (mode === MODES.DRAW || mode === MODES.ERASE) {
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(offsetX, offsetY);
        ctx.stroke();
        [lastX, lastY] = [offsetX, offsetY];
    } else if (mode === MODES.RECTANGLE) {
        ctx.putImageData(imageData, 0, 0);
        let width = offsetX - startX;
        let height = offsetY - startY;

        if (isShiftPressed) {
            const sideLength = Math.min(Math.abs(width), Math.abs(height));
            width = width > 0 ? sideLength : -sideLength;
            height = height > 0 ? sideLength : -sideLength;
        }

        ctx.beginPath();
        ctx.rect(startX, startY, width, height);
        ctx.stroke();
    } else if(mode === MODES.ELLIPSE){
        ctx.putImageData(imageData, 0, 0);

        let width = (offsetX - startX) / 2;
        let height = (offsetY - startY) / 2;
        let centerX = startX + width;
        let centerY = startY + height;
    
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, Math.abs(width), Math.abs(height), 0, 0, 2 * Math.PI);
        ctx.stroke();
    }
}

function stopDrawing() {
    if (!isDrawing) return;
    isDrawing = false;
    // Guardar el estado después de cada acción de dibujo o borrado
    saveState();
}

function handleChangeColor() {
    const { value } = $colorPicker;
    ctx.strokeStyle = value;
}

function handleKeyDown({ key, ctrlKey }) {
    if (ctrlKey && key === 'z') {
        undo();
    } else {
        isShiftPressed = key === 'Shift';
    }
}

function handleKeyUp({ key }) {
    if (key === 'Shift') isShiftPressed = false;
}

function clearCanvas() {
    ctx.clearRect(0, 0, $canvas.width, $canvas.height);
    resetAll();
}

async function setMode(newMode) {
    let previousMode = mode;
    mode = newMode;
    $('button.active')?.classList.remove('active');

    if (mode === MODES.DRAW) {
        $drawBtn.classList.add('active');
        $canvas.style.cursor = 'crosshair';
        ctx.globalCompositeOperation = 'source-over';
        ctx.lineWidth = 2;
    } else if (mode === MODES.RECTANGLE) {
        $rectangleBtn.classList.add('active');
        $canvas.style.cursor = 'nw-resize';
        ctx.globalCompositeOperation = 'source-over';
        ctx.lineWidth = 2;
    } else if (mode === MODES.ERASE) {
        $eraseBtn.classList.add('active');
        $canvas.style.cursor = 'url("./cursors/erase.png") 0 24, auto';
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = 20;
    } else if (mode === MODES.PICKER) {
        $pickerBtn.classList.add('active');
        const eyeDropper = new window.EyeDropper();
        try {
            const result = await eyeDropper.open();
            const { sRGBHex } = result;
            ctx.strokeStyle = sRGBHex;
            $colorPicker.value = sRGBHex;
            setMode(previousMode);
        } catch (e) {
            console.log(e);
        }
    } else if(mode === MODES.ELLIPSE){
        $ellipseBtn.classList.add('active');

    }
}

function resetAll() {
    $('button.active')?.classList.remove('active');
    setMode(MODES.DRAW);
}

// Función para almacenar el estado actual del canvas
function saveState() {
    if (currentStep < drawingHistory.length - 1) {
        drawingHistory = drawingHistory.slice(0, currentStep + 1);
    }
    drawingHistory.push($canvas.toDataURL());
    currentStep++;
}

function save(){
    let image = $canvas.toDataURL('image/jpeg');
    // Crear un enlace
    const aDownloadLink = document.createElement('a');

    // Establecer el nombre del archivo
    aDownloadLink.download = 'paintjs_image_' + new Date().toISOString().replace(/:/g, '-') + '.jpeg';

    // Adjuntar la URL de datos al enlace
    aDownloadLink.href = image;

    // Forzar el clic en el enlace para iniciar la descarga
    aDownloadLink.click();

    // Eliminar el enlace del DOM
    aDownloadLink.remove();
}

// Función para deshacer
function undo() {
    if (currentStep > 0) {
        currentStep--;
        const canvasPic = new Image();
        canvasPic.src = drawingHistory[currentStep];
        canvasPic.onload = () => {
            ctx.clearRect(0, 0, $canvas.width, $canvas.height);
            ctx.drawImage(canvasPic, 0, 0);
        };
    }
}

setMode(MODES.DRAW);

if (typeof window.EyeDropper !== 'undefined') {
    $pickerBtn.removeAttribute('disabled');
}

ctx.lineJoin = 'round';
ctx.lineCap = 'round';
