// Supports JPEG, PNG, WebP, TIFF, GIF and SVG
const sharp = require('sharp')
const config = require('config')

function open(img) {
    return sharp(img)
}

function getMetadata(img) {
    return img.metadata()
}

function resize(img, width, height) {
    return img.resize({width, height, withoutEnlargement: config.get('image.shrinkOnly')})
}

function getThumbnail(img) {
    // Handle simple thumbnails, GIF and PNG with transparency and animated GIFs
}

module.exports = {
    open,
    getMetadata,
    resize,
    getThumbnail,
}
