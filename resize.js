const { Jimp } = require('jimp');

async function resizeImage() {
    try {
        const image = await Jimp.read('icon.png');
        const width = image.bitmap.width;
        const height = image.bitmap.height;

        if (width !== height) {
            console.log(`Image is ${width}x${height}. Making it square...`);
            const size = Math.max(width, height);
            
            // Create a new square image with a transparent background
            const square = new Jimp({ width: size, height: size, color: 0x00000000 }); // Transparent
            
            // Composite the original image onto the center of the square
            const x = (size - width) / 2;
            const y = (size - height) / 2;
            square.composite(image, x, y);

            
            await square.write('icon.png');
            console.log('Successfully squared the image!');
        } else {
            console.log('Image is already square.');
        }
    } catch (err) {
        console.error(err);
    }
}

resizeImage();
