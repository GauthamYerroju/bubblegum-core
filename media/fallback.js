const config = require('config')
const sharp = require('sharp')

function inspect(file) {
    return Promise.resolve(file)
}

function saveThumbnail(path, path) {
    return Promise.resolve()
}

module.exports = {
    inspect,
    saveThumbnail,
}
