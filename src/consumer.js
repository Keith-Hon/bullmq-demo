import { Worker } from "bullmq";
import { connection, TASK_QUEUE } from "./queue";

const worker = new Worker(
    TASK_QUEUE,
    async (job) => {
        console.log(job.data.color);
    },
    { autorun: true, connection, concurrency: 50 }
);

process.stdin.resume(); //so the program will not close instantly

worker.on("closed", () => {
    console.log("worker closed");
})

function exitHandler(options, exitCode) {
    (async () => {
        console.log("closing worker...")
        await worker.close();
        if (options.cleanup) console.log("clean");
        if (exitCode || exitCode === 0) console.log(exitCode);
        if (options.exit) process.exit();
    })();
}

//do something when app is closing
process.on("exit", exitHandler.bind(null, { cleanup: true }));

//catches ctrl+c event
process.on("SIGINT", exitHandler.bind(null, { exit: true }));

// catches "kill pid" (for example: nodemon restart)
process.on("SIGUSR1", exitHandler.bind(null, { exit: true }));
process.on("SIGUSR2", exitHandler.bind(null, { exit: true }));

//catches uncaught exceptions
process.on("uncaughtException", exitHandler.bind(null, { exit: true }));


// try to manually clean up jobs
// const queue = getQueue();
// const jobs = await queue.getJobs(["active"]);

// for(let i = 0; i < jobs.length; i++) {
//      jobs[i].moveToFailed();
// }
// console.log(JSON.stringify(jobs));
