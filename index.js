const process = require('process')
const config = require('config')
const { iterDirItems } = require('./tools.js')
const media = require('./media')


const dir = process.argv[2] || config.get('fs.defaultDir')
const recurse = process.argv[3] || config.get('fs.recurse')
const sortBy = process.argv[4] || 'name'
console.log(dir, recurse, sortBy)


for (const item of iterDirItems(dir, recurse, sortBy)) {
    media.inspect(item.path).then(meta => console.log(meta))
}
