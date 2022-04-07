import { getQueue, TASK_QUEUE } from "./queue";

const queue = getQueue();

for (let i = 0; i < 1000; i++) {
    queue.add(TASK_QUEUE, { color: "testing2" });
}

console.log("OK");
