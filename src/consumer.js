import { Worker, QueueScheduler } from "bullmq";
import { connection, TASK_QUEUE, getQueue } from "./queue";
import child_process from "child_process";
import { Queue } from "bullmq";
import fs from 'fs';

(async () => {
    // Clean all stalled tasks from the queue
    // const queue = getQueue();
    // const jobs = await queue.getJobs(["active"]);
    // for (let job of jobs) {
    //     await job.moveToFailed();
    // }

    const sttQueue = new Queue('speech-to-text', {
        connection,
        defaultJobOptions: {
            attempts: 3
        }
    });

    const queueScheduler = new QueueScheduler(TASK_QUEUE, { connection });

    const worker = new Worker(
        TASK_QUEUE,
        async (job) => {
            console.log(job.data.youtube_video_id);
            const url = '/media/keithhon/ds923/disk2/youtube-downloader-tmp/downloads/' + job.data.youtube_video_id + '.mp3';

            // check if file exists
            if (fs.existsSync(url)) {
                console.log('file exists');
                sttQueue.add("speech-to-text", { url, video_id: job.data.youtube_video_id });
                return;
            }

            child_process.execSync(
                `yt-dlp -f bestaudio --extract-audio --audio-format mp3 -o "/media/keithhon/ds923/disk2/youtube-downloader-tmp/downloads/%(id)s.%(ext)s" https://www.youtube.com/watch?v=${job.data.youtube_video_id}`
            );

            sttQueue.add("speech-to-text", { url, video_id: job.data.youtube_video_id });
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
