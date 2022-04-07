import dotenv from "dotenv";
import find from "find-up";
dotenv.config({ path: find.sync(".env") });

import { Queue } from "bullmq";

export const TASK_QUEUE = "task-queue";

export const connection = {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASSWORD
};

// Create a new connection in every instance
export function getQueue() {
    return new Queue(TASK_QUEUE, {
        connection
    });
}
