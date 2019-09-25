const fs = require('fs')
const path = require('path')
const config = require('config')

function* iterDir(dirName, recurse=false, sortBy=null, sortReverse=false) {
    const files = fs.readdirSync(dirName).map(item => makeFileProps(dirName, item))
    files.sort((a, b) => getSortFunction(a, b, sortBy, sortReverse))

    const dirs = []
    for (const item of files) {
        yield item
        if (recurse && item.dir) dirs.push(item);
    }
    if (recurse && (typeof recurse === 'number')) --recurse;
    for (const dir of dirs) {
        yield* iterDir(dir.path, recurse, sortBy, sortReverse)
    }
}

function makeFileProps(dirName, item) {
    const fullPath = path.resolve(dirName, item)
    const stat = fs.statSync(fullPath)
    const res = {
        'name': item,
        'path': fullPath,
        'dir': stat.isDirectory(),
    }
    if (!res.dir) {
        res.ext = path.extname(item)
    }
    for (const [sortKey, statKey] of Object.entries(config.get("statKeys"))) {
        res[sortKey] = stat[statKey]
    }
    return res
}

function getSortFunction(a, b, sortBy, sortReverse) {
    sortBy = (Object.keys(config.get("statKeys"))).includes(sortBy) ? sortBy : 'name'
    const plusOne = sortReverse ? -1 : 1
    if (a[sortBy] > b[sortBy]) return plusOne;
    if (a[sortBy] < b[sortBy]) return -plusOne;
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase())
}

module.exports = {
    iterDir
}
