const process = require('process')
const config = require('config')
const { iterDir } = require('./tools.js')
const { Media } = require('./media')
const { ImageHandler } = require('./media/image')
const { VideoHandler } = require('./media/video')


Media.addHandler(ImageHandler)
Media.addHandler(VideoHandler)
// console.table(Media.getHandledTypes())


// const dir = process.argv[2] || config.get('fs.defaultDir')
// const recurse = process.argv[3] || config.get('fs.recurse')
// const sortBy = process.argv[4] || 'name'
// console.log(dir, recurse, sortBy)


// for (const item of iterDir(dir, recurse, sortBy)) {
//     Media.inspect(item.path).then(meta => console.log(meta)).catch(err => console.error(err))
// }

module.exports = {
    iterDir,
    Media
}