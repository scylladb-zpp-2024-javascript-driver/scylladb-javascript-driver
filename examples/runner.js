"use strict";

const async = require("async");
const exec = require("child_process").exec;
const fs = require("fs");
const path = require("path");

/**
 * This script is used to check that the samples run correctly.
 * It is not a valid example. For description of new examples see README.md
 * For description of datastax examples see see ./DataStax/README.md and subdirectories for more information.
 */

// Name of the files to ignore as examples, no matter of their path
const ignoredFiles = ["util.js"];

// Timeout for each example in ms
const timeoutValue = 10000;

/** List all js files in the directory */
function getJsFiles(dir, fileArray) {
    const files = fs.readdirSync(dir);
    fileArray = fileArray || [];
    files.forEach(function (file) {
        if (file === "node_modules") {
            return;
        }
        let joinedPath = path.join(dir, file);
        if (fs.statSync(joinedPath).isDirectory()) {
            getJsFiles(joinedPath, fileArray);
            return;
        }
        if (
            file.substring(file.length - 3, file.length) !== ".js" ||
            ignoredFiles.find((f) => f === file)
        ) {
            return;
        }
        fileArray.push(joinedPath);
    });
    return fileArray;
}

if (Number(process.versions.node.split(".")[0]) < 16) {
    console.log(
        "Examples were not executed as they were designed to run against Node.js 16+",
    );
    return;
}

const runnerFileName = path.basename(module.filename);
let counter = 0;
let failures = 0;

async.eachSeries(
    getJsFiles(path.dirname(module.filename) + path.sep),
    function (file, next) {
        if (file.indexOf(runnerFileName) >= 0) {
            return next();
        }

        let timedOut = false;
        let cleanFilename = file.split("examples/").slice(-1);
        const timeout = setTimeout(function () {
            console.log(
                `\nExample ${cleanFilename} timed out after ${timeoutValue / 1000}s`,
            );
            counter++;
            failures++;
            next();
        }, timeoutValue);

        exec("node " + file, function (err) {
            if (timedOut) {
                return;
            }
            counter++;
            clearTimeout(timeout);
            if (err) {
                console.log(`\x1b[31mExample ${cleanFilename} failed\x1b[0m`);
                console.error(
                    `\x1b[33mError message for example ${cleanFilename}:\x1b[0m`,
                );
                console.error(err);
                failures++;
            } else {
                console.log(
                    `\x1b[32mExample ${cleanFilename} finished successfully\x1b[0m`,
                );
            }
            next();
        });
    },
    function (err) {
        if (err) {
            console.error(err);
        }
        console.log(
            `\n${counter - failures}/${counter} examples executed successfully`,
        );
        process.exit(failures);
    },
);
