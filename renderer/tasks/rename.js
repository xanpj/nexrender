'use strict';

const fs        = require('fs-extra');
const path      = require('path');
const url      = require('url');
const async     = require('async');

/**
 * This task renames assets from their original name
 * to one, that is provided under "asset.name"
 */
module.exports = function(project) {
    return new Promise((resolve, reject) => {

        console.info(`[${project.uid}] renaming assets...`);

        // initialize empty call-queue array
        let calls = [];

        // iterate over each file and create rename(move) callback
        for (let asset of project.assets) {
            console.log(path.basename(url.parse(asset.src).pathname)
            let src = path.join( project.workpath, path.basename(url.parse(asset.src).pathname));
            let dst = path.join( project.workpath, asset.name );

            if (src === dst) continue;

            // TODO: check for sync
            // remove file if it existed
            fs.unlink(dst, () => {});

            calls.push((callback) => {
                fs.move(src, dst, callback);
            });
        }

        // run rename(move) callbacks in parallel
        async.parallel(calls, (err, results) => {
            return (err) ? reject(err) : resolve(project);
        })
    });
};
