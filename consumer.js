import { Worker } from "bullmq";
import { connection, getQueue, TASK_QUEUE } from "./queue.js";

const worker = new Worker(
    TASK_QUEUE,
    async (job) => {   
        console.log(job.data.color);
    },
    { connection }
);

const queue = getQueue();
const jobs = await queue.getJobs(["active"]);

console.log(JSON.stringify(jobs));
