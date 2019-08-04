const config = require('config')
const sharp = require('sharp')
const mime = require('mime-types')
const { DefaultHandler } = require('./index.js')


class ImageHandler extends DefaultHandler {

    static name = 'ImageHandler'
    static handlesTypes = 'JPEG, PNG, WebP, TIFF, GIF, SVG'.split(', ').map(ext => mime.lookup('_.' + ext))

    static inspect(file) {
        return sharp(file).metadata()
    }
    
    static saveThumbnail(file, dest) {
        // Handle simple thumbnails, GIF and PNG with transparency and animated GIFs
        return Promise.resolve(file)
    }

    static resize(file, width, height) {
        return sharp(file).resize({width, height, withoutEnlargement: config.get('image.shrinkOnly')})
    }
}

module.exports = { ImageHandler }