const fs = require('fs')
const path = require('path')
const config = require('config')
const xxhash = require('xxhash')
const db = require('./db')
const { Media } = require('./media')

function getHash(data) {
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

// Driver method for reading file (and pass through DB, creating entries and thumbnails as needed)
function getFileData(item, resolveAfterInsert=false) {
    return new Promise((resolve, reject) => {
        fs.readFile(item.path, (err, file) => {
            if (err) {
                reject(err)
            } else {
                const hash = getHash(file)
                const row = db.getFileByHashAndPath(hash, item.path)
                if (row) {
                    resolve(Object.assign(item, row))
                } else {
                    Media.inspect(item.path)
                        .then(meta => {
                            // TODO: Make thumbnail and add to DB
                            // Add DB entry
                            const dbData = {
                                name: item.name,
                                path: item.path,
                                xxhash: hash,
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
                        })
                        .catch(reject)
                }
            }
        })
    })
}

// Driver method for reading DB rows (and pass through filesystem, cleaning up entries as needed)
function searchDb(name, orderby='name', desc=false, limit, offset) {
    const rows = db.searchPage(name, orderby, desc, limit, offset)
    const promises = []
    for(const row of rows) {
        promises.push(new Promise((resolve, reject) => {
            fs.stat(row.path, (err, info) => {
                if (err) {
                    if (err.code === 'ENOENT') {
                        resolve(null)
                        cleanMissingFile(row)
                    } else {
                        reject(err)
                    }
                } else {
                    fs.readFile(row.path, (err, file) => {
                        if (err) {
                            if (err.code === 'ENOENT') {
                                resolve(null)
                                cleanMissingFile(row)
                            } else {
                                reject(err)
                            }
                        } else {
                            const hash = getHash(file)
                            if (hash !== row.xxhash) {
                                cleanMissingFile(row)
                                getFileData(row)
                                    .catch(reject)
                                    .then(resolve)
                            }
                            resolve(row)
                        }
                    })
                }
            })
        }))
    }
    return new Promise((resolve, reject) => {
        Promise.all(promises)
            .catch(reject)
            .then(rows => resolve(rows.filter(row => row !== null)))
    })
}

function cleanMissingFile(row) {
    // TODO: delete thumbnail files
    // TODO: queue files for delete instead of doing it right here
    db.removeFileById(row.id)
}

module.exports = {
    iterDir,
    getFileData,
    searchDb
}
