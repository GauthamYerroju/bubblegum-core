const fs = require('fs')
const path = require('path')
const config = require('config')
const xxhash = require('xxhash')
const db = require('./db')
const { Media } = require('./media')

function hash(data) {
    return xxhash.hash64(data, 0xCAFEBABE, 'hex')
}

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

// This should only have stuff from fs.stat, post-process the results if needed.
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

// This is the driver method for reading file info from database, hashing, thumbnailing, etc.
function getFileData(item, resolveAfterInsert=false) {
    return new Promise((resolve, reject) => {
        fs.readFile(item.path, (err, file) => {
            if (err) {
                reject(err)
            } else {
                const id = hash(file)
                const row = db.getFile(id)
                if (row) {
                    resolve(Object.assign(item, row))
                } else {
                    Media.inspect(item.path).then(meta => {
                        const dbData = {
                            name: item.name,
                            path: item.path,
                            xxhash: id,
                            mtime: item.mtime,
                            type: item.ext,
                            size: item.size,
                            width: meta.width,
                            height: meta.height,
                        }
                        item = Object.assign(item, dbData)
                        if (!resolveAfterInsert) resolve(item);
                        db.addFile(item)
                        if (resolveAfterInsert) resolve(item);
                    }).catch(reject)
                }
            }
        })
    })
}

module.exports = {
    iterDir,
    getFileData
}
