const db = require('./db')
const { iterDir, getFileData } = require('./tools.js')
const { Media } = require('./media')
const { ImageHandler } = require('./media/image')
const { VideoHandler } = require('./media/video')

Media.addHandler(ImageHandler)
Media.addHandler(VideoHandler)

module.exports = {
    iterDir,
    getFileData
}

// TODO: normalize backslashes to forward slashes in tools#iterDir
// TODO: Why do I need path in file_info table again? Implement xxhash and check IO. If too much, fall back to layered diffing using mtime and xxhash

const sandbox = false
if (sandbox) {
    const process = require('process')
    const config = require('config')
    const tools = require('./tools.js')
    

    const dir = process.argv[2] || config.get('fs.defaultDir')
    const recurse = process.argv[3] || config.get('fs.recurse')
    const sortBy = process.argv[4] || 'name'
    console.log(dir, recurse, sortBy)

    const promises = []
    for (const item of iterDir(dir, recurse, sortBy)) {
        promises.push(getFileData(item))
    }
    Promise.all(promises).then(() => {
        console.table(db._db.prepare("SELECT * FROM file_info;").all())
    })
}
