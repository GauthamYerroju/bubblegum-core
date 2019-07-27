const config = require('config')
const sharp = require('sharp')
const mime = require('mime-types')

let handlesTypes = 'JPEG, PNG, WebP, TIFF, GIF, SVG'.split(', ').map(ext => mime.lookup('_.' + ext))

function inspect(file) {
    return sharp(file).metadata()
}

function saveThumbnail(file, path) {
    // Handle simple thumbnails, GIF and PNG with transparency and animated GIFs
    return Promise.resolve()
}

function resize(file, width, height) {
    return sharp(file).resize({width, height, withoutEnlargement: config.get('image.shrinkOnly')})
}

module.exports = {
    handlesTypes,
    inspect,
    saveThumbnail,
    resize,
}
