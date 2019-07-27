const fs = require('fs')
const path = require('path')


function* iterDirItems(dirName, recurse=false) {
    const dirs = []
    const items = []
    for (const item of fs.readdirSync(dirName, {withFileTypes : true})) {
        const res = {relPath: path.resolve(dirName, item.name), isDir: item.isDirectory()}
        yield res
        if (recurse && item.isDirectory()) {
            dirs.push(res)
        }
    }
    if (recurse && (typeof recurse === 'number')) {
        --recurse
    }
    for (const dir of dirs) {
        yield* iterDirItems(dir.relPath, recurse)
    }
}

module.exports = {
    iterDirItems
}
