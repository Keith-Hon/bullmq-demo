import { Worker, QueueScheduler } from "bullmq";
import { connection, TASK_QUEUE, getQueue } from "./queue";

(async () => {
    // Clean all stalled tasks from the queue
    // const queue = getQueue();
    // const jobs = await queue.getJobs(["active"]);
    // for (let job of jobs) {
    //     await job.moveToFailed();
    // }

    const queueScheduler = new QueueScheduler(TASK_QUEUE, { connection });

    const worker = new Worker(
        TASK_QUEUE,
        async (job) => {
            console.log(job.data.color);
        },
        { autorun: true, connection, concurrency: 50 }
    );

    worker.on("closed", () => {
        console.log("worker closed");
    });

    function exitHandler(options, exitCode) {
        (async () => {
            console.log("closing worker...");
            await worker.close();
            await queueScheduler.close();

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
})();

process.stdin.resume(); //so the program will not close instantly
