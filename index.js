const { iterDirItems } = require('./tools.js')

for (const item of iterDirItems('C:\\Games\\Xpadder.v2015.01.01.Repack.Multilingual.Retail', true)) {
    console.log(item.relPath)
}
