const process = require('process')
const config = require('config')
const { iterDirItems } = require('./tools.js')
const media = require('./media')


const recurse = process.argv[2] || config.get('fs.recurse')
const dir = process.argv[3] || config.get('fs.defaultDir')
console.log(dir, recurse)


for (const item of iterDirItems(dir, recurse)) {
    media.inspect(item.path).then(meta => console.log(meta))
}
